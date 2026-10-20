import { assertHostOrganizationAccess } from '../utils/hostOrganizationAccess';
import { enqueueOutboxEvent } from '../utils/outbox';
import { createReservationTasksForTransition } from '../utils/reservationTaskAutomation';
import { isTestTender, reconcileReservationPaymentEvidence, reservationPaymentStatus } from '../utils/paymentReconciliation';
import { createUncoveredRefundReviewLiabilities } from '../utils/refundReviewLiabilities';
import { findAccommodationUnitCapacityConflict, lockAccommodationUnitCapacity, lockListingCapacity } from '../utils/reservationAllocation';
import { closeStayObligations, propertyLocalDate } from '../utils/stayClosure';
import { reconcileClosingAttempts } from './paymentAttemptReconciliation';

export type StayTransition = 'confirm' | 'check_in' | 'complete' | 'cancel' | 'no_show' | 'undo_check_in' | 'reopen';

const transitions: Record<StayTransition, { from: string[]; to: string }> = {
  confirm: { from: ['inquiry', 'quoted', 'pending'], to: 'confirmed' },
  check_in: { from: ['confirmed'], to: 'in_stay' },
  complete: { from: ['in_stay'], to: 'completed' },
  cancel: { from: ['inquiry', 'quoted', 'pending', 'confirmed'], to: 'cancelled' },
  no_show: { from: ['confirmed'], to: 'no_show' },
  // Corrections for a transition recorded by mistake. Both require a reason.
  undo_check_in: { from: ['in_stay'], to: 'confirmed' },
  reopen: { from: ['completed'], to: 'in_stay' },
};

const corrections: StayTransition[] = ['undo_check_in', 'reopen'];

/**
 * Applies one stay lifecycle step. Arrival-day, departure-day and no-show rules are checked
 * against the property's local date; recording a step early needs `override` and a reason,
 * which are written to the reservation notes and the outbox event.
 */
export async function operateStayReservation(
  context: any,
  args: { reservationId: string; transition: StayTransition; note?: string | null; override?: boolean | null },
) {
  const transition = transitions[args.transition];
  if (!transition) throw new Error(`Unsupported stay transition: ${args.transition}`);
  const transitionNote = args.note?.trim() || '';
  if (transitionNote.length > 2000) throw new Error('Reservation note is too long.');
  if (corrections.includes(args.transition) && transitionNote.length < 3) throw new Error('Give a reason for the correction (at least 3 characters).');
  const reservation = await context.query.Reservation.findOne({
    where: { id: args.reservationId },
    query: 'id confirmationCode status hostOrganization { id }',
  });
  if (!reservation?.hostOrganization?.id) throw new Error('Reservation not found.');
  await assertHostOrganizationAccess({ context, hostOrganizationId: reservation.hostOrganization.id, permission: 'canManageReservations' });
  let closingAttempts: string[] = [];
  const operated = await context.prisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `reservation:${reservation.id}`);
    await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', reservation.id);
    const locked = await tx.reservation.findUnique({ where: { id: reservation.id } });
    if (!locked) throw new Error('Reservation not found.');
    if (!transition.from.includes(locked.status)) {
      throw new Error(`This stay is ${String(locked.status).replace('_', ' ')}, so it can’t ${args.transition.replaceAll('_', ' ')}. Refresh to see its current state.`);
    }

    // The stay's day is decided where it happens: the allocated unit's property, or the booked
    // listing's property for a stay with no allocated unit.
    const unit = locked.accommodationUnitId
      ? await tx.accommodationUnit.findUnique({ where: { id: locked.accommodationUnitId }, select: { property: { select: { timezone: true } } } })
      : null;
    const listing = !unit?.property && locked.listingId
      ? await tx.listing.findUnique({ where: { id: locked.listingId }, select: { property: { select: { timezone: true } } } })
      : null;
    const today = propertyLocalDate(unit?.property?.timezone || listing?.property?.timezone);
    const early = (args.transition === 'check_in' && today < locked.checkInDate)
      || (args.transition === 'no_show' && today < locked.checkInDate)
      || (args.transition === 'complete' && today < locked.checkOutDate);
    if (early) {
      if (!args.override || transitionNote.length < 3) {
        if (args.transition === 'complete') throw new Error(`Checkout is scheduled for ${locked.checkOutDate}. To record an early departure, confirm the override and give a reason.`);
        throw new Error(`Arrival is scheduled for ${locked.checkInDate}. To record this before the arrival date, confirm the override and give a reason.`);
      }
    }

    let paymentReconciliation: ReturnType<typeof reconcileReservationPaymentEvidence> | null = null;
    let createdLiabilityCents = 0;
    if (['cancel', 'no_show'].includes(args.transition)) {
      const paymentIds = await tx.payment.findMany({ where: { reservationId: locked.id }, orderBy: [{ id: 'asc' }], select: { id: true } });
      for (const payment of paymentIds) {
        await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `payment-refund:${payment.id}`);
      }
      const [payments, refunds] = await Promise.all([
        tx.payment.findMany({
          where: { reservationId: locked.id },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: { id: true, status: true, amountCents: true, refundedAmountCents: true, currencyCode: true, provider: true, data: true },
        }),
        tx.refund.findMany({
          where: { reservationId: locked.id },
          select: { id: true, paymentId: true, status: true, amountCents: true, currencyCode: true },
        }),
      ]);
      paymentReconciliation = reconcileReservationPaymentEvidence({ payments, refunds, currencyCode: locked.currencyCode, testMode: locked.testMode === true });
      const review = await createUncoveredRefundReviewLiabilities(tx, {
        reservation: locked,
        // Liabilities are allocated only to tender of the booking's own mode.
        payments: payments.filter((payment: any) => isTestTender(payment) === (locked.testMode === true)),
        refunds,
        netPaidCents: paymentReconciliation.netPaidCents,
        reason: args.transition === 'cancel' ? 'host_cancellation' : 'stay_issue',
        liabilityType: args.transition === 'cancel' ? 'host_cancellation_review' : 'no_show_review',
        operationPrefix: `${args.transition}-refund-review`,
        // A host cancellation owes the guest their money; a no-show depends on the policy.
        review: args.transition === 'no_show',
      });
      createdLiabilityCents = review.createdCents;
    }

    // Reopening a checked-out stay needs its full dates held again. An early departure
    // may have released nights that were since booked or blocked.
    // A test booking holds no dates, so reopening it restores none.
    if (args.transition === 'reopen' && !locked.testMode) {
      const blocks = await tx.calendarBlock.findMany({
        where: { reservationId: locked.id, reason: 'reservation' },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        select: { id: true, listingId: true, status: true, startDate: true, endDate: true },
      });
      const covered = blocks.some((block: any) => block.status === 'active' && block.startDate === locked.checkInDate && block.endDate === locked.checkOutDate);
      if (!covered) {
        const block = blocks[0];
        if (!block || !locked.accommodationUnitId) throw new Error('This stay has no reservation calendar block to restore, so it can’t be reopened.');
        await lockListingCapacity(tx, [block.listingId]);
        await lockAccommodationUnitCapacity(tx, [locked.accommodationUnitId]);
        const conflict = await findAccommodationUnitCapacityConflict(tx, {
          accommodationUnitId: locked.accommodationUnitId,
          hostOrganizationId: locked.hostOrganizationId,
          checkInDate: locked.checkInDate,
          checkOutDate: locked.checkOutDate,
          excludeReservationId: locked.id,
          excludeCalendarBlockId: block.id,
        });
        if (conflict) throw new Error('Some of this stay’s nights were booked or held after checkout, so it can’t be reopened. Free those dates first.');
        await tx.calendarBlock.update({ where: { id: block.id }, data: { status: 'active', startDate: locked.checkInDate, endDate: locked.checkOutDate } });
      }
    }

    const now = new Date();
    const label = early ? `${args.transition} (override before scheduled date)` : args.transition;
    const note = `[${now.toISOString()}] ${label}${transitionNote ? `: ${transitionNote}` : ''}`;
    const data: Record<string, any> = {
      status: transition.to,
      internalNotes: [locked.internalNotes, note].filter(Boolean).join('\n'),
    };
    if (args.transition === 'check_in') data.checkedInAt = now;
    if (args.transition === 'complete') data.checkedOutAt = now;
    if (args.transition === 'undo_check_in') data.checkedInAt = null;
    if (args.transition === 'reopen') data.checkedOutAt = null;
    if (args.transition === 'cancel') {
      data.cancelledAt = now;
      data.cancelledBy = 'host';
      data.cancellationReason = transitionNote || 'Cancelled by host or property manager.';
    }
    if (paymentReconciliation) {
      data.amountPaidCents = paymentReconciliation.netPaidCents;
      data.paymentStatus = reservationPaymentStatus({
        ...paymentReconciliation,
        totalAmountCents: locked.totalAmountCents || 0,
        openRefundCents: paymentReconciliation.openRefundCents + createdLiabilityCents,
      });
    }
    const updated = await tx.reservation.update({ where: { id: locked.id }, data });
    let releasedNights = false;
    if (['cancel', 'no_show'].includes(args.transition)) {
      await tx.calendarBlock.updateMany({ where: { reservationId: locked.id, status: 'active' }, data: { status: 'released' } });
      closingAttempts = (await closeStayObligations(tx, { reservation: locked, now, operationKey: `${args.transition}:${now.toISOString()}` })).paymentAttemptsClosing;
    }
    if (args.transition === 'complete' && early) {
      // Early departure: nights from today onward return to sale.
      const active = await tx.calendarBlock.findMany({ where: { reservationId: locked.id, status: 'active' }, select: { id: true, startDate: true, endDate: true } });
      for (const block of active) {
        if (block.endDate <= today) continue;
        if (block.startDate >= today) await tx.calendarBlock.update({ where: { id: block.id }, data: { status: 'released' } });
        else await tx.calendarBlock.update({ where: { id: block.id }, data: { endDate: today } });
        releasedNights = true;
      }
    }
    if (!corrections.includes(args.transition)) {
      await createReservationTasksForTransition(tx, args.transition === 'complete' && early ? { ...updated, checkOutDate: today } : updated, args.transition);
    }
    await enqueueOutboxEvent(tx, {
      hostOrganizationId: locked.hostOrganizationId,
      eventType: corrections.includes(args.transition) ? `reservation.corrected` : `reservation.${transition.to}`,
      aggregateType: 'Reservation',
      aggregateId: locked.id,
      operationKey: `${args.transition}:${now.toISOString()}`,
      payload: {
        reservationId: locked.id,
        confirmationCode: locked.confirmationCode,
        status: transition.to,
        transition: args.transition,
        override: Boolean(early),
        releasedNights,
        actorUserId: context.session?.itemId || null,
        balanceDueCents: Math.max((locked.totalAmountCents || 0) - (locked.amountPaidCents || 0), 0),
        testMode: locked.testMode === true,
      },
    });
    return updated;
  }, { maxWait: 5000, timeout: 10000, isolationLevel: 'ReadCommitted' });
  // Open card attempts were marked in the closing transaction; now ask Stripe to cancel them.
  if (closingAttempts.length) await reconcileClosingAttempts(context.prisma, closingAttempts);
  return operated;
}

export async function transitionStayReservation(
  _root: unknown,
  args: { reservationId: string; transition: StayTransition; note?: string | null },
  context: any,
) {
  if (corrections.includes(args.transition)) throw new Error(`Unsupported stay transition: ${args.transition}`);
  return operateStayReservation(context, { ...args, override: false });
}
