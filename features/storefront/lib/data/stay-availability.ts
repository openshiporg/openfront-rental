'use server';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { validateStayDateRange } from './stay-input';
import { getPublicStayAvailability, type StayAvailability } from './stays';

/** The next page of a home's availability for the calendar (bounded on the server). */
export async function loadStayAvailabilityAction(input: { slug: string; from: string }): Promise<StayAvailability | null> {
  const slug = typeof input?.slug === 'string' ? input.slug.slice(0, 200) : '';
  const from = typeof input?.from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.from) ? input.from : '';
  if (!slug || !from) return null;
  return getPublicStayAvailability(slug, from);
}

export type StayDateCheck =
  | { status: 'available'; quote: Record<string, any> }
  | { status: 'unavailable' }
  /** Free for these dates, but it can't be booked online now (no published terms, or bookings paused). */
  | { status: 'not_bookable'; reason: string; quote: Record<string, any> | null }
  | { status: 'error' };

function boundedCount(value: unknown, min: number, max: number) {
  return Number.isSafeInteger(value) && (value as number) >= min && (value as number) <= max ? value as number : null;
}

/**
 * Read-only date check for the stay calendar. Uses the public `searchStays`
 * contract scoped to this exact listing, so it applies the same calendar,
 * party and pet rules as a quote and prices the stay with the canonical
 * calculator, without minting a quote token. `quoteStay` remains the authority.
 */
export async function checkStayDatesAction(input: {
  listingId: string;
  title: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  infants?: number;
  pets?: number;
}): Promise<StayDateCheck> {
  const listingId = typeof input?.listingId === 'string' ? input.listingId.slice(0, 100) : '';
  const title = typeof input?.title === 'string' ? input.title.trim().slice(0, 200) : '';
  const adults = boundedCount(input?.adults, 1, 16);
  const children = boundedCount(input?.children, 0, 16);
  const infants = boundedCount(input?.infants ?? 0, 0, 16);
  const pets = boundedCount(input?.pets ?? 0, 0, 16);
  if (!listingId || adults === null || children === null || infants === null || pets === null) return { status: 'error' };
  try {
    validateStayDateRange(input.checkIn, input.checkOut);
  } catch {
    return { status: 'error' };
  }

  const response = await keystoneClient<any>(`
    query CheckStayDates($listingIds: [ID!], $checkIn: String, $checkOut: String, $adults: Int, $children: Int, $infants: Int, $pets: Int) {
      searchStays(listingIds: $listingIds, checkIn: $checkIn, checkOut: $checkOut, adults: $adults, children: $children, infants: $infants, pets: $pets, limit: 1) {
        results
      }
    }
  `, { listingIds: [listingId], checkIn: input.checkIn, checkOut: input.checkOut, adults, children, infants, pets });
  if (!response.success) return { status: 'error' };

  const match = (response.data.searchStays.results || []).find((listing: any) => listing?.id === listingId);
  if (!match) return { status: 'unavailable' };
  const quote = match.quote;
  if (!quote || typeof quote.totalAmountCents !== 'number') return { status: 'error' };
  const priced = {
      checkIn: quote.checkIn,
      checkOut: quote.checkOut,
      currencyCode: quote.currencyCode,
      numberOfNights: quote.numberOfNights,
      nights: (quote.nights || []).map((night: any) => ({ date: night.date, amountCents: night.amountCents, source: night.source })),
      lodgingSubtotalCents: quote.lodgingSubtotalCents,
      fees: (quote.fees || []).map((fee: any) => ({ name: fee.name, amountCents: fee.amountCents })),
      feeTotalCents: quote.feeTotalCents,
      taxes: (quote.taxes || []).map((tax: any) => ({ name: tax.name, amountCents: tax.amountCents })),
      taxTotalCents: quote.taxTotalCents,
      securityDepositCents: quote.securityDepositCents,
      totalAmountCents: quote.totalAmountCents,
  };
  if (match.onlineBooking?.ready === false) {
    const reason = typeof match.onlineBooking.reason === 'string' && match.onlineBooking.reason ? match.onlineBooking.reason : 'This home can’t be booked online right now. Message the host.';
    return { status: 'not_bookable', reason, quote: priced };
  }
  return { status: 'available', quote: priced };
}
