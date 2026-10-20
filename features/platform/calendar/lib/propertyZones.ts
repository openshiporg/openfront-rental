import { zonedLocalTimestamp } from '@/features/keystone/utils/stayBookingRules';

// Legacy IANA names Intl still accepts but doesn't list.
const LEGACY_ZONES = [
  'UTC', 'Etc/UTC', 'GMT', 'Etc/GMT', 'US/Eastern', 'US/Central', 'US/Mountain', 'US/Pacific', 'US/Alaska', 'US/Hawaii', 'US/Arizona',
  'Asia/Calcutta', 'Asia/Saigon', 'Asia/Katmandu', 'Asia/Rangoon', 'Europe/Kiev', 'America/Buenos_Aires', 'America/Indianapolis',
];

function isZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(0);
    return true;
  } catch {
    return false;
  }
}

let known: string[] | null = null;

export function knownTimeZones() {
  if (known) return known;
  let listed: string[] = [];
  try {
    listed = Intl.supportedValuesOf('timeZone');
  } catch {
    listed = [];
  }
  known = [...new Set([...listed, ...LEGACY_ZONES.filter(isZone)])];
  return known;
}

export type ZoneFilter = { in: string[] } | { notIn: string[] };

/**
 * OR-branches that match each property by its own clock: zones are grouped by `keyFor`
 * (a local date, a local month window) and each group becomes one branch. The group UTC
 * falls in matches by exclusion, so unrecognised zone names behave as UTC, as booking rules do.
 */
export function propertyZoneBranches(keyFor: (timeZone: string) => string, branch: (key: string, timezone: ZoneFilter) => Record<string, unknown>) {
  const groups = new Map<string, string[]>();
  for (const zone of knownTimeZones()) {
    const key = keyFor(zone);
    const group = groups.get(key);
    if (group) group.push(zone);
    else groups.set(key, [zone]);
  }
  const utcKey = keyFor('UTC');
  const others = [...groups.entries()].filter(([key]) => key !== utcKey);
  return [
    ...others.map(([key, zones]) => branch(key, { in: zones })),
    branch(utcKey, { notIn: others.flatMap(([, zones]) => zones) }),
  ];
}

const monthWindows = new Map<string, Array<Record<string, unknown>>>();

/** dueAt bounds of a local calendar range [start, end) at every property; the result is cached per range. */
export function propertyLocalRangeBranches(start: string, end: string, field = 'dueAt') {
  const cacheKey = `${field}|${start}|${end}`;
  const cached = monthWindows.get(cacheKey);
  if (cached) return cached;
  const branches = propertyZoneBranches(
    (zone) => `${zonedLocalTimestamp(start, '00:00', zone)}|${zonedLocalTimestamp(end, '00:00', zone)}`,
    (key, timezone) => {
      const [from, to] = key.split('|').map(Number);
      return { [field]: { gte: new Date(from).toISOString(), lt: new Date(to).toISOString() }, property: { timezone } };
    },
  );
  if (monthWindows.size > 24) monthWindows.clear();
  monthWindows.set(cacheKey, branches);
  return branches;
}
