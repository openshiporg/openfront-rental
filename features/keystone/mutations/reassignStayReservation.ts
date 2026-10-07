import { assertHostOrganizationAccess } from '../utils/hostOrganizationAccess';
import { enqueueOutboxEvent } from '../utils/outbox';
import { assertAccommodationUnitAvailable, lockAccommodationUnitCapacity, lockListingCapacity } from '../utils/reservationAllocation';

type ReassignStayReservationArgs = {
  reservationId: string;
  targetAccommodationUnitId: string;
  reason: string;
};

function sameAllocation(left: any, right: any) {
  return left.listingId === right.listingId
    && left.accommodationUnitId === right.accommodationUnitId
    && left.checkInDate === right.checkInDate
    && left.checkOutDate === right.checkOutDate;
}

export async function reassignStayReservation(_root: unknown, args: ReassignStayReservationArgs, context: any) {
  const reservationId = args.reservationId?.trim();
  const targetAccommodationUnitId = args.targetAccommodationUnitId?.trim();
  const reason = args.reason?.trim() || '';
  if (!reservationId || !targetAccommodationUnitId) throw new Error('A reservation and target accommodation unit are required.');
  if (reason.length < 3 || reason.length > 1000) throw new Error('Provide a reassignment reason of 3 to 1000 characters.');

  const current = await context.prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      hostOrganizationId: true,
      listingId: true,
      accommodationUnitId: true,
      checkInDate: true,
      checkOutDate: true,
    },
  });
  if (!current?.hostOrganizationId) throw new Error('Reservation not found.');
  await assertHostOrganizationAccess({
    context,
    hostOrganizationId: current.hostOrganizationId,
    permission: 'canManageReservations',
  });

  return context.prisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `reservation:${reservationId}`);
    const beforeLock = await tx.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        hostOrganizationId: true,
        listingId: true,
        accommodationUnitId: true,
        confirmationCode: true,
        status: true,
        checkInDate: true,
        checkOutDate: true,
        internalNotes: true,
      },
    });
    if (!beforeLock?.hostOrganizationId || beforeLock.hostOrganizationId !== current.hostOrganizationId) {
      throw new Error('Reservation not found.');
    }
    if (!sameAllocation(current, beforeLock)) throw new Error('Reservation allocation changed; reload and retry.');
    if (!['pending', 'confirmed', 'in_stay'].includes(beforeLock.status || '')) {
      throw new Error('Only pending, confirmed, or in-stay reservations can be re-accommodated.');
    }
    if (beforeLock.accommodationUnitId === targetAccommodationUnitId) {
      throw new Error('The reservation is already assigned to that accommodation unit.');
    }

    const targetUnit = await tx.accommodationUnit.findUnique({
      where: { id: targetAccommodationUnitId },
      select: { id: true, hostOrganizationId: true, status: true },
    });
    if (!targetUnit || targetUnit.hostOrganizationId !== beforeLock.hostOrganizationId) {
      throw new Error('The target accommodation unit must belong to the same host organization.');
    }
    if (targetUnit.status !== 'available') throw new Error('The target accommodation unit is not available for stays.');

    const targetListing = await tx.listing.findFirst({
      where: {
        hostOrganizationId: beforeLock.hostOrganizationId,
        accommodationUnitId: targetAccommodationUnitId,
        status: 'published',
      },
      orderBy: [{ id: 'asc' }],
      select: { id: true },
    });
    if (!targetListing) throw new Error('The target accommodation unit needs a published listing before reassignment.');

    await lockListingCapacity(tx, [beforeLock.listingId, targetListing.id]);
    await lockAccommodationUnitCapacity(tx, [beforeLock.accommodationUnitId, targetAccommodationUnitId]);

    const locked = await tx.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        hostOrganizationId: true,
        listingId: true,
        accommodationUnitId: true,
        confirmationCode: true,
        status: true,
        checkInDate: true,
        checkOutDate: true,
        internalNotes: true,
      },
    });
    if (!locked?.hostOrganizationId || locked.hostOrganizationId !== current.hostOrganizationId) {
      throw new Error('Reservation not found.');
    }
    if (!sameAllocation(current, locked)) throw new Error('Reservation allocation changed; reload and retry.');
    if (!['pending', 'confirmed', 'in_stay'].includes(locked.status || '')) {
      throw new Error('Only pending, confirmed, or in-stay reservations can be re-accommodated.');
    }
    if (locked.accommodationUnitId === targetAccommodationUnitId) {
      throw new Error('The reservation is already assigned to that accommodation unit.');
    }

    const confirmedTargetListing = await tx.listing.findFirst({
      where: {
        id: targetListing.id,
        hostOrganizationId: locked.hostOrganizationId,
        accommodationUnitId: targetAccommodationUnitId,
        status: 'published',
      },
      select: { id: true },
    });
    if (!confirmedTargetListing) throw new Error('The target accommodation unit needs a published listing before reassignment.');

    await assertAccommodationUnitAvailable(tx, {
      accommodationUnitId: targetAccommodationUnitId,
      hostOrganizationId: locked.hostOrganizationId,
      checkInDate: locked.checkInDate,
      checkOutDate: locked.checkOutDate,
      excludeReservationId: locked.id,
    });

    const capacityBlocks = await tx.calendarBlock.findMany({
      where: { reservationId: locked.id, status: 'active', reason: 'reservation' },
      orderBy: [{ id: 'asc' }],
      select: { id: true },
    });
    if (!capacityBlocks.length) throw new Error('The reservation has no active capacity block and cannot be reassigned safely.');

    const now = new Date();
    const auditNote = `[${now.toISOString()}] Re-accommodated by ${context.session.itemId}: ${reason}`;
    const updated = await tx.reservation.update({
      where: { id: locked.id },
      data: {
        accommodationUnitId: targetAccommodationUnitId,
        internalNotes: [locked.internalNotes, auditNote].filter(Boolean).join('\n'),
      },
      select: { id: true, confirmationCode: true, status: true, accommodationUnitId: true },
    });
    await tx.calendarBlock.updateMany({
      where: { id: { in: capacityBlocks.map((block: any) => block.id) } },
      data: {
        listingId: confirmedTargetListing.id,
        notes: `Re-accommodated reservation ${locked.confirmationCode}: ${reason}`,
      },
    });
    await enqueueOutboxEvent(tx, {
      hostOrganizationId: locked.hostOrganizationId,
      eventType: 'reservation.reaccommodated',
      aggregateType: 'Reservation',
      aggregateId: locked.id,
      operationKey: `${locked.accommodationUnitId || 'unassigned'}:${targetAccommodationUnitId}:${now.toISOString()}`,
      payload: {
        reservationId: locked.id,
        confirmationCode: locked.confirmationCode,
        previousAccommodationUnitId: locked.accommodationUnitId,
        accommodationUnitId: targetAccommodationUnitId,
        previousListingId: locked.listingId,
        capacityListingId: confirmedTargetListing.id,
        reason,
        actorUserId: context.session.itemId,
        changedAt: now.toISOString(),
      },
    });

    return {
      id: updated.id,
      confirmationCode: updated.confirmationCode,
      status: updated.status,
      previousAccommodationUnitId: locked.accommodationUnitId,
      accommodationUnitId: updated.accommodationUnitId,
    };
  }, { maxWait: 5000, timeout: 15000, isolationLevel: 'Serializable' });
}
