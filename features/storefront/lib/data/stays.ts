import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { customerListing, customerQuote, customerTrip } from '../public-projections';
import { publicTokenUnavailableMessage } from '../public-token-copy';
import { validateOptionalStayDateRange } from './stay-input';

export type PublicStay = {
  id: string;
  title: string;
  slug: string;
  /** Detail page only: published guest reviews, newest first. */
  publishedReviews?: Array<{ id: string; overallRating: number; body: string; publishedAt: string | null; author: string }>;
  /** Cursor of the review page shown (null: newest) and of the next older page, if any. */
  reviewsBefore?: string | null;
  olderReviewsBefore?: string | null;
  subtitle?: string;
  description?: string;
  thumbnail?: string;
  currencyCode?: string;
  baseNightlyRateCents?: number;
  instantBook?: boolean;
  reviewAverageHundredths?: number;
  reviewCount?: number;
  property?: any;
  accommodation?: any;
  media?: any[];
  amenities?: any[];
  houseRules?: any[];
  quote?: any;
  host?: any;
  ratePlans?: any[];
  collections?: any[];
  minimumStay?: number;
  maximumStay?: number;
  securityDepositCents?: number;
  feeDefinitions?: any[];
  taxRules?: any[];
};

export type StaySearchInput = {
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
  infants?: number;
  offset?: number;
  limit?: number;
  pets?: number;
  bedrooms?: number;
  instantBook?: boolean;
  collectionSlug?: string;
  listingIds?: string[];
};

export type CollectionFacet = { slug: string; name: string; count: number };

export async function searchPublicStays(input: StaySearchInput = {}) {
  try {
    validateOptionalStayDateRange(input.checkIn, input.checkOut);
  } catch (error) {
    return {
      results: [] as PublicStay[],
      totalCount: 0,
      collections: [] as CollectionFacet[],
      error: error instanceof Error ? error.message : 'Choose valid stay dates.',
    };
  }
  const response = await keystoneClient<any>(`
    query SearchStays($destination: String, $checkIn: String, $checkOut: String, $adults: Int, $children: Int, $pets: Int, $bedrooms: Int, $instantBook: Boolean, $infants: Int, $collectionSlug: String, $listingIds: [ID!], $offset: Int, $limit: Int) {
      searchStays(destination: $destination, checkIn: $checkIn, checkOut: $checkOut, adults: $adults, children: $children, pets: $pets, bedrooms: $bedrooms, instantBook: $instantBook, infants: $infants, collectionSlug: $collectionSlug, listingIds: $listingIds, offset: $offset, limit: $limit) {
        totalCount offset limit results collections
      }
    }
  `, input);
  if (!response.success) return { results: [] as PublicStay[], totalCount: 0, collections: [] as CollectionFacet[], error: 'Search is temporarily unavailable. Try again shortly.' };
  return {
    results: (response.data.searchStays.results || []).map(customerListing) as PublicStay[],
    totalCount: response.data.searchStays.totalCount || 0,
    collections: (Array.isArray(response.data.searchStays.collections) ? response.data.searchStays.collections : []) as CollectionFacet[],
    error: null,
  };
}

export async function getPublicStay(slug: string, reviewsBefore?: string | null) {
  const response = await keystoneClient<any>(`
    query PublicListing($slug: String!, $reviewsBefore: String) { publicListing(slug: $slug, reviewsBefore: $reviewsBefore) }
  `, { slug, reviewsBefore: reviewsBefore || null });
  return response.success ? { stay: customerListing(response.data.publicListing) as PublicStay | null, error: null } : { stay: null, error: 'This stay could not be loaded. Try again shortly.' };
}

export type StayAvailabilityBounds = { earliestCheckIn: string; latestCheckIn: string | null; lastArrival: string; maximumStay: number; lastNight: string };
/** One page of availability evidence: nights in [from, to) are known; `unavailable` lists blocked ranges. */
export type StayAvailability = { from: string; to: string; unavailable: Array<{ start: string; end: string }>; bounds: StayAvailabilityBounds | null };

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Unavailable night ranges for one page of the booking calendar; null when they couldn't be read. */
export async function getPublicStayAvailability(slug: string, from?: string | null): Promise<StayAvailability | null> {
  const response = await keystoneClient<any>(`
    query PublicStayAvailability($slug: String!, $from: String) { publicStayAvailability(slug: $slug, from: $from) }
  `, { slug, from: from && DATE_ONLY.test(from) ? from : null });
  const value = response.success ? response.data.publicStayAvailability : null;
  if (!value || !Array.isArray(value.unavailable) || !DATE_ONLY.test(String(value.from)) || !DATE_ONLY.test(String(value.to))) return null;
  const unavailable = value.unavailable.filter((range: any) => typeof range?.start === 'string' && typeof range?.end === 'string' && range.end > range.start)
    .map((range: any) => ({ start: range.start, end: range.end }));
  const raw = value.bounds;
  const bounds = raw && DATE_ONLY.test(String(raw.earliestCheckIn)) && DATE_ONLY.test(String(raw.lastNight)) && DATE_ONLY.test(String(raw.lastArrival)) && Number.isSafeInteger(raw.maximumStay)
    ? { earliestCheckIn: raw.earliestCheckIn, latestCheckIn: DATE_ONLY.test(String(raw.latestCheckIn)) ? raw.latestCheckIn : null, lastArrival: raw.lastArrival, maximumStay: raw.maximumStay, lastNight: raw.lastNight }
    : null;
  return { from: String(value.from), to: String(value.to), unavailable, bounds };
}

export async function getPublicStayQuote(token: string) {
  const response = await keystoneClient<any>(`
    query PublicStayQuote($token: String!) { publicStayQuote(token: $token) }
  `, { token });
  return response.success ? { quote: customerQuote(response.data.publicStayQuote), error: null } : { quote: null, error: publicTokenUnavailableMessage('quote') };
}

export async function getPublicStayAgreement(token: string) {
  const response = await keystoneClient<any>(`
    query PublicStayAgreement($token: String!) { publicStayAgreement(token: $token) }
  `, { token });
  return response.success ? { agreement: response.data.publicStayAgreement, error: null } : { agreement: null, error: publicTokenUnavailableMessage('agreement') };
}

export async function getPublicTrip(token: string, messagesBefore?: string | null) {
  const response = await keystoneClient<any>(`
    query PublicTrip($token: String!, $messagesBefore: String) { publicTrip(token: $token, messagesBefore: $messagesBefore) }
  `, { token, messagesBefore: messagesBefore || null });
  return response.success ? { trip: customerTrip(response.data.publicTrip), error: null } : { trip: null, error: publicTokenUnavailableMessage('trip') };
}

/** One home per collection (its cover), with complete member counts from the server. */
export async function collectionCovers(input: StaySearchInput = {}) {
  const index = await searchPublicStays({ ...input, limit: 1 });
  if (index.error) return { collections: [] as Array<CollectionFacet & { cover: PublicStay | null }>, error: index.error };
  const covers = await Promise.all(index.collections.map(async (facet) => {
    const page = await searchPublicStays({ ...input, collectionSlug: facet.slug, limit: 1 });
    return { ...facet, cover: page.results[0] || null };
  }));
  return { collections: covers, error: null };
}
