import { resolveActiveStayQuote } from '../utils/stayQuoteAccess';

export async function publicStayQuote(_root: unknown, args: { token: string }, context: any) {
  const quote = await resolveActiveStayQuote({
    token: args.token,
    findByHash: async (tokenHash) => {
      const quotes = await context.sudo().query.StayQuote.findMany({
        where: { tokenHash: { equals: tokenHash } },
        take: 1,
        query: `
          id quoteNumber status expiresAt consumedAt checkInDate checkOutDate adults children infants pets
          currencyCode lodgingSubtotalCents feeTotalCents taxTotalCents securityDepositCents totalAmountCents quoteSnapshot
          listing { id title slug subtitle thumbnail }
        `,
      });
      return quotes[0] || null;
    },
  });
  if (!quote) return null;
  const { tokenHash: _tokenHash, ...publicQuote } = quote;
  return {
    ...publicQuote,
    breakdown: quote.quoteSnapshot?.quote || null,
    cancellationPolicy: quote.quoteSnapshot?.cancellationPolicy || null,
    listing: quote.quoteSnapshot?.listing || quote.listing,
  };
}
