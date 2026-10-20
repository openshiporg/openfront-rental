import crypto from 'node:crypto';

import { enqueueOutboxEvent } from './outbox';
import { isActiveTaskAssignee, propertyTaskRuleKey } from './propertyTaskLifecycle';
import { zonedLocalTimestamp, zonedTodayIso } from './stayBookingRules';
import { REAL_STAY } from './fixtureOrigin';

const triggersForTransition: Record<string, string[] | undefined> = {
  confirm: ['reservation_confirmed', 'before_check_in'],
  complete: ['after_check_out'],
  cancel: ['reservation_cancelled'],
};

const DAY_MS = 86_400_000;
const DEFAULT_CHECK_IN = '16:00';
const DEFAULT_CHECK_OUT = '11:00';
const STALE_DEFAULT_ASSIGNEE_NOTE = 'Queued unassigned: the rule’s default assignee isn’t an active member of this host.';
const RULE_SCAN_LIMIT = 50;
const EVALUATION_CREATE_LIMIT = 200;

const listingSelect = { id: true, title: true, propertyId: true, property: { select: { timezone: true, checkInFrom: true, checkOutBy: true } } };

function renderTitle(template: string, listingTitle: string, confirmationCode: string) {
  return template
    .replaceAll('{{listing.title}}', listingTitle)
    .replaceAll('{{reservation.confirmationCode}}', confirmationCode)
    .slice(0, 240);
}

function clockTime(value: unknown, fallback: string) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim()) ? value.trim() : fallback;
}

function dateShift(dateIso: string, days: number) {
  return new Date(Date.parse(`${dateIso}T00:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Property-local check-in moment: the stay's scheduled time, else the property's check-in time. */
function localCheckIn(reservation: any, property: any) {
  return zonedLocalTimestamp(reservation.checkInDate, clockTime(reservation.scheduledCheckInTime, clockTime(property?.checkInFrom, DEFAULT_CHECK_IN)), property?.timezone);
}

/**
 * Turnover starts from the actual local checkout: the recorded departure when it came before
 * the scheduled checkout time (or the stay was cut short), otherwise the scheduled time.
 */
async function localCheckOut(tx: any, reservation: any, property: any) {
  const scheduled = zonedLocalTimestamp(reservation.checkOutDate, clockTime(reservation.scheduledCheckOutTime, clockTime(property?.checkOutBy, DEFAULT_CHECK_OUT)), property?.timezone);
  const recorded = reservation.checkedOutAt ? new Date(reservation.checkedOutAt).getTime() : NaN;
  if (!Number.isFinite(recorded)) return scheduled;
  const stored = reservation.id ? await tx.reservation.findUnique({ where: { id: reservation.id }, select: { checkOutDate: true } }) : null;
  const shortened = Boolean(stored?.checkOutDate && reservation.checkOutDate < stored.checkOutDate);
  return shortened ? recorded : Math.min(recorded, scheduled);
}

/**
 * The listing and the property where the stay is actually served: after re-accommodation the
 * allocated unit's property (its timezone and times) governs work, not the purchased listing's.
 */
async function serviceListing(tx: any, reservation: any) {
  const listing = await tx.listing.findUnique({ where: { id: reservation.listingId }, select: listingSelect });
  if (!listing || !reservation.accommodationUnitId) return listing;
  const unit = await tx.accommodationUnit.findUnique({ where: { id: reservation.accommodationUnitId }, select: { propertyId: true, property: { select: { timezone: true, checkInFrom: true, checkOutBy: true } } } });
  if (!unit?.propertyId || unit.propertyId === listing.propertyId) return listing;
  return { ...listing, propertyId: unit.propertyId, property: unit.property };
}

async function triggerAnchor(tx: any, trigger: string, reservation: any, property: any, now: Date) {
  if (trigger === 'reservation_confirmed') return now.getTime();
  if (trigger === 'after_check_out') return localCheckOut(tx, reservation, property);
  return localCheckIn(reservation, property);
}

async function usableDefaultAssignee(tx: any, hostOrganizationId: string, userId: string | null | undefined, checked: Map<string, boolean>) {
  if (!userId) return null;
  if (!checked.has(userId)) checked.set(userId, await isActiveTaskAssignee(tx, hostOrganizationId, userId));
  return checked.get(userId) ? userId : null;
}

/** One task per rule and stay, keyed durably so retries and re-runs never duplicate it. */
async function upsertRuleTask(tx: any, input: { rule: any; reservation: any; listing: any; trigger: string; anchor: number; assignees: Map<string, boolean> }) {
  const { rule, reservation, listing, trigger, anchor, assignees } = input;
  const idempotencyKey = propertyTaskRuleKey(rule.id, reservation.id);
  const assigneeId = await usableDefaultAssignee(tx, reservation.hostOrganizationId, rule.defaultAssigneeId, assignees);
  const staleDefault = Boolean(rule.defaultAssigneeId && !assigneeId);
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
      assigneeId,
      idempotencyKey,
      source: 'task_rule',
      title: renderTitle(rule.titleTemplate, listing.title, reservation.confirmationCode),
      taskType: rule.taskType,
      status: assigneeId ? 'assigned' : 'queued',
      priority: rule.priority,
      dueAt: new Date(anchor + (rule.offsetMinutes || 0) * 60_000),
      claimedAt: assigneeId ? new Date() : null,
      checklist: rule.checklistTemplate ?? [],
      ...(staleDefault ? { notes: STALE_DEFAULT_ASSIGNEE_NOTE } : {}),
    },
  });
  await enqueueOutboxEvent(tx, {
    hostOrganizationId: reservation.hostOrganizationId,
    eventType: 'property_task.created',
    aggregateType: 'PropertyTask',
    aggregateId: task.id,
    operationKey: idempotencyKey,
    payload: { taskId: task.id, reservationId: reservation.id, propertyId: listing.propertyId, trigger, ...(staleDefault ? { defaultAssigneeUnavailable: true } : {}) },
  });
  return task;
}

export async function createReservationTasksForTransition(tx: any, reservation: any, transition: string) {
  const triggers = triggersForTransition[transition];
  // A test booking or a setup sample is not a real stay: it never creates work in the host's queues.
  if (!triggers || reservation.testMode === true || reservation.fixtureOrigin) return [];
  const listing = await serviceListing(tx, reservation);
  if (!listing?.propertyId) return [];
  const rules = await tx.taskRule.findMany({
    where: {
      hostOrganizationId: reservation.hostOrganizationId,
      isActive: true,
      trigger: { in: triggers },
      OR: [{ listingId: listing.id }, { listingId: null, propertyId: listing.propertyId }],
    },
    orderBy: [{ id: 'asc' }],
  });
  const now = new Date();
  const assignees = new Map<string, boolean>();
  const tasks = [];
  for (const rule of rules) {
    // Before-arrival work is only created while the arrival day hasn't passed at the property.
    if (rule.trigger === 'before_check_in' && reservation.checkInDate < zonedTodayIso(listing.property?.timezone, now)) continue;
    const anchor = await triggerAnchor(tx, rule.trigger, reservation, listing.property, now);
    tasks.push(await upsertRuleTask(tx, { rule, reservation, listing, trigger: rule.trigger, anchor, assignees }));
  }
  return tasks;
}

/**
 * Host-invoked catch-up for before-check-in rules: creates the missing task for each confirmed
 * stay whose arrival day hasn't passed (stays confirmed before the rule existed, or before this
 * evaluator shipped). Bounded per call; `remaining` asks the caller to run it again.
 */
export async function createMissingBeforeCheckInTasks(tx: any, hostOrganizationId: string, now = new Date(), afterRuleId: string | null = null) {
  // Rules are scanned a page at a time from the caller's cursor, so every rule is reached in
  // turn: a host with more than one page of rules never has the later ones starved.
  const rules = await tx.taskRule.findMany({
    where: { hostOrganizationId, isActive: true, trigger: 'before_check_in', OR: [{ listingId: { not: null } }, { propertyId: { not: null } }], ...(afterRuleId ? { id: { gt: afterRuleId } } : {}) },
    orderBy: [{ id: 'asc' }],
    take: RULE_SCAN_LIMIT + 1,
  });
  const page = rules.slice(0, RULE_SCAN_LIMIT);
  const utcToday = now.toISOString().slice(0, 10);
  const assignees = new Map<string, boolean>();
  let created = 0;
  // The first rule whose stays weren't all evaluated in this run; the next run resumes there.
  let resumeAt: string | null = null;
  for (const rule of page) {
    if (created >= EVALUATION_CREATE_LIMIT) { resumeAt ??= rule.id; break; }
    const scope = rule.listingId ? { listingId: rule.listingId } : { OR: [{ listing: { propertyId: rule.propertyId } }, { accommodationUnit: { propertyId: rule.propertyId } }] };
    const base = { hostOrganizationId, status: 'confirmed', ...REAL_STAY, ...scope, tasks: { none: { taskRuleId: rule.id } } };
    // Every property's local today is within a day of UTC today: dates in that band are checked per property.
    const near = await tx.reservation.findMany({
      where: { ...base, checkInDate: { gte: dateShift(utcToday, -1), lte: dateShift(utcToday, 1) } },
      orderBy: [{ checkInDate: 'asc' }, { id: 'asc' }],
      take: EVALUATION_CREATE_LIMIT,
    });
    const far = await tx.reservation.findMany({
      where: { ...base, checkInDate: { gt: dateShift(utcToday, 1) } },
      orderBy: [{ checkInDate: 'asc' }, { id: 'asc' }],
      take: EVALUATION_CREATE_LIMIT + 1,
    });
    if (near.length >= EVALUATION_CREATE_LIMIT || far.length > EVALUATION_CREATE_LIMIT) resumeAt ??= rule.id;
    for (const reservation of [...near, ...far.slice(0, EVALUATION_CREATE_LIMIT)]) {
      if (created >= EVALUATION_CREATE_LIMIT) { resumeAt ??= rule.id; break; }
      // Work follows where the stay is served now (re-accommodation included).
      const listing = await serviceListing(tx, reservation);
      if (!listing?.propertyId) continue;
      if (reservation.checkInDate < zonedTodayIso(listing.property?.timezone, now)) continue;
      await upsertRuleTask(tx, { rule, reservation, listing, trigger: 'before_check_in', anchor: localCheckIn(reservation, listing.property), assignees });
      created += 1;
    }
  }
  const nextRuleCursor = resumeAt
    ? afterRuleIdBefore(page, resumeAt, afterRuleId)
    : rules.length > RULE_SCAN_LIMIT ? page[page.length - 1].id : null;
  return { created, remaining: Boolean(resumeAt) || rules.length > RULE_SCAN_LIMIT, nextRuleCursor };
}

/** The cursor that makes the next page start at `ruleId` again. */
function afterRuleIdBefore(rules: any[], ruleId: string, afterRuleId: string | null) {
  const index = rules.findIndex((rule) => rule.id === ruleId);
  return index > 0 ? rules[index - 1].id : afterRuleId;
}
