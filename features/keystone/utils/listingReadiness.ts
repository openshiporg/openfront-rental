import { effectiveStayRatePlan } from './stayBookingRules';
import { listingSellabilityProblem, onlineQuoteReadinessProblem } from './stayEligibility';

/**
 * One authoritative online-readiness result per listing, the same rules as search and quotes:
 * sellable parents and unit, a positive effective rate in the listing's currency, and real,
 * versioned cancellation terms (plus the fee rules quotes support). It discloses only
 * readiness facts, never prices or terms, so operators who can read a listing but not its
 * pricing see whether it is bookable without seeing — or misreading hidden — pricing.
 */
export type ListingReadiness = {
  /** A positive effective nightly rate in the listing's currency. */
  priced: boolean;
  /** Bookable online now: the same answer search and quotes give. */
  bookable: boolean;
  /** Guest/operator-facing reason it isn't bookable, or null. */
  problem: string | null;
  /** What quotes would refuse once published (price, terms, fees), ignoring publication and parents. */
  quoteProblem: string | null;
};

const policySelect = { id: true, version: true, summary: true, fullTerms: true };

export async function listingReadinessFor(prisma: any, listingIds: string[]): Promise<Map<string, ListingReadiness>> {
  const result = new Map<string, ListingReadiness>();
  if (!listingIds.length) return result;
  const listings = await prisma.listing.findMany({
    where: { id: { in: listingIds } },
    select: {
      id: true, status: true, currencyCode: true, baseNightlyRateCents: true, minimumStay: true, maximumStay: true, advanceNoticeHours: true, bookingWindowDays: true,
      hostOrganization: { select: { id: true, isPublic: true, status: true, cancellationPolicies: { orderBy: [{ createdAt: 'asc' }], take: 1, select: policySelect } } },
      property: { select: { status: true } },
      accommodationUnit: { select: { status: true } },
      ratePlans: { where: { status: 'active' }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }], take: 1, select: { id: true, name: true, baseNightlyRateCents: true, currencyCode: true, minimumStay: true, maximumStay: true, advanceNoticeHours: true, bookingWindowDays: true, cancellationPolicy: { select: policySelect } } },
      feeDefinitions: { where: { isActive: true }, select: { feeType: true, required: true, isActive: true } },
    },
  });
  for (const listing of listings) {
    const plan = effectiveStayRatePlan(listing);
    const rate = plan?.baseNightlyRateCents || 0;
    const priced = rate > 0 && (!plan?.currencyCode || plan.currencyCode === listing.currencyCode);
    const quoteProblem = !priced
      ? plan && rate > 0 ? `Priced in ${plan.currencyCode}; the listing sells in ${listing.currencyCode}.` : 'No positive nightly rate.'
      : onlineQuoteReadinessProblem(plan, listing);
    const problem = listingSellabilityProblem(listing)
      ? listing.status !== 'published' ? 'Not published.' : 'Its host, property or unit isn’t open for booking.'
      : quoteProblem;
    result.set(listing.id, { priced, bookable: !problem, problem, quoteProblem });
  }
  return result;
}

/** Published listings of these properties, read in bounded pages; `complete` is false past the cap. */
async function publishedListingsOf(prisma: any, propertyIds: string[], cap: number) {
  const rows: Array<{ id: string; propertyId: string | null }> = [];
  for (let skip = 0; ; skip += 500) {
    const page = await prisma.listing.findMany({ where: { propertyId: { in: propertyIds }, status: 'published' }, orderBy: [{ id: 'asc' }], skip, take: 500, select: { id: true, propertyId: true } });
    rows.push(...page);
    if (rows.length > cap) return { rows: [], complete: false };
    if (page.length < 500) return { rows, complete: true };
  }
}

/** Of these properties, those with at least one listing bookable online now (the quote rules). */
export async function sellablePropertyIdsFor(prisma: any, propertyIds: string[], cap = 5000): Promise<{ propertyIds: string[]; complete: boolean }> {
  if (!propertyIds.length) return { propertyIds: [], complete: true };
  const published = await publishedListingsOf(prisma, propertyIds, cap);
  if (!published.complete) return { propertyIds: [], complete: false };
  const readiness = await listingReadinessFor(prisma, published.rows.map((row) => row.id));
  const sellable = new Set<string>();
  for (const row of published.rows) if (row.propertyId && readiness.get(row.id)?.bookable) sellable.add(row.propertyId);
  return { propertyIds: [...sellable], complete: true };
}

export type PropertyListingSummary = { total: number; published: number; bookable: number; complete: boolean };

/**
 * Minimal listing facts for one property, readable with the property itself: counts only, no
 * listing details, prices or terms. Property readers without listing access still get a true
 * sellable state instead of a hidden relation that looks empty.
 */
export async function propertyListingSummary(prisma: any, propertyId: string, cap = 5000): Promise<PropertyListingSummary> {
  const [total, published] = await Promise.all([
    prisma.listing.count({ where: { propertyId } }),
    publishedListingsOf(prisma, [propertyId], cap),
  ]);
  if (!published.complete) return { total, published: 0, bookable: 0, complete: false };
  const readiness = await listingReadinessFor(prisma, published.rows.map((row) => row.id));
  const bookable = published.rows.filter((row) => readiness.get(row.id)?.bookable).length;
  return { total, published: published.rows.length, bookable, complete: true };
}
