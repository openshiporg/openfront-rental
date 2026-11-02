'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { Stepper } from './GuestPicker';
import { StayImage } from './StayImage';
import { useStorefrontLocale } from './StorefrontLocale';
import { checkStayDatesAction, loadStayAvailabilityAction, type StayDateCheck } from '../lib/data/stay-availability';
import type { PublicStay, StayAvailability } from '../lib/data/stays';
import { addDaysIso, globalEarliestCheckInIso, nightsBetween, rangeLabel, shortDate } from '../lib/dates';
import { formatMoney } from '../lib/format';

type Evidence = { calendar: StayAvailability | null; price: StayDateCheck; next: string | null };
const localDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const asLocal = (day: string) => new Date(`${day}T12:00:00`);
function free(calendar: StayAvailability | null, day: string) {
  if (!calendar || day < calendar.from || day >= calendar.to) return null;
  return !calendar.unavailable.some(block => day >= block.start && day < block.end);
}

/** Presentation only: existing public calendar and canonical search pricing remain authoritative. */
export function HomeAvailability({ stays, initialDay }: { stays: PublicStay[]; initialDay: string }) {
  const locale = useStorefrontLocale();
  const [range, setRange] = useState<DateRange | undefined>({ from: asLocal(initialDay), to: asLocal(addDaysIso(initialDay, 3)) });
  const [guests, setGuests] = useState(2);
  const [phone, setPhone] = useState(false);
  const [evidence, setEvidence] = useState<Record<string, Evidence>>({});
  const [busy, setBusy] = useState(true);
  const from = range?.from ? localDay(range.from) : '';
  const to = range?.to ? localDay(range.to) : '';
  const complete = Boolean(from && to && to > from);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const update = () => setPhone(media.matches); update();
    media.addEventListener('change', update); return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    let cancelled = false; setEvidence({});
    if (!complete) { setBusy(false); return; }
    setBusy(true);
    const timer = setTimeout(async () => {
      const entries = await Promise.all(stays.map(async stay => {
        try {
          const input = { listingId: stay.id, title: stay.title, checkIn: from, checkOut: to, adults: guests, children: 0 };
          const [calendar, price] = await Promise.all([loadStayAvailabilityAction({ slug: stay.slug, from }), checkStayDatesAction(input)]);
          let next: string | null = null;
          // Only announce a next free date after the canonical party/rate/rule check accepts it.
          if (price.status === 'unavailable' && calendar) {
            const duration = nightsBetween(from, to);
            let attempts = 0;
            for (let day = addDaysIso(from, 1); day < calendar.to && day <= addDaysIso(from, 60); day = addDaysIso(day, 1)) {
              const end = addDaysIso(day, duration);
              if (end > calendar.to) break;
              if (!Array.from({ length: duration }, (_, i) => free(calendar, addDaysIso(day, i))).every(Boolean)) continue;
              if (++attempts > 3) break;
              const candidate = await checkStayDatesAction({ ...input, checkIn: day, checkOut: end });
              if (candidate.status === 'available') { next = day; break; }
            }
          }
          return [stay.id, { calendar, price, next }] as const;
        } catch { return [stay.id, { calendar: null, price: { status: 'error' } as StayDateCheck, next: null }] as const; }
      }));
      if (!cancelled) { setEvidence(Object.fromEntries(entries)); setBusy(false); }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [from, to, guests, complete, stays]);
  const days = Array.from({ length: 14 }, (_, index) => addDaysIso(from || initialDay, index));
  return <section className="stay-shell stay-home-availability" aria-labelledby="home-date-title">
    <div className="stay-home-date-head">
      <div><p className="stay-overline">Make room for a getaway</p><h2 id="home-date-title">Choose your dates.<br />We’ll show what’s free.</h2><p>Real availability, with the full stay price before you book.</p></div>
      <div className="stay-home-date-picker">
        <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={phone ? 1 : 2} disabled={{ before: asLocal(globalEarliestCheckInIso()) }} defaultMonth={asLocal(initialDay)} min={1} />
        <Stepper label="Guests" hint="Adults" value={guests} min={1} max={16} onChange={setGuests} />
      </div>
    </div>
    <header className="stay-home-availability-head"><h3>{complete ? `Available ${rangeLabel(locale, from, to)}` : 'Choose check-in and checkout'}</h3><span>14-day availability · checkout day is not charged</span></header>
    <div aria-busy={busy}>
      {stays.map(stay => {
        const data = evidence[stay.id]; const price = data?.price;
        const quote = price && (price.status === 'available' || price.status === 'not_bookable') ? price.quote : null;
        const image = stay.media?.[0]?.url || stay.thumbnail;
        return <article key={stay.id} className="stay-home-availability-row">
          <Link href={`/stays/${encodeURIComponent(stay.slug)}${complete ? `?checkIn=${from}&checkOut=${to}&adults=${guests}` : ''}`} className="stay-home-row-info">
            {image ? <StayImage src={image} alt={stay.media?.[0]?.altText || stay.title} width={200} height={130} sizes="200px" /> : null}
            <div><h3>{stay.title}</h3><p>{stay.property?.location?.publicLocationLabel}</p><p>{stay.subtitle}</p><p>{stay.accommodation?.maximumGuests || stay.accommodation?.maxGuests || 'See home for'} guests · {stay.accommodation?.bedroomCount ?? 'See home for'} bedrooms</p></div>
          </Link>
          <div className="stay-home-strip" role="list" aria-label={`${stay.title}, nightly availability`}>
            {days.map(day => { const available = free(data?.calendar || null, day); const selected = complete && day >= from && day < to; return <div role="listitem" key={day} title={`${shortDate(locale, day)}: ${available === null ? 'not loaded' : available ? 'free' : 'booked'}`} className={`stay-home-day ${selected ? 'is-selected' : ''} ${available === false ? 'is-booked' : available === null ? 'is-unknown' : 'is-free'}`}><span>{Number(day.slice(8))}</span><i aria-hidden="true" /><span className="stay-visually-hidden">{available === null ? 'Not loaded' : available ? 'Free' : 'Booked'}</span></div>; })}
          </div>
          <div className="stay-home-row-price" aria-live="polite">
            {!complete ? <p>Choose your dates</p> : !data || busy ? <p>Checking dates…</p> : quote ? <><strong>{formatMoney(locale, quote.totalAmountCents, quote.currencyCode)} total</strong><p>{formatMoney(locale, Math.round(quote.lodgingSubtotalCents / quote.numberOfNights), quote.currencyCode)} / night</p><p>Includes quoted fees & taxes</p>{price?.status === 'not_bookable' ? <p>{price.reason}</p> : null}</> : price?.status === 'unavailable' ? <><strong>{data.calendar && days.some(day => day < to && free(data.calendar, day) === false) ? 'Booked these dates' : 'Not available for this stay'}</strong><p>{data.next ? `Next free ${shortDate(locale, data.next)}` : 'Try other dates or guest counts'}</p></> : <p>Couldn’t check dates. Try again.</p>}
          </div>
          <Link href={`/stays/${encodeURIComponent(stay.slug)}${complete ? `?checkIn=${from}&checkOut=${to}&adults=${guests}` : ''}`} className="stay-icon-button" aria-label={`View ${stay.title}`}><ChevronRight size={18} /></Link>
        </article>;
      })}
    </div>
    <p className="stay-form-note">Totals include every cleaning fee, service fee and lodging tax configured for the home. Any refundable security deposit is shown separately at checkout. Availability is checked again before booking.</p>
  </section>;
}
