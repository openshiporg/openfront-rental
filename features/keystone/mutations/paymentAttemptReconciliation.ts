import { cancelProviderPayment, createPayment, findProviderPayment } from '../utils/paymentProviderAdapter';
import { admitProviderCall, attemptIdentity, claimAttempt, releaseClaim, replayWindowOpen, type AttemptClaim } from '../utils/paymentAttemptClaim';
import { settleSucceededPayment } from '../utils/paymentSettlement';
import { STRIPE_PROVIDER_CODE } from '../../integrations/payment/stripe';

const transactionOptions = { maxWait: 5000, timeout: 10000, isolationLevel: 'ReadCommitted' } as const;

export type AttemptReconciliation = { status: 'cancelled' | 'succeeded' | 'processing' | 'unknown' | 'unchanged'; message?: string };

function record(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

async function lockStay(tx: any, reservationId?: string | null) {
  if (!reservationId) return;
  await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `reservation:${reservationId}`);
  await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', reservationId);
}

/**
 * Establishes what actually happened to a card attempt at Stripe, and closes it only from
 * Stripe's own correlated receipt for this attempt:
 * - an attached intent is identity-checked, then cancelled (or found paid and settled);
 * - an unattached attempt still inside its key's retention is resent with its ORIGINAL key and
 *   body, which returns the intent the original request made (or makes it now), then cancelled;
 * - an older unattached attempt is looked up by the metadata this server wrote. If nothing is
 *   found it stays open as unknown: a missing search result, an attestation or its age never
 *   proves the original request had no effect, so nothing is released or charged again.
 */
export async function reconcileProviderAttempt(prisma: any, paymentId: string, { reason, actorUserId, closing }: { reason: string; actorUserId?: string | null; closing: boolean }): Promise<AttemptReconciliation> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || !['pending', 'processing'].includes(payment.status) || payment.provider !== STRIPE_PROVIDER_CODE) return { status: 'unchanged' };
  const claim: AttemptClaim = await prisma.$transaction(async (tx: any) => {
    await lockStay(tx, payment.reservationId);
    return claimAttempt(tx, payment.id, closing ? 'stay_closure' : 'host_reconcile', actorUserId);
  }, transactionOptions);
  const expected = attemptIdentity(payment);
  let result: any;
  try {
    let providerPaymentId = String(payment.providerPaymentId || '').startsWith('pi_') ? payment.providerPaymentId : null;
    if (!providerPaymentId && replayWindowOpen(payment)) {
      await admitProviderCall(prisma, claim, { closing: true, replay: true, submission: true });
      const original = await createPayment({ provider: STRIPE_PROVIDER_CODE, reservation: { id: payment.reservationId }, amount: payment.amountCents, currency: payment.currencyCode, idempotencyKey: payment.idempotencyKey, metadata: { rentalPaymentId: payment.id } });
      providerPaymentId = original.providerPaymentId || null;
    } else if (!providerPaymentId) {
      const found = await findProviderPayment({ provider: STRIPE_PROVIDER_CODE, rentalPaymentId: payment.id });
      providerPaymentId = found?.providerPaymentId || null;
    }
    if (!providerPaymentId) {
      const message = 'Stripe shows no payment for this attempt, but its original request is too old to resend, so that doesn’t prove nothing happened. It stays open until Stripe reports its outcome.';
      await prisma.$transaction(async (tx: any) => {
        await lockStay(tx, payment.reservationId);
        const current = await tx.payment.findUnique({ where: { id: payment.id } });
        const data = record(current?.data);
        await tx.payment.update({ where: { id: payment.id }, data: { data: { ...data, reconciliation: { state: 'unknown', checkedAt: new Date().toISOString(), byUserId: actorUserId || null, reason } } } });
        await releaseClaim(tx, claim);
      }, transactionOptions);
      return { status: 'unknown', message };
    }
    await admitProviderCall(prisma, claim, { closing: true });
    result = await cancelProviderPayment({ provider: STRIPE_PROVIDER_CODE, paymentId: providerPaymentId, expected });
  } catch (error) {
    await prisma.$transaction(async (tx: any) => releaseClaim(tx, claim), transactionOptions).catch(() => undefined);
    throw error;
  }
  return prisma.$transaction(async (tx: any) => {
    await lockStay(tx, payment.reservationId);
    const current = await tx.payment.findUnique({ where: { id: payment.id } });
    if (!current) return { status: 'unchanged' as const };
    // The provider's id is evidence of what the original request made: always recorded.
    if (result.providerPaymentId && current.providerPaymentId !== result.providerPaymentId) {
      await tx.payment.update({ where: { id: current.id }, data: { providerPaymentId: result.providerPaymentId } });
    }
    if (!['pending', 'processing'].includes(current.status)) { await releaseClaim(tx, claim); return { status: 'unchanged' as const }; }
    if (result.status === 'captured') {
      // Paid after all: the money is recorded as received (a closed stay then owes it back or reviews it).
      await settleSucceededPayment(tx, {
        paymentId: current.id, expectedAmountCents: Number(result.data?.amountCents), expectedCurrencyCode: String(result.data?.currencyCode),
        evidence: { kind: 'host_reconciliation', providerPaymentId: result.providerPaymentId, livemode: false, actorUserId: actorUserId || null }, processedAt: new Date(), ...(actorUserId ? { processedByUserId: actorUserId } : {}),
      });
      await releaseClaim(tx, claim);
      return { status: 'succeeded' as const };
    }
    if (result.status !== 'failed') {
      await releaseClaim(tx, claim);
      return { status: 'processing' as const, message: 'Stripe is still processing this payment. Check again later; it can’t be closed yet.' };
    }
    const data = record((await tx.payment.findUnique({ where: { id: current.id }, select: { data: true } }))?.data);
    await tx.payment.update({
      where: { id: current.id },
      data: {
        status: 'cancelled',
        errorMessage: reason,
        data: { ...data, execution: { ...record(data.execution), token: null, leaseUntil: null }, closedAt: new Date().toISOString(), closedReason: reason, closedByUserId: actorUserId || null, providerOutcome: 'canceled', providerReceipt: { providerPaymentId: result.providerPaymentId, providerStatus: result.data?.providerStatus || 'canceled' } },
      },
    });
    return { status: 'cancelled' as const };
  }, transactionOptions);
}

/** After a stay closure commits: ask Stripe to cancel each attempt the closure marked. Failures stay marked for the host. */
export async function reconcileClosingAttempts(prisma: any, paymentIds: string[]) {
  const outcomes: Array<{ paymentId: string; status: string }> = [];
  for (const paymentId of paymentIds) {
    try {
      const outcome = await reconcileProviderAttempt(prisma, paymentId, { reason: 'The stay was closed before this card payment was made.', closing: true });
      outcomes.push({ paymentId, status: outcome.status });
    } catch {
      outcomes.push({ paymentId, status: 'needs_review' });
    }
  }
  return outcomes;
}
