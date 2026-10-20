const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_SUPPORTED_STAY_NIGHTS = 365;

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
  /** `false` marks an optional extra; it's only charged when the guest selects it (not offered online yet). */
  required?: boolean;
};

export type TaxInput = {
  name: string;
  rateBasisPoints: number;
  /** Already included in prices: disclosed as an included component, never added again. */
  inclusive?: boolean;
};

/** Persisted money columns and GraphQL Int are 32-bit; totals must fit before anything is saved. */
export const MAX_STORED_CENTS = 2_147_483_647;

export type StayQuoteCalculationInput = {
  checkIn: string;
  checkOut: string;
  baseNightlyRateCents: number;
  currencyCode?: string;
  baseMinimumStay?: number;
  maximumStay?: number | null;
  guestCount: number;
  /** Pets travelling; pet fees apply only when there are pets, per pet for per-guest pet fees. */
  pets?: number;
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

/**
 * Coarse guard before a property is known: rejects dates already past everywhere on
 * Earth (UTC-12). The exact rule is the property's local date, checked with the
 * arrival rules (stayArrivalProblem) in search, quote, booking and amendment.
 */
export function assertStayNotInPast(checkIn: string, now = new Date()) {
  const start = parseDateOnly(checkIn, 'Check-in');
  const earliest = new Date(now.getTime() - 12 * 60 * 60 * 1000);
  const todayTimestamp = Date.UTC(earliest.getUTCFullYear(), earliest.getUTCMonth(), earliest.getUTCDate());
  if (start.getTime() < todayTimestamp) {
    throw new Error('Check-in cannot be in the past.');
  }
}

function checkedStayRange(checkIn: string, checkOut: string) {
  const start = parseDateOnly(checkIn, 'Check-in');
  const end = parseDateOnly(checkOut, 'Check-out');
  const elapsed = end.getTime() - start.getTime();
  if (elapsed <= 0) throw new Error('Check-out must be after check-in.');
  const nightCount = elapsed / DAY_MS;
  if (!Number.isSafeInteger(nightCount)) throw new Error('Stay dates exceed the supported calendar range.');
  return { startTimestamp: start.getTime(), nightCount };
}

function assertSupportedStayRange(nightCount: number) {
  if (nightCount > MAX_SUPPORTED_STAY_NIGHTS) {
    throw new Error(`This stay exceeds the maximum supported length of ${MAX_SUPPORTED_STAY_NIGHTS} nights.`);
  }
}

function stayNightDates(startTimestamp: number, nightCount: number) {
  return Array.from({ length: nightCount }, (_, index) => new Date(startTimestamp + index * DAY_MS).toISOString().slice(0, 10));
}

export function enumerateStayNights(checkIn: string, checkOut: string) {
  const range = checkedStayRange(checkIn, checkOut);
  assertSupportedStayRange(range.nightCount);
  return stayNightDates(range.startTimestamp, range.nightCount);
}

function assertMaximumStayNights(nights: number, maximumStay: number | null | undefined) {
  if (maximumStay == null) return;
  if (!Number.isSafeInteger(maximumStay) || maximumStay < 1) {
    throw new Error('Maximum stay must be a positive integer number of nights.');
  }
  if (nights > maximumStay) {
    throw new Error(`This listing allows a maximum stay of ${maximumStay} nights for the selected dates.`);
  }
}

export function assertStayWithinMaximum(checkIn: string, checkOut: string, maximumStay: number | null | undefined) {
  const range = checkedStayRange(checkIn, checkOut);
  assertMaximumStayNights(range.nightCount, maximumStay);
  assertSupportedStayRange(range.nightCount);
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

  // Seasonal adjustments are signed: -1000 is a 10% seasonal reduction.
  const adjustment = selected.adjustmentBasisPoints ?? 0;
  if (!Number.isSafeInteger(adjustment) || adjustment < -10_000) throw new Error(`${selected.name} adjustment must be a whole number of basis points no lower than -10000.`);
  const amountCents = selected.nightlyRateCents == null
    ? baseNightlyRateCents + Math.round((baseNightlyRateCents * adjustment) / 10_000)
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

  const stayRange = checkedStayRange(input.checkIn, input.checkOut);
  assertMaximumStayNights(stayRange.nightCount, input.maximumStay);
  assertSupportedStayRange(stayRange.nightCount);
  const nightDates = stayNightDates(stayRange.startTimestamp, stayRange.nightCount);

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
  const pets = input.pets ?? 0;
  if (!Number.isSafeInteger(pets) || pets < 0) throw new Error('Pets must be a whole number.');
  // Only fees that apply to this stay: optional extras aren't charged unselected, and pet
  // fees only when pets travel (per pet for a per-guest pet fee).
  const applicableFees = (input.fees ?? []).filter((fee) => fee.required !== false && (fee.feeType !== 'pet' || pets > 0));
  const fees = applicableFees.map((fee) => {
    const amountCents = (() => {
      switch (fee.kind) {
        case 'fixed': return fee.amountCents ?? 0;
        case 'per_night': return (fee.amountCents ?? 0) * nightDates.length;
        case 'per_guest': return (fee.amountCents ?? 0) * (fee.feeType === 'pet' ? pets : input.guestCount);
        case 'percentage': return basisPointAmount(lodgingSubtotalCents, fee.percentageBasisPoints ?? 0);
      }
    })();
    assertNonNegativeInteger(amountCents, `${fee.name} fee`);
    return { name: fee.name, feeType: fee.feeType, kind: fee.kind, amountCents, taxable: fee.taxable ?? true };
  });
  const feeTotalCents = fees.reduce((sum, fee) => sum + fee.amountCents, 0);
  const taxableSubtotalCents = lodgingSubtotalCents
    + fees.filter((fee) => fee.taxable).reduce((sum, fee) => sum + fee.amountCents, 0);
  const taxes = (input.taxes ?? []).filter((tax) => !tax.inclusive).map((tax) => ({
    name: tax.name,
    rateBasisPoints: tax.rateBasisPoints,
    amountCents: basisPointAmount(taxableSubtotalCents, tax.rateBasisPoints),
  }));
  const taxTotalCents = taxes.reduce((sum, tax) => sum + tax.amountCents, 0);
  // An inclusive tax is extracted from the taxable prices for disclosure; the total is unchanged.
  const includedTaxes = (input.taxes ?? []).filter((tax) => tax.inclusive).map((tax) => {
    if (!Number.isSafeInteger(tax.rateBasisPoints) || tax.rateBasisPoints < 0) throw new Error('Basis points must be a non-negative integer.');
    return {
      name: tax.name,
      rateBasisPoints: tax.rateBasisPoints,
      amountCents: taxableSubtotalCents - Math.round((taxableSubtotalCents * 10_000) / (10_000 + tax.rateBasisPoints)),
    };
  });
  const totalAmountCents = lodgingSubtotalCents + feeTotalCents + taxTotalCents;
  if (![lodgingSubtotalCents, feeTotalCents, taxTotalCents, totalAmountCents, input.securityDepositCents ?? 0].every((value) => value <= MAX_STORED_CENTS)) {
    throw new Error('This stay’s total is too large to book online. Choose fewer nights or contact the host.');
  }

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
    includedTaxes,
    securityDepositCents: input.securityDepositCents ?? 0,
    totalAmountCents,
  };
}
