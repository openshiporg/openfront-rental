import type { PublicStay } from './data/stays';
// Defense in depth for customer rendering. The public GraphQL JSON resolvers
// still require their own authorization/projection repair (audit R06–R07).
function pick(record: any, keys: string[]) {
  return Object.fromEntries(keys.filter(key => record?.[key] !== undefined).map(key => [key, record[key]]));
}
export function customerListing(record: any): PublicStay | null {
  if (!record) return null;
  return {
    ...pick(record, ['id', 'title', 'slug', 'subtitle', 'description', 'thumbnail', 'currencyCode', 'baseNightlyRateCents', 'instantBook', 'securityDepositCents', 'minimumStay', 'maximumStay', 'accommodation', 'media', 'amenities', 'collections', 'houseRules', 'ratePlans', 'feeDefinitions', 'taxRules', 'host']),
    property: {
      ...pick(record.property, ['name', 'propertyType', 'timezone', 'checkInFrom', 'checkInUntil', 'checkOutBy']),
      location: pick(record.property?.location || record.property?.address, ['publicLocationLabel', 'city', 'region', 'countryCode']),
    },
    quote: record.quote,
    id: record.id, title: record.title, slug: record.slug,
  };
}
export function customerQuote(record: any): Record<string, any> | null {
  if (!record) return null;
  return { ...pick(record, ['quoteNumber', 'status', 'expiresAt', 'checkInDate', 'checkOutDate', 'adults', 'children', 'infants', 'pets', 'currencyCode', 'lodgingSubtotalCents', 'feeTotalCents', 'taxTotalCents', 'securityDepositCents', 'totalAmountCents', 'breakdown', 'cancellationPolicy']), listing: customerListing(record.listing) };
}
export function customerTrip(record: any): Record<string, any> | null {
  if (!record) return null;
  return {
    ...pick(record, ['confirmationCode', 'status', 'paymentStatus', 'checkInDate', 'checkOutDate', 'scheduledCheckInTime', 'scheduledCheckOutTime', 'checkedInAt', 'checkedOutAt', 'cancelledAt', 'currencyCode', 'lodgingSubtotalCents', 'feeTotalCents', 'taxTotalCents', 'discountTotalCents', 'securityDepositCents', 'totalAmountCents', 'amountPaidCents', 'balanceDueCents', 'refundDueCents', 'cancellationPolicy']),
    listing: customerListing(record.listing),
    guestParty: pick(record.guestParty, ['adults', 'children', 'infants', 'pets']),
    agreement: record.agreement ? pick(record.agreement, ['agreementNumber', 'status', 'title', 'signatureName', 'signedAt']) : null,
    securityDeposit: record.securityDeposit ? pick(record.securityDeposit, ['depositNumber', 'status', 'amountCents', 'capturedAmountCents', 'currencyCode', 'heldAt', 'releasedAt']) : null,
    lineItems: (record.lineItems || []).map((line: any) => pick(line, ['id', 'lineType', 'description', 'serviceDate', 'quantity', 'unitAmountCents', 'totalAmountCents', 'currencyCode'])),
    refunds: (record.refunds || []).map((refund: any) => pick(refund, ['id', 'refundNumber', 'status', 'amountCents', 'currencyCode', 'processedAt'])),
    payments: (record.payments || []).map((payment: any) => pick(payment, ['id', 'amountCents', 'refundedAmountCents', 'currencyCode', 'status', 'paymentMethod', 'processedAt'])),
  };
}
