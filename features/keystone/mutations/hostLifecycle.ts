// Host-side stay lifecycle: refunds, agreement recovery, stay corrections.
import crypto from 'node:crypto';

import { assertHostOrganizationAccess } from '../utils/hostOrganizationAccess';
import { safeHostCommandMessage } from '../utils/hostCommandError';
import { enqueueOutboxEvent } from '../utils/outbox';
import { sendGuestLinkEmail } from '../lib/guestMail';
import { passwordResetEmailConfigured } from '../lib/mailAvailability';
import { createPublicOwnershipToken, hashPublicOwnershipToken, isPublicOwnershipTokenActive, publicTokenExpiry } from '../utils/publicTokenAccess';
import { linkEmailCoolingDown, mailDefinitelyRejected } from '../utils/linkDelivery';
import { amendConfirmedStayOperation } from './amendConfirmedStay';
import { reassignStayReservation } from './reassignStayReservation';
import { captureStayPayment } from './captureStayPayment';
import { initiateStayPayment } from './initiateStayPayment';
import { createDamageClaim, refundStayPaymentOperation, transitionDamageClaim, transitionSecurityDeposit } from './stayFinancialOperations';
import { adjustStayRefund, createStayRefund, declineStayRefund, processStayRefund } from './stayRefundOperations';
import { operateStayReservation, type StayTransition } from './transitionStayReservation';
import { STRIPE_PROVIDER_CODE } from '../../integrations/payment/stripe';
import { lockAccommodationUnitCapacity, lockListingCapacity } from '../utils/reservationAllocation';
import { transitionCatalogRecord } from './catalogLifecycle';
import { reconcileProviderAttempt } from './paymentAttemptReconciliation';

export const hostLifecycleTypeDefs = String.raw`
  type Mutation {
    """Merchant stay, payment, agreement, message and review actions. Returns { ok, message?, data? }."""
    hostStayCommand(command: String!, input: JSON!): JSON!
  }
`;

type Input = Record<string, any>;

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function cents(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(parsed) ? parsed : NaN;
}

async function appendReservationNote(tx: any, reservationId: string | null | undefined, note: string) {
  if (!reservationId) return;
  const reservation = await tx.reservation.findUnique({ where: { id: reservationId }, select: { internalNotes: true } });
  if (!reservation) return;
  const line = `[${new Date().toISOString()}] ${note}`;
  await tx.reservation.update({ where: { id: reservationId }, data: { internalNotes: [reservation.internalNotes, line].filter(Boolean).join('\n') } });
}

/** Thread for a stay, created on first host message so the guest sees it on their trip page. */
async function stayConversation(tx: any, reservation: { id: string; hostOrganizationId: string; listingId?: string | null; guestId?: string | null; confirmationCode: string }) {
  const existing = await tx.conversation.findUnique({ where: { reservationId: reservation.id } });
  if (existing) return existing;
  return tx.conversation.create({
    data: {
      hostOrganizationId: reservation.hostOrganizationId,
      reservationId: reservation.id,
      listingId: reservation.listingId,
      guestId: reservation.guestId,
      subject: `Stay ${reservation.confirmationCode}`,
      status: 'open',
      lastMessageAt: new Date(),
    },
  });
}

async function postHostMessage(tx: any, conversation: any, body: string, senderUserId: string) {
  const now = new Date();
  const message = await tx.message.create({
    data: {
      hostOrganizationId: conversation.hostOrganizationId,
      conversationId: conversation.id,
      senderUserId,
      direction: 'outbound',
      senderType: 'host',
      body,
      // "Sent" here means visible on the guest's private trip or inquiry page; no email is sent.
      status: 'sent',
      sentAt: now,
    },
  });
  await tx.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: now, status: 'open' } });
  return message;
}

async function agreementForHost(context: any, agreementId: string) {
  const agreement = await context.prisma.stayAgreement.findUnique({
    where: { id: agreementId },
    include: { reservation: { select: { id: true, status: true, confirmationCode: true, hostOrganizationId: true, listingId: true, guestId: true } } },
  });
  if (!agreement?.hostOrganizationId) throw new Error('Agreement not found.');
  await assertHostOrganizationAccess({ context, hostOrganizationId: agreement.hostOrganizationId, permission: 'canManageReservations' });
  return agreement;
}

async function voidAgreement(context: any, input: Input) {
  const reason = text(input.reason);
  if (reason.length < 3 || reason.length > 1000) throw new Error('Give a reason for voiding the agreement (3 to 1000 characters).');
  const agreement = await agreementForHost(context, text(input.agreementId));
  return context.prisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `agreement:${agreement.id}`);
    const locked = await tx.stayAgreement.findUnique({ where: { id: agreement.id } });
    if (!locked) throw new Error('Agreement not found.');
    if (locked.status === 'voided') return { status: 'voided' };
    const stayClosed = ['cancelled', 'no_show'].includes(agreement.reservation?.status || '');
    if (locked.status === 'signed' && !stayClosed) throw new Error('A signed agreement for an active stay stays in force. Cancel the stay first if the agreement no longer applies.');
    const now = new Date();
    // Terms, signature name and signing time are kept; only the status and link change.
    await tx.stayAgreement.update({ where: { id: locked.id }, data: { status: 'voided', signingTokenRevokedAt: locked.signingTokenRevokedAt || now } });
    await appendReservationNote(tx, agreement.reservation?.id, `agreement ${locked.agreementNumber} voided: ${reason}`);
    await enqueueOutboxEvent(tx, {
      hostOrganizationId: locked.hostOrganizationId,
      eventType: 'stay_agreement.voided',
      aggregateType: 'StayAgreement',
      aggregateId: locked.id,
      operationKey: `host-void:${now.toISOString()}`,
      payload: { agreementId: locked.id, reservationId: agreement.reservation?.id || null, previousStatus: locked.status, reason, actorUserId: context.session?.itemId || null },
    });
    return { status: 'voided' };
  });
}

async function reissueAgreement(context: any, input: Input) {
  const agreement = await agreementForHost(context, text(input.agreementId));
  const reservation = agreement.reservation;
  if (!reservation || !['pending', 'confirmed', 'in_stay'].includes(reservation.status || '')) throw new Error('A new signing link can only be issued for an active stay.');
  const token = createPublicOwnershipToken();
  const postToThread = input.postToThread === true;
  await context.prisma.$transaction(async (tx: any) => {
    // Same lock order as cancellation (reservation, then agreement), and the stay is re-read
    // under the lock, so a cancellation racing this can't end with a live signing link.
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `reservation:${reservation.id}`);
    await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', reservation.id);
    const stay = await tx.reservation.findUnique({ where: { id: reservation.id }, select: { status: true, agreementId: true } });
    if (!stay || stay.agreementId !== agreement.id || !['pending', 'confirmed', 'in_stay'].includes(stay.status || '')) {
      throw new Error('A new signing link can only be issued for an active stay.');
    }
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `agreement:${agreement.id}`);
    await tx.$queryRawUnsafe('SELECT "id" FROM "StayAgreement" WHERE "id" = $1 FOR UPDATE', agreement.id);
    const locked = await tx.stayAgreement.findUnique({ where: { id: agreement.id } });
    if (!locked || locked.status === 'signed' || locked.signedAt) throw new Error('This agreement is already signed, so it doesn’t need a new link.');
    const now = new Date();
    await tx.stayAgreement.update({
      where: { id: locked.id },
      data: { status: 'sent', signingTokenHash: hashPublicOwnershipToken(token), signingTokenExpiresAt: publicTokenExpiry(now), signingTokenRevokedAt: null },
    });
    await appendReservationNote(tx, reservation.id, `agreement ${locked.agreementNumber} signing link reissued`);
    if (postToThread) {
      const conversation = await stayConversation(tx, { ...reservation, hostOrganizationId: locked.hostOrganizationId });
      await postHostMessage(tx, conversation, `Here is a new link to review and sign your stay agreement ${locked.agreementNumber}: /agreements/${token}`, context.session.itemId);
    }
    await enqueueOutboxEvent(tx, {
      hostOrganizationId: locked.hostOrganizationId,
      eventType: 'stay_agreement.reissued',
      aggregateType: 'StayAgreement',
      aggregateId: locked.id,
      operationKey: `reissue:${now.toISOString()}`,
      payload: { agreementId: locked.id, reservationId: reservation.id, postedToThread: postToThread, actorUserId: context.session?.itemId || null },
    });
  });
  return { link: `/agreements/${token}`, postedToThread: postToThread };
}

async function conversationForHost(context: any, conversationId: string) {
  const conversation = await context.prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation?.hostOrganizationId) throw new Error('Conversation not found.');
  await assertHostOrganizationAccess({ context, hostOrganizationId: conversation.hostOrganizationId, permission: 'canManageMessages' });
  return conversation;
}

/** Locks a conversation row for a link or reply change and returns its current state. */
async function lockConversation(tx: any, conversationId: string) {
  await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `conversation:${conversationId}`);
  await tx.$queryRawUnsafe('SELECT "id" FROM "Conversation" WHERE "id" = $1 FOR UPDATE', conversationId);
  return tx.conversation.findUnique({ where: { id: conversationId } });
}

function guestLinkUsable(conversation: any) {
  return Boolean(conversation?.guestAccessTokenHash) && isPublicOwnershipTokenActive({
    tokenExpiresAt: conversation.guestAccessTokenExpiresAt, tokenRevokedAt: conversation.guestAccessTokenRevokedAt,
  });
}

/**
 * Posts a host reply. On an inquiry thread the reply keeps the guest's link alive for 30 days
 * after it, as a guest message does. If the guest's link is turned off or expired the reply is
 * kept, and the host is told the guest can't read it until they send a new link.
 */
async function replyToConversation(context: any, input: Input) {
  const body = text(input.body);
  if (body.length < 1 || body.length > 4000) throw new Error('Write a reply of up to 4000 characters.');
  const conversation = await conversationForHost(context, text(input.conversationId));
  if (conversation.channelConnectionId) throw new Error('This thread belongs to a channel. Reply in that channel so the guest receives it.');
  if (!conversation.reservationId && !conversation.guestAccessTokenHash) throw new Error('This guest has no private page to receive replies. Contact them using the details on their profile.');
  return context.prisma.$transaction(async (tx: any) => {
    const locked = await lockConversation(tx, conversation.id);
    if (!locked || locked.hostOrganizationId !== conversation.hostOrganizationId) throw new Error('Conversation not found.');
    const message = await postHostMessage(tx, locked, body, context.session.itemId);
    const inquiryLink = !locked.reservationId;
    const guestCanRead = inquiryLink ? guestLinkUsable(locked) : true;
    if (inquiryLink && guestCanRead) {
      await tx.conversation.update({ where: { id: locked.id }, data: { guestAccessTokenExpiresAt: publicTokenExpiry(new Date()) } });
    }
    await enqueueOutboxEvent(tx, {
      hostOrganizationId: locked.hostOrganizationId,
      eventType: 'message.sent',
      aggregateType: 'Message',
      aggregateId: message.id,
      operationKey: `reply:${message.id}`,
      payload: { messageId: message.id, conversationId: locked.id, reservationId: locked.reservationId, delivery: 'guest_private_page', guestCanRead },
    });
    return { id: message.id, status: message.status, guestCanRead };
  });
}

/** Turns off the guest's private conversation link, under the thread lock. Every message is kept. */
async function revokeConversationLink(context: any, input: Input) {
  const conversation = await conversationForHost(context, text(input.conversationId));
  return context.prisma.$transaction(async (tx: any) => {
    const locked = await lockConversation(tx, conversation.id);
    if (!locked?.guestAccessTokenHash) throw new Error('This conversation has no guest link.');
    const delivery = locked.guestLinkDelivery && typeof locked.guestLinkDelivery === 'object' ? locked.guestLinkDelivery : null;
    await tx.conversation.update({
      where: { id: locked.id },
      // A link being emailed when the host turns access off never activates afterwards.
      data: {
        guestAccessTokenRevokedAt: new Date(),
        ...(delivery?.pendingTokenHash ? { guestLinkDelivery: { ...delivery, pendingTokenHash: null, supersededBy: 'revoke' } } : {}),
      },
    });
    return { revoked: true };
  });
}

/**
 * Emails the inquiry address a fresh private link. The new link becomes the working link
 * only once the mail server accepts the email; until then, and if sending fails or its
 * outcome is unknown, the current link keeps working (or stays off, if the host turned it
 * off), so a failed or repeated send never strands the guest. The attempt and its outcome
 * are recorded; no link is stored.
 */
async function reissueConversationLink(context: any, input: Input) {
  const conversation = await conversationForHost(context, text(input.conversationId));
  if (conversation.reservationId) throw new Error('Stay conversations are reached from the guest’s trip page.');
  if (!conversation.guestEmail) throw new Error('This conversation has no guest email to send a new link to.');
  if (!passwordResetEmailConfigured()) throw new Error('Email isn’t set up for this store, so a new link can’t be sent.');
  const token = createPublicOwnershipToken();
  const attemptId = crypto.randomUUID();
  const now = new Date();
  await context.prisma.$transaction(async (tx: any) => {
    const locked = await lockConversation(tx, conversation.id);
    if (!locked) throw new Error('Conversation not found.');
    if (linkEmailCoolingDown(locked.guestLinkDelivery, now.getTime()) && locked.guestLinkDelivery?.status === 'sending') {
      throw new Error('A new link is being sent right now. Refresh in a moment to see whether it went out.');
    }
    await tx.conversation.update({
      where: { id: locked.id },
      data: { guestLinkDelivery: { attemptId, purpose: 'conversation_link', channel: 'email', status: 'sending', requestedAt: now.toISOString(), pendingTokenHash: hashPublicOwnershipToken(token), requestedByUserId: context.session?.itemId || null } },
    });
  });
  let status: 'accepted' | 'failed' | 'unknown' = 'accepted';
  try {
    await sendGuestLinkEmail({
      to: conversation.guestEmail,
      subject: conversation.subject || 'Your conversation with the host',
      heading: 'A new link to your conversation',
      body: 'Your host sent a fresh private link to your conversation. Older links no longer work.',
      path: `/messages/${token}`,
      cta: 'Open the conversation',
    });
  } catch (error) {
    status = mailDefinitelyRejected(error) ? 'failed' : 'unknown';
  }
  const activated = await context.prisma.$transaction(async (tx: any) => {
    const locked = await lockConversation(tx, conversation.id);
    const delivery = locked?.guestLinkDelivery && typeof locked.guestLinkDelivery === 'object' ? locked.guestLinkDelivery : null;
    // A newer attempt or a revoke since this one started wins; this attempt changes nothing.
    if (!delivery || delivery.attemptId !== attemptId || !delivery.pendingTokenHash) return false;
    const settled = { ...delivery, status, settledAt: new Date().toISOString(), pendingTokenHash: null };
    if (status !== 'accepted') {
      await tx.conversation.update({ where: { id: locked.id }, data: { guestLinkDelivery: settled } });
      return false;
    }
    await tx.conversation.update({
      where: { id: locked.id },
      data: { guestAccessTokenHash: delivery.pendingTokenHash, guestAccessTokenExpiresAt: publicTokenExpiry(), guestAccessTokenRevokedAt: null, guestLinkDelivery: settled },
    });
    return true;
  });
  if (!activated) {
    throw new Error(status === 'failed'
      ? 'The mail server refused the email, so the new link wasn’t sent. The guest’s current link is unchanged.'
      : status === 'unknown'
        ? 'We couldn’t confirm the email was accepted, so the new link isn’t active. The guest’s current link is unchanged; try again.'
        : 'Another link change happened meanwhile. Refresh to see the current link state.');
  }
  return { emailed: true, status: 'accepted' };
}

async function setConversationStatus(context: any, input: Input) {
  const status = text(input.status);
  if (!['open', 'snoozed', 'archived'].includes(status)) throw new Error('Choose open, snoozed or archived.');
  const conversation = await conversationForHost(context, text(input.conversationId));
  await context.prisma.conversation.update({ where: { id: conversation.id }, data: { status } });
  return { status };
}

const reviewActions: Record<string, { status: string }> = {
  publish: { status: 'published' },
  hold: { status: 'submitted' },
  remove: { status: 'removed' },
};

/** Publish, hold or remove a guest review, keeping the listing's rating in step. */
async function moderateReview(context: any, input: Input) {
  const action = reviewActions[text(input.action)];
  if (!action) throw new Error('Choose publish, hold or remove.');
  const review = await context.prisma.review.findUnique({ where: { id: text(input.reviewId) } });
  if (!review?.hostOrganizationId) throw new Error('Review not found.');
  await assertHostOrganizationAccess({ context, hostOrganizationId: review.hostOrganizationId, permission: 'canManageReviews' });
  return context.prisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `review:${review.id}`);
    const locked = await tx.review.findUnique({ where: { id: review.id } });
    if (!locked) throw new Error('Review not found.');
    if (locked.status === action.status) return { status: locked.status };
    const now = new Date();
    await tx.review.update({ where: { id: locked.id }, data: { status: action.status, publishedAt: action.status === 'published' ? now : null } });
    const counts = locked.direction === 'guest_to_host' && locked.listingId && locked.overallRating;
    const wasPublished = locked.status === 'published';
    const isPublished = action.status === 'published';
    if (counts && wasPublished !== isPublished) {
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `listing-reviews:${locked.listingId}`);
      const listing = await tx.listing.findUnique({ where: { id: locked.listingId }, select: { reviewAverageHundredths: true, reviewCount: true } });
      const count = listing?.reviewCount || 0;
      const total = (listing?.reviewAverageHundredths || 0) * count;
      const nextCount = Math.max(count + (isPublished ? 1 : -1), 0);
      const nextTotal = total + (isPublished ? 1 : -1) * locked.overallRating * 100;
      await tx.listing.update({
        where: { id: locked.listingId },
        data: { reviewCount: nextCount, reviewAverageHundredths: nextCount ? Math.min(500, Math.max(0, Math.round(nextTotal / nextCount))) : 0 },
      });
    }
    await enqueueOutboxEvent(tx, {
      hostOrganizationId: locked.hostOrganizationId,
      eventType: `review.${action.status}`,
      aggregateType: 'Review',
      aggregateId: locked.id,
      operationKey: `${action.status}:${now.toISOString()}`,
      payload: { reviewId: locked.id, listingId: locked.listingId, reservationId: locked.reservationId, status: action.status },
    });
    return { status: action.status };
  });
}

async function recordManualRefund(context: any, input: Input) {
  const refundId = text(input.refundId) || null;
  const amountCents = cents(input.amountCents);
  if (refundId) {
    const refund = await context.prisma.refund.findUnique({ where: { id: refundId }, select: { amountCents: true, status: true } });
    if (refund?.status === 'review') throw new Error('Assess this refund before recording it: decide the amount, or decline it.');
    if (refund && Number.isSafeInteger(amountCents) && amountCents !== refund.amountCents) {
      await adjustStayRefund(context, { refundId, amountCents, note: text(input.note) });
    }
  }
  const refund = refundId ? await context.prisma.refund.findUnique({ where: { id: refundId }, select: { reason: true, paymentId: true } }) : null;
  return refundStayPaymentOperation(null, {
    paymentId: refund?.paymentId || text(input.paymentId),
    refundId,
    operationKey: text(input.operationKey),
    amountCents,
    reason: refund?.reason || text(input.reason) || 'other',
    confirmFundsReturned: input.confirmFundsReturned === true,
    manualEvidenceReference: text(input.evidenceReference),
  }, context);
}

async function createRefund(context: any, input: Input) {
  const refund = await createStayRefund(context, {
    paymentId: text(input.paymentId),
    amountCents: cents(input.amountCents),
    reason: text(input.reason),
    note: text(input.note),
    operationKey: text(input.operationKey),
  });
  const payment = await context.prisma.payment.findUnique({ where: { id: refund.paymentId }, select: { provider: true } });
  if (payment?.provider === STRIPE_PROVIDER_CODE && refund.status === 'pending') {
    return { refundId: refund.id, ...(await processStayRefund(context, { refundId: refund.id })) };
  }
  return { refundId: refund.id, status: refund.status };
}

/**
 * Closes a pending payment attempt that will never be paid, releasing its reserved balance.
 * A card attempt closes only on Stripe's authoritative answer: cancelled closes it, paid
 * settles it. An attempt Stripe has no record of needs the host's explicit attestation.
 */
async function cancelPaymentAttempt(context: any, input: Input) {
  const reason = text(input.reason);
  if (reason.length < 3 || reason.length > 1000) throw new Error('Give a reason for closing this payment attempt.');
  const payment = await context.prisma.payment.findUnique({ where: { id: text(input.paymentId) } });
  if (!payment?.hostOrganizationId) throw new Error('Payment not found.');
  await assertHostOrganizationAccess({ context, hostOrganizationId: payment.hostOrganizationId, permission: 'canManagePayments' });
  if (!['pending', 'processing'].includes(payment.status)) throw new Error('Only a pending payment attempt can be closed.');
  const actorUserId = context.session.itemId;
  if (payment.provider === STRIPE_PROVIDER_CODE) {
    // Closed only from Stripe's own correlated outcome for this attempt; never from a missing
    // search result, an attestation or the attempt's age.
    const outcome = await reconcileProviderAttempt(context.prisma, payment.id, { reason, actorUserId, closing: false });
    if (outcome.status === 'unknown' || outcome.status === 'processing') throw new Error(outcome.message || 'Stripe hasn’t reported this payment’s outcome yet.');
    return { status: outcome.status };
  }
  // A manual attempt was never sent to a provider: the operator closes it with a reason.
  return context.prisma.$transaction(async (tx: any) => {
    if (payment.reservationId) {
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `reservation:${payment.reservationId}`);
      await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', payment.reservationId);
    }
    const current = await tx.payment.findUnique({ where: { id: payment.id } });
    if (!current || !['pending', 'processing'].includes(current.status)) throw new Error('This payment attempt already changed. Refresh to see it.');
    const data = current.data && typeof current.data === 'object' ? current.data : {};
    await tx.payment.update({
      where: { id: current.id },
      data: { status: 'cancelled', errorMessage: reason, data: { ...data, closedAt: new Date().toISOString(), closedReason: reason, closedByUserId: actorUserId, providerOutcome: 'manual' } },
    });
    await appendReservationNote(tx, current.reservationId, `payment attempt ${current.id} closed (manual): ${reason}`);
    return { status: 'cancelled' };
  }, { maxWait: 5000, timeout: 10000, isolationLevel: 'ReadCommitted' });
}

/** Money the host already received (phone, transfer, check, cash) recorded against the stay. */
async function recordManualPayment(context: any, input: Input) {
  if (input.confirmReceived !== true) throw new Error('Confirm that you’ve already received this money.');
  const amountCents = cents(input.amountCents);
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error('Enter the amount you received.');
  const operationKey = text(input.operationKey);
  if (operationKey.length < 8) throw new Error('This form is out of date. Reload the stay and record the payment again.');
  const payment = await initiateStayPayment(null, { reservationId: text(input.reservationId), paymentProviderCode: 'pp_system_default', amountCents, operationKey }, context);
  if (payment.status === 'succeeded') return { paymentId: payment.id, status: 'succeeded' };
  const captured = await captureStayPayment(null, { paymentId: payment.id }, context);
  return { paymentId: payment.id, status: captured.status };
}

/**
 * Changes a booked party's guests or pets under the reservation lock, within the unit's
 * capacity and the captured house rules. A change that would alter the captured price
 * (pet or extra-guest fees) is refused rather than leaving the price stale.
 */
/**
 * The host corrects the invited guest list of a stay (names and emails only). The previous
 * list stays in the booking snapshot and in the appended event; no guest's acceptance is
 * ever recorded by the host.
 */
/**
 * Moves a listing to another accommodation unit (and that unit's property). It takes the same
 * ordered listing→unit capacity locks as booking, amendment and re-accommodation, re-reads
 * everything under them, and refuses while stays or holds depend on the current unit.
 */
async function allocateListing(context: any, input: Input) {
  const listingId = text(input.listingId);
  const unitId = text(input.accommodationUnitId);
  if (!listingId || !unitId) throw new Error('Choose the listing and the accommodation unit.');
  const listing = await context.prisma.listing.findUnique({ where: { id: listingId }, select: { hostOrganizationId: true, accommodationUnitId: true } });
  if (!listing?.hostOrganizationId) throw new Error('Listing not found.');
  await assertHostOrganizationAccess({ context, hostOrganizationId: listing.hostOrganizationId, permission: 'canManageListings' });
  await assertHostOrganizationAccess({ context, hostOrganizationId: listing.hostOrganizationId, permission: 'canManageProperties' });
  return context.prisma.$transaction(async (tx: any) => {
    await lockListingCapacity(tx, [listingId]);
    await lockAccommodationUnitCapacity(tx, [listing.accommodationUnitId, unitId]);
    await tx.$queryRawUnsafe('SELECT "id" FROM "Listing" WHERE "id" = $1 FOR UPDATE', listingId);
    const current = await tx.listing.findUnique({ where: { id: listingId }, select: { id: true, status: true, hostOrganizationId: true, accommodationUnitId: true, propertyId: true } });
    if (!current || current.hostOrganizationId !== listing.hostOrganizationId) throw new Error('Listing not found.');
    if (current.status === 'archived') throw new Error('Archived listings are read-only.');
    if (current.accommodationUnitId !== listing.accommodationUnitId) throw new Error('The listing’s unit changed meanwhile. Refresh and try again.');
    const unit = await tx.accommodationUnit.findUnique({ where: { id: unitId }, select: { hostOrganizationId: true, propertyId: true } });
    if (!unit || unit.hostOrganizationId !== current.hostOrganizationId || !unit.propertyId) throw new Error('Choose an accommodation unit of this host that belongs to a property.');
    if (current.accommodationUnitId === unitId && current.propertyId === unit.propertyId) return { listingId, accommodationUnitId: unitId, changed: false };
    const [liveStay, activeHold] = await Promise.all([
      tx.reservation.findFirst({ where: { listingId, status: { in: ['pending', 'confirmed', 'in_stay'] } }, select: { id: true } }),
      tx.calendarBlock.findFirst({ where: { listingId, status: 'active' }, select: { id: true } }),
    ]);
    if (liveStay || activeHold) throw new Error('This listing has upcoming stays or calendar holds on its current unit. Re-accommodate or release them before moving the listing.');
    await tx.listing.update({ where: { id: listingId }, data: { accommodationUnitId: unitId, propertyId: unit.propertyId } });
    const now = new Date();
    await enqueueOutboxEvent(tx, {
      hostOrganizationId: current.hostOrganizationId,
      eventType: 'listing.allocation_changed',
      aggregateType: 'Listing',
      aggregateId: listingId,
      operationKey: `allocation:${now.toISOString()}`,
      payload: { listingId, previous: { accommodationUnitId: current.accommodationUnitId, propertyId: current.propertyId }, next: { accommodationUnitId: unitId, propertyId: unit.propertyId }, actorUserId: context.session?.itemId || null },
    });
    return { listingId, accommodationUnitId: unitId, changed: true };
  }, { maxWait: 5000, timeout: 10000, isolationLevel: 'Serializable' });
}

async function amendPartyInvitations(context: any, input: Input) {
  const reservationId = text(input.reservationId);
  const reason = text(input.reason);
  if (reason.length < 3 || reason.length > 1000) throw new Error('Give a short reason for the invitation change.');
  const raw = Array.isArray(input.invitedGuests) ? input.invitedGuests : null;
  if (!raw || raw.length > 15) throw new Error('List up to 15 invited guests.');
  const invitedGuests = raw.map((guest: any) => {
    const name = text(guest?.name);
    const email = text(guest?.email).toLowerCase();
    if (!name || name.length > 200) throw new Error('Each invited guest needs a name of up to 200 characters.');
    if (email && (email.length > 320 || !/^\S+@\S+\.\S+$/.test(email))) throw new Error('Enter a valid email for each invited guest, or leave it blank.');
    return { name, email: email || null };
  });
  const reservation = await context.prisma.reservation.findUnique({ where: { id: reservationId }, select: { hostOrganizationId: true } });
  if (!reservation?.hostOrganizationId) throw new Error('Reservation not found.');
  await assertHostOrganizationAccess({ context, hostOrganizationId: reservation.hostOrganizationId, permission: 'canManageReservations' });
  return context.prisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `reservation:${reservationId}`);
    await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', reservationId);
    const locked = await tx.reservation.findUnique({ where: { id: reservationId }, include: { guestParty: true } });
    if (!locked || !['pending', 'confirmed', 'in_stay'].includes(locked.status)) throw new Error('Only an upcoming or current stay’s invitations can be changed.');
    if (!locked.guestParty) throw new Error('This stay has no party record to change.');
    const previous = Array.isArray(locked.guestParty.invitedGuests) ? locked.guestParty.invitedGuests : [];
    await tx.guestParty.update({ where: { id: locked.guestParty.id }, data: { invitedGuests } });
    await appendReservationNote(tx, reservationId, `Invited guests changed from ${previous.length} to ${invitedGuests.length}: ${reason}`);
    const now = new Date();
    await enqueueOutboxEvent(tx, {
      hostOrganizationId: locked.hostOrganizationId,
      eventType: 'reservation.invitations_changed',
      aggregateType: 'Reservation',
      aggregateId: reservationId,
      operationKey: `invitations:${now.toISOString()}`,
      payload: { reservationId, previousNames: previous.map((guest: any) => guest?.name || null), nextNames: invitedGuests.map((guest: any) => guest.name), reason, actorUserId: context.session?.itemId || null },
    });
    return { reservationId, invitedGuests: invitedGuests.length };
  });
}

async function amendParty(context: any, input: Input) {
  const reservationId = text(input.reservationId);
  const reason = text(input.reason);
  if (reason.length < 3 || reason.length > 1000) throw new Error('Give a short reason for the party change.');
  const next = { adults: cents(input.adults), children: cents(input.children), infants: cents(input.infants), pets: cents(input.pets) };
  if (!Number.isSafeInteger(next.adults) || next.adults < 1 || [next.children, next.infants, next.pets].some((value) => !Number.isSafeInteger(value) || value < 0 || value > 50)) {
    throw new Error('Enter valid guest and pet counts.');
  }
  const reservation = await context.prisma.reservation.findUnique({ where: { id: reservationId }, select: { hostOrganizationId: true } });
  if (!reservation?.hostOrganizationId) throw new Error('Reservation not found.');
  await assertHostOrganizationAccess({ context, hostOrganizationId: reservation.hostOrganizationId, permission: 'canManageReservations' });
  return context.prisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `reservation:${reservationId}`);
    await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', reservationId);
    const locked = await tx.reservation.findUnique({
      where: { id: reservationId },
      include: { guestParty: true, accommodationUnit: { select: { maxGuests: true } } },
    });
    if (!locked || !['pending', 'confirmed', 'in_stay'].includes(locked.status)) throw new Error('Only an upcoming or current stay’s party can be changed.');
    const party = locked.guestParty;
    if (!party) throw new Error('This stay has no party record to change.');
    const maxGuests = locked.accommodationUnit?.maxGuests;
    if (Number.isSafeInteger(maxGuests) && next.adults + next.children > maxGuests) throw new Error(`This home sleeps up to ${maxGuests} guests.`);
    const petRule = (locked.bookingSnapshot?.listing?.houseRules || []).find((rule: any) => rule.ruleType === 'pets');
    if (next.pets > 0 && petRule?.isAllowed === false) throw new Error('This stay’s house rules don’t allow pets.');
    // Price effect is judged from every fee definition captured with the booking, not only the
    // fees that applied to the booked party: adding a first pet to a home with a pet fee, or
    // guests to one with per-guest fees, changes the price. Repricing a party isn't supported,
    // so such a change is refused rather than allowed free; a booking captured without its fee
    // definitions can't prove there is no effect.
    const capturedFees = locked.bookingSnapshot?.listing?.feeDefinitions;
    const guestsChanged = next.adults + next.children !== party.adults + party.children;
    const petsChanged = next.pets !== party.pets;
    if ((guestsChanged || petsChanged) && !Array.isArray(capturedFees)) {
      throw new Error('This booking didn’t capture its fee terms, so a change in guests or pets can’t be priced. Rebook the stay to change them.');
    }
    const priced = (capturedFees || []).filter((fee: any) => fee?.required !== false);
    const petFee = priced.some((fee: any) => fee.feeType === 'pet');
    const perGuestFee = priced.some((fee: any) => fee.feeType !== 'pet' && fee.calculation === 'per_guest');
    if ((petFee && petsChanged) || (perGuestFee && guestsChanged)) {
      throw new Error('This change would alter the stay’s price (pet or per-guest fees). Rebook or amend the price before changing the party.');
    }
    const previous = { adults: party.adults, children: party.children, infants: party.infants, pets: party.pets };
    await tx.guestParty.update({ where: { id: party.id }, data: next });
    await appendReservationNote(tx, reservationId, `Party changed from ${JSON.stringify(previous)} to ${JSON.stringify(next)}: ${reason}`);
    const now = new Date();
    await enqueueOutboxEvent(tx, {
      hostOrganizationId: locked.hostOrganizationId,
      eventType: 'reservation.party_changed',
      aggregateType: 'Reservation',
      aggregateId: reservationId,
      operationKey: `party:${now.toISOString()}`,
      payload: { reservationId, previous, next, reason, actorUserId: context.session?.itemId || null },
    });
    return { reservationId, ...next };
  });
}

const commands: Record<string, (context: any, input: Input) => Promise<unknown>> = {
  party_amend: amendParty,
  party_invites_amend: amendPartyInvitations,
  listing_allocate: allocateListing,
  payment_record_manual: recordManualPayment,
  payment_cancel_attempt: cancelPaymentAttempt,
  transition: (context, input) => operateStayReservation(context, {
    reservationId: text(input.reservationId),
    transition: text(input.transition) as StayTransition,
    note: text(input.note) || null,
    override: input.override === true,
  }).then((reservation: any) => ({ id: reservation.id, status: reservation.status, confirmationCode: reservation.confirmationCode })),
  amend: (context, input) => amendConfirmedStayOperation(null, {
    reservationId: text(input.reservationId),
    expectedCheckInDate: text(input.expectedCheckInDate),
    expectedCheckOutDate: text(input.expectedCheckOutDate),
    checkInDate: text(input.checkInDate),
    checkOutDate: text(input.checkOutDate),
    reason: text(input.reason),
    idempotencyKey: text(input.idempotencyKey),
  }, context),
  reassign: (context, input) => reassignStayReservation(null, {
    reservationId: text(input.reservationId),
    targetAccommodationUnitId: text(input.targetAccommodationUnitId),
    reason: text(input.reason),
  }, context),
  deposit: (context, input) => transitionSecurityDeposit(null, {
    depositId: text(input.depositId),
    transition: text(input.transition),
    amountCents: input.amountCents == null || input.amountCents === '' ? null : cents(input.amountCents),
    reference: text(input.reference) || null,
    confirmEvidence: input.confirmEvidence === true,
    operationKey: text(input.operationKey) || null,
  }, context),
  claim_create: (context, input) => createDamageClaim(null, {
    reservationId: text(input.reservationId),
    description: text(input.description),
    claimedAmountCents: cents(input.claimedAmountCents),
    evidence: Array.isArray(input.evidence) ? input.evidence.slice(0, 20) : [],
  }, context),
  claim_transition: (context, input) => transitionDamageClaim(null, {
    claimId: text(input.claimId),
    transition: text(input.transition),
    approvedAmountCents: input.approvedAmountCents == null || input.approvedAmountCents === '' ? null : cents(input.approvedAmountCents),
    settlementMethod: text(input.settlementMethod) || null,
    settlementReference: text(input.settlementReference) || null,
    confirmSettlement: input.confirmSettlement === true,
    receivedOn: text(input.receivedOn) || null,
    custody: text(input.custody) || null,
  }, context),
  refund_process: (context, input) => processStayRefund(context, {
    refundId: text(input.refundId),
    amountCents: input.amountCents == null || input.amountCents === '' ? null : cents(input.amountCents),
    note: text(input.note),
  }),
  refund_decline: (context, input) => declineStayRefund(context, { refundId: text(input.refundId), note: text(input.note) }),
  refund_assess: (context, input) => adjustStayRefund(context, { refundId: text(input.refundId), amountCents: cents(input.amountCents), note: text(input.note) }),
  refund_create: createRefund,
  refund_record_manual: recordManualRefund,
  agreement_void: voidAgreement,
  agreement_reissue: reissueAgreement,
  conversation_reply: replyToConversation,
  conversation_status: setConversationStatus,
  conversation_link_revoke: revokeConversationLink,
  conversation_link_reissue: reissueConversationLink,
  review_moderate: moderateReview,
  catalog_transition: transitionCatalogRecord,
};

export async function hostStayCommand(_root: unknown, args: { command: string; input: Input }, context: any) {
  const run = commands[args.command];
  if (!run) return { ok: false, message: 'Unsupported action.' };
  if (!context.session?.itemId) return { ok: false, message: 'Please sign in to continue.' };
  const input = args.input && typeof args.input === 'object' && !Array.isArray(args.input) ? args.input : {};
  try {
    return { ok: true, data: await run(context, input) };
  } catch (error) {
    return { ok: false, message: safeHostCommandMessage(error) };
  }
}

export const hostLifecycleResolvers = {
  Mutation: {
    hostStayCommand,
  },
};
