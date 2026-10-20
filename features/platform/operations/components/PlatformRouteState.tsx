'use client';

import { RotateCcw, TriangleAlert } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

function Bone({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded-md bg-muted motion-reduce:animate-none ${className}`} />;
}

/** Skeleton shaped like a platform list page: header, summary tiles, tabbed table. */
export function PlatformRouteLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="min-w-0">
      <span className="sr-only">Loading workspace…</span>
      <div className="flex h-16 items-center gap-3 border-b px-4"><Bone className="size-6" /><Bone className="h-4 w-48" /></div>
      <div className="space-y-6 px-4 pb-16 pt-6 md:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2"><Bone className="h-7 w-56" /><Bone className="h-4 w-80 max-w-full" /></div>
          <Bone className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="space-y-2 bg-card px-4 py-3.5"><Bone className="h-3 w-20" /><Bone className="h-7 w-16" /><Bone className="h-3 w-24" /></div>)}
        </div>
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between gap-4 border-b px-4 py-3"><div className="flex gap-3"><Bone className="h-5 w-16" /><Bone className="h-5 w-20" /><Bone className="h-5 w-14" /></div><Bone className="hidden h-9 w-64 sm:block" /></div>
          <div className="h-9 border-b bg-muted/40" />
          {Array.from({ length: 6 }, (_, index) => <div key={index} className="flex items-center gap-4 border-b px-4 py-3.5 last:border-b-0"><Bone className="size-8 rounded-full" /><div className="flex-1 space-y-1.5"><Bone className="h-4 w-1/3" /><Bone className="h-3 w-1/4" /></div><Bone className="hidden h-6 w-20 rounded-full md:block" /><Bone className="hidden h-4 w-16 lg:block" /></div>)}
        </div>
      </div>
    </div>
  );
}

/** Skeleton shaped like a platform record page: back link, title, facts, main + aside cards. */
export function PlatformDetailLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="min-w-0">
      <span className="sr-only">Loading record…</span>
      <div className="flex h-16 items-center gap-3 border-b px-4"><Bone className="size-6" /><Bone className="h-4 w-64" /></div>
      <div className="space-y-6 px-4 pb-16 pt-6 md:px-6">
        <div className="space-y-3"><Bone className="h-4 w-24" /><div className="flex items-center gap-3"><Bone className="h-7 w-72 max-w-full" /><Bone className="h-6 w-20 rounded-full" /></div><Bone className="h-4 w-96 max-w-full" /></div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="space-y-2 bg-card px-4 py-3.5"><Bone className="h-3 w-20" /><Bone className="h-7 w-24" /></div>)}
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">{[0, 1].map((card) => <div key={card} className="overflow-hidden rounded-xl border bg-card"><div className="border-b px-4 py-3"><Bone className="h-4 w-40" /></div><div className="space-y-3 p-4">{[0, 1, 2, 3].map((line) => <Bone key={line} className="h-4 w-full" />)}</div></div>)}</div>
          <div className="space-y-6">{[0, 1].map((card) => <div key={card} className="overflow-hidden rounded-xl border bg-card"><div className="border-b px-4 py-3"><Bone className="h-4 w-28" /></div><div className="space-y-3 p-4">{[0, 1, 2].map((line) => <Bone key={line} className="h-4 w-full" />)}</div></div>)}</div>
        </div>
      </div>
    </div>
  );
}

export function PlatformRouteError({ reset }: { reset: () => void }) {
  return (
    <div className="grid min-h-[60vh] place-items-center p-4 sm:p-6">
      <section role="alert" aria-live="assertive" className="w-full max-w-lg rounded-xl border bg-card p-6 text-center shadow-sm">
        <span className="mx-auto grid size-11 place-items-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"><TriangleAlert aria-hidden="true" className="size-5" /></span>
        <h1 className="mt-4 text-lg font-semibold tracking-tight">This page couldn’t load</h1>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={reset}><RotateCcw aria-hidden="true" />Try again</Button>
          <Button asChild variant="outline"><Link href="/dashboard">Dashboard</Link></Button>
        </div>
      </section>
    </div>
  );
}
