'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { MAX_STORED_CENTS, MAX_SUPPORTED_STAY_NIGHTS } from '@/features/keystone/utils/stayPricing';
import { platformDetailPath } from '@/features/platform/operations/lib/routes';
import { AMENITY_PAGE_SIZE } from '../lib/amenityPaging';

const unavailable = 'This page’s data is temporarily unavailable.';

async function catalogQuery(query: string, variables: Record<string, unknown> = {}) {
  const response = await keystoneClient<any>(query, variables);
  return response.success ? { data: response.data, error: null } : { data: null, error: unavailable };
}

/* ───────────────────────── reads ───────────────────────── */

export async function getListingCreateContext(propertyId?: string | null) {
  if (!propertyId) {
    return catalogQuery(`query ListingCreateProperties {
      properties(where: { status: { not: { equals: "archived" } } }, orderBy: [{ name: asc }, { id: asc }], take: 200) { id name unitsCount(where: { status: { not: { equals: "archived" } } }) }
      propertiesCount(where: { status: { not: { equals: "archived" } } })
    }`);
  }
  return catalogQuery(`query ListingCreateProperty($id: ID!) {
    property(where: { id: $id }) {
      id name status
      units(where: { status: { not: { equals: "archived" } } }, orderBy: [{ name: asc }, { id: asc }], take: 100) { id name status maxGuests }
      firstListing: listings(orderBy: [{ createdAt: asc }, { id: asc }], take: 1) { id currencyCode }
    }
  }`, { id: propertyId });
}

export async function getListingEditWorkspace(id: string, amenityPage = 1) {
  const page = Number.isSafeInteger(amenityPage) && amenityPage > 0 ? amenityPage : 1;
  return catalogQuery(`query ListingEditWorkspace($id: ID!, $amenitySkip: Int!, $amenityTake: Int!) {
    listing(where: { id: $id }) {
      id title slug subtitle description status bookingMode currencyCode baseNightlyRateCents securityDepositCents minimumStay maximumStay advanceNoticeHours bookingWindowDays
      property { id name status }
      accommodationUnit { id name status }
      mediaCount
      media(orderBy: [{ order: asc }, { id: asc }], take: 50) { id imagePath image { url } altText caption order }
      amenitiesCount
    }
    amenities(orderBy: [{ category: asc }, { name: asc }, { id: asc }], skip: $amenitySkip, take: $amenityTake) { id name category attached: listingsCount(where: { id: { equals: $id } }) }
    amenitiesCount
    unitOptions: accommodationUnits(where: { hostOrganization: { listings: { some: { id: { equals: $id } } } }, status: { not: { equals: "archived" } }, property: { status: { not: { equals: "archived" } } } }, orderBy: [{ name: asc }, { id: asc }], take: 100) { id name status property { id name } }
    unitOptionsCount: accommodationUnitsCount(where: { hostOrganization: { listings: { some: { id: { equals: $id } } } }, status: { not: { equals: "archived" } }, property: { status: { not: { equals: "archived" } } } })
  }`, { id, amenitySkip: (page - 1) * AMENITY_PAGE_SIZE, amenityTake: AMENITY_PAGE_SIZE });
}

const policySelection = 'id name version summary fullTerms';

export async function getRatePlanCreateContext(listingId?: string | null) {
  if (!listingId) {
    return catalogQuery(`query RatePlanCreateListings {
      listings(where: { status: { not: { equals: "archived" } } }, orderBy: [{ title: asc }, { id: asc }], take: 200) { id title currencyCode property { name } }
      listingsCount(where: { status: { not: { equals: "archived" } } })
    }`);
  }
  return catalogQuery(`query RatePlanCreateListing($id: ID!, $policyWhere: CancellationPolicyWhereInput!) {
    listing(where: { id: $id }) { id title status currencyCode baseNightlyRateCents minimumStay maximumStay advanceNoticeHours bookingWindowDays property { id name } }
    cancellationPolicies(where: $policyWhere, orderBy: [{ name: asc }, { id: asc }], take: 100) { ${policySelection} }
  }`, { id: listingId, policyWhere: { hostOrganization: { listings: { some: { id: { equals: listingId } } } } } });
}

export async function getRatePlanEditWorkspace(id: string) {
  return catalogQuery(`query RatePlanEditWorkspace($id: ID!, $policyWhere: CancellationPolicyWhereInput!) {
    ratePlan(where: { id: $id }) {
      id name description status currencyCode baseNightlyRateCents minimumStay maximumStay advanceNoticeHours bookingWindowDays isDefault
      cancellationPolicy { id name }
      listing { id title status currencyCode minimumStay maximumStay advanceNoticeHours bookingWindowDays property { id name } }
    }
    cancellationPolicies(where: $policyWhere, orderBy: [{ name: asc }, { id: asc }], take: 100) { ${policySelection} }
  }`, { id, policyWhere: { hostOrganization: { listings: { some: { ratePlans: { some: { id: { equals: id } } } } } } } });
}

/* ───────────────────────── input ───────────────────────── */

export type CatalogFormState = { ok: boolean; message: string; values?: Record<string, string> };

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

/** Whole number in range; blank is `null` only when `optional`. */
function wholeNumber(formData: FormData, key: string, min: number, max: number, optional = false): number | null | undefined {
  const raw = text(formData, key);
  if (!raw) return optional ? null : undefined;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= min && value <= max ? value : undefined;
}

function submitted(formData: FormData) {
  return Object.fromEntries([...formData.entries()].filter(([key, value]) => typeof value === 'string' && !key.startsWith('$')).map(([key, value]) => [key, String(value)]));
}

const safeId = /^[A-Za-z0-9_-]+$/;

type BookingRules = { minimumStay: number; maximumStay: number | null; advanceNoticeHours: number | null; bookingWindowDays: number | null; baseNightlyRateCents: number };

/** Stay-rule fields shared by listings and rate plans; `inherit` lets notice and window stay blank. */
function bookingRules(formData: FormData, inherit: boolean): BookingRules | string {
  const baseNightlyRateCents = wholeNumber(formData, 'baseNightlyRateCents', 0, MAX_STORED_CENTS);
  const minimumStay = wholeNumber(formData, 'minimumStay', 1, MAX_SUPPORTED_STAY_NIGHTS);
  const maximumStay = wholeNumber(formData, 'maximumStay', 1, MAX_SUPPORTED_STAY_NIGHTS, true);
  const advanceNoticeHours = wholeNumber(formData, 'advanceNoticeHours', 0, 8760, inherit);
  const bookingWindowDays = wholeNumber(formData, 'bookingWindowDays', 1, 1095, true);
  if (baseNightlyRateCents === undefined || baseNightlyRateCents === null) return 'Enter a nightly rate of zero or more.';
  if (minimumStay === undefined || minimumStay === null) return `Minimum stay must be 1–${MAX_SUPPORTED_STAY_NIGHTS} nights.`;
  if (maximumStay === undefined || (maximumStay !== null && maximumStay < minimumStay)) return `Maximum stay must be blank or between the minimum and ${MAX_SUPPORTED_STAY_NIGHTS} nights.`;
  if (advanceNoticeHours === undefined) return inherit ? 'Advance notice must be blank or 0–8760 hours.' : 'Advance notice must be 0–8760 hours.';
  if (bookingWindowDays === undefined) return 'Booking window must be blank or 1–1095 days.';
  return { baseNightlyRateCents, minimumStay, maximumStay, advanceNoticeHours, bookingWindowDays };
}

/* ───────────────────────── listings ───────────────────────── */

export async function createPlatformListingAction(_previous: CatalogFormState, formData: FormData): Promise<CatalogFormState> {
  const values = submitted(formData);
  const fail = (message: string): CatalogFormState => ({ ok: false, message, values });
  const propertyId = text(formData, 'propertyId'); const accommodationUnitId = text(formData, 'accommodationUnitId');
  const title = text(formData, 'title'); const slug = text(formData, 'slug').toLowerCase(); const subtitle = text(formData, 'subtitle'); const description = text(formData, 'description');
  const currencyCode = text(formData, 'currencyCode').toUpperCase(); const bookingMode = text(formData, 'bookingMode');
  // Optional: blank means no deposit, stored as an explicit zero (the model's default).
  const securityDepositCents = wholeNumber(formData, 'securityDepositCents', 0, MAX_STORED_CENTS, true) ?? 0;
  if (!safeId.test(propertyId) || !safeId.test(accommodationUnitId)) return fail('Choose a unit of this property.');
  if (title.length < 2 || title.length > 140) return fail('Title must be 2–140 characters.');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) return fail('URL slug must be lowercase letters, numbers and dashes.');
  if (subtitle.length > 200 || description.length > 10000) return fail('Subtitle can be up to 200 characters and description up to 10,000.');
  if (!/^[A-Z]{3}$/.test(currencyCode)) return fail('Currency must be a three-letter code such as USD.');
  if (!['request', 'instant'].includes(bookingMode)) return fail('Choose how guests book.');
  if (securityDepositCents === undefined) return fail('Security deposit must be blank or zero or more.');
  const rules = bookingRules(formData, false);
  if (typeof rules === 'string') return fail(rules);

  // The unit must be one this operator can read, on the chosen property, and neither may be archived.
  const authority = await keystoneClient<any>(`query ListingCreateAuthority($id: ID!) { accommodationUnit(where: { id: $id }) { id status property { id status } } }`, { id: accommodationUnitId });
  if (!authority.success) return fail('The unit couldn’t be checked. Try again.');
  const unit = authority.data.accommodationUnit;
  if (!unit?.id || unit.property?.id !== propertyId) return fail('Choose a unit of this property.');
  if (unit.status === 'archived' || unit.property.status === 'archived') return fail('Archived properties and units can’t get new listings.');
  const response = await keystoneClient<any>(`mutation CreatePlatformListing($data: ListingCreateInput!) { createListing(data: $data) { id } }`, { data: {
    property: { connect: { id: propertyId } }, accommodationUnit: { connect: { id: accommodationUnitId } },
    title, slug, subtitle, description, status: 'draft', bookingMode, currencyCode, securityDepositCents, ...rules,
  } });
  const listingId = response.success ? response.data.createListing?.id : null;
  if (!listingId) return fail('The listing wasn’t created. The URL slug may already be in use; try another.');
  revalidatePath('/dashboard/platform/listings'); revalidatePath(platformDetailPath('property', propertyId));
  redirect(`${platformDetailPath('listing', listingId)}?notice=${encodeURIComponent('Draft listing created.')}`);
}

function listingEditBase(id: string) {
  return `${platformDetailPath('listing', id)}/edit`;
}

function backToListingEdit(id: string, section: string, outcome: { error?: string; notice?: string }): never {
  const params = new URLSearchParams();
  if (outcome.error) params.set('error', outcome.error);
  if (outcome.notice) params.set('notice', outcome.notice);
  redirect(`${listingEditBase(id)}?${params.toString()}#listing-${section}`);
}

/** The listing must be readable by this operator and not archived; the update itself is still access-checked. */
async function editableListing(id: string, section: string) {
  if (!safeId.test(id)) redirect('/dashboard/platform/listings');
  const response = await keystoneClient<any>(`query ListingEditAuthority($id: ID!) { listing(where: { id: $id }) { id status } }`, { id });
  if (!response.success) backToListingEdit(id, section, { error: 'The listing couldn’t be checked. Try again.' });
  const listing = response.data.listing;
  if (!listing?.id) backToListingEdit(id, section, { error: 'This listing is unavailable or outside your host scope.' });
  if (listing.status === 'archived') backToListingEdit(id, section, { error: 'Archived listings can’t be edited.' });
  return listing;
}

async function saveListing(id: string, section: string, data: Record<string, unknown>, notice: string, failure = 'The listing wasn’t saved. Check the fields and try again.') {
  const response = await keystoneClient<any>(`mutation UpdatePlatformListing($id: ID!, $data: ListingUpdateInput!) { updateListing(where: { id: $id }, data: $data) { id } }`, { id, data });
  revalidatePath(listingEditBase(id)); revalidatePath(platformDetailPath('listing', id)); revalidatePath('/dashboard/platform/listings');
  if (!response.success || !response.data.updateListing?.id) backToListingEdit(id, section, { error: failure });
  backToListingEdit(id, section, { notice });
}

export async function updateListingContentAction(formData: FormData) {
  const id = text(formData, 'listingId');
  const title = text(formData, 'title'); const subtitle = text(formData, 'subtitle'); const description = text(formData, 'description');
  const slug = text(formData, 'slug').toLowerCase();
  if (title.length < 2 || title.length > 140 || subtitle.length > 200 || description.length > 10000) backToListingEdit(id, 'content', { error: 'Title must be 2–140 characters, subtitle up to 200 and description up to 10,000.' });
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) backToListingEdit(id, 'content', { error: 'URL slug must be lowercase letters, numbers and dashes.' });
  await editableListing(id, 'content');
  // A slug already used by another listing is refused by its unique index; the form says so.
  await saveListing(id, 'content', { title, subtitle, description, slug }, 'Guest-facing copy saved.', 'The listing wasn’t saved. The URL slug may already be in use; try another.');
}

/** Moves the listing to another unit of its host through the locked allocation command. */
export async function allocateListingUnitAction(formData: FormData) {
  const id = text(formData, 'listingId');
  const accommodationUnitId = text(formData, 'accommodationUnitId');
  if (!safeId.test(accommodationUnitId)) backToListingEdit(id, 'unit', { error: 'Choose a unit.' });
  await editableListing(id, 'unit');
  const response = await keystoneClient<any>(`mutation AllocateListing($input: JSON!) { hostStayCommand(command: "listing_allocate", input: $input) }`, { input: { listingId: id, accommodationUnitId } });
  const result = response.success ? response.data.hostStayCommand || {} : { ok: false, message: 'We couldn’t confirm the move. Refresh to check the listing’s unit before trying again.' };
  revalidatePath(listingEditBase(id)); revalidatePath(platformDetailPath('listing', id)); revalidatePath('/dashboard/platform/listings');
  if (!result.ok) backToListingEdit(id, 'unit', { error: String(result.message || 'The listing wasn’t moved.') });
  backToListingEdit(id, 'unit', { notice: result.data?.changed === false ? 'The listing already uses that unit.' : 'Listing moved to the new unit.' });
}

export async function updateListingRulesAction(formData: FormData) {
  const id = text(formData, 'listingId');
  const bookingMode = text(formData, 'bookingMode');
  // Optional: blank means no deposit, stored as an explicit zero.
  const securityDepositCents = wholeNumber(formData, 'securityDepositCents', 0, MAX_STORED_CENTS, true) ?? 0;
  const rules = bookingRules(formData, false);
  if (!['request', 'instant'].includes(bookingMode)) backToListingEdit(id, 'rules', { error: 'Choose how guests book.' });
  if (securityDepositCents === undefined) backToListingEdit(id, 'rules', { error: 'Security deposit must be blank or zero or more.' });
  if (typeof rules === 'string') backToListingEdit(id, 'rules', { error: rules });
  await editableListing(id, 'rules');
  await saveListing(id, 'rules', { bookingMode, securityDepositCents, ...rules }, 'Pricing and booking rules saved.');
}

/**
 * Attaches the ticked amenities and detaches the unticked ones among those the form showed.
 * Amenities the form didn't show stay attached, and a concurrent attach of another amenity
 * isn't overwritten: the change is a delta, never a replacement of the whole set.
 */
export async function setListingAmenitiesAction(formData: FormData) {
  const id = text(formData, 'listingId');
  const shown = [...new Set(formData.getAll('shownAmenityId').map(String))];
  const ticked = new Set(formData.getAll('amenityId').map(String));
  if (shown.length > AMENITY_PAGE_SIZE || [...shown, ...ticked].some((amenityId) => !safeId.test(amenityId)) || [...ticked].some((amenityId) => !shown.includes(amenityId))) {
    backToListingEdit(id, 'amenities', { error: 'Choose amenities from the list.' });
  }
  await editableListing(id, 'amenities');
  const connect = shown.filter((amenityId) => ticked.has(amenityId)).map((amenityId) => ({ id: amenityId }));
  const disconnect = shown.filter((amenityId) => !ticked.has(amenityId)).map((amenityId) => ({ id: amenityId }));
  await saveListing(id, 'amenities', { amenities: { connect, disconnect } }, 'Amenities saved.');
}

function mediaFields(formData: FormData) {
  const altText = text(formData, 'altText'); const caption = text(formData, 'caption');
  const order = wholeNumber(formData, 'order', 0, 1000);
  if (altText.length < 2 || altText.length > 200) return 'Describe the photo in 2–200 characters for guests using screen readers.';
  if (caption.length > 300) return 'Captions can be up to 300 characters.';
  if (order === undefined || order === null) return 'Order must be a number from 0 to 1000.';
  return { altText, caption, order };
}

export async function addListingMediaAction(formData: FormData) {
  const id = text(formData, 'listingId');
  const imagePath = text(formData, 'imagePath');
  const fields = mediaFields(formData);
  if (!/^(?:https:\/\/|\/(?!\/))\S+$/.test(imagePath) || imagePath.length > 2000) backToListingEdit(id, 'media', { error: 'Enter the photo’s https:// address or a site path starting with /.' });
  if (typeof fields === 'string') backToListingEdit(id, 'media', { error: fields });
  await editableListing(id, 'media');
  // The photo inherits the listing's host organization through its listing relationship.
  const response = await keystoneClient<any>(`mutation AddListingMedia($data: ListingMediaCreateInput!) { createListingMedia(data: $data) { id } }`, { data: { listing: { connect: { id } }, imagePath, ...fields } });
  revalidatePath(listingEditBase(id)); revalidatePath(platformDetailPath('listing', id)); revalidatePath('/dashboard/platform/listings');
  if (!response.success || !response.data.createListingMedia?.id) backToListingEdit(id, 'media', { error: 'The photo wasn’t added. Each photo address can be used once.' });
  backToListingEdit(id, 'media', { notice: 'Photo added.' });
}

async function listingMediaOrBack(id: string, mediaId: string) {
  if (!safeId.test(mediaId)) backToListingEdit(id, 'media', { error: 'This photo is unavailable.' });
  const response = await keystoneClient<any>(`query ListingMediaAuthority($id: ID!) { listingMedia(where: { id: $id }) { id listing { id } } }`, { id: mediaId });
  if (!response.success || response.data.listingMedia?.listing?.id !== id) backToListingEdit(id, 'media', { error: 'This photo is unavailable or belongs to another listing.' });
}

export async function updateListingMediaAction(formData: FormData) {
  const id = text(formData, 'listingId'); const mediaId = text(formData, 'mediaId');
  const fields = mediaFields(formData);
  if (typeof fields === 'string') backToListingEdit(id, 'media', { error: fields });
  await editableListing(id, 'media');
  await listingMediaOrBack(id, mediaId);
  const response = await keystoneClient<any>(`mutation UpdateListingMedia($id: ID!, $data: ListingMediaUpdateInput!) { updateListingMedia(where: { id: $id }, data: $data) { id } }`, { id: mediaId, data: fields });
  revalidatePath(listingEditBase(id)); revalidatePath(platformDetailPath('listing', id));
  if (!response.success || !response.data.updateListingMedia?.id) backToListingEdit(id, 'media', { error: 'The photo wasn’t saved. Try again.' });
  backToListingEdit(id, 'media', { notice: 'Photo saved.' });
}

export async function removeListingMediaAction(formData: FormData) {
  const id = text(formData, 'listingId'); const mediaId = text(formData, 'mediaId');
  await editableListing(id, 'media');
  await listingMediaOrBack(id, mediaId);
  const response = await keystoneClient<any>(`mutation RemoveListingMedia($id: ID!) { deleteListingMedia(where: { id: $id }) { id } }`, { id: mediaId });
  revalidatePath(listingEditBase(id)); revalidatePath(platformDetailPath('listing', id)); revalidatePath('/dashboard/platform/listings');
  if (!response.success || !response.data.deleteListingMedia?.id) backToListingEdit(id, 'media', { error: 'The photo wasn’t removed. Try again.' });
  backToListingEdit(id, 'media', { notice: 'Photo removed from the listing.' });
}

/* ───────────────────────── rate plans ───────────────────────── */

type PlanInput = BookingRules & { name: string; description: string; status: string; isDefault: boolean; cancellationPolicyId: string | null };

function planInput(formData: FormData, statuses: string[]): PlanInput | string {
  const name = text(formData, 'name'); const description = text(formData, 'description'); const status = text(formData, 'status');
  const cancellationPolicyId = text(formData, 'cancellationPolicyId') || null;
  if (name.length < 2 || name.length > 120) return 'Name must be 2–120 characters.';
  if (description.length > 2000) return 'Description can be up to 2,000 characters.';
  if (!statuses.includes(status)) return 'Choose a status.';
  if (cancellationPolicyId && !safeId.test(cancellationPolicyId)) return 'Choose a cancellation policy from the list.';
  const rules = bookingRules(formData, true);
  if (typeof rules === 'string') return rules;
  // An active plan can become the one quotes sell under, so it needs a price and published terms.
  if (status === 'active' && rules.baseNightlyRateCents <= 0) return 'An active plan needs a nightly rate above zero.';
  if (status === 'active' && !cancellationPolicyId) return 'An active plan needs a cancellation policy.';
  return { name, description, status, isDefault: formData.get('isDefault') === 'on', cancellationPolicyId, ...rules };
}

async function policyBelongsToListingHost(policyId: string | null, listingId: string) {
  if (!policyId) return true;
  const response = await keystoneClient<any>(`query RatePlanPolicyAuthority($id: ID!, $listingId: ID!) { cancellationPoliciesCount(where: { id: { equals: $id }, hostOrganization: { listings: { some: { id: { equals: $listingId } } } } }) }`, { id: policyId, listingId });
  return response.success && response.data.cancellationPoliciesCount === 1;
}

export async function createRatePlanAction(_previous: CatalogFormState, formData: FormData): Promise<CatalogFormState> {
  const values = submitted(formData);
  const fail = (message: string): CatalogFormState => ({ ok: false, message, values });
  const listingId = text(formData, 'listingId');
  if (!safeId.test(listingId)) return fail('Choose the listing this plan prices.');
  const input = planInput(formData, ['draft', 'active']);
  if (typeof input === 'string') return fail(input);
  const authority = await keystoneClient<any>(`query RatePlanCreateAuthority($id: ID!) { listing(where: { id: $id }) { id status currencyCode } }`, { id: listingId });
  if (!authority.success) return fail('The listing couldn’t be checked. Try again.');
  const listing = authority.data.listing;
  if (!listing?.id) return fail('This listing is unavailable or outside your host scope.');
  if (listing.status === 'archived') return fail('Archived listings can’t get new rate plans.');
  if (!(await policyBelongsToListingHost(input.cancellationPolicyId, listingId))) return fail('Choose a cancellation policy of this listing’s host.');
  const { cancellationPolicyId, ...fields } = input;
  // Priced in the listing's currency, so the plan can sell its stays.
  const response = await keystoneClient<any>(`mutation CreatePlatformRatePlan($data: RatePlanCreateInput!) { createRatePlan(data: $data) { id } }`, { data: {
    ...fields, currencyCode: listing.currencyCode, listing: { connect: { id: listingId } },
    ...(cancellationPolicyId ? { cancellationPolicy: { connect: { id: cancellationPolicyId } } } : {}),
  } });
  const planId = response.success ? response.data.createRatePlan?.id : null;
  if (!planId) return fail('The rate plan wasn’t created. Check the fields and try again.');
  revalidatePath('/dashboard/platform/pricing'); revalidatePath('/dashboard/platform/listings'); revalidatePath(platformDetailPath('listing', listingId));
  redirect(`${platformDetailPath('ratePlan', planId)}?notice=${encodeURIComponent('Rate plan created.')}`);
}

export async function updateRatePlanAction(_previous: CatalogFormState, formData: FormData): Promise<CatalogFormState> {
  const values = submitted(formData);
  const fail = (message: string): CatalogFormState => ({ ok: false, message, values });
  const id = text(formData, 'ratePlanId');
  const currencyCode = text(formData, 'currencyCode').toUpperCase();
  if (!safeId.test(id)) return fail('This rate plan is unavailable.');
  if (!/^[A-Z]{3}$/.test(currencyCode)) return fail('Currency must be a three-letter code such as USD.');
  const input = planInput(formData, ['draft', 'active', 'archived']);
  if (typeof input === 'string') return fail(input);
  const authority = await keystoneClient<any>(`query RatePlanEditAuthority($id: ID!) { ratePlan(where: { id: $id }) { id cancellationPolicy { id } listing { id currencyCode } } }`, { id });
  if (!authority.success) return fail('The rate plan couldn’t be checked. Try again.');
  const plan = authority.data.ratePlan;
  if (!plan?.id) return fail('This rate plan is unavailable or outside your host scope.');
  if (input.status === 'active' && plan.listing?.currencyCode && currencyCode !== plan.listing.currencyCode) return fail(`An active plan must be priced in its listing’s currency (${plan.listing.currencyCode}).`);
  if (input.cancellationPolicyId && (!plan.listing?.id || !(await policyBelongsToListingHost(input.cancellationPolicyId, plan.listing.id)))) return fail('Choose a cancellation policy of this listing’s host.');
  const { cancellationPolicyId, ...fields } = input;
  const policy = cancellationPolicyId ? { connect: { id: cancellationPolicyId } } : plan.cancellationPolicy?.id ? { disconnect: true } : undefined;
  const response = await keystoneClient<any>(`mutation UpdatePlatformRatePlan($id: ID!, $data: RatePlanUpdateInput!) { updateRatePlan(where: { id: $id }, data: $data) { id } }`, { id, data: { ...fields, currencyCode, ...(policy ? { cancellationPolicy: policy } : {}) } });
  if (!response.success || !response.data.updateRatePlan?.id) return fail('The rate plan wasn’t saved. Check the fields and try again.');
  revalidatePath('/dashboard/platform/pricing'); revalidatePath(platformDetailPath('ratePlan', id)); revalidatePath('/dashboard/platform/listings');
  if (plan.listing?.id) revalidatePath(platformDetailPath('listing', plan.listing.id));
  redirect(`${platformDetailPath('ratePlan', id)}?notice=${encodeURIComponent('Rate plan saved.')}`);
}
