/** Page sizes for a stay's histories; every record stays reachable through paging. */
export const stayHistoryPages = { lines: 100, payments: 20, refunds: 20, claims: 20, changes: 10 } as const;
export type StayHistory = keyof typeof stayHistoryPages;
export const stayHistories = Object.keys(stayHistoryPages) as StayHistory[];

/** The count each history pages against (refund history excludes refunds still open). */
export const stayHistoryCountField: Record<StayHistory, string> = {
  lines: 'lineItemsCount',
  payments: 'paymentsCount',
  refunds: 'refundHistoryCount',
  claims: 'damageClaimsCount',
  changes: 'amendmentsCount',
};

/** Open work on a stay (open refunds, payment attempts) is loaded whole up to this bound, never paged. */
export const STAY_OPEN_ITEM_LIMIT = 50;

/** Refund liabilities: money owed to the guest. */
export const OPEN_REFUND_STATUSES = ['pending', 'processing', 'failed'];
/** Open refund work: liabilities plus refunds under review (candidates, not owed until assessed). */
export const OPEN_REFUND_WORK_STATUSES = ['review', ...OPEN_REFUND_STATUSES];
export const PENDING_PAYMENT_STATUSES = ['pending', 'processing'];
export const REFUNDABLE_PAYMENT_STATUSES = ['succeeded', 'partially_refunded'];
