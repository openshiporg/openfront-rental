export type PublicTokenSurface = 'quote' | 'trip' | 'agreement';
export type PublicAction = 'quote' | 'booking' | 'cancellation' | 'signature';

const unavailableMessages: Record<PublicTokenSurface, string> = {
  quote: 'Quotes expire after 30 minutes or after they are used.',
  trip: 'The link may be expired or revoked.',
  agreement: 'The agreement link may be expired or revoked.',
};

const actionFailureMessages: Record<PublicAction, string> = {
  quote: 'This stay could not be quoted for those dates or guest details. Review availability and restrictions and try again.',
  booking: 'We couldn’t confirm the booking result. Your details are still here. If you already submitted this quote, use Find my trip with your confirmation code and email before reserving again.',
  cancellation: 'The cancellation request could not be recorded. Refresh the private trip link and try again.',
  signature: 'The agreement could not be signed. Refresh the private agreement link and try again.',
};

export function publicTokenUnavailableMessage(surface: PublicTokenSurface) {
  return unavailableMessages[surface];
}

export function publicActionFailureMessage(action: PublicAction) {
  return actionFailureMessages[action];
}

// Quote refusals the server writes for guests (stay rules, party size, dates). Only these are shown
// from the URL, so a crafted link cannot put other text in the booking panel.
const GUEST_QUOTE_REFUSALS = [
  /^This listing requires a minimum stay of \d+ nights for the selected dates\.$/,
  /^This listing allows a maximum stay of \d+ nights for the selected dates\.$/,
  /^This stay exceeds the maximum supported length of \d+ nights\.$/,
  /^This home needs at least [\w’ ]{1,40} notice before check-in\. Choose a later arrival date\.$/,
  /^This home takes bookings up to \d+ days? ahead\. Choose an earlier arrival date\.$/,
  /^This home sleeps up to \d+ guests\.$/,
  /^Guest party exceeds the listing maximum occupancy of \d+\.$/,
  /^This stay does not allow pets\.$/,
  /^This stay is unavailable for the selected dates\.$/,
  /^This stay is not available for booking\.$/,
  /^Check-in cannot be in the past\.$/,
  /^Check-out must be after check-in\.$/,
  /^New bookings are paused on this storefront\. Existing trips are still available\.$/,
];

export function guestQuoteRefusal(message: unknown): string | null {
  const text = typeof message === 'string' ? message.trim() : '';
  return text && GUEST_QUOTE_REFUSALS.some((pattern) => pattern.test(text)) ? text : null;
}
