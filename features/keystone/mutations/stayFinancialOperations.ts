import crypto from 'node:crypto';

import { getPaymentAdapter } from '../../integrations/payment';
import { assertHostOrganizationAccess } from '../utils/hostOrganizationAccess';
import { enqueueOutboxEvent } from '../utils/outbox';

function refundKey(paymentId: string, amountCents: number, reason: string) {
  return `refund:${crypto.createHash('sha256').update(`${paymentId}|${amountCents}|${reason}`).digest('hex')}`;
}

export async function refundStayPayment(
  _root: unknown,
  args: { paymentId: string; amountCents: number; reason?: string | null },
  context: any,
) {
  const payment = await context.query.Payment.findOne({ where: { id: args.paymentId }, query: 'id provider hostOrganization { id }' });
  if (!payment?.hostOrganization?.id) throw new Error('Payment not found.');
  await assertHostOrganizationAccess({ context, hostOrganizationId: payment.hostOrganization.id, permission: 'canManagePayments' });
  if (!Number.isSafeInteger(args.amountCents) || args.amountCents <= 0) throw new Error('Refund amount must use positive integer cents.');
  const reason = args.reason?.trim() || 'other';
  if (!['guest_cancellation', 'host_cancellation', 'stay_issue', 'overpayment', 'goodwill', 'other'].includes(reason)) throw new Error('Refund reason is invalid.');
  const idempotencyKey = refundKey(payment.id, args.amountCents, reason);
  const adapter = getPaymentAdapter(payment.provider);
  if (adapter.code !== 'pp_system_default') throw new Error('Refunds are enabled only for the installed manual payment adapter.');

  return context.prisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `payment-refund:${payment.id}`);
    const existing = await tx.refund.findUnique({ where: { idempotencyKey } });
    if (existing) return existing;
    const locked = await tx.payment.findUnique({ where: { id: payment.id } });
    if (!locked || !['succeeded', 'partially_refunded'].includes(locked.status)) throw new Error('Only a settled payment can be refunded.');
    const remaining = locked.amountCents - locked.refundedAmountCents;
    if (args.amountCents > remaining) throw new Error('Refund amount exceeds the unrefunded payment balance.');
    const result = await adapter.refundPayment({ paymentId: locked.providerPaymentId || locked.id, amount: args.amountCents });
    if (result.status !== 'refunded') throw new Error('Manual refund evidence was not accepted.');
    const id = crypto.randomUUID();
    const refund = await tx.refund.create({
      data: {
        id,
        hostOrganizationId: locked.hostOrganizationId,
        reservationId: locked.reservationId,
        paymentId: locked.id,
        refundNumber: `REF-${id.slice(0, 8).toUpperCase()}`,
        idempotencyKey,
        status: 'succeeded',
        reason,
        amountCents: args.amountCents,
        currencyCode: locked.currencyCode,
        providerRefundId: `manual-refund-${id}`,
        processedAt: new Date(),
        data: { adapter: adapter.code, evidence: result.data },
      },
    });
    const refundedAmountCents = locked.refundedAmountCents + args.amountCents;
    const paymentStatus = refundedAmountCents === locked.amountCents ? 'refunded' : 'partially_refunded';
    await tx.payment.update({ where: { id: locked.id }, data: { refundedAmountCents, status: paymentStatus } });
    if (locked.reservationId) {
      const successful = await tx.payment.aggregate({ where: { reservationId: locked.reservationId, status: { in: ['succeeded', 'partially_refunded', 'refunded'] } }, _sum: { amountCents: true, refundedAmountCents: true } });
      const netPaid = (successful._sum.amountCents || 0) - (successful._sum.refundedAmountCents || 0);
      const reservation = await tx.reservation.findUnique({ where: { id: locked.reservationId }, select: { totalAmountCents: true } });
      await tx.reservation.update({ where: { id: locked.reservationId }, data: { amountPaidCents: netPaid, paymentStatus: netPaid <= 0 ? 'refunded' : netPaid < (reservation?.totalAmountCents || 0) ? 'partially_refunded' : 'paid' } });
    }
    await enqueueOutboxEvent(tx, { hostOrganizationId: locked.hostOrganizationId, eventType: 'payment.refunded', aggregateType: 'Refund', aggregateId: id, operationKey: idempotencyKey, payload: { refundId: id, paymentId: locked.id, reservationId: locked.reservationId, amountCents: args.amountCents, currencyCode: locked.currencyCode } });
    return refund;
  }, { maxWait: 5000, timeout: 15000, isolationLevel: 'Serializable' });
}

const depositTransitions: Record<string, string[]> = {
  authorize: ['required'],
  hold: ['required', 'authorized'],
  release: ['authorized', 'held', 'partially_captured'],
  capture: ['held', 'partially_captured'],
  fail: ['required', 'authorized', 'held'],
};

export async function transitionSecurityDeposit(
  _root: unknown,
  args: { depositId: string; transition: string; amountCents?: number | null; reference?: string | null },
  context: any,
) {
  const deposit = await context.query.SecurityDeposit.findOne({ where: { id: args.depositId }, query: 'id hostOrganization { id }' });
  if (!deposit?.hostOrganization?.id) throw new Error('Security deposit not found.');
  await assertHostOrganizationAccess({ context, hostOrganizationId: deposit.hostOrganization.id, permission: 'canManagePayments' });
  if (!depositTransitions[args.transition]) throw new Error('Unsupported security deposit transition.');
  return context.prisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `security-deposit:${deposit.id}`);
    const locked = await tx.securityDeposit.findUnique({ where: { id: deposit.id } });
    if (!locked || !depositTransitions[args.transition].includes(locked.status)) throw new Error(`Cannot ${args.transition} this security deposit.`);
    const now = new Date();
    const data: Record<string, unknown> = {};
    if (args.transition === 'authorize') data.status = 'authorized';
    if (args.transition === 'hold') { data.status = 'held'; data.heldAt = now; }
    if (args.transition === 'release') { data.status = 'released'; data.releasedAt = now; }
    if (args.transition === 'fail') data.status = 'failed';
    if (args.transition === 'capture') {
      const amount = args.amountCents || 0;
      if (!Number.isSafeInteger(amount) || amount <= 0 || amount > locked.amountCents - locked.capturedAmountCents) throw new Error('Deposit capture amount is invalid.');
      const capturedAmountCents = locked.capturedAmountCents + amount;
      data.capturedAmountCents = capturedAmountCents;
      data.status = capturedAmountCents === locked.amountCents ? 'captured' : 'partially_captured';
    }
    const reference = args.reference?.trim();
    if (reference) data.providerReference = reference.slice(0, 500);
    const updated = await tx.securityDeposit.update({ where: { id: locked.id }, data });
    await enqueueOutboxEvent(tx, { hostOrganizationId: locked.hostOrganizationId, eventType: `security_deposit.${updated.status}`, aggregateType: 'SecurityDeposit', aggregateId: locked.id, operationKey: `${args.transition}:${updated.capturedAmountCents}:${now.toISOString()}`, payload: { depositId: locked.id, reservationId: locked.reservationId, status: updated.status, amountCents: updated.amountCents, capturedAmountCents: updated.capturedAmountCents } });
    return updated;
  }, { maxWait: 5000, timeout: 10000, isolationLevel: 'ReadCommitted' });
}

const damageClaimTransitions: Record<string, { from: string[]; to: string }> = {
  submit: { from: ['draft'], to: 'submitted' },
  record_guest_response: { from: ['submitted'], to: 'guest_response' },
  approve: { from: ['submitted', 'guest_response'], to: 'approved' },
  partially_approve: { from: ['submitted', 'guest_response'], to: 'partially_approved' },
  decline: { from: ['submitted', 'guest_response'], to: 'declined' },
  settle: { from: ['approved', 'partially_approved'], to: 'settled' },
};

export async function transitionDamageClaim(
  _root: unknown,
  args: { claimId: string; transition: string; approvedAmountCents?: number | null },
  context: any,
) {
  const claim = await context.query.DamageClaim.findOne({ where: { id: args.claimId }, query: 'id hostOrganization { id }' });
  if (!claim?.hostOrganization?.id) throw new Error('Damage claim not found.');
  await assertHostOrganizationAccess({ context, hostOrganizationId: claim.hostOrganization.id, permission: 'canManageReservations' });
  const transition = damageClaimTransitions[args.transition];
  if (!transition) throw new Error('Unsupported damage claim transition.');
  return context.prisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `damage-claim:${claim.id}`);
    const locked = await tx.damageClaim.findUnique({ where: { id: claim.id } });
    if (!locked || !transition.from.includes(locked.status)) throw new Error(`Cannot ${args.transition.replaceAll('_', ' ')} this damage claim.`);
    const data: Record<string, unknown> = { status: transition.to };
    if (args.transition === 'submit') data.submittedAt = new Date();
    if (['approve', 'partially_approve'].includes(args.transition)) {
      const amount = args.approvedAmountCents ?? (args.transition === 'approve' ? locked.claimedAmountCents : 0);
      if (!Number.isSafeInteger(amount) || amount < 0 || amount > locked.claimedAmountCents) throw new Error('Approved claim amount is invalid.');
      if (args.transition === 'partially_approve' && (amount <= 0 || amount >= locked.claimedAmountCents)) throw new Error('A partial approval must be above zero and below the claimed amount.');
      data.approvedAmountCents = amount;
      data.resolvedAt = new Date();
    }
    if (args.transition === 'decline') { data.approvedAmountCents = 0; data.resolvedAt = new Date(); }
    if (args.transition === 'settle') data.resolvedAt = new Date();
    const updated = await tx.damageClaim.update({ where: { id: locked.id }, data });
    await enqueueOutboxEvent(tx, { hostOrganizationId: locked.hostOrganizationId, eventType: `damage_claim.${updated.status}`, aggregateType: 'DamageClaim', aggregateId: locked.id, operationKey: `${args.transition}:${updated.approvedAmountCents}`, payload: { claimId: locked.id, reservationId: locked.reservationId, status: updated.status, approvedAmountCents: updated.approvedAmountCents } });
    return updated;
  }, { maxWait: 5000, timeout: 10000, isolationLevel: 'ReadCommitted' });
}

export async function createDamageClaim(
  _root: unknown,
  args: { reservationId: string; description: string; claimedAmountCents: number; evidence?: unknown },
  context: any,
) {
  const reservation = await context.query.Reservation.findOne({ where: { id: args.reservationId }, query: 'id status hostOrganization { id } listing { id } guest { id }' });
  if (!reservation?.hostOrganization?.id) throw new Error('Reservation not found.');
  await assertHostOrganizationAccess({ context, hostOrganizationId: reservation.hostOrganization.id, permission: 'canManageReservations' });
  const description = args.description.trim();
  if (!description || description.length > 4000) throw new Error('Damage description is required and must be at most 4000 characters.');
  if (!Number.isSafeInteger(args.claimedAmountCents) || args.claimedAmountCents < 0) throw new Error('Claim amount must use non-negative integer cents.');
  if (!['in_stay', 'completed'].includes(reservation.status)) throw new Error('Damage claims require an in-stay or completed reservation.');
  const id = crypto.randomUUID();
  return context.prisma.$transaction(async (tx: any) => {
    const claim = await tx.damageClaim.create({ data: { id, hostOrganizationId: reservation.hostOrganization.id, reservationId: reservation.id, listingId: reservation.listing.id, guestId: reservation.guest.id, claimNumber: `CLM-${id.slice(0, 8).toUpperCase()}`, status: 'draft', description, claimedAmountCents: args.claimedAmountCents, approvedAmountCents: 0, currencyCode: 'USD', evidence: args.evidence || [] } });
    await enqueueOutboxEvent(tx, { hostOrganizationId: reservation.hostOrganization.id, eventType: 'damage_claim.created', aggregateType: 'DamageClaim', aggregateId: id, operationKey: `create:${id}`, payload: { claimId: id, reservationId: reservation.id, listingId: reservation.listing.id, claimedAmountCents: args.claimedAmountCents } });
    return claim;
  });
}
