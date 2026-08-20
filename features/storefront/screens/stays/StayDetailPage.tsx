import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { StorefrontShell } from '../../components/StorefrontShell';
import { getPublicStay } from '../../lib/data/stays';
import { quoteStayAction } from '../../lib/data/stay-actions';
import { formatMoney, formatType } from '../../lib/format';

export async function StayDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    error?: string;
    destination?: string;
    checkIn?: string;
    checkOut?: string;
    adults?: string;
    children?: string;
    infants?: string;
    pets?: string;
  }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const { stay, error } = await getPublicStay(slug);
  if (!stay && !error) notFound();
  if (!stay) return <StorefrontShell><main className="stay-shell stay-token-page"><div className="stay-notice" role="alert">This stay could not be loaded. {error}</div></main></StorefrontShell>;
  const accommodation = stay.accommodation || {};
  const location = stay.property?.location?.publicLocationLabel;
  const photos = stay.media || [];
  const searchBackQuery = new URLSearchParams({
    ...(query?.destination ? { destination: query.destination } : {}),
    ...(query?.checkIn ? { checkIn: query.checkIn } : {}),
    ...(query?.checkOut ? { checkOut: query.checkOut } : {}),
    adults: query?.adults || '2',
    children: query?.children || '0',
    pets: query?.pets || '0',
  }).toString();

  return (
    <StorefrontShell>
      <main>
        <header className="stay-shell stay-listing-head">
          <nav aria-label="Breadcrumb"><Link href={`/search?${searchBackQuery}`}>All homes</Link><span>/</span><span aria-current="page">{stay.title}</span></nav>
          <h1>{stay.title}</h1>
          <div className="stay-listing-subline">
            <span>{location}</span>
            {stay.reviewCount ? <span>{((stay.reviewAverageHundredths ?? 0) / 100).toFixed(2)} from {stay.reviewCount} reviews</span> : null}
          </div>
        </header>

        <section className="stay-gallery" aria-label={`${stay.title} photographs`}>
          {photos.slice(0, 3).map((photo: any, index: number) => (
            <figure key={photo.id || photo.url} className={index === 0 ? 'stay-gallery-main' : ''}>
              <Image src={photo.url} alt={photo.altText || stay.title} fill priority={index === 0} sizes={index === 0 ? '(max-width: 800px) 100vw, 66vw' : '34vw'} />
              {photo.caption ? <figcaption>{photo.caption}</figcaption> : null}
            </figure>
          ))}
        </section>

        <div className="stay-shell stay-detail-layout">
          <div className="stay-detail-copy">
            <section>
              <p className="stay-overline">{formatType(accommodation.accommodationType)} hosted by {stay.host?.name || 'an independent host'}</p>
              <h2>{stay.subtitle || `An independent stay in ${location}`}</h2>
              <p className="stay-long-copy">{stay.description}</p>
              <div className="stay-facts">
                <span>{accommodation.maxGuests} guests</span><span>{accommodation.bedroomCount} bedrooms</span><span>{accommodation.bedCount} beds</span><span>{(accommodation.bathroomCountHalfUnits || 0) / 2} baths</span>
              </div>
            </section>

            <section className="stay-detail-section">
              <h2>What this home offers</h2>
              <ul className="stay-amenities">{(stay.amenities || []).map((amenity: any) => <li key={amenity.id}>{amenity.name}</li>)}</ul>
            </section>

            <section className="stay-detail-section">
              <h2>House notes</h2>
              <dl className="stay-rule-list">{(stay.houseRules || []).map((rule: any) => <div key={rule.id}><dt>{rule.title}</dt><dd>{rule.description}</dd></div>)}</dl>
            </section>

            <section className="stay-detail-section stay-host-note">
              <h2>Hosted by {stay.host?.name}</h2>
              <p>{stay.host?.publicBio || 'Your host cares for this home and remains your direct point of contact throughout the stay.'}</p>
            </section>
          </div>

          <aside className="stay-book-panel" aria-labelledby="book-title">
            <p><strong>{formatMoney(stay.baseNightlyRateCents, stay.currencyCode)}</strong> night</p>
            <h2 id="book-title">Check your stay</h2>
            {query?.error ? <div className="stay-form-error" role="alert">{query.error}</div> : null}
            <form action={quoteStayAction} className="stay-book-form">
              <input type="hidden" name="listingId" value={stay.id} />
              <input type="hidden" name="listingSlug" value={stay.slug} />
              <div className="stay-field-row">
                <label>Check in<input required type="date" name="checkIn" defaultValue={query?.checkIn} /></label>
                <label>Check out<input required type="date" name="checkOut" defaultValue={query?.checkOut} /></label>
              </div>
              <div className="stay-field-row">
                <label>Adults<input required type="number" name="adults" min="1" max={accommodation.maxGuests || 16} defaultValue={query?.adults || '2'} /></label>
                <label>Children<input type="number" name="children" min="0" max="12" defaultValue={query?.children || '0'} /></label>
              </div>
              <div className="stay-field-row">
                <label>Infants<input type="number" name="infants" min="0" max="5" defaultValue={query?.infants || '0'} /></label>
                <label>Pets<input type="number" name="pets" min="0" max="4" defaultValue={query?.pets || '0'} /></label>
              </div>
              <button type="submit">See total price</button>
            </form>
            <p className="stay-form-note">No charge is made when you request a quote. Quotes remain valid for 30 minutes.</p>
          </aside>
        </div>
      </main>
    </StorefrontShell>
  );
}

export default StayDetailPage;
