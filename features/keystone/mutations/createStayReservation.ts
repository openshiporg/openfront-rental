import { isDeepStrictEqual } from 'node:util';

import {
  createPublicOwnershipToken,
  hashPublicOwnershipToken,
  publicTokenExpiry,
} from '../utils/publicTokenAccess';
import { createReservationLineItemsFromQuote, createStayBookingSnapshot } from '../utils/stayBookingSnapshot';
import { assertAccommodationUnitAvailable, lockAccommodationUnitCapacity, lockListingCapacity } from '../utils/reservationAllocation';
import { createIsolatedUnverifiedBookingGuest } from '../utils/unverifiedBookingGuest';
import { assertStayWithinMaximum } from '../utils/stayPricing';
import { resolveActiveStayQuote } from '../utils/stayQuoteAccess';
import { assertStayListingMatchesSnapshot, assertStayQuoteMatchesSnapshot } from '../utils/stayQuoteIntegrity';

type CreateStayReservationArgs = {
  quoteToken: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string | null;
  invitedGuests?: Array<{ name: string; email?: string | null }> | null;
  guestNotes?: string | null;
};

function confirmationCode() {
  return `STAY-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

function tripTokenExpiry(checkOutDate: string) {
  const checkout = new Date(`${checkOutDate}T00:00:00.000Z`);
  const fallback = publicTokenExpiry();
  if (Number.isNaN(checkout.getTime())) return fallback;
  const afterTrip = new Date(checkout.getTime() + 30 * 24 * 60 * 60 * 1000);
  return afterTrip > fallback ? afterTrip : fallback;
}

function cleanRequired(value: unknown, label: string) {
  const cleaned = typeof value === 'string' ? value.trim() : '';
  if (!cleaned) throw new Error(`${label} is required.`);
  return cleaned;
}

function activeQuoteError() {
  return new Error('Stay quote is invalid, expired, or has already been used.');
}

function retryableTransactionError(message: string) {
  const error: any = new Error(message);
  error.code = 'P2034';
  return error;
}

async function withSerializableRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const retryable = error?.code === 'P2034' || /write conflict|deadlock|serialization/i.test(error?.message || '');
      if (!retryable || attempt === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function createStayReservation(_root: unknown, args: CreateStayReservationArgs, context: any) {
  const guestName = cleanRequired(args.guestName, 'Guest name');
  const guestEmail = cleanRequired(args.guestEmail, 'Guest email').toLowerCase();
  const guestPhone = args.guestPhone?.trim() || '';
  const guestNotes = args.guestNotes?.trim() || '';
  if (guestName.length > 200) throw new Error('Guest name is too long.');
  if (guestEmail.length > 320 || !/^\S+@\S+\.\S+$/.test(guestEmail)) throw new Error('Enter a valid guest email.');
  if (guestPhone.length > 64) throw new Error('Guest phone is too long.');
  if (guestNotes.length > 2000) throw new Error('Arrival notes are too long.');
  if (args.invitedGuests != null && !Array.isArray(args.invitedGuests)) throw new Error('Invited guests must be a list.');
  if ((args.invitedGuests?.length || 0) > 15) throw new Error('A stay can include at most 15 invited guests.');
  const invitedGuests = (args.invitedGuests || []).map((guest) => {
    const record = guest && typeof guest === 'object' ? guest : null;
    const name = cleanRequired(record?.name, 'Invited guest name');
    const email = typeof record?.email === 'string' ? record.email.trim().toLowerCase() : '';
    if (name.length > 200) throw new Error('Invited guest name is too long.');
    if (email && (email.length > 320 || !/^\S+@\S+\.\S+$/.test(email))) throw new Error('Enter a valid invited guest email.');
    return { name, email: email || null };
  });

  const sudo = context.sudo();
  const quote = await resolveActiveStayQuote({
    token: args.quoteToken,
    findByHash: async (tokenHash) => {
      const quotes = await sudo.query.StayQuote.findMany({
        where: { tokenHash: { equals: tokenHash } },
        take: 1,
        query: `
          id quoteNumber tokenHash status expiresAt consumedAt checkInDate checkOutDate
          adults children infants pets currencyCode lodgingSubtotalCents feeTotalCents taxTotalCents securityDepositCents totalAmountCents quoteSnapshot
          hostOrganization { id }
          ratePlan { id }
          listing { id title slug status bookingMode instantBook property { id } accommodationUnit { id maxGuests } }
        `,
      });
      return quotes[0] || null;
    },
  });
  if (!quote || quote.listing?.status !== 'published' || !quote.hostOrganization?.id || !quote.listing?.id) throw activeQuoteError();
  const { listing: originalListingSnapshot } = assertStayQuoteMatchesSnapshot(quote);
  const originalRatePlanSnapshot = originalListingSnapshot.ratePlans?.[0];
  assertStayWithinMaximum(
    quote.checkInDate,
    quote.checkOutDate,
    originalRatePlanSnapshot?.maximumStay ?? originalListingSnapshot?.maximumStay,
  );

  const tripToken = createPublicOwnershipToken();
  const agreementToken = createPublicOwnershipToken();
  const code = confirmationCode();
  const reservationId = crypto.randomUUID();
  const agreementId = crypto.randomUUID();
  const depositId = quote.securityDepositCents > 0 ? crypto.randomUUID() : null;
  const now = new Date();
  const tokenHash = hashPublicOwnershipToken(args.quoteToken);

  const reservation = await withSerializableRetry<any>(() => context.prisma.$transaction(async (tx: any) => {
    // Serialize all conversions for a listing and its physical unit, then lock
    // their current rows before accepting the guest's immutable quote evidence.
    const listingId = quote.listing.id;
    await lockListingCapacity(tx, [listingId]);
    const preloadedUnitId = quote.listing.accommodationUnit?.id || null;
    await lockAccommodationUnitCapacity(tx, [preloadedUnitId]);
    await tx.$queryRawUnsafe('SELECT "id" FROM "Listing" WHERE "id" = $1 FOR UPDATE', listingId);
    const lockedListing = await tx.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        hostOrganizationId: true,
        propertyId: true,
        accommodationUnitId: true,
        status: true,
        bookingMode: true,
        instantBook: true,
      },
    });
    await tx.$queryRawUnsafe('SELECT "id" FROM "StayQuote" WHERE "id" = $1 FOR UPDATE', quote.id);
    const lockedQuote = await tx.stayQuote.findUnique({ where: { id: quote.id } });
    if (
      !lockedQuote
      || lockedQuote.tokenHash !== tokenHash
      || lockedQuote.status !== 'active'
      || lockedQuote.consumedAt
      || lockedQuote.expiresAt.getTime() <= now.getTime()
      || lockedQuote.listingId !== listingId
      || lockedQuote.hostOrganizationId !== quote.hostOrganization.id
      || !isDeepStrictEqual(lockedQuote.quoteSnapshot, quote.quoteSnapshot)
    ) throw activeQuoteError();

    const { listing: lockedListingSnapshot } = assertStayQuoteMatchesSnapshot(lockedQuote);
    assertStayListingMatchesSnapshot(lockedListing, lockedListingSnapshot);

    const hostOrganizationId = lockedQuote.hostOrganizationId;
    const accommodationUnitId = lockedListing.accommodationUnitId;
    const checkInDate = lockedQuote.checkInDate;
    const checkOutDate = lockedQuote.checkOutDate;
    const lockedRatePlanSnapshot = lockedListingSnapshot.ratePlans[0];
    assertStayWithinMaximum(
      checkInDate,
      checkOutDate,
      lockedRatePlanSnapshot.maximumStay ?? lockedListingSnapshot.maximumStay,
    );

    const overlap = await tx.calendarBlock.findFirst({
      where: {
        listingId: lockedListing.id,
        status: 'active',
        startDate: { lt: checkOutDate },
        endDate: { gt: checkInDate },
      },
      select: { id: true },
    });
    if (overlap) throw new Error('This stay became unavailable. Request a new quote for different dates.');
    await assertAccommodationUnitAvailable(tx, {
      accommodationUnitId,
      hostOrganizationId,
      checkInDate,
      checkOutDate,
    });

    const lockedQuoteSnapshot = lockedQuote.quoteSnapshot;
    const bookingSnapshot = createStayBookingSnapshot({
      listing: lockedQuoteSnapshot.listing,
      guestParty: {
        primaryGuest: { name: guestName, email: guestEmail, phone: guestPhone },
        adults: lockedQuote.adults,
        children: lockedQuote.children,
        infants: lockedQuote.infants,
        pets: lockedQuote.pets,
        invitedGuests: structuredClone(invitedGuests),
      },
      cancellationPolicy: lockedQuoteSnapshot.cancellationPolicy,
      quote: lockedQuoteSnapshot.quote,
    });
    const lineInputs = createReservationLineItemsFromQuote(reservationId, bookingSnapshot.quote);

    const consumed = await tx.stayQuote.updateMany({
      where: { id: lockedQuote.id, tokenHash, status: 'active', consumedAt: null },
      data: { status: 'consumed', consumedAt: now },
    });
    if (consumed.count !== 1) throw activeQuoteError();

    const guest = await createIsolatedUnverifiedBookingGuest(tx, {
      hostOrganizationId,
      name: guestName,
      email: guestEmail,
      phone: guestPhone,
    });

    const created = await tx.reservation.create({
      data: {
        id: reservationId,
        hostOrganizationId,
        listingId: lockedListing.id,
        accommodationUnitId,
        guestId: guest.id,
        quoteId: lockedQuote.id,
        confirmationCode: code,
        tripTokenHash: hashPublicOwnershipToken(tripToken),
        tripTokenExpiresAt: tripTokenExpiry(checkOutDate),
        status: lockedListing.instantBook ? 'confirmed' : 'pending',
        paymentStatus: 'unpaid',
        source: 'direct',
        checkInDate,
        checkOutDate,
        currencyCode: lockedQuote.currencyCode,
        lodgingSubtotalCents: lockedQuote.lodgingSubtotalCents,
        feeTotalCents: lockedQuote.feeTotalCents,
        taxTotalCents: lockedQuote.taxTotalCents,
        securityDepositCents: lockedQuote.securityDepositCents,
        totalAmountCents: lockedQuote.totalAmountCents,
        amountPaidCents: 0,
        bookingSnapshot,
        guestNotes,
      },
      include: { listing: { select: { id: true, title: true, slug: true } } },
    });
    if (!created?.id) throw retryableTransactionError('Reservation transaction did not commit.');

    const createdParty = await tx.guestParty.create({
      data: {
        hostOrganizationId,
        reservationId,
        primaryGuestId: guest.id,
        adults: lockedQuote.adults,
        children: lockedQuote.children,
        infants: lockedQuote.infants,
        pets: lockedQuote.pets,
        invitedGuests,
      },
    });
    if (!createdParty?.id) throw retryableTransactionError('Guest party transaction did not commit.');
    if (lineInputs.length) {
      const createdLines = await tx.reservationLineItem.createMany({
        data: lineInputs.map((line) => ({ ...line, hostOrganizationId, reservationId })),
      });
      if (createdLines?.count !== lineInputs.length) throw retryableTransactionError('Reservation line transaction did not commit.');
    }
    const createdBlock = await tx.calendarBlock.create({
      data: {
        hostOrganizationId,
        listingId: lockedListing.id,
        reservationId,
        startDate: checkInDate,
        endDate: checkOutDate,
        reason: 'reservation',
        status: 'active',
        source: 'direct',
        notes: `Direct booking ${code}`,
      },
    });
    if (!createdBlock?.id) throw retryableTransactionError('Calendar capacity transaction did not commit.');

    const createdAgreement = await tx.stayAgreement.create({
      data: {
        id: agreementId,
        hostOrganizationId,
        guestId: guest.id,
        cancellationPolicyId: lockedQuoteSnapshot.cancellationPolicy?.id || null,
        agreementNumber: `AGR-${code}`,
        signingTokenHash: hashPublicOwnershipToken(agreementToken),
        signingTokenExpiresAt: publicTokenExpiry(),
        status: 'sent',
        title: `Stay terms for ${lockedQuoteSnapshot.listing.title}`,
        signerEmail: guestEmail,
        termsSnapshot: {
          listing: bookingSnapshot.listing,
          houseRules: bookingSnapshot.listing.houseRules || [],
          cancellationPolicy: bookingSnapshot.cancellationPolicy,
          checkInDate,
          checkOutDate,
        },
      },
    });
    if (!createdAgreement?.id) throw retryableTransactionError('Stay agreement transaction did not commit.');
    if (depositId) {
      const createdDeposit = await tx.securityDeposit.create({
        data: {
          id: depositId,
          hostOrganizationId,
          depositNumber: `DEP-${code}`,
          status: 'required',
          amountCents: lockedQuote.securityDepositCents,
          currencyCode: lockedQuote.currencyCode,
        },
      });
      if (!createdDeposit?.id) throw retryableTransactionError('Security deposit transaction did not commit.');
    }
    const linkedReservation = await tx.reservation.update({
      where: { id: reservationId },
      data: { agreementId, securityDepositId: depositId },
    });
    if (!linkedReservation?.id) throw retryableTransactionError('Reservation relationship transaction did not commit.');
    return created;
  }, { maxWait: 5000, timeout: 15000, isolationLevel: 'Serializable' }));

  return {
    id: reservation.id,
    confirmationCode: reservation.confirmationCode,
    status: reservation.status,
    paymentStatus: reservation.paymentStatus,
    checkInDate: reservation.checkInDate,
    checkOutDate: reservation.checkOutDate,
    currencyCode: reservation.currencyCode,
    totalAmountCents: reservation.totalAmountCents,
    listing: reservation.listing,
    tripToken,
    agreementToken,
  };
}
