'use client';

import { ArrowUpRight, CalendarDays, ChevronDown, MapPin, Minus, Plus, Users } from 'lucide-react';
import { useId, useState } from 'react';
import { countParam, single, type SearchParams } from '../lib/navigation';
import '../styles/search.css';

const counters = [
  { name: 'adults', label: 'Adults', min: 1, max: 16, fallback: 2 },
  { name: 'children', label: 'Children', min: 0, max: 12, fallback: 0 },
  { name: 'infants', label: 'Infants', min: 0, max: 5, fallback: 0 },
  { name: 'pets', label: 'Pets', min: 0, max: 4, fallback: 0 },
  { name: 'bedrooms', label: 'Minimum bedrooms', min: 0, max: 16, fallback: 0 },
] as const;
type CounterName = typeof counters[number]['name'];

function dateLabel(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Add date';
  const [year, month, day] = value.split('-');
  return `${month}/${day}/${year}`;
}

export function SearchForm({ params = {}, compact = false }: { params?: SearchParams; compact?: boolean }) {
  // Reset editable criteria when navigation supplies a different search URL.
  return <SearchFields key={JSON.stringify(params)} params={params} compact={compact} />;
}

function SearchFields({ params, compact }: { params: SearchParams; compact: boolean }) {
  const id = useId();
  const [counts, setCounts] = useState(() => Object.fromEntries(counters.map(({ name, min, max, fallback }) =>
    [name, Math.max(min, countParam(params[name], fallback, max))],
  )) as Record<CounterName, number>);
  const [expanded, setExpanded] = useState(!compact);
  const [checkIn, setCheckIn] = useState(single(params.checkIn));
  const [checkOut, setCheckOut] = useState(single(params.checkOut));
  const [error, setError] = useState('');
  const guests = `${counts.adults} ${counts.adults === 1 ? 'adult' : 'adults'}${counts.children ? `, ${counts.children} ${counts.children === 1 ? 'child' : 'children'}` : ''}`;

  return <form action="/search" method="get" className="stay-search-form" role="search" aria-label="Find a home" onSubmit={event => {
    if (Boolean(checkIn) !== Boolean(checkOut) || (checkIn && checkOut <= checkIn)) {
      event.preventDefault();
      setError('Choose both dates, with check out after check in. Or clear both to browse.');
      event.currentTarget.querySelector<HTMLInputElement>(`[name="${checkIn ? 'checkOut' : 'checkIn'}"]`)?.focus();
    }
  }}>
    <header className="stay-search-heading"><h2>Find your next stay</h2><p>A place to slow down.</p></header>
    <div className="stay-search-surface">
      <div className="stay-search-bar">
        <label className="stay-search-destination"><span>Where</span><span className="stay-search-value"><MapPin size={20} aria-hidden="true" /><input name="destination" aria-label="Destination" maxLength={200} defaultValue={single(params.destination)} placeholder="City, region, or home" /></span></label>
        <div className="stay-search-dates">
          {([{ name: 'checkIn', label: 'Check in', value: checkIn, set: setCheckIn }, { name: 'checkOut', label: 'Check out', value: checkOut, set: setCheckOut }] as const).map(field => <label className="stay-search-date" key={field.name}>
            <span>{field.label}</span><span className="stay-search-value" aria-hidden="true"><CalendarDays size={18} /><span>{dateLabel(field.value)}</span></span>
            <input type="date" name={field.name} aria-label={field.label} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : `${id}-note`} value={field.value} onChange={event => { field.set(event.target.value); setError(''); }} />
          </label>)}
        </div>
        <button className="stay-search-guests" type="button" aria-expanded={expanded} aria-controls={`${id}-filters`} onClick={() => setExpanded(!expanded)}>
          <Users size={21} aria-hidden="true" /><span><span className="stay-search-field-label">Guests & filters</span><strong>{guests}</strong><small>Children, pets, bedrooms</small></span><ChevronDown size={18} aria-hidden="true" />
        </button>
        <button className="stay-button stay-search-submit" type="submit">Find a stay <ArrowUpRight size={20} aria-hidden="true" /></button>
      </div>
      <div id={`${id}-filters`} className="stay-search-filters" hidden={!expanded}>
        <h3>Guests & filters</h3>
        <div className="stay-search-filter-grid">
          {counters.map(({ name, label, min, max }) => <div key={name} className="stay-search-counter">
            <label htmlFor={`${id}-${name}`}>{label}</label>
            <div className="stay-search-stepper">
              <button type="button" aria-label={`Decrease ${label.toLowerCase()}`} disabled={counts[name] <= min} onClick={() => setCounts({ ...counts, [name]: counts[name] - 1 })}><Minus size={16} aria-hidden="true" /></button>
              <input id={`${id}-${name}`} name={name} type="number" min={min} max={max} required value={counts[name]} onChange={event => setCounts({ ...counts, [name]: Math.max(min, Math.min(max, Number(event.target.value) || min)) })} />
              <button type="button" aria-label={`Increase ${label.toLowerCase()}`} disabled={counts[name] >= max} onClick={() => setCounts({ ...counts, [name]: counts[name] + 1 })}><Plus size={16} aria-hidden="true" /></button>
            </div>
          </div>)}
          <label className="stay-search-booking">Booking preference<select name="instantBook" defaultValue={single(params.instantBook)}><option value="">Any booking type</option><option value="true">Instant confirmation</option><option value="false">Host approval</option></select></label>
        </div>
        <p className="stay-search-hint">Set bedrooms to 0 for any size. Pet rules are checked when you request a quote.</p>
        <button type="button" className="stay-search-close" onClick={() => { setExpanded(false); document.getElementById(`${id}-filters`)?.previousElementSibling?.querySelector<HTMLButtonElement>('.stay-search-guests')?.focus(); }}>Done with filters</button>
      </div>
    </div>
    {single(params.collection) ? <input type="hidden" name="collection" value={single(params.collection)} /> : null}
    {error ? <p id={`${id}-error`} className="stay-form-error" role="alert">{error}</p> : null}
    <div className="stay-search-foot"><p id={`${id}-note`}>Dates optional. Add both for a price preview.</p>{checkIn || checkOut ? <button type="button" onClick={() => { setCheckIn(''); setCheckOut(''); setError(''); }}>Clear dates</button> : null}</div>
  </form>;
}
