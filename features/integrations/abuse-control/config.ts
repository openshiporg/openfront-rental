import type { AbuseControlConfig } from './types';

const HEADER_NAME = /^[a-z0-9][a-z0-9-]{0,62}$/;
const SAFE_KEY = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;

function requireValue(environment: NodeJS.ProcessEnv, name: string, minimumLength = 1) {
  const value = environment[name]?.trim();
  if (!value || value.length < minimumLength) throw new Error(`${name} must be configured for durable abuse control.`);
  return value;
}

function headerName(environment: NodeJS.ProcessEnv, name: string) {
  const value = requireValue(environment, name).toLowerCase();
  if (!HEADER_NAME.test(value)) throw new Error(`${name} must be a valid lowercase HTTP header name.`);
  return value;
}

export function resolveAbuseControlConfig(environment: NodeJS.ProcessEnv = process.env): AbuseControlConfig {
  const production = environment.NODE_ENV === 'production';
  const mode = environment.ABUSE_CONTROL_MODE?.trim() || (production ? '' : 'disabled');
  if (production && mode !== 'remote') throw new Error('Production requires ABUSE_CONTROL_MODE=remote.');
  if (mode !== 'remote' && mode !== 'disabled') throw new Error('ABUSE_CONTROL_MODE must be remote or disabled.');

  const tenantKey = environment.ABUSE_CONTROL_TENANT_KEY?.trim() || (production ? '' : 'local-rental');
  if (!SAFE_KEY.test(tenantKey)) throw new Error('ABUSE_CONTROL_TENANT_KEY must be a stable, non-secret tenant key.');
  if (mode === 'disabled') return { mode, tenantKey };

  const endpointValue = requireValue(environment, 'ABUSE_CONTROL_ENDPOINT');
  let endpoint: URL;
  try {
    endpoint = new URL(endpointValue);
  } catch {
    throw new Error('ABUSE_CONTROL_ENDPOINT must be an absolute URL.');
  }
  const localHttp = !production && endpoint.protocol === 'http:' && ['127.0.0.1', '::1', 'localhost'].includes(endpoint.hostname);
  if (endpoint.protocol !== 'https:' && !localHttp) throw new Error('ABUSE_CONTROL_ENDPOINT must use HTTPS outside local development.');
  if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw new Error('ABUSE_CONTROL_ENDPOINT cannot contain credentials, query parameters, or a fragment.');
  }

  const keyId = requireValue(environment, 'ABUSE_CONTROL_KEY_ID');
  if (!SAFE_KEY.test(keyId)) throw new Error('ABUSE_CONTROL_KEY_ID is invalid.');
  const signingSecret = requireValue(environment, 'ABUSE_CONTROL_SIGNING_SECRET', 32);
  const subjectSecret = requireValue(environment, 'ABUSE_CONTROL_SUBJECT_SECRET', 32);
  const proxyAttestationSecret = requireValue(environment, 'ABUSE_CONTROL_PROXY_ATTESTATION_SECRET', 32);
  const readinessProbeSecret = requireValue(environment, 'ABUSE_CONTROL_READINESS_PROBE_SECRET', 32);
  if (new Set([signingSecret, subjectSecret, proxyAttestationSecret, readinessProbeSecret]).size !== 4) {
    throw new Error('Abuse-control signing, subject, proxy-attestation, and readiness secrets must be distinct.');
  }

  return {
    mode,
    tenantKey,
    endpoint: endpoint.toString().replace(/\/$/, ''),
    keyId,
    signingSecret,
    subjectSecret,
    clientHeaderName: headerName(environment, 'ABUSE_CONTROL_CLIENT_HEADER'),
    requestIdHeaderName: headerName(environment, 'ABUSE_CONTROL_REQUEST_ID_HEADER'),
    proxyAttestationHeaderName: headerName(environment, 'ABUSE_CONTROL_PROXY_ATTESTATION_HEADER'),
    proxyAttestationSecret,
    readinessProbeSecret,
  };
}

// Next sets this documented phase while collecting production build output.
// Runtime validation must not turn build workers into secret-bearing processes.
export const NEXT_PRODUCTION_BUILD_PHASE = 'phase-production-build';

export function isAbuseControlBuildPhase(environment: NodeJS.ProcessEnv = process.env) {
  return environment.NEXT_PHASE === NEXT_PRODUCTION_BUILD_PHASE;
}

export function assertAbuseControlRuntimeReady(environment: NodeJS.ProcessEnv = process.env) {
  if (isAbuseControlBuildPhase(environment)) {
    return { deferredForBuild: true as const, configured: false as const };
  }

  if (environment.NODE_ENV === 'production') {
    try {
      resolveRequiredRemoteAbuseControlConfig(environment);
      return { deferredForBuild: false as const, configured: true as const };
    } catch {
      // The storefront and dashboard may start without the external provider, but
      // every protected operation still resolves the required remote config and
      // fails closed. The readiness endpoint reports the missing capability.
      return { deferredForBuild: false as const, configured: false as const };
    }
  }

  const config = resolveAbuseControlConfig(environment);
  return { deferredForBuild: false as const, configured: config.mode === 'remote' };
}

export function resolveRequiredRemoteAbuseControlConfig(environment: NodeJS.ProcessEnv = process.env) {
  const config = resolveAbuseControlConfig(environment);
  if (config.mode !== 'remote') throw new Error('Durable abuse control is disabled.');
  return config;
}
