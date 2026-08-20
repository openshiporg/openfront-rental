import { NextResponse } from 'next/server';

import { keystoneContext } from '@/features/keystone/context';
import { processPaymentWebhook } from '@/features/keystone/mutations/paymentWebhook';

const MAX_WEBHOOK_BODY_BYTES = 65_536;
const WEBHOOK_BODY_TIMEOUT_MS = 2_000;

async function readPaymentWebhookBody(request: Request) {
  const contentLength = Number(request.headers.get('content-length') || '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BODY_BYTES) {
    throw new Error(`Request body exceeds the ${MAX_WEBHOOK_BODY_BYTES}-byte limit.`);
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
      if (remainingMs <= 0) throw new Error('Request body timed out.');
      const result = await Promise.race([
        reader.read(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Request body timed out.')), remainingMs);
        }),
      ]);
      if (timer) clearTimeout(timer);
      if (result.done) break;
      total += result.value.byteLength;
      if (total > MAX_WEBHOOK_BODY_BYTES) {
        throw new Error(`Request body exceeds the ${MAX_WEBHOOK_BODY_BYTES}-byte limit.`);
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
    const message = error instanceof Error ? error.message : 'Payment webhook processing failed.';
    const tooLarge = /body exceeds/i.test(message);
    const timedOut = /body timed out/i.test(message);
    const clientError = /signature|payload|unsupported|event id|integer cents|currency/i.test(message);
    const conflict = /does not match|does not map|cannot settle/i.test(message);
    console.error('Payment webhook rejected', { providerCode, message });
    return NextResponse.json({ error: message }, { status: tooLarge ? 413 : timedOut ? 408 : clientError ? 400 : conflict ? 409 : 500 });
  }
}
