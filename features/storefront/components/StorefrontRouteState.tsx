'use client';

export function StorefrontRouteLoading() {
  return (
    <main className="stay-root" aria-busy="true" aria-live="polite">
      <div className="stay-shell stay-token-page">
        <span className="sr-only">Loading Housekind</span>
        <div className="h-8 w-48 max-w-full animate-pulse rounded bg-[var(--stay-paper-deep)] motion-reduce:animate-none" />
        <div className="mt-8 h-72 animate-pulse rounded-[var(--stay-radius-large)] bg-[var(--stay-paper-deep)] motion-reduce:animate-none" />
      </div>
    </main>
  );
}

export function StorefrontRouteError({ reset }: { reset: () => void }) {
  return (
    <main className="stay-root">
      <section role="alert" aria-live="assertive" className="stay-shell stay-token-page">
        <p className="stay-overline">Housekind</p>
        <h1>Housekind is temporarily unavailable.</h1>
        <p>Try loading this page again. If you just submitted a reservation, check your private trip link or contact support before booking again.</p>
        <button type="button" onClick={reset}>Try again</button>
      </section>
    </main>
  );
}
