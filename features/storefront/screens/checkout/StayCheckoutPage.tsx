import { StayImage as Image } from '../../components/StayImage';
import Link from 'next/link';
import { StorefrontShell } from '../../components/StorefrontShell';
import { BookingSteps, UnavailableStay } from '../../components/Journey';
import { GuestBookingForm } from '../../components/GuestForms';
import { PolicyDetails, QuoteSummary } from '../../components/QuoteSummary';
import { getPublicStayQuote } from '../../lib/data/stays';
import { formatStayDate } from '../../lib/format';
import { searchQuery } from '../../lib/navigation';
import { publicTokenUnavailableMessage } from '../../lib/public-token-copy';

export async function StayCheckoutPage({ params }: { params: Promise<{ quoteToken: string }> }) {
  const { quoteToken } = await params;
  const { quote } = await getPublicStayQuote(quoteToken);
  if (!quote) return <StorefrontShell><UnavailableStay title="This quote is no longer available.">{publicTokenUnavailableMessage('quote')} If you already submitted a booking, check your trip link or contact support before reserving again.</UnavailableStay></StorefrontShell>;
  const listing = quote.listing || {};
  const query = searchQuery({ checkIn: quote.checkInDate, checkOut: quote.checkOutDate, adults: String(quote.adults), children: String(quote.children || 0), infants: String(quote.infants || 0), pets: String(quote.pets || 0) });
  const image = listing.media?.[0];
  const expiry = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(quote.expiresAt));
  return <StorefrontShell><main id="stay-main" className="stay-shell stay-checkout-page"><BookingSteps step={2} /><header className="stay-page-head"><p className="stay-overline">Quote {quote.quoteNumber}</p><h1>A few details.<br />Then you’re closer.</h1><p>Review your stay and leave your contact details. {listing.instantBook ? 'This home offers instant confirmation.' : 'The host must approve this booking request.'}</p></header>
    <div className="stay-checkout-layout"><section className="stay-checkout-main"><section className="stay-itinerary" aria-labelledby="itinerary-title"><h2 id="itinerary-title">Your stay</h2><dl className="stay-trip-facts"><div><dt>Check in</dt><dd>{formatStayDate(quote.checkInDate)}</dd></div><div><dt>Check out</dt><dd>{formatStayDate(quote.checkOutDate)}</dd></div><div><dt>Guests</dt><dd>{quote.adults} adults · {quote.children || 0} children · {quote.infants || 0} infants · {quote.pets || 0} pets</dd></div></dl><Link className="stay-text-link" href={`/stays/${encodeURIComponent(listing.slug)}?${query}#book`}>Edit dates & guests</Link><p className="stay-form-note">Quote valid until <time dateTime={quote.expiresAt}>{expiry} UTC</time>. This saves the offered price; it does not hold the home. Availability is checked again when you reserve.</p></section>
    <section className="stay-checkout-terms" aria-labelledby="before-reserving"><h2 id="before-reserving">Before you reserve</h2><h3>Payment arranged with the host</h3><p>No online card payment is available. A reservation starts unpaid; agree the payment method and timing with the host.</p><h3>Cancellation terms</h3><PolicyDetails policy={quote.cancellationPolicy} />{listing.houseRules?.length ? <details><summary>Review the house rules</summary><ul className="stay-simple-list">{listing.houseRules.map((rule: any) => <li key={rule.id}><strong>{rule.title}</strong>{rule.description ? ` — ${rule.description}` : ''}</li>)}</ul></details> : null}<p className="stay-form-note">Your stay agreement is available after reservation. Keep the private trip and agreement links.</p></section>
    <section className="stay-guest-form" aria-labelledby="guest-details"><h2 id="guest-details">Who’s coming?</h2><GuestBookingForm token={quoteToken} expiresAt={quote.expiresAt} instantBook={Boolean(listing.instantBook)} /></section></section>
    <aside className="stay-quote-card" aria-labelledby="quote-summary">{image?.url ? <div className="stay-quote-image"><Image src={image.url} alt={image.altText || listing.title} fill sizes="(max-width: 900px) 100vw, 420px" /></div> : null}<p className="stay-overline">{listing.property?.location?.publicLocationLabel}</p><h2 id="quote-summary">{listing.title}</h2><QuoteSummary quote={quote} /><Link className="stay-text-link" href="/help">Questions before reserving? ↗</Link></aside></div>
  </main></StorefrontShell>;
}
export default StayCheckoutPage;
