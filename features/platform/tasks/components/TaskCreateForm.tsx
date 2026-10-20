'use client';

import { useActionState, useState } from 'react';

import { Field, Select, TextArea, TextInput } from '@/features/platform/operations/components/FormControls';
import { Callout } from '@/features/platform/operations/components/PlatformUI';
import { SubmitButton } from '@/features/platform/operations/components/SubmitButton';
import type { TaskCreateState } from '../actions/tasks';

export type TaskFormProperty = { id: string; name: string; status: string; timezone: string; hostOrganizationId: string; listings: Array<{ id: string; title: string; status: string }> };
export type TaskFormMember = { userId: string; name: string; hostOrganizationId: string };
export type TaskFormStay = { id: string; label: string; listingId: string; propertyId: string };

type Props = {
  action: (state: TaskCreateState, formData: FormData) => Promise<TaskCreateState>;
  properties: TaskFormProperty[];
  members: TaskFormMember[];
  stays: TaskFormStay[];
  staysTruncated: boolean;
  taskTypes: Array<[string, string]>;
};

const initialState: TaskCreateState = { ok: false, message: '', values: {}, attempt: 0 };

const statusSuffix: Record<string, string> = { onboarding: ' · onboarding', paused: ' · paused' };

function TaskCreateFields({ values, properties, members, stays, staysTruncated, taskTypes }: Omit<Props, 'action'> & { values: Record<string, string> }) {
  const [propertyId, setPropertyId] = useState(values.propertyId || '');
  const [listingId, setListingId] = useState(values.listingId || '');
  const [reservationId, setReservationId] = useState(values.reservationId || '');
  const [assigneeId, setAssigneeId] = useState(values.assigneeId || '');
  const property = properties.find((entry) => entry.id === propertyId);
  const propertyStays = stays.filter((stay) => stay.propertyId === propertyId && (!listingId || stay.listingId === listingId));
  const hostMembers = members.filter((member) => member.hostOrganizationId === property?.hostOrganizationId);

  function chooseProperty(next: string) {
    const nextProperty = properties.find((entry) => entry.id === next);
    setPropertyId(next);
    if (!nextProperty?.listings.some((listing) => listing.id === listingId)) setListingId('');
    if (!stays.some((stay) => stay.id === reservationId && stay.propertyId === next)) setReservationId('');
    if (!members.some((member) => member.userId === assigneeId && member.hostOrganizationId === nextProperty?.hostOrganizationId)) setAssigneeId('');
  }

  function chooseListing(next: string) {
    setListingId(next);
    if (next && !stays.some((stay) => stay.id === reservationId && stay.listingId === next)) setReservationId('');
  }

  function chooseStay(next: string) {
    setReservationId(next);
    const stay = stays.find((entry) => entry.id === next);
    if (stay) setListingId(stay.listingId);
  }

  return <>
    <Field label="What needs doing" className="sm:col-span-2"><TextInput required name="title" maxLength={160} defaultValue={values.title || ''} placeholder="Deep clean after checkout" /></Field>
    <Field label="Type"><Select name="taskType" defaultValue={values.taskType || 'turnover_cleaning'}>{taskTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
    <Field label="Priority"><Select name="priority" defaultValue={values.priority || 'normal'}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></Select></Field>
    <Field label="Property"><Select required name="propertyId" value={propertyId} onChange={(event) => chooseProperty(event.target.value)}>
      <option value="" disabled>Choose a property</option>
      {properties.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}{statusSuffix[entry.status] || ''}</option>)}
    </Select></Field>
    <Field label="Listing" optional><Select name="listingId" value={listingId} disabled={!property} onChange={(event) => chooseListing(event.target.value)}>
      <option value="">Whole property</option>
      {(property?.listings || []).map((listing) => <option key={listing.id} value={listing.id}>{listing.title}{listing.status !== 'published' ? ` · ${listing.status}` : ''}</option>)}
    </Select></Field>
    <Field label="Stay" optional hint={staysTruncated ? 'Only the next 300 open or recent stays are listed.' : undefined}><Select name="reservationId" value={reservationId} disabled={!property} onChange={(event) => chooseStay(event.target.value)}>
      <option value="">{property && !propertyStays.length ? 'No open or recent stays' : 'Property work, no stay'}</option>
      {propertyStays.map((stay) => <option key={stay.id} value={stay.id}>{stay.label}</option>)}
    </Select></Field>
    <Field label="Assignee" optional><Select name="assigneeId" value={assigneeId} disabled={!property} onChange={(event) => setAssigneeId(event.target.value)}>
      <option value="">Unassigned</option>
      {hostMembers.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}
    </Select></Field>
    <Field label="Due date" optional><TextInput name="dueDate" type="date" defaultValue={values.dueDate || ''} /></Field>
    <Field label="Due time" optional hint={property ? `${property.timezone.replaceAll('_', ' ')} time` : 'Property local time'}><TextInput name="dueTime" type="time" defaultValue={values.dueTime || ''} /></Field>
    <input type="hidden" name="dueTimeZone" value={property?.timezone || ''} />
    <Field label="Notes" optional className="sm:col-span-2 lg:col-span-4"><TextArea name="notes" maxLength={4000} rows={2} defaultValue={values.notes || ''} placeholder="Restock coffee, check smoke alarm, photograph damage" /></Field>
  </>;
}

export function TaskCreateForm({ action, ...props }: Props) {
  const [state, formAction] = useActionState(action, initialState);
  return <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {state.message && !state.ok ? <Callout live tone="warning" title="The task wasn’t created" className="sm:col-span-2 lg:col-span-4">{state.message}</Callout> : null}
    <TaskCreateFields key={state.attempt} values={state.ok ? {} : state.values} {...props} />
    <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
      <SubmitButton size="sm" pendingLabel="Creating…">Create task</SubmitButton>
      {state.ok ? <span role="status" className="text-xs text-muted-foreground">{state.message}</span> : null}
    </div>
  </form>;
}
