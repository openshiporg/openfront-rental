import crypto from 'node:crypto';

import { resolvePublicTokenRecord } from '../utils/publicTokenAccess';
import { allocatePendingCancellationRefunds } from '../utils/stayCancellationRefund';

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
    const locked = await tx.reservation.findUnique({ where: { id: reservation.id } });
    if (!locked || !['pending', 'confirmed'].includes(locked.status)) throw new Error('This stay can no longer be cancelled online.');
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
    if (locked.amountPaidCents > 0) {
      const payments = await tx.payment.findMany({
        where: { reservationId: locked.id, status: { in: ['succeeded', 'partially_refunded'] } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true, amountCents: true, refundedAmountCents: true },
      });
      const allocations = allocatePendingCancellationRefunds({
        reservationId: locked.id,
        netAmountPaidCents: locked.amountPaidCents,
        payments,
      });
      for (const allocation of allocations) {
        await tx.refund.create({
          data: {
            hostOrganizationId: locked.hostOrganizationId,
            reservationId: locked.id,
            paymentId: allocation.paymentId,
            refundNumber: `REF-${locked.confirmationCode}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
            idempotencyKey: allocation.idempotencyKey,
            providerRefundId: `pending-${crypto.randomUUID()}`,
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
    return { id: locked.id, confirmationCode: locked.confirmationCode, status: 'cancelled', refundPendingCents };
  }, { maxWait: 5000, timeout: 10000, isolationLevel: 'ReadCommitted' });
}
