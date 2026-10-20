import crypto from 'node:crypto';

import { assertHostOrganizationAccess } from '../utils/hostOrganizationAccess';
import { enqueueOutboxEvent } from '../utils/outbox';
import { reconcileReservationPaymentEvidence, reservationPaymentStatus } from '../utils/paymentReconciliation';

function digest(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export async function refundStayPaymentOperation(
  _root: unknown,
  args: {
    paymentId: string;
    refundId?: string | null;
    operationKey?: string;
    amountCents: number;
    reason?: string | null;
    confirmFundsReturned: boolean;
    manualEvidenceReference: string;
  },
  context: any,
  testHooks: { afterWrites?: () => void | Promise<void> } = {},
) {
  const payment = await context.query.Payment.findOne({ where: { id: args.paymentId }, query: 'id provider hostOrganization { id } reservation { id }' });
  if (!payment?.hostOrganization?.id) throw new Error('Payment not found.');
  await assertHostOrganizationAccess({ context, hostOrganizationId: payment.hostOrganization.id, permission: 'canManagePayments' });
  if (args.confirmFundsReturned !== true) throw new Error('Confirm that the external or cash refund has already been completed before reconciliation.');
  const manualEvidenceReference = args.manualEvidenceReference?.trim();
  if (!manualEvidenceReference || manualEvidenceReference.length < 3 || manualEvidenceReference.length > 250) {
    throw new Error('Provide a completion reference for the already-returned manual refund (3 to 250 characters).');
  }
  const actorUserId = context.session?.itemId;
  if (!actorUserId) throw new Error('An authenticated operator is required to attest manual refund completion.');
  if (!Number.isSafeInteger(args.amountCents) || args.amountCents <= 0) throw new Error('Refund amount must use positive integer cents.');
  const operationKey = args.operationKey?.trim();
  if (!operationKey || operationKey.length < 3 || operationKey.length > 200
    || Array.from(operationKey).some((character) => character.charCodeAt(0) < 0x20 || character.charCodeAt(0) === 0x7f)) {
    throw new Error('Provide a stable refund operation key (3 to 200 characters, without control characters).');
  }
  const reason = args.reason?.trim() || 'other';
  if (!['guest_cancellation', 'host_cancellation', 'stay_issue', 'stay_amendment', 'overpayment', 'goodwill', 'other'].includes(reason)) throw new Error('Refund reason is invalid.');
  const operationKeyHash = digest(`${payment.id}|${operationKey}`);
  const idempotencyKey = `refund-operation:${operationKeyHash}`;
  const requestFingerprint = digest(JSON.stringify({
    paymentId: payment.id,
    refundId: args.refundId || null,
    amountCents: args.amountCents,
    reason,
    manualEvidenceReference,
    actorUserId,
  }));
  if (payment.provider !== 'pp_system_default') throw new Error('Manual refund reconciliation is enabled only for the installed manual payment adapter.');

  return context.prisma.$transaction(async (tx: any) => {
    if (payment.reservation?.id) {
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `reservation:${payment.reservation.id}`);
      await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', payment.reservation.id);
    }
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `payment-refund:${payment.id}`);
    const locked = await tx.payment.findUnique({ where: { id: payment.id } });
    if (!locked || locked.reservationId !== (payment.reservation?.id || null)) throw new Error('Payment reservation changed during refund reconciliation.');
    const priorRefunds = await tx.refund.findMany({
      where: { paymentId: payment.id },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, idempotencyKey: true, status: true, data: true },
    });
    const existing = priorRefunds.find((refund: any) => {
      const data = refund.data && typeof refund.data === 'object' ? refund.data : {};
      return refund.idempotencyKey === idempotencyKey
        || data.manualReconciliation?.operationKeyHash === operationKeyHash;
    });
    if (existing) {
      const data = existing.data && typeof existing.data === 'object' ? existing.data : {};
      const reconciliation = data.manualReconciliation;
      if (existing.status !== 'succeeded' || reconciliation?.requestFingerprint !== requestFingerprint) {
        throw new Error('This refund operation key was already used with different evidence or request parameters.');
      }
      return existing;
    }
    // Only after an exact replay is ruled out: a new refund needs remaining settled money.
    if (!['succeeded', 'partially_refunded'].includes(locked.status)) {
      throw new Error('Manual refund reconciliation requires a payment recorded as succeeded or partially refunded.');
    }

    const openRefunds = await tx.refund.findMany({
      where: { paymentId: payment.id, status: { in: ['pending', 'processing', 'failed'] } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, amountCents: true, reason: true, status: true, idempotencyKey: true, data: true, reservationAmendmentId: true },
    });
    let liability: any = null;
    if (args.refundId) {
      liability = openRefunds.find((refund: any) => refund.id === args.refundId);
      if (!liability) throw new Error('The specified refund liability is not open for manual reconciliation.');
      if (liability.amountCents !== args.amountCents || liability.reason !== reason) {
        throw new Error('The specified refund liability does not match the attested amount and reason.');
      }
    } else if (openRefunds.length) {
      throw new Error('Specify the refundId of the exact open liability being reconciled.');
    }

    const otherOpenLiabilitiesCents = openRefunds
      .filter((refund: any) => refund.id !== liability?.id)
      .reduce((sum: number, refund: any) => sum + refund.amountCents, 0);
    const remaining = locked.amountCents - locked.refundedAmountCents - otherOpenLiabilitiesCents;
    if (args.amountCents > remaining) throw new Error('Refund amount exceeds the unrefunded payment balance after other open liabilities.');

    // This records an operator attestation of a refund already made outside the app;
    // the manual adapter cannot initiate or verify a cash/bank transfer.
    const id = liability?.id || crypto.randomUUID();
    const processedAt = new Date();
    const priorData = liability?.data && typeof liability.data === 'object' ? liability.data : {};
    const refundData = {
      status: 'succeeded',
      reason,
      amountCents: args.amountCents,
      currencyCode: locked.currencyCode,
      providerRefundId: null,
      processedAt,
      data: {
        ...priorData,
        manualReconciliation: {
          kind: 'operator_attestation',
          operationKeyHash,
          requestFingerprint,
          evidenceReference: manualEvidenceReference,
          attestedByUserId: actorUserId,
          attestedAt: processedAt.toISOString(),
          ...(liability ? { reconciledRefundId: liability.id, originalIdempotencyKey: liability.idempotencyKey } : {}),
        },
        policyReviewRequired: false,
      },
    };
    const refund = liability
      ? await tx.refund.update({ where: { id }, data: refundData })
      : await tx.refund.create({
        data: {
          ...refundData,
          id,
          idempotencyKey,
          hostOrganizationId: locked.hostOrganizationId,
          reservationId: locked.reservationId,
          paymentId: locked.id,
          refundNumber: `REF-${id.slice(0, 8).toUpperCase()}`,
        },
      });
    const refundedAmountCents = locked.refundedAmountCents + args.amountCents;
    const paymentStatus = refundedAmountCents === locked.amountCents ? 'refunded' : 'partially_refunded';
    await tx.payment.update({ where: { id: locked.id }, data: { refundedAmountCents, status: paymentStatus } });
    if (locked.reservationId) {
      const [reservation, payments, refunds, pendingAmendmentRefunds] = await Promise.all([
        tx.reservation.findUnique({ where: { id: locked.reservationId }, select: { totalAmountCents: true, currencyCode: true, testMode: true } }),
        tx.payment.findMany({
          where: { reservationId: locked.reservationId },
          select: { id: true, status: true, amountCents: true, refundedAmountCents: true, currencyCode: true, provider: true, data: true },
        }),
        tx.refund.findMany({
          where: { reservationId: locked.reservationId },
          select: { id: true, paymentId: true, status: true, amountCents: true, currencyCode: true },
        }),
        tx.refund.aggregate({
          where: { reservationId: locked.reservationId, reservationAmendmentId: { not: null }, status: { in: ['pending', 'processing', 'failed'] } },
          _sum: { amountCents: true },
        }),
      ]);
      if (!reservation) throw new Error('Reservation not found while reconciling refund evidence.');
      const reconciliation = reconcileReservationPaymentEvidence({ payments, refunds, currencyCode: reservation.currencyCode, testMode: reservation.testMode === true });
      const totalAmountCents = reservation.totalAmountCents || 0;
      const refundDueCents = Math.max(reconciliation.netPaidCents - totalAmountCents, 0);
      const recordedRefundLiabilityCents = pendingAmendmentRefunds._sum.amountCents || 0;
      if (refundDueCents > recordedRefundLiabilityCents) throw new Error('Settled funds exceed the stay total without a matching amendment refund liability.');
      const paymentStatus = reservationPaymentStatus({ ...reconciliation, totalAmountCents });
      await tx.reservation.update({
        where: { id: locked.reservationId },
        data: { amountPaidCents: reconciliation.netPaidCents, paymentStatus },
      });
    }
    await enqueueOutboxEvent(tx, { hostOrganizationId: locked.hostOrganizationId, eventType: 'payment.refunded', aggregateType: 'Refund', aggregateId: id, operationKey: idempotencyKey, payload: { refundId: id, paymentId: locked.id, reservationId: locked.reservationId, amountCents: args.amountCents, currencyCode: locked.currencyCode, reconciliationMethod: 'operator_attestation' } });
    await testHooks.afterWrites?.();
    return refund;
  }, { maxWait: 5000, timeout: 15000, isolationLevel: 'Serializable' });
}

export async function refundStayPayment(root: unknown, args: { paymentId: string; refundId?: string | null; operationKey?: string; amountCents: number; reason?: string | null; confirmFundsReturned: boolean; manualEvidenceReference: string }, context: any) {
  return refundStayPaymentOperation(root, args, context);
}

const depositTransitions: Record<string, string[]> = {
  authorize: ['required'],
  hold: ['required', 'authorized'],
  release: ['authorized', 'held', 'partially_captured'],
  capture: ['held', 'partially_captured'],
  fail: ['required', 'authorized', 'held'],
};

function evidenceReference(value: unknown, label: string) {
  const reference = typeof value === 'string' ? value.trim() : '';
  if (reference.length < 3 || reference.length > 500) throw new Error(`Enter the ${label} reference (3 to 500 characters).`);
  return reference;
}

/**
 * Records a security deposit event the operator attests (authorize, hold, capture, release,
 * fail). Each action carries a stable operation key: a retry of the same action after a lost
 * response returns the deposit without appending again; the same key with different details is
 * refused; two genuine equal actions use different keys and stay separate. Deposit and claim
 * writers share the reservation→deposit lock order.
 */
export async function transitionSecurityDeposit(
  _root: unknown,
  args: { depositId: string; transition: string; amountCents?: number | null; reference?: string | null; confirmEvidence?: boolean | null; operationKey?: string | null },
  context: any,
) {
  const deposit = await context.query.SecurityDeposit.findOne({ where: { id: args.depositId }, query: 'id hostOrganization { id } reservation { id }' });
  if (!deposit?.hostOrganization?.id) throw new Error('Security deposit not found.');
  await assertHostOrganizationAccess({ context, hostOrganizationId: deposit.hostOrganization.id, permission: 'canManagePayments' });
  if (!depositTransitions[args.transition]) throw new Error('Unsupported security deposit transition.');
  // Each deposit event is a real-world fact the operator attests with a reference.
  if (args.confirmEvidence !== true) throw new Error('Confirm that this already happened with the guest or payment provider.');
  const reference = evidenceReference(args.reference, 'receipt, hold or transfer');
  const actorUserId = context.session?.itemId;
  if (!actorUserId) throw new Error('Sign in to record deposit events.');
  const operationKey = typeof args.operationKey === 'string' ? args.operationKey.trim() : '';
  if (operationKey.length < 8 || operationKey.length > 200) throw new Error('This deposit action is missing its submission key. Refresh and try again.');
  const amountCents = args.transition === 'capture' ? args.amountCents ?? null : null;
  const fingerprint = digest(JSON.stringify({ depositId: deposit.id, transition: args.transition, amountCents, reference }));
  return context.prisma.$transaction(async (tx: any) => {
    if (deposit.reservation?.id) await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `reservation:${deposit.reservation.id}`);
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `security-deposit:${deposit.id}`);
    const locked = await tx.securityDeposit.findUnique({ where: { id: deposit.id } });
    if (!locked) throw new Error('Security deposit not found.');
    const metadata = locked.metadata && typeof locked.metadata === 'object' && !Array.isArray(locked.metadata) ? locked.metadata as Record<string, any> : {};
    const events = Array.isArray(metadata.events) ? metadata.events : [];
    // Replay first (after authorization, before any state check): the same action returns as recorded.
    const prior = events.find((event: any) => event?.operationKey === operationKey);
    if (prior) {
      if (prior.fingerprint !== fingerprint) throw new Error('This deposit action was already recorded with different details. Refresh to see the deposit.');
      return locked;
    }
    if (!depositTransitions[args.transition].includes(locked.status)) throw new Error(`Cannot ${args.transition} this security deposit.`);
    const now = new Date();
    const data: Record<string, unknown> = {};
    if (args.transition === 'authorize') data.status = 'authorized';
    if (args.transition === 'hold') { data.status = 'held'; data.heldAt = now; }
    if (args.transition === 'release') { data.status = 'released'; data.releasedAt = now; }
    if (args.transition === 'fail') data.status = 'failed';
    if (args.transition === 'capture') {
      const amount = amountCents || 0;
      if (!Number.isSafeInteger(amount) || amount <= 0 || amount > locked.amountCents - locked.capturedAmountCents) throw new Error('Deposit capture amount is invalid.');
      const capturedAmountCents = locked.capturedAmountCents + amount;
      data.capturedAmountCents = capturedAmountCents;
      data.status = capturedAmountCents === locked.amountCents ? 'captured' : 'partially_captured';
    }
    data.providerReference = reference;
    // Append-only event history: earlier events, amounts and references are never rewritten.
    const event = { transition: args.transition, fromStatus: locked.status, toStatus: data.status, amountCents, reference, actorUserId, attestedAt: now.toISOString(), operationKey, fingerprint };
    data.metadata = { ...metadata, events: [...events, event] };
    const updated = await tx.securityDeposit.update({ where: { id: locked.id }, data });
    await enqueueOutboxEvent(tx, { hostOrganizationId: locked.hostOrganizationId, eventType: `security_deposit.${updated.status}`, aggregateType: 'SecurityDeposit', aggregateId: locked.id, operationKey: `deposit:${digest(`${locked.id}|${operationKey}`)}`, payload: { depositId: locked.id, reservationId: locked.reservationId, status: updated.status, amountCents: updated.amountCents, capturedAmountCents: updated.capturedAmountCents, releasedRemainderCents: updated.status === 'released' ? updated.amountCents - updated.capturedAmountCents : null, reference, actorUserId } });
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
  args: { claimId: string; transition: string; approvedAmountCents?: number | null; settlementMethod?: string | null; settlementReference?: string | null; confirmSettlement?: boolean | null; receivedOn?: string | null; custody?: string | null },
  context: any,
) {
  const claim = await context.query.DamageClaim.findOne({ where: { id: args.claimId }, query: 'id hostOrganization { id }' });
  if (!claim?.hostOrganization?.id) throw new Error('Damage claim not found.');
  await assertHostOrganizationAccess({ context, hostOrganizationId: claim.hostOrganization.id, permission: 'canManageReservations' });
  const transition = damageClaimTransitions[args.transition];
  if (!transition) throw new Error('Unsupported damage claim transition.');
  return context.prisma.$transaction(async (tx: any) => {
    // Every claim on a stay and every deposit event share one settlement budget: the
    // reservation, then its deposit, are locked before the claim (the deposit writers' order).
    const initial = await tx.damageClaim.findUnique({ where: { id: claim.id }, select: { reservationId: true } });
    if (initial?.reservationId) {
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `reservation:${initial.reservationId}`);
      const depositIds = await tx.securityDeposit.findMany({ where: { reservation: { id: initial.reservationId } }, select: { id: true }, orderBy: [{ id: 'asc' }] });
      for (const deposit of depositIds) await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `security-deposit:${deposit.id}`);
    }
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `damage-claim:${claim.id}`);
    const locked = await tx.damageClaim.findUnique({ where: { id: claim.id } });
    if (locked && locked.reservationId !== (initial?.reservationId ?? null)) throw new Error('This claim changed meanwhile. Refresh and try again.');
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
    if (args.transition === 'settle') {
      // Approval isn't recovered money: settling needs the actual settlement, by deposit
      // deduction already recorded on this stay or by an attested payment from the guest.
      if (args.confirmSettlement !== true) throw new Error('Confirm that the approved amount has actually been settled.');
      const method = args.settlementMethod;
      if (!['deposit_deduction', 'guest_payment'].includes(method || '')) throw new Error('Choose how the claim was settled.');
      const reference = evidenceReference(args.settlementReference, 'settlement');
      if (method === 'deposit_deduction') {
        const deposit = await tx.securityDeposit.findFirst({ where: { reservation: { id: locked.reservationId } }, select: { id: true, capturedAmountCents: true } });
        const settledByOtherClaims = await tx.damageClaim.findMany({ where: { reservationId: locked.reservationId, status: 'settled', id: { not: locked.id } }, select: { settlementEvidence: true } });
        const alreadyApplied = settledByOtherClaims.reduce((sum: number, other: any) => sum + (other.settlementEvidence?.method === 'deposit_deduction' ? other.settlementEvidence.amountCents || 0 : 0), 0);
        if (!deposit || deposit.capturedAmountCents - alreadyApplied < locked.approvedAmountCents) {
          throw new Error('Record the deposit deduction for this amount before settling the claim from the deposit.');
        }
        data.settlementEvidence = { method, depositId: deposit.id, amountCents: locked.approvedAmountCents, reference, actorUserId: context.session?.itemId || null, settledAt: new Date().toISOString() };
      } else {
        // A guest payment for a claim is the operator's attestation of money actually received,
        // with its date and where the proof is kept; a reference alone isn't proof, and one
        // receipt settles one claim.
        const receivedOn = typeof args.receivedOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(args.receivedOn) ? args.receivedOn : '';
        if (!receivedOn || receivedOn > new Date().toISOString().slice(0, 10)) throw new Error('Enter the date the guest’s payment was received.');
        const custody = typeof args.custody === 'string' ? args.custody.trim() : '';
        if (custody.length < 3 || custody.length > 300) throw new Error('Say where the proof of the guest’s payment is kept.');
        const reused = await tx.damageClaim.findFirst({
          where: { hostOrganizationId: locked.hostOrganizationId, status: 'settled', id: { not: locked.id }, settlementEvidence: { path: ['reference'], equals: reference } },
          select: { claimNumber: true },
        });
        if (reused) throw new Error(`Reference ${reference} already settles ${reused.claimNumber}. Each receipt settles one claim.`);
        data.settlementEvidence = { method, kind: 'operator_attestation', amountCents: locked.approvedAmountCents, reference, receivedOn, custody, actorUserId: context.session?.itemId || null, settledAt: new Date().toISOString(), providerVerified: false };
      }
      data.resolvedAt = new Date();
    }
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
  const reservation = await context.query.Reservation.findOne({ where: { id: args.reservationId }, query: 'id hostOrganization { id }' });
  if (!reservation?.hostOrganization?.id) throw new Error('Reservation not found.');
  await assertHostOrganizationAccess({ context, hostOrganizationId: reservation.hostOrganization.id, permission: 'canManageReservations' });
  const description = args.description.trim();
  if (!description || description.length > 4000) throw new Error('Damage description is required and must be at most 4000 characters.');
  if (!Number.isSafeInteger(args.claimedAmountCents) || args.claimedAmountCents < 0) throw new Error('Claim amount must use non-negative integer cents.');
  const id = crypto.randomUUID();
  return context.prisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `reservation:${args.reservationId}`);
    await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', args.reservationId);
    const locked = await tx.reservation.findUnique({
      where: { id: args.reservationId },
      select: { id: true, hostOrganizationId: true, status: true, listingId: true, guestId: true, currencyCode: true },
    });
    if (!locked || locked.hostOrganizationId !== reservation.hostOrganization.id) throw new Error('Reservation not found.');
    if (!['in_stay', 'completed'].includes(locked.status || '')) throw new Error('Damage claims require an in-stay or completed reservation.');
    if (!locked.listingId || !locked.guestId) throw new Error('The reservation is missing its listing or guest record.');
    const currencyCode = locked.currencyCode?.trim().toUpperCase();
    if (!currencyCode || !/^[A-Z]{3}$/.test(currencyCode)) throw new Error('The reservation currency code is invalid.');
    const claim = await tx.damageClaim.create({ data: { id, hostOrganizationId: locked.hostOrganizationId, reservationId: locked.id, listingId: locked.listingId, guestId: locked.guestId, claimNumber: `CLM-${id.slice(0, 8).toUpperCase()}`, status: 'draft', description, claimedAmountCents: args.claimedAmountCents, approvedAmountCents: 0, currencyCode, evidence: args.evidence || [] } });
    await enqueueOutboxEvent(tx, { hostOrganizationId: locked.hostOrganizationId, eventType: 'damage_claim.created', aggregateType: 'DamageClaim', aggregateId: id, operationKey: `create:${id}`, payload: { claimId: id, reservationId: locked.id, listingId: locked.listingId, claimedAmountCents: args.claimedAmountCents } });
    return claim;
  });
}
