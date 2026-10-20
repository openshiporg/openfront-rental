import crypto from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

import {
  createPublicOwnershipToken,
  hashPublicOwnershipToken,
  isPublicOwnershipTokenActive,
  publicTokenExpiry,
} from '../utils/publicTokenAccess';
import { resolveSessionSecret } from '../lib/runtimeSecrets';
import { enqueueOutboxEvent } from '../utils/outbox';
import { createReservationTasksForTransition } from '../utils/reservationTaskAutomation';
import { createReservationLineItemsFromQuote, createStayBookingSnapshot, stayTermsVersion } from '../utils/stayBookingSnapshot';
import { assertAccommodationUnitAvailable, lockAccommodationUnitCapacity, lockListingCapacity } from '../utils/reservationAllocation';
import { createIsolatedUnverifiedBookingGuest } from '../utils/unverifiedBookingGuest';
import { assertStayWithinMaximum } from '../utils/stayPricing';
import { assertStayArrivalAllowed, listingArrivalContext } from '../utils/stayBookingRules';
import { resolveActiveStayQuote } from '../utils/stayQuoteAccess';
import { assertStayListingMatchesSnapshot, assertStayQuoteMatchesSnapshot } from '../utils/stayQuoteIntegrity';
import { listingSellabilityProblem } from '../utils/stayEligibility';
import { assertStorefrontSelling, readStorefrontSales } from '../utils/storefrontSales';
import { stripeCheckoutEnabled } from '../../integrations/payment/stripe';
import { REAL_CAPACITY_BLOCK } from '../utils/fixtureOrigin';

type CreateStayReservationArgs = {
  quoteToken: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string | null;
  invitedGuests?: Array<{ name: string; email?: string | null }> | null;
  guestNotes?: string | null;
  /** The terms version shown at checkout and accepted by the guest (see stayTermsVersion). */
  acceptedTermsVersion?: string | null;
  /** The store's published terms-of-use version the guest accepted (required while published). */
  acceptedStoreTermsVersion?: string | null;
  /** The store's privacy policy version shown at checkout: a notice, not consent. */
  privacyNoticeVersion?: string | null;
  /** The guest explicitly chose a test booking (store permission and Stripe test mode required). */
  simulation?: boolean | null;
  /** Per-checkout secret: a retry with it returns the booking already made, never a second one. */
  receiptKey?: string | null;
};

const RECEIPT_RECOVERY_MS = 24 * 60 * 60 * 1000;
// Conversion evidence version that binds a receipt key to the request and the session.
const CONVERSION_VERSION = 2;

class CheckoutReplayError extends Error {}

/**
 * Trip and agreement links for a checkout that sent a receipt key are derived from that
 * key, the quote and the server secret, so a retry after a lost response can return the
 * same links without rotating them or exposing the consumed quote.
 */
function derivedOwnershipToken(kind: 'trip' | 'agreement', receiptKey: string, quoteTokenHash: string) {
  return crypto.createHmac('sha256', resolveSessionSecret()).update(`stay-receipt:${kind}:${quoteTokenHash}:${receiptKey}`).digest('hex').slice(0, 48);
}

function receiptKeyHash(receiptKey: string) {
  return crypto.createHash('sha256').update(`stay-receipt-key:${receiptKey}`).digest('hex');
}

function reservationResult(reservation: any, tripToken: string, agreementToken: string | null, recovered = false) {
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
    recovered,
    testMode: reservation.testMode === true,
  };
}

/** Normalized request identity: a replay must repeat the same body, from the same session. */
function requestFingerprint(input: Record<string, unknown>) {
  return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

/**
 * Returns the receipt for a quote this same checkout already converted (within 24 hours).
 * The key must match, the session must be the one that booked, a body (when replayed)
 * must be identical, and only links still live and unchanged since booking are returned.
 * It never creates a booking.
 */
async function recoverConvertedCheckout(
  context: any,
  quoteTokenHash: string,
  receiptKey: string,
  expected: { actorUserId: string | null; fingerprint?: string },
) {
  const quote = await context.prisma.stayQuote.findUnique({ where: { tokenHash: quoteTokenHash }, select: { id: true, status: true, consumedAt: true } });
  if (!quote || quote.status !== 'consumed' || !quote.consumedAt || Date.now() - quote.consumedAt.getTime() > RECEIPT_RECOVERY_MS) return null;
  const reservation = await context.prisma.reservation.findFirst({
    where: { quoteId: quote.id },
    include: { listing: { select: { id: true, title: true, slug: true } } },
  });
  const conversion = reservation?.bookingSnapshot?.conversion;
  if (!reservation || conversion?.version !== CONVERSION_VERSION || conversion.receiptKeyHash !== receiptKeyHash(receiptKey)) return null;
  if ((conversion.actorUserId ?? null) !== expected.actorUserId) {
    throw new CheckoutReplayError('This booking was made in a different session. Use Find my trip with your confirmation code and email.');
  }
  if (expected.fingerprint && conversion.requestFingerprint !== expected.fingerprint) {
    throw new CheckoutReplayError('This checkout was already submitted with different details. Use Find my trip with your confirmation code and email.');
  }
  const tripToken = derivedOwnershipToken('trip', receiptKey, quoteTokenHash);
  // A reissued, revoked or expired trip link is never handed out again from the receipt.
  if (reservation.tripTokenHash !== hashPublicOwnershipToken(tripToken)
    || !isPublicOwnershipTokenActive({ tokenExpiresAt: reservation.tripTokenExpiresAt, tokenRevokedAt: reservation.tripTokenRevokedAt })) return null;
  const agreementToken = derivedOwnershipToken('agreement', receiptKey, quoteTokenHash);
  const agreement = reservation.agreementId
    ? await context.prisma.stayAgreement.findUnique({ where: { id: reservation.agreementId }, select: { signingTokenHash: true, signingTokenExpiresAt: true, signingTokenRevokedAt: true } })
    : null;
  const agreementLive = Boolean(agreement && agreement.signingTokenHash === hashPublicOwnershipToken(agreementToken)
    && isPublicOwnershipTokenActive({ tokenExpiresAt: agreement.signingTokenExpiresAt, tokenRevokedAt: agreement.signingTokenRevokedAt }));
  return reservationResult(reservation, tripToken, agreementLive ? agreementToken : null, true);
}

function sessionActorId(context: any) {
  return typeof context.session?.itemId === 'string' ? context.session.itemId : null;
}

function validReceiptKey(value: unknown) {
  return typeof value === 'string' && /^[a-f0-9]{32,64}$/.test(value) ? value : null;
}

/** Narrow receipt route for a consumed quote: the same browser's key and session only. */
export async function recoverStayCheckout(_root: unknown, args: { quoteToken: string; receiptKey: string }, context: any) {
  const receiptKey = validReceiptKey(args.receiptKey);
  if (!receiptKey || typeof args.quoteToken !== 'string' || !args.quoteToken) return null;
  try {
    return await recoverConvertedCheckout(context, hashPublicOwnershipToken(args.quoteToken), receiptKey, { actorUserId: sessionActorId(context) });
  } catch (error) {
    if (error instanceof CheckoutReplayError) return null;
    throw error;
  }
}

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
  const acceptedTermsVersion = typeof args.acceptedTermsVersion === 'string' ? args.acceptedTermsVersion.trim() : '';
  if (!acceptedTermsVersion) throw new Error('Review and accept the stay terms before reserving.');
  const acceptedStoreTermsVersion = typeof args.acceptedStoreTermsVersion === 'string' ? args.acceptedStoreTermsVersion.trim().slice(0, 60) : '';
  const privacyNoticeVersion = typeof args.privacyNoticeVersion === 'string' ? args.privacyNoticeVersion.trim().slice(0, 60) : '';
  const simulation = args.simulation === true;
  const receiptKey = validReceiptKey(args.receiptKey);
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
  const tokenHash = hashPublicOwnershipToken(args.quoteToken);
  const sessionUserId = sessionActorId(context);
  const fingerprint = requestFingerprint({
    quote: tokenHash, guestName, guestEmail, guestPhone, guestNotes, invitedGuests,
    acceptedTermsVersion, acceptedStoreTermsVersion, privacyNoticeVersion, simulation, actor: sessionUserId,
  });
  const recover = async () => receiptKey
    ? recoverConvertedCheckout(context, tokenHash, receiptKey, { actorUserId: sessionUserId, fingerprint })
    : null;
  if (!quote) {
    const recovered = await recover();
    if (recovered) return recovered;
  }
  if (!quote || quote.listing?.status !== 'published' || !quote.hostOrganization?.id || !quote.listing?.id) throw activeQuoteError();
  const { listing: originalListingSnapshot } = assertStayQuoteMatchesSnapshot(quote);
  const originalRatePlanSnapshot = originalListingSnapshot.ratePlans?.[0];
  assertStayWithinMaximum(
    quote.checkInDate,
    quote.checkOutDate,
    originalRatePlanSnapshot?.maximumStay ?? originalListingSnapshot?.maximumStay,
  );
  // Notice and booking window are judged at conversion, not only when the quote was issued.
  assertStayArrivalAllowed(quote.checkInDate, listingArrivalContext(originalListingSnapshot, originalRatePlanSnapshot));

  const tripToken = receiptKey ? derivedOwnershipToken('trip', receiptKey, tokenHash) : createPublicOwnershipToken();
  const agreementToken = receiptKey ? derivedOwnershipToken('agreement', receiptKey, tokenHash) : createPublicOwnershipToken();
  const code = confirmationCode();
  const reservationId = crypto.randomUUID();
  const agreementId = crypto.randomUUID();
  const depositId = quote.securityDepositCents > 0 ? crypto.randomUUID() : null;
  const now = new Date();

  let reservation: any;
  try {
    reservation = await withSerializableRetry<any>(() => context.prisma.$transaction(async (tx: any) => {
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
      if (acceptedTermsVersion !== stayTermsVersion(lockedQuote.quoteSnapshot)) {
        throw new Error('The stay terms changed. Review them again before reserving.');
      }
      // An earlier quote never outlives a sale pause or a parent taken off sale: the storefront,
      // host, property and unit are share-locked and read now, so a concurrent pause either
      // waits for this booking or is seen by it.
      const sales = await readStorefrontSales(tx, { lock: true });
      assertStorefrontSelling(sales);
      await tx.$queryRawUnsafe('SELECT "id" FROM "HostOrganization" WHERE "id" = $1 FOR SHARE', lockedListing.hostOrganizationId);
      if (lockedListing.propertyId) await tx.$queryRawUnsafe('SELECT "id" FROM "Property" WHERE "id" = $1 FOR SHARE', lockedListing.propertyId);
      if (lockedListing.accommodationUnitId) await tx.$queryRawUnsafe('SELECT "id" FROM "AccommodationUnit" WHERE "id" = $1 FOR SHARE', lockedListing.accommodationUnitId);
      const [currentHost, currentProperty, currentUnit] = await Promise.all([
        tx.hostOrganization.findUnique({ where: { id: lockedListing.hostOrganizationId }, select: { id: true, isPublic: true, status: true } }),
        lockedListing.propertyId ? tx.property.findUnique({ where: { id: lockedListing.propertyId }, select: { status: true } }) : null,
        lockedListing.accommodationUnitId ? tx.accommodationUnit.findUnique({ where: { id: lockedListing.accommodationUnitId }, select: { status: true } }) : null,
      ]);
      const sellability = listingSellabilityProblem({ status: lockedListing.status, hostOrganization: currentHost, property: currentProperty, accommodationUnit: currentUnit });
      if (sellability) throw new Error(sellability);
      if (simulation && !(sales.allowTestBookings && stripeCheckoutEnabled())) {
        throw new Error('Test bookings aren’t available on this storefront. Make an ordinary booking instead.');
      }
      // The store's own documents: its published terms need acceptance of the exact version
      // shown; its privacy policy is a notice, recorded as shown (not as consent).
      if (sales.termsOfUse && acceptedStoreTermsVersion !== sales.termsOfUse.version) {
        throw new Error('The store’s terms of use changed. Review them again before reserving.');
      }
      if (sales.privacyPolicy && privacyNoticeVersion !== sales.privacyPolicy.version) {
        throw new Error('The store’s privacy policy changed. Review it again before reserving.');
      }
      // A signed-in, active guest owns the booking from the same commit; nobody else can be named.
      const bookedBy = sessionUserId
        ? await tx.user.findUnique({ where: { id: sessionUserId }, select: { id: true, isActive: true } })
        : null;
      const bookedById = bookedBy?.isActive === true ? bookedBy.id : null;
      // Both flags must agree before a booking skips the host's decision.
      const instant = lockedListing.bookingMode === 'instant' && lockedListing.instantBook === true;

      const hostOrganizationId = lockedQuote.hostOrganizationId;
      const accommodationUnitId = lockedListing.accommodationUnitId;
      const checkInDate = lockedQuote.checkInDate;
      const checkOutDate = lockedQuote.checkOutDate;
      const lockedRatePlanSnapshot = lockedListingSnapshot.ratePlans?.[0];
      assertStayWithinMaximum(
        checkInDate,
        checkOutDate,
        lockedRatePlanSnapshot?.maximumStay ?? lockedListingSnapshot.maximumStay,
      );
      assertStayArrivalAllowed(checkInDate, listingArrivalContext(lockedListingSnapshot, lockedRatePlanSnapshot));

      const overlap = await tx.calendarBlock.findFirst({
        where: {
          listingId: lockedListing.id,
          status: 'active',
          ...REAL_CAPACITY_BLOCK,
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
        capturedAt: now,
        consent: {
          termsVersion: acceptedTermsVersion,
          acceptedAt: now.toISOString(),
          acceptedBy: { kind: 'guest', email: guestEmail, userId: bookedById },
          statement: 'Accepted the stay terms, house rules and cancellation policy shown at checkout.',
          storeTermsOfUse: sales.termsOfUse
            ? { status: 'accepted', url: sales.termsOfUse.url, version: sales.termsOfUse.version }
            : { status: 'not_published' },
          privacyNotice: sales.privacyPolicy
            ? { status: 'shown', url: sales.privacyPolicy.url, version: sales.privacyPolicy.version }
            : { status: 'not_published' },
        },
        ...(simulation ? { simulation: { kind: 'test_booking', chosenBy: 'guest', statement: 'Chosen as a test booking: no dates held, test-card payments only, no real money.' } } : {}),
        ...(receiptKey ? {
          conversion: { version: CONVERSION_VERSION, receiptKeyHash: receiptKeyHash(receiptKey), requestFingerprint: fingerprint, actorUserId: sessionUserId },
        } : {}),
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
          status: instant ? 'confirmed' : 'pending',
          paymentStatus: 'unpaid',
          // Only an explicit, permitted test booking is simulated; every other booking is real.
          testMode: simulation,
          ...(bookedById ? { bookedById } : {}),
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
      // A test booking holds no real capacity: no calendar block, and capacity checks skip it.
      if (!simulation) {
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
      }

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
          title: simulation ? `Test booking (not binding): stay terms for ${lockedQuoteSnapshot.listing.title}` : `Stay terms for ${lockedQuoteSnapshot.listing.title}`,
          signerEmail: guestEmail,
          termsSnapshot: {
            listing: bookingSnapshot.listing,
            houseRules: bookingSnapshot.listing.houseRules || [],
            cancellationPolicy: bookingSnapshot.cancellationPolicy,
            checkInDate,
            checkOutDate,
            ...(simulation ? { simulation: true } : {}),
          },
        },
      });
      if (!createdAgreement?.id) throw retryableTransactionError('Stay agreement transaction did not commit.');
      // A test booking takes no deposit: no real money is held for a simulated stay.
      if (depositId && !simulation) {
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
        data: { agreementId, securityDepositId: simulation ? null : depositId },
      });
      if (!linkedReservation?.id) throw retryableTransactionError('Reservation relationship transaction did not commit.');
      if (instant) {
        // Instant confirmation runs the same task automation and event as a host confirmation.
        await createReservationTasksForTransition(tx, created, 'confirm');
        await enqueueOutboxEvent(tx, {
          hostOrganizationId,
          eventType: 'reservation.confirmed',
          aggregateType: 'Reservation',
          aggregateId: reservationId,
          operationKey: `instant_book:${reservationId}`,
          payload: { reservationId, confirmationCode: code, status: 'confirmed', transition: 'instant_book', actorUserId: bookedById, balanceDueCents: lockedQuote.totalAmountCents, testMode: simulation },
        });
      }
      return created;
    }, { maxWait: 5000, timeout: 15000, isolationLevel: 'Serializable' }));
  } catch (error) {
    // A parallel submit of this same checkout may have converted the quote first: once that
    // commit is visible, the exact replay returns its receipt. Anything else stays an error.
    const recovered = await recover().catch((recoveryError) => {
      if (recoveryError instanceof CheckoutReplayError) throw recoveryError;
      return null;
    });
    if (recovered) return recovered;
    throw error;
  }

  return reservationResult(reservation, tripToken, agreementToken);
}
