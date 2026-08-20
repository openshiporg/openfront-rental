type JsonObject = Record<string, any>;

type StayQuoteSnapshot = {
  quoteNumber: string;
  checkIn: string;
  checkOut: string;
  numberOfNights: number;
  lodgingSubtotalCents: number;
  feeTotalCents: number;
  taxTotalCents: number;
  securityDepositCents: number;
  totalAmountCents: number;
  currencyCode: string;
  nights: Array<{ date: string; amountCents: number; source: string }>;
  fees: Array<{ name: string; feeType?: string; amountCents: number; taxable?: boolean }>;
  taxes: Array<{ name: string; rateBasisPoints: number; amountCents: number }>;
};

export type StayBookingSnapshotInput = {
  capturedAt?: Date;
  listing: JsonObject;
  guestParty: JsonObject;
  cancellationPolicy: JsonObject;
  quote: StayQuoteSnapshot;
};

export type StayBookingSnapshot = {
  version: 1;
  capturedAt: string;
  listing: JsonObject;
  guestParty: JsonObject;
  cancellationPolicy: JsonObject;
  quote: StayQuoteSnapshot;
};

export type ReservationLineSnapshot = {
  snapshotKey: string;
  lineType: string;
  description: string;
  serviceDate?: string;
  quantity: number;
  unitAmountCents: number;
  totalAmountCents: number;
  currencyCode: string;
  metadataSnapshot: JsonObject;
};

export function createStayBookingSnapshot(input: StayBookingSnapshotInput): StayBookingSnapshot {
  return {
    version: 1,
    capturedAt: (input.capturedAt ?? new Date()).toISOString(),
    listing: structuredClone(input.listing),
    guestParty: structuredClone(input.guestParty),
    cancellationPolicy: structuredClone(input.cancellationPolicy),
    quote: structuredClone(input.quote),
  };
}

function feeLineType(feeType?: string) {
  switch (feeType) {
    case 'cleaning': return 'cleaning_fee';
    case 'pet': return 'pet_fee';
    case 'extra_guest': return 'guest_fee';
    default: return 'service_fee';
  }
}

function keyPart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'line';
}

export function createReservationLineItemsFromQuote(
  reservationId: string,
  quote: StayQuoteSnapshot,
): ReservationLineSnapshot[] {
  const nightLines = quote.nights.map((night) => ({
    snapshotKey: `${reservationId}:night:${night.date}`,
    lineType: 'night',
    description: `${night.source} · ${night.date}`,
    serviceDate: night.date,
    quantity: 1,
    unitAmountCents: night.amountCents,
    totalAmountCents: night.amountCents,
    currencyCode: quote.currencyCode,
    metadataSnapshot: { pricingSource: night.source },
  }));

  const feeLines = quote.fees.map((fee, index) => ({
    snapshotKey: `${reservationId}:fee:${index + 1}:${keyPart(fee.name)}`,
    lineType: feeLineType(fee.feeType),
    description: fee.name,
    quantity: 1,
    unitAmountCents: fee.amountCents,
    totalAmountCents: fee.amountCents,
    currencyCode: quote.currencyCode,
    metadataSnapshot: { feeType: fee.feeType ?? 'service', taxable: fee.taxable ?? true },
  }));

  const taxLines = quote.taxes.map((tax, index) => ({
    snapshotKey: `${reservationId}:tax:${index + 1}:${keyPart(tax.name)}`,
    lineType: 'tax',
    description: tax.name,
    quantity: 1,
    unitAmountCents: tax.amountCents,
    totalAmountCents: tax.amountCents,
    currencyCode: quote.currencyCode,
    metadataSnapshot: { rateBasisPoints: tax.rateBasisPoints },
  }));

  const depositLines = quote.securityDepositCents > 0
    ? [{
        snapshotKey: `${reservationId}:security-deposit`,
        lineType: 'security_deposit',
        description: 'Refundable security deposit',
        quantity: 1,
        unitAmountCents: quote.securityDepositCents,
        totalAmountCents: quote.securityDepositCents,
        currencyCode: quote.currencyCode,
        metadataSnapshot: { refundable: true, includedInTotal: false },
      }]
    : [];

  return [...nightLines, ...feeLines, ...taxLines, ...depositLines];
}
