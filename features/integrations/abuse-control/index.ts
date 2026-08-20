import { assertBoundedInput } from './bounds';
import {
  isAbuseControlBuildPhase,
  resolveAbuseControlConfig,
  resolveRequiredRemoteAbuseControlConfig,
} from './config';
import {
  AbuseControlDeniedError,
  abuseControlIdempotencyKey,
  hashAbuseControlSubject,
  resolveTrustedAttribution,
} from './identity';
import { ABUSE_CONTROL_POLICIES } from './policies';
import { checkRemoteAbuseControlReadiness, consumeRemoteAbuseControl } from './remote';
import {
  ABUSE_CONTROL_CONTRACT_VERSION,
  type AbuseControlConfig,
  type AbuseControlDecision,
  type AbuseControlRouteKey,
  type HeaderSource,
} from './types';

export { AbuseControlDeniedError, AbuseControlUnavailableError } from './identity';
export {
  assertAbuseControlRuntimeReady,
  NEXT_PRODUCTION_BUILD_PHASE,
  isAbuseControlBuildPhase,
  resolveAbuseControlConfig,
  resolveRequiredRemoteAbuseControlConfig,
} from './config';
export { readBoundedRequestBody } from './bounds';
export { ABUSE_CONTROL_POLICIES } from './policies';
export type { AbuseControlRouteKey } from './types';

type Fetch = typeof fetch;

export async function enforceAbuseControl(input: {
  routeKey: AbuseControlRouteKey;
  requestInput: unknown;
  subjectParts: readonly unknown[];
  headers?: HeaderSource;
  config?: AbuseControlConfig;
  environment?: NodeJS.ProcessEnv;
  fetchImpl?: Fetch;
  now?: Date;
  operationScope?: string;
}): Promise<AbuseControlDecision> {
  const policy = ABUSE_CONTROL_POLICIES[input.routeKey];
  assertBoundedInput(input.requestInput, policy.maxInputBytes);
  const config = input.config || resolveAbuseControlConfig(input.environment);
  if (config.mode === 'disabled') return { enforced: false };

  const attribution = resolveTrustedAttribution(config, input.headers);
  const subjectHash = hashAbuseControlSubject(config, input.subjectParts);
  const idempotencyKey = abuseControlIdempotencyKey(
    config,
    policy.routeKey,
    subjectHash,
    attribution.clientHash,
    attribution.requestHash,
    input.operationScope || 'root',
  );
  const response = await consumeRemoteAbuseControl(config, {
    contractVersion: ABUSE_CONTROL_CONTRACT_VERSION,
    tenantKey: config.tenantKey,
    routeKey: policy.routeKey,
    subjectHash,
    clientHash: attribution.clientHash,
    idempotencyKey,
    occurredAt: (input.now || new Date()).toISOString(),
    quota: { limit: policy.limit, windowSeconds: policy.windowSeconds },
    evidence: { persist: true, privacyClass: 'pseudonymous-security', alertOnDeny: true },
  }, policy.maxProviderLatencyMs, input.fetchImpl);

  if (!response.allowed) throw new AbuseControlDeniedError(response.retryAfterMs, response.decisionId);
  return {
    enforced: true,
    allowed: true,
    decisionId: response.decisionId,
    evidenceId: response.evidenceId,
    remaining: response.remaining,
  };
}

export async function checkAbuseControlReadiness(
  config: AbuseControlConfig = resolveRequiredRemoteAbuseControlConfig(),
  fetchImpl?: Fetch,
) {
  if (config.mode !== 'remote') throw new Error('Durable abuse control is disabled.');
  return checkRemoteAbuseControlReadiness(config, fetchImpl);
}

export function abuseControlForwardHeaderNames(
  config?: AbuseControlConfig,
  environment: NodeJS.ProcessEnv = process.env,
) {
  if (!config && isAbuseControlBuildPhase(environment)) return [] as string[];
  const resolved = config || resolveAbuseControlConfig(environment);
  if (resolved.mode !== 'remote') return [] as string[];
  return [resolved.clientHeaderName!, resolved.requestIdHeaderName!, resolved.proxyAttestationHeaderName!];
}
