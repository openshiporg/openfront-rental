import { assertStayNotInPast, assertStayWithinMaximum, calculateStayQuote } from '../utils/stayPricing';
import { listingBookingSnapshot, STAY_LISTING_SELECTION } from '../utils/stayListing';
import { assertAccommodationUnitBookable } from '../utils/staySellability';
import { assertStayArrivalAllowed, effectiveStayRatePlan, listingArrivalContext, stayCalculationInput } from '../utils/stayBookingRules';
import { createStayQuoteToken, hashStayQuoteToken, stayQuoteExpiry } from '../utils/stayQuoteAccess';
import { listingSellabilityProblem, onlineQuoteReadinessProblem, partyEligibilityProblem } from '../utils/stayEligibility';
import { assertStorefrontSelling, readStorefrontSales } from '../utils/storefrontSales';
import { REAL_CAPACITY_BLOCK_FILTER } from '../utils/fixtureOrigin';

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
  assertStayWithinMaximum(args.checkIn, args.checkOut, null);
  assertStayNotInPast(args.checkIn);
  assertStorefrontSelling(await readStorefrontSales(context.prisma));

  const listing = await context.sudo().query.Listing.findOne({
    where: { id: args.listingId },
    query: STAY_LISTING_SELECTION,
  });
  if (!listing || listing.status !== 'published') throw new Error('This stay is not available for booking.');
  if (!listing.hostOrganization?.id || !listing.accommodationUnit?.id) throw new Error('This listing is not ready for booking.');
  assertAccommodationUnitBookable(listing.accommodationUnit.status);
  const sellability = listingSellabilityProblem(listing) || partyEligibilityProblem(listing, { adults, children, infants, pets });
  if (sellability) throw new Error(sellability);

  const overlappingBlocks = await context.sudo().query.CalendarBlock.findMany({
    where: {
      listing: { accommodationUnit: { id: { equals: listing.accommodationUnit.id } } },
      status: { equals: 'active' },
      ...REAL_CAPACITY_BLOCK_FILTER,
      startDate: { lt: args.checkOut },
      endDate: { gt: args.checkIn },
    },
    orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
    take: 1,
    query: 'id',
  });
  if (overlappingBlocks.length > 0) throw new Error('This stay is unavailable for the selected dates.');

  const ratePlan = effectiveStayRatePlan(listing);
  // A booking commits to captured cancellation terms, so a home needs real ones to sell.
  const readiness = onlineQuoteReadinessProblem(ratePlan, listing);
  if (readiness || !ratePlan) throw new Error(readiness || 'This stay does not have a published nightly rate.');
  assertStayArrivalAllowed(args.checkIn, listingArrivalContext(listing, ratePlan));
  const calculation = calculateStayQuote(stayCalculationInput(listing, ratePlan, {
    checkIn: args.checkIn,
    checkOut: args.checkOut,
    guestCount: adults + children,
    pets,
  }));
  const number = quoteNumber();
  const token = createStayQuoteToken();
  const expiresAt = stayQuoteExpiry();
  const cancellationPolicy = ratePlan.cancellationPolicy;
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

  // This is the narrow public quote command: all host/listing/date/availability/economics
  // checks above are authoritative here. Keep raw StayQuote CRUD host-protected, but do not
  // let an unrelated signed-in customer's session turn this public operation into a host write.
  const publicQuoteWriteContext = context.sudo().withSession(undefined);
  const quote = await publicQuoteWriteContext.query.StayQuote.createOne({
    data: {
      hostOrganization: { connect: { id: listing.hostOrganization.id } },
      listing: { connect: { id: listing.id } },
      ...(ratePlan.id ? { ratePlan: { connect: { id: ratePlan.id } } } : {}),
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
