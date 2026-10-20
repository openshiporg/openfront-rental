import { cancelProviderPayment, createPayment, findProviderPayment, getPaymentStatus } from '../utils/paymentProviderAdapter';
import { hashPublicOwnershipToken, isPublicOwnershipTokenActive } from '../utils/publicTokenAccess';
import { reconcileReservationPaymentEvidence, unreservedReservationBalance } from '../utils/paymentReconciliation';
import { settleSucceededPayment } from '../utils/paymentSettlement';
import { admitProviderCall, attemptIdentity, claimAttempt, claimIsCurrent, providerLineage, releaseClaim, replayWindowOpen, type AttemptClaim } from '../utils/paymentAttemptClaim';
import { reconcileProviderAttempt } from './paymentAttemptReconciliation';
import { STRIPE_PROVIDER_CODE, stripeCheckoutEnabled } from '../../integrations/payment/stripe';

const transactionOptions = { maxWait: 5000, timeout: 10000, isolationLevel: 'ReadCommitted' } as const;
// Stripe keeps idempotency keys for 24 hours. The original create request is resent only well
// inside that, measured from when it was FIRST sent (recorded before sending); after that an
// unattached attempt is recovered only from the metadata this server wrote, never by creating a
// blind replacement, and if it can't be found it stays open for host review.

/** Explicit bearer ownership boundary before privileged payment/reservation access. */
async function ownedReservation(db: any, tripToken: string) {
  if (!/^[a-f0-9]{48}$/.test(tripToken || '')) throw new Error('Trip link is invalid.');
  const reservation = await db.reservation.findUnique({ where: { tripTokenHash: hashPublicOwnershipToken(tripToken) } });
  if (!reservation || !isPublicOwnershipTokenActive({ tokenExpiresAt: reservation.tripTokenExpiresAt, tokenRevokedAt: reservation.tripTokenRevokedAt })) {
    throw new Error('Trip link is unavailable.');
  }
  return reservation;
}

async function lockedReservation(tx: any, tripToken: string, id: string) {
  await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `reservation:${id}`);
  await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', id);
  const reservation = await ownedReservation(tx, tripToken);
  if (reservation.id !== id) throw new Error('Trip link is unavailable.');
  return reservation;
}

function assertProviderIdentity(payment: any, result: any) {
  const data = result.data;
  if (result.providerPaymentId !== payment.providerPaymentId || data?.livemode !== false
    || data?.source !== 'openfront-rental' || data?.reservationId !== payment.reservationId
    || data?.paymentId !== payment.id || data?.idempotencyKey !== payment.idempotencyKey) {
    throw new Error('Card payment identity does not match this reservation.');
  }
}

/** Closes an attempt that can never collect money, so its reserved balance is released. */
async function closeUnpayableAttempt(context: any, tripToken: string, reservationId: string, payment: any, reason: string) {
  await context.prisma.$transaction(async (tx: any) => {
    await lockedReservation(tx, tripToken, reservationId);
    const current = await tx.payment.findUnique({ where: { id: payment.id } });
    const references = [payment.providerPaymentId, `reserved:${current?.idempotencyKey}`].filter(Boolean);
    if (!current || !references.includes(current.providerPaymentId) || !['pending', 'processing'].includes(current.status)) return;
    await tx.payment.update({
      where: { id: current.id },
      data: {
        status: 'cancelled',
        errorMessage: reason,
        data: { ...(current.data && typeof current.data === 'object' ? current.data : {}), closedAt: new Date().toISOString(), closedReason: reason },
      },
    });
  }, transactionOptions);
}

/** Reserves (or reuses) one durable, uniquely keyed attempt. No Stripe I/O inside this transaction. */
async function reserveAttempt(context: any, tripToken: string, reservationId: string) {
  return context.prisma.$transaction(async (tx: any) => {
    const locked = await lockedReservation(tx, tripToken, reservationId);
    if (!locked.hostOrganizationId || locked.status !== 'confirmed') throw new Error('Your stay must be confirmed before paying by card.');
    if (locked.testMode !== true) throw new Error('Card payment is only available for test bookings. Arrange payment with your host.');
    const [payments, refunds] = await Promise.all([
      tx.payment.findMany({ where: { reservationId: locked.id } }),
      tx.refund.findMany({ where: { reservationId: locked.id } }),
    ]);
    const evidence = reconcileReservationPaymentEvidence({ payments, refunds, currencyCode: locked.currencyCode, testMode: locked.testMode === true });
    if (evidence.openRefundCents > 0) throw new Error('Contact your host about the outstanding refund before paying again.');
    if (evidence.netPaidCents >= locked.totalAmountCents) return null;
    const existing = payments.find((p: any) => p.provider === STRIPE_PROVIDER_CODE && ['pending', 'processing'].includes(p.status));
    if (existing) {
      const stale = existing.amountCents !== locked.totalAmountCents - evidence.netPaidCents || existing.currencyCode !== locked.currencyCode;
      // The claim is taken with the stay lock held: no stale runner keeps old authority.
      return { payment: existing, stale, claim: await claimAttempt(tx, existing.id, 'guest_checkout') };
    }
    const amountCents = unreservedReservationBalance({ totalAmountCents: locked.totalAmountCents, netPaidCents: evidence.netPaidCents, pendingTenderCents: evidence.pendingTenderCents });
    if (amountCents <= 0 || evidence.pendingTenderCents > 0) throw new Error('Another payment is awaiting confirmation. Contact your host before paying again.');
    const attemptNumber = payments.filter((p: any) => p.provider === STRIPE_PROVIDER_CODE).length + 1;
    const idempotencyKey = `rental:stripe:${locked.id}:${locked.totalAmountCents}:${evidence.netPaidCents}:${locked.currencyCode}:${attemptNumber}`;
    const previous = await tx.payment.findUnique({ where: { idempotencyKey } });
    if (previous) throw new Error('This payment needs host review before another attempt.');
    // A guest link never installs or enables a host's payment provider; the host does. The
    // provider row is share-locked, so turning it off serializes with this first attempt.
    const found = await tx.paymentProvider.findFirst({ where: { hostOrganizationId: locked.hostOrganizationId, code: STRIPE_PROVIDER_CODE }, select: { id: true } });
    if (found) await tx.$queryRawUnsafe('SELECT "id" FROM "PaymentProvider" WHERE "id" = $1 FOR SHARE', found.id);
    const provider = found ? await tx.paymentProvider.findUnique({ where: { id: found.id } }) : null;
    if (!provider?.isInstalled || provider.code !== STRIPE_PROVIDER_CODE) throw new Error('Card payment isn’t set up for this host. Arrange payment with your host.');
    const payment = await tx.payment.create({ data: {
      hostOrganizationId: locked.hostOrganizationId, reservationId: locked.id, guestId: locked.guestId,
      paymentProviderId: provider.id, amountCents, currencyCode: locked.currencyCode,
      status: 'pending', paymentMethod: 'card', provider: STRIPE_PROVIDER_CODE,
      providerPaymentId: `reserved:${idempotencyKey}`, idempotencyKey,
      // The provider configuration this attempt is made under, frozen (nonsecret).
      data: { source: 'openfront-rental', mode: 'test', lineage: providerLineage(provider) },
    } });
    return { payment, stale: false, claim: await claimAttempt(tx, payment.id, 'guest_checkout') };
  }, transactionOptions);
}

/**
 * Resolves the attempt's authoritative Stripe state. Returns null when the attempt was
 * closed as unpayable and a fresh one should be reserved.
 */
async function providerStateFor(context: any, tripToken: string, reservationId: string, payment: any, stale: boolean, claim: AttemptClaim) {
  const attached = payment.providerPaymentId.startsWith('pi_');
  const expected = attemptIdentity(payment);
  let result: any;
  if (!attached) {
    if (replayWindowOpen(payment)) {
      // Same key, same body: Stripe returns the intent the original request created, if any.
      // The claim and the key's age are re-checked immediately before sending.
      await admitProviderCall(context.prisma, claim, { replay: true, submission: true });
      result = await createPayment({ provider: STRIPE_PROVIDER_CODE, reservation: { id: reservationId },
        amount: payment.amountCents, currency: payment.currencyCode, idempotencyKey: payment.idempotencyKey,
        metadata: { rentalPaymentId: payment.id } });
      if (!stale) return result;
      if (!result.providerPaymentId?.startsWith('pi_')) throw new Error('Card payment could not be prepared.');
      payment = { ...payment, providerPaymentId: result.providerPaymentId };
    } else {
      // Past Stripe's key retention: recover only from the metadata this server wrote.
      const found = await findProviderPayment({ provider: STRIPE_PROVIDER_CODE, rentalPaymentId: payment.id });
      if (!found) throw new Error('This payment needs host review before another attempt. Please don’t pay again.');
      assertProviderIdentity({ ...payment, providerPaymentId: found.providerPaymentId }, found);
      if (found.status === 'captured') return found;
      payment = { ...payment, providerPaymentId: found.providerPaymentId };
      // An attempt that was never attached never had card entry handed out: close it at Stripe.
      stale = true;
    }
  }
  await admitProviderCall(context.prisma, claim);
  result = stale
    ? await cancelProviderPayment({ provider: STRIPE_PROVIDER_CODE, paymentId: payment.providerPaymentId, expected })
    : await getPaymentStatus({ provider: STRIPE_PROVIDER_CODE, paymentId: payment.providerPaymentId });
  assertProviderIdentity(payment, result);
  if (result.status === 'failed') {
    // Only an authoritative Stripe cancellation releases the reserved balance.
    await closeUnpayableAttempt(context, tripToken, reservationId, { ...payment, providerPaymentId: attached ? payment.providerPaymentId : undefined }, stale ? 'The stay balance changed before this card payment was made.' : 'Stripe cancelled this payment attempt.');
    return null;
  }
  if (stale && result.status !== 'captured') throw new Error('Your earlier card payment is still processing. Check again shortly; please don’t pay again.');
  return result;
}

export async function startGuestStayPayment(_root: unknown, args: { tripToken: string }, context: any) {
  if (!stripeCheckoutEnabled()) throw new Error('Card payment is currently unavailable.');
  const reservation = await ownedReservation(context.prisma, args.tripToken);
  for (let round = 0; round < 3; round += 1) {
    const reserved = await reserveAttempt(context, args.tripToken, reservation.id);
    if (!reserved) return { status: 'paid' };
    const { payment, stale, claim } = reserved;
    let result: any;
    try {
      result = await providerStateFor(context, args.tripToken, reservation.id, payment, stale, claim);
    } catch (error) {
      await context.prisma.$transaction(async (tx: any) => releaseClaim(tx, claim), transactionOptions).catch(() => undefined);
      throw error;
    }
    if (!result) continue;
    if (!result.providerPaymentId?.startsWith('pi_')) throw new Error('Card payment could not be prepared.');
    // Attach external identity without persisting a client secret, then re-check, under the stay
    // lock, that the claim is still current and the stay can still be paid before card entry is
    // handed out. The provider id is recorded either way: it is evidence of what was created.
    const stillPayable = await context.prisma.$transaction(async (tx: any) => {
      const locked = await lockedReservation(tx, args.tripToken, reservation.id);
      const current = await tx.payment.findUnique({ where: { id: payment.id } });
      if (!current || ![payment.providerPaymentId, result.providerPaymentId].includes(current.providerPaymentId)) throw new Error('Card payment identity changed.');
      if (current.providerPaymentId !== result.providerPaymentId) await tx.payment.update({ where: { id: payment.id }, data: { providerPaymentId: result.providerPaymentId } });
      const claimCurrent = await claimIsCurrent(tx, claim);
      await releaseClaim(tx, claim);
      if (!['pending', 'processing'].includes(current.status)) throw new Error('This card payment was closed. Refresh your trip to see the latest balance.');
      return claimCurrent && locked.status === 'confirmed';
    }, transactionOptions);
    if (result.status === 'captured') return { status: 'verifying', paymentId: payment.id, mode: 'test' };
    if (!stillPayable) {
      await reconcileProviderAttempt(context.prisma, payment.id, { reason: 'The stay changed before this card payment was made.', closing: true }).catch(() => null);
      throw new Error('This stay can no longer be paid by card. Refresh your trip to see its status.');
    }
    return {
      status: 'ready',
      clientSecret: result.data?.clientSecret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      paymentId: payment.id,
      // The exact tender reserved for this attempt: the Pay button shows this, not a page-load balance.
      amountCents: payment.amountCents,
      currencyCode: payment.currencyCode,
      mode: 'test',
    };
  }
  throw new Error('Card payment could not be prepared. Please try again.');
}

export async function completeGuestStayPayment(_root: unknown, args: { tripToken: string; paymentId: string }, context: any) {
  const reservation = await ownedReservation(context.prisma, args.tripToken);
  const payment = await context.prisma.payment.findUnique({ where: { id: args.paymentId } });
  if (!payment || payment.reservationId !== reservation.id || payment.hostOrganizationId !== reservation.hostOrganizationId
    || payment.provider !== STRIPE_PROVIDER_CODE || !payment.providerPaymentId.startsWith('pi_')) throw new Error('Payment not found for this stay.');
  // Return parameters never establish success. Retrieve authoritative evidence from Stripe.
  const result = await getPaymentStatus({ provider: STRIPE_PROVIDER_CODE, paymentId: payment.providerPaymentId });
  assertProviderIdentity(payment, result);
  if (result.status === 'failed') {
    await closeUnpayableAttempt(context, args.tripToken, reservation.id, payment, 'Stripe cancelled this payment attempt.');
    return { status: 'unpaid' };
  }
  if (result.status !== 'captured') return { status: result.data?.providerStatus === 'processing' ? 'processing' : 'unpaid' };
  const paymentStatus = await context.prisma.$transaction(async (tx: any) => {
    await lockedReservation(tx, args.tripToken, reservation.id);
    await settleSucceededPayment(tx, {
      paymentId: payment.id, expectedAmountCents: Number(result.data?.amountCents), expectedCurrencyCode: String(result.data?.currencyCode),
      evidence: { kind: 'stripe_return', providerPaymentId: payment.providerPaymentId, livemode: false }, processedAt: new Date(),
    });
    const settled = await tx.reservation.findUnique({ where: { id: reservation.id }, select: { paymentStatus: true } });
    return settled?.paymentStatus;
  }, transactionOptions);
  // `received`: this payment is recorded, but the stay still has a balance or a refund under review.
  return { status: paymentStatus === 'paid' ? 'paid' : 'received', mode: 'test' };
}
