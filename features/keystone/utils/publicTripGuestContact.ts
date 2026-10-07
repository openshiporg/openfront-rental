type PublicGuestContact = {
  name: string | null;
  email: string | null;
  phone: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function publicTripGuestContact(guestPartySnapshot: unknown): PublicGuestContact | null {
  const primaryGuest = asRecord(asRecord(guestPartySnapshot)?.primaryGuest);
  if (!primaryGuest) return null;

  return {
    name: typeof primaryGuest.name === 'string' ? primaryGuest.name : null,
    email: typeof primaryGuest.email === 'string' ? primaryGuest.email : null,
    phone: typeof primaryGuest.phone === 'string' ? primaryGuest.phone : null,
  };
}
