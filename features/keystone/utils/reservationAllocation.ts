const capacityReservationStatuses = ['pending', 'confirmed', 'in_stay'];

function parseCapacityDate(value: string, label: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} must use YYYY-MM-DD format.`);
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  if (year < 1 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`${label} must be a valid calendar date in YYYY-MM-DD format.`);
  }
  return date.getTime();
}

export function assertCapacityDateRange(checkInDate: string, checkOutDate: string) {
  const start = parseCapacityDate(checkInDate, 'Start date');
  const end = parseCapacityDate(checkOutDate, 'End date');
  if (end <= start) throw new Error('End date must be after start date.');
}

export async function lockListingCapacity(tx: any, listingIds: Array<string | null | undefined>) {
  const uniqueIds = [...new Set(listingIds.filter((id): id is string => Boolean(id)))].sort();
  for (const listingId of uniqueIds) {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `stay-listing:${listingId}`);
  }
}

export async function lockAccommodationUnitCapacity(tx: any, unitIds: Array<string | null | undefined>) {
  const uniqueIds = [...new Set(unitIds.filter((id): id is string => Boolean(id)))].sort();
  for (const unitId of uniqueIds) {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `stay-unit:${unitId}`);
  }
}

type CapacityCheck = {
  accommodationUnitId: string;
  hostOrganizationId: string;
  checkInDate: string;
  checkOutDate: string;
  excludeReservationId?: string;
  excludeCalendarBlockId?: string;
};

export async function findAccommodationUnitCapacityConflict(tx: any, {
  accommodationUnitId,
  hostOrganizationId,
  checkInDate,
  checkOutDate,
  excludeReservationId,
  excludeCalendarBlockId,
}: CapacityCheck) {
  assertCapacityDateRange(checkInDate, checkOutDate);
  const unit = await tx.accommodationUnit.findUnique({
    where: { id: accommodationUnitId },
    select: { id: true, hostOrganizationId: true, propertyId: true, status: true },
  });
  if (!unit || unit.hostOrganizationId !== hostOrganizationId) {
    throw new Error('The selected accommodation unit must belong to the same host organization.');
  }
  if (unit.propertyId) {
    const property = await tx.property.findUnique({ where: { id: unit.propertyId }, select: { hostOrganizationId: true } });
    if (!property || property.hostOrganizationId !== hostOrganizationId) {
      throw new Error('The selected accommodation unit must belong to the same host organization.');
    }
  }
  const reservationWhere: Record<string, any> = {
    accommodationUnitId,
    status: { in: capacityReservationStatuses },
    checkInDate: { lt: checkOutDate },
    checkOutDate: { gt: checkInDate },
  };
  if (excludeReservationId) reservationWhere.id = { not: excludeReservationId };
  const reservationConflict = await tx.reservation.findFirst({ where: reservationWhere, select: { id: true } });
  if (reservationConflict) return true;

  const listings = await tx.listing.findMany({
    where: { accommodationUnitId, hostOrganizationId },
    select: { id: true },
  });
  const listingIds = listings.map((listing: any) => listing.id);
  if (listingIds.length) {
    const blockWhere: Record<string, any> = {
      listingId: { in: listingIds },
      status: 'active',
      startDate: { lt: checkOutDate },
      endDate: { gt: checkInDate },
    };
    if (excludeCalendarBlockId) blockWhere.id = { not: excludeCalendarBlockId };
    if (excludeReservationId) {
      blockWhere.OR = [{ reservationId: null }, { reservationId: { not: excludeReservationId } }];
    }
    const blockConflict = await tx.calendarBlock.findFirst({ where: blockWhere, select: { id: true } });
    if (blockConflict) return true;
  }
  return false;
}

export async function findListingCapacityConflict(tx: any, {
  listingId,
  checkInDate,
  checkOutDate,
  excludeReservationId,
  excludeCalendarBlockId,
}: {
  listingId: string;
  checkInDate: string;
  checkOutDate: string;
  excludeReservationId?: string;
  excludeCalendarBlockId?: string;
}) {
  assertCapacityDateRange(checkInDate, checkOutDate);
  const reservationWhere: Record<string, any> = {
    listingId,
    status: { in: capacityReservationStatuses },
    checkInDate: { lt: checkOutDate },
    checkOutDate: { gt: checkInDate },
  };
  if (excludeReservationId) reservationWhere.id = { not: excludeReservationId };
  const reservationConflict = await tx.reservation.findFirst({ where: reservationWhere, select: { id: true } });
  if (reservationConflict) return true;

  const blockWhere: Record<string, any> = {
    listingId,
    status: 'active',
    startDate: { lt: checkOutDate },
    endDate: { gt: checkInDate },
  };
  if (excludeCalendarBlockId) blockWhere.id = { not: excludeCalendarBlockId };
  if (excludeReservationId) {
    blockWhere.OR = [{ reservationId: null }, { reservationId: { not: excludeReservationId } }];
  }
  return Boolean(await tx.calendarBlock.findFirst({ where: blockWhere, select: { id: true } }));
}

export async function assertAccommodationUnitAvailable(tx: any, input: CapacityCheck) {
  assertCapacityDateRange(input.checkInDate, input.checkOutDate);
  const unit = await tx.accommodationUnit.findUnique({
    where: { id: input.accommodationUnitId },
    select: { id: true, hostOrganizationId: true, propertyId: true, status: true },
  });
  if (!unit || unit.hostOrganizationId !== input.hostOrganizationId) {
    throw new Error('The selected accommodation unit must belong to the same host organization.');
  }
  if (unit.propertyId) {
    const property = await tx.property.findUnique({ where: { id: unit.propertyId }, select: { hostOrganizationId: true } });
    if (!property || property.hostOrganizationId !== input.hostOrganizationId) {
      throw new Error('The selected accommodation unit must belong to the same host organization.');
    }
  }
  if (unit.status !== 'available') throw new Error('The selected accommodation unit is not available for stays.');
  if (await findAccommodationUnitCapacityConflict(tx, input)) {
    throw new Error('The selected accommodation unit is not available for those dates.');
  }
}
