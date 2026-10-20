import { safeMinorUnitDigits } from './currency-units';

export type OperationalTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

/**
 * The one locale every platform page formats with. Platform copy is English; the locale saved in
 * Store Settings is a storefront setting and doesn't apply here.
 */
export const PLATFORM_LOCALE = 'en-US';

export function humanize(value?: string | null) {
  if (!value) return 'Not set';
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

/** Sentence-case label for enum values: "turnover_cleaning" → "Turnover cleaning". */
export function sentence(value?: string | null) {
  if (!value) return 'Not set';
  const text = value.replaceAll('_', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Integer minor units at the currency's ISO 4217 scale; whole amounts drop trailing zeros. */
export function formatMoney(cents?: number | null, currency: string | null = 'USD') {
  const amount = cents ?? 0;
  const code = (currency || '').trim().toUpperCase();
  const digits = safeMinorUnitDigits(code);
  if (digits == null) return `${amount.toLocaleString(PLATFORM_LOCALE)} minor units${code ? ` (${code})` : ''}`;
  const scale = 10 ** digits;
  return new Intl.NumberFormat(PLATFORM_LOCALE, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: amount % scale ? digits : 0,
    maximumFractionDigits: digits,
  }).format(amount / scale);
}

export interface CurrencyTotal {
  currencyCode: string;
  amountCents: number;
}

/** Adds amounts per currency. Different currencies are never combined or converted. */
export function sumByCurrency<T>(rows: T[], amount: (row: T) => number, currency: (row: T) => string | null | undefined): CurrencyTotal[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const value = amount(row);
    if (!value) continue;
    const code = (currency(row) || '').trim().toUpperCase();
    totals.set(code, (totals.get(code) || 0) + value);
  }
  return [...totals].map(([currencyCode, amountCents]) => ({ currencyCode, amountCents })).sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));
}

export function formatCurrencyTotals(totals: CurrencyTotal[], empty = '—') {
  return totals.length ? totals.map((total) => formatMoney(total.amountCents, total.currencyCode)).join(' · ') : empty;
}

const timestampOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' };

/**
 * An instant shown in an explicit zone with its label ("Oct 20, 3:15 PM PDT"): the property's
 * zone for stay records, UTC when no zone applies. Never the server's own zone.
 */
export function formatTimestamp(value?: string | null, timeZone?: string | null) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  try {
    return new Intl.DateTimeFormat(PLATFORM_LOCALE, { ...timestampOptions, timeZone: timeZone || 'UTC' }).format(date);
  } catch {
    return new Intl.DateTimeFormat(PLATFORM_LOCALE, { ...timestampOptions, timeZone: 'UTC' }).format(date);
  }
}

/** Date-only values (YYYY-MM-DD) are rendered at UTC noon so they never shift a day. */
export function formatDay(value?: string | null, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) {
  if (!value) return '—';
  const iso = value.length === 10 ? `${value}T12:00:00.000Z` : value;
  return new Intl.DateTimeFormat(PLATFORM_LOCALE, { ...options, timeZone: 'UTC' }).format(new Date(iso));
}

export function formatDayRange(start?: string | null, end?: string | null) {
  if (!start || !end) return `${formatDay(start)} – ${formatDay(end)}`;
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  const withYear: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${formatDay(start, sameYear ? undefined : withYear)} – ${formatDay(end, withYear)}`;
}

export function nightsBetween(start?: string | null, end?: string | null) {
  if (!start || !end) return 0;
  const nights = Math.round((Date.parse(`${end.slice(0, 10)}T00:00:00Z`) - Date.parse(`${start.slice(0, 10)}T00:00:00Z`)) / 86_400_000);
  return Number.isFinite(nights) && nights > 0 ? nights : 0;
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function initials(name?: string | null) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function isPast(value?: string | null, now = Date.now()) {
  return Boolean(value && new Date(value).getTime() < now);
}

export function operationalTone(status?: string | null): OperationalTone {
  if (!status) return 'neutral';
  if (['active', 'available', 'published', 'signed', 'succeeded', 'paid', 'completed', 'delivered', 'received', 'verified'].includes(status)) return 'success';
  if (['failed', 'rejected', 'cancelled', 'removed', 'reversed', 'voided', 'archived'].includes(status)) return 'danger';
  if (['pending', 'processing', 'draft', 'onboarding', 'snoozed', 'submitted', 'partially_refunded', 'partially_succeeded'].includes(status)) return 'warning';
  if (['confirmed', 'sent', 'queued', 'in_progress', 'scheduled'].includes(status)) return 'info';
  return 'neutral';
}

export interface ReadinessInput {
  status?: string | null;
  registrationNumber?: string | null;
  timezone?: string | null;
  addressReady?: boolean;
  unitCount?: number;
  publishedListingCount?: number;
}

export function propertyReadiness(input: ReadinessInput) {
  const checks = [
    { id: 'address', label: 'Guest location', ready: Boolean(input.addressReady) },
    { id: 'unit', label: 'Rentable unit', ready: (input.unitCount || 0) > 0 },
    { id: 'timezone', label: 'Stay timezone', ready: Boolean(input.timezone) },
    { id: 'registration', label: 'Registration evidence', ready: Boolean(input.registrationNumber) },
    { id: 'listing', label: 'Published listing', ready: (input.publishedListingCount || 0) > 0 },
  ];
  const readyCount = checks.filter((check) => check.ready).length;
  return { checks, readyCount, percent: Math.round((readyCount / checks.length) * 100) };
}

export function isPaymentException(status?: string | null) {
  return ['failed', 'cancelled', 'partially_refunded', 'refunded'].includes(status || '');
}

export function isMessageException(message?: { direction?: string | null; status?: string | null }) {
  return message?.status === 'failed' || (message?.direction === 'inbound' && message?.status === 'received');
}
