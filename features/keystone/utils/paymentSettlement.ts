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
}: {
  paymentId: string;
  expectedAmountCents: number;
  expectedCurrencyCode: string;
  evidence: Record<string, unknown>;
  processedAt: Date;
}) {
  await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `payment:${paymentId}`);
  const payment = await tx.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new Error('Payment not found.');
  if (payment.amountCents !== expectedAmountCents) throw new Error('Webhook payment amount does not match immutable payment evidence.');
  if ((payment.currencyCode || '').toUpperCase() !== expectedCurrencyCode.toUpperCase()) {
    throw new Error('Webhook payment currency does not match immutable payment evidence.');
  }
  if (payment.status === 'succeeded') return { payment, alreadySettled: true };
  if (!['pending', 'processing'].includes(payment.status)) throw new Error(`Cannot settle a ${payment.status} payment.`);

  const updated = await tx.payment.update({
    where: { id: payment.id },
    data: {
      status: 'succeeded',
      processedAt,
      data: { ...(payment.data && typeof payment.data === 'object' ? payment.data : {}), settlement: evidence },
    },
  });

  if (payment.reservationId) {
    const [reservation, paid] = await Promise.all([
      tx.reservation.findUnique({ where: { id: payment.reservationId } }),
      tx.payment.aggregate({
        where: { reservationId: payment.reservationId, status: 'succeeded' },
        _sum: { amountCents: true },
      }),
    ]);
    if (reservation) {
      const amountPaidCents = Math.min(paid._sum.amountCents || 0, reservation.totalAmountCents || 0);
      const isPaid = amountPaidCents >= (reservation.totalAmountCents || 0);
      await tx.reservation.update({
        where: { id: reservation.id },
        data: {
          amountPaidCents,
          paymentStatus: isPaid ? 'paid' : amountPaidCents > 0 ? 'partial' : 'unpaid',
          status: isPaid && reservation.status === 'pending' ? 'confirmed' : reservation.status,
        },
      });
    }
  }
  return { payment: updated, alreadySettled: false };
}
