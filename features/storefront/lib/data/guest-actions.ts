'use server';

import { redirect } from 'next/navigation';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { signedClientNetwork } from './client-network';
import { sendGuestLinkEmail } from '@/features/keystone/lib/guestMail';
import { passwordResetEmailConfigured } from '@/features/keystone/lib/mailAvailability';
import { withQuery } from '../account-navigation';
import { isIsoDate } from '../dates';
import { privateToken, tripPath } from '../navigation';
import { getPublicTrip } from './stays';

export type GuestFormState = { error: string };

const SEND_FAILED = 'Your message couldn’t be sent. Check it and try again.';

function value(formData: FormData, key: string) {
  const entry = formData.get(key);
  return typeof entry === 'string' ? entry.trim() : '';
}

function count(formData: FormData, key: string) {
  const parsed = Number.parseInt(value(formData, key), 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 50 ? parsed : null;
}

function tripLocation(formData: FormData) {
  const token = privateToken(value(formData, 'tripToken'));
  return { token, path: tripPath(token, value(formData, 'agreementToken')) };
}

export async function submitInquiryAction(_state: GuestFormState, formData: FormData): Promise<GuestFormState> {
  const name = value(formData, 'name');
  const email = value(formData, 'email');
  const message = value(formData, 'message');
  if (!name || name.length > 200) return { error: 'Enter your name.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) return { error: 'Enter a valid email address so the host knows who you are.' };
  if (!message || message.length > 4000) return { error: 'Write a message of up to 4,000 characters.' };
  const response = await keystoneClient<any>(`
    mutation SubmitGuestInquiry($name: String!, $email: String!, $message: String!, $listingSlug: String) {
      submitGuestInquiry(name: $name, email: $email, message: $message, listingSlug: $listingSlug)
    }
  `, { name, email, message, listingSlug: value(formData, 'stay') || null });
  const reason = response.success ? response.data.submitGuestInquiry?.reason : null;
  if (reason === 'listing_unavailable') return { error: 'That home is no longer listed, so your message wasn’t sent. Choose another home and ask from its page.' };
  if (reason === 'choose_listing') return { error: 'Open the home your question is about and use “Message the host” there, so it reaches the right host.' };
  const token = privateToken(response.success ? response.data.submitGuestInquiry?.threadToken : '');
  if (!token) return { error: SEND_FAILED };
  let emailed = false;
  if (passwordResetEmailConfigured()) {
    try {
      await sendGuestLinkEmail({ to: email, subject: 'Your message to the host', heading: 'Your message is with the host', body: 'Their replies appear on your private conversation page.', path: `/messages/${token}`, cta: 'Open the conversation' });
      emailed = true;
    } catch { emailed = false; }
  }
  redirect(`/messages/${token}?sent=1${emailed ? '&emailed=1' : ''}`);
}

export async function replyToThreadAction(_state: GuestFormState, formData: FormData): Promise<GuestFormState> {
  const token = privateToken(value(formData, 'threadToken'));
  const message = value(formData, 'message');
  if (!token) return { error: 'This conversation link is incomplete.' };
  if (!message || message.length > 4000) return { error: 'Write a message of up to 4,000 characters.' };
  const response = await keystoneClient<any>(`
    mutation ReplyToGuestThread($token: String!, $message: String!) { replyToGuestThread(token: $token, message: $message) }
  `, { token, message });
  if (!response.success || response.data.replyToGuestThread?.ok !== true) return { error: SEND_FAILED };
  redirect(`/messages/${token}?sent=1#messages`);
}

async function postTripMessage(token: string, topic: string, message: string) {
  const response = await keystoneClient<any>(`
    mutation SendTripMessage($tripToken: String!, $topic: String, $message: String!) {
      sendTripMessage(tripToken: $tripToken, topic: $topic, message: $message)
    }
  `, { tripToken: token, topic, message });
  return response.success && response.data.sendTripMessage?.ok === true;
}

export async function sendTripMessageAction(_state: GuestFormState, formData: FormData): Promise<GuestFormState> {
  const { token, path } = tripLocation(formData);
  const message = value(formData, 'message');
  if (!token) return { error: 'This trip link is incomplete.' };
  if (!message || message.length > 3800) return { error: 'Write a message of up to 3,800 characters.' };
  if (!(await postTripMessage(token, value(formData, 'topic') || 'general', message))) return { error: SEND_FAILED };
  redirect(withQuery(path, { sent: '1' }, 'messages'));
}

export async function requestTripChangeAction(_state: GuestFormState, formData: FormData): Promise<GuestFormState> {
  const { token, path } = tripLocation(formData);
  if (!token) return { error: 'This trip link is incomplete.' };
  const checkIn = value(formData, 'checkIn');
  const checkOut = value(formData, 'checkOut');
  const details = value(formData, 'details');
  if ((checkIn && !isIsoDate(checkIn)) || (checkOut && !isIsoDate(checkOut))) return { error: 'Choose valid dates.' };
  if (checkIn && checkOut && checkOut <= checkIn) return { error: 'Checkout must be after check-in.' };
  if (details.length > 2000) return { error: 'Keep the details to 2,000 characters.' };
  // Only what actually differs from the stay as it stands now is requested, and only from a
  // page showing the current party: a change the host made meanwhile is never overridden.
  const { trip } = await getPublicTrip(token);
  if (!trip) return { error: 'This trip link is unavailable.' };
  const seenVersion = value(formData, 'partyVersion');
  if (seenVersion && trip.partyVersion && seenVersion !== trip.partyVersion) {
    return { error: 'Your host changed this stay’s party since you opened the page. Refresh to review the current details, then ask again.' };
  }
  const datesChanged = (checkIn && checkIn !== trip.checkInDate) || (checkOut && checkOut !== trip.checkOutDate);
  const party = (['adults', 'children', 'infants', 'pets'] as const)
    .map(key => [key, count(formData, key)] as const)
    .filter(([key, entry]) => entry !== null && entry !== (trip.guestParty?.[key] ?? 0));
  const lines = [
    datesChanged ? `Requested dates: ${checkIn || trip.checkInDate} to ${checkOut || trip.checkOutDate} (booked ${trip.checkInDate} to ${trip.checkOutDate})` : '',
    party.length ? `Requested party: ${party.map(([key, entry]) => `${entry} ${key} (currently ${trip.guestParty?.[key] ?? 0})`).join(', ')}` : '',
    value(formData, 'otherHome') === 'on' ? 'Open to moving to a different home.' : '',
    details ? `Details: ${details}` : '',
  ].filter(Boolean);
  if (!lines.length) return { error: 'Nothing has changed yet. Change the dates or guests, choose another home, or describe the change.' };
  if (!(await postTripMessage(token, 'change_request', lines.join('\n')))) return { error: SEND_FAILED };
  redirect(withQuery(path, { changeRequested: '1' }, 'messages'));
}

function rating(formData: FormData, key: string) {
  const parsed = Number.parseInt(value(formData, key), 10);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : null;
}

export async function submitStayReviewAction(_state: GuestFormState, formData: FormData): Promise<GuestFormState> {
  const { token, path } = tripLocation(formData);
  if (!token) return { error: 'This trip link is incomplete.' };
  const overallRating = rating(formData, 'overallRating');
  if (!overallRating) return { error: 'Choose an overall rating from 1 to 5.' };
  const body = value(formData, 'body');
  const privateFeedback = value(formData, 'privateFeedback');
  if (body.length > 4000 || privateFeedback.length > 2000) return { error: 'Shorten your review and try again.' };
  const response = await keystoneClient<any>(`
    mutation SubmitStayReview($tripToken: String!, $overallRating: Int!, $cleanlinessRating: Int, $accuracyRating: Int, $communicationRating: Int, $locationRating: Int, $valueRating: Int, $body: String, $privateFeedback: String) {
      submitStayReview(tripToken: $tripToken, overallRating: $overallRating, cleanlinessRating: $cleanlinessRating, accuracyRating: $accuracyRating, communicationRating: $communicationRating, locationRating: $locationRating, valueRating: $valueRating, body: $body, privateFeedback: $privateFeedback)
    }
  `, {
    tripToken: token,
    overallRating,
    cleanlinessRating: rating(formData, 'cleanlinessRating'),
    accuracyRating: rating(formData, 'accuracyRating'),
    communicationRating: rating(formData, 'communicationRating'),
    locationRating: rating(formData, 'locationRating'),
    valueRating: rating(formData, 'valueRating'),
    body: body || null,
    privateFeedback: privateFeedback || null,
  });
  const result = response.success ? response.data.submitStayReview : null;
  if (result?.reason === 'exists') return { error: 'A review for this stay is already on record.' };
  if (result?.reason === 'not_eligible') return { error: 'Reviews open once your stay is complete.' };
  if (result?.ok !== true) return { error: 'Your review couldn’t be saved. Try again.' };
  redirect(withQuery(path, { reviewed: '1' }, 'review'));
}

const recoveryMessages: Record<string, string> = {
  no_match: 'We couldn’t match that confirmation code and email. Check both and try again.',
  rate_limited: 'Too many attempts from this connection. Wait 15 minutes and try again.',
  emailed_if_match: 'If those details match a booking, a fresh trip link goes to the booking email address, at most once every 15 minutes. Check that inbox, including spam. Each new email replaces the link in the one before.',
  revoked: 'Online access to this trip was turned off by the host. Send them a message from the help page.',
};

export async function recoverTripAction(_state: GuestFormState, formData: FormData): Promise<GuestFormState> {
  const confirmationCode = value(formData, 'confirmationCode').toUpperCase();
  const email = value(formData, 'email');
  if (!/^[A-Z0-9-]{6,64}$/.test(confirmationCode)) return { error: 'Enter the confirmation code from your booking, for example STAY-…' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter the email address used for the booking.' };
  const response = await keystoneClient<any>(`
    mutation RecoverStayTrip($confirmationCode: String!, $email: String!, $addToAccount: Boolean, $networkProof: String) {
      recoverStayTrip(confirmationCode: $confirmationCode, email: $email, addToAccount: $addToAccount, networkProof: $networkProof)
    }
  `, { confirmationCode, email, addToAccount: value(formData, 'addToAccount') === 'on', networkProof: await signedClientNetwork() });
  const result = response.success ? response.data.recoverStayTrip : null;
  if (!result?.ok) return { error: recoveryMessages[result?.reason] || 'We couldn’t look up that trip right now. Try again shortly.' };
  const token = privateToken(result.tripToken);
  if (!token) return { error: 'We couldn’t look up that trip right now. Try again shortly.' };
  redirect(withQuery(tripPath(token, result.agreementToken), { recovered: '1', ...(result.addedToAccount ? { saved: '1' } : {}) }));
}

export async function claimTripAction(_state: GuestFormState, formData: FormData): Promise<GuestFormState> {
  const { token, path } = tripLocation(formData);
  if (!token) return { error: 'This trip link is incomplete.' };
  const response = await keystoneClient<any>(`mutation ClaimStayTrip($tripToken: String!) { claimStayTrip(tripToken: $tripToken) }`, { tripToken: token });
  const result = response.success ? response.data.claimStayTrip : null;
  if (result?.reason === 'other_account') return { error: 'This trip is already saved to a different account.' };
  if (result?.ok !== true) return { error: 'Sign in again, then save this trip to your account.' };
  redirect(withQuery(path, { saved: '1' }));
}

export async function openAccountTripAction(formData: FormData) {
  const confirmationCode = value(formData, 'confirmationCode');
  const response = await keystoneClient<any>(`mutation OpenAccountTrip($confirmationCode: String!) { openAccountTrip(confirmationCode: $confirmationCode) }`, { confirmationCode });
  const result = response.success ? response.data.openAccountTrip : null;
  const token = privateToken(result?.tripToken);
  if (!result?.ok || !token) redirect(`/account?error=${result?.reason === 'revoked' ? 'revoked' : 'open'}`);
  redirect(tripPath(token, result.agreementToken));
}
