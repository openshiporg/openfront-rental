import { assertStayNotInPast, assertStayWithinMaximum, calculateStayQuote } from '../utils/stayPricing';
import { STAY_LISTING_SELECTION, toPublicListing } from '../utils/stayListing';
import { isAccommodationUnitBookable } from '../utils/staySellability';
import { readBoundedPages } from '../utils/readBoundedPages';
import { effectiveStayRatePlan, listingArrivalContext, stayArrivalProblem, stayCalculationInput } from '../utils/stayBookingRules';
import { listingSellabilityProblem, onlineQuoteReadinessProblem, partyEligibilityProblem, sellableListingWhere } from '../utils/stayEligibility';
import { readStorefrontSales, STOREFRONT_PAUSED_MESSAGE } from '../utils/storefrontSales';
import { REAL_CAPACITY_BLOCK_FILTER } from '../utils/fixtureOrigin';
import { genuineReviewStats, withGenuineReputation } from '../utils/publicReputation';

type SearchStaysArgs = {
  destination?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  adults?: number | null;
  children?: number | null;
  infants?: number | null;
  pets?: number | null;
  propertyTypes?: string[] | null;
  amenitySlugs?: string[] | null;
  bedrooms?: number | null;
  beds?: number | null;
  bathroomsHalfUnits?: number | null;
  minTotalCents?: number | null;
  maxTotalCents?: number | null;
  instantBook?: boolean | null;
  /** Exact homes to check (the stay calendar's date check); other filters still apply. */
  listingIds?: string[] | null;
  collectionSlug?: string | null;
  offset?: number | null;
  limit?: number | null;
};

function quoteInput(listing: any, args: SearchStaysArgs) {
  const ratePlan = effectiveStayRatePlan(listing);
  const unit = listing.accommodationUnit;
  if (!ratePlan || !unit || !args.checkIn || !args.checkOut) return null;
  return calculateStayQuote(stayCalculationInput(listing, ratePlan, {
    checkIn: args.checkIn,
    checkOut: args.checkOut,
    guestCount: (args.adults ?? 1) + (args.children ?? 0),
    pets: args.pets ?? 0,
  }));
}

const SEARCH_PAGE_SIZE = 250;
const MAX_SEARCH_EVIDENCE = 5000;

function buildListingSearchWhere(args: SearchStaysArgs, guestCount: number) {
  const accommodationUnit: Record<string, unknown> = {
    status: { equals: 'available' },
    maxGuests: { gte: guestCount },
  };
  if (args.propertyTypes?.length) accommodationUnit.accommodationType = { in: args.propertyTypes };
  if (args.bedrooms) accommodationUnit.bedroomCount = { gte: args.bedrooms };
  if (args.beds) accommodationUnit.bedCount = { gte: args.beds };
  if (args.bathroomsHalfUnits) accommodationUnit.bathroomCountHalfUnits = { gte: args.bathroomsHalfUnits };

  const where: Record<string, unknown> = {
    ...sellableListingWhere(),
    accommodationUnit,
  };
  if (args.listingIds?.length) where.id = { in: args.listingIds };
  const collection = args.collectionSlug?.trim();
  if (collection) where.collections = { some: { slug: { equals: collection } } };
  if (args.instantBook != null) where.instantBook = { equals: args.instantBook };
  if (args.amenitySlugs?.length) {
    where.AND = args.amenitySlugs.map((slug) => ({ amenities: { some: { slug: { equals: slug } } } }));
  }

  const destination = args.destination?.trim();
  if (destination) {
    where.OR = [
      { title: { contains: destination, mode: 'insensitive' } },
      { subtitle: { contains: destination, mode: 'insensitive' } },
      { description: { contains: destination, mode: 'insensitive' } },
      { property: { address: { city: { contains: destination, mode: 'insensitive' } } } },
      { property: { address: { region: { contains: destination, mode: 'insensitive' } } } },
      { property: { address: { countryCode: { contains: destination, mode: 'insensitive' } } } },
      { property: { address: { publicLocationLabel: { contains: destination, mode: 'insensitive' } } } },
    ];
  }
  return where;
}

export async function searchStays(_root: unknown, args: SearchStaysArgs, context: any) {
  const limit = Math.min(Math.max(args.limit ?? 24, 1), 100);
  const offset = Math.max(args.offset ?? 0, 0);
  const guestCount = (args.adults ?? 1) + (args.children ?? 0);
  if (guestCount < 1) throw new Error('Search requires at least one guest.');
  if (args.listingIds && (args.listingIds.length > 20 || args.listingIds.some((id) => typeof id !== 'string' || !id || id.length > 100))) {
    throw new Error('Check up to 20 homes at a time.');
  }
  const party = { adults: args.adults ?? 1, children: args.children ?? 0, infants: args.infants ?? 0, pets: args.pets ?? 0 };
  if (Boolean(args.checkIn) !== Boolean(args.checkOut)) throw new Error('Choose both check-in and check-out dates.');
  if (args.checkIn && args.checkOut) assertStayWithinMaximum(args.checkIn, args.checkOut, null);
  if (args.checkIn) assertStayNotInPast(args.checkIn);

  const sudo = context.sudo();
  const sales = await readStorefrontSales(context.prisma);
  const listings = await readBoundedPages<any>(
    (skip, take) => sudo.query.Listing.findMany({
      where: buildListingSearchWhere(args, guestCount),
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
      take,
      skip,
      query: STAY_LISTING_SELECTION,
    }),
    { pageSize: SEARCH_PAGE_SIZE, maxItems: MAX_SEARCH_EVIDENCE, label: 'Stay search candidate set' },
  );

  const conflictingUnitIds = new Set<string>();
  if (args.checkIn && args.checkOut) {
    const unitIds = [...new Set(listings.map((listing: any) => listing.accommodationUnit?.id).filter(Boolean))] as string[];
    let blockCount = 0;
    for (let start = 0; start < unitIds.length; start += SEARCH_PAGE_SIZE) {
      const unitBatch = unitIds.slice(start, start + SEARCH_PAGE_SIZE);
      const blocks = await readBoundedPages<any>(
        (skip, take) => sudo.query.CalendarBlock.findMany({
          where: {
            status: { equals: 'active' },
            ...REAL_CAPACITY_BLOCK_FILTER,
            startDate: { lt: args.checkOut },
            endDate: { gt: args.checkIn },
            listing: { accommodationUnit: { id: { in: unitBatch } } },
          },
          orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
          take,
          skip,
          query: 'id startDate endDate listing { id accommodationUnit { id } }',
        }),
        { pageSize: SEARCH_PAGE_SIZE, maxItems: MAX_SEARCH_EVIDENCE, label: 'Stay availability evidence' },
      );
      blockCount += blocks.length;
      if (blockCount > MAX_SEARCH_EVIDENCE) {
        throw new Error(`Stay availability evidence is incomplete because more than ${MAX_SEARCH_EVIDENCE} active blocks overlap. Narrow the request and retry.`);
      }
      for (const block of blocks) {
        const unitId = block.listing?.accommodationUnit?.id;
        if (unitId) conflictingUnitIds.add(unitId);
      }
    }
  }
  const matches = listings.flatMap((listing: any) => {
    const unit = listing.accommodationUnit;
    if (!unit || !isAccommodationUnitBookable(unit.status) || unit.maxGuests < guestCount) return [];
    if (listingSellabilityProblem(listing) || partyEligibilityProblem(listing, party)) return [];
    if (args.propertyTypes?.length && !args.propertyTypes.includes(unit.accommodationType)) return [];
    if (args.bedrooms && unit.bedroomCount < args.bedrooms) return [];
    if (args.beds && unit.bedCount < args.beds) return [];
    if (args.bathroomsHalfUnits && unit.bathroomCountHalfUnits < args.bathroomsHalfUnits) return [];
    if (args.instantBook != null && Boolean(listing.instantBook) !== args.instantBook) return [];
    const amenitySlugs = new Set((listing.amenities || []).map((amenity: any) => amenity.slug));
    if (args.amenitySlugs?.some((slug) => !amenitySlugs.has(slug))) return [];
    if (args.checkIn && args.checkOut && conflictingUnitIds.has(unit.id)) return [];
    // Dated searches only return homes the host's notice and booking window accept.
    if (args.checkIn && stayArrivalProblem(args.checkIn, listingArrivalContext(listing))) return [];

    let quote = null;
    try {
      quote = quoteInput(listing, args);
    } catch {
      return [];
    }
    if (quote && args.minTotalCents != null && quote.totalAmountCents < args.minTotalCents) return [];
    if (quote && args.maxTotalCents != null && quote.totalAmountCents > args.maxTotalCents) return [];
    // Same readiness as quoteStay: a home without real, versioned terms is shown but never
    // promised as bookable online; the guest is pointed to the host instead.
    const notReady = sales.open ? onlineQuoteReadinessProblem(effectiveStayRatePlan(listing), listing) : STOREFRONT_PAUSED_MESSAGE;
    return [{ ...toPublicListing(listing), quote, onlineBooking: { ready: !notReady, reason: notReady } }];
  });

  // Collection membership counted over every match, so collection pages and counts are complete.
  const collections = new Map<string, { slug: string; name: string; count: number }>();
  for (const match of matches) {
    for (const item of match.collections || []) {
      if (!item?.slug) continue;
      const entry = collections.get(item.slug) || { slug: item.slug, name: item.name, count: 0 };
      entry.count += 1;
      collections.set(item.slug, entry);
    }
  }
  const page = matches.slice(offset, offset + limit);
  const stats = await genuineReviewStats(context.prisma, page.map((match: any) => match.id));
  return {
    totalCount: matches.length,
    offset,
    limit,
    results: page.map((match: any) => withGenuineReputation(match, stats)),
    collections: [...collections.values()],
  };
}
