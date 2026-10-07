import { CalendarDays, CircleOff, ClipboardCheck, Home, Wrench } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MetricStrip, OpsRow, Panel, StatusPill, Workspace, WorkspaceBody, WorkspaceHeader } from '@/features/platform/operations/components/OperationsWorkspace';
import { formatTimestamp, humanize, operationalTone } from '@/features/platform/operations/lib/operations';
import { createHostCalendarBlock, getHostCalendar, releaseHostCalendarBlock } from '../actions/calendar';

function monthDays(month: string) {
  const [year, monthIndex] = month.split('-').map(Number);
  const count = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  return Array.from({ length: count }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`);
}
function blockForDate(blocks: any[], date: string) { return blocks.find((block) => block.status === 'active' && block.startDate <= date && block.endDate > date); }
function cellTone(reason?: string) {
  if (reason === 'reservation') return 'bg-blue-500';
  if (reason === 'preparation') return 'bg-emerald-500';
  if (reason === 'property_maintenance') return 'bg-rose-500';
  if (reason === 'owner_block') return 'bg-amber-500';
  return 'bg-muted';
}

export async function HostCalendarPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) || {};
  const month = typeof params.month === 'string' ? params.month : undefined;
  const actionError = typeof params.error === 'string' ? params.error : null;
  const { listings, blocks, tasks, month: activeMonth, error } = await getHostCalendar({ month });
  const days = monthDays(activeMonth);
  const reservationBlocks = blocks.filter((block: any) => block.reason === 'reservation' && block.status === 'active');
  const ownerBlocks = blocks.filter((block: any) => block.reason === 'owner_block' && block.status === 'active');
  const turnover = tasks.filter((task: any) => ['turnover_cleaning', 'readiness_inspection'].includes(task.taskType));
  const maintenance = tasks.filter((task: any) => task.taskType === 'property_maintenance' && !['completed', 'cancelled'].includes(task.status));

  return <Workspace>
    <WorkspaceHeader sectionLabel="Calendar" sectionHref="/platform/calendar" eyebrow="Occupancy control" title="Calendar & turnover" description="One date-only view for occupied nights, owner holds, preparation, maintenance, and the work required between stays." actions={<><Button asChild size="sm" variant="outline"><Link href="/dashboard/platform/reservations">Reservation desk</Link></Button><Button asChild size="sm" variant="outline"><Link href="/dashboard/platform/tasks">Task board</Link></Button></>} />
    {actionError ? <div role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">{actionError}</div> : null}
    {error ? <div role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Calendar could not be loaded: {error}</div> : null}
    <MetricStrip items={[{ label: 'Published homes', value: listings.length, detail: 'calendar rows', icon: Home }, { label: 'Occupied stays', value: reservationBlocks.length, detail: 'active reservation blocks', icon: CalendarDays }, { label: 'Turnovers', value: turnover.length, detail: `${turnover.filter((task: any) => !['completed', 'cancelled'].includes(task.status)).length} open`, tone: 'warning', icon: ClipboardCheck }, { label: 'Out-of-service work', value: maintenance.length, detail: `${ownerBlocks.length} owner holds`, tone: maintenance.length ? 'danger' : 'success', icon: Wrench }]} />
    <WorkspaceBody aside={<><Panel title="Turnover run" description={`${activeMonth} · due-time order`}>
      {turnover.map((task: any) => <OpsRow key={task.id} title={task.title} status={task.status} tone={operationalTone(task.status)} meta={`${task.listing?.title || task.property?.name} · ${formatTimestamp(task.dueAt)}`} details={<p className="text-[11px] text-muted-foreground">{task.assignee?.name || 'Unassigned'}{task.reservation ? ` · ${task.reservation.confirmationCode} · ${task.reservation.guest?.name || 'guest'}` : ''}</p>} />)}
      {!turnover.length ? <div className="px-4 py-6 text-sm text-muted-foreground">No turnover tasks due in this month.</div> : null}
    </Panel><Panel title="Calendar key" description="Unit-night authority"><div className="grid grid-cols-2 gap-2 p-4 text-xs">{[['bg-blue-500', 'Reservation'], ['bg-emerald-500', 'Preparation'], ['bg-rose-500', 'Maintenance'], ['bg-amber-500', 'Owner hold']].map(([tone, label]) => <div key={label} className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-sm ${tone}`} />{label}</div>)}</div></Panel></>}>
      <Panel title="Occupancy grid" description="Checkout date is non-occupied. Hover a night for its source and context." action={<form className="flex gap-2"><Input type="month" name="month" defaultValue={activeMonth} className="h-8 w-40" /><Button size="sm" variant="outline" type="submit">View</Button></form>}>
        <div className="overflow-x-auto"><div className="min-w-[980px]">
          <div className="grid border-b border-border bg-muted/30" style={{ gridTemplateColumns: `14rem repeat(${days.length}, minmax(24px, 1fr))` }}><div className="sticky left-0 z-10 border-r border-border bg-muted/30 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Home</div>{days.map((day) => <div key={day} className="border-r border-border py-2 text-center text-[10px] text-muted-foreground last:border-r-0">{Number(day.slice(-2))}</div>)}</div>
          {listings.map((listing: any) => { const listingBlocks = blocks.filter((block: any) => block.listing?.id === listing.id); return <div key={listing.id} className="grid border-b border-border last:border-b-0" style={{ gridTemplateColumns: `14rem repeat(${days.length}, minmax(24px, 1fr))` }}><div className="sticky left-0 z-10 min-w-0 border-r border-border bg-card px-4 py-2"><p className="truncate text-xs font-medium">{listing.title}</p><p className="truncate text-[10px] text-muted-foreground">{listing.property?.address?.publicLocationLabel || listing.property?.name}</p></div>{days.map((day) => { const block = blockForDate(listingBlocks, day); return <div key={day} title={block ? `${humanize(block.reason)} · ${block.reservation?.guest?.name || block.notes || block.source}` : 'Open'} className="flex min-h-11 items-center justify-center border-r border-border p-1 last:border-r-0 hover:bg-muted/40">{block ? <span className={`h-7 w-full rounded-sm ${cellTone(block.reason)}`} /> : <span className="h-1 w-1 rounded-full bg-border" />}</div>; })}</div>; })}
          {!listings.length ? <div className="px-4 py-8 text-center text-sm text-muted-foreground">No published homes to place on the calendar.</div> : null}
        </div></div>
      </Panel>
      <Panel title="Create operational block" description="Blocking inventory is a controlled calendar command. Reservation blocks cannot be released here."><form action={createHostCalendarBlock} className="grid gap-3 p-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr_auto]">
        <select required name="listingKey" className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="">Choose home</option>{listings.map((listing: any) => <option key={listing.id} value={`${listing.id}:${listing.hostOrganization?.id || ''}`}>{listing.title}</option>)}</select><input required name="startDate" type="date" className="h-9 rounded-md border border-input bg-background px-3 text-sm" /><input required name="endDate" type="date" className="h-9 rounded-md border border-input bg-background px-3 text-sm" /><select name="reason" defaultValue="owner_block" className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="owner_block">Owner hold</option><option value="property_maintenance">Maintenance</option><option value="preparation">Preparation</option></select><Input name="notes" placeholder="Reason / evidence" className="h-9" /><Button size="sm" type="submit">Block nights</Button>
      </form><div className="border-t border-border">{blocks.filter((block: any) => block.status === 'active' && !block.reservation).map((block: any) => <OpsRow key={block.id} title={`${block.listing?.title} · ${block.startDate} → ${block.endDate}`} status={block.reason} tone={block.reason === 'property_maintenance' ? 'danger' : 'warning'} meta={block.notes || block.source} actions={<form action={releaseHostCalendarBlock}><input type="hidden" name="blockId" value={block.id} /><Button size="sm" variant="outline">Release</Button></form>} />)}</div></Panel>
    </WorkspaceBody>
  </Workspace>;
}

export default HostCalendarPage;
