'use client';

import { CalendarDays, MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import { globalEarliestCheckInIso, isIsoDate, rangeLabel, shortDate, weekday } from '../lib/dates';
import { countParam, single, type SearchParams } from '../lib/navigation';
import { GuestPicker, Stepper, StayPopover, type GuestParty } from './GuestPicker';
import { StayCalendar, selectStayDay, type StayRange } from './StayCalendar';
import { StayDateSwitch } from './StayDateSwitch';
import { useStorefrontLocale } from './StorefrontLocale';

export function SearchForm({ params = {}, variant = 'page' }: { params?: SearchParams; variant?: 'page' | 'hero' }) {
  // Reset editable criteria when navigation supplies a different search URL.
  return <SearchFields key={JSON.stringify(params)} params={params} variant={variant} />;
}

function initialRange(params: SearchParams): StayRange {
  const checkIn = single(params.checkIn);
  const checkOut = single(params.checkOut);
  const validIn = isIsoDate(checkIn);
  const validOut = validIn && isIsoDate(checkOut) && checkOut > checkIn;
  return { checkIn: validIn ? checkIn : '', checkOut: validOut ? checkOut : '', mode: validOut ? 'done' : validIn ? 'checkOut' : 'checkIn' };
}

function SearchFields({ params, variant }: { params: SearchParams; variant: 'page' | 'hero' }) {
  const locale = useStorefrontLocale();
  const id = useId();
  // No visitor-local or UTC floor: a home whose local date is still earlier stays searchable.
  const [earliest, setEarliest] = useState(globalEarliestCheckInIso);
  useEffect(() => setEarliest(globalEarliestCheckInIso()), []);
  const [range, setRange] = useState(() => initialRange(params));
  const [party, setParty] = useState<GuestParty>(() => ({
    adults: Math.max(countParam(params.adults, 2), 1),
    children: countParam(params.children, 0, 12),
    infants: countParam(params.infants, 0, 5),
    pets: countParam(params.pets, 0, 4),
  }));
  const [bedrooms, setBedrooms] = useState(() => countParam(params.bedrooms));
  // Only the values search understands count as a filter; anything else is ignored.
  const [instantBook, setInstantBook] = useState(() => ['true', 'false'].includes(single(params.instantBook)) ? single(params.instantBook) : '');
  const [datesOpen, setDatesOpen] = useState(false);
  const [error, setError] = useState('');
  const filterCount = (bedrooms ? 1 : 0) + (instantBook ? 1 : 0);

  function choose(day: string) {
    const next = selectStayDay(range, day);
    setRange(next.range);
    setError('');
    if (next.range.mode === 'done') setDatesOpen(false);
  }

  function editField(field: 'checkIn' | 'checkOut') {
    setError('');
    if (field === 'checkIn') setRange(current => ({ ...current, mode: 'checkIn' }));
    else if (range.checkIn) setRange(current => ({ ...current, checkOut: '', mode: 'checkOut' }));
  }

  const datesLabel = range.checkIn && range.checkOut
    ? rangeLabel(locale, range.checkIn, range.checkOut)
    : range.checkIn ? `${weekday(locale, range.checkIn)}, ${shortDate(locale, range.checkIn)} → ?` : 'Any dates';

  return (
    <form
      action="/search"
      method="get"
      className={`stay-search stay-search-${variant}`}
      role="search"
      aria-label="Find a home"
      onSubmit={event => {
        if (range.checkIn && !range.checkOut) {
          event.preventDefault();
          setError('Choose a checkout date, or clear the dates to browse every home.');
          setDatesOpen(true);
        }
      }}
    >
      <div className="stay-search-console">
        <label className="stay-field stay-search-where">
          <span className="stay-field-label">Where</span>
          <span className="stay-field-input"><MapPin size={16} aria-hidden="true" /><input name="destination" maxLength={200} defaultValue={single(params.destination)} placeholder="City, region, or home" autoComplete="off" /></span>
        </label>
        <StayPopover
          label="Choose stay dates"
          className="stay-dates-popover"
          open={datesOpen}
          onOpenChange={setDatesOpen}
          trigger={(
            <button type="button" className={`stay-field stay-field-button stay-search-when ${error ? 'is-invalid' : ''}`} aria-describedby={error ? `${id}-error` : undefined}>
              <span className="stay-field-label">When</span>
              <span className="stay-field-value"><CalendarDays size={16} aria-hidden="true" />{datesLabel}</span>
            </button>
          )}
        >
          <div className="stay-dates-popover-head">
            <StayDateSwitch range={range} onEdit={editField} label="Search dates" />
          </div>
          <StayCalendar label="Search dates" range={range} onSelect={choose} earliest={earliest} months={2} hint={range.mode === 'checkOut' && range.checkIn ? 'Now choose checkout' : 'Dates are optional · add both for total prices'} footer={(
            <button type="button" className="stay-link-button" onClick={() => { setRange({ checkIn: '', checkOut: '', mode: 'checkIn' }); setError(''); }} disabled={!range.checkIn}><X size={12} aria-hidden="true" />Clear</button>
          )} />
        </StayPopover>
        <GuestPicker value={party} onChange={setParty} label="Who" className="stay-search-who" />
        <StayPopover
          label="More filters"
          align="end"
          className="stay-filter-popover"
          trigger={(
            <button type="button" className="stay-search-filters-button" aria-label={`More filters${filterCount ? `, ${filterCount} applied` : ''}`}>
              <SlidersHorizontal size={17} aria-hidden="true" />
              <span className="stay-search-filters-text">Filters</span>
              {filterCount ? <span className="stay-count-dot">{filterCount}</span> : null}
            </button>
          )}
        >
          <Stepper label="Bedrooms" hint={bedrooms ? `At least ${bedrooms}` : 'Any size'} value={bedrooms} min={0} max={16} onChange={setBedrooms} />
          <div className="stay-segmented-group" role="group" aria-labelledby={`${id}-booking`}>
            <p id={`${id}-booking`} className="stay-segmented-label">Booking</p>
            <div className="stay-segmented">
              {[['', 'Any'], ['true', 'Instant'], ['false', 'Host approval']].map(([value, text]) => (
                <button type="button" key={value || 'any'} aria-pressed={instantBook === value} onClick={() => setInstantBook(value)}>{text}</button>
              ))}
            </div>
          </div>
          <p className="stay-popover-note">Pet and house rules are confirmed for each home in its quote.</p>
        </StayPopover>
        <button className="stay-button stay-search-submit" type="submit"><Search size={17} aria-hidden="true" /><span>Search</span></button>
      </div>
      <input type="hidden" name="checkIn" value={range.checkOut ? range.checkIn : ''} />
      <input type="hidden" name="checkOut" value={range.checkOut} />
      <input type="hidden" name="adults" value={party.adults} />
      {party.children ? <input type="hidden" name="children" value={party.children} /> : null}
      {party.infants ? <input type="hidden" name="infants" value={party.infants} /> : null}
      {party.pets ? <input type="hidden" name="pets" value={party.pets} /> : null}
      {bedrooms ? <input type="hidden" name="bedrooms" value={bedrooms} /> : null}
      {instantBook ? <input type="hidden" name="instantBook" value={instantBook} /> : null}
      {single(params.collection) ? <input type="hidden" name="collection" value={single(params.collection)} /> : null}
      {error ? <p id={`${id}-error`} className="stay-search-error" role="alert">{error}</p> : null}
    </form>
  );
}
