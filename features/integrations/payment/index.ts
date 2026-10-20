import crypto from 'node:crypto';

import * as manual from './manual';
import * as stripe from './stripe';
import type { PaymentAttemptIdentity } from './errors';

export { ProviderDefiniteRejection, ProviderOutcomeUnknown, type PaymentAttemptIdentity } from './errors';

export type PaymentProviderCode = 'pp_system_default' | 'pp_signed_test' | 'pp_stripe_stripe';
export type PaymentProviderMode = 'manual' | 'signed_test' | 'stripe';
export type PaymentCapability =
  | 'createPayment'
  | 'capturePayment'
  | 'refundInstruction'
  | 'getPaymentStatus'
  | 'generatePaymentLink'
  | 'verifyWebhook';

export type PaymentOperationResult = {
  status: 'pending' | 'captured' | 'failed' | 'unknown';
  providerPaymentId?: string;
  amount?: number;
  data?: Record<string, unknown>;
};

export type CreatePaymentInput = {
  reservation: { id: string; confirmationCode?: string | null };
  amount: number;
  currency: string;
  idempotencyKey?: string;
  metadata?: Record<string, string>;
};
export type CapturePaymentInput = { paymentId: string; amount: number };
export type RefundInstructionInput = { paymentId: string; amount: number; currency: string };
export type PaymentReferenceInput = { paymentId: string };

export type VerifiedPaymentEvent = { id: string; type: string; data?: Record<string, unknown> };

export type PaymentAdapter = {
  code: PaymentProviderCode;
  mode: PaymentProviderMode;
  capabilities: readonly PaymentCapability[];
  createPayment: (args: CreatePaymentInput) => Promise<PaymentOperationResult>;
  capturePayment: (args: CapturePaymentInput) => Promise<PaymentOperationResult>;
  /** Returns operator instructions only; it never transfers or verifies returned funds. */
  refundPayment: (args: RefundInstructionInput) => Promise<PaymentOperationResult>;
  getPaymentStatus: (args: PaymentReferenceInput) => Promise<PaymentOperationResult>;
  generatePaymentLink: (args: PaymentReferenceInput) => Promise<string | null>;
  verifyWebhook?: (args: { rawBody: string; headers: Headers }) => VerifiedPaymentEvent;
  /** Provider-executed refunds (card). Manual refunds are attested by the host instead. */
  createRefund?: (args: { providerPaymentId: string; amount: number; idempotencyKey: string; metadata: Record<string, string>; expected: { rentalPaymentId: string; reservationId: string | null }; firstSubmittedAt: string }) => Promise<ProviderRefundResult>;
  getRefund?: (args: { providerRefundId: string; providerPaymentId: string }) => Promise<ProviderRefundResult>;
  /** Cancels a provider attempt that can no longer be paid; returns its authoritative state. */
  cancelPayment?: (args: PaymentReferenceInput & { expected: PaymentAttemptIdentity }) => Promise<PaymentOperationResult>;
  /** Recovers an attempt the provider created but this store never attached, by server-written metadata. */
  findPayment?: (args: { rentalPaymentId: string }) => Promise<PaymentOperationResult | null>;
};

export type ProviderRefundResult = {
  providerRefundId: string;
  status: 'succeeded' | 'pending' | 'failed';
  providerStatus: string | null;
  amountCents: number;
  currencyCode: string;
  rentalRefundId: string | null;
  failureReason: string | null;
};

export function verifySignedWebhook({ rawBody, signature, secret }: { rawBody: string; signature: string; secret: string }) {
  if (!secret || !signature) throw new Error('Payment webhook signature is required.');
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const providedBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  if (providedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    throw new Error('Payment webhook signature is invalid.');
  }
  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    throw new Error('Payment webhook payload is invalid.');
  }
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw new Error('Payment webhook event must be an object.');
  }
  const record = event as Record<string, unknown>;
  if (typeof record.id !== 'string' || !record.id || typeof record.type !== 'string' || !record.type) {
    throw new Error('Payment webhook event id and type are required.');
  }
  if (record.data !== undefined && (!record.data || typeof record.data !== 'object' || Array.isArray(record.data))) {
    throw new Error('Payment webhook event data must be an object.');
  }
  return event as VerifiedPaymentEvent;
}

const manualAdapter: PaymentAdapter = {
  code: 'pp_system_default',
  mode: 'manual',
  capabilities: ['createPayment', 'capturePayment', 'refundInstruction', 'getPaymentStatus', 'generatePaymentLink'],
  createPayment: manual.createPaymentFunction,
  capturePayment: manual.capturePaymentFunction,
  refundPayment: manual.refundPaymentFunction,
  getPaymentStatus: manual.getPaymentStatusFunction,
  generatePaymentLink: manual.generatePaymentLinkFunction,
};

const signedTestAdapter: PaymentAdapter = {
  code: 'pp_signed_test',
  mode: 'signed_test',
  capabilities: ['getPaymentStatus', 'verifyWebhook'],
  async createPayment() { throw new Error('The signed test provider is webhook-only.'); },
  async capturePayment() { throw new Error('The signed test provider settles only through verified webhooks.'); },
  async refundPayment() { throw new Error('The signed test provider does not issue refunds.'); },
  async getPaymentStatus({ paymentId }) { return { status: 'pending', data: { paymentId } }; },
  async generatePaymentLink() { return null; },
  verifyWebhook({ rawBody, headers }) {
    const secret = process.env.PAYMENT_WEBHOOK_SIGNED_TEST_SECRET || '';
    const signature = headers.get('x-openfront-signature') || '';
    return verifySignedWebhook({ rawBody, signature, secret });
  },
};

const stripeAdapter: PaymentAdapter = {
  code: 'pp_stripe_stripe',
  mode: 'stripe',
  capabilities: ['createPayment', 'getPaymentStatus', 'verifyWebhook'],
  createPayment: stripe.createPaymentFunction,
  createRefund: stripe.createRefundFunction,
  getRefund: stripe.getRefundFunction,
  getPaymentStatus: stripe.getPaymentStatusFunction,
  cancelPayment: stripe.cancelPaymentFunction,
  findPayment: stripe.findPaymentFunction,
  verifyWebhook: stripe.verifyWebhook,
  async capturePayment() { throw new Error('Card payment is confirmed by Stripe.'); },
  async refundPayment() { throw new Error('Card refunds require host review.'); },
  async generatePaymentLink() { return null; },
};

const paymentProviderAdapters = {
  pp_system_default: manualAdapter,
  pp_signed_test: signedTestAdapter,
  pp_stripe_stripe: stripeAdapter,
} satisfies Record<PaymentProviderCode, PaymentAdapter>;

export function isSupportedPaymentProviderCode(providerCode: unknown): providerCode is PaymentProviderCode {
  return typeof providerCode === 'string' && Object.prototype.hasOwnProperty.call(paymentProviderAdapters, providerCode);
}

export function getPaymentAdapter(providerCode: string): PaymentAdapter {
  if (!isSupportedPaymentProviderCode(providerCode)) throw new Error('Unsupported payment provider.');
  return paymentProviderAdapters[providerCode];
}

export { paymentProviderAdapters };
