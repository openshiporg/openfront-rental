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
  payments,
}: {
  reservationId: string;
  netAmountPaidCents: number;
  payments: RefundablePayment[];
}): PendingCancellationRefund[] {
  if (!Number.isSafeInteger(netAmountPaidCents) || netAmountPaidCents < 0) {
    throw new Error('Reservation paid amount must use non-negative integer cents.');
  }

  let remaining = netAmountPaidCents;
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
