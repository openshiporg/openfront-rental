import crypto from 'node:crypto';

import { STRIPE_PROVIDER_CODE } from '../../integrations/payment/stripe';
import { ProviderDefiniteRejection, ProviderOutcomeUnknown } from '../../integrations/payment/errors';
import { uncoveredExcessCents } from '../utils/refundGuards';
import { assertHostOrganizationAccess } from '../utils/hostOrganizationAccess';
import { enqueueOutboxEvent } from '../utils/outbox';
import { reconcileReservationPaymentEvidence, reservationPaymentStatus } from '../utils/paymentReconciliation';
import { createProviderRefund, getProviderRefund } from '../utils/paymentProviderAdapter';
import { safeHostCommandMessage } from '../utils/hostCommandError';

const transactionOptions = { maxWait: 5000, timeout: 15000, isolationLevel: 'ReadCommitted' } as const;
const openRefundStatuses = ['pending', 'processing', 'failed'];
const hostRefundReasons = ['goodwill', 'stay_issue', 'overpayment'];

function record(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

async function lockPaymentScope(tx: any, payment: { id: string; reservationId?: string | null }) {
  if (payment.reservationId) {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `reservation:${payment.reservationId}`);
    await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', payment.reservationId);
  }
  await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `payment-refund:${payment.id}`);
}

/** Recompute the stay's collected amount and payment state from the payment/refund ledger. */
export async function reconcileReservationLedger(tx: any, reservationId?: string | null) {
  if (!reservationId) return;
  const [reservation, payments, refunds] = await Promise.all([
    tx.reservation.findUnique({ where: { id: reservationId }, select: { id: true, totalAmountCents: true, currencyCode: true, testMode: true } }),
    tx.payment.findMany({ where: { reservationId }, select: { id: true, status: true, amountCents: true, refundedAmountCents: true, currencyCode: true, provider: true, data: true } }),
    tx.refund.findMany({ where: { reservationId }, select: { id: true, paymentId: true, status: true, amountCents: true, currencyCode: true } }),
  ]);
  if (!reservation) return;
  const reconciliation = reconcileReservationPaymentEvidence({ payments, refunds, currencyCode: reservation.currencyCode, testMode: reservation.testMode === true });
  await tx.reservation.update({
    where: { id: reservationId },
    data: {
      amountPaidCents: reconciliation.netPaidCents,
      paymentStatus: reservationPaymentStatus({ ...reconciliation, totalAmountCents: reservation.totalAmountCents || 0 }),
    },
  });
}

async function loadRefundForHost(context: any, refundId: string) {
  const refund = await context.prisma.refund.findUnique({ where: { id: refundId }, select: { id: true, hostOrganizationId: true, paymentId: true, reservationId: true } });
  if (!refund?.hostOrganizationId || !refund.paymentId) throw new Error('Refund not found.');
  await assertHostOrganizationAccess({ context, hostOrganizationId: refund.hostOrganizationId, permission: 'canManagePayments' });
  const payment = await context.prisma.payment.findUnique({ where: { id: refund.paymentId } });
  if (!payment || payment.hostOrganizationId !== refund.hostOrganizationId) throw new Error('The refund’s payment could not be found.');
  return { refund, payment };
}

function assertRefundAmount(locked: any, payment: any, otherOpenCents: number, amountCents: number) {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error('Refund amount must be more than zero.');
  if (amountCents > locked.amountCents) throw new Error('A refund can be reduced under the cancellation policy, not increased. Issue a separate refund for more.');
  const remaining = payment.amountCents - payment.refundedAmountCents - otherOpenCents;
  if (amountCents > remaining) throw new Error('That amount is more than remains refundable on this payment.');
}

/** How much a goodwill/stay-issue refund's credit would add back to the stay total if reduced to `newAmountCents`. */
function concessionRestoreCents(refund: any, newAmountCents: number) {
  return record(refund?.data).totalAdjustment ? Math.max((refund.amountCents || 0) - newAmountCents, 0) : 0;
}

const ORIGIN_OWED_REASONS = ['stay_amendment', 'overpayment'];
const ORIGIN_OWED_LIABILITIES = ['reservation_amendment', 'overpayment_review'];

/**
 * Money held above a live stay's total is owed back: an amendment or overpayment liability
 * can't be declined or reduced unless the stay's total changes first. The check is made on the
 * proposed final state, including any concession credit the change would reverse, so a full
 * decline of a goodwill refund that restores the total passes and genuine excess stays
 * protected. Closing the stay doesn't waive money an amendment or overpayment made owed.
 */
async function assertExcessFundsCovered(tx: any, reservationId: string | null | undefined, refundId: string, newAmountCents: number) {
  if (!reservationId) return;
  const reservation = await tx.reservation.findUnique({ where: { id: reservationId }, select: { status: true, totalAmountCents: true, currencyCode: true, testMode: true } });
  if (!reservation) return;
  if (['cancelled', 'no_show'].includes(reservation.status || '')) {
    const current = await tx.refund.findUnique({ where: { id: refundId }, select: { amountCents: true, reason: true, data: true } });
    const owedByOrigin = current && (ORIGIN_OWED_REASONS.includes(current.reason || '') || ORIGIN_OWED_LIABILITIES.includes(record(current.data).liabilityType));
    if (owedByOrigin && newAmountCents < current.amountCents) {
      throw new Error('This refund returns money an amendment or overpayment made owed; closing the stay doesn’t cancel it. Issue it, or record a separate, justified adjustment.');
    }
    return;
  }
  const [payments, refunds] = await Promise.all([
    tx.payment.findMany({ where: { reservationId }, select: { id: true, status: true, amountCents: true, refundedAmountCents: true, currencyCode: true, provider: true, data: true } }),
    tx.refund.findMany({ where: { reservationId }, select: { id: true, paymentId: true, status: true, amountCents: true, currencyCode: true } }),
  ]);
  const evidence = reconcileReservationPaymentEvidence({ payments, refunds, currencyCode: reservation.currencyCode, testMode: reservation.testMode === true });
  const current = refunds.find((item: any) => item.id === refundId);
  // The total after this change: a reversed concession credit adds back to it.
  const currentRefund = await tx.refund.findUnique({ where: { id: refundId }, select: { amountCents: true, data: true } });
  const uncovered = uncoveredExcessCents({
    netPaidCents: evidence.netPaidCents,
    totalAmountCents: reservation.totalAmountCents || 0,
    openRefundCents: evidence.openRefundCents,
    currentOpenCents: current && openRefundStatuses.includes(current.status) ? current.amountCents : 0,
    newAmountCents,
    restoredCreditCents: concessionRestoreCents(currentRefund, newAmountCents),
  });
  if (uncovered > 0) {
    throw new Error('This refund covers money held above the stay’s total, so it can’t be declined or reduced. Change the stay total first, or issue the refund.');
  }
}

/**
 * A goodwill or stay-issue refund lowered the stay's total when it was opened. Declining or
 * reducing it reverses that credit by the same amount, with the change recorded on the
 * refund; earlier entries are never rewritten.
 */
async function reverseConcessionCredit(tx: any, locked: any, newAmountCents: number, actorUserId: string) {
  const data = record(locked.data);
  if (!data.totalAdjustment || !locked.reservationId) return data;
  const reversedCents = locked.amountCents - newAmountCents;
  if (reversedCents <= 0) return data;
  const reservation = await tx.reservation.findUnique({ where: { id: locked.reservationId }, select: { totalAmountCents: true, discountTotalCents: true } });
  if (!reservation) return data;
  await tx.reservation.update({
    where: { id: locked.reservationId },
    data: {
      totalAmountCents: (reservation.totalAmountCents || 0) + reversedCents,
      discountTotalCents: Math.max((reservation.discountTotalCents || 0) - reversedCents, 0),
    },
  });
  return {
    ...data,
    creditReversals: [...(Array.isArray(data.creditReversals) ? data.creditReversals : []), {
      reversedCents,
      previousTotalCents: reservation.totalAmountCents,
      adjustedTotalCents: (reservation.totalAmountCents || 0) + reversedCents,
      byUserId: actorUserId,
      at: new Date().toISOString(),
    }],
  };
}

/**
 * Lower an open refund liability to the amount the host will actually return (for example
 * under the cancellation policy). The retained difference is recorded on the refund.
 */
async function applyPolicyAdjustment(tx: any, locked: any, payment: any, amountCents: number, note: string, actorUserId: string) {
  if (amountCents === locked.amountCents) return locked;
  if (note.length < 3) throw new Error('Explain why less than the full amount is refunded (at least 3 characters).');
  const otherOpen = await tx.refund.aggregate({ where: { paymentId: payment.id, id: { not: locked.id }, status: { in: openRefundStatuses } }, _sum: { amountCents: true } });
  assertRefundAmount(locked, payment, otherOpen._sum.amountCents || 0, amountCents);
  await assertExcessFundsCovered(tx, locked.reservationId, locked.id, amountCents);
  const data = await reverseConcessionCredit(tx, locked, amountCents, actorUserId);
  return tx.refund.update({
    where: { id: locked.id },
    data: {
      amountCents,
      data: {
        ...data,
        policyAdjustment: {
          originalAmountCents: data.policyAdjustment?.originalAmountCents ?? locked.amountCents,
          retainedCents: (data.policyAdjustment?.originalAmountCents ?? locked.amountCents) - amountCents,
          note: note.slice(0, 1000),
          adjustedByUserId: actorUserId,
          adjustedAt: new Date().toISOString(),
        },
      },
    },
  });
}

async function settleProviderRefund(context: any, { refundId, payment, idempotencyKey, result }: { refundId: string; payment: any; idempotencyKey: string; result: any }) {
  return context.prisma.$transaction(async (tx: any) => {
    await lockPaymentScope(tx, payment);
    const locked = await tx.refund.findUnique({ where: { id: refundId } });
    if (!locked) throw new Error('Refund not found.');
    if (locked.status === 'succeeded') return { status: 'succeeded', refundId, amountCents: locked.amountCents };
    const data = record(locked.data);
    if (locked.status !== 'processing' || data.stripe?.idempotencyKey !== idempotencyKey) throw new Error('This refund changed while it was being processed. Refresh to see its status.');
    if (result.rentalRefundId !== locked.id || result.amountCents !== locked.amountCents || result.currencyCode !== String(locked.currencyCode || '').toUpperCase()) {
      throw new Error('Stripe’s refund doesn’t match this refund record. Check the payment in Stripe before trying again.');
    }
    const now = new Date();
    const stripe = { ...data.stripe, providerRefundId: result.providerRefundId, providerStatus: result.providerStatus, checkedAt: now.toISOString() };
    if (result.status === 'pending') {
      await tx.refund.update({ where: { id: locked.id }, data: { providerRefundId: result.providerRefundId, data: { ...data, stripe } } });
      return { status: 'processing', refundId, amountCents: locked.amountCents };
    }
    if (result.status === 'failed') {
      await tx.refund.update({
        where: { id: locked.id },
        data: { status: 'failed', providerRefundId: null, data: { ...data, stripe: { ...stripe, lastError: result.failureReason || 'Stripe could not complete the refund.', failedAt: now.toISOString() } } },
      });
      await reconcileReservationLedger(tx, locked.reservationId);
      return { status: 'failed', refundId, amountCents: locked.amountCents };
    }
    const lockedPayment = await tx.payment.findUnique({ where: { id: payment.id } });
    const refundedAmountCents = lockedPayment.refundedAmountCents + locked.amountCents;
    if (refundedAmountCents > lockedPayment.amountCents) throw new Error('Refunds would exceed the payment amount. Check the payment in Stripe.');
    await tx.refund.update({
      where: { id: locked.id },
      data: { status: 'succeeded', providerRefundId: result.providerRefundId, processedAt: now, data: { ...data, stripe: { ...stripe, settledAt: now.toISOString() }, policyReviewRequired: false } },
    });
    await tx.payment.update({
      where: { id: lockedPayment.id },
      data: { refundedAmountCents, status: refundedAmountCents === lockedPayment.amountCents ? 'refunded' : 'partially_refunded' },
    });
    await reconcileReservationLedger(tx, locked.reservationId);
    await enqueueOutboxEvent(tx, {
      hostOrganizationId: locked.hostOrganizationId,
      eventType: 'payment.refunded',
      aggregateType: 'Refund',
      aggregateId: locked.id,
      operationKey: `stripe:${result.providerRefundId}`,
      payload: { refundId: locked.id, paymentId: lockedPayment.id, reservationId: locked.reservationId, amountCents: locked.amountCents, currencyCode: locked.currencyCode, reconciliationMethod: 'stripe_test_refund', providerRefundId: result.providerRefundId },
    });
    return { status: 'succeeded', refundId, amountCents: locked.amountCents };
  }, transactionOptions);
}

/**
 * Send an open card refund to Stripe (TEST mode only), or check one Stripe is still
 * processing. Pattern from openfront-hotel refundIntentWorker: claim the liability in a
 * transaction, call the provider outside it, then settle against the claimed attempt.
 */
export async function processStayRefund(context: any, args: { refundId: string; amountCents?: number | null; note?: string | null }) {
  const { refund, payment } = await loadRefundForHost(context, args.refundId);
  if (payment.provider !== STRIPE_PROVIDER_CODE) throw new Error('This payment wasn’t taken by card. Record the refund once you’ve returned the money.');
  if (!String(payment.providerPaymentId || '').startsWith('pi_')) throw new Error('This card payment has no Stripe reference, so it can’t be refunded here.');
  const actorUserId = context.session?.itemId;
  const note = args.note?.trim() || '';

  const claim = await context.prisma.$transaction(async (tx: any) => {
    await lockPaymentScope(tx, payment);
    let locked = await tx.refund.findUnique({ where: { id: refund.id } });
    if (!locked || locked.paymentId !== payment.id) throw new Error('Refund not found.');
    const data = record(locked.data);
    if (locked.status === 'review') throw new Error('Assess this refund before issuing it: decide the amount, or decline it.');
    if (locked.status === 'succeeded') return { done: true as const };
    if (locked.status === 'cancelled') throw new Error('This refund was declined and is closed.');
    if (locked.status === 'processing') {
      if (!data.stripe?.idempotencyKey) throw new Error('This refund is being recorded another way. Refresh to see its status.');
      // A retry keeps the original key, body and first-sent time: the adapter decides from them
      // whether the original request may still be safely resent.
      return { idempotencyKey: data.stripe.idempotencyKey as string, providerRefundId: data.stripe.providerRefundId as string | undefined, amountCents: locked.amountCents, firstSubmittedAt: String(data.stripe.startedAt || locked.updatedAt?.toISOString?.() || '') };
    }
    const lockedPayment = await tx.payment.findUnique({ where: { id: payment.id } });
    if (!['succeeded', 'partially_refunded'].includes(lockedPayment?.status)) throw new Error('Only a settled card payment can be refunded.');
    const amountCents = args.amountCents == null ? locked.amountCents : args.amountCents;
    locked = await applyPolicyAdjustment(tx, locked, lockedPayment, amountCents, note, actorUserId);
    const otherOpen = await tx.refund.aggregate({ where: { paymentId: payment.id, id: { not: locked.id }, status: { in: openRefundStatuses } }, _sum: { amountCents: true } });
    assertRefundAmount(locked, lockedPayment, otherOpen._sum.amountCents || 0, locked.amountCents);
    const attempt = Number(record(locked.data).stripe?.attempt || 0) + 1;
    const idempotencyKey = `rental-refund:${locked.id}:${attempt}`;
    // The request's identity is durable before it is first sent.
    const startedAt = new Date().toISOString();
    await tx.refund.update({
      where: { id: locked.id },
      data: { status: 'processing', data: { ...record(locked.data), stripe: { attempt, idempotencyKey, startedAt, startedByUserId: actorUserId } } },
    });
    return { idempotencyKey, providerRefundId: undefined, amountCents: locked.amountCents, firstSubmittedAt: startedAt };
  }, transactionOptions);
  if ('done' in claim) return { status: 'succeeded', refundId: refund.id };

  let result;
  try {
    result = claim.providerRefundId
      ? await getProviderRefund({ provider: STRIPE_PROVIDER_CODE, providerRefundId: claim.providerRefundId, providerPaymentId: payment.providerPaymentId })
      : await createProviderRefund({
        provider: STRIPE_PROVIDER_CODE,
        providerPaymentId: payment.providerPaymentId,
        amount: claim.amountCents,
        idempotencyKey: claim.idempotencyKey,
        metadata: { rentalRefundId: refund.id, rentalPaymentId: payment.id, reservationId: payment.reservationId || '' },
        expected: { rentalPaymentId: payment.id, reservationId: payment.reservationId || null },
        firstSubmittedAt: claim.firstSubmittedAt,
      });
  } catch (error: any) {
    // Only Stripe's definite refusal of this exact create request frees the liability for a new
    // attempt. A failed lookup, timeout, outage or an expired-key uncertainty stays processing:
    // the original request keeps its key and is reconciled, never replaced from absence.
    const definite = error instanceof ProviderDefiniteRejection && !claim.providerRefundId;
    if (error instanceof ProviderOutcomeUnknown) {
      await context.prisma.$transaction(async (tx: any) => {
        await lockPaymentScope(tx, payment);
        const locked = await tx.refund.findUnique({ where: { id: refund.id } });
        const data = record(locked?.data);
        if (locked?.status !== 'processing' || data.stripe?.idempotencyKey !== claim.idempotencyKey) return;
        await tx.refund.update({ where: { id: locked.id }, data: { data: { ...data, stripe: { ...data.stripe, reconciliation: { state: 'unknown', checkedAt: new Date().toISOString(), note: error.message } } } } });
      }, transactionOptions);
    }
    if (definite) {
      await context.prisma.$transaction(async (tx: any) => {
        await lockPaymentScope(tx, payment);
        const locked = await tx.refund.findUnique({ where: { id: refund.id } });
        const data = record(locked?.data);
        if (locked?.status !== 'processing' || data.stripe?.idempotencyKey !== claim.idempotencyKey) return;
        await tx.refund.update({ where: { id: locked.id }, data: { status: 'failed', data: { ...data, stripe: { ...data.stripe, lastError: safeHostCommandMessage(error), failedAt: new Date().toISOString() } } } });
        await reconcileReservationLedger(tx, locked.reservationId);
      }, transactionOptions);
    }
    throw error;
  }
  return settleProviderRefund(context, { refundId: refund.id, payment, idempotencyKey: claim.idempotencyKey, result });
}

/** Close an open refund liability without returning money (for example, non-refundable under the policy). */
export async function declineStayRefund(context: any, args: { refundId: string; note?: string | null }) {
  const note = args.note?.trim() || '';
  if (note.length < 3) throw new Error('Explain why this refund is declined (at least 3 characters).');
  const { refund, payment } = await loadRefundForHost(context, args.refundId);
  return context.prisma.$transaction(async (tx: any) => {
    await lockPaymentScope(tx, payment);
    const locked = await tx.refund.findUnique({ where: { id: refund.id } });
    if (!locked || !['review', 'pending', 'failed'].includes(locked.status)) throw new Error('Only a refund under review, pending or failed can be declined.');
    await assertExcessFundsCovered(tx, locked.reservationId, locked.id, 0);
    const data = await reverseConcessionCredit(tx, locked, 0, context.session?.itemId);
    await tx.refund.update({
      where: { id: locked.id },
      data: { status: 'cancelled', data: { ...data, declined: { note: note.slice(0, 1000), byUserId: context.session?.itemId, at: new Date().toISOString() } } },
    });
    await reconcileReservationLedger(tx, locked.reservationId);
    await enqueueOutboxEvent(tx, {
      hostOrganizationId: locked.hostOrganizationId,
      eventType: 'refund.declined',
      aggregateType: 'Refund',
      aggregateId: locked.id,
      operationKey: `decline:${locked.id}`,
      payload: { refundId: locked.id, paymentId: locked.paymentId, reservationId: locked.reservationId, amountCents: locked.amountCents },
    });
    return { status: 'cancelled', refundId: locked.id };
  }, transactionOptions);
}

/**
 * Reduce an open liability before recording a manual refund for the reduced amount, or assess
 * a refund under review: the host's decided amount (at most the candidate) becomes a pending
 * liability, with the assessment recorded on the refund. Nothing under review is ever paid
 * out without that assessment.
 */
export async function adjustStayRefund(context: any, args: { refundId: string; amountCents: number; note?: string | null }) {
  const { refund, payment } = await loadRefundForHost(context, args.refundId);
  return context.prisma.$transaction(async (tx: any) => {
    await lockPaymentScope(tx, payment);
    const locked = await tx.refund.findUnique({ where: { id: refund.id } });
    if (locked?.status === 'review') {
      const note = args.note?.trim() || '';
      if (note.length < 3) throw new Error('Explain how you assessed this refund (at least 3 characters).');
      if (!Number.isSafeInteger(args.amountCents) || args.amountCents <= 0 || args.amountCents > locked.amountCents) {
        throw new Error('Choose an amount between 1 and the amount under review, or decline the refund.');
      }
      const lockedPayment = await tx.payment.findUnique({ where: { id: payment.id } });
      const otherOpen = await tx.refund.aggregate({ where: { paymentId: payment.id, id: { not: locked.id }, status: { in: openRefundStatuses } }, _sum: { amountCents: true } });
      assertRefundAmount(locked, lockedPayment, otherOpen._sum.amountCents || 0, args.amountCents);
      const data = record(locked.data);
      const updated = await tx.refund.update({
        where: { id: locked.id },
        data: {
          status: 'pending',
          amountCents: args.amountCents,
          data: {
            ...data,
            policyReviewRequired: false,
            assessment: { candidateCents: locked.amountCents, assessedCents: args.amountCents, note: note.slice(0, 1000), assessedByUserId: context.session?.itemId, assessedAt: new Date().toISOString() },
          },
        },
      });
      await reconcileReservationLedger(tx, locked.reservationId);
      return updated;
    }
    if (!locked || !['pending', 'failed'].includes(locked.status)) throw new Error('Only a pending or failed refund can be changed.');
    const lockedPayment = await tx.payment.findUnique({ where: { id: payment.id } });
    const updated = await applyPolicyAdjustment(tx, locked, lockedPayment, args.amountCents, args.note?.trim() || '', context.session?.itemId);
    await reconcileReservationLedger(tx, locked.reservationId);
    return updated;
  }, transactionOptions);
}

/**
 * Open a new host refund on a settled payment (goodwill, a stay issue, or an overpayment).
 * Goodwill and stay-issue refunds on a stay that still goes ahead lower its total by the
 * same amount, so the guest isn't asked to pay the refunded money again.
 */
export async function createStayRefund(context: any, args: { paymentId: string; amountCents: number; reason: string; note?: string | null; operationKey: string }) {
  const note = args.note?.trim() || '';
  if (!hostRefundReasons.includes(args.reason)) throw new Error('Choose a refund reason.');
  if (note.length < 3 || note.length > 1000) throw new Error('Describe the refund (3 to 1000 characters).');
  const operationKey = args.operationKey?.trim() || '';
  if (operationKey.length < 8 || operationKey.length > 200) throw new Error('Refund request is missing its submission key. Refresh and try again.');
  const payment = await context.prisma.payment.findUnique({ where: { id: args.paymentId } });
  if (!payment?.hostOrganizationId) throw new Error('Payment not found.');
  await assertHostOrganizationAccess({ context, hostOrganizationId: payment.hostOrganizationId, permission: 'canManagePayments' });
  const idempotencyKey = `host-refund:${crypto.createHash('sha256').update(`${payment.id}|${operationKey}`).digest('hex')}`;
  // A replay must be the same request; the same key with different terms is refused.
  const requestFingerprint = crypto.createHash('sha256').update(JSON.stringify({ paymentId: payment.id, amountCents: args.amountCents, reason: args.reason, note })).digest('hex');
  return context.prisma.$transaction(async (tx: any) => {
    await lockPaymentScope(tx, payment);
    const existing = await tx.refund.findUnique({ where: { idempotencyKey } });
    if (existing) {
      const fingerprint = record(existing.data).requestFingerprint;
      if (fingerprint ? fingerprint !== requestFingerprint : (existing.amountCents !== args.amountCents || existing.reason !== args.reason)) {
        throw new Error('This refund request was already submitted with different details. Refresh and start a new refund.');
      }
      return existing;
    }
    const lockedPayment = await tx.payment.findUnique({ where: { id: payment.id } });
    if (!['succeeded', 'partially_refunded'].includes(lockedPayment.status)) throw new Error('Only a settled payment can be refunded.');
    const otherOpen = await tx.refund.aggregate({ where: { paymentId: payment.id, status: { in: openRefundStatuses } }, _sum: { amountCents: true } });
    const remaining = lockedPayment.amountCents - lockedPayment.refundedAmountCents - (otherOpen._sum.amountCents || 0);
    if (!Number.isSafeInteger(args.amountCents) || args.amountCents <= 0 || args.amountCents > remaining) throw new Error('That amount is more than remains refundable on this payment.');
    const reservation = lockedPayment.reservationId
      ? await tx.reservation.findUnique({ where: { id: lockedPayment.reservationId }, select: { id: true, status: true, confirmationCode: true, totalAmountCents: true, discountTotalCents: true } })
      : null;
    let totalAdjustment = null;
    if (reservation && args.reason !== 'overpayment' && !['cancelled', 'no_show'].includes(reservation.status || '')) {
      if (args.amountCents > (reservation.totalAmountCents || 0)) throw new Error('That amount is more than the stay total.');
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { totalAmountCents: (reservation.totalAmountCents || 0) - args.amountCents, discountTotalCents: (reservation.discountTotalCents || 0) + args.amountCents },
      });
      totalAdjustment = { previousTotalCents: reservation.totalAmountCents, adjustedTotalCents: (reservation.totalAmountCents || 0) - args.amountCents };
    }
    const id = crypto.randomUUID();
    const created = await tx.refund.create({
      data: {
        id,
        hostOrganizationId: lockedPayment.hostOrganizationId,
        reservationId: lockedPayment.reservationId,
        paymentId: lockedPayment.id,
        refundNumber: `REF-${reservation?.confirmationCode || 'PAY'}-${id.slice(0, 8).toUpperCase()}`,
        idempotencyKey,
        status: 'pending',
        reason: args.reason,
        amountCents: args.amountCents,
        currencyCode: lockedPayment.currencyCode,
        data: { hostInitiated: { note, byUserId: context.session?.itemId, at: new Date().toISOString() }, totalAdjustment, policyReviewRequired: false, requestFingerprint },
      },
    });
    await reconcileReservationLedger(tx, lockedPayment.reservationId);
    return created;
  }, transactionOptions);
}
