'use client';

import { AlertCircle, ArrowRight, Check, LoaderCircle, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { checkStayDatesAction, loadStayAvailabilityAction, type StayDateCheck } from '../lib/data/stay-availability';
import { quoteStayAction } from '../lib/data/stay-actions';
import type { StayAvailability } from '../lib/data/stays';
import { addDaysIso, isIsoDate, longDate, monthIndexOf, monthOrdinal, nightsBetween, rangeLabel, shortDate } from '../lib/dates';
import { formatMoney, formatMoneyParts } from '../lib/format';
import { addAvailabilityPage, nightAvailability, type AvailabilityEvidence } from '../lib/night-availability';
import { estimateStay, maximumStayNights, nightlyRates, stayDatesRule, type NightlyRate, type StayPricing } from '../lib/stay-estimate';
import { GuestPicker, type GuestParty } from './GuestPicker';
import { StayCalendar, rangeHasBlockedNight, selectStayDay, type StayRange } from './StayCalendar';
import { StayDateSwitch } from './StayDateSwitch';
import { StayLedger, type LedgerQuote } from './StayLedger';
import { useStorefrontLocale } from './StorefrontLocale';

type PanelStay = {
  id: string;
  slug: string;
  title: string;
  instantBook: boolean;
  currencyCode: string;
  baseNightlyRateCents?: number;
  maxGuests?: number;
};

type DateCheckState = { key: string; result: StayDateCheck | { status: 'checking' } };

/**
 * Server-read booking limits: pages of availability evidence (with the effective plan's
 * arrival window, longest stay and last reachable night) and the notice/booking window.
 */
export type StayBookingLimits = {
  availability: StayAvailability[];
  earliestCheckIn: string | null;
  latestCheckIn: string | null;
  noticeHours: number;
  windowDays: number | null;
};

/** Longest stay scanned to find the first checkout the stay rules allow. */
const MINIMUM_SCAN_NIGHTS = 60;

/**
 * Stay booking card adapted from the Oil UI stay page: price headline and
 * guests, a joined check-in → checkout switcher, one inline priced month, and
 * a bill that stays on the page and fills in as dates are chosen. Prices are
 * previewed with the canonical calculator, the full range is checked with the
 * public search contract, and `quoteStay` stays the authority on continue.
 */
export function StayBookingPanel({ stay, pricing, serverToday, initial, context, quoteFailed, limits }: {
  stay: PanelStay;
  pricing: StayPricing | null;
  serverToday: string;
  initial: { checkIn: string; checkOut: string } & GuestParty;
  context: Record<string, string>;
  quoteFailed: boolean;
  limits?: StayBookingLimits;
}) {
  const locale = useStorefrontLocale();
  // The first arrival the property's own calendar and notice allow (its local date),
  // never the visitor's timezone or UTC.
  const ruleEarliest = limits?.earliestCheckIn || serverToday;
  const latestCheckIn = limits?.latestCheckIn ?? null;
  const earliest = ruleEarliest;
  // Headlines, calendar prices and the bill use the effective rate plan's price and currency.
  const currencyCode = pricing?.currencyCode || stay.currencyCode;
  const baseNightlyRateCents = pricing?.baseNightlyRateCents ?? stay.baseNightlyRateCents;
  // Availability is evidence for the pages read so far; nights beyond it are unknown (never
  // assumed free) until the calendar reads the next page as it moves.
  const [evidence, setEvidence] = useState<AvailabilityEvidence>(() => (limits?.availability || [])
    .reduce((current, page) => addAvailabilityPage(current, page), { covered: [], blocked: [] } as AvailabilityEvidence));
  const availability = useMemo(() => nightAvailability(evidence), [evidence]);
  const [availabilityFailed, setAvailabilityFailed] = useState(!limits?.availability?.length);
  const requested = useRef(new Set<string>());
  // One booking contract with the server: the effective plan's last arrival plus its longest
  // stay (365 nights when it sets none). Without a booking window, arrivals are offered two
  // years ahead, the server's stated bound.
  const bounds = limits?.availability?.find(page => page.bounds)?.bounds || null;
  const lastNight = bounds?.lastNight || addDaysIso(latestCheckIn || addDaysIso(earliest, 730), maximumStayNights(pricing));
  const calendarMonthsAhead = useMemo(() => {
    const from = monthIndexOf(earliest);
    const to = monthIndexOf(addDaysIso(lastNight, -1));
    return Math.max(monthOrdinal(to.year, to.monthIndex) - monthOrdinal(from.year, from.monthIndex) + 1, 1);
  }, [lastNight, earliest]);
  const constraints = useMemo(() => ({ availability, latestCheckIn }), [availability, latestCheckIn]);
  const [view, setView] = useState<{ first: string; end: string } | null>(null);
  const onVisibleChange = useCallback((first: string, end: string) => setView(current => current?.first === first && current.end === end ? current : { first, end }), []);

  // Read the next page of availability when the view reaches nights without evidence.
  useEffect(() => {
    if (!view) return;
    const start = view.first < earliest ? earliest : view.first;
    const end = view.end > lastNight ? lastNight : view.end;
    if (!(end > start)) return;
    const gap = availability.firstUnknownFrom(start);
    if (gap >= end || requested.current.has(gap)) return;
    requested.current.add(gap);
    loadStayAvailabilityAction({ slug: stay.slug, from: gap })
      .then(page => {
        if (page && page.to > page.from) setEvidence(current => addAvailabilityPage(current, page));
        else setAvailabilityFailed(true);
      })
      .catch(() => setAvailabilityFailed(true));
  }, [view, availability, earliest, lastNight, stay.slug]);

  const rule = useMemo(() => pricing ? (checkIn: string, checkOut: string) => stayDatesRule(pricing, checkIn, checkOut) : undefined, [pricing]);
  const [range, setRange] = useState<StayRange>(() => {
    const validIn = isIsoDate(initial.checkIn) && initial.checkIn >= ruleEarliest
      && !availability.blocked(initial.checkIn) && !availability.unknown(initial.checkIn) && !(latestCheckIn && initial.checkIn > latestCheckIn);
    const validOut = validIn && isIsoDate(initial.checkOut) && initial.checkOut > initial.checkIn
      && !rangeHasBlockedNight(initial.checkIn, initial.checkOut, availability);
    return { checkIn: validIn ? initial.checkIn : '', checkOut: validOut ? initial.checkOut : '', mode: validOut ? 'done' : validIn ? 'checkOut' : 'checkIn' };
  });
  const [party, setParty] = useState<GuestParty>(() => {
    const maxGuests = stay.maxGuests ?? 16;
    const adults = Math.min(Math.max(initial.adults, 1), maxGuests);
    return { adults, children: Math.min(initial.children, Math.max(maxGuests - adults, 0)), infants: initial.infants, pets: initial.pets };
  });
  const [previewEnd, setPreviewEnd] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [check, setCheck] = useState<DateCheckState | null>(null);
  const [panelVisible, setPanelVisible] = useState(true);
  const panel = useRef<HTMLDivElement>(null);
  const touched = useRef(false);

  // Nightly rates for the visible months only, wherever the calendar has moved to.
  const rates = useMemo<Record<string, NightlyRate>>(() => {
    if (!pricing || !view) return {};
    const first = view.first < earliest ? earliest : view.first;
    return view.end > first ? nightlyRates(pricing, first, nightsBetween(first, view.end)) : {};
  }, [pricing, view, earliest]);
  const guestCount = party.adults + party.children;
  const complete = Boolean(range.checkIn && range.checkOut);
  const partyProblem = pricing && guestCount > pricing.maxGuests
    ? `This home sleeps up to ${pricing.maxGuests} guests.`
    : pricing && party.pets > 0 && !pricing.petsAllowed ? 'This home does not allow pets.' : null;
  const billEnd = range.checkOut || (range.mode === 'checkOut' ? previewEnd : null);
  // The same calculator input as the saved quote: guests and pets.
  const estimate = pricing && range.checkIn && billEnd ? estimateStay(pricing, range.checkIn, billEnd, { guestCount: Math.min(guestCount, pricing.maxGuests), pets: party.pets }) : null;
  const dateProblem = complete && estimate && !estimate.ok ? estimate.message : null;
  const checkKey = complete ? `${range.checkIn}|${range.checkOut}|${party.adults}|${party.children}|${party.infants}|${party.pets}` : '';
  const current = check && check.key === checkKey ? check.result : null;
  const serverQuote = current?.status === 'available' ? current.quote as LedgerQuote : null;

  // The shortest stay the rules allow from the chosen check-in (seasonal minimums included).
  const minimumNights = useMemo(() => {
    if (!rule || !range.checkIn || range.checkOut) return null;
    for (let nights = 1; nights <= MINIMUM_SCAN_NIGHTS; nights += 1) {
      if (!rule(range.checkIn, addDaysIso(range.checkIn, nights))) return nights;
    }
    return null;
  }, [rule, range.checkIn, range.checkOut]);

  // Server-check availability and price once a full range is chosen.
  useEffect(() => {
    if (!complete || dateProblem || partyProblem || !pricing) return;
    const key = checkKey;
    setCheck({ key, result: { status: 'checking' } });
    const timer = setTimeout(async () => {
      let result: StayDateCheck;
      try {
        result = await checkStayDatesAction({ listingId: stay.id, title: stay.title, checkIn: range.checkIn, checkOut: range.checkOut, adults: party.adults, children: party.children, infants: party.infants, pets: party.pets });
      } catch {
        result = { status: 'error' };
      }
      setCheck(previous => previous?.key === key ? { key, result } : previous);
    }, 280);
    return () => clearTimeout(timer);
  }, [checkKey, complete, dateProblem, partyProblem, pricing, stay.id, stay.title, range.checkIn, range.checkOut, party.adults, party.children, party.infants, party.pets]);

  // Keep the address bar in step so a refresh or shared link keeps the plan.
  useEffect(() => {
    if (!touched.current) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('error');
    const entries: Record<string, string> = { checkIn: range.checkIn, checkOut: range.checkOut, adults: String(party.adults), children: String(party.children), infants: String(party.infants), pets: String(party.pets) };
    for (const [key, value] of Object.entries(entries)) {
      if (value && value !== '0') url.searchParams.set(key, value); else url.searchParams.delete(key);
    }
    window.history.replaceState(window.history.state, '', url);
  }, [range.checkIn, range.checkOut, party]);

  useEffect(() => {
    const node = panel.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setPanelVisible(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function choose(day: string) {
    touched.current = true;
    const next = selectStayDay(range, day, rule, constraints);
    setMessage(next.message);
    setRange(next.range);
    if (next.range.checkOut) setPreviewEnd(null);
  }

  function editField(field: 'checkIn' | 'checkOut') {
    setMessage(null);
    setPreviewEnd(null);
    if (field === 'checkIn') setRange(current => ({ ...current, mode: 'checkIn' }));
    else if (range.checkIn) setRange(current => ({ ...current, checkOut: '', mode: 'checkOut' }));
    if (!range.checkIn) return;
    const target = field === 'checkOut' ? addDaysIso(range.checkIn, 1) : range.checkIn;
    requestAnimationFrame(() => panel.current?.querySelector<HTMLButtonElement>(`[data-day="${target}"]`)?.focus({ preventScroll: true }));
  }

  function clearDates() {
    touched.current = true;
    setRange({ checkIn: '', checkOut: '', mode: 'checkIn' });
    setMessage(null);
    setPreviewEnd(null);
  }

  function showCard() {
    panel.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  const shown = serverQuote && !previewEnd ? serverQuote : estimate?.ok ? estimate.estimate : null;
  const shownNights: { date: string; amountCents: number }[] = shown?.nights ?? [];
  const previewing = Boolean(previewEnd && !range.checkOut);
  const provisional = !serverQuote || previewing;
  const nights = shown?.numberOfNights ?? 0;
  const average = shown && nights ? Math.round(shown.lodgingSubtotalCents / nights) : null;
  const unavailable = current?.status === 'unavailable';
  // Free, but not bookable online (no published terms, or new bookings paused): no "Available" promise.
  const notBookable = current?.status === 'not_bookable' ? current.reason : null;
  const cannotContinue = !complete || Boolean(dateProblem || partyProblem || unavailable || notBookable) || !pricing;
  const action = stay.instantBook ? 'Reserve' : 'Request to book';
  const checkInRate = range.checkIn ? rates[range.checkIn]?.amountCents : undefined;
  const headline = average !== null
    ? { cents: average, unit: '/ night avg' }
    : typeof checkInRate === 'number'
      ? { cents: checkInRate, unit: '/ night' }
      : typeof baseNightlyRateCents === 'number' ? { cents: baseNightlyRateCents, unit: '/ night' } : null;
  const headlineParts = headline ? formatMoneyParts(locale, headline.cents, currencyCode) : null;

  // Problems sit above the button (Oil's `.booking-error`); the outcome of the
  // availability check is written on the total itself.
  const noArrivalDates = Boolean(latestCheckIn && ruleEarliest > latestCheckIn);
  const problem = !pricing
    ? 'Online pricing isn’t available for this home yet. Message the host for a quote.'
    : noArrivalDates
      ? 'No arrival dates are open for booking right now. Message the host to ask about other dates.'
      : partyProblem || message || dateProblem || notBookable || (unavailable ? 'These dates aren’t available. Try another check-in or a shorter stay.' : null)
        || (availabilityFailed && !complete ? 'Some availability couldn’t be loaded, so those dates can’t be chosen yet. Refresh to try again.' : null);
  const checking = complete && !problem && (!current || current.status === 'checking');
  const totalNote = previewing
    ? 'Preview · before availability check'
    : !complete
      ? 'Fees & taxes included'
      : checking
        ? <><LoaderCircle className="stay-spin" size={12} aria-hidden="true" />Checking availability…</>
        : current?.status === 'available'
          ? <><Check size={12} aria-hidden="true" />Available · fees & taxes included</>
          : current?.status === 'not_bookable' ? 'Not bookable online · estimate only'
            : current?.status === 'error' ? 'Estimate · availability and price confirmed when you continue' : 'Fees & taxes included';

  const announcement = (() => {
    if (problem) return '';
    if (!range.checkIn) return 'Choose a check-in date.';
    if (!range.checkOut) return `Check-in ${shortDate(locale, range.checkIn)}. Now choose checkout.`;
    if (checking) return 'Checking these dates…';
    if (current?.status === 'available') return `Available ${rangeLabel(locale, range.checkIn, range.checkOut)}. Total ${formatMoney(locale, current.quote.totalAmountCents, currencyCode)}, confirmed in your quote.`;
    if (current?.status === 'not_bookable') return '';
    return 'We couldn’t pre-check these dates. Availability is confirmed when you continue.';
  })();

  const arrivalNote = limits?.noticeHours
    ? ` · ${limits.noticeHours % 24 === 0 && limits.noticeHours >= 48 ? `${limits.noticeHours / 24} days’` : `${limits.noticeHours} hours’`} notice`
    : '';
  const hint = !range.checkIn
    ? <>Choose check-in{arrivalNote}{limits?.windowDays ? ` · up to ${limits.windowDays} ${limits.windowDays === 1 ? 'day' : 'days'} ahead` : bounds ? ` · arrivals until ${longDate(locale, bounds.lastArrival)}` : ''} · prices are per night</>
    : !range.checkOut
      ? <>Choose checkout{minimumNights && minimumNights > 1 ? ` · ${minimumNights}-night minimum` : ''}{pricing?.maximumStay ? ` · up to ${pricing.maximumStay} nights` : ''}</>
      : <>{nightsBetween(range.checkIn, range.checkOut)} nights · prices are per night</>;

  const hidden = { listingId: stay.id, listingSlug: stay.slug, ...context, checkIn: range.checkIn, checkOut: range.checkOut, adults: String(party.adults), children: String(party.children), infants: String(party.infants), pets: String(party.pets) };

  return (
    <form id="stay-quote-form" action={quoteStayAction} className="stay-book-card" aria-labelledby="book-title">
      {Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      <div ref={panel} className="stay-book-inner">
        <h2 id="book-title" className="stay-visually-hidden">Dates and price</h2>
        <div className="stay-book-top">
          {headlineParts && headline ? (
            <p className="stay-book-rate">
              <span className="stay-book-currency">{headlineParts.symbol}</span>
              <strong key={headline.cents} className="stay-amount-arrive">{headlineParts.amount}</strong>
              <small>{headline.unit}</small>
            </p>
          ) : <p className="stay-book-rate"><small>Add dates for a price</small></p>}
          <GuestPicker variant="compact" value={party} onChange={next => { touched.current = true; setParty(next); }} maxGuests={pricing?.maxGuests ?? stay.maxGuests} petsAllowed={pricing?.petsAllowed ?? true} />
        </div>

        {quoteFailed ? <div className="stay-alert stay-alert-danger" role="alert">This stay could not be quoted for those dates or guests. Review availability and the stay rules, then try again.</div> : null}

        <StayDateSwitch range={range} onEdit={editField} />

        <StayCalendar
          label="Choose stay dates"
          range={range}
          onSelect={choose}
          earliest={earliest}
          monthsAhead={calendarMonthsAhead}
          rates={rates}
          currencyCode={currencyCode}
          rule={rule}
          availability={availability}
          latestCheckIn={latestCheckIn}
          onVisibleChange={onVisibleChange}
          onPreview={setPreviewEnd}
          hint={hint}
          footer={range.checkIn ? <button type="button" className="stay-link-button" onClick={clearDates}><X size={12} aria-hidden="true" />Clear</button> : null}
        />

        <div className={`stay-book-bill ${provisional ? 'is-provisional' : ''}`}>
          <StayLedger
            quote={shown}
            provisional={Boolean(shown) && provisional}
            totalLabel={shown && provisional ? 'Estimated total' : 'Total'}
            totalNote={totalNote}
            emptyHeading={range.checkIn ? 'Choose checkout to see each night’s rate' : 'Choose dates to see each night’s rate'}
          />
          {shown?.securityDepositCents ? <p className="stay-book-deposit">+ {formatMoney(locale, shown.securityDepositCents, currencyCode)} security deposit, arranged separately with the host.</p> : null}
        </div>

        {problem ? <p className="stay-book-alert" role="alert"><AlertCircle size={15} aria-hidden="true" /><span>{problem}</span></p> : null}
        <p className="stay-visually-hidden" role="status" aria-live="polite">{announcement}</p>

        <QuoteButton blocked={cannotContinue} label={unavailable ? 'Dates unavailable' : notBookable ? 'Not bookable online' : complete ? action : range.checkIn ? 'Choose checkout' : 'Choose dates'} />
        {notBookable ? <a className="stay-text-link" href={`/help?stay=${encodeURIComponent(stay.slug)}#message-host`}>Message the host about these dates</a> : null}
        <p className="stay-book-charge">No charge yet. Next, review the saved quote and house rules.</p>
      </div>

      <div className={`stay-mobile-bar ${panelVisible ? 'is-hidden' : ''}`} aria-hidden={panelVisible}>
        <div className="stay-mobile-peek" aria-hidden="true">
          {shownNights.length
            ? shownNights.slice(0, 5).map(night => <span key={night.date}>{shortDate(locale, night.date)} <b>{formatMoney(locale, night.amountCents, currencyCode)}</b></span>)
            : <span>{range.checkIn ? 'Choose checkout to see each night’s price.' : 'Choose your dates to see each night’s price.'}</span>}
        </div>
        <div className="stay-mobile-main">
          <div className="stay-mobile-bar-copy">
            {shown && complete ? (
              <strong>{formatMoney(locale, shown.totalAmountCents, currencyCode)}<small> / {nightsBetween(range.checkIn, range.checkOut)} nights{provisional ? ' · est.' : ''}</small></strong>
            ) : typeof baseNightlyRateCents === 'number' ? (
              <strong>{formatMoney(locale, baseNightlyRateCents, currencyCode)}<small> / night</small></strong>
            ) : <strong>Add your dates</strong>}
            <button type="button" className="stay-link-button" tabIndex={panelVisible ? -1 : 0} onClick={showCard}>{complete ? 'Price details' : 'See the calendar'}</button>
          </div>
          {complete && !cannotContinue
            ? <QuoteButton blocked={false} label={action} compact tabIndex={panelVisible ? -1 : 0} />
            : <button type="button" className="stay-button" tabIndex={panelVisible ? -1 : 0} onClick={showCard}>{range.checkIn ? 'Choose checkout' : 'Choose dates'}</button>}
        </div>
      </div>
    </form>
  );
}

function QuoteButton({ blocked, label, compact = false, tabIndex }: { blocked: boolean; label: string; compact?: boolean; tabIndex?: number }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`stay-button ${compact ? '' : 'stay-button-block stay-button-large stay-book-cta'}`} disabled={blocked || pending} aria-disabled={blocked || pending} tabIndex={tabIndex}>
      {pending ? <><LoaderCircle className="stay-spin" size={16} aria-hidden="true" />Saving your quote…</> : <><span>{label}</span>{blocked ? null : <ArrowRight size={17} aria-hidden="true" />}</>}
    </button>
  );
}
