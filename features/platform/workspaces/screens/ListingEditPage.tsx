import { Images, KeyRound, ListChecks, Type } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { getPlatformCapabilities } from '@/features/platform/lib/capabilities';
import { Field, Select, TextArea, TextInput } from '@/features/platform/operations/components/FormControls';
import { MoneyInput } from '@/features/platform/operations/components/MoneyInput';
import { Callout, EmptyRow, PageBody, PageHeader, PlatformPage, Section, StatusBadge } from '@/features/platform/operations/components/PlatformUI';
import { GuardedForm } from '@/features/platform/operations/components/GuardedForm';
import { ConfirmSubmitButton, SubmitButton } from '@/features/platform/operations/components/SubmitButton';
import { humanize } from '@/features/platform/operations/lib/operations';
import { platformDetailPath, rawRecordPath } from '@/features/platform/operations/lib/routes';
import {
  addListingMediaAction, allocateListingUnitAction, getListingEditWorkspace, removeListingMediaAction, setListingAmenitiesAction,
  updateListingContentAction, updateListingMediaAction, updateListingRulesAction,
} from '../actions/catalogWorkspaces';
import { AMENITY_PAGE_SIZE } from '../lib/amenityPaging';
import { listingEditPath, ratePlanCreatePath } from '../lib/routes';
import { CatalogPageState } from './CatalogAccess';

type EditProps = { params: Promise<{ id: string }>; searchParams?: Promise<{ error?: string; notice?: string; amenityPage?: string }> };

export async function ListingEditPage({ params, searchParams }: EditProps) {
  const { id } = await params;
  const query = (await searchParams) || {};
  const back = { href: platformDetailPath('listing', id), label: 'Listing' };
  const page = { section: 'Listings', sectionHref: '/platform/listings', current: 'Edit listing', title: 'Edit listing', back };
  const capabilities = await getPlatformCapabilities();
  if (!capabilities.known) return <CatalogPageState {...page} kind="unavailable" retryHref={listingEditPath(id)} description="Your permissions couldn’t be checked. Try again in a moment." />;
  if (!capabilities.canManageListings) return <CatalogPageState {...page} kind="denied" description="Listing management permission is required to edit listings." />;
  const amenityPage = Math.max(1, Math.floor(Number(query.amenityPage) || 1));
  const result = await getListingEditWorkspace(id, amenityPage);
  if (result.error) return <CatalogPageState {...page} kind="unavailable" retryHref={listingEditPath(id)} description="Try again in a moment." />;
  const listing = result.data?.listing;
  if (!listing) return <CatalogPageState {...page} kind="missing" description="This listing is unavailable or outside your host scope." />;
  if (listing.status === 'archived') return <CatalogPageState {...page} kind="denied" description="Archived listings are kept as history and can’t be edited." />;
  const shownAmenities = result.data.amenities || [];
  const shownAttached = shownAmenities.filter((amenity: any) => amenity.attached > 0).length;
  const unshownAttached = Math.max((listing.amenitiesCount || 0) - shownAttached, 0);
  const amenityGroups = (result.data.amenities || []).reduce((groups: Record<string, any[]>, amenity: any) => ({ ...groups, [amenity.category]: [...(groups[amenity.category] || []), amenity] }), {});
  const nextOrder = listing.media.length ? Math.max(...listing.media.map((media: any) => media.order || 0)) + 1 : 0;

  return <PlatformPage section="Listings" sectionHref="/platform/listings" current={listing.title}>
    <PageHeader
      back={back}
      title={`Edit ${listing.title}`}
      badges={<StatusBadge status={listing.status} />}
      description={`${listing.property?.name || 'No property'} · ${listing.accommodationUnit?.name || 'No unit'}`}
      actions={<Button asChild size="sm" variant="outline"><Link href={rawRecordPath('listings', id)}>Listing record</Link></Button>}
    />
    <PageBody>
      {query.error ? <Callout live tone="warning" title="That change wasn’t saved">{query.error}</Callout> : null}
      {query.notice ? <Callout live tone="success" title="Saved">{query.notice}</Callout> : null}
      {listing.status === 'published' ? <Callout tone="info" title="This listing is live">Saved changes show to guests straight away.</Callout> : null}
      <div className="grid max-w-5xl gap-6">
        <Section id="listing-content" title="Guest-facing copy" icon={Type}>
          <GuardedForm draftKey={`listing-${id}-content`} restoreDraft={Boolean(query.error)} action={updateListingContentAction} className="grid gap-4">
            <input type="hidden" name="listingId" value={listing.id} />
            <Field label="Title"><TextInput required name="title" minLength={2} maxLength={140} defaultValue={listing.title} /></Field>
            <Field label="Subtitle" optional><TextInput name="subtitle" maxLength={200} defaultValue={listing.subtitle || ''} /></Field>
            <Field label="Description" optional><TextArea name="description" rows={8} maxLength={10000} defaultValue={listing.description || ''} /></Field>
            <Field label="URL slug" hint="Lowercase letters, numbers and dashes. Changing it changes the listing’s public address."><TextInput required name="slug" maxLength={120} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={listing.slug} className="font-mono" /></Field>
            <div><SubmitButton size="sm" pendingLabel="Saving…">Save copy</SubmitButton></div>
          </GuardedForm>
        </Section>

        <Section id="listing-rules" title="Pricing and booking rules" icon={KeyRound} action={capabilities.canManagePricing ? <Button asChild size="sm" variant="ghost"><Link href={ratePlanCreatePath({ listingId: listing.id })}>New rate plan</Link></Button> : undefined}>
          <GuardedForm draftKey={`listing-${id}-rules`} restoreDraft={Boolean(query.error)} action={updateListingRulesAction} className="grid gap-4 sm:grid-cols-6">
            <input type="hidden" name="listingId" value={listing.id} />
            <Field label="Base nightly rate" hint="An active rate plan’s rate takes precedence." className="sm:col-span-3"><MoneyInput required name="baseNightlyRateCents" currencyCode={listing.currencyCode} defaultCents={listing.baseNightlyRateCents ?? 0} suffix="per night" /></Field>
            <Field label="Security deposit" optional hint="Blank or zero for none." className="sm:col-span-3"><MoneyInput name="securityDepositCents" currencyCode={listing.currencyCode} defaultCents={listing.securityDepositCents ?? 0} /></Field>
            <Field label="Booking" className="sm:col-span-2"><Select required name="bookingMode" defaultValue={listing.bookingMode || 'request'}><option value="request">Request to book</option><option value="instant">Instant book</option></Select></Field>
            <Field label="Minimum stay" hint="Nights." className="sm:col-span-2"><TextInput required name="minimumStay" type="number" min={1} max={365} step={1} defaultValue={listing.minimumStay ?? ''} /></Field>
            <Field label="Maximum stay" optional hint="Nights. Blank for no maximum." className="sm:col-span-2"><TextInput name="maximumStay" type="number" min={1} max={365} step={1} defaultValue={listing.maximumStay ?? ''} /></Field>
            <Field label="Advance notice" hint="Hours before check-in." className="sm:col-span-3"><TextInput required name="advanceNoticeHours" type="number" min={0} max={8760} step={1} defaultValue={listing.advanceNoticeHours ?? ''} /></Field>
            <Field label="Booking window" optional hint="Days ahead a check-in can be booked. Blank for no limit." className="sm:col-span-3"><TextInput name="bookingWindowDays" type="number" min={1} max={1095} step={1} defaultValue={listing.bookingWindowDays ?? ''} /></Field>
            <p className="text-xs leading-5 text-muted-foreground sm:col-span-6">Currency: {listing.currencyCode}. An active rate plan’s stay length, notice and window take precedence where set.</p>
            <div className="sm:col-span-6"><SubmitButton size="sm" pendingLabel="Saving…">Save rules</SubmitButton></div>
          </GuardedForm>
        </Section>

        <Section id="listing-unit" title="Unit" icon={KeyRound} description="The physical space this listing sells. Moving it is refused while it has upcoming stays or holds on its current unit.">
          {(result.data.unitOptions || []).length ? <GuardedForm draftKey={`listing-${id}-unit`} action={allocateListingUnitAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="listingId" value={listing.id} />
            <Field label="Accommodation unit" className="min-w-64 flex-1"><Select required name="accommodationUnitId" defaultValue={listing.accommodationUnit?.id || ''}>
              <option value="" disabled>Choose a unit</option>
              {(result.data.unitOptions || []).map((unit: any) => <option key={unit.id} value={unit.id}>{unit.property?.name ? `${unit.property.name} · ` : ''}{unit.name}{unit.status !== 'available' ? ` (${unit.status})` : ''}</option>)}
            </Select></Field>
            <SubmitButton size="sm" variant="outline" pendingLabel="Moving…">Move listing</SubmitButton>
            {(result.data.unitOptionsCount || 0) > (result.data.unitOptions || []).length ? <p className="w-full text-xs text-muted-foreground">Showing {(result.data.unitOptions || []).length} of {result.data.unitOptionsCount} units, by name.</p> : null}
          </GuardedForm> : <EmptyRow>No other units are available for this host.</EmptyRow>}
        </Section>

        <Section id="listing-amenities" title="Amenities" icon={ListChecks} count={listing.amenitiesCount || 0}>
          {result.data.amenities.length ? <GuardedForm draftKey={`listing-${id}-amenities`} action={setListingAmenitiesAction} className="space-y-5">
            <input type="hidden" name="listingId" value={listing.id} />
            {Object.entries(amenityGroups).map(([category, amenities]) => <fieldset key={category} className="min-w-0">
              <legend className="text-xs font-medium text-muted-foreground">{humanize(category)}</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(amenities as any[]).map((amenity) => <label key={amenity.id} className="flex min-w-0 items-center gap-2.5 text-sm">
                  <input type="hidden" name="shownAmenityId" value={amenity.id} />
                  <input type="checkbox" name="amenityId" value={amenity.id} defaultChecked={amenity.attached > 0} className="size-4 shrink-0 rounded border-input accent-primary" />
                  <span className="min-w-0 truncate">{amenity.name}</span>
                </label>)}
              </div>
            </fieldset>)}
            {result.data.amenitiesCount > shownAmenities.length ? <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Amenities {(amenityPage - 1) * AMENITY_PAGE_SIZE + 1}–{(amenityPage - 1) * AMENITY_PAGE_SIZE + shownAmenities.length} of {result.data.amenitiesCount}{unshownAttached ? ` · ${unshownAttached} attached on other pages, kept as they are` : ''}. Save each page’s changes before moving on.</span>
              {amenityPage > 1 ? <Link className="underline-offset-4 hover:underline" href={`${listingEditPath(id)}?amenityPage=${amenityPage - 1}#listing-amenities`}>Previous</Link> : null}
              {amenityPage * AMENITY_PAGE_SIZE < result.data.amenitiesCount ? <Link className="underline-offset-4 hover:underline" href={`${listingEditPath(id)}?amenityPage=${amenityPage + 1}#listing-amenities`}>Next</Link> : null}
            </div> : null}
            <SubmitButton size="sm" pendingLabel="Saving…">Save amenities</SubmitButton>
          </GuardedForm> : <EmptyRow>No amenities are defined yet.</EmptyRow>}
        </Section>

        <Section id="listing-media" title="Photos" icon={Images} count={listing.mediaCount || 0} description={listing.mediaCount > listing.media.length ? `First ${listing.media.length} of ${listing.mediaCount} by order.` : 'Shown to guests in order, lowest first.'} flush>
          {listing.media.length ? <ul className="divide-y">
            {listing.media.map((media: any) => {
              const src = media.image?.url || media.imagePath;
              return <li key={media.id} className="grid gap-4 px-4 py-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
                {/* Operator-entered addresses can be on any host, so they're shown as-is rather than optimized. */}
                {src ? <Image src={src} alt={media.altText || ''} width={256} height={192} unoptimized className="aspect-[4/3] w-full rounded-md border object-cover sm:w-32" /> : <span className="grid aspect-[4/3] w-full place-items-center rounded-md border text-xs text-muted-foreground sm:w-32">No image</span>}
                <div className="min-w-0 space-y-3">
                  <GuardedForm draftKey={`listing-${id}-media-${media.id}`} restoreDraft={Boolean(query.error)} action={updateListingMediaAction} className="grid gap-3 sm:grid-cols-6">
                    <input type="hidden" name="listingId" value={listing.id} />
                    <input type="hidden" name="mediaId" value={media.id} />
                    <Field label="Alt text" className="sm:col-span-4"><TextInput required name="altText" minLength={2} maxLength={200} defaultValue={media.altText || ''} /></Field>
                    <Field label="Order" className="sm:col-span-2"><TextInput required name="order" type="number" min={0} max={1000} step={1} defaultValue={media.order ?? 0} /></Field>
                    <Field label="Caption" optional className="sm:col-span-6"><TextInput name="caption" maxLength={300} defaultValue={media.caption || ''} /></Field>
                    <div className="sm:col-span-6"><SubmitButton size="sm" variant="outline" pendingLabel="Saving…">Save photo</SubmitButton></div>
                  </GuardedForm>
                  <form action={removeListingMediaAction}>
                    <input type="hidden" name="listingId" value={listing.id} />
                    <input type="hidden" name="mediaId" value={media.id} />
                    <ConfirmSubmitButton title="Remove this photo?" description="It’s removed from the listing. Past booking confirmations keep what guests saw." confirmLabel="Remove photo" pendingLabel="Removing…">Remove</ConfirmSubmitButton>
                  </form>
                </div>
              </li>;
            })}
          </ul> : <EmptyRow>No photos yet.</EmptyRow>}
          <div className="border-t px-4 py-4">
            <GuardedForm draftKey={`listing-${id}-media-new`} restoreDraft={Boolean(query.error)} action={addListingMediaAction} className="grid gap-3 sm:grid-cols-6">
              <input type="hidden" name="listingId" value={listing.id} />
              <Field label="Photo address" hint="An https:// image URL or a site path. Upload files in the media records." className="sm:col-span-6"><TextInput required name="imagePath" maxLength={2000} placeholder="https://images.example.com/harbor-house/living-room.jpg" /></Field>
              <Field label="Alt text" className="sm:col-span-4"><TextInput required name="altText" minLength={2} maxLength={200} placeholder="Living room with a fireplace and two sofas" /></Field>
              <Field label="Order" className="sm:col-span-2"><TextInput required name="order" type="number" min={0} max={1000} step={1} defaultValue={nextOrder} /></Field>
              <Field label="Caption" optional className="sm:col-span-6"><TextInput name="caption" maxLength={300} /></Field>
              <div className="flex flex-wrap items-center gap-2 sm:col-span-6"><SubmitButton size="sm" pendingLabel="Adding…">Add photo</SubmitButton><Button asChild size="sm" variant="ghost"><Link href={rawRecordPath('listing-medias')}>Media records</Link></Button></div>
            </GuardedForm>
          </div>
        </Section>
      </div>
    </PageBody>
  </PlatformPage>;
}
export default ListingEditPage;
