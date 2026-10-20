import { X } from 'lucide-react';
import Link from 'next/link';

import { CompareResults } from '../../components/CompareResults';
import { SearchForm } from '../../components/SearchForm';
import { StorefrontShell } from '../../components/StorefrontShell';
import { searchPublicStays } from '../../lib/data/stays';
import { isIsoDate, rangeLabel } from '../../lib/dates';
import { MAX_RESULT_INDEX, countParam, searchQuery, single, type SearchParams } from '../../lib/navigation';
import { searchResultCopy } from '../../lib/search-copy';
import { getStorefrontLocale } from '../../lib/data/storefront-locale';

export async function StaySearchPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const locale = await getStorefrontLocale();
  const params = (await searchParams) || {};
  const input = { destination: single(params.destination), checkIn: single(params.checkIn), checkOut: single(params.checkOut), adults: Math.max(countParam(params.adults, 2), 1), children: countParam(params.children, 0, 12), infants: countParam(params.infants, 0, 5), pets: countParam(params.pets, 0, 4), bedrooms: countParam(params.bedrooms), instantBook: single(params.instantBook) === 'true' ? true : single(params.instantBook) === 'false' ? false : undefined };
  // The server ranks up to 5,000 matching homes; every page of that window is reachable,
  // including the last one (homes 4,993–5,000). Past 5,000 the server asks to narrow the search.
  const offset = Math.floor(countParam(params.offset, 0, MAX_RESULT_INDEX) / 12) * 12;
  const collection = single(params.collection);
  const response = await searchPublicStays({ ...input, ...(collection ? { collectionSlug: collection } : {}), offset, limit: 12 });
  const totalCount = response.totalCount;
  const results = response.results;
  const lastPageOffset = totalCount > 0 ? Math.floor((totalCount - 1) / 12) * 12 : 0;
  const query = searchQuery(params);
  const copy = searchResultCopy({ totalCount, error: response.error, checkIn: input.checkIn, checkOut: input.checkOut });
  const without = (updates: Record<string, string>) => `/search?${searchQuery(params, { ...updates, offset: '' })}`;
  const chips = [
    input.destination ? { label: `“${input.destination}”`, href: without({ destination: '' }) } : null,
    isIsoDate(input.checkIn) && isIsoDate(input.checkOut) && input.checkOut > input.checkIn ? { label: rangeLabel(locale, input.checkIn, input.checkOut), href: without({ checkIn: '', checkOut: '' }) } : null,
    input.bedrooms ? { label: `${input.bedrooms}+ bedrooms`, href: without({ bedrooms: '' }) } : null,
    input.instantBook !== undefined ? { label: input.instantBook ? 'Instant confirmation' : 'Host approval', href: without({ instantBook: '' }) } : null,
    collection ? { label: `Collection: ${collection.replaceAll('-', ' ')}`, href: without({ collection: '' }) } : null,
  ].filter(Boolean) as { label: string; href: string }[];

  return <StorefrontShell activeNav="search"><main id="stay-main" className="stay-shell stay-search-page">
    <header className="stay-page-head stay-page-head-split">
      <div>
        <p className="stay-overline">Every published home</p>
        <h1>Find your <em>place</em></h1>
      </div>
      <p>Room for your people and a setting that feels right. Add dates to see each home’s total for your stay.</p>
    </header>
    <SearchForm params={params} />
    {chips.length ? (
      <div className="stay-chips" aria-label="Active filters">
        {chips.map(chip => <span className="stay-chip" key={chip.label}>{chip.label}<Link href={chip.href} aria-label={`Remove ${chip.label}`}><X size={13} aria-hidden="true" /></Link></span>)}
        {chips.length > 1 ? <Link className="stay-chip" href="/search">Clear all</Link> : null}
      </div>
    ) : null}

    <div className="stay-results-bar">
      <h2>{copy.heading}</h2>
      <p>{copy.description}</p>
    </div>

    {response.error
      ? <div className="stay-alert stay-alert-warn" role="alert"><div><h3>We couldn’t complete this search.</h3><p>{response.error} <Link href={`/search?${query}`}>Try again</Link> · <Link href="/search">Reset search</Link></p></div></div>
      : results.length
        ? <CompareResults stays={results} query={query} />
        : <div className="stay-empty">
            <h2>No homes match this search.</h2>
            <p>Try fewer filters, another destination, or different dates. Your choices are still in the search bar above.</p>
            <div className="stay-actions">
              {input.checkIn ? <Link className="stay-button" href={without({ checkIn: '', checkOut: '' })}>Browse without dates</Link> : null}
              <Link className="stay-button stay-button-quiet" href="/search">Clear all filters</Link>
              <Link className="stay-text-link" href="/help">Ask for help</Link>
            </div>
          </div>}

    {!response.error && (offset > 0 || offset + results.length < totalCount) ? (
      <nav className="stay-pagination" aria-label="Search pages">
        {offset > 0 ? <Link className="stay-button stay-button-quiet" href={`/search?${searchQuery(params, { offset: String(Math.max(offset - 12, 0)) })}`}>← Previous</Link> : <span />}
        <span>{results.length ? `${offset + 1}–${offset + results.length} of ${totalCount}` : <>No homes on this page · {totalCount} matches · <Link href={`/search?${searchQuery(params, { offset: String(lastPageOffset) })}`}>Last page</Link></>}</span>
        {offset + results.length < totalCount ? <Link className="stay-button stay-button-quiet" href={`/search?${searchQuery(params, { offset: String(offset + 12) })}`}>Next →</Link> : <span />}
      </nav>
    ) : null}
    <p className="stay-fine-print">Price previews don’t hold a home. Availability and the final total are confirmed in your saved quote.</p>
  </main></StorefrontShell>;
}
export default StaySearchPage;
