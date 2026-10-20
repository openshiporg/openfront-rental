import { calculateStayQuote, MAX_SUPPORTED_STAY_NIGHTS } from '@/features/keystone/utils/stayPricing';
import type { PublicStay } from './data/stays';
import { addDaysIso } from './dates';

/**
 * Live price previews for the booking calendar.
 *
 * This maps the public listing projection onto the same canonical
 * `calculateStayQuote` used by the `quoteStay` and `searchStays` resolvers, so
 * the preview matches their arithmetic. It is never authoritative: availability,
 * eligibility and the saved price are decided by `quoteStay` when the guest
 * continues. Keep this mapping identical to `quoteStay.ts`.
 */
export type StayPricing = {
  currencyCode: string;
  baseNightlyRateCents: number;
  baseMinimumStay: number;
  maximumStay: number | null;
  maxGuests: number;
  securityDepositCents: number;
  seasonalRates: any[];
  fees: any[];
  taxes: any[];
  petsAllowed: boolean;
};

export type StayEstimate = ReturnType<typeof calculateStayQuote>;

/** The nightly base price a guest is actually quoted: the active rate plan's, in its currency. */
export function effectiveBaseRate(stay: Pick<PublicStay, 'ratePlans' | 'baseNightlyRateCents' | 'currencyCode'>) {
  const ratePlan = stay.ratePlans?.[0];
  const cents = ratePlan?.baseNightlyRateCents ?? stay.baseNightlyRateCents;
  return typeof cents === 'number' ? { cents, currencyCode: ratePlan?.currencyCode || stay.currencyCode || 'USD' } : null;
}

export function stayPricing(stay: PublicStay): StayPricing | null {
  const ratePlan = stay.ratePlans?.[0];
  const maxGuests = stay.accommodation?.maxGuests;
  if (!ratePlan || !Number.isSafeInteger(maxGuests) || maxGuests < 1) return null;
  const petRule = stay.houseRules?.find(rule => rule.ruleType === 'pets');
  return {
    currencyCode: ratePlan.currencyCode || stay.currencyCode || 'USD',
    baseNightlyRateCents: ratePlan.baseNightlyRateCents ?? stay.baseNightlyRateCents ?? 0,
    baseMinimumStay: ratePlan.minimumStay ?? stay.minimumStay ?? 1,
    maximumStay: ratePlan.maximumStay ?? stay.maximumStay ?? null,
    maxGuests,
    securityDepositCents: stay.securityDepositCents ?? 0,
    seasonalRates: ratePlan.seasonalRates || [],
    fees: (stay.feeDefinitions || []).map((fee: any) => ({
      name: fee.name,
      feeType: fee.feeType,
      kind: fee.calculation,
      amountCents: fee.amountCents,
      percentageBasisPoints: fee.percentageBasisPoints,
      taxable: fee.taxable,
      required: fee.required,
    })),
    taxes: (stay.taxRules || []).map((tax: any) => ({
      name: tax.name,
      rateBasisPoints: tax.rateBasisPoints,
      inclusive: tax.isInclusive === true,
    })),
    petsAllowed: !(petRule && petRule.isAllowed === false),
  };
}

export type EstimateResult = { ok: true; estimate: StayEstimate } | { ok: false; message: string };

/**
 * The full validated party goes through the same calculator input as `quoteStay`: guests
 * (adults and children) and pets, so per-pet and per-night pet fees match the saved quote.
 */
export function estimateStay(pricing: StayPricing, checkIn: string, checkOut: string, party: { guestCount: number; pets?: number }): EstimateResult {
  try {
    return {
      ok: true,
      estimate: calculateStayQuote({
        checkIn,
        checkOut,
        baseNightlyRateCents: pricing.baseNightlyRateCents,
        currencyCode: pricing.currencyCode,
        baseMinimumStay: pricing.baseMinimumStay,
        maximumStay: pricing.maximumStay,
        guestCount: party.guestCount,
        pets: party.pets ?? 0,
        maxGuests: pricing.maxGuests,
        securityDepositCents: pricing.securityDepositCents,
        seasonalRates: pricing.seasonalRates,
        fees: pricing.fees,
        taxes: pricing.taxes,
      }),
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'These dates cannot be priced.' };
  }
}

/** Date rules only (minimum/maximum stay), independent of the guest party. */
export function stayDatesRule(pricing: StayPricing, checkIn: string, checkOut: string) {
  const result = estimateStay({ ...pricing, fees: [], taxes: [] }, checkIn, checkOut, { guestCount: 1 });
  return result.ok ? null : result.message;
}

export type NightlyRate = { amountCents: number; source: string; minimumStay: number };

/** Most nights priced at once for the calendar: the visible months only, never a fixed year. */
export const RATE_PAGE_NIGHTS = 93;

/** Published nightly rates for `nights` nights from `firstNight` (the calendar's visible range). */
export function nightlyRates(pricing: StayPricing, firstNight: string, nights = RATE_PAGE_NIGHTS): Record<string, NightlyRate> {
  const span = Math.min(Math.max(nights, 1), Math.min(RATE_PAGE_NIGHTS, MAX_SUPPORTED_STAY_NIGHTS));
  const result = estimateStay(
    { ...pricing, baseMinimumStay: 1, maximumStay: null, fees: [], taxes: [] },
    firstNight,
    addDaysIso(firstNight, span),
    { guestCount: 1 },
  );
  if (!result.ok) return {};
  return Object.fromEntries(result.estimate.nights.map(night => [night.date, {
    amountCents: night.amountCents,
    source: night.source,
    minimumStay: night.minimumStay,
  }]));
}

/** Longest stay the calendar allows from a check-in: the plan's maximum, or the supported 365 nights. */
export function maximumStayNights(pricing: StayPricing | null) {
  const maximum = pricing?.maximumStay;
  return Number.isSafeInteger(maximum) && (maximum as number) > 0 ? Math.min(maximum as number, MAX_SUPPORTED_STAY_NIGHTS) : MAX_SUPPORTED_STAY_NIGHTS;
}
