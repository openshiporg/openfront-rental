import { assertHostOrganizationAccess } from '../utils/hostOrganizationAccess';
import { enqueueOutboxEvent } from '../utils/outbox';
import { createReservationTasksForTransition } from '../utils/reservationTaskAutomation';

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
    const locked = await tx.reservation.findUnique({ where: { id: reservation.id } });
    if (!locked) throw new Error('Reservation not found.');
    if (!transition.from.includes(locked.status)) {
      throw new Error(`Cannot ${args.transition.replace('_', ' ')} a ${locked.status} reservation.`);
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
