import crypto from 'node:crypto';

type TaskStatus = 'queued' | 'assigned' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
type TaskState = { status: TaskStatus; assigneeId?: string | null };
type TaskAction =
  | { action: 'assign'; assigneeId: string }
  | { action: 'start' }
  | { action: 'complete'; completionNotes?: string; completionEvidence?: Record<string, unknown> }
  | { action: 'block'; completionNotes: string }
  | { action: 'cancel'; completionNotes?: string }
  | { action: 'reopen' };

export function propertyTaskRuleKey(ruleId: string, reservationId: string) {
  const digest = crypto.createHash('sha256').update(`${ruleId.trim()}|${reservationId.trim()}`).digest('hex');
  return `property-task:${digest}`;
}

function boundedNotes(notes?: string) {
  const value = notes?.trim() || '';
  if (value.length > 4000) throw new Error('Task completion notes are too long.');
  return value;
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
      const completionEvidence = transition.completionEvidence ? structuredClone(transition.completionEvidence) : undefined;
      if (completionEvidence?.checklistConfirmed !== true) {
        throw new Error('Task completion requires confirmed checklist evidence.');
      }
      if (JSON.stringify(completionEvidence).length > 16_000) {
        throw new Error('Task completion evidence is too large.');
      }
      return {
        status: 'completed',
        completedAt: now,
        ...(completionNotes ? { completionNotes } : {}),
        ...(completionEvidence ? { completionEvidence } : {}),
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
