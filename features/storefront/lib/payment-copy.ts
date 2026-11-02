/**
 * Guest-facing payment wording. The flag is whether card checkout (Stripe) is set up:
 * when it is, every confirmed stay is paid by card from the trip page.
 */
export function stayPaymentSummary({ testBookings }: { testBookings: boolean; instantBook?: boolean }) {
  if (!testBookings) return 'Payment is arranged directly with the host.';
  return 'Once your stay is confirmed, pay by card from your trip page, or arrange payment directly with the host.';
}

export function stayPaymentShort(_options: { testBookings: boolean; instantBook?: boolean }) {
  return _options.testBookings ? 'pay by card once confirmed' : 'payment arranged with the host';
}

export function paymentPolicyCopy(testBookings: boolean) {
  return testBookings
    ? 'Once the host confirms your stay, you can pay the balance by card from your trip page, or arrange payment directly with the host. Card payments are processed by Stripe; your card details are never stored by this website.'
    : 'Payment is arranged directly with the host after you reserve; this website doesn’t take card payments.';
}

export const depositPolicyCopy = 'A security deposit is never charged with the stay. The host arranges its collection and return separately.';

export function refundPolicyCopy(testBookings: boolean) {
  return `If you cancel from your trip page, it shows what the policy refunds before you confirm. The host returns payments you arranged with them${testBookings ? '; card payments are refunded to the card you paid with' : ''}. Your trip page shows each refund’s status until it’s complete.`;
}
