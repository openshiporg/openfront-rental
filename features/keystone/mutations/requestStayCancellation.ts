import crypto from 'node:crypto';

import { hashPublicOwnershipToken, isPublicOwnershipTokenActive, resolvePublicTokenRecord } from '../utils/publicTokenAccess';
import { allocatePendingCancellationRefunds } from '../utils/stayCancellationRefund';
import { reconcileReservationPaymentEvidence, reservationPaymentStatus } from '../utils/paymentReconciliation';

export async function requestStayCancellation(
  _root: unknown,
  args: { tripToken: string; reason?: string | null },
  context: any,
) {
  if (!/^[a-f0-9]{48}$/.test(args.tripToken || '')) throw new Error('Trip link is invalid.');
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

  return context.prisma.$transaction(async (tx: any) => {
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
        select: { id: true, status: true, amountCents: true, refundedAmountCents: true, currencyCode: true },
      }),
      tx.refund.findMany({
        where: { reservationId: locked.id },
        select: { id: true, paymentId: true, status: true, amountCents: true, currencyCode: true },
      }),
    ]);
    const reconciliation = reconcileReservationPaymentEvidence({ payments, refunds, currencyCode: locked.currencyCode });
    if (reconciliation.netPaidCents !== (locked.amountPaidCents || 0)) {
      throw new Error('Reservation paid amount does not reconcile to settled payment evidence.');
    }
    const now = new Date();
    await tx.reservation.update({
      where: { id: locked.id },
      data: {
        status: 'cancelled',
        cancelledAt: now,
        cancelledBy: 'guest',
        cancellationReason,
      },
    });
    await tx.calendarBlock.updateMany({
      where: { reservationId: locked.id, status: 'active' },
      data: { status: 'released' },
    });

    let refundPendingCents = 0;
    if (reconciliation.netPaidCents > 0) {
      const refundablePayments = payments.filter((payment: any) => ['succeeded', 'partially_refunded', 'refunded'].includes(payment.status || ''));
      const allocations = allocatePendingCancellationRefunds({
        reservationId: locked.id,
        netAmountPaidCents: reconciliation.netPaidCents,
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
            status: 'pending',
            reason: 'guest_cancellation',
            amountCents: allocation.amountCents,
            currencyCode: locked.currencyCode,
            data: { policyReviewRequired: true },
          },
        });
        refundPendingCents += allocation.amountCents;
      }
    }
    const paymentState = reservationPaymentStatus({
      ...reconciliation,
      totalAmountCents: locked.totalAmountCents || 0,
      openRefundCents: refundPendingCents > 0 ? reconciliation.openRefundCents + refundPendingCents : reconciliation.openRefundCents,
    });
    await tx.reservation.update({ where: { id: locked.id }, data: { amountPaidCents: reconciliation.netPaidCents, paymentStatus: paymentState } });
    return { id: locked.id, confirmationCode: locked.confirmationCode, status: 'cancelled', refundPendingCents };
  }, { maxWait: 5000, timeout: 10000, isolationLevel: 'ReadCommitted' });
}
