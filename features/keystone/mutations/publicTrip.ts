import crypto from 'node:crypto';

import { cancellationEntitlement } from '../utils/cancellationEntitlement';
import { GUEST_THREAD_MESSAGE_QUERY, GUEST_THREAD_PAGE_SIZE, guestThreadCursor, guestThreadPage, guestVisibleMessageWhere } from '../utils/guestThread';
import { resolvePublicTokenRecord } from '../utils/publicTokenAccess';
import { publicTripGuestContact } from '../utils/publicTripGuestContact';
import { publicBookingListingProjection } from '../utils/publicStayProjections';
import { publicTripGuestPartyProjection, publicTripRecordProjection } from '../utils/publicTripRecordProjection';

const PROPERTY_ARRIVAL_QUERY = `
  checkInFrom checkInUntil checkOutBy timezone arrivalInstructions
  address { addressLine1 addressLine2 city region postalCode countryCode }
`;

/** Identity of the party a guest is looking at, so a change request can't act on a stale view. */
function partyVersion(party: any) {
  const counts = publicTripGuestPartyProjection(party);
  return counts ? crypto.createHash('sha256').update(JSON.stringify([counts, party?.updatedAt || null])).digest('hex').slice(0, 16) : null;
}

export async function publicTrip(_root: unknown, args: { token: string; messagesBefore?: string | null }, context: any) {
  if (!/^[a-f0-9]{48}$/.test(args.token || '')) throw new Error('Trip link is invalid.');
  const messagesBefore = guestThreadCursor(args.messagesBefore);

  const reservation = await resolvePublicTokenRecord({
    token: args.token,
    invalidMessage: 'Trip link is invalid.',
    findRecordByHash: async (tokenHash) => {
      const reservations = await context.sudo().query.Reservation.findMany({
        where: { tripTokenHash: { equals: tokenHash } },
        take: 1,
        query: `
          id confirmationCode status paymentStatus source checkInDate checkOutDate
          scheduledCheckInTime scheduledCheckOutTime checkedInAt checkedOutAt cancelledAt
          currencyCode lodgingSubtotalCents feeTotalCents taxTotalCents discountTotalCents securityDepositCents totalAmountCents amountPaidCents
          tripTokenExpiresAt tripTokenRevokedAt bookingSnapshot testMode fixtureOrigin createdAt
          listing {
            id title slug thumbnail
            property { ${PROPERTY_ARRIVAL_QUERY} }
          }
          accommodationUnit { property { ${PROPERTY_ARRIVAL_QUERY} } }
          bookedBy { id }
          conversation { id messages(where: ${guestVisibleMessageWhere(messagesBefore)}, orderBy: [{ createdAt: desc }, { id: desc }], take: ${GUEST_THREAD_PAGE_SIZE + 1}) { ${GUEST_THREAD_MESSAGE_QUERY} } }
          reviews(where: { direction: { equals: "guest_to_host" } }, take: 1) { status overallRating submittedAt }
          damageClaims(orderBy: [{ createdAt: asc }], take: 20) { claimNumber status description claimedAmountCents approvedAmountCents currencyCode submittedAt resolvedAt }
          guestParty { adults children infants pets updatedAt }
          lineItems(orderBy: [{ createdAt: asc }]) { id lineType description serviceDate quantity unitAmountCents totalAmountCents currencyCode metadataSnapshot }
          payments(orderBy: [{ createdAt: desc }]) { id amountCents refundedAmountCents currencyCode status paymentMethod provider processedAt }
          refunds(orderBy: [{ createdAt: desc }]) { id refundNumber status reason amountCents currencyCode processedAt }
          amendments(orderBy: [{ createdAt: asc }]) { id previousCheckInDate previousCheckOutDate checkInDate checkOutDate currencyCode reason delta createdAt beforeSnapshot afterSnapshot }
          agreement { agreementNumber status title signatureName signedAt signatureEvidence }
          securityDeposit { id depositNumber status amountCents capturedAmountCents currencyCode heldAt releasedAt }
        `,
      });
      const record = reservations[0];
      return record
        ? {
            ...record,
            tokenExpiresAt: record.tripTokenExpiresAt,
            tokenRevokedAt: record.tripTokenRevokedAt,
          }
        : null;
    },
  });
  if (!reservation) return null;

  // Party changes the host recorded after booking (append-only events): dates and counts only.
  const partyEvents = await context.prisma.outboxEvent.findMany({
    where: { aggregateType: 'Reservation', aggregateId: reservation.id, eventType: 'reservation.party_changed' },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: 20,
    select: { createdAt: true, payload: true },
  });

  const snapshot = reservation.bookingSnapshot;
  const listingSnapshot = snapshot?.listing;
  const publicListingSnapshot = publicBookingListingProjection(listingSnapshot);
  const guestPartySnapshot = snapshot?.guestParty;
  // Every open refund liability is money owed to the guest, whatever created it. A refund
  // under the host's review is not owed yet; it is shown apart, as the amount under review.
  const refundDueCents = (reservation.refunds || [])
    .filter((refund: any) => ['pending', 'processing', 'failed'].includes(refund.status))
    .reduce((sum: number, refund: any) => sum + refund.amountCents, 0);
  const refundReviewCents = (reservation.refunds || [])
    .filter((refund: any) => refund.status === 'review')
    .reduce((sum: number, refund: any) => sum + refund.amountCents, 0);
  const publicTripRecord = publicTripRecordProjection(reservation);
  const {
    tripTokenExpiresAt: _expiresAt, tripTokenRevokedAt: _revokedAt, bookingSnapshot: _snapshot, tokenExpiresAt: _tokenExpiresAt, tokenRevokedAt: _tokenRevokedAt,
    bookedBy: _bookedBy, damageClaims: _damageClaims, fixtureOrigin: _fixtureOrigin, listing: _liveListing, accommodationUnit: _unit, createdAt: _createdAt, payments: rawPayments, ...publicReservation
  } = publicTripRecord as Record<string, any>;
  // Arrival follows the home the stay is allocated to now (it can be re-accommodated);
  // the purchased listing stays in the booking snapshot.
  const liveProperty = reservation.accommodationUnit?.property || reservation.listing?.property || null;
  // Exact address and entry details are released only to a confirmed or in-progress stay.
  const arrival = ['confirmed', 'in_stay'].includes(reservation.status) && liveProperty
    ? {
        address: liveProperty.address
          ? {
              addressLine1: liveProperty.address.addressLine1 || null,
              addressLine2: liveProperty.address.addressLine2 || null,
              city: liveProperty.address.city || null,
              region: liveProperty.address.region || null,
              postalCode: liveProperty.address.postalCode || null,
              countryCode: liveProperty.address.countryCode || null,
            }
          : null,
        instructions: liveProperty.arrivalInstructions?.trim() || null,
        checkInFrom: liveProperty.checkInFrom || null,
        checkInUntil: liveProperty.checkInUntil || null,
        checkOutBy: liveProperty.checkOutBy || null,
        timezone: liveProperty.timezone || null,
      }
    : null;
  const guestReview = reservation.reviews?.[0] || null;
  const sessionUserId = context.session?.data?.isActive === true ? context.session?.itemId : null;
  const fallbackListing = reservation.listing
    ? {
        id: reservation.listing.id,
        title: reservation.listing.title,
        slug: reservation.listing.slug,
        thumbnail: reservation.listing.thumbnail,
        property: liveProperty ? { checkInFrom: liveProperty.checkInFrom, checkInUntil: liveProperty.checkInUntil, checkOutBy: liveProperty.checkOutBy, timezone: liveProperty.timezone } : null,
      }
    : null;

  return {
    ...publicReservation,
    checkInDate: reservation.checkInDate,
    checkOutDate: reservation.checkOutDate,
    currencyCode: reservation.currencyCode,
    lodgingSubtotalCents: reservation.lodgingSubtotalCents,
    feeTotalCents: reservation.feeTotalCents,
    taxTotalCents: reservation.taxTotalCents,
    securityDepositCents: reservation.securityDepositCents,
    totalAmountCents: reservation.totalAmountCents,
    balanceDueCents: reservation.status === 'cancelled' ? 0 : Math.max((reservation.totalAmountCents || 0) - (reservation.amountPaidCents || 0), 0),
    refundDueCents,
    refundReviewCents,
    listing: listingSnapshot
      ? {
          id: listingSnapshot.id,
          title: listingSnapshot.title,
          slug: listingSnapshot.slug,
          thumbnail: listingSnapshot.thumbnail || listingSnapshot.media?.[0]?.url,
          host: listingSnapshot.host,
          property: publicListingSnapshot?.property || null,
          accommodation: listingSnapshot.accommodation,
          houseRules: listingSnapshot.houseRules || [],
        }
      : fallbackListing,
    arrival,
    ...(() => {
      const page = guestThreadPage(reservation.conversation?.messages);
      return { messages: page.messages, earlierMessagesBefore: page.earlierMessagesBefore };
    })(),
    testMode: reservation.testMode === true,
    // A setup sample stay: its money, deposit and any "signature" were recorded by setup.
    sample: Boolean(reservation.fixtureOrigin),
    // Each dated change with its total before and after and the addendum's real acceptance
    // state: the guest's acceptance of a change is never assumed from the original signature.
    amendments: (reservation.amendments || []).map((amendment: any) => ({
      id: amendment.id,
      previousCheckInDate: amendment.previousCheckInDate,
      previousCheckOutDate: amendment.previousCheckOutDate,
      checkInDate: amendment.checkInDate,
      checkOutDate: amendment.checkOutDate,
      createdAt: amendment.createdAt,
      currencyCode: amendment.currencyCode,
      totalBeforeCents: Number.isSafeInteger(amendment.beforeSnapshot?.amounts?.totalAmountCents) ? amendment.beforeSnapshot.amounts.totalAmountCents : null,
      totalAfterCents: Number.isSafeInteger(amendment.afterSnapshot?.amounts?.totalAmountCents) ? amendment.afterSnapshot.amounts.totalAmountCents : null,
      guestAcceptance: amendment.afterSnapshot?.agreementAddendum?.guestAcceptance || 'not_recorded',
    })),
    agreement: publicReservation.agreement ? (() => {
      const { signatureEvidence, ...agreement } = reservation.agreement || {};
      // Only a signature made through the signing link is a guest's; a sample's earlier one isn't.
      const signedBySetup = Boolean(reservation.fixtureOrigin) && agreement.status === 'signed' && signatureEvidence?.via !== 'signing_link';
      return signedBySetup ? { ...publicReservation.agreement, signatureName: null, signedAt: null, signedBySetup } : { ...publicReservation.agreement, signedBySetup: false };
    })() : null,
    payments: (rawPayments || []).map((payment: any) => ({ ...payment, isTest: payment.provider === 'pp_stripe_stripe' })),
    cancellationPreview: ['pending', 'confirmed'].includes(reservation.status)
      ? cancellationEntitlement({
          bookingSnapshot: snapshot,
          checkInDate: reservation.checkInDate,
          checkOutDate: reservation.checkOutDate,
          totalAmountCents: reservation.totalAmountCents,
          bookedAt: reservation.createdAt,
          cancelledAt: new Date(),
          netPaidCents: reservation.amountPaidCents || 0,
        })
      : null,
    review: guestReview ? { status: guestReview.status, overallRating: guestReview.overallRating, submittedAt: guestReview.submittedAt } : null,
    canReview: reservation.status === 'completed' && !guestReview,
    damageClaims: (reservation.damageClaims || [])
      .filter((claim: any) => claim.status !== 'draft')
      .map((claim: any) => ({
        claimNumber: claim.claimNumber,
        status: claim.status,
        description: claim.description,
        claimedAmountCents: claim.claimedAmountCents,
        approvedAmountCents: claim.approvedAmountCents,
        currencyCode: claim.currencyCode,
        submittedAt: claim.submittedAt,
        resolvedAt: claim.resolvedAt,
      })),
    account: {
      linked: Boolean(reservation.bookedBy?.id),
      linkedToYou: Boolean(sessionUserId && reservation.bookedBy?.id === sessionUserId),
      signedIn: Boolean(sessionUserId),
    },
    guest: publicTripGuestContact(guestPartySnapshot),
    // The party now on record (after any host change) and, separately, the party as booked.
    guestParty: publicTripGuestPartyProjection(reservation.guestParty || guestPartySnapshot),
    bookedGuestParty: publicTripGuestPartyProjection(guestPartySnapshot),
    partyVersion: partyVersion(reservation.guestParty || guestPartySnapshot),
    partyChanges: partyEvents.map((event: any) => ({
      at: event.createdAt,
      previous: publicTripGuestPartyProjection(event.payload?.previous),
      next: publicTripGuestPartyProjection(event.payload?.next),
    })),
    cancellationPolicy: snapshot?.cancellationPolicy || null,
  };
}
