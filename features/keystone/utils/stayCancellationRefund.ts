import crypto from 'node:crypto';

type RefundablePayment = {
  id: string;
  amountCents: number;
  refundedAmountCents: number;
};

export type PendingCancellationRefund = {
  paymentId: string;
  amountCents: number;
  idempotencyKey: string;
};

export function allocatePendingCancellationRefunds({
  reservationId,
  netAmountPaidCents,
  refundCents = netAmountPaidCents,
  payments,
}: {
  reservationId: string;
  netAmountPaidCents: number;
  /** The policy refund to allocate; defaults to everything paid (host-assessed refunds). */
  refundCents?: number;
  payments: RefundablePayment[];
}): PendingCancellationRefund[] {
  if (!Number.isSafeInteger(netAmountPaidCents) || netAmountPaidCents < 0) {
    throw new Error('Reservation paid amount must use non-negative integer cents.');
  }
  if (!Number.isSafeInteger(refundCents) || refundCents < 0 || refundCents > netAmountPaidCents) {
    throw new Error('The cancellation refund must be within the amount paid.');
  }
  const available = payments.reduce((sum, payment) => sum + payment.amountCents - payment.refundedAmountCents, 0);
  if (available !== netAmountPaidCents) throw new Error('Reservation payment evidence does not reconcile to the refundable balance.');

  let remaining = refundCents;
  const allocations: PendingCancellationRefund[] = [];
  for (const payment of payments) {
    const available = payment.amountCents - payment.refundedAmountCents;
    if (!Number.isSafeInteger(available) || available < 0) throw new Error('Payment refund evidence is invalid.');
    const amountCents = Math.min(available, remaining);
    if (amountCents > 0) {
      const digest = crypto.createHash('sha256').update(`${reservationId}|${payment.id}|${amountCents}|guest_cancellation`).digest('hex');
      allocations.push({ paymentId: payment.id, amountCents, idempotencyKey: `cancellation-refund:${digest}` });
      remaining -= amountCents;
    }
    if (remaining === 0) break;
  }
  if (remaining !== 0) throw new Error('Reservation payment evidence does not reconcile to the refundable balance.');
  return allocations;
}
