import crypto from 'node:crypto';

import { hashPublicOwnershipToken, isPublicOwnershipTokenActive, resolvePublicTokenRecord } from '../utils/publicTokenAccess';
import { allocatePendingCancellationRefunds } from '../utils/stayCancellationRefund';
import { cancellationEntitlement } from '../utils/cancellationEntitlement';
import { formatCentsForMessage } from '../utils/moneyMessage';
import { reconcileReservationPaymentEvidence, reservationPaymentStatus } from '../utils/paymentReconciliation';
import { closeStayObligations } from '../utils/stayClosure';
import { reconcileClosingAttempts } from './paymentAttemptReconciliation';

export async function requestStayCancellation(
  _root: unknown,
  args: { tripToken: string; reason?: string | null; confirmCancellation?: boolean | null; expectedRefundCents?: number | null; expectedAssessmentId?: string | null },
  context: any,
) {
  if (!/^[a-f0-9]{48}$/.test(args.tripToken || '')) throw new Error('Trip link is invalid.');
  if (args.confirmCancellation !== true) throw new Error('Confirm that you want to cancel this stay.');
  if (!Number.isSafeInteger(args.expectedRefundCents) || (args.expectedRefundCents as number) < 0
    || typeof args.expectedAssessmentId !== 'string' || !/^[a-f0-9]{32}$/.test(args.expectedAssessmentId)) {
    throw new Error('Review the cancellation refund before confirming.');
  }
  const cancellationReason = args.reason?.trim() || 'Guest requested cancellation.';
  if (cancellationReason.length > 2000) throw new Error('Cancellation reason is too long.');
  const sudo = context.sudo();
  const reservation = await resolvePublicTokenRecord({
    token: args.tripToken,
    invalidMessage: 'Trip link is invalid.',
    findRecordByHash: async (tokenHash) => {
      const reservations = await sudo.query.Reservation.findMany({
        where: { tripTokenHash: { equals: tokenHash } },
        take: 1,
        query: `
          id confirmationCode status amountPaidCents currencyCode tripTokenExpiresAt tripTokenRevokedAt
          hostOrganization { id }
          calendarBlocks { id status }
          payments(where: { status: { in: ["succeeded", "partially_refunded"] } }, orderBy: [{ createdAt: desc }]) { id amountCents refundedAmountCents }
        `,
      });
      const record = reservations[0];
      return record ? { ...record, tokenExpiresAt: record.tripTokenExpiresAt, tokenRevokedAt: record.tripTokenRevokedAt } : null;
    },
  });
  if (!reservation) throw new Error('Trip link is invalid or expired.');

  let closingAttempts: string[] = [];
  const cancelled = await context.prisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `reservation:${reservation.id}`);
    await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', reservation.id);
    const initial = await tx.reservation.findUnique({ where: { id: reservation.id }, select: { id: true, status: true } });
    if (!initial || !['pending', 'confirmed'].includes(initial.status)) throw new Error('This stay can no longer be cancelled online.');

    // Serialize cancellation refund allocation with host refund operations. Acquire
    // payment locks before updating the reservation row to keep lock order stable.
    const paymentIds = await tx.payment.findMany({ where: { reservationId: initial.id }, orderBy: [{ id: 'asc' }], select: { id: true } });
    for (const payment of paymentIds) {
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `payment-refund:${payment.id}`);
    }
    const pendingRefund = await tx.refund.findFirst({
      where: {
        reservationId: initial.id,
        OR: [
          { status: { in: ['pending', 'processing'] } },
          { reservationAmendmentId: { not: null }, status: 'failed' },
        ],
      },
      select: { id: true },
    });
    if (pendingRefund) throw new Error('Resolve pending refund obligations before cancelling this stay.');

    const locked = await tx.reservation.findUnique({ where: { id: reservation.id } });
    if (
      !locked
      || locked.tripTokenHash !== hashPublicOwnershipToken(args.tripToken)
      || !isPublicOwnershipTokenActive({
        tokenExpiresAt: locked.tripTokenExpiresAt,
        tokenRevokedAt: locked.tripTokenRevokedAt,
      })
    ) {
      throw new Error('Trip link is invalid or expired.');
    }
    if (!['pending', 'confirmed'].includes(locked.status)) throw new Error('This stay can no longer be cancelled online.');
    const [payments, refunds] = await Promise.all([
      tx.payment.findMany({
        where: { reservationId: locked.id },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true, status: true, amountCents: true, refundedAmountCents: true, currencyCode: true, provider: true, data: true },
      }),
      tx.refund.findMany({
        where: { reservationId: locked.id },
        select: { id: true, paymentId: true, status: true, amountCents: true, currencyCode: true },
      }),
    ]);
    const reconciliation = reconcileReservationPaymentEvidence({ payments, refunds, currencyCode: locked.currencyCode, testMode: locked.testMode === true });
    if (reconciliation.netPaidCents !== (locked.amountPaidCents || 0)) {
      throw new Error('Reservation paid amount does not reconcile to settled payment evidence.');
    }
    const now = new Date();
    const entitlement = cancellationEntitlement({
      bookingSnapshot: locked.bookingSnapshot,
      checkInDate: locked.checkInDate,
      checkOutDate: locked.checkOutDate,
      totalAmountCents: locked.totalAmountCents,
      bookedAt: locked.createdAt,
      cancelledAt: now,
      netPaidCents: reconciliation.netPaidCents,
    });
    // The guest confirmed one specific assessment (policy, window, rate, base, itinerary and
    // amounts). If any part changed since, they review it again; an equal amount isn't enough.
    if (args.expectedAssessmentId !== entitlement.assessmentId || args.expectedRefundCents !== entitlement.refundCents) {
      const shown = entitlement.status === 'unassessed'
        ? `Your host now reviews whether a refund is due (you’ve paid ${formatCentsForMessage(entitlement.reviewCents, locked.currencyCode)})`
        : `The refund for cancelling now is ${formatCentsForMessage(entitlement.refundCents, locked.currencyCode)}`;
      throw new Error(`${shown}. Review it again before cancelling.`);
    }
    const consentNote = `[${now.toISOString()}] Guest confirmed cancellation from the trip link. Assessment ${entitlement.assessmentId}: ${entitlement.status === 'unassessed' ? `host review of up to ${entitlement.reviewCents}` : `refund ${entitlement.refundCents}`} ${locked.currencyCode} (policy ${entitlement.policyVersion || 'none'}).`;
    await tx.reservation.update({
      where: { id: locked.id },
      data: {
        status: 'cancelled',
        cancelledAt: now,
        cancelledBy: 'guest',
        cancellationReason,
        internalNotes: [locked.internalNotes, consentNote].filter(Boolean).join('\n'),
      },
    });
    await tx.calendarBlock.updateMany({
      where: { reservationId: locked.id, status: 'active' },
      data: { status: 'released' },
    });
    closingAttempts = (await closeStayObligations(tx, { reservation: locked, now, operationKey: `guest-cancel:${now.toISOString()}` })).paymentAttemptsClosing;

    let refundPendingCents = 0;
    let refundReviewCents = 0;
    // Assessed refunds are owed (pending). An unassessed cancellation opens a refund under
    // review: a candidate the host assesses or declines, never counted as money owed.
    const review = entitlement.status === 'unassessed';
    const candidateCents = review ? entitlement.reviewCents : entitlement.refundCents;
    if (candidateCents > 0) {
      const refundablePayments = payments.filter((payment: any) => ['succeeded', 'partially_refunded', 'refunded'].includes(payment.status || ''));
      const allocations = allocatePendingCancellationRefunds({
        reservationId: locked.id,
        netAmountPaidCents: reconciliation.netPaidCents,
        refundCents: candidateCents,
        payments: refundablePayments,
      });
      for (const allocation of allocations) {
        await tx.refund.create({
          data: {
            hostOrganizationId: locked.hostOrganizationId,
            reservationId: locked.id,
            paymentId: allocation.paymentId,
            refundNumber: `REF-${locked.confirmationCode}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
            idempotencyKey: allocation.idempotencyKey,
            status: review ? 'review' : 'pending',
            reason: 'guest_cancellation',
            amountCents: allocation.amountCents,
            currencyCode: locked.currencyCode,
            data: { policyReviewRequired: review, ...(review ? { candidate: true } : {}), entitlement },
          },
        });
        if (review) refundReviewCents += allocation.amountCents;
        else refundPendingCents += allocation.amountCents;
      }
    }
    const paymentState = reservationPaymentStatus({
      ...reconciliation,
      totalAmountCents: locked.totalAmountCents || 0,
      openRefundCents: refundPendingCents > 0 ? reconciliation.openRefundCents + refundPendingCents : reconciliation.openRefundCents,
    });
    await tx.reservation.update({ where: { id: locked.id }, data: { amountPaidCents: reconciliation.netPaidCents, paymentStatus: paymentState } });
    return { id: locked.id, confirmationCode: locked.confirmationCode, status: 'cancelled', refundPendingCents, refundReviewCents, refundAssessment: entitlement.status };
  }, { maxWait: 5000, timeout: 10000, isolationLevel: 'ReadCommitted' });
  // Open card attempts were marked in the closing transaction; now ask Stripe to cancel them.
  // Anything not settled here stays marked for the host and can't collect on old authority.
  if (closingAttempts.length) await reconcileClosingAttempts(context.prisma, closingAttempts);
  return cancelled;
}
