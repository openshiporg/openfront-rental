import { ChevronLeft, ChevronRight, Search, SearchX } from 'lucide-react';
import Form from 'next/form';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { listHref, type PageSlice } from '../lib/listParams';
import type { OperationalTone } from '../lib/operations';
import { Dot, EmptyState } from './PlatformUI';

/** Extra URL params (secondary filters) that must survive tab, search, and page changes. */
export type PreservedParams = Record<string, string | null | undefined>;

export interface ViewTab {
  id: string;
  label: string;
  count?: number;
  /** Colors the tab dot when the count is non-zero (e.g. "Needs attention"). */
  tone?: OperationalTone;
}

export function ViewTabs({ basePath, tabs, view, q, preserve, label = 'Views' }: { basePath: string; tabs: ViewTab[]; view: string; q?: string; preserve?: PreservedParams; label?: string }) {
  return <nav aria-label={label} className="-mb-px flex min-w-0 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {tabs.map((tab) => {
      const active = tab.id === view;
      return <Link
        key={tab.id}
        href={listHref(basePath, { ...preserve, view: tab.id, q })}
        aria-current={active ? 'page' : undefined}
        scroll={false}
        className={cn(
          'inline-flex h-10 shrink-0 items-center gap-2 rounded-t-md border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          active ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
        )}
      >
        {tab.tone && tab.count ? <Dot tone={tab.tone} /> : null}
        {tab.label}
        {tab.count != null ? <span className={cn('rounded-md border px-1.5 text-[11px] font-medium leading-[18px] tabular-nums', active ? 'bg-background text-foreground' : 'bg-muted/40 text-muted-foreground')}>{tab.count}</span> : null}
      </Link>;
    })}
  </nav>;
}

export function SearchField({ basePath, q, view, preserve, placeholder }: { basePath: string; q?: string; view?: string; preserve?: PreservedParams; placeholder: string }) {
  const hidden = Object.entries({ ...preserve, view }).filter(([, value]) => value && value !== 'all') as Array<[string, string]>;
  return <Form action={basePath} role="search" className="relative w-full sm:w-72">
    {hidden.map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
    <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    <Input key={q || ''} type="search" name="q" defaultValue={q} placeholder={placeholder} aria-label={placeholder} className="h-9 rounded-lg bg-background pl-9 pr-3 text-sm" />
  </Form>;
}

export interface FilterChip {
  id: string;
  label: string;
  count?: number;
}

/**
 * Secondary, single-select filter (source, task type, …) rendered as link chips. The page
 * builds each href so it can keep its own view, search, and other filters.
 */
export function FilterChips({ label, chips, value, hrefFor }: { label: string; chips: FilterChip[]; value: string; hrefFor: (id: string) => string }) {
  return <nav aria-label={label} className="flex min-w-0 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <span className="shrink-0 pr-1 text-xs text-muted-foreground">{label}</span>
    {chips.map((chip) => {
      const active = chip.id === value;
      return <Link
        key={chip.id}
        href={hrefFor(chip.id)}
        scroll={false}
        aria-current={active ? 'true' : undefined}
        className={cn(
          'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          active ? 'border-foreground bg-foreground text-background' : 'bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground',
        )}
      >
        {chip.label}
        {chip.count != null ? <span className={cn('tabular-nums', active ? 'text-background/70' : 'text-muted-foreground/70')}>{chip.count}</span> : null}
      </Link>;
    })}
  </nav>;
}

function PagerLink({ href, label, children }: { href?: string; label: string; children: ReactNode }) {
  if (!href) return <span aria-disabled="true" className="grid size-7 place-items-center rounded-md border bg-background/50 text-muted-foreground/40">{children}<span className="sr-only">{label}</span></span>;
  return <Button asChild size="icon" variant="outline" className="size-7"><Link href={href} aria-label={label}>{children}</Link></Button>;
}

/** `label` names the landmark; give each pager on a page its own (e.g. "Payment pages"). */
export function Pager({ page, pageCount, hrefFor, label = 'Pagination' }: { page: number; pageCount: number; hrefFor: (page: number) => string; label?: string }) {
  if (pageCount <= 1) return null;
  return <nav aria-label={label} className="flex shrink-0 items-center gap-1.5">
    <PagerLink href={page > 1 ? hrefFor(page - 1) : undefined} label="Previous page"><ChevronLeft aria-hidden="true" className="size-4" /></PagerLink>
    <span className="min-w-20 text-center tabular-nums">Page {page} of {pageCount}</span>
    <PagerLink href={page < pageCount ? hrefFor(page + 1) : undefined} label="Next page"><ChevronRight aria-hidden="true" className="size-4" /></PagerLink>
  </nav>;
}

/**
 * Card that owns a list's view tabs, search, secondary filters, filtered/empty states, result
 * summary, and pagination. Everything is URL-driven (`?view=…&q=…&page=…`) so each state is
 * linkable and server-rendered.
 */
export function ListSection({ basePath, tabs, view, q, placeholder, noun, total, visible, empty, children, footer, toolbar, filters, preserve, pagination, filtered: filteredOverride, clearHref }: {
  basePath: string;
  tabs?: ViewTab[];
  view: string;
  q: string;
  placeholder?: string;
  noun: { singular: string; plural: string };
  total: number;
  visible: number;
  /** Rendered when there are no records at all. */
  empty: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  toolbar?: ReactNode;
  /** Secondary filter row under the tabs (e.g. FilterChips). */
  filters?: ReactNode;
  /** Secondary filter params kept by tabs, search, and pagination. */
  preserve?: PreservedParams;
  pagination?: Pick<PageSlice<unknown>, 'page' | 'pageCount' | 'start' | 'end'>;
  /** Override when tabs switch datasets rather than filter one (then only search filters). */
  filtered?: boolean;
  /** Where "Clear filters" goes; defaults to the unfiltered list. */
  clearHref?: string;
}) {
  const secondary = Object.values(preserve || {}).some((value) => value && value !== 'all');
  const filtered = (filteredOverride ?? (Boolean(q) || view !== 'all')) || secondary;
  const resetHref = clearHref || basePath;
  const paged = pagination && pagination.pageCount > 1 ? pagination : null;
  const body = visible > 0
    ? children
    : total === 0 && !filtered
      ? empty
      : <EmptyState
          icon={SearchX}
          title={`No ${noun.plural} match`}
          description={q ? <>Nothing in this view matches “{q}”.</> : 'Nothing is in this view right now.'}
          action={<Button asChild variant="outline" size="sm"><Link href={resetHref}>Clear filters</Link></Button>}
        />;
  const range = paged ? <><span className="font-medium text-foreground tabular-nums">{paged.start}–{paged.end}</span> of {visible}</> : visible;
  const summary = visible > 0 && (filtered || paged)
    ? <span className="flex flex-wrap items-center gap-x-2">
        <span>Showing {range}{filtered ? <> of {total} {total === 1 ? noun.singular : noun.plural}</> : ` ${noun.plural}`}</span>
        {filtered ? <Link href={resetHref} className="font-medium text-foreground underline-offset-4 hover:underline">Clear filters</Link> : null}
      </span>
    : null;
  const pager = paged ? <Pager page={paged.page} pageCount={paged.pageCount} hrefFor={(page) => listHref(basePath, { ...preserve, view, q, page: page > 1 ? String(page) : undefined })} /> : null;

  return <section className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-xs">
    <div className="flex flex-col-reverse gap-2 border-b px-2 pt-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:px-3 sm:pt-1.5">
      {tabs?.length ? <ViewTabs basePath={basePath} tabs={tabs} view={view} q={q} preserve={preserve} /> : <span />}
      <div className="flex flex-wrap items-center gap-2 px-2 sm:px-0 sm:pb-2">
        {toolbar}
        {placeholder ? <SearchField basePath={basePath} q={q} view={view} preserve={preserve} placeholder={placeholder} /> : null}
      </div>
    </div>
    {filters ? <div className="border-b bg-muted/20 px-4 py-2">{filters}</div> : null}
    {body}
    {summary || footer || pager ? <footer className="flex flex-col gap-2 border-t bg-muted/30 px-4 py-2.5 text-xs leading-5 text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0 space-y-0.5">{summary}{footer ? <p>{footer}</p> : null}</div>
      {pager}
    </footer> : null}
  </section>;
}
