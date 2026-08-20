import crypto from 'node:crypto';

import * as manual from './manual';

export type PaymentAdapter = {
  code: string;
  createPayment: (args: any) => Promise<any>;
  capturePayment: (args: any) => Promise<any>;
  refundPayment: (args: any) => Promise<any>;
  getPaymentStatus: (args: any) => Promise<any>;
  generatePaymentLink: (args: any) => Promise<any>;
  verifyWebhook?: (args: { rawBody: string; headers: Headers }) => any;
};

export function verifySignedWebhook({ rawBody, signature, secret }: { rawBody: string; signature: string; secret: string }) {
  if (!secret || !signature) throw new Error('Payment webhook signature is required.');
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const providedBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  if (providedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    throw new Error('Payment webhook signature is invalid.');
  }
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    throw new Error('Payment webhook payload is invalid.');
  }
  if (!event?.id || !event?.type) throw new Error('Payment webhook event id and type are required.');
  return event;
}

const manualAdapter: PaymentAdapter = {
  code: 'pp_system_default',
  createPayment: manual.createPaymentFunction,
  capturePayment: manual.capturePaymentFunction,
  refundPayment: manual.refundPaymentFunction,
  getPaymentStatus: manual.getPaymentStatusFunction,
  generatePaymentLink: manual.generatePaymentLinkFunction,
};

const signedTestAdapter: PaymentAdapter = {
  code: 'pp_signed_test',
  async createPayment() { throw new Error('The signed test provider is webhook-only.'); },
  async capturePayment() { throw new Error('The signed test provider settles only through verified webhooks.'); },
  async refundPayment() { throw new Error('The signed test provider does not issue refunds.'); },
  async getPaymentStatus({ paymentId }: any) { return { status: 'pending', data: { paymentId } }; },
  async generatePaymentLink() { return null; },
  verifyWebhook({ rawBody, headers }) {
    const secret = process.env.PAYMENT_WEBHOOK_SIGNED_TEST_SECRET || '';
    const signature = headers.get('x-openfront-signature') || '';
    return verifySignedWebhook({ rawBody, signature, secret });
  },
};

const paymentProviderAdapters = {
  pp_system_default: manualAdapter,
  pp_signed_test: signedTestAdapter,
} as const;

export type PaymentProviderCode = keyof typeof paymentProviderAdapters;

export function getPaymentAdapter(providerCode: string): PaymentAdapter {
  const adapter = paymentProviderAdapters[providerCode as PaymentProviderCode];
  if (!adapter) throw new Error(`Unsupported payment provider: ${providerCode}`);
  return adapter;
}

export { paymentProviderAdapters };
