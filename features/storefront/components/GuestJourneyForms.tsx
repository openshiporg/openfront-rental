'use client';
import { AlertTriangle, ArrowRight, BookmarkPlus, Send } from 'lucide-react';
import { useActionState, useState } from 'react';

import {
  claimTripAction,
  recoverTripAction,
  replyToThreadAction,
  requestTripChangeAction,
  sendTripMessageAction,
  submitInquiryAction,
  submitStayReviewAction,
} from '../lib/data/guest-actions';
import { SubmitButton } from './SubmitButton';

const initial = { error: '' };

function FormError({ message }: { message: string }) {
  return message ? <div className="stay-alert stay-alert-danger" role="alert"><AlertTriangle size={16} aria-hidden="true" /><p>{message}</p></div> : null;
}

export function InquiryForm({ stay, stayTitle }: { stay: string; stayTitle?: string }) {
  const [state, action, pending] = useActionState(submitInquiryAction, initial);
  const [fields, setFields] = useState({ name: '', email: '', message: '' });
  return <form action={action} className="stay-form" aria-busy={pending}>
    <input type="hidden" name="stay" value={stay} />
    <FormError message={state.error} />
    {stayTitle ? <p className="stay-form-note">About: <strong>{stayTitle}</strong></p> : null}
    <div className="stay-form-grid">
      <label className="stay-input">Your name<input required name="name" maxLength={200} autoComplete="name" value={fields.name} onChange={event => setFields({ ...fields, name: event.target.value })} /></label>
      <label className="stay-input">Email address<input required name="email" type="email" maxLength={320} autoComplete="email" inputMode="email" value={fields.email} onChange={event => setFields({ ...fields, email: event.target.value })} /></label>
    </div>
    <label className="stay-input">Message<textarea required name="message" rows={5} maxLength={4000} placeholder="Dates you have in mind, who’s travelling, and your question" value={fields.message} onChange={event => setFields({ ...fields, message: event.target.value })} /><span className="stay-input-hint">Don’t include card numbers, identity documents, or entry codes.</span></label>
    <SubmitButton pendingLabel="Sending…">Send to the host<Send size={16} aria-hidden="true" /></SubmitButton>
    <p className="stay-form-note">Your message goes to the host’s inbox. You’ll get a private link to this conversation, where their replies appear.</p>
  </form>;
}

export function ThreadReplyForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(replyToThreadAction, initial);
  const [message, setMessage] = useState('');
  return <form action={action} className="stay-form" aria-busy={pending}>
    <input type="hidden" name="threadToken" value={token} />
    <FormError message={state.error} />
    <label className="stay-input">Reply<textarea required name="message" rows={4} maxLength={4000} value={message} onChange={event => setMessage(event.target.value)} /></label>
    <SubmitButton pendingLabel="Sending…">Send reply<Send size={16} aria-hidden="true" /></SubmitButton>
  </form>;
}

const topics = [
  { value: 'general', label: 'General question' },
  { value: 'arrival', label: 'Arrival or access' },
  { value: 'change_request', label: 'Change to my booking' },
  { value: 'cancellation', label: 'Cancellation or refund' },
  { value: 'deposit', label: 'Security deposit' },
  { value: 'damage_claim', label: 'Response to a damage claim' },
];

export function TripMessageForm({ token, agreementToken, defaultTopic = 'general' }: { token: string; agreementToken: string; defaultTopic?: string }) {
  const [state, action, pending] = useActionState(sendTripMessageAction, initial);
  const [topic, setTopic] = useState(topics.some(entry => entry.value === defaultTopic) ? defaultTopic : 'general');
  const [message, setMessage] = useState('');
  return <form action={action} className="stay-form" aria-busy={pending}>
    <input type="hidden" name="tripToken" value={token} /><input type="hidden" name="agreementToken" value={agreementToken} />
    <FormError message={state.error} />
    <label className="stay-input">Topic<select name="topic" value={topic} onChange={event => setTopic(event.target.value)}>{topics.map(entry => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select></label>
    <label className="stay-input">Message<textarea required name="message" rows={4} maxLength={3800} value={message} onChange={event => setMessage(event.target.value)} /><span className="stay-input-hint">Don’t include card numbers or identity documents.</span></label>
    <SubmitButton pendingLabel="Sending…">Send to your host<Send size={16} aria-hidden="true" /></SubmitButton>
  </form>;
}

export function ChangeRequestForm({ token, agreementToken, current, partyVersion = null }: { token: string; agreementToken: string; current: { checkIn: string; checkOut: string; adults: number; children: number; infants: number; pets: number }; partyVersion?: string | null }) {
  const [state, action, pending] = useActionState(requestTripChangeAction, initial);
  return <details className="stay-disclosure">
    <summary>Request a change</summary>
    <form action={action} className="stay-form" aria-busy={pending}>
      <input type="hidden" name="tripToken" value={token} /><input type="hidden" name="agreementToken" value={agreementToken} />
      {partyVersion ? <input type="hidden" name="partyVersion" value={partyVersion} /> : null}
      <FormError message={state.error} />
      <div className="stay-form-grid">
        <label className="stay-input">New check-in <span className="stay-optional">optional</span><input type="date" name="checkIn" defaultValue={current.checkIn} /></label>
        <label className="stay-input">New checkout <span className="stay-optional">optional</span><input type="date" name="checkOut" defaultValue={current.checkOut} /></label>
      </div>
      <div className="stay-form-grid">
        <label className="stay-input">Adults<input type="number" name="adults" min={1} max={50} defaultValue={current.adults} /></label>
        <label className="stay-input">Children<input type="number" name="children" min={0} max={50} defaultValue={current.children} /></label>
        <label className="stay-input">Infants<input type="number" name="infants" min={0} max={50} defaultValue={current.infants} /></label>
        <label className="stay-input">Pets<input type="number" name="pets" min={0} max={50} defaultValue={current.pets} /></label>
      </div>
      <label className="stay-check"><input type="checkbox" name="otherHome" /><span>I’m open to moving to a different home.</span></label>
      <label className="stay-input">Details <span className="stay-optional">optional</span><textarea name="details" rows={3} maxLength={2000} placeholder="An extension, a shorter stay, an extra guest…" /></label>
      <SubmitButton pendingLabel="Sending request…">Send change request<ArrowRight size={16} aria-hidden="true" /></SubmitButton>
      <p className="stay-form-note">Your booking stays as it is until the host confirms the change. They’ll check availability and let you know any price difference here.</p>
    </form>
  </details>;
}

const categoryRatings = [
  { name: 'cleanlinessRating', label: 'Cleanliness' },
  { name: 'accuracyRating', label: 'Accuracy' },
  { name: 'communicationRating', label: 'Communication' },
  { name: 'locationRating', label: 'Location' },
  { name: 'valueRating', label: 'Value' },
];

function RatingSelect({ name, label, required = false }: { name: string; label: string; required?: boolean }) {
  return <label className="stay-input">{label}{required ? null : <span className="stay-optional"> optional</span>}
    <select name={name} required={required} defaultValue="">
      <option value="" disabled={required}>{required ? 'Choose a rating' : 'No rating'}</option>
      {[5, 4, 3, 2, 1].map(score => <option key={score} value={score}>{score} {score === 1 ? 'star' : 'stars'}</option>)}
    </select>
  </label>;
}

export function ReviewForm({ token, agreementToken }: { token: string; agreementToken: string }) {
  const [state, action, pending] = useActionState(submitStayReviewAction, initial);
  return <form action={action} className="stay-form" aria-busy={pending}>
    <input type="hidden" name="tripToken" value={token} /><input type="hidden" name="agreementToken" value={agreementToken} />
    <FormError message={state.error} />
    <RatingSelect name="overallRating" label="Overall" required />
    <div className="stay-form-grid">{categoryRatings.map(entry => <RatingSelect key={entry.name} {...entry} />)}</div>
    <label className="stay-input">Your review <span className="stay-optional">optional</span><textarea name="body" rows={4} maxLength={4000} placeholder="What should the next guest know?" /></label>
    <label className="stay-input">Private note to the host <span className="stay-optional">optional</span><textarea name="privateFeedback" rows={3} maxLength={2000} /><span className="stay-input-hint">Only the host sees this note.</span></label>
    <SubmitButton pendingLabel="Saving your review…">Submit review<ArrowRight size={16} aria-hidden="true" /></SubmitButton>
    <p className="stay-form-note">The host reviews submissions before they’re published on the home’s page.</p>
  </form>;
}

export function RecoverTripForm({ signedIn }: { signedIn: boolean }) {
  const [state, action, pending] = useActionState(recoverTripAction, initial);
  const [fields, setFields] = useState({ confirmationCode: '', email: '' });
  return <form action={action} className="stay-form" aria-busy={pending}>
    <FormError message={state.error} />
    <label className="stay-input">Confirmation code<input required name="confirmationCode" maxLength={64} autoComplete="off" spellCheck={false} autoCapitalize="characters" placeholder="STAY-…" value={fields.confirmationCode} onChange={event => setFields({ ...fields, confirmationCode: event.target.value })} /></label>
    <label className="stay-input">Booking email<input required name="email" type="email" maxLength={320} autoComplete="email" inputMode="email" value={fields.email} onChange={event => setFields({ ...fields, email: event.target.value })} /></label>
    {signedIn ? <label className="stay-check"><input type="checkbox" name="addToAccount" defaultChecked /><span>Save this trip to my account</span></label> : null}
    <SubmitButton pendingLabel="Finding your trip…" block>Find my trip<ArrowRight size={16} aria-hidden="true" /></SubmitButton>
    <p className="stay-form-note">We’ll open your trip with a fresh private link. Older links for this trip stop working.</p>
  </form>;
}

export function ClaimTripForm({ token, agreementToken }: { token: string; agreementToken: string }) {
  const [state, action, pending] = useActionState(claimTripAction, initial);
  return <form action={action} className="stay-form" aria-busy={pending}>
    <input type="hidden" name="tripToken" value={token} /><input type="hidden" name="agreementToken" value={agreementToken} />
    <FormError message={state.error} />
    <SubmitButton pendingLabel="Saving…">Save to my account<BookmarkPlus size={16} aria-hidden="true" /></SubmitButton>
  </form>;
}
