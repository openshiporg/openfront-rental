import Link from 'next/link';
import { CompareResults } from '../../components/CompareResults';
import { SearchForm } from '../../components/SearchForm';
import { StorefrontShell } from '../../components/StorefrontShell';
import { browsePublicCatalogue, searchPublicStays } from '../../lib/data/stays';
import { countParam, searchQuery, single, type SearchParams } from '../../lib/navigation';
import { searchResultCopy } from '../../lib/search-copy';

export async function StaySearchPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = (await searchParams) || {};
  const input = { destination: single(params.destination), checkIn: single(params.checkIn), checkOut: single(params.checkOut), adults: Math.max(countParam(params.adults, 2), 1), children: countParam(params.children, 0, 12), infants: countParam(params.infants, 0, 5), pets: countParam(params.pets, 0, 4), bedrooms: countParam(params.bedrooms), instantBook: single(params.instantBook) === 'true' ? true : single(params.instantBook) === 'false' ? false : undefined };
  const offset = Math.floor(countParam(params.offset, 0, 240) / 12) * 12;
  const collection = single(params.collection);
  const response = collection ? await browsePublicCatalogue(input) : await searchPublicStays({ ...input, offset, limit: 12 });
  const matching = collection ? response.results.filter(stay => stay.collections?.some(item => item.slug === collection)) : response.results;
  const totalCount = collection ? matching.length : response.totalCount;
  const results = collection ? matching.slice(offset, offset + 12) : matching;
  const query = searchQuery(params);
  const copy = searchResultCopy({ totalCount, error: response.error, checkIn: input.checkIn, checkOut: input.checkOut });
  return <StorefrontShell activeNav="search"><main id="stay-main" className="stay-shell stay-search-page">
    <header className="stay-page-head"><p className="stay-overline">The Housekind homes</p><h1>Find your place.</h1><p>Room for your people. A setting that feels right. Start with the details that matter to you.</p></header>
    <SearchForm params={params} />
    {collection ? <div className="stay-filter-summary"><span>Collection: {collection.replaceAll('-', ' ')}</span><Link href={`/search?${searchQuery(params, { collection: '', offset: '' })}`}>Remove collection filter</Link></div> : null}
    <div className="stay-results-heading"><h2>{copy.heading}</h2><p>{copy.description}</p></div>
    {response.error ? <div className="stay-notice" role="alert"><h3>We couldn’t complete this search.</h3><p>{response.error}</p><Link href={`/search?${query}`}>Try again</Link> · <Link href="/search">Reset search</Link></div> : results.length ? <CompareResults key={query} stays={results} query={query} /> : <div className="stay-empty"><h2>No homes match this search.</h2><p>Try fewer filters, another destination, or different dates. Your choices are still in the form above.</p><div className="stay-inline-actions"><Link href={`/search?${searchQuery(params, { checkIn: '', checkOut: '', offset: '' })}`}>Browse without dates</Link><Link href="/search">Clear all filters</Link><Link href="/help">Ask for help</Link></div></div>}
    {!response.error && (offset > 0 || offset + results.length < totalCount) ? <nav className="stay-pagination" aria-label="Search pages">{offset > 0 ? <Link href={`/search?${searchQuery(params, { offset: String(Math.max(offset - 12, 0)) })}`}>← Previous homes</Link> : <span />}<span>{results.length ? `${offset + 1}–${offset + results.length} of ${totalCount}` : `No homes on this page · ${totalCount} matches`}</span>{offset + results.length < totalCount ? <Link href={`/search?${searchQuery(params, { offset: String(offset + 12) })}`}>Next homes →</Link> : <span />}</nav> : null}
    <p className="stay-form-note">Browsing currently covers up to 250 published listings. A price preview is not an inventory hold.</p>
  </main></StorefrontShell>;
}
export default StaySearchPage;
