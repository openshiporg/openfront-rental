import { StayCard } from '../../components/StayCard';
import { StorefrontShell } from '../../components/StorefrontShell';
import { searchPublicStays } from '../../lib/data/stays';

function single(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : '';
}

export async function StaySearchPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) || {};
  const destination = single(params.destination);
  const checkIn = single(params.checkIn);
  const checkOut = single(params.checkOut);
  const adults = Math.max(Number.parseInt(single(params.adults) || '2', 10) || 2, 1);
  const children = Math.max(Number.parseInt(single(params.children) || '0', 10) || 0, 0);
  const pets = Math.max(Number.parseInt(single(params.pets) || '0', 10) || 0, 0);
  const { results, totalCount, error } = await searchPublicStays({ destination, checkIn, checkOut, adults, children, pets });
  const listingQuery = new URLSearchParams({
    ...(destination ? { destination } : {}),
    ...(checkIn ? { checkIn } : {}),
    ...(checkOut ? { checkOut } : {}),
    adults: String(adults),
    children: String(children),
    pets: String(pets),
  }).toString();

  return (
    <StorefrontShell activeNav="search">
      <main className="stay-shell stay-search-page">
        <header className="stay-page-head">
          <h1>Find your place</h1>
          <p>{checkIn && checkOut ? `${totalCount} homes available for these dates.` : `${totalCount} published homes. Add dates to see live availability and total pricing.`}</p>
        </header>
        <form action="/search" method="get" className="stay-search-form stay-search-form-wide" role="search">
          <label>Destination<input name="destination" defaultValue={destination} placeholder="City, region, or home" /></label>
          <label>Check in<input required name="checkIn" type="date" defaultValue={checkIn} /></label>
          <label>Check out<input required name="checkOut" type="date" defaultValue={checkOut} /></label>
          <label>Adults<input required name="adults" type="number" min="1" max="16" defaultValue={adults} /></label>
          <label>Children<input name="children" type="number" min="0" max="12" defaultValue={children} /></label>
          <label>Pets<input name="pets" type="number" min="0" max="4" defaultValue={pets} /></label>
          <button type="submit">Update search</button>
        </form>
        {error ? <div className="stay-notice" role="alert">Search could not be completed: {error}</div> : null}
        {!error && results.length ? (
          <section className="stay-card-grid stay-results" aria-label="Available homes">
            {results.map((stay, index) => <StayCard key={stay.id} stay={stay} priority={index < 2} searchQuery={listingQuery} />)}
          </section>
        ) : !error ? (
          <div className="stay-empty"><h2>No homes match those dates.</h2><p>Try a nearby destination or a different stay window.</p></div>
        ) : null}
      </main>
    </StorefrontShell>
  );
}

export default StaySearchPage;
