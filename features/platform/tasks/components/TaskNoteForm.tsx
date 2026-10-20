'use client';

import { Ban, CheckCircle2 } from 'lucide-react';
import { useActionState } from 'react';

import { Checkbox, TextInput } from '@/features/platform/operations/components/FormControls';
import { ConfirmSubmitButton, SubmitButton } from '@/features/platform/operations/components/SubmitButton';
import { cn } from '@/lib/utils';
import type { TaskTransitionState } from '../actions/tasks';

const initialState: TaskTransitionState = { ok: false, message: '', values: {}, checked: [], attempt: 0 };

/**
 * Complete, block and cancel carry typed text (and ticked checklist items); a rejected command
 * keeps them and shows why, instead of losing the draft on a redirect.
 */
export function TaskNoteForm({ action, taskId, transition, returnTo, taskTitle, checklist = [], itemLabels = [] }: {
  action: (state: TaskTransitionState, formData: FormData) => Promise<TaskTransitionState>;
  taskId: string;
  transition: 'complete' | 'block' | 'cancel';
  returnTo: string;
  taskTitle: string;
  checklist?: string[];
  itemLabels?: string[];
}) {
  const [state, formAction] = useActionState(action, initialState);
  const note = state.values.completionNotes || '';
  return <form action={formAction} className={cn(transition === 'complete' ? 'grid gap-2' : 'grid gap-1.5')}>
    <input type="hidden" name="taskId" value={taskId} />
    <input type="hidden" name="action" value={transition} />
    <input type="hidden" name="returnTo" value={returnTo} />
    <div key={state.attempt} className={cn(transition === 'complete' ? 'grid gap-2' : 'flex min-w-0 gap-2')}>
      {transition === 'complete' ? <>
        {checklist.length
          ? <fieldset className="grid gap-1.5">
            <legend className="mb-1 text-xs font-medium">Checklist · {checklist.length} {checklist.length === 1 ? 'item' : 'items'}</legend>
            {checklist.map((item, index) => <Checkbox key={`${index}-${item}`} required name="checklistItem" value={item} defaultChecked={state.checked.includes(item)} label={itemLabels[index] || item} className="text-xs" />)}
          </fieldset>
          : <Checkbox required name="workConfirmed" defaultChecked={state.checked.includes('workConfirmed')} label="Work done" className="text-xs" />}
        <TextInput name="completionNotes" defaultValue={note} aria-label="Completion note" placeholder="What was done, anything to flag" className="h-8 text-xs" />
        <SubmitButton size="sm" className="h-8 w-full" pendingLabel="Completing…"><CheckCircle2 aria-hidden="true" />Complete</SubmitButton>
      </> : transition === 'block' ? <>
        <TextInput required name="completionNotes" defaultValue={note} aria-label="Reason this task is blocked" placeholder="Why it’s blocked" className="h-8 flex-1 text-xs" />
        <SubmitButton size="sm" variant="outline" className="h-8" pendingLabel="Blocking…"><Ban aria-hidden="true" />Block</SubmitButton>
      </> : <>
        <TextInput name="completionNotes" defaultValue={note} aria-label="Cancellation note" placeholder="Cancellation note (optional)" className="h-8 flex-1 text-xs" />
        <ConfirmSubmitButton className="h-8" title="Cancel this task?" description={<>“{taskTitle}” is closed and can’t be reopened. It stays in Cancelled history; create a new task if the work is needed later.</>} confirmLabel="Cancel task" cancelLabel="Keep task" pendingLabel="Cancelling…">Cancel</ConfirmSubmitButton>
      </>}
    </div>
    {state.message ? <p role="alert" className="text-xs leading-5 text-rose-700 dark:text-rose-400">{state.message}</p> : null}
  </form>;
}
