const settledPaymentStatuses = new Set(['succeeded', 'partially_refunded', 'refunded']);
const completedRefundStatuses = new Set(['succeeded']);
const openRefundStatuses = new Set(['pending', 'processing', 'failed']);

function assertCents(value: unknown, label: string, allowZero = true): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < (allowZero ? 0 : 1)) {
    throw new Error(`${label} must be a ${allowZero ? 'non-negative' : 'positive'} integer number of cents.`);
  }
}

export type PaymentEvidence = {
  id: string;
  status: string | null;
  amountCents: number;
  refundedAmountCents?: number | null;
  currencyCode: string;
};

export type RefundEvidence = {
  id: string;
  paymentId: string | null;
  status: string | null;
  amountCents: number;
  currencyCode: string | null;
};

/**
 * Reconcile the reservation's collection summary from durable payment and refund
 * facts. Pending/failed refund obligations are returned separately: they are not
 * completed transfers and must not reduce retained money.
 */
export function reconcileReservationPaymentEvidence({
  payments,
  refunds,
  currencyCode,
}: {
  payments: PaymentEvidence[];
  refunds: RefundEvidence[];
  currencyCode: string;
}) {
  const expectedCurrency = currencyCode?.toUpperCase();
  if (!expectedCurrency || !/^[A-Z]{3}$/.test(expectedCurrency)) {
    throw new Error('Reservation currency code is invalid.');
  }

  const refundTotals = new Map<string, number>();
  let completedRefundCents = 0;
  let openRefundCents = 0;
  let hasRefunds = false;
  for (const refund of refunds) {
    assertCents(refund.amountCents, `Refund ${refund.id} amount`, false);
    if (refund.currencyCode?.toUpperCase() !== expectedCurrency) {
      throw new Error('Refund currency does not match the reservation currency.');
    }
    if (completedRefundStatuses.has(refund.status || '')) {
      if (!refund.paymentId) throw new Error('A successful refund is missing its payment link.');
      refundTotals.set(refund.paymentId, (refundTotals.get(refund.paymentId) || 0) + refund.amountCents);
      completedRefundCents += refund.amountCents;
      hasRefunds = true;
    } else if (openRefundStatuses.has(refund.status || '')) {
      openRefundCents += refund.amountCents;
    }
  }

  let grossCollectedCents = 0;
  let netPaidCents = 0;
  let pendingTenderCents = 0;
  const seenPaymentIds = new Set<string>();
  for (const payment of payments) {
    if (seenPaymentIds.has(payment.id)) throw new Error('Reservation payment evidence contains a duplicate payment.');
    seenPaymentIds.add(payment.id);
    const ledgerRefundCents = refundTotals.get(payment.id) || 0;
    if (!settledPaymentStatuses.has(payment.status || '')) {
      if ((payment.refundedAmountCents || 0) > 0 || ledgerRefundCents > 0) {
        throw new Error('Payment status and refund evidence do not reconcile.');
      }
      if (['pending', 'processing'].includes(payment.status || '')) {
        assertCents(payment.amountCents, 'Pending payment amount', false);
        if (payment.currencyCode?.toUpperCase() !== expectedCurrency) {
          throw new Error('Payment currency does not match the reservation currency.');
        }
        pendingTenderCents += payment.amountCents;
      }
      continue;
    }
    assertCents(payment.amountCents, 'Payment amount', false);
    assertCents(payment.refundedAmountCents ?? 0, 'Refunded payment amount');
    if (payment.currencyCode?.toUpperCase() !== expectedCurrency) {
      throw new Error('Payment currency does not match the reservation currency.');
    }
    const recordedRefundCents = payment.refundedAmountCents ?? 0;
    if (recordedRefundCents > payment.amountCents || recordedRefundCents !== ledgerRefundCents) {
      throw new Error('Payment refund totals do not reconcile to the refund ledger.');
    }
    if ((payment.status === 'succeeded' && ledgerRefundCents !== 0)
      || (payment.status === 'partially_refunded' && (ledgerRefundCents === 0 || ledgerRefundCents >= payment.amountCents))
      || (payment.status === 'refunded' && ledgerRefundCents !== payment.amountCents)) {
      throw new Error('Payment status and refund evidence do not reconcile.');
    }
    grossCollectedCents += payment.amountCents;
    netPaidCents += payment.amountCents - ledgerRefundCents;
    refundTotals.delete(payment.id);
  }

  if ([...refundTotals.values()].some((amount) => amount > 0)) {
    throw new Error('The successful refund ledger does not match the reservation payment records.');
  }
  assertCents(grossCollectedCents, 'Gross collected amount');
  assertCents(completedRefundCents, 'Completed refund amount');
  assertCents(netPaidCents, 'Net paid amount');
  assertCents(pendingTenderCents, 'Pending tender amount');
  assertCents(openRefundCents, 'Open refund liability amount');

  return { grossCollectedCents, completedRefundCents, netPaidCents, pendingTenderCents, openRefundCents, hasRefunds };
}

export function unreservedReservationBalance({ totalAmountCents, netPaidCents, pendingTenderCents }: {
  totalAmountCents: number;
  netPaidCents: number;
  pendingTenderCents: number;
}) {
  assertCents(totalAmountCents, 'Reservation total');
  assertCents(netPaidCents, 'Net paid amount');
  assertCents(pendingTenderCents, 'Pending tender amount');
  return Math.max(totalAmountCents - netPaidCents - pendingTenderCents, 0);
}

export function reservationPaymentStatus({ netPaidCents, totalAmountCents, hasRefunds, openRefundCents }: {
  netPaidCents: number;
  totalAmountCents: number;
  hasRefunds: boolean;
  openRefundCents: number;
}) {
  assertCents(netPaidCents, 'Net paid amount');
  assertCents(totalAmountCents, 'Reservation total');
  assertCents(openRefundCents, 'Open refund liability amount');
  if (openRefundCents > 0) return 'refund_pending';
  if (netPaidCents === 0) return hasRefunds ? 'refunded' : 'unpaid';
  if (netPaidCents >= totalAmountCents) return 'paid';
  return hasRefunds ? 'partially_refunded' : 'partial';
}
