import { assertHostOrganizationAccess, extractRelationshipId } from './hostOrganizationAccess';
import {
  assertCapacityDateRange,
  findAccommodationUnitCapacityConflict,
  findListingCapacityConflict,
  lockAccommodationUnitCapacity,
  lockListingCapacity,
} from './reservationAllocation';

const reservationBlockMutationError = 'Reservation-backed capacity blocks can only be changed by reservation lifecycle operations.';
const capacityConflictError = 'The calendar block overlaps an active reservation or calendar block.';

type CalendarBlockOperation = 'create' | 'update';
type CalendarBlockWriteArgs = {
  data: Record<string, any>;
  where?: Record<string, any>;
};
type ListingCapacityRow = {
  id: string;
  hostOrganizationId: string | null;
  accommodationUnitId: string | null;
};

type CurrentCalendarBlock = {
  id: string;
  hostOrganizationId: string | null;
  listingId: string | null;
  reservationId: string | null;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: string | null;
};

function hasOwn(value: Record<string, any>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function listingSelector(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  const relation = value as { connect?: Record<string, unknown> | null; create?: unknown; disconnect?: boolean };
  if (relation.create) {
    throw new Error('Calendar blocks must connect to an existing listing. Create the listing before its availability block.');
  }
  if (relation.disconnect === true) return null;
  if (relation.connect && typeof relation.connect === 'object') return relation.connect;
  throw new Error('A calendar block listing must connect to an existing listing.');
}

function snapshotChanged(before: CurrentCalendarBlock, after: CurrentCalendarBlock) {
  return before.hostOrganizationId !== after.hostOrganizationId
    || before.listingId !== after.listingId
    || before.reservationId !== after.reservationId
    || before.startDate !== after.startDate
    || before.endDate !== after.endDate
    || before.status !== after.status
    || before.reason !== after.reason;
}

async function readListing(tx: any, where: Record<string, unknown>): Promise<ListingCapacityRow | null> {
  return tx.listing.findUnique({
    where,
    select: { id: true, hostOrganizationId: true, accommodationUnitId: true },
  });
}

async function lockListingRows(tx: any, listingIds: string[]) {
  for (const listingId of [...new Set(listingIds)].sort()) {
    await tx.$queryRawUnsafe('SELECT "id" FROM "Listing" WHERE "id" = $1 FOR UPDATE', listingId);
  }
}

async function lockUnitRows(tx: any, unitIds: string[]) {
  for (const unitId of [...new Set(unitIds)].sort()) {
    await tx.$queryRawUnsafe('SELECT "id" FROM "AccommodationUnit" WHERE "id" = $1 FOR UPDATE', unitId);
  }
}

export async function assertCalendarBlockWriteWithinCapacity(
  operation: CalendarBlockOperation,
  args: CalendarBlockWriteArgs,
  context: any,
) {
  const tx = context.prisma;
  const data = args.data || {};
  let current: CurrentCalendarBlock | null = null;

  if (operation === 'update') {
    current = await tx.calendarBlock.findUnique({
      where: args.where,
      select: {
        id: true,
        hostOrganizationId: true,
        listingId: true,
        reservationId: true,
        startDate: true,
        endDate: true,
        reason: true,
        status: true,
      },
    });
    if (!current) throw new Error('Calendar block not found.');
  }

  const currentHostId = current?.hostOrganizationId || null;
  if (hasOwn(data, 'hostOrganization') && data.hostOrganization == null) {
    throw new Error('A calendar block must remain assigned to a host organization.');
  }
  const submittedHostId = hasOwn(data, 'hostOrganization') ? extractRelationshipId(data.hostOrganization) : null;
  const hostOrganizationId = currentHostId || submittedHostId;
  if (!hostOrganizationId) throw new Error('A host organization relationship is required.');

  // Recheck the same current membership/permission boundary before doing any
  // unfiltered inventory reads. Keystone's generated operation and hooks still
  // run afterward inside this same transaction Context.
  try {
    await assertHostOrganizationAccess({ context, hostOrganizationId, permission: 'canManageCalendar' });
  } catch (error) {
    if (operation === 'update') throw new Error('Calendar block not found.');
    throw error;
  }
  if (currentHostId && submittedHostId && currentHostId !== submittedHostId) {
    throw new Error('Records cannot be moved between host organizations.');
  }

  if (current?.reservationId || hasOwn(data, 'reservation')) throw new Error(reservationBlockMutationError);

  const selector = hasOwn(data, 'listing')
    ? listingSelector(data.listing)
    : current?.listingId ? { id: current.listingId } : null;
  let oldListing: ListingCapacityRow | null = null;
  if (current?.listingId) {
    oldListing = await readListing(tx, { id: current.listingId });
    if (!oldListing) throw new Error('The calendar block listing changed; reload and retry.');
    if (oldListing.hostOrganizationId !== hostOrganizationId) {
      throw new Error('The calendar block listing must belong to the same host organization.');
    }
  }
  let targetListing: ListingCapacityRow | null = null;
  if (selector) {
    targetListing = await readListing(tx, selector);
    if (!targetListing) throw new Error('Calendar listing not found.');
    if (targetListing.hostOrganizationId !== hostOrganizationId) {
      throw new Error('The calendar block listing must belong to the same host organization.');
    }
  }

  const startDate = hasOwn(data, 'startDate') ? data.startDate : current?.startDate;
  const endDate = hasOwn(data, 'endDate') ? data.endDate : current?.endDate;
  if (typeof startDate !== 'string' || typeof endDate !== 'string') {
    throw new Error('Calendar block start and end dates are required.');
  }
  assertCapacityDateRange(startDate, endDate);

  const reason = hasOwn(data, 'reason') ? data.reason : current ? current.reason : 'owner_block';
  if (reason === 'reservation') throw new Error(reservationBlockMutationError);
  const status = hasOwn(data, 'status') ? data.status : current ? current.status : 'active';
  const capacityFields = ['listing', 'startDate', 'endDate', 'status'];
  const capacityInputChanged = operation === 'create' || capacityFields.some((field) => hasOwn(data, field));
  const needsCapacityLock = Boolean(
    (operation === 'create' ? status === 'active' : capacityInputChanged && (current?.status === 'active' || status === 'active'))
    && (oldListing || targetListing),
  );
  if (!needsCapacityLock) return;

  const listingIds = [oldListing?.id, targetListing?.id].filter((id): id is string => Boolean(id));
  await lockListingCapacity(tx, listingIds);

  const listingRowsBeforeUnitLocks = await Promise.all(listingIds.map((id) => readListing(tx, { id })));
  if (listingRowsBeforeUnitLocks.some((listing) => !listing || listing.hostOrganizationId !== hostOrganizationId)) {
    throw new Error('Calendar listing allocation changed; reload and retry.');
  }
  const unitsByListing = new Map(listingRowsBeforeUnitLocks.map((listing) => [listing!.id, listing!.accommodationUnitId]));
  const unitIds = [...new Set([...unitsByListing.values()].filter((id): id is string => Boolean(id)))].sort();
  await lockAccommodationUnitCapacity(tx, unitIds);
  await lockListingRows(tx, listingIds);

  const lockedListings = await Promise.all(listingIds.map((id) => readListing(tx, { id })));
  if (lockedListings.some((listing) => !listing || listing.hostOrganizationId !== hostOrganizationId
    || listing.accommodationUnitId !== unitsByListing.get(listing.id))) {
    throw new Error('Calendar listing allocation changed; reload and retry.');
  }
  await lockUnitRows(tx, unitIds);

  if (current) {
    const latest = await tx.calendarBlock.findUnique({
      where: { id: current.id },
      select: {
        id: true,
        hostOrganizationId: true,
        listingId: true,
        reservationId: true,
        startDate: true,
        endDate: true,
        reason: true,
        status: true,
      },
    });
    if (!latest || snapshotChanged(current, latest)) {
      throw new Error('Calendar block changed; reload and retry.');
    }
  }

  if (status !== 'active' || !targetListing) return;
  const targetUnitId = unitsByListing.get(targetListing.id);
  const conflict = targetUnitId
    ? await findAccommodationUnitCapacityConflict(tx, {
      accommodationUnitId: targetUnitId,
      hostOrganizationId,
      checkInDate: startDate,
      checkOutDate: endDate,
      excludeCalendarBlockId: current?.id,
    })
    : await findListingCapacityConflict(tx, {
      listingId: targetListing.id,
      checkInDate: startDate,
      checkOutDate: endDate,
      excludeCalendarBlockId: current?.id,
    });
  if (conflict) throw new Error(capacityConflictError);
}
