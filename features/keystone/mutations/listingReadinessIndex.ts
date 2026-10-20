import { readBoundedPages } from '../utils/readBoundedPages';
import { listingReadinessFor, sellablePropertyIdsFor } from '../utils/listingReadiness';

const MAX_RECORDS = 5000;

/**
 * Readiness of every listing the operator can read (their own access decides which), as ID
 * sets for tab counts and filters, plus the readable properties that have a bookable listing.
 * Computed by the server with the quote rules; it returns no prices or terms, so a reader
 * without pricing (or listing) access still sees the true bookable state.
 */
export async function listingReadinessIndex(_root: unknown, _args: unknown, context: any) {
  if (!context.session?.itemId) throw new Error('Sign in to continue.');
  let listingIds: string[];
  let propertyIds: string[];
  try {
    const [listings, properties] = await Promise.all([
      readBoundedPages<any>(
        (skip, take) => context.query.Listing.findMany({ orderBy: [{ id: 'asc' }], skip, take, query: 'id' }),
        { pageSize: 500, maxItems: MAX_RECORDS, label: 'Listing readiness' },
      ),
      readBoundedPages<any>(
        (skip, take) => context.query.Property.findMany({ orderBy: [{ id: 'asc' }], skip, take, query: 'id' }),
        { pageSize: 500, maxItems: MAX_RECORDS, label: 'Property readiness' },
      ),
    ]);
    listingIds = listings.map((listing: any) => String(listing.id));
    propertyIds = properties.map((property: any) => String(property.id));
  } catch {
    return { complete: false, pricedIds: [], bookableIds: [], sellablePropertyIds: [], limit: MAX_RECORDS };
  }
  const [readiness, sellable] = await Promise.all([
    listingReadinessFor(context.prisma, listingIds),
    sellablePropertyIdsFor(context.prisma, propertyIds, MAX_RECORDS),
  ]);
  if (!sellable.complete) return { complete: false, pricedIds: [], bookableIds: [], sellablePropertyIds: [], limit: MAX_RECORDS };
  const pricedIds: string[] = [];
  const bookableIds: string[] = [];
  for (const [id, entry] of readiness) {
    if (entry.priced) pricedIds.push(id);
    if (entry.bookable) bookableIds.push(id);
  }
  return { complete: true, pricedIds, bookableIds, sellablePropertyIds: sellable.propertyIds, limit: MAX_RECORDS };
}

export const listingReadinessTypeDefs = String.raw`
  type Query {
    """IDs of the listings you can read that are priced and bookable online now, and of your readable properties with a bookable listing (no prices or terms)."""
    listingReadinessIndex: JSON!
  }
`;

export const listingReadinessResolvers = {
  Query: { listingReadinessIndex },
};
