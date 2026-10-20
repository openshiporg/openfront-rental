import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, CircleOff, ClipboardCheck, Home, Lock, Percent, RefreshCcw, Wrench } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { zonedTodayIso } from '@/features/keystone/utils/stayBookingRules';
import { getPlatformCapabilities } from '@/features/platform/lib/capabilities';
import { Pager } from '@/features/platform/operations/components/ListSection';
import { Disclosure, TextInput } from '@/features/platform/operations/components/FormControls';
import { Callout, EmptyState, LinkRows, PageBody, PageHeader, Pill, PlatformPage, Section, StatTiles, StatusBadge, Timeline, TwoColumn } from '@/features/platform/operations/components/PlatformUI';
import { ConfirmSubmitButton } from '@/features/platform/operations/components/SubmitButton';
import { formatDayRange, formatTimestamp, isPast, operationalTone, plural, sentence } from '@/features/platform/operations/lib/operations';
import { cn } from '@/lib/utils';
import { createHostCalendarBlock, getHostCalendar, releaseHostCalendarBlock } from '../actions/calendar';
import { CalendarBlockForm } from '../components/CalendarBlockForm';
import { CalendarHoldBar } from '../components/CalendarHoldBar';
import { calendarPath } from '../lib/calendarRange';

const DAY_MS = 86_400_000;

function monthDays(month: string) {
  const [year, monthIndex] = month.split('-').map(Number);
  const count = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  return Array.from({ length: count }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`);
}
function shiftMonth(month: string, delta: number) {
  const [year, monthIndex] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthIndex - 1 + delta, 1)).toISOString().slice(0, 7);
}
function dayIndex(monthStart: string, date: string) {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${monthStart}T00:00:00Z`)) / DAY_MS);
}
/** Physical capacity key: listings that share an accommodation unit are one unit. */
function unitKey(listing: any) {
  return listing?.accommodationUnit?.id ? `unit:${listing.accommodationUnit.id}` : listing?.id ? `listing:${listing.id}` : null;
}

const blockStyle: Record<string, { bar: string; label: string; key: string }> = {
  reservation: { bar: 'bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400 dark:text-sky-950', label: 'Reservation', key: 'bg-sky-600 dark:bg-sky-500' },
  preparation: { bar: 'bg-emerald-500 text-white dark:text-emerald-950', label: 'Preparation', key: 'bg-emerald-500' },
  property_maintenance: { bar: 'bg-rose-500 text-white dark:text-rose-950', label: 'Maintenance', key: 'bg-rose-500' },
  owner_block: { bar: 'bg-amber-400 text-amber-950', label: 'Owner hold', key: 'bg-amber-400' },
};
const fallbackStyle = { bar: 'bg-zinc-400 text-white', label: 'Blocked', key: 'bg-zinc-400' };

/**
 * Each day is two grid tracks so stays can start and end mid-cell: guests arrive in the
 * afternoon and leave in the morning, and the checkout night stays open for the next stay.
 */
function segmentFor(block: any, monthStart: string, dayCount: number) {
  const start = dayIndex(monthStart, block.startDate);
  const end = dayIndex(monthStart, block.endDate);
  if (end <= 0 || start >= dayCount || end <= start) return null;
  const halfDay = block.reason === 'reservation';
  const from = start < 0 ? 2 : 2 + start * 2 + (halfDay ? 1 : 0);
  const to = end >= dayCount ? 2 + dayCount * 2 : 2 + end * 2 + (halfDay ? 1 : 0);
  const nights = Math.min(end, dayCount) - Math.max(start, 0);
  return to > from ? { from, to, nights, continuesBefore: start < 0, continuesAfter: end > dayCount } : null;
}

export async function HostCalendarPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) || {};
  const month = typeof params.month === 'string' ? params.month : undefined;
  const requestedPage = typeof params.page === 'string' ? Number.parseInt(params.page, 10) || 1 : 1;
  const actionError = typeof params.error === 'string' ? params.error : null;
  const holdPage = typeof params.holds === 'string' ? Math.max(1, Number.parseInt(params.holds, 10) || 1) : 1;
  const listingSearch = typeof params.listingQ === 'string' ? params.listingQ.trim().slice(0, 120) : '';
  const [calendar, capabilities] = await Promise.all([getHostCalendar({ month, page: requestedPage, holdPage, listingSearch }), getPlatformCapabilities()]);
  const { data, error, month: activeMonth, start: monthStart, invalidMonth } = calendar;
  const canManage = capabilities.known && capabilities.canManageCalendar;
  const days = monthDays(activeMonth);
  const listings = data?.listings || [];
  const utcToday = new Date().toISOString().slice(0, 10);
  // Each row is dated by its own property; the header marks today only when every row agrees.
  const rowToday = (listing: any) => zonedTodayIso(listing.property?.timezone);
  const rowTodays = [...new Set<string>(listings.map(rowToday))];
  const today = rowTodays.length === 1 ? rowTodays[0] : listings.length ? null : utcToday;
  const thisMonth = (today || utcToday).slice(0, 7);
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${activeMonth}-01T12:00:00Z`));
  const pageCount = data ? Math.max(1, Math.ceil(data.listingsCount / data.pageSize)) : 1;
  const page = Math.min(Math.max(requestedPage, 1), pageCount);
  const pageParam = page > 1 ? String(page) : null;
  const blocks = (data?.blocks || []).filter((block: any) => block.status === 'active');

  // Occupancy over the physical units behind the rows shown: one unit-night counts once however many listings alias it.
  const scopeUnits = new Set(listings.map(unitKey).filter(Boolean) as string[]);
  const occupiedUnitNights = new Set<string>();
  for (const block of blocks) {
    const key = unitKey(block.listing);
    if (block.reason !== 'reservation' || !key || !scopeUnits.has(key)) continue;
    const from = Math.max(dayIndex(monthStart, block.startDate), 0);
    const to = Math.min(dayIndex(monthStart, block.endDate), days.length);
    for (let index = from; index < to; index += 1) occupiedUnitNights.add(`${key}|${index}`);
  }
  const capacity = scopeUnits.size * days.length;
  const occupancyKnown = Boolean(data && !data.blocksError && data.blocksComplete);
  const occupancy = capacity ? Math.round((occupiedUnitNights.size / capacity) * 100) : 0;

  const blockable = (data?.blockable || []).filter((listing: any) => listing.hostOrganization?.id).map((listing: any) => ({
    key: `${listing.id}:${listing.hostOrganization.id}`,
    title: listing.title,
    status: listing.status,
    propertyName: listing.property?.name || '',
    today: zonedTodayIso(listing.property?.timezone),
  }));
  const fallbackMinDate = blockable.reduce((earliest: string, listing: any) => (listing.today < earliest ? listing.today : earliest), utcToday);
  const columns = `minmax(10rem, 13rem) repeat(${days.length * 2}, minmax(0.875rem, 1fr))`;
  const monthHref = (target: string) => calendarPath({ month: target });

  return <PlatformPage section="Calendar" sectionHref="/platform/calendar">
    <PageHeader
      title="Calendar"
      description="Booked nights, owner holds, preparation, and maintenance for every live listing — plus the turnovers between stays."
      actions={<>
        <Button asChild size="sm" variant="outline"><Link href="/dashboard/platform/reservations">Reservations</Link></Button>
        <Button asChild size="sm" variant="outline"><Link href="/dashboard/platform/tasks">Tasks</Link></Button>
      </>}
    />
    <PageBody>
      {invalidMonth ? <Callout live tone="warning" title="That month isn’t valid" action={<Button asChild size="sm" variant="outline"><Link href={monthHref(activeMonth)}>Use {monthLabel}</Link></Button>}>“{invalidMonth}” isn’t a calendar month (YYYY-MM). Showing {monthLabel}.</Callout> : null}
      {actionError ? <Callout live tone="warning" title="That change wasn’t applied">{actionError}</Callout> : null}
      {error ? <Callout live tone="warning" title="The calendar couldn’t be loaded" action={<Button asChild size="sm" variant="outline"><Link href={calendarPath({ month: activeMonth, page: pageParam })}><RefreshCcw aria-hidden="true" />Try again</Link></Button>}>{error} Figures below are unavailable, not zero.</Callout> : null}
      {data?.blocksError ? <Callout live tone="warning" title="Some calendar entries are missing">{data.blocksError} Refresh to try again.</Callout> : null}
      {data && !data.blocksError && !data.blocksComplete ? <Callout live tone="warning" title="Not every stay and hold is shown">This page of listings has more calendar entries this month than can be shown at once, so open dates aren’t confirmed free. Use the next page of listings or a different month.</Callout> : null}
      {!capabilities.known ? <Callout tone="warning" title="Calendar controls are unavailable">Your permissions couldn’t be checked. Refresh to try again.</Callout> : null}
      <StatTiles items={[
        { label: 'Live listings', value: data ? data.listingsCount : '—', hint: data ? (pageCount > 1 ? `${data.pageSize} rows per page` : 'rows on the calendar') : 'Unavailable', icon: Home },
        { label: 'Occupancy', value: occupancyKnown ? `${occupancy}%` : '—', hint: occupancyKnown ? `${occupiedUnitNights.size} of ${capacity} unit-nights · ${plural(scopeUnits.size, 'unit')}${pageCount > 1 ? ' on this page' : ''}` : data?.blocksError || !data ? 'Unavailable' : 'Too many calendar entries to total', icon: Percent },
        { label: 'Turnovers', value: data ? data.openTurnoverCount : '—', hint: data ? `${data.turnoverCount} due this month` : 'Unavailable', tone: data?.overdueTurnoverCount ? 'danger' : data?.openTurnoverCount ? 'warning' : undefined, icon: ClipboardCheck },
        { label: 'Holds & maintenance', value: data ? data.holdsCount : '—', hint: data ? plural(data.openRepairCount, 'open repair') : 'Unavailable', tone: data?.openRepairCount ? 'danger' : undefined, icon: Wrench },
      ]} />

      <section className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-xs">
        <header className="flex flex-col gap-3 border-b px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Button asChild size="icon" variant="outline" className="size-8"><Link href={monthHref(shiftMonth(activeMonth, -1))} aria-label="Previous month" scroll={false}><ChevronLeft /></Link></Button>
            <h2 className="min-w-36 text-center text-sm font-semibold tabular-nums">{monthLabel}</h2>
            <Button asChild size="icon" variant="outline" className="size-8"><Link href={monthHref(shiftMonth(activeMonth, 1))} aria-label="Next month" scroll={false}><ChevronRight /></Link></Button>
            {activeMonth !== thisMonth ? <Button asChild size="sm" variant="ghost"><Link href={calendarPath()} scroll={false}>Today</Link></Button> : null}
            <form className="ml-1 hidden items-center gap-2 lg:flex" action="/dashboard/platform/calendar">
              <label className="sr-only" htmlFor="calendar-month">Jump to month</label>
              <TextInput id="calendar-month" type="month" name="month" defaultValue={activeMonth} className="h-8 w-40" />
              <Button size="sm" variant="ghost" type="submit">Go</Button>
            </form>
          </div>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
            {Object.values(blockStyle).map((style) => <li key={style.label} className="flex items-center gap-1.5"><span className={cn('h-2.5 w-4 rounded-sm', style.key)} />{style.label}</li>)}
          </ul>
        </header>

        {!data ? <EmptyState icon={AlertTriangle} title="The calendar is unavailable" description="This is a loading problem, not an empty calendar." action={<Button asChild size="sm" variant="outline"><Link href={calendarPath({ month: activeMonth, page: pageParam })}><RefreshCcw aria-hidden="true" />Try again</Link></Button>} />
          : listings.length ? <div className="overflow-x-auto">
          <div className="min-w-[66rem]">
            <div className="grid border-b bg-muted/40" style={{ gridTemplateColumns: columns }}>
              <div className="sticky left-0 z-20 border-r bg-muted px-3 py-2 text-xs font-medium text-muted-foreground" style={{ gridColumn: 1, gridRow: 1 }}>Listing</div>
              {days.map((day, index) => {
                const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
                const isToday = day === today;
                return <div key={day} className={cn('flex flex-col items-center border-r py-1.5 text-center leading-none last:border-r-0', (weekday === 0 || weekday === 6) && 'bg-muted/60')} style={{ gridColumn: `${2 + index * 2} / span 2`, gridRow: 1 }}>
                  <span className="text-[10px] text-muted-foreground">{'SMTWTFS'[weekday]}</span>
                  <span className={cn('mt-1 grid size-5 place-items-center rounded-full text-[11px] tabular-nums', isToday ? 'bg-foreground font-semibold text-background' : 'text-foreground/80')}>{Number(day.slice(-2))}</span>
                </div>;
              })}
            </div>
            {listings.map((listing: any) => {
              const listingToday = rowToday(listing);
              // The row shows everything holding its physical unit, including stays and holds made
              // through another listing of the same unit (labelled with that listing).
              const unitId = listing.accommodationUnit?.id;
              const listingBlocks = blocks.filter((block: any) => block.listing?.id === listing.id || (unitId && block.listing?.accommodationUnit?.id === unitId));
              const bookedNights = new Set<number>();
              for (const block of listingBlocks) {
                if (block.reason !== 'reservation') continue;
                const segment = segmentFor(block, monthStart, days.length);
                if (!segment) continue;
                const first = Math.max(dayIndex(monthStart, block.startDate), 0);
                for (let night = 0; night < segment.nights; night += 1) bookedNights.add(first + night);
              }
              const listingNights = bookedNights.size;
              const rowIncomplete = !data.blocksComplete || Boolean(data.blocksError);
              const listingHolds = listingBlocks.filter((block: any) => block.reason !== 'reservation').length;
              return <div key={listing.id} className="group/row grid border-b last:border-b-0" style={{ gridTemplateColumns: columns }}>
                <div className="sticky left-0 z-20 min-w-0 border-r bg-card px-3 py-2.5 group-hover/row:bg-muted" style={{ gridColumn: 1, gridRow: 1 }}>
                  <p className="truncate text-xs font-medium">{listing.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{listing.property?.address?.publicLocationLabel || listing.property?.name}</p>
                  <p className="mt-0.5 truncate text-[11px] tabular-nums text-muted-foreground">{occupancyKnown ? <><span className="font-medium text-foreground">{Math.round((listingNights / days.length) * 100)}%</span> booked · {listingNights}n</> : 'Bookings unavailable'}{listingHolds ? ` · ${plural(listingHolds, 'hold')}` : ''}</p>
                </div>
                {days.map((day, index) => {
                  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
                  return <div key={day} aria-hidden="true" className={cn('border-r last:border-r-0 group-hover/row:bg-muted/30', (weekday === 0 || weekday === 6) && 'bg-muted/30', day === listingToday && 'bg-sky-50 dark:bg-sky-950/30')} style={{ gridColumn: `${2 + index * 2} / span 2`, gridRow: 1 }} />;
                })}
                {rowIncomplete ? <div className="relative z-0 my-1 flex items-center justify-end bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,hsl(var(--muted))_6px,hsl(var(--muted))_12px)] px-2 text-[11px] text-muted-foreground" style={{ gridColumn: `2 / ${2 + days.length * 2}`, gridRow: 1 }}><span className="rounded bg-card/90 px-1.5 py-0.5">Not all stays and holds are shown · open dates aren’t confirmed free</span></div> : null}
                {listingBlocks.map((block: any) => {
                  const segment = segmentFor(block, monthStart, days.length);
                  if (!segment) return null;
                  const style = blockStyle[block.reason] || fallbackStyle;
                  const who = block.reservation?.guest?.name || block.reservation?.confirmationCode;
                  const alias = block.listing?.id !== listing.id ? block.listing?.title || 'another listing of this unit' : null;
                  const label = `${block.reason === 'reservation' ? who || 'Reserved' : style.label}${alias ? ` · via ${alias}` : ''}`;
                  const title = `${style.label}${alias ? ` (via ${alias})` : ''} · ${formatDayRange(block.startDate, block.endDate)}${who ? ` · ${who}` : ''}${block.notes ? ` · ${block.notes}` : ''}`;
                  const classes = cn('relative z-10 my-2 flex min-w-0 items-center overflow-hidden px-2 text-[11px] font-medium shadow-xs transition-colors', style.bar, segment.continuesBefore ? 'rounded-l-none' : 'rounded-l-md', segment.continuesAfter ? 'rounded-r-none' : 'rounded-r-md');
                  const content = <span className="truncate">{label}{segment.nights > 2 && block.reason === 'reservation' ? <span className="font-normal opacity-80"> · {segment.nights}n</span> : null}</span>;
                  const placement = { gridColumn: `${segment.from} / ${segment.to}`, gridRow: 1 };
                  return block.reservation?.id
                    ? <Link key={block.id} href={`/dashboard/platform/reservations/${block.reservation.id}`} title={title} aria-label={title} className={cn(classes, 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1')} style={placement}>{content}</Link>
                    : <CalendarHoldBar key={block.id} id={block.id} label={`${title}. Show details`} heading={`${style.label} · ${listing.title}`} dates={formatDayRange(block.startDate, block.endDate)} notes={block.notes} className={classes} style={placement}>{content}</CalendarHoldBar>;
                })}
              </div>;
            })}
          </div>
        </div> : <EmptyState icon={CalendarDays} title="No live listings" description="Listings appear here once they’re published. Nights can still be held on draft or paused listings below." action={<Button asChild size="sm" variant="outline"><Link href="/dashboard/platform/listings">Go to listings</Link></Button>} />}
        <footer className="flex flex-col gap-2 border-t bg-muted/30 px-4 py-2.5 text-xs leading-5 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Stays run from the afternoon of check-in to the morning of checkout; the checkout night is open. Each row is dated by its property’s time zone. Select a stay or hold to open it.</span>
          {data && pageCount > 1 ? <Pager page={page} pageCount={pageCount} hrefFor={(target) => calendarPath({ month: activeMonth, page: String(target) })} /> : null}
        </footer>
      </section>

      <TwoColumn>
        <Section title="Turnovers this month" icon={ClipboardCheck} count={data?.turnoverCount} description="Cleaning and readiness inspections, in due order, on each property’s clock." action={<Button asChild size="sm" variant="ghost"><Link href="/dashboard/platform/tasks">Task board</Link></Button>} footer={data && data.turnoverCount > data.turnovers.length ? `Showing the first ${data.turnovers.length} of ${data.turnoverCount}.` : undefined} flush>
          {data ? <Timeline
            empty="No turnovers due this month."
            items={data.turnovers.map((task: any) => {
              const open = !['completed', 'cancelled'].includes(task.status);
              return {
                id: task.id,
                title: task.title,
                time: formatTimestamp(task.dueAt, task.property?.timezone),
                tone: !open ? 'success' : isPast(task.dueAt) ? 'danger' : operationalTone(task.status),
                meta: `${task.listing?.title || task.property?.name || 'Property'} · ${task.assignee?.name || 'Unassigned'}${task.reservation ? ` · ${task.reservation.confirmationCode}` : ''}`,
                badge: <StatusBadge status={task.status} className="h-5" />,
              };
            })}
          /> : <p className="px-4 py-6 text-center text-sm text-muted-foreground">Turnovers are unavailable.</p>}
        </Section>

        <div className="min-w-0 space-y-6">
          {canManage ? <Disclosure icon={Lock} summary="Block nights" description="Hold dates for an owner stay, preparation, or maintenance — before or after a listing goes live.">
            {!data ? <p className="text-sm text-muted-foreground">Listings are unavailable. Refresh to try again.</p>
              : blockable.length ? <>
                {data.blockableCount > blockable.length || listingSearch ? <form action="/dashboard/platform/calendar" className="mb-3 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="month" value={activeMonth} />
                  <label className="sr-only" htmlFor="calendar-listing-search">Find a listing</label>
                  <TextInput id="calendar-listing-search" name="listingQ" defaultValue={listingSearch} placeholder="Find a listing by title" className="h-8 w-56" />
                  <Button size="sm" variant="ghost" type="submit">Find</Button>
                  <span className="text-xs text-muted-foreground">{blockable.length} of {data.blockableCount} listings</span>
                </form> : null}
                <CalendarBlockForm action={createHostCalendarBlock} listings={blockable} fallbackMinDate={fallbackMinDate} truncated={data.blockableCount > blockable.length} />
              </>
                : <p className="text-sm text-muted-foreground">No draft, published, or paused listings to hold nights on.</p>}
          </Disclosure> : capabilities.known ? <Callout title="View only">Your role can see the calendar but not hold or release nights.</Callout> : null}

          <Section title="Active holds" icon={CircleOff} count={data?.holdsCount} description="Operator blocks overlapping this month, on any listing." footer={data && data.holdsCount > data.holds.length ? <span className="flex flex-wrap items-center gap-x-3">{`Holds ${(holdPage - 1) * 200 + 1}–${(holdPage - 1) * 200 + data.holds.length} of ${data.holdsCount}.`}{holdPage > 1 ? <Link href={calendarPath({ month: activeMonth, page: pageParam, holds: String(holdPage - 1) })} className="underline-offset-4 hover:underline">Previous</Link> : null}{holdPage * 200 < data.holdsCount ? <Link href={calendarPath({ month: activeMonth, page: pageParam, holds: String(holdPage + 1) })} className="underline-offset-4 hover:underline">Next</Link> : null}</span> : undefined} flush>
            {data ? <LinkRows
              empty="No owner, preparation, or maintenance holds this month."
              items={data.holds.map((block: any) => ({
                id: block.id,
                leading: <span className={cn('block h-2.5 w-4 rounded-sm', (blockStyle[block.reason] || fallbackStyle).key)} />,
                title: <span id={`hold-${block.id}`} className="scroll-mt-24">{block.listing?.title || 'Listing'} · {formatDayRange(block.startDate, block.endDate)}</span>,
                meta: <span className="inline-flex flex-wrap items-center gap-1.5"><Pill>{(blockStyle[block.reason] || fallbackStyle).label}</Pill>{block.notes || sentence(block.source)}</span>,
                trailing: canManage ? <form action={releaseHostCalendarBlock}>
                  <input type="hidden" name="blockId" value={block.id} />
                  <input type="hidden" name="month" value={activeMonth} />
                  {pageParam ? <input type="hidden" name="page" value={pageParam} /> : null}
                  <ConfirmSubmitButton title="Release these nights?" description={<>{block.listing?.title || 'This listing'} becomes bookable again for {formatDayRange(block.startDate, block.endDate)}.</>} confirmLabel="Release nights" destructive={false} pendingLabel="Releasing…">Release</ConfirmSubmitButton>
                </form> : undefined,
              }))}
            /> : <p className="px-4 py-6 text-center text-sm text-muted-foreground">Holds are unavailable.</p>}
          </Section>
        </div>
      </TwoColumn>
    </PageBody>
  </PlatformPage>;
}

export default HostCalendarPage;
