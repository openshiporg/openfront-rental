import crypto from 'node:crypto';

import { assertHostOrganizationAccess } from '../utils/hostOrganizationAccess';
import { enqueueOutboxEvent } from '../utils/outbox';
import { applyPropertyTaskTransition } from '../utils/propertyTaskLifecycle';

export async function createPropertyTask(
  _root: unknown,
  args: {
    propertyId: string;
    listingId?: string | null;
    reservationId?: string | null;
    assigneeId?: string | null;
    title: string;
    taskType: string;
    priority?: string | null;
    dueAt?: string | null;
    notes?: string | null;
  },
  context: any,
) {
  const property = await context.query.Property.findOne({ where: { id: args.propertyId }, query: 'id hostOrganization { id }' });
  if (!property?.hostOrganization?.id) throw new Error('Property not found.');
  await assertHostOrganizationAccess({ context, hostOrganizationId: property.hostOrganization.id, permission: 'canManageProperties' });
  const title = args.title.trim();
  if (!title || title.length > 240) throw new Error('Task title is required and must be at most 240 characters.');
  const notes = args.notes?.trim() || '';
  if (notes.length > 4000) throw new Error('Task notes are too long.');
  const dueAt = args.dueAt ? new Date(args.dueAt) : null;
  if (dueAt && Number.isNaN(dueAt.getTime())) throw new Error('Task due date is invalid.');
  const id = crypto.randomUUID();

  return context.prisma.$transaction(async (tx: any) => {
    if (args.listingId) {
      const listing = await tx.listing.findFirst({ where: { id: args.listingId, propertyId: property.id, hostOrganizationId: property.hostOrganization.id }, select: { id: true } });
      if (!listing) throw new Error('Task listing must belong to the selected property and host organization.');
    }
    if (args.reservationId) {
      const reservation = await tx.reservation.findFirst({ where: { id: args.reservationId, hostOrganizationId: property.hostOrganization.id }, select: { id: true, listing: { select: { propertyId: true } } } });
      if (!reservation || reservation.listing?.propertyId !== property.id) throw new Error('Task reservation must belong to the selected property and host organization.');
    }
    if (args.assigneeId) {
      const membership = await tx.hostMembership.findFirst({ where: { hostOrganizationId: property.hostOrganization.id, userId: args.assigneeId, status: 'active' }, select: { id: true } });
      if (!membership) throw new Error('Task assignee must be an active member of the host organization.');
    }
    const created = await tx.propertyTask.create({
      data: {
        id,
        hostOrganizationId: property.hostOrganization.id,
        propertyId: property.id,
        listingId: args.listingId || null,
        reservationId: args.reservationId || null,
        assigneeId: args.assigneeId || null,
        idempotencyKey: `manual-property-task:${id}`,
        source: 'manual',
        title,
        taskType: args.taskType,
        status: args.assigneeId ? 'assigned' : 'queued',
        priority: args.priority || 'normal',
        dueAt,
        claimedAt: args.assigneeId ? new Date() : null,
        checklist: [],
        notes,
      },
    });
    await enqueueOutboxEvent(tx, {
      hostOrganizationId: property.hostOrganization.id,
      eventType: 'property_task.created',
      aggregateType: 'PropertyTask',
      aggregateId: id,
      operationKey: `create:${id}`,
      payload: { taskId: id, propertyId: property.id, status: created.status, taskType: created.taskType },
    });
    return created;
  }, { maxWait: 5000, timeout: 10000, isolationLevel: 'ReadCommitted' });
}

export async function transitionPropertyTask(
  _root: unknown,
  args: {
    taskId: string;
    action: string;
    assigneeId?: string | null;
    completionNotes?: string | null;
    completionEvidence?: Record<string, unknown> | null;
  },
  context: any,
) {
  const task = await context.query.PropertyTask.findOne({ where: { id: args.taskId }, query: 'id status hostOrganization { id }' });
  if (!task?.hostOrganization?.id) throw new Error('Property task not found.');
  await assertHostOrganizationAccess({ context, hostOrganizationId: task.hostOrganization.id, permission: 'canManageProperties' });

  return context.prisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `property-task:${task.id}`);
    const locked = await tx.propertyTask.findUnique({ where: { id: task.id } });
    if (!locked) throw new Error('Property task not found.');
    if (args.action === 'assign') {
      const assigneeId = args.assigneeId?.trim() || '';
      const membership = await tx.hostMembership.findFirst({ where: { hostOrganizationId: task.hostOrganization.id, userId: assigneeId, status: 'active' }, select: { id: true } });
      if (!membership) throw new Error('Task assignee must be an active member of the host organization.');
    }
    const transition = args.action === 'assign'
      ? { action: 'assign' as const, assigneeId: args.assigneeId || '' }
      : args.action === 'complete'
        ? { action: 'complete' as const, completionNotes: args.completionNotes || undefined, completionEvidence: args.completionEvidence || undefined }
        : args.action === 'block'
          ? { action: 'block' as const, completionNotes: args.completionNotes || '' }
          : args.action === 'cancel'
            ? { action: 'cancel' as const, completionNotes: args.completionNotes || undefined }
            : args.action === 'start'
              ? { action: 'start' as const }
              : args.action === 'reopen'
                ? { action: 'reopen' as const }
                : null;
    if (!transition) throw new Error('Unsupported property task transition.');
    const now = new Date();
    const data = applyPropertyTaskTransition({ status: locked.status, assigneeId: locked.assigneeId }, transition, now);
    const updated = await tx.propertyTask.update({ where: { id: locked.id }, data });
    await enqueueOutboxEvent(tx, {
      hostOrganizationId: task.hostOrganization.id,
      eventType: `property_task.${updated.status}`,
      aggregateType: 'PropertyTask',
      aggregateId: locked.id,
      operationKey: `${args.action}:${now.toISOString()}`,
      payload: { taskId: locked.id, status: updated.status, propertyId: locked.propertyId, reservationId: locked.reservationId },
    });
    return updated;
  }, { maxWait: 5000, timeout: 10000, isolationLevel: 'ReadCommitted' });
}
