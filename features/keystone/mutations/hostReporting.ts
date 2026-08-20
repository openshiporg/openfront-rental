import crypto from 'node:crypto';

import { assertHostOrganizationAccess } from '../utils/hostOrganizationAccess';
import { enqueueOutboxEvent } from '../utils/outbox';
import { enumerateStayNights } from '../utils/stayPricing';

function validateRange(start: string, end: string) {
  const nights = enumerateStayNights(start, end);
  if (nights.length > 366) throw new Error('Report ranges are limited to 366 nights.');
  return nights;
}

function clippedNights(start: string, end: string, rangeStart: string, rangeEnd: string) {
  const clippedStart = start > rangeStart ? start : rangeStart;
  const clippedEnd = end < rangeEnd ? end : rangeEnd;
  return clippedStart < clippedEnd ? enumerateStayNights(clippedStart, clippedEnd).length : 0;
}

export async function hostOperationsReport(
  _root: unknown,
  args: { hostOrganizationId: string; startDate: string; endDate: string },
  context: any,
) {
  const nights = validateRange(args.startDate, args.endDate);
  await assertHostOrganizationAccess({ context, hostOrganizationId: args.hostOrganizationId, permission: 'canReadReports' });
  const prisma = context.prisma;
  const [listings, reservations, blocks, payments, refunds, payouts, statements, tasks, syncEvents] = await Promise.all([
    prisma.listing.findMany({ where: { hostOrganizationId: args.hostOrganizationId, status: 'published' }, select: { id: true } }),
    prisma.reservation.findMany({
      where: { hostOrganizationId: args.hostOrganizationId, checkInDate: { lt: args.endDate }, checkOutDate: { gt: args.startDate } },
      select: { id: true, status: true, source: true, checkInDate: true, checkOutDate: true, lodgingSubtotalCents: true, feeTotalCents: true, taxTotalCents: true, totalAmountCents: true, amountPaidCents: true },
      take: 5000,
    }),
    prisma.calendarBlock.findMany({ where: { hostOrganizationId: args.hostOrganizationId, status: 'active', startDate: { lt: args.endDate }, endDate: { gt: args.startDate } }, select: { listingId: true, startDate: true, endDate: true }, take: 10000 }),
    prisma.payment.findMany({ where: { hostOrganizationId: args.hostOrganizationId, reservation: { checkInDate: { lt: args.endDate }, checkOutDate: { gt: args.startDate } }, status: 'succeeded' }, select: { amountCents: true, refundedAmountCents: true }, take: 10000 }),
    prisma.refund.findMany({ where: { hostOrganizationId: args.hostOrganizationId, reservation: { checkInDate: { lt: args.endDate }, checkOutDate: { gt: args.startDate } }, status: 'succeeded' }, select: { amountCents: true }, take: 10000 }),
    prisma.payout.findMany({ where: { hostOrganizationId: args.hostOrganizationId, status: 'paid', paidAt: { gte: new Date(`${args.startDate}T00:00:00.000Z`), lt: new Date(`${args.endDate}T00:00:00.000Z`) } }, select: { netAmountCents: true }, take: 10000 }),
    prisma.ownerStatement.findMany({ where: { hostOrganizationId: args.hostOrganizationId, status: { in: ['approved', 'sent', 'paid'] }, periodStart: { lt: args.endDate }, periodEnd: { gt: args.startDate } }, select: { ownerEarningsCents: true }, take: 10000 }),
    prisma.propertyTask.findMany({ where: { hostOrganizationId: args.hostOrganizationId, dueAt: { lt: new Date(`${args.endDate}T00:00:00.000Z`) } }, select: { status: true, dueAt: true }, take: 10000 }),
    prisma.channelSyncEvent.findMany({ where: { hostOrganizationId: args.hostOrganizationId, occurredAt: { gte: new Date(`${args.startDate}T00:00:00.000Z`), lt: new Date(`${args.endDate}T00:00:00.000Z`) } }, select: { status: true, occurredAt: true }, orderBy: { occurredAt: 'desc' }, take: 1000 }),
  ]);
  const activeReservations = reservations.filter((reservation: any) => !['cancelled', 'no_show', 'inquiry', 'quoted'].includes(reservation.status));
  const bookedNights = activeReservations.reduce((sum: number, reservation: any) => sum + clippedNights(reservation.checkInDate, reservation.checkOutDate, args.startDate, args.endDate), 0);
  const blockedNights = blocks.reduce((sum: number, block: any) => sum + clippedNights(block.startDate, block.endDate, args.startDate, args.endDate), 0);
  const capacityNights = listings.length * nights.length;
  const availableNights = Math.max(capacityNights - blockedNights, 0);
  const lodgingRevenueCents = activeReservations.reduce((sum: number, item: any) => sum + item.lodgingSubtotalCents, 0);
  const collectedCents = payments.reduce((sum: number, item: any) => sum + item.amountCents - item.refundedAmountCents, 0);
  const refundCents = refunds.reduce((sum: number, item: any) => sum + item.amountCents, 0);
  const now = new Date();
  const countsBy = (field: 'status' | 'source') => Object.fromEntries([...new Set(reservations.map((item: any) => item[field]))].sort().map((value) => [value, reservations.filter((item: any) => item[field] === value).length]));
  return {
    hostOrganizationId: args.hostOrganizationId,
    startDate: args.startDate,
    endDate: args.endDate,
    publishedListingCount: listings.length,
    capacityNights,
    bookedNights,
    availableNights,
    occupancyBasisPoints: capacityNights ? Math.round((bookedNights * 10_000) / capacityNights) : 0,
    adrCents: bookedNights ? Math.round(lodgingRevenueCents / bookedNights) : 0,
    lodgingRevenueCents,
    feeRevenueCents: activeReservations.reduce((sum: number, item: any) => sum + item.feeTotalCents, 0),
    taxCents: activeReservations.reduce((sum: number, item: any) => sum + item.taxTotalCents, 0),
    refundCents,
    collectedCents,
    outstandingCents: activeReservations.reduce((sum: number, item: any) => sum + Math.max(item.totalAmountCents - item.amountPaidCents, 0), 0),
    payoutCents: payouts.reduce((sum: number, item: any) => sum + item.netAmountCents, 0),
    ownerNetCents: statements.reduce((sum: number, item: any) => sum + item.ownerEarningsCents, 0),
    reservationsByStatus: countsBy('status'),
    reservationsBySource: countsBy('source'),
    openTaskCount: tasks.filter((task: any) => !['completed', 'cancelled'].includes(task.status)).length,
    overdueTaskCount: tasks.filter((task: any) => !['completed', 'cancelled'].includes(task.status) && task.dueAt && task.dueAt < now).length,
    channelSyncFailureCount: syncEvents.filter((event: any) => event.status === 'failed').length,
    lastSuccessfulSyncAt: syncEvents.find((event: any) => event.status === 'succeeded')?.occurredAt?.toISOString() || null,
  };
}

export async function exportHostArchive(
  _root: unknown,
  args: { hostOrganizationId: string },
  context: any,
) {
  await assertHostOrganizationAccess({ context, hostOrganizationId: args.hostOrganizationId, permission: 'canManageReports' });
  const prisma = context.prisma;
  const [host, properties, listings, guests, reservations, owners, statements, tasks] = await Promise.all([
    prisma.hostOrganization.findUnique({ where: { id: args.hostOrganizationId }, select: { id: true, name: true, slug: true, organizationType: true, canonicalUrl: true, federationId: true, dataCustody: true } }),
    prisma.property.findMany({ where: { hostOrganizationId: args.hostOrganizationId }, select: { id: true, name: true, propertyType: true, status: true, timezone: true, checkInFrom: true, checkOutBy: true }, orderBy: { id: 'asc' }, take: 5000 }),
    prisma.listing.findMany({ where: { hostOrganizationId: args.hostOrganizationId }, select: { id: true, propertyId: true, title: true, slug: true, status: true, currencyCode: true, baseNightlyRateCents: true, minimumStay: true, maximumStay: true }, orderBy: { id: 'asc' }, take: 5000 }),
    prisma.guestProfile.findMany({ where: { hostOrganizationId: args.hostOrganizationId }, select: { id: true, name: true, email: true, phone: true, verificationStatus: true }, orderBy: { id: 'asc' }, take: 10000 }),
    prisma.reservation.findMany({ where: { hostOrganizationId: args.hostOrganizationId }, select: { id: true, listingId: true, guestId: true, confirmationCode: true, status: true, paymentStatus: true, source: true, checkInDate: true, checkOutDate: true, currencyCode: true, totalAmountCents: true, amountPaidCents: true, bookingSnapshot: true }, orderBy: { id: 'asc' }, take: 10000 }),
    prisma.propertyOwner.findMany({ where: { hostOrganizationId: args.hostOrganizationId }, select: { id: true, ownerNumber: true, displayName: true, companyName: true, email: true, status: true, payoutSchedule: true }, orderBy: { id: 'asc' }, take: 5000 }),
    prisma.ownerStatement.findMany({ where: { hostOrganizationId: args.hostOrganizationId }, select: { id: true, ownerId: true, statementNumber: true, status: true, periodStart: true, periodEnd: true, currencyCode: true, ownerEarningsCents: true, paidOutCents: true, balanceDueCents: true, statementSnapshot: true }, orderBy: { id: 'asc' }, take: 10000 }),
    prisma.propertyTask.findMany({ where: { hostOrganizationId: args.hostOrganizationId }, select: { id: true, propertyId: true, listingId: true, reservationId: true, title: true, taskType: true, status: true, priority: true, dueAt: true, completionEvidence: true }, orderBy: { id: 'asc' }, take: 10000 }),
  ]);
  if (!host) throw new Error('Host organization not found.');
  const archive = { version: 1, exportedAt: new Date().toISOString(), host, properties, listings, guests, reservations, owners, statements, tasks };
  const serialized = JSON.stringify(archive);
  const checksum = crypto.createHash('sha256').update(serialized).digest('hex');
  const idempotencyKey = `host-archive:${args.hostOrganizationId}:${checksum}`;
  const job = await context.prisma.$transaction(async (tx: any) => {
    const record = await tx.dataExchangeJob.upsert({
      where: { idempotencyKey },
      update: {},
      create: { id: crypto.randomUUID(), hostOrganizationId: args.hostOrganizationId, direction: 'export', domain: 'host_archive', format: 'json', status: 'succeeded', idempotencyKey, payloadSha256: checksum, sourceLabel: 'Versioned host-owned JSON archive', processedCount: properties.length + listings.length + guests.length + reservations.length + owners.length + statements.length + tasks.length, resultSummary: { version: 1, includesExactPrivateAddresses: false, includesCredentials: false }, startedAt: new Date(), completedAt: new Date() },
    });
    await enqueueOutboxEvent(tx, { hostOrganizationId: args.hostOrganizationId, eventType: 'host_archive.exported', aggregateType: 'DataExchangeJob', aggregateId: record.id, operationKey: idempotencyKey, payload: { jobId: record.id, checksum, version: 1 } });
    return record;
  });
  return { jobId: job.id, checksum, archive };
}
