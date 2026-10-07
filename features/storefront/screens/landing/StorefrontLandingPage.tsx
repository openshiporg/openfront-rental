import { StayImage as Image } from '../../components/StayImage';
import Link from 'next/link';
import { StayCard } from '../../components/StayCard';
import { SearchForm } from '../../components/SearchForm';
import { StorefrontShell } from '../../components/StorefrontShell';
import { resolveStorefrontBrand } from '../../lib/brand';
import { getPublicMarketplaceSettings } from '../../lib/data/marketplace';
import { searchPublicStays } from '../../lib/data/stays';

export async function StorefrontLandingPage() {
  const brand = resolveStorefrontBrand(await getPublicMarketplaceSettings());
  if (!brand) return <StorefrontShell><></></StorefrontShell>;
  const { results, error } = await searchPublicStays({ adults: 1 });
  const hero = results[0];
  const heroImage = hero?.media?.[0];
  return <StorefrontShell activeNav="home"><main id="stay-main">
    <section className="stay-shell stay-editorial-hero" aria-labelledby="home-title">
      <div className="stay-editorial-intro"><p className="stay-overline">{brand.tagline || 'Independent homes, directly hosted'}</p><h1 id="home-title">{brand.homepageHeadline}</h1><p>{brand.description || 'Find a home for the way you like to travel. Space to gather, room to slow down, and a direct connection to your host.'}</p><Link className="stay-text-link" href="/search">Explore the homes <span aria-hidden="true">↗</span></Link><span className="stay-editorial-folio">THE HOUSEKIND WAY · STAY A LITTLE</span></div>
      {hero ? <Link href={`/stays/${encodeURIComponent(hero.slug)}`} className="stay-hero-feature"><span className="stay-hero-photo">{heroImage?.url || hero.thumbnail ? <Image src={heroImage?.url || hero.thumbnail} alt={heroImage?.altText || hero.title} fill priority sizes="(max-width: 760px) 100vw, 60vw" /> : <span className="stay-image-placeholder">Photographs not yet available</span>}</span><span className="stay-hero-label"><span>{hero.title}<small>{hero.property?.location?.publicLocationLabel}</small></span><span aria-hidden="true">↗</span></span></Link> : <div className="stay-hero-empty"><p>{error ? 'The homes are taking a moment to load.' : 'The next chapter is on its way.'}</p><Link href="/search">{error ? 'Try browsing again' : 'Check for published homes'}</Link></div>}
    </section>
    <section className="stay-shell stay-home-search" aria-label="Plan your stay"><SearchForm compact /></section>
    <section className="stay-shell stay-edit" aria-labelledby="featured-stays"><header className="stay-section-head"><div><p className="stay-overline">A place of your own</p><h2 id="featured-stays">Homes worth<br />the journey.</h2></div><div><p>See the rooms, read the house notes, and find the fit for your stay.</p><Link className="stay-text-link" href="/collections">Explore the collections ↗</Link></div></header>
      {error ? <div className="stay-notice" role="alert"><h3>We couldn’t load the homes.</h3><p>Try again in a moment.</p><Link href="/search">Retry search</Link></div> : results.length ? <div className="stay-card-grid">{results.slice(0, 5).map((stay, index) => <StayCard key={stay.id} stay={stay} priority={index === 0} />)}</div> : <div className="stay-empty"><h3>No homes are published yet.</h3><p>Come back soon, or contact us about your plans.</p><Link href="/help">Contact & help</Link></div>}
    </section>
    <section className="stay-editorial-note"><div className="stay-shell stay-editorial-note-inner"><div><p className="stay-overline">From first look to front door</p><h2>A considered stay.<br />A clear next step.</h2></div><ol className="stay-hosting-notes"><li><strong>Find your fit</strong><span>Compare rooms, amenities, and house rules.</span></li><li><strong>Know the full quote</strong><span>Review your dates, fees, taxes, and separate deposit before reserving.</span></li><li><strong>Keep your trip close</strong><span>Your private link brings together the booking, agreement, and next steps.</span></li></ol><Link href="/help">How booking works ↗</Link></div></section>
  </main></StorefrontShell>;
}
export default StorefrontLandingPage;
