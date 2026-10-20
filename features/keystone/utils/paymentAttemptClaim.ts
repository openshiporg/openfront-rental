import crypto from 'node:crypto';

import type { PaymentAttemptIdentity } from '../../integrations/payment/errors';
import { STRIPE_KEY_REPLAY_WINDOW_MS, STRIPE_PROVIDER_CODE, stripeCredentialVersion } from '../../integrations/payment/stripe';

/**
 * Execution claims for provider payment attempts. A claim is taken under the stay's lock before
 * any provider call, re-validated (current, unexpired, stay not closing) immediately before
 * each call, and checked again when the outcome is attached. A stay closure revokes every claim,
 * so a paused or stale runner can't create, cancel or hand out card entry on old authority.
 */

const LEASE_MS = 90_000;

export type AttemptClaim = { paymentId: string; token: string; epoch: number };

export class PaymentAttemptBusy extends Error {
  constructor() { super('This payment is being processed. Try again in a minute.'); this.name = 'PaymentAttemptBusy'; }
}

function record(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

/** The nonsecret provider configuration an attempt is created under; frozen on the attempt. */
export function providerLineage(provider: { id: string; code: string }) {
  return { providerId: provider.id, code: provider.code, mode: 'test', credentialVersion: provider.code === STRIPE_PROVIDER_CODE ? stripeCredentialVersion() : null };
}

/** An attempt is only acted on under the credentials it was created with. */
export function assertLineageCurrent(payment: any) {
  const lineage = record(record(payment.data).lineage);
  if (payment.provider !== STRIPE_PROVIDER_CODE || !lineage.credentialVersion) return;
  if (lineage.credentialVersion !== stripeCredentialVersion()) {
    throw new Error('The card provider’s account settings changed since this attempt was made. It needs review in Stripe; nothing was changed.');
  }
}

export function attemptIdentity(payment: any): PaymentAttemptIdentity {
  return {
    rentalPaymentId: payment.id,
    reservationId: payment.reservationId || null,
    idempotencyKey: payment.idempotencyKey || null,
    amountCents: payment.amountCents,
    currencyCode: payment.currencyCode,
  };
}

/** The original create request may be resent only well inside the key's retention, from when it was first sent. */
export function replayWindowOpen(payment: any, now = Date.now()) {
  const first = Date.parse(String(record(payment.data).firstSubmittedAt || payment.createdAt?.toISOString?.() || payment.createdAt || ''));
  return Number.isFinite(first) && now - first < STRIPE_KEY_REPLAY_WINDOW_MS;
}

/** Takes the attempt's claim. The caller holds the stay lock and has re-read the stay. */
export async function claimAttempt(tx: any, paymentId: string, purpose: string, actorUserId?: string | null): Promise<AttemptClaim> {
  await tx.$queryRawUnsafe('SELECT "id" FROM "Payment" WHERE "id" = $1 FOR UPDATE', paymentId);
  const current = await tx.payment.findUnique({ where: { id: paymentId } });
  if (!current || !['pending', 'processing'].includes(current.status)) throw new Error('This payment attempt already changed. Refresh to see it.');
  assertLineageCurrent(current);
  const data = record(current.data);
  const execution = record(data.execution);
  if (execution.token && Date.parse(execution.leaseUntil) > Date.now()) throw new PaymentAttemptBusy();
  const claim = { paymentId, token: crypto.randomUUID(), epoch: Number(execution.epoch || 0) + 1 };
  await tx.payment.update({
    where: { id: paymentId },
    data: { data: { ...data, execution: { epoch: claim.epoch, token: claim.token, leaseUntil: new Date(Date.now() + LEASE_MS).toISOString(), purpose, actorUserId: actorUserId || null } } },
  });
  return claim;
}

/**
 * Re-validates the claim immediately before a provider call and renews its lease. `submission`
 * records when the original create request is first sent (durably, before sending);
 * `replay` refuses once that request is too old to resend. `closing` lets a closer act on an
 * attempt whose stay is being closed.
 */
export async function admitProviderCall(prisma: any, claim: AttemptClaim, options: { submission?: boolean; replay?: boolean; closing?: boolean } = {}) {
  return prisma.$transaction(async (tx: any) => {
    await tx.$queryRawUnsafe('SELECT "id" FROM "Payment" WHERE "id" = $1 FOR UPDATE', claim.paymentId);
    const current = await tx.payment.findUnique({ where: { id: claim.paymentId } });
    const data = record(current?.data);
    const execution = record(data.execution);
    if (!current || !['pending', 'processing'].includes(current.status)) throw new Error('This payment attempt already changed. Refresh to see it.');
    if (execution.token !== claim.token || execution.epoch !== claim.epoch || !(Date.parse(execution.leaseUntil) > Date.now())) {
      throw new Error('This payment attempt was taken over or its stay changed. Refresh to see it.');
    }
    if (data.closureRequested && !options.closing) throw new Error('This stay is being closed, so this card payment can’t continue.');
    assertLineageCurrent(current);
    if (options.replay && !replayWindowOpen(current)) throw new Error('This attempt is too old to resend safely. It needs review in Stripe.');
    const now = new Date();
    await tx.payment.update({
      where: { id: claim.paymentId },
      data: { data: { ...data, ...(options.submission && !data.firstSubmittedAt ? { firstSubmittedAt: now.toISOString() } : {}), execution: { ...execution, leaseUntil: new Date(now.getTime() + LEASE_MS).toISOString() } } },
    });
    return current;
  }, { maxWait: 5000, timeout: 10000, isolationLevel: 'ReadCommitted' });
}

/** Whether the claim is still the attempt's current one (checked inside the caller's locked transaction). */
export async function claimIsCurrent(tx: any, claim: AttemptClaim) {
  const current = await tx.payment.findUnique({ where: { id: claim.paymentId }, select: { data: true } });
  const execution = record(record(current?.data).execution);
  return execution.token === claim.token && execution.epoch === claim.epoch && Date.parse(execution.leaseUntil) > Date.now();
}

/** Ends the claim (inside the caller's locked transaction); a newer claim is left alone. */
export async function releaseClaim(tx: any, claim: AttemptClaim) {
  const current = await tx.payment.findUnique({ where: { id: claim.paymentId }, select: { data: true } });
  const data = record(current?.data);
  if (record(data.execution).token !== claim.token) return;
  await tx.payment.update({ where: { id: claim.paymentId }, data: { data: { ...data, execution: { ...record(data.execution), token: null, leaseUntil: null } } } });
}

/**
 * Part of every stay closure: open provider attempts are marked for cancellation and their
 * claims revoked in the closing transaction, so nothing stale can keep collecting. The provider
 * cancellation itself runs after commit (see `reconcileProviderAttempt`); a payment that still
 * succeeds is settled as real evidence and handled as money held on a closed stay.
 */
export async function requestAttemptClosure(tx: any, reservationId: string, reason: string) {
  const open = await tx.payment.findMany({ where: { reservationId, status: { in: ['pending', 'processing'] }, NOT: { provider: { in: ['manual', 'pp_system_default'] } } }, select: { id: true, data: true } });
  for (const payment of open) {
    const data = record(payment.data);
    const execution = record(data.execution);
    await tx.payment.update({
      where: { id: payment.id },
      data: { data: { ...data, closureRequested: data.closureRequested || { at: new Date().toISOString(), reason }, execution: { ...execution, epoch: Number(execution.epoch || 0) + 1, token: null, leaseUntil: null } } },
    });
  }
  return open.map((payment: any) => payment.id as string);
}
