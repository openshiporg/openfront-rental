import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Field, FormActions, Select, TextArea, TextInput } from '@/features/platform/operations/components/FormControls';
import { Callout, PageBody, PageHeader, PlatformPage, Section } from '@/features/platform/operations/components/PlatformUI';
import { SubmitButton } from '@/features/platform/operations/components/SubmitButton';
import { readSearchParams, type PlatformSearchParams } from '@/features/platform/operations/lib/listParams';
import { getPlatformCapabilities } from '@/features/platform/lib/capabilities';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { createReservationForGuestAction } from '../actions/reservations';

/** Staff book a stay for a guest who called, emailed or walked in. */
export async function NewReservationPage({ searchParams }: { searchParams: PlatformSearchParams }) {
  const { get, error } = await readSearchParams(searchParams);
  const [capabilities, response] = await Promise.all([
    getPlatformCapabilities(),
    keystoneClient<any>(`query BookableListings { listings(where: { status: { equals: "published" } }, orderBy: [{ title: asc }], take: 200) { id title property { name } } }`),
  ]);
  const listings = response.success ? response.data.listings || [] : [];
  return <PlatformPage section="Reservations" sectionHref="/dashboard/platform/reservations" current="New reservation">
    <PageHeader
      title="New reservation"
      back={{ href: '/dashboard/platform/reservations', label: 'Reservations' }}
    />
    <PageBody>
      {error ? <Callout live tone="warning" title="The reservation wasn’t created">{error}</Callout> : null}
      {capabilities.known && !capabilities.canManageReservations
        ? <Callout tone="neutral" title="Your role can’t create reservations">Ask an admin or front desk teammate to book this stay.</Callout>
        : !listings.length
          ? <Callout tone="neutral" title="No published homes">Publish a listing before booking a stay. <Link className="underline" href="/dashboard/platform/listings">Listings</Link></Callout>
          : <Section title="Stay and guest">
            <form action={createReservationForGuestAction} className="grid gap-4 sm:grid-cols-2">
              <Field label="Home" className="sm:col-span-2">
                <Select name="listingId" required defaultValue={get('listingId') || listings[0]?.id}>
                  {listings.map((listing: any) => <option key={listing.id} value={listing.id}>{listing.title}{listing.property?.name ? ` · ${listing.property.name}` : ''}</option>)}
                </Select>
              </Field>
              <Field label="Check-in"><TextInput required type="date" name="checkIn" defaultValue={get('checkIn')} /></Field>
              <Field label="Checkout"><TextInput required type="date" name="checkOut" defaultValue={get('checkOut')} /></Field>
              <div className="grid grid-cols-2 gap-4 sm:col-span-2 sm:grid-cols-4">
                <Field label="Adults"><TextInput required type="number" inputMode="numeric" name="adults" min={1} max={50} step={1} defaultValue={get('adults') || '2'} /></Field>
                <Field label="Children"><TextInput required type="number" inputMode="numeric" name="children" min={0} max={50} step={1} defaultValue={get('children') || '0'} /></Field>
                <Field label="Infants"><TextInput required type="number" inputMode="numeric" name="infants" min={0} max={50} step={1} defaultValue={get('infants') || '0'} /></Field>
                <Field label="Pets"><TextInput required type="number" inputMode="numeric" name="pets" min={0} max={50} step={1} defaultValue={get('pets') || '0'} /></Field>
              </div>
              <Field label="Guest name"><TextInput required name="guestName" autoComplete="off" maxLength={200} defaultValue={get('guestName')} /></Field>
              <Field label="Guest email"><TextInput required type="email" name="guestEmail" autoComplete="off" maxLength={320} defaultValue={get('guestEmail')} /></Field>
              <Field label="Guest phone" optional><TextInput type="tel" name="guestPhone" autoComplete="off" maxLength={64} defaultValue={get('guestPhone')} /></Field>
              <Field label="Arrival notes" optional className="sm:col-span-2"><TextArea name="guestNotes" maxLength={2000} defaultValue={get('guestNotes')} /></Field>
              <FormActions className="sm:col-span-2">
                <SubmitButton pendingLabel="Booking…">Create reservation</SubmitButton>
                <Button asChild variant="ghost"><Link href="/dashboard/platform/reservations">Cancel</Link></Button>
              </FormActions>
            </form>
          </Section>}
    </PageBody>
  </PlatformPage>;
}

export default NewReservationPage;
