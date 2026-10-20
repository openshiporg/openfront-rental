'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { platformDetailPath } from '@/features/platform/operations/lib/routes';
import { operationalPropertyIdWhere } from '@/features/platform/operations/lib/operationalProperty';
import { runHostStayCommand } from '@/features/platform/reservations/actions/reservations';
import { isValidIanaTimeZone, normalizePropertyInternalCode } from '../lib/propertyInput';
import { EFFECTIVE_RATE_PLAN_SELECTION } from '../lib/sellability';

/** Return to a detail page with a visible outcome instead of failing the whole page. */
function backTo(path: string, outcome: { error?: string; notice?: string }) {
  const params = new URLSearchParams();
  if (outcome.error) params.set('error', outcome.error);
  if (outcome.notice) params.set('notice', outcome.notice);
  redirect(`${path}?${params.toString()}`);
}

function safeDetailPath(kind: Parameters<typeof platformDetailPath>[0], id: string, fallback: string) {
  try { return platformDetailPath(kind, id); } catch { return fallback; }
}

async function detailQuery<T>(query: string, variables: Record<string, unknown>) {
  const response = await keystoneClient<T>(query, variables);
  return response.success ? { data: response.data, error: null } : { data: null, error: 'Workspace detail is temporarily unavailable.' };
}

export async function getPropertyDetailWorkspace(id: string) {
  // Stays at this property by allocation (or, when unallocated, by the booked listing): the same basis as the reservation queue's property filter.
  const reservationWhere = operationalPropertyIdWhere(id);
  return detailQuery<any>(`query PropertyDetailWorkspace($id: ID!, $reservationWhere: ReservationWhereInput!, $upcomingWhere: ReservationWhereInput!, $blockWhere: CalendarBlockWhereInput!) {
    property(where: { id: $id }) {
      id name internalCode propertyType status timezone registrationNumber checkInFrom checkInUntil checkOutBy internalNotes arrivalInstructions
      hostOrganization { id name isPublic status }
      address { id addressLine1 addressLine2 city region postalCode countryCode publicLocationLabel showExactAddressPublicly }
      unitsCount
      availableUnitsCount: unitsCount(where: { status: { equals: "available" } })
      units(orderBy: [{ name: asc }, { id: asc }], take: 100) { id name accommodationType status maxGuests bedroomCount bedCount bathroomCountHalfUnits squareFeet floorLabel listings(orderBy: [{ title: asc }, { id: asc }], take: 20) { id title status } }
      listingSummary
      openTasksCount: tasksCount(where: { status: { notIn: ["completed", "cancelled"] } })
      maintenanceTasksCount: tasksCount(where: { status: { notIn: ["completed", "cancelled"] }, taskType: { equals: "property_maintenance" } })
      maintenanceTasks: tasks(where: { status: { notIn: ["completed", "cancelled"] }, taskType: { equals: "property_maintenance" } }, orderBy: [{ dueAt: asc }, { id: asc }], take: 20) { id title status priority dueAt }
      openTasks: tasks(where: { status: { notIn: ["completed", "cancelled"] } }, orderBy: [{ dueAt: asc }, { id: asc }], take: 10) { id title taskType status priority dueAt assignee { id name } }
      closedTasks: tasks(where: { status: { in: ["completed", "cancelled"] } }, orderBy: [{ dueAt: desc }, { id: desc }], take: 10) { id title taskType status priority dueAt assignee { id name } }
      ownerAssignmentsCount
      ownerAssignments(orderBy: [{ id: asc }], take: 50) { id status ownershipBasisPoints managerCommissionBasisPoints owner { id displayName status } }
    }
    staysCount: reservationsCount(where: $reservationWhere)
    upcomingStaysCount: reservationsCount(where: $upcomingWhere)
    reservations(where: $reservationWhere, orderBy: [{ checkInDate: desc }, { id: desc }], take: 25) { id confirmationCode status paymentStatus checkInDate checkOutDate totalAmountCents amountPaidCents currencyCode guest { id name verificationStatus } listing { id title } agreement { id status } }
    calendarBlocksCount(where: $blockWhere)
    calendarBlocks(where: $blockWhere, orderBy: [{ startDate: desc }, { id: desc }], take: 10) { id startDate endDate reason status source notes listing { id title } reservation { id confirmationCode } }
  }`, {
    id,
    reservationWhere,
    upcomingWhere: { ...reservationWhere, status: { in: ['pending', 'confirmed', 'in_stay'] } },
    blockWhere: { listing: { property: { id: { equals: id } } } },
  });
}

export async function getListingDetailWorkspace(id: string) {
  return detailQuery<any>(`query ListingDetailWorkspace($id: ID!) {
    listing(where: { id: $id }) {
      id title slug subtitle description status bookingMode instantBook currencyCode baseNightlyRateCents securityDepositCents minimumStay maximumStay advanceNoticeHours bookingWindowDays reviewAverageHundredths reviewCount
      onlineReadiness
      property { id name status registrationNumber timezone address { publicLocationLabel city countryCode } }
      accommodationUnit { id name status accommodationType maxGuests bedroomCount bedCount bathroomCountHalfUnits }
      mediaCount
      media(orderBy: [{ order: asc }, { id: asc }], take: 50) { id imagePath altText caption order }
      amenitiesCount
      amenities(orderBy: [{ name: asc }, { id: asc }], take: 100) { id name category }
      ${EFFECTIVE_RATE_PLAN_SELECTION}
      ratePlansCount
      ratePlans(orderBy: [{ name: asc }, { id: asc }], take: 50) { id name status baseNightlyRateCents currencyCode minimumStay isDefault }
      channelListings(orderBy: [{ id: asc }], take: 50) { id externalListingId status channelConnection { id name provider status syncAvailability syncRates syncReservations syncMessages lastSyncedAt lastError } }
      staysCount: reservationsCount
      upcomingStaysCount: reservationsCount(where: { status: { in: ["pending", "confirmed", "in_stay"] } })
      reservations(orderBy: [{ checkInDate: desc }, { id: desc }], take: 20) { id confirmationCode status paymentStatus checkInDate checkOutDate guest { id name verificationStatus } agreement { id status } }
      openTasksCount: tasksCount(where: { status: { notIn: ["completed", "cancelled"] } })
      openTasks: tasks(where: { status: { notIn: ["completed", "cancelled"] } }, orderBy: [{ dueAt: asc }, { id: asc }], take: 20) { id title taskType status priority dueAt assignee { id name } }
    }
  }`, { id });
}

export async function getGuestDetailWorkspace(id: string) {
  const guestStays = { guest: { id: { equals: id } } };
  return detailQuery<any>(`query GuestDetailWorkspace($id: ID!, $collectibleWhere: ReservationWhereInput!, $closedWhere: ReservationWhereInput!, $openRefundWhere: RefundWhereInput!) {
    guestProfile(where: { id: $id }) {
      id name email phone verificationStatus preferredLanguage marketingConsent internalNotes createdAt updatedAt
      staysCount: reservationsCount
      activeStaysCount: reservationsCount(where: { status: { in: ["pending", "confirmed", "in_stay"] } })
      reservations(orderBy: [{ checkInDate: desc }, { id: desc }], take: 25) { id confirmationCode status paymentStatus checkInDate checkOutDate totalAmountCents amountPaidCents currencyCode listing { id title } agreement { id status } }
      conversationsCount
      openConversationsCount: conversationsCount(where: { status: { equals: "open" } })
      conversations(orderBy: [{ lastMessageAt: desc }, { id: desc }], take: 10) { id subject status lastMessageAt listing { id title } reservation { id confirmationCode } messages(orderBy: [{ createdAt: desc }, { id: desc }], take: 1) { id direction status body createdAt } }
      paymentsCount
      payments(orderBy: [{ createdAt: desc }, { id: desc }], take: 10) { id status amountCents refundedAmountCents currencyCode provider processedAt reservation { id confirmationCode } }
      reviewsCount
      reviews(orderBy: [{ createdAt: desc }, { id: desc }], take: 10) { id status direction overallRating body publishedAt listing { id title } reservation { id confirmationCode } }
    }
    collectibleStaysCount: reservationsCount(where: $collectibleWhere)
    collectibleStays: reservations(where: $collectibleWhere, orderBy: [{ id: asc }], take: 500) { totalAmountCents amountPaidCents currencyCode }
    closedStaysCount: reservationsCount(where: $closedWhere)
    openRefundsCount: refundsCount(where: $openRefundWhere)
    openRefunds: refunds(where: $openRefundWhere, orderBy: [{ id: asc }], take: 500) { amountCents currencyCode }
  }`, {
    id,
    collectibleWhere: { ...guestStays, status: { notIn: ['cancelled', 'no_show'] } },
    closedWhere: { ...guestStays, status: { in: ['cancelled', 'no_show'] } },
    openRefundWhere: { reservation: guestStays, status: { in: ['pending', 'processing', 'failed'] } },
  });
}

export async function getAgreementDetailWorkspace(id: string) {
  return detailQuery<any>(`query AgreementDetailWorkspace($id: ID!) { stayAgreement(where: { id: $id }) {
    id agreementNumber title status signerEmail signatureName signedAt signingTokenExpiresAt signingTokenRevokedAt termsSnapshot signatureEvidence createdAt updatedAt
    guest { id name email verificationStatus }
    cancellationPolicy { id name }
    reservation { id confirmationCode status paymentStatus testMode fixtureOrigin checkInDate checkOutDate totalAmountCents amountPaidCents currencyCode listing { id title } conversation { id } }
  } }`, { id });
}

export async function getRatePlanDetailWorkspace(id: string) {
  return detailQuery<any>(`query RatePlanDetailWorkspace($id: ID!) { ratePlan(where: { id: $id }) {
    id name description status currencyCode baseNightlyRateCents minimumStay maximumStay advanceNoticeHours bookingWindowDays isDefault createdAt updatedAt
    listing { id title status baseNightlyRateCents currencyCode advanceNoticeHours bookingWindowDays property { id name } ${EFFECTIVE_RATE_PLAN_SELECTION} }
    cancellationPolicy { id name summary }
    seasonalRatesCount
    seasonalRates(orderBy: [{ startDate: asc }, { id: asc }], take: 100) { id name startDate endDate nightlyRateCents adjustmentBasisPoints minimumStay priority isActive }
  } }`, { id });
}

const MESSAGE_PAGE = 50;

/** `before` is "<createdAt>~<id>" of the oldest message already shown; the newest page loads without it. */
function messageCursor(before?: string | null) {
  const [createdAt, messageId] = String(before || '').split('~');
  if (!createdAt || !messageId || !/^[A-Za-z0-9_-]+$/.test(messageId) || Number.isNaN(Date.parse(createdAt))) return null;
  const at = new Date(createdAt).toISOString();
  return { OR: [{ createdAt: { lt: at } }, { createdAt: { equals: at }, id: { lt: messageId } }] };
}

export async function getConversationDetailWorkspace(id: string, before?: string | null) {
  const result = await detailQuery<any>(`query ConversationDetailWorkspace($id: ID!, $messageWhere: MessageWhereInput!, $take: Int!) { conversation(where: { id: $id }) {
    id subject status externalThreadId lastMessageAt createdAt updatedAt guestEmail guestAccessTokenHash guestAccessTokenExpiresAt guestAccessTokenRevokedAt
    guest { id name email verificationStatus }
    listing { id title }
    reservation { id confirmationCode status paymentStatus checkInDate checkOutDate }
    channelConnection { id name provider status syncMessages lastSyncedAt lastError }
    messagesCount
    failedMessagesCount: messagesCount(where: { status: { equals: "failed" } })
    messages(where: $messageWhere, orderBy: [{ createdAt: desc }, { id: desc }], take: $take) { id direction senderType body status externalMessageId sentAt receivedAt createdAt }
  } }`, { id, messageWhere: messageCursor(before) || {}, take: MESSAGE_PAGE + 1 });
  const conversation = result.data?.conversation;
  if (!conversation) return result;
  // Newest page first, shown oldest-to-newest; one extra row tells whether earlier messages exist.
  const page = conversation.messages.slice(0, MESSAGE_PAGE);
  const oldest = page[page.length - 1];
  return {
    ...result,
    data: {
      ...result.data,
      conversation: { ...conversation, messages: [...page].reverse() },
      earlierCursor: conversation.messages.length > MESSAGE_PAGE && oldest ? `${oldest.createdAt}~${oldest.id}` : null,
      isLatestPage: !messageCursor(before),
    },
  };
}

export async function getPaymentDetailWorkspace(id: string) {
  return detailQuery<any>(`query PaymentDetailWorkspace($id: ID!) { payment(where: { id: $id }) {
    id amountCents refundedAmountCents currencyCode status paymentMethod provider tenderKind refundAvailability providerPaymentId idempotencyKey processedAt errorMessage createdAt updatedAt
    processedBy { id name }
    paymentProvider { id name code isInstalled }
    guest { id name email verificationStatus }
    reservation { id confirmationCode status paymentStatus testMode fixtureOrigin totalAmountCents amountPaidCents currencyCode listing { id title } guest { id name } }
    refundsCount
    openRefunds: refunds(where: { status: { in: ["pending", "processing", "failed"] } }, orderBy: [{ createdAt: asc }, { id: asc }], take: 100) { id refundNumber status reason amountCents currencyCode providerRefundId processedAt createdAt }
    refunds(where: { status: { notIn: ["pending", "processing", "failed"] } }, orderBy: [{ createdAt: desc }, { id: desc }], take: 50) { id refundNumber status reason amountCents currencyCode providerRefundId processedAt createdAt }
    securityDeposits(orderBy: [{ id: asc }], take: 50) { id depositNumber status amountCents capturedAmountCents currencyCode heldAt releasedAt }
    webhookEventsCount
    failedWebhookEventsCount: webhookEventsCount(where: { status: { equals: "failed" } })
    webhookEvents(orderBy: [{ createdAt: desc }, { id: desc }], take: 12) { id providerEventId eventType status receivedAt: createdAt processedAt errorMessage }
  } }`, { id });
}

export async function getPayoutDetailWorkspace(id: string) {
  return detailQuery<any>(`query PayoutDetailWorkspace($id: ID!) { payout(where: { id: $id }) {
    id payoutNumber status currencyCode grossAmountCents platformFeeCents managerFeeCents refundAmountCents netAmountCents providerPayoutId scheduledAt paidAt data createdAt updatedAt
    propertyOwner { id ownerNumber displayName companyName email status payoutSchedule }
    ownerStatement { id statementNumber status currencyCode periodStart periodEnd grossRevenueCents ownerEarningsCents balanceDueCents paidReference sampleLinesCount: linesCount(where: { reservation: { fixtureOrigin: { not: { equals: null } } } }) }
    reservation { id confirmationCode status fixtureOrigin testMode checkInDate checkOutDate listing { id title property { id name } } guest { id name } }
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

/** Lifecycle runs as one locked backend command: the status the operator saw is checked under the row lock. */
async function transitionScopedRecord({ kind, id, currentStatus, transition }: { kind: 'property' | 'listing'; id: string; currentStatus: string; transition: string }) {
  if (!id || !currentStatus || !transition) throw new Error(`This ${kind} can no longer take that action. Refresh and try again.`);
  const result = await runHostStayCommand('catalog_transition', { kind, id, expectedStatus: currentStatus, transition });
  if (!result.ok) throw new Error(result.message);
  revalidatePath('/dashboard/platform/properties'); revalidatePath('/dashboard/platform/listings'); revalidatePath(platformDetailPath(kind, id));
}

export async function transitionPropertyAction(formData: FormData) {
  const id = String(formData.get('id') || '');
  try {
    await transitionScopedRecord({ kind: 'property', id, currentStatus: String(formData.get('status') || ''), transition: String(formData.get('transition') || '') });
  } catch (error) {
    backTo(safeDetailPath('property', id, '/dashboard/platform/properties'), { error: error instanceof Error ? error.message : 'That change wasn’t saved.' });
  }
}
export async function transitionListingAction(formData: FormData) {
  const id = String(formData.get('id') || '');
  try {
    await transitionScopedRecord({ kind: 'listing', id, currentStatus: String(formData.get('status') || ''), transition: String(formData.get('transition') || '') });
  } catch (error) {
    backTo(safeDetailPath('listing', id, '/dashboard/platform/listings'), { error: error instanceof Error ? error.message : 'That change wasn’t saved.' });
  }
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
  const path = safeDetailPath('property', id, '/dashboard/platform/properties');
  if (!id || registrationNumber.length < 2 || registrationNumber.length > 120 || !isValidIanaTimeZone(timezone)) backTo(path, { error: 'Enter a registration number (2–120 characters) and a valid IANA timezone such as America/New_York.' });
  await propertyAuthorityOrBack(id, path);
  const response = await keystoneClient<any>(`mutation RecordPropertyRegistration($id: ID!, $registrationNumber: String!, $timezone: String!) { updateProperty(where: { id: $id }, data: { registrationNumber: $registrationNumber, timezone: $timezone }) { id registrationNumber timezone } }`, { id, registrationNumber, timezone });
  revalidatePath(path); revalidatePath('/dashboard/platform/properties'); revalidatePath('/dashboard/platform/listings');
  if (!response.success || response.data.updateProperty?.registrationNumber !== registrationNumber) backTo(path, { error: 'Registration and timezone weren’t saved. Check the values and try again.' });
  backTo(path, { notice: 'Registration and timezone saved.' });
}

async function propertyAuthorityOrBack(id: string, path: string) {
  try {
    return await getPropertyActionAuthority(id);
  } catch (error) {
    backTo(path, { error: error instanceof Error ? error.message : 'This property is unavailable.' });
    throw error;
  }
}

export async function recordArrivalInstructionsAction(formData: FormData) {
  const id = String(formData.get('propertyId') || '');
  const arrivalInstructions = String(formData.get('arrivalInstructions') || '').trim();
  const path = safeDetailPath('property', id, '/dashboard/platform/properties');
  if (!id || arrivalInstructions.length > 4000) backTo(path, { error: 'Arrival details can be up to 4000 characters.' });
  await propertyAuthorityOrBack(id, path);
  const response = await keystoneClient<any>(`mutation RecordArrivalInstructions($id: ID!, $arrivalInstructions: String!) { updateProperty(where: { id: $id }, data: { arrivalInstructions: $arrivalInstructions }) { id } }`, { id, arrivalInstructions });
  revalidatePath(path);
  if (!response.success) backTo(path, { error: 'Arrival details weren’t saved. Try again.' });
  backTo(path, { notice: arrivalInstructions ? 'Arrival details saved. Guests with a confirmed stay see them on their trip page.' : 'Arrival details cleared.' });
}

export async function recordPropertyAddressAction(formData: FormData) {
  const propertyId = String(formData.get('propertyId') || '');
  const city = String(formData.get('city') || '').trim(); const countryCode = String(formData.get('countryCode') || '').trim().toUpperCase();
  const addressLine1 = String(formData.get('addressLine1') || '').trim(); const region = String(formData.get('region') || '').trim(); const postalCode = String(formData.get('postalCode') || '').trim(); const publicLocationLabel = String(formData.get('publicLocationLabel') || '').trim();
  const path = safeDetailPath('property', propertyId, '/dashboard/platform/properties');
  if (!propertyId) backTo('/dashboard/platform/properties', { error: 'This property is unavailable.' });
  if (city.length < 2) backTo(path, { error: 'City must be at least 2 characters.' });
  if (!/^[A-Z]{2}$/.test(countryCode)) backTo(path, { error: 'Country code must be two letters, for example US.' });
  if (addressLine1.length > 160 || region.length > 100 || postalCode.length > 30 || publicLocationLabel.length > 160) backTo(path, { error: 'One of the address fields is too long.' });
  const property = await propertyAuthorityOrBack(propertyId, path);
  // Optional text fields are stored as empty strings; null isn't accepted for them.
  const fields = { addressLine1, city, region, postalCode, countryCode, publicLocationLabel: publicLocationLabel || `${city}${region ? `, ${region}` : ''}` };
  const response = property.address?.id
    ? await keystoneClient<any>(`mutation UpdatePropertyAddress($id: ID!, $data: PropertyAddressUpdateInput!) { updatePropertyAddress(where: { id: $id }, data: $data) { id city countryCode } }`, { id: property.address.id, data: fields })
    : await keystoneClient<any>(`mutation CreatePropertyAddress($data: PropertyAddressCreateInput!) { createPropertyAddress(data: $data) { id city countryCode } }`, { data: { ...fields, hostOrganization: { connect: { id: property.hostOrganization.id } }, property: { connect: { id: propertyId } }, showExactAddressPublicly: false } });
  const saved = response.success ? response.data.updatePropertyAddress || response.data.createPropertyAddress : null;
  revalidatePath(path); revalidatePath('/dashboard/platform/properties');
  if (!response.success || saved?.city !== city) backTo(path, { error: 'The address wasn’t saved. Check the fields and try again.' });
  backTo(path, { notice: 'Address saved.' });
}

const accommodationTypes = ['entire_home', 'apartment', 'cabin', 'villa', 'cottage', 'chalet', 'condo', 'townhouse', 'guesthouse', 'unique_stay'];

export async function createPropertyUnitAction(formData: FormData) {
  const propertyId = String(formData.get('propertyId') || ''); const name = String(formData.get('name') || '').trim();
  const accommodationType = String(formData.get('accommodationType') || '');
  const maxGuests = Number(formData.get('maxGuests') || NaN); const bedroomCount = Number(formData.get('bedroomCount') || NaN);
  const bedCount = Number(formData.get('bedCount') || NaN); const bathrooms = Number(formData.get('bathrooms') || NaN);
  // Bathrooms are stored in half-units: 1.5 bathrooms = 3.
  const bathroomCountHalfUnits = bathrooms * 2;
  const path = safeDetailPath('property', propertyId, '/dashboard/platform/properties');
  if (!propertyId || name.length < 2 || name.length > 120) backTo(path, { error: 'Enter a unit name (2–120 characters).' });
  if (!accommodationTypes.includes(accommodationType)) backTo(path, { error: 'Choose the unit’s accommodation type.' });
  if (!Number.isInteger(maxGuests) || maxGuests < 1 || maxGuests > 50 || !Number.isInteger(bedroomCount) || bedroomCount < 0 || bedroomCount > 30) backTo(path, { error: 'Enter sleeps 1–50 and 0–30 bedrooms.' });
  if (!Number.isInteger(bedCount) || bedCount < 1 || bedCount > 100) backTo(path, { error: 'Enter 1–100 beds.' });
  if (!Number.isInteger(bathroomCountHalfUnits) || bathroomCountHalfUnits < 1 || bathroomCountHalfUnits > 100) backTo(path, { error: 'Enter bathrooms in steps of 0.5, from 0.5 to 50.' });
  const property = await propertyAuthorityOrBack(propertyId, path);
  const response = await keystoneClient<any>(`mutation CreatePropertyUnit($data: AccommodationUnitCreateInput!) { createAccommodationUnit(data: $data) { id status } }`, { data: { hostOrganization: { connect: { id: property.hostOrganization.id } }, property: { connect: { id: propertyId } }, name, accommodationType, status: 'available', maxGuests, bedroomCount, bedCount, bathroomCountHalfUnits } });
  revalidatePath(path); revalidatePath('/dashboard/platform/properties');
  if (!response.success || !response.data.createAccommodationUnit?.id) backTo(path, { error: 'The unit wasn’t created. Try again.' });
  backTo(path, { notice: 'Unit created.' });
}

export type PropertyCreateActionState = { ok: boolean; message: string; values?: Record<string, string> };

export async function createPlatformPropertyAction(
  _previousState: PropertyCreateActionState,
  formData: FormData,
): Promise<PropertyCreateActionState> {
  const name = String(formData.get('name') || '').trim();
  const internalCode = normalizePropertyInternalCode(String(formData.get('internalCode') || ''));
  const propertyType = String(formData.get('propertyType') || 'house');
  const timezone = String(formData.get('timezone') || '').trim();
  const hostOrganizationId = String(formData.get('hostOrganizationId') || '').trim();
  // A rejected form comes back with what was entered (nonsecret fields only).
  const values = { hostOrganizationId, name, internalCode: String(formData.get('internalCode') || ''), propertyType, timezone };
  const fail = (message: string): PropertyCreateActionState => ({ ok: false, message, values });
  const allowedTypes = ['house', 'apartment_building', 'cabin', 'villa', 'cottage', 'chalet', 'condo', 'townhouse', 'unique_stay'];
  if (!hostOrganizationId) return fail('Choose the host organization this property belongs to.');
  if (name.length < 2 || name.length > 120) return fail('Property name must be between 2 and 120 characters.');
  if (!internalCode || internalCode.length > 80) return fail('Internal code is required and must be at most 80 characters.');
  if (!allowedTypes.includes(propertyType)) return fail('Choose a supported property type.');
  if (!isValidIanaTimeZone(timezone)) return fail('Use a valid IANA timezone such as America/New_York.');

  // Only a host this operator can read is accepted; the create hook still checks membership and permission.
  const host = await keystoneClient<any>(`query PropertyCreateAuthority($id: ID!) { hostOrganization(where: { id: $id }) { id status } }`, { id: hostOrganizationId });
  if (!host.success) return fail('The host organization couldn’t be checked. Try again.');
  if (!host.data.hostOrganization?.id || host.data.hostOrganization.status === 'archived') return fail('Choose a host organization you belong to.');
  const response = await keystoneClient<any>(`mutation CreatePlatformProperty($data: PropertyCreateInput!) { createProperty(data: $data) { id status } }`, { data: { hostOrganization: { connect: { id: host.data.hostOrganization.id } }, name, internalCode, propertyType, timezone, status: 'onboarding' } });
  if (!response.success || !response.data.createProperty?.id) {
    return fail('Property could not be created. Verify that the internal code is unique and try again.');
  }
  revalidatePath('/dashboard/platform/properties');
  redirect(platformDetailPath('property', response.data.createProperty.id));
}

function formValue(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

export type ReplyFormState = { message: string; body?: string; unknown?: boolean };

/**
 * Reply form action: a rejected reply comes back with its text (kept only in the form, never in
 * the URL), and an unconfirmed send says so instead of inviting a blind resend.
 */
export async function replyToConversationFormAction(_previous: ReplyFormState, formData: FormData): Promise<ReplyFormState> {
  const conversationId = formValue(formData, 'conversationId');
  const body = formValue(formData, 'body');
  const path = safeDetailPath('conversation', conversationId, '/dashboard/platform/inbox');
  const result = await runHostStayCommand('conversation_reply', { conversationId, body });
  revalidatePath(path); revalidatePath('/dashboard/platform/inbox');
  if (!result.ok) {
    return 'unknown' in result && result.unknown
      ? { message: 'We couldn’t confirm whether the reply was sent. Check the thread before sending it again.', body, unknown: true }
      : { message: result.message || 'The reply wasn’t sent.', body };
  }
  const guestCanRead = (result.data as any)?.guestCanRead !== false;
  backTo(path, { notice: guestCanRead ? 'Reply sent. The guest sees it on their private trip or inquiry page.' : 'Reply saved. The guest’s link is turned off or expired, so they can’t read it until you email them a new link.' });
  return { message: '' };
}

export async function conversationStatusAction(formData: FormData) {
  const conversationId = formValue(formData, 'conversationId');
  const status = formValue(formData, 'status');
  const path = safeDetailPath('conversation', conversationId, '/dashboard/platform/inbox');
  const result = await runHostStayCommand('conversation_status', { conversationId, status });
  revalidatePath(path); revalidatePath('/dashboard/platform/inbox');
  backTo(path, result.ok ? { notice: status === 'archived' ? 'Conversation archived.' : status === 'snoozed' ? 'Conversation snoozed.' : 'Conversation reopened.' } : { error: result.message || 'The conversation wasn’t updated.' });
}

export async function conversationLinkAction(formData: FormData) {
  const conversationId = formValue(formData, 'conversationId');
  const operation = formValue(formData, 'operation') === 'reissue' ? 'reissue' : 'revoke';
  const path = safeDetailPath('conversation', conversationId, '/dashboard/platform/inbox');
  const result = await runHostStayCommand(`conversation_link_${operation}`, { conversationId });
  revalidatePath(path);
  backTo(path, result.ok
    ? { notice: operation === 'reissue' ? 'The mail server accepted the email with a fresh link, which now works; the old link no longer does.' : 'The guest’s conversation link is turned off. Messages are kept.' }
    : { error: result.message || 'The guest link wasn’t changed.' });
}

export async function moderateReviewAction(formData: FormData) {
  const reviewId = formValue(formData, 'reviewId');
  const action = formValue(formData, 'action');
  const path = safeDetailPath('review', reviewId, '/dashboard/platform/reviews');
  const result = await runHostStayCommand('review_moderate', { reviewId, action });
  revalidatePath(path); revalidatePath('/dashboard/platform/reviews');
  backTo(path, result.ok ? { notice: action === 'publish' ? 'Review published on the listing.' : action === 'remove' ? 'Review removed from public view.' : 'Review held from publication.' } : { error: result.message || 'The review wasn’t updated.' });
}

export async function voidAgreementAction(formData: FormData) {
  const agreementId = formValue(formData, 'agreementId');
  const path = safeDetailPath('agreement', agreementId, '/dashboard/platform/agreements');
  const result = await runHostStayCommand('agreement_void', { agreementId, reason: formValue(formData, 'reason') });
  revalidatePath(path); revalidatePath('/dashboard/platform/agreements');
  backTo(path, result.ok ? { notice: 'Agreement voided. Its terms and any signature stay on record.' } : { error: result.message || 'The agreement wasn’t voided.' });
}

export type AgreementLinkState = { ok: boolean; message: string; link?: string };

/** Returns the new link once, to the operator who issued it; it is never stored in readable form. */
export async function reissueAgreementLinkAction(_previous: AgreementLinkState, formData: FormData): Promise<AgreementLinkState> {
  const agreementId = formValue(formData, 'agreementId');
  const result = await runHostStayCommand('agreement_reissue', { agreementId, postToThread: formValue(formData, 'postToThread') === 'on' });
  revalidatePath(safeDetailPath('agreement', agreementId, '/dashboard/platform/agreements'));
  if (!result.ok) return { ok: false, message: result.message || 'A new link wasn’t issued.' };
  const data = result.data as { link?: string; postedToThread?: boolean } | null;
  return {
    ok: true,
    link: data?.link,
    message: data?.postedToThread
      ? 'New signing link issued and posted to the guest’s message thread. Earlier links no longer work.'
      : 'New signing link issued. Copy it to the guest now — it isn’t shown again. Earlier links no longer work.',
  };
}
