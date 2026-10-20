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
  /** Tender identity: test-card money is told apart from real money per payment, never per booking. */
  provider: string | null;
  data?: unknown;
};

/** Stripe tender in this store is always TEST money (the adapter refuses live mode). */
export function isTestTender(payment: { provider?: string | null; data?: unknown }) {
  const data = payment.data && typeof payment.data === 'object' ? payment.data as Record<string, unknown> : {};
  return payment.provider === 'pp_stripe_stripe' || data.mode === 'test';
}

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
 *
 * Tender whose mode differs from the booking's (test-card money on a real stay, or real money
 * recorded on a test booking) never counts toward this booking's balance: a test payment can't
 * settle a real debt. It isn't hidden either: it is returned in `segregatedTender`, with its
 * refunds, so real money stays reportable and test money stays visibly separate.
 */
export function reconcileReservationPaymentEvidence({
  payments,
  refunds,
  currencyCode,
  testMode,
}: {
  payments: PaymentEvidence[];
  refunds: RefundEvidence[];
  currencyCode: string;
  testMode: boolean;
}) {
  const expectedCurrency = currencyCode?.toUpperCase();
  if (!expectedCurrency || !/^[A-Z]{3}$/.test(expectedCurrency)) {
    throw new Error('Reservation currency code is invalid.');
  }
  const segregatedIds = new Set(payments.filter((payment) => isTestTender(payment) !== testMode).map((payment) => payment.id));
  const segregatedTender = { count: segregatedIds.size, grossCents: 0, netCents: 0, completedRefundCents: 0, openRefundCents: 0, pendingCents: 0 };

  const refundTotals = new Map<string, number>();
  let completedRefundCents = 0;
  let openRefundCents = 0;
  let hasRefunds = false;
  for (const refund of refunds) {
    assertCents(refund.amountCents, `Refund ${refund.id} amount`, false);
    if (refund.currencyCode?.toUpperCase() !== expectedCurrency) {
      throw new Error('Refund currency does not match the reservation currency.');
    }
    if (refund.paymentId && segregatedIds.has(refund.paymentId)) {
      if (completedRefundStatuses.has(refund.status || '')) {
        segregatedTender.completedRefundCents += refund.amountCents;
        refundTotals.set(refund.paymentId, (refundTotals.get(refund.paymentId) || 0) + refund.amountCents);
      } else if (openRefundStatuses.has(refund.status || '')) segregatedTender.openRefundCents += refund.amountCents;
      continue;
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
    const segregated = segregatedIds.has(payment.id);
    if (!settledPaymentStatuses.has(payment.status || '')) {
      if ((payment.refundedAmountCents || 0) > 0 || ledgerRefundCents > 0) {
        throw new Error('Payment status and refund evidence do not reconcile.');
      }
      if (['pending', 'processing'].includes(payment.status || '')) {
        assertCents(payment.amountCents, 'Pending payment amount', false);
        if (payment.currencyCode?.toUpperCase() !== expectedCurrency) {
          throw new Error('Payment currency does not match the reservation currency.');
        }
        if (segregated) segregatedTender.pendingCents += payment.amountCents;
        else pendingTenderCents += payment.amountCents;
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
    if (segregated) {
      segregatedTender.grossCents += payment.amountCents;
      segregatedTender.netCents += payment.amountCents - ledgerRefundCents;
    } else {
      grossCollectedCents += payment.amountCents;
      netPaidCents += payment.amountCents - ledgerRefundCents;
    }
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

  return { grossCollectedCents, completedRefundCents, netPaidCents, pendingTenderCents, openRefundCents, hasRefunds, segregatedTender };
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
