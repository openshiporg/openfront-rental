'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { availableReservationTransitions, type ReservationTransition } from '../lib/presentation';
import { reservationTransitionErrorPath, reservationTransitionMessages } from '../lib/transitionFeedback';

const reservationSelection = `
  id confirmationCode status paymentStatus source checkInDate checkOutDate
  scheduledCheckInTime scheduledCheckOutTime checkedInAt checkedOutAt
  currencyCode totalAmountCents amountPaidCents guestNotes internalNotes
  cancelledAt cancellationReason cancelledBy
  listing { id title slug property { id name address { publicLocationLabel } } }
  guest { id name email phone verificationStatus }
  guestParty { id adults children infants pets }
  agreement { id agreementNumber status signerEmail signedAt }
  securityDeposit { id depositNumber status amountCents capturedAmountCents currencyCode heldAt releasedAt }
  lineItems(orderBy: [{ serviceDate: asc }], take: 100) { id lineType description serviceDate quantity unitAmountCents totalAmountCents currencyCode }
  calendarBlocks(orderBy: [{ startDate: asc }], take: 20) { id startDate endDate reason status source notes }
  payments(take: 50) { id amountCents refundedAmountCents currencyCode status paymentMethod provider providerPaymentId processedAt }
  refunds(take: 50) { id amountCents currencyCode status reason processedAt }
  tasks(orderBy: [{ dueAt: asc }], take: 50) { id title taskType status priority dueAt assignee { id name } }
  damageClaims(take: 20) { id claimNumber status claimedAmountCents approvedAmountCents currencyCode }
`;

export async function getReservationWorkspace() {
  const response = await keystoneClient<any>(`
    query ReservationWorkspace {
      reservations(orderBy: [{ checkInDate: asc }, { confirmationCode: asc }], take: 250) {
        ${reservationSelection}
      }
    }
  `);
  if (!response.success) return { reservations: [], error: 'Reservation data is temporarily unavailable.' };
  return { reservations: response.data.reservations || [], error: null };
}

export async function getReservationDetail(id: string) {
  const response = await keystoneClient<any>(`
    query ReservationDetail($id: ID!) {
      reservation(where: { id: $id }) { ${reservationSelection} }
    }
  `, { id });
  if (!response.success) return { reservation: null, error: 'Reservation detail is temporarily unavailable.' };
  return { reservation: response.data.reservation || null, error: null };
}

export async function transitionReservation(formData: FormData): Promise<void> {
  const reservationId = String(formData.get('reservationId') || '');
  const transition = String(formData.get('transition') || '') as ReservationTransition;
  const note = String(formData.get('note') || '').trim();
  const status = String(formData.get('status') || '');

  if (!reservationId || !availableReservationTransitions(status).includes(transition)) {
    redirect(reservationTransitionErrorPath(reservationId, reservationTransitionMessages.invalidAction));
  }
  if (transition === 'cancel' && !note) {
    redirect(reservationTransitionErrorPath(reservationId, reservationTransitionMessages.cancellationReason));
  }
  if (note.length > 2000) {
    redirect(reservationTransitionErrorPath(reservationId, reservationTransitionMessages.noteTooLong));
  }

  const response = await keystoneClient<any>(`
    mutation TransitionReservation($reservationId: ID!, $transition: String!, $note: String) {
      transitionStayReservation(reservationId: $reservationId, transition: $transition, note: $note) {
        id confirmationCode status checkInDate checkOutDate
      }
    }
  `, { reservationId, transition, note: note || null });
  if (!response.success) {
    redirect(reservationTransitionErrorPath(reservationId, reservationTransitionMessages.staleState));
  }

  revalidatePath('/dashboard/platform/reservations');
  revalidatePath(`/dashboard/platform/reservations/${reservationId}`);
  revalidatePath('/dashboard/platform/calendar');
  revalidatePath('/dashboard/platform/tasks');
}
