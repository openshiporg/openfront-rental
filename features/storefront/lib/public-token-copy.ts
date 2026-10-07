export type PublicTokenSurface = 'quote' | 'trip' | 'agreement';
export type PublicAction = 'quote' | 'booking' | 'cancellation' | 'signature';

const unavailableMessages: Record<PublicTokenSurface, string> = {
  quote: 'Quotes expire after 30 minutes or after they are used.',
  trip: 'The link may be expired or revoked.',
  agreement: 'The agreement link may be expired or revoked.',
};

const actionFailureMessages: Record<PublicAction, string> = {
  quote: 'This stay could not be quoted for those dates or guest details. Review availability and restrictions and try again.',
  booking: 'We couldn’t confirm the booking result. Your details are still here. If you already submitted this quote, check your trip link or contact support before reserving again.',
  cancellation: 'The cancellation request could not be recorded. Refresh the private trip link and try again.',
  signature: 'The agreement could not be signed. Refresh the private agreement link and try again.',
};

export function publicTokenUnavailableMessage(surface: PublicTokenSurface) {
  return unavailableMessages[surface];
}

export function publicActionFailureMessage(action: PublicAction) {
  return actionFailureMessages[action];
}
