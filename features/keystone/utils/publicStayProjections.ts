function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

/** Public views retain the policy-filtered location, never the private address snapshot. */
export function publicBookingListingProjection(snapshot: unknown): Record<string, unknown> | null {
  const listing = asRecord(snapshot);
  if (!listing) return null;

  const property = asRecord(listing.property);
  if (!property) return { ...listing };

  const publicProperty = { ...property };
  delete publicProperty.address;
  return { ...listing, property: publicProperty };
}

/** Remove immutable internal quote data before creating the bearer-token response. */
export function publicStayQuoteProjection(quote: unknown): Record<string, unknown> | null {
  const record = asRecord(quote);
  if (!record) return null;

  const publicQuote = { ...record };
  delete publicQuote.tokenHash;
  delete publicQuote.quoteSnapshot;

  const snapshot = asRecord(record.quoteSnapshot);
  const listingSnapshot = snapshot?.listing || record.listing;
  return {
    ...publicQuote,
    breakdown: snapshot?.quote || null,
    cancellationPolicy: snapshot?.cancellationPolicy || null,
    listing: publicBookingListingProjection(listingSnapshot),
  };
}
