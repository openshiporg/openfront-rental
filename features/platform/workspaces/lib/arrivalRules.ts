import { stayArrivalRules } from '@/features/keystone/utils/stayBookingRules';
import { plural } from '@/features/platform/operations/lib/operations';

/** The notice and booking window quotes enforce: a plan's own value, else its listing's; no window means no limit. */
export function effectiveArrivalRules(plan: { advanceNoticeHours?: number | null; bookingWindowDays?: number | null } | null | undefined, listing: { advanceNoticeHours?: number | null; bookingWindowDays?: number | null } | null | undefined) {
  const rules = stayArrivalRules(plan, listing);
  return {
    ...rules,
    notice: rules.advanceNoticeHours ? plural(rules.advanceNoticeHours, 'hour') : 'No advance notice',
    window: rules.bookingWindowDays ? `Up to ${plural(rules.bookingWindowDays, 'day')} ahead` : 'No limit',
    noticeFromListing: plan?.advanceNoticeHours == null,
    windowFromListing: plan?.bookingWindowDays == null,
  };
}
