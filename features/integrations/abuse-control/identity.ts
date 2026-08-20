import crypto from 'node:crypto';

import type { AbuseControlConfig, HeaderSource } from './types';

const TRUSTED_VALUE = /^[\x21-\x7e]{1,256}$/;
const REQUEST_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{15,127}$/;

export function readHeader(headers: HeaderSource | undefined, name: string): string | undefined {
  if (!headers) return undefined;
  if (headers instanceof Headers) return headers.get(name) || undefined;
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function secureEqual(actual: string | undefined, expected: string) {
  if (!actual) return false;
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function keyedHash(secret: string, namespace: string, values: readonly string[]) {
  const canonical = values.map((value) => `${Buffer.byteLength(value, 'utf8')}:${value}`).join('|');
  return crypto.createHmac('sha256', secret).update(`${namespace}|${canonical}`).digest('hex');
}

export function resolveTrustedAttribution(config: AbuseControlConfig, headers: HeaderSource | undefined) {
  if (config.mode !== 'remote') throw new Error('Trusted attribution requires remote abuse control.');
  const attestation = readHeader(headers, config.proxyAttestationHeaderName!);
  if (!secureEqual(attestation, config.proxyAttestationSecret!)) {
    throw new AbuseControlUnavailableError('Trusted proxy attribution is absent or invalid.');
  }
  const client = readHeader(headers, config.clientHeaderName!)?.trim();
  const requestId = readHeader(headers, config.requestIdHeaderName!)?.trim();
  if (!client || !TRUSTED_VALUE.test(client)) throw new AbuseControlUnavailableError('Trusted client attribution is absent or invalid.');
  if (!requestId || !REQUEST_ID.test(requestId)) throw new AbuseControlUnavailableError('Trusted request attribution is absent or invalid.');
  return {
    clientHash: keyedHash(config.subjectSecret!, 'client', [client]),
    requestHash: keyedHash(config.subjectSecret!, 'request', [requestId]),
  };
}

export function hashAbuseControlSubject(config: AbuseControlConfig, subjectParts: readonly unknown[]) {
  if (config.mode !== 'remote') throw new Error('Subject hashing requires remote abuse control.');
  const normalized = subjectParts.map((value) => String(value ?? '').trim().toLowerCase()).filter(Boolean);
  return keyedHash(config.subjectSecret!, 'subject', normalized.length ? normalized : ['anonymous']);
}

export function abuseControlIdempotencyKey(
  config: AbuseControlConfig,
  routeKey: string,
  subjectHash: string,
  clientHash: string,
  requestHash: string,
  operationScope: string,
) {
  return `ac_${keyedHash(config.subjectSecret!, 'consume', [config.tenantKey, routeKey, subjectHash, clientHash, requestHash, operationScope])}`;
}

export class AbuseControlUnavailableError extends Error {
  readonly code = 'ABUSE_CONTROL_UNAVAILABLE';

  constructor(message = 'Required abuse control is unavailable.') {
    super(message);
    this.name = 'AbuseControlUnavailableError';
  }
}

export class AbuseControlDeniedError extends Error {
  readonly code = 'ABUSE_CONTROL_DENIED';
  readonly retryAfterMs: number;
  readonly decisionId: string;

  constructor(retryAfterMs: number, decisionId: string) {
    super('Too many requests. Please try again later.');
    this.name = 'AbuseControlDeniedError';
    this.retryAfterMs = retryAfterMs;
    this.decisionId = decisionId;
  }
}
