import { isTestTender, reconcileReservationPaymentEvidence, reservationPaymentStatus } from './paymentReconciliation';
import { createUncoveredRefundReviewLiabilities } from './refundReviewLiabilities';

const settledPaymentStatuses = new Set(['succeeded', 'partially_refunded', 'refunded']);

export { isTestTender } from './paymentReconciliation';

type SettlementEvent = {
  id: string;
  type: 'payment.succeeded';
  providerPaymentId: string;
  amountCents: number;
  currencyCode: string;
};

export function validateSettlementEvent(event: any): SettlementEvent {
  if (!event?.id || event.type !== 'payment.succeeded') throw new Error(`Unsupported payment webhook event: ${event?.type || 'unknown'}.`);
  const providerPaymentId = event.data?.providerPaymentId;
  const amountCents = event.data?.amountCents;
  const currencyCode = event.data?.currencyCode;
  if (!providerPaymentId || typeof providerPaymentId !== 'string') throw new Error('Provider payment id is required.');
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error('Payment amount must use positive integer cents.');
  if (typeof currencyCode !== 'string' || !/^[A-Za-z]{3}$/.test(currencyCode)) throw new Error('Payment currency code is invalid.');
  return { id: event.id, type: event.type, providerPaymentId, amountCents, currencyCode: currencyCode.toUpperCase() };
}

export async function settleSucceededPayment(tx: any, {
  paymentId,
  expectedAmountCents,
  expectedCurrencyCode,
  evidence,
  processedAt,
  processedByUserId,
}: {
  paymentId: string;
  expectedAmountCents: number;
  expectedCurrencyCode: string;
  evidence: Record<string, unknown>;
  processedAt: Date;
  processedByUserId?: string;
}) {
  const initial = await tx.payment.findUnique({ where: { id: paymentId } });
  if (!initial) throw new Error('Payment not found.');
  if (initial.reservationId) {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `reservation:${initial.reservationId}`);
    await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', initial.reservationId);
  }
  await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `payment-refund:${paymentId}`);
  const payment = await tx.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new Error('Payment not found.');
  if (payment.reservationId !== initial.reservationId) throw new Error('Payment reservation changed during settlement.');
  if (payment.amountCents !== expectedAmountCents) throw new Error('Webhook payment amount does not match immutable payment evidence.');
  if ((payment.currencyCode || '').toUpperCase() !== expectedCurrencyCode.toUpperCase()) {
    throw new Error('Webhook payment currency does not match immutable payment evidence.');
  }
  // A refund after settlement keeps the receipt settled; replays must not reopen or recapture it.
  const alreadySettled = settledPaymentStatuses.has(payment.status);
  if (!alreadySettled && !['pending', 'processing'].includes(payment.status)) {
    throw new Error(`Cannot settle a ${payment.status} payment.`);
  }
  // Test money and real money never meet. New attempts of the other mode are refused where they
  // start; one that still settles (an older attempt) is recorded as what actually happened and
  // kept out of this booking's balance, never refused and forgotten.
  const booking = payment.reservationId ? await tx.reservation.findUnique({ where: { id: payment.reservationId }, select: { testMode: true } }) : null;
  const segregated = Boolean(booking) && isTestTender(payment) !== (booking?.testMode === true);

  const updated = alreadySettled ? payment : await tx.payment.update({
    where: { id: payment.id },
    data: {
      status: 'succeeded',
      processedAt,
      ...(processedByUserId ? { processedById: processedByUserId } : {}),
      data: { ...(payment.data && typeof payment.data === 'object' ? payment.data : {}), settlement: evidence, ...(segregated ? { segregatedFromBooking: isTestTender(payment) ? 'test_tender_on_real_stay' : 'real_tender_on_test_booking' } : {}) },
    },
  });

  if (payment.reservationId) {
    const [reservation, payments, refunds] = await Promise.all([
      tx.reservation.findUnique({ where: { id: payment.reservationId } }),
      tx.payment.findMany({
        where: { reservationId: payment.reservationId },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { id: true, status: true, amountCents: true, refundedAmountCents: true, currencyCode: true, provider: true, data: true },
      }),
      tx.refund.findMany({
        where: { reservationId: payment.reservationId },
        select: { id: true, paymentId: true, status: true, amountCents: true, currencyCode: true },
      }),
    ]);
    if (reservation) {
      const testMode = reservation.testMode === true;
      const reconciliation = reconcileReservationPaymentEvidence({ payments, refunds, currencyCode: reservation.currencyCode, testMode });
      // Liabilities are allocated only to tender of the booking's own mode.
      const ledgerPayments = payments.filter((entry: any) => isTestTender(entry) === testMode);
      const totalAmountCents = reservation.totalAmountCents || 0;
      const cancelled = ['cancelled', 'no_show'].includes(reservation.status || '');
      const targetLiabilityCents = cancelled
        ? reconciliation.netPaidCents
        : Math.max(reconciliation.netPaidCents - totalAmountCents, 0);
      let liability = { createdCents: 0 };
      if (targetLiabilityCents > 0) {
        const lateSettlement = cancelled;
        const reason = reservation.status === 'no_show'
          ? 'stay_issue'
          : cancelled && reservation.cancelledBy === 'host' ? 'host_cancellation'
            : cancelled ? 'guest_cancellation' : 'overpayment';
        liability = await createUncoveredRefundReviewLiabilities(tx, {
          reservation,
          payments: cancelled ? ledgerPayments : [...ledgerPayments].reverse(),
          refunds,
          netPaidCents: reconciliation.netPaidCents,
          targetAmountCents: targetLiabilityCents,
          reason,
          liabilityType: lateSettlement
            ? `late_settlement_after_${reservation.status}`
            : 'overpayment_review',
          operationPrefix: lateSettlement ? 'late-settlement-review' : 'overpayment-review',
          // Money held above a live stay's total, or after a host cancellation, is owed. After a
          // guest cancellation or no-show, what's due depends on the policy: the host reviews it.
          review: reason === 'guest_cancellation' || reason === 'stay_issue',
        });
      }
      const paymentStatus = reservationPaymentStatus({
        ...reconciliation,
        totalAmountCents,
        openRefundCents: reconciliation.openRefundCents + liability.createdCents,
      });
      // Money never accepts a request: a pending stay stays pending until the host decides.
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { amountPaidCents: reconciliation.netPaidCents, paymentStatus },
      });
    }
  }
  return { payment: updated, alreadySettled };
}
