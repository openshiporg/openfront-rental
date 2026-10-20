import { zonedTodayIso } from '@/features/keystone/utils/stayBookingRules';

/** Today's calendar date (YYYY-MM-DD) at a property. An unset or invalid zone reads as UTC. */
export function propertyToday(timeZone?: string | null, now = new Date()) {
  return zonedTodayIso(timeZone, now);
}

export function shiftDay(dateIso: string, days: number) {
  const [year, month, day] = dateIso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Every IANA zone's date is within one day of UTC's. So a date up to UTC yesterday is on or
 * before every property's today, a date after UTC tomorrow is before none, and only UTC today
 * and tomorrow need each property's own zone.
 */
export function propertyTodayBoundary(now = new Date()) {
  const utcToday = zonedTodayIso('UTC', now);
  return { reachedEverywhere: shiftDay(utcToday, -1), zoneDependent: [utcToday, shiftDay(utcToday, 1)] };
}
