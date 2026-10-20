// Public booking rules: availability and sellability reads for the storefront.
import { MAX_SUPPORTED_STAY_NIGHTS } from '../utils/stayPricing';
import { readBoundedPages } from '../utils/readBoundedPages';
import { STAY_LISTING_SELECTION } from '../utils/stayListing';
import { effectiveStayRatePlan, listingArrivalContext, stayArrivalBounds, zonedTodayIso } from '../utils/stayBookingRules';
import { sellableListingWhere } from '../utils/stayEligibility';
import { REAL_CAPACITY_BLOCK_FILTER } from '../utils/fixtureOrigin';

/** One page of availability evidence; the calendar asks for the next page as it moves. */
const AVAILABILITY_PAGE_DAYS = 400;
/** Without a booking window, arrivals are offered this far ahead (a stated, supported bound). */
export const OPEN_WINDOW_ARRIVAL_DAYS = 730;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function addDays(dateIso: string, days: number) {
  const [year, month, day] = dateIso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Unavailable nights for a published home's physical unit, as merged [start, end) date
 * ranges over one bounded page [from, to), plus the booking contract the calendar follows:
 * the effective rate plan's arrival window and longest stay, and the last night a stay from
 * the last permitted arrival can reach. Only dates leave this resolver: never reasons, notes,
 * guests or reservations. `quoteStay` stays the authority when the guest continues.
 */
export async function publicStayAvailability(_root: unknown, args: { slug: string; from?: string | null; days?: number | null }, context: any) {
  const slug = args.slug?.trim();
  if (!slug || slug.length > 200) throw new Error('Listing slug is required.');
  const sudo = context.sudo();
  const [listing] = await sudo.query.Listing.findMany({
    where: { ...sellableListingWhere(), slug: { equals: slug } },
    take: 1,
    query: STAY_LISTING_SELECTION,
  });
  if (!listing?.accommodationUnit?.id) return null;

  const plan = effectiveStayRatePlan(listing);
  const bounds = stayArrivalBounds(listingArrivalContext(listing, plan));
  const maximumStay = Number.isSafeInteger(plan?.maximumStay) && plan!.maximumStay! > 0
    ? Math.min(plan!.maximumStay!, MAX_SUPPORTED_STAY_NIGHTS) : MAX_SUPPORTED_STAY_NIGHTS;
  const lastArrival = bounds.latestCheckIn || addDays(bounds.earliestCheckIn, OPEN_WINDOW_ARRIVAL_DAYS);
  const lastNight = addDays(lastArrival, maximumStay);

  const today = zonedTodayIso(listing.property?.timezone);
  const floor = addDays(today, -1);
  const requested = typeof args.from === 'string' && DATE_ONLY.test(args.from) ? args.from : floor;
  const from = requested < floor ? floor : requested;
  if (from >= lastNight) return { from, to: from, unavailable: [], bounds: { ...bounds, lastArrival, maximumStay, lastNight } };
  const days = Number.isSafeInteger(args.days) && (args.days as number) > 0 ? Math.min(args.days as number, AVAILABILITY_PAGE_DAYS) : AVAILABILITY_PAGE_DAYS;
  const pageEnd = addDays(from, days);
  const to = pageEnd > lastNight ? lastNight : pageEnd;
  const blocks = await readBoundedPages<any>(
    (skip, take) => sudo.query.CalendarBlock.findMany({
      where: {
        listing: { accommodationUnit: { id: { equals: listing.accommodationUnit.id } } },
        status: { equals: 'active' },
        ...REAL_CAPACITY_BLOCK_FILTER,
        startDate: { lt: to },
        endDate: { gt: from },
      },
      orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
      take,
      skip,
      query: 'startDate endDate',
    }),
    { pageSize: 250, maxItems: 5000, label: 'Stay availability' },
  );

  const unavailable: Array<{ start: string; end: string }> = [];
  for (const block of blocks) {
    const start = block.startDate < from ? from : block.startDate;
    const end = block.endDate > to ? to : block.endDate;
    if (!(end > start)) continue;
    const last = unavailable[unavailable.length - 1];
    if (last && start <= last.end) {
      if (end > last.end) last.end = end;
    } else {
      unavailable.push({ start, end });
    }
  }
  return { from, to, unavailable, bounds: { ...bounds, lastArrival, maximumStay, lastNight } };
}

export const bookingRuleTypeDefs = String.raw`
  type Query {
    publicStayAvailability(slug: String!, from: String, days: Int): JSON
  }
`;

export const bookingRuleResolvers = {
  Query: {
    publicStayAvailability,
  },
};
