import {
  getPaymentAdapter,
  type CapturePaymentInput,
  type CreatePaymentInput,
  type PaymentAdapter,
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
}: {
  provider: PaymentProviderSelection;
  reservation: CreatePaymentInput['reservation'];
  amount: number;
  currency: string;
}) {
  const adapter = adapterFor(provider);
  requireCapability(adapter, 'createPayment');
  return adapter.createPayment({ reservation, amount, currency });
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
