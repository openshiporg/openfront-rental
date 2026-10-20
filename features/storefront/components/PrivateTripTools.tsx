'use client';
import { ArrowRight, Check, Copy, KeyRound, Printer } from 'lucide-react';
import { useState } from 'react';
import { parseTripLink } from '../lib/navigation';

export function PrivateTripEntry() {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  return <form className="stay-form" onSubmit={event => { event.preventDefault(); const path = parseTripLink(value, window.location.origin); if (!path) { setError('Paste the complete private trip link from this website. Only have a confirmation code? Use Find my trip.'); return; } window.location.assign(path); }}>
    <label className="stay-input" htmlFor="private-trip-link">Your private trip link
      <span className="stay-input-icon"><KeyRound size={16} aria-hidden="true" /><input id="private-trip-link" type="text" required autoComplete="off" spellCheck={false} autoCapitalize="none" value={value} onChange={event => { setValue(event.target.value); setError(''); }} placeholder="Paste the link saved after booking" aria-describedby="trip-link-help" aria-invalid={Boolean(error)} /></span>
    </label>
    <p id="trip-link-help" className="stay-form-note">The link is the key to your trip, so keep it private. It’s checked here and never saved to this browser.</p>
    {error ? <div role="alert" className="stay-alert stay-alert-danger">{error}</div> : null}
    <button type="submit" className="stay-button stay-button-block stay-button-large">Open your trip<ArrowRight size={16} aria-hidden="true" /></button>
  </form>;
}

export function SaveTripLink({ path, label = 'trip' }: { path: string; label?: 'trip' | 'conversation' }) {
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const conversation = label === 'conversation';
  return <div className="stay-save-trip">
    <span className="stay-save-trip-icon" aria-hidden="true"><KeyRound size={20} /></span>
    <div className="stay-save-trip-copy">
      <p className="stay-save-trip-title">{conversation ? 'Save this conversation link' : 'Save your private trip link'}</p>
      <p role="status" aria-live="polite">{message || (conversation ? 'Come back here to read the host’s replies. Anyone with the full link can read this conversation.' : 'Anyone with the full link can open this trip. If you lose it, Find my trip uses your confirmation code and booking email.')}</p>
    </div>
    <div className="stay-save-trip-actions">
      <button type="button" className="stay-button" onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}${path}`); setCopied(true); setMessage(conversation ? 'Conversation link copied. Keep it somewhere only you can access.' : 'Private trip link copied. Keep it somewhere only you can access.'); } catch { setMessage('Copy isn’t available here. Bookmark this page or save the full address, including its agreement details.'); } }}>{copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}{copied ? 'Copied' : 'Copy link'}</button>
      <button type="button" className="stay-button stay-button-quiet" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Print</button>
    </div>
  </div>;
}
