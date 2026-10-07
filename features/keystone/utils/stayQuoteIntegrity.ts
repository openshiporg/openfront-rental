const SNAPSHOT_FIELDS: Array<[string, string]> = [
  ['quoteNumber', 'quoteNumber'],
  ['checkInDate', 'checkIn'],
  ['checkOutDate', 'checkOut'],
  ['adults', 'adults'],
  ['children', 'children'],
  ['infants', 'infants'],
  ['pets', 'pets'],
  ['currencyCode', 'currencyCode'],
  ['lodgingSubtotalCents', 'lodgingSubtotalCents'],
  ['feeTotalCents', 'feeTotalCents'],
  ['taxTotalCents', 'taxTotalCents'],
  ['securityDepositCents', 'securityDepositCents'],
  ['totalAmountCents', 'totalAmountCents'],
];

function relationId(record: any, relation: string) {
  return record?.[`${relation}Id`] ?? record?.[relation]?.id ?? null;
}

function quoteChanged() {
  return new Error('Stay quote terms changed or are incomplete. Request a new quote.');
}

/** Check live quote columns and associations against the immutable evidence issued to the guest. */
export function assertStayQuoteMatchesSnapshot(record: any) {
  const snapshot = record?.quoteSnapshot;
  const issuedQuote = snapshot?.quote;
  const issuedListing = snapshot?.listing;
  const issuedHostId = issuedListing?.host?.id;
  const issuedUnitId = issuedListing?.accommodation?.id;
  const issuedRatePlanId = issuedListing?.ratePlans?.[0]?.id;

  if (
    !issuedQuote
    || !issuedListing?.id
    || !issuedHostId
    || !issuedUnitId
    || !issuedRatePlanId
    || typeof issuedListing.bookingMode !== 'string'
    || typeof issuedListing.instantBook !== 'boolean'
  ) throw quoteChanged();

  if (
    relationId(record, 'listing') !== issuedListing.id
    || relationId(record, 'hostOrganization') !== issuedHostId
    || relationId(record, 'ratePlan') !== issuedRatePlanId
    || (record?.listing !== undefined && (
      relationId(record.listing, 'accommodationUnit') !== issuedUnitId
      || relationId(record.listing, 'property') !== (issuedListing.property?.id ?? null)
      || (record.listing.bookingMode !== undefined && record.listing.bookingMode !== issuedListing.bookingMode)
      || (record.listing.instantBook !== undefined && record.listing.instantBook !== issuedListing.instantBook)
    ))
  ) throw quoteChanged();

  for (const [liveField, snapshotField] of SNAPSHOT_FIELDS) {
    if (record[liveField] !== issuedQuote[snapshotField]) throw quoteChanged();
  }

  return { listing: issuedListing, quote: issuedQuote };
}

/** Require the listing's mutable booking semantics to remain compatible with the issued quote. */
export function assertStayListingMatchesSnapshot(currentListing: any, issuedListing: any) {
  if (
    !currentListing
    || currentListing.id !== issuedListing?.id
    || currentListing.status !== 'published'
    || currentListing.hostOrganizationId !== issuedListing.host?.id
    || currentListing.accommodationUnitId !== issuedListing.accommodation?.id
    || currentListing.propertyId !== (issuedListing.property?.id ?? null)
    || currentListing.bookingMode !== issuedListing.bookingMode
    || currentListing.instantBook !== issuedListing.instantBook
  ) {
    throw new Error('This listing changed after the quote. Request a new quote.');
  }
}
