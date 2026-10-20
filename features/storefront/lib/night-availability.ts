import { addDaysIso } from './dates';

/** A [start, end) range of nights (YYYY-MM-DD; end exclusive). */
export type NightRange = { start: string; end: string };

/** Availability evidence: the windows it covers and the blocked ranges inside them. */
export type AvailabilityEvidence = { covered: NightRange[]; blocked: NightRange[] };

/**
 * Interval checks over availability evidence. Nights outside the covered windows are
 * unknown, never assumed free; blocked ranges are compared as intervals, so long blocks
 * and multi-year windows stay exact without expanding night by night.
 */
export type NightAvailability = {
  blocked(night: string): boolean;
  unknown(night: string): boolean;
  /** First night on or after `night` that can't be stayed (blocked or unknown), or null. */
  firstUnavailableFrom(night: string): string | null;
  /** True when any night in [checkIn, checkOut) is blocked or unknown. */
  rangeUnavailable(checkIn: string, checkOut: string): boolean;
  /** From a blocked night, the nearest night outside its block in that direction. */
  skipBlock(night: string, direction: 1 | -1): string;
  /** True when any blocked night falls in [start, end). */
  hasBlockedIn(start: string, end: string): boolean;
  /** First night on or after `night` without availability evidence (`night` itself if unknown). */
  firstUnknownFrom(night: string): string;
};

export function mergeNightRanges(ranges: NightRange[]): NightRange[] {
  const sorted = ranges.filter(range => range && range.end > range.start).map(range => ({ ...range })).sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  const merged: NightRange[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      if (range.end > last.end) last.end = range.end;
    } else merged.push(range);
  }
  return merged;
}

/** The range containing `night`, by binary search over merged ranges. */
function containing(ranges: NightRange[], night: string) {
  let low = 0;
  let high = ranges.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const range = ranges[middle];
    if (night < range.start) high = middle - 1;
    else if (night >= range.end) low = middle + 1;
    else return range;
  }
  return null;
}

/** First range starting on or after `night`. */
function nextStarting(ranges: NightRange[], night: string) {
  let low = 0;
  let high = ranges.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (ranges[middle].start < night) low = middle + 1; else high = middle;
  }
  return ranges[low] || null;
}

export function nightAvailability(evidence: AvailabilityEvidence): NightAvailability {
  const covered = mergeNightRanges(evidence.covered);
  const blocked = mergeNightRanges(evidence.blocked);
  const isBlocked = (night: string) => Boolean(containing(blocked, night));
  const isUnknown = (night: string) => !containing(covered, night);
  const firstUnavailableFrom = (night: string) => {
    const window = containing(covered, night);
    if (!window) return night;
    const block = containing(blocked, night);
    if (block) return night;
    const next = nextStarting(blocked, night);
    // The stay can run to the next block or to the end of the known window, whichever is first.
    return next && next.start < window.end ? next.start : window.end;
  };
  return {
    blocked: isBlocked,
    unknown: isUnknown,
    firstUnavailableFrom,
    rangeUnavailable: (checkIn, checkOut) => {
      const first = firstUnavailableFrom(checkIn);
      return first !== null && first < checkOut;
    },
    skipBlock: (night, direction) => {
      const block = containing(blocked, night);
      if (!block) return addDaysIso(night, direction);
      return direction > 0 ? block.end : addDaysIso(block.start, -1);
    },
    firstUnknownFrom: (night) => containing(covered, night)?.end ?? night,
    hasBlockedIn: (start, end) => {
      if (containing(blocked, start)) return true;
      const next = nextStarting(blocked, start);
      return Boolean(next && next.start < end);
    },
  };
}

/** Adds one page of evidence (its covered window and its blocked ranges). */
export function addAvailabilityPage(evidence: AvailabilityEvidence, page: { from: string; to: string; unavailable: NightRange[] }): AvailabilityEvidence {
  return {
    covered: mergeNightRanges([...evidence.covered, { start: page.from, end: page.to }]),
    blocked: mergeNightRanges([...evidence.blocked, ...page.unavailable]),
  };
}
