import { resolvePublicTokenRecord } from '../utils/publicTokenAccess';
import { publicTripGuestContact } from '../utils/publicTripGuestContact';
import { publicBookingListingProjection } from '../utils/publicStayProjections';
import { publicTripGuestPartyProjection, publicTripRecordProjection } from '../utils/publicTripRecordProjection';

export async function publicTrip(_root: unknown, args: { token: string }, context: any) {
  if (!/^[a-f0-9]{48}$/.test(args.token || '')) throw new Error('Trip link is invalid.');

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
          tripTokenExpiresAt tripTokenRevokedAt bookingSnapshot
          listing {
            id title slug thumbnail
            property { checkInFrom checkInUntil checkOutBy }
          }
          guestParty { adults children infants pets }
          lineItems(orderBy: [{ createdAt: asc }]) { id lineType description serviceDate quantity unitAmountCents totalAmountCents currencyCode metadataSnapshot }
          payments(orderBy: [{ createdAt: desc }]) { id amountCents refundedAmountCents currencyCode status paymentMethod provider processedAt }
          refunds(orderBy: [{ createdAt: desc }]) { id refundNumber status reason amountCents currencyCode processedAt }
          amendments(orderBy: [{ createdAt: asc }]) { id previousCheckInDate previousCheckOutDate checkInDate checkOutDate currencyCode reason delta createdAt }
          agreement { agreementNumber status title signatureName signedAt }
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

  const snapshot = reservation.bookingSnapshot;
  const listingSnapshot = snapshot?.listing;
  const publicListingSnapshot = publicBookingListingProjection(listingSnapshot);
  const guestPartySnapshot = snapshot?.guestParty;
  const refundDueCents = (reservation.refunds || [])
    .filter((refund: any) => refund.reason === 'stay_amendment' && ['pending', 'processing', 'failed'].includes(refund.status))
    .reduce((sum: number, refund: any) => sum + refund.amountCents, 0);
  const publicTripRecord = publicTripRecordProjection(reservation);
  const { tripTokenExpiresAt: _expiresAt, tripTokenRevokedAt: _revokedAt, bookingSnapshot: _snapshot, tokenExpiresAt: _tokenExpiresAt, tokenRevokedAt: _tokenRevokedAt, ...publicReservation } = publicTripRecord;

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
    balanceDueCents: Math.max((reservation.totalAmountCents || 0) - (reservation.amountPaidCents || 0), 0),
    refundDueCents,
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
      : reservation.listing,
    guest: publicTripGuestContact(guestPartySnapshot),
    guestParty: publicTripGuestPartyProjection(guestPartySnapshot || reservation.guestParty),
    cancellationPolicy: snapshot?.cancellationPolicy || null,
  };
}
