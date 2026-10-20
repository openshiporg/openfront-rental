import Link from 'next/link';

import { SectionNav } from '../../components/Journey';
import { LegalLinks, legalDocuments } from '../../components/LegalLinks';
import { StorefrontShell } from '../../components/StorefrontShell';
import { getPublicMarketplaceSettings } from '../../lib/data/marketplace';
import { depositPolicyCopy, paymentPolicyCopy, refundPolicyCopy } from '../../lib/payment-copy';

const topics = [{ id: 'quote', label: 'Price & quote' }, { id: 'cancellation', label: 'Cancellation' }, { id: 'rules', label: 'House rules' }, { id: 'privacy', label: 'Your information' }];

export async function PoliciesPage() {
  const settings = await getPublicMarketplaceSettings();
  const legal = settings.status === 'published' ? settings : null;
  const documents = legalDocuments(legal);
  const cardEnabled = legal?.testBookingsAvailable === true;
  return <StorefrontShell activeNav="help"><main id="stay-main" className="stay-shell">
    <header className="stay-page-head">
      <p className="stay-overline">Know before you go</p>
      <h1>Clear terms, <em>considered</em> stays</h1>
      <p>A guide to the booking information on this website. Each home and reservation has its own captured terms; this page doesn’t replace them.</p>
    </header>
    <div className="stay-help-layout">
      <div className="stay-help-toc"><p>Policies</p><SectionNav items={topics} label="Policy topics" /></div>
      <div className="stay-articles">
        <section id="quote" className="stay-article">
          <h2>Your price & payment</h2>
          <p>Undated prices are base nightly rates. The calendar on each home shows the published rate for every night, and search previews use your itinerary. The saved quote itemizes lodging, fees, taxes, and the stay total. Review every charge before committing and message the host if anything is unclear.</p>
          <p>Saved quotes expire after 30 minutes or once used. They don’t reserve the home; booking checks availability again. Some homes need advance notice before arrival or only take bookings a set time ahead; the calendar shows the dates you can choose.</p>
          <p>{paymentPolicyCopy(cardEnabled)} {depositPolicyCopy}</p>
        </section>
        <section id="cancellation" className="stay-article">
          <h2>Cancellation & refunds</h2>
          <p>Read the home’s policy in the dated quote and in the agreement captured for your reservation. Cancellation conditions can differ by home and rate. This website doesn’t promise a universal free-cancellation window or an automatic full refund.</p>
          <p>{refundPolicyCopy} Message the host with any question about an amount due or a refund.</p>
        </section>
        <section id="rules" className="stay-article">
          <h2>House rules & agreements</h2>
          <p>Capacity, pet restrictions, arrival and departure times, and house rules appear in the home details. Confirm specific accessibility and sleeping arrangements with the host if they aren’t listed. Only request a stay that fits your party.</p>
          <p>The private agreement shows the captured terms and records a typed-name signature with a timestamp. Signing doesn’t collect payment or verify identity. Message the host if the terms need clarification before signing.</p>
        </section>
        <section id="privacy" className="stay-article">
          <h2>Keeping trip information private</h2>
          <p>Guest access uses private trip and agreement links. Anyone holding a valid link can see its permitted details, so keep the full links private. If you lose a link, the Your trip page explains how to get back to your booking.</p>
          <p>Contact details entered at booking are sent to the host. Arrival notes should contain only information needed for your stay. Card details are entered in Stripe’s secure form and are never stored by this website.</p>
          {documents.privacyPolicy || documents.termsOfUse
            ? <LegalLinks context="booking" {...documents} />
            : <p>The host’s formal privacy notice and legal documents aren’t published on this page. Contact the published support address for the host’s applicable documents and any information request.</p>}
          <Link className="stay-text-link" href="/help">Contact & policy questions</Link>
        </section>
      </div>
    </div>
  </main></StorefrontShell>;
}
