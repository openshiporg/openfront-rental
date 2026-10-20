import type { PublicStay } from './data/stays';
// Defense in depth for customer rendering. The public GraphQL JSON resolvers
// still require their own authorization/projection repair (audit R06–R07).
function pick(record: any, keys: string[]) {
  return Object.fromEntries(keys.filter(key => record?.[key] !== undefined).map(key => [key, record[key]]));
}
export function customerListing(record: any): PublicStay | null {
  if (!record) return null;
  return {
    ...pick(record, ['id', 'title', 'slug', 'subtitle', 'description', 'thumbnail', 'currencyCode', 'baseNightlyRateCents', 'instantBook', 'securityDepositCents', 'minimumStay', 'maximumStay', 'accommodation', 'media', 'amenities', 'collections', 'houseRules', 'ratePlans', 'feeDefinitions', 'taxRules', 'host', 'reviewAverageHundredths', 'reviewCount']),
    property: {
      ...pick(record.property, ['name', 'propertyType', 'timezone', 'checkInFrom', 'checkInUntil', 'checkOutBy']),
      location: pick(record.property?.location || record.property?.address, ['publicLocationLabel', 'city', 'region', 'countryCode']),
    },
    quote: record.quote,
    publishedReviews: (record.publishedReviews || []).map((review: any) => pick(review, ['id', 'overallRating', 'body', 'publishedAt', 'author'])),
    reviewsBefore: typeof record.reviewsBefore === 'string' ? record.reviewsBefore : null,
    olderReviewsBefore: typeof record.olderReviewsBefore === 'string' ? record.olderReviewsBefore : null,
    id: record.id, title: record.title, slug: record.slug,
  };
}
export function customerQuote(record: any): Record<string, any> | null {
  if (!record) return null;
  return { ...pick(record, ['quoteNumber', 'status', 'expiresAt', 'checkInDate', 'checkOutDate', 'adults', 'children', 'infants', 'pets', 'currencyCode', 'lodgingSubtotalCents', 'feeTotalCents', 'taxTotalCents', 'securityDepositCents', 'totalAmountCents', 'breakdown', 'cancellationPolicy', 'termsVersion']), listing: customerListing(record.listing) };
}
export function customerTrip(record: any): Record<string, any> | null {
  if (!record) return null;
  return {
    ...pick(record, ['confirmationCode', 'status', 'paymentStatus', 'checkInDate', 'checkOutDate', 'scheduledCheckInTime', 'scheduledCheckOutTime', 'checkedInAt', 'checkedOutAt', 'cancelledAt', 'currencyCode', 'lodgingSubtotalCents', 'feeTotalCents', 'taxTotalCents', 'discountTotalCents', 'securityDepositCents', 'totalAmountCents', 'amountPaidCents', 'balanceDueCents', 'refundDueCents', 'refundReviewCents', 'cancellationPolicy', 'earlierMessagesBefore']),
    testMode: record.testMode === true,
    sample: record.sample === true,
    cancellationPreview: record.cancellationPreview ? pick(record.cancellationPreview, ['status', 'refundCents', 'reviewCents', 'refundBasisPoints', 'refundBase', 'basis', 'window', 'hoursBeforeCheckIn', 'assessmentId']) : null,
    listing: customerListing(record.listing),
    guestParty: pick(record.guestParty, ['adults', 'children', 'infants', 'pets']),
    bookedGuestParty: record.bookedGuestParty ? pick(record.bookedGuestParty, ['adults', 'children', 'infants', 'pets']) : null,
    partyVersion: typeof record.partyVersion === 'string' ? record.partyVersion : null,
    partyChanges: (record.partyChanges || []).map((change: any) => ({
      at: change.at || null,
      previous: change.previous ? pick(change.previous, ['adults', 'children', 'infants', 'pets']) : null,
      next: change.next ? pick(change.next, ['adults', 'children', 'infants', 'pets']) : null,
    })),
    agreement: record.agreement ? pick(record.agreement, ['agreementNumber', 'status', 'title', 'signatureName', 'signedAt', 'signedBySetup']) : null,
    securityDeposit: record.securityDeposit ? pick(record.securityDeposit, ['depositNumber', 'status', 'amountCents', 'capturedAmountCents', 'currencyCode', 'heldAt', 'releasedAt']) : null,
    lineItems: (record.lineItems || []).map((line: any) => pick(line, ['id', 'lineType', 'description', 'serviceDate', 'quantity', 'unitAmountCents', 'totalAmountCents', 'currencyCode'])),
    amendments: (record.amendments || []).map((amendment: any) => pick(amendment, ['id', 'previousCheckInDate', 'previousCheckOutDate', 'checkInDate', 'checkOutDate', 'createdAt', 'currencyCode', 'totalBeforeCents', 'totalAfterCents', 'guestAcceptance'])),
    refunds: (record.refunds || []).map((refund: any) => pick(refund, ['id', 'refundNumber', 'status', 'amountCents', 'currencyCode', 'processedAt'])),
    payments: (record.payments || []).map((payment: any) => pick(payment, ['id', 'amountCents', 'refundedAmountCents', 'currencyCode', 'status', 'paymentMethod', 'processedAt', 'isTest'])),
    arrival: record.arrival ? {
      ...pick(record.arrival, ['instructions', 'checkInFrom', 'checkInUntil', 'checkOutBy', 'timezone']),
      address: record.arrival.address ? pick(record.arrival.address, ['addressLine1', 'addressLine2', 'city', 'region', 'postalCode', 'countryCode']) : null,
    } : null,
    messages: (record.messages || []).map((message: any) => pick(message, ['id', 'from', 'body', 'at'])),
    review: record.review ? pick(record.review, ['status', 'overallRating', 'submittedAt']) : null,
    canReview: record.canReview === true,
    damageClaims: (record.damageClaims || []).map((claim: any) => pick(claim, ['claimNumber', 'status', 'description', 'claimedAmountCents', 'approvedAmountCents', 'currencyCode', 'submittedAt', 'resolvedAt'])),
    account: pick(record.account, ['linked', 'linkedToYou', 'signedIn']),
  };
}
