import Image from 'next/image';
import Link from 'next/link';

import type { PublicStay } from '../lib/data/stays';
import { formatMoney } from '../lib/format';

export function StayCard({ stay, priority = false, searchQuery }: { stay: PublicStay; priority?: boolean; searchQuery?: string }) {
  const image = stay.media?.[0];
  const location = stay.property?.location?.publicLocationLabel || 'Location shared before booking';
  const accommodation = stay.accommodation || {};
  const price = stay.quote?.totalAmountCents
    ? `${formatMoney(stay.quote.totalAmountCents, stay.quote.currencyCode)} total`
    : `${formatMoney(stay.baseNightlyRateCents, stay.currencyCode)} night`;
  const stayHref = `/stays/${stay.slug}${searchQuery ? `?${searchQuery}` : ''}`;
  return (
    <article className="stay-card">
      <Link href={stayHref} className="stay-card-image" aria-label={`View ${stay.title}`}>
        {image?.url || stay.thumbnail ? (
          <Image src={image?.url || stay.thumbnail} alt={image?.altText || stay.title} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" priority={priority} />
        ) : <span className="stay-image-placeholder">Photograph forthcoming</span>}
      </Link>
      <div className="stay-card-copy">
        <div>
          <p className="stay-location">{location}</p>
          <h2><Link href={stayHref}>{stay.title}</Link></h2>
        </div>
        <p className="stay-price">{price}</p>
      </div>
      <p className="stay-card-meta">
        {accommodation.maxGuests || 1} guests · {accommodation.bedroomCount || 1} bedrooms · {Math.max((accommodation.bathroomCountHalfUnits || 2) / 2, 1)} baths
      </p>
    </article>
  );
}
