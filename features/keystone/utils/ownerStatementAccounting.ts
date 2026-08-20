import crypto from 'node:crypto';

type StatementReservation = {
  id: string;
  confirmationCode: string;
  propertyId: string;
  status: string;
  source: string;
  checkOutDate: string;
  currencyCode: string;
  lodgingSubtotalCents: number;
  feeTotalCents: number;
  taxTotalCents: number;
  discountTotalCents: number;
  totalAmountCents: number;
};

type StatementRefund = { id: string; reservationId: string; status: string; amountCents: number };
type StatementPayout = { id: string; ownerId: string; status: string; amountCents: number; paidAt?: string | null };
type StatementAdjustment = {
  id: string;
  ownerId: string;
  propertyId?: string | null;
  type: 'expense' | 'adjustment';
  description: string;
  amountCents: number;
};
type StatementAssignment = {
  propertyId: string;
  ownershipBasisPoints: number;
  managerCommissionBasisPoints: number;
};

export type OwnerStatementLineInput = {
  lineKey: string;
  lineType: 'reservation_revenue' | 'refund' | 'expense' | 'adjustment' | 'manager_commission' | 'payout';
  description: string;
  amountCents: number;
  reservationId?: string;
  sourceId?: string;
  serviceDate?: string;
  metadata?: Record<string, unknown>;
};

function dateOnly(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} must be a date-only value.`);
  return value;
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
}: {
  ownerId: string;
  periodStart: string;
  periodEnd: string;
  currencyCode: string;
}) {
  const canonical = [ownerId.trim(), dateOnly(periodStart, 'Period start'), dateOnly(periodEnd, 'Period end'), currencyCode.trim().toUpperCase()].join('|');
  return `owner-statement:${crypto.createHash('sha256').update(canonical).digest('hex')}`;
}

export function buildOwnerStatement({
  ownerId,
  propertyAssignments,
  periodStart,
  periodEnd,
  currencyCode,
  reservations,
  refunds,
  payouts,
  adjustments,
}: {
  ownerId: string;
  propertyAssignments: StatementAssignment[];
  periodStart: string;
  periodEnd: string;
  currencyCode: string;
  reservations: StatementReservation[];
  refunds: StatementRefund[];
  payouts: StatementPayout[];
  adjustments: StatementAdjustment[];
}) {
  const start = dateOnly(periodStart, 'Period start');
  const end = dateOnly(periodEnd, 'Period end');
  if (start >= end) throw new Error('Statement period end must be after its start.');
  if (!ownerId?.trim()) throw new Error('Property owner is required.');
  if (!propertyAssignments.length) throw new Error('At least one active owner property assignment is required.');

  const assignments = new Map<string, StatementAssignment>();
  for (const assignment of propertyAssignments) {
    if (!assignment.propertyId?.trim()) throw new Error('Owner assignment property is required.');
    if (assignments.has(assignment.propertyId)) throw new Error('Only one active assignment per owner property is allowed for a statement period.');
    basisPoints(assignment.ownershipBasisPoints, 'Ownership', 1);
    basisPoints(assignment.managerCommissionBasisPoints, 'Manager commission');
    assignments.set(assignment.propertyId, assignment);
  }

  const currency = currencyCode.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Statement currency is invalid.');

  const includedReservations = reservations
    .filter((reservation) => assignments.has(reservation.propertyId))
    .filter((reservation) => reservation.checkOutDate >= start && reservation.checkOutDate < end)
    .filter((reservation) => !['cancelled', 'no_show', 'inquiry', 'quoted'].includes(reservation.status))
    .sort((a, b) => a.checkOutDate.localeCompare(b.checkOutDate) || a.id.localeCompare(b.id));
  for (const reservation of includedReservations) {
    if (reservation.currencyCode.toUpperCase() !== currency) throw new Error('Reservation currency does not match the owner statement currency.');
  }

  const reservationById = new Map(includedReservations.map((reservation) => [reservation.id, reservation]));
  const successfulRefunds = refunds
    .filter((refund) => refund.status === 'succeeded' && reservationById.has(refund.reservationId))
    .sort((a, b) => a.id.localeCompare(b.id));
  const paidPayouts = payouts
    .filter((payout) => payout.ownerId === ownerId && payout.status === 'paid' && Boolean(payout.paidAt))
    .filter((payout) => payout.paidAt!.slice(0, 10) >= start && payout.paidAt!.slice(0, 10) < end)
    .sort((a, b) => (a.paidAt || '').localeCompare(b.paidAt || '') || a.id.localeCompare(b.id));
  const orderedAdjustments = adjustments
    .filter((adjustment) => adjustment.ownerId === ownerId)
    .filter((adjustment) => !adjustment.propertyId || assignments.has(adjustment.propertyId))
    .sort((a, b) => a.id.localeCompare(b.id));

  const reservationAmounts = new Map(includedReservations.map((reservation) => {
    const assignment = assignments.get(reservation.propertyId)!;
    const gross = reservation.lodgingSubtotalCents + reservation.feeTotalCents - reservation.discountTotalCents;
    return [reservation.id, {
      grossCents: prorate(gross, assignment.ownershipBasisPoints),
      taxCents: prorate(reservation.taxTotalCents, assignment.ownershipBasisPoints),
      ownershipBasisPoints: assignment.ownershipBasisPoints,
      managerCommissionBasisPoints: assignment.managerCommissionBasisPoints,
    }];
  }));
  const refundAmounts = new Map<string, number>();
  const refundsByReservation = new Map<string, number>();
  for (const refund of successfulRefunds) {
    const reservation = reservationById.get(refund.reservationId)!;
    const assignment = assignments.get(reservation.propertyId)!;
    const ownerRefundCents = prorate(refund.amountCents, assignment.ownershipBasisPoints);
    refundAmounts.set(refund.id, ownerRefundCents);
    refundsByReservation.set(refund.reservationId, (refundsByReservation.get(refund.reservationId) || 0) + ownerRefundCents);
  }

  const grossRevenueCents = [...reservationAmounts.values()].reduce((sum, value) => sum + value.grossCents, 0);
  const taxAmountCents = [...reservationAmounts.values()].reduce((sum, value) => sum + value.taxCents, 0);
  const refundAmountCents = [...refundsByReservation.values()].reduce((sum, value) => sum + value, 0);
  const expenseAmountCents = orderedAdjustments.filter((item) => item.type === 'expense').reduce((sum, item) => sum + cents(item.amountCents, 'Expense amount'), 0);
  const adjustmentAmountCents = orderedAdjustments.filter((item) => item.type === 'adjustment').reduce((sum, item) => sum + cents(item.amountCents, 'Adjustment amount'), 0);
  const managerCommissionCents = includedReservations.reduce((sum, reservation) => {
    const amounts = reservationAmounts.get(reservation.id)!;
    const commissionable = Math.max(amounts.grossCents - (refundsByReservation.get(reservation.id) || 0), 0);
    return sum + prorate(commissionable, amounts.managerCommissionBasisPoints);
  }, 0);
  const ownerEarningsCents = grossRevenueCents - refundAmountCents - expenseAmountCents + adjustmentAmountCents - managerCommissionCents;
  const paidOutCents = paidPayouts.reduce((sum, payout) => sum + cents(payout.amountCents, 'Payout amount'), 0);
  const balanceDueCents = ownerEarningsCents - paidOutCents;

  const lines: OwnerStatementLineInput[] = [
    ...includedReservations.map((reservation) => {
      const amounts = reservationAmounts.get(reservation.id)!;
      return {
        lineKey: `reservation:${reservation.id}`,
        lineType: 'reservation_revenue' as const,
        description: `${reservation.confirmationCode} accommodation revenue`,
        amountCents: amounts.grossCents,
        reservationId: reservation.id,
        sourceId: reservation.id,
        serviceDate: reservation.checkOutDate,
        metadata: { source: reservation.source, taxAmountCents: amounts.taxCents, ownershipBasisPoints: amounts.ownershipBasisPoints, totalAmountCents: reservation.totalAmountCents },
      };
    }),
    ...successfulRefunds.map((refund) => ({
      lineKey: `refund:${refund.id}`,
      lineType: 'refund' as const,
      description: `Refund for ${refund.reservationId}`,
      amountCents: -(refundAmounts.get(refund.id) || 0),
      reservationId: refund.reservationId,
      sourceId: refund.id,
    })),
    ...orderedAdjustments.map((adjustment) => ({
      lineKey: `${adjustment.type}:${adjustment.id}`,
      lineType: adjustment.type,
      description: adjustment.description,
      amountCents: adjustment.type === 'expense' ? -adjustment.amountCents : adjustment.amountCents,
      sourceId: adjustment.id,
    })),
    ...(managerCommissionCents ? [{
      lineKey: `manager-commission:${start}:${end}`,
      lineType: 'manager_commission' as const,
      description: 'Property-management commission',
      amountCents: -managerCommissionCents,
    }] : []),
    ...paidPayouts.map((payout) => ({
      lineKey: `payout:${payout.id}`,
      lineType: 'payout' as const,
      description: `Owner payout ${payout.id}`,
      amountCents: -payout.amountCents,
      sourceId: payout.id,
      serviceDate: payout.paidAt?.slice(0, 10),
    })),
  ];

  return {
    ownerId,
    propertyIds: [...assignments.keys()].sort(),
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
    reservationIds: includedReservations.map((reservation) => reservation.id),
    lines,
  };
}
