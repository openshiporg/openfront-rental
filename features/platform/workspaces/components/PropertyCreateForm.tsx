'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createPlatformPropertyAction, type PropertyCreateActionState } from '../actions/detailWorkspaces';

const initialState: PropertyCreateActionState = { ok: false, message: '' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? 'Creating…' : 'Create in onboarding'}</Button>;
}

export function PropertyCreateForm() {
  const [state, formAction] = useActionState(createPlatformPropertyAction, initialState);
  return <form action={formAction} className="grid gap-4 p-4 sm:grid-cols-2">
    {state.message ? <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 sm:col-span-2 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">{state.message}</div> : null}
    <label className="grid gap-1.5 text-xs font-medium sm:col-span-2">Property name<Input required name="name" minLength={2} maxLength={120} placeholder="Harbor House" /></label>
    <label className="grid gap-1.5 text-xs font-medium">Internal code<Input required name="internalCode" maxLength={80} placeholder="HBR-001" /></label>
    <label className="grid gap-1.5 text-xs font-medium">Property type<select required name="propertyType" defaultValue="house" className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="house">House</option><option value="apartment_building">Apartment building</option><option value="cabin">Cabin</option><option value="villa">Villa</option><option value="cottage">Cottage</option><option value="chalet">Chalet</option><option value="condo">Condo</option><option value="townhouse">Townhouse</option><option value="unique_stay">Unique stay</option></select></label>
    <label className="grid gap-1.5 text-xs font-medium sm:col-span-2">IANA timezone<Input required name="timezone" defaultValue="America/New_York" placeholder="America/New_York" pattern="[A-Za-z_]+(?:/[A-Za-z_+-]+)+" title="Use an IANA timezone such as America/New_York." /><span className="font-normal text-muted-foreground">Accommodation dates, access windows, and turns use this timezone.</span></label>
    <div className="flex flex-wrap gap-2 border-t border-border pt-4 sm:col-span-2"><SubmitButton /><Button asChild variant="outline"><Link href="/dashboard/platform/properties">Cancel</Link></Button></div>
  </form>;
}
