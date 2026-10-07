import { StayImage as Image } from './StayImage';
import Link from 'next/link';
import type { PublicStay } from '../lib/data/stays';
import { formatMoney } from '../lib/format';

export function StayCard({ stay, priority = false, searchQuery }: { stay: PublicStay; priority?: boolean; searchQuery?: string }) {
  const image = stay.media?.[0];
  const accommodation = stay.accommodation || {};
  const hasQuote = typeof stay.quote?.totalAmountCents === 'number';
  const href = `/stays/${encodeURIComponent(stay.slug)}${searchQuery ? `?${searchQuery}` : ''}`;
  return <article className="stay-card">
    <Link href={href} className="stay-card-image" aria-label={`Explore ${stay.title}`}>
      {image?.url || stay.thumbnail ? <Image src={image?.url || stay.thumbnail} alt={image?.altText || stay.title} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" priority={priority} /> : <span className="stay-image-placeholder">Photographs not yet available</span>}
      <span className="stay-card-type">{String(accommodation.accommodationType || 'Independent home').replaceAll('_', ' ')}</span>
    </Link>
    <p className="stay-location">{stay.property?.location?.publicLocationLabel || 'Ask the host about the location'}</p>
    <div className="stay-card-copy"><h2><Link href={href}>{stay.title}</Link></h2><span aria-hidden="true">↗</span></div>
    <p className="stay-card-meta">{accommodation.maxGuests != null ? `Up to ${accommodation.maxGuests} guests` : 'Capacity not listed'}{accommodation.bedroomCount != null ? ` · ${accommodation.bedroomCount === 0 ? 'Studio' : `${accommodation.bedroomCount} bedrooms`}` : ''}{accommodation.bathroomCountHalfUnits != null ? ` · ${accommodation.bathroomCountHalfUnits / 2} baths` : ''}</p>
    <div className="stay-card-bottom"><p className="stay-price">{hasQuote ? <><strong>{formatMoney(stay.quote.totalAmountCents, stay.quote.currencyCode)}</strong> total for {stay.quote.numberOfNights} nights<span>Includes quoted fees & taxes · deposit separate</span></> : typeof stay.baseNightlyRateCents === 'number' ? <><strong>{formatMoney(stay.baseNightlyRateCents, stay.currencyCode)}</strong> base / night<span>Add dates for total, fees & taxes</span></> : 'Add dates to request a price'}</p></div>
  </article>;
}
