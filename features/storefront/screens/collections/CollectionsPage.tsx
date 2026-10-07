import { StayImage as Image } from '../../components/StayImage';
import Link from 'next/link';
import { StorefrontShell } from '../../components/StorefrontShell';
import { StayCard } from '../../components/StayCard';
import { browsePublicCatalogue } from '../../lib/data/stays';
import { searchQuery, type SearchParams } from '../../lib/navigation';

export async function CollectionsPage({ params, searchParams }: { params?: Promise<{ slug: string }>; searchParams?: Promise<SearchParams> }) {
  const slug = params ? (await params).slug : '';
  const query = (await searchParams) || {};
  const { results, error } = await browsePublicCatalogue({ adults: 1 });
  const collections = [...new Map(results.flatMap(stay => (stay.collections || []).map(collection => [collection.slug, collection] as const))).values()];
  const collection = collections.find(item => item.slug === slug);
  const homes = results.filter(stay => stay.collections?.some(item => item.slug === slug));
  return <StorefrontShell activeNav="collections"><main id="stay-main" className="stay-shell stay-search-page"><header className="stay-page-head"><p className="stay-overline">The collections</p><h1>{slug ? collection?.name || 'Collection unavailable' : 'A different kind of getaway.'}</h1><p>{slug ? 'Explore the homes in this collection, then add your dates to check the fit.' : 'Follow your curiosity. These collections bring together homes grouped by their hosts.'}</p></header>
    {error ? <div role="alert" className="stay-notice"><h2>Collections couldn’t be loaded.</h2><p>{error}</p><Link href="/collections">Try again</Link></div> : slug ? <><div className="stay-inline-actions"><Link href="/collections">← All collections</Link>{collection ? <Link className="stay-button" href={`/search?${searchQuery(query, { collection: slug, offset: '' })}`}>Search this collection ↗</Link> : <Link href="/search">Browse all homes</Link>}</div><div className="stay-card-grid stay-results">{homes.map(stay => <StayCard key={stay.id} stay={stay} searchQuery={searchQuery(query, { collection: slug })} />)}</div>{!homes.length ? <p className="stay-empty">No published homes are available in this collection.</p> : null}</> : collections.length ? <div className="stay-collection-grid">{collections.map((item, index) => { const home = results.find(stay => stay.collections?.some(c => c.slug === item.slug)); const photo = home?.media?.[0]; const homeCount = results.filter(stay => stay.collections?.some(c => c.slug === item.slug)).length; return <Link className="stay-collection-tile" key={item.slug} href={`/collections/${encodeURIComponent(item.slug)}${searchQuery(query) ? `?${searchQuery(query)}` : ''}`}><div className="stay-collection-photo">{photo?.url || home?.thumbnail ? <Image src={photo?.url || home?.thumbnail} alt={photo?.altText || home?.title || item.name} fill sizes="(max-width: 700px) 100vw, 50vw" /> : <span className="stay-image-placeholder">Explore the homes</span>}</div><div><span className="stay-overline">Collection {String(index + 1).padStart(2, '0')}</span><h2>{item.name} <span aria-hidden="true">↗</span></h2><p>{homeCount} published {homeCount === 1 ? 'home' : 'homes'}</p></div></Link>; })}</div> : <div className="stay-empty"><h2>The collections are still taking shape.</h2><p>You can browse every published home in the meantime.</p><Link href="/search">Browse the homes ↗</Link></div>}
    <p className="stay-form-note">Collections reflect up to 250 published listings. Availability depends on your dates and guest party.</p>
  </main></StorefrontShell>;
}
