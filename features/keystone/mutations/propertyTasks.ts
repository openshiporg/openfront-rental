import crypto from 'node:crypto';

import { assertHostOrganizationAccess } from '../utils/hostOrganizationAccess';
import { enqueueOutboxEvent } from '../utils/outbox';
import {
  applyPropertyTaskTransition,
  isActiveTaskAssignee,
  isPropertyTaskPriority,
  isPropertyTaskType,
  propertyTaskMessages,
  resolvePropertyTaskDueAt,
} from '../utils/propertyTaskLifecycle';
import { createMissingBeforeCheckInTasks } from '../utils/reservationTaskAutomation';

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
  const property = await context.query.Property.findOne({ where: { id: args.propertyId }, query: 'id status timezone hostOrganization { id }' });
  if (!property?.hostOrganization?.id) throw new Error(propertyTaskMessages.propertyNotFound);
  await assertHostOrganizationAccess({ context, hostOrganizationId: property.hostOrganization.id, permission: 'canManageProperties' });
  if (property.status === 'archived') throw new Error(propertyTaskMessages.archivedProperty);
  const title = args.title.trim();
  if (!title || title.length > 240) throw new Error(propertyTaskMessages.title);
  const notes = args.notes?.trim() || '';
  if (notes.length > 4000) throw new Error(propertyTaskMessages.notes);
  if (!isPropertyTaskType(args.taskType)) throw new Error(propertyTaskMessages.taskType);
  const priority = args.priority || 'normal';
  if (!isPropertyTaskPriority(priority)) throw new Error(propertyTaskMessages.priority);
  const dueAt = resolvePropertyTaskDueAt(args.dueAt, property.timezone);
  const id = crypto.randomUUID();

  return context.prisma.$transaction(async (tx: any) => {
    let listingId = args.listingId || null;
    if (listingId) {
      const listing = await tx.listing.findFirst({ where: { id: listingId, propertyId: property.id, hostOrganizationId: property.hostOrganization.id }, select: { id: true } });
      if (!listing) throw new Error(propertyTaskMessages.listing);
    }
    if (args.reservationId) {
      const reservation = await tx.reservation.findFirst({ where: { id: args.reservationId, hostOrganizationId: property.hostOrganization.id }, select: { id: true, listingId: true, listing: { select: { propertyId: true } } } });
      if (!reservation || reservation.listing?.propertyId !== property.id) throw new Error(propertyTaskMessages.reservation);
      // A stay is on exactly one listing; never attach it under another.
      if (listingId && reservation.listingId !== listingId) throw new Error(propertyTaskMessages.reservationListing);
      listingId = reservation.listingId;
    }
    if (args.assigneeId && !(await isActiveTaskAssignee(tx, property.hostOrganization.id, args.assigneeId))) {
      throw new Error(propertyTaskMessages.assignee);
    }
    const created = await tx.propertyTask.create({
      data: {
        id,
        hostOrganizationId: property.hostOrganization.id,
        propertyId: property.id,
        listingId,
        reservationId: args.reservationId || null,
        assigneeId: args.assigneeId || null,
        idempotencyKey: `manual-property-task:${id}`,
        source: 'manual',
        title,
        taskType: args.taskType,
        status: args.assigneeId ? 'assigned' : 'queued',
        priority,
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
      payload: { taskId: id, propertyId: property.id, status: created.status, taskType: created.taskType, actorId: context.session?.itemId || null },
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
    if (args.action === 'assign' && !(await isActiveTaskAssignee(tx, task.hostOrganization.id, args.assigneeId?.trim()))) {
      throw new Error(propertyTaskMessages.assignee);
    }
    // Work isn't started for, or handed back to, someone who has since lost access.
    const assigneeActive = !locked.assigneeId || await isActiveTaskAssignee(tx, task.hostOrganization.id, locked.assigneeId);
    if (args.action === 'start' && !assigneeActive) throw new Error(propertyTaskMessages.staleAssignee);
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
    const releaseStaleAssignee = args.action === 'reopen' && !assigneeActive;
    const data = applyPropertyTaskTransition({
      status: locked.status,
      assigneeId: releaseStaleAssignee ? null : locked.assigneeId,
      checklist: locked.checklist,
    }, transition, now);
    const updated = await tx.propertyTask.update({ where: { id: locked.id }, data: releaseStaleAssignee ? { ...data, assigneeId: null, claimedAt: null } : data });
    await enqueueOutboxEvent(tx, {
      hostOrganizationId: task.hostOrganization.id,
      eventType: `property_task.${updated.status}`,
      aggregateType: 'PropertyTask',
      aggregateId: locked.id,
      operationKey: `${args.action}:${now.toISOString()}`,
      payload: {
        taskId: locked.id,
        status: updated.status,
        propertyId: locked.propertyId,
        reservationId: locked.reservationId,
        actorId: context.session?.itemId || null,
        ...(releaseStaleAssignee ? { releasedAssigneeId: locked.assigneeId } : {}),
      },
    });
    return updated;
  }, { maxWait: 5000, timeout: 10000, isolationLevel: 'ReadCommitted' });
}

/** Host command: create any missing before-check-in tasks for upcoming confirmed stays. */
export async function runPropertyTaskRules(_root: unknown, args: { hostOrganizationId: string; afterRuleId?: string | null }, context: any) {
  const hostOrganizationId = String(args.hostOrganizationId || '').trim();
  if (!hostOrganizationId) throw new Error('Choose a host organization.');
  await assertHostOrganizationAccess({ context, hostOrganizationId, permission: 'canManageProperties' });
  return context.prisma.$transaction(async (tx: any) => {
    // One evaluation per host at a time; the unique task keys still guard against any overlap.
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `property-task-rules:${hostOrganizationId}`);
    const afterRuleId = typeof args.afterRuleId === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(args.afterRuleId) ? args.afterRuleId : null;
    return createMissingBeforeCheckInTasks(tx, hostOrganizationId, new Date(), afterRuleId);
  }, { maxWait: 5000, timeout: 30000, isolationLevel: 'ReadCommitted' });
}

export const propertyTaskRuleTypeDefs = String.raw`
  type Mutation {
    "Creates missing before-arrival tasks a page of rules at a time; pass the returned nextRuleCursor to continue."
    runPropertyTaskRules(hostOrganizationId: ID!, afterRuleId: String): JSON!
  }
`;

export const propertyTaskRuleResolvers = {
  Mutation: {
    runPropertyTaskRules,
  },
};
