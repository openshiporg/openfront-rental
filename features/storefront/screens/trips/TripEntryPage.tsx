import { Compass, KeyRound, UserRound } from 'lucide-react';
import Link from 'next/link';

import { RecoverTripForm } from '../../components/GuestJourneyForms';
import { PrivateTripEntry } from '../../components/PrivateTripTools';
import { StorefrontShell } from '../../components/StorefrontShell';
import { getGuestAccount } from '../../lib/data/guest';

export async function TripEntryPage() {
  const { account } = await getGuestAccount();
  return <StorefrontShell servicing activeNav="trips"><main id="stay-main" className="stay-shell">
    <header className="stay-page-head">
      <p className="stay-overline">Welcome back</p>
      <h1>Your stay, <em>close at hand</em></h1>
      <p>Open your saved private trip link, or find your booking with its confirmation code and the email used to book.</p>
    </header>
    <div className="stay-entry-layout">
      <div>
        <section className="stay-entry-card" aria-labelledby="open-trip">
          <h2 id="open-trip">Open your trip</h2>
          <PrivateTripEntry />
        </section>
        <section id="find-trip" className="stay-entry-card stay-alert-spaced" aria-labelledby="find-trip-title">
          <h2 id="find-trip-title">Find my trip</h2>
          <p className="stay-muted">Lost the link? Your confirmation code starts with STAY- and appears on your trip page and booking records.</p>
          <RecoverTripForm signedIn={Boolean(account)} />
        </section>
      </div>
      <section className="stay-entry-notes" aria-label="About trip access">
        <div><KeyRound size={20} strokeWidth={1.6} aria-hidden="true" /><div><h3>One link, your whole stay</h3><p>Your private trip link opens your reservation, agreement, payments, messages, and next steps. Keep it private.</p></div></div>
        <div><UserRound size={20} strokeWidth={1.6} aria-hidden="true" /><div><h3>{account ? 'Your account' : 'Prefer an account?'}</h3><p>{account ? 'Trips saved to your account open from there at any time.' : 'Sign in to keep your trips together and open them without a link.'}</p><Link className="stay-text-link" href={account ? '/account' : '/account/sign-in'}>{account ? 'Go to your account' : 'Sign in or create an account'}</Link></div></div>
        <div><Compass size={20} strokeWidth={1.6} aria-hidden="true" /><div><h3>Still planning?</h3><p>Browse homes and check your dates against each night’s rate.</p><Link className="stay-text-link" href="/search">Explore the homes</Link></div></div>
      </section>
    </div>
  </main></StorefrontShell>;
}
