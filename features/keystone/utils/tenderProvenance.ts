import { isTestTender } from './paymentReconciliation';

/**
 * What kind of money a payment record is, from its own evidence only (never its booking's flag):
 * - `test`: Stripe test-mode card tender or tender recorded as test — no real money;
 * - `sample`: created by setup for a sample stay — no money was received;
 * - `manual`: money an operator recorded as received outside the store — attested, not provider-verified;
 * - `provider`: recorded by an installed provider integration;
 * - `unknown`: an older record without provider evidence.
 */
export type TenderKind = 'test' | 'sample' | 'manual' | 'provider' | 'unknown';

export function tenderKind(payment: { provider?: string | null; data?: unknown }): TenderKind {
  const data = payment.data && typeof payment.data === 'object' && !Array.isArray(payment.data) ? payment.data as Record<string, unknown> : {};
  if (data.kind === 'seeded_manual_capture' || data.provenance === 'onboarding_sample') return 'sample';
  if (isTestTender(payment)) return 'test';
  if (payment.provider === 'pp_system_default' || payment.provider === 'manual') return 'manual';
  if (payment.provider) return 'provider';
  return 'unknown';
}

export function isRealMoneyTender(kind: TenderKind) {
  return kind === 'manual' || kind === 'provider' || kind === 'unknown';
}
