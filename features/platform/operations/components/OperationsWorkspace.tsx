/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4
 * Hallmark · workbench · genre: modern-minimal · theme: existing dashboard system
 */
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, ArrowRight, CircleCheck, CircleDashed, CircleHelp, Settings2 } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { PageBreadcrumbs } from '@/features/dashboard/components/PageBreadcrumbs';
import { cn } from '@/lib/utils';
import { humanize, type OperationalTone } from '../lib/operations';

export function Workspace({ children }: { children: ReactNode }) {
  return <main className="min-w-0 bg-background pb-12">{children}</main>;
}

export function PlatformBreadcrumbs({ sectionLabel, sectionHref, currentLabel }: { sectionLabel: string; sectionHref: string; currentLabel?: string }) {
  return <PageBreadcrumbs items={[
    { type: 'link', label: 'Dashboard', href: '/' },
    { type: 'link', label: 'Host operations', href: '/platform/properties' },
    currentLabel ? { type: 'link', label: sectionLabel, href: sectionHref } : { type: 'page', label: sectionLabel },
    ...(currentLabel ? [{ type: 'page' as const, label: currentLabel }] : []),
  ]} />;
}

export function WorkspaceHeader({ eyebrow, title, description, actions, sectionLabel, sectionHref, currentLabel }: { eyebrow: string; title: string; description: string; actions?: ReactNode; sectionLabel: string; sectionHref: string; currentLabel?: string }) {
  return <>
    <PlatformBreadcrumbs sectionLabel={sectionLabel} sectionHref={sectionHref} currentLabel={currentLabel} />
    <header className="border-b border-border bg-card px-4 py-4 md:px-6">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</p><h1 className="mt-1 min-w-0 [overflow-wrap:anywhere] text-2xl font-semibold tracking-tight">{title}</h1><p className="mt-1 max-w-3xl text-sm leading-5 text-muted-foreground">{description}</p></div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  </>;
}

export interface MetricItem { label: string; value: ReactNode; detail?: ReactNode; tone?: OperationalTone; icon?: LucideIcon }
export function MetricStrip({ items }: { items: MetricItem[] }) {
  return <section aria-label="Operational summary" className="grid border-b border-border bg-muted/20 sm:grid-cols-2 xl:grid-cols-4">
    {items.map((item) => { const Icon = item.icon; return <div key={item.label} className="min-w-0 border-b border-border px-4 py-3 last:border-b-0 sm:border-r sm:[&:nth-last-child(-n+2)]:border-b-0 xl:border-b-0 xl:last:border-r-0">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{Icon ? <Icon className="h-3.5 w-3.5" /> : null}{item.label}</div>
      <div className={cn('mt-1 truncate text-xl font-semibold tabular-nums', item.tone === 'danger' && 'text-rose-700 dark:text-rose-400', item.tone === 'warning' && 'text-amber-700 dark:text-amber-400', item.tone === 'success' && 'text-emerald-700 dark:text-emerald-400')}>{item.value}</div>
      {item.detail ? <div className="mt-0.5 truncate text-xs text-muted-foreground">{item.detail}</div> : null}
    </div>; })}
  </section>;
}

export function WorkspaceBody({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return <div className={cn('grid min-w-0 gap-5 px-4 py-5 md:px-6', aside && 'xl:grid-cols-[minmax(0,1fr)_19rem]')}><div className="min-w-0 space-y-5">{children}</div>{aside ? <aside className="min-w-0 space-y-4">{aside}</aside> : null}</div>;
}

export function Panel({ title, description, action, children, className }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={cn('min-w-0 overflow-hidden rounded-lg border border-border bg-card', className)}>
    <div className="flex min-w-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
      <div className="min-w-0"><h2 className="text-sm font-semibold">{title}</h2>{description ? <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p> : null}</div>{action ? <div className="shrink-0">{action}</div> : null}
    </div>{children}
  </section>;
}

export function OpsRow({ title, meta, status, tone = 'neutral', leading, details, actions, href }: { title: string; meta?: ReactNode; status?: string; tone?: OperationalTone; leading?: ReactNode; details?: ReactNode; actions?: ReactNode; href?: string }) {
  const content = <><div className="flex min-w-0 flex-1 items-start gap-3">{leading ? <div className="mt-0.5 shrink-0">{leading}</div> : null}<div className="min-w-0 flex-1"><div className="flex min-w-0 flex-wrap items-center gap-2"><h3 className="truncate text-sm font-medium">{title}</h3>{status ? <StatusPill status={status} tone={tone} /> : null}</div>{meta ? <div className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</div> : null}{details ? <div className="mt-2">{details}</div> : null}</div></div>{actions ? <div className="shrink-0">{actions}</div> : href ? <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}</>;
  const classes = 'flex min-w-0 items-start gap-3 border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring';
  return href ? <Link href={href} className={classes}>{content}</Link> : <div className={classes}>{content}</div>;
}

export function StatusPill({ status, tone = 'neutral' }: { status: string; tone?: OperationalTone }) {
  return <span className={cn('inline-flex h-5 items-center whitespace-nowrap rounded-full border px-2 text-[10px] font-semibold uppercase tracking-wider',
    tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
    tone === 'warning' && 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
    tone === 'danger' && 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300',
    tone === 'info' && 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300',
    tone === 'neutral' && 'border-border bg-background text-muted-foreground')}>{humanize(status)}</span>;
}

export function ReadinessBar({ value, label }: { value: number; label?: string }) {
  const tone = value === 100 ? 'bg-emerald-500' : value >= 60 ? 'bg-amber-500' : 'bg-rose-500';
  return <div className="flex items-center gap-2"><div className="h-1.5 min-w-20 flex-1 overflow-hidden rounded-full bg-muted"><div className={cn('h-full rounded-full', tone)} style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} /></div><span className="w-16 text-right text-[11px] tabular-nums text-muted-foreground">{label || `${value}% ready`}</span></div>;
}

export function CheckRail({ checks }: { checks: Array<{ id: string; label: string; ready: boolean }> }) {
  return <div className="flex flex-wrap gap-x-3 gap-y-1">{checks.map((check) => <span key={check.id} className={cn('inline-flex items-center gap-1 text-[11px]', check.ready ? 'text-muted-foreground' : 'font-medium text-amber-700 dark:text-amber-400')}>{check.ready ? <CircleCheck className="h-3 w-3 text-emerald-600" /> : <CircleDashed className="h-3 w-3" />}{check.label}</span>)}</div>;
}

export interface ExceptionItem { id: string; title: string; detail?: string; href?: string; tone?: OperationalTone; resolution?: 'action' | 'boundary'; actionLabel?: string }
export function ExceptionRail({ title = 'Needs attention', items, empty = 'No current exceptions.' }: { title?: string; items: ExceptionItem[]; empty?: string }) {
  return <Panel title={title} description="Prioritized operational exceptions and their authorized resolution path">
    {items.length ? items.slice(0, 8).map((item) => {
      const boundary = item.resolution === 'boundary';
      return <OpsRow key={item.id} title={item.title} meta={item.detail} href={boundary ? undefined : item.href} status={boundary ? 'External / manual' : item.href ? item.actionLabel || 'Resolve' : 'Review'} tone={boundary ? 'neutral' : item.tone || 'warning'} leading={boundary ? <CircleHelp className="h-4 w-4 text-muted-foreground" /> : <AlertTriangle className={cn('h-4 w-4', item.tone === 'danger' ? 'text-rose-600' : 'text-amber-600')} />} details={boundary ? <p className="text-[11px] text-muted-foreground">Boundary only—this is not presented as an in-app-completable action.</p> : undefined} />;
    }) : <div className="flex items-center gap-2 px-4 py-5 text-sm text-muted-foreground"><CircleCheck className="h-4 w-4 text-emerald-600" />{empty}</div>}
  </Panel>;
}

export function ProviderBoundary({ title, provider, capability, evidence }: { title: string; provider: string; capability: string; evidence?: string }) {
  return <div className="border-b border-border px-4 py-3 last:border-b-0"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">{title}</span><StatusPill status={provider || 'not configured'} tone={provider ? 'info' : 'warning'} /></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{capability}</p>{evidence ? <p className="mt-1 font-mono text-[10px] text-muted-foreground">{evidence}</p> : null}</div>;
}

export function ConfigurationLink({ href, children }: { href: string; children: ReactNode }) {
  return <Button asChild size="sm" variant="ghost"><Link href={href}><Settings2 className="mr-2 h-3.5 w-3.5" />{children}</Link></Button>;
}
