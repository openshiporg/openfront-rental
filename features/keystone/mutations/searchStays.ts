import { calculateStayQuote, dateRangesOverlap } from '../utils/stayPricing';
import { STAY_LISTING_SELECTION, toPublicListing } from '../utils/stayListing';

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

function searchText(listing: any) {
  const address = listing.property?.address;
  return [listing.title, listing.subtitle, listing.description, address?.city, address?.region, address?.countryCode, address?.publicLocationLabel]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

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

export async function searchStays(_root: unknown, args: SearchStaysArgs, context: any) {
  const limit = Math.min(Math.max(args.limit ?? 24, 1), 100);
  const offset = Math.max(args.offset ?? 0, 0);
  const guestCount = (args.adults ?? 1) + (args.children ?? 0);
  if (guestCount < 1) throw new Error('Search requires at least one guest.');
  if (Boolean(args.checkIn) !== Boolean(args.checkOut)) throw new Error('Choose both check-in and check-out dates.');

  const listings = await context.sudo().query.Listing.findMany({
    where: { status: { equals: 'published' } },
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    take: 250,
    query: STAY_LISTING_SELECTION,
  });
  const listingIds = listings.map((listing: any) => listing.id);
  const blocks = args.checkIn && args.checkOut && listingIds.length
    ? await context.sudo().query.CalendarBlock.findMany({
        where: {
          listing: { id: { in: listingIds } },
          status: { equals: 'active' },
        },
        take: 2000,
        query: 'id startDate endDate listing { id }',
      })
    : [];
  const destination = args.destination?.trim().toLowerCase();

  const matches = listings.flatMap((listing: any) => {
    const unit = listing.accommodationUnit;
    if (!unit || unit.maxGuests < guestCount) return [];
    if (destination && !searchText(listing).includes(destination)) return [];
    if (args.propertyTypes?.length && !args.propertyTypes.includes(unit.accommodationType)) return [];
    if (args.bedrooms && unit.bedroomCount < args.bedrooms) return [];
    if (args.beds && unit.bedCount < args.beds) return [];
    if (args.bathroomsHalfUnits && unit.bathroomCountHalfUnits < args.bathroomsHalfUnits) return [];
    if (args.instantBook != null && Boolean(listing.instantBook) !== args.instantBook) return [];
    const amenitySlugs = new Set((listing.amenities || []).map((amenity: any) => amenity.slug));
    if (args.amenitySlugs?.some((slug) => !amenitySlugs.has(slug))) return [];
    if (args.checkIn && args.checkOut) {
      const conflict = blocks.some((block: any) => block.listing?.id === listing.id
        && dateRangesOverlap(args.checkIn!, args.checkOut!, block.startDate, block.endDate));
      if (conflict) return [];
    }

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
