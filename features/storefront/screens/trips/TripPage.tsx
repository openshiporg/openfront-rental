import { CalendarDays, Check, DoorOpen, FileSignature, KeyRound, LogOut, MapPin, MessageSquare, Star, UserRound, Wallet, X } from 'lucide-react';
import Link from 'next/link';

import { CancellationForm, ClearCheckoutDraft } from '../../components/GuestForms';
import { ChangeRequestForm, ClaimTripForm, ReviewForm, TripMessageForm } from '../../components/GuestJourneyForms';
import { GuestMessageList } from '../../components/GuestMessageList';
import { StayCardPayment } from '../../components/StayCardPayment';
import { stripeCheckoutEnabled } from '@/features/integrations/payment/stripe';
import { BookingSteps, SectionNav, UnavailableStay } from '../../components/Journey';
import { SaveTripLink } from '../../components/PrivateTripTools';
import { PolicyDetails } from '../../components/QuoteSummary';
import { StayImage as Image } from '../../components/StayImage';
import { StorefrontShell } from '../../components/StorefrontShell';
import { withQuery } from '../../lib/account-navigation';
import { getPublicTrip } from '../../lib/data/stays';
import { formatGuestParty, formatMoney, formatStayDate, formatType } from '../../lib/format';
import { privateToken, single, tripPath, type SearchParams } from '../../lib/navigation';
import { publicActionFailureMessage, publicTokenUnavailableMessage } from '../../lib/public-token-copy';
import { getStorefrontLocale } from '../../lib/data/storefront-locale';

type Step = { state: 'done' | 'current' | 'upcoming' | 'stopped'; icon: typeof Check; title: string; body: string; link?: { href: string; label: string } };

const refundLabels: Record<string, string> = {
  review: 'Under the host’s review · not decided yet (up to this amount)',
  pending: 'Owed to you · awaiting the host',
  processing: 'Refund in progress',
  succeeded: 'Refunded',
  failed: 'Delayed · the host needs to retry',
  cancelled: 'Withdrawn',
};

function depositCopy(locale: string, deposit: any, stopped: boolean) {
  const captured = formatMoney(locale, deposit.capturedAmountCents || 0, deposit.currencyCode);
  switch (deposit.status) {
    case 'required': return stopped ? 'Not needed. This stay is cancelled.' : 'Your host arranges collection before arrival. It isn’t charged with your stay.';
    case 'authorized':
    case 'held': return 'Held by your host. It’s returned after checkout unless a damage claim is made.';
    case 'released': return (deposit.capturedAmountCents || 0) > 0
      ? `Your host kept ${captured} and released the rest. Message them if you disagree.`
      : 'Released by your host. Nothing was kept.';
    case 'partially_captured': return `Your host kept ${captured}; the rest is released or still held. Message them if you disagree.`;
    case 'captured': return `Your host kept the full deposit (${captured}). Message them if you disagree.`;
    case 'failed': return stopped ? 'Not needed. This stay is cancelled.' : 'Collection didn’t go through. Message your host to arrange it.';
    default: return `Status: ${formatType(deposit.status)}.`;
  }
}

/**
 * What the host asked for and what was decided are shown apart. Every assessed status uses the
 * assessed amount (zero included); an assessed status without a recorded amount says so
 * rather than repeating the request. The requested amount is never changed or hidden.
 */
function claimAmountCopy(locale: string, claim: any) {
  const requested = formatMoney(locale, claim.claimedAmountCents, claim.currencyCode);
  const assessed = Number.isSafeInteger(claim.approvedAmountCents) ? claim.approvedAmountCents as number : null;
  const decided = (label: string) => assessed === null
    ? { amount: 'Amount not recorded', note: `${label}. ${requested} was requested; message your host for the decided amount.` }
    : { amount: formatMoney(locale, assessed, claim.currencyCode), note: assessed === claim.claimedAmountCents ? `${label} in full.` : `${label}: ${formatMoney(locale, assessed, claim.currencyCode)} of the ${requested} requested.` };
  switch (claim.status) {
    case 'declined': return { amount: formatMoney(locale, 0, claim.currencyCode), note: `Declined. ${requested} was requested.` };
    case 'approved': return decided('Approved');
    case 'partially_approved': return decided('Partly approved');
    case 'settled': return decided('Settled');
    case 'guest_response': return { amount: requested, note: 'Requested by your host. Your response is with them.' };
    default: return { amount: requested, note: 'Requested by your host. Not decided yet.' };
  }
}

const reviewStatusCopy: Record<string, string> = {
  published: 'Your review is published.',
  submitted: 'The host is reviewing it before it’s published.',
  removed: 'This review was removed and isn’t shown on the home’s page. Message your host if you have questions.',
};

function addressLines(address: any) {
  if (!address) return [];
  return [address.addressLine1, address.addressLine2, [address.city, address.region, address.postalCode].filter(Boolean).join(', '), address.countryCode].filter(Boolean);
}

export async function TripPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams?: Promise<SearchParams> }) {
  const locale = await getStorefrontLocale();
  const { token } = await params;
  const query = (await searchParams) || {};
  const messagesBefore = typeof query.messagesBefore === 'string' ? query.messagesBefore : null;
  const { trip } = await getPublicTrip(token, messagesBefore);
  if (!trip) return <StorefrontShell servicing activeNav="trips"><UnavailableStay title="This trip link is unavailable.">{publicTokenUnavailableMessage('trip')} Use the complete saved link, or get a fresh one with Find my trip using your confirmation code and booking email.</UnavailableStay></StorefrontShell>;
  const agreementToken = privateToken(query.agreement);
  const path = tripPath(token, agreementToken);
  const signed = trip.agreement?.status === 'signed';
  const cancelled = trip.status === 'cancelled';
  const stopped = cancelled || trip.status === 'no_show';
  const canCancel = ['pending', 'confirmed'].includes(trip.status);
  const canChange = ['pending', 'confirmed', 'in_stay'].includes(trip.status);
  // Card tender is Stripe TEST money and only offered for test bookings.
  const cardEnabled = stripeCheckoutEnabled() && trip.testMode === true;
  const statusCopy: Record<string, string> = {
    pending: 'Your request is awaiting host approval. Nothing is charged until they confirm.',
    confirmed: 'Your reservation is confirmed. Payment and arrival details are below.',
    in_stay: 'Your stay is in progress. Message your host below if you need anything.',
    completed: 'Your stay is complete. Payment and deposit records remain below.',
    cancelled: 'Your stay is cancelled and its dates are released. Any refund owed is shown below.',
    no_show: 'The host recorded this stay as a no-show. Message them below to discuss it.',
  };
  const photo = trip.listing?.thumbnail || trip.listing?.media?.[0]?.url;
  const balance = trip.balanceDueCents ?? Math.max((trip.totalAmountCents || 0) - (trip.amountPaidCents || 0), 0);
  const confirmed = ['confirmed', 'in_stay', 'completed'].includes(trip.status);
  const refundDue = trip.refundDueCents || 0;
  const refundReview = trip.refundReviewCents || 0;
  // The party on record now versus as booked: both are shown when a host change differs.
  const partyKeys = ['adults', 'children', 'infants', 'pets'] as const;
  const partyChanged = Boolean(trip.bookedGuestParty && partyKeys.some(key => (trip.bookedGuestParty?.[key] ?? 0) !== (trip.guestParty?.[key] ?? 0)));
  const lastPartyChange = trip.partyChanges?.length ? trip.partyChanges[trip.partyChanges.length - 1] : null;
  const arrival = trip.arrival;
  const lines = addressLines(arrival?.address);
  const topic = single(query.topic);

  const paymentBody = trip.paymentStatus === 'paid'
    ? trip.testMode ? 'Paid in test mode; no real money was charged. Any security deposit is separate.' : 'Your stay payment is received. Any security deposit is separate.'
    : cancelled
      ? refundDue > 0 ? `This stay is cancelled. ${formatMoney(locale, refundDue, trip.currencyCode)} is owed back to you.` : 'This stay is cancelled. Nothing more is due.'
      : trip.status === 'pending'
        ? 'Nothing is charged while the host reviews your request.'
        : trip.status === 'no_show'
          ? 'Message your host about any remaining balance.'
          : cardEnabled && balance > 0 && trip.status === 'confirmed'
            ? 'Pay with a Stripe test card below (test mode, no real money), or arrange payment directly with your host. Any security deposit is separate.'
            : 'Payment is arranged directly with the host. Any security deposit is separate.';

  const steps: Step[] = [
    {
      state: stopped ? 'stopped' : trip.status === 'pending' ? 'current' : 'done',
      icon: stopped ? X : Check,
      title: trip.status === 'pending' ? 'Host decision pending' : `Reservation ${formatType(trip.status).toLowerCase()}`,
      body: trip.status === 'pending' ? 'Wait for host approval before making travel plans based on a confirmed stay.' : statusCopy[trip.status] || 'Message your host to confirm the next step.',
    },
    {
      state: signed ? 'done' : stopped || trip.agreement?.status === 'voided' ? 'stopped' : confirmed && trip.agreement ? 'current' : 'upcoming',
      icon: FileSignature,
      title: `Agreement · ${signed ? 'signed' : trip.agreement ? formatType(trip.agreement.status).toLowerCase() : 'not available'}`,
      body: signed ? 'Your signature is on record.' : stopped ? 'This agreement no longer needs a signature.' : 'Review the terms and complete any required signature.',
      link: { href: '#agreement', label: 'Agreement details' },
    },
    {
      state: trip.paymentStatus === 'paid' ? 'done' : stopped ? 'stopped' : confirmed ? 'current' : 'upcoming',
      icon: Wallet,
      title: `Payment · ${formatType(trip.paymentStatus).toLowerCase()}`,
      body: paymentBody,
      link: { href: '#payment', label: 'Payment records' },
    },
    {
      state: trip.checkedInAt ? 'done' : stopped ? 'stopped' : arrival ? 'current' : 'upcoming',
      icon: DoorOpen,
      title: trip.checkedInAt ? 'Arrival recorded' : 'Plan your arrival',
      body: stopped ? 'This booking doesn’t provide arrival access.' : arrival ? 'Your exact address and arrival details are below.' : 'The exact address and entry details appear here once the host confirms.',
      link: { href: '#arrival', label: 'Arrival information' },
    },
    {
      state: trip.checkedOutAt ? 'done' : stopped ? 'stopped' : 'upcoming',
      icon: LogOut,
      title: trip.checkedOutAt ? 'Departure recorded' : 'Departure & deposit follow-up',
      body: 'Follow the checkout instructions from your host. Any deposit is settled after departure.',
    },
  ];

  const sections = [{ id: 'next', label: 'Next steps' }, { id: 'arrival', label: 'Arrival' }, { id: 'messages', label: 'Messages' }, { id: 'payment', label: 'Payment' }, ...(trip.status === 'completed' ? [{ id: 'review', label: 'Review' }] : []), { id: 'agreement', label: 'Agreement' }, { id: 'changes', label: 'Changes' }];

  return <StorefrontShell servicing activeNav="trips"><main id="stay-main" className="stay-shell stay-trip-page">
    {query.booked ? <><BookingSteps step={3} /><ClearCheckoutDraft /></> : null}
    <div className="stay-trip-flash">
      {trip.sample ? <div className="stay-alert stay-alert-warn" role="note"><Wallet size={16} aria-hidden="true" /><p>Sample stay: created by the store’s setup to show how trips work. It isn’t a real booking; any payment, deposit or signature on it was recorded by setup, not by a guest.</p></div> : null}
      {trip.testMode ? <div className="stay-alert stay-alert-warn" role="note"><Wallet size={16} aria-hidden="true" /><p>Test booking: it was chosen as a test at checkout. It holds no dates and isn’t a real stay. Card payments for it use Stripe test cards, and no real money is charged.</p></div> : null}
      {query.cancel_review && canCancel ? <div className="stay-alert stay-alert-warn" role="status"><X size={16} aria-hidden="true" /><p>The refund for cancelling has changed. Review the new amount under Plans can change before you confirm.</p></div> : null}
      {query.booked ? <div className="stay-alert stay-alert-ok" role="status"><Check size={16} aria-hidden="true" /><p>Reservation {trip.confirmationCode} is on record. {statusCopy[trip.status] || 'Check its current status below.'}</p></div> : null}
      {query.emailed ? <div className="stay-alert stay-alert-ok" role="status"><Check size={16} aria-hidden="true" /><p>We emailed your trip link to the booking address. Save this page’s link as well.</p></div> : null}
      {query.receipt ? <div className="stay-alert stay-alert-ok" role="status"><Check size={16} aria-hidden="true" /><p>This is the booking you already made from that quote. No second booking was made.</p></div> : null}
      {query.recovered ? <div className="stay-alert stay-alert-ok" role="status"><Check size={16} aria-hidden="true" /><p>Here’s your trip with a fresh private link. Save this page’s link; older links no longer work.</p></div> : null}
      {query.saved ? <div className="stay-alert stay-alert-ok" role="status"><Check size={16} aria-hidden="true" /><p>This trip is saved to your account.</p></div> : null}
      {query.paid && trip.paymentStatus === 'paid' ? <div className="stay-alert stay-alert-ok" role="status"><Check size={16} aria-hidden="true" /><p>{trip.testMode ? 'Test payment recorded; no real money was charged.' : 'Payment received.'} Your reservation is paid and {formatType(trip.status).toLowerCase()}.</p></div> : null}
      {query.signed && signed ? <div className="stay-alert stay-alert-ok" role="status"><FileSignature size={16} aria-hidden="true" /><p>Your agreement signature is on record.</p></div> : null}
      {query.cancelled && cancelled ? <div className="stay-alert stay-alert-warn" role="status"><X size={16} aria-hidden="true" /><p>Your reservation is cancelled.{refundDue > 0 ? ` ${formatMoney(locale, refundDue, trip.currencyCode)} is recorded as owed back to you; the host issues the refund.` : ''}</p></div> : null}
      {query.sent ? <div className="stay-alert stay-alert-ok" role="status"><MessageSquare size={16} aria-hidden="true" /><p>Message delivered to your host’s inbox. Replies appear in Messages below.</p></div> : null}
      {query.changeRequested ? <div className="stay-alert stay-alert-ok" role="status"><MessageSquare size={16} aria-hidden="true" /><p>Change request sent. Your booking stays as it is until the host confirms the change.</p></div> : null}
      {query.reviewed ? <div className="stay-alert stay-alert-ok" role="status"><Star size={16} aria-hidden="true" /><p>Thanks — your review is with the host.</p></div> : null}
      {query.error ? <div className="stay-alert stay-alert-danger" role="alert"><p>{publicActionFailureMessage('cancellation')}</p></div> : null}
    </div>

    <header className="stay-trip-hero">
      <div className="stay-trip-hero-copy">
        <div>
          <p className="stay-overline">Your trip · {trip.confirmationCode}</p>
          <h1>{trip.listing?.title || 'Your stay'}</h1>
          <p className="stay-trip-dates"><CalendarDays size={16} aria-hidden="true" />{formatStayDate(locale, trip.checkInDate)} — {formatStayDate(locale, trip.checkOutDate)}{trip.listing?.property?.location?.publicLocationLabel ? <span>· {trip.listing.property.location.publicLocationLabel}</span> : null}</p>
        </div>
        <div>
          <span className={`stay-status is-${trip.status}`}>{formatType(trip.status)}</span>
          <p className="stay-trip-status-copy">{statusCopy[trip.status] || 'Message your host to confirm the next step for this stay.'}</p>
        </div>
      </div>
      <div className="stay-trip-photo">{photo ? <Image src={photo} alt="" fill sizes="(max-width: 900px) 100vw, 45vw" priority /> : null}</div>
    </header>

    <SaveTripLink path={path} />

    <SectionNav label="Trip sections" className="stay-section-nav-sticky" items={sections} />

    <div className="stay-trip-grid">
      <div className="stay-trip-main">
        <section id="next" className="stay-panel stay-trip-section" aria-labelledby="next-title">
          <h2 id="next-title">Your stay, step by step</h2>
          <ol className="stay-timeline">
            {steps.map(({ state, icon: Icon, title, body, link }) => (
              <li key={title} className={`is-${state}`}>
                <span className="stay-timeline-dot" aria-hidden="true">{state === 'done' ? <Check size={15} /> : <Icon size={15} />}</span>
                <div>
                  <h3>{title}<span className="stay-visually-hidden"> ({state === 'done' ? 'complete' : state === 'current' ? 'next step' : state === 'stopped' ? 'not applicable' : 'upcoming'})</span></h3>
                  <p>{body}</p>
                  {link ? <a href={link.href}>{link.label}</a> : null}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="arrival" className="stay-panel stay-trip-section" aria-labelledby="arrival-title">
          <h2 id="arrival-title">Arrival & departure</h2>
          <dl className="stay-facts-list">
            {arrival && lines.length ? <div><dt>Address</dt><dd>{lines.map(line => <span key={line} style={{ display: 'block' }}>{line}</span>)}</dd></div> : null}
            <div><dt>Check-in</dt><dd>{formatStayDate(locale, trip.checkInDate)} · {trip.scheduledCheckInTime || (arrival?.checkInFrom ? `from ${arrival.checkInFrom}${arrival.checkInUntil ? ` until ${arrival.checkInUntil}` : ''}` : trip.listing?.property?.checkInFrom || 'confirm the time with your host')}</dd></div>
            <div><dt>Checkout</dt><dd>{formatStayDate(locale, trip.checkOutDate)} · {trip.scheduledCheckOutTime || (arrival?.checkOutBy ? `by ${arrival.checkOutBy}` : trip.listing?.property?.checkOutBy || 'confirm the time with your host')}</dd></div>
            {!arrival || !lines.length ? <div><dt>Area</dt><dd>{trip.listing?.property?.location?.publicLocationLabel || 'Shared once your stay is confirmed'}</dd></div> : null}
            <div><dt>Timezone</dt><dd>{(arrival?.timezone || trip.listing?.property?.timezone)?.replaceAll('_', ' ') || 'Property local time'}</dd></div>
            <div><dt>Your party</dt><dd>{formatGuestParty({ adults: trip.guestParty?.adults ?? 0, children: trip.guestParty?.children ?? 0, infants: trip.guestParty?.infants ?? 0, pets: trip.guestParty?.pets ?? 0 })}
              {partyChanged ? <small>Booked as {formatGuestParty({ adults: trip.bookedGuestParty?.adults ?? 0, children: trip.bookedGuestParty?.children ?? 0, infants: trip.bookedGuestParty?.infants ?? 0, pets: trip.bookedGuestParty?.pets ?? 0 })}.{lastPartyChange?.at ? ` Changed by your host on ${formatStayDate(locale, String(lastPartyChange.at).slice(0, 10))}.` : ' Changed by your host.'} Your signed agreement and booking record keep the party as booked; no new signature was asked for.</small> : null}</dd></div>
          </dl>
          {arrival
            ? arrival.instructions
              ? <div className="stay-alert stay-alert-ok stay-alert-spaced"><KeyRound size={16} aria-hidden="true" /><div><h3>Entry & access from your host</h3><p style={{ whiteSpace: 'pre-line' }}>{arrival.instructions}</p></div></div>
              : <div className="stay-alert stay-alert-warn stay-alert-spaced"><KeyRound size={16} aria-hidden="true" /><div><h3>Entry instructions not added yet</h3><p>Your host hasn’t added entry, parking, or key details. <a href="#messages">Message your host</a> to arrange them before you travel.</p></div></div>
            : <div className="stay-alert stay-alert-warn stay-alert-spaced"><MapPin size={16} aria-hidden="true" /><div><h3>{stopped ? 'No arrival access' : 'Address shared once confirmed'}</h3><p>{stopped ? 'This booking doesn’t provide arrival access.' : 'The exact address and entry details appear here as soon as your host confirms the stay.'}</p></div></div>}
          {trip.listing?.houseRules?.length ? <details className="stay-disclosure"><summary>House rules for your stay</summary><ul className="stay-rules">{trip.listing.houseRules.map((rule: any, index: number) => <li key={rule.id || index}><div><strong>{rule.title}</strong>{rule.description ? <span>{rule.description}</span> : null}</div></li>)}</ul></details> : null}
        </section>

        <section id="messages" className="stay-panel stay-trip-section" aria-labelledby="messages-title">
          <h2 id="messages-title">Messages with your host</h2>
          {messagesBefore ? <p className="stay-form-note">Showing earlier messages. <Link href={`${path}#messages`}>Back to the latest</Link></p> : null}
          {trip.earlierMessagesBefore ? <p className="stay-form-note"><Link href={withQuery(path, { messagesBefore: trip.earlierMessagesBefore }, 'messages')}>Show earlier messages</Link></p> : null}
          <GuestMessageList locale={locale} messages={trip.messages || []} empty="No messages yet. Ask about arrival, changes, refunds, or anything else." />
          <TripMessageForm token={token} agreementToken={agreementToken} defaultTopic={topic} />
          <p className="stay-form-note">Messages go to the host’s inbox with your booking reference. Host replies appear here.</p>
        </section>

        <section id="payment" className="stay-panel stay-trip-section" aria-labelledby="payment-title">
          <h2 id="payment-title">Payment & records</h2>
          <p className="stay-muted">Status: <strong>{formatType(trip.paymentStatus)}{trip.testMode ? ' (test mode)' : ''}</strong>. {cardEnabled ? 'Test card payments appear here once Stripe confirms them; ' : ''}payments arranged with your host are recorded by the host.</p>
          <div className="stay-money-grid">
            <div className="stay-money"><span>Stay total</span><strong>{formatMoney(locale, trip.totalAmountCents, trip.currencyCode)}</strong></div>
            <div className="stay-money"><span>Paid</span><strong>{formatMoney(locale, trip.amountPaidCents, trip.currencyCode)}</strong></div>
            <div className={`stay-money ${balance > 0 && !stopped ? 'is-due' : ''}`}><span>Balance due</span><strong>{formatMoney(locale, balance, trip.currencyCode)}</strong></div>
            <div className={`stay-money ${refundDue > 0 ? 'is-due' : ''}`}><span>Refund owed to you</span><strong>{formatMoney(locale, refundDue, trip.currencyCode)}</strong></div>
          </div>
          {refundReview > 0 ? <p className="stay-form-note">Your host is reviewing whether a refund is due, up to {formatMoney(locale, refundReview, trip.currencyCode)}. It isn’t owed until they decide; this page shows the outcome.</p> : null}
          {trip.lineItems?.length ? <details className="stay-disclosure"><summary>Itemized stay charges</summary><ul className="stay-records">{trip.lineItems.map((line: any) => <li key={line.id}><span>{line.description}{line.serviceDate ? <span className="stay-muted"> · {formatStayDate(locale, line.serviceDate)}</span> : null}</span><strong>{formatMoney(locale, line.totalAmountCents, line.currencyCode)}</strong></li>)}</ul></details> : null}

          {cardEnabled && trip.status === 'confirmed' && balance > 0 ? <StayCardPayment token={token} tripPath={path} amountCents={balance} currencyCode={trip.currencyCode} autoStart={query.pay === '1'} returnPaymentId={typeof query.payment_return === 'string' ? query.payment_return : ''} /> : null}

          <h3>Payment records</h3>
          {trip.payments?.length ? <ul className="stay-records">{trip.payments.map((payment: any) => <li key={payment.id}><span>{formatType(payment.status)} · {payment.isTest ? 'Test card payment (no real money)' : formatType(payment.paymentMethod)}</span><strong>{formatMoney(locale, payment.amountCents, payment.currencyCode)}</strong>{payment.refundedAmountCents > 0 ? <p>Refunded: {formatMoney(locale, payment.refundedAmountCents, payment.currencyCode)}</p> : null}</li>)}</ul> : <p className="stay-empty-line">{stopped ? 'No payments were made.' : trip.status === 'pending' ? 'No payment is taken until the host confirms.' : cardEnabled && trip.status === 'confirmed' ? 'No payments yet. Pay by card above, or arrange payment with your host.' : 'No payments recorded yet. Arrange payment with your host.'}</p>}

          <h3>Refunds</h3>
          {trip.refunds?.length ? <ul className="stay-records">{trip.refunds.map((refund: any) => <li key={refund.id}><span>{refund.refundNumber} · {refundLabels[refund.status] || formatType(refund.status)}</span><strong>{formatMoney(locale, refund.amountCents, refund.currencyCode)}</strong>{refund.status === 'succeeded' && refund.processedAt ? <p>Returned {formatStayDate(locale, String(refund.processedAt).slice(0, 10))}. Card refunds can take several business days to appear.</p> : null}</li>)}</ul> : <p className="stay-empty-line">No refunds.</p>}
          {refundDue > 0 ? <p className="stay-form-note">The host issues refunds owed to you; card refunds go back to the original card. Questions? <Link href={withQuery(path, { topic: 'cancellation' }, 'messages')}>Message your host</Link>.</p> : null}

          <h3>Security deposit</h3>
          {trip.securityDeposit
            ? <><p>{formatMoney(locale, trip.securityDeposit.amountCents, trip.securityDeposit.currencyCode)} · {depositCopy(locale, trip.securityDeposit, stopped)}</p>{['partially_captured', 'captured'].includes(trip.securityDeposit.status) ? <Link className="stay-text-link" href={withQuery(path, { topic: 'deposit' }, 'messages')}>Question this deduction</Link> : null}</>
            : <p className="stay-empty-line">{stopped ? 'No deposit is needed for a cancelled stay.' : trip.securityDepositCents > 0 ? `${formatMoney(locale, trip.securityDepositCents, trip.currencyCode)} · your host arranges collection separately.` : 'No security deposit for this stay.'}</p>}

          {trip.damageClaims?.length ? <>
            <h3>Damage claims</h3>
            <ul className="stay-records">{trip.damageClaims.map((claim: any) => <li key={claim.claimNumber}>
              <span>{claim.claimNumber} · {formatType(claim.status)}</span>
              <strong>{claimAmountCopy(locale, claim).amount}</strong>
              <p>{claimAmountCopy(locale, claim).note} {claim.description}</p>
              {!['settled', 'declined'].includes(claim.status) ? <p><Link href={withQuery(path, { topic: 'damage_claim' }, 'messages')}>Respond to this claim</Link></p> : null}
            </li>)}</ul>
          </> : null}
          <Link className="stay-text-link" href="/help#payments">Payment & deposit help</Link>
        </section>

        {trip.status === 'completed' ? <section id="review" className="stay-panel stay-trip-section" aria-labelledby="review-title">
          <h2 id="review-title">Review your stay</h2>
          {trip.review
            ? <p className="stay-muted"><Star size={16} aria-hidden="true" /> You rated this stay {trip.review.overallRating} out of 5. {reviewStatusCopy[trip.review.status] || `Status: ${formatType(trip.review.status)}.`}</p>
            : trip.canReview ? <ReviewForm token={token} agreementToken={agreementToken} /> : <p className="stay-empty-line">Reviews aren’t available for this stay.</p>}
        </section> : null}
      </div>

      <aside className="stay-trip-aside">
        <section id="agreement" className="stay-panel stay-trip-section" aria-labelledby="agreement-title">
          <h2 id="agreement-title">Your agreement</h2>
          {signed && trip.agreement?.signedBySetup
            ? <p className="stay-muted">This is a sample stay created by the store’s setup. Its agreement was marked signed by setup, not by a guest, so it isn’t a guest signature.</p>
            : signed
            ? <div className="stay-signed"><span className="stay-signature-name">{trip.agreement.signatureName}</span>{trip.agreement.signedAt ? <span>Signed {new Date(trip.agreement.signedAt).toLocaleString(locale, { timeZone: 'UTC' })} UTC</span> : null}</div>
            : <p className="stay-muted">{trip.agreement ? `Status: ${formatType(trip.agreement.status)}.` : 'An agreement record isn’t available.'}{stopped && !signed ? ' No signature is needed for a cancelled stay.' : ''}</p>}
          {agreementToken && trip.agreement && trip.agreement.status !== 'voided' && !(stopped && !signed)
            ? <Link className={`stay-button stay-button-block stay-agreement-cta ${signed ? 'stay-button-quiet' : ''}`} href={`/agreements/${agreementToken}?trip=${encodeURIComponent(token)}`}>{signed ? 'Read signed agreement' : 'Review & sign'}</Link>
            : !stopped && trip.agreement && trip.agreement.status !== 'voided' ? <p className="stay-form-note">Missing the agreement link? <Link href="/trips#find-trip">Find my trip</Link> issues fresh trip and agreement links.</p> : null}
        </section>

        <section id="changes" className="stay-panel stay-trip-section" aria-labelledby="changes-title">
          <h2 id="changes-title">Plans can change</h2>
          {canChange
            ? <><p className="stay-muted">Need different dates, more or fewer guests, or another home? Send a request; the host confirms availability and any price difference.</p>
              <ChangeRequestForm token={token} agreementToken={agreementToken} partyVersion={trip.partyVersion} current={{ checkIn: trip.checkInDate, checkOut: trip.checkOutDate, adults: trip.guestParty?.adults ?? 1, children: trip.guestParty?.children ?? 0, infants: trip.guestParty?.infants ?? 0, pets: trip.guestParty?.pets ?? 0 }} /></>
            : <p className="stay-muted">This stay can no longer be changed online. <a href="#messages">Message your host</a> with any questions.</p>}
          {trip.amendments?.length ? <>
            <h3>Changes to your stay</h3>
            <ul className="stay-records">{trip.amendments.map((amendment: any) => <li key={amendment.id}>
              <span>Dates changed{amendment.createdAt ? ` on ${formatStayDate(locale, String(amendment.createdAt).slice(0, 10))}` : ''}</span>
              <p>{formatStayDate(locale, amendment.previousCheckInDate)} – {formatStayDate(locale, amendment.previousCheckOutDate)} → {formatStayDate(locale, amendment.checkInDate)} – {formatStayDate(locale, amendment.checkOutDate)}.{typeof amendment.totalBeforeCents === 'number' && typeof amendment.totalAfterCents === 'number' ? ` Total ${formatMoney(locale, amendment.totalBeforeCents, amendment.currencyCode)} → ${formatMoney(locale, amendment.totalAfterCents, amendment.currencyCode)}.` : ''} Your signed agreement covers the original booking; this change is recorded alongside it, and {amendment.guestAcceptance === 'accepted' ? 'you accepted it.' : 'no acceptance of it by you is recorded.'} <a href="#messages">Message your host</a> with any questions.</p>
            </li>)}</ul>
          </> : null}
          <h3>Cancellation policy</h3>
          <PolicyDetails policy={trip.cancellationPolicy} />
          {canCancel ? <CancellationForm token={token} agreementToken={agreementToken} paidCents={trip.amountPaidCents || 0} currencyCode={trip.currencyCode} preview={trip.cancellationPreview} open={Boolean(query.cancel_review)} /> : <p className="stay-form-note">Online cancellation isn’t available for a stay marked {formatType(trip.status).toLowerCase()}. <a href="#messages">Message your host</a> about any remaining questions.</p>}
        </section>

        <section className="stay-panel stay-trip-section" aria-labelledby="account-title">
          <h2 id="account-title"><UserRound size={18} aria-hidden="true" /> Your account</h2>
          {trip.account?.linkedToYou
            ? <p className="stay-muted">This trip is saved to your account. <Link href="/account">Your trips</Link></p>
            : trip.account?.signedIn
              ? trip.account?.linked ? <p className="stay-muted">This trip is saved to a different account.</p> : <><p className="stay-muted">Keep this trip with your other stays.</p><ClaimTripForm token={token} agreementToken={agreementToken} /></>
              : <p className="stay-muted"><Link href={`/account/sign-in?next=${encodeURIComponent(path)}`}>Sign in or create an account</Link> to save this trip and open it without the link.</p>}
        </section>
      </aside>
    </div>
  </main></StorefrontShell>;
}
export default TripPage;
