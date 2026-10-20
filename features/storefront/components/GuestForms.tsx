'use client';
import { AlertTriangle, ArrowRight, Clock } from 'lucide-react';
import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { bookStayFormAction, cancelStayFormAction, signStayFormAction } from '../lib/data/stay-actions';
import { formatMoney } from '../lib/format';
import { LegalDocumentAnchor, type LegalDocumentLink } from './LegalLinks';
import { SubmitButton } from './SubmitButton';
import { useStorefrontLocale } from './StorefrontLocale';
const initial = { error: '' };

function useExpiry(expiresAt: string) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setRemaining(new Date(expiresAt).getTime() - Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);
  return remaining;
}

/** Live countdown for a saved quote. The quote saves a price; it never holds the home. */
export function QuoteCountdown({ expiresAt }: { expiresAt: string }) {
  const remaining = useExpiry(expiresAt);
  if (remaining === null) return <span className="stay-countdown"><Clock size={14} aria-hidden="true" />Quote valid for 30 minutes</span>;
  if (remaining <= 0) return <span className="stay-countdown is-expired"><AlertTriangle size={14} aria-hidden="true" />Quote expired</span>;
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return (
    <span className={`stay-countdown ${remaining < 5 * 60000 ? 'is-low' : ''}`}>
      <Clock size={14} aria-hidden="true" />
      <span aria-hidden="true">Price saved for {minutes}:{String(seconds).padStart(2, '0')}</span>
      <span className="stay-visually-hidden">Price saved for about {minutes + 1} minutes</span>
    </span>
  );
}

const DRAFT_PREFIX = 'stay-checkout-draft:';
type GuestDraft = { guestName: string; guestEmail: string; guestPhone: string; guestNotes: string };

function readDraft(token: string): Partial<GuestDraft> | null {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(`${DRAFT_PREFIX}${token}`) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch { return null; }
}

/** Clears saved contact drafts once a booking is on record. Card details are never stored. */
export function ClearCheckoutDraft() {
  useEffect(() => {
    try {
      for (const key of Object.keys(window.sessionStorage)) if (key.startsWith(DRAFT_PREFIX)) window.sessionStorage.removeItem(key);
    } catch { /* storage unavailable */ }
  }, []);
  return null;
}

export function GuestBookingForm({ token, termsVersion, receiptKey, expiresAt, instantBook, editHref, testBookings = false, termsOfUse = null, privacyPolicy = null, account = null, signInHref }: { token: string; termsVersion: string; receiptKey: string; expiresAt: string; instantBook: boolean; editHref: string; testBookings?: boolean; termsOfUse?: LegalDocumentLink | null; privacyPolicy?: LegalDocumentLink | null; account?: { name: string; email: string } | null; signInHref: string }) {
  const [state, action, pending] = useActionState(bookStayFormAction, initial);
  const [fields, setFields] = useState<GuestDraft>({ guestName: account?.name || '', guestEmail: account?.email || '', guestPhone: '', guestNotes: '' });
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    const draft = readDraft(token);
    if (draft) {
      setFields(current => ({
        guestName: typeof draft.guestName === 'string' && draft.guestName ? draft.guestName : current.guestName,
        guestEmail: typeof draft.guestEmail === 'string' && draft.guestEmail ? draft.guestEmail : current.guestEmail,
        guestPhone: typeof draft.guestPhone === 'string' ? draft.guestPhone : current.guestPhone,
        guestNotes: typeof draft.guestNotes === 'string' ? draft.guestNotes : current.guestNotes,
      }));
      setRestored(true);
    }
  }, [token]);
  const update = (key: keyof GuestDraft, entry: string) => setFields(current => {
    const next = { ...current, [key]: entry };
    try { window.sessionStorage.setItem(`${DRAFT_PREFIX}${token}`, JSON.stringify(next)); } catch { /* storage unavailable */ }
    return next;
  });
  // Every booking is real unless the guest explicitly chooses a test booking.
  const [bookingKind, setBookingKind] = useState<'real' | 'test'>('real');
  const test = testBookings && bookingKind === 'test';
  const remaining = useExpiry(expiresAt);
  const expired = remaining !== null && remaining <= 0;
  return <form action={action} className="stay-form" aria-busy={pending}>
    <input type="hidden" name="quoteToken" value={token} />
    <input type="hidden" name="termsVersion" value={termsVersion} />
    <input type="hidden" name="receiptKey" value={receiptKey} />
    {termsOfUse ? <input type="hidden" name="storeTermsVersion" value={termsOfUse.version} /> : null}
    {privacyPolicy ? <input type="hidden" name="privacyNoticeVersion" value={privacyPolicy.version} /> : null}
    {state.error ? <div className="stay-alert stay-alert-danger" role="alert"><AlertTriangle size={16} aria-hidden="true" /><p>{state.error} <Link href="/help">Get help</Link></p></div> : null}
    {expired ? <div className="stay-alert stay-alert-warn" role="status"><Clock size={16} aria-hidden="true" /><p>This quote has expired. <Link href={editHref}>Request a fresh quote</Link> for the same dates. Your contact details stay on this page until you leave.</p></div> : null}
    {restored && !expired ? <p className="stay-form-note" role="status">We restored the contact details you entered earlier in this browser tab.</p> : null}
    {account
      ? <p className="stay-form-note">Signed in as {account.email}. This booking will be saved to your account.</p>
      : <p className="stay-form-note"><Link href={signInHref}>Sign in or create an account</Link> to keep this booking with your trips, or continue as a guest.</p>}
    <fieldset disabled={pending || expired}><legend className="stay-visually-hidden">Guest contact details</legend>
      <div className="stay-form-grid">
        <label className="stay-input">Full name<input required name="guestName" maxLength={200} autoComplete="name" value={fields.guestName} onChange={event => update('guestName', event.target.value)} /></label>
        <label className="stay-input">Email address<input required name="guestEmail" maxLength={320} type="email" autoComplete="email" inputMode="email" value={fields.guestEmail} onChange={event => update('guestEmail', event.target.value)} /><span className="stay-input-hint">The booking contact’s email. With your confirmation code, it lets you find this trip again.</span></label>
        <label className="stay-input">Phone <span className="stay-optional">optional</span><input name="guestPhone" maxLength={64} type="tel" autoComplete="tel" inputMode="tel" value={fields.guestPhone} onChange={event => update('guestPhone', event.target.value)} /></label>
      </div>
      <label className="stay-input">Arrival notes <span className="stay-optional">optional</span><textarea name="guestNotes" maxLength={2000} rows={4} placeholder="Approximate arrival, accessibility questions, or a note for your host" value={fields.guestNotes} onChange={event => update('guestNotes', event.target.value)} /><span className="stay-input-hint">Don’t include payment details, identity documents, or access codes.</span></label>
      {testBookings ? <fieldset><legend>Booking type</legend>
        <label className="stay-check"><input type="radio" name="bookingKind" value="real" checked={bookingKind === 'real'} onChange={() => setBookingKind('real')} /><span>A real stay. Arrange payment with the host.</span></label>
        <label className="stay-check"><input type="radio" name="bookingKind" value="test" checked={bookingKind === 'test'} onChange={() => setBookingKind('test')} /><span>A test booking to try card checkout. It holds no dates, isn’t a real stay, and is paid only with a Stripe test card. No real money is charged.</span></label>
      </fieldset> : null}
      <label className="stay-check"><input type="checkbox" name="consent" required /><span>I’ve reviewed the quote, house rules, cancellation terms, and the separate security deposit.</span></label>
      {termsOfUse ? <label className="stay-check"><input type="checkbox" name="storeTermsConsent" required /><span>I agree to the store’s <LegalDocumentAnchor document={termsOfUse} label={`Terms of use (version ${termsOfUse.version})`} />.</span></label> : null}
      {privacyPolicy ? <p className="stay-form-note">Your details are handled as described in the store’s <LegalDocumentAnchor document={privacyPolicy} label={`Privacy policy (version ${privacyPolicy.version})`} />. This is a notice; you aren’t asked to consent to marketing.</p> : null}
      <SubmitButton pendingLabel={instantBook ? 'Reserving your stay…' : 'Sending your request…'} block>{test ? instantBook ? 'Make test booking & continue to test payment' : 'Send test booking request' : instantBook ? 'Reserve this stay' : 'Send booking request'}<ArrowRight size={16} aria-hidden="true" /></SubmitButton>
    </fieldset>
    <p className="stay-form-note" role={pending ? 'status' : undefined}>{pending ? 'Keep this page open while your booking is submitted.' : test ? instantBook ? 'Your test booking is saved first, then you’ll enter a Stripe test card. Save the private trip link shown next.' : 'Once the host confirms your test booking, you can pay with a Stripe test card. Save the private trip link shown next.' : instantBook ? 'No payment is taken at this step. Arrange payment with the host and save your private trip link.' : 'No payment is taken while the host reviews your request. Save your private trip link to follow it.'}</p>
  </form>;
}

export type CancellationPreview = { status: 'assessed' | 'unassessed'; refundCents: number; reviewCents?: number; basis: string; assessmentId?: string } | null;

function cancellationRefundCopy(locale: string, preview: CancellationPreview, paidCents: number, currencyCode: string) {
  if (paidCents <= 0 || !preview) return 'Nothing has been paid, so no refund is needed.';
  const paid = formatMoney(locale, paidCents, currencyCode);
  if (preview.status === 'unassessed') return `You’ve paid ${paid}. ${preview.basis} Nothing is owed until they decide; they can return up to ${paid}, and their decision appears on this page.`;
  if (preview.refundCents <= 0) return `You’ve paid ${paid}. ${preview.basis} Cancelling now refunds nothing.`;
  return `You’ve paid ${paid}. ${preview.basis} Cancelling now refunds ${formatMoney(locale, preview.refundCents, currencyCode)}; your host issues it and its status appears on this page.`;
}

export function CancellationForm({ token, agreementToken, paidCents = 0, currencyCode = 'USD', preview = null, open = false }: { token: string; agreementToken: string; paidCents?: number; currencyCode?: string; preview?: CancellationPreview; open?: boolean }) {
  const locale = useStorefrontLocale();
  const [state, action, pending] = useActionState(cancelStayFormAction, initial);
  const [reason, setReason] = useState('');
  return <details className="stay-danger-zone" open={open || undefined}>
    <summary>Cancel this stay</summary>
    <p>Submitting this form cancels the reservation and releases its dates immediately.</p>
    <p>{cancellationRefundCopy(locale, preview, paidCents, currencyCode)}</p>
    <form action={action} className="stay-form" aria-busy={pending}>
      <input type="hidden" name="tripToken" value={token} /><input type="hidden" name="agreementToken" value={agreementToken} />
      {/* The exact assessment shown here (policy, window, rate, itinerary, amounts) is what the guest confirms. */}
      <input type="hidden" name="expectedRefundCents" value={preview ? preview.refundCents : 0} />
      <input type="hidden" name="expectedAssessmentId" value={preview?.assessmentId || ''} />
      {state.error ? <p className="stay-alert stay-alert-danger" role="alert">{state.error}</p> : null}
      <label className="stay-input">Reason for cancelling<textarea name="reason" required maxLength={2000} rows={3} value={reason} onChange={event => setReason(event.target.value)} /></label>
      <label className="stay-check"><input type="checkbox" required name="confirmCancellation" /><span>I understand this cancels my stay and releases its dates.</span></label>
      <SubmitButton pendingLabel="Cancelling your stay…" tone="danger">Confirm cancellation</SubmitButton>
    </form>
  </details>;
}

export function AgreementForm({ token, tripToken }: { token: string; tripToken: string }) {
  const [state, action, pending] = useActionState(signStayFormAction, initial);
  const [name, setName] = useState('');
  return <form action={action} className="stay-form" aria-busy={pending}>
    <input type="hidden" name="agreementToken" value={token} /><input type="hidden" name="tripToken" value={tripToken} />
    {state.error ? <div className="stay-alert stay-alert-danger" role="alert">{state.error}</div> : null}
    <label className="stay-input">Type your full name<input required name="signatureName" maxLength={200} autoComplete="name" value={name} onChange={event => setName(event.target.value)} /></label>
    <div className="stay-signature-preview" aria-hidden="true"><span>{name || 'Your signature'}</span></div>
    <label className="stay-check"><input type="checkbox" required name="consent" /><span>I’ve read the captured terms and house rules and agree to sign with the name above.</span></label>
    <SubmitButton pendingLabel="Recording your signature…" block>Sign stay agreement<ArrowRight size={16} aria-hidden="true" /></SubmitButton>
    <p className="stay-form-note">Your typed name and the signing time are recorded with this agreement.</p>
  </form>;
}
