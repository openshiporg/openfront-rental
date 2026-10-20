import { NextResponse } from 'next/server';

import { keystoneContext } from '@/features/keystone/context';
import { PaymentWebhookError, processPaymentWebhook } from '@/features/keystone/mutations/paymentWebhook';

const MAX_WEBHOOK_BODY_BYTES = 65_536;
const WEBHOOK_BODY_TIMEOUT_MS = 2_000;

async function readPaymentWebhookBody(request: Request) {
  const contentLength = Number(request.headers.get('content-length') || '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BODY_BYTES) {
    throw new PaymentWebhookError('body_too_large', 413, 'Request body is too large.');
  }
  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let timer: NodeJS.Timeout | undefined;
  const deadline = Date.now() + WEBHOOK_BODY_TIMEOUT_MS;

  try {
    while (true) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) throw new PaymentWebhookError('body_timeout', 408, 'Request body timed out.');
      const result = await Promise.race([
        reader.read(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new PaymentWebhookError('body_timeout', 408, 'Request body timed out.')), remainingMs);
        }),
      ]);
      if (timer) clearTimeout(timer);
      if (result.done) break;
      total += result.value.byteLength;
      if (total > MAX_WEBHOOK_BODY_BYTES) {
        throw new PaymentWebhookError('body_too_large', 413, 'Request body is too large.');
      }
      chunks.push(result.value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
    reader.releaseLock();
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf8');
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ providerCode: string }> },
) {
  const { providerCode } = await params;
  try {
    const rawBody = await readPaymentWebhookBody(request);
    const result = await processPaymentWebhook(keystoneContext as any, providerCode, rawBody, request.headers);
    return NextResponse.json(result);
  } catch (error) {
    // Known outcomes answer with their code; anything else is a retryable 500 with a
    // correlation id. Bodies, signatures and raw database errors are never echoed or logged.
    const correlationId = crypto.randomUUID();
    if (error instanceof PaymentWebhookError) {
      console.warn('Payment webhook rejected', { providerCode, code: error.code, correlationId });
      return NextResponse.json({ error: error.message, code: error.code, correlationId }, { status: error.status });
    }
    console.error('Payment webhook failed', { providerCode, correlationId, errorName: error instanceof Error ? error.name : 'unknown' });
    return NextResponse.json({ error: 'Payment webhook processing failed.', correlationId }, { status: 500 });
  }
}
