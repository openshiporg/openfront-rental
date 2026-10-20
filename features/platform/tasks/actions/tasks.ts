'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { propertyTaskMessages } from '@/features/keystone/utils/propertyTaskLifecycle';
import {
  OPEN_TASK_LIMIT,
  OPEN_TASK_STATUSES,
  TASK_PAGE_SIZE,
  TASKS_PATH,
  boardPath,
  taskGroupWhere,
  taskSearchWhere,
  taskViewWhere,
  workGroups,
  type TaskView,
} from '../lib/taskBoard';

const TRANSITION_ACTIONS = ['assign', 'start', 'complete', 'block', 'reopen', 'cancel'];
const knownMessages = new Set<string>(Object.values(propertyTaskMessages));

const TASK_FIELDS = `
  id title taskType status priority dueAt source notes checklist completionNotes completionEvidence completedAt cancelledAt
  property { id name timezone hostOrganization { id } }
  listing { id title }
  reservation { id confirmationCode status guest { name } }
  assignee { id name }
`;

/** A task command's own validation message, or the caller's fallback for anything else. */
function commandMessage(response: { success: boolean; errors?: any[] }, fallback: string) {
  const message = response.success ? '' : String(response.errors?.[0]?.message || '');
  return knownMessages.has(message) ? message : fallback;
}

function and(...filters: Array<Record<string, unknown> | null>) {
  const parts = filters.filter(Boolean) as Array<Record<string, unknown>>;
  return parts.length ? { AND: parts } : {};
}

export async function getOperationsTasks({ q = '', view = 'all', type = 'all', page = 1 }: { q?: string; view?: TaskView; type?: string; page?: number } = {}) {
  const actor = q ? await keystoneClient<any>(`query TaskSearchScope { authenticatedItem { ... on User { id role { canReadListings canReadReservations canSeeOtherPeople canManagePeople } } } }`) : null;
  const role = actor?.success ? actor.data?.authenticatedItem?.role : null;
  const search = taskSearchWhere(q, {
    listings: role?.canReadListings === true,
    reservations: role?.canReadReservations === true,
    people: role?.canSeeOtherPeople === true || role?.canManagePeople === true,
  });
  const group = taskGroupWhere(type);
  const now = new Date();
  const filtered = (viewWhere: Record<string, unknown>) => and(search, group, viewWhere);
  const viewWhere = taskViewWhere(view, now);
  const skip = (Math.max(page, 1) - 1) * TASK_PAGE_SIZE;
  // Completed and cancelled work are paged history views: every past task stays reachable.
  const historyView = view === 'cancelled' || view === 'completed';
  const openWhere = and(search, group, viewWhere, { status: { in: OPEN_TASK_STATUSES } });
  const response = await keystoneClient<any>(`
    query OperationsTasks(
      $openWhere: PropertyTaskWhereInput!, $doneWhere: PropertyTaskWhereInput!, $historyWhere: PropertyTaskWhereInput!, $historyTake: Int!, $historySkip: Int!,
      $all: PropertyTaskWhereInput!, $overdue: PropertyTaskWhereInput!, $dueSoon: PropertyTaskWhereInput!, $unassigned: PropertyTaskWhereInput!, $blocked: PropertyTaskWhereInput!, $cancelled: PropertyTaskWhereInput!,
      $chipAll: PropertyTaskWhereInput!, $chipTurnover: PropertyTaskWhereInput!, $chipMaintenance: PropertyTaskWhereInput!, $chipRestocking: PropertyTaskWhereInput!, $chipGuest: PropertyTaskWhereInput!,
      $openTurnovers: PropertyTaskWhereInput!, $completed: PropertyTaskWhereInput!, $total: PropertyTaskWhereInput!,
      $laneTodo: PropertyTaskWhereInput!, $laneActive: PropertyTaskWhereInput!
    ) {
      open: propertyTasks(where: $openWhere, orderBy: [{ dueAt: asc }, { id: asc }], take: ${OPEN_TASK_LIMIT}) { ${TASK_FIELDS} }
      openCount: propertyTasksCount(where: $openWhere)
      done: propertyTasks(where: $doneWhere, orderBy: [{ completedAt: desc }, { id: desc }], take: ${TASK_PAGE_SIZE}) { ${TASK_FIELDS} }
      doneCount: propertyTasksCount(where: $doneWhere)
      history: propertyTasks(where: $historyWhere, orderBy: [{ ${view === 'completed' ? 'completedAt' : 'cancelledAt'}: desc }, { id: desc }], take: $historyTake, skip: $historySkip) { ${TASK_FIELDS} }
      all: propertyTasksCount(where: $all)
      overdue: propertyTasksCount(where: $overdue)
      dueSoon: propertyTasksCount(where: $dueSoon)
      unassigned: propertyTasksCount(where: $unassigned)
      blocked: propertyTasksCount(where: $blocked)
      cancelled: propertyTasksCount(where: $cancelled)
      chipAll: propertyTasksCount(where: $chipAll)
      chipTurnover: propertyTasksCount(where: $chipTurnover)
      chipMaintenance: propertyTasksCount(where: $chipMaintenance)
      chipRestocking: propertyTasksCount(where: $chipRestocking)
      chipGuest: propertyTasksCount(where: $chipGuest)
      openTurnovers: propertyTasksCount(where: $openTurnovers)
      completed: propertyTasksCount(where: $completed)
      total: propertyTasksCount(where: $total)
      laneTodo: propertyTasksCount(where: $laneTodo)
      laneActive: propertyTasksCount(where: $laneActive)
    }
  `, {
    openWhere: historyView ? { id: { in: [] } } : openWhere,
    doneWhere: view === 'all' ? and(search, group, { status: { equals: 'completed' } }) : { id: { in: [] } },
    historyWhere: historyView ? filtered(viewWhere) : { id: { in: [] } },
    historyTake: historyView ? TASK_PAGE_SIZE : 0,
    historySkip: historyView ? skip : 0,
    all: filtered(taskViewWhere('all', now)),
    overdue: filtered(taskViewWhere('overdue', now)),
    dueSoon: filtered(taskViewWhere('due_soon', now)),
    unassigned: filtered(taskViewWhere('unassigned', now)),
    blocked: filtered(taskViewWhere('blocked', now)),
    cancelled: filtered(taskViewWhere('cancelled', now)),
    chipAll: and(search, taskViewWhere('all', now)),
    chipTurnover: and(search, taskGroupWhere('turnover'), taskViewWhere('all', now)),
    chipMaintenance: and(search, taskGroupWhere('maintenance'), taskViewWhere('all', now)),
    chipRestocking: and(search, taskGroupWhere('restocking'), taskViewWhere('all', now)),
    chipGuest: and(search, taskGroupWhere('guest'), taskViewWhere('all', now)),
    openTurnovers: and(search, taskGroupWhere('turnover'), { status: { in: OPEN_TASK_STATUSES } }),
    completed: filtered({ status: { equals: 'completed' } }),
    total: taskViewWhere('all', now),
    laneTodo: historyView ? { id: { in: [] } } : and(openWhere, { status: { in: ['queued', 'blocked'] } }),
    laneActive: historyView ? { id: { in: [] } } : and(openWhere, { status: { in: ['assigned', 'in_progress'] } }),
  });
  if (!response.success) return { data: null, error: 'Task data is temporarily unavailable.' };
  const data = response.data;
  const chipCounts: Record<string, number> = { all: data.chipAll, turnover: data.chipTurnover, maintenance: data.chipMaintenance, restocking: data.chipRestocking, guest: data.chipGuest };
  return {
    data: {
      open: data.open || [],
      openCount: data.openCount || 0,
      done: data.done || [],
      doneCount: data.doneCount || 0,
      history: data.history || [],
      total: data.total || 0,
      lanes: { queued: data.laneTodo || 0, active: data.laneActive || 0, completed: view === 'all' ? data.doneCount || 0 : 0 } as Record<string, number>,
      counts: {
        all: data.all || 0,
        overdue: data.overdue || 0,
        due_soon: data.dueSoon || 0,
        unassigned: data.unassigned || 0,
        blocked: data.blocked || 0,
        cancelled: data.cancelled || 0,
        openTurnovers: data.openTurnovers || 0,
        completed: data.completed || 0,
      },
      chips: workGroups.reduce((counts, entry) => ({ ...counts, [entry.id]: chipCounts[entry.id] || 0 }), { all: chipCounts.all || 0 } as Record<string, number>),
    },
    error: null,
  };
}

/**
 * Inputs for the New task form: workable properties, their listings, members and upcoming stays.
 * `search` narrows properties (by name) and stays (by code, guest or listing), so a property or
 * stay past the first page of choices can still be picked.
 */
export async function getTaskFormOptions(search = '') {
  const sinceDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const q = search.trim().slice(0, 120);
  const contains = { contains: q, mode: 'insensitive' };
  const propertyWhere = { status: { in: ['onboarding', 'active', 'paused'] }, ...(q ? { OR: [{ name: contains }, { listings: { some: { title: contains } } }] } : {}) };
  const stayBase = { status: { in: ['pending', 'confirmed', 'in_stay', 'completed'] }, checkOutDate: { gte: sinceDate } };
  const response = await keystoneClient<any>(`
    query TaskFormOptions($stayWhere: ReservationWhereInput!, $propertyWhere: PropertyWhereInput!) {
      properties(where: $propertyWhere, orderBy: [{ name: asc }, { id: asc }], take: 200) {
        id name status timezone hostOrganization { id }
        listings(where: { status: { notIn: ["archived"] } }, orderBy: [{ title: asc }], take: 50) { id title status }
      }
      propertiesCount(where: $propertyWhere)
      hostMemberships(where: { status: { equals: "active" }, user: { isActive: { equals: true } } }, orderBy: [{ id: asc }], take: 500) {
        id hostOrganization { id } user { id name }
      }
      reservations(where: $stayWhere, orderBy: [{ checkInDate: asc }, { id: asc }], take: 300) {
        id confirmationCode status checkInDate checkOutDate guest { name } listing { id property { id } }
      }
      reservationsCount(where: $stayWhere)
      taskRules(where: { isActive: { equals: true } }, orderBy: [{ name: asc }, { id: asc }], take: 100) {
        id name trigger hostOrganization { id name } property { name } listing { title }
      }
      taskRulesCount(where: { isActive: { equals: true } })
    }
  `, {
    stayWhere: q ? { AND: [stayBase, { OR: [{ confirmationCode: contains }, { guest: { name: contains } }, { listing: { title: contains } }, { listing: { property: { name: contains } } }] }] } : stayBase,
    propertyWhere,
  });
  if (!response.success) return { data: null, error: 'Task options are temporarily unavailable.' };
  const data = response.data;
  const members = (data.hostMemberships || [])
    .filter((membership: any) => membership.user?.id && membership.hostOrganization?.id)
    .map((membership: any) => ({ userId: membership.user.id, name: membership.user.name || 'Teammate', hostOrganizationId: membership.hostOrganization.id }));
  return {
    data: {
      properties: data.properties || [],
      propertiesCount: data.propertiesCount || 0,
      members,
      reservations: data.reservations || [],
      reservationsCount: data.reservationsCount || 0,
      rules: data.taskRules || [],
      rulesCount: data.taskRulesCount || 0,
    },
    error: null,
  };
}

export type TaskCreateState = { ok: boolean; message: string; values: Record<string, string>; attempt: number };

const CREATE_FIELDS = ['title', 'taskType', 'priority', 'propertyId', 'listingId', 'reservationId', 'assigneeId', 'dueDate', 'dueTime', 'dueTimeZone', 'notes'];

export async function createOperationsTask(previous: TaskCreateState, formData: FormData): Promise<TaskCreateState> {
  const values = Object.fromEntries(CREATE_FIELDS.map((key) => [key, String(formData.get(key) || '').slice(0, 4000)]));
  const attempt = (previous?.attempt || 0) + 1;
  const fail = (message: string): TaskCreateState => ({ ok: false, message, values, attempt });
  if (!values.propertyId) return fail('Choose a property.');
  if (Boolean(values.dueDate) !== Boolean(values.dueTime)) return fail('Add both a due date and a due time, or leave both empty.');
  if (values.dueDate && !values.dueTimeZone) return fail(propertyTaskMessages.dueZone);
  const response = await keystoneClient<any>(`
    mutation CreatePropertyTask($propertyId: ID!, $listingId: ID, $reservationId: ID, $assigneeId: ID, $title: String!, $taskType: String!, $priority: String, $dueAt: String, $notes: String) {
      createOperationsTask(propertyId: $propertyId, listingId: $listingId, reservationId: $reservationId, assigneeId: $assigneeId, title: $title, taskType: $taskType, priority: $priority, dueAt: $dueAt, notes: $notes)
    }
  `, {
    propertyId: values.propertyId,
    listingId: values.listingId || null,
    reservationId: values.reservationId || null,
    assigneeId: values.assigneeId || null,
    title: values.title,
    taskType: values.taskType,
    priority: values.priority || 'normal',
    // Property-local wall time tagged with the zone the form showed; the server converts it.
    dueAt: values.dueDate ? `${values.dueDate}T${values.dueTime.slice(0, 5)}[${values.dueTimeZone}]` : null,
    notes: values.notes,
  });
  if (!response.success) return fail(commandMessage(response, 'The task could not be created. Review the selected property, listing, stay, and assignee.'));
  revalidatePath(TASKS_PATH);
  return { ok: true, message: 'Task created.', values: {}, attempt };
}

export async function transitionOperationsTask(formData: FormData): Promise<void> {
  const action = String(formData.get('action') || '');
  const returnTo = String(formData.get('returnTo') || '');
  if (!TRANSITION_ACTIONS.includes(action)) redirect(boardPath(returnTo, { error: 'That task action isn’t available.' }));
  const evidence = action === 'complete'
    ? { checkedItems: formData.getAll('checklistItem').map(String), workConfirmed: formData.get('workConfirmed') === 'on' }
    : null;
  const response = await keystoneClient<any>(`
    mutation TransitionPropertyTask($taskId: ID!, $action: String!, $assigneeId: ID, $completionNotes: String, $completionEvidence: JSON) {
      transitionPropertyTask(taskId: $taskId, action: $action, assigneeId: $assigneeId, completionNotes: $completionNotes, completionEvidence: $completionEvidence)
    }
  `, {
    taskId: String(formData.get('taskId') || ''),
    action,
    assigneeId: String(formData.get('assigneeId') || '') || null,
    completionNotes: String(formData.get('completionNotes') || '') || null,
    completionEvidence: evidence,
  });
  if (!response.success) {
    redirect(boardPath(returnTo, { error: commandMessage(response, 'The task changed before the action was applied. Refresh the workspace and try again.') }));
  }
  revalidatePath(TASKS_PATH);
  redirect(boardPath(returnTo, { updated: action }));
}

export type TaskTransitionState = { ok: boolean; message: string; values: Record<string, string>; checked: string[]; attempt: number };

/** Complete, block and cancel: a rejected command returns its typed note and ticks instead of redirecting them away. */
export async function transitionOperationsTaskWithNote(previous: TaskTransitionState, formData: FormData): Promise<TaskTransitionState> {
  const action = String(formData.get('action') || '');
  const returnTo = String(formData.get('returnTo') || '');
  const completionNotes = String(formData.get('completionNotes') || '').slice(0, 4000);
  const checkedItems = formData.getAll('checklistItem').map(String);
  const workConfirmed = formData.get('workConfirmed') === 'on';
  const attempt = (previous?.attempt || 0) + 1;
  const fail = (message: string): TaskTransitionState => ({ ok: false, message, values: { completionNotes }, checked: [...checkedItems, ...(workConfirmed ? ['workConfirmed'] : [])], attempt });
  if (!['complete', 'block', 'cancel'].includes(action)) return fail('That task action isn’t available.');
  const response = await keystoneClient<any>(`
    mutation TransitionPropertyTaskWithNote($taskId: ID!, $action: String!, $completionNotes: String, $completionEvidence: JSON) {
      transitionPropertyTask(taskId: $taskId, action: $action, completionNotes: $completionNotes, completionEvidence: $completionEvidence)
    }
  `, {
    taskId: String(formData.get('taskId') || ''),
    action,
    completionNotes: completionNotes || null,
    completionEvidence: action === 'complete' ? { checkedItems, workConfirmed } : null,
  });
  if (!response.success) return fail(commandMessage(response, 'The task changed before the action was applied. Refresh the workspace and try again.'));
  revalidatePath(TASKS_PATH);
  redirect(boardPath(returnTo, { updated: action }));
}

export async function runTaskRulesAction(formData: FormData): Promise<void> {
  const returnTo = String(formData.get('returnTo') || '');
  const response = await keystoneClient<any>(`
    mutation RunPropertyTaskRules($hostOrganizationId: ID!, $afterRuleId: String) { runPropertyTaskRules(hostOrganizationId: $hostOrganizationId, afterRuleId: $afterRuleId) }
  `, { hostOrganizationId: String(formData.get('hostOrganizationId') || ''), afterRuleId: String(formData.get('afterRuleId') || '') || null });
  if (!response.success) redirect(boardPath(returnTo, { error: 'Before-arrival tasks couldn’t be created. Try again.' }));
  const result = response.data.runPropertyTaskRules || {};
  revalidatePath(TASKS_PATH);
  redirect(boardPath(returnTo, { updated: 'rules', created: String(Number(result.created) || 0), more: result.remaining ? '1' : '', ruleCursor: typeof result.nextRuleCursor === 'string' ? result.nextRuleCursor : '' }));
}
