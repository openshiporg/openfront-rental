'use server';

import { redirect } from 'next/navigation';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { searchQuery, privateToken, tripPath } from '../navigation';
import { publicActionFailureMessage } from '../public-token-copy';
import { validateStayDateRange } from './stay-input';

function value(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

function intValue(formData: FormData, key: string, fallback = 0) {
  const parsed = Number.parseInt(value(formData, key), 10);
  return Number.isSafeInteger(parsed) ? parsed : fallback;
}

function withError(path: string, message: string) {
  return `${path}${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(message)}`;
}

export async function quoteStayAction(formData: FormData) {
  const listingId = value(formData, 'listingId');
  const listingSlug = value(formData, 'listingSlug');
  const checkIn = value(formData, 'checkIn');
  const checkOut = value(formData, 'checkOut');
  const returnPath = `/stays/${encodeURIComponent(listingSlug)}?${searchQuery(Object.fromEntries([...formData].filter((entry): entry is [string, string] => typeof entry[1] === 'string')))}`;
  try {
    validateStayDateRange(checkIn, checkOut);
  } catch (error) {
    redirect(withError(returnPath, error instanceof Error ? error.message : 'Choose valid stay dates.'));
  }
  const response = await keystoneClient<any>(`
    mutation QuoteStay($listingId: ID!, $checkIn: String!, $checkOut: String!, $adults: Int!, $children: Int, $infants: Int, $pets: Int) {
      quoteStay(listingId: $listingId, checkIn: $checkIn, checkOut: $checkOut, adults: $adults, children: $children, infants: $infants, pets: $pets) { token }
    }
  `, {
    listingId,
    checkIn,
    checkOut,
    adults: intValue(formData, 'adults', 1),
    children: intValue(formData, 'children'),
    infants: intValue(formData, 'infants'),
    pets: intValue(formData, 'pets'),
  });
  if (!response.success) redirect(withError(returnPath, publicActionFailureMessage('quote')));
  redirect(`/checkout/${response.data.quoteStay.token}`);
}

export async function bookStayAction(formData: FormData) {
  const quoteToken = value(formData, 'quoteToken');
  const response = await keystoneClient<any>(`
    mutation CreateStayReservation($quoteToken: String!, $guestName: String!, $guestEmail: String!, $guestPhone: String, $guestNotes: String) {
      createStayReservation(quoteToken: $quoteToken, guestName: $guestName, guestEmail: $guestEmail, guestPhone: $guestPhone, guestNotes: $guestNotes) {
        confirmationCode tripToken agreementToken
      }
    }
  `, {
    quoteToken,
    guestName: value(formData, 'guestName'),
    guestEmail: value(formData, 'guestEmail'),
    guestPhone: value(formData, 'guestPhone') || null,
    guestNotes: value(formData, 'guestNotes') || null,
  });
  if (!response.success) return { error: publicActionFailureMessage('booking') };
  const reservation = response.data.createStayReservation;
  redirect(`/trips/${reservation.tripToken}?booked=1&agreement=${reservation.agreementToken}`);
}

export async function cancelStayAction(formData: FormData) {
  const tripToken = privateToken(value(formData, 'tripToken'));
  const response = await keystoneClient<any>(`
    mutation RequestStayCancellation($tripToken: String!, $reason: String) {
      requestStayCancellation(tripToken: $tripToken, reason: $reason) { status refundPendingCents }
    }
  `, { tripToken, reason: value(formData, 'reason') || null });
  if (!response.success) return { error: publicActionFailureMessage('cancellation') };
  redirect(`${tripPath(tripToken, value(formData, 'agreementToken'))}${privateToken(value(formData, 'agreementToken')) ? '&' : '?'}cancelled=1`);
}

export async function signStayAgreementAction(formData: FormData) {
  const token = value(formData, 'agreementToken');
  const tripToken = privateToken(value(formData, 'tripToken'));
  const response = await keystoneClient<any>(`
    mutation SignStayAgreement($token: String!, $signatureName: String!) {
      signStayAgreement(token: $token, signatureName: $signatureName) { status }
    }
  `, { token, signatureName: value(formData, 'signatureName') });
  if (!response.success) return { error: publicActionFailureMessage('signature') };
  redirect(tripToken ? `/trips/${tripToken}?agreement=${encodeURIComponent(token)}&signed=1` : `/agreements/${token}?signed=1`);
}

export async function bookStayFormAction(_state: { error: string }, formData: FormData) {
  if (value(formData, 'consent') !== 'on') return { error: 'Please review and accept the stay terms before reserving.' };
  return bookStayAction(formData);
}
export async function cancelStayFormAction(_state: { error: string }, formData: FormData) {
  if (value(formData, 'confirmCancellation') !== 'on') return { error: 'Confirm that you want to cancel this stay.' };
  return cancelStayAction(formData);
}
export async function signStayFormAction(_state: { error: string }, formData: FormData) {
  if (value(formData, 'consent') !== 'on') return { error: 'Please confirm you have read the stay terms.' };
  return signStayAgreementAction(formData);
}
