'use client';

import { addDays, format, isBefore, isSameDay, startOfToday } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import * as React from 'react';
import type { DateRange } from 'react-day-picker';

import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

function suggestedStay(): DateRange {
  const checkIn = startOfToday();
  return { from: checkIn, to: addDays(checkIn, 2) };
}

function nextRange(current: DateRange | undefined, selectedDay: Date): DateRange {
  if (!current?.from || current.to) return { from: selectedDay, to: undefined };
  if (isSameDay(current.from, selectedDay)) return { from: selectedDay, to: addDays(selectedDay, 1) };
  return isBefore(selectedDay, current.from)
    ? { from: selectedDay, to: current.from }
    : { from: current.from, to: selectedDay };
}

function dateValue(date: Date | undefined) {
  return date ? format(date, 'yyyy-MM-dd') : '';
}

function shortDate(date: Date | undefined) {
  if (!date) return 'Select date';
  return isSameDay(date, startOfToday()) ? 'Today' : format(date, 'MMM d');
}

/**
 * A deliberately prefilled, client-side date-range field for the public home search.
 * The values are only search criteria; availability and pricing are still verified
 * by the server after the visitor submits the search.
 */
export function StayDateRangePicker() {
  const [range, setRange] = React.useState<DateRange>(suggestedStay);
  const checkIn = range.from;
  const checkOut = range.to;

  return (
    <div className="stay-date-field">
      <input type="hidden" name="checkIn" value={dateValue(checkIn)} />
      <input type="hidden" name="checkOut" value={dateValue(checkOut)} />
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="stay-date-trigger"
            aria-label={`Stay dates: check in ${shortDate(checkIn)}, check out ${shortDate(checkOut)}`}
          >
            <span className="stay-date-part"><span>Check in</span><strong>{shortDate(checkIn)}</strong></span>
            <span className="stay-date-part"><span>Check out</span><strong>{shortDate(checkOut)}</strong></span>
            <CalendarDays aria-hidden="true" size={18} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="stay-date-popover" align="start" sideOffset={10}>
          <div className="stay-date-popover-head">
            <p>Choose your stay</p>
            <span>Suggested dates can be changed before searching.</span>
          </div>
          <Calendar
            mode="range"
            selected={range}
            defaultMonth={checkIn}
            onDayClick={(day) => setRange((current) => nextRange(current, day))}
            disabled={{ before: startOfToday() }}
            numberOfMonths={1}
          />
          <div className="stay-date-popover-foot">
            <span>{checkIn && checkOut ? `${shortDate(checkIn)} — ${shortDate(checkOut)}` : 'Select a checkout date'}</span>
            <button type="button" onClick={() => setRange(suggestedStay())}>Use suggested dates</button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
