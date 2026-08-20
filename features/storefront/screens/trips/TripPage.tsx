import Link from 'next/link';

import { StorefrontShell } from '../../components/StorefrontShell';
import { cancelStayAction } from '../../lib/data/stay-actions';
import { getPublicTrip } from '../../lib/data/stays';
import { formatMoney } from '../../lib/format';

function stayDate(value?: string) {
  return value ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00.000Z`)) : 'To be confirmed';
}

export async function TripPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const { token } = await params;
  const query = (await searchParams) || {};
  const { trip, error } = await getPublicTrip(token);
  if (!trip) return <StorefrontShell><main className="stay-shell stay-token-page"><h1>This trip link is unavailable.</h1><p>{error || 'The link may be expired or revoked.'}</p><Link href="/search">Browse stays</Link></main></StorefrontShell>;
  const address = trip.listing?.property?.address || trip.listing?.property?.location;
  const balance = Math.max((trip.totalAmountCents || 0) - (trip.amountPaidCents || 0), 0);

  return (
    <StorefrontShell>
      <main className="stay-shell stay-trip-page">
        {query.booked ? <div className="stay-success" role="status">Reservation {trip.confirmationCode} was created. Keep this private trip link.</div> : null}
        {query.signed ? <div className="stay-success" role="status">Your stay agreement is signed.</div> : null}
        {query.cancelled ? <div className="stay-notice" role="status">Cancellation was recorded. Any paid balance is pending host policy review.</div> : null}
        {query.error ? <div className="stay-form-error" role="alert">{query.error}</div> : null}

        <header className="stay-page-head stay-trip-head">
          <p className="stay-overline">{trip.confirmationCode} · {String(trip.status).replaceAll('_', ' ')}</p>
          <h1>{trip.listing?.title}</h1>
          <p>{stayDate(trip.checkInDate)} – {stayDate(trip.checkOutDate)}</p>
        </header>

        <div className="stay-trip-grid">
          <section className="stay-trip-main">
            <article className="stay-trip-section">
              <h2>Arrival</h2>
              <dl className="stay-trip-facts">
                <div><dt>Check in</dt><dd>{stayDate(trip.checkInDate)} after {trip.listing?.property?.checkInFrom || 'the confirmed time'}</dd></div>
                <div><dt>Check out</dt><dd>{stayDate(trip.checkOutDate)} by {trip.listing?.property?.checkOutBy || 'the confirmed time'}</dd></div>
                <div><dt>Address</dt><dd>{[address?.addressLine1, address?.city, address?.region, address?.postalCode].filter(Boolean).join(', ') || address?.publicLocationLabel}</dd></div>
              </dl>
            </article>

            <article className="stay-trip-section">
              <h2>Guest party</h2>
              <p>{trip.guestParty?.adults || 1} adults · {trip.guestParty?.children || 0} children · {trip.guestParty?.infants || 0} infants · {trip.guestParty?.pets || 0} pets</p>
            </article>

            <article className="stay-trip-section">
              <h2>Host messages</h2>
              {trip.conversation?.messages?.length ? <div className="stay-messages">{trip.conversation.messages.map((message: any) => <div key={message.id} className={`stay-message ${message.direction}`}><span>{message.senderType}</span><p>{message.body}</p></div>)}</div> : <p>Your host can add arrival notes and messages here.</p>}
            </article>

            {trip.listing?.houseRules?.length ? <article className="stay-trip-section"><h2>House rules</h2><ul className="stay-simple-list">{trip.listing.houseRules.map((rule: any, index: number) => <li key={rule.id || index}><strong>{rule.title}</strong>{rule.description ? ` — ${rule.description}` : ''}</li>)}</ul></article> : null}
          </section>

          <aside className="stay-trip-aside">
            <section className="stay-trip-section">
              <h2>Payment</h2>
              <dl className="stay-price-lines">
                <div><dt>Stay total</dt><dd>{formatMoney(trip.totalAmountCents, trip.currencyCode)}</dd></div>
                <div><dt>Paid</dt><dd>{formatMoney(trip.amountPaidCents, trip.currencyCode)}</dd></div>
                <div className="stay-price-total"><dt>Balance</dt><dd>{formatMoney(balance, trip.currencyCode)}</dd></div>
              </dl>
              <p className="stay-form-note">Status: {String(trip.paymentStatus).replaceAll('_', ' ')}</p>
            </section>

            <section className="stay-trip-section">
              <h2>Agreement</h2>
              <p>{trip.agreement?.status === 'signed' ? `Signed by ${trip.agreement.signatureName}.` : 'Signature is still required.'}</p>
              {trip.agreement?.status !== 'signed' && query.agreement ? <Link className="stay-action-link" href={`/agreements/${query.agreement}?trip=${token}`}>Review and sign</Link> : null}
            </section>

            {['pending', 'confirmed'].includes(trip.status) ? <section className="stay-trip-section"><h2>Cancel this stay</h2><form action={cancelStayAction} className="stay-book-form"><input type="hidden" name="tripToken" value={token} /><label>Reason<textarea name="reason" rows={3} /></label><button className="stay-button-secondary" type="submit">Request cancellation</button></form></section> : null}
          </aside>
        </div>
      </main>
    </StorefrontShell>
  );
}

export default TripPage;
