import { assertStayNotInPast, assertStayWithinMaximum, calculateStayQuote } from '../utils/stayPricing';
import { STAY_LISTING_SELECTION, toPublicListing } from '../utils/stayListing';
import { isAccommodationUnitBookable } from '../utils/staySellability';
import { readBoundedPages } from '../utils/readBoundedPages';

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
  offset?: number | null;
  limit?: number | null;
};

function quoteInput(listing: any, args: SearchStaysArgs) {
  const ratePlan = listing.ratePlans?.[0];
  const unit = listing.accommodationUnit;
  if (!ratePlan || !unit || !args.checkIn || !args.checkOut) return null;
  return calculateStayQuote({
    checkIn: args.checkIn,
    checkOut: args.checkOut,
    baseNightlyRateCents: ratePlan.baseNightlyRateCents ?? listing.baseNightlyRateCents ?? 0,
    currencyCode: ratePlan.currencyCode || listing.currencyCode || 'USD',
    baseMinimumStay: ratePlan.minimumStay ?? listing.minimumStay ?? 1,
    maximumStay: ratePlan.maximumStay ?? listing.maximumStay,
    guestCount: (args.adults ?? 1) + (args.children ?? 0),
    maxGuests: unit.maxGuests,
    securityDepositCents: listing.securityDepositCents ?? 0,
    seasonalRates: ratePlan.seasonalRates || [],
    fees: (listing.feeDefinitions || []).map((fee: any) => ({
      name: fee.name,
      feeType: fee.feeType,
      kind: fee.calculation,
      amountCents: fee.amountCents,
      percentageBasisPoints: fee.percentageBasisPoints,
      taxable: fee.taxable,
    })),
    taxes: (listing.taxRules || []).filter((tax: any) => !tax.isInclusive).map((tax: any) => ({
      name: tax.name,
      rateBasisPoints: tax.rateBasisPoints,
    })),
  });
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
    status: { equals: 'published' },
    accommodationUnit,
  };
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
  if (Boolean(args.checkIn) !== Boolean(args.checkOut)) throw new Error('Choose both check-in and check-out dates.');
  if (args.checkIn && args.checkOut) assertStayWithinMaximum(args.checkIn, args.checkOut, null);
  if (args.checkIn) assertStayNotInPast(args.checkIn);

  const sudo = context.sudo();
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
    if (args.propertyTypes?.length && !args.propertyTypes.includes(unit.accommodationType)) return [];
    if (args.bedrooms && unit.bedroomCount < args.bedrooms) return [];
    if (args.beds && unit.bedCount < args.beds) return [];
    if (args.bathroomsHalfUnits && unit.bathroomCountHalfUnits < args.bathroomsHalfUnits) return [];
    if (args.instantBook != null && Boolean(listing.instantBook) !== args.instantBook) return [];
    const amenitySlugs = new Set((listing.amenities || []).map((amenity: any) => amenity.slug));
    if (args.amenitySlugs?.some((slug) => !amenitySlugs.has(slug))) return [];
    if (args.checkIn && args.checkOut && conflictingUnitIds.has(unit.id)) return [];

    let quote = null;
    try {
      quote = quoteInput(listing, args);
    } catch {
      return [];
    }
    if (quote && args.minTotalCents != null && quote.totalAmountCents < args.minTotalCents) return [];
    if (quote && args.maxTotalCents != null && quote.totalAmountCents > args.maxTotalCents) return [];
    return [{ ...toPublicListing(listing), quote }];
  });

  return {
    totalCount: matches.length,
    offset,
    limit,
    results: matches.slice(offset, offset + limit),
  };
}
