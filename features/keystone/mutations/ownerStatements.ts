import crypto from 'node:crypto';

import { buildOwnerStatement, ownerStatementIdempotencyKey } from '../utils/ownerStatementAccounting';
import { assertHostOrganizationAccess } from '../utils/hostOrganizationAccess';
import { enqueueOutboxEvent } from '../utils/outbox';

function statementNumber(ownerNumber: string, periodEnd: string, key: string) {
  return `OST-${periodEnd.replaceAll('-', '')}-${ownerNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase()}-${key.slice(-6).toUpperCase()}`;
}

export async function generateOwnerStatement(
  _root: unknown,
  args: { ownerId: string; periodStart: string; periodEnd: string; currencyCode?: string | null },
  context: any,
) {
  const owner = await context.query.PropertyOwner.findOne({
    where: { id: args.ownerId },
    query: 'id ownerNumber hostOrganization { id }',
  });
  if (!owner?.hostOrganization?.id) throw new Error('Property owner not found.');
  await assertHostOrganizationAccess({ context, hostOrganizationId: owner.hostOrganization.id, permission: 'canManagePayouts' });

  const currencyCode = (args.currencyCode || 'USD').trim().toUpperCase();
  const idempotencyKey = ownerStatementIdempotencyKey({ ownerId: owner.id, periodStart: args.periodStart, periodEnd: args.periodEnd, currencyCode });
  return context.prisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', idempotencyKey);
    const existing = await tx.ownerStatement.findUnique({ where: { idempotencyKey } });
    if (existing) return existing;

    const assignments = await tx.propertyOwnerAssignment.findMany({
      where: {
        ownerId: owner.id,
        hostOrganizationId: owner.hostOrganization.id,
        status: 'active',
        effectiveFrom: { lt: args.periodEnd },
        OR: [{ effectiveTo: '' }, { effectiveTo: { gte: args.periodStart } }],
      },
      select: { propertyId: true, ownershipBasisPoints: true, managerCommissionBasisPoints: true },
    });
    if (!assignments.length) throw new Error('No active owner assignments overlap this statement period.');
    const propertyIds = assignments.map((assignment: any) => assignment.propertyId).filter(Boolean);
    const reservations = await tx.reservation.findMany({
      where: {
        hostOrganizationId: owner.hostOrganization.id,
        listing: { propertyId: { in: propertyIds } },
        checkOutDate: { gte: args.periodStart, lt: args.periodEnd },
      },
      select: {
        id: true,
        confirmationCode: true,
        status: true,
        source: true,
        checkOutDate: true,
        currencyCode: true,
        lodgingSubtotalCents: true,
        feeTotalCents: true,
        taxTotalCents: true,
        discountTotalCents: true,
        totalAmountCents: true,
        listing: { select: { propertyId: true } },
      },
    });
    const reservationIds = reservations.map((reservation: any) => reservation.id);
    const [refunds, payouts] = await Promise.all([
      tx.refund.findMany({
        where: { hostOrganizationId: owner.hostOrganization.id, reservationId: { in: reservationIds } },
        select: { id: true, reservationId: true, status: true, amountCents: true },
      }),
      tx.payout.findMany({
        where: { hostOrganizationId: owner.hostOrganization.id, propertyOwnerId: owner.id },
        select: { id: true, status: true, netAmountCents: true, paidAt: true },
      }),
    ]);
    const calculation = buildOwnerStatement({
      ownerId: owner.id,
      propertyAssignments: assignments.map((assignment: any) => ({
        propertyId: assignment.propertyId,
        ownershipBasisPoints: assignment.ownershipBasisPoints,
        managerCommissionBasisPoints: assignment.managerCommissionBasisPoints,
      })),
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      currencyCode,
      reservations: reservations.map((reservation: any) => ({ ...reservation, propertyId: reservation.listing.propertyId })),
      refunds,
      payouts: payouts.map((payout: any) => ({ id: payout.id, ownerId: owner.id, status: payout.status, amountCents: payout.netAmountCents, paidAt: payout.paidAt?.toISOString() })),
      adjustments: [],
    });
    const id = crypto.randomUUID();
    const number = statementNumber(owner.ownerNumber, args.periodEnd, idempotencyKey);
    const created = await tx.ownerStatement.create({
      data: {
        id,
        hostOrganizationId: owner.hostOrganization.id,
        ownerId: owner.id,
        statementNumber: number,
        idempotencyKey,
        status: 'draft',
        periodStart: args.periodStart,
        periodEnd: args.periodEnd,
        currencyCode,
        grossRevenueCents: calculation.grossRevenueCents,
        taxAmountCents: calculation.taxAmountCents,
        refundAmountCents: calculation.refundAmountCents,
        expenseAmountCents: calculation.expenseAmountCents,
        adjustmentAmountCents: calculation.adjustmentAmountCents,
        managerCommissionCents: calculation.managerCommissionCents,
        ownerEarningsCents: calculation.ownerEarningsCents,
        paidOutCents: calculation.paidOutCents,
        balanceDueCents: calculation.balanceDueCents,
        statementSnapshot: { version: 1, generatedAt: new Date().toISOString(), calculation },
      },
    });
    if (calculation.lines.length) {
      await tx.ownerStatementLine.createMany({
        data: calculation.lines.map((line) => ({
          id: crypto.randomUUID(),
          hostOrganizationId: owner.hostOrganization.id,
          statementId: id,
          ownerId: owner.id,
          reservationId: line.reservationId || null,
          refundId: line.lineType === 'refund' ? line.sourceId || null : null,
          payoutId: line.lineType === 'payout' ? line.sourceId || null : null,
          lineKey: `${id}:${line.lineKey}`,
          lineType: line.lineType,
          description: line.description,
          serviceDate: line.serviceDate || '',
          amountCents: line.amountCents,
          sourceId: line.sourceId || '',
          metadata: line.metadata || {},
        })),
      });
    }
    await enqueueOutboxEvent(tx, {
      hostOrganizationId: owner.hostOrganization.id,
      eventType: 'owner_statement.generated',
      aggregateType: 'OwnerStatement',
      aggregateId: id,
      operationKey: idempotencyKey,
      payload: { statementId: id, ownerId: owner.id, periodStart: args.periodStart, periodEnd: args.periodEnd, currencyCode },
    });
    return created;
  }, { maxWait: 5000, timeout: 15000, isolationLevel: 'Serializable' });
}

const statementTransitions: Record<string, { from: string[]; to: string }> = {
  approve: { from: ['draft'], to: 'approved' },
  send: { from: ['approved'], to: 'sent' },
  pay: { from: ['sent'], to: 'paid' },
  void: { from: ['draft', 'approved'], to: 'voided' },
};

export async function transitionOwnerStatement(
  _root: unknown,
  args: { statementId: string; transition: string; reference?: string | null },
  context: any,
) {
  const statement = await context.query.OwnerStatement.findOne({
    where: { id: args.statementId },
    query: 'id status hostOrganization { id }',
  });
  if (!statement?.hostOrganization?.id) throw new Error('Owner statement not found.');
  await assertHostOrganizationAccess({ context, hostOrganizationId: statement.hostOrganization.id, permission: 'canManagePayouts' });
  const transition = statementTransitions[args.transition];
  if (!transition) throw new Error('Unsupported owner statement transition.');
  const reference = args.reference?.trim() || '';
  if (args.transition === 'pay' && !reference) throw new Error('A payment reference is required.');
  if (reference.length > 500) throw new Error('Statement reference is too long.');

  return context.prisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `owner-statement:${statement.id}`);
    const locked = await tx.ownerStatement.findUnique({ where: { id: statement.id } });
    if (!locked) throw new Error('Owner statement not found.');
    if (!transition.from.includes(locked.status)) throw new Error(`Cannot ${args.transition} a ${locked.status} statement.`);
    const now = new Date();
    const data: Record<string, unknown> = { status: transition.to };
    if (args.transition === 'approve') {
      data.approvedAt = now;
      data.statementSnapshot = { ...(locked.statementSnapshot as object), approvedAt: now.toISOString() };
    }
    if (args.transition === 'send') data.sentAt = now;
    if (args.transition === 'pay') {
      data.paidAt = now;
      data.paidReference = reference;
    }
    const updated = await tx.ownerStatement.update({ where: { id: locked.id }, data });
    await enqueueOutboxEvent(tx, {
      hostOrganizationId: statement.hostOrganization.id,
      eventType: `owner_statement.${transition.to}`,
      aggregateType: 'OwnerStatement',
      aggregateId: locked.id,
      operationKey: `${args.transition}:${now.toISOString()}`,
      payload: { statementId: locked.id, status: transition.to, ...(reference ? { reference } : {}) },
    });
    return updated;
  }, { maxWait: 5000, timeout: 10000, isolationLevel: 'ReadCommitted' });
}
