import type { AbuseControlPolicy, AbuseControlRouteKey } from './types';

const policy = (
  routeKey: AbuseControlRouteKey,
  limit: number,
  windowSeconds: number,
  maxInputBytes: number,
  maxProviderLatencyMs = 800,
): AbuseControlPolicy => ({ routeKey, limit, windowSeconds, maxInputBytes, maxProviderLatencyMs, alertOnDeny: true });

export const ABUSE_CONTROL_POLICIES: Record<AbuseControlRouteKey, AbuseControlPolicy> = {
  'auth.sign-in': policy('auth.sign-in', 8, 300, 8_192),
  'auth.sign-up': policy('auth.sign-up', 4, 3_600, 16_384),
  'auth.password-reset-request': policy('auth.password-reset-request', 4, 3_600, 4_096),
  'auth.password-reset-redeem': policy('auth.password-reset-redeem', 6, 3_600, 8_192),
  'auth.password-reset-validate': policy('auth.password-reset-validate', 12, 3_600, 4_096),
  'auth.initial-user': policy('auth.initial-user', 3, 3_600, 16_384),
  'storefront.search': policy('storefront.search', 60, 60, 16_384),
  'storefront.listing-read': policy('storefront.listing-read', 120, 60, 4_096),
  'storefront.quote-read': policy('storefront.quote-read', 30, 60, 4_096),
  'storefront.trip-read': policy('storefront.trip-read', 30, 60, 4_096),
  'storefront.agreement-read': policy('storefront.agreement-read', 30, 60, 4_096),
  'storefront.quote-create': policy('storefront.quote-create', 20, 300, 8_192),
  'storefront.reservation-create': policy('storefront.reservation-create', 6, 900, 32_768),
  'storefront.cancellation-request': policy('storefront.cancellation-request', 6, 900, 8_192),
  'storefront.agreement-sign': policy('storefront.agreement-sign', 8, 900, 8_192),
  'webhook.payment': policy('webhook.payment', 120, 60, 65_536, 1_000),
};
