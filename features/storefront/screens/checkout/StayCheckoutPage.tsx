import { FileSignature, HandCoins, ScrollText, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { GuestBookingForm, QuoteCountdown } from '../../components/GuestForms';
import { BookingSteps, UnavailableStay } from '../../components/Journey';
import { PolicyDetails, QuoteSummary } from '../../components/QuoteSummary';
import { StayImage as Image } from '../../components/StayImage';
import { StorefrontShell } from '../../components/StorefrontShell';
import { getGuestAccount } from '../../lib/data/guest';
import { getPublicMarketplaceSettings } from '../../lib/data/marketplace';
import { LegalLinks, legalDocuments } from '../../components/LegalLinks';
import { checkoutReceiptKeyFor, recoverCheckoutReceipt } from '../../lib/data/checkout-receipt';
import { getPublicStayQuote } from '../../lib/data/stays';
import { longDate } from '../../lib/dates';
import { formatGuestParty, formatStayDate } from '../../lib/format';
import { searchQuery } from '../../lib/navigation';
import { publicTokenUnavailableMessage } from '../../lib/public-token-copy';
import { getStorefrontLocale } from '../../lib/data/storefront-locale';

export async function StayCheckoutPage({ params }: { params: Promise<{ quoteToken: string }> }) {
  const locale = await getStorefrontLocale();
  const { quoteToken } = await params;
  const { quote } = await getPublicStayQuote(quoteToken);
  if (!quote) {
    // This browser already booked this quote (lost response, refresh or expiry): same receipt.
    const receipt = await recoverCheckoutReceipt(quoteToken);
    if (receipt) redirect(receipt);
  }
  if (!quote) return <StorefrontShell><UnavailableStay title="This quote is no longer available.">{publicTokenUnavailableMessage('quote')} If you already submitted a booking, use Find my trip with your confirmation code and email before reserving again.</UnavailableStay></StorefrontShell>;
  const { account } = await getGuestAccount();
  const settings = await getPublicMarketplaceSettings();
  const legal = settings.status === 'published' ? settings : null;
  const documents = legalDocuments(legal);
  const testBookings = legal?.testBookingsAvailable === true;
  const listing = quote.listing || {};
  const property = listing.property || {};
  const query = searchQuery({ checkIn: quote.checkInDate, checkOut: quote.checkOutDate, adults: String(quote.adults), children: String(quote.children || 0), infants: String(quote.infants || 0), pets: String(quote.pets || 0) });
  const editHref = `/stays/${encodeURIComponent(listing.slug)}?${query}#book`;
  const image = listing.media?.[0];
  const nights = quote.breakdown?.numberOfNights;
  const expiry = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(quote.expiresAt));
  const instant = Boolean(listing.instantBook);
  const signInHref = `/account/sign-in?next=${encodeURIComponent(`/checkout/${quoteToken}`)}`;
  const paymentTitle = instant ? 'Payment arranged with the host' : 'No charge until the host confirms';
  const paymentBody = (instant
    ? 'Your reservation starts unpaid. Agree the payment method and timing with your host after confirmation. Any security deposit is separate.'
    : 'Nothing is charged while the host reviews your request. Once they confirm, agree the payment method and timing with them. Any security deposit is separate.')
    + (testBookings ? ' Want to try card checkout instead? Choose a test booking below: it holds no dates and takes no real money.' : '');
  // This browser's saved key for the quote, or a new one: resubmitting or reloading after a
  // lost response returns the same booking.
  const receiptKey = await checkoutReceiptKeyFor(quoteToken);
  const dateLabel = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? longDate(locale, value) : formatStayDate(locale, value);

  return <StorefrontShell><main id="stay-main" className="stay-shell stay-checkout-page">
    <BookingSteps step={2} />
    <header className="stay-page-head">
      <p className="stay-overline">Quote {quote.quoteNumber}</p>
      <h1>{instant ? <>Review and <em>reserve</em></> : <>Review and <em>request</em></>}</h1>
      <p>Check your stay and leave your contact details. {instant ? 'This home offers instant confirmation.' : 'The host reviews your request before confirming.'}</p>
    </header>

    <div className="stay-checkout-layout">
      <div>
        <section className="stay-panel" aria-labelledby="itinerary-title">
          <h2 id="itinerary-title"><span className="stay-panel-num">1</span>Your stay</h2>
          <dl className="stay-itinerary">
            <div><dt>Check-in</dt><dd>{dateLabel(quote.checkInDate)}<small>{property.checkInFrom ? `From ${property.checkInFrom}${property.checkInUntil ? ` until ${property.checkInUntil}` : ''}` : 'Arrival time confirmed with the host'}</small></dd></div>
            <div><dt>Checkout</dt><dd>{dateLabel(quote.checkOutDate)}<small>{property.checkOutBy ? `By ${property.checkOutBy}` : 'Departure time confirmed with the host'}</small></dd></div>
            <div className="is-wide"><dt>Guests</dt><dd>{formatGuestParty({ adults: quote.adults, children: quote.children || 0, infants: quote.infants || 0, pets: quote.pets || 0 })}{nights ? <small>{nights} {nights === 1 ? 'night' : 'nights'}{property.timezone ? ` · times local to the home (${property.timezone.replaceAll('_', ' ')})` : ''}</small> : null}</dd></div>
          </dl>
          <div className="stay-panel-foot">
            <Link className="stay-text-link" href={editHref}>Edit dates & guests</Link>
            <span className="stay-form-note">Quote valid until <time dateTime={quote.expiresAt}>{expiry} UTC</time>. It saves the price; it doesn’t hold the home.</span>
          </div>
        </section>

        <section className="stay-panel" aria-labelledby="before-reserving">
          <h2 id="before-reserving"><span className="stay-panel-num">2</span>Before you {instant ? 'reserve' : 'request'}</h2>
          <div className="stay-terms-list">
            <div><HandCoins size={20} strokeWidth={1.6} aria-hidden="true" /><div><h3>{paymentTitle}</h3><p>{paymentBody}</p></div></div>
            <div><Undo2 size={20} strokeWidth={1.6} aria-hidden="true" /><div><h3>Cancellation</h3><PolicyDetails policy={quote.cancellationPolicy} /></div></div>
            {listing.houseRules?.length ? <div><ScrollText size={20} strokeWidth={1.6} aria-hidden="true" /><div><h3>House rules</h3><details className="stay-disclosure"><summary>Review {listing.houseRules.length} house {listing.houseRules.length === 1 ? 'rule' : 'rules'}</summary><ul className="stay-rules">{listing.houseRules.map((rule: any) => <li key={rule.id}><div><strong>{rule.title}</strong>{rule.description ? <span>{rule.description}</span> : null}</div></li>)}</ul></details></div></div> : null}
            <div><FileSignature size={20} strokeWidth={1.6} aria-hidden="true" /><div><h3>Your stay agreement</h3><p>Available right after you {instant ? 'reserve' : 'send the request'}. Keep the private trip and agreement links.</p></div></div>
          </div>
          <LegalLinks context="booking" {...documents} />
        </section>

        <section className="stay-panel" aria-labelledby="guest-details">
          <h2 id="guest-details"><span className="stay-panel-num">3</span>Who’s coming?</h2>
          <GuestBookingForm token={quoteToken} termsVersion={quote.termsVersion || ''} receiptKey={receiptKey} expiresAt={quote.expiresAt} instantBook={instant} editHref={editHref} testBookings={testBookings} termsOfUse={documents.termsOfUse} privacyPolicy={documents.privacyPolicy} account={account ? { name: account.name, email: account.email } : null} signInHref={signInHref} />
        </section>
      </div>

      <aside className="stay-receipt" aria-labelledby="quote-summary">
        {image?.url ? <div className="stay-receipt-photo"><Image src={image.url} alt={image.altText || listing.title} fill sizes="(max-width: 900px) 100vw, 420px" /></div> : null}
        <div className="stay-receipt-body">
          <p className="stay-overline">{property.location?.publicLocationLabel || 'Your stay'}</p>
          <h2 id="quote-summary">{listing.title}</h2>
          <div className="stay-receipt-meta"><span>Quote {quote.quoteNumber}</span><QuoteCountdown expiresAt={quote.expiresAt} /></div>
          <QuoteSummary quote={quote} locale={locale} />
          <Link className="stay-text-link" href={`/help?stay=${encodeURIComponent(listing.slug || '')}#message-host`}>Questions before you {instant ? 'reserve' : 'request'}? Message the host</Link>
        </div>
      </aside>
    </div>
  </main></StorefrontShell>;
}
export default StayCheckoutPage;
