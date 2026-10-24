'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { addDaysIso, addMonths, longDate, monthIndexOf, monthOrdinal, monthTitle, monthWeeks } from '../lib/dates';
import { formatMoney, formatMoneyCompact } from '../lib/format';
import type { NightAvailability } from '../lib/night-availability';
import type { NightlyRate } from '../lib/stay-estimate';
import { useStorefrontLocale } from './StorefrontLocale';

export type RangeMode = 'checkIn' | 'checkOut' | 'done';
export type StayRange = { checkIn: string; checkOut: string; mode: RangeMode };

/** Nights a guest cannot stay (blocked, or not yet known) and the last check-in the host accepts. */
export type StayAvailabilityConstraints = { availability?: NightAvailability | null; latestCheckIn?: string | null };

const UNAVAILABLE_NIGHT = 'That night is unavailable. Choose another check-in.';
const UNAVAILABLE_RANGE = 'Those dates include unavailable nights. Choose a shorter stay or other dates.';

/** True when any night from check-in up to (not including) checkout is unavailable or unknown. */
export function rangeHasBlockedNight(checkIn: string, checkOut: string, availability?: NightAvailability | null) {
  return availability ? availability.rangeUnavailable(checkIn, checkOut) : false;
}

function canCheckIn(day: string, constraints: StayAvailabilityConstraints) {
  const availability = constraints.availability;
  return !(availability && (availability.blocked(day) || availability.unknown(day))) && !(constraints.latestCheckIn && day > constraints.latestCheckIn);
}

/**
 * Pure selection step shared by every stay calendar. `rule` returns a reason a
 * checkout is not allowed (minimum/maximum stay), or null. A checkout may fall
 * on the first unavailable night, because that night is not stayed.
 */
export function selectStayDay(range: StayRange, day: string, rule?: (checkIn: string, checkOut: string) => string | null, constraints: StayAvailabilityConstraints = {}): { range: StayRange; message: string | null } {
  const { checkIn, checkOut, mode } = range;
  const startAt = (keepCheckout: boolean) => {
    if (!canCheckIn(day, constraints)) return { range, message: UNAVAILABLE_NIGHT };
    const keep = keepCheckout && checkOut && checkOut > day && !rule?.(day, checkOut) && !rangeHasBlockedNight(day, checkOut, constraints.availability);
    return { range: { checkIn: day, checkOut: keep ? checkOut : '', mode: keep ? 'done' : 'checkOut' } as StayRange, message: null };
  };
  if (mode === 'checkIn' || !checkIn) return startAt(true);
  if (mode === 'done' || day <= checkIn) return startAt(false);
  if (rangeHasBlockedNight(checkIn, day, constraints.availability)) {
    return canCheckIn(day, constraints) ? startAt(false) : { range, message: UNAVAILABLE_RANGE };
  }
  const reason = rule?.(checkIn, day) || null;
  if (reason) return { range, message: reason };
  return { range: { checkIn, checkOut: day, mode: 'done' }, message: null };
}

type Props = {
  range: StayRange;
  onSelect: (day: string) => void;
  earliest: string;
  months?: 1 | 2;
  monthsAhead?: number;
  rates?: Record<string, NightlyRate>;
  currencyCode?: string;
  rule?: (checkIn: string, checkOut: string) => string | null;
  onPreview?: (checkOut: string | null) => void;
  label: string;
  /** Oil-style hint line under the grid: what to do next and the rule that applies. */
  hint?: ReactNode;
  footer?: ReactNode;
  /** Unavailable and not-yet-known nights, shown disabled before a range is chosen. */
  availability?: NightAvailability | null;
  /** Last check-in date the booking window accepts; later days stay available as checkouts. */
  latestCheckIn?: string | null;
  /** Called with the visible days [first, end) so rates and availability can follow the view. */
  onVisibleChange?: (first: string, end: string) => void;
};

export function StayCalendar({ range, onSelect, earliest, months = 1, monthsAhead = 12, rates, currencyCode = 'USD', rule, onPreview, label, hint, footer, availability, latestCheckIn, onVisibleChange }: Props) {
  const locale = useStorefrontLocale();
  const first = monthIndexOf(earliest);
  const minOrdinal = monthOrdinal(first.year, first.monthIndex);
  const maxOrdinal = minOrdinal + monthsAhead - 1;
  const anchor = monthIndexOf(range.checkIn && range.checkIn >= earliest ? range.checkIn : earliest);
  const [visible, setVisible] = useState(() => clampMonth(anchor, minOrdinal, maxOrdinal - months + 1));
  const [hover, setHover] = useState<string | null>(null);
  const [focusDay, setFocusDay] = useState<string | null>(null);
  const [focusNote, setFocusNote] = useState<string | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef(false);

  // Follow an externally changed check-in (e.g. "edit check-in") into view.
  useEffect(() => {
    if (!range.checkIn) return;
    const target = monthIndexOf(range.checkIn);
    const ordinal = monthOrdinal(target.year, target.monthIndex);
    const start = monthOrdinal(visible.year, visible.monthIndex);
    if (ordinal < start || ordinal > start + months - 1) setVisible(clampMonth(target, minOrdinal, maxOrdinal - months + 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.checkIn]);

  useEffect(() => {
    if (!pendingFocus.current || !focusDay) return;
    pendingFocus.current = false;
    grid.current?.querySelector<HTMLButtonElement>(`[data-day="${focusDay}"]`)?.focus({ preventScroll: true });
  }, [focusDay, visible]);

  const visibleMonths = useMemo(() => Array.from({ length: months }, (_, index) => addMonths(visible.year, visible.monthIndex, index)), [visible, months]);
  const firstVisibleDay = monthStart(visible);
  // Exclusive bound: the first day after the last visible month.
  const lastVisibleDay = monthStart(addMonths(visible.year, visible.monthIndex, months));
  useEffect(() => { onVisibleChange?.(firstVisibleDay, lastVisibleDay); }, [firstVisibleDay, lastVisibleDay, onVisibleChange]);

  const choosingCheckout = range.mode === 'checkOut' && Boolean(range.checkIn);
  const previewEnd = choosingCheckout && hover && hover > range.checkIn ? hover : null;
  // While choosing checkout, the stay can run up to (and check out on) the first unavailable
  // or not-yet-known night: an interval lookup, however far away it is.
  const checkoutLimit = useMemo(() => (choosingCheckout && availability ? availability.firstUnavailableFrom(range.checkIn) : null), [choosingCheckout, availability, range.checkIn]);
  const unknownDay = (day: string) => Boolean(availability?.unknown(day));
  const unavailableDay = (day: string) => {
    if (day < earliest) return false;
    const noCheckIn = Boolean(availability && (availability.blocked(day) || availability.unknown(day))) || Boolean(latestCheckIn && day > latestCheckIn);
    if (choosingCheckout && day > range.checkIn) return checkoutLimit ? day > checkoutLimit && noCheckIn : false;
    return noCheckIn;
  };
  // The single Tab stop must be a day that can actually be chosen.
  const selectable = (day: string) => day >= earliest && !unavailableDay(day);
  const firstSelectableVisible = (() => {
    for (let day = firstVisibleDay; day < lastVisibleDay; day = addDaysIso(day, 1)) if (selectable(day)) return day;
    return null;
  })();
  // With no selectable day in view there is no day tab stop at all (never a disabled one):
  // the month arrows stay reachable and the grid says why.
  const rovingDay = focusDay && focusDay >= firstVisibleDay && focusDay < lastVisibleDay && selectable(focusDay)
    ? focusDay
    : [choosingCheckout ? addDaysIso(range.checkIn, 1) : range.checkIn, earliest]
      .find(day => day && day >= firstVisibleDay && day < lastVisibleDay && selectable(day)) || firstSelectableVisible;

  const seasonal = useMemo(() => {
    const names = new Set<string>();
    if (rates) for (const [day, rate] of Object.entries(rates)) {
      if (day >= firstVisibleDay && day < lastVisibleDay && rate.source !== 'Base rate') names.add(rate.source);
    }
    return [...names];
  }, [rates, firstVisibleDay, lastVisibleDay]);

  function move(delta: number) {
    const next = clampMonth(addMonths(visible.year, visible.monthIndex, delta), minOrdinal, maxOrdinal - months + 1);
    setVisible(next);
  }

  function onKey(event: KeyboardEvent<HTMLButtonElement>, day: string) {
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let target: string | null = null;
    if (event.key in steps) target = addDaysIso(day, steps[event.key]);
    else if (event.key === 'PageUp' || event.key === 'PageDown') target = shiftMonth(day, event.key === 'PageUp' ? -1 : 1);
    else if (event.key === 'Home' || event.key === 'End') {
      const weekdayIndex = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
      target = addDaysIso(day, event.key === 'Home' ? -weekdayIndex : 6 - weekdayIndex);
    }
    if (!target) return;
    event.preventDefault();
    if (target < earliest) target = earliest;
    // Skip disabled nights in the direction of travel, a whole blocked range per step, so focus
    // never lands on one. The scan is bounded by steps and by the calendar's horizon.
    const direction: 1 | -1 = target >= day ? 1 : -1;
    const horizonEnd = monthStart(addMonths(Math.floor(maxOrdinal / 12), maxOrdinal % 12, 1));
    let found: string | null = target;
    for (let steps = 0; found && !selectable(found); steps += 1) {
      const next: string = availability?.blocked(found) ? availability.skipBlock(found, direction) : addDaysIso(found, direction);
      found = steps >= 400 || next < earliest || next >= horizonEnd ? null : next;
    }
    if (!found) {
      // Nothing selectable that way: focus stays where it is, and the reason is announced.
      setFocusNote(direction > 0 ? 'No more dates can be chosen later in the calendar.' : 'No earlier dates can be chosen.');
      return;
    }
    target = found;
    setFocusNote(null);
    const { year, monthIndex } = monthIndexOf(target);
    const ordinal = monthOrdinal(year, monthIndex);
    if (ordinal > maxOrdinal) return;
    const start = monthOrdinal(visible.year, visible.monthIndex);
    if (ordinal < start || ordinal > start + months - 1) setVisible(clampMonth({ year, monthIndex }, minOrdinal, maxOrdinal - months + 1));
    pendingFocus.current = true;
    setFocusDay(target);
    preview(target);
  }

  function preview(day: string | null) {
    if (!choosingCheckout) return;
    const next = day && day > range.checkIn && !rule?.(range.checkIn, day) && !(checkoutLimit && day > checkoutLimit) ? day : null;
    setHover(next);
    onPreview?.(next);
  }

  const showsPast = firstVisibleDay < earliest || Boolean(availability?.hasBlockedIn(firstVisibleDay, lastVisibleDay));
  const showsUnknown = Boolean(availability && (availability.unknown(firstVisibleDay) || availability.unknown(addDaysIso(lastVisibleDay, -1))));
  const atStart = monthOrdinal(visible.year, visible.monthIndex) <= minOrdinal;
  const atEnd = monthOrdinal(visible.year, visible.monthIndex) + months - 1 >= maxOrdinal;

  return (
    <div className={`stay-cal ${months === 2 ? 'stay-cal-double' : ''}`} onMouseLeave={() => preview(null)}>
      <div className="stay-cal-nav">
        <button type="button" className="stay-cal-arrow" onClick={() => move(-1)} disabled={atStart} aria-label="Previous month"><ChevronLeft size={18} aria-hidden="true" /></button>
        <button type="button" className="stay-cal-arrow" onClick={() => move(1)} disabled={atEnd} aria-label="Next month"><ChevronRight size={18} aria-hidden="true" /></button>
      </div>
      <div className="stay-cal-months" ref={grid}>
        {visibleMonths.map(({ year, monthIndex }) => {
          const titleId = `stay-cal-${year}-${monthIndex}`;
          return (
            <div key={titleId} className="stay-cal-month">
              <p className="stay-cal-title" id={titleId} aria-live="polite">{monthTitle(locale, year, monthIndex)}</p>
              <div role="grid" aria-labelledby={titleId} aria-label={`${label}, ${monthTitle(locale, year, monthIndex)}`} className="stay-cal-grid">
                <div role="row" className="stay-cal-weekdays">
                  {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => <span role="columnheader" key={day} aria-hidden="true">{day}</span>)}
                </div>
                {monthWeeks(year, monthIndex).map((week, weekIndex) => (
                  <div role="row" key={weekIndex} className="stay-cal-week">
                    {week.map((day, dayIndex) => {
                      if (!day) return <span role="gridcell" key={dayIndex} className="stay-cal-blank" />;
                      const past = day < earliest;
                      const unavailable = unavailableDay(day);
                      const unknown = !past && unavailable && unknownDay(day);
                      const beyondLimit = Boolean(choosingCheckout && checkoutLimit && day > checkoutLimit && !unavailable);
                      const isStart = day === range.checkIn;
                      const isEnd = day === range.checkOut || day === previewEnd;
                      const end = range.checkOut || previewEnd;
                      const inRange = Boolean(range.checkIn && end && day > range.checkIn && day < end);
                      const isPreview = Boolean(previewEnd && !range.checkOut && day > range.checkIn && day <= previewEnd);
                      const ruled = choosingCheckout && day > range.checkIn && !past && !unavailable && !beyondLimit ? rule?.(range.checkIn, day) || null : null;
                      const rate = rates?.[day];
                      const priceLabel = isEnd ? 'Out' : unknown ? '…' : unavailable ? '—' : rate ? formatMoneyCompact(locale, rate.amountCents, currencyCode) : '';
                      const classes = ['stay-cal-day', isStart && 'is-start', isEnd && 'is-end', inRange && 'is-range', isPreview && 'is-preview', ruled && 'is-ruled', unavailable && 'is-unavailable', rate && !unavailable && rate.source !== 'Base rate' && 'is-seasonal'].filter(Boolean).join(' ');
                      const description = [
                        longDate(locale, day),
                        past ? 'unavailable, in the past' : null,
                        unknown ? 'availability not loaded yet' : unavailable ? 'unavailable' : null,
                        beyondLimit ? 'after unavailable nights, starts a new check-in' : null,
                        isStart ? 'check-in' : null,
                        day === range.checkOut ? 'checkout' : null,
                        ruled ? ruled : null,
                        rate && !isEnd && !unavailable ? `${formatMoney(locale, rate.amountCents, currencyCode)} per night${rate.source !== 'Base rate' ? `, ${rate.source}` : ''}` : null,
                      ].filter(Boolean).join(', ');
                      return (
                        <span role="gridcell" key={day} aria-selected={isStart || day === range.checkOut || inRange}>
                          <button
                            type="button"
                            data-day={day}
                            className={classes}
                            disabled={past || unavailable}
                            aria-disabled={Boolean(ruled) || undefined}
                            aria-label={description}
                            tabIndex={day === rovingDay ? 0 : -1}
                            onClick={() => { setFocusDay(day); onSelect(day); }}
                            onKeyDown={event => onKey(event, day)}
                            onMouseEnter={() => preview(day)}
                            onFocus={() => { setFocusDay(day); preview(day); }}
                          >
                            <span className="stay-cal-num">{Number(day.slice(8))}</span>
                            <span className="stay-cal-price">{past ? '—' : priceLabel}</span>
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {!rovingDay ? <p className="stay-form-note" role="status">No dates can be chosen in {months === 2 ? 'these months' : 'this month'}. Use the month arrows to look further.</p> : null}
      {focusNote ? <p className="stay-visually-hidden" role="status" aria-live="polite">{focusNote}</p> : null}
      {hint || seasonal.length || footer || showsPast || showsUnknown ? (
        <div className="stay-cal-foot">
          {hint ? <span className="stay-cal-hint"><span className="stay-cal-swatch" aria-hidden="true" />{hint}</span> : null}
          {seasonal.length ? <span className="stay-cal-legend"><span className="stay-cal-legend-dot" aria-hidden="true" />{seasonal.join(' · ')} rates</span> : null}
          <span className="stay-cal-foot-end">
            {showsPast ? <span className="stay-cal-na" aria-hidden="true">— unavailable</span> : null}
            {showsUnknown ? <span className="stay-cal-na" aria-hidden="true">… loading availability</span> : null}
            {footer}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function monthStart({ year, monthIndex }: { year: number; monthIndex: number }) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
}

function clampMonth(month: { year: number; monthIndex: number }, min: number, max: number) {
  const ordinal = Math.min(Math.max(monthOrdinal(month.year, month.monthIndex), min), Math.max(min, max));
  return { year: Math.floor(ordinal / 12), monthIndex: ordinal % 12 };
}

function shiftMonth(day: string, delta: number) {
  const { year, monthIndex } = monthIndexOf(day);
  const next = addMonths(year, monthIndex, delta);
  const lastDay = new Date(Date.UTC(next.year, next.monthIndex + 1, 0)).getUTCDate();
  const dayOfMonth = Math.min(Number(day.slice(8)), lastDay);
  return `${next.year}-${String(next.monthIndex + 1).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
}
