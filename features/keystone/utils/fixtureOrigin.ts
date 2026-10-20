/**
 * Onboarding sample ("fixture") records are identified only by authoritative lineage: the
 * setup run marks what it creates, and earlier installs are classified by the exact identities
 * the setup has always used (its fixed record IDs, its fixed sample links, its own payment
 * marker). Never by names, notes or JSON shape a merchant can edit. Unknown legacy records stay
 * as recorded. Fixtures never hold real capacity, accrue real money or earnings, create work,
 * or present as guest assent or reputation; their original rows are kept unchanged.
 */
export const FIXTURE_ORIGIN = 'onboarding_sample';

/** Setup-only record IDs for its sample stays and holds (real records get random IDs). */
export const SETUP_SAMPLE_RESERVATION_IDS = [
  'reservation_pineglass_future',
  'reservation_foundry_current',
  'reservation_tidehouse_completed',
  'reservation_juniper_channel',
] as const;
export const SETUP_SAMPLE_BLOCK_IDS = ['block_alder_owner', 'block_pineglass_preparation'] as const;

export function fixtureEvidence(identifiedBy: string, details: Record<string, unknown> = {}) {
  return { identifiedBy, recordedAt: new Date().toISOString(), ...details };
}

/** Prisma: a stay that is real activity (not an identified fixture, not a test booking). */
export const REAL_STAY = { fixtureOrigin: null, testMode: false } as const;
/** Keystone GraphQL filter for the same. */
export const REAL_STAY_FILTER = { fixtureOrigin: { equals: null }, testMode: { equals: false } } as const;

/** Prisma: a calendar block that holds real capacity. */
export const REAL_CAPACITY_BLOCK = { fixtureOrigin: null } as const;
/** Keystone GraphQL filter for the same. */
export const REAL_CAPACITY_BLOCK_FILTER = { fixtureOrigin: { equals: null } } as const;

/** Prisma: an owner statement with any line from a sample stay (never real, never payable). */
export const SAMPLE_STATEMENT = { lines: { some: { reservation: { fixtureOrigin: { not: null } } } } } as const;

export function isFixtureStay(reservation: { fixtureOrigin?: string | null } | null | undefined) {
  return Boolean(reservation?.fixtureOrigin);
}
