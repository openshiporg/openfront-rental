import { Star, Zap } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import type { PublicStay } from '../lib/data/stays';
import { formatBaths, formatMoney, formatRating, formatType } from '../lib/format';
import { effectiveBaseRate } from '../lib/stay-estimate';
import { StayImage as Image } from './StayImage';

export function stayFacts(accommodation: any) {
  return [
    accommodation?.maxGuests != null ? `${accommodation.maxGuests} guests` : null,
    accommodation?.bedroomCount != null ? (accommodation.bedroomCount === 0 ? 'Studio' : `${accommodation.bedroomCount} ${accommodation.bedroomCount === 1 ? 'bedroom' : 'bedrooms'}`) : null,
    accommodation?.bedCount != null ? `${accommodation.bedCount} ${accommodation.bedCount === 1 ? 'bed' : 'beds'}` : null,
    formatBaths(accommodation?.bathroomCountHalfUnits),
  ].filter(Boolean) as string[];
}

export function StayCard({ stay, priority = false, searchQuery, size = 'default', overlay, locale }: {
  stay: PublicStay;
  priority?: boolean;
  searchQuery?: string;
  size?: 'default' | 'feature';
  overlay?: ReactNode;
  /** Formatting locale from the page (server) or the storefront provider (client). */
  locale: string;
}) {
  const image = stay.media?.[0];
  const accommodation = stay.accommodation || {};
  const quote = typeof stay.quote?.totalAmountCents === 'number' ? stay.quote : null;
  const baseRate = effectiveBaseRate(stay);
  const href = `/stays/${encodeURIComponent(stay.slug)}${searchQuery ? `?${searchQuery}` : ''}`;
  const rating = formatRating(stay.reviewAverageHundredths);
  const facts = stayFacts(accommodation);
  return (
    <article className={`stay-card stay-card-${size}`}>
      <div className="stay-card-media">
        <Link href={href} className="stay-card-image" tabIndex={-1} aria-hidden="true">
          {image?.url || stay.thumbnail
            ? <Image src={image?.url || stay.thumbnail!} alt="" fill sizes={size === 'feature' ? '(max-width: 760px) 100vw, 58vw' : '(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 33vw'} priority={priority} />
            : <span className="stay-image-placeholder">Photographs not yet published</span>}
        </Link>
        <span className="stay-card-tags">
          <span className="stay-tag">{formatType(accommodation.accommodationType || stay.property?.propertyType)}</span>
          {stay.instantBook ? <span className="stay-tag stay-tag-accent"><Zap size={11} aria-hidden="true" />Instant</span> : null}
        </span>
        {overlay}
      </div>
      <div className="stay-card-body">
        <div className="stay-card-line">
          <p className="stay-card-place">{stay.property?.location?.publicLocationLabel || 'Location shared by the host'}</p>
          {rating ? <span className="stay-rating"><Star size={12} aria-hidden="true" />{rating}<span className="stay-visually-hidden"> average rating</span>{stay.reviewCount ? <small>({stay.reviewCount})</small> : null}</span> : null}
        </div>
        <h3 className="stay-card-title"><Link href={href}>{stay.title}</Link></h3>
        {facts.length ? <p className="stay-card-facts">{facts.join(' · ')}</p> : null}
        <p className="stay-card-price">
          {quote
            ? <><strong>{formatMoney(locale, quote.totalAmountCents, quote.currencyCode)}</strong> <span>total · {quote.numberOfNights} {quote.numberOfNights === 1 ? 'night' : 'nights'}</span><small>Fees & taxes included · deposit separate</small></>
            : baseRate
              ? <><strong>{formatMoney(locale, baseRate.cents, baseRate.currencyCode)}</strong> <span>/ night</span><small>Base rate · add dates for a total</small></>
              : <span>Add dates to request a price</span>}
        </p>
      </div>
    </article>
  );
}
