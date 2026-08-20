import { getPaymentAdapter } from '../../integrations/payment';

function adapterFor(provider: any) {
  const code = provider?.code || provider?.provider || provider;
  return getPaymentAdapter(code);
}

export async function createPayment({ provider, reservation, amount, currency }: { provider: any; reservation: any; amount: number; currency: string }) {
  return adapterFor(provider).createPayment({ reservation, amount, currency });
}

export async function capturePayment({ provider, paymentId, amount }: { provider: any; paymentId: string; amount?: number }) {
  return adapterFor(provider).capturePayment({ paymentId, amount });
}

export async function refundPayment({ provider, paymentId, amount, currency }: { provider: any; paymentId: string; amount: number; currency: string }) {
  return adapterFor(provider).refundPayment({ paymentId, amount, currency });
}

export async function getPaymentStatus({ provider, paymentId }: { provider: any; paymentId: string }) {
  return adapterFor(provider).getPaymentStatus({ paymentId });
}

export async function generatePaymentLink({ provider, paymentId }: { provider: any; paymentId: string }) {
  return adapterFor(provider).generatePaymentLink({ paymentId });
}

export function verifyPaymentWebhook({ providerCode, rawBody, headers }: { providerCode: string; rawBody: string; headers: Headers }) {
  const adapter = getPaymentAdapter(providerCode);
  if (!adapter.verifyWebhook) throw new Error(`Payment provider ${providerCode} does not accept public webhooks.`);
  return adapter.verifyWebhook({ rawBody, headers });
}
