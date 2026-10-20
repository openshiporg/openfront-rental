import { Bath, Bed, BedDouble, CircleCheck, CircleSlash, Clock, Columns3, DoorOpen, MapPin, MessageSquare, Moon, Ruler, ShieldCheck, Star, Undo2, Users, Wallet, Zap } from 'lucide-react';
import Link from 'next/link';

import { AmenityIcon } from '../../components/AmenityIcon';
import { SectionNav, UnavailableStay } from '../../components/Journey';
import { PolicyDetails } from '../../components/QuoteSummary';
import { StayBookingPanel } from '../../components/StayBookingPanel';
import { StayGallery } from '../../components/StayGallery';
import { StorefrontShell } from '../../components/StorefrontShell';
import { getPublicStay, getPublicStayAvailability } from '../../lib/data/stays';
import { getPublicMarketplaceSettings } from '../../lib/data/marketplace';
import { stayArrivalBounds, stayArrivalRules, zonedTodayIso } from '@/features/keystone/utils/stayBookingRules';
import { stayPaymentSummary } from '../../lib/payment-copy';
import { isIsoDate } from '../../lib/dates';
import { formatBaths, formatMoney, formatRating, formatType } from '../../lib/format';
import { countParam, searchQuery, single, type SearchParams } from '../../lib/navigation';
import { stayPricing } from '../../lib/stay-estimate';
import { getStorefrontLocale } from '../../lib/data/storefront-locale';

const CONTEXT_KEYS = ['destination', 'bedrooms', 'instantBook', 'collection', 'offset'] as const;

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('');
}

export async function StayDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: Promise<SearchParams> }) {
  const locale = await getStorefrontLocale();
  const { slug } = await params;
  const query = (await searchParams) || {};
  const [{ stay, error }, availability, settings] = await Promise.all([getPublicStay(slug, typeof query.reviewsBefore === 'string' ? query.reviewsBefore : null), getPublicStayAvailability(slug), getPublicMarketplaceSettings()]);
  if (!stay) return <StorefrontShell><UnavailableStay title={error ? 'This home couldn’t be loaded.' : 'This home is unavailable.'}>{error || 'The home may no longer be published. Explore the current homes or return to your trip.'}</UnavailableStay></StorefrontShell>;

  const accommodation = stay.accommodation || {};
  const property = stay.property || {};
  const location = property.location?.publicLocationLabel;
  const rate = stay.ratePlans?.[0];
  const pricing = stayPricing(stay);
  const queryString = searchQuery(query);
  const rating = formatRating(stay.reviewAverageHundredths);
  const hostName = stay.host?.name || 'Your independent host';
  const minimumStay = rate?.minimumStay ?? stay.minimumStay;
  const maximumStay = rate?.maximumStay ?? stay.maximumStay;
  const context = Object.fromEntries(CONTEXT_KEYS.map(key => [key, single(query[key])]));
  const arrivalRules = stayArrivalRules(rate, stay);
  const arrivalBounds = stayArrivalBounds({ ...arrivalRules, timeZone: property.timezone, checkInFrom: property.checkInFrom });
  // A linked check-in beyond the first page of availability gets its own page, so the
  // calendar can show (and keep) those dates; further pages load as the calendar moves.
  const linkedCheckIn = single(query.checkIn);
  const linkedPage = availability && isIsoDate(linkedCheckIn) && linkedCheckIn >= availability.to
    ? await getPublicStayAvailability(slug, linkedCheckIn) : null;
  const limits = {
    availability: [availability, linkedPage].filter((page): page is NonNullable<typeof page> => Boolean(page)),
    earliestCheckIn: arrivalBounds.earliestCheckIn,
    latestCheckIn: arrivalBounds.latestCheckIn,
    noticeHours: arrivalRules.advanceNoticeHours,
    windowDays: arrivalRules.bookingWindowDays,
  };
  const paymentSummary = stayPaymentSummary({ testBookings: settings.status === 'published' && settings.testBookingsAvailable === true, instantBook: Boolean(stay.instantBook) });
  const messageHostHref = `/help?stay=${encodeURIComponent(stay.slug)}#message-host`;
  const amenityGroups = Object.entries((stay.amenities || []).reduce<Record<string, any[]>>((groups, amenity) => {
    const key = amenity.category || 'other';
    (groups[key] ||= []).push(amenity);
    return groups;
  }, {}));
  const facts = [
    accommodation.maxGuests != null && { icon: Users, value: accommodation.maxGuests, label: accommodation.maxGuests === 1 ? 'guest' : 'guests' },
    accommodation.bedroomCount != null && { icon: BedDouble, value: accommodation.bedroomCount === 0 ? 'Studio' : accommodation.bedroomCount, label: accommodation.bedroomCount === 0 ? '' : accommodation.bedroomCount === 1 ? 'bedroom' : 'bedrooms' },
    accommodation.bedCount != null && { icon: Bed, value: accommodation.bedCount, label: accommodation.bedCount === 1 ? 'bed' : 'beds' },
    accommodation.bathroomCountHalfUnits != null && { icon: Bath, value: accommodation.bathroomCountHalfUnits / 2, label: formatBaths(accommodation.bathroomCountHalfUnits)?.split(' ')[1] },
    accommodation.squareFeet && { icon: Ruler, value: Number(accommodation.squareFeet).toLocaleString(locale), label: 'sq ft' },
  ].filter(Boolean) as { icon: typeof Users; value: string | number; label: string }[];

  return <StorefrontShell activeNav="search"><main id="stay-main" className="stay-detail">
    <div className="stay-shell">
      <nav className="stay-breadcrumb" aria-label="Breadcrumb">
        <Link href={`/search${queryString ? `?${queryString}` : ''}`}>Homes</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{stay.title}</span>
      </nav>
      <header className="stay-detail-head">
        <p className="stay-overline"><MapPin size={13} aria-hidden="true" />{location || 'Independent accommodation'}</p>
        <h1>{stay.title}</h1>
        <p className="stay-detail-meta">
          {rating ? <span className="stay-rating stay-rating-lg"><Star size={14} aria-hidden="true" />{rating}<span className="stay-visually-hidden"> average rating</span>{stay.reviewCount ? <small>{stay.reviewCount} reviews</small> : null}</span> : null}
          <span>{formatType(accommodation.accommodationType || property.propertyType)}</span>
          <span>Hosted by {hostName}</span>
        </p>
      </header>
      <StayGallery title={stay.title} photos={stay.media?.length ? stay.media : stay.thumbnail ? [{ url: stay.thumbnail, altText: stay.title }] : []} />

      <div className="stay-detail-layout">
        <section id="overview" className="stay-detail-intro" aria-labelledby="overview-title">
          {facts.length ? <ul className="stay-facts">{facts.map(({ icon: Icon, value, label }) => <li key={label || String(value)}><Icon size={20} strokeWidth={1.5} aria-hidden="true" /><strong>{value}</strong><span>{label}</span></li>)}</ul> : null}
          <h2 id="overview-title">{stay.subtitle || 'A place to settle in.'}</h2>
          <p className="stay-long-copy stay-lede">{stay.description || 'Ask the host for more details about this home before reserving.'}</p>
          <ul className="stay-highlights">
            <li><DoorOpen size={18} strokeWidth={1.6} aria-hidden="true" /><div><strong>{stay.instantBook ? 'Instant confirmation' : 'Host approval'}</strong><span>{stay.instantBook ? 'Reserve without waiting for a reply.' : 'The host reviews each request before confirming.'}</span></div></li>
            <li><Clock size={18} strokeWidth={1.6} aria-hidden="true" /><div><strong>Check-in {property.checkInFrom || 'by arrangement'}{property.checkInUntil ? `–${property.checkInUntil}` : ''}</strong><span>Checkout {property.checkOutBy ? `by ${property.checkOutBy}` : 'by arrangement'}{property.timezone ? ` · ${property.timezone.replaceAll('_', ' ')} time` : ''}</span></div></li>
            <li><Wallet size={18} strokeWidth={1.6} aria-hidden="true" /><div><strong>Clear total pricing</strong><span>Every night, fee, and tax itemized before you commit. {paymentSummary}</span></div></li>
          </ul>
        </section>

        <aside id="book" className="stay-detail-aside" aria-label="Dates and booking">
          <StayBookingPanel
            stay={{ id: stay.id, slug: stay.slug, title: stay.title, instantBook: Boolean(stay.instantBook), currencyCode: pricing?.currencyCode || stay.currencyCode || 'USD', baseNightlyRateCents: stay.baseNightlyRateCents, maxGuests: accommodation.maxGuests }}
            pricing={pricing}
            serverToday={zonedTodayIso(property.timezone)}
            initial={{ checkIn: single(query.checkIn), checkOut: single(query.checkOut), adults: Math.max(countParam(query.adults, 2), 1), children: countParam(query.children, 0, 12), infants: countParam(query.infants, 0, 5), pets: countParam(query.pets, 0, 4) }}
            context={context}
            quoteFailed={Boolean(query.error)}
            limits={limits}
          />
          <ul className="stay-book-notes">
            <li><Undo2 size={15} aria-hidden="true" /><span>{rate?.cancellationPolicy?.name ? `${rate.cancellationPolicy.name} cancellation policy` : 'Cancellation terms are shown in your dated quote'}</span></li>
            <li>{stay.instantBook ? <Zap size={15} aria-hidden="true" /> : <DoorOpen size={15} aria-hidden="true" />}<span>{stay.instantBook ? 'Instant confirmation when you reserve' : 'The host reviews each request before confirming'}</span></li>
          </ul>
          <div className="stay-book-help">
            <a href="#policies">Read the house notes first <span aria-hidden="true">→</span></a>
            <Link href={`/compare?${queryString ? `${queryString}&` : ''}home=${encodeURIComponent(stay.slug)}`}><Columns3 size={14} aria-hidden="true" />Compare with other homes</Link>
            <Link href={messageHostHref}><MessageSquare size={14} aria-hidden="true" />Message the host</Link>
          </div>
        </aside>

        <div className="stay-detail-rest">
          <SectionNav className="stay-section-nav-sticky" items={[{ id: 'rooms', label: 'Rooms' }, { id: 'amenities', label: 'Amenities' }, { id: 'policies', label: 'Good to know' }, { id: 'host', label: 'Host' }, { id: 'book', label: 'Dates & price' }]} />

          <section id="rooms" className="stay-detail-section" aria-labelledby="rooms-title">
            <p className="stay-overline">Room for everyone</p>
            <h2 id="rooms-title">Where you’ll sleep</h2>
            {accommodation.bedrooms?.length ? <ul className="stay-rooms">{accommodation.bedrooms.map((room: any) => (
              <li key={room.id}>
                <BedDouble size={22} strokeWidth={1.4} aria-hidden="true" />
                <h3>{room.name}</h3>
                <p>{room.beds?.map((bed: any) => `${bed.quantity} ${formatType(bed.bedType).toLowerCase()}`).join(' · ') || 'Bed configuration not listed'}</p>
              </li>
            ))}</ul> : <p className="stay-muted">Room-by-room sleeping arrangements haven’t been published. Ask the host if you need a particular bed setup.</p>}
          </section>

          <section id="amenities" className="stay-detail-section" aria-labelledby="amenities-title">
            <p className="stay-overline">The everyday comforts</p>
            <h2 id="amenities-title">What this home offers</h2>
            {amenityGroups.length ? <div className="stay-amenity-groups">{amenityGroups.map(([category, amenities]) => (
              <div key={category}>
                <h3>{formatType(category)}</h3>
                <ul className="stay-amenities">{amenities.map((item: any) => <li key={item.id}><AmenityIcon iconKey={item.iconKey} />{item.name}</li>)}</ul>
              </div>
            ))}</div> : <p className="stay-muted">Amenities haven’t been listed. Check with the host about anything essential to your stay.</p>}
            <p className="stay-form-note">For specific accessibility needs, confirm the details with the host before reserving.</p>
          </section>

          <section id="policies" className="stay-detail-section" aria-labelledby="policies-title">
            <p className="stay-overline">Before you book</p>
            <h2 id="policies-title">Good to know</h2>
            <div className="stay-know-grid">
              <div className="stay-know-card">
                <Clock size={18} strokeWidth={1.6} aria-hidden="true" />
                <h3>Arrival & departure</h3>
                <p>Check in {property.checkInFrom ? `from ${property.checkInFrom}` : 'at an agreed time'}{property.checkInUntil ? ` until ${property.checkInUntil}` : ''}. Check out {property.checkOutBy ? `by ${property.checkOutBy}` : 'at an agreed time'}.</p>
                {property.timezone ? <p className="stay-muted">Times are local to the home ({property.timezone.replaceAll('_', ' ')}).</p> : null}
              </div>
              <div className="stay-know-card">
                <Moon size={18} strokeWidth={1.6} aria-hidden="true" />
                <h3>Length of stay</h3>
                <p>{minimumStay ? `${minimumStay}-night minimum` : 'Minimum set by date'}{maximumStay ? ` · up to ${maximumStay} nights` : ''}.</p>
                {arrivalRules.advanceNoticeHours || arrivalRules.bookingWindowDays ? <p className="stay-muted">{[
                  arrivalRules.advanceNoticeHours ? `Book at least ${arrivalRules.advanceNoticeHours % 24 === 0 && arrivalRules.advanceNoticeHours >= 48 ? `${arrivalRules.advanceNoticeHours / 24} days` : `${arrivalRules.advanceNoticeHours} hours`} before check-in` : null,
                  arrivalRules.bookingWindowDays ? `up to ${arrivalRules.bookingWindowDays} ${arrivalRules.bookingWindowDays === 1 ? 'day' : 'days'} ahead` : null,
                ].filter(Boolean).join(', ')}.</p> : null}
                {rate?.seasonalRates?.length ? <p className="stay-muted">Seasonal dates can carry their own rate and minimum; the calendar shows both.</p> : null}
              </div>
              <div className="stay-know-card">
                <MapPin size={18} strokeWidth={1.6} aria-hidden="true" />
                <h3>Where you’ll be</h3>
                <p>{location || 'The host shares the area before booking.'}</p>
                <p className="stay-muted">The exact address and arrival details are shared on your private trip page once your stay is confirmed.</p>
              </div>
              <div className="stay-know-card">
                <ShieldCheck size={18} strokeWidth={1.6} aria-hidden="true" />
                <h3>Security deposit</h3>
                <p>{typeof stay.securityDepositCents === 'number' && stay.securityDepositCents > 0 ? `${formatMoney(locale, stay.securityDepositCents, stay.currencyCode)}, separate from the stay price.` : 'Any separate deposit appears in your dated quote.'}</p>
                <p className="stay-muted">Collection, deductions, and return are arranged with the host.</p>
              </div>
            </div>
            <div className="stay-know-split">
              <div>
                <h3>Cancellation</h3>
                <PolicyDetails policy={rate?.cancellationPolicy} />
              </div>
              <div>
                <h3>House rules</h3>
                {stay.houseRules?.length ? <ul className="stay-rules">{stay.houseRules.map(rule => (
                  <li key={rule.id} className={rule.isAllowed === false ? 'is-not-allowed' : 'is-allowed'}>
                    {rule.isAllowed === false ? <CircleSlash size={17} strokeWidth={1.6} aria-hidden="true" /> : <CircleCheck size={17} strokeWidth={1.6} aria-hidden="true" />}
                    <div><strong>{rule.title}</strong>{rule.description ? <span>{rule.description}</span> : null}</div>
                  </li>
                ))}</ul> : <p className="stay-muted">No house rules have been published. Ask the host about anything important to your stay.</p>}
              </div>
            </div>
            <Link href="/policies" className="stay-text-link">How booking, payment & policies work</Link>
          </section>

          {stay.publishedReviews?.length ? <section id="reviews" className="stay-detail-section" aria-labelledby="reviews-title">
            <h2 id="reviews-title">Guest reviews</h2>
            {stay.reviewsBefore
              ? <p className="stay-muted">Showing older reviews. <Link className="stay-text-link" href={`/stays/${encodeURIComponent(stay.slug)}?${searchQuery(query)}#reviews`}>Back to the latest</Link></p>
              : stay.reviewCount && stay.reviewCount > stay.publishedReviews.length ? <p className="stay-muted">The {stay.publishedReviews.length} most recent of {stay.reviewCount} reviews.</p> : null}
            <ul className="stay-records">{stay.publishedReviews.map((review: any) => <li key={review.id}>
              <span><strong>{review.author}</strong>{review.publishedAt ? <span className="stay-muted"> · {new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(review.publishedAt))}</span> : null}</span>
              <span className="stay-rating"><Star size={13} aria-hidden="true" />{review.overallRating}<span className="stay-visually-hidden"> out of 5</span></span>
              {review.body ? <p className="stay-long-copy">{review.body}</p> : null}
            </li>)}</ul>
            {stay.olderReviewsBefore ? <Link className="stay-text-link" href={`/stays/${encodeURIComponent(stay.slug)}?${searchQuery(query, { offset: '' })}&reviewsBefore=${encodeURIComponent(stay.olderReviewsBefore)}#reviews`}>Show older reviews</Link> : null}
          </section> : null}

          <section id="host" className="stay-detail-section" aria-labelledby="host-title">
            <div className="stay-host">
              <span className="stay-host-avatar" aria-hidden="true">{initials(hostName)}</span>
              <div>
                <p className="stay-overline">Your host</p>
                <h2 id="host-title">{hostName}</h2>
                <p className="stay-long-copy">{stay.host?.publicBio || 'Message the host with any questions about the home or your plans.'}</p>
                <div className="stay-actions">
                  <Link className="stay-button stay-button-quiet" href={messageHostHref}><MessageSquare size={16} aria-hidden="true" />Message the host</Link>
                  <Link className="stay-text-link" href="/help">Help & stay support</Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </main></StorefrontShell>;
}
export default StayDetailPage;
