// Guest-facing journeys: accounts, trip recovery, host messaging, reviews.
import crypto from 'node:crypto';

import { sendGuestLinkEmail } from '../lib/guestMail';
import { passwordResetEmailConfigured } from '../lib/mailAvailability';
import {
  appendGuestMessage, cleanGuestMessage, GUEST_THREAD_PAGE_SIZE, guestThreadCursor, guestThreadPage, guestVisibleMessagePrismaWhere, type GuestThreadCursor,
} from '../utils/guestThread';
import {
  createPublicOwnershipToken,
  hashPublicOwnershipToken,
  isPublicOwnershipTokenActive,
  publicTokenExpiry,
  resolvePublicTokenRecord,
} from '../utils/publicTokenAccess';
import { createIsolatedUnverifiedBookingGuest } from '../utils/unverifiedBookingGuest';
import { readStorefrontSales } from '../utils/storefrontSales';
import { zonedLocalTimestamp, zonedTodayIso } from '../utils/stayBookingRules';
import { recordRecoveryFailure, recoveryBraked, verifiedRecoveryNetwork } from '../utils/recoveryRisk';
import { sellableListingWhere } from '../utils/stayEligibility';
import { linkEmailCoolingDown, mailDefinitelyRejected } from '../utils/linkDelivery';

const TOKEN_PATTERN = /^[a-f0-9]{48}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const tripTopics: Record<string, string> = {
  general: '',
  arrival: 'Arrival question',
  change_request: 'Change request',
  deposit: 'Security deposit question',
  damage_claim: 'Response to damage claim',
  cancellation: 'Cancellation or refund question',
};

function cleanText(value: unknown, label: string, max: number, required = true) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (required && !text) throw new Error(`${label} is required.`);
  if (text.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
  return text;
}

function cleanEmail(value: unknown) {
  const email = cleanText(value, 'Email', 320).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  return email;
}

function requireSessionUser(context: any): string {
  const itemId = context.session?.itemId;
  if (!itemId || context.session?.data?.isActive !== true) throw new Error('Sign in to continue.');
  return String(itemId);
}

function tripTokenExpiry(checkOutDate: string, current?: Date | string | null) {
  const candidates = [publicTokenExpiry().getTime()];
  const checkout = new Date(`${checkOutDate}T00:00:00.000Z`).getTime();
  if (Number.isFinite(checkout)) candidates.push(checkout + 30 * DAY_MS);
  if (current) {
    const existing = new Date(current).getTime();
    if (Number.isFinite(existing)) candidates.push(existing);
  }
  return new Date(Math.max(...candidates));
}

async function resolveTrip(context: any, tripToken: string, query: string) {
  if (!TOKEN_PATTERN.test(tripToken || '')) throw new Error('Trip link is invalid.');
  const reservation = await resolvePublicTokenRecord({
    token: tripToken,
    invalidMessage: 'Trip link is invalid.',
    findRecordByHash: async (tokenHash) => {
      const records = await context.sudo().query.Reservation.findMany({
        where: { tripTokenHash: { equals: tokenHash } },
        take: 1,
        query: `id confirmationCode status checkInDate checkOutDate tripTokenExpiresAt tripTokenRevokedAt ${query}`,
      });
      const record = records[0];
      return record ? { ...record, tokenExpiresAt: record.tripTokenExpiresAt, tokenRevokedAt: record.tripTokenRevokedAt } : null;
    },
  });
  if (!reservation) throw new Error('Trip link is invalid or expired.');
  return reservation;
}

/** Locks the reservation and re-checks the trip link inside the write, so a rotated, expired or revoked link can't write. */
async function lockOwnedTrip(tx: any, reservationId: string, tripToken: string) {
  await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `reservation:${reservationId}`);
  await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', reservationId);
  const locked = await tx.reservation.findUnique({ where: { id: reservationId } });
  if (!locked || locked.tripTokenHash !== hashPublicOwnershipToken(tripToken)
    || !isPublicOwnershipTokenActive({ tokenExpiresAt: locked.tripTokenExpiresAt, tokenRevokedAt: locked.tripTokenRevokedAt })) {
    throw new Error('Trip link is invalid or expired.');
  }
  return locked;
}

/**
 * Issue fresh private trip and agreement links inside the caller's reservation-locked
 * transaction. The previous links stop working. Returns null when the host has turned off
 * online access to the trip.
 */
async function rotateTripAccess(tx: any, reservationId: string): Promise<{ tripToken: string; agreementToken: string } | null> {
  const reservation = await tx.reservation.findUnique({
    where: { id: reservationId },
    select: { id: true, status: true, checkOutDate: true, tripTokenExpiresAt: true, tripTokenRevokedAt: true, agreementId: true },
  });
  if (!reservation || reservation.tripTokenRevokedAt) return null;
  const tripToken = createPublicOwnershipToken();
  await tx.reservation.update({
    where: { id: reservation.id },
    data: { tripTokenHash: hashPublicOwnershipToken(tripToken), tripTokenExpiresAt: tripTokenExpiry(reservation.checkOutDate, reservation.tripTokenExpiresAt) },
  });
  let agreementToken = '';
  if (reservation.agreementId) {
    const agreement = await tx.stayAgreement.findUnique({ where: { id: reservation.agreementId }, select: { id: true, status: true, signingTokenRevokedAt: true } });
    const stopped = ['cancelled', 'no_show'].includes(reservation.status || '');
    const readable = agreement?.status === 'signed' || (agreement?.status === 'sent' && !stopped);
    if (agreement && readable && !agreement.signingTokenRevokedAt) {
      agreementToken = createPublicOwnershipToken();
      await tx.stayAgreement.update({
        where: { id: agreement.id },
        data: { signingTokenHash: hashPublicOwnershipToken(agreementToken), signingTokenExpiresAt: publicTokenExpiry() },
      });
    }
  }
  return { tripToken, agreementToken };
}

async function lockReservation(tx: any, reservationId: string) {
  await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `reservation:${reservationId}`);
  await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', reservationId);
}

/** Issue fresh private trip and agreement links. The previous links stop working. */
async function reissueTripAccess(context: any, reservationId: string): Promise<{ tripToken: string; agreementToken: string } | null> {
  return context.prisma.$transaction(async (tx: any) => {
    await lockReservation(tx, reservationId);
    return rotateTripAccess(tx, reservationId);
  }, { maxWait: 5000, timeout: 10000 });
}

/** Emails fresh trip links to the booking address, with durable, deduplicated delivery state. */
async function emailTripLink(context: any, reservationId: string, to: string, code: string) {
  const now = new Date();
  const attemptId = crypto.randomUUID();
  const access = await context.prisma.$transaction(async (tx: any) => {
    await lockReservation(tx, reservationId);
    const locked = await tx.reservation.findUnique({ where: { id: reservationId }, select: { tripLinkDelivery: true } });
    if (linkEmailCoolingDown(locked?.tripLinkDelivery, now.getTime())) return null;
    const rotated = await rotateTripAccess(tx, reservationId);
    if (!rotated) return null;
    // The attempt is on record before anything is sent, so a crash leaves a known state.
    await tx.reservation.update({
      where: { id: reservationId },
      data: { tripLinkDelivery: { attemptId, purpose: 'trip_recovery', channel: 'email', status: 'sending', requestedAt: now.toISOString() } },
    });
    return rotated;
  }, { maxWait: 5000, timeout: 10000 });
  if (!access) return;
  let status: 'accepted' | 'failed' | 'unknown' = 'accepted';
  try {
    await sendGuestLinkEmail({
      to,
      subject: `Your trip ${code}`,
      heading: 'Here’s your trip link',
      body: `Someone asked for the private link to trip ${code}. If it was you, open your trip below. Older links no longer work.`,
      path: `/trips/${access.tripToken}${access.agreementToken ? `?agreement=${access.agreementToken}` : ''}`,
      cta: 'Open your trip',
    });
  } catch (error) {
    status = mailDefinitelyRejected(error) ? 'failed' : 'unknown';
  }
  await context.prisma.$transaction(async (tx: any) => {
    await lockReservation(tx, reservationId);
    const locked = await tx.reservation.findUnique({ where: { id: reservationId }, select: { tripLinkDelivery: true } });
    const delivery = locked?.tripLinkDelivery;
    // Only this attempt's own record is settled; a newer attempt is never overwritten.
    if (!delivery || delivery.attemptId !== attemptId) return;
    await tx.reservation.update({ where: { id: reservationId }, data: { tripLinkDelivery: { ...delivery, status, settledAt: new Date().toISOString() } } });
  }, { maxWait: 5000, timeout: 10000 }).catch(() => undefined);
}

/**
 * A question about one home goes to that home's host, and only while the home is publicly
 * listed under a public, operating host and an active property. A question without a home
 * has no configured support destination, so it is never routed to an inferred host: the
 * guest is asked to choose the home (or use the store's published contact details).
 */
async function submitGuestInquiry(_root: unknown, args: { name: string; email: string; message: string; listingSlug?: string | null }, context: any) {
  const name = cleanText(args.name, 'Your name', 200);
  const email = cleanEmail(args.email);
  const body = cleanGuestMessage(args.message);
  const slug = cleanText(args.listingSlug, 'Home', 200, false);
  if (!slug) return { ok: false, reason: 'choose_listing' };
  const listing = (await context.sudo().query.Listing.findMany({
    where: { ...sellableListingWhere(), slug: { equals: slug } },
    take: 1,
    query: 'id title hostOrganization { id } property { id }',
  }))[0];
  // A home the guest named but that is no longer listed never silently becomes another host.
  if (!listing?.hostOrganization?.id) return { ok: false, reason: 'listing_unavailable' };
  const hostOrganizationId = listing.hostOrganization.id;
  const token = createPublicOwnershipToken();
  const now = new Date();
  const written = await context.prisma.$transaction(async (tx: any) => {
    // Admission is rechecked under share locks: a host suspended, made private, or a home or
    // property taken off sale meanwhile either waits for this write or is seen by it.
    await tx.$queryRawUnsafe('SELECT "id" FROM "HostOrganization" WHERE "id" = $1 FOR SHARE', hostOrganizationId);
    await tx.$queryRawUnsafe('SELECT "id" FROM "Listing" WHERE "id" = $1 FOR SHARE', listing.id);
    if (listing.property?.id) await tx.$queryRawUnsafe('SELECT "id" FROM "Property" WHERE "id" = $1 FOR SHARE', listing.property.id);
    const [host, current, property] = await Promise.all([
      tx.hostOrganization.findUnique({ where: { id: hostOrganizationId }, select: { id: true, isPublic: true, status: true } }),
      tx.listing.findUnique({ where: { id: listing.id }, select: { status: true, hostOrganizationId: true, propertyId: true } }),
      listing.property?.id ? tx.property.findUnique({ where: { id: listing.property.id }, select: { status: true } }) : null,
    ]);
    if (!host || host.isPublic !== true || ['suspended', 'archived'].includes(host.status || '')
      || current?.status !== 'published' || current.hostOrganizationId !== hostOrganizationId
      || current.propertyId !== (listing.property?.id || null) || property?.status !== 'active') return false;
    const guest = await createIsolatedUnverifiedBookingGuest(tx, { hostOrganizationId, name, email, phone: '' });
    const conversation = await tx.conversation.create({
      data: {
        hostOrganizationId,
        listingId: listing.id,
        guestId: guest.id,
        subject: `Question about ${listing.title}`.slice(0, 200),
        status: 'open',
        guestEmail: email,
        guestAccessTokenHash: hashPublicOwnershipToken(token),
        guestAccessTokenExpiresAt: publicTokenExpiry(now),
        lastMessageAt: now,
      },
    });
    await appendGuestMessage(tx, { conversationId: conversation.id, hostOrganizationId, body, now });
    return true;
  });
  if (!written) return { ok: false, reason: 'listing_unavailable' };
  return { ok: true, threadToken: token };
}

/**
 * A thread link works only while it is unexpired and not revoked. The link check and the
 * read run in one repeatable-read snapshot, so a revoke or reissue can't land between them:
 * the page either reflects the link as it stood at that instant, or nothing.
 */
async function findGuestThread(context: any, token: string, messagesBefore?: GuestThreadCursor | null) {
  if (!TOKEN_PATTERN.test(token || '')) throw new Error('Message link is invalid.');
  return context.prisma.$transaction(async (tx: any) => {
    const thread = await tx.conversation.findUnique({
      where: { guestAccessTokenHash: hashPublicOwnershipToken(token) },
      select: {
        id: true, subject: true, status: true, createdAt: true, guestAccessTokenExpiresAt: true, guestAccessTokenRevokedAt: true,
        hostOrganization: { select: { id: true, name: true } },
        listing: { select: { title: true, slug: true, status: true } },
        messages: {
          where: guestVisibleMessagePrismaWhere(messagesBefore),
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: GUEST_THREAD_PAGE_SIZE + 1,
          select: { id: true, direction: true, senderType: true, body: true, status: true, sentAt: true, receivedAt: true, createdAt: true },
        },
      },
    });
    if (!thread || !isPublicOwnershipTokenActive({ tokenExpiresAt: thread.guestAccessTokenExpiresAt, tokenRevokedAt: thread.guestAccessTokenRevokedAt })) return null;
    return thread;
  }, { isolationLevel: 'RepeatableRead', maxWait: 5000, timeout: 10000 });
}

async function publicGuestThread(_root: unknown, args: { token: string; messagesBefore?: string | null }, context: any) {
  const thread = await findGuestThread(context, args.token, guestThreadCursor(args.messagesBefore));
  if (!thread) return null;
  const page = guestThreadPage(thread.messages);
  return {
    subject: thread.subject,
    status: thread.status,
    startedAt: thread.createdAt,
    hostName: thread.hostOrganization?.name || null,
    listing: thread.listing?.status === 'published' ? { title: thread.listing.title, slug: thread.listing.slug } : null,
    messages: page.messages,
    earlierMessagesBefore: page.earlierMessagesBefore,
  };
}

async function replyToGuestThread(_root: unknown, args: { token: string; message: string }, context: any) {
  const body = cleanGuestMessage(args.message);
  const thread = await findGuestThread(context, args.token);
  if (!thread?.hostOrganization?.id) throw new Error('Message link is invalid.');
  await context.prisma.$transaction(async (tx: any) => {
    // Re-check the link under the thread lock: a link revoked meanwhile can't append.
    await tx.$queryRawUnsafe('SELECT "id" FROM "Conversation" WHERE "id" = $1 FOR UPDATE', thread.id);
    const locked = await tx.conversation.findUnique({ where: { id: thread.id }, select: { guestAccessTokenHash: true, guestAccessTokenExpiresAt: true, guestAccessTokenRevokedAt: true } });
    if (!locked || locked.guestAccessTokenHash !== hashPublicOwnershipToken(args.token)
      || !isPublicOwnershipTokenActive({ tokenExpiresAt: locked.guestAccessTokenExpiresAt, tokenRevokedAt: locked.guestAccessTokenRevokedAt })) {
      throw new Error('Message link is invalid or expired.');
    }
    const now = new Date();
    await appendGuestMessage(tx, { conversationId: thread.id, hostOrganizationId: thread.hostOrganization.id, body, now });
    // An active conversation keeps its link alive for another 30 days.
    await tx.conversation.update({ where: { id: thread.id }, data: { guestAccessTokenExpiresAt: publicTokenExpiry(now) } });
  });
  return { ok: true };
}

async function sendTripMessage(_root: unknown, args: { tripToken: string; topic?: string | null; message: string }, context: any) {
  const topic = args.topic || 'general';
  if (!(topic in tripTopics)) throw new Error('Choose a message topic.');
  const message = cleanGuestMessage(args.message);
  const body = tripTopics[topic] ? `${tripTopics[topic]}\n\n${message}` : message;
  const reservation = await resolveTrip(context, args.tripToken, 'hostOrganization { id } listing { id } guest { id email } bookingSnapshot');
  if (!reservation.hostOrganization?.id) throw new Error('Trip link is invalid.');
  const guestEmail = String(reservation.bookingSnapshot?.guestParty?.primaryGuest?.email || reservation.guest?.email || '').slice(0, 320);
  await context.prisma.$transaction(async (tx: any) => {
    await lockOwnedTrip(tx, reservation.id, args.tripToken);
    const conversation = await tx.conversation.upsert({
      where: { reservationId: reservation.id },
      create: {
        hostOrganizationId: reservation.hostOrganization.id,
        reservationId: reservation.id,
        listingId: reservation.listing?.id || null,
        guestId: reservation.guest?.id || null,
        subject: `Trip ${reservation.confirmationCode}`,
        status: 'open',
        guestEmail,
      },
      update: {},
    });
    await appendGuestMessage(tx, { conversationId: conversation.id, hostOrganizationId: reservation.hostOrganization.id, body });
  });
  return { ok: true };
}

function rating(value: unknown, label: string, required = false) {
  if (value === null || value === undefined) {
    if (required) throw new Error(`${label} rating is required.`);
    return null;
  }
  if (!Number.isSafeInteger(value) || (value as number) < 1 || (value as number) > 5) throw new Error(`${label} rating must be between 1 and 5.`);
  return value as number;
}

async function submitStayReview(_root: unknown, args: {
  tripToken: string; overallRating: number; cleanlinessRating?: number | null; accuracyRating?: number | null; communicationRating?: number | null;
  locationRating?: number | null; valueRating?: number | null; body?: string | null; privateFeedback?: string | null;
}, context: any) {
  const ratings = {
    overallRating: rating(args.overallRating, 'Overall', true),
    cleanlinessRating: rating(args.cleanlinessRating, 'Cleanliness'),
    accuracyRating: rating(args.accuracyRating, 'Accuracy'),
    communicationRating: rating(args.communicationRating, 'Communication'),
    locationRating: rating(args.locationRating, 'Location'),
    valueRating: rating(args.valueRating, 'Value'),
  };
  const body = cleanText(args.body, 'Review', 4000, false);
  const privateFeedback = cleanText(args.privateFeedback, 'Private note', 2000, false);
  const reservation = await resolveTrip(context, args.tripToken, 'hostOrganization { id } listing { id } guest { id } bookedBy { id }');
  if (reservation.status !== 'completed' || !reservation.hostOrganization?.id || !reservation.listing?.id) return { ok: false, reason: 'not_eligible' };
  return context.prisma.$transaction(async (tx: any) => {
    const locked = await lockOwnedTrip(tx, reservation.id, args.tripToken);
    if (locked.status !== 'completed') return { ok: false, reason: 'not_eligible' };
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `review:${reservation.id}`);
    const existing = await tx.review.findFirst({ where: { reservationId: reservation.id, direction: 'guest_to_host' }, select: { id: true } });
    if (existing) return { ok: false, reason: 'exists' };
    const review = await tx.review.create({
      data: {
        hostOrganizationId: reservation.hostOrganization.id,
        reservationId: reservation.id,
        listingId: reservation.listing.id,
        guestId: reservation.guest?.id || null,
        authorUserId: reservation.bookedBy?.id || null,
        direction: 'guest_to_host',
        status: 'submitted',
        ...ratings,
        body,
        privateFeedback,
        submittedAt: new Date(),
      },
    });
    return { ok: true, status: review.status, submittedAt: review.submittedAt };
  });
}

async function registerGuestAccount(_root: unknown, args: {
  name: string; email: string; password: string; acceptedTermsOfUseVersion?: string | null; privacyNoticeVersion?: string | null;
}, context: any) {
  const name = cleanText(args.name, 'Name', 200);
  const email = cleanEmail(args.email);
  const password = typeof args.password === 'string' ? args.password : '';
  if (password.length < 10 || password.length > 200) throw new Error('Use a password of 10 to 200 characters.');
  // The store's documents as published now: its terms need acceptance of the exact version
  // shown; its privacy policy is a notice (recorded as shown, never as consent).
  const sales = await readStorefrontSales(context.prisma);
  const accepted = typeof args.acceptedTermsOfUseVersion === 'string' ? args.acceptedTermsOfUseVersion.trim() : '';
  const shown = typeof args.privacyNoticeVersion === 'string' ? args.privacyNoticeVersion.trim() : '';
  if (sales.termsOfUse && accepted !== sales.termsOfUse.version) return { ok: false, reason: 'terms_changed' };
  if (sales.privacyPolicy && shown !== sales.privacyPolicy.version) return { ok: false, reason: 'terms_changed' };
  const existing = await context.prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { ok: false, reason: 'exists' };
  const registrationEvidence = {
    recordedAt: new Date().toISOString(),
    termsOfUse: sales.termsOfUse ? { status: 'accepted', url: sales.termsOfUse.url, version: sales.termsOfUse.version } : { status: 'not_published' },
    privacyNotice: sales.privacyPolicy ? { status: 'shown', url: sales.privacyPolicy.url, version: sales.privacyPolicy.version } : { status: 'not_published' },
    // Registration never asks for marketing consent, so none is recorded as given.
    marketing: { optedIn: false, asked: false },
  };
  // Guest accounts carry no role, so they have no dashboard or host-data access.
  await context.sudo().query.User.createOne({ data: { name, email, password, registrationEvidence }, query: 'id' });
  return { ok: true };
}

const ACCOUNT_TRIPS_PAGE_SIZE = 20;

async function myGuestAccount(_root: unknown, args: { tripsOffset?: number | null }, context: any) {
  const itemId = context.session?.itemId;
  if (!itemId || context.session?.data?.isActive !== true) return null;
  const sudo = context.sudo();
  const user = await sudo.query.User.findOne({ where: { id: String(itemId) }, query: 'id name email phone isActive role { id canAccessDashboard }' });
  if (!user || user.isActive !== true) return null;
  // Staff and owner sign-ins keep their credentials under people-manager authority.
  const staffLinks = await context.prisma.user.findUnique({
    where: { id: user.id },
    select: { hostMemberships: { select: { id: true }, take: 1 }, from_PropertyOwner_user: { select: { id: true }, take: 1 } },
  });
  const staffCredential = Boolean(user.role?.id || staffLinks?.hostMemberships?.length || staffLinks?.from_PropertyOwner_user?.length);
  const offset = Number.isSafeInteger(args?.tripsOffset) && (args.tripsOffset as number) > 0 ? args.tripsOffset as number : 0;
  const where = { bookedBy: { id: { equals: user.id } } };
  const [trips, tripsTotal] = await Promise.all([
    sudo.query.Reservation.findMany({
      where,
      orderBy: [{ checkInDate: 'desc' }, { id: 'desc' }],
      skip: offset,
      take: ACCOUNT_TRIPS_PAGE_SIZE,
      query: 'confirmationCode status paymentStatus checkInDate checkOutDate totalAmountCents amountPaidCents currencyCode testMode bookingSnapshot listing { slug status } accommodationUnit { property { timezone checkOutBy } }',
    }),
    sudo.query.Reservation.count({ where }),
  ]);
  return {
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    hasHostAccess: Boolean(user.role?.canAccessDashboard),
    staffCredential,
    tripsOffset: offset,
    tripsPageSize: ACCOUNT_TRIPS_PAGE_SIZE,
    tripsTotal,
    trips: trips.map((trip: any) => {
      // What was booked comes from the booking snapshot; the live listing is only for “Book again”.
      const booked = trip.bookingSnapshot?.listing || {};
      // Grouping follows the home's own date and checkout time (the allocated home now, else the
      // booked one); it never changes the stay's recorded status.
      const property = trip.accommodationUnit?.property || booked.property || {};
      const timeZoneKnown = Boolean(property.timezone);
      const checkoutAt = timeZoneKnown && property.checkOutBy
        ? zonedLocalTimestamp(trip.checkOutDate, property.checkOutBy, property.timezone)
        : null;
      const localToday = timeZoneKnown ? zonedTodayIso(property.timezone) : null;
      const checkoutPassed = checkoutAt !== null
        ? Date.now() >= checkoutAt
        // Without a checkout time the whole checkout day counts as the stay; without a time
        // zone, only a date already past everywhere on Earth does.
        : localToday ? trip.checkOutDate < localToday : trip.checkOutDate < new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString().slice(0, 10);
      return {
        checkoutPassed,
        checkoutTimeKnown: checkoutAt !== null,
        timeZone: property.timezone || null,
        checkOutBy: property.checkOutBy || null,
        confirmationCode: trip.confirmationCode,
        status: trip.status,
        paymentStatus: trip.paymentStatus,
        checkInDate: trip.checkInDate,
        checkOutDate: trip.checkOutDate,
        totalAmountCents: trip.totalAmountCents,
        amountPaidCents: trip.amountPaidCents,
        currencyCode: trip.currencyCode,
        testMode: trip.testMode === true,
        listing: {
          title: booked.title || 'Your stay',
          thumbnail: booked.thumbnail || booked.media?.[0]?.url || null,
          bookAgainSlug: trip.listing?.status === 'published' ? trip.listing.slug : null,
        },
      };
    }),
  };
}

/** The signed-in guest's own name and phone. Booking-time contact snapshots are unchanged. */
async function updateMyGuestProfile(_root: unknown, args: { name: string; phone?: string | null }, context: any) {
  const itemId = requireSessionUser(context);
  const name = cleanText(args.name, 'Name', 200);
  const phone = cleanText(args.phone, 'Phone', 64, false);
  await context.sudo().db.User.updateOne({ where: { id: itemId }, data: { name, phone } });
  return { ok: true };
}

/** The User password field's own hashing: the same implementation the installed Auth verifies with. */
function passwordSecretField(context: any): { generateHash(secret: string): Promise<string>; compare(secret: string, hash: string): Promise<boolean> } {
  const impl = context.graphql.schema.getType('User')?.getFields?.()?.password?.extensions?.keystoneSecretField;
  if (typeof impl?.compare !== 'function' || typeof impl?.generateHash !== 'function') throw new Error('Password change is unavailable right now.');
  return impl;
}

/**
 * Sign-in email changes are held: a current password proves who is signed in, not that they
 * control the new address, and no verified-address policy is approved yet. A people manager
 * can still change an email under their own authority.
 */
async function changeGuestEmail(_root: unknown, _args: { email: string; currentPassword: string }, context: any) {
  requireSessionUser(context);
  return { ok: false, reason: 'held' };
}

/**
 * A guest's own password change. The current password is checked against the exact signed-in
 * account, under that row's lock, in the same write: a different, inactive, staff or already
 * changed credential can't satisfy it. Staff and owner sign-ins are managed by a people manager.
 */
async function changeGuestPassword(_root: unknown, args: { currentPassword: string; newPassword: string; confirmPassword: string }, context: any) {
  const itemId = requireSessionUser(context);
  const newPassword = typeof args.newPassword === 'string' ? args.newPassword : '';
  if (newPassword.length < 10 || newPassword.length > 200) throw new Error('Use a password of 10 to 200 characters.');
  if (newPassword !== args.confirmPassword) return { ok: false, reason: 'mismatch' };
  const currentPassword = typeof args.currentPassword === 'string' ? args.currentPassword : '';
  if (!currentPassword) return { ok: false, reason: 'wrong_password' };
  const secret = passwordSecretField(context);
  const newHash = await secret.generateHash(newPassword);
  return context.prisma.$transaction(async (tx: any) => {
    await tx.$queryRawUnsafe('SELECT "id" FROM "User" WHERE "id" = $1 FOR UPDATE', itemId);
    const user = await tx.user.findUnique({
      where: { id: itemId },
      select: {
        id: true, password: true, isActive: true, roleId: true,
        hostMemberships: { select: { id: true }, take: 1 },
        from_PropertyOwner_user: { select: { id: true }, take: 1 },
      },
    });
    if (!user || user.id !== itemId || user.isActive !== true) throw new Error('Sign in to continue.');
    if (user.roleId || user.hostMemberships.length || user.from_PropertyOwner_user.length) return { ok: false, reason: 'staff_account' };
    if (!user.password || !(await secret.compare(currentPassword, user.password))) return { ok: false, reason: 'wrong_password' };
    await tx.user.update({ where: { id: itemId }, data: { password: newHash } });
    return { ok: true };
  }, { maxWait: 5000, timeout: 10000 });
}

async function openAccountTrip(_root: unknown, args: { confirmationCode: string }, context: any) {
  const itemId = requireSessionUser(context);
  const code = cleanText(args.confirmationCode, 'Confirmation code', 64).toUpperCase();
  const matches = await context.sudo().query.Reservation.findMany({
    where: { confirmationCode: { equals: code }, bookedBy: { id: { equals: itemId } } },
    take: 1,
    query: 'id',
  });
  if (!matches[0]) return { ok: false, reason: 'not_found' };
  const access = await reissueTripAccess(context, matches[0].id);
  return access ? { ok: true, ...access } : { ok: false, reason: 'revoked' };
}

async function recoverStayTrip(_root: unknown, args: { confirmationCode: string; email: string; addToAccount?: boolean | null; networkProof?: string | null }, context: any) {
  const code = cleanText(args.confirmationCode, 'Confirmation code', 64).toUpperCase();
  const email = cleanEmail(args.email);
  const network = verifiedRecoveryNetwork(args.networkProof);
  // Braked only for this requesting network (and this network plus email), never globally.
  const braked = recoveryBraked(network, email);
  if (braked && !passwordResetEmailConfigured()) return { ok: false, reason: 'rate_limited' };
  const matches = await context.sudo().query.Reservation.findMany({
    where: { confirmationCode: { equals: code } },
    take: 1,
    query: 'id bookingSnapshot guest { email } bookedBy { id }',
  });
  const reservation = matches[0];
  const bookingEmail = String(reservation?.bookingSnapshot?.guestParty?.primaryGuest?.email || reservation?.guest?.email || '').trim().toLowerCase();
  const expected = Buffer.from(bookingEmail);
  const supplied = Buffer.from(email);
  const matched = Boolean(reservation && bookingEmail && expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied));
  if (!matched) {
    recordRecoveryFailure(network, email);
    return braked ? { ok: false, reason: 'emailed_if_match' } : { ok: false, reason: 'no_match' };
  }
  if (braked) {
    // Braked: fresh links go only to the booking email (at most once per cooldown), and the
    // answer is the same whether or not anything matched or was sent.
    await emailTripLink(context, reservation.id, bookingEmail, code);
    return { ok: false, reason: 'emailed_if_match' };
  }
  const access = await reissueTripAccess(context, reservation.id);
  if (!access) return { ok: false, reason: 'revoked' };
  let addedToAccount = false;
  const itemId = context.session?.itemId;
  if (args.addToAccount && itemId && context.session?.data?.isActive === true) {
    const linked = await context.prisma.reservation.updateMany({ where: { id: reservation.id, bookedById: null }, data: { bookedById: String(itemId) } });
    addedToAccount = linked.count === 1 || reservation.bookedBy?.id === String(itemId);
  }
  return { ok: true, ...access, addedToAccount };
}

async function claimStayTrip(_root: unknown, args: { tripToken: string }, context: any) {
  const itemId = requireSessionUser(context);
  const reservation = await resolveTrip(context, args.tripToken, 'bookedBy { id }');
  if (reservation.bookedBy?.id === itemId) return { ok: true };
  if (reservation.bookedBy?.id) return { ok: false, reason: 'other_account' };
  return context.prisma.$transaction(async (tx: any) => {
    const locked = await lockOwnedTrip(tx, reservation.id, args.tripToken);
    if (locked.bookedById === itemId) return { ok: true };
    if (locked.bookedById) return { ok: false, reason: 'other_account' };
    await tx.reservation.update({ where: { id: locked.id }, data: { bookedById: itemId } });
    return { ok: true };
  });
}

export const guestJourneyTypeDefs = String.raw`
  type Query {
    publicGuestThread(token: String!, messagesBefore: String): JSON
    myGuestAccount(tripsOffset: Int): JSON
    guestPasswordResetAvailable: Boolean!
  }

  type Mutation {
    submitGuestInquiry(name: String!, email: String!, message: String!, listingSlug: String): JSON!
    replyToGuestThread(token: String!, message: String!): JSON!
    sendTripMessage(tripToken: String!, topic: String, message: String!): JSON!
    submitStayReview(
      tripToken: String!
      overallRating: Int!
      cleanlinessRating: Int
      accuracyRating: Int
      communicationRating: Int
      locationRating: Int
      valueRating: Int
      body: String
      privateFeedback: String
    ): JSON!
    registerGuestAccount(name: String!, email: String!, password: String!, acceptedTermsOfUseVersion: String, privacyNoticeVersion: String): JSON!
    openAccountTrip(confirmationCode: String!): JSON!
    recoverStayTrip(confirmationCode: String!, email: String!, addToAccount: Boolean, networkProof: String): JSON!
    claimStayTrip(tripToken: String!): JSON!
    updateMyGuestProfile(name: String!, phone: String): JSON!
    changeGuestEmail(email: String!, currentPassword: String!): JSON!
    changeGuestPassword(currentPassword: String!, newPassword: String!, confirmPassword: String!): JSON!
  }
`;

export const guestJourneyResolvers = {
  Query: {
    publicGuestThread,
    myGuestAccount,
    guestPasswordResetAvailable: () => passwordResetEmailConfigured(),
  },
  Mutation: {
    submitGuestInquiry,
    replyToGuestThread,
    sendTripMessage,
    submitStayReview,
    registerGuestAccount,
    openAccountTrip,
    recoverStayTrip,
    claimStayTrip,
    updateMyGuestProfile,
    changeGuestEmail,
    changeGuestPassword,
  },
};
