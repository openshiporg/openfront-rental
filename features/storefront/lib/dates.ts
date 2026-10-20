/**
 * Date-only helpers for stay calendars. Stay dates are calendar days
 * (YYYY-MM-DD), never instants, so every calculation and label uses UTC to
 * avoid a visitor's timezone shifting a night onto a neighbouring day.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
export const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_ONLY.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isoFromParts(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

export function isoTimestamp(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

export function addDaysIso(iso: string, days: number) {
  return new Date(isoTimestamp(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

export function nightsBetween(checkIn: string, checkOut: string) {
  return Math.round((isoTimestamp(checkOut) - isoTimestamp(checkIn)) / DAY_MS);
}

export function utcTodayIso(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/**
 * The earliest arrival any home could still accept: today's date at UTC-12, the last place
 * on Earth where a day begins. A visitor's own clock never narrows this; each home's local
 * date and notice rules are applied by the server (and the home's own calendar).
 */
export function globalEarliestCheckInIso(now = new Date()) {
  return new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const formatOptions = {
  short: { month: 'short', day: 'numeric', timeZone: 'UTC' },
  weekday: { weekday: 'short', timeZone: 'UTC' },
  long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' },
  month: { month: 'long', year: 'numeric', timeZone: 'UTC' },
  monthShort: { month: 'short', timeZone: 'UTC' },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

// Formatters in the given locale; date-only values stay in UTC so no day shifts.
const formatterCache = new Map<string, Intl.DateTimeFormat>();
function formatter(locale: string, key: keyof typeof formatOptions) {
  const cacheKey = `${locale}|${key}`;
  let cached = formatterCache.get(cacheKey);
  if (!cached) {
    cached = new Intl.DateTimeFormat(locale, formatOptions[key]);
    formatterCache.set(cacheKey, cached);
  }
  return cached;
}

function asDate(iso: string) {
  return new Date(isoTimestamp(iso));
}

/** "Oct 16" */
export function shortDate(locale: string, iso: string) {
  return formatter(locale, 'short').format(asDate(iso));
}

/** "Fri" */
export function weekday(locale: string, iso: string) {
  return formatter(locale, 'weekday').format(asDate(iso));
}

/** "Friday, October 16, 2026" */
export function longDate(locale: string, iso: string) {
  return formatter(locale, 'long').format(asDate(iso));
}

/** "October 2026" for a month offset from a YYYY-MM-DD anchor. */
export function monthTitle(locale: string, year: number, monthIndex: number) {
  return formatter(locale, 'month').format(new Date(Date.UTC(year, monthIndex, 1)));
}

/** "Oct 16 – 19" or "Oct 30 – Nov 2" */
export function rangeLabel(locale: string, checkIn: string, checkOut: string) {
  const sameMonth = checkIn.slice(0, 7) === checkOut.slice(0, 7);
  return sameMonth
    ? `${shortDate(locale, checkIn)} – ${Number(checkOut.slice(8, 10))}`
    : `${shortDate(locale, checkIn)} – ${shortDate(locale, checkOut)}`;
}

export function monthIndexOf(iso: string) {
  return { year: Number(iso.slice(0, 4)), monthIndex: Number(iso.slice(5, 7)) - 1 };
}

/** Monday-first weeks for a month, padded with nulls. */
export function monthWeeks(year: number, monthIndex: number) {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array.from({ length: offset }, () => null);
  for (let day = 1; day <= count; day += 1) cells.push(isoFromParts(year, monthIndex, day));
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
  return weeks;
}

export function addMonths(year: number, monthIndex: number, delta: number) {
  const date = new Date(Date.UTC(year, monthIndex + delta, 1));
  return { year: date.getUTCFullYear(), monthIndex: date.getUTCMonth() };
}

export function monthOrdinal(year: number, monthIndex: number) {
  return year * 12 + monthIndex;
}
