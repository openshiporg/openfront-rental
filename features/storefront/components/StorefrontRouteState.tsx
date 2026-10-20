'use client';

import { storefrontFontClass } from '../lib/fonts';

export function StorefrontRouteLoading() {
  return (
    <main className={`stay-root ${storefrontFontClass}`} aria-busy="true" aria-live="polite">
      <span className="stay-visually-hidden">Loading</span>
      <div className="stay-header"><div className="stay-shell stay-header-inner"><span className="stay-skeleton" style={{ width: '9rem', height: '1.6rem' }} /></div></div>
      <div className="stay-shell stay-loading">
        <span className="stay-skeleton" style={{ width: '40%', height: '3rem' }} />
        <span className="stay-skeleton" style={{ width: '60%', height: '1rem' }} />
        <div className="stay-loading-grid">
          {[0, 1, 2].map(item => <div key={item}><span className="stay-skeleton stay-skeleton-photo" /><span className="stay-skeleton" style={{ width: '70%', height: '1.2rem' }} /><span className="stay-skeleton" style={{ width: '45%', height: '.9rem' }} /></div>)}
        </div>
      </div>
    </main>
  );
}

export function StorefrontRouteError({ reset }: { reset: () => void }) {
  return (
    <main className={`stay-root ${storefrontFontClass}`}>
      <section role="alert" aria-live="assertive" className="stay-shell stay-state-page">
        <div className="stay-state-card">
          <p className="stay-overline">Something went wrong</p>
          <h1>This page is temporarily unavailable.</h1>
          <p>Try loading it again. If you just submitted a reservation, use Find my trip with your confirmation code and email before booking again.</p>
          <div className="stay-actions">
            <button type="button" className="stay-button" onClick={reset}>Try again</button>
            <a className="stay-text-link" href="/trips">Open your trip</a>
          </div>
        </div>
      </section>
    </main>
  );
}
