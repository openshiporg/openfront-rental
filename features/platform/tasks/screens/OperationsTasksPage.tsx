import { AlertTriangle, Ban, ClipboardCheck, ClipboardPlus, Clock3, History, Play, RefreshCcw, RotateCcw, UserRoundCheck, Workflow } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { propertyTaskChecklist } from '@/features/keystone/utils/propertyTaskLifecycle';
import { getPlatformCapabilities } from '@/features/platform/lib/capabilities';
import { FilterChips, Pager, SearchField, ViewTabs } from '@/features/platform/operations/components/ListSection';
import { Disclosure, Select } from '@/features/platform/operations/components/FormControls';
import { Avatar, Callout, Dot, EmptyState, LinkRows, PageBody, PageHeader, Pill, PlatformPage, StatTiles, StatusBadge, toneText } from '@/features/platform/operations/components/PlatformUI';
import { SubmitButton } from '@/features/platform/operations/components/SubmitButton';
import { listHref, pickView, readSearchParams, type PlatformSearchParams } from '@/features/platform/operations/lib/listParams';
import { formatDayRange, formatTimestamp, isPast, plural, sentence, type OperationalTone } from '@/features/platform/operations/lib/operations';
import { cn } from '@/lib/utils';
import { createOperationsTask, getOperationsTasks, getTaskFormOptions, runTaskRulesAction, transitionOperationsTask, transitionOperationsTaskWithNote } from '../actions/tasks';
import { TaskCreateForm } from '../components/TaskCreateForm';
import { TaskNoteForm } from '../components/TaskNoteForm';
import { OPEN_TASK_LIMIT, TASK_PAGE_SIZE, TASKS_PATH as TASKS, taskRuleTriggerStates, taskTypeLabels, taskViews, workGroups } from '../lib/taskBoard';

const lanes: Array<{ id: string; label: string; statuses: string[]; tone: OperationalTone; empty: string }> = [
  { id: 'queued', label: 'To do', statuses: ['queued', 'blocked'], tone: 'warning', empty: 'Nothing waiting to be picked up.' },
  { id: 'active', label: 'In progress', statuses: ['assigned', 'in_progress'], tone: 'info', empty: 'No one is working on anything right now.' },
  { id: 'completed', label: 'Done', statuses: ['completed'], tone: 'success', empty: 'Completed work will collect here.' },
];

const settledTaskMessages: Record<string, string> = {
  assign: 'Task assigned',
  start: 'Task started — it’s now in progress',
  complete: 'Task completed',
  block: 'Task marked blocked',
  reopen: 'Task reopened',
  cancel: 'Task cancelled',
};

const priorityTone: Record<string, OperationalTone> = { urgent: 'danger', high: 'warning', normal: 'neutral', low: 'neutral' };

/** One transition, one form — the action is fixed so only moves the task lifecycle accepts are offered. */
function TaskAction({ task, action, returnTo, children, className }: { task: any; action: string; returnTo: string; children: ReactNode; className?: string }) {
  return <form action={transitionOperationsTask} className={className}>
    <input type="hidden" name="taskId" value={task.id} />
    <input type="hidden" name="action" value={action} />
    <input type="hidden" name="returnTo" value={returnTo} />
    {children}
  </form>;
}

function AssignForm({ task, members, label, returnTo }: { task: any; members: any[]; label: string; returnTo: string }) {
  const hostMembers = members.filter((member: any) => member.hostOrganizationId === task.property?.hostOrganization?.id);
  const options = hostMembers.filter((member: any) => member.userId !== task.assignee?.id);
  if (!options.length) return <p className="text-xs text-muted-foreground">{hostMembers.length ? 'No other active teammates to assign.' : 'No active teammates to assign.'}</p>;
  return <TaskAction task={task} action="assign" returnTo={returnTo} className="flex min-w-0 gap-2">
    <Select required name="assigneeId" defaultValue="" aria-label="Assignee" className="h-8 flex-1 text-xs">
      <option value="" disabled>Choose a teammate</option>
      {options.map((member: any) => <option key={member.userId} value={member.userId}>{member.name}</option>)}
    </Select>
    <SubmitButton size="sm" variant="outline" className="h-8" pendingLabel="Assigning…"><UserRoundCheck aria-hidden="true" />{label}</SubmitButton>
  </TaskAction>;
}

/** Original instructions; the checklist is listed here unless the completion form shows it item by item. */
function TaskInstructions({ task, checklist, listChecklist }: { task: any; checklist: string[]; listChecklist: boolean }) {
  if (!task.notes && !checklist.length) return null;
  return <div className="mt-2.5 space-y-2 text-xs leading-5">
    {task.notes ? <p className="text-muted-foreground [overflow-wrap:anywhere]"><span className="font-medium text-foreground">Notes:</span> {task.notes}</p> : null}
    {checklist.length && listChecklist ? <div>
      <p className="font-medium">Checklist · {plural(checklist.length, 'item')}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">{checklist.map((item, index) => <li key={`${index}-${item}`} className="[overflow-wrap:anywhere]">{sentence(item)}</li>)}</ul>
    </div> : null}
  </div>;
}

function CompletedEvidence({ task }: { task: any }) {
  const ticked = Array.isArray(task.completionEvidence?.checklist) ? task.completionEvidence.checklist.filter((entry: any) => entry?.checked === true).length : null;
  return <div className="mt-3 space-y-1 border-t pt-2 text-xs leading-5 text-muted-foreground">
    {task.status === 'completed' ? <p>Completed {formatTimestamp(task.completedAt, task.property?.timezone)}{ticked ? ` · ${plural(ticked, 'checklist item')} ticked` : ''}</p> : null}
    {task.status === 'cancelled' ? <p>Cancelled {formatTimestamp(task.cancelledAt, task.property?.timezone)}</p> : null}
    {task.completionNotes ? <p className="[overflow-wrap:anywhere]">{task.completionNotes}</p> : null}
  </div>;
}

function TaskCard({ task, members, now, returnTo, canManage }: { task: any; members: any[]; now: number; returnTo: string; canManage: boolean }) {
  const open = !['completed', 'cancelled'].includes(task.status);
  const overdue = open && isPast(task.dueAt, now);
  const blocked = task.status === 'blocked';
  const checklist = propertyTaskChecklist(task.checklist);
  const stayClosed = open && ['cancelled', 'no_show'].includes(task.reservation?.status);
  return <article className={cn('min-w-0 rounded-lg border bg-card p-3 shadow-xs', overdue && 'border-rose-200 dark:border-rose-900/60', blocked && 'border-amber-200 dark:border-amber-900/60')}>
    <div className="flex items-start justify-between gap-2">
      <h3 className="min-w-0 text-sm font-medium leading-5 [overflow-wrap:anywhere]">{task.title}</h3>
      {task.priority && task.priority !== 'normal' ? <Pill tone={priorityTone[task.priority] || 'neutral'} className="shrink-0">{sentence(task.priority)}</Pill> : null}
    </div>
    <p className="mt-0.5 truncate text-xs text-muted-foreground">{task.property?.name || 'Property'}{task.listing?.title ? ` · ${task.listing.title}` : ''}</p>
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      <Pill>{taskTypeLabels[task.taskType] || sentence(task.taskType)}</Pill>
      <Pill tone={overdue ? 'danger' : undefined}><Clock3 aria-hidden="true" className="size-3" />{task.dueAt ? `${overdue ? 'Overdue · ' : ''}${formatTimestamp(task.dueAt, task.property?.timezone)}` : 'No due time'}</Pill>
      {task.reservation ? <Pill title={task.reservation.guest?.name || undefined}>{task.reservation.confirmationCode}</Pill> : null}
      {stayClosed ? <Pill tone="warning">Stay {sentence(task.reservation.status).toLowerCase()}</Pill> : null}
    </div>
    <TaskInstructions task={task} checklist={checklist} listChecklist={!(canManage && task.status === 'in_progress')} />
    <div className="mt-3 flex items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-2 text-xs"><Avatar name={task.assignee?.name} className="size-6 text-[10px]" /><span className={cn('truncate', !task.assignee && toneText.warning)}>{task.assignee?.name || 'Unassigned'}</span></span>
      <StatusBadge status={task.status} className="h-5" />
    </div>
    {blocked && task.completionNotes ? <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs leading-5 text-amber-950 [overflow-wrap:anywhere] dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"><span className="font-medium">Blocked:</span> {task.completionNotes}</p> : null}

    {open && canManage ? <div className="mt-3 space-y-2 border-t pt-3">
      {task.status === 'queued' ? <AssignForm task={task} members={members} returnTo={returnTo} label="Assign" /> : null}
      {task.status === 'assigned' ? <TaskAction task={task} action="start" returnTo={returnTo}><SubmitButton size="sm" className="h-8 w-full" pendingLabel="Starting…"><Play aria-hidden="true" />Start work</SubmitButton></TaskAction> : null}
      {task.status === 'in_progress' ? <TaskNoteForm action={transitionOperationsTaskWithNote} taskId={task.id} transition="complete" returnTo={returnTo} taskTitle={task.title} checklist={checklist} itemLabels={checklist.map((item) => sentence(item))} /> : null}
      {blocked ? <TaskAction task={task} action="reopen" returnTo={returnTo}><SubmitButton size="sm" variant="outline" className="h-8 w-full" pendingLabel="Reopening…"><RotateCcw aria-hidden="true" />{task.assignee?.name ? `Reopen for ${task.assignee.name.split(' ')[0]}` : 'Reopen'}</SubmitButton></TaskAction> : null}

      <details className="group/task">
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-md py-1 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          {task.status === 'assigned' || blocked ? 'Reassign, block, or cancel' : 'Block or cancel'}
          <span className="text-[10px] uppercase tracking-wide group-open/task:hidden">Open</span><span className="hidden text-[10px] uppercase tracking-wide group-open/task:inline">Close</span>
        </summary>
        <div className="mt-2 space-y-3">
          {task.status === 'assigned' || blocked ? <AssignForm task={task} members={members} returnTo={returnTo} label={task.assignee ? 'Reassign' : 'Assign'} /> : null}
          {!blocked ? <TaskNoteForm action={transitionOperationsTaskWithNote} taskId={task.id} transition="block" returnTo={returnTo} taskTitle={task.title} /> : null}
          <TaskNoteForm action={transitionOperationsTaskWithNote} taskId={task.id} transition="cancel" returnTo={returnTo} taskTitle={task.title} />
        </div>
      </details>
    </div> : null}
    {!open ? <CompletedEvidence task={task} /> : null}
  </article>;
}

function TaskRulesPanel({ rules, rulesCount, canManage, returnTo, ruleCursor = '' }: { rules: any[]; rulesCount: number; canManage: boolean; returnTo: string; ruleCursor?: string }) {
  if (!rules.length) return null;
  const paused = rules.filter((rule: any) => taskRuleTriggerStates[rule.trigger]?.running === false);
  const arrivalHosts = [...new Map(rules.filter((rule: any) => rule.trigger === 'before_check_in' && rule.hostOrganization?.id).map((rule: any): [string, string] => [rule.hostOrganization.id, rule.hostOrganization.name || 'Host'])).entries()];
  return <Disclosure icon={Workflow} summary="Task rules" description={`${plural(rulesCount, 'active rule')}${paused.length ? ` · ${paused.length} not running` : ''}`} trailing={paused.length ? <Pill tone="warning">Not running</Pill> : null}>
    <LinkRows items={rules.map((rule: any) => {
      const state = taskRuleTriggerStates[rule.trigger] || { label: sentence(rule.trigger), running: false };
      return {
        id: rule.id,
        title: rule.name,
        meta: [state.label, rule.listing?.title || rule.property?.name].filter(Boolean).join(' · '),
        trailing: state.running ? <Pill tone="success">Running</Pill> : <Pill tone="warning">Not running · creates no tasks</Pill>,
      };
    })} />
    {rulesCount > rules.length ? <p className="mt-2 text-xs text-muted-foreground">Showing {rules.length} of {rulesCount} active rules.</p> : null}
    {canManage && arrivalHosts.length ? <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
      {arrivalHosts.map(([hostId, hostName]) => <form key={hostId} action={runTaskRulesAction}>
        <input type="hidden" name="hostOrganizationId" value={hostId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        {/* Continues from where the last run stopped, so later rules are reached in turn. */}
        {ruleCursor ? <input type="hidden" name="afterRuleId" value={ruleCursor} /> : null}
        <SubmitButton size="sm" variant="outline" pendingLabel="Creating…">{arrivalHosts.length > 1 ? `Create missing before-arrival tasks · ${hostName}` : 'Create missing before-arrival tasks'}</SubmitButton>
      </form>)}
    </div> : null}
  </Disclosure>;
}

export async function OperationsTasksPage({ searchParams }: { searchParams?: PlatformSearchParams } = {}) {
  const { q, view: requested, get, page: requestedPage, error: actionError } = await readSearchParams(searchParams);
  const view = pickView(requested, taskViews, 'all');
  const type = pickView(get('type'), ['all', ...workGroups.map((group) => group.id)], 'all');
  const page = Math.max(1, Number.parseInt(requestedPage || '', 10) || 1);
  const [board, options, capabilities] = await Promise.all([
    getOperationsTasks({ q, view, type, page }),
    getTaskFormOptions(get('taskQ')),
    getPlatformCapabilities(),
  ]);
  const data = board.data;
  const canManage = capabilities.known && capabilities.canManageProperties;
  const now = Date.now();
  const returnTo = listHref(TASKS, { view, type, q, page: (view === 'cancelled' || view === 'completed') && page > 1 ? String(page) : undefined });
  const settled = get('updated') === 'rules'
    ? `${plural(Number(get('created')) || 0, 'before-arrival task')} created${get('more') ? ' · more stays remain, run it again' : ''}`
    : settledTaskMessages[get('updated')];
  const filtered = Boolean(q) || view !== 'all' || type !== 'all';
  const members = options.data?.members || [];
  const counts = data?.counts;
  const historyCount = Number((view === 'completed' ? counts?.completed : counts?.cancelled) || 0);
  const tile = (value: number | undefined) => (data ? value ?? 0 : '—');

  const formProperties = (options.data?.properties || []).filter((property: any) => property.hostOrganization?.id).map((property: any) => ({
    id: property.id,
    name: property.name,
    status: property.status,
    timezone: property.timezone || 'UTC',
    hostOrganizationId: property.hostOrganization.id,
    listings: property.listings || [],
  }));
  const stays = (options.data?.reservations || []).filter((stay: any) => stay.listing?.id && stay.listing?.property?.id).map((stay: any) => ({
    id: stay.id,
    label: `${stay.confirmationCode} · ${stay.guest?.name || 'Guest'} · ${formatDayRange(stay.checkInDate, stay.checkOutDate)}`,
    listingId: stay.listing.id,
    propertyId: stay.listing.property.id,
  }));

  return <PlatformPage section="Tasks" sectionHref="/platform/tasks">
    <PageHeader title="Tasks" description="Turnovers, inspections, maintenance, restocking, and guest requests — assign, start, and complete work against its checklist." />
    <PageBody>
      {actionError ? <Callout live tone="warning" title="That change wasn’t applied">{actionError}</Callout> : null}
      {!actionError && settled ? <Callout live tone="success" title={settled} /> : null}
      {board.error ? <Callout live tone="warning" title="Tasks couldn’t be loaded" action={<Button asChild size="sm" variant="outline"><Link href={returnTo}><RefreshCcw aria-hidden="true" />Try again</Link></Button>}>{board.error} Counts and lanes below are unavailable, not empty.</Callout> : null}
      {!capabilities.known ? <Callout tone="warning" title="Task controls are unavailable">Your permissions couldn’t be checked. Refresh to try again.</Callout> : null}
      {capabilities.known && !capabilities.canManageProperties ? <Callout title="View only">Your role can see tasks but not create or change them.</Callout> : null}
      <StatTiles items={[
        { label: 'Open', value: tile(counts ? counts.all - counts.completed : undefined), hint: counts ? `${plural(counts.openTurnovers, 'turnover')} · ${counts.all} total` : 'Unavailable', icon: ClipboardCheck, href: listHref(TASKS, { type, q }), active: view === 'all' },
        { label: 'Overdue', value: tile(counts?.overdue), hint: counts ? 'past due time' : 'Unavailable', tone: counts ? (counts.overdue ? 'danger' : 'success') : undefined, icon: AlertTriangle, href: listHref(TASKS, { view: 'overdue', type, q }), active: view === 'overdue' },
        { label: 'Unassigned', value: tile(counts?.unassigned), hint: counts ? 'needs an owner' : 'Unavailable', tone: counts ? (counts.unassigned ? 'warning' : 'success') : undefined, icon: UserRoundCheck, href: listHref(TASKS, { view: 'unassigned', type, q }), active: view === 'unassigned' },
        { label: 'Blocked', value: tile(counts?.blocked), hint: counts ? `${counts.completed} completed` : 'Unavailable', tone: counts?.blocked ? 'warning' : undefined, icon: Ban, href: listHref(TASKS, { view: 'blocked', type, q }), active: view === 'blocked' },
      ]} />

      {canManage ? <Disclosure id="new-task" icon={ClipboardPlus} summary="New task" description="Create work for a property, optionally tied to a listing, stay and teammate." defaultOpen={Boolean(get('taskQ'))}>
        {(options.data?.propertiesCount || 0) > (options.data?.properties || []).length || (options.data?.reservationsCount || 0) > (options.data?.reservations || []).length || get('taskQ') ? <form action={TASKS} className="mb-4 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="task-option-search">Find a property or stay</label>
          <input id="task-option-search" name="taskQ" defaultValue={get('taskQ')} placeholder="Find a property, listing or stay" className="h-8 w-64 rounded-md border bg-background px-3 text-sm" />
          <input type="hidden" name="view" value={view} />
          <Button size="sm" variant="ghost" type="submit">Find</Button>
        </form> : null}
        {options.error ? <p className="text-sm text-muted-foreground">{options.error} Refresh to try again.</p>
          : formProperties.length ? <TaskCreateForm
            action={createOperationsTask}
            properties={formProperties}
            members={members}
            stays={stays}
            staysTruncated={(options.data?.reservationsCount || 0) > stays.length}
            taskTypes={Object.entries(taskTypeLabels)}
          />
          : <p className="text-sm text-muted-foreground">No onboarding, active, or paused properties to schedule work for.</p>}
        {(options.data?.propertiesCount || 0) > formProperties.length ? <p className="mt-3 text-xs text-muted-foreground">Showing the first {formProperties.length} of {options.data?.propertiesCount} properties.</p> : null}
      </Disclosure> : null}

      {options.data ? <TaskRulesPanel rules={options.data.rules} rulesCount={options.data.rulesCount} canManage={canManage} returnTo={returnTo} ruleCursor={get('more') ? get('ruleCursor') || '' : ''} /> : null}

      <section aria-label="Task board" id="task-board" className="min-w-0 space-y-4">
        <div className="space-y-3 border-b">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-end sm:justify-between">
            <ViewTabs basePath={TASKS} view={view} q={q} preserve={{ type }} label="Task filters" tabs={[
              { id: 'all', label: 'All work', count: counts?.all },
              { id: 'overdue', label: 'Overdue', count: counts?.overdue, tone: 'danger' },
              { id: 'due_soon', label: 'Due in 24h', count: counts?.due_soon, tone: 'warning' },
              { id: 'unassigned', label: 'Unassigned', count: counts?.unassigned, tone: 'warning' },
              { id: 'blocked', label: 'Blocked', count: counts?.blocked, tone: 'warning' },
              { id: 'completed', label: 'Completed', count: counts?.completed },
              { id: 'cancelled', label: 'Cancelled', count: counts?.cancelled },
            ]} />
            <div className="sm:pb-2"><SearchField basePath={TASKS} q={q} view={view} preserve={{ type }} placeholder="Search task, property, or teammate" /></div>
          </div>
          <div className="pb-3">
            <FilterChips
              label="Work type"
              value={type}
              hrefFor={(id) => listHref(TASKS, { view, q, type: id })}
              chips={[{ id: 'all', label: 'All', count: data?.chips.all }, ...workGroups.map((group) => ({ id: group.id, label: group.label, count: data?.chips[group.id] }))]}
            />
          </div>
        </div>

        {!data ? <div className="rounded-xl border bg-card"><EmptyState icon={AlertTriangle} title="Tasks are unavailable" description="This is a loading problem, not an empty board." action={<Button asChild size="sm" variant="outline"><Link href={returnTo}><RefreshCcw aria-hidden="true" />Try again</Link></Button>} /></div>
          : view === 'cancelled' || view === 'completed' ? <section aria-label={view === 'completed' ? 'Completed tasks' : 'Cancelled tasks'} className="min-w-0 overflow-hidden rounded-xl border bg-card">
            <header className="flex items-center gap-2 border-b px-4 py-3 text-sm font-semibold"><History aria-hidden="true" className="size-4 text-muted-foreground" />{view === 'completed' ? 'Completed history' : 'Cancelled history'}<span className="rounded-md bg-muted px-1.5 text-xs font-medium tabular-nums text-muted-foreground">{historyCount}</span></header>
            {data.history.length ? <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">{data.history.map((task: any) => <TaskCard key={task.id} task={task} members={members} now={now} returnTo={returnTo} canManage={false} />)}</div>
              : <EmptyState compact icon={History} title={filtered && (q || type !== 'all') ? `No ${view} tasks match` : `No ${view} tasks`} />}
            {historyCount > TASK_PAGE_SIZE ? <footer className="flex items-center justify-between gap-3 border-t bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
              <span>Showing {Math.min((page - 1) * TASK_PAGE_SIZE + 1, historyCount)}–{Math.min(page * TASK_PAGE_SIZE, historyCount)} of {historyCount}</span>
              <Pager page={page} pageCount={Math.ceil(historyCount / TASK_PAGE_SIZE)} hrefFor={(target) => listHref(TASKS, { view, type, q, page: target > 1 ? String(target) : undefined })} />
            </footer> : null}
          </section>
          : !data.total && !data.counts.cancelled && !filtered ? <div className="rounded-xl border bg-card"><EmptyState icon={ClipboardCheck} title="No tasks yet" description="Turnover tasks are created as stays are confirmed. Add one-off work with New task." /></div>
            : <>
              {data.openCount > data.open.length || data.doneCount > data.done.length ? <p className="text-xs text-muted-foreground">
                {data.openCount > data.open.length ? `Showing the ${OPEN_TASK_LIMIT} soonest-due of ${data.openCount} open tasks. ` : ''}
                {data.doneCount > data.done.length ? <>Done shows the {data.done.length} most recent of {data.doneCount}. <Link href={listHref(TASKS, { view: 'completed', type, q })} className="font-medium text-foreground underline-offset-4 hover:underline">All completed tasks</Link></> : ''}
              </p> : null}
              {filtered ? <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">Showing {data.openCount + (view === 'all' ? data.doneCount : 0)} of {data.total} tasks<Link href={TASKS} className="font-medium text-foreground underline-offset-4 hover:underline">Clear filters</Link></p> : null}
              <div className="grid min-w-0 items-start gap-4 lg:grid-cols-3">
                {lanes.map((lane) => {
                  const laneTasks = [...data.open, ...data.done].filter((task: any) => lane.statuses.includes(task.status));
                  const laneCount = data.lanes[lane.id] ?? laneTasks.length;
                  return <div key={lane.id} className="min-w-0 rounded-xl border bg-muted/30 p-2">
                    <h2 className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold"><Dot tone={lane.tone} />{lane.label}<span className="rounded-md bg-background px-1.5 text-xs font-medium tabular-nums text-muted-foreground ring-1 ring-border">{laneCount}</span></h2>
                    <div className="mt-1 space-y-2">
                      {laneTasks.map((task: any) => <TaskCard key={task.id} task={task} members={members} now={now} returnTo={returnTo} canManage={canManage} />)}
                      {!laneTasks.length ? <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">{filtered ? 'Nothing here matches.' : lane.empty}</p> : null}
                    </div>
                  </div>;
                })}
              </div>
              {data.counts.cancelled ? <p className="text-xs text-muted-foreground"><Link href={listHref(TASKS, { view: 'cancelled', type, q })} className="font-medium text-foreground underline-offset-4 hover:underline">{plural(data.counts.cancelled, 'cancelled task')}</Link> in history</p> : null}
            </>}
      </section>
    </PageBody>
  </PlatformPage>;
}
export default OperationsTasksPage;
