const GUEST_PARTY_COUNTS = ['adults', 'children', 'infants', 'pets'] as const;
const PUBLIC_TRIP_AGREEMENT_FIELDS = ['agreementNumber', 'status', 'title', 'signatureName', 'signedAt', 'signedBySetup'] as const;

export function publicTripGuestPartyProjection(value: unknown): Record<string, number> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  const projection: Record<string, number> = {};
  for (const key of GUEST_PARTY_COUNTS) {
    const count = record[key];
    if (typeof count === 'number' && Number.isSafeInteger(count) && count >= 0) projection[key] = count;
  }
  return Object.keys(projection).length ? projection : null;
}

export function publicTripAgreementProjection(value: unknown): Record<string, unknown> | null {
  if (value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    PUBLIC_TRIP_AGREEMENT_FIELDS
      .filter((key) => Object.prototype.hasOwnProperty.call(record, key))
      .map((key) => [key, record[key]]),
  );
}

export function publicTripRecordProjection(record: unknown): Record<string, unknown> {
  if (record === null || typeof record !== 'object' || Array.isArray(record)) return {};

  const projection = { ...(record as Record<string, unknown>) };
  delete projection.conversation;
  delete projection.reviews;
  delete projection.guestNotes;
  delete projection.cancellationReason;
  if (Object.prototype.hasOwnProperty.call(projection, 'agreement')) {
    projection.agreement = publicTripAgreementProjection(projection.agreement);
  }
  return projection;
}
