import { ArrowRight, CalendarDays, KeyRound, LogOut, Search, UserRound } from 'lucide-react';
import Link from 'next/link';

import { PasswordChangeForm, ProfileForm } from '../../components/AccountForms';
import { RecoverTripForm } from '../../components/GuestJourneyForms';
import { StorefrontShell } from '../../components/StorefrontShell';
import { signOutGuestAction } from '../../lib/data/account-actions';
import { openAccountTripAction } from '../../lib/data/guest-actions';
import { getGuestAccount } from '../../lib/data/guest';
import { formatMoney, formatStayDate, formatType } from '../../lib/format';
import { single, type SearchParams } from '../../lib/navigation';
import { getStorefrontLocale } from '../../lib/data/storefront-locale';

const accountErrors: Record<string, string> = {
  open: 'That trip couldn’t be opened. Refresh and try again.',
  revoked: 'Online access to that trip was turned off by the host. Send them a message from the help page.',
};

export async function AccountPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const locale = await getStorefrontLocale();
  const query = (await searchParams) || {};
  const requestedOffset = Number.parseInt(single(query.tripsOffset), 10);
  const { account, error } = await getGuestAccount(Number.isSafeInteger(requestedOffset) && requestedOffset > 0 ? requestedOffset : 0);
  const errorMessage = accountErrors[single(query.error)] || error;

  if (!account) {
    return <StorefrontShell servicing activeNav="account"><main id="stay-main" className="stay-shell">
      <header className="stay-page-head">
        <p className="stay-overline">Your account</p>
        <h1>Keep every stay <em>in one place</em></h1>
        <p>Sign in to see your trips, or find a booking with its confirmation code and email.</p>
      </header>
      {query.signedOut ? <div className="stay-alert stay-alert-ok" role="status"><p>You’re signed out.</p></div> : null}
      {errorMessage ? <div className="stay-alert stay-alert-danger" role="alert"><p>{errorMessage}</p></div> : null}
      <div className="stay-entry-layout">
        <section className="stay-entry-card" aria-labelledby="account-start">
          <h2 id="account-start">Sign in or join</h2>
          <div className="stay-actions">
            <Link className="stay-button" href="/account/sign-in">Sign in<ArrowRight size={16} aria-hidden="true" /></Link>
            <Link className="stay-button stay-button-quiet" href="/account/register">Create an account</Link>
          </div>
          <p className="stay-form-note">Guest checkout still works without an account.</p>
        </section>
        <section className="stay-entry-card" aria-labelledby="find-trip-title">
          <h2 id="find-trip-title">Find a trip</h2>
          <RecoverTripForm signedIn={false} />
        </section>
      </div>
    </main></StorefrontShell>;
  }

  // Grouped by itinerary as well as status, at each home's own local checkout: a stay whose
  // checkout has passed is never shown as upcoming, even while the host hasn't marked it
  // complete. The recorded status is never changed here.
  const active = ['pending', 'confirmed', 'in_stay'];
  const upcoming = account.trips.filter(trip => active.includes(trip.status) && !trip.checkoutPassed);
  const awaitingHost = account.trips.filter(trip => active.includes(trip.status) && trip.checkoutPassed);
  const past = account.trips.filter(trip => !active.includes(trip.status));
  const pageEnd = account.tripsOffset + account.trips.length;
  const tripList = (trips: typeof account.trips) => <ul className="stay-records">
    {trips.map(trip => <li key={trip.confirmationCode}>
      <span><strong>{trip.listing?.title || 'Your stay'}</strong><span className="stay-muted"> · {formatStayDate(locale, trip.checkInDate)} — {formatStayDate(locale, trip.checkOutDate)}{trip.checkOutBy ? `, checkout by ${trip.checkOutBy}` : ''}{trip.timeZone ? ` (${trip.timeZone.replaceAll('_', ' ')} time)` : active.includes(trip.status) ? ' (home’s time zone not shown)' : ''}</span></span>
      <span className={`stay-status is-${trip.status}`}>{formatType(trip.status)}</span>
      <p>{trip.confirmationCode} · {formatMoney(locale, trip.totalAmountCents, trip.currencyCode)} · payment {formatType(trip.paymentStatus).toLowerCase()}{trip.testMode ? ' · test booking' : ''}</p>
      <div className="stay-actions">
        <form action={openAccountTripAction}><input type="hidden" name="confirmationCode" value={trip.confirmationCode} /><button type="submit" className="stay-button stay-button-quiet">Open trip<ArrowRight size={16} aria-hidden="true" /></button></form>
        {trip.listing?.bookAgainSlug ? <Link className="stay-text-link" href={`/stays/${encodeURIComponent(trip.listing.bookAgainSlug)}`}>Book again</Link> : null}
      </div>
    </li>)}
  </ul>;

  return <StorefrontShell servicing activeNav="account"><main id="stay-main" className="stay-shell">
    <header className="stay-page-head">
      <p className="stay-overline">Your account</p>
      <h1>Welcome back, <em>{account.name}</em></h1>
      <p>{account.email}</p>
    </header>
    {errorMessage ? <div className="stay-alert stay-alert-danger" role="alert"><p>{errorMessage}</p></div> : null}
    <div className="stay-entry-layout">
      <div>
        {account.tripsTotal > account.tripsPageSize ? <p className="stay-form-note">Trips {account.trips.length ? account.tripsOffset + 1 : 0}–{pageEnd} of {account.tripsTotal}, latest check-in first.</p> : null}
        <section className="stay-panel" aria-labelledby="upcoming-title">
          <h2 id="upcoming-title"><CalendarDays size={18} aria-hidden="true" /> Upcoming & requested</h2>
          {upcoming.length ? tripList(upcoming) : <p className="stay-empty-line">No upcoming trips{account.tripsOffset ? ' on this page' : ''}. <Link href="/search">Find a stay</Link></p>}
        </section>
        {awaitingHost.length ? <section className="stay-panel" aria-labelledby="awaiting-title">
          <h2 id="awaiting-title">Past dates, awaiting the host’s update</h2>
          <p className="stay-muted">These stays’ dates have passed, but the host hasn’t closed them yet. Open a trip to message the host.</p>
          {tripList(awaitingHost)}
        </section> : null}
        <section className="stay-panel" aria-labelledby="past-title">
          <h2 id="past-title">Past & cancelled</h2>
          {past.length ? tripList(past) : <p className="stay-empty-line">No past trips{account.tripsOffset ? ' on this page' : ' yet'}.</p>}
        </section>
        {account.tripsTotal > account.tripsPageSize ? <nav className="stay-actions" aria-label="Trip history pages">
          {account.tripsOffset > 0 ? <Link className="stay-button stay-button-quiet" href={`/account?tripsOffset=${Math.max(account.tripsOffset - account.tripsPageSize, 0)}`}>Newer trips</Link> : null}
          {pageEnd < account.tripsTotal ? <Link className="stay-button stay-button-quiet" href={`/account?tripsOffset=${pageEnd}`}>Older trips</Link> : null}
        </nav> : null}
        <p className="stay-form-note">Opening a trip refreshes its private link, so older copies of that link stop working.</p>
      </div>
      <div>
        <section className="stay-entry-card" aria-labelledby="add-trip-title">
          <h2 id="add-trip-title"><Search size={18} aria-hidden="true" /> Add a trip</h2>
          <p className="stay-muted">Booked as a guest? Add it here with its confirmation code and booking email.</p>
          <RecoverTripForm signedIn />
        </section>
        <section className="stay-entry-notes" aria-label="Account options">
          <div><UserRound size={20} strokeWidth={1.6} aria-hidden="true" /><div><h3>Your details</h3><ProfileForm name={account.name} phone={account.phone || ''} /></div></div>
          <div><UserRound size={20} strokeWidth={1.6} aria-hidden="true" /><div><h3>Sign-in email</h3><p className="stay-muted">You sign in with {account.email}. Changing it needs the store to confirm you control the new address, which it can’t do online yet. Contact the store to change it.</p></div></div>
          <div><KeyRound size={20} strokeWidth={1.6} aria-hidden="true" /><div><h3>Password</h3>{account.staffCredential
            ? <p className="stay-muted">This sign-in is also a host or owner account. A people manager in the host workspace changes its password.</p>
            : <><PasswordChangeForm /><Link className="stay-text-link" href="/account/reset">Forgot it? Reset by email</Link></>}</div></div>
          {account.hasHostAccess ? <div><UserRound size={20} strokeWidth={1.6} aria-hidden="true" /><div><h3>Host workspace</h3><Link className="stay-text-link" href="/dashboard">Open the host workspace</Link></div></div> : null}
          <div><LogOut size={20} strokeWidth={1.6} aria-hidden="true" /><div><h3>Sign out</h3><form action={signOutGuestAction}><button type="submit" className="stay-button stay-button-quiet">Sign out</button></form></div></div>
        </section>
      </div>
    </div>
  </main></StorefrontShell>;
}
export default AccountPage;
