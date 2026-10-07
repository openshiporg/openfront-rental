'use client';

import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function PlatformRouteLoading() {
  return (
    <main aria-busy="true" aria-live="polite" className="space-y-6 p-4 sm:p-6">
      <span className="sr-only">Loading operator workspace</span>
      <div className="h-8 w-64 max-w-full animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-lg border bg-muted/50 motion-reduce:animate-none" />)}
      </div>
      <div className="h-72 animate-pulse rounded-lg border bg-muted/40 motion-reduce:animate-none" />
    </main>
  );
}

export function PlatformRouteError({ reset }: { reset: () => void }) {
  return (
    <main className="p-4 sm:p-6">
      <section role="alert" aria-live="assertive" className="mx-auto max-w-2xl rounded-lg border border-amber-300 bg-amber-50 p-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
        <AlertTriangle aria-hidden="true" className="mb-4 h-6 w-6" />
        <h1 className="text-xl font-semibold">Operator workspace unavailable</h1>
        <p className="mt-2 text-sm">The workspace could not be loaded safely. No action was applied. Try the request again.</p>
        <Button type="button" className="mt-5" onClick={reset}>Try again</Button>
      </section>
    </main>
  );
}
