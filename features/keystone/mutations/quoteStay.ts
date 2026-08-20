import { dateRangesOverlap, calculateStayQuote } from '../utils/stayPricing';
import { listingBookingSnapshot, STAY_LISTING_SELECTION } from '../utils/stayListing';
import { createStayQuoteToken, hashStayQuoteToken, stayQuoteExpiry } from '../utils/stayQuoteAccess';

type QuoteStayArgs = {
  listingId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children?: number | null;
  infants?: number | null;
  pets?: number | null;
};

function quoteNumber() {
  return `Q-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function quoteStay(_root: unknown, args: QuoteStayArgs, context: any) {
  const adults = args.adults ?? 1;
  const children = args.children ?? 0;
  const infants = args.infants ?? 0;
  const pets = args.pets ?? 0;
  for (const [label, value] of Object.entries({ adults, children, infants, pets })) {
    if (!Number.isSafeInteger(value) || value < (label === 'adults' ? 1 : 0)) {
      throw new Error(`Choose a valid number of ${label}.`);
    }
  }

  const listing = await context.sudo().query.Listing.findOne({
    where: { id: args.listingId },
    query: STAY_LISTING_SELECTION,
  });
  if (!listing || listing.status !== 'published') throw new Error('This stay is not available for booking.');
  if (!listing.hostOrganization?.id || !listing.accommodationUnit?.id) throw new Error('This listing is not ready for booking.');
  if (pets > 0) {
    const petRule = listing.houseRules?.find((rule: any) => rule.ruleType === 'pets');
    if (petRule && petRule.isAllowed === false) throw new Error('This stay does not allow pets.');
  }

  const blocks = await context.sudo().query.CalendarBlock.findMany({
    where: { listing: { id: { equals: listing.id } }, status: { equals: 'active' } },
    take: 500,
    query: 'id startDate endDate',
  });
  if (blocks.some((block: any) => dateRangesOverlap(args.checkIn, args.checkOut, block.startDate, block.endDate))) {
    throw new Error('This stay is unavailable for the selected dates.');
  }

  const ratePlan = listing.ratePlans?.[0];
  if (!ratePlan) throw new Error('This stay does not have an active rate plan.');
  const calculation = calculateStayQuote({
    checkIn: args.checkIn,
    checkOut: args.checkOut,
    baseNightlyRateCents: ratePlan.baseNightlyRateCents ?? listing.baseNightlyRateCents ?? 0,
    currencyCode: ratePlan.currencyCode || listing.currencyCode || 'USD',
    baseMinimumStay: ratePlan.minimumStay ?? listing.minimumStay ?? 1,
    guestCount: adults + children,
    maxGuests: listing.accommodationUnit.maxGuests,
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
  const number = quoteNumber();
  const token = createStayQuoteToken();
  const expiresAt = stayQuoteExpiry();
  const cancellationPolicy = ratePlan.cancellationPolicy || {
    id: null,
    name: 'Custom host policy',
    version: 'listing-current',
    summary: 'Cancellation terms are shown before booking.',
    rules: [],
  };
  const quoteSnapshot = {
    listing: listingBookingSnapshot(listing),
    cancellationPolicy,
    quote: {
      ...calculation,
      quoteNumber: number,
      adults,
      children,
      infants,
      pets,
    },
  };

  const quote = await context.sudo().query.StayQuote.createOne({
    data: {
      hostOrganization: { connect: { id: listing.hostOrganization.id } },
      listing: { connect: { id: listing.id } },
      ratePlan: { connect: { id: ratePlan.id } },
      quoteNumber: number,
      tokenHash: hashStayQuoteToken(token),
      status: 'active',
      checkInDate: args.checkIn,
      checkOutDate: args.checkOut,
      adults,
      children,
      infants,
      pets,
      currencyCode: calculation.currencyCode,
      lodgingSubtotalCents: calculation.lodgingSubtotalCents,
      feeTotalCents: calculation.feeTotalCents,
      taxTotalCents: calculation.taxTotalCents,
      securityDepositCents: calculation.securityDepositCents,
      totalAmountCents: calculation.totalAmountCents,
      quoteSnapshot,
      expiresAt: expiresAt.toISOString(),
    },
    query: 'id quoteNumber checkInDate checkOutDate currencyCode lodgingSubtotalCents feeTotalCents taxTotalCents securityDepositCents totalAmountCents expiresAt listing { id title slug thumbnail }',
  });

  return { ...quote, token, breakdown: calculation };
}
