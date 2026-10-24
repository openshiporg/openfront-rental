import { Building2, Clock, Mail, Phone } from 'lucide-react';
import Link from 'next/link';

import { InquiryForm } from '../../components/GuestJourneyForms';
import { SectionNav } from '../../components/Journey';
import { StorefrontShell } from '../../components/StorefrontShell';
import { phoneHref, resolveStorefrontBrand } from '../../lib/brand';
import { getPublicMarketplaceSettings } from '../../lib/data/marketplace';
import { getPublicStay } from '../../lib/data/stays';
import { single, type SearchParams } from '../../lib/navigation';
import { depositPolicyCopy, paymentPolicyCopy, refundPolicyCopy } from '../../lib/payment-copy';

const topics = [{ id: 'booking', label: 'Booking' }, { id: 'trip-links', label: 'Finding your trip' }, { id: 'arrival', label: 'Arrival' }, { id: 'changes', label: 'Changes' }, { id: 'payments', label: 'Payments & deposits' }];

export async function HelpPage({ searchParams }: { searchParams?: Promise<SearchParams> } = {}) {
  const query = (await searchParams) || {};
  const settings = await getPublicMarketplaceSettings();
  const brand = resolveStorefrontBrand(settings);
  const phone = brand?.phone ? phoneHref(brand.phone) : '';
  const published = settings.status === 'published' ? settings : null;
  const supportHours = published?.supportHours?.trim() || '';
  const officeAddress = published?.officeAddress?.trim() || '';
  // The requested home is kept with its resolution: a stale or unknown home is never turned
  // into a general question for some other host.
  const staySlug = single(query.stay).slice(0, 200);
  const lookup = staySlug && /^[a-z0-9-]+$/.test(staySlug) ? await getPublicStay(staySlug) : null;
  const stay = lookup?.stay || null;
  const stayState: 'none' | 'found' | 'unavailable' | 'error' = !staySlug ? 'none' : stay ? 'found' : lookup?.error ? 'error' : 'unavailable';
  const cardEnabled = published?.testBookingsAvailable === true;

  return <StorefrontShell servicing activeNav="help"><main id="stay-main" className="stay-shell">
    <header className="stay-page-head">
      <p className="stay-overline">Here for the details</p>
      <h1>A little help <em>along the way</em></h1>
      <p>From finding a home to finding the front door, start with the next step for your stay.</p>
    </header>
    <section id="message-host" className="stay-contact-band" aria-labelledby="contact-title">
      <div>
        <h2 id="contact-title">Message the host</h2>
        <p>Ask about a home before booking, or about anything else. Already booked? Message from your trip page so the host sees your booking.</p>
        <div className="stay-contact-links">
          {brand?.email ? <a href={`mailto:${brand.email}`}><Mail size={18} aria-hidden="true" />{brand.email}</a> : null}
          {brand?.phone && phone ? <a href={phone}><Phone size={18} aria-hidden="true" />{brand.phone}</a> : null}
          {supportHours ? <p><Clock size={18} aria-hidden="true" /> <span style={{ whiteSpace: 'pre-line' }}>{supportHours}</span></p> : null}
          {officeAddress ? <p><Building2 size={18} aria-hidden="true" /> <span style={{ whiteSpace: 'pre-line' }}>{officeAddress}</span></p> : null}
        </div>
      </div>
      {stayState === 'found' && stay
        ? <InquiryForm stay={staySlug} stayTitle={stay.title} />
        : <div className="stay-form" role={stayState === 'none' ? undefined : 'status'}>
          <p className="stay-form-note">{stayState === 'unavailable'
            ? 'That home isn’t listed right now, so a message about it can’t be sent here. If you’ve booked it, message the host from your trip page.'
            : stayState === 'error'
              ? 'That home couldn’t be loaded, so your message wasn’t started. Refresh to try again.'
              : 'To reach the right host, open the home your question is about and choose “Message the host” there. Already booked? Use your trip page.'}</p>
          {brand?.email || brand?.phone ? <p className="stay-form-note">For anything else, use the store’s contact details shown here.</p> : null}
          <Link className="stay-text-link" href={stayState === 'error' ? `/help?stay=${encodeURIComponent(staySlug)}#message-host` : '/search'}>{stayState === 'error' ? 'Try again' : 'Find the home'}</Link>
        </div>}
    </section>
    <div className="stay-help-layout">
      <div className="stay-help-toc"><p>Topics</p><SectionNav items={topics} label="Help topics" /></div>
      <div className="stay-articles">
        <section id="booking" className="stay-article">
          <p className="stay-overline">01 · Before booking</p>
          <h2>Choose with the details in view</h2>
          <p>Browse homes with or without dates. Add check-in, checkout, and everyone travelling for a price preview, then pick dates on a home’s calendar to see each night’s rate, fees, and taxes. Review the rooms, rules, cancellation policy, full price, and any separate deposit before reserving.</p>
          <p>A saved quote lasts 30 minutes. It doesn’t hold the home; availability is checked again when the reservation is submitted. Instant confirmation and host approval are different booking modes, shown before you commit.</p>
          <p>You can book as a guest or <Link href="/account/register">create an account</Link> to keep your trips together.</p>
          <Link className="stay-text-link" href="/search">Find a stay</Link>
        </section>
        <section id="trip-links" className="stay-article">
          <p className="stay-overline">02 · Returning to your stay</p>
          <h2>Get back to your booking</h2>
          <p>After booking, your private trip link opens the reservation, agreement, payments, and messages with your host. Save it somewhere only you can reach.</p>
          <p>Lost it, or a booking submission was interrupted? Use Find my trip with your confirmation code and booking email for a fresh link before reserving again. Signed-in guests can also open saved trips from their account.</p>
          <Link className="stay-text-link" href="/trips#find-trip">Find my trip</Link>
        </section>
        <section id="arrival" className="stay-article">
          <p className="stay-overline">03 · Arrival & during your stay</p>
          <h2>Make the arrival arrangements</h2>
          <p>Once your stay is confirmed, your trip page shows the exact address, check-in and checkout times, and any entry, parking, or access instructions from the host.</p>
          <p>For a lockout, an accessibility question, a problem with the home, or a change to your arrival time, message the host from your trip page.</p>
        </section>
        <section id="changes" className="stay-article">
          <p className="stay-overline">04 · When plans change</p>
          <h2>Ask for a change first</h2>
          <p>Use Request a change on your trip page for new dates, an extension, a different party, or another home. Your booking stays as it is until the host confirms the change and any price difference.</p>
          <p>Eligible pending and confirmed stays can be cancelled on the private trip page. The final confirmation immediately cancels the reservation and releases its dates.</p>
          <Link className="stay-text-link" href="/trips">Manage your trip</Link>
        </section>
        <section id="payments" className="stay-article">
          <p className="stay-overline">05 · Payment, deposit & refunds</p>
          <h2>Know what each record means</h2>
          <p>{paymentPolicyCopy(cardEnabled)} Never put card numbers or identity documents in messages or arrival notes.</p>
          <p>{depositPolicyCopy}</p>
          <p>{refundPolicyCopy(cardEnabled)}</p>
          <p>To question a deposit deduction or damage claim, message the host from your trip page and choose that topic.</p>
          <Link className="stay-text-link" href="/policies">Booking & policy guide</Link>
        </section>
      </div>
    </div>
  </main></StorefrontShell>;
}
