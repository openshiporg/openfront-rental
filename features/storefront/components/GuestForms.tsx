'use client';
import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { bookStayFormAction, cancelStayFormAction, signStayFormAction } from '../lib/data/stay-actions';
import { SubmitButton } from './SubmitButton';
const initial = { error: '' };
export function GuestBookingForm({ token, expiresAt, instantBook }: { token: string; expiresAt: string; instantBook: boolean }) {
  const [state, action, pending] = useActionState(bookStayFormAction, initial);
  const [fields, setFields] = useState({ guestName: '', guestEmail: '', guestPhone: '', guestNotes: '' });
  const [expired, setExpired] = useState(false);
  useEffect(() => { const check = () => setExpired(Date.now() >= new Date(expiresAt).getTime()); check(); const timer = setInterval(check, 15000); return () => clearInterval(timer); }, [expiresAt]);
  return <form action={action} className="stay-book-form" aria-busy={pending}>
    <input type="hidden" name="quoteToken" value={token} />
    {state.error ? <div className="stay-form-error" role="alert">{state.error} <Link href="/help">Get help</Link></div> : null}
    {expired ? <div className="stay-notice" role="status">This quote has expired. Use “Edit dates & guests” to request a fresh quote. Your contact details remain on this page until you leave.</div> : null}
    <fieldset disabled={pending || expired}><legend className="stay-visually-hidden">Guest contact details</legend>
      <label>Full name<input required name="guestName" maxLength={200} autoComplete="name" value={fields.guestName} onChange={event => setFields({ ...fields, guestName: event.target.value })} /></label>
      <label>Email address<input required name="guestEmail" maxLength={320} type="email" autoComplete="email" value={fields.guestEmail} onChange={event => setFields({ ...fields, guestEmail: event.target.value })} /><span>Use the booking contact’s email. No guest account is created.</span></label>
      <label>Phone number <span>(optional)</span><input name="guestPhone" maxLength={64} type="tel" autoComplete="tel" value={fields.guestPhone} onChange={event => setFields({ ...fields, guestPhone: event.target.value })} /></label>
      <label>Arrival notes <span>(optional)</span><textarea name="guestNotes" maxLength={2000} rows={4} placeholder="Approximate arrival, accessibility questions, or a note for your host" value={fields.guestNotes} onChange={event => setFields({ ...fields, guestNotes: event.target.value })} /><span>Do not include payment details, identity documents, or access codes.</span></label>
      <label className="stay-check-label"><input type="checkbox" name="consent" required /><span>I have reviewed the quote, house rules, cancellation terms, and separate payment and deposit arrangements.</span></label>
      <SubmitButton pendingLabel="Submitting your reservation…">{instantBook ? 'Reserve this stay' : 'Request this stay'} ↗</SubmitButton>
    </fieldset>
    <p className="stay-form-note" role={pending ? 'status' : undefined}>{pending ? 'Please keep this page open while the booking is submitted.' : 'No online payment is taken. Save the private trip link shown after a successful reservation; an email delivery is not guaranteed.'}</p>
  </form>;
}
export function CancellationForm({ token, agreementToken }: { token: string; agreementToken: string }) {
  const [state, action, pending] = useActionState(cancelStayFormAction, initial);
  const [reason, setReason] = useState('');
  return <details className="stay-cancel-details"><summary>Review cancellation</summary><p>Submitting this form cancels the reservation and releases its dates immediately. It does not automatically issue a refund. Any paid amount requires host policy review.</p><form action={action} className="stay-book-form" aria-busy={pending}><input type="hidden" name="tripToken" value={token} /><input type="hidden" name="agreementToken" value={agreementToken} />{state.error ? <p className="stay-form-error" role="alert">{state.error}</p> : null}<label>Reason for cancellation<textarea name="reason" required maxLength={2000} rows={3} value={reason} onChange={event => setReason(event.target.value)} /></label><label className="stay-check-label"><input type="checkbox" required name="confirmCancellation" /><span>I understand that this cancels my stay and any refund is a separate decision.</span></label><SubmitButton pendingLabel="Cancelling your stay…">Confirm cancellation</SubmitButton></form></details>;
}
export function AgreementForm({ token, tripToken }: { token: string; tripToken: string }) {
  const [state, action, pending] = useActionState(signStayFormAction, initial);
  const [name, setName] = useState('');
  return <form action={action} className="stay-sign-form" aria-busy={pending}><input type="hidden" name="agreementToken" value={token} /><input type="hidden" name="tripToken" value={tripToken} />{state.error ? <div className="stay-form-error" role="alert">{state.error}</div> : null}<label>Type your full name<input required name="signatureName" maxLength={200} autoComplete="name" value={name} onChange={event => setName(event.target.value)} /></label><label className="stay-check-label"><input type="checkbox" required name="consent" /><span>I have read the captured terms and house rules and agree to sign using the name entered above.</span></label><SubmitButton pendingLabel="Recording your signature…">Sign stay agreement ↗</SubmitButton><p className="stay-form-note">Your typed name and signing time are recorded with this agreement.</p></form>;
}
