import { AlertTriangle, CalendarCheck2, CalendarDays, CircleDollarSign, DoorOpen, Lock } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/features/platform/operations/components/DataTable';
import { FilterChips, ListSection } from '@/features/platform/operations/components/ListSection';
import { Callout, EmptyState, Muted, PageBody, PageHeader, PlatformPage, RowAction, RowLink, Section, StatTiles, StatusBadge, SubLine, toneText } from '@/features/platform/operations/components/PlatformUI';
import { StayChecks } from '@/features/platform/operations/components/StayChecks';
import { SubmitButton } from '@/features/platform/operations/components/SubmitButton';
import { listHref, pickView, readSearchParams, type PlatformSearchParams } from '@/features/platform/operations/lib/listParams';
import { formatDay, formatDayRange, formatMoney, nightsBetween, operationalTone, plural } from '@/features/platform/operations/lib/operations';
import { propertyToday } from '@/features/platform/operations/lib/propertyDates';
import { getPlatformCapabilities } from '@/features/platform/lib/capabilities';
import { cn } from '@/lib/utils';
import { getReservationWorkspace, transitionReservation } from '../actions/reservations';
import {
  recommendedReservationTransition, reservationLabel, reservationPriority, reservationSourceLabel, reservationSources, reservationTransitionLabel, stayBalanceCents,
} from '../lib/presentation';
import { reservationQueues } from '../lib/queues';
import { operationalTimeZone } from '@/features/platform/operations/lib/operationalProperty';

const RESERVATIONS = '/dashboard/platform/reservations';

function arrivalHint(reservation: any, today: string) {
  if (!reservation.checkInDate) return null;
  if (reservation.status === 'in_stay') return { label: `Departs ${formatDay(reservation.checkOutDate)}`, tone: 'info' as const };
  if (!['inquiry', 'quoted', 'pending', 'confirmed'].includes(reservation.status)) return null;
  const days = nightsBetween(today, reservation.checkInDate);
  if (reservation.checkInDate < today) return { label: 'Arrival overdue', tone: 'danger' as const };
  if (reservation.checkInDate === today) return { label: 'Arrives today', tone: 'warning' as const };
  return { label: days === 1 ? 'Tomorrow' : `In ${days} days`, tone: 'neutral' as const };
}

export async function ReservationWorkspacePage({ searchParams }: { searchParams?: PlatformSearchParams }) {
  const { q, view: requested, get, page, error: actionError } = await readSearchParams(searchParams);
  const notice = get('notice');
  const view = pickView(requested || get('queue'), reservationQueues, 'all');
  const source = pickView(get('source'), ['all', ...reservationSources], 'all');
  // Exact history of one guest, listing or property (by id), or every date with range=history.
  const relation = { guest: get('guest'), listing: get('listing'), property: get('property'), range: get('range') === 'history' ? 'history' : null };
  const filteredByRelation = Boolean(relation.guest || relation.listing || relation.property);
  const [{ reservations, pagination, counts, sources, outstanding, error }, capabilities] = await Promise.all([
    getReservationWorkspace({ view, source, q, page, ...relation }),
    getPlatformCapabilities(),
  ]);
  const canManage = capabilities.known && capabilities.canManageReservations;
  const sourceChips = sources.filter((item) => item.count > 0 || item.id === source);

  const columns: Array<Column<any>> = [
    { id: 'arrival', header: 'Arrival', cell: (reservation) => {
      const hint = arrivalHint(reservation, propertyToday(operationalTimeZone(reservation)));
      return <div className="flex items-center gap-3">
        <span className="flex w-11 shrink-0 flex-col items-center rounded-lg border bg-background py-1 leading-none shadow-xs">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{formatDay(reservation.checkInDate, { month: 'short' })}</span>
          <span className="mt-0.5 text-base font-semibold tabular-nums">{formatDay(reservation.checkInDate, { day: 'numeric' })}</span>
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block text-xs text-muted-foreground">{formatDay(reservation.checkInDate, { weekday: 'short' })}</span>
          {hint ? <span className={cn('block whitespace-nowrap text-xs font-medium', hint.tone === 'neutral' ? 'text-muted-foreground' : toneText[hint.tone])}>{hint.label}</span> : null}
        </span>
      </div>;
    } },
    { id: 'guest', header: 'Guest', cell: (reservation) => {
      const hint = arrivalHint(reservation, propertyToday(operationalTimeZone(reservation)));
      const due = stayBalanceCents(reservation);
      return <div className="min-w-0 max-w-[16rem]">
        <RowLink href={`${RESERVATIONS}/${reservation.id}`}>{reservation.guest?.name || 'Guest pending'}</RowLink>
        <SubLine>{reservation.confirmationCode} · {reservationSourceLabel(reservation.source)}{reservation.testMode ? <span className={cn('font-medium', toneText.warning)}> · Test booking</span> : null}{reservation.fixtureOrigin ? <span className={cn('font-medium', toneText.warning)}> · Setup sample</span> : null}</SubLine>
        {/* Values from columns hidden on small screens, each shown once per breakpoint. */}
        <SubLine mobileOnly="md">{reservation.listing?.title || 'Listing unavailable'} · {plural(nightsBetween(reservation.checkInDate, reservation.checkOutDate), 'night')}</SubLine>
        <SubLine mobileOnly="sm">
          {hint ? <span className={cn('font-medium', hint.tone === 'neutral' ? undefined : toneText[hint.tone])}>{hint.label} · </span> : null}
          <span className={due ? toneText.warning : undefined}>{due ? `${formatMoney(due, reservation.currencyCode)} due` : 'Paid'}</span>
        </SubLine>
      </div>;
    } },
    { id: 'stay', header: 'Stay', hideBelow: 'md', cell: (reservation) => <div className="min-w-0 max-w-[18rem]">
      <span className="block truncate">{reservation.listing?.title || 'Listing unavailable'}</span>
      <SubLine>{formatDayRange(reservation.checkInDate, reservation.checkOutDate)} · {plural(nightsBetween(reservation.checkInDate, reservation.checkOutDate), 'night')}</SubLine>
    </div> },
    { id: 'status', header: 'Status', cell: (reservation) => {
      const priority = reservationPriority(reservation.status, reservation.checkInDate, propertyToday(operationalTimeZone(reservation)));
      return <div>
        <StatusBadge status={reservation.status} label={reservationLabel(reservation.status)} tone={operationalTone(reservation.status)} />
        {priority?.tone === 'amber' ? <SubLine className={toneText.warning}>{priority.label}</SubLine> : null}
        <StayChecks reservation={reservation} className="mt-1.5 flex lg:hidden" />
      </div>;
    } },
    { id: 'checks', header: 'Checks', hideBelow: 'lg', cell: (reservation) => <StayChecks reservation={reservation} /> },
    { id: 'balance', header: 'Balance', align: 'right', hideBelow: 'sm', cell: (reservation) => {
      const due = stayBalanceCents(reservation);
      return <div><span className={cn('font-medium', due ? toneText.warning : 'text-muted-foreground')}>{due ? formatMoney(due, reservation.currencyCode) : 'Paid'}</span><SubLine>of {formatMoney(reservation.totalAmountCents, reservation.currencyCode)}</SubLine></div>;
    } },
    { id: 'action', header: <span className="sr-only">Next step</span>, align: 'right', cell: (reservation) => {
      const recommended = recommendedReservationTransition(reservation.status);
      const open = <RowAction><Button asChild size="sm" variant="ghost"><Link href={`${RESERVATIONS}/${reservation.id}`}>Open</Link></Button></RowAction>;
      if (!recommended) return reservation.status === 'completed' ? open : <Muted className="text-xs">Closed</Muted>;
      if (!canManage) return open;
      // Arrival and departure are recorded on the property's day; earlier needs a reason on the stay page.
      const today = propertyToday(operationalTimeZone(reservation));
      const early = (recommended === 'check_in' && reservation.checkInDate > today) || (recommended === 'complete' && reservation.checkOutDate > today);
      if (early) return <RowAction><Button asChild size="sm" variant="outline" className="whitespace-nowrap"><Link href={`${RESERVATIONS}/${reservation.id}`}>{recommended === 'check_in' ? `Arrives ${formatDay(reservation.checkInDate)}` : `Departs ${formatDay(reservation.checkOutDate)}`}</Link></Button></RowAction>;
      return <RowAction><form action={transitionReservation}>
        <input type="hidden" name="reservationId" value={reservation.id} />
        <input type="hidden" name="status" value={reservation.status} />
        <input type="hidden" name="transition" value={recommended} />
        <input type="hidden" name="returnTo" value={listHref(RESERVATIONS, { view, source, q, page: pagination.page > 1 ? String(pagination.page) : undefined })} />
        <SubmitButton size="sm" variant={recommended === 'confirm' ? 'default' : 'outline'} pendingLabel="Saving…" className="whitespace-nowrap">{reservationTransitionLabel(recommended)}</SubmitButton>
      </form></RowAction>;
    } },
  ];

  const outstandingValue = !outstanding ? '—' : outstanding.length ? formatMoney(outstanding[0].amountCents, outstanding[0].currencyCode) : 'None';
  const outstandingHint = !outstanding
    ? 'total unavailable'
    : outstanding.length > 1 ? `also ${outstanding.slice(1).map((total) => formatMoney(total.amountCents, total.currencyCode)).join(', ')}` : 'balance on open stays';

  return <PlatformPage section="Reservations" sectionHref="/platform/reservations">
    <PageHeader
      title="Reservations"
      description="Every stay in check-in order, with payment, agreement, and verification at a glance."
      actions={<Button asChild size="sm" variant="outline"><Link href="/dashboard/platform/calendar"><CalendarDays aria-hidden="true" />Calendar</Link></Button>}
    />
    <PageBody>
      {actionError ? <Callout live tone="warning" title="That action wasn’t applied">{actionError}</Callout> : null}
      {notice ? <Callout live tone="success" title="Saved">{notice}</Callout> : null}
      {!capabilities.known
        ? <Callout tone="warning" title="Actions are unavailable right now">Your permissions couldn’t be checked. Refresh to try again.</Callout>
        : !capabilities.canManageReservations ? <Callout tone="neutral" icon={Lock} title="Read-only access">Reservation management permission is required to change stays.</Callout> : null}
      {error || !counts ? <Section><EmptyState icon={AlertTriangle} title="Reservations couldn’t be loaded" description={`${error || 'Reservation data is temporarily unavailable.'} Refresh to try again.`} action={<Button asChild size="sm" variant="outline"><Link href={RESERVATIONS}>Refresh</Link></Button>} /></Section> : <>
      <StatTiles items={[
        { label: 'Needs decision', value: counts.pending, hint: 'inquiry, quoted, or pending', tone: counts.pending ? 'warning' : 'success', icon: AlertTriangle, href: listHref(RESERVATIONS, { view: 'pending', source, q }), active: view === 'pending' },
        { label: 'Arrivals', value: counts.confirmed, hint: counts.arrivalDue ? `${counts.arrivalDue} today or overdue` : 'confirmed, not checked in', tone: counts.arrivalDue ? 'warning' : undefined, icon: CalendarCheck2, href: listHref(RESERVATIONS, { view: 'confirmed', source, q }), active: view === 'confirmed' },
        { label: 'In house', value: counts.inStay, hint: counts.dueOut ? `${counts.dueOut} due out today or overdue` : 'guests in residence', tone: counts.dueOut ? 'warning' : undefined, icon: DoorOpen, href: listHref(RESERVATIONS, { view: counts.dueOut ? 'due_out' : 'in_stay', source, q }), active: view === 'in_stay' || view === 'due_out' },
        { label: 'Outstanding', value: outstandingValue, hint: outstandingHint, tone: !outstanding ? undefined : outstanding.length ? 'warning' : 'success', icon: CircleDollarSign },
      ]} />
      <ListSection
        basePath={RESERVATIONS}
        view={view}
        q={q}
        placeholder="Search guest, code, or listing"
        noun={{ singular: 'reservation', plural: 'reservations' }}
        total={counts.total}
        visible={pagination.total}
        pagination={pagination}
        preserve={{ source, guest: relation.guest || undefined, listing: relation.listing || undefined, property: relation.property || undefined, range: relation.range || undefined }}
        filters={sourceChips.length > 1 || source !== 'all' ? <FilterChips
          label="Source"
          value={source}
          hrefFor={(id) => listHref(RESERVATIONS, { view, q, source: id })}
          chips={[{ id: 'all', label: 'All', count: counts.queried }, ...sourceChips.map((item) => ({ id: item.id, label: reservationSourceLabel(item.id), count: item.count }))]}
        /> : null}
        tabs={[
          { id: 'all', label: 'All stays', count: counts.tabs.all },
          { id: 'pending', label: 'Needs decision', count: counts.tabs.pending, tone: 'warning' },
          { id: 'confirmed', label: 'Arrivals', count: counts.tabs.confirmed },
          { id: 'arriving_today', label: 'Arriving today', count: counts.tabs.arriving_today },
          { id: 'in_stay', label: 'In house', count: counts.tabs.in_stay },
          { id: 'departing_today', label: 'Departing today', count: counts.tabs.departing_today },
          { id: 'due_out', label: 'Due out', count: counts.tabs.due_out, tone: 'warning' },
          { id: 'exceptions', label: 'Exceptions', count: counts.tabs.exceptions, tone: 'danger' },
        ]}
        empty={<EmptyState icon={CalendarDays} title="No reservations yet" description="Stays booked through the storefront, channels, or the dashboard will appear here." />}
        footer={filteredByRelation || relation.range ? <span>Showing every date{filteredByRelation ? ' for this filter' : ''}. <Link href={RESERVATIONS} className="underline-offset-4 hover:underline">Current stays</Link></span> : <span>Showing open stays and stays that ended in the last 90 days. <Link href={listHref(RESERVATIONS, { range: 'history', q })} className="underline-offset-4 hover:underline">Include older stays</Link></span>}
      >
        <DataTable rows={reservations} columns={columns} getKey={(reservation) => reservation.id} caption="Reservations" />
      </ListSection>
      </>}
    </PageBody>
  </PlatformPage>;
}
export default ReservationWorkspacePage;
