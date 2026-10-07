import { assertHostOrganizationAccess } from '../utils/hostOrganizationAccess';
import { enqueueOutboxEvent } from '../utils/outbox';
import { createReservationTasksForTransition } from '../utils/reservationTaskAutomation';
import { reconcileReservationPaymentEvidence, reservationPaymentStatus } from '../utils/paymentReconciliation';
import { createUncoveredRefundReviewLiabilities } from '../utils/refundReviewLiabilities';

type Transition = 'confirm' | 'check_in' | 'complete' | 'cancel' | 'no_show';

const transitions: Record<Transition, { from: string[]; to: string }> = {
  confirm: { from: ['inquiry', 'quoted', 'pending'], to: 'confirmed' },
  check_in: { from: ['confirmed'], to: 'in_stay' },
  complete: { from: ['in_stay'], to: 'completed' },
  cancel: { from: ['inquiry', 'quoted', 'pending', 'confirmed'], to: 'cancelled' },
  no_show: { from: ['confirmed'], to: 'no_show' },
};

export async function transitionStayReservation(
  _root: unknown,
  args: { reservationId: string; transition: Transition; note?: string | null },
  context: any,
) {
  const transition = transitions[args.transition];
  if (!transition) throw new Error(`Unsupported stay transition: ${args.transition}`);
  const transitionNote = args.note?.trim() || '';
  if (transitionNote.length > 2000) throw new Error('Reservation note is too long.');
  const reservation = await context.query.Reservation.findOne({
    where: { id: args.reservationId },
    query: 'id confirmationCode status internalNotes hostOrganization { id } calendarBlocks { id status }',
  });
  if (!reservation?.hostOrganization?.id) throw new Error('Reservation not found.');
  await assertHostOrganizationAccess({ context, hostOrganizationId: reservation.hostOrganization.id, permission: 'canManageReservations' });
  return context.prisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `reservation:${reservation.id}`);
    await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', reservation.id);
    const locked = await tx.reservation.findUnique({ where: { id: reservation.id } });
    if (!locked) throw new Error('Reservation not found.');
    if (!transition.from.includes(locked.status)) {
      throw new Error(`Cannot ${args.transition.replace('_', ' ')} a ${locked.status} reservation.`);
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
          select: { id: true, status: true, amountCents: true, refundedAmountCents: true, currencyCode: true },
        }),
        tx.refund.findMany({
          where: { reservationId: locked.id },
          select: { id: true, paymentId: true, status: true, amountCents: true, currencyCode: true },
        }),
      ]);
      paymentReconciliation = reconcileReservationPaymentEvidence({ payments, refunds, currencyCode: locked.currencyCode });
      const review = await createUncoveredRefundReviewLiabilities(tx, {
        reservation: locked,
        payments,
        refunds,
        netPaidCents: paymentReconciliation.netPaidCents,
        reason: args.transition === 'cancel' ? 'host_cancellation' : 'stay_issue',
        liabilityType: args.transition === 'cancel' ? 'host_cancellation_review' : 'no_show_review',
        operationPrefix: `${args.transition}-refund-review`,
      });
      createdLiabilityCents = review.createdCents;
    }

    const now = new Date();
    const note = `[${now.toISOString()}] ${args.transition}${transitionNote ? `: ${transitionNote}` : ''}`;
    const data: Record<string, any> = {
      status: transition.to,
      internalNotes: [locked.internalNotes, note].filter(Boolean).join('\n'),
    };
    if (args.transition === 'check_in') data.checkedInAt = now;
    if (args.transition === 'complete') data.checkedOutAt = now;
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
    if (['cancel', 'no_show'].includes(args.transition)) {
      await tx.calendarBlock.updateMany({ where: { reservationId: locked.id, status: 'active' }, data: { status: 'released' } });
    }
    await createReservationTasksForTransition(tx, updated, args.transition);
    await enqueueOutboxEvent(tx, {
      hostOrganizationId: locked.hostOrganizationId,
      eventType: `reservation.${transition.to}`,
      aggregateType: 'Reservation',
      aggregateId: locked.id,
      operationKey: `${args.transition}:${now.toISOString()}`,
      payload: { reservationId: locked.id, confirmationCode: locked.confirmationCode, status: transition.to },
    });
    return updated;
  }, { maxWait: 5000, timeout: 10000, isolationLevel: 'ReadCommitted' });
}
