import crypto from 'node:crypto';

import Stripe from 'stripe';

import { ProviderDefiniteRejection, ProviderOutcomeUnknown, type PaymentAttemptIdentity } from './errors';

export const STRIPE_PROVIDER_CODE = 'pp_stripe_stripe';
export const RENTAL_PAYMENT_SOURCE = 'openfront-rental';

/** Stripe keeps idempotency keys for 24 hours; the original request is replayed only well inside that. */
export const STRIPE_KEY_REPLAY_WINDOW_MS = 22 * 60 * 60 * 1000;

/**
 * Nonsecret identity of the configured account credentials (a one-way fingerprint, never the
 * key). Attempts record it, so an attempt is never acted on, or judged absent, under other keys.
 */
export function stripeCredentialVersion() {
  const key = process.env.STRIPE_SECRET_KEY || '';
  return key ? crypto.createHash('sha256').update(`rental-stripe:${key}`).digest('hex').slice(0, 16) : null;
}

/**
 * This integration deliberately cannot initiate live-mode payments. Enabling it is an
 * explicit sandbox choice: card tender is Stripe TEST money, only accepted for stays
 * booked while test mode was on, and always shown to guests and hosts as a test payment.
 */
export function stripeCheckoutEnabled() {
  return process.env.STRIPE_ENABLED === 'true'
    && Boolean(process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'))
    && Boolean(process.env.STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_'))
    && Boolean(process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_'));
}

/** The only card mode this store supports. `null` means card payment is off. */
export function stripeCardMode(): 'test' | null {
  return stripeCheckoutEnabled() ? 'test' : null;
}

function client() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith('sk_test_')) throw new Error('Card payment is not configured.');
  return new Stripe(key, { timeout: 20_000, maxNetworkRetries: 1 });
}

function settlement(intent: Stripe.PaymentIntent) {
  return {
    amountCents: intent.amount_received,
    currencyCode: intent.currency.toUpperCase(),
    source: intent.metadata.source,
    reservationId: intent.metadata.reservationId,
    paymentId: intent.metadata.rentalPaymentId,
    idempotencyKey: intent.metadata.idempotencyKey,
    livemode: intent.livemode,
  };
}

export async function createPaymentFunction({ amount, currency, reservation, idempotencyKey, metadata }: {
  amount: number; currency: string; reservation: { id: string }; idempotencyKey?: string; metadata?: Record<string, string>;
}) {
  if (!stripeCheckoutEnabled()) throw new Error('Card payment is currently unavailable.');
  if (!Number.isSafeInteger(amount) || amount <= 0 || !idempotencyKey || !metadata?.rentalPaymentId) throw new Error('Invalid card payment request.');
  const intent = await client().paymentIntents.create({
    amount, currency: currency.toLowerCase(), payment_method_types: ['card'],
    metadata: { ...metadata, source: RENTAL_PAYMENT_SOURCE, reservationId: reservation.id, idempotencyKey },
  }, { idempotencyKey });
  if (intent.livemode) throw new Error('Live payments are not available.');
  return { status: 'pending' as const, providerPaymentId: intent.id, data: { clientSecret: intent.client_secret } };
}

function intentResult(intent: Stripe.PaymentIntent) {
  return {
    // `canceled` is terminal: the attempt can never collect money. Every other unpaid
    // state (including a declined card) stays retryable with the same intent.
    status: intent.status === 'succeeded' ? 'captured' as const : intent.status === 'canceled' ? 'failed' as const : 'pending' as const,
    providerPaymentId: intent.id,
    data: { ...settlement(intent), providerStatus: intent.status, clientSecret: intent.client_secret },
  };
}

export async function getPaymentStatusFunction({ paymentId }: { paymentId: string }) {
  return intentResult(await client().paymentIntents.retrieve(paymentId));
}

/** The intent must be this store's test intent for exactly this local attempt. */
function assertIntentIdentity(intent: Stripe.PaymentIntent, expected: PaymentAttemptIdentity) {
  if (intent.livemode || intent.metadata?.source !== RENTAL_PAYMENT_SOURCE
    || intent.metadata?.rentalPaymentId !== expected.rentalPaymentId
    || (intent.metadata?.reservationId || null) !== (expected.reservationId || null)
    || (expected.idempotencyKey && intent.metadata?.idempotencyKey !== expected.idempotencyKey)
    || intent.amount !== expected.amountCents
    || intent.currency.toUpperCase() !== expected.currencyCode.toUpperCase()) {
    throw new Error('This card payment doesn’t match this payment attempt. Nothing was changed.');
  }
}

/**
 * Cancels an intent that can no longer be paid. Its full identity is checked against the local
 * attempt before anything is changed. A succeeded intent is returned as-is for settlement.
 */
export async function cancelPaymentFunction({ paymentId, expected }: { paymentId: string; expected: PaymentAttemptIdentity }) {
  const stripe = client();
  const intent = await stripe.paymentIntents.retrieve(paymentId);
  assertIntentIdentity(intent, expected);
  if (['succeeded', 'canceled', 'processing'].includes(intent.status)) return intentResult(intent);
  return intentResult(await stripe.paymentIntents.cancel(paymentId, { cancellation_reason: 'abandoned' }));
}

/**
 * Finds the intent created for a local payment attempt whose Stripe id was never
 * attached (a crash between create and attach). Only metadata this server wrote is trusted.
 */
export async function findPaymentFunction({ rentalPaymentId }: { rentalPaymentId: string }) {
  if (!/^[a-z0-9]+$/i.test(rentalPaymentId)) throw new Error('Invalid card payment reference.');
  const found = await client().paymentIntents.search({ query: `metadata['rentalPaymentId']:'${rentalPaymentId}'`, limit: 10 });
  const own = found.data.filter((intent) => !intent.livemode && intent.metadata?.source === RENTAL_PAYMENT_SOURCE && intent.metadata?.rentalPaymentId === rentalPaymentId);
  if (own.length > 1) throw new Error('More than one card payment matches this attempt. Reconcile it in Stripe.');
  return own[0] ? intentResult(own[0]) : null;
}

/** Stripe SDK verifies the raw body, timestamp tolerance and signing secret. */
export function verifyWebhook({ rawBody, headers }: { rawBody: string; headers: Headers }) {
  const signature = headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) throw new Error('Payment webhook signature is required.');
  let event: Stripe.Event;
  try { event = client().webhooks.constructEvent(rawBody, signature, secret); }
  catch { throw new Error('Payment webhook signature is invalid.'); }
  const intent = event.data.object as Stripe.PaymentIntent;
  if (event.livemode || event.type !== 'payment_intent.succeeded' || intent.metadata?.source !== RENTAL_PAYMENT_SOURCE) {
    return { id: event.id, type: 'ignored' };
  }
  if (intent.status !== 'succeeded' || intent.livemode) throw new Error('Payment settlement is incomplete.');
  return { id: event.id, type: 'payment.succeeded', data: { ...settlement(intent), providerPaymentId: intent.id } };
}

/**
 * Host-initiated refund of a Rental TEST PaymentIntent, ported from Hotel's
 * refundPaymentFunction. The idempotency key is stable per attempt, so a retry after a
 * lost response returns the same Stripe refund instead of creating a second one.
 */
export async function createRefundFunction({ providerPaymentId, amount, idempotencyKey, metadata, expected, firstSubmittedAt }: {
  providerPaymentId: string; amount: number; idempotencyKey: string; metadata: Record<string, string>;
  expected: { rentalPaymentId: string; reservationId: string | null }; firstSubmittedAt: string;
}) {
  if (!providerPaymentId.startsWith('pi_') || !Number.isSafeInteger(amount) || amount <= 0 || !idempotencyKey || !metadata?.rentalRefundId) throw new Error('Invalid card refund request.');
  const stripe = client();
  const intent = await stripe.paymentIntents.retrieve(providerPaymentId);
  // The payment must be this store's, for exactly this attempt and stay, before any refund is made.
  if (intent.livemode || intent.metadata?.source !== RENTAL_PAYMENT_SOURCE
    || intent.metadata?.rentalPaymentId !== expected.rentalPaymentId
    || (intent.metadata?.reservationId || null) !== (expected.reservationId || null)) throw new Error('This card payment doesn’t match this refund. Nothing was changed.');
  // Adopt a refund already created for this liability (a lost response, or an
  // idempotency key past Stripe's retention window) instead of refunding twice.
  // Read every page of this payment's refunds (bounded); a match on any page is adopted.
  let prior: Stripe.Refund | undefined;
  let startingAfter: string | undefined;
  for (let page = 0; !prior; page += 1) {
    if (page >= 20) throw new Error('Too many refunds to check this payment safely. Reconcile it in Stripe before refunding again.');
    const existing = await stripe.refunds.list({ payment_intent: providerPaymentId, limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) });
    prior = existing.data.find((refund) => refund.metadata?.rentalRefundId === metadata.rentalRefundId && refund.status !== 'failed' && refund.status !== 'canceled');
    if (!existing.has_more || !existing.data.length) break;
    startingAfter = existing.data[existing.data.length - 1].id;
  }
  if (prior) return refundResult(prior, providerPaymentId);
  // No refund found is not proof the original request had no effect: once its key may have
  // expired, sending it again could refund twice. Only a request still inside the key's
  // retention is (re)sent; anything older stays open for reconciliation in Stripe.
  const submittedAt = Date.parse(firstSubmittedAt);
  if (!Number.isFinite(submittedAt) || Date.now() - submittedAt >= STRIPE_KEY_REPLAY_WINDOW_MS) {
    throw new ProviderOutcomeUnknown('Stripe shows no refund for this request, but it was first sent too long ago to resend safely. Check the payment in Stripe and record what happened.');
  }
  let refund: Stripe.Refund;
  try {
    refund = await stripe.refunds.create({
      payment_intent: providerPaymentId,
      amount,
      metadata: { ...metadata, source: RENTAL_PAYMENT_SOURCE },
    }, { idempotencyKey });
  } catch (error: any) {
    // Only Stripe's definite refusal of this exact create request means nothing happened.
    if (['StripeInvalidRequestError', 'StripeCardError'].includes(error?.type) && error?.statusCode && error.statusCode < 500 && error?.type !== 'StripeIdempotencyError') {
      throw new ProviderDefiniteRejection(typeof error.message === 'string' ? error.message : 'Stripe refused this refund.');
    }
    throw error;
  }
  return refundResult(refund, providerPaymentId);
}

export async function getRefundFunction({ providerRefundId, providerPaymentId }: { providerRefundId: string; providerPaymentId: string }) {
  if (!providerRefundId.startsWith('re_')) throw new Error('Invalid card refund reference.');
  return refundResult(await client().refunds.retrieve(providerRefundId), providerPaymentId);
}

function refundResult(refund: Stripe.Refund, providerPaymentId: string) {
  const paymentIntent = typeof refund.payment_intent === 'string' ? refund.payment_intent : refund.payment_intent?.id;
  if (paymentIntent !== providerPaymentId || refund.metadata?.source !== RENTAL_PAYMENT_SOURCE) throw new Error('Card refund identity does not match this payment.');
  return {
    providerRefundId: refund.id,
    status: refund.status === 'succeeded' ? 'succeeded' as const
      : refund.status === 'failed' || refund.status === 'canceled' ? 'failed' as const
        : 'pending' as const,
    providerStatus: refund.status,
    amountCents: refund.amount,
    currencyCode: refund.currency.toUpperCase(),
    rentalRefundId: refund.metadata?.rentalRefundId || null,
    failureReason: refund.failure_reason || null,
  };
}
