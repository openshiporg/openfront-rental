'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { Field, Select, TextArea, TextInput } from '@/features/platform/operations/components/FormControls';
import { MoneyInput } from '@/features/platform/operations/components/MoneyInput';
import { Callout } from '@/features/platform/operations/components/PlatformUI';
import { GuardedForm } from '@/features/platform/operations/components/GuardedForm';
import { SubmitButton } from '@/features/platform/operations/components/SubmitButton';
import { createPlatformListingAction, type CatalogFormState } from '../actions/catalogWorkspaces';

const initialState: CatalogFormState = { ok: false, message: '' };

export function ListingCreateForm({ property, units, defaultUnitId, defaultCurrency }: {
  property: { id: string; name: string };
  units: Array<{ id: string; name: string; status: string; maxGuests?: number | null }>;
  defaultUnitId?: string;
  defaultCurrency?: string;
}) {
  const [state, formAction] = useActionState(createPlatformListingAction, initialState);
  // Re-mount with what was submitted so a rejected form keeps the operator's input.
  const values = state.values || {};
  const value = (key: string, fallback = '') => values[key] ?? fallback;
  // Money comes back as submitted minor units; blank stays blank, scaled by the submitted currency.
  const cents = (key: string, fallback: number) => { const raw = values[key]; return raw === undefined ? fallback : raw === '' ? null : Number(raw); };
  const currency = value('currencyCode', defaultCurrency || '').toUpperCase();
  return <GuardedForm draftKey={`listing-create-${property.id}`} key={JSON.stringify(values)} action={formAction} className="grid gap-5 p-5 sm:grid-cols-6">
    {state.message ? <Callout live tone="warning" title="The listing wasn’t created" className="sm:col-span-6">{state.message}</Callout> : null}
    <input type="hidden" name="propertyId" value={property.id} />
    <Field label="Unit" className="sm:col-span-6">
      <Select required name="accommodationUnitId" defaultValue={value('accommodationUnitId', defaultUnitId || '')}>
        <option value="" disabled>Choose a unit of {property.name}</option>
        {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}{unit.status !== 'available' ? ` (${unit.status})` : ''}</option>)}
      </Select>
    </Field>
    <Field label="Title" className="sm:col-span-3"><TextInput required name="title" minLength={2} maxLength={140} defaultValue={value('title')} placeholder="Harbor House" /></Field>
    <Field label="URL slug" hint="Lowercase letters, numbers, and dashes." className="sm:col-span-3"><TextInput required name="slug" maxLength={120} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={value('slug')} placeholder="harbor-house" /></Field>
    <Field label="Subtitle" optional className="sm:col-span-6"><TextInput name="subtitle" maxLength={200} defaultValue={value('subtitle')} /></Field>
    <Field label="Description" optional className="sm:col-span-6"><TextArea name="description" rows={6} maxLength={10000} defaultValue={value('description')} /></Field>
    <Field label="Currency" hint="Three letters, e.g. USD." className="sm:col-span-2"><TextInput required name="currencyCode" minLength={3} maxLength={3} defaultValue={value('currencyCode', defaultCurrency || '')} placeholder="USD" className="uppercase" /></Field>
    <Field label="Base nightly rate" hint="Zero if a rate plan will price it." className="sm:col-span-2"><MoneyInput required name="baseNightlyRateCents" currencyFrom="currencyCode" currencyCode={currency} defaultCents={cents('baseNightlyRateCents', 0)} suffix="per night" /></Field>
    <Field label="Security deposit" optional hint="Blank or zero for none." className="sm:col-span-2"><MoneyInput name="securityDepositCents" currencyFrom="currencyCode" currencyCode={currency} defaultCents={cents('securityDepositCents', 0)} /></Field>
    <Field label="Booking" className="sm:col-span-2"><Select required name="bookingMode" defaultValue={value('bookingMode', 'request')}><option value="request">Request to book</option><option value="instant">Instant book</option></Select></Field>
    <Field label="Minimum stay" hint="Nights." className="sm:col-span-2"><TextInput required name="minimumStay" type="number" min={1} max={365} step={1} defaultValue={value('minimumStay', '1')} /></Field>
    <Field label="Maximum stay" optional hint="Nights. Blank for no maximum." className="sm:col-span-2"><TextInput name="maximumStay" type="number" min={1} max={365} step={1} defaultValue={value('maximumStay')} /></Field>
    <Field label="Advance notice" hint="Hours before check-in." className="sm:col-span-3"><TextInput required name="advanceNoticeHours" type="number" min={0} max={8760} step={1} defaultValue={value('advanceNoticeHours', '24')} /></Field>
    <Field label="Booking window" optional hint="Days ahead a check-in can be booked. Blank for no limit." className="sm:col-span-3"><TextInput name="bookingWindowDays" type="number" min={1} max={1095} step={1} defaultValue={value('bookingWindowDays', '365')} /></Field>
    <div className="flex flex-wrap items-center gap-2 border-t pt-5 sm:col-span-6">
      <SubmitButton pendingLabel="Creating…">Create draft listing</SubmitButton>
      <Button asChild variant="ghost"><Link href="/dashboard/platform/listings">Cancel</Link></Button>
      <span className="text-xs text-muted-foreground sm:ml-auto">Starts as a draft. Add photos and amenities, then publish.</span>
    </div>
  </GuardedForm>;
}
