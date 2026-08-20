'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { platformDetailPath } from '@/features/platform/operations/lib/routes';

async function detailQuery<T>(query: string, variables: Record<string, unknown>) {
  const response = await keystoneClient<T>(query, variables);
  return response.success ? { data: response.data, error: null } : { data: null, error: response.error };
}

export async function getPropertyDetailWorkspace(id: string) {
  return detailQuery<any>(`query PropertyDetailWorkspace($id: ID!, $reservationWhere: ReservationWhereInput!, $blockWhere: CalendarBlockWhereInput!) {
    property(where: { id: $id }) {
      id name internalCode propertyType status timezone registrationNumber checkInFrom checkInUntil checkOutBy internalNotes
      hostOrganization { id name }
      address { id addressLine1 addressLine2 city region postalCode countryCode publicLocationLabel showExactAddressPublicly }
      units(orderBy: [{ name: asc }], take: 100) { id name accommodationType status maxGuests bedroomCount bedCount bathroomCountHalfUnits squareFeet floorLabel listings(take: 20) { id title status } }
      listings(orderBy: [{ title: asc }], take: 100) { id title status baseNightlyRateCents currencyCode accommodationUnit { id name status } channelListings(take: 20) { id status channelConnection { name provider status } } }
      tasks(orderBy: [{ dueAt: asc }], take: 200) { id title taskType status priority dueAt completionNotes assignee { id name } reservation { id confirmationCode } listing { id title } }
      ownerAssignments(take: 50) { id status ownershipBasisPoints managerCommissionBasisPoints owner { id displayName status } }
    }
    reservations(where: $reservationWhere, orderBy: [{ checkInDate: desc }], take: 200) { id confirmationCode status paymentStatus checkInDate checkOutDate totalAmountCents amountPaidCents currencyCode guest { id name verificationStatus } listing { id title } agreement { id status } }
    calendarBlocks(where: $blockWhere, orderBy: [{ startDate: desc }], take: 200) { id startDate endDate reason status source notes listing { id title } reservation { id confirmationCode } }
  }`, { id, reservationWhere: { listing: { property: { id: { equals: id } } } }, blockWhere: { listing: { property: { id: { equals: id } } } } });
}

export async function getListingDetailWorkspace(id: string) {
  return detailQuery<any>(`query ListingDetailWorkspace($id: ID!) {
    listing(where: { id: $id }) {
      id title slug subtitle description status bookingMode instantBook currencyCode baseNightlyRateCents securityDepositCents minimumStay maximumStay advanceNoticeHours bookingWindowDays reviewAverageHundredths reviewCount
      property { id name status registrationNumber timezone address { publicLocationLabel } }
      accommodationUnit { id name status maxGuests bedroomCount bedCount bathroomCountHalfUnits }
      media(orderBy: [{ order: asc }], take: 50) { id imagePath altText caption order }
      amenities(take: 100) { id name category }
      ratePlans(orderBy: [{ name: asc }], take: 50) { id name status baseNightlyRateCents currencyCode minimumStay isDefault }
      channelListings(take: 50) { id externalListingId status channelConnection { id name provider status syncAvailability syncRates syncReservations syncMessages lastSyncedAt lastError } }
      calendarBlocks(orderBy: [{ startDate: desc }], take: 100) { id startDate endDate reason status source notes reservation { id confirmationCode } }
      reservations(orderBy: [{ checkInDate: desc }], take: 100) { id confirmationCode status paymentStatus checkInDate checkOutDate guest { id name verificationStatus } agreement { id status } }
      tasks(orderBy: [{ dueAt: asc }], take: 100) { id title taskType status priority dueAt assignee { id name } }
      reviews(orderBy: [{ createdAt: desc }], take: 20) { id status direction overallRating body publishedAt guest { id name } }
    }
  }`, { id });
}

export async function getGuestDetailWorkspace(id: string) {
  return detailQuery<any>(`query GuestDetailWorkspace($id: ID!) { guestProfile(where: { id: $id }) {
    id name email phone verificationStatus preferredLanguage marketingConsent internalNotes createdAt updatedAt
    reservations(orderBy: [{ checkInDate: desc }], take: 100) { id confirmationCode status paymentStatus checkInDate checkOutDate totalAmountCents amountPaidCents currencyCode listing { id title } agreement { id status } tasks(take: 30) { id title status taskType } }
    conversations(orderBy: [{ lastMessageAt: desc }], take: 100) { id subject status lastMessageAt listing { id title } reservation { id confirmationCode } messages(orderBy: [{ createdAt: desc }], take: 3) { id direction status body createdAt } }
    payments(orderBy: [{ createdAt: desc }], take: 100) { id status amountCents refundedAmountCents currencyCode provider processedAt reservation { id confirmationCode } }
    reviews(orderBy: [{ createdAt: desc }], take: 100) { id status direction overallRating body publishedAt listing { id title } reservation { id confirmationCode } }
  } }`, { id });
}

export async function getAgreementDetailWorkspace(id: string) {
  return detailQuery<any>(`query AgreementDetailWorkspace($id: ID!) { stayAgreement(where: { id: $id }) {
    id agreementNumber title status signerEmail signatureName signedAt signingTokenExpiresAt signingTokenRevokedAt termsSnapshot createdAt updatedAt
    guest { id name email verificationStatus }
    cancellationPolicy { id name }
    reservation { id confirmationCode status paymentStatus checkInDate checkOutDate totalAmountCents amountPaidCents currencyCode listing { id title } }
  } }`, { id });
}

export async function getRatePlanDetailWorkspace(id: string) {
  return detailQuery<any>(`query RatePlanDetailWorkspace($id: ID!) { ratePlan(where: { id: $id }) {
    id name description status currencyCode baseNightlyRateCents minimumStay maximumStay advanceNoticeHours bookingWindowDays isDefault createdAt updatedAt
    listing { id title status baseNightlyRateCents currencyCode property { id name } }
    cancellationPolicy { id name summary }
    seasonalRates(orderBy: [{ startDate: asc }], take: 100) { id name startDate endDate nightlyRateCents adjustmentBasisPoints minimumStay priority isActive }
  } }`, { id });
}

export async function getConversationDetailWorkspace(id: string) {
  return detailQuery<any>(`query ConversationDetailWorkspace($id: ID!) { conversation(where: { id: $id }) {
    id subject status externalThreadId lastMessageAt createdAt updatedAt
    guest { id name email verificationStatus }
    listing { id title }
    reservation { id confirmationCode status paymentStatus checkInDate checkOutDate }
    channelConnection { id name provider status syncMessages lastSyncedAt lastError }
    messages(orderBy: [{ createdAt: asc }], take: 250) { id direction senderType body status externalMessageId sentAt receivedAt createdAt }
  } }`, { id });
}

export async function getPaymentDetailWorkspace(id: string) {
  return detailQuery<any>(`query PaymentDetailWorkspace($id: ID!) { payment(where: { id: $id }) {
    id amountCents refundedAmountCents currencyCode status paymentMethod provider providerPaymentId idempotencyKey processedAt errorMessage createdAt updatedAt
    paymentProvider { id name code isInstalled }
    guest { id name email verificationStatus }
    reservation { id confirmationCode status paymentStatus totalAmountCents amountPaidCents currencyCode listing { id title } }
    refunds(orderBy: [{ createdAt: desc }], take: 100) { id refundNumber status reason amountCents currencyCode providerRefundId processedAt createdAt }
    securityDeposits(take: 50) { id depositNumber status amountCents capturedAmountCents currencyCode heldAt releasedAt }
    webhookEvents(orderBy: [{ createdAt: desc }], take: 100) { id providerEventId eventType status receivedAt: createdAt processedAt errorMessage }
  } }`, { id });
}

export async function getPayoutDetailWorkspace(id: string) {
  return detailQuery<any>(`query PayoutDetailWorkspace($id: ID!) { payout(where: { id: $id }) {
    id payoutNumber status currencyCode grossAmountCents platformFeeCents managerFeeCents refundAmountCents netAmountCents providerPayoutId scheduledAt paidAt createdAt updatedAt
    propertyOwner { id ownerNumber displayName companyName email status payoutSchedule }
    ownerStatement { id statementNumber status periodStart periodEnd grossRevenueCents ownerEarningsCents balanceDueCents paidReference }
    reservation { id confirmationCode status checkInDate checkOutDate listing { id title property { id name } } guest { id name } }
  } }`, { id });
}

export async function getReviewDetailWorkspace(id: string) {
  return detailQuery<any>(`query ReviewDetailWorkspace($id: ID!) { review(where: { id: $id }) {
    id direction status overallRating cleanlinessRating accuracyRating communicationRating locationRating valueRating body privateFeedback submittedAt publishAfter publishedAt createdAt updatedAt
    guest { id name email verificationStatus }
    listing { id title status reviewAverageHundredths reviewCount property { id name } }
    reservation { id confirmationCode status checkInDate checkOutDate }
  } }`, { id });
}

const propertyTransitions: Record<string, Record<string, string>> = {
  onboarding: { activate: 'active', archive: 'archived' },
  active: { pause: 'paused', archive: 'archived' },
  paused: { activate: 'active', archive: 'archived' },
  archived: {},
};
const listingTransitions: Record<string, Record<string, string>> = {
  draft: { publish: 'published', archive: 'archived' },
  published: { pause: 'paused', archive: 'archived' },
  paused: { publish: 'published', archive: 'archived' },
  archived: {},
};

async function transitionScopedRecord({ kind, id, currentStatus, transition }: { kind: 'property' | 'listing'; id: string; currentStatus: string; transition: string }) {
  const allowed = kind === 'property' ? propertyTransitions : listingTransitions;
  const nextStatus = allowed[currentStatus]?.[transition];
  if (!id || !nextStatus) throw new Error(`This ${kind} can no longer take that action. Refresh and try again.`);
  const entity = kind === 'property' ? 'Property' : 'Listing';
  const field = kind === 'property' ? 'property' : 'listing';
  const query = `query DetailTransitionAuthority($id: ID!) { ${field}(where: { id: $id }) { id status } }`;
  const authority = await keystoneClient<any>(query, { id });
  if (!authority.success || authority.data[field]?.status !== currentStatus) throw new Error(`This ${kind} changed before the action was applied. Refresh and try again.`);
  const mutation = `mutation Transition${entity}($id: ID!, $status: String!) { update${entity}(where: { id: $id }, data: { status: $status }) { id status } }`;
  const response = await keystoneClient<any>(mutation, { id, status: nextStatus });
  if (!response.success || response.data[`update${entity}`]?.status !== nextStatus) throw new Error(response.success ? `The ${kind} transition was not confirmed.` : response.error);
  revalidatePath('/dashboard/platform/properties'); revalidatePath('/dashboard/platform/listings'); revalidatePath(platformDetailPath(kind, id));
}

export async function transitionPropertyAction(formData: FormData) {
  await transitionScopedRecord({ kind: 'property', id: String(formData.get('id') || ''), currentStatus: String(formData.get('status') || ''), transition: String(formData.get('transition') || '') });
}
export async function transitionListingAction(formData: FormData) {
  await transitionScopedRecord({ kind: 'listing', id: String(formData.get('id') || ''), currentStatus: String(formData.get('status') || ''), transition: String(formData.get('transition') || '') });
}

async function getPropertyActionAuthority(id: string) {
  const response = await keystoneClient<any>(`query PropertyActionAuthority($id: ID!) { property(where: { id: $id }) { id status hostOrganization { id } address { id } units(take: 100) { id } } }`, { id });
  const property = response.success ? response.data.property : null;
  if (!property?.id || !property.hostOrganization?.id || property.status === 'archived') throw new Error('This property is unavailable for operational configuration. Refresh and try again.');
  return property;
}

export async function recordPropertyRegistrationAction(formData: FormData) {
  const id = String(formData.get('propertyId') || '');
  const registrationNumber = String(formData.get('registrationNumber') || '').trim();
  const timezone = String(formData.get('timezone') || '').trim();
  if (!id || registrationNumber.length < 2 || registrationNumber.length > 120 || !/^[A-Za-z_]+(?:\/[A-Za-z_+-]+)+$/.test(timezone)) throw new Error('Provide registration evidence and a valid IANA timezone.');
  await getPropertyActionAuthority(id);
  const response = await keystoneClient<any>(`mutation RecordPropertyRegistration($id: ID!, $registrationNumber: String!, $timezone: String!) { updateProperty(where: { id: $id }, data: { registrationNumber: $registrationNumber, timezone: $timezone }) { id registrationNumber timezone } }`, { id, registrationNumber, timezone });
  if (!response.success || response.data.updateProperty?.registrationNumber !== registrationNumber) throw new Error(response.success ? 'Registration evidence was not confirmed.' : response.error);
  revalidatePath(platformDetailPath('property', id)); revalidatePath('/dashboard/platform/properties'); revalidatePath('/dashboard/platform/listings');
}

export async function recordPropertyAddressAction(formData: FormData) {
  const propertyId = String(formData.get('propertyId') || '');
  const city = String(formData.get('city') || '').trim(); const countryCode = String(formData.get('countryCode') || '').trim().toUpperCase();
  const addressLine1 = String(formData.get('addressLine1') || '').trim(); const region = String(formData.get('region') || '').trim(); const postalCode = String(formData.get('postalCode') || '').trim(); const publicLocationLabel = String(formData.get('publicLocationLabel') || '').trim();
  if (!propertyId || city.length < 2 || countryCode.length !== 2 || addressLine1.length > 160 || region.length > 100 || postalCode.length > 30 || publicLocationLabel.length > 160) throw new Error('Provide a valid city and two-letter country code.');
  const property = await getPropertyActionAuthority(propertyId);
  const data = { hostOrganization: { connect: { id: property.hostOrganization.id } }, property: { connect: { id: propertyId } }, addressLine1: addressLine1 || null, city, region: region || null, postalCode: postalCode || null, countryCode, publicLocationLabel: publicLocationLabel || `${city}${region ? `, ${region}` : ''}`, showExactAddressPublicly: false };
  const response = property.address?.id
    ? await keystoneClient<any>(`mutation UpdatePropertyAddress($id: ID!, $data: PropertyAddressUpdateInput!) { updatePropertyAddress(where: { id: $id }, data: $data) { id city countryCode } }`, { id: property.address.id, data })
    : await keystoneClient<any>(`mutation CreatePropertyAddress($data: PropertyAddressCreateInput!) { createPropertyAddress(data: $data) { id city countryCode } }`, { data });
  const saved = response.success ? response.data.updatePropertyAddress || response.data.createPropertyAddress : null;
  if (!response.success || saved?.city !== city) throw new Error(response.success ? 'Address evidence was not confirmed.' : response.error);
  revalidatePath(platformDetailPath('property', propertyId)); revalidatePath('/dashboard/platform/properties');
}

export async function createPropertyUnitAction(formData: FormData) {
  const propertyId = String(formData.get('propertyId') || ''); const name = String(formData.get('name') || '').trim();
  const maxGuests = Number(formData.get('maxGuests') || 0); const bedroomCount = Number(formData.get('bedroomCount') || 0);
  if (!propertyId || name.length < 2 || name.length > 120 || !Number.isInteger(maxGuests) || maxGuests < 1 || maxGuests > 50 || !Number.isInteger(bedroomCount) || bedroomCount < 0 || bedroomCount > 30) throw new Error('Provide a valid unit name, guest capacity, and bedroom count.');
  const property = await getPropertyActionAuthority(propertyId);
  const response = await keystoneClient<any>(`mutation CreatePropertyUnit($data: AccommodationUnitCreateInput!) { createAccommodationUnit(data: $data) { id status } }`, { data: { hostOrganization: { connect: { id: property.hostOrganization.id } }, property: { connect: { id: propertyId } }, name, accommodationType: 'entire_home', status: 'available', maxGuests, bedroomCount, bedCount: Math.max(1, bedroomCount), bathroomCountHalfUnits: 2 } });
  if (!response.success || !response.data.createAccommodationUnit?.id) throw new Error(response.success ? 'Unit creation was not confirmed.' : response.error);
  revalidatePath(platformDetailPath('property', propertyId)); revalidatePath('/dashboard/platform/properties');
}

export async function createPropertyListingAction(formData: FormData) {
  const propertyId = String(formData.get('propertyId') || ''); const accommodationUnitId = String(formData.get('accommodationUnitId') || ''); const title = String(formData.get('title') || '').trim(); const slug = String(formData.get('slug') || '').trim().toLowerCase();
  const baseNightlyRateCents = Number(formData.get('baseNightlyRateCents') || 0); const currencyCode = String(formData.get('currencyCode') || 'USD').trim().toUpperCase();
  if (!propertyId || !accommodationUnitId || title.length < 2 || title.length > 140 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !Number.isInteger(baseNightlyRateCents) || baseNightlyRateCents < 0 || currencyCode.length !== 3) throw new Error('Provide a unit, title, URL slug, currency, and non-negative base rate.');
  const property = await getPropertyActionAuthority(propertyId);
  if (!property.units.some((unit: any) => unit.id === accommodationUnitId)) throw new Error('The selected unit does not belong to this property.');
  const response = await keystoneClient<any>(`mutation CreatePropertyListing($data: ListingCreateInput!) { createListing(data: $data) { id status } }`, { data: { hostOrganization: { connect: { id: property.hostOrganization.id } }, property: { connect: { id: propertyId } }, accommodationUnit: { connect: { id: accommodationUnitId } }, title, slug, status: 'draft', bookingMode: 'request', instantBook: false, currencyCode, baseNightlyRateCents, minimumStay: 1, advanceNoticeHours: 24, bookingWindowDays: 365 } });
  if (!response.success || !response.data.createListing?.id) throw new Error(response.success ? 'Listing creation was not confirmed.' : response.error);
  revalidatePath(platformDetailPath('property', propertyId)); revalidatePath('/dashboard/platform/properties'); revalidatePath('/dashboard/platform/listings');
}

export async function createPlatformPropertyAction(formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  const internalCode = String(formData.get('internalCode') || '').trim();
  const propertyType = String(formData.get('propertyType') || 'house');
  const timezone = String(formData.get('timezone') || '').trim();
  const allowedTypes = ['house', 'apartment_building', 'cabin', 'villa', 'cottage', 'chalet', 'condo', 'townhouse', 'unique_stay'];
  if (name.length < 2 || name.length > 120 || internalCode.length > 80 || !allowedTypes.includes(propertyType) || !/^[A-Za-z_]+(?:\/[A-Za-z_+-]+)+$/.test(timezone)) throw new Error('Provide a valid property name, type, and IANA timezone.');
  const hosts = await keystoneClient<any>(`query PropertyCreateAuthority { hostOrganizations(orderBy: [{ name: asc }], take: 2) { id name } }`);
  if (!hosts.success || hosts.data.hostOrganizations?.length !== 1) throw new Error('Property creation requires exactly one accessible host organization.');
  const response = await keystoneClient<any>(`mutation CreatePlatformProperty($data: PropertyCreateInput!) { createProperty(data: $data) { id status } }`, { data: { hostOrganization: { connect: { id: hosts.data.hostOrganizations[0].id } }, name, internalCode: internalCode || null, propertyType, timezone, status: 'onboarding' } });
  if (!response.success || !response.data.createProperty?.id) throw new Error(response.success ? 'Property creation was not confirmed.' : response.error);
  revalidatePath('/dashboard/platform/properties');
  redirect(platformDetailPath('property', response.data.createProperty.id));
}
