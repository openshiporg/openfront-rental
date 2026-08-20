import Image from 'next/image';
import Link from 'next/link';

import { StayCard } from '../../components/StayCard';
import { StayDateRangePicker } from '../../components/StayDateRangePicker';
import { StorefrontShell } from '../../components/StorefrontShell';
import { resolveStorefrontBrand } from '../../lib/brand';
import { getPublicMarketplaceSettings } from '../../lib/data/marketplace';
import { searchPublicStays } from '../../lib/data/stays';

export async function StorefrontLandingPage() {
  const settings = await getPublicMarketplaceSettings();
  const brand = resolveStorefrontBrand(settings);
  if (!brand) return <StorefrontShell><></></StorefrontShell>;

  const { results, error } = await searchPublicStays({ adults: 1 });
  const hero = results[0];
  const heroImage = hero?.media?.[0];

  return (
    <StorefrontShell activeNav="home">
      <main>
        <section className="stay-photo-hero" aria-labelledby="home-title">
          {heroImage?.url ? (
            <Image src={heroImage.url} alt={heroImage.altText || hero.title} fill priority sizes="100vw" />
          ) : <div className="stay-photo-fallback" />}
          <div className="stay-photo-shade" />
          <div className="stay-shell stay-hero-caption">
            <p>{hero?.property?.location?.publicLocationLabel || 'Independent homes, directly hosted'}</p>
            <h1 id="home-title">{brand.homepageHeadline}</h1>
            <Link href={hero ? `/stays/${hero.slug}` : '/search'}>{hero ? `See ${hero.title}` : 'Find a stay'} <span aria-hidden="true">→</span></Link>
          </div>
        </section>

        <section className="stay-shell stay-search-band" aria-label="Search stays">
          <div>
            <p className="stay-overline">{brand.tagline}</p>
            <p className="stay-search-intro">{brand.description}</p>
          </div>
          <form action="/search" method="get" className="stay-search-form">
            <label>Where<input name="destination" placeholder="Mendocino, Stowe, Savannah" /></label>
            <StayDateRangePicker />
            <label>Guests<input name="adults" type="number" min="1" max="16" defaultValue="2" /></label>
            <button type="submit">Search homes</button>
          </form>
        </section>

        <section className="stay-shell stay-edit" aria-labelledby="featured-stays">
          <header className="stay-section-head">
            <h2 id="featured-stays">Homes worth the journey</h2>
            <p>Cabins, coastal villas, city lofts, desert houses, and mountain stays cared for by independent hosts.</p>
          </header>
          {error ? <p className="stay-notice" role="alert">Published stays could not be loaded. Try the search again shortly.</p> : null}
          {results.length ? (
            <div className="stay-card-grid">{results.slice(0, 5).map((stay, index) => <StayCard key={stay.id} stay={stay} priority={index < 2} />)}</div>
          ) : !error ? (
            <div className="stay-empty"><h2>No homes are published yet.</h2><p>The host can publish accommodation listings from the operator workspace.</p></div>
          ) : null}
        </section>

        <section className="stay-editorial-note">
          <div className="stay-shell stay-editorial-note-inner">
            <p>Clear totals before booking. Exact arrival details after confirmation. Your host relationship remains direct.</p>
            <Link href="/search">Browse every home <span aria-hidden="true">→</span></Link>
          </div>
        </section>
      </main>
    </StorefrontShell>
  );
}

export default StorefrontLandingPage;
