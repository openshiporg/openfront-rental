import { AlertTriangle, CheckCircle2, ClipboardCheck, Clock3, UserRoundCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExceptionRail, MetricStrip, OpsRow, Panel, StatusPill, Workspace, WorkspaceBody, WorkspaceHeader } from '@/features/platform/operations/components/OperationsWorkspace';
import { formatTimestamp, humanize, operationalTone } from '@/features/platform/operations/lib/operations';
import { createOperationsTask, getOperationsTasks, transitionOperationsTask } from '../actions/tasks';

const lanes = [
  { id: 'queued', label: 'Unassigned / queued', statuses: ['queued', 'blocked'] },
  { id: 'active', label: 'Assigned / in progress', statuses: ['assigned', 'in_progress'] },
  { id: 'completed', label: 'Completed evidence', statuses: ['completed'] },
];

export async function OperationsTasksPage() {
  const { tasks, properties, users, error } = await getOperationsTasks();
  const open = tasks.filter((task: any) => !['completed', 'cancelled'].includes(task.status)); const now = Date.now();
  const overdue = open.filter((task: any) => task.dueAt && new Date(task.dueAt).getTime() < now);
  const unassigned = open.filter((task: any) => !task.assignee);
  const exceptions = [...overdue.map((task: any) => ({ id: `overdue-${task.id}`, title: task.title, detail: `${task.property?.name} · due ${formatTimestamp(task.dueAt)}. Use the task transition form on this board.`, href: '#task-board', actionLabel: 'Open task board', resolution: 'action' as const, tone: 'danger' as const })), ...unassigned.map((task: any) => ({ id: `unassigned-${task.id}`, title: task.title, detail: `${task.property?.name} · assignee required through the task transition form.`, href: '#task-board', actionLabel: 'Assign task', resolution: 'action' as const }))];

  return <Workspace><WorkspaceHeader sectionLabel="Tasks" sectionHref="/platform/tasks" eyebrow="Field operations" title="Tasks & checklists" description="Assign turnover, inspection, maintenance, restocking, and guest support work. Completion remains a controlled transition with checklist evidence." />
    {error ? <div role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Tasks could not be loaded: {error}</div> : null}
    <MetricStrip items={[{ label: 'Open work', value: open.length, detail: `${tasks.length} total records`, icon: ClipboardCheck }, { label: 'Overdue', value: overdue.length, detail: 'past recorded due time', tone: overdue.length ? 'danger' : 'success', icon: AlertTriangle }, { label: 'Unassigned', value: unassigned.length, detail: 'needs an owner', tone: unassigned.length ? 'warning' : 'success', icon: UserRoundCheck }, { label: 'Completed', value: tasks.filter((task: any) => task.status === 'completed').length, detail: 'completion evidence retained', icon: CheckCircle2 }]} />
    <WorkspaceBody aside={<><ExceptionRail title="Dispatch exceptions" items={exceptions} empty="No overdue or unassigned work." /><Panel title="Create work" description="Manual task creation uses the protected operations command."><form action={createOperationsTask} className="grid gap-2 p-4">
      <select required name="propertyId" className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="">Choose property</option>{properties.map((property: any) => <option key={property.id} value={property.id}>{property.name}</option>)}</select>
      <select name="listingId" className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="">Any listing at property</option>{properties.flatMap((property: any) => (property.listings || []).map((listing: any) => <option key={listing.id} value={listing.id}>{listing.title}</option>))}</select>
      <select name="taskType" defaultValue="turnover_cleaning" className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="turnover_cleaning">Turnover cleaning</option><option value="readiness_inspection">Readiness inspection</option><option value="property_maintenance">Property maintenance</option><option value="restocking">Restocking</option><option value="guest_request">Guest request</option><option value="check_in_support">Check-in support</option></select>
      <Input required name="title" placeholder="Work outcome" className="h-9" /><Input name="dueAt" type="datetime-local" className="h-9" /><select name="assigneeId" className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="">Unassigned</option>{users.map((user: any) => <option key={user.id} value={user.id}>{user.name}</option>)}</select><Input name="notes" placeholder="Checklist or operating note" className="h-9" /><Button size="sm" type="submit">Create task</Button>
    </form></Panel></>}>
      <div id="task-board" className="grid min-w-0 gap-4 2xl:grid-cols-3">{lanes.map((lane) => { const laneTasks = tasks.filter((task: any) => lane.statuses.includes(task.status)); return <Panel key={lane.id} title={lane.label} description={`${laneTasks.length} task${laneTasks.length === 1 ? '' : 's'}`}>
        {laneTasks.map((task: any) => <OpsRow key={task.id} title={task.title} status={task.status} tone={operationalTone(task.status)} meta={`${task.property?.name}${task.listing?.title ? ` · ${task.listing.title}` : ''}`} details={<div className="space-y-2"><div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground"><span>{humanize(task.taskType)}</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{formatTimestamp(task.dueAt)}</span><span>{task.assignee?.name || 'Unassigned'}</span><span>{humanize(task.priority)}</span></div>{!['completed', 'cancelled'].includes(task.status) ? <form action={transitionOperationsTask} className="grid gap-2 border-t border-border pt-2"><input type="hidden" name="taskId" value={task.id} />{['queued', 'blocked'].includes(task.status) ? <select required name="assigneeId" className="h-8 rounded-md border border-input bg-background px-2 text-xs"><option value="">Choose assignee</option>{users.map((user: any) => <option key={user.id} value={user.id}>{user.name}</option>)}</select> : <input type="hidden" name="assigneeId" value={task.assignee?.id || ''} />}<Input name="completionNotes" placeholder={task.status === 'in_progress' ? 'Completion evidence note' : 'Transition reason'} className="h-8 text-xs" /><label className="flex items-center gap-2 text-[11px] text-muted-foreground"><input type="checkbox" name="checklistConfirmed" />Checklist and evidence confirmed</label><div className="flex gap-2"><select name="action" defaultValue={['queued', 'blocked'].includes(task.status) ? 'assign' : task.status === 'assigned' ? 'start' : 'complete'} className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs"><option value="assign">Assign</option><option value="start">Start</option><option value="complete">Complete</option><option value="block">Block</option><option value="reopen">Reopen</option><option value="cancel">Cancel</option></select><Button size="sm" type="submit">Apply</Button></div></form> : <p className="border-t border-border pt-2 text-xs text-muted-foreground">{task.completionNotes || 'Checklist evidence recorded.'}</p>}</div>} />)}
        {!laneTasks.length ? <div className="px-4 py-8 text-center text-xs text-muted-foreground">No work in this lane.</div> : null}
      </Panel>; })}</div>
    </WorkspaceBody>
  </Workspace>;
}
export default OperationsTasksPage;
