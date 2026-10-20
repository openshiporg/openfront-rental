'use client';

import { useActionState, useState } from 'react';

import { Field, Select, TextInput } from '@/features/platform/operations/components/FormControls';
import { Callout } from '@/features/platform/operations/components/PlatformUI';
import { StayRangeField } from '@/features/platform/operations/components/StayRangeField';
import { SubmitButton } from '@/features/platform/operations/components/SubmitButton';
import type { CalendarBlockState } from '../actions/calendar';

export type BlockableListing = { key: string; title: string; status: string; propertyName: string; today: string };

const initialState: CalendarBlockState = { ok: false, message: '', values: {}, attempt: 0 };

function BlockFields({ values, listings, fallbackMinDate }: { values: Record<string, string>; listings: BlockableListing[]; fallbackMinDate: string }) {
  const [listingKey, setListingKey] = useState(values.listingKey || '');
  // The first blockable night is today at the chosen listing's property.
  const minDate = listings.find((listing) => listing.key === listingKey)?.today || fallbackMinDate;
  return <>
    <Field label="Listing" className="sm:col-span-2"><Select required name="listingKey" value={listingKey} onChange={(event) => setListingKey(event.target.value)}>
      <option value="" disabled>Choose a listing</option>
      {listings.map((listing) => <option key={listing.key} value={listing.key}>{listing.title}{listing.status !== 'published' ? ` · ${listing.status}` : ''}</option>)}
    </Select></Field>
    <StayRangeField required className="sm:col-span-2" startName="startDate" endName="endDate" startLabel="First blocked night" endLabel="Open again" defaultStart={values.startDate} defaultEnd={values.endDate} minDate={minDate} hint="The “open again” night stays bookable." />
    <Field label="Reason"><Select name="reason" defaultValue={values.reason || 'owner_block'}><option value="owner_block">Owner hold</option><option value="property_maintenance">Maintenance</option><option value="preparation">Preparation</option></Select></Field>
    <Field label="Note" optional><TextInput name="notes" maxLength={2000} defaultValue={values.notes || ''} placeholder="Why these nights are held" /></Field>
  </>;
}

export function CalendarBlockForm({ action, listings, fallbackMinDate, truncated }: {
  action: (state: CalendarBlockState, formData: FormData) => Promise<CalendarBlockState>;
  listings: BlockableListing[];
  fallbackMinDate: string;
  truncated: boolean;
}) {
  const [state, formAction] = useActionState(action, initialState);
  return <form action={formAction} className="grid gap-4 sm:grid-cols-2">
    {state.message && !state.ok ? <Callout live tone="warning" title="That change wasn’t applied" className="sm:col-span-2">{state.message}</Callout> : null}
    <BlockFields key={state.attempt} values={state.ok ? {} : state.values} listings={listings} fallbackMinDate={fallbackMinDate} />
    <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
      <SubmitButton size="sm" pendingLabel="Blocking…">Block nights</SubmitButton>
      {state.ok ? <span role="status" className="text-xs text-muted-foreground">{state.message}</span> : null}
    </div>
    <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">Blocks are rejected if they overlap a stay. Reservation blocks can only be released by changing the reservation.{truncated ? ' Only the first 300 listings are offered here.' : ''}</p>
  </form>;
}
