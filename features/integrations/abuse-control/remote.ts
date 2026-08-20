import crypto from 'node:crypto';

import { readBoundedProviderBody } from './bounds';
import { AbuseControlUnavailableError } from './identity';
import {
  ABUSE_CONTROL_CONTRACT_VERSION,
  type AbuseControlConfig,
  type AbuseControlConsumeRequest,
  type AbuseControlConsumeResponse,
  type AbuseControlReadinessResponse,
} from './types';

const OPAQUE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,255}$/;
const REQUIRED_GUARANTEES = ['atomicQuota', 'idempotentReplay', 'durableEvidence', 'durableAlertOutbox'] as const;

type Fetch = typeof fetch;

function signature(secret: string, timestamp: string, body: string) {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

function secureEqual(actual: string | null, expected: string) {
  if (!actual) return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function assertGuarantees(value: any) {
  if (!value || REQUIRED_GUARANTEES.some((key) => value[key] !== true)) {
    throw new AbuseControlUnavailableError('Abuse-control durability guarantees are absent.');
  }
}

function parseJson<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new AbuseControlUnavailableError('Abuse-control response is not valid JSON.');
  }
}

async function signedRequest(
  config: AbuseControlConfig,
  path: '/v1/consume' | '/v1/readiness',
  body: string,
  timeoutMs: number,
  fetchImpl: Fetch,
) {
  if (config.mode !== 'remote') throw new Error('Remote abuse control is not configured.');
  const timestamp = Date.now().toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${config.endpoint}${path}`, {
      method: 'POST',
      redirect: 'error',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-openfront-abuse-key-id': config.keyId!,
        'x-openfront-abuse-timestamp': timestamp,
        'x-openfront-abuse-signature': signature(config.signingSecret!, timestamp, body),
      },
      body,
    });
    const raw = await readBoundedProviderBody(response, 16_384, timeoutMs);
    const responseTimestamp = response.headers.get('x-openfront-abuse-timestamp');
    const responseSignature = response.headers.get('x-openfront-abuse-signature');
    if (!responseTimestamp || !/^\d{13}$/.test(responseTimestamp) || Math.abs(Date.now() - Number(responseTimestamp)) > 30_000) {
      throw new AbuseControlUnavailableError('Abuse-control response timestamp is invalid.');
    }
    if (!secureEqual(responseSignature, signature(config.signingSecret!, responseTimestamp, raw))) {
      throw new AbuseControlUnavailableError('Abuse-control response signature is invalid.');
    }
    if (!response.ok) throw new AbuseControlUnavailableError(`Abuse-control provider returned HTTP ${response.status}.`);
    return raw;
  } catch (error) {
    if (error instanceof AbuseControlUnavailableError) throw error;
    throw new AbuseControlUnavailableError(error instanceof Error ? error.message : undefined);
  } finally {
    clearTimeout(timer);
  }
}

export async function consumeRemoteAbuseControl(
  config: AbuseControlConfig,
  request: AbuseControlConsumeRequest,
  timeoutMs: number,
  fetchImpl: Fetch = fetch,
): Promise<AbuseControlConsumeResponse> {
  const raw = await signedRequest(config, '/v1/consume', JSON.stringify(request), timeoutMs, fetchImpl);
  const response = parseJson<AbuseControlConsumeResponse>(raw);
  if (response.contractVersion !== ABUSE_CONTROL_CONTRACT_VERSION || response.idempotencyKey !== request.idempotencyKey) {
    throw new AbuseControlUnavailableError('Abuse-control response does not match the request contract.');
  }
  if (typeof response.allowed !== 'boolean') throw new AbuseControlUnavailableError('Abuse-control decision is invalid.');
  if (!OPAQUE_ID.test(response.decisionId || '') || !OPAQUE_ID.test(response.evidenceId || '')) {
    throw new AbuseControlUnavailableError('Abuse-control durable evidence identifiers are invalid.');
  }
  if (!Number.isSafeInteger(response.remaining) || response.remaining < 0 || !Number.isSafeInteger(response.retryAfterMs) || response.retryAfterMs < 0) {
    throw new AbuseControlUnavailableError('Abuse-control quota metadata is invalid.');
  }
  assertGuarantees(response.guarantees);
  if (!response.allowed && !OPAQUE_ID.test(response.alertOutboxId || '')) {
    throw new AbuseControlUnavailableError('Denied requests require durable alert-outbox evidence.');
  }
  return response;
}

export async function checkRemoteAbuseControlReadiness(
  config: AbuseControlConfig,
  fetchImpl: Fetch = fetch,
): Promise<AbuseControlReadinessResponse> {
  const body = JSON.stringify({ contractVersion: ABUSE_CONTROL_CONTRACT_VERSION, tenantKey: config.tenantKey });
  const raw = await signedRequest(config, '/v1/readiness', body, 1_000, fetchImpl);
  const response = parseJson<AbuseControlReadinessResponse>(raw);
  if (response.contractVersion !== ABUSE_CONTROL_CONTRACT_VERSION || response.ready !== true) {
    throw new AbuseControlUnavailableError('Abuse-control provider is not ready for this contract.');
  }
  assertGuarantees(response.guarantees);
  return response;
}
