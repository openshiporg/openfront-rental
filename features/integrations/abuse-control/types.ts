export const ABUSE_CONTROL_CONTRACT_VERSION = 1 as const;

export type AbuseControlRouteKey =
  | 'auth.sign-in'
  | 'auth.sign-up'
  | 'auth.password-reset-request'
  | 'auth.password-reset-redeem'
  | 'auth.password-reset-validate'
  | 'auth.initial-user'
  | 'storefront.search'
  | 'storefront.listing-read'
  | 'storefront.quote-read'
  | 'storefront.trip-read'
  | 'storefront.agreement-read'
  | 'storefront.quote-create'
  | 'storefront.reservation-create'
  | 'storefront.cancellation-request'
  | 'storefront.agreement-sign'
  | 'webhook.payment';

export type AbuseControlPolicy = {
  routeKey: AbuseControlRouteKey;
  maxInputBytes: number;
  windowSeconds: number;
  limit: number;
  maxProviderLatencyMs: number;
  alertOnDeny: true;
};

export type AbuseControlConfig = {
  mode: 'disabled' | 'remote';
  tenantKey: string;
  endpoint?: string;
  keyId?: string;
  signingSecret?: string;
  subjectSecret?: string;
  clientHeaderName?: string;
  requestIdHeaderName?: string;
  proxyAttestationHeaderName?: string;
  proxyAttestationSecret?: string;
  readinessProbeSecret?: string;
};

export type HeaderSource = Headers | Record<string, string | string[] | undefined>;

export type AbuseControlConsumeRequest = {
  contractVersion: typeof ABUSE_CONTROL_CONTRACT_VERSION;
  tenantKey: string;
  routeKey: AbuseControlRouteKey;
  subjectHash: string;
  clientHash: string;
  idempotencyKey: string;
  occurredAt: string;
  quota: {
    limit: number;
    windowSeconds: number;
  };
  evidence: {
    persist: true;
    privacyClass: 'pseudonymous-security';
    alertOnDeny: true;
  };
};

export type AbuseControlConsumeResponse = {
  contractVersion: typeof ABUSE_CONTROL_CONTRACT_VERSION;
  idempotencyKey: string;
  decisionId: string;
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
  evidenceId: string;
  alertOutboxId?: string | null;
  guarantees: {
    atomicQuota: true;
    idempotentReplay: true;
    durableEvidence: true;
    durableAlertOutbox: true;
  };
};

export type AbuseControlReadinessResponse = {
  contractVersion: typeof ABUSE_CONTROL_CONTRACT_VERSION;
  ready: true;
  guarantees: AbuseControlConsumeResponse['guarantees'];
};

export type AbuseControlDecision =
  | { enforced: false }
  | {
      enforced: true;
      allowed: true;
      decisionId: string;
      evidenceId: string;
      remaining: number;
    };
