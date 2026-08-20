'use server';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';

async function workspaceQuery<T>(query: string) {
  const response = await keystoneClient<T>(query);
  return response.success ? { data: response.data, error: null } : { data: null, error: response.error };
}

export async function getPropertyReadinessWorkspace() {
  return workspaceQuery<any>(`query PropertyReadinessWorkspace {
    properties(orderBy: [{ name: asc }], take: 150) {
      id name internalCode propertyType status timezone registrationNumber checkInFrom checkOutBy
      address { publicLocationLabel city region countryCode }
      units(take: 50) { id name status maxGuests bedroomCount }
      listings(take: 50) { id title status }
      tasks(where: { status: { notIn: ["completed", "cancelled"] } }, take: 50) { id title status priority dueAt }
    }
  }`);
}

export async function getListingReadinessWorkspace() {
  return workspaceQuery<any>(`query ListingReadinessWorkspace {
    listings(orderBy: [{ title: asc }], take: 150) {
      id title slug subtitle description status bookingMode instantBook currencyCode baseNightlyRateCents minimumStay maximumStay advanceNoticeHours bookingWindowDays
      property { id name status registrationNumber address { publicLocationLabel } }
      accommodationUnit { id name status maxGuests }
      media(take: 20) { id }
      amenities(take: 50) { id name }
      ratePlans(take: 20) { id name status baseNightlyRateCents }
      channelListings(take: 20) { id status externalListingId channelConnection { id name provider status } }
    }
  }`);
}

export async function getGuestWorkspace() {
  return workspaceQuery<any>(`query GuestWorkspace {
    guestProfiles(orderBy: [{ updatedAt: desc }], take: 200) {
      id name email phone preferredLanguage verificationStatus marketingConsent updatedAt
      reservations(orderBy: [{ checkInDate: desc }], take: 20) { id confirmationCode status checkInDate checkOutDate totalAmountCents currencyCode listing { title } }
      conversations(where: { status: { equals: "open" } }, take: 20) { id subject status lastMessageAt }
    }
  }`);
}

export async function getAgreementWorkspace() {
  return workspaceQuery<any>(`query AgreementWorkspace {
    stayAgreements(orderBy: [{ createdAt: desc }], take: 200) {
      id agreementNumber title status signerEmail signedAt signingTokenExpiresAt signingTokenRevokedAt createdAt
      guest { id name verificationStatus }
      reservation { id confirmationCode status checkInDate checkOutDate listing { title } }
    }
  }`);
}

export async function getPricingWorkspace() {
  return workspaceQuery<any>(`query PricingWorkspace {
    listings(orderBy: [{ title: asc }], take: 150) { id title status currencyCode baseNightlyRateCents minimumStay bookingWindowDays ratePlans(take: 50) { id } }
    ratePlans(orderBy: [{ name: asc }], take: 250) {
      id name status currencyCode baseNightlyRateCents minimumStay maximumStay advanceNoticeHours bookingWindowDays isDefault
      listing { id title status baseNightlyRateCents }
      cancellationPolicy { id name }
      seasonalRates(orderBy: [{ startDate: asc }], take: 50) { id name startDate endDate nightlyRateCents adjustmentBasisPoints minimumStay priority isActive }
    }
  }`);
}

export async function getInboxWorkspace() {
  return workspaceQuery<any>(`query InboxWorkspace {
    conversations(orderBy: [{ lastMessageAt: desc }], take: 200) {
      id subject status lastMessageAt externalThreadId
      guest { id name verificationStatus }
      listing { id title }
      reservation { id confirmationCode status checkInDate checkOutDate }
      channelConnection { id name provider status }
      messages(orderBy: [{ createdAt: desc }], take: 5) { id direction senderType body status sentAt receivedAt createdAt }
    }
  }`);
}

export async function getPaymentWorkspace() {
  return workspaceQuery<any>(`query PaymentWorkspace {
    paymentProviders(orderBy: [{ name: asc }], take: 50) { id name code isInstalled metadata }
    payments(orderBy: [{ createdAt: desc }], take: 250) {
      id amountCents refundedAmountCents currencyCode status paymentMethod provider providerPaymentId processedAt errorMessage createdAt
      paymentProvider { id name code isInstalled }
      reservation { id confirmationCode status guest { name } listing { title } }
      refunds(orderBy: [{ createdAt: desc }], take: 20) { id refundNumber status reason amountCents currencyCode providerRefundId processedAt createdAt }
    }
  }`);
}

export async function getReviewWorkspace() {
  return workspaceQuery<any>(`query ReviewWorkspace {
    reviews(orderBy: [{ createdAt: desc }], take: 250) {
      id direction status overallRating cleanlinessRating accuracyRating communicationRating locationRating valueRating body privateFeedback submittedAt publishAfter publishedAt createdAt
      guest { id name }
      listing { id title }
      reservation { id confirmationCode status checkOutDate }
    }
    listings(orderBy: [{ reviewAverageHundredths: asc }], take: 100) { id title status reviewAverageHundredths reviewCount }
  }`);
}
