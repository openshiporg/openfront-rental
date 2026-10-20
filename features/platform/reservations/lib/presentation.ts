import { PLATFORM_LOCALE } from '@/features/platform/operations/lib/operations';

export { formatMoney } from '@/features/platform/operations/lib/operations';

export type ReservationStatus = 'inquiry' | 'quoted' | 'pending' | 'confirmed' | 'in_stay' | 'completed' | 'cancelled' | 'no_show';
export type ReservationTransition = 'confirm' | 'check_in' | 'complete' | 'cancel' | 'no_show' | 'undo_check_in' | 'reopen';

const transitions: Record<ReservationStatus, ReservationTransition[]> = {
  inquiry: ['confirm', 'cancel'],
  quoted: ['confirm', 'cancel'],
  pending: ['confirm', 'cancel'],
  confirmed: ['check_in', 'no_show', 'cancel'],
  in_stay: ['complete', 'undo_check_in'],
  completed: ['reopen'],
  cancelled: [],
  no_show: [],
};

const statusLabels: Record<string, string> = {
  inquiry: 'Inquiry',
  quoted: 'Quoted',
  pending: 'Needs confirmation',
  confirmed: 'Confirmed',
  in_stay: 'In stay',
  completed: 'Checked out',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

const transitionLabels: Record<ReservationTransition, string> = {
  confirm: 'Confirm stay',
  check_in: 'Check in guest',
  complete: 'Complete checkout',
  cancel: 'Cancel reservation',
  no_show: 'Mark no-show',
  undo_check_in: 'Undo check-in',
  reopen: 'Reopen stay',
};

/** Steps that fix a transition recorded by mistake; offered apart from the next step. */
export const correctionTransitions: ReservationTransition[] = ['undo_check_in', 'reopen'];

const sourceLabels: Record<string, string> = {
  direct: 'Direct',
  operator: 'Operator',
  airbnb: 'Airbnb',
  vrbo: 'Vrbo',
  booking_com: 'Booking.com',
  pms: 'PMS',
  ical: 'iCal',
};

/** Stored source values; a stay without one counts as direct. */
export const reservationSources = Object.keys(sourceLabels);

export function reservationSourceLabel(value?: string | null) {
  return sourceLabels[value || 'direct'] || String(value).replaceAll('_', ' ');
}

export function reservationLabel(value?: string | null) {
  return statusLabels[value || ''] || (value || 'Unknown').replaceAll('_', ' ');
}

export function reservationTransitionLabel(value: ReservationTransition) {
  return transitionLabels[value];
}

export function availableReservationTransitions(status?: string | null) {
  return transitions[status as ReservationStatus] || [];
}

export function recommendedReservationTransition(status?: string | null) {
  return availableReservationTransitions(status).find((transition) => !['cancel', 'no_show', ...correctionTransitions].includes(transition)) || null;
}

export function formatStayDate(value?: string | null) {
  if (!value) return 'Date unavailable';
  return new Intl.DateTimeFormat(PLATFORM_LOCALE, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00.000Z`));
}

export function formatStayRange(checkInDate?: string | null, checkOutDate?: string | null) {
  return `${formatStayDate(checkInDate)} – ${formatStayDate(checkOutDate)}`;
}

/** Unpaid part of a stay's total, in the stay's own currency minor units. */
export function stayBalanceCents(reservation: { totalAmountCents?: number | null; amountPaidCents?: number | null }) {
  return Math.max((reservation.totalAmountCents || 0) - (reservation.amountPaidCents || 0), 0);
}

/** `today` is the stay's property-local date (YYYY-MM-DD). */
export function reservationPriority(status: string | null | undefined, checkInDate: string | null | undefined, today: string) {
  if (status === 'pending') return { label: 'Decision needed', tone: 'amber' as const };
  if (status === 'confirmed' && checkInDate && checkInDate <= today) return { label: 'Arrival today or overdue', tone: 'rose' as const };
  if (status === 'in_stay') return { label: 'Guest in residence', tone: 'blue' as const };
  return null;
}
