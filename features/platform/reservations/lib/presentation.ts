export type ReservationStatus = 'inquiry' | 'quoted' | 'pending' | 'confirmed' | 'in_stay' | 'completed' | 'cancelled' | 'no_show';
export type ReservationTransition = 'confirm' | 'check_in' | 'complete' | 'cancel' | 'no_show';

const transitions: Record<ReservationStatus, ReservationTransition[]> = {
  inquiry: ['confirm', 'cancel'],
  quoted: ['confirm', 'cancel'],
  pending: ['confirm', 'cancel'],
  confirmed: ['check_in', 'no_show', 'cancel'],
  in_stay: ['complete'],
  completed: [],
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
};

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
  return availableReservationTransitions(status).find((transition) => !['cancel', 'no_show'].includes(transition)) || null;
}

export function formatStayDate(value?: string | null) {
  if (!value) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00.000Z`));
}

export function formatStayRange(checkInDate?: string | null, checkOutDate?: string | null) {
  return `${formatStayDate(checkInDate)} – ${formatStayDate(checkOutDate)}`;
}

export function formatMoney(cents?: number | null, currencyCode = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode || 'USD' }).format((cents || 0) / 100);
}

export function reservationPriority(status?: string | null, checkInDate?: string | null) {
  if (status === 'pending') return { label: 'Decision needed', tone: 'amber' as const };
  if (status === 'confirmed' && checkInDate && checkInDate <= new Date().toISOString().slice(0, 10)) return { label: 'Arrival today or overdue', tone: 'rose' as const };
  if (status === 'in_stay') return { label: 'Guest in residence', tone: 'blue' as const };
  return null;
}
