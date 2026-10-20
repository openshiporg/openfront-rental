import crypto from 'node:crypto';
import { GraphQLError } from 'graphql';

import { buildOwnerStatement, ownerStatementIdempotencyKey, recognizedStayStatuses, type StatementRefundKind } from '../utils/ownerStatementAccounting';
import { assertHostOrganizationAccess } from '../utils/hostOrganizationAccess';
import { enqueueOutboxEvent } from '../utils/outbox';
import { zonedTodayIso } from '../utils/stayBookingRules';
import { hostChildScope } from './hostReporting';

const DAY_MS = 86_400_000;
const MAX_PERIOD_DAYS = 400;
const MAX_STATEMENT_EVENTS = 5000;
const MAX_OWNER_ASSIGNMENTS = 500;
const liveStatementStatuses = ['draft', 'approved', 'sent', 'paid'];
const issuedStatementStatuses = ['approved', 'sent', 'paid'];

type FinanceErrorCode = 'BAD_USER_INPUT' | 'CONFLICT' | 'FORBIDDEN' | 'NOT_FOUND';

/** GraphQL errors pass their message to the operator; any other thrown error is masked by the server. */
function financeError(code: FinanceErrorCode, message: string) {
  return new GraphQLError(message, { extensions: { code } });
}

function calendarDate(value: unknown, label: string) {
  const text = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw financeError('BAD_USER_INPUT', `${label} must be a date in YYYY-MM-DD format.`);
  const [year, month, day] = text.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw financeError('BAD_USER_INPUT', `${label} is not a real calendar date.`);
  }
  return text;
}

async function authorizePayouts(context: any, hostOrganizationId: string) {
  try {
    await assertHostOrganizationAccess({ context, hostOrganizationId, permission: 'canManagePayouts' });
  } catch (error) {
    throw financeError('FORBIDDEN', error instanceof Error ? error.message : 'You do not have permission to manage owner payouts.');
  }
}

function isSerializationFailure(error: any) {
  return error?.code === 'P2034' || /could not serialize|deadlock detected|write conflict/i.test(error?.message || '');
}

async function withSerializableRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isSerializationFailure(error)) throw error;
      if (attempt >= attempts) throw financeError('CONFLICT', 'Owner records changed while the statement was being generated. Try again.');
      await new Promise((resolve) => setTimeout(resolve, 25 * attempt));
    }
  }
}

function statementNumber(ownerNumber: string, periodEnd: string, key: string, revision: number) {
  const base = `OST-${periodEnd.replaceAll('-', '')}-${ownerNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase()}-${key.slice(-6).toUpperCase()}`;
  return revision > 1 ? `${base}-R${revision}` : base;
}

function record(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

/** Price credit a concession refund still holds inside the stay's discount (opened, less reversals). */
function concessionCreditCents(refund: any) {
  const data = record(refund.data);
  const adjustment = record(data.totalAdjustment);
  if (!Object.keys(adjustment).length) return 0;
  const opened = Number(adjustment.previousTotalCents) - Number(adjustment.adjustedTotalCents);
  const reversed = (Array.isArray(data.creditReversals) ? data.creditReversals : [])
    .reduce((sum: number, reversal: any) => sum + Number(reversal?.reversedCents || 0), 0);
  const credit = opened - reversed;
  if (!Number.isSafeInteger(credit) || credit < 0) {
    throw financeError('CONFLICT', `Refund ${refund.refundNumber || refund.id} has concession evidence that doesn't reconcile. Resolve it before generating this statement.`);
  }
  return credit;
}

function refundKind(refund: any): StatementRefundKind {
  if (Object.keys(record(record(refund.data).totalAdjustment)).length) return 'concession';
  if (refund.reservationAmendmentId || refund.reason === 'stay_amendment') return 'amendment_settlement';
  if (refund.reason === 'overpayment') return 'overpayment';
  return 'stay_refund';
}

type AllocationRow = { id: string; bookedPropertyId: string | null; listingPropertyId: string | null; unitPropertyId: string | null };

/** Owner allocation follows the property captured at booking; only stays without that snapshot fall back to the listing. */
function allocationFor(row: AllocationRow) {
  if (row.bookedPropertyId) return { propertyId: row.bookedPropertyId, basis: 'booking_snapshot' as const };
  if (row.listingPropertyId) return { propertyId: row.listingPropertyId, basis: 'current_listing' as const };
  return null;
}

export async function generateOwnerStatement(
  _root: unknown,
  args: { ownerId: string; periodStart: string; periodEnd: string; currencyCode?: string | null },
  context: any,
) {
  const periodStart = calendarDate(args.periodStart, 'Period start');
  const periodEnd = calendarDate(args.periodEnd, 'Period end');
  if (periodEnd <= periodStart) throw financeError('BAD_USER_INPUT', 'Period end must be after the period start.');
  if ((Date.parse(`${periodEnd}T00:00:00Z`) - Date.parse(`${periodStart}T00:00:00Z`)) / DAY_MS > MAX_PERIOD_DAYS) {
    throw financeError('BAD_USER_INPUT', `Statement periods are limited to ${MAX_PERIOD_DAYS} days.`);
  }
  const currencyCode = String(args.currencyCode || 'USD').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currencyCode)) throw financeError('BAD_USER_INPUT', 'Use a three-letter currency code such as USD.');

  const owner = await context.query.PropertyOwner.findOne({
    where: { id: args.ownerId },
    query: 'id ownerNumber hostOrganization { id }',
  });
  if (!owner?.hostOrganization?.id) throw financeError('NOT_FOUND', 'Property owner not found.');
  const hostOrganizationId: string = owner.hostOrganization.id;
  await authorizePayouts(context, hostOrganizationId);

  return withSerializableRetry(() => context.prisma.$transaction(async (tx: any) => {
    // One owner at a time: overlapping periods and currencies can't recognize the same earning twice.
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `owner-statement-scope:${owner.id}`);
    const samePeriod = await tx.ownerStatement.findMany({
      where: { ownerId: owner.id, periodStart, periodEnd, currencyCode },
      orderBy: [{ generatedAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, status: true, statementNumber: true },
    });
    const live = samePeriod.find((statement: any) => statement.status !== 'voided');
    if (live) return tx.ownerStatement.findUnique({ where: { id: live.id } });
    const revision = samePeriod.length + 1;
    const supersedes = samePeriod.length ? samePeriod[samePeriod.length - 1] : null;
    const idempotencyKey = ownerStatementIdempotencyKey({ ownerId: owner.id, periodStart, periodEnd, currencyCode, revision });

    const assignments = await tx.propertyOwnerAssignment.findMany({
      where: { ownerId: owner.id, hostOrganizationId },
      select: { id: true, propertyId: true, status: true, ownershipBasisPoints: true, managerCommissionBasisPoints: true, effectiveFrom: true, effectiveTo: true },
      orderBy: [{ effectiveFrom: 'asc' }, { id: 'asc' }],
      take: MAX_OWNER_ASSIGNMENTS + 1,
    });
    if (!assignments.length) throw financeError('BAD_USER_INPUT', 'This owner has no property assignments.');
    if (assignments.length > MAX_OWNER_ASSIGNMENTS) throw financeError('BAD_USER_INPUT', `This owner has more than ${MAX_OWNER_ASSIGNMENTS} assignments; statements can't be generated safely.`);
    for (const assignment of assignments) {
      if (!assignment.propertyId) throw financeError('BAD_USER_INPUT', 'An owner assignment has no property. Fix it before generating statements.');
      // An ended assignment without an end date can't say which stays it governed.
      if (assignment.status === 'ended' && !assignment.effectiveTo) {
        throw financeError('BAD_USER_INPUT', 'An ended owner assignment has no end date. Set its end date before generating statements.');
      }
    }
    const ownerPropertyIds: string[] = [...new Set<string>(assignments.map((assignment: any) => assignment.propertyId))];
    const properties = await tx.property.findMany({ where: { id: { in: ownerPropertyIds } }, select: { id: true, name: true, timezone: true } });
    const timeZoneByProperty = new Map<string, string>(properties.map((property: any) => [property.id, property.timezone]));
    const nameByProperty = new Map<string, string>(properties.map((property: any) => [property.id, property.name]));
    const localToday = ownerPropertyIds.map((id) => zonedTodayIso(timeZoneByProperty.get(id))).sort()[0];
    if (periodEnd > localToday) throw financeError('BAD_USER_INPUT', `Statements cover finished periods. Choose a period ending on or before ${localToday}.`);

    const stayRows: AllocationRow[] = await tx.$queryRaw`
      SELECT r."id" AS "id",
        r."bookingSnapshot" #>> '{listing,property,id}' AS "bookedPropertyId",
        l."property" AS "listingPropertyId",
        u."property" AS "unitPropertyId"
      FROM "Reservation" r
      LEFT JOIN "Listing" l ON l."id" = r."listing"
      LEFT JOIN "AccommodationUnit" u ON u."id" = r."accommodationUnit"
      WHERE r."hostOrganization" = ${hostOrganizationId}
        AND r."checkOutDate" >= ${periodStart} AND r."checkOutDate" < ${periodEnd}
      ORDER BY r."id"
      LIMIT ${MAX_STATEMENT_EVENTS + 1}::int`;
    if (stayRows.length > MAX_STATEMENT_EVENTS) throw financeError('BAD_USER_INPUT', `More than ${MAX_STATEMENT_EVENTS} stays end in this period. Generate shorter statements.`);
    // Refund dates are property-local; the UTC window is widened a day each side and narrowed below.
    const windowStart = new Date(Date.parse(`${periodStart}T00:00:00Z`) - DAY_MS).toISOString();
    const windowEnd = new Date(Date.parse(`${periodEnd}T00:00:00Z`) + DAY_MS).toISOString();
    const refundRows: Array<AllocationRow & { refundId: string }> = await tx.$queryRaw`
      SELECT f."id" AS "refundId", r."id" AS "id",
        r."bookingSnapshot" #>> '{listing,property,id}' AS "bookedPropertyId",
        l."property" AS "listingPropertyId",
        u."property" AS "unitPropertyId"
      FROM "Refund" f
      JOIN "Reservation" r ON r."id" = f."reservation"
      LEFT JOIN "Listing" l ON l."id" = r."listing"
      LEFT JOIN "AccommodationUnit" u ON u."id" = r."accommodationUnit"
      WHERE f."hostOrganization" = ${hostOrganizationId}
        AND f."status" = 'succeeded'
        AND COALESCE(f."processedAt", f."createdAt") >= ${windowStart}::timestamp
        AND COALESCE(f."processedAt", f."createdAt") < ${windowEnd}::timestamp
      ORDER BY f."id"
      LIMIT ${MAX_STATEMENT_EVENTS + 1}::int`;
    if (refundRows.length > MAX_STATEMENT_EVENTS) throw financeError('BAD_USER_INPUT', `More than ${MAX_STATEMENT_EVENTS} refunds fall in this period. Generate shorter statements.`);

    const ownerProperties = new Set(ownerPropertyIds);
    const allocations = new Map<string, AllocationRow & { propertyId: string; basis: 'booking_snapshot' | 'current_listing' }>();
    for (const row of [...stayRows, ...refundRows]) {
      const allocation = allocationFor(row);
      if (allocation && ownerProperties.has(allocation.propertyId)) allocations.set(row.id, { ...row, ...allocation });
    }
    const periodStayIds = stayRows.map((row) => row.id).filter((id) => allocations.has(id));
    const ownerRefundRows = refundRows.filter((row) => allocations.has(row.id));
    const stayIds = [...new Set([...periodStayIds, ...ownerRefundRows.map((row) => row.id)])];
    const [stays, stayRefunds] = stayIds.length ? await Promise.all([
      tx.reservation.findMany({
        where: { id: { in: stayIds }, hostOrganizationId },
        select: {
          id: true, confirmationCode: true, status: true, source: true, testMode: true, fixtureOrigin: true, checkInDate: true, checkOutDate: true, currencyCode: true,
          lodgingSubtotalCents: true, feeTotalCents: true, taxTotalCents: true, discountTotalCents: true, totalAmountCents: true,
        },
      }),
      tx.refund.findMany({
        where: { reservationId: { in: stayIds }, hostOrganizationId },
        select: { id: true, refundNumber: true, reservationId: true, reservationAmendmentId: true, status: true, reason: true, amountCents: true, currencyCode: true, processedAt: true, createdAt: true, data: true, payment: { select: { provider: true } } },
      }),
    ]) : [[], []];

    const creditsByStay = new Map<string, number>();
    for (const refund of stayRefunds) {
      if (refund.payment?.provider === 'pp_stripe_stripe') continue; // test tender: no real credit
      creditsByStay.set(refund.reservationId, (creditsByStay.get(refund.reservationId) || 0) + concessionCreditCents(refund));
    }
    const excluded = { otherCurrencyStays: 0, otherCurrencyRefunds: 0, otherCurrencyPayouts: 0, testModeStays: 0, sampleStays: 0, testTenderRefunds: 0, unrecognizedStatusStays: [] as string[], refundsOnUnrecognizedStays: 0, alreadyRecognizedStays: 0, alreadyRecognizedRefunds: 0, alreadyRecognizedPayouts: 0 };
    const stayById = new Map<string, any>();
    for (const stay of stays) {
      const allocation = allocations.get(stay.id)!;
      stayById.set(stay.id, {
        id: stay.id,
        confirmationCode: stay.confirmationCode,
        propertyId: allocation.propertyId,
        status: stay.status || '',
        source: stay.source || 'direct',
        testMode: stay.testMode === true,
        sample: Boolean(stay.fixtureOrigin),
        checkInDate: stay.checkInDate,
        checkOutDate: stay.checkOutDate,
        currencyCode: (stay.currencyCode || '').toUpperCase(),
        lodgingSubtotalCents: stay.lodgingSubtotalCents ?? 0,
        feeTotalCents: stay.feeTotalCents ?? 0,
        taxTotalCents: stay.taxTotalCents ?? 0,
        discountTotalCents: stay.discountTotalCents ?? 0,
        totalAmountCents: stay.totalAmountCents ?? 0,
        concessionCreditCents: creditsByStay.get(stay.id) || 0,
        allocationBasis: allocation.basis,
        servicePropertyId: allocation.unitPropertyId && allocation.unitPropertyId !== allocation.propertyId ? allocation.unitPropertyId : null,
      });
    }

    // Test bookings are simulated (no real money is ever recorded on one), and other
    // currencies belong on their own statement.
    const eligibleStays = periodStayIds.map((id) => stayById.get(id)).filter(Boolean).filter((stay: any) => {
      if (stay.testMode) { excluded.testModeStays += 1; return false; }
      // Setup sample stays are not real activity: no owner earnings, commission or payable.
      if (stay.sample) { excluded.sampleStays += 1; return false; }
      if (stay.currencyCode !== currencyCode) { excluded.otherCurrencyStays += 1; return false; }
      if (!recognizedStayStatuses.includes(stay.status)) {
        if (!['cancelled', 'no_show'].includes(stay.status) && excluded.unrecognizedStatusStays.length < 20) excluded.unrecognizedStatusStays.push(stay.confirmationCode);
        return false;
      }
      return true;
    });
    const ownerRefundIds = new Set(ownerRefundRows.map((row) => row.refundId));
    const eligibleRefunds = stayRefunds.filter((refund: any) => ownerRefundIds.has(refund.id)).flatMap((refund: any) => {
      const stay = stayById.get(refund.reservationId);
      if (!stay || refund.status !== 'succeeded') return [];
      const recognizedOn = zonedTodayIso(timeZoneByProperty.get(stay.propertyId), new Date(refund.processedAt || refund.createdAt));
      if (recognizedOn < periodStart || recognizedOn >= periodEnd) return [];
      if (stay.testMode || stay.sample) return [];
      // A refund of Stripe test-mode tender returns no real money, whatever stay it is on.
      if (refund.payment?.provider === 'pp_stripe_stripe') { excluded.testTenderRefunds += 1; return []; }
      if (stay.currencyCode !== currencyCode || (refund.currencyCode || '').toUpperCase() !== currencyCode) { excluded.otherCurrencyRefunds += 1; return []; }
      if (!recognizedStayStatuses.includes(stay.status)) { excluded.refundsOnUnrecognizedStays += 1; return []; }
      return [{ id: refund.id, reservationId: refund.reservationId, status: refund.status, amountCents: refund.amountCents, currencyCode: refund.currencyCode, recognizedOn, kind: refundKind(refund) }];
    });
    const payoutRows = await tx.payout.findMany({
      where: {
        hostOrganizationId,
        propertyOwnerId: owner.id,
        status: 'paid',
        ownerStatementId: null,
        paidAt: { gte: new Date(`${periodStart}T00:00:00.000Z`), lt: new Date(`${periodEnd}T00:00:00.000Z`) },
      },
      select: { id: true, status: true, netAmountCents: true, paidAt: true, currencyCode: true, ownerStatementId: true },
      orderBy: [{ paidAt: 'asc' }, { id: 'asc' }],
      take: MAX_STATEMENT_EVENTS + 1,
    });
    if (payoutRows.length > MAX_STATEMENT_EVENTS) throw financeError('BAD_USER_INPUT', `More than ${MAX_STATEMENT_EVENTS} owner payouts fall in this period. Generate shorter statements.`);
    const eligiblePayouts = payoutRows.filter((payout: any) => {
      if ((payout.currencyCode || '').toUpperCase() === currencyCode) return true;
      excluded.otherCurrencyPayouts += 1;
      return false;
    });

    // An earning already on a draft or issued statement for this owner is never recognized again.
    const prior = await tx.ownerStatementLine.findMany({
      where: {
        ownerId: owner.id,
        statement: { status: { in: liveStatementStatuses } },
        OR: [
          { lineType: 'reservation_revenue', reservationId: { in: eligibleStays.map((stay: any) => stay.id) } },
          { lineType: 'refund', refundId: { in: eligibleRefunds.map((refund: any) => refund.id) } },
          { lineType: 'payout', payoutId: { in: eligiblePayouts.map((payout: any) => payout.id) } },
        ],
      },
      select: { lineType: true, reservationId: true, refundId: true, payoutId: true },
    });
    const recognizedStays = new Set(prior.filter((line: any) => line.lineType === 'reservation_revenue').map((line: any) => line.reservationId));
    const recognizedRefunds = new Set(prior.filter((line: any) => line.lineType === 'refund').map((line: any) => line.refundId));
    const recognizedPayouts = new Set(prior.filter((line: any) => line.lineType === 'payout').map((line: any) => line.payoutId));
    const newStays = eligibleStays.filter((stay: any) => !recognizedStays.has(stay.id));
    const unrecognizedRefunds = eligibleRefunds.filter((refund: any) => !recognizedRefunds.has(refund.id));
    // Statements issued before concession credits were recognized as their own refunds netted
    // the credit out of the stay's revenue (their revenue line carries no concession basis). A
    // later concession refund for such a stay is recognized once, owner-neutral, with the
    // earlier statement named: no second deduction and no rewrite of the issued statement.
    const concessionStays = [...new Set(unrecognizedRefunds.filter((refund: any) => refund.kind === 'concession').map((refund: any) => refund.reservationId))];
    const legacyRevenueLines = concessionStays.length ? await tx.ownerStatementLine.findMany({
      where: { lineType: 'reservation_revenue', reservationId: { in: concessionStays }, statement: { status: { in: issuedStatementStatuses } } },
      select: { reservationId: true, metadata: true, statement: { select: { statementNumber: true } } },
    }) : [];
    const nettedOn = new Map<string, string>();
    for (const line of legacyRevenueLines) {
      if (record(line.metadata).concessionCreditCents === undefined) nettedOn.set(line.reservationId, line.statement?.statementNumber || 'an earlier statement');
    }
    const newRefunds = unrecognizedRefunds.map((refund: any) => refund.kind === 'concession' && nettedOn.has(refund.reservationId)
      ? { ...refund, kind: 'concession_already_netted', nettedOn: nettedOn.get(refund.reservationId) }
      : refund);
    const newPayouts = eligiblePayouts.filter((payout: any) => !recognizedPayouts.has(payout.id));
    excluded.alreadyRecognizedStays = eligibleStays.length - newStays.length;
    excluded.alreadyRecognizedRefunds = eligibleRefunds.length - newRefunds.length;
    excluded.alreadyRecognizedPayouts = eligiblePayouts.length - newPayouts.length;

    const coversPeriod = assignments.some((assignment: any) => (!assignment.effectiveFrom || assignment.effectiveFrom < periodEnd)
      && (!assignment.effectiveTo || assignment.effectiveTo > periodStart));
    if (!coversPeriod && !newStays.length && !newRefunds.length && !newPayouts.length) {
      throw financeError('BAD_USER_INPUT', 'No owner assignment or owner activity falls in this period.');
    }

    const calculation = (() => {
      try {
        return buildOwnerStatement({
          ownerId: owner.id,
          propertyAssignments: assignments.map((assignment: any) => ({
            id: assignment.id,
            propertyId: assignment.propertyId,
            ownershipBasisPoints: assignment.ownershipBasisPoints,
            managerCommissionBasisPoints: assignment.managerCommissionBasisPoints,
            effectiveFrom: assignment.effectiveFrom || null,
            effectiveTo: assignment.effectiveTo || null,
          })),
          periodStart,
          periodEnd,
          currencyCode,
          reservations: newStays,
          refunds: newRefunds,
          refundStays: newRefunds.map((refund: any) => stayById.get(refund.reservationId)),
          payouts: newPayouts.map((payout: any) => ({ id: payout.id, ownerId: owner.id, status: payout.status, amountCents: payout.netAmountCents ?? 0, paidAt: payout.paidAt?.toISOString(), currencyCode: payout.currencyCode, ownerStatementId: payout.ownerStatementId })),
          adjustments: [],
        });
      } catch (error) {
        throw financeError('BAD_USER_INPUT', error instanceof Error ? error.message : 'The statement could not be calculated.');
      }
    })();

    const id = crypto.randomUUID();
    const number = statementNumber(owner.ownerNumber, periodEnd, idempotencyKey, revision);
    const generatedAt = new Date();
    const created = await tx.ownerStatement.create({
      data: {
        id,
        hostOrganizationId,
        ownerId: owner.id,
        statementNumber: number,
        idempotencyKey,
        status: 'draft',
        periodStart,
        periodEnd,
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
        generatedAt,
        statementSnapshot: {
          version: 2,
          generatedAt: generatedAt.toISOString(),
          revision,
          supersedes: supersedes ? { id: supersedes.id, statementNumber: supersedes.statementNumber } : null,
          recognition: {
            stays: 'check_out_in_period; ownership by assignment effective on the last night; booked property from the booking snapshot',
            refunds: 'completed refunds dated in the period (property-local), each recognized once',
            refundAllocation: 'concession credits are revenue; amendment and overpayment settlements are owner-neutral; other refunds are split across revenue and tax in proportion to the stay charges',
            payouts: 'paid owner payouts not linked to another statement, dated in the period (UTC)',
            pendingOwnerPolicy: ['refund_component_allocation', 'mid_stay_ownership_changes', 'inclusive_tax_share', 'retained_cancellation_revenue'],
          },
          assignments: assignments.map((assignment: any) => ({
            id: assignment.id,
            propertyId: assignment.propertyId,
            propertyName: nameByProperty.get(assignment.propertyId) || null,
            status: assignment.status,
            ownershipBasisPoints: assignment.ownershipBasisPoints,
            managerCommissionBasisPoints: assignment.managerCommissionBasisPoints,
            effectiveFrom: assignment.effectiveFrom,
            effectiveTo: assignment.effectiveTo || null,
          })),
          excluded,
          calculation,
        },
      },
    });
    if (calculation.lines.length) {
      await tx.ownerStatementLine.createMany({
        data: calculation.lines.map((line) => ({
          id: crypto.randomUUID(),
          hostOrganizationId,
          statementId: id,
          ownerId: owner.id,
          reservationId: line.reservationId || null,
          refundId: line.refundId || null,
          payoutId: line.payoutId || null,
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
      hostOrganizationId,
      eventType: 'owner_statement.generated',
      aggregateType: 'OwnerStatement',
      aggregateId: id,
      operationKey: idempotencyKey,
      payload: { statementId: id, ownerId: owner.id, periodStart, periodEnd, currencyCode, revision, supersedesStatementId: supersedes?.id || null },
    });
    return created;
  }, { maxWait: 5000, timeout: 30000, isolationLevel: 'Serializable' }));
}

const statementTransitions: Record<string, { from: string[]; to: string; verb: string }> = {
  approve: { from: ['draft'], to: 'approved', verb: 'approved' },
  send: { from: ['approved'], to: 'sent', verb: 'marked sent' },
  pay: { from: ['sent'], to: 'paid', verb: 'recorded as paid' },
  void: { from: ['draft', 'approved'], to: 'voided', verb: 'voided' },
};

function formatCents(cents: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(cents / 100);
  } catch {
    return `${cents} ${currencyCode} cents`;
  }
}

type TransferEvidence = {
  amountCents: number;
  currencyCode: string;
  paidOn: string;
  payee: string;
  method: 'bank_transfer' | 'check' | 'cash' | 'other';
  reference: string;
  custody: string;
};

const transferMethods = ['bank_transfer', 'check', 'cash', 'other'] as const;

/**
 * Structured evidence of an owner transfer made outside the app: the exact amount, currency,
 * date, payee, method and reference, and where the proof is kept. It is the operator's
 * attestation (not provider verification) and must match the statement exactly.
 */
function transferEvidence(value: unknown): TransferEvidence {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const text = (key: string, label: string, max: number) => {
    const entry = typeof input[key] === 'string' ? (input[key] as string).trim() : '';
    if (!entry) throw financeError('BAD_USER_INPUT', `${label} is required to record a paid statement.`);
    if (entry.length > max) throw financeError('BAD_USER_INPUT', `${label} must be ${max} characters or fewer.`);
    return entry;
  };
  const amountCents = Number(input.amountCents);
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw financeError('BAD_USER_INPUT', 'Enter the amount actually transferred.');
  const paidOn = text('paidOn', 'Transfer date', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn) || Number.isNaN(Date.parse(`${paidOn}T00:00:00Z`))) throw financeError('BAD_USER_INPUT', 'Transfer date must be a valid date.');
  const method = String(input.method || '');
  if (!(transferMethods as readonly string[]).includes(method)) throw financeError('BAD_USER_INPUT', 'Choose how the transfer was made.');
  if (input.attested !== true) throw financeError('BAD_USER_INPUT', 'Confirm that this transfer was actually made to the owner.');
  return {
    amountCents,
    currencyCode: text('currencyCode', 'Transfer currency', 3).toUpperCase(),
    paidOn,
    payee: text('payee', 'Payee', 200),
    method: method as TransferEvidence['method'],
    reference: text('reference', 'Transfer reference', 120),
    custody: text('custody', 'Where the proof is kept', 300),
  };
}

export async function transitionOwnerStatement(
  _root: unknown,
  args: { statementId: string; transition: string; reference?: string | null; transfer?: unknown; operationKey?: string | null },
  context: any,
) {
  const statement = await context.query.OwnerStatement.findOne({
    where: { id: args.statementId },
    query: 'id status owner { id } hostOrganization { id }',
  });
  if (!statement?.hostOrganization?.id) throw financeError('NOT_FOUND', 'Owner statement not found.');
  await authorizePayouts(context, statement.hostOrganization.id);
  const transition = statementTransitions[args.transition];
  if (!transition) throw financeError('BAD_USER_INPUT', 'Unsupported owner statement transition.');
  const reference = args.reference?.trim() || '';
  if (reference.length > 500) throw financeError('BAD_USER_INPUT', 'Statement reference is too long.');
  const operationKey = args.operationKey?.trim() || '';
  if (operationKey.length > 200) throw financeError('BAD_USER_INPUT', 'Operation key is too long.');
  const actorUserId = context.session?.itemId || null;

  return context.prisma.$transaction(async (tx: any) => {
    if (statement.owner?.id) await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `owner-statement-scope:${statement.owner.id}`);
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `owner-statement:${statement.id}`);
    const locked = await tx.ownerStatement.findUnique({ where: { id: statement.id } });
    if (!locked) throw financeError('NOT_FOUND', 'Owner statement not found.');
    // A lost response retried with the same key returns the payout this statement already
    // records, but only for the exact same evidence.
    if (args.transition === 'pay' && operationKey && locked.status === 'paid') {
      const prior = await tx.payout.findFirst({ where: { ownerStatementId: locked.id, status: 'paid' }, orderBy: [{ createdAt: 'desc' }] });
      const priorData = prior?.data && typeof prior.data === 'object' ? prior.data as Record<string, any> : {};
      if (priorData.operationKey === operationKey) {
        const evidence = transferEvidence(args.transfer);
        if (priorData.evidenceFingerprint !== crypto.createHash('sha256').update(JSON.stringify(evidence)).digest('hex')) {
          throw financeError('CONFLICT', 'This payment was already recorded with different transfer evidence.');
        }
        return locked;
      }
    }
    if (!transition.from.includes(locked.status)) {
      throw financeError('CONFLICT', `This statement is ${locked.status} and can’t be ${transition.verb}. Refresh to see its current state.`);
    }
    // Statements built from setup sample stays are never real owner money: they can be voided,
    // never approved, sent or paid.
    if (args.transition !== 'void') {
      const sample = await tx.ownerStatementLine.findFirst({ where: { statementId: locked.id, reservation: { fixtureOrigin: { not: null } } }, select: { id: true } });
      if (sample) throw financeError('CONFLICT', 'This statement includes setup sample stays, so it isn’t real owner money. Void it; real statements leave samples out.');
    }
    const now = new Date();
    const data: Record<string, unknown> = { status: transition.to };
    let payout: any = null;
    if (args.transition === 'approve') {
      const snapshot = locked.statementSnapshot && typeof locked.statementSnapshot === 'object' ? locked.statementSnapshot as Record<string, any> : {};
      // Amounts that depend on owner policy no owner has approved stay a provisional draft.
      const unresolved: string[] = Array.isArray(snapshot.calculation?.unresolvedPolicy) ? snapshot.calculation.unresolvedPolicy : [];
      if ((snapshot.calculation?.exceptions || []).length && !unresolved.length) unresolved.push('mid_stay_ownership_or_property_allocation');
      if (unresolved.length) {
        throw financeError('CONFLICT', `This draft depends on owner policy that isn’t set (${unresolved.join(', ').replaceAll('_', ' ')}). It stays a provisional draft and can’t be approved yet.`);
      }
      // Ownership of each property across all owners can't exceed 100% on any stay it covers.
      await assertPropertySharesWithinWhole(tx, locked.id);
      // Statements generated before recognition tracking may repeat an issued earning; they can't be approved.
      const sources = await tx.ownerStatementLine.findMany({
        where: { statementId: locked.id, lineType: { in: ['reservation_revenue', 'refund', 'payout'] } },
        select: { lineType: true, reservationId: true, refundId: true, payoutId: true },
      });
      const idsOf = (lineType: string, field: 'reservationId' | 'refundId' | 'payoutId') => sources.filter((line: any) => line.lineType === lineType && line[field]).map((line: any) => line[field]);
      const duplicate = sources.length ? await tx.ownerStatementLine.findFirst({
        where: {
          ownerId: locked.ownerId,
          statementId: { not: locked.id },
          statement: { status: { in: issuedStatementStatuses } },
          OR: [
            { lineType: 'reservation_revenue', reservationId: { in: idsOf('reservation_revenue', 'reservationId') } },
            { lineType: 'refund', refundId: { in: idsOf('refund', 'refundId') } },
            { lineType: 'payout', payoutId: { in: idsOf('payout', 'payoutId') } },
          ],
        },
        select: { statement: { select: { statementNumber: true } } },
      }) : null;
      if (duplicate) {
        throw financeError('CONFLICT', `Some earnings on this statement are already on ${duplicate.statement?.statementNumber || 'another issued statement'}. Void this draft and generate a new one.`);
      }
      data.approvedAt = now;
      data.statementSnapshot = { ...(locked.statementSnapshot as object), approvedAt: now.toISOString() };
    }
    if (args.transition === 'send') data.sentAt = now;
    if (args.transition === 'pay') {
      const balance = locked.balanceDueCents ?? 0;
      if (balance < 0) {
        throw financeError('CONFLICT', `This statement shows the owner owes ${formatCents(-balance, locked.currencyCode)}. Owner collections aren’t recorded here.`);
      }
      if (balance > 0) {
        // Structured transfer evidence, matched exactly to what is still due. The operator's
        // attestation is recorded as such: no provider payout id or verification is invented.
        const evidence = transferEvidence(args.transfer);
        if (evidence.amountCents !== balance) throw financeError('CONFLICT', `The transfer must be exactly the ${formatCents(balance, locked.currencyCode)} still due on this statement.`);
        if (evidence.currencyCode !== String(locked.currencyCode || '').toUpperCase()) throw financeError('CONFLICT', `The transfer must be in ${locked.currencyCode}, this statement’s currency.`);
        const today = now.toISOString().slice(0, 10);
        if (evidence.paidOn > today) throw financeError('BAD_USER_INPUT', 'A transfer can’t be dated in the future.');
        if (evidence.paidOn < locked.periodStart) throw financeError('BAD_USER_INPUT', 'The transfer date is before this statement’s period.');
        await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `owner-transfer-reference:${locked.hostOrganizationId}`);
        const reused = await tx.payout.findFirst({
          where: { hostOrganizationId: locked.hostOrganizationId, status: 'paid', data: { path: ['transfer', 'reference'], equals: evidence.reference } },
          select: { payoutNumber: true },
        });
        if (reused) throw financeError('CONFLICT', `Transfer reference ${evidence.reference} already settles ${reused.payoutNumber}. Each transfer settles one statement.`);
        const evidenceFingerprint = crypto.createHash('sha256').update(JSON.stringify(evidence)).digest('hex');
        payout = await tx.payout.create({
          data: {
            id: crypto.randomUUID(),
            hostOrganizationId: locked.hostOrganizationId,
            propertyOwnerId: locked.ownerId,
            ownerStatementId: locked.id,
            payoutNumber: `PO-${locked.statementNumber}`,
            status: 'paid',
            currencyCode: locked.currencyCode,
            grossAmountCents: balance,
            platformFeeCents: 0,
            managerFeeCents: 0,
            refundAmountCents: 0,
            netAmountCents: balance,
            providerPayoutId: null,
            scheduledAt: now,
            paidAt: new Date(`${evidence.paidOn}T12:00:00.000Z`),
            data: {
              kind: 'manual_transfer_attestation',
              basis: 'owner_statement_balance',
              transfer: evidence,
              statementId: locked.id,
              statementNumber: locked.statementNumber,
              attestedByUserId: actorUserId,
              attestedAt: now.toISOString(),
              providerVerified: false,
              evidenceFingerprint,
              ...(operationKey ? { operationKey } : {}),
            },
          },
        });
      }
      data.paidAt = payout?.paidAt || now;
      data.paidReference = payout ? (payout.data as any).transfer.reference : reference;
      data.paidOutCents = (locked.paidOutCents ?? 0) + balance;
      data.balanceDueCents = 0;
    }
    const updated = await tx.ownerStatement.update({ where: { id: locked.id }, data });
    await enqueueOutboxEvent(tx, {
      hostOrganizationId: statement.hostOrganization.id,
      eventType: `owner_statement.${transition.to}`,
      aggregateType: 'OwnerStatement',
      aggregateId: locked.id,
      operationKey: `${args.transition}:${operationKey || now.toISOString()}`,
      payload: { statementId: locked.id, status: transition.to, ...(reference ? { reference } : {}), ...(payout ? { payoutId: payout.id, amountCents: payout.netAmountCents, currencyCode: payout.currencyCode } : {}) },
    });
    return updated;
  }, { maxWait: 5000, timeout: 10000, isolationLevel: 'ReadCommitted' });
}

/**
 * Every property on this statement: on each stay's ownership date, the active shares of all
 * its owners together must not exceed 100%. Checked under per-property locks shared by every
 * approval, so two owners can't each be approved a full share of the same economics.
 */
async function assertPropertySharesWithinWhole(tx: any, statementId: string) {
  const lines = await tx.ownerStatementLine.findMany({
    where: { statementId, lineType: 'reservation_revenue' },
    select: { serviceDate: true, metadata: true },
  });
  const datesByProperty = new Map<string, Set<string>>();
  for (const line of lines) {
    const meta = line.metadata && typeof line.metadata === 'object' ? line.metadata as Record<string, any> : {};
    const propertyId = typeof meta.propertyId === 'string' ? meta.propertyId : null;
    const date = typeof meta.ownershipDate === 'string' ? meta.ownershipDate : line.serviceDate;
    if (!propertyId || !date) continue;
    datesByProperty.set(propertyId, (datesByProperty.get(propertyId) || new Set()).add(date));
  }
  for (const propertyId of [...datesByProperty.keys()].sort()) {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `owner-property-shares:${propertyId}`);
    const assignments = await tx.propertyOwnerAssignment.findMany({
      where: { propertyId, status: { not: 'ended' } },
      select: { ownerId: true, ownershipBasisPoints: true, effectiveFrom: true, effectiveTo: true, status: true },
    });
    for (const date of datesByProperty.get(propertyId)!) {
      const total = assignments
        .filter((assignment: any) => (!assignment.effectiveFrom || assignment.effectiveFrom <= date) && (!assignment.effectiveTo || date < assignment.effectiveTo))
        .reduce((sum: number, assignment: any) => sum + (assignment.ownershipBasisPoints || 0), 0);
      if (total > 10_000) {
        throw financeError('CONFLICT', `Owner shares for a property on this statement add up to ${total / 100}% on ${date}. Correct the owner assignments so they total at most 100% before approving.`);
      }
    }
  }
}

/** Per-currency statement totals and payout counts across every owner statement the operator can read. */
export async function ownerFinanceSummary(_root: unknown, _args: unknown, context: any) {
  const scope = hostChildScope(context, 'canReadPayouts');
  if (!scope) return { byCurrency: [], statementCount: 0, payoutCount: 0, payoutExceptionCount: 0, ownerCount: 0 };
  const [groups, statementCount, payoutCount, payoutExceptionCount, ownerCount] = await Promise.all([
    context.prisma.ownerStatement.groupBy({
      by: ['currencyCode', 'status'],
      where: scope,
      _sum: { ownerEarningsCents: true, balanceDueCents: true },
      _count: { _all: true },
    }),
    context.prisma.ownerStatement.count({ where: scope }),
    context.prisma.payout.count({ where: scope }),
    context.prisma.payout.count({
      where: {
        AND: [scope, {
          OR: [
            { status: { in: ['failed', 'reversed'] } },
            { status: 'paid', ownerStatementId: null, OR: [{ providerPayoutId: null }, { providerPayoutId: '' }] },
          ],
        }],
      },
    }),
    context.prisma.propertyOwner.count({ where: scope }),
  ]);
  const totals = new Map<string, { currencyCode: string; issuedEarningsCents: number; balanceDueCents: number; issuedCount: number; dueCount: number; draftCount: number }>();
  for (const group of groups) {
    const currencyCode = (group.currencyCode || '').toUpperCase();
    const entry = totals.get(currencyCode) || { currencyCode, issuedEarningsCents: 0, balanceDueCents: 0, issuedCount: 0, dueCount: 0, draftCount: 0 };
    const count = group._count?._all || 0;
    if (issuedStatementStatuses.includes(group.status)) {
      entry.issuedEarningsCents += group._sum?.ownerEarningsCents || 0;
      entry.issuedCount += count;
    }
    if (['approved', 'sent'].includes(group.status)) {
      entry.balanceDueCents += group._sum?.balanceDueCents || 0;
      entry.dueCount += count;
    }
    if (group.status === 'draft') entry.draftCount += count;
    totals.set(currencyCode, entry);
  }
  return {
    byCurrency: [...totals.values()].sort((a, b) => a.currencyCode.localeCompare(b.currencyCode)),
    statementCount,
    payoutCount,
    payoutExceptionCount,
    ownerCount,
  };
}

export const ownerFinanceTypeDefs = String.raw`
  type Query {
    """Per-currency owner statement totals and payout counts for the owners the operator can read."""
    ownerFinanceSummary: JSON!
  }
`;

export const ownerFinanceResolvers = {
  Query: {
    ownerFinanceSummary,
  },
};
