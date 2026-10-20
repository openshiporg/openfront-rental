import crypto from 'node:crypto';

import { verifyPaymentWebhook } from '../utils/paymentProviderAdapter';
import { settleSucceededPayment, validateSettlementEvent } from '../utils/paymentSettlement';

/**
 * A webhook outcome the caller may see: a stable code and a safe message. Anything else is
 * an infrastructure failure, answered with a generic 500 so the provider retries.
 */
export class PaymentWebhookError extends Error {
  constructor(readonly code: 'invalid_signature' | 'invalid_payload' | 'unsupported_provider' | 'conflict' | 'body_too_large' | 'body_timeout', readonly status: number, message: string) {
    super(message);
    this.name = 'PaymentWebhookError';
  }
}

function verified<T>(run: () => T, code: 'invalid_signature' | 'invalid_payload', message: string): T {
  try {
    return run();
  } catch {
    throw new PaymentWebhookError(code, 400, message);
  }
}

export async function processPaymentWebhook(
  context: any,
  providerCode: string,
  rawBody: string,
  headers: Headers,
) {
  // Cryptographic verification is deliberately completed before any database
  // lookup or elevated context can observe provider-selected identifiers.
  const verifiedEvent = verified(() => verifyPaymentWebhook({ providerCode, rawBody, headers }), 'invalid_signature', 'Webhook signature or provider is invalid.');
  if (verifiedEvent.type === 'ignored') return { received: true, ignored: true };
  const event = verified(() => validateSettlementEvent(verifiedEvent), 'invalid_payload', 'Webhook payload is not a supported settlement event.');
  const payloadSha256 = crypto.createHash('sha256').update(rawBody).digest('hex');
  const replayKey = `${providerCode}:${event.id}`;
  const processedAt = new Date();
  const identity = verifiedEvent.data;

  return context.prisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `payment-event:${replayKey}`);
    const existing = await tx.paymentWebhookEvent.findUnique({ where: { replayKey } });
    if (existing) {
      if (existing.payloadSha256 !== payloadSha256) throw new PaymentWebhookError('conflict', 409, 'Webhook replay payload does not match.');
      return { received: true, duplicate: true, status: existing.status };
    }

    let payment = await tx.payment.findFirst({
      where: { provider: providerCode, providerPaymentId: event.providerPaymentId },
    });
    // An attempt whose Stripe id was never attached (a crash before attach) is found by the
    // exact local id this server wrote into the intent's signed metadata.
    if (!payment && providerCode === 'pp_stripe_stripe' && typeof identity?.paymentId === 'string') {
      const candidate = await tx.payment.findUnique({ where: { id: identity.paymentId } });
      if (candidate && candidate.provider === providerCode && String(candidate.providerPaymentId || '').startsWith('reserved:')
        && candidate.idempotencyKey === identity.idempotencyKey && candidate.reservationId === identity.reservationId) {
        payment = await tx.payment.update({ where: { id: candidate.id }, data: { providerPaymentId: event.providerPaymentId } });
      }
    }
    if (!payment?.hostOrganizationId) {
      // Shared Stripe account: acknowledge foreign/unmapped payments without writes.
      return { received: true, ignored: true };
    }

    if (providerCode === 'pp_stripe_stripe') {
      if (identity?.source !== 'openfront-rental' || identity?.livemode !== false
        || identity?.paymentId !== payment.id || identity?.reservationId !== payment.reservationId
        || identity?.idempotencyKey !== payment.idempotencyKey) {
        throw new PaymentWebhookError('conflict', 409, 'Webhook payment identity does not match.');
      }
    }

    let settlement;
    try {
      settlement = await settleSucceededPayment(tx, {
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
    } catch (error) {
      // Amount, currency, state or test-booking mismatches are conflicts, not outages.
      if (error instanceof Error && /does not match|Cannot settle|can only settle/.test(error.message)) {
        throw new PaymentWebhookError('conflict', 409, 'Webhook settlement conflicts with the recorded payment.');
      }
      throw error;
    }
    const status = settlement.alreadySettled ? 'ignored' : 'processed';
    // A payment whose provider record was removed before deletion was guarded keeps its own
    // immutable provider code as evidence; the event is still recorded against the payment.
    await tx.paymentWebhookEvent.create({
      data: {
        hostOrganizationId: payment.hostOrganizationId,
        paymentProviderId: payment.paymentProviderId || null,
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
          ...(payment.paymentProviderId ? {} : { providerRecordMissing: true }),
        },
      },
    });
    return { received: true, duplicate: false, status };
  }, { maxWait: 5000, timeout: 10000, isolationLevel: 'ReadCommitted' });
}
