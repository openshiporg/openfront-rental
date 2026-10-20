import crypto from 'node:crypto';

/**
 * One key per intended receipt. A retry of the same submission reuses its operation key; a
 * separate instalment of the same amount has its own key and is a separate payment.
 */
export function manualPaymentOperationKey({ reservationId, operationKey }: { reservationId: string; operationKey: string }) {
  const key = operationKey.trim();
  if (key.length < 8 || key.length > 200 || Array.from(key).some((character) => character.charCodeAt(0) < 0x20 || character.charCodeAt(0) === 0x7f)) {
    throw new Error('Provide a stable payment operation key (8 to 200 characters).');
  }
  return crypto.createHash('sha256').update(`manual-payment:${reservationId}:${key}`).digest('hex');
}

/** Legacy amount-derived key: still recognised for replays of records created before operation keys. */
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
