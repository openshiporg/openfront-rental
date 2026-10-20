/*
 * Openfront Rental platform UI kit — server-safe layout, data-display, and feedback primitives
 * shared by every /dashboard/platform/* page. Visual language follows the Openfront
 * E-commerce and Restaurant platform pages: quiet headers, summary tiles that double as
 * filters, tabbed tables, rounded-xl cards, and dot status badges.
 */
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, Info, OctagonAlert, Star } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { PageBreadcrumbs } from '@/features/dashboard/components/PageBreadcrumbs';
import { cn } from '@/lib/utils';
import { initials, operationalTone, sentence, type OperationalTone } from '../lib/operations';

/* ───────────────────────── tones ───────────────────────── */

export const toneDot: Record<OperationalTone, string> = {
  neutral: 'bg-zinc-400 ring-zinc-400/20 dark:bg-zinc-500',
  success: 'bg-emerald-500 ring-emerald-500/20',
  warning: 'bg-amber-500 ring-amber-500/25',
  danger: 'bg-rose-500 ring-rose-500/20',
  info: 'bg-sky-500 ring-sky-500/20',
};

export const toneText: Record<OperationalTone, string> = {
  neutral: 'text-foreground',
  success: 'text-emerald-700 dark:text-emerald-400',
  warning: 'text-amber-700 dark:text-amber-400',
  danger: 'text-rose-700 dark:text-rose-400',
  info: 'text-sky-700 dark:text-sky-400',
};

const toneSurface: Record<OperationalTone, string> = {
  neutral: 'border-border bg-muted/40 text-foreground',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100',
  warning: 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100',
  danger: 'border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100',
  info: 'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100',
};

const toneIcon: Record<OperationalTone, LucideIcon> = {
  neutral: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: OctagonAlert,
  info: Info,
};

/* ───────────────────────── page shell ───────────────────────── */

export function PlatformPage({ section, sectionHref, current, children }: { section: string; sectionHref: string; current?: string; children: ReactNode }) {
  return <>
    <PageBreadcrumbs items={[
      { type: 'link', label: 'Dashboard', href: '/' },
      { type: 'page', label: 'Platform' },
      current ? { type: 'link', label: section, href: sectionHref } : { type: 'page', label: section },
      ...(current ? [{ type: 'page' as const, label: current }] : []),
    ]} />
    <div className="min-w-0 pb-16">{children}</div>
  </>;
}

export function PageHeader({ title, description, actions, badges, back, meta }: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  badges?: ReactNode;
  back?: { href: string; label: string };
  meta?: ReactNode;
}) {
  return <header className="px-4 pb-5 pt-5 md:px-6 md:pt-6">
    {back ? <Link href={back.href} className="mb-3 inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="size-4" />{back.label}</Link> : null}
    <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="min-w-0 text-2xl font-semibold tracking-tight [overflow-wrap:anywhere]">{title}</h1>
          {badges ? <div className="flex flex-wrap items-center gap-1.5">{badges}</div> : null}
        </div>
        {description ? <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
        {meta ? <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">{meta}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  </header>;
}

/** Icon + text pair for the header meta row. */
export function MetaItem({ icon: Icon, children }: { icon?: LucideIcon; children: ReactNode }) {
  return <span className="inline-flex min-w-0 items-center gap-1.5">{Icon ? <Icon className="size-4 shrink-0 opacity-70" /> : null}<span className="min-w-0 [overflow-wrap:anywhere]">{children}</span></span>;
}

export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('min-w-0 space-y-6 px-4 md:px-6', className)}>{children}</div>;
}

export function DetailGrid({ main, aside }: { main: ReactNode; aside?: ReactNode }) {
  if (!aside) return <div className="min-w-0 space-y-6">{main}</div>;
  return <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
    <div className="min-w-0 space-y-6">{main}</div>
    <aside className="min-w-0 space-y-6">{aside}</aside>
  </div>;
}

export function TwoColumn({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid min-w-0 items-start gap-6 lg:grid-cols-2', className)}>{children}</div>;
}

/* ───────────────────────── summary tiles ───────────────────────── */

export interface StatTile {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: OperationalTone;
  icon?: LucideIcon;
  /** When set the tile becomes a filter link. */
  href?: string;
  active?: boolean;
}

const tileColumns: Record<number, string> = { 1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6' };

export function StatTiles({ items, label = 'Summary' }: { items: StatTile[]; label?: string }) {
  return <section aria-label={label} className={cn(
    'grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border shadow-xs',
    '[&>*:last-child:nth-child(odd)]:col-span-2 lg:[&>*:last-child:nth-child(odd)]:col-span-1',
    tileColumns[items.length] || 'lg:grid-cols-4',
  )}>
    {items.map((item) => {
      const Icon = item.icon;
      const body = <>
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">{Icon ? <Icon className="size-3.5" /> : null}<span className="truncate">{item.label}</span></span>
        <span className={cn('truncate text-2xl font-semibold tabular-nums tracking-tight', toneText[item.tone && item.tone !== 'neutral' ? item.tone : 'neutral'])}>{item.value}</span>
        {item.hint ? <span className="truncate text-xs text-muted-foreground">{item.hint}</span> : null}
      </>;
      const base = 'relative flex min-w-0 flex-col gap-1 bg-card px-4 py-3.5';
      return item.href
        ? <Link key={item.label} href={item.href} aria-current={item.active ? 'true' : undefined} className={cn(base, 'transition-colors hover:bg-muted/50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring', item.active && 'bg-muted/60 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-foreground')}>{body}</Link>
        : <div key={item.label} className={base}>{body}</div>;
    })}
  </section>;
}

/* ───────────────────────── cards ───────────────────────── */

export function Section({ title, description, icon: Icon, action, count, children, footer, flush, id, className }: {
  title?: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  count?: number;
  children: ReactNode;
  footer?: ReactNode;
  /** Remove body padding (tables, row lists). */
  flush?: boolean;
  id?: string;
  className?: string;
}) {
  return <section id={id} className={cn('min-w-0 scroll-mt-20 overflow-hidden rounded-xl border bg-card shadow-xs', className)}>
    {title ? <header className="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b px-4 py-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground" /> : null}
          <span className="min-w-0 truncate">{title}</span>
          {count != null ? <span className="rounded-md bg-muted px-1.5 text-xs font-medium leading-5 tabular-nums text-muted-foreground">{count}</span> : null}
        </h2>
        {description ? <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </header> : null}
    <div className={flush ? undefined : 'p-4'}>{children}</div>
    {footer ? <footer className="border-t bg-muted/30 px-4 py-2.5 text-xs leading-5 text-muted-foreground">{footer}</footer> : null}
  </section>;
}

/** Label/value rows for narrow cards and asides. */
export function DescriptionList({ items }: { items: Array<{ label: ReactNode; value: ReactNode; hint?: ReactNode } | false | null | undefined> }) {
  const rows = items.filter(Boolean) as Array<{ label: ReactNode; value: ReactNode; hint?: ReactNode }>;
  return <dl className="divide-y">
    {rows.map((item, index) => <div key={index} className="flex min-w-0 items-baseline justify-between gap-4 px-4 py-2.5 text-sm">
      <dt className="shrink-0 text-muted-foreground">{item.label}</dt>
      <dd className="min-w-0 text-right font-medium [overflow-wrap:anywhere]">{item.value}{item.hint ? <span className="block text-xs font-normal text-muted-foreground">{item.hint}</span> : null}</dd>
    </div>)}
  </dl>;
}

/** Stacked label/value grid for wide sections. */
export function FactGrid({ items, columns = 3 }: { items: Array<{ label: ReactNode; value: ReactNode; hint?: ReactNode } | false | null | undefined>; columns?: 2 | 3 | 4 }) {
  const rows = items.filter(Boolean) as Array<{ label: ReactNode; value: ReactNode; hint?: ReactNode }>;
  return <dl className={cn('grid gap-x-6 gap-y-4 sm:grid-cols-2', columns === 3 && 'lg:grid-cols-3', columns === 4 && 'lg:grid-cols-4')}>
    {rows.map((item, index) => <div key={index} className="min-w-0">
      <dt className="text-xs text-muted-foreground">{item.label}</dt>
      <dd className="mt-1 text-sm font-medium [overflow-wrap:anywhere]">{item.value}</dd>
      {item.hint ? <dd className="mt-0.5 text-xs text-muted-foreground">{item.hint}</dd> : null}
    </div>)}
  </dl>;
}

/* ───────────────────────── badges ───────────────────────── */

export function StatusBadge({ status, label, tone, className }: { status?: string | null; label?: ReactNode; tone?: OperationalTone; className?: string }) {
  const resolved = tone || operationalTone(status);
  return <span className={cn('inline-flex h-6 max-w-full shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border bg-background px-2.5 text-xs font-medium text-foreground/80 shadow-xs', className)}>
    <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full ring-[3px]', toneDot[resolved])} />
    <span className="truncate">{label ?? sentence(status)}</span>
  </span>;
}

export function Pill({ children, tone, className, title }: { children: ReactNode; tone?: OperationalTone; className?: string; title?: string }) {
  return <span title={title} className={cn(
    'inline-flex h-6 max-w-full items-center gap-1 whitespace-nowrap rounded-md border px-2 text-xs',
    tone && tone !== 'neutral' ? toneSurface[tone] : 'bg-muted/40 text-muted-foreground',
    className,
  )}>{children}</span>;
}

export function Dot({ tone = 'neutral', className }: { tone?: OperationalTone; className?: string }) {
  return <span aria-hidden="true" className={cn('inline-block size-1.5 shrink-0 rounded-full ring-[3px]', toneDot[tone], className)} />;
}

export function Avatar({ name, className }: { name?: string | null; className?: string }) {
  return <span aria-hidden="true" className={cn('grid size-8 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground ring-1 ring-border', className)}>{initials(name)}</span>;
}

export function Stars({ rating, className }: { rating?: number | null; className?: string }) {
  const value = Math.max(0, Math.min(5, Math.round(rating || 0)));
  return <span className={cn('inline-flex items-center gap-0.5', className)} role="img" aria-label={rating ? `${rating} out of 5` : 'Not rated'}>
    {Array.from({ length: 5 }, (_, index) => <Star key={index} aria-hidden="true" className={cn('size-3.5', index < value ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground/30')} />)}
  </span>;
}

/* ───────────────────────── feedback ───────────────────────── */

export function Callout({ tone = 'neutral', title, children, action, live, icon, className }: {
  tone?: OperationalTone;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  /** Announce to assistive tech (errors and action results). */
  live?: boolean;
  icon?: LucideIcon;
  className?: string;
}) {
  const Icon = icon || toneIcon[tone];
  return <div role={live ? (tone === 'danger' || tone === 'warning' ? 'alert' : 'status') : undefined} className={cn('flex min-w-0 gap-3 rounded-xl border px-4 py-3 text-sm', toneSurface[tone], className)}>
    <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 opacity-80" />
    <div className="min-w-0 flex-1">
      <p className="font-medium">{title}</p>
      {children ? <div className="mt-0.5 leading-6 opacity-90">{children}</div> : null}
    </div>
    {action ? <div className="shrink-0 self-center">{action}</div> : null}
  </div>;
}

export function EmptyState({ icon: Icon = Info, title, description, action, compact }: { icon?: LucideIcon; title: string; description?: ReactNode; action?: ReactNode; compact?: boolean }) {
  return <div className={cn('flex flex-col items-center px-6 text-center', compact ? 'py-8' : 'py-14')}>
    <span className="grid size-11 place-items-center rounded-xl border bg-background shadow-sm"><Icon aria-hidden="true" className="size-5 text-muted-foreground" /></span>
    <h3 className="mt-4 text-sm font-semibold">{title}</h3>
    {description ? <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p> : null}
    {action ? <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div> : null}
  </div>;
}

/** A quiet single-line empty row inside a card. */
export function EmptyRow({ children }: { children: ReactNode }) {
  return <p className="px-4 py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

export interface AttentionItem {
  id: string;
  title: ReactNode;
  detail?: ReactNode;
  href?: string;
  actionLabel?: string;
  tone?: OperationalTone;
  /** Resolved outside the product (provider, jurisdiction, owner). */
  external?: boolean;
}

function AttentionRow({ item }: { item: AttentionItem }) {
  return <li className="flex min-w-0 items-start gap-3 px-4 py-3">
    <Dot tone={item.external ? 'neutral' : item.tone || 'warning'} className="mt-[7px]" />
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium [overflow-wrap:anywhere]">{item.title}</p>
      {item.detail ? <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{item.detail}</p> : null}
      {item.external ? <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">Handled externally</p> : null}
    </div>
    {item.href && !item.external ? <Link href={item.href} className="inline-flex shrink-0 items-center gap-1 rounded-sm text-xs font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{item.actionLabel || 'Open'}<ArrowRight className="size-3" /></Link> : null}
  </li>;
}

/** The first `limit` items, then a native disclosure that reveals the rest with their actions. */
export function AttentionList({ items, empty = 'Nothing needs attention.', limit = 8 }: { items: AttentionItem[]; empty?: string; limit?: number }) {
  if (!items.length) return <p className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground"><CheckCircle2 className="size-4 text-emerald-600" />{empty}</p>;
  const shown = items.slice(0, limit);
  const rest = items.slice(limit);
  return <ul className="divide-y">
    {shown.map((item) => <AttentionRow key={item.id} item={item} />)}
    {rest.length ? <li>
      <details className="group/more">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <span className="group-open/more:hidden">Show {rest.length} more</span>
          <span className="hidden group-open/more:inline">Show fewer</span>
          <ChevronDown aria-hidden="true" className="size-3.5 transition-transform group-open/more:rotate-180" />
        </summary>
        <ul className="divide-y border-t">
          {rest.map((item) => <AttentionRow key={item.id} item={item} />)}
        </ul>
      </details>
    </li> : null}
  </ul>;
}

/* ───────────────────────── progress ───────────────────────── */

export function ReadinessSegments({ checks, showMissing }: { checks: Array<{ id: string; label: string; ready: boolean }>; showMissing?: boolean }) {
  const ready = checks.filter((check) => check.ready).length;
  const complete = ready === checks.length;
  const missing = checks.filter((check) => !check.ready);
  return <div className="min-w-0">
    <div className="flex items-center gap-2">
      <span role="img" aria-label={`${ready} of ${checks.length} readiness checks complete`} className="flex gap-0.5">
        {checks.map((check) => <span key={check.id} title={`${check.label}: ${check.ready ? 'complete' : 'missing'}`} className={cn('h-1.5 w-3.5 rounded-full', check.ready ? (complete ? 'bg-emerald-500' : 'bg-foreground/60') : 'bg-muted-foreground/20')} />)}
      </span>
      <span className={cn('text-xs font-medium tabular-nums', complete ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground')}>{complete ? 'Ready' : `${ready}/${checks.length}`}</span>
    </div>
    {showMissing && missing.length ? <p className="mt-1 max-w-64 truncate text-xs text-amber-700 dark:text-amber-400" title={missing.map((check) => check.label).join(', ')}>Needs {missing.map((check) => check.label.toLowerCase()).join(', ')}</p> : null}
  </div>;
}

/**
 * `label` is the bar's accessible name (what is measured, e.g. "Cleanliness score"); `valueText`
 * says the value on its own scale ("4 out of 5") and is shown beside the bar with `showValue`.
 */
export function ProgressBar({ value, max = 100, tone, label, valueText, showValue }: { value: number; max?: number; tone?: OperationalTone; label: string; valueText?: string; showValue?: boolean }) {
  const scale = max > 0 ? max : 100;
  const clamped = Math.max(0, Math.min(value, scale));
  const percent = (clamped / scale) * 100;
  const text = valueText || `${Math.round(percent)}%`;
  const resolved = tone || (percent === 100 ? 'success' : percent >= 60 ? 'warning' : 'danger');
  const fill: Record<OperationalTone, string> = { neutral: 'bg-foreground/70', success: 'bg-emerald-500', warning: 'bg-amber-500', danger: 'bg-rose-500', info: 'bg-sky-500' };
  return <div className="flex min-w-0 items-center gap-2">
    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={label} aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={scale} aria-valuetext={text}><div className={cn('h-full rounded-full', fill[resolved])} style={{ width: `${percent}%` }} /></div>
    {showValue ? <span aria-hidden="true" className="shrink-0 text-xs tabular-nums text-muted-foreground">{text}</span> : null}
  </div>;
}

/* ───────────────────────── lists ───────────────────────── */

export interface TimelineItem {
  id: string;
  title: ReactNode;
  meta?: ReactNode;
  time?: ReactNode;
  tone?: OperationalTone;
  href?: string;
  badge?: ReactNode;
}

export function Timeline({ items, empty = 'Nothing recorded yet.' }: { items: TimelineItem[]; empty?: string }) {
  if (!items.length) return <EmptyRow>{empty}</EmptyRow>;
  return <ol className="px-4 py-4">
    {items.map((item, index) => {
      const title = item.href ? <Link href={item.href} className="rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{item.title}</Link> : <span className="font-medium">{item.title}</span>;
      return <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
        {index < items.length - 1 ? <span aria-hidden="true" className="absolute left-[3px] top-3 h-full w-px bg-border" /> : null}
        <Dot tone={item.tone} className="relative mt-[7px]" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
            <span className="min-w-0 [overflow-wrap:anywhere]">{title}</span>
            {item.time ? <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{item.time}</span> : null}
          </div>
          {item.meta || item.badge ? <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{item.badge}{item.meta}</div> : null}
        </div>
      </li>;
    })}
  </ol>;
}

/** Linked row list for asides and small collections. */
export function LinkRows({ items, empty }: { items: Array<{ id: string; href?: string; title: ReactNode; meta?: ReactNode; trailing?: ReactNode; leading?: ReactNode }>; empty?: string }) {
  if (!items.length) return <EmptyRow>{empty || 'Nothing here yet.'}</EmptyRow>;
  return <ul className="divide-y">
    {items.map((item) => {
      const content = <>
        {item.leading ? <span className="shrink-0">{item.leading}</span> : null}
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.title}</span>{item.meta ? <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.meta}</span> : null}</span>
        {item.trailing ? <span className="shrink-0">{item.trailing}</span> : item.href ? <ArrowRight className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" /> : null}
      </>;
      const classes = 'group flex min-w-0 items-center gap-3 px-4 py-3';
      return <li key={item.id}>{item.href ? <Link href={item.href} className={cn(classes, 'transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring')}>{content}</Link> : <div className={classes}>{content}</div>}</li>;
    })}
  </ul>;
}

/* ───────────────────────── tables ───────────────────────── */

/** Primary-cell link that makes the whole table row clickable. */
export function RowLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return <Link href={href} className={cn('font-medium text-foreground after:absolute after:inset-0 hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:after:rounded-sm focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring', className)}>{children}</Link>;
}

/** Keep interactive controls clickable above a stretched RowLink. */
export function RowAction({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('relative z-10 inline-flex items-center gap-2', className)}>{children}</div>;
}

export function Muted({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('text-muted-foreground', className)}>{children}</span>;
}

/** Secondary line under a primary cell; `mobileOnly` shows columns hidden on small screens. */
export function SubLine({ children, mobileOnly, className }: { children: ReactNode; mobileOnly?: 'sm' | 'md' | 'lg'; className?: string }) {
  return <span className={cn('mt-0.5 block truncate text-xs text-muted-foreground', mobileOnly === 'sm' && 'sm:hidden', mobileOnly === 'md' && 'md:hidden', mobileOnly === 'lg' && 'lg:hidden', className)}>{children}</span>;
}
