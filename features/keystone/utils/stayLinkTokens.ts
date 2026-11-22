import crypto from 'node:crypto';

import { resolveSessionSecret } from '../lib/runtimeSecrets';

/**
 * Each stay has one private trip link and one agreement link, derived from the record id with the
 * server secret (only their hashes are stored). Opening a trip from the account or Find my trip
 * hands back the same link the guest was emailed instead of replacing it; a host revocation still
 * ends it.
 */
export function stayTripToken(reservationId: string) {
  return crypto.createHmac('sha256', resolveSessionSecret()).update(`stay-link:trip:${reservationId}`).digest('hex').slice(0, 48);
}

export function stayAgreementToken(agreementId: string) {
  return crypto.createHmac('sha256', resolveSessionSecret()).update(`stay-link:agreement:${agreementId}`).digest('hex').slice(0, 48);
}
