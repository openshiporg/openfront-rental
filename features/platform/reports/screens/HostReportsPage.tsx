import { ArrowRight, BarChart3, Building2, CalendarCheck2, CircleDollarSign, Gauge, ListChecks, PieChart, RadioTower, TrendingUp, WalletCards } from 'lucide-react';
import Form from 'next/form';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Select } from '@/features/platform/operations/components/FormControls';
import { AttentionList, Callout, DetailGrid, EmptyRow, EmptyState, PageBody, PageHeader, PlatformPage, Section, StatTiles, TwoColumn, toneText } from '@/features/platform/operations/components/PlatformUI';
import { StayRangeField } from '@/features/platform/operations/components/StayRangeField';
import { formatDayRange, formatMoney, plural, sentence } from '@/features/platform/operations/lib/operations';
import { cn } from '@/lib/utils';
import { getHostReport, getReportHosts } from '../actions/reports';
import { validateReportRange } from '../lib/reportRange';

const REPORTS = '/dashboard/platform/reports';

function isoDay(date: Date) { return date.toISOString().slice(0, 10); }
function addDays(date: Date, days: number) { const next = new Date(date); next.setUTCDate(next.getUTCDate() + days); return next; }
function defaultRange() { const end = addDays(new Date(), 1); return { startDate: isoDay(addDays(end, -30)), endDate: isoDay(end) }; }
function presets() {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
  const lastMonthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
  return [
    { label: 'Last 30 days', ...defaultRange() },
    { label: 'This month', startDate: isoDay(monthStart), endDate: isoDay(nextMonthStart) },
    { label: 'Last month', startDate: isoDay(lastMonthStart), endDate: isoDay(monthStart) },
    { label: 'Next 30 days', startDate: isoDay(today), endDate: isoDay(addDays(today, 30)) },
  ];
}

function reportHref(params: { host?: string | null; startDate: string; endDate: string }) {
  const search = new URLSearchParams();
  if (params.host) search.set('host', params.host);
  search.set('startDate', params.startDate);
  search.set('endDate', params.endDate);
  return `${REPORTS}?${search.toString()}`;
}

const incompleteLabels: Record<string, string> = {
  supply: 'units and listings',
  reservations: 'reservations',
  reservation_dates: 'reservations with invalid dates',
  calendar_blocks: 'calendar blocks',
  amendments: 'stay changes',
  stay_amounts: 'stay revenue, fees, tax and balances',
};

/** One currency shows its amount; several are listed, never added together. */
function byCurrency(rows: any[], field: string) {
  const values = rows.filter((row) => row[field] != null);
  if (values.length < rows.length) return { value: '—', hint: 'incomplete' };
  if (!values.length) return { value: '—', hint: undefined as string | undefined };
  if (values.length === 1) return { value: formatMoney(values[0][field], values[0].currencyCode), hint: undefined };
  return { value: plural(values.length, 'currency', 'currencies'), hint: values.map((row) => formatMoney(row[field], row.currencyCode)).join(' · ') };
}

function joinByCurrency(rows: any[], field: string) {
  const values = rows.filter((row) => row[field] != null && row[field] !== 0);
  return values.length ? values.map((row) => formatMoney(row[field], row.currencyCode)).join(' · ') : null;
}

function BarRow({ label, value, display, max, tone = 'neutral', sub }: { label: string; value: number; display: string; max: number; tone?: 'neutral' | 'negative' | 'positive'; sub?: string }) {
  const width = max > 0 ? Math.max(2, Math.round((Math.abs(value) / max) * 100)) : 0;
  return <li className="px-4 py-3">
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="min-w-0 truncate">{label}{sub ? <span className="ml-2 text-xs text-muted-foreground">{sub}</span> : null}</span>
      <span className={cn('shrink-0 font-medium tabular-nums', tone === 'negative' && toneText.danger)}>{display}</span>
    </div>
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn('h-full rounded-full', tone === 'negative' ? 'bg-rose-400' : tone === 'positive' ? 'bg-emerald-500' : 'bg-foreground/70')} style={{ width: `${width}%` }} /></div>
  </li>;
}

function MoneySection({ row }: { row: any }) {
  const money = (cents: number) => formatMoney(cents, row.currencyCode);
  const lines: Array<{ label: string; value: number | null; tone: 'neutral' | 'negative' | 'positive'; sub?: string }> = [
    { label: 'Lodging', value: row.lodgingRevenueCents, tone: 'neutral', sub: row.lodgingNights != null ? plural(row.lodgingNights, 'night') : undefined },
    { label: 'Fees', value: row.feeRevenueCents, tone: 'neutral', sub: 'stays ending in range' },
    { label: 'Tax assessed', value: row.taxAssessedCents, tone: 'neutral', sub: 'stays ending in range' },
    { label: 'Collected', value: row.collectedCents, tone: 'positive', sub: 'by payment date' },
    { label: 'Refunded', value: row.refundedCents ? -row.refundedCents : 0, tone: 'negative', sub: 'by refund date' },
    { label: 'Owner payouts', value: row.payoutCents ? -row.payoutCents : 0, tone: 'negative' },
    { label: 'Owner earnings (statements)', value: row.ownerStatementEarningsCents, tone: 'positive', sub: row.ownerStatementCount ? plural(row.ownerStatementCount, 'statement') : undefined },
  ];
  const max = Math.max(0, ...lines.map((line) => Math.abs(line.value ?? 0)));
  return <Section title={`Money · ${row.currencyCode}`} icon={TrendingUp} flush
    footer={`Average nightly ${row.adrCents != null ? money(row.adrCents) : '—'} · net collected ${money(row.netCollectedCents)} · outstanding ${row.outstandingCents != null ? money(row.outstandingCents) : '—'}`}>
    <ul className="divide-y">
      {lines.map((line) => <BarRow key={line.label} label={line.label} sub={line.sub} value={line.value ?? 0} max={max} tone={line.tone} display={line.value == null ? '—' : `${line.value < 0 ? '−' : ''}${money(Math.abs(line.value))}`} />)}
    </ul>
  </Section>;
}

export async function HostReportsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) || {};
  const read = (key: string) => { const value = params[key]; return typeof value === 'string' ? value : Array.isArray(value) ? value[0] || '' : ''; };
  const defaults = defaultRange();
  const startDate = read('startDate') || defaults.startDate;
  const endDate = read('endDate') || defaults.endDate;
  const rangeError = validateReportRange(startDate, endDate);
  // The date picker only ever receives valid dates; a bad URL keeps its error message instead.
  const picker = rangeError ? defaults : { startDate, endDate };
  const requestedHost = read('host');
  const hostSearch = read('hostQ').trim().slice(0, 120);
  const access = await getReportHosts(hostSearch);
  const listed = access.hosts.find((item) => item.id === requestedHost);
  const host = listed || (requestedHost && access.hasMore ? { id: requestedHost, name: '' } : null) || (!requestedHost && access.hosts.length === 1 ? access.hosts[0] : null);
  const hostError = requestedHost && !host && !access.error ? 'That host isn’t available for reports. Choose another.' : null;
  const { report, error } = host && !rangeError ? await getHostReport({ hostOrganizationId: host.id, startDate, endDate }) : { report: null, error: null };
  const ranges = presets();
  const money: any[] = report?.money || [];
  const supply = report?.supply || null;

  const outstanding = joinByCurrency(money, 'outstandingCents');
  const decisions = report ? [
    ...(outstanding ? [{ id: 'collections', title: 'Collect outstanding balances', detail: `${outstanding} is still open on stays in range.`, href: '/dashboard/platform/reservations?view=exceptions', actionLabel: 'Reservations', tone: 'warning' as const }] : []),
    ...(report.overdueTaskCount > 0 ? [{ id: 'tasks', title: 'Recover overdue field work', detail: `${report.overdueTaskCount} of ${plural(report.openTaskCount, 'open task')} are past due.`, href: '/dashboard/platform/tasks?view=overdue', actionLabel: 'Tasks', tone: 'danger' as const }] : []),
    ...(report.channelSyncFailureCount > 0 ? [{ id: 'channels', title: 'Reconcile channel failures', detail: `${plural(report.channelSyncFailureCount, 'sync failure')} recorded in range.`, href: '/dashboard/platform/channels', actionLabel: 'Channels', tone: 'danger' as const }] : []),
  ] : [];
  const lodging = byCurrency(money, 'lodgingRevenueCents');
  const collected = byCurrency(money, 'netCollectedCents');
  const sources = report ? (Object.entries(report.reservationsBySource || {}) as Array<[string, number]>).sort((a, b) => Number(b[1]) - Number(a[1])) : [];
  const sourceTotal = sources.reduce((sum, [, count]) => sum + Number(count), 0);
  const statuses = report ? (Object.entries(report.reservationsByStatus || {}) as Array<[string, number]>).sort((a, b) => Number(b[1]) - Number(a[1])) : [];
  const statusTotal = statuses.reduce((sum, [, count]) => sum + Number(count), 0);
  const hostParam = host?.id || null;

  return <PlatformPage section="Reports" sectionHref="/platform/reports">
    <PageHeader
      title="Reports"
      meta={report ? <><span className="font-medium text-foreground">{formatDayRange(report.startDate, report.endDate)}</span>{host?.name ? <span>{host.name}</span> : null}</> : null}
    />
    <PageBody>
      <section aria-label="Report range" className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Quick ranges" className="flex flex-wrap gap-1">
          {ranges.map((range) => {
            const active = !rangeError && range.startDate === startDate && range.endDate === endDate;
            return <Button key={range.label} asChild size="sm" variant={active ? 'secondary' : 'ghost'} className={cn(active && 'ring-1 ring-border')}><Link href={reportHref({ host: hostParam, ...range })} aria-current={active ? 'true' : undefined} scroll={false}>{range.label}</Link></Button>;
          })}
        </nav>
        {access.hasMore || hostSearch ? <Form action={REPORTS} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="grid gap-1 text-xs font-medium sm:w-56"><span className="sr-only">Find a host</span><input name="hostQ" defaultValue={hostSearch} placeholder="Find a host by name" className="h-9 rounded-md border bg-background px-3 text-sm sm:h-11" /></label>
          <input type="hidden" name="startDate" value={picker.startDate} /><input type="hidden" name="endDate" value={picker.endDate} />
          <Button size="sm" type="submit" variant="ghost" className="sm:h-11">Find host</Button>
          {access.hasMore ? <span className="text-xs text-muted-foreground">Showing the first 200 matching hosts.</span> : null}
        </Form> : null}
        <Form action={REPORTS} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {access.hosts.length > 1 || (requestedHost && !listed) ? <label className="grid gap-1 text-xs font-medium sm:w-56">
            <span className="sr-only">Host</span>
            <Select name="host" required defaultValue={listed?.id || ''} className="sm:h-11">
              <option value="" disabled>Choose a host</option>
              {access.hosts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
          </label> : hostParam ? <input type="hidden" name="host" value={hostParam} /> : null}
          <StayRangeField key={`${picker.startDate}:${picker.endDate}`} required startName="startDate" endName="endDate" defaultStart={picker.startDate} defaultEnd={picker.endDate} startLabel="Stays from" endLabel="Until" showSummary={false} className="w-full sm:w-80" />
          <Button size="sm" type="submit" variant="outline" className="sm:h-11">Run report</Button>
        </Form>
      </section>

      {access.error ? <Callout live tone="warning" title="Reports are unavailable" action={<Button asChild size="sm" variant="outline"><Link href={REPORTS}>Try again</Link></Button>}>{access.error}</Callout> : null}
      {rangeError ? <Callout live tone="warning" title="Check the report dates">{rangeError}{read('startDate') || read('endDate') ? ` Requested: ${read('startDate').slice(0, 24) || '—'} to ${read('endDate').slice(0, 24) || '—'}.` : ''}</Callout> : null}
      {hostError ? <Callout live tone="warning" title="Choose a host">{hostError}</Callout> : null}
      {error ? <Callout live tone="warning" title="The report couldn’t be generated">{error}</Callout> : null}
      {!access.error && !access.hosts.length && !requestedHost ? <Section><EmptyState icon={Building2} title="No host reports available" description="Your role doesn’t include reports for any host." /></Section> : null}
      {!host && !hostError && access.hosts.length > 1 ? <Section><EmptyState icon={Building2} title="Choose a host" description={access.hasMore ? 'Showing the first 200 hosts.' : undefined} /></Section> : null}
      {report && !report.complete ? <Callout live tone="warning" title="Some figures are incomplete">
        Too many records to total exactly: {(report.incomplete || []).map((section: string) => incompleteLabels[section] || sentence(section)).join(', ')}. Those figures show “—”. Narrow the date range.
      </Callout> : null}

      {report ? <>
        <StatTiles items={[
          { label: 'Occupancy', value: supply ? `${(supply.occupancyBasisPoints / 100).toFixed(1)}%` : '—', hint: supply ? `${supply.occupiedSellableNights} of ${supply.capacityNights} unit nights` : 'incomplete', icon: CalendarCheck2 },
          { label: 'Lodging revenue', value: lodging.value, hint: lodging.hint || 'nights in range', icon: CircleDollarSign },
          { label: 'Net collected', value: collected.value, hint: collected.hint || 'payments less refunds', icon: BarChart3 },
          { label: 'Open tasks', value: report.openTaskCount, hint: `${report.overdueTaskCount} overdue`, tone: report.overdueTaskCount ? 'danger' : 'success', icon: ListChecks },
        ]} />

        <DetailGrid
          main={<div className="space-y-6">
            {money.length ? money.map((row) => <MoneySection key={row.currencyCode} row={row} />) : <Section title="Money" icon={TrendingUp}><EmptyRow>No money moved in this range.</EmptyRow></Section>}
            {report.lodgingEstimatedReservationCount ? <p className="px-1 text-xs leading-5 text-muted-foreground">{plural(report.lodgingEstimatedReservationCount, 'stay')} without nightly rates {report.lodgingEstimatedReservationCount === 1 ? 'is' : 'are'} spread evenly across {report.lodgingEstimatedReservationCount === 1 ? 'its' : 'their'} nights.</p> : null}
            {report.testModeReservationCount || report.testTenderPaymentCount || report.sampleReservationCount || report.sampleStatementCount ? <p className="px-1 text-xs leading-5 text-muted-foreground">Kept out of money and occupancy: {[report.testModeReservationCount ? plural(report.testModeReservationCount, 'test booking') : null, report.testTenderPaymentCount ? plural(report.testTenderPaymentCount, 'Stripe test-mode card payment') : null, report.sampleReservationCount ? plural(report.sampleReservationCount, 'setup sample stay') : null, report.sampleStatementCount ? plural(report.sampleStatementCount, 'sample owner statement') : null].filter(Boolean).join(', ')}. Manual payments on real stays always count.</p> : null}
          </div>}
          aside={<>
            <Section title="Decisions now" icon={Gauge} count={decisions.length} flush>
              <AttentionList items={decisions} empty="No collections, overdue-task, or channel issues in this range." />
            </Section>
            <Section title="Supply" icon={CalendarCheck2} flush>
              <ul className="divide-y text-sm">
                <li className="flex justify-between gap-3 px-4 py-2.5"><span className="text-muted-foreground">Sellable units</span><span className="font-medium tabular-nums">{supply?.sellableUnitCount ?? '—'}</span></li>
                <li className="flex justify-between gap-3 px-4 py-2.5"><span className="text-muted-foreground">Live listings</span><span className="font-medium tabular-nums">{supply?.publishedListingCount ?? '—'}</span></li>
                <li className="flex justify-between gap-3 px-4 py-2.5"><span className="text-muted-foreground">Unit nights</span><span className="font-medium tabular-nums">{supply?.capacityNights ?? '—'}</span></li>
                <li className="flex justify-between gap-3 px-4 py-2.5"><span className="text-muted-foreground">Booked</span><span className="font-medium tabular-nums">{supply?.occupiedSellableNights ?? '—'}</span></li>
                <li className="flex justify-between gap-3 px-4 py-2.5"><span className="text-muted-foreground">Blocked</span><span className="font-medium tabular-nums">{supply?.blockedNights ?? '—'}</span></li>
                <li className="flex justify-between gap-3 px-4 py-2.5"><span className="text-muted-foreground">Still open</span><span className="font-medium tabular-nums">{supply?.availableNights ?? '—'}</span></li>
              </ul>
            </Section>
          </>}
        />

        <TwoColumn>
          <Section title="Booking sources" icon={PieChart} description="Reservations by source — counts, not revenue." flush>
            {sources.length ? <ul className="divide-y">{sources.map(([source, count]) => <BarRow key={source} label={sentence(source)} value={Number(count)} max={Math.max(...sources.map(([, value]) => Number(value)))} display={`${count}`} sub={sourceTotal ? `${Math.round((Number(count) / sourceTotal) * 100)}%` : undefined} />)}</ul> : <EmptyRow>No reservations in this range.</EmptyRow>}
          </Section>
          <Section title="Reservation status" icon={BarChart3} flush>
            {statuses.length ? <ul className="divide-y">{statuses.map(([status, count]) => <BarRow key={status} label={sentence(status)} value={Number(count)} max={Math.max(...statuses.map(([, value]) => Number(value)))} display={`${count}`} sub={statusTotal ? `${Math.round((Number(count) / statusTotal) * 100)}%` : undefined} tone={['cancelled', 'no_show'].includes(status) ? 'negative' : 'neutral'} />)}</ul> : <EmptyRow>No reservations in this range.</EmptyRow>}
          </Section>
        </TwoColumn>

        <section aria-label="Where to act" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { href: '/dashboard/platform/pricing', icon: CircleDollarSign, title: 'Pricing', metric: `${supply ? `${(supply.occupancyBasisPoints / 100).toFixed(1)}%` : '—'} occupied${joinByCurrency(money, 'adrCents') ? ` at ${joinByCurrency(money, 'adrCents')}` : ''}` },
            { href: '/dashboard/platform/payments', icon: BarChart3, title: 'Payments', metric: outstanding ? `${outstanding} open` : 'Nothing open' },
            { href: '/dashboard/platform/payouts', icon: WalletCards, title: 'Owner payouts', metric: joinByCurrency(money, 'payoutCents') ? `${joinByCurrency(money, 'payoutCents')} paid out` : 'No payouts in range' },
            { href: '/dashboard/platform/channels', icon: RadioTower, title: 'Channels', metric: `${plural(report.channelSyncFailureCount, 'failure')} · last success ${report.lastSuccessfulSyncAt ? new Date(report.lastSuccessfulSyncAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'not in range'}` },
          ].map((card) => <Link key={card.href} href={card.href} className="group flex min-w-0 flex-col rounded-xl border bg-card p-4 shadow-xs transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="flex items-center justify-between gap-2 text-sm font-semibold"><span className="inline-flex items-center gap-2"><card.icon aria-hidden="true" className="size-4 text-muted-foreground" />{card.title}</span><ArrowRight aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></span>
            <span className="mt-2 text-sm font-medium tabular-nums">{card.metric}</span>
          </Link>)}
        </section>
      </> : null}
    </PageBody>
  </PlatformPage>;
}
export default HostReportsPage;
