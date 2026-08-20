import { NextResponse } from 'next/server';

import { keystoneContext } from '@/features/keystone/context';
import { processPaymentWebhook } from '@/features/keystone/mutations/paymentWebhook';
import {
  ABUSE_CONTROL_POLICIES,
  AbuseControlDeniedError,
  AbuseControlUnavailableError,
  enforceAbuseControl,
  readBoundedRequestBody,
} from '@/features/integrations/abuse-control';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ providerCode: string }> },
) {
  const { providerCode } = await params;
  try {
    const policy = ABUSE_CONTROL_POLICIES['webhook.payment'];
    const rawBody = await readBoundedRequestBody(request, policy.maxInputBytes, 2_000);
    await enforceAbuseControl({
      routeKey: 'webhook.payment',
      requestInput: { providerCode, bodyBytes: Buffer.byteLength(rawBody, 'utf8') },
      subjectParts: [providerCode],
      headers: request.headers,
    });
    const result = await processPaymentWebhook(keystoneContext as any, providerCode, rawBody, request.headers);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AbuseControlDeniedError) {
      return NextResponse.json(
        { error: 'Too many webhook requests.' },
        { status: 429, headers: { 'retry-after': String(Math.max(1, Math.ceil(error.retryAfterMs / 1_000))) } },
      );
    }
    if (error instanceof AbuseControlUnavailableError) {
      return NextResponse.json({ error: 'Webhook abuse control is unavailable.' }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : 'Payment webhook processing failed.';
    const tooLarge = /body exceeds/i.test(message);
    const timedOut = /body timed out/i.test(message);
    const clientError = /signature|payload|unsupported|event id|integer cents|currency/i.test(message);
    const conflict = /does not match|does not map|cannot settle/i.test(message);
    console.error('Payment webhook rejected', { providerCode, message });
    return NextResponse.json({ error: message }, { status: tooLarge ? 413 : timedOut ? 408 : clientError ? 400 : conflict ? 409 : 500 });
  }
}
