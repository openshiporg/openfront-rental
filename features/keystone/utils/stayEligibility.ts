/**
 * One sellability and party-eligibility rule for search, the date check, quotes and
 * booking, so a home is never offered in one place and refused in the next.
 */

/** Listing filter: published, under a public, operating host and an active property (onboarding, paused and archived properties aren't on sale). */
export function sellableListingWhere(): Record<string, unknown> {
  return {
    status: { equals: 'published' },
    hostOrganization: { isPublic: { equals: true }, status: { notIn: ['suspended', 'archived'] } },
    property: { status: { equals: 'active' } },
  };
}

/** Guest-facing reason a listing record can't be sold now, or null. Needs STAY_LISTING_SELECTION. */
export function listingSellabilityProblem(listing: any): string | null {
  if (!listing || listing.status !== 'published') return 'This stay is not available for booking.';
  const host = listing.hostOrganization;
  if (!host?.id || host.isPublic === false || ['suspended', 'archived'].includes(host.status)) return 'This stay is not available for booking.';
  if (listing.property?.status !== 'active') return 'This stay is not available for booking.';
  if (listing.accommodationUnit?.status !== 'available') return 'This stay is not available for booking.';
  return null;
}

export type StayParty = { adults: number; children: number; infants: number; pets: number };

/** Guest-facing reason a party can't stay in a listing, or null. Infants don't count toward capacity. */
export function partyEligibilityProblem(listing: any, party: StayParty): string | null {
  if (!Number.isSafeInteger(party.adults) || party.adults < 1) return 'A stay needs at least one adult.';
  const maxGuests = listing?.accommodationUnit?.maxGuests;
  if (Number.isSafeInteger(maxGuests) && party.adults + party.children > maxGuests) return `This home sleeps up to ${maxGuests} guests.`;
  if (party.pets > 0) {
    const petRule = (listing?.houseRules || []).find((rule: any) => rule.ruleType === 'pets');
    if (petRule && petRule.isAllowed === false) return 'This stay does not allow pets.';
  }
  return null;
}

export const NO_ONLINE_TERMS_MESSAGE = 'This home’s cancellation terms aren’t published yet, so it can’t be booked online. Message the host.';

/**
 * Guest-facing reason a home can't take an online quote, or null: it needs a nightly rate and
 * real, versioned cancellation terms. Search, the date check and quotes share this rule.
 */
export function onlineQuoteReadinessProblem(plan: any, listing?: any): string | null {
  if (!plan) return 'This stay does not have a published nightly rate.';
  const policy = plan.cancellationPolicy;
  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
  if (!policy?.id || !text(policy.version) || !(text(policy.summary) || text(policy.fullTerms))) return NO_ONLINE_TERMS_MESSAGE;
  // An extra-guest fee needs an included-guest threshold the fee model doesn't define yet (an
  // owner decision), so it can't be priced online honestly: the calculator would charge every
  // guest. Such a home isn't offered as bookable online until that is settled.
  if ((listing?.feeDefinitions || []).some((fee: any) => fee?.feeType === 'extra_guest' && fee?.required !== false && fee?.isActive !== false)) {
    return EXTRA_GUEST_FEE_MESSAGE;
  }
  return null;
}

export const EXTRA_GUEST_FEE_MESSAGE = 'This home has an extra-guest fee that can’t be priced online yet. Message the host for a quote.';
