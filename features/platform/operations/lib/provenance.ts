/** Labels for the server's per-payment `tenderKind`; `null` means ordinary recorded money. */
export function tenderLabel(kind?: string | null, reservation?: { testMode?: boolean | null; fixtureOrigin?: string | null } | null) {
  if (kind === 'test') return 'Stripe test-key card payment · not counted as income';
  if (kind === 'sample') return 'Created by setup · no money was received';
  if (kind === 'unknown') return 'Older record · how it was taken isn’t recorded';
  // Real money recorded on a test booking or a setup sample stay stays real money.
  if (reservation?.testMode) return 'Recorded on a stay that holds no dates · kept separate';
  if (reservation?.fixtureOrigin) return 'Recorded on a stay created by setup';
  if (kind === 'manual') return 'Recorded manually · not provider-verified';
  return null;
}

/** Whether a payment's money counts as real money in totals. */
export function isRealTender(kind?: string | null) {
  return kind !== 'test' && kind !== 'sample';
}
