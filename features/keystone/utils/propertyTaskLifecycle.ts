import crypto from 'node:crypto';

import { zonedLocalTimestamp } from './stayBookingRules';

type TaskStatus = 'queued' | 'assigned' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
type TaskState = { status: TaskStatus; assigneeId?: string | null; checklist?: unknown };
type TaskAction =
  | { action: 'assign'; assigneeId: string }
  | { action: 'start' }
  | { action: 'complete'; completionNotes?: string; completionEvidence?: Record<string, unknown> }
  | { action: 'block'; completionNotes: string }
  | { action: 'cancel'; completionNotes?: string }
  | { action: 'reopen' };

/** Shared vocabularies: the PropertyTask/TaskRule select fields and the task commands use the same values. */
export const propertyTaskTypeOptions = [
  { label: 'Turnover Cleaning', value: 'turnover_cleaning' },
  { label: 'Readiness Inspection', value: 'readiness_inspection' },
  { label: 'Property Maintenance', value: 'property_maintenance' },
  { label: 'Guest Request', value: 'guest_request' },
  { label: 'Restocking', value: 'restocking' },
  { label: 'Check-in Support', value: 'check_in_support' },
] as const;

export const propertyTaskPriorityOptions = [
  { label: 'Low', value: 'low' },
  { label: 'Normal', value: 'normal' },
  { label: 'High', value: 'high' },
  { label: 'Urgent', value: 'urgent' },
] as const;

export const taskRuleTriggerOptions = [
  { label: 'Reservation confirmed', value: 'reservation_confirmed' },
  { label: 'Before check-in', value: 'before_check_in' },
  { label: 'After check-out', value: 'after_check_out' },
  { label: 'Reservation cancelled', value: 'reservation_cancelled' },
  { label: 'Calendar schedule', value: 'calendar_schedule' },
] as const;

export type PropertyTaskType = (typeof propertyTaskTypeOptions)[number]['value'];
export type PropertyTaskPriority = (typeof propertyTaskPriorityOptions)[number]['value'];

/** No schedule definition or evaluator exists for these: existing rules are kept but create no tasks. */
export const unsupportedTaskRuleTriggers: readonly string[] = ['calendar_schedule'];

export function isPropertyTaskType(value: unknown): value is PropertyTaskType {
  return propertyTaskTypeOptions.some((option) => option.value === value);
}

export function isPropertyTaskPriority(value: unknown): value is PropertyTaskPriority {
  return propertyTaskPriorityOptions.some((option) => option.value === value);
}

/** Operator-facing task command errors; the dashboard shows only these verbatim. */
export const propertyTaskMessages = {
  propertyNotFound: 'Property not found.',
  archivedProperty: 'Archived properties can’t take new tasks.',
  title: 'Task title is required and must be at most 240 characters.',
  notes: 'Task notes are too long.',
  taskType: 'Choose a supported task type.',
  priority: 'Choose a supported task priority.',
  dueInvalid: 'The task due date and time are invalid.',
  dueZone: 'The property’s time zone changed. Review the due time and try again.',
  dueGap: 'That time doesn’t exist at the property because of a daylight-saving change.',
  zoneInvalid: 'The property’s time zone is invalid. Fix it before scheduling work.',
  listing: 'Task listing must belong to the selected property and host organization.',
  reservation: 'Task reservation must belong to the selected property and host organization.',
  reservationListing: 'The selected stay is booked on a different listing.',
  assignee: 'Task assignee must be an active member of the host organization.',
  staleAssignee: 'This task’s assignee is no longer an active member. Reassign it first.',
  checklistIncomplete: 'Check every checklist item, or block the task with a reason.',
  workUnconfirmed: 'Confirm the work is done before completing the task.',
} as const;

export function propertyTaskRuleKey(ruleId: string, reservationId: string) {
  const digest = crypto.createHash('sha256').update(`${ruleId.trim()}|${reservationId.trim()}`).digest('hex');
  return `property-task:${digest}`;
}

/** Checklist items as stored (strings, or objects with a label), in order. */
export function propertyTaskChecklist(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object') {
        const record = entry as Record<string, unknown>;
        const text = record.label ?? record.title ?? record.item ?? record.name;
        return typeof text === 'string' ? text : '';
      }
      return '';
    })
    .map((item) => item.trim())
    .filter(Boolean);
}

/** A user may receive task work only while their account is active and their membership of this host is active. */
export async function isActiveTaskAssignee(tx: any, hostOrganizationId: string, userId?: string | null) {
  if (!userId) return false;
  const membership = await tx.hostMembership.findFirst({
    where: { hostOrganizationId, userId, status: 'active', user: { isActive: true } },
    select: { id: true },
  });
  return Boolean(membership);
}

function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(0);
    return true;
  } catch {
    return false;
  }
}

function validDateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function wallTime(instant: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(instant));
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')}T${String(Number(get('hour')) % 24).padStart(2, '0')}:${get('minute')}`;
}

const ZONED_LOCAL_DUE = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})\[([^\]]{1,64})\]$/;
const ABSOLUTE_DUE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * A due time is either an absolute instant or property-local wall time tagged with the
 * property's zone (RFC 9557, `2026-11-02T09:30[America/Los_Angeles]`). Zone-less local text
 * is refused so the server's own zone never decides when work is due.
 */
export function resolvePropertyTaskDueAt(value: string | null | undefined, propertyTimeZone: string): Date | null {
  const raw = value?.trim() || '';
  if (!raw) return null;
  const local = ZONED_LOCAL_DUE.exec(raw);
  if (local) {
    const [, date, hour, minute, zone] = local;
    if (!isValidTimeZone(propertyTimeZone)) throw new Error(propertyTaskMessages.zoneInvalid);
    if (zone !== propertyTimeZone) throw new Error(propertyTaskMessages.dueZone);
    if (!validDateOnly(date) || Number(hour) > 23 || Number(minute) > 59) throw new Error(propertyTaskMessages.dueInvalid);
    const instant = zonedLocalTimestamp(date, `${hour}:${minute}`, propertyTimeZone);
    if (wallTime(instant, propertyTimeZone) !== `${date}T${hour}:${minute}`) throw new Error(propertyTaskMessages.dueGap);
    return new Date(instant);
  }
  if (ABSOLUTE_DUE.test(raw)) {
    const instant = new Date(raw);
    if (!Number.isNaN(instant.getTime())) return instant;
  }
  throw new Error(propertyTaskMessages.dueInvalid);
}

function boundedNotes(notes?: string) {
  const value = notes?.trim() || '';
  if (value.length > 4000) throw new Error('Task completion notes are too long.');
  return value;
}

const DERIVED_EVIDENCE_KEYS = ['checkedItems', 'checklist', 'checklistConfirmed', 'workConfirmed'];

/**
 * Checklist evidence is derived from the stored checklist and the items the operator actually
 * ticked; every item must be ticked, and a task without items needs an explicit confirmation.
 */
function completionEvidenceFor(checklist: unknown, submitted?: Record<string, unknown>) {
  const evidence: Record<string, unknown> = submitted ? structuredClone(submitted) : {};
  if (JSON.stringify(evidence).length > 16_000) throw new Error('Task completion evidence is too large.');
  const items = propertyTaskChecklist(checklist);
  const checkedItems = evidence.checkedItems;
  const ticked = new Set(Array.isArray(checkedItems) ? checkedItems.filter((item): item is string => typeof item === 'string') : []);
  if (items.length) {
    if (items.some((item) => !ticked.has(item))) throw new Error(propertyTaskMessages.checklistIncomplete);
  } else if (evidence.workConfirmed !== true && evidence.checklistConfirmed !== true) {
    throw new Error(propertyTaskMessages.workUnconfirmed);
  }
  const extra = Object.fromEntries(Object.entries(evidence).filter(([key]) => !DERIVED_EVIDENCE_KEYS.includes(key)));
  return { ...extra, checklist: items.map((item) => ({ item, checked: true })), checklistConfirmed: true, workConfirmed: true };
}

export function applyPropertyTaskTransition(state: TaskState, transition: TaskAction, now = new Date()): Record<string, unknown> {
  if (['completed', 'cancelled'].includes(state.status)) throw new Error(`A ${state.status} task is terminal.`);
  switch (transition.action) {
    case 'assign': {
      const assigneeId = transition.assigneeId?.trim();
      if (!assigneeId) throw new Error('Task assignee is required.');
      if (!['queued', 'assigned', 'blocked'].includes(state.status)) throw new Error(`Cannot assign a ${state.status} task.`);
      return { status: 'assigned', assigneeId, claimedAt: now };
    }
    case 'start':
      if (state.status !== 'assigned' || !state.assigneeId) throw new Error('A task must be assigned before it can start.');
      return { status: 'in_progress', startedAt: now };
    case 'complete': {
      if (state.status !== 'in_progress') throw new Error('A task must be in progress before completion.');
      const completionNotes = boundedNotes(transition.completionNotes);
      const completionEvidence = completionEvidenceFor(state.checklist, transition.completionEvidence);
      return {
        status: 'completed',
        completedAt: now,
        ...(completionNotes ? { completionNotes } : {}),
        completionEvidence,
      };
    }
    case 'block': {
      const completionNotes = boundedNotes(transition.completionNotes);
      if (!completionNotes) throw new Error('A blocked task requires a reason.');
      return { status: 'blocked', completionNotes };
    }
    case 'cancel': {
      const completionNotes = boundedNotes(transition.completionNotes);
      return { status: 'cancelled', cancelledAt: now, ...(completionNotes ? { completionNotes } : {}) };
    }
    case 'reopen':
      if (state.status !== 'blocked') throw new Error('Only a blocked task can be reopened.');
      return { status: state.assigneeId ? 'assigned' : 'queued', completionNotes: '' };
  }
}
