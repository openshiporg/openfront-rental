import crypto from 'node:crypto';

import { exportICalendar, iCalendarChecksum, parseICalendar } from '../../integrations/channels/ical';
import { assertHostOrganizationAccess } from '../utils/hostOrganizationAccess';
import { enqueueOutboxEvent } from '../utils/outbox';

function importKey(hostId: string, connectionId: string, listingId: string, checksum: string) {
  return `ical-import:${hostId}:${connectionId}:${listingId}:${checksum}`;
}

function blockId(connectionId: string, listingId: string, uid: string) {
  return `ical_${crypto.createHash('sha256').update(`${connectionId}|${listingId}|${uid}`).digest('hex')}`;
}

export async function importListingCalendar(
  _root: unknown,
  args: { channelConnectionId: string; listingId: string; calendarText: string; sourceLabel?: string | null },
  context: any,
) {
  const connection = await context.query.ChannelConnection.findOne({
    where: { id: args.channelConnectionId },
    query: 'id provider connectionType status hostOrganization { id }',
  });
  if (!connection?.hostOrganization?.id) throw new Error('Calendar connection not found.');
  if (connection.provider !== 'ical' || connection.connectionType !== 'ical' || connection.status !== 'active') {
    throw new Error('Only an active installed iCalendar connection can import availability.');
  }
  await assertHostOrganizationAccess({ context, hostOrganizationId: connection.hostOrganization.id, permission: 'canManageChannels' });
  const listing = await context.query.Listing.findOne({
    where: { id: args.listingId },
    query: 'id title hostOrganization { id }',
  });
  if (!listing || listing.hostOrganization?.id !== connection.hostOrganization.id) throw new Error('Calendar listing must belong to the same host organization.');
  const events = parseICalendar(args.calendarText);
  const checksum = iCalendarChecksum(args.calendarText);
  const idempotencyKey = importKey(connection.hostOrganization.id, connection.id, listing.id, checksum);
  const sourceLabel = args.sourceLabel?.trim() || 'Operator-provided iCalendar text';
  if (sourceLabel.length > 240) throw new Error('Calendar source label is too long.');

  return context.prisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `stay-listing:${listing.id}`);
    const existing = await tx.dataExchangeJob.findUnique({ where: { idempotencyKey } });
    if (existing?.status === 'succeeded' || existing?.status === 'partially_succeeded') return existing;
    const job = existing || await tx.dataExchangeJob.create({
      data: {
        id: crypto.randomUUID(),
        hostOrganizationId: connection.hostOrganization.id,
        channelConnectionId: connection.id,
        listingId: listing.id,
        direction: 'import',
        domain: 'availability',
        format: 'ical',
        status: 'processing',
        idempotencyKey,
        payloadSha256: checksum,
        sourceLabel,
        startedAt: new Date(),
      },
    });
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let conflictCount = 0;
    const conflicts: Array<{ uid: string; startDate: string; endDate: string }> = [];
    for (const event of events) {
      const id = blockId(connection.id, listing.id, event.uid);
      const current = await tx.calendarBlock.findUnique({ where: { id } });
      if (event.status === 'cancelled') {
        if (current?.status === 'active') {
          await tx.calendarBlock.update({ where: { id }, data: { status: 'released', notes: `${event.summary} (cancelled in source calendar)` } });
          updatedCount += 1;
        } else skippedCount += 1;
        continue;
      }
      const conflict = await tx.calendarBlock.findFirst({
        where: { listingId: listing.id, status: 'active', id: { not: id }, startDate: { lt: event.endDate }, endDate: { gt: event.startDate } },
        select: { id: true },
      });
      if (conflict) {
        conflictCount += 1;
        conflicts.push({ uid: event.uid, startDate: event.startDate, endDate: event.endDate });
        continue;
      }
      const data = {
        hostOrganizationId: connection.hostOrganization.id,
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
    const status = conflictCount ? (createdCount || updatedCount ? 'partially_succeeded' : 'failed') : 'succeeded';
    const completed = await tx.dataExchangeJob.update({
      where: { id: job.id },
      data: {
        status,
        processedCount: events.length,
        createdCount,
        updatedCount,
        skippedCount,
        conflictCount,
        resultSummary: { availabilityOnly: true, conflicts },
        errorMessage: conflictCount ? `${conflictCount} event(s) conflicted with active local availability evidence.` : '',
        completedAt: new Date(),
      },
    });
    await tx.channelSyncEvent.create({
      data: {
        id: crypto.randomUUID(),
        hostOrganizationId: connection.hostOrganization.id,
        channelConnectionId: connection.id,
        action: 'availability_import',
        status: status === 'failed' ? 'failed' : 'succeeded',
        message: `iCalendar availability import ${status.replaceAll('_', ' ')}.`,
        payload: { jobId: job.id, checksum, processedCount: events.length, createdCount, updatedCount, skippedCount, conflictCount },
        attempts: 1,
        occurredAt: new Date(),
      },
    });
    await enqueueOutboxEvent(tx, {
      hostOrganizationId: connection.hostOrganization.id,
      eventType: 'calendar.imported',
      aggregateType: 'DataExchangeJob',
      aggregateId: job.id,
      operationKey: idempotencyKey,
      payload: { jobId: job.id, listingId: listing.id, status, processedCount: events.length, createdCount, updatedCount, conflictCount },
    });
    return completed;
  }, { maxWait: 5000, timeout: 20000, isolationLevel: 'Serializable' });
}

export async function exportListingCalendar(
  _root: unknown,
  args: { listingId: string },
  context: any,
) {
  const listing = await context.query.Listing.findOne({ where: { id: args.listingId }, query: 'id title hostOrganization { id }' });
  if (!listing?.hostOrganization?.id) throw new Error('Listing not found.');
  await assertHostOrganizationAccess({ context, hostOrganizationId: listing.hostOrganization.id, permission: 'canReadChannels' });
  const blocks = await context.prisma.calendarBlock.findMany({
    where: { listingId: listing.id, status: 'active' },
    orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
    select: { id: true, externalUid: true, startDate: true, endDate: true, reason: true },
    take: 1000,
  });
  const calendarText = exportICalendar(blocks.map((block: any) => ({
    uid: block.externalUid || `commonstay-${listing.id}-${block.id}`,
    startDate: block.startDate,
    endDate: block.endDate,
    summary: block.reason === 'property_maintenance' ? 'Unavailable - property maintenance' : 'Unavailable',
    status: 'confirmed' as const,
  })), `${listing.title} availability`);
  return { listingId: listing.id, checksum: iCalendarChecksum(calendarText), eventCount: blocks.length, calendarText };
}
