'use client';

import { Copy } from 'lucide-react';
import { useActionState, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/features/platform/operations/components/FormControls';
import { SubmitButton } from '@/features/platform/operations/components/SubmitButton';
import type { AgreementLinkState } from '../actions/detailWorkspaces';

export function AgreementLinkReissue({ agreementId, action }: {
  agreementId: string;
  action: (state: AgreementLinkState, formData: FormData) => Promise<AgreementLinkState>;
}) {
  const [state, formAction] = useActionState(action, { ok: false, message: '' });
  const [copied, setCopied] = useState(false);
  const link = state.link && typeof window !== 'undefined' ? `${window.location.origin}${state.link}` : state.link;
  return <form action={formAction} className="space-y-3">
    <input type="hidden" name="agreementId" value={agreementId} />
    <Checkbox name="postToThread" defaultChecked label="Post the link in the guest’s message thread" hint="The guest sees it on their private trip page." />
    <SubmitButton size="sm" variant="outline" pendingLabel="Issuing…">Issue new signing link</SubmitButton>
    {state.message ? <p role="status" className={state.ok ? 'text-xs leading-5 text-muted-foreground' : 'text-xs leading-5 text-rose-700 dark:text-rose-400'}>{state.message}</p> : null}
    {state.ok && link ? <div className="flex min-w-0 items-center gap-2 rounded-md border bg-muted/30 p-2">
      <code className="min-w-0 flex-1 truncate font-mono text-xs">{link}</code>
      <Button type="button" size="sm" variant="ghost" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setCopied(false); } }}><Copy aria-hidden="true" />{copied ? 'Copied' : 'Copy'}</Button>
    </div> : null}
  </form>;
}
