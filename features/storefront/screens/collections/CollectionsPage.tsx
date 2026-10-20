import Link from 'next/link';

import { StayCard } from '../../components/StayCard';
import { StayImage as Image } from '../../components/StayImage';
import { StorefrontShell } from '../../components/StorefrontShell';
import { collectionCovers, searchPublicStays } from '../../lib/data/stays';
import { MAX_RESULT_INDEX, countParam, searchQuery, type SearchParams } from '../../lib/navigation';
import { getStorefrontLocale } from '../../lib/data/storefront-locale';

const COLLECTION_PAGE_SIZE = 24;

export async function CollectionsPage({ params, searchParams }: { params?: Promise<{ slug: string }>; searchParams?: Promise<SearchParams> }) {
  const locale = await getStorefrontLocale();
  const slug = params ? (await params).slug : '';
  const query = (await searchParams) || {};
  // Counts and members come from the server's complete collection filter, not a sample. Any
  // page of its 5,000-home window is reachable, including the last (homes 4,993–5,000).
  const offset = Math.floor(countParam(query.offset, 0, MAX_RESULT_INDEX) / COLLECTION_PAGE_SIZE) * COLLECTION_PAGE_SIZE;
  const index = await collectionCovers({ adults: 1 });
  const page = slug ? await searchPublicStays({ adults: 1, collectionSlug: slug, offset, limit: COLLECTION_PAGE_SIZE }) : null;
  const error = index.error || page?.error || null;
  const collections = index.collections;
  const collection = collections.find(item => item.slug === slug);
  const homes = page?.results || [];
  const homeCount = page?.totalCount ?? 0;
  const lastPageOffset = homeCount > 0 ? Math.floor((homeCount - 1) / COLLECTION_PAGE_SIZE) * COLLECTION_PAGE_SIZE : 0;
  const pageHref = (pageOffset: number) => `/collections/${encodeURIComponent(slug)}?${searchQuery(query, { offset: pageOffset ? String(pageOffset) : '' })}`;
  const carried = searchQuery(query, { offset: '' });

  return <StorefrontShell activeNav="collections"><main id="stay-main" className="stay-shell">
    {slug ? <nav className="stay-breadcrumb" aria-label="Breadcrumb"><Link href="/collections">Collections</Link><span aria-hidden="true">/</span><span aria-current="page">{collection?.name || 'Unavailable'}</span></nav> : null}
    <header className="stay-page-head stay-page-head-split">
      <div>
        <p className="stay-overline">{slug ? `${homeCount} ${homeCount === 1 ? 'home' : 'homes'}` : 'The collections'}</p>
        <h1>{slug ? collection?.name || 'Collection unavailable' : <>A different kind of <em>getaway</em></>}</h1>
      </div>
      <div>
        <p>{slug ? 'Explore the homes in this collection, then add your dates to check the fit.' : 'Follow your curiosity. Each collection gathers homes their hosts have grouped together.'}</p>
        {slug && collection ? <div className="stay-actions stay-head-actions"><Link className="stay-button" href={`/search?${searchQuery(query, { collection: slug, offset: '' })}`}>Search with dates</Link></div> : null}
      </div>
    </header>

    {error
      ? <div className="stay-alert stay-alert-warn" role="alert"><div><h2>Collections couldn’t be loaded.</h2><p>{error} <Link href="/collections">Try again</Link></p></div></div>
      : slug
        ? homes.length
          ? <>
              <div className="stay-results-grid">{homes.map((stay, index) => <StayCard locale={locale} key={stay.id} stay={stay} priority={index < 3} searchQuery={searchQuery(query, { collection: slug, offset: '' })} />)}</div>
              {offset > 0 || offset + homes.length < homeCount ? <nav className="stay-pagination" aria-label="Collection pages">
                {offset > 0 ? <Link className="stay-button stay-button-quiet" href={`/collections/${encodeURIComponent(slug)}?${searchQuery(query, { offset: String(Math.max(offset - COLLECTION_PAGE_SIZE, 0)) })}`}>← Previous</Link> : <span />}
                <span>{`${offset + 1}–${offset + homes.length} of ${homeCount}`}</span>
                {offset + homes.length < homeCount ? <Link className="stay-button stay-button-quiet" href={`/collections/${encodeURIComponent(slug)}?${searchQuery(query, { offset: String(offset + COLLECTION_PAGE_SIZE) })}`}>Next →</Link> : <span />}
              </nav> : null}
            </>
          : homeCount > 0 && offset > 0
            ? <div className="stay-empty"><h2>This page is past the last home.</h2><p>The collection has {homeCount} {homeCount === 1 ? 'home' : 'homes'} now.</p><div className="stay-actions"><Link className="stay-button" href={pageHref(lastPageOffset)}>Go to the last page</Link><Link className="stay-text-link" href={pageHref(0)}>First page</Link></div></div>
            : <div className="stay-empty"><h2>No published homes in this collection.</h2><p>It may have changed since you last visited.</p><div className="stay-actions"><Link className="stay-button" href="/search">Browse all homes</Link><Link className="stay-text-link" href="/collections">All collections</Link></div></div>
        : collections.length
          ? <div className="stay-collection-grid">{collections.map((item, index) => {
              const home = item.cover;
              const photo = home?.media?.[0];
              return (
                <Link className="stay-collection-tile" key={item.slug} href={`/collections/${encodeURIComponent(item.slug)}${carried ? `?${carried}` : ''}`}>
                  {photo?.url || home?.thumbnail ? <Image src={photo?.url || home!.thumbnail!} alt="" fill sizes="(max-width: 760px) 100vw, 50vw" priority={index < 2} /> : <span className="stay-image-placeholder">Explore the homes</span>}
                  <span className="stay-overline">Collection {String(index + 1).padStart(2, '0')} · {item.count} {item.count === 1 ? 'home' : 'homes'}</span>
                  <h2>{item.name}</h2>
                  <p>Explore the homes →</p>
                </Link>
              );
            })}</div>
          : <div className="stay-empty"><h2>The collections are still taking shape.</h2><p>You can browse every published home in the meantime.</p><Link className="stay-button" href="/search">Browse the homes</Link></div>}
    <p className="stay-fine-print">Availability depends on your dates and guest party.</p>
  </main></StorefrontShell>;
}
