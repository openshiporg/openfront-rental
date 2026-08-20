import crypto from 'node:crypto';

import { verifyPaymentWebhook } from '../utils/paymentProviderAdapter';
import { settleSucceededPayment, validateSettlementEvent } from '../utils/paymentSettlement';

export async function processPaymentWebhook(
  context: any,
  providerCode: string,
  rawBody: string,
  headers: Headers,
) {
  // Cryptographic verification is deliberately completed before any database
  // lookup or elevated context can observe provider-selected identifiers.
  const verified = verifyPaymentWebhook({ providerCode, rawBody, headers });
  const event = validateSettlementEvent(verified);
  const payloadSha256 = crypto.createHash('sha256').update(rawBody).digest('hex');
  const replayKey = `${providerCode}:${event.id}`;
  const processedAt = new Date();

  return context.prisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `payment-event:${replayKey}`);
    const existing = await tx.paymentWebhookEvent.findUnique({ where: { replayKey } });
    if (existing) return { received: true, duplicate: true, status: existing.status };

    const payment = await tx.payment.findFirst({
      where: { provider: providerCode, providerPaymentId: event.providerPaymentId },
    });
    if (!payment?.hostOrganizationId || !payment.paymentProviderId) {
      throw new Error('Verified webhook does not map to a local payment provider record.');
    }

    const settlement = await settleSucceededPayment(tx, {
      paymentId: payment.id,
      expectedAmountCents: event.amountCents,
      expectedCurrencyCode: event.currencyCode,
      evidence: {
        providerCode,
        providerEventId: event.id,
        eventType: event.type,
        payloadSha256,
      },
      processedAt,
    });
    const status = settlement.alreadySettled ? 'ignored' : 'processed';
    await tx.paymentWebhookEvent.create({
      data: {
        hostOrganizationId: payment.hostOrganizationId,
        paymentProviderId: payment.paymentProviderId,
        paymentId: payment.id,
        replayKey,
        providerCode,
        providerEventId: event.id,
        eventType: event.type,
        payloadSha256,
        status,
        processedAt,
        evidence: {
          providerPaymentId: event.providerPaymentId,
          amountCents: event.amountCents,
          currencyCode: event.currencyCode,
          alreadySettled: settlement.alreadySettled,
        },
      },
    });
    return { received: true, duplicate: false, status };
  }, { maxWait: 5000, timeout: 10000, isolationLevel: 'ReadCommitted' });
}
