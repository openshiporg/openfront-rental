import { resolvePublicTokenRecord } from '../utils/publicTokenAccess';

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
          scheduledCheckInTime scheduledCheckOutTime checkedInAt checkedOutAt cancelledAt cancellationReason
          currencyCode lodgingSubtotalCents feeTotalCents taxTotalCents discountTotalCents securityDepositCents totalAmountCents amountPaidCents
          tripTokenExpiresAt tripTokenRevokedAt bookingSnapshot guestNotes
          listing {
            id title slug thumbnail
            property { checkInFrom checkInUntil checkOutBy address { addressLine1 addressLine2 city region postalCode countryCode publicLocationLabel } }
          }
          guest { id name email phone verificationStatus }
          guestParty { adults children infants pets invitedGuests }
          lineItems(orderBy: [{ createdAt: asc }]) { id lineType description serviceDate quantity unitAmountCents totalAmountCents currencyCode metadataSnapshot }
          payments(orderBy: [{ createdAt: desc }]) { id amountCents refundedAmountCents currencyCode status paymentMethod provider processedAt }
          refunds(orderBy: [{ createdAt: desc }]) { id refundNumber status reason amountCents currencyCode processedAt }
          agreement { id agreementNumber status title signerEmail signatureName signedAt }
          securityDeposit { id depositNumber status amountCents capturedAmountCents currencyCode heldAt releasedAt }
          conversation {
            id status
            messages(orderBy: [{ createdAt: asc }]) { id direction senderType body status sentAt receivedAt }
          }
          reviews(orderBy: [{ createdAt: asc }]) { id direction status overallRating body submittedAt publishedAt }
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
  const guestPartySnapshot = snapshot?.guestParty;
  const quoteSnapshot = snapshot?.quote;
  const { tripTokenExpiresAt: _expiresAt, tripTokenRevokedAt: _revokedAt, bookingSnapshot: _snapshot, tokenExpiresAt: _tokenExpiresAt, tokenRevokedAt: _tokenRevokedAt, ...publicReservation } = reservation;

  return {
    ...publicReservation,
    checkInDate: quoteSnapshot?.checkIn || reservation.checkInDate,
    checkOutDate: quoteSnapshot?.checkOut || reservation.checkOutDate,
    currencyCode: quoteSnapshot?.currencyCode || reservation.currencyCode,
    lodgingSubtotalCents: quoteSnapshot?.lodgingSubtotalCents ?? reservation.lodgingSubtotalCents,
    feeTotalCents: quoteSnapshot?.feeTotalCents ?? reservation.feeTotalCents,
    taxTotalCents: quoteSnapshot?.taxTotalCents ?? reservation.taxTotalCents,
    securityDepositCents: quoteSnapshot?.securityDepositCents ?? reservation.securityDepositCents,
    totalAmountCents: quoteSnapshot?.totalAmountCents ?? reservation.totalAmountCents,
    listing: listingSnapshot
      ? {
          id: listingSnapshot.id,
          title: listingSnapshot.title,
          slug: listingSnapshot.slug,
          thumbnail: listingSnapshot.thumbnail || listingSnapshot.media?.[0]?.url,
          host: listingSnapshot.host,
          property: listingSnapshot.property,
          accommodation: listingSnapshot.accommodation,
          houseRules: listingSnapshot.houseRules || [],
        }
      : reservation.listing,
    guestParty: guestPartySnapshot || reservation.guestParty,
    cancellationPolicy: snapshot?.cancellationPolicy || null,
  };
}
