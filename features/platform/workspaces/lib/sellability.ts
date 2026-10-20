import type { Where } from './paging';

/**
 * Setup rules for the property and listing workspaces. Each record predicate has a where-form
 * next to it so a badge, a tab count and a filter never disagree; pricing and bookability come
 * from the server's readiness answer, never from what the operator's role happens to see.
 */

/** The plan quotes and search sell under: active plans, the default first, then the oldest. */
export const EFFECTIVE_RATE_PLAN_SELECTION = 'effectiveRatePlans: ratePlans(where: { status: { equals: "active" } }, orderBy: [{ isDefault: desc }, { createdAt: asc }, { id: asc }], take: 1) { id name baseNightlyRateCents currencyCode minimumStay maximumStay advanceNoticeHours bookingWindowDays }';

/**
 * Setup checks for a listing. `bookable` is the server's online-readiness answer (rate and
 * real cancellation terms, the quote rule): a positive price alone isn't bookable.
 */
export function listingSetup(input: { title?: string | null; description?: string | null; mediaCount: number; amenityCount: number; propertyReady: boolean; unitReady: boolean; bookable: boolean }) {
  const checks = [
    { id: 'content', label: 'Guest-facing copy', ready: Boolean(input.title && input.description) },
    { id: 'media', label: 'Media', ready: input.mediaCount > 0 },
    { id: 'amenities', label: 'Amenities', ready: input.amenityCount > 0 },
    { id: 'inventory', label: 'Property & unit', ready: input.propertyReady && input.unitReady },
    { id: 'rate', label: 'Bookable online (rate and terms)', ready: input.bookable },
  ];
  const readyCount = checks.filter((check) => check.ready).length;
  return { checks, readyCount, percent: Math.round((readyCount / checks.length) * 100) };
}

/** Where-form of `listingSetup`; `bookableListingIds` comes from the server's complete readiness index. */
export function listingSetupWhere(bookableListingIds: string[]): Where {
  return {
    AND: [
      { title: { not: { equals: '' } } },
      { description: { not: { equals: '' } } },
      { media: { some: {} } },
      { amenities: { some: {} } },
      { property: { status: { equals: 'active' }, registrationNumber: { not: { equals: '' } } } },
      { accommodationUnit: { status: { equals: 'available' } } },
      { id: { in: bookableListingIds } },
    ],
  };
}

/** Mirrors `propertyReadiness` from the operations library: setup is complete, not necessarily selling. */
export const propertySetupCompleteWhere: Where = {
  AND: [
    { address: { city: { not: { equals: '' } }, countryCode: { not: { equals: '' } } } },
    { units: { some: {} } },
    { timezone: { not: { equals: '' } } },
    { registrationNumber: { not: { equals: '' } } },
    { listings: { some: { status: { equals: 'published' } } } },
  ],
};

/** Where-form of `mappingOperational`: a mapped or published mapping on an active connection. */
export const operationalMappingWhere: Where = { status: { in: ['mapped', 'published'] }, channelConnection: { status: { equals: 'active' } } };
