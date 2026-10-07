'use client';
import { useState } from 'react';
import { parseTripLink } from '../lib/navigation';
export function PrivateTripEntry() {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  return <form className="stay-book-form" onSubmit={event => { event.preventDefault(); const path = parseTripLink(value, window.location.origin); if (!path) { setError('Paste the complete private trip link from this website, including any agreement details. A confirmation code alone cannot open a trip.'); return; } window.location.assign(path); }}><label htmlFor="private-trip-link">Your private trip link<input id="private-trip-link" type="text" required autoComplete="off" spellCheck={false} autoCapitalize="none" value={value} onChange={event => setValue(event.target.value)} placeholder="Paste the link saved after booking" aria-describedby="trip-link-help" aria-invalid={Boolean(error)} /></label><p id="trip-link-help" className="stay-form-note">The link is your key to this trip. Keep it private. It is checked here and is not saved to this browser’s storage.</p>{error ? <div role="alert" className="stay-form-error">{error}</div> : null}<button type="submit" className="stay-button">Open your trip ↗</button></form>;
}
export function SaveTripLink({ path }: { path: string }) {
  const [message, setMessage] = useState('');
  return <div className="stay-save-trip"><button type="button" className="stay-button" onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}${path}`); setMessage('Private trip link copied. Save it somewhere only you can access.'); } catch { setMessage('Copy is unavailable. Save or bookmark the full address in your browser, including its agreement details.'); } }}>Copy private trip link</button><p role="status" aria-live="polite">{message || 'Save the full link, including the agreement details. Anyone with it can access this trip.'}</p><button type="button" className="stay-plain-button" onClick={() => window.print()}>Print trip details</button></div>;
}
