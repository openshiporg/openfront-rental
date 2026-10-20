'use client';

import { useActionState } from 'react';

import { Field, TextArea } from '@/features/platform/operations/components/FormControls';
import { Callout } from '@/features/platform/operations/components/PlatformUI';
import { SubmitButton } from '@/features/platform/operations/components/SubmitButton';
import { replyToConversationFormAction, type ReplyFormState } from '../actions/detailWorkspaces';

const initialState: ReplyFormState = { message: '' };

/** A rejected reply keeps its text in the form; an unconfirmed send is reported as such. */
export function ConversationReplyForm({ conversationId }: { conversationId: string }) {
  const [state, formAction] = useActionState(replyToConversationFormAction, initialState);
  return <form key={state.body ?? ''} action={formAction} className="space-y-3">
    {state.message ? <Callout live tone="warning" title={state.unknown ? 'Reply status unknown' : 'The reply wasn’t sent'}>{state.message}</Callout> : null}
    <input type="hidden" name="conversationId" value={conversationId} />
    <Field label="Message"><TextArea required name="body" rows={4} maxLength={4000} defaultValue={state.body || ''} placeholder="Thanks for asking — early check-in from 1pm works on your dates." /></Field>
    <SubmitButton size="sm" pendingLabel="Sending…">Send reply</SubmitButton>
  </form>;
}
