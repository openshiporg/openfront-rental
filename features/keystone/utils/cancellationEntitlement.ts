import crypto from 'node:crypto';

import { zonedLocalTimestamp } from './stayBookingRules';

const HOUR_MS = 60 * 60 * 1000;

export type CancellationEntitlement = {
  /** `assessed`: computed from the captured refund-window rules. `unassessed`: the host decides. */
  status: 'assessed' | 'unassessed';
  /** Refund owed under the captured rules (assessed); 0 when unassessed: nothing is owed yet. */
  refundCents: number;
  /** Unassessed only: the amount paid, which the host reviews (a candidate, not money owed). */
  reviewCents: number;
  refundBasisPoints: number | null;
  /** What the percentage applies to. Which charges are refundable is the owner's policy. */
  refundBase: 'amount_paid' | null;
  basis: string;
  policyId: string | null;
  policyVersion: string | null;
  /** The refund window applied: its hours-before-check-in threshold, `free` or none. */
  window: number | 'free' | null;
  hoursBeforeCheckIn: number;
  /**
   * Identity of this assessment: policy and version, window, rate, base and the itinerary
   * and amounts it was computed from. A guest confirms this, not just an amount.
   */
  assessmentId: string;
};

function assessmentIdentity(parts: Record<string, unknown>) {
  return crypto.createHash('sha256').update(JSON.stringify({ v: 1, ...parts })).digest('hex').slice(0, 32);
}

function validRules(rules: unknown) {
  if (!Array.isArray(rules) || !rules.length || rules.length > 20) return null;
  const parsed = rules.map((rule: any) => ({ hoursBeforeCheckIn: rule?.hoursBeforeCheckIn, refundBasisPoints: rule?.refundBasisPoints }));
  const ok = parsed.every((rule) => Number.isSafeInteger(rule.hoursBeforeCheckIn) && rule.hoursBeforeCheckIn >= 0
    && Number.isSafeInteger(rule.refundBasisPoints) && rule.refundBasisPoints >= 0 && rule.refundBasisPoints <= 10_000);
  return ok ? parsed.sort((a, b) => b.hoursBeforeCheckIn - a.hoursBeforeCheckIn) : null;
}

/**
 * What a guest cancellation refunds under the cancellation policy captured with the
 * booking. Only the policy's structured rules are applied; a policy without them is left
 * for the host to assess, and nothing here invents terms.
 */
export function cancellationEntitlement({ bookingSnapshot, checkInDate, checkOutDate = null, totalAmountCents = null, bookedAt, cancelledAt, netPaidCents }: {
  bookingSnapshot: any;
  checkInDate: string;
  checkOutDate?: string | null;
  totalAmountCents?: number | null;
  bookedAt: Date | string | null | undefined;
  cancelledAt: Date;
  netPaidCents: number;
}): CancellationEntitlement {
  if (!Number.isSafeInteger(netPaidCents) || netPaidCents < 0) throw new Error('Reservation paid amount must use non-negative integer cents.');
  const policy = bookingSnapshot?.cancellationPolicy || {};
  const property = bookingSnapshot?.listing?.property || {};
  const checkInAt = zonedLocalTimestamp(checkInDate, property.checkInFrom, property.timezone);
  const hoursBeforeCheckIn = Math.floor((checkInAt - cancelledAt.getTime()) / HOUR_MS);
  const base = { policyId: policy.id || null, policyVersion: policy.version || null, hoursBeforeCheckIn };
  const identity = (status: string, window: number | 'free' | null, refundBasisPoints: number | null, refundCents: number, reviewCents: number) => assessmentIdentity({
    status, policyId: base.policyId, policyVersion: base.policyVersion, window, refundBasisPoints, refundCents, reviewCents,
    netPaidCents, itinerary: { checkInDate, checkOutDate, totalAmountCents },
  });
  const rules = validRules(policy.rules);
  if (!rules) {
    return {
      ...base, status: 'unassessed', refundCents: 0, reviewCents: netPaidCents, refundBasisPoints: null, refundBase: null, window: null,
      basis: 'The captured cancellation policy has no refund-window rules, so your host reviews whether a refund is due.',
      assessmentId: identity('unassessed', null, null, 0, netPaidCents),
    };
  }
  const booked = bookedAt ? new Date(bookedAt).getTime() : NaN;
  const freeHours = policy.freeCancellationHours;
  if (Number.isSafeInteger(freeHours) && freeHours > 0 && Number.isFinite(booked)
    && cancelledAt.getTime() - booked <= freeHours * HOUR_MS && hoursBeforeCheckIn > 0) {
    return {
      ...base, status: 'assessed', refundCents: netPaidCents, reviewCents: 0, refundBasisPoints: 10_000, refundBase: 'amount_paid', window: 'free',
      basis: `Cancelled within ${freeHours} hours of booking: everything you’ve paid is refunded.`,
      assessmentId: identity('assessed', 'free', 10_000, netPaidCents, 0),
    };
  }
  const rule = rules.find((candidate) => hoursBeforeCheckIn >= candidate.hoursBeforeCheckIn);
  const refundBasisPoints = rule?.refundBasisPoints ?? 0;
  const refundCents = Math.floor((netPaidCents * refundBasisPoints) / 10_000);
  const window = rule ? rule.hoursBeforeCheckIn : null;
  return {
    ...base,
    status: 'assessed',
    refundCents,
    reviewCents: 0,
    refundBasisPoints,
    refundBase: 'amount_paid',
    window,
    basis: rule
      ? `Cancelled at least ${rule.hoursBeforeCheckIn} hours before check-in: ${refundBasisPoints / 100}% of what you’ve paid is refunded.`
      : 'Cancelled after the last refund window: no refund under the policy.',
    assessmentId: identity('assessed', window, refundBasisPoints, refundCents, 0),
  };
}
