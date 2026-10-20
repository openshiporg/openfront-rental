/**
 * Booking rules shared by search, quote, conversion and the storefront calendar.
 * Pure functions only: this module is imported by client components too.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DEFAULT_CHECK_IN_TIME = '15:00';

export type StayRatePlanLike = {
  id: string | null;
  isBaseRate?: boolean;
  name?: string | null;
  currencyCode?: string | null;
  baseNightlyRateCents?: number | null;
  minimumStay?: number | null;
  maximumStay?: number | null;
  advanceNoticeHours?: number | null;
  bookingWindowDays?: number | null;
  seasonalRates?: any[] | null;
  cancellationPolicy?: any;
  [key: string]: unknown;
};

/**
 * The rate plan a listing sells under. An active rate plan wins; otherwise a
 * published base nightly rate sells on its own with the listing's stay rules
 * and the host's standard (first-created) cancellation policy.
 */
export function effectiveStayRatePlan(listing: any): StayRatePlanLike | null {
  const plan = listing?.ratePlans?.[0];
  if (plan) return plan;
  const base = listing?.baseNightlyRateCents;
  if (!Number.isSafeInteger(base) || base <= 0) return null;
  return {
    id: null,
    isBaseRate: true,
    name: 'Standard rate',
    description: null,
    currencyCode: listing.currencyCode || 'USD',
    baseNightlyRateCents: base,
    minimumStay: listing.minimumStay ?? 1,
    maximumStay: listing.maximumStay ?? null,
    advanceNoticeHours: listing.advanceNoticeHours ?? null,
    bookingWindowDays: listing.bookingWindowDays ?? null,
    isDefault: true,
    seasonalRates: [],
    cancellationPolicy: listing.hostOrganization?.cancellationPolicies?.[0] || null,
  };
}

/** Rate plan values win; a plan without its own value inherits the listing's. */
export function stayArrivalRules(plan: any, listing: any) {
  const notice = plan?.advanceNoticeHours ?? listing?.advanceNoticeHours ?? 0;
  const window = plan?.bookingWindowDays ?? listing?.bookingWindowDays ?? null;
  return {
    advanceNoticeHours: Number.isSafeInteger(notice) && notice > 0 ? notice : 0,
    bookingWindowDays: Number.isSafeInteger(window) && window > 0 ? window : null,
  };
}

function validTimeZone(timeZone: unknown) {
  if (typeof timeZone !== 'string' || !timeZone) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(0);
    return timeZone;
  } catch {
    return 'UTC';
  }
}

function zonedParts(timestamp: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(timestamp));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') % 24, minute: get('minute'), second: get('second') };
}

function offsetMs(timestamp: number, timeZone: string) {
  const local = zonedParts(timestamp, timeZone);
  const asUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
  return asUtc - Math.floor(timestamp / 1000) * 1000;
}

function parseTime(value: unknown) {
  const match = typeof value === 'string' ? /^(\d{1,2}):(\d{2})/.exec(value.trim()) : null;
  const hour = match ? Number(match[1]) : NaN;
  const minute = match ? Number(match[2]) : NaN;
  if (!match || hour > 23 || minute > 59) return parseTime(DEFAULT_CHECK_IN_TIME);
  return { hour, minute };
}

/** UTC instant of a wall-clock date and time at the property. */
export function zonedLocalTimestamp(dateIso: string, time: unknown, timeZone: unknown) {
  const zone = validTimeZone(timeZone);
  const [year, month, day] = dateIso.split('-').map(Number);
  const { hour, minute } = parseTime(time);
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  const first = naive - offsetMs(naive, zone);
  return naive - offsetMs(first, zone);
}

/** Today's calendar date at the property. */
export function zonedTodayIso(timeZone: unknown, now = new Date()) {
  const local = zonedParts(now.getTime(), validTimeZone(timeZone));
  return `${local.year}-${String(local.month).padStart(2, '0')}-${String(local.day).padStart(2, '0')}`;
}

function addDays(dateIso: string, days: number) {
  const [year, month, day] = dateIso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * DAY_MS).toISOString().slice(0, 10);
}

function noticeLabel(hours: number) {
  if (hours % 24 === 0 && hours >= 48) return `${hours / 24} days’`;
  return `${hours} ${hours === 1 ? 'hour’s' : 'hours’'}`;
}

export type StayArrivalContext = {
  advanceNoticeHours: number;
  bookingWindowDays: number | null;
  timeZone?: string | null;
  checkInFrom?: string | null;
};

/** Guest-facing reason a check-in date breaks the host's notice or booking window, or null. */
export function stayArrivalProblem(checkIn: string, rules: StayArrivalContext, now = new Date()): string | null {
  if (!DATE_ONLY.test(checkIn)) return 'Choose a valid check-in date.';
  // "Past" means past at the property, not in UTC or in the visitor's timezone.
  if (checkIn < zonedTodayIso(rules.timeZone, now)) return 'Check-in cannot be in the past.';
  if (rules.advanceNoticeHours > 0) {
    const arrival = zonedLocalTimestamp(checkIn, rules.checkInFrom, rules.timeZone);
    if (arrival - now.getTime() < rules.advanceNoticeHours * HOUR_MS) {
      return `This home needs at least ${noticeLabel(rules.advanceNoticeHours)} notice before check-in. Choose a later arrival date.`;
    }
  }
  if (rules.bookingWindowDays) {
    const latest = addDays(zonedTodayIso(rules.timeZone, now), rules.bookingWindowDays);
    if (checkIn > latest) {
      return `This home takes bookings up to ${rules.bookingWindowDays} ${rules.bookingWindowDays === 1 ? 'day' : 'days'} ahead. Choose an earlier arrival date.`;
    }
  }
  return null;
}

/** First and last check-in dates the notice and booking window allow (property calendar dates). */
export function stayArrivalBounds(rules: StayArrivalContext, now = new Date()) {
  const today = zonedTodayIso(rules.timeZone, now);
  let earliest = today;
  const scanDays = Math.ceil(rules.advanceNoticeHours / 24) + 2;
  for (let offset = 0; offset <= scanDays; offset += 1) {
    const candidate = addDays(today, offset);
    earliest = candidate;
    if (rules.advanceNoticeHours <= 0) break;
    const arrival = zonedLocalTimestamp(candidate, rules.checkInFrom, rules.timeZone);
    if (arrival - now.getTime() >= rules.advanceNoticeHours * HOUR_MS) break;
  }
  const latest = rules.bookingWindowDays ? addDays(today, rules.bookingWindowDays) : null;
  return { earliestCheckIn: earliest, latestCheckIn: latest };
}

/** Arrival rules for a listing record (raw or public projection) and its effective plan. */
export function listingArrivalContext(listing: any, plan = effectiveStayRatePlan(listing)): StayArrivalContext {
  return {
    ...stayArrivalRules(plan, listing),
    timeZone: listing?.property?.timezone || null,
    checkInFrom: listing?.property?.checkInFrom || null,
  };
}

export function assertStayArrivalAllowed(checkIn: string, rules: StayArrivalContext, now = new Date()) {
  const problem = stayArrivalProblem(checkIn, rules, now);
  if (problem) throw new Error(problem);
}

/** Calculator input for a listing priced by its effective plan. Keep identical to stay-estimate.ts. */
export function stayCalculationInput(listing: any, plan: StayRatePlanLike, stay: { checkIn: string; checkOut: string; guestCount: number; pets?: number }) {
  return {
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    baseNightlyRateCents: plan.baseNightlyRateCents ?? listing.baseNightlyRateCents ?? 0,
    currencyCode: plan.currencyCode || listing.currencyCode || 'USD',
    baseMinimumStay: plan.minimumStay ?? listing.minimumStay ?? 1,
    maximumStay: plan.maximumStay ?? listing.maximumStay,
    guestCount: stay.guestCount,
    pets: stay.pets ?? 0,
    maxGuests: listing.accommodationUnit?.maxGuests ?? listing.accommodation?.maxGuests,
    securityDepositCents: listing.securityDepositCents ?? 0,
    seasonalRates: plan.seasonalRates || [],
    fees: (listing.feeDefinitions || []).map((fee: any) => ({
      name: fee.name,
      feeType: fee.feeType,
      kind: fee.calculation,
      amountCents: fee.amountCents,
      percentageBasisPoints: fee.percentageBasisPoints,
      taxable: fee.taxable,
      required: fee.required,
    })),
    taxes: (listing.taxRules || []).map((tax: any) => ({
      name: tax.name,
      rateBasisPoints: tax.rateBasisPoints,
      inclusive: tax.isInclusive === true,
    })),
  };
}
