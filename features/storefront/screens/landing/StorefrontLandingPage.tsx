import { CalendarCheck, KeyRound, ReceiptText } from 'lucide-react';
import Link from 'next/link';

import { SearchForm } from '../../components/SearchForm';
import { StayCard } from '../../components/StayCard';
import { StayImage as Image } from '../../components/StayImage';
import { StorefrontShell } from '../../components/StorefrontShell';
import { resolveStorefrontBrand } from '../../lib/brand';
import { getPublicMarketplaceSettings } from '../../lib/data/marketplace';
import { collectionCovers, searchPublicStays } from '../../lib/data/stays';
import { formatMoney } from '../../lib/format';
import { effectiveBaseRate } from '../../lib/stay-estimate';
import { getStorefrontLocale } from '../../lib/data/storefront-locale';

export async function StorefrontLandingPage() {
  const locale = await getStorefrontLocale();
  const brand = resolveStorefrontBrand(await getPublicMarketplaceSettings());
  if (!brand) return <StorefrontShell><></></StorefrontShell>;
  const { results, error } = await searchPublicStays({ adults: 1 });
  const hero = results[0];
  const heroImage = hero?.media?.[0];
  // Complete collection counts and covers from the server, not the first page of homes.
  const { collections } = await collectionCovers({ adults: 1 });

  return <StorefrontShell activeNav="home"><main id="stay-main">
    <section className="stay-shell stay-hero" aria-labelledby="home-title">
      <div className="stay-hero-grid">
        <div className="stay-hero-copy">
          <p className="stay-overline">{brand.tagline || 'Independent homes, directly hosted'}</p>
          <h1 id="home-title">{brand.homepageHeadline}</h1>
          <p>{brand.description || 'Find a home for the way you like to travel: space to gather, room to slow down, and a direct line to your host.'}</p>
          <ul className="stay-hero-proof">
            <li><ReceiptText size={16} aria-hidden="true" />Every night, fee & tax itemized</li>
            <li><CalendarCheck size={16} aria-hidden="true" />Dates checked before you commit</li>
            <li><KeyRound size={16} aria-hidden="true" />One private link for your trip</li>
          </ul>
        </div>
        {hero ? (
          <Link href={`/stays/${encodeURIComponent(hero.slug)}`} className="stay-hero-feature" aria-label={`${hero.title}${hero.property?.location?.publicLocationLabel ? `, ${hero.property.location.publicLocationLabel}` : ''}`}>
            {heroImage?.url || hero.thumbnail
              ? <Image src={heroImage?.url || hero.thumbnail!} alt={heroImage?.altText || hero.title} fill priority sizes="(max-width: 900px) 100vw, 55vw" />
              : <span className="stay-image-placeholder">Photographs not yet published</span>}
            <span className="stay-hero-caption">
              <span><small>{hero.property?.location?.publicLocationLabel || 'Featured home'}</small><strong>{hero.title}</strong></span>
              {(() => { const rate = effectiveBaseRate(hero); return rate ? <span className="stay-hero-price">{formatMoney(locale, rate.cents, rate.currencyCode)} / night</span> : null; })()}
            </span>
          </Link>
        ) : (
          <div className="stay-hero-empty">
            <p>{error ? 'The homes are taking a moment to load.' : 'New homes are on their way.'}</p>
            <Link className="stay-text-link" href="/search">{error ? 'Try browsing again' : 'Check for published homes'}</Link>
          </div>
        )}
      </div>
      <div className="stay-hero-search"><SearchForm variant="hero" /></div>
    </section>

    <section className="stay-shell stay-section" aria-labelledby="featured-stays">
      <header className="stay-section-head">
        <div>
          <p className="stay-overline">A place of your own</p>
          <h2 id="featured-stays">Homes worth <em>the journey</em></h2>
        </div>
        <div>
          <p>See the rooms, read the house notes, and check your dates against each night’s real rate.</p>
          <Link className="stay-text-link" href="/search">Browse every home</Link>
        </div>
      </header>
      {error
        ? <div className="stay-alert stay-alert-warn" role="alert"><div><h3>We couldn’t load the homes.</h3><p>Try again in a moment. <Link href="/search">Retry search</Link></p></div></div>
        : results.length
          ? <div className="stay-card-grid">{results.slice(0, 5).map((stay, index) => <StayCard locale={locale} key={stay.id} stay={stay} priority={index === 0} size={index < 2 ? 'feature' : 'default'} />)}</div>
          : <div className="stay-empty"><h3>No homes are published yet.</h3><p>Come back soon, or contact us about your plans.</p><Link className="stay-text-link" href="/help">Contact & help</Link></div>}
    </section>

    {collections.length ? (
      <section className="stay-shell stay-section" aria-labelledby="home-collections">
        <header className="stay-section-head">
          <div>
            <p className="stay-overline">Collections</p>
            <h2 id="home-collections">Start with a <em>feeling</em></h2>
          </div>
          <Link className="stay-text-link" href="/collections">All collections</Link>
        </header>
        <div className="stay-collection-strip">
          {collections.slice(0, 4).map(collection => {
            const photo = collection.cover?.media?.[0]?.url || collection.cover?.thumbnail;
            return (
              <Link key={collection.slug} href={`/collections/${encodeURIComponent(collection.slug)}`} className="stay-collection-chip">
                {photo ? <Image src={photo} alt="" fill sizes="(max-width: 760px) 100vw, 25vw" /> : null}
                <span className="stay-collection-chip-copy"><strong>{collection.name}</strong><span>{collection.count} {collection.count === 1 ? 'home' : 'homes'}</span></span>
              </Link>
            );
          })}
        </div>
      </section>
    ) : null}

    <section className="stay-promise" aria-labelledby="how-it-works">
      <div className="stay-shell stay-promise-grid">
        <div>
          <p className="stay-overline">From first look to front door</p>
          <h2 id="how-it-works">A considered stay, a <em>clear</em> next step</h2>
          <Link className="stay-text-link" href="/help">How booking works</Link>
        </div>
        <ol className="stay-promise-steps">
          <li><h3>Find your fit</h3><p>Compare rooms, amenities, and house rules side by side.</p></li>
          <li><h3>Know the full price</h3><p>Pick dates on a calendar that shows each night’s rate, then review fees, taxes, and any deposit.</p></li>
          <li><h3>Keep your trip close</h3><p>One private link holds your booking, agreement, payments, and next steps.</p></li>
        </ol>
      </div>
    </section>
  </main></StorefrontShell>;
}
export default StorefrontLandingPage;
