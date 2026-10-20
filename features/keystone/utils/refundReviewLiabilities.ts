import crypto from 'node:crypto';

const settledStatuses = new Set(['succeeded', 'partially_refunded', 'refunded']);
const openStatuses = new Set(['pending', 'processing', 'failed']);

export async function createUncoveredRefundReviewLiabilities(tx: any, {
  reservation,
  payments,
  refunds,
  netPaidCents,
  targetAmountCents,
  reason,
  liabilityType,
  operationPrefix,
  review = false,
}: {
  reservation: { id: string; confirmationCode: string; hostOrganizationId: string; currencyCode: string };
  payments: Array<{ id: string; status: string | null; amountCents: number; refundedAmountCents?: number | null }>;
  refunds: Array<{ id: string; paymentId: string | null; status: string | null; amountCents: number }>;
  netPaidCents: number;
  targetAmountCents?: number;
  reason: string;
  liabilityType: string;
  operationPrefix: string;
  /**
   * The amount depends on the captured policy (a guest cancellation or no-show), so it opens
   * as a refund under the host's review, not as money owed. Host cancellations and money held
   * above the stay total are owed and open as pending.
   */
  review?: boolean;
}) {
  const openByPayment = new Map<string, number>();
  let openTotalCents = 0;
  for (const refund of refunds) {
    if (!openStatuses.has(refund.status || '')) continue;
    if (!refund.paymentId) throw new Error('An open refund liability is missing its payment association.');
    if (!Number.isSafeInteger(refund.amountCents) || refund.amountCents <= 0) {
      throw new Error('An open refund liability must contain a positive integer-cent amount.');
    }
    openByPayment.set(refund.paymentId, (openByPayment.get(refund.paymentId) || 0) + refund.amountCents);
    openTotalCents += refund.amountCents;
  }
  const target = targetAmountCents ?? netPaidCents;
  if (!Number.isSafeInteger(netPaidCents) || netPaidCents < 0
    || !Number.isSafeInteger(target) || target < 0 || target > netPaidCents
    || !Number.isSafeInteger(openTotalCents)) {
    throw new Error('Refund review liability totals are invalid.');
  }

  let uncoveredCents = Math.max(target - openTotalCents, 0);
  let createdCents = 0;
  const created: Array<{ id: string; paymentId: string; amountCents: number }> = [];
  for (const payment of payments) {
    if (!settledStatuses.has(payment.status || '') || uncoveredCents === 0) continue;
    const available = payment.amountCents - (payment.refundedAmountCents || 0) - (openByPayment.get(payment.id) || 0);
    if (!Number.isSafeInteger(available) || available < 0) throw new Error('Payment evidence cannot cover its recorded refund liabilities.');
    const amountCents = Math.min(available, uncoveredCents);
    if (amountCents <= 0) continue;

    const id = crypto.randomUUID();
    const identity = crypto.createHash('sha256').update(`${reservation.id}|${payment.id}|${liabilityType}`).digest('hex');
    const idempotencyKey = `${operationPrefix}:${identity}`;
    const existing = await tx.refund.findUnique({ where: { idempotencyKey } });
    if (existing) {
      if (existing.status !== (review ? 'review' : 'pending') || existing.amountCents !== amountCents || existing.paymentId !== payment.id) {
        throw new Error('An existing refund review identity conflicts with the uncovered liability.');
      }
      uncoveredCents -= amountCents;
      continue;
    }
    await tx.refund.create({
      data: {
        id,
        hostOrganizationId: reservation.hostOrganizationId,
        reservationId: reservation.id,
        paymentId: payment.id,
        refundNumber: `REF-REV-${reservation.confirmationCode}-${id.slice(0, 8).toUpperCase()}`,
        idempotencyKey,
        status: review ? 'review' : 'pending',
        reason,
        amountCents,
        currencyCode: reservation.currencyCode,
        data: {
          liabilityType,
          policyReviewRequired: review,
          ...(review ? { candidate: true } : {}),
          reviewOnly: true,
          transferCompleted: false,
        },
      },
    });
    created.push({ id, paymentId: payment.id, amountCents });
    createdCents += amountCents;
    uncoveredCents -= amountCents;
  }
  if (uncoveredCents > 0) throw new Error('Settled payment evidence cannot cover the required refund review liability.');
  // Refunds under review are candidates, not liabilities: they never add to what's owed.
  const owedCents = review ? 0 : createdCents;
  return { created, createdCents: owedCents, reviewCents: review ? createdCents : 0, openTotalCents: openTotalCents + owedCents };
}
