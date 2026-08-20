import crypto from 'node:crypto';

import { enqueueOutboxEvent } from './outbox';
import { propertyTaskRuleKey } from './propertyTaskLifecycle';

const triggerForTransition: Record<string, string | undefined> = {
  confirm: 'reservation_confirmed',
  complete: 'after_check_out',
  cancel: 'reservation_cancelled',
};

function renderTitle(template: string, listingTitle: string, confirmationCode: string) {
  return template
    .replaceAll('{{listing.title}}', listingTitle)
    .replaceAll('{{reservation.confirmationCode}}', confirmationCode)
    .slice(0, 240);
}

export async function createReservationTasksForTransition(tx: any, reservation: any, transition: string) {
  const trigger = triggerForTransition[transition];
  if (!trigger) return [];
  const listing = await tx.listing.findUnique({ where: { id: reservation.listingId }, select: { id: true, title: true, propertyId: true } });
  if (!listing?.propertyId) return [];
  const rules = await tx.taskRule.findMany({
    where: {
      hostOrganizationId: reservation.hostOrganizationId,
      isActive: true,
      trigger,
      OR: [{ listingId: listing.id }, { listingId: null, propertyId: listing.propertyId }],
    },
  });
  const tasks = [];
  for (const rule of rules) {
    const idempotencyKey = propertyTaskRuleKey(rule.id, reservation.id);
    const baseDate = trigger === 'reservation_confirmed'
      ? new Date()
      : new Date(`${transition === 'complete' ? reservation.checkOutDate : reservation.checkInDate}T12:00:00.000Z`);
    const dueAt = new Date(baseDate.getTime() + rule.offsetMinutes * 60_000);
    const task = await tx.propertyTask.upsert({
      where: { idempotencyKey },
      update: {},
      create: {
        id: crypto.randomUUID(),
        hostOrganizationId: reservation.hostOrganizationId,
        propertyId: listing.propertyId,
        listingId: listing.id,
        reservationId: reservation.id,
        taskRuleId: rule.id,
        assigneeId: rule.defaultAssigneeId,
        idempotencyKey,
        source: 'task_rule',
        title: renderTitle(rule.titleTemplate, listing.title, reservation.confirmationCode),
        taskType: rule.taskType,
        status: rule.defaultAssigneeId ? 'assigned' : 'queued',
        priority: rule.priority,
        dueAt,
        claimedAt: rule.defaultAssigneeId ? new Date() : null,
        checklist: rule.checklistTemplate,
      },
    });
    await enqueueOutboxEvent(tx, {
      hostOrganizationId: reservation.hostOrganizationId,
      eventType: 'property_task.created',
      aggregateType: 'PropertyTask',
      aggregateId: task.id,
      operationKey: idempotencyKey,
      payload: { taskId: task.id, reservationId: reservation.id, propertyId: listing.propertyId, trigger },
    });
    tasks.push(task);
  }
  return tasks;
}
