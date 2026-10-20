'use client';

import { ArrowRight, CalendarDays, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { PLATFORM_LOCALE } from '../lib/operations';

/*
 * Stay-shaped date range for operator forms. Interaction follows the Oil UI "Stay" concept
 * (ui.oiloil.org/en/works/stay): a check-in → check-out summary, a Monday-first calendar, and
 * a live night count, where the end date is the morning the range opens again. Built on the
 * repo's own react-day-picker Calendar + Radix Popover; no Oil UI code is bundled.
 *
 * Values post as plain YYYY-MM-DD fields under the caller's names, so server actions and GET
 * forms read them exactly as they read native date inputs. The hidden fields only carry those
 * values: a missing or too-long range is reported on the visible trigger, which takes focus.
 */

type Range = { start: string; end: string };

const DAY_MS = 86_400_000;

function isIsoDate(value?: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function toDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function nights(range: Range) {
  if (!range.start || !range.end) return 0;
  return Math.round((Date.parse(`${range.end}T00:00:00Z`) - Date.parse(`${range.start}T00:00:00Z`)) / DAY_MS);
}

const display = new Intl.DateTimeFormat(PLATFORM_LOCALE, { weekday: 'short', month: 'short', day: 'numeric' });
const displayYear = new Intl.DateTimeFormat(PLATFORM_LOCALE, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

function label(iso: string, withYear: boolean) {
  return isIsoDate(iso) ? (withYear ? displayYear : display).format(toDate(iso)) : '';
}

/** Check-in first, then check-out; a click on or before check-in, or after a finished range, starts over. */
function nextRange(range: Range, day: string): Range {
  if (!range.start || range.end || day <= range.start) return { start: day, end: '' };
  return { start: range.start, end: day };
}

export function StayRangeField({
  startName,
  endName,
  defaultStart = '',
  defaultEnd = '',
  startLabel = 'Check-in',
  endLabel = 'Check-out',
  unit = ['night', 'nights'],
  required,
  minDate,
  maxNights,
  hint,
  showSummary = true,
  id,
  className,
}: {
  startName: string;
  endName: string;
  defaultStart?: string;
  defaultEnd?: string;
  startLabel?: string;
  endLabel?: string;
  /** Singular/plural for the span between the two dates. */
  unit?: [string, string];
  required?: boolean;
  /** Earliest selectable day (YYYY-MM-DD). */
  minDate?: string;
  maxNights?: number;
  hint?: string;
  /** Show the night count under the field once both dates are chosen. */
  showSummary?: boolean;
  id?: string;
  className?: string;
}) {
  // Unusable defaults (bad URL input) start empty instead of breaking the picker.
  const [range, setRange] = useState<Range>(() => {
    const start = isIsoDate(defaultStart) ? defaultStart : '';
    return { start, end: start && isIsoDate(defaultEnd) && defaultEnd > start ? defaultEnd : '' };
  });
  const [open, setOpen] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const endRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const count = nights(range);
  const withYear = Boolean(range.start && range.end && range.start.slice(0, 4) !== range.end.slice(0, 4)) || Boolean(range.start && range.start.slice(0, 4) !== String(new Date().getFullYear()));
  const tooLong = Boolean(maxNights && count > maxNights);
  const status = !range.start
    ? `Choose the ${startLabel.toLowerCase()} date`
    : !range.end
      ? `Now choose the ${endLabel.toLowerCase()} date`
      : tooLong
        ? `Keep it to ${maxNights} ${unit[1]} or fewer`
        : `${count} ${count === 1 ? unit[0] : unit[1]}`;
  const error = tooLong
    ? `Keep it to ${maxNights} ${unit[1]} or fewer.`
    : !range.start
      ? `Choose the ${startLabel.toLowerCase()} and ${endLabel.toLowerCase()} dates.`
      : `Choose the ${endLabel.toLowerCase()} date.`;

  useEffect(() => {
    endRef.current?.setCustomValidity(tooLong ? error : '');
  }, [tooLong, error]);

  /** The carriers fail native validation; the visible trigger reports it instead of the hidden field. */
  function reportInvalid(event: FormEvent<HTMLInputElement>) {
    event.preventDefault();
    setInvalid(true);
    triggerRef.current?.focus();
  }

  function pick(day: Date | undefined) {
    if (!day) return;
    const next = nextRange(range, toIso(day));
    setRange(next);
    if (next.start && next.end) setInvalid(false);
    if (next.start && next.end && !(maxNights && nights(next) > maxNights)) setOpen(false);
  }

  return <div className={cn('grid min-w-0 gap-1.5', className)}>
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative min-w-0">
        <PopoverTrigger asChild>
          <button
            id={id}
            ref={triggerRef}
            type="button"
            aria-label={`${startLabel} and ${endLabel}: ${range.start ? label(range.start, true) : 'not set'} to ${range.end ? label(range.end, true) : 'not set'}${required ? ', required' : ''}`}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? errorId : undefined}
            className={cn(
              'grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch overflow-hidden rounded-md border border-input bg-background text-left shadow-xs outline-none transition-[color,box-shadow] hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
              invalid && 'border-rose-500 ring-[3px] ring-rose-500/20 dark:border-rose-400',
              open && 'border-ring ring-[3px] ring-ring/50',
            )}
          >
            <span className={cn('min-w-0 px-3 py-1.5', open && !range.start && 'bg-muted/50')}>
              <span className="block text-[11px] font-medium text-muted-foreground">{startLabel}</span>
              <span className={cn('block truncate text-sm', range.start ? 'font-medium' : 'text-muted-foreground/70')}>{range.start ? label(range.start, withYear) : 'Add date'}</span>
            </span>
            <span aria-hidden="true" className="grid place-items-center border-x bg-muted/30 px-2 text-muted-foreground"><ArrowRight className="size-3.5" /></span>
            <span className={cn('min-w-0 px-3 py-1.5', open && range.start && !range.end && 'bg-muted/50')}>
              <span className="block text-[11px] font-medium text-muted-foreground">{endLabel}</span>
              <span className={cn('block truncate text-sm', range.end ? 'font-medium' : 'text-muted-foreground/70')}>{range.end ? label(range.end, withYear) : 'Add date'}</span>
            </span>
          </button>
        </PopoverTrigger>
        {/* Value carriers only: their invalid events are redirected to the trigger above. */}
        <input tabIndex={-1} aria-hidden="true" name={startName} value={range.start} required={required} onChange={() => undefined} onInvalid={reportInvalid} className="pointer-events-none absolute bottom-0 left-4 h-px w-px opacity-0" />
        <input ref={endRef} tabIndex={-1} aria-hidden="true" name={endName} value={range.end} required={required} onChange={() => undefined} onInvalid={reportInvalid} className="pointer-events-none absolute bottom-0 right-4 h-px w-px opacity-0" />
      </div>
      <PopoverContent align="start" collisionPadding={16} className="max-h-[var(--radix-popover-content-available-height)] w-auto max-w-[calc(100vw-2rem)] overflow-y-auto p-0">
        <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
          <p className="flex items-center gap-1.5 text-xs font-medium"><CalendarDays aria-hidden="true" className="size-3.5 text-muted-foreground" />{range.start ? label(range.start, withYear) : startLabel}<ArrowRight aria-hidden="true" className="size-3 text-muted-foreground" />{range.end ? label(range.end, withYear) : endLabel}</p>
          {range.start ? <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setRange({ start: '', end: '' })}><X aria-hidden="true" />Clear</Button> : null}
        </div>
        <Calendar
          mode="range"
          weekStartsOn={1}
          numberOfMonths={2}
          defaultMonth={range.start ? toDate(range.start) : isIsoDate(minDate) ? toDate(minDate) : undefined}
          selected={range.start ? { from: toDate(range.start), to: range.end ? toDate(range.end) : undefined } : undefined}
          onSelect={(_selected: DateRange | undefined, day: Date) => pick(day)}
          disabled={isIsoDate(minDate) ? { before: toDate(minDate) } : undefined}
          className="p-3"
        />
        <p role="status" aria-live="polite" className={cn('border-t px-3 py-2 text-xs', tooLong ? 'text-rose-700 dark:text-rose-400' : range.end ? 'font-medium text-foreground' : 'text-muted-foreground')}>{status}</p>
      </PopoverContent>
    </Popover>
    {invalid ? <p id={errorId} role="alert" className="text-xs leading-5 text-rose-700 dark:text-rose-400">{error}</p> : null}
    {hint || (showSummary && range.start && range.end) ? <p className="text-xs leading-5 text-muted-foreground">{showSummary && range.start && range.end ? <><span className="font-medium text-foreground tabular-nums">{count} {count === 1 ? unit[0] : unit[1]}</span>{hint ? ` · ${hint}` : ''}</> : hint}</p> : null}
  </div>;
}
