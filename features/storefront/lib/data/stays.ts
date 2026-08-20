import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';

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
};

export type StaySearchInput = {
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
  pets?: number;
  bedrooms?: number;
  instantBook?: boolean;
};

export async function searchPublicStays(input: StaySearchInput = {}) {
  const response = await keystoneClient<any>(`
    query SearchStays($destination: String, $checkIn: String, $checkOut: String, $adults: Int, $children: Int, $pets: Int, $bedrooms: Int, $instantBook: Boolean) {
      searchStays(destination: $destination, checkIn: $checkIn, checkOut: $checkOut, adults: $adults, children: $children, pets: $pets, bedrooms: $bedrooms, instantBook: $instantBook) {
        totalCount offset limit results
      }
    }
  `, input);
  if (!response.success) return { results: [] as PublicStay[], totalCount: 0, error: response.error };
  return {
    results: (response.data.searchStays.results || []) as PublicStay[],
    totalCount: response.data.searchStays.totalCount || 0,
    error: null,
  };
}

export async function getPublicStay(slug: string) {
  const response = await keystoneClient<any>(`
    query PublicListing($slug: String!) { publicListing(slug: $slug) }
  `, { slug });
  return response.success ? { stay: response.data.publicListing as PublicStay | null, error: null } : { stay: null, error: response.error };
}

export async function getPublicStayQuote(token: string) {
  const response = await keystoneClient<any>(`
    query PublicStayQuote($token: String!) { publicStayQuote(token: $token) }
  `, { token });
  return response.success ? { quote: response.data.publicStayQuote, error: null } : { quote: null, error: response.error };
}

export async function getPublicStayAgreement(token: string) {
  const response = await keystoneClient<any>(`
    query PublicStayAgreement($token: String!) { publicStayAgreement(token: $token) }
  `, { token });
  return response.success ? { agreement: response.data.publicStayAgreement, error: null } : { agreement: null, error: response.error };
}

export async function getPublicTrip(token: string) {
  const response = await keystoneClient<any>(`
    query PublicTrip($token: String!) { publicTrip(token: $token) }
  `, { token });
  return response.success ? { trip: response.data.publicTrip, error: null } : { trip: null, error: response.error };
}
