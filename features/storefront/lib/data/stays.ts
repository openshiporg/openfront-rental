import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { customerListing, customerQuote, customerTrip } from '../public-projections';
import { publicTokenUnavailableMessage } from '../public-token-copy';
import { validateOptionalStayDateRange } from './stay-input';

export type PublicStay = {
  id: string;
  title: string;
  slug: string;
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
};

export async function searchPublicStays(input: StaySearchInput = {}) {
  try {
    validateOptionalStayDateRange(input.checkIn, input.checkOut);
  } catch (error) {
    return {
      results: [] as PublicStay[],
      totalCount: 0,
      error: error instanceof Error ? error.message : 'Choose valid stay dates.',
    };
  }
  const response = await keystoneClient<any>(`
    query SearchStays($destination: String, $checkIn: String, $checkOut: String, $adults: Int, $children: Int, $pets: Int, $bedrooms: Int, $instantBook: Boolean, $infants: Int, $offset: Int, $limit: Int) {
      searchStays(destination: $destination, checkIn: $checkIn, checkOut: $checkOut, adults: $adults, children: $children, pets: $pets, bedrooms: $bedrooms, instantBook: $instantBook, infants: $infants, offset: $offset, limit: $limit) {
        totalCount offset limit results
      }
    }
  `, input);
  if (!response.success) return { results: [] as PublicStay[], totalCount: 0, error: 'Search is temporarily unavailable. Try again shortly.' };
  return {
    results: (response.data.searchStays.results || []).map(customerListing) as PublicStay[],
    totalCount: response.data.searchStays.totalCount || 0,
    error: null,
  };
}

export async function getPublicStay(slug: string) {
  const response = await keystoneClient<any>(`
    query PublicListing($slug: String!) { publicListing(slug: $slug) }
  `, { slug });
  return response.success ? { stay: customerListing(response.data.publicListing) as PublicStay | null, error: null } : { stay: null, error: 'This stay could not be loaded. Try again shortly.' };
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

export async function getPublicTrip(token: string) {
  const response = await keystoneClient<any>(`
    query PublicTrip($token: String!) { publicTrip(token: $token) }
  `, { token });
  return response.success ? { trip: customerTrip(response.data.publicTrip), error: null } : { trip: null, error: publicTokenUnavailableMessage('trip') };
}

/** Three bounded read-only pages match the resolver's current 250-listing cap. */
export async function browsePublicCatalogue(input: StaySearchInput = {}) {
  const pages = await Promise.all([0, 100, 200].map(offset => searchPublicStays({ ...input, offset, limit: 100 })));
  const error = pages.find(page => page.error)?.error || null;
  return { results: error ? [] : pages.flatMap(page => page.results), error, totalCount: pages[0].totalCount };
}
