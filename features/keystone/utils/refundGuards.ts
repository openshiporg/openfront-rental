/**
 * Money held above a live stay's total must stay covered by open refunds. Checked on the
 * PROPOSED final state of one refund change: its new amount, the other open refunds, and the
 * stay total after any concession credit the change reverses (a declined or reduced goodwill
 * refund adds its credit back to the total). Returns the uncovered excess (0 when covered).
 *
 * Paid 10000 with an open 2000 goodwill refund that lowered the total to 8000:
 * - decline (new 0): total back to 10000, excess 0 → allowed;
 * - reduce to 1000: total 9000, excess 1000, open 1000 → allowed;
 * - an overpayment liability can't be reduced while the money is still held above the total.
 */
export function uncoveredExcessCents({ netPaidCents, totalAmountCents, openRefundCents, currentOpenCents, newAmountCents, restoredCreditCents }: {
  netPaidCents: number;
  /** The stay total now (before this change). */
  totalAmountCents: number;
  /** All open refunds on the stay now, including this one if it is open. */
  openRefundCents: number;
  /** This refund's amount if it is currently open, else 0. */
  currentOpenCents: number;
  /** This refund's amount after the change (0 when declined). */
  newAmountCents: number;
  /** Concession credit this change reverses onto the total. */
  restoredCreditCents: number;
}) {
  const openAfter = openRefundCents - currentOpenCents + newAmountCents;
  const excess = netPaidCents - (totalAmountCents + restoredCreditCents);
  return excess > 0 && openAfter < excess ? excess - openAfter : 0;
}
