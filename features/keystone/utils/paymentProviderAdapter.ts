import {
  getPaymentAdapter,
  type CapturePaymentInput,
  type CreatePaymentInput,
  type PaymentAdapter,
  type PaymentAttemptIdentity,
  type PaymentCapability,
  type PaymentReferenceInput,
  type RefundInstructionInput,
} from '../../integrations/payment';

type PaymentProviderSelection = string | {
  code?: string | null;
  provider?: string | null;
  isInstalled?: boolean | null;
};

function adapterFor(provider: PaymentProviderSelection): PaymentAdapter {
  const code = typeof provider === 'string' ? provider : provider?.code || provider?.provider;
  if (!code) throw new Error('Payment provider is required.');
  if (typeof provider !== 'string' && provider.isInstalled === false) {
    throw new Error('Payment provider is not available.');
  }
  return getPaymentAdapter(code);
}

export class UnsupportedPaymentCapabilityError extends Error {
  constructor(providerCode: string, capability: PaymentCapability) {
    super(`Payment provider ${providerCode} does not support ${capability}.`);
    this.name = 'UnsupportedPaymentCapabilityError';
  }
}

function requireCapability(adapter: PaymentAdapter, capability: PaymentCapability) {
  if (!adapter.capabilities.includes(capability)) {
    throw new UnsupportedPaymentCapabilityError(adapter.code, capability);
  }
}

export async function createPayment({
  provider,
  reservation,
  amount,
  currency,
  idempotencyKey,
  metadata,
}: {
  provider: PaymentProviderSelection;
  reservation: CreatePaymentInput['reservation'];
  amount: number;
  currency: string;
  idempotencyKey?: string;
  metadata?: Record<string, string>;
}) {
  const adapter = adapterFor(provider);
  requireCapability(adapter, 'createPayment');
  return adapter.createPayment({ reservation, amount, currency, idempotencyKey, metadata });
}

export async function capturePayment({
  provider,
  paymentId,
  amount,
}: {
  provider: PaymentProviderSelection;
  paymentId: string;
  amount: number;
}) {
  const adapter = adapterFor(provider);
  requireCapability(adapter, 'capturePayment');
  return adapter.capturePayment({ paymentId, amount } satisfies CapturePaymentInput);
}

/** The manual adapter returns instructions only; actual refund attestation stays in the domain command. */
export async function refundPayment({
  provider,
  paymentId,
  amount,
  currency,
}: {
  provider: PaymentProviderSelection;
  paymentId: string;
  amount: number;
  currency: string;
}) {
  const adapter = adapterFor(provider);
  requireCapability(adapter, 'refundInstruction');
  return adapter.refundPayment({ paymentId, amount, currency } satisfies RefundInstructionInput);
}

export async function getPaymentStatus({
  provider,
  paymentId,
}: {
  provider: PaymentProviderSelection;
  paymentId: string;
}) {
  const adapter = adapterFor(provider);
  requireCapability(adapter, 'getPaymentStatus');
  return adapter.getPaymentStatus({ paymentId } satisfies PaymentReferenceInput);
}

export async function generatePaymentLink({
  provider,
  paymentId,
}: {
  provider: PaymentProviderSelection;
  paymentId: string;
}) {
  const adapter = adapterFor(provider);
  requireCapability(adapter, 'generatePaymentLink');
  return adapter.generatePaymentLink({ paymentId } satisfies PaymentReferenceInput);
}

export function verifyPaymentWebhook({
  providerCode,
  rawBody,
  headers,
}: {
  providerCode: string;
  rawBody: string;
  headers: Headers;
}) {
  const adapter = getPaymentAdapter(providerCode);
  requireCapability(adapter, 'verifyWebhook');
  if (!adapter.verifyWebhook) throw new Error(`Payment provider ${adapter.code} has no webhook verifier.`);
  return adapter.verifyWebhook({ rawBody, headers });
}

/** Provider-executed refund (card). Throws for adapters that only support host attestation. */
export async function createProviderRefund({
  provider,
  providerPaymentId,
  amount,
  idempotencyKey,
  metadata,
  expected,
  firstSubmittedAt,
}: {
  provider: PaymentProviderSelection;
  providerPaymentId: string;
  amount: number;
  idempotencyKey: string;
  metadata: Record<string, string>;
  expected: { rentalPaymentId: string; reservationId: string | null };
  firstSubmittedAt: string;
}) {
  const adapter = adapterFor(provider);
  if (!adapter.createRefund) throw new Error('This payment method doesn’t support refunds through the store. Record the refund after returning the money.');
  return adapter.createRefund({ providerPaymentId, amount, idempotencyKey, metadata, expected, firstSubmittedAt });
}

export async function getProviderRefund({
  provider,
  providerRefundId,
  providerPaymentId,
}: {
  provider: PaymentProviderSelection;
  providerRefundId: string;
  providerPaymentId: string;
}) {
  const adapter = adapterFor(provider);
  if (!adapter.getRefund) throw new Error('This payment method has no refund status to check.');
  return adapter.getRefund({ providerRefundId, providerPaymentId });
}

export async function cancelProviderPayment({ provider, paymentId, expected }: { provider: PaymentProviderSelection; paymentId: string; expected: PaymentAttemptIdentity }) {
  const adapter = adapterFor(provider);
  if (!adapter.cancelPayment) throw new Error('This payment method has no provider attempt to cancel.');
  return adapter.cancelPayment({ paymentId, expected });
}

export async function findProviderPayment({ provider, rentalPaymentId }: { provider: PaymentProviderSelection; rentalPaymentId: string }) {
  const adapter = adapterFor(provider);
  if (!adapter.findPayment) return null;
  return adapter.findPayment({ rentalPaymentId });
}
