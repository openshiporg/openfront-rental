/**
 * Guest-facing payment wording. `testBookings` must come from public settings
 * (`testBookingsAvailable`) so the copy matches what checkout offers: ordinary bookings
 * are real and paid as arranged with the host; a test booking is an explicit choice.
 */
export function stayPaymentSummary({ testBookings }: { testBookings: boolean; instantBook?: boolean }) {
  if (!testBookings) return 'Payment is arranged directly with the host.';
  return 'Payment is arranged directly with the host. To try card checkout, you can choose a test booking instead: it holds no dates and is paid only with a Stripe test card, so no real money is charged.';
}

export function stayPaymentShort(_options: { testBookings: boolean; instantBook?: boolean }) {
  return 'payment arranged with the host';
}

export function paymentPolicyCopy(testBookings: boolean) {
  return testBookings
    ? 'Payment for a stay is arranged directly with the host after you reserve; this website doesn’t take real card payments. To try card checkout, you can choose a test booking at checkout: it holds no dates, isn’t a real stay, and is paid only with a Stripe test card, so no real money is charged. Your card details are never stored by this website.'
    : 'Payment is arranged directly with the host after you reserve; this website doesn’t take card payments.';
}

export const depositPolicyCopy = 'A security deposit is never charged with the stay. The host arranges its collection and return separately.';

export function refundPolicyCopy(testBookings: boolean) {
  return `If you cancel from your trip page, it shows what the policy refunds before you confirm. The host returns payments you arranged with them${testBookings ? '; a test booking’s test-card payment is refunded to that test card' : ''}. Your trip page shows each refund’s status until it’s complete.`;
}
