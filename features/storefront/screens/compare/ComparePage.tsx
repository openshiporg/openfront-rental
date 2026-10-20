import { ArrowLeft, X } from 'lucide-react';
import Link from 'next/link';
import type { CSSProperties } from 'react';

import { CompareSelectionSync } from '../../components/CompareSelectionSync';
import { StayCard } from '../../components/StayCard';
import { StorefrontShell } from '../../components/StorefrontShell';
import { getPublicStay, searchPublicStays } from '../../lib/data/stays';
import { isIsoDate, rangeLabel } from '../../lib/dates';
import { formatMoney } from '../../lib/format';
import { comparisonSlugs, countParam, searchQuery, single, type SearchParams } from '../../lib/navigation';
import { stayPaymentShort } from '../../lib/payment-copy';
import { getStorefrontLocale } from '../../lib/data/storefront-locale';

export async function ComparePage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const locale = await getStorefrontLocale();
  const params = (await searchParams) || {};
  const slugs = comparisonSlugs(params.home);
  const query = searchQuery(params, { offset: '' });
  const responses = await Promise.all(slugs.map(getPublicStay));
  const stays = responses.flatMap(response => response.stay ? [response.stay] : []);
  const checkIn = single(params.checkIn);
  const checkOut = single(params.checkOut);
  const dated = Boolean(checkIn && checkOut);
  // Each selected home is priced and checked directly, never looked up in a sample of results.
  const previews = dated && stays.length ? await searchPublicStays({ listingIds: stays.map(stay => stay.id), checkIn, checkOut, adults: Math.max(countParam(params.adults, 2), 1), children: countParam(params.children), infants: countParam(params.infants), pets: countParam(params.pets), limit: stays.length }) : null;
  const datesLabel = dated && isIsoDate(checkIn) && isIsoDate(checkOut) && checkOut > checkIn ? rangeLabel(locale, checkIn, checkOut) : `${checkIn} → ${checkOut}`;

  return <StorefrontShell activeNav="search"><main id="stay-main" className="stay-shell">
    <nav className="stay-breadcrumb" aria-label="Breadcrumb"><Link href={`/search${query ? `?${query}` : ''}`}><ArrowLeft size={13} aria-hidden="true" /> Back to your search</Link></nav>
    <header className="stay-page-head stay-page-head-split">
      <div>
        <p className="stay-overline">Side by side</p>
        <h1>Find the <em>right fit</em></h1>
      </div>
      <p>Compare the space, the house notes, and the price for your dates. Your chosen dates and guests travel with you.</p>
    </header>

    {/* Only a compare URL that names homes is the selection; a bare visit leaves it untouched. */}
    {slugs.length ? <CompareSelectionSync slugs={stays.map(stay => stay.slug)} /> : null}
    {!stays.length
      ? <div className="stay-empty"><h2>Choose a few homes first.</h2><p>Select up to three homes from the search results to compare them here.</p><Link className="stay-button" href={`/search?${query}`}>Find homes to compare</Link></div>
      : <>
          {stays.length < slugs.length ? <p role="status" className="stay-alert stay-alert-warn">Some selected homes are no longer available to view.</p> : null}
          {previews?.error ? <p role="alert" className="stay-alert stay-alert-warn">Date prices couldn’t be loaded. You can still compare the home details.</p> : null}
          <div className="stay-compare-grid" style={{ '--stay-compare-count': stays.length } as CSSProperties}>
            {stays.map(stay => {
              const preview = previews?.results.find(item => item.id === stay.id);
              const rest = slugs.filter(slug => slug !== stay.slug);
              return (
                <section key={stay.id} className="stay-compare-col" aria-label={stay.title}>
                  <StayCard locale={locale} stay={preview || stay} searchQuery={query} />
                  <dl className="stay-compare-facts">
                    <div><dt>Your dates</dt><dd>{dated ? preview?.quote ? `${datesLabel} · ${formatMoney(locale, preview.quote.totalAmountCents, preview.quote.currencyCode)} total` : previews?.error ? 'Price preview unavailable' : 'Not available for these dates, or outside the stay rules' : 'Add dates for a total price'}</dd></div>
                    <div><dt>Sleeping</dt><dd>{stay.accommodation?.bedCount ?? 'Not listed'} beds · {stay.accommodation?.bedroomCount === 0 ? 'Studio' : `${stay.accommodation?.bedroomCount ?? 'Not listed'} bedrooms`}</dd></div>
                    <div><dt>Booking</dt><dd>{stay.instantBook ? 'Instant confirmation' : 'Host approval required'} · {stayPaymentShort({ testBookings: false, instantBook: Boolean(stay.instantBook) })}</dd></div>
                    <div><dt>Amenities</dt><dd>{stay.amenities?.map(item => item.name).join(' · ') || 'Not listed'}</dd></div>
                    <div><dt>House rules</dt><dd>{stay.houseRules?.map(item => `${item.title}${item.description ? `: ${item.description}` : ''}`).join(' · ') || 'Ask the host before booking'}</dd></div>
                    <div><dt>Cancellation</dt><dd>{stay.ratePlans?.[0]?.cancellationPolicy?.summary || 'Review the policy in your dated quote'}</dd></div>
                    <div><dt>Separate deposit</dt><dd>{typeof stay.securityDepositCents === 'number' ? formatMoney(locale, stay.securityDepositCents, stay.currencyCode) : 'Review your quote'}</dd></div>
                  </dl>
                  <div className="stay-compare-actions">
                    <Link className="stay-button stay-button-block" href={`/stays/${encodeURIComponent(stay.slug)}?${query}`}>View dates & price</Link>
                    <Link className="stay-remove-link" href={`/compare?${query}${rest.length ? `&${rest.map(slug => `home=${encodeURIComponent(slug)}`).join('&')}` : ''}`}><X size={14} aria-hidden="true" />Remove from comparison</Link>
                  </div>
                </section>
              );
            })}
          </div>
        </>}
  </main></StorefrontShell>;
}
