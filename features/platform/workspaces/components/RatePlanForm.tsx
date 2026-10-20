'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox, Field, Select, TextArea, TextInput } from '@/features/platform/operations/components/FormControls';
import { MoneyInput } from '@/features/platform/operations/components/MoneyInput';
import { Callout } from '@/features/platform/operations/components/PlatformUI';
import { GuardedForm } from '@/features/platform/operations/components/GuardedForm';
import { SubmitButton } from '@/features/platform/operations/components/SubmitButton';
import { createRatePlanAction, updateRatePlanAction, type CatalogFormState } from '../actions/catalogWorkspaces';

const initialState: CatalogFormState = { ok: false, message: '' };

type ListingRules = { id: string; title: string; currencyCode: string; minimumStay?: number | null; advanceNoticeHours?: number | null; bookingWindowDays?: number | null };
type Plan = { id: string; name: string; description?: string | null; status: string; currencyCode: string; baseNightlyRateCents: number; minimumStay: number; maximumStay?: number | null; advanceNoticeHours?: number | null; bookingWindowDays?: number | null; isDefault: boolean; cancellationPolicy?: { id: string } | null };

const asText = (value?: number | null) => value == null ? '' : String(value);

export function RatePlanForm({ listing, plan, policies, cancelHref }: { listing: ListingRules; plan?: Plan; policies: Array<{ id: string; name: string; version: string }>; cancelHref: string }) {
  const [state, formAction] = useActionState(plan ? updateRatePlanAction : createRatePlanAction, initialState);
  const values = state.values;
  // After a rejected save the form re-mounts with what was submitted.
  const value = (key: string, initial: string) => values ? values[key] ?? '' : initial;
  const currency = (plan ? value('currencyCode', plan.currencyCode) : listing.currencyCode).toUpperCase();
  // The rate comes back as submitted minor units, scaled by the submitted currency; blank stays blank.
  const rateCents = values ? (values.baseNightlyRateCents ? Number(values.baseNightlyRateCents) : null) : plan?.baseNightlyRateCents ?? 0;
  const listingNotice = listing.advanceNoticeHours ? `${listing.advanceNoticeHours} hours` : 'no notice';
  const listingWindow = listing.bookingWindowDays ? `${listing.bookingWindowDays} days` : 'no limit';
  return <GuardedForm draftKey={plan ? `rate-plan-${plan.id}` : `rate-plan-new-${listing.id}`} key={JSON.stringify(values || {})} action={formAction} className="grid gap-5 p-5 sm:grid-cols-6">
    {state.message ? <Callout live tone="warning" title={plan ? 'The rate plan wasn’t saved' : 'The rate plan wasn’t created'} className="sm:col-span-6">{state.message}</Callout> : null}
    {plan ? <input type="hidden" name="ratePlanId" value={plan.id} /> : <input type="hidden" name="listingId" value={listing.id} />}
    <Field label="Name" className="sm:col-span-4"><TextInput required name="name" minLength={2} maxLength={120} defaultValue={value('name', plan?.name || '')} placeholder="Standard" /></Field>
    <Field label="Status" className="sm:col-span-2">
      <Select required name="status" defaultValue={value('status', plan?.status || 'draft')}>
        <option value="draft">Draft</option><option value="active">Active</option>{plan ? <option value="archived">Archived</option> : null}
      </Select>
    </Field>
    <Field label="Description" optional className="sm:col-span-6"><TextArea name="description" rows={3} maxLength={2000} defaultValue={value('description', plan?.description || '')} /></Field>
    <Field label="Nightly rate" className="sm:col-span-3"><MoneyInput required name="baseNightlyRateCents" {...(plan ? { currencyFrom: 'currencyCode' } : {})} currencyCode={currency} defaultCents={rateCents} suffix="per night" /></Field>
    {plan
      ? <Field label="Currency" hint={currency !== listing.currencyCode ? `The listing sells in ${listing.currencyCode}.` : undefined} className="sm:col-span-3"><TextInput required name="currencyCode" minLength={3} maxLength={3} defaultValue={currency} className="uppercase" /></Field>
      : <Field label="Currency" className="sm:col-span-3"><span className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm">{listing.currencyCode} · the listing’s currency</span></Field>}
    <Field label="Minimum stay" hint="Nights." className="sm:col-span-3"><TextInput required name="minimumStay" type="number" min={1} max={365} step={1} defaultValue={value('minimumStay', asText(plan?.minimumStay ?? listing.minimumStay ?? 1))} /></Field>
    <Field label="Maximum stay" optional hint="Nights. Blank for no maximum." className="sm:col-span-3"><TextInput name="maximumStay" type="number" min={1} max={365} step={1} defaultValue={value('maximumStay', asText(plan?.maximumStay))} /></Field>
    <Field label="Advance notice" optional hint={`Hours. Blank uses the listing’s: ${listingNotice}.`} className="sm:col-span-3"><TextInput name="advanceNoticeHours" type="number" min={0} max={8760} step={1} defaultValue={value('advanceNoticeHours', asText(plan?.advanceNoticeHours))} /></Field>
    <Field label="Booking window" optional hint={`Days. Blank uses the listing’s: ${listingWindow}.`} className="sm:col-span-3"><TextInput name="bookingWindowDays" type="number" min={1} max={1095} step={1} defaultValue={value('bookingWindowDays', asText(plan?.bookingWindowDays))} /></Field>
    <Field label="Cancellation policy" hint={policies.length ? 'Required for an active plan.' : 'This host has no cancellation policy yet.'} className="sm:col-span-6">
      <Select name="cancellationPolicyId" defaultValue={value('cancellationPolicyId', plan?.cancellationPolicy?.id || '')}>
        <option value="">None</option>
        {policies.map((policy) => <option key={policy.id} value={policy.id}>{policy.name} · v{policy.version}</option>)}
      </Select>
    </Field>
    <Checkbox name="isDefault" defaultChecked={values ? values.isDefault === 'on' : Boolean(plan?.isDefault)} label="Default plan" hint="Among active plans, a default plan prices stays first." className="sm:col-span-6" />
    <div className="flex flex-wrap items-center gap-2 border-t pt-5 sm:col-span-6">
      <SubmitButton pendingLabel="Saving…">{plan ? 'Save rate plan' : 'Create rate plan'}</SubmitButton>
      <Button asChild variant="ghost"><Link href={cancelHref}>Cancel</Link></Button>
    </div>
  </GuardedForm>;
}
