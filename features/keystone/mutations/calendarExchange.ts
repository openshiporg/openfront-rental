import crypto from 'node:crypto';

import { exportICalendar, iCalendarChecksum, parseICalendar, type ICalendarEvent } from '../../integrations/channels/ical';
import { calendarImportConnectionBlocker, calendarImportMappingBlocker } from '../../integrations/channels/support';
import { assertHostOrganizationAccess } from '../utils/hostOrganizationAccess';
import { enqueueOutboxEvent } from '../utils/outbox';
import { findAccommodationUnitCapacityConflict, findListingCapacityConflict, lockAccommodationUnitCapacity, lockListingCapacity } from '../utils/reservationAllocation';
import { readBoundedPages } from '../utils/readBoundedPages';
import { REAL_CAPACITY_BLOCK, REAL_STAY } from '../utils/fixtureOrigin';

function importKey(hostId: string, connectionId: string, listingId: string, checksum: string) {
  return `ical-import:${hostId}:${connectionId}:${listingId}:${checksum}`;
}

function attemptKey(baseKey: string, attempt: number) {
  return attempt === 1 ? baseKey : `${baseKey}:attempt:${attempt}`;
}

function blockId(connectionId: string, listingId: string, uid: string) {
  return `ical_${crypto.createHash('sha256').update(`${connectionId}|${listingId}|${uid}`).digest('hex')}`;
}

const CALENDAR_PAGE_SIZE = 250;
const MAX_CALENDAR_EVIDENCE = 5000;
const MAX_UNIT_LISTINGS = 200;
const MAX_MAPPINGS_PER_PAIR = 20;
// Same statuses reservationAllocation counts against capacity, so exports match bookable availability.
const CAPACITY_RESERVATION_STATUSES = ['pending', 'confirmed', 'in_stay'];
// Connection-level import health is derived from each mapping's own structured issue (by
// mapping id), never matched on a listing title, so mappings can't clear each other's issues.
const IMPORT_ERROR_PREFIXES = ['Availability import for ', 'Availability import needs review'];

function isImportHealthMessage(message: string) {
  return !message || IMPORT_ERROR_PREFIXES.some((prefix) => message.startsWith(prefix));
}

async function refreshConnectionImportHealth(tx: any, connectionId: string, currentError: string, completedAt: Date, succeeded: boolean) {
  // Only import-derived messages are replaced; any other connection error is left as it is.
  const unresolved = await tx.channelListing.count({ where: { channelConnectionId: connectionId, lastImportIssue: { path: ['open'], equals: true } } });
  const data: Record<string, unknown> = succeeded && unresolved === 0 ? { lastSyncedAt: completedAt } : {};
  if (isImportHealthMessage(currentError)) {
    data.lastError = unresolved ? `Availability import needs review for ${unresolved} mapped listing${unresolved === 1 ? '' : 's'}.` : '';
  }
  if (Object.keys(data).length) await tx.channelConnection.update({ where: { id: connectionId }, data });
}

function eligibleMapping(mappings: Array<{ id: string; status?: string | null }>) {
  const mapping = mappings.find((candidate) => !calendarImportMappingBlocker(candidate));
  if (!mapping) throw new Error(`Calendar import is unavailable: ${calendarImportMappingBlocker(mappings[0])}.`);
  return mapping;
}

function readPairMappings(db: any, where: { channelConnectionId: string; listingId: string; hostOrganizationId: string }) {
  return db.channelListing.findMany({
    where,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, status: true },
    take: MAX_MAPPINGS_PER_PAIR,
  });
}

/**
 * Re-reads connection and mapping under row locks so a concurrent pause or unmap can't slip past
 * validation. The connection lock is exclusive because the outcome is written back to it.
 */
async function lockCalendarImportTarget(tx: any, input: { hostOrganizationId: string; connectionId: string; listingId: string }) {
  await tx.$queryRawUnsafe('SELECT "id" FROM "ChannelConnection" WHERE "id" = $1 FOR UPDATE', input.connectionId);
  const connection = await tx.channelConnection.findUnique({
    where: { id: input.connectionId },
    select: { id: true, hostOrganizationId: true, provider: true, connectionType: true, status: true, syncAvailability: true, lastError: true },
  });
  if (!connection || connection.hostOrganizationId !== input.hostOrganizationId) throw new Error('Calendar connection not found.');
  const blocker = calendarImportConnectionBlocker(connection);
  if (blocker) throw new Error(`Calendar import is unavailable: ${blocker}.`);
  await tx.$queryRawUnsafe('SELECT "id" FROM "ChannelListing" WHERE "channelConnection" = $1 AND "listing" = $2 FOR SHARE', input.connectionId, input.listingId);
  const mapping = eligibleMapping(await readPairMappings(tx, { channelConnectionId: input.connectionId, listingId: input.listingId, hostOrganizationId: input.hostOrganizationId }));
  return { connection, mapping };
}

export async function importListingCalendar(
  _root: unknown,
  args: { channelConnectionId: string; listingId: string; calendarText: string; sourceLabel?: string | null },
  context: any,
) {
  const connection = await context.query.ChannelConnection.findOne({
    where: { id: args.channelConnectionId },
    query: 'id provider connectionType status syncAvailability hostOrganization { id }',
  });
  if (!connection?.hostOrganization?.id) throw new Error('Calendar connection not found.');
  const hostOrganizationId = connection.hostOrganization.id;
  await assertHostOrganizationAccess({ context, hostOrganizationId, permission: 'canManageChannels' });
  const connectionBlocker = calendarImportConnectionBlocker(connection);
  if (connectionBlocker) throw new Error(`Calendar import is unavailable: ${connectionBlocker}.`);
  const listing = await context.query.Listing.findOne({
    where: { id: args.listingId },
    query: 'id title hostOrganization { id }',
  });
  if (!listing || listing.hostOrganization?.id !== hostOrganizationId) throw new Error('Calendar listing must belong to the same host organization.');
  eligibleMapping(await readPairMappings(context.prisma, { channelConnectionId: connection.id, listingId: listing.id, hostOrganizationId }));
  const sourceLabel = args.sourceLabel?.trim() || 'Operator-provided iCalendar text';
  if (sourceLabel.length > 240) throw new Error('Calendar source label is too long.');
  // Parsed before any write: malformed or recurring calendars are rejected whole.
  const events = parseICalendar(args.calendarText);
  const checksum = iCalendarChecksum(args.calendarText);
  const baseKey = importKey(hostOrganizationId, connection.id, listing.id, checksum);

  return context.prisma.$transaction(async (tx: any) => {
    await lockListingCapacity(tx, [listing.id]);
    const inventoryListing = await tx.listing.findUnique({
      where: { id: listing.id },
      select: { hostOrganizationId: true, accommodationUnitId: true },
    });
    if (!inventoryListing || inventoryListing.hostOrganizationId !== hostOrganizationId) {
      throw new Error('Calendar listing must belong to the same host organization.');
    }
    await lockAccommodationUnitCapacity(tx, [inventoryListing.accommodationUnitId]);
    const { connection: lockedConnection, mapping } = await lockCalendarImportTarget(tx, { hostOrganizationId, connectionId: connection.id, listingId: listing.id });
    const priorWhere = { channelConnectionId: connection.id, listingId: listing.id, direction: 'import', payloadSha256: checksum, idempotencyKey: { startsWith: baseKey } };
    const latest = await tx.dataExchangeJob.findFirst({ where: priorWhere, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    // A completed import replays its recorded result; partial or conflicted input is re-evaluated as a new attributable attempt.
    if (latest?.status === 'succeeded') return latest;
    const attempt = (await tx.dataExchangeJob.count({ where: priorWhere })) + 1;
    const idempotencyKey = attemptKey(baseKey, attempt);
    const retryOf = latest?.id || null;
    const startedAt = new Date();
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let unchangedCount = 0;
    let conflictCount = 0;
    const conflicts: Array<{ uid: string; startDate: string; endDate: string }> = [];
    for (const event of events) {
      const id = blockId(connection.id, listing.id, event.uid);
      const current = await tx.calendarBlock.findUnique({ where: { id } });
      if (current && (current.reservationId || current.reason === 'reservation')) {
        conflictCount += 1;
        conflicts.push({ uid: event.uid, startDate: event.startDate, endDate: event.endDate });
        continue;
      }
      if (event.status === 'cancelled') {
        if (current?.status === 'active') {
          await tx.calendarBlock.update({ where: { id }, data: { status: 'released', notes: `${event.summary} (cancelled in source calendar)` } });
          updatedCount += 1;
        } else skippedCount += 1;
        continue;
      }
      if (current?.status === 'active' && current.reason === 'channel_import' && current.startDate === event.startDate && current.endDate === event.endDate && current.notes === event.summary) {
        unchangedCount += 1;
        continue;
      }
      const capacityConflict = inventoryListing.accommodationUnitId
        ? await findAccommodationUnitCapacityConflict(tx, {
          accommodationUnitId: inventoryListing.accommodationUnitId,
          hostOrganizationId,
          checkInDate: event.startDate,
          checkOutDate: event.endDate,
          excludeCalendarBlockId: id,
        })
        : await findListingCapacityConflict(tx, {
          listingId: listing.id,
          checkInDate: event.startDate,
          checkOutDate: event.endDate,
          excludeCalendarBlockId: id,
        });
      if (capacityConflict) {
        conflictCount += 1;
        conflicts.push({ uid: event.uid, startDate: event.startDate, endDate: event.endDate });
        continue;
      }
      const data = {
        hostOrganizationId,
        listingId: listing.id,
        startDate: event.startDate,
        endDate: event.endDate,
        reason: 'channel_import',
        status: 'active',
        source: 'ical',
        externalUid: event.uid,
        notes: event.summary,
      };
      if (current) {
        await tx.calendarBlock.update({ where: { id }, data });
        updatedCount += 1;
      } else {
        await tx.calendarBlock.create({ data: { id, ...data } });
        createdCount += 1;
      }
    }
    const applied = createdCount + updatedCount + unchangedCount;
    const status = conflictCount ? (applied ? 'partially_succeeded' : 'failed') : 'succeeded';
    const errorMessage = conflictCount ? `${conflictCount} event(s) conflicted with active local availability evidence.` : '';
    const counts = { processedCount: events.length, createdCount, updatedCount, skippedCount: skippedCount + unchangedCount, conflictCount };
    const completedAt = new Date();
    const job = await tx.dataExchangeJob.create({
      data: {
        id: crypto.randomUUID(),
        hostOrganizationId,
        channelConnectionId: connection.id,
        listingId: listing.id,
        direction: 'import',
        domain: 'availability',
        format: 'ical',
        status,
        idempotencyKey,
        payloadSha256: checksum,
        sourceLabel,
        ...counts,
        resultSummary: { availabilityOnly: true, channelListingId: mapping.id, attempt, retryOf, unchangedCount, conflicts },
        errorMessage,
        startedAt,
        completedAt,
      },
    });
    await tx.channelSyncEvent.create({
      data: {
        id: crypto.randomUUID(),
        hostOrganizationId,
        channelConnectionId: connection.id,
        channelListingId: mapping.id,
        action: 'availability_import',
        status,
        message: `iCalendar availability import ${status.replaceAll('_', ' ')}.`,
        payload: { jobId: job.id, checksum, attempt, retryOf, ...counts },
        errorMessage,
        attempts: attempt,
        occurredAt: completedAt,
      },
    });
    // Freshness only moves on a fully applied import. This mapping's own issue (by id) is set or
    // cleared; the connection's health is then derived from all of its mappings' unresolved issues.
    if (status === 'succeeded') {
      await tx.channelListing.update({ where: { id: mapping.id }, data: { lastSyncedAt: completedAt, lastImportIssue: { open: false, resolvedByJobId: job.id, at: completedAt.toISOString() } } });
    } else {
      await tx.channelListing.update({ where: { id: mapping.id }, data: { lastImportIssue: { open: true, jobId: job.id, status, conflictCount, listingId: listing.id, at: completedAt.toISOString() } } });
    }
    await refreshConnectionImportHealth(tx, connection.id, String(lockedConnection.lastError || ''), completedAt, status === 'succeeded');
    await enqueueOutboxEvent(tx, {
      hostOrganizationId,
      eventType: 'calendar.imported',
      aggregateType: 'DataExchangeJob',
      aggregateId: job.id,
      operationKey: idempotencyKey,
      payload: { jobId: job.id, listingId: listing.id, status, attempt, processedCount: events.length, createdCount, updatedCount, conflictCount },
    });
    return job;
  }, { maxWait: 5000, timeout: 20000, isolationLevel: 'Serializable' });
}

function blockSummary(reason?: string | null) {
  return reason === 'property_maintenance' ? 'Unavailable - property maintenance' : 'Unavailable';
}

export async function exportListingCalendar(
  _root: unknown,
  args: { listingId: string },
  context: any,
) {
  const listing = await context.query.Listing.findOne({ where: { id: args.listingId }, query: 'id title hostOrganization { id }' });
  if (!listing?.hostOrganization?.id) throw new Error('Listing not found.');
  const hostOrganizationId = listing.hostOrganization.id;
  await assertHostOrganizationAccess({ context, hostOrganizationId, permission: 'canReadChannels' });
  // The physical unit's whole unavailable set: every listing selling it shares the same nights.
  const { reservations, blocks } = await context.prisma.$transaction(async (tx: any) => {
    const inventory = await tx.listing.findUnique({ where: { id: listing.id }, select: { hostOrganizationId: true, accommodationUnitId: true } });
    if (!inventory || inventory.hostOrganizationId !== hostOrganizationId) throw new Error('Listing not found.');
    let listingIds = [listing.id];
    // Test bookings and onboarding samples never reach a real channel calendar.
    let reservationWhere: Record<string, any> = { listingId: listing.id, status: { in: CAPACITY_RESERVATION_STATUSES }, ...REAL_STAY };
    if (inventory.accommodationUnitId) {
      const unit = await tx.accommodationUnit.findUnique({ where: { id: inventory.accommodationUnitId }, select: { hostOrganizationId: true } });
      if (!unit || unit.hostOrganizationId !== hostOrganizationId) throw new Error('Listing inventory must belong to the same host organization.');
      const unitListings = await readBoundedPages(
        (skip, take) => tx.listing.findMany({ where: { accommodationUnitId: inventory.accommodationUnitId, hostOrganizationId }, orderBy: { id: 'asc' }, select: { id: true }, take, skip }),
        { pageSize: MAX_UNIT_LISTINGS, maxItems: MAX_UNIT_LISTINGS, label: 'Calendar export listings' },
      );
      listingIds = [...new Set([listing.id, ...unitListings.map((unitListing: any) => unitListing.id)])];
      reservationWhere = { accommodationUnitId: inventory.accommodationUnitId, status: { in: CAPACITY_RESERVATION_STATUSES }, ...REAL_STAY };
    }
    return {
      reservations: await readBoundedPages(
        (skip, take) => tx.reservation.findMany({
          where: reservationWhere,
          orderBy: [{ checkInDate: 'asc' }, { id: 'asc' }],
          select: { id: true, checkInDate: true, checkOutDate: true },
          take,
          skip,
        }),
        { pageSize: CALENDAR_PAGE_SIZE, maxItems: MAX_CALENDAR_EVIDENCE, label: 'Calendar export reservations' },
      ),
      blocks: await readBoundedPages(
        (skip, take) => tx.calendarBlock.findMany({
          where: { listingId: { in: listingIds }, status: 'active', ...REAL_CAPACITY_BLOCK },
          orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
          select: { id: true, listingId: true, reservationId: true, externalUid: true, startDate: true, endDate: true, reason: true },
          take,
          skip,
        }),
        { pageSize: CALENDAR_PAGE_SIZE, maxItems: MAX_CALENDAR_EVIDENCE, label: 'Calendar export' },
      ),
    };
  }, { maxWait: 5000, timeout: 20000, isolationLevel: 'RepeatableRead' });

  const internalUid = (id: string) => `housekind-${listing.id}-${id}`;
  const reservationsById = new Map<string, any>(reservations.map((reservation: any) => [reservation.id, reservation]));
  const reservationUids = new Map<string, string>();
  const events: ICalendarEvent[] = [];
  const uids = new Set<string>();
  const push = (preferredUid: string, fallbackUid: string, event: Omit<ICalendarEvent, 'uid' | 'status'>) => {
    const uid = uids.has(preferredUid) ? fallbackUid : preferredUid;
    uids.add(uid);
    events.push({ uid, ...event, status: 'confirmed' });
  };
  for (const block of blocks as any[]) {
    const ownListing = block.listingId === listing.id;
    const reservation = block.reservationId ? reservationsById.get(block.reservationId) : null;
    // A stay's own hold is exported once, keeping the UID earlier exports of this listing used.
    if (reservation && reservation.checkInDate === block.startDate && reservation.checkOutDate === block.endDate) {
      if (ownListing && !reservationUids.has(reservation.id)) reservationUids.set(reservation.id, block.externalUid || internalUid(block.id));
      continue;
    }
    push(ownListing ? block.externalUid || internalUid(block.id) : internalUid(block.id), internalUid(block.id), { startDate: block.startDate, endDate: block.endDate, summary: blockSummary(block.reason) });
  }
  for (const reservation of reservations as any[]) {
    const fallbackUid = internalUid(`reservation-${reservation.id}`);
    push(reservationUids.get(reservation.id) || fallbackUid, fallbackUid, { startDate: reservation.checkInDate, endDate: reservation.checkOutDate, summary: 'Unavailable' });
  }
  const calendarText = exportICalendar(events, `${listing.title} availability`);
  return { listingId: listing.id, checksum: iCalendarChecksum(calendarText), eventCount: events.length, calendarText };
}
