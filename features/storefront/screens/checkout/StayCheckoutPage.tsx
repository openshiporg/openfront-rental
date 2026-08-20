import Image from 'next/image';
import Link from 'next/link';

import { StorefrontShell } from '../../components/StorefrontShell';
import { bookStayAction } from '../../lib/data/stay-actions';
import { getPublicStayQuote } from '../../lib/data/stays';
import { formatMoney } from '../../lib/format';

export async function StayCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ quoteToken: string }>;
  searchParams?: Promise<{ error?: string }>;
}) {
  const { quoteToken } = await params;
  const query = await searchParams;
  const { quote, error } = await getPublicStayQuote(quoteToken);
  if (!quote) {
    return <StorefrontShell><main className="stay-shell stay-token-page"><h1>This quote is no longer available.</h1><p>{error || 'Quotes expire after 30 minutes or after they are used.'}</p><Link href="/search">Start a new search</Link></main></StorefrontShell>;
  }
  const listing = quote.listing || {};
  const breakdown = quote.breakdown || {};
  const image = listing.media?.[0];

  return (
    <StorefrontShell>
      <main className="stay-shell stay-checkout-page">
        <header className="stay-page-head"><p className="stay-overline">Quote {quote.quoteNumber}</p><h1>Complete your reservation</h1><p>Your dates and total are held until {new Intl.DateTimeFormat('en-US', { timeStyle: 'short' }).format(new Date(quote.expiresAt))}.</p></header>
        <div className="stay-checkout-layout">
          <section className="stay-guest-form" aria-labelledby="guest-details">
            <h2 id="guest-details">Guest details</h2>
            {query?.error ? <div className="stay-form-error" role="alert">{query.error}</div> : null}
            <form action={bookStayAction} className="stay-book-form">
              <input type="hidden" name="quoteToken" value={quoteToken} />
              <label>Full name<input required name="guestName" autoComplete="name" /></label>
              <label>Email address<input required name="guestEmail" type="email" autoComplete="email" /></label>
              <label>Phone number<input name="guestPhone" type="tel" autoComplete="tel" /></label>
              <label>Arrival notes<textarea name="guestNotes" rows={4} placeholder="Accessibility needs, approximate arrival, or a note for your host" /></label>
              <button type="submit">Reserve this stay</button>
            </form>
            <p className="stay-form-note">The local runtime uses operator-recorded payment only. Public checkout never marks a reservation paid without verified settlement.</p>
          </section>

          <aside className="stay-quote-card" aria-labelledby="quote-summary">
            {image?.url ? <div className="stay-quote-image"><Image src={image.url} alt={image.altText || listing.title} fill sizes="420px" /></div> : null}
            <h2 id="quote-summary">{listing.title}</h2>
            <p>{listing.property?.location?.publicLocationLabel}</p>
            <dl className="stay-price-lines">
              <div><dt>{breakdown.numberOfNights} nights</dt><dd>{formatMoney(quote.lodgingSubtotalCents, quote.currencyCode)}</dd></div>
              {(breakdown.fees || []).map((fee: any, index: number) => <div key={`${fee.name}-${index}`}><dt>{fee.name}</dt><dd>{formatMoney(fee.amountCents, quote.currencyCode)}</dd></div>)}
              {(breakdown.taxes || []).map((tax: any, index: number) => <div key={`${tax.name}-${index}`}><dt>{tax.name}</dt><dd>{formatMoney(tax.amountCents, quote.currencyCode)}</dd></div>)}
              <div className="stay-price-total"><dt>Total</dt><dd>{formatMoney(quote.totalAmountCents, quote.currencyCode)}</dd></div>
            </dl>
            {quote.securityDepositCents > 0 ? <p className="stay-deposit-note">A refundable {formatMoney(quote.securityDepositCents, quote.currencyCode)} security deposit is recorded separately from the stay total.</p> : null}
            <p className="stay-policy-note">{quote.cancellationPolicy?.summary}</p>
          </aside>
        </div>
      </main>
    </StorefrontShell>
  );
}

export default StayCheckoutPage;
