'use client';

import Link from 'next/link';
import { useActionState, useState, type ReactNode } from 'react';

import { Field, InlineDisclosure, Select, TextInput } from '@/features/platform/operations/components/FormControls';
import { Callout, Muted } from '@/features/platform/operations/components/PlatformUI';
import { ConfirmSubmitButton, SubmitButton } from '@/features/platform/operations/components/SubmitButton';
import { formatMoney, sentence } from '@/features/platform/operations/lib/operations';
import { createOwnerAssignmentAction, createPropertyOwnerAction, generateOwnerStatementAction, transitionOwnerStatementAction } from '../actions/owners';
import { initialFinanceFormState, statementPath, type FinanceFormState } from '../lib/financeForm';

const failureTitles: Record<string, string> = {
  invalid: 'Check the details',
  conflict: 'Couldn’t complete that',
  forbidden: 'Not allowed',
  error: 'That didn’t go through',
};

function FormFeedback({ state, success }: { state: FinanceFormState; success?: ReactNode }) {
  if (state.status === 'idle') return null;
  if (state.status === 'success') return <Callout live tone="success" title={state.message}>{success}</Callout>;
  return <Callout live tone={state.status === 'error' ? 'danger' : 'warning'} title={failureTitles[state.status]}>{state.message}</Callout>;
}

function InlineFeedback({ state }: { state: FinanceFormState }) {
  if (state.status === 'idle' || state.status === 'success') return null;
  return <p role="alert" className="mt-1.5 max-w-[18rem] whitespace-normal text-left text-xs leading-5 text-destructive">{state.message}</p>;
}

export function GenerateStatementForm({ owners }: { owners: Array<{ id: string; displayName: string; ownerNumber: string }> }) {
  const [state, formAction] = useActionState(generateOwnerStatementAction, initialFinanceFormState);
  const values = state.values || {};
  return <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <div className="sm:col-span-2 lg:col-span-4">
      <FormFeedback state={state} success={state.statementId ? <Link href={statementPath(state.statementId)} className="font-medium underline-offset-4 hover:underline">Review the draft</Link> : null} />
    </div>
    <Field label="Owner" className="sm:col-span-2">
      <Select required name="ownerId" defaultValue={values.ownerId || ''}>
        <option value="" disabled>Choose an owner</option>
        {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.displayName} · {owner.ownerNumber}</option>)}
      </Select>
    </Field>
    <Field label="Period start"><TextInput required name="periodStart" type="date" defaultValue={values.periodStart || ''} /></Field>
    <Field label="Period end" hint="Exclusive; the period must have ended."><TextInput required name="periodEnd" type="date" defaultValue={values.periodEnd || ''} /></Field>
    <Field label="Currency"><TextInput required name="currencyCode" defaultValue={values.currencyCode || 'USD'} minLength={3} maxLength={3} className="uppercase" /></Field>
    <div className="flex items-end sm:col-span-2 lg:col-span-3"><SubmitButton size="sm" pendingLabel="Generating…">Generate draft</SubmitButton></div>
  </form>;
}

function TransitionForm({ statementId, transition, children, className }: { statementId: string; transition: string; children: (state: FinanceFormState) => ReactNode; className?: string }) {
  const [state, formAction] = useActionState(transitionOwnerStatementAction, initialFinanceFormState);
  return <form action={formAction} className={className}>
    <input type="hidden" name="statementId" value={statementId} />
    <input type="hidden" name="transition" value={transition} />
    {children(state)}
    <InlineFeedback state={state} />
  </form>;
}

const forwardStep: Record<string, { transition: string; label: string; pending: string }> = {
  draft: { transition: 'approve', label: 'Approve', pending: 'Approving…' },
  approved: { transition: 'send', label: 'Mark sent', pending: 'Saving…' },
};

export function StatementActions({ statement, canManage }: { statement: any; canManage: boolean }) {
  const settled = <Muted className="block max-w-[10rem] truncate text-xs">{statement.paidReference ? `Ref ${statement.paidReference}` : sentence(statement.status)}</Muted>;
  if (!canManage) return settled;
  if (statement.status === 'sent') {
    const balance = statement.balanceDueCents ?? 0;
    if (balance < 0) return <Muted className="block max-w-[12rem] text-xs">Owner owes {formatMoney(-balance, statement.currencyCode)}</Muted>;
    return <InlineDisclosure summary={balance > 0 ? 'Record paid' : 'Record settled'} className="inline-block text-left">
      <TransitionForm statementId={statement.id} transition="pay" className="grid w-72 gap-3">
        {(state) => <>
          {balance > 0 ? <>
            <p className="text-xs leading-5 text-muted-foreground">Record the transfer you made outside this app for exactly {formatMoney(balance, statement.currencyCode)}. It’s your attestation, not verified with a bank or provider.</p>
            <input type="hidden" name="amountCents" value={balance} />
            <input type="hidden" name="currencyCode" value={statement.currencyCode} />
            <input type="hidden" name="operationKey" value={`pay:${statement.id}:${balance}`} />
            <Field label="Transfer date"><TextInput required name="paidOn" type="date" defaultValue={state.values?.paidOn || ''} /></Field>
            <Field label="Paid to" hint="The owner or account the money went to."><TextInput required name="payee" maxLength={200} defaultValue={state.values?.payee || statement.owner?.displayName || ''} /></Field>
            <Field label="Method"><Select required name="method" defaultValue={state.values?.method || 'bank_transfer'}><option value="bank_transfer">Bank transfer</option><option value="check">Check</option><option value="cash">Cash</option><option value="other">Other</option></Select></Field>
            <Field label="Transfer reference"><TextInput required name="reference" maxLength={120} placeholder="ACH-20491" defaultValue={state.values?.reference || ''} /></Field>
            <Field label="Where the proof is kept" hint="For example the bank statement and month, or the file where the receipt is stored."><TextInput required name="custody" maxLength={300} defaultValue={state.values?.custody || ''} /></Field>
            <label className="flex items-start gap-2 text-xs leading-5"><input type="checkbox" required name="attested" className="mt-0.5" /><span>I made this transfer to the owner for this amount.</span></label>
          </> : <p className="text-xs leading-5 text-muted-foreground">Nothing is due; no payout is recorded.</p>}
          <SubmitButton size="sm" pendingLabel="Recording…">{balance > 0 ? 'Record paid' : 'Record settled'}</SubmitButton>
        </>}
      </TransitionForm>
    </InlineDisclosure>;
  }
  const step = forwardStep[statement.status];
  if (!step) return settled;
  return <div className="inline-flex items-start justify-end gap-1.5">
    <TransitionForm statementId={statement.id} transition={step.transition}>
      {() => <SubmitButton size="sm" variant="outline" pendingLabel={step.pending}>{step.label}</SubmitButton>}
    </TransitionForm>
    <TransitionForm statementId={statement.id} transition="void">
      {() => <ConfirmSubmitButton variant="ghost" title={`Void ${statement.statementNumber}?`} description={<>A voided statement can’t be approved, sent, or paid. Its earnings can go on a corrected statement.</>} confirmLabel="Void statement" pendingLabel="Voiding…">Void</ConfirmSubmitButton>}
    </TransitionForm>
  </div>;
}

export function OwnerCreateForm({ hosts }: { hosts: Array<{ id: string; name: string }> }) {
  const [state, formAction] = useActionState(createPropertyOwnerAction, initialFinanceFormState);
  const values = state.values || {};
  if (!hosts.length) return <p className="text-sm text-muted-foreground">No host lets you add owners.</p>;
  return <form action={formAction} className="grid gap-4 sm:grid-cols-2">
    <div className="sm:col-span-2"><FormFeedback state={state} /></div>
    {hosts.length > 1 ? <Field label="Host" className="sm:col-span-2">
      <Select required name="hostOrganizationId" defaultValue={values.hostOrganizationId || ''}>
        <option value="" disabled>Choose a host</option>
        {hosts.map((host) => <option key={host.id} value={host.id}>{host.name}</option>)}
      </Select>
    </Field> : <input type="hidden" name="hostOrganizationId" value={hosts[0].id} />}
    <Field label="Owner name"><TextInput required name="displayName" minLength={2} maxLength={120} defaultValue={values.displayName || ''} /></Field>
    <Field label="Company" optional><TextInput name="companyName" maxLength={160} defaultValue={values.companyName || ''} /></Field>
    <Field label="Email"><TextInput required name="email" type="email" maxLength={320} defaultValue={values.email || ''} /></Field>
    <Field label="Phone" optional><TextInput name="phone" type="tel" maxLength={40} defaultValue={values.phone || ''} /></Field>
    <Field label="Owner number"><TextInput required name="ownerNumber" maxLength={40} placeholder="OWN-1002" className="font-mono uppercase" defaultValue={values.ownerNumber || ''} /></Field>
    <Field label="Payout schedule">
      <Select name="payoutSchedule" defaultValue={values.payoutSchedule || 'monthly'}>
        <option value="monthly">Monthly</option>
        <option value="quarterly">Quarterly</option>
        <option value="manual">Manual</option>
      </Select>
    </Field>
    <Field label="Default commission (%)"><TextInput required name="commissionPercent" type="number" min={0} max={100} step="0.01" defaultValue={values.commissionPercent ?? '15'} /></Field>
    <div className="flex items-end"><SubmitButton size="sm" pendingLabel="Adding…">Add owner</SubmitButton></div>
  </form>;
}

export function AssignmentCreateForm({ owners, properties, defaultOwnerId = '', defaultPropertyId = '' }: {
  owners: Array<{ id: string; displayName: string; ownerNumber: string; hostOrganization?: { id: string } | null; defaultManagerCommissionBasisPoints?: number | null }>;
  properties: Array<{ id: string; name: string; hostOrganization?: { id: string } | null }>;
  defaultOwnerId?: string;
  defaultPropertyId?: string;
}) {
  const [state, formAction] = useActionState(createOwnerAssignmentAction, initialFinanceFormState);
  const values = state.values || {};
  const [ownerId, setOwnerId] = useState(values.ownerId || defaultOwnerId);
  const owner = owners.find((item) => item.id === ownerId);
  // Only properties of the owner's host can be assigned; the server re-checks it.
  const choices = !owner ? [] : owner.hostOrganization?.id ? properties.filter((property) => property.hostOrganization?.id === owner.hostOrganization?.id) : properties;
  if (!owners.length) return <p className="text-sm text-muted-foreground">Add an owner first.</p>;
  if (!properties.length) return <p className="text-sm text-muted-foreground">No properties are available to you.</p>;
  return <form action={formAction} className="grid gap-4 sm:grid-cols-2">
    <div className="sm:col-span-2"><FormFeedback state={state} /></div>
    <Field label="Owner">
      <Select required name="ownerId" value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
        <option value="" disabled>Choose an owner</option>
        {owners.map((item) => <option key={item.id} value={item.id}>{item.displayName} · {item.ownerNumber}</option>)}
      </Select>
    </Field>
    <Field label="Property">
      <Select required name="propertyId" defaultValue={values.propertyId || defaultPropertyId} disabled={!owner} key={ownerId}>
        <option value="" disabled>{owner ? (choices.length ? 'Choose a property' : 'No properties for this host') : 'Choose an owner first'}</option>
        {choices.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
      </Select>
    </Field>
    <Field label="Ownership (%)"><TextInput required name="ownershipPercent" type="number" min={0.01} max={100} step="0.01" defaultValue={values.ownershipPercent ?? '100'} /></Field>
    <Field label="Manager commission (%)"><TextInput required name="commissionPercent" type="number" min={0} max={100} step="0.01" key={`commission:${ownerId}`} defaultValue={values.commissionPercent ?? (owner?.defaultManagerCommissionBasisPoints != null ? String(owner.defaultManagerCommissionBasisPoints / 100) : '15')} /></Field>
    <Field label="Starts"><TextInput required name="effectiveFrom" type="date" defaultValue={values.effectiveFrom || ''} /></Field>
    <Field label="Ends" optional hint="Exclusive. Leave empty while it applies."><TextInput name="effectiveTo" type="date" defaultValue={values.effectiveTo || ''} /></Field>
    <div className="sm:col-span-2"><SubmitButton size="sm" pendingLabel="Adding…">Add assignment</SubmitButton></div>
  </form>;
}
