const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export type SeasonalRateInput = {
  name: string;
  startDate: string;
  endDate: string;
  nightlyRateCents?: number | null;
  adjustmentBasisPoints?: number | null;
  minimumStay?: number | null;
  priority?: number | null;
};

export type FeeInput = {
  name: string;
  feeType?: string;
  kind: 'fixed' | 'per_night' | 'per_guest' | 'percentage';
  amountCents?: number | null;
  percentageBasisPoints?: number | null;
  taxable?: boolean;
};

export type TaxInput = {
  name: string;
  rateBasisPoints: number;
};

export type StayQuoteCalculationInput = {
  checkIn: string;
  checkOut: string;
  baseNightlyRateCents: number;
  currencyCode?: string;
  baseMinimumStay?: number;
  guestCount: number;
  maxGuests: number;
  securityDepositCents?: number;
  seasonalRates?: SeasonalRateInput[];
  fees?: FeeInput[];
  taxes?: TaxInput[];
};

function parseDateOnly(value: string, label: string) {
  if (!DATE_ONLY.test(value)) {
    throw new Error(`${label} must use YYYY-MM-DD format.`);
  }

  const [year, month, day] = value.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    throw new Error(`${label} must be a valid calendar date in YYYY-MM-DD format.`);
  }
  return date;
}

function assertNonNegativeInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer number of cents.`);
  }
}

function basisPointAmount(amountCents: number, basisPoints: number) {
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 0) {
    throw new Error('Basis points must be a non-negative integer.');
  }
  return Math.round((amountCents * basisPoints) / 10_000);
}

export function enumerateStayNights(checkIn: string, checkOut: string) {
  const start = parseDateOnly(checkIn, 'Check-in');
  const end = parseDateOnly(checkOut, 'Check-out');
  if (end.getTime() <= start.getTime()) {
    throw new Error('Check-out must be after check-in.');
  }

  const nights: string[] = [];
  for (let timestamp = start.getTime(); timestamp < end.getTime(); timestamp += DAY_MS) {
    nights.push(new Date(timestamp).toISOString().slice(0, 10));
  }
  return nights;
}

export function assertGuestCapacity(guestCount: number, maxGuests: number) {
  if (!Number.isSafeInteger(guestCount) || guestCount < 1) {
    throw new Error('A stay requires at least one guest.');
  }
  if (!Number.isSafeInteger(maxGuests) || maxGuests < 1) {
    throw new Error('Listing maximum occupancy must be at least one guest.');
  }
  if (guestCount > maxGuests) {
    throw new Error(`Guest party exceeds the listing maximum occupancy of ${maxGuests}.`);
  }
}

export function dateRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
) {
  const aStart = parseDateOnly(startA, 'Range A start').getTime();
  const aEnd = parseDateOnly(endA, 'Range A end').getTime();
  const bStart = parseDateOnly(startB, 'Range B start').getTime();
  const bEnd = parseDateOnly(endB, 'Range B end').getTime();
  if (aEnd <= aStart || bEnd <= bStart) throw new Error('Date ranges must have an end after their start.');
  return aStart < bEnd && bStart < aEnd;
}

function rateAppliesToNight(rate: SeasonalRateInput, night: string) {
  const nightTime = parseDateOnly(night, 'Night').getTime();
  const startTime = parseDateOnly(rate.startDate, `${rate.name} start`).getTime();
  const endTime = parseDateOnly(rate.endDate, `${rate.name} end`).getTime();
  if (endTime <= startTime) throw new Error(`${rate.name} must end after it starts.`);
  return startTime <= nightTime && nightTime < endTime;
}

function rateForNight(
  night: string,
  baseNightlyRateCents: number,
  seasonalRates: SeasonalRateInput[],
) {
  const applicable = seasonalRates
    .filter((rate) => rateAppliesToNight(rate, night))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  const selected = applicable[0];
  if (!selected) {
    return { amountCents: baseNightlyRateCents, source: 'Base rate', minimumStay: 1 };
  }

  const amountCents = selected.nightlyRateCents == null
    ? baseNightlyRateCents + basisPointAmount(baseNightlyRateCents, selected.adjustmentBasisPoints ?? 0)
    : selected.nightlyRateCents;
  assertNonNegativeInteger(amountCents, `${selected.name} nightly rate`);

  return {
    amountCents,
    source: selected.name,
    minimumStay: Math.max(selected.minimumStay ?? 1, 1),
  };
}

export function calculateStayQuote(input: StayQuoteCalculationInput) {
  assertNonNegativeInteger(input.baseNightlyRateCents, 'Base nightly rate');
  assertNonNegativeInteger(input.securityDepositCents ?? 0, 'Security deposit');
  assertGuestCapacity(input.guestCount, input.maxGuests);

  const nightDates = enumerateStayNights(input.checkIn, input.checkOut);
  const seasonalRates = input.seasonalRates ?? [];
  const nights = nightDates.map((date) => ({ date, ...rateForNight(date, input.baseNightlyRateCents, seasonalRates) }));
  const minimumStay = Math.max(
    input.baseMinimumStay ?? 1,
    ...nights.map((night) => night.minimumStay),
  );
  if (nightDates.length < minimumStay) {
    throw new Error(`This listing requires a minimum stay of ${minimumStay} nights for the selected dates.`);
  }

  const lodgingSubtotalCents = nights.reduce((sum, night) => sum + night.amountCents, 0);
  const fees = (input.fees ?? []).map((fee) => {
    const amountCents = (() => {
      switch (fee.kind) {
        case 'fixed': return fee.amountCents ?? 0;
        case 'per_night': return (fee.amountCents ?? 0) * nightDates.length;
        case 'per_guest': return (fee.amountCents ?? 0) * input.guestCount;
        case 'percentage': return basisPointAmount(lodgingSubtotalCents, fee.percentageBasisPoints ?? 0);
      }
    })();
    assertNonNegativeInteger(amountCents, `${fee.name} fee`);
    return { name: fee.name, feeType: fee.feeType, kind: fee.kind, amountCents, taxable: fee.taxable ?? true };
  });
  const feeTotalCents = fees.reduce((sum, fee) => sum + fee.amountCents, 0);
  const taxableSubtotalCents = lodgingSubtotalCents
    + fees.filter((fee) => fee.taxable).reduce((sum, fee) => sum + fee.amountCents, 0);
  const taxes = (input.taxes ?? []).map((tax) => ({
    name: tax.name,
    rateBasisPoints: tax.rateBasisPoints,
    amountCents: basisPointAmount(taxableSubtotalCents, tax.rateBasisPoints),
  }));
  const taxTotalCents = taxes.reduce((sum, tax) => sum + tax.amountCents, 0);

  return {
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    currencyCode: input.currencyCode ?? 'USD',
    numberOfNights: nightDates.length,
    minimumStay,
    guestCount: input.guestCount,
    nights,
    lodgingSubtotalCents,
    fees,
    feeTotalCents,
    taxableSubtotalCents,
    taxes,
    taxTotalCents,
    securityDepositCents: input.securityDepositCents ?? 0,
    totalAmountCents: lodgingSubtotalCents + feeTotalCents + taxTotalCents,
  };
}
