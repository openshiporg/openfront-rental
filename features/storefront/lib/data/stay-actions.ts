'use server';

import { redirect } from 'next/navigation';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { searchQuery, privateToken, tripPath } from '../navigation';
import { publicActionFailureMessage } from '../public-token-copy';
import { validateStayDateRange } from './stay-input';
import { receiptPath, rememberCheckoutReceiptKey } from './checkout-receipt';
import { sendGuestLinkEmail } from '@/features/keystone/lib/guestMail';
import { passwordResetEmailConfigured } from '@/features/keystone/lib/mailAvailability';

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

// Booking refusals written for guests; anything else gets the generic recovery copy.
const GUEST_SAFE_BOOKING_ERRORS = [
  'The stay terms changed. Review them again before reserving.',
  'The store’s terms of use changed. Review them again before reserving.',
  'The store’s privacy policy changed. Review it again before reserving.',
  'Test bookings aren’t available on this storefront. Make an ordinary booking instead.',
  'New bookings are paused on this storefront. Existing trips are still available.',
  'This stay became unavailable. Request a new quote for different dates.',
  'This stay is not available for booking.',
  'This booking was made in a different session. Use Find my trip with your confirmation code and email.',
  'This checkout was already submitted with different details. Use Find my trip with your confirmation code and email.',
];

function guestSafeBookingError(error: unknown) {
  const message = typeof error === 'string' ? error : '';
  return GUEST_SAFE_BOOKING_ERRORS.find((known) => message.includes(known)) || null;
}

export async function bookStayAction(formData: FormData) {
  const quoteToken = value(formData, 'quoteToken');
  // The receipt key is saved in this browser before anything is booked.
  const receiptKey = await rememberCheckoutReceiptKey(quoteToken, value(formData, 'receiptKey'));
  const simulation = value(formData, 'bookingKind') === 'test';
  const response = await keystoneClient<any>(`
    mutation CreateStayReservation($quoteToken: String!, $guestName: String!, $guestEmail: String!, $guestPhone: String, $guestNotes: String, $acceptedTermsVersion: String, $acceptedStoreTermsVersion: String, $privacyNoticeVersion: String, $simulation: Boolean, $receiptKey: String) {
      createStayReservation(quoteToken: $quoteToken, guestName: $guestName, guestEmail: $guestEmail, guestPhone: $guestPhone, guestNotes: $guestNotes, acceptedTermsVersion: $acceptedTermsVersion, acceptedStoreTermsVersion: $acceptedStoreTermsVersion, privacyNoticeVersion: $privacyNoticeVersion, simulation: $simulation, receiptKey: $receiptKey) {
        confirmationCode tripToken agreementToken status listing recovered testMode
      }
    }
  `, {
    quoteToken,
    guestName: value(formData, 'guestName'),
    guestEmail: value(formData, 'guestEmail'),
    guestPhone: value(formData, 'guestPhone') || null,
    guestNotes: value(formData, 'guestNotes') || null,
    // The server records acceptance only of the exact terms version this checkout showed.
    acceptedTermsVersion: value(formData, 'consent') === 'on' ? value(formData, 'termsVersion') || null : null,
    acceptedStoreTermsVersion: value(formData, 'storeTermsConsent') === 'on' ? value(formData, 'storeTermsVersion') || null : null,
    privacyNoticeVersion: value(formData, 'privacyNoticeVersion') || null,
    simulation,
    // Same checkout, same key: a retry after a lost response returns the booking already made.
    receiptKey,
  });
  if (!response.success) return { error: guestSafeBookingError((response as any).error) || publicActionFailureMessage('booking') };
  const reservation = response.data.createStayReservation;
  // A signed-in guest's booking is saved to their account in the same commit (server side).
  // Card payment is offered only for a confirmed test booking.
  const card = reservation.testMode === true && reservation.status === 'confirmed';
  let emailed = false;
  if (passwordResetEmailConfigured() && !reservation.recovered && reservation.agreementToken) {
    const test = reservation.testMode === true;
    try {
      await sendGuestLinkEmail({
        to: value(formData, 'guestEmail'),
        subject: `${test ? '[Test booking] ' : ''}Your stay ${reservation.confirmationCode}`,
        heading: test ? 'Your test booking is saved' : reservation.status === 'confirmed' ? 'Your stay is confirmed' : 'Your booking request is with the host',
        body: `${test ? 'This is a test booking: no dates are held and no real money is taken. ' : ''}${reservation.listing?.title ? `${reservation.listing.title}. ` : ''}Confirmation code ${reservation.confirmationCode}. Open your private trip page for payment, your agreement, arrival details and messages with your host.`,
        path: `/trips/${reservation.tripToken}?agreement=${reservation.agreementToken}`,
        cta: 'Open your trip',
      });
      emailed = true;
    } catch {
      emailed = false;
    }
  }
  redirect(receiptPath(reservation, `${reservation.recovered ? '&receipt=1' : ''}${emailed ? '&emailed=1' : ''}${card ? '&pay=1#payment' : ''}`));
}

export async function cancelStayAction(formData: FormData) {
  const tripToken = privateToken(value(formData, 'tripToken'));
  const response = await keystoneClient<any>(`
    mutation RequestStayCancellation($tripToken: String!, $reason: String, $confirmCancellation: Boolean, $expectedRefundCents: Int, $expectedAssessmentId: String) {
      requestStayCancellation(tripToken: $tripToken, reason: $reason, confirmCancellation: $confirmCancellation, expectedRefundCents: $expectedRefundCents, expectedAssessmentId: $expectedAssessmentId) { status refundPendingCents refundReviewCents }
    }
  `, {
    tripToken,
    reason: value(formData, 'reason') || null,
    confirmCancellation: value(formData, 'confirmCancellation') === 'on',
    expectedRefundCents: intValue(formData, 'expectedRefundCents', -1),
    expectedAssessmentId: value(formData, 'expectedAssessmentId') || null,
  });
  if (!response.success) {
    // The refund shown changed (for example a refund window passed): show the new amount to confirm.
    if (/review it again/i.test(String((response as any).error || ''))) {
      const path = tripPath(tripToken, value(formData, 'agreementToken'));
      redirect(`${path}${path.includes('?') ? '&' : '?'}cancel_review=1#changes`);
    }
    return { error: publicActionFailureMessage('cancellation') };
  }
  redirect(`${tripPath(tripToken, value(formData, 'agreementToken'))}${privateToken(value(formData, 'agreementToken')) ? '&' : '?'}cancelled=1`);
}

export async function signStayAgreementAction(formData: FormData) {
  const token = value(formData, 'agreementToken');
  const tripToken = privateToken(value(formData, 'tripToken'));
  const response = await keystoneClient<any>(`
    mutation SignStayAgreement($token: String!, $signatureName: String!, $acceptTerms: Boolean) {
      signStayAgreement(token: $token, signatureName: $signatureName, acceptTerms: $acceptTerms) { status }
    }
  `, { token, signatureName: value(formData, 'signatureName'), acceptTerms: value(formData, 'consent') === 'on' });
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
