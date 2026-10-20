'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { Field, Select, TextInput, TimezoneInput } from '@/features/platform/operations/components/FormControls';
import { Callout } from '@/features/platform/operations/components/PlatformUI';
import { GuardedForm } from '@/features/platform/operations/components/GuardedForm';
import { SubmitButton } from '@/features/platform/operations/components/SubmitButton';
import { createPlatformPropertyAction, type PropertyCreateActionState } from '../actions/detailWorkspaces';

const initialState: PropertyCreateActionState = { ok: false, message: '' };

const propertyTypes = [
  ['house', 'House'], ['apartment_building', 'Apartment building'], ['cabin', 'Cabin'], ['villa', 'Villa'], ['cottage', 'Cottage'],
  ['chalet', 'Chalet'], ['condo', 'Condo'], ['townhouse', 'Townhouse'], ['unique_stay', 'Unique stay'],
] as const;

export function PropertyCreateForm({ hosts, hostTotal }: { hosts: Array<{ id: string; name: string }>; hostTotal: number }) {
  const [state, formAction] = useActionState(createPlatformPropertyAction, initialState);
  const onlyHost = hosts.length === 1 ? hosts[0] : null;
  // A rejected form re-mounts with what was entered.
  const values = state.values || {};
  return <GuardedForm draftKey={'property-create'} key={JSON.stringify(values)} action={formAction} className="grid gap-5 p-5 sm:grid-cols-2">
    {state.message ? <Callout live tone="warning" title="The property wasn’t created" className="sm:col-span-2">{state.message}</Callout> : null}
    {onlyHost
      ? <Field label="Host organization" className="sm:col-span-2"><input type="hidden" name="hostOrganizationId" value={onlyHost.id} /><span className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm">{onlyHost.name}</span></Field>
      : <Field label="Host organization" hint={hostTotal > hosts.length ? `Showing ${hosts.length} of ${hostTotal}, by name.` : undefined} className="sm:col-span-2">
          <Select required name="hostOrganizationId" defaultValue={values.hostOrganizationId || ''}><option value="" disabled>Choose a host organization</option>{hosts.map((host) => <option key={host.id} value={host.id}>{host.name}</option>)}</Select>
        </Field>}
    <Field label="Property name" hint="The name your team uses. Guests see listing titles, not this." className="sm:col-span-2">
      <TextInput required name="name" minLength={2} maxLength={120} placeholder="Harbor House" autoFocus defaultValue={values.name || ''} />
    </Field>
    <Field label="Internal code" hint="Must be unique across your portfolio.">
      <TextInput required name="internalCode" maxLength={80} placeholder="HBR-001" className="font-mono" defaultValue={values.internalCode || ''} />
    </Field>
    <Field label="Property type">
      <Select required name="propertyType" defaultValue={values.propertyType || 'house'}>{propertyTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
    </Field>
    <Field label="Stay timezone" hint="Start typing a city or region. Check-in dates, access windows, and turnovers use this timezone." className="sm:col-span-2">
      <TimezoneInput required name="timezone" defaultValue={values.timezone || 'America/New_York'} placeholder="America/New_York" />
    </Field>
    <div className="flex flex-wrap items-center gap-2 border-t pt-5 sm:col-span-2">
      <SubmitButton pendingLabel="Creating…">Create property</SubmitButton>
      <Button asChild variant="ghost"><Link href="/dashboard/platform/properties">Cancel</Link></Button>
      <span className="text-xs text-muted-foreground sm:ml-auto">Starts in onboarding — it can’t take bookings yet.</span>
    </div>
  </GuardedForm>;
}
