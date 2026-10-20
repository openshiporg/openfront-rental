export const TASKS_PATH = '/dashboard/platform/tasks';
export const TASK_PAGE_SIZE = 25;
export const OPEN_TASK_LIMIT = 200;
export const OPEN_TASK_STATUSES = ['queued', 'assigned', 'in_progress', 'blocked'];

export const taskViews = ['all', 'overdue', 'due_soon', 'unassigned', 'blocked', 'completed', 'cancelled'] as const;
export type TaskView = (typeof taskViews)[number];

export const taskTypeLabels: Record<string, string> = {
  turnover_cleaning: 'Turnover cleaning',
  readiness_inspection: 'Readiness inspection',
  property_maintenance: 'Property maintenance',
  restocking: 'Restocking',
  guest_request: 'Guest request',
  check_in_support: 'Check-in support',
};

/** Task-type groups for the board filter — how a host thinks about field work between stays. */
export const workGroups = [
  { id: 'turnover', label: 'Turnovers', types: ['turnover_cleaning', 'readiness_inspection'] },
  { id: 'maintenance', label: 'Maintenance', types: ['property_maintenance'] },
  { id: 'restocking', label: 'Restocking', types: ['restocking'] },
  { id: 'guest', label: 'Guest support', types: ['guest_request', 'check_in_support'] },
] as const;

export const taskRuleTriggerStates: Record<string, { label: string; running: boolean }> = {
  reservation_confirmed: { label: 'When a stay is confirmed', running: true },
  before_check_in: { label: 'Before check-in', running: true },
  after_check_out: { label: 'After checkout', running: true },
  reservation_cancelled: { label: 'When a stay is cancelled', running: true },
  calendar_schedule: { label: 'Calendar schedule', running: false },
};

export type TaskSearchScope = { listings: boolean; reservations: boolean; people: boolean };

/** Search only fields the operator could read on the card, so a filter can't reveal hidden values. */
export function taskSearchWhere(q: string, scope: TaskSearchScope) {
  if (!q) return null;
  const contains = { contains: q, mode: 'insensitive' };
  const needle = q.toLowerCase();
  const types = Object.entries(taskTypeLabels).filter(([, label]) => label.toLowerCase().includes(needle)).map(([value]) => value);
  return {
    OR: [
      { title: contains },
      { property: { name: contains } },
      ...(scope.listings ? [{ listing: { title: contains } }] : []),
      ...(scope.people ? [{ assignee: { name: contains } }] : []),
      ...(scope.reservations ? [{ reservation: { confirmationCode: contains } }] : []),
      ...(types.length ? [{ taskType: { in: types } }] : []),
    ],
  };
}

export function taskGroupWhere(type: string) {
  const group = workGroups.find((entry) => entry.id === type);
  return group ? { taskType: { in: [...group.types] } } : null;
}

const open = { status: { in: OPEN_TASK_STATUSES } };

export function taskViewWhere(view: TaskView, now: Date) {
  if (view === 'overdue') return { AND: [open, { dueAt: { lt: now.toISOString() } }] };
  if (view === 'due_soon') return { AND: [open, { dueAt: { lte: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() } }] };
  if (view === 'unassigned') return { AND: [open, { assignee: null }] };
  if (view === 'blocked') return { status: { equals: 'blocked' } };
  if (view === 'cancelled') return { status: { equals: 'cancelled' } };
  if (view === 'completed') return { status: { equals: 'completed' } };
  return { status: { notIn: ['cancelled'] } };
}

/** The board URL the operator acted from, keeping only its own filters, plus result params. */
export function boardPath(returnTo: string, params: Record<string, string> = {}) {
  const search = new URLSearchParams();
  if (returnTo.startsWith(`${TASKS_PATH}?`)) {
    const previous = new URLSearchParams(returnTo.slice(TASKS_PATH.length + 1));
    for (const key of ['view', 'type', 'q', 'page']) {
      const value = previous.get(key);
      if (value) search.set(key, value.slice(0, 120));
    }
  }
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value.slice(0, 300));
  const query = search.toString();
  return query ? `${TASKS_PATH}?${query}` : TASKS_PATH;
}
