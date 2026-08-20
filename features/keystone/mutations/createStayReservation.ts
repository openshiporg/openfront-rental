import {
  createPublicOwnershipToken,
  hashPublicOwnershipToken,
  publicTokenExpiry,
} from '../utils/publicTokenAccess';
import { createReservationLineItemsFromQuote, createStayBookingSnapshot } from '../utils/stayBookingSnapshot';
import { resolveActiveStayQuote } from '../utils/stayQuoteAccess';

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
          listing { id title slug status instantBook accommodationUnit { id maxGuests } }
        `,
      });
      return quotes[0] || null;
    },
  });
  if (!quote || quote.listing?.status !== 'published' || !quote.hostOrganization?.id || !quote.listing?.id) throw activeQuoteError();

  const tripToken = createPublicOwnershipToken();
  const agreementToken = createPublicOwnershipToken();
  const code = confirmationCode();
  const reservationId = crypto.randomUUID();
  const agreementId = crypto.randomUUID();
  const depositId = quote.securityDepositCents > 0 ? crypto.randomUUID() : null;
  const quoteSnapshot = quote.quoteSnapshot || {};
  const party = {
    primaryGuest: { name: guestName, email: guestEmail, phone: guestPhone },
    adults: quote.adults,
    children: quote.children,
    infants: quote.infants,
    pets: quote.pets,
    invitedGuests: structuredClone(invitedGuests),
  };
  const bookingSnapshot = createStayBookingSnapshot({
    listing: quoteSnapshot.listing || { id: quote.listing.id, title: quote.listing.title, slug: quote.listing.slug },
    guestParty: party,
    cancellationPolicy: quoteSnapshot.cancellationPolicy || {},
    quote: quoteSnapshot.quote || {
      quoteNumber: quote.quoteNumber,
      checkIn: quote.checkInDate,
      checkOut: quote.checkOutDate,
      numberOfNights: 0,
      lodgingSubtotalCents: quote.lodgingSubtotalCents,
      feeTotalCents: quote.feeTotalCents,
      taxTotalCents: quote.taxTotalCents,
      securityDepositCents: quote.securityDepositCents,
      totalAmountCents: quote.totalAmountCents,
      currencyCode: quote.currencyCode,
      nights: [],
      fees: [],
      taxes: [],
    },
  });
  const lineInputs = createReservationLineItemsFromQuote(reservationId, bookingSnapshot.quote);
  const now = new Date();
  const tokenHash = hashPublicOwnershipToken(args.quoteToken);

  const reservation = await withSerializableRetry<any>(() => context.prisma.$transaction(async (tx: any) => {
    // Serialize all conversions for a listing. The in-transaction overlap query
    // then provides a definitive capacity decision for the half-open stay range.
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `stay-listing:${quote.listing.id}`);

    const lockedQuote = await tx.stayQuote.findUnique({ where: { id: quote.id } });
    if (
      !lockedQuote
      || lockedQuote.tokenHash !== tokenHash
      || lockedQuote.status !== 'active'
      || lockedQuote.consumedAt
      || lockedQuote.expiresAt.getTime() <= now.getTime()
      || lockedQuote.listingId !== quote.listing.id
      || lockedQuote.hostOrganizationId !== quote.hostOrganization.id
    ) throw activeQuoteError();

    const overlap = await tx.calendarBlock.findFirst({
      where: {
        listingId: quote.listing.id,
        status: 'active',
        startDate: { lt: quote.checkOutDate },
        endDate: { gt: quote.checkInDate },
      },
      select: { id: true },
    });
    if (overlap) throw new Error('This stay became unavailable. Request a new quote for different dates.');

    const consumed = await tx.stayQuote.updateMany({
      where: { id: quote.id, tokenHash, status: 'active', consumedAt: null },
      data: { status: 'consumed', consumedAt: now },
    });
    if (consumed.count !== 1) throw activeQuoteError();

    let guest = await tx.guestProfile.findFirst({
      where: { hostOrganizationId: quote.hostOrganization.id, email: guestEmail },
    });
    if (!guest) {
      guest = await tx.guestProfile.create({
        data: {
          hostOrganizationId: quote.hostOrganization.id,
          name: guestName,
          email: guestEmail,
          phone: guestPhone,
          verificationStatus: 'unverified',
        },
      });
    }

    const created = await tx.reservation.create({
      data: {
        id: reservationId,
        hostOrganizationId: quote.hostOrganization.id,
        listingId: quote.listing.id,
        accommodationUnitId: quote.listing.accommodationUnit?.id || null,
        guestId: guest.id,
        quoteId: quote.id,
        confirmationCode: code,
        tripTokenHash: hashPublicOwnershipToken(tripToken),
        tripTokenExpiresAt: tripTokenExpiry(quote.checkOutDate),
        status: quote.listing.instantBook ? 'confirmed' : 'pending',
        paymentStatus: 'unpaid',
        source: 'direct',
        checkInDate: quote.checkInDate,
        checkOutDate: quote.checkOutDate,
        currencyCode: quote.currencyCode,
        lodgingSubtotalCents: quote.lodgingSubtotalCents,
        feeTotalCents: quote.feeTotalCents,
        taxTotalCents: quote.taxTotalCents,
        securityDepositCents: quote.securityDepositCents,
        totalAmountCents: quote.totalAmountCents,
        amountPaidCents: 0,
        bookingSnapshot,
        guestNotes,
      },
      include: { listing: { select: { id: true, title: true, slug: true } } },
    });
    if (!created?.id) throw retryableTransactionError('Reservation transaction did not commit.');

    const createdParty = await tx.guestParty.create({
      data: {
        hostOrganizationId: quote.hostOrganization.id,
        reservationId,
        primaryGuestId: guest.id,
        adults: quote.adults,
        children: quote.children,
        infants: quote.infants,
        pets: quote.pets,
        invitedGuests,
      },
    });
    if (!createdParty?.id) throw retryableTransactionError('Guest party transaction did not commit.');
    if (lineInputs.length) {
      const createdLines = await tx.reservationLineItem.createMany({
        data: lineInputs.map((line) => ({ ...line, hostOrganizationId: quote.hostOrganization.id, reservationId })),
      });
      if (createdLines?.count !== lineInputs.length) throw retryableTransactionError('Reservation line transaction did not commit.');
    }
    const createdBlock = await tx.calendarBlock.create({
      data: {
        hostOrganizationId: quote.hostOrganization.id,
        listingId: quote.listing.id,
        reservationId,
        startDate: quote.checkInDate,
        endDate: quote.checkOutDate,
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
        hostOrganizationId: quote.hostOrganization.id,
        guestId: guest.id,
        cancellationPolicyId: quoteSnapshot.cancellationPolicy?.id || null,
        agreementNumber: `AGR-${code}`,
        signingTokenHash: hashPublicOwnershipToken(agreementToken),
        signingTokenExpiresAt: publicTokenExpiry(),
        status: 'sent',
        title: `Stay terms for ${quote.listing.title}`,
        signerEmail: guestEmail,
        termsSnapshot: {
          listing: bookingSnapshot.listing,
          houseRules: bookingSnapshot.listing.houseRules || [],
          cancellationPolicy: bookingSnapshot.cancellationPolicy,
          checkInDate: quote.checkInDate,
          checkOutDate: quote.checkOutDate,
        },
      },
    });
    if (!createdAgreement?.id) throw retryableTransactionError('Stay agreement transaction did not commit.');
    if (depositId) {
      const createdDeposit = await tx.securityDeposit.create({
        data: {
          id: depositId,
          hostOrganizationId: quote.hostOrganization.id,
          depositNumber: `DEP-${code}`,
          status: 'required',
          amountCents: quote.securityDepositCents,
          currencyCode: quote.currencyCode,
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
