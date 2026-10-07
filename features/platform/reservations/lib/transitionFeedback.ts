export const reservationTransitionMessages = {
  invalidAction: 'This reservation can no longer take that action. Refresh the workspace and try again.',
  cancellationReason: 'A cancellation reason is required for the reservation record.',
  noteTooLong: 'Operational note is too long.',
  staleState: 'The reservation changed before the action was applied. Refresh the workspace and try again.',
} as const;

export function reservationTransitionErrorPath(reservationId: string, message: string) {
  if (!reservationId || reservationId.includes('/') || reservationId.includes('..')) {
    return `/dashboard/platform/reservations?error=${encodeURIComponent(message)}`;
  }
  return `/dashboard/platform/reservations/${encodeURIComponent(reservationId)}?error=${encodeURIComponent(message)}`;
}
