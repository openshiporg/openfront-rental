import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';

export type ListingReadinessIndex = { pricedIds: string[]; bookableIds: string[]; sellablePropertyIds: string[]; error: string | null };

/**
 * Which readable listings are priced and which are bookable online now, from the server's
 * quote rules (no prices or terms). Incomplete or failed reads are an error, never "none".
 */
export async function getListingReadinessIndex(): Promise<ListingReadinessIndex> {
  const response = await keystoneClient<{ listingReadinessIndex: { complete: boolean; pricedIds: string[]; bookableIds: string[]; sellablePropertyIds: string[]; limit: number } }>(
    'query ListingReadinessIndex { listingReadinessIndex }',
  );
  if (!response.success) return { pricedIds: [], bookableIds: [], sellablePropertyIds: [], error: 'Listing readiness is temporarily unavailable.' };
  const index = response.data.listingReadinessIndex;
  if (!index?.complete) {
    return { pricedIds: [], bookableIds: [], sellablePropertyIds: [], error: `Readiness can’t be checked for more than ${Number(index?.limit || 5000).toLocaleString('en-US')} listings or properties at once.` };
  }
  return { pricedIds: index.pricedIds || [], bookableIds: index.bookableIds || [], sellablePropertyIds: index.sellablePropertyIds || [], error: null };
}

export type OnlineReadiness = { priced: boolean; bookable: boolean; problem: string | null; quoteProblem: string | null } | null;
/** Property-level listing counts from the server (`Property.listingSummary`); null when unavailable. */
export type PropertyListingSummary = { total: number; published: number; bookable: number; complete: boolean } | null;
