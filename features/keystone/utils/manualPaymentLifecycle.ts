import crypto from 'node:crypto';

export function createManualPaymentIdempotencyKey({
  reservationId,
  amount,
  currencyCode,
}: {
  reservationId: string;
  amount: number;
  currencyCode: string;
}) {
  return crypto
    .createHash('sha256')
    .update(`${reservationId}:${amount}:${currencyCode.toUpperCase()}`)
    .digest('hex');
}

export function validateManualPaymentSession({ amount, outstanding }: { amount: number; outstanding: number }) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Payment amount must be greater than zero and stored in integer cents.');
  }
  if (amount > outstanding) {
    throw new Error('Payment amount cannot exceed the outstanding balance.');
  }
}

export function assertCaptureTransition(status?: string | null) {
  if (status === 'succeeded') return 'already_succeeded' as const;
  if (status === 'refunded' || status === 'cancelled' || status === 'failed') {
    throw new Error(`A ${status} payment cannot be captured.`);
  }
  if (status !== 'pending' && status !== 'processing') {
    throw new Error('This payment is not in a capturable state.');
  }
  return 'capture' as const;
}
