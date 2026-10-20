const GENERIC_MESSAGE = 'That action couldn’t be completed. Refresh and try again.';

/**
 * Message shown to a signed-in operator for a failed host command. Domain rule errors are
 * written for operators and pass through; database and provider internals never do.
 */
export function safeHostCommandMessage(error: unknown) {
  if (!(error instanceof Error)) return GENERIC_MESSAGE;
  const record = error as Error & { code?: unknown; type?: unknown };
  if (typeof record.type === 'string' && record.type.startsWith('Stripe')) {
    if (record.type === 'StripeConnectionError' || record.type === 'StripeAPIError') return 'Stripe couldn’t be reached. Try again in a moment.';
    if (record.type === 'StripeAuthenticationError' || record.type === 'StripePermissionError') return 'Card refunds aren’t configured for this store.';
    if (record.code === 'charge_already_refunded') return 'Stripe reports this charge is already fully refunded.';
    return 'Stripe declined the refund request. Check the payment in Stripe before trying again.';
  }
  if (error.constructor?.name?.startsWith('Prisma') || (typeof record.code === 'string' && /^P\d{4}$/.test(record.code))) return GENERIC_MESSAGE;
  const message = error.message?.trim();
  if (!message || message.length > 400 || /prisma|invalid `|SELECT |INSERT |UPDATE "/i.test(message)) return GENERIC_MESSAGE;
  return message;
}
