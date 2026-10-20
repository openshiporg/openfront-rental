import crypto from 'node:crypto';

type StatementReservation = {
  id: string;
  confirmationCode: string;
  /** Property the stay is allocated to: the booked property from the booking snapshot. */
  propertyId: string;
  status: string;
  source: string;
  checkInDate?: string;
  checkOutDate: string;
  currencyCode: string;
  lodgingSubtotalCents: number;
  feeTotalCents: number;
  taxTotalCents: number;
  discountTotalCents: number;
  totalAmountCents: number;
  /** Concession credits already inside discountTotalCents; each is recognized once, as its own refund event. */
  concessionCreditCents?: number;
  allocationBasis?: 'booking_snapshot' | 'current_listing';
  /** Property of the unit the stay was re-accommodated to, when it differs from the booked property. */
  servicePropertyId?: string | null;
};

export type StatementRefundKind = 'concession' | 'concession_already_netted' | 'amendment_settlement' | 'overpayment' | 'stay_refund';

type StatementRefund = {
  id: string;
  reservationId: string;
  status: string;
  amountCents: number;
  currencyCode?: string | null;
  /** Property-local date the refund was completed. */
  recognizedOn?: string;
  kind?: StatementRefundKind;
  /** The earlier issued statement that already netted this concession out of the stay's revenue. */
  nettedOn?: string;
};
type StatementPayout = {
  id: string;
  ownerId: string;
  status: string;
  amountCents: number;
  paidAt?: string | null;
  currencyCode?: string | null;
  /** A payout recorded by paying a statement settles that statement only. */
  ownerStatementId?: string | null;
};
type StatementAdjustment = {
  id: string;
  ownerId: string;
  propertyId?: string | null;
  type: 'expense' | 'adjustment';
  description: string;
  amountCents: number;
};
type StatementAssignment = {
  id?: string;
  propertyId: string;
  ownershipBasisPoints: number;
  managerCommissionBasisPoints: number;
  /** Inclusive YYYY-MM-DD; absent means the assignment governs the whole period. */
  effectiveFrom?: string | null;
  /** Exclusive YYYY-MM-DD; empty means open-ended. */
  effectiveTo?: string | null;
};

export type OwnerStatementLineInput = {
  lineKey: string;
  lineType: 'reservation_revenue' | 'refund' | 'expense' | 'adjustment' | 'manager_commission' | 'payout';
  description: string;
  amountCents: number;
  reservationId?: string;
  refundId?: string;
  payoutId?: string;
  sourceId?: string;
  serviceDate?: string;
  metadata?: Record<string, unknown>;
};

export const recognizedStayStatuses = ['confirmed', 'in_stay', 'completed'];

function dateOnly(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) throw new Error(`${label} must be a date-only value.`);
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new Error(`${label} must be a real calendar date.`);
  }
  return value;
}

function previousDay(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

function cents(value: number, label: string) {
  if (!Number.isSafeInteger(value)) throw new Error(`${label} must use integer cents.`);
  return value;
}

function basisPoints(value: number, label: string, minimum = 0) {
  if (!Number.isInteger(value) || value < minimum || value > 10_000) {
    throw new Error(`${label} must use basis points from ${minimum} to 10000.`);
  }
  return value;
}

function prorate(value: number, shareBasisPoints: number) {
  return Math.round((cents(value, 'Prorated amount') * shareBasisPoints) / 10_000);
}

export function ownerStatementIdempotencyKey({
  ownerId,
  periodStart,
  periodEnd,
  currencyCode,
  revision = 1,
}: {
  ownerId: string;
  periodStart: string;
  periodEnd: string;
  currencyCode: string;
  /** A corrected statement for a period whose earlier statements were all voided. */
  revision?: number;
}) {
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('Statement revision must be a positive integer.');
  const parts = [ownerId.trim(), dateOnly(periodStart, 'Period start'), dateOnly(periodEnd, 'Period end'), currencyCode.trim().toUpperCase()];
  // Revision 1 keeps the original key so statements generated before revisions existed still match.
  if (revision > 1) parts.push(`r${revision}`);
  return `owner-statement:${crypto.createHash('sha256').update(parts.join('|')).digest('hex')}`;
}

/** The date whose ownership governs a stay: its last night. */
export function stayOwnershipDate(reservation: { checkInDate?: string; checkOutDate: string }) {
  const lastNight = previousDay(dateOnly(reservation.checkOutDate, 'Check-out'));
  return reservation.checkInDate && lastNight < reservation.checkInDate ? reservation.checkInDate : lastNight;
}

function covers(assignment: StatementAssignment, date: string) {
  return (!assignment.effectiveFrom || assignment.effectiveFrom <= date) && (!assignment.effectiveTo || date < assignment.effectiveTo);
}

/**
 * Split a refund into the stay components it returns. Concession refunds return the price credit
 * (all revenue); amendment and overpayment refunds settle money already outside the stay price; any
 * other refund is spread over revenue and tax in proportion to the stay's charges.
 */
export function allocateRefundComponents(refund: { amountCents: number; kind?: StatementRefundKind }, stay: StatementReservation) {
  const amount = cents(refund.amountCents, 'Refund amount');
  const kind = refund.kind || 'stay_refund';
  if (kind === 'concession') return { kind, revenueCents: amount, taxCents: 0, otherCents: 0 };
  // An earlier issued statement already recognized this stay net of the concession credit:
  // the refund settles money already outside that revenue, so it is owner-neutral now.
  if (kind === 'concession_already_netted') return { kind, revenueCents: 0, taxCents: 0, otherCents: amount };
  if (kind === 'amendment_settlement' || kind === 'overpayment') return { kind, revenueCents: 0, taxCents: 0, otherCents: amount };
  const revenue = Math.max(stayRevenueCents(stay), 0);
  const tax = Math.max(stay.taxTotalCents, 0);
  const chargeable = revenue + tax;
  if (chargeable <= 0) return { kind, revenueCents: 0, taxCents: 0, otherCents: amount };
  const allocated = Math.min(amount, chargeable);
  const revenueCents = Math.round((allocated * revenue) / chargeable);
  return { kind, revenueCents, taxCents: allocated - revenueCents, otherCents: amount - allocated };
}

/** Accommodation revenue of a stay before concession credits, which are recognized as their own refunds. */
function stayRevenueCents(stay: StatementReservation) {
  const credits = cents(stay.concessionCreditCents ?? 0, 'Concession credit');
  if (credits < 0 || credits > stay.discountTotalCents) {
    throw new Error(`Reservation ${stay.confirmationCode} discount does not reconcile to its concession refunds.`);
  }
  return stay.lodgingSubtotalCents + stay.feeTotalCents - (stay.discountTotalCents - credits);
}

export function buildOwnerStatement({
  ownerId,
  propertyAssignments,
  periodStart,
  periodEnd,
  currencyCode,
  reservations,
  refunds,
  refundStays = [],
  payouts,
  adjustments,
}: {
  ownerId: string;
  propertyAssignments: StatementAssignment[];
  periodStart: string;
  periodEnd: string;
  currencyCode: string;
  /** Stays whose revenue this statement may recognize (check-out in the period). */
  reservations: StatementReservation[];
  /** Completed refunds to recognize; each must reference a stay in `reservations` or `refundStays`. */
  refunds: StatementRefund[];
  /** Stays referenced by refunds whose revenue is recognized elsewhere. */
  refundStays?: StatementReservation[];
  payouts: StatementPayout[];
  adjustments: StatementAdjustment[];
}) {
  const start = dateOnly(periodStart, 'Period start');
  const end = dateOnly(periodEnd, 'Period end');
  if (start >= end) throw new Error('Statement period end must be after its start.');
  if (!ownerId?.trim()) throw new Error('Property owner is required.');
  if (!propertyAssignments.length) throw new Error('At least one owner property assignment is required.');

  const assignmentsByProperty = new Map<string, StatementAssignment[]>();
  for (const assignment of propertyAssignments) {
    if (!assignment.propertyId?.trim()) throw new Error('Owner assignment property is required.');
    basisPoints(assignment.ownershipBasisPoints, 'Ownership', 1);
    basisPoints(assignment.managerCommissionBasisPoints, 'Manager commission');
    if (assignment.effectiveFrom) dateOnly(assignment.effectiveFrom, 'Assignment start');
    if (assignment.effectiveTo) dateOnly(assignment.effectiveTo, 'Assignment end');
    if (assignment.effectiveFrom && assignment.effectiveTo && assignment.effectiveTo <= assignment.effectiveFrom) {
      throw new Error('An owner assignment ends on or before its start date.');
    }
    const intervals = assignmentsByProperty.get(assignment.propertyId) || [];
    for (const other of intervals) {
      const overlaps = (!assignment.effectiveTo || !other.effectiveFrom || other.effectiveFrom < assignment.effectiveTo)
        && (!other.effectiveTo || !assignment.effectiveFrom || assignment.effectiveFrom < other.effectiveTo);
      if (overlaps) throw new Error('Two assignments for the same owner and property overlap in time. Correct their dates before generating a statement.');
    }
    assignmentsByProperty.set(assignment.propertyId, [...intervals, assignment]);
  }
  const assignmentFor = (propertyId: string, date: string) => (assignmentsByProperty.get(propertyId) || []).find((assignment) => covers(assignment, date)) || null;

  const currency = currencyCode.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Statement currency is invalid.');
  const assertCurrency = (value: string | null | undefined, label: string) => {
    if (value && value.toUpperCase() !== currency) throw new Error(`${label} currency does not match the owner statement currency.`);
  };

  const exceptions: Array<Record<string, unknown>> = [];
  const includedReservations = reservations
    .filter((reservation) => reservation.checkOutDate >= start && reservation.checkOutDate < end)
    .filter((reservation) => recognizedStayStatuses.includes(reservation.status))
    .map((reservation) => ({ reservation, ownershipDate: stayOwnershipDate(reservation) }))
    .map((item) => ({ ...item, assignment: assignmentFor(item.reservation.propertyId, item.ownershipDate) }))
    .filter((item): item is { reservation: StatementReservation; ownershipDate: string; assignment: StatementAssignment } => Boolean(item.assignment))
    .sort((a, b) => a.reservation.checkOutDate.localeCompare(b.reservation.checkOutDate) || a.reservation.id.localeCompare(b.reservation.id));
  for (const { reservation, assignment } of includedReservations) {
    assertCurrency(reservation.currencyCode, 'Reservation');
    if (reservation.checkInDate && assignment.effectiveFrom && assignment.effectiveFrom > reservation.checkInDate) {
      exceptions.push({ type: 'stay_spans_assignment_start', reservationId: reservation.id, confirmationCode: reservation.confirmationCode, assignmentId: assignment.id || null });
    }
    if (reservation.servicePropertyId && reservation.servicePropertyId !== reservation.propertyId) {
      exceptions.push({ type: 'reaccommodated_to_other_property', reservationId: reservation.id, confirmationCode: reservation.confirmationCode, servicePropertyId: reservation.servicePropertyId });
    }
    if (reservation.allocationBasis === 'current_listing') {
      exceptions.push({ type: 'no_booking_snapshot_property', reservationId: reservation.id, confirmationCode: reservation.confirmationCode });
    }
  }

  const stayById = new Map<string, StatementReservation>();
  for (const stay of [...refundStays, ...reservations]) stayById.set(stay.id, stay);
  const recognizedRefunds = refunds
    .filter((refund) => refund.status === 'succeeded')
    .map((refund) => {
      const stay = stayById.get(refund.reservationId);
      if (!stay) throw new Error(`Refund ${refund.id} is missing its stay evidence.`);
      return { refund, stay };
    })
    .filter(({ refund }) => !refund.recognizedOn || (refund.recognizedOn >= start && refund.recognizedOn < end))
    .filter(({ stay }) => recognizedStayStatuses.includes(stay.status))
    .map((item) => ({ ...item, assignment: assignmentFor(item.stay.propertyId, stayOwnershipDate(item.stay)) }))
    .filter((item): item is { refund: StatementRefund; stay: StatementReservation; assignment: StatementAssignment } => Boolean(item.assignment))
    .sort((a, b) => (a.refund.recognizedOn || '').localeCompare(b.refund.recognizedOn || '') || a.refund.id.localeCompare(b.refund.id));
  for (const { refund, stay } of recognizedRefunds) {
    assertCurrency(stay.currencyCode, 'Refunded stay');
    assertCurrency(refund.currencyCode, 'Refund');
  }

  const paidPayouts = payouts
    .filter((payout) => payout.ownerId === ownerId && payout.status === 'paid' && Boolean(payout.paidAt) && !payout.ownerStatementId)
    .filter((payout) => payout.paidAt!.slice(0, 10) >= start && payout.paidAt!.slice(0, 10) < end)
    .filter((payout) => !payout.currencyCode || payout.currencyCode.toUpperCase() === currency)
    .sort((a, b) => (a.paidAt || '').localeCompare(b.paidAt || '') || a.id.localeCompare(b.id));
  const orderedAdjustments = adjustments
    .filter((adjustment) => adjustment.ownerId === ownerId)
    .filter((adjustment) => !adjustment.propertyId || assignmentsByProperty.has(adjustment.propertyId))
    .sort((a, b) => a.id.localeCompare(b.id));

  const stayAmounts = includedReservations.map(({ reservation, ownershipDate, assignment }) => {
    const revenueCents = stayRevenueCents(reservation);
    const grossCents = prorate(revenueCents, assignment.ownershipBasisPoints);
    return {
      reservation,
      ownershipDate,
      assignment,
      revenueCents,
      grossCents,
      taxCents: prorate(reservation.taxTotalCents, assignment.ownershipBasisPoints),
      commissionCents: prorate(grossCents, assignment.managerCommissionBasisPoints),
    };
  });
  const refundAmounts = recognizedRefunds.map(({ refund, stay, assignment }) => {
    const components = allocateRefundComponents(refund, stay);
    const revenueCents = prorate(components.revenueCents, assignment.ownershipBasisPoints);
    return {
      refund,
      stay,
      assignment,
      components,
      revenueCents,
      taxCents: prorate(components.taxCents, assignment.ownershipBasisPoints),
      commissionReversalCents: prorate(revenueCents, assignment.managerCommissionBasisPoints),
    };
  });

  const grossRevenueCents = stayAmounts.reduce((sum, item) => sum + item.grossCents, 0);
  const taxAmountCents = stayAmounts.reduce((sum, item) => sum + item.taxCents, 0) - refundAmounts.reduce((sum, item) => sum + item.taxCents, 0);
  const refundAmountCents = refundAmounts.reduce((sum, item) => sum + item.revenueCents, 0);
  const expenseAmountCents = orderedAdjustments.filter((item) => item.type === 'expense').reduce((sum, item) => sum + cents(item.amountCents, 'Expense amount'), 0);
  const adjustmentAmountCents = orderedAdjustments.filter((item) => item.type === 'adjustment').reduce((sum, item) => sum + cents(item.amountCents, 'Adjustment amount'), 0);
  const managerCommissionCents = stayAmounts.reduce((sum, item) => sum + item.commissionCents, 0)
    - refundAmounts.reduce((sum, item) => sum + item.commissionReversalCents, 0);
  const ownerEarningsCents = grossRevenueCents - refundAmountCents - expenseAmountCents + adjustmentAmountCents - managerCommissionCents;
  const paidOutCents = paidPayouts.reduce((sum, payout) => sum + cents(payout.amountCents, 'Payout amount'), 0);
  const balanceDueCents = ownerEarningsCents - paidOutCents;

  const lines: OwnerStatementLineInput[] = [
    ...stayAmounts.flatMap((item): OwnerStatementLineInput[] => {
      const { reservation, assignment } = item;
      const revenueLine: OwnerStatementLineInput = {
        lineKey: `reservation:${reservation.id}`,
        lineType: 'reservation_revenue',
        description: `${reservation.confirmationCode} accommodation revenue`,
        amountCents: item.grossCents,
        reservationId: reservation.id,
        sourceId: reservation.id,
        serviceDate: reservation.checkOutDate,
        metadata: {
          source: reservation.source,
          propertyId: reservation.propertyId,
          allocationBasis: reservation.allocationBasis || 'booking_snapshot',
          servicePropertyId: reservation.servicePropertyId || null,
          assignmentId: assignment.id || null,
          ownershipDate: item.ownershipDate,
          ownershipBasisPoints: assignment.ownershipBasisPoints,
          managerCommissionBasisPoints: assignment.managerCommissionBasisPoints,
          stayRevenueCents: item.revenueCents,
          lodgingSubtotalCents: reservation.lodgingSubtotalCents,
          feeTotalCents: reservation.feeTotalCents,
          discountTotalCents: reservation.discountTotalCents,
          concessionCreditCents: reservation.concessionCreditCents ?? 0,
          taxAmountCents: item.taxCents,
          totalAmountCents: reservation.totalAmountCents,
        },
      };
      if (!item.commissionCents) return [revenueLine];
      return [revenueLine, {
        lineKey: `manager-commission:reservation:${reservation.id}`,
        lineType: 'manager_commission',
        description: `${reservation.confirmationCode} management commission`,
        amountCents: -item.commissionCents,
        reservationId: reservation.id,
        sourceId: reservation.id,
        serviceDate: reservation.checkOutDate,
        metadata: { basisPoints: assignment.managerCommissionBasisPoints, baseCents: item.grossCents, assignmentId: assignment.id || null },
      }];
    }),
    ...refundAmounts.flatMap((item): OwnerStatementLineInput[] => {
      const { refund, stay, assignment } = item;
      const refundLine: OwnerStatementLineInput = {
        lineKey: `refund:${refund.id}`,
        lineType: 'refund',
        description: `${stay.confirmationCode} refund`,
        amountCents: -item.revenueCents,
        reservationId: stay.id,
        refundId: refund.id,
        sourceId: refund.id,
        serviceDate: refund.recognizedOn,
        metadata: {
          refundAmountCents: refund.amountCents,
          allocation: item.components,
          ownerTaxCents: item.taxCents,
          propertyId: stay.propertyId,
          assignmentId: assignment.id || null,
          ownershipBasisPoints: assignment.ownershipBasisPoints,
          stayCheckOutDate: stay.checkOutDate,
          ...(refund.nettedOn ? { correction: { kind: 'concession_already_netted', statementNumber: refund.nettedOn } } : {}),
        },
      };
      if (!item.commissionReversalCents) return [refundLine];
      return [refundLine, {
        lineKey: `manager-commission:refund:${refund.id}`,
        lineType: 'manager_commission',
        description: `${stay.confirmationCode} commission returned on refund`,
        amountCents: item.commissionReversalCents,
        reservationId: stay.id,
        refundId: refund.id,
        sourceId: refund.id,
        serviceDate: refund.recognizedOn,
        metadata: { basisPoints: assignment.managerCommissionBasisPoints, baseCents: item.revenueCents, assignmentId: assignment.id || null },
      }];
    }),
    ...orderedAdjustments.map((adjustment) => ({
      lineKey: `${adjustment.type}:${adjustment.id}`,
      lineType: adjustment.type,
      description: adjustment.description,
      amountCents: adjustment.type === 'expense' ? -adjustment.amountCents : adjustment.amountCents,
      sourceId: adjustment.id,
    })),
    ...paidPayouts.map((payout) => ({
      lineKey: `payout:${payout.id}`,
      lineType: 'payout' as const,
      description: `Owner payout ${payout.id}`,
      amountCents: -payout.amountCents,
      payoutId: payout.id,
      sourceId: payout.id,
      serviceDate: payout.paidAt?.slice(0, 10),
    })),
  ];

  return {
    ownerId,
    propertyIds: [...assignmentsByProperty.keys()].sort(),
    periodStart: start,
    periodEnd: end,
    currencyCode: currency,
    grossRevenueCents,
    taxAmountCents,
    refundAmountCents,
    expenseAmountCents,
    adjustmentAmountCents,
    managerCommissionCents,
    ownerEarningsCents,
    paidOutCents,
    balanceDueCents,
    reservationIds: includedReservations.map(({ reservation }) => reservation.id),
    refundIds: recognizedRefunds.map(({ refund }) => refund.id),
    payoutIds: paidPayouts.map((payout) => payout.id),
    exceptions,
    /**
     * Owner policy this statement's amounts depend on but no owner has approved: allocation
     * across ownership changes or moved stays, and how a stay refund splits across revenue,
     * tax and fees. A statement with any of these stays a provisional draft; it can't be
     * approved or paid until the policy is resolved.
     */
    unresolvedPolicy: [
      ...(exceptions.length ? ['mid_stay_ownership_or_property_allocation'] : []),
      ...(refundAmounts.some((item) => item.components.kind === 'stay_refund') ? ['refund_component_allocation'] : []),
    ],
    lines,
  };
}
