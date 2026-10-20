import crypto from 'node:crypto';

import { configuredOutboxDispatcher, type ClaimedOutboxEvent, type OutboxDispatcher, type OutboxDispatchResult } from './outboxDispatchers';

export const OUTBOX_MAX_ATTEMPTS = 12;
export const OUTBOX_LEASE_MS = 2 * 60_000;
export const OUTBOX_DISPATCH_TIMEOUT_MS = 15_000;
export const OUTBOX_DEFAULT_BATCH = 25;
export const OUTBOX_MAX_BATCH = 100;
const MAX_BACKOFF_MS = 24 * 60 * 60_000;

// While an event is `processing`, availableAt holds its lease expiry and leaseToken identifies the
// claim (attempts counts claims). Hosts already served in this run are skipped while other hosts
// have due events, so one host's backlog can't hold back the rest.
const CLAIM_SQL = `
  WITH due AS (
    SELECT "id" FROM "OutboxEvent"
    WHERE "status" = 'pending'
      AND ("availableAt" IS NULL OR "availableAt" <= ($1::timestamptz AT TIME ZONE 'UTC'))
      AND COALESCE("attempts", 0) < $2::int
      AND ($4::text IS NULL OR "hostOrganization" = $4::text)
      AND ($5::text[] IS NULL OR "eventType" = ANY($5::text[]))
      AND ($7::text[] IS NULL OR "hostOrganization" IS NULL OR NOT ("hostOrganization" = ANY($7::text[])))
    ORDER BY "availableAt" ASC NULLS FIRST, "createdAt" ASC, "id" ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  UPDATE "OutboxEvent" AS event
  SET "status" = 'processing',
      "attempts" = COALESCE(event."attempts", 0) + 1,
      "availableAt" = ($3::timestamptz AT TIME ZONE 'UTC'),
      "leaseToken" = $6::text,
      "dispatchStartedAt" = NULL,
      "updatedAt" = ($1::timestamptz AT TIME ZONE 'UTC')
  FROM due
  WHERE event."id" = due."id"
  RETURNING event."id", event."hostOrganization" AS "hostOrganizationId", event."eventType", event."aggregateType",
    event."aggregateId", event."idempotencyKey", event."payload", event."attempts", event."leaseToken"`;

// An expired lease whose attempt never reached the target goes back to pending. One whose
// dispatch had started may have been accepted: it becomes unknown, never failed or resent.
// Bounded per run and scoped to this dispatcher's host and event types.
const RECOVER_SQL = `
  WITH expired AS (
    SELECT "id" FROM "OutboxEvent"
    WHERE "status" = 'processing'
      AND "availableAt" <= ($1::timestamptz AT TIME ZONE 'UTC')
      AND ($4::text IS NULL OR "hostOrganization" = $4::text)
      AND ($5::text[] IS NULL OR "eventType" = ANY($5::text[]))
    ORDER BY "availableAt" ASC, "id" ASC
    LIMIT $6::int
    FOR UPDATE SKIP LOCKED
  )
  UPDATE "OutboxEvent" AS event
  SET "status" = CASE WHEN event."dispatchStartedAt" IS NULL THEN 'pending' ELSE 'unknown' END,
      "lastError" = CASE WHEN event."dispatchStartedAt" IS NULL THEN $2::text ELSE $3::text END,
      "leaseToken" = NULL,
      "updatedAt" = ($1::timestamptz AT TIME ZONE 'UTC')
  FROM expired
  WHERE event."id" = expired."id"`;

const RECOVERY_BATCH = 100;

export type OutboxBacklog = { due: number; scheduled: number; processing: number; unknown: number; failed: number; delivered: number };

export type OutboxDeliveryRun = {
  status: 'no_dispatcher' | 'completed' | 'stopped';
  dispatcher: string | null;
  claimed: number;
  delivered: number;
  retried: number;
  failed: number;
  unknown: number;
  leaseLost: number;
  notDispatched: number;
  recoveredLeases: number;
  reconciled: number;
  backlog: OutboxBacklog;
};

export function nextOutboxAttemptAt(attempts: number, now: Date): Date | null {
  if (attempts >= OUTBOX_MAX_ATTEMPTS) return null;
  return new Date(now.getTime() + Math.min(2 ** Math.max(0, attempts - 1) * 60_000, MAX_BACKOFF_MS));
}

/** Stored errors are single-line operator text: no URLs, credentials or response bodies. */
export function safeOutboxError(value: unknown) {
  const text = Array.from(typeof value === 'string' ? value : '', (character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127 ? ' ' : character;
  }).join('');
  const cleaned = text
    .replace(/https?:\/\/\S+/gi, '[url]')
    .replace(/\b(bearer|token|secret|password|api[_-]?key|authorization)\b\s*[:=]?\s*\S+/gi, '$1 [redacted]')
    .replace(/\s+/g, ' ')
    .trim();
  return (cleaned || 'Delivery failed without a reason.').slice(0, 300);
}

function isDispatchResult(value: unknown): value is OutboxDispatchResult {
  const outcome = (value as { outcome?: unknown } | null)?.outcome;
  return outcome === 'delivered' || outcome === 'retry' || outcome === 'rejected' || outcome === 'unknown';
}

async function dispatchWithTimeout(dispatcher: OutboxDispatcher, event: ClaimedOutboxEvent, timeoutMs: number): Promise<OutboxDispatchResult> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<OutboxDispatchResult>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      // Aborting asks the target to stop; it doesn't prove the target did nothing.
      resolve({ outcome: 'unknown', error: 'Delivery timed out; the target may have accepted it.' });
    }, timeoutMs);
  });
  try {
    const result = await Promise.race([dispatcher.dispatch(event, { signal: controller.signal }), timeout]);
    return isDispatchResult(result) ? result : { outcome: 'unknown', error: 'Dispatcher returned no outcome.' };
  } catch (error) {
    console.error(`Outbox dispatcher ${dispatcher.name} failed for event ${event.id} (${error instanceof Error ? error.name : 'Error'}).`);
    return { outcome: 'unknown', error: 'Dispatcher failed after the attempt started; the target may have accepted it.' };
  } finally {
    clearTimeout(timer);
  }
}

function evidenceEntry(dispatcher: OutboxDispatcher, event: ClaimedOutboxEvent, result: OutboxDispatchResult, now: Date) {
  return { attempt: event.attempts, leaseToken: event.leaseToken, target: dispatcher.name, outcome: result.outcome, ...(result.outcome === 'delivered' && result.receipt ? { receipt: String(result.receipt).slice(0, 200) } : {}), at: now.toISOString() };
}

/**
 * Records the outcome only while this claim still holds an unexpired lease (same attempt and
 * token, lease not past). A stale worker can't overwrite a newer attempt or finalize late; its
 * event is recovered as unknown because its dispatch had started.
 */
async function settleOutboxEvent(prisma: any, dispatcher: OutboxDispatcher, event: ClaimedOutboxEvent, result: OutboxDispatchResult, now: Date) {
  let outcome: 'delivered' | 'retried' | 'failed' | 'unknown';
  let data: Record<string, unknown>;
  if (result.outcome === 'delivered') {
    outcome = 'delivered';
    data = { status: 'delivered', processedAt: now, lastError: '', leaseToken: null };
  } else if (result.outcome === 'unknown') {
    outcome = 'unknown';
    data = { status: 'unknown', lastError: safeOutboxError(result.error), leaseToken: null };
  } else {
    const error = safeOutboxError(result.error);
    // `retry` means the target definitely didn't accept it; only then is it scheduled again.
    const next = result.outcome === 'retry' ? nextOutboxAttemptAt(event.attempts, now) : null;
    outcome = next ? 'retried' : 'failed';
    data = next
      ? { status: 'pending', availableAt: next, lastError: error, leaseToken: null, dispatchStartedAt: null }
      : { status: 'failed', processedAt: now, lastError: result.outcome === 'retry' ? safeOutboxError(`Not accepted after ${event.attempts} attempts: ${error}`) : error, leaseToken: null };
  }
  const current = await prisma.outboxEvent.findUnique({ where: { id: event.id }, select: { deliveryEvidence: true } });
  const history = Array.isArray(current?.deliveryEvidence) ? current.deliveryEvidence.slice(-49) : [];
  const { count } = await prisma.outboxEvent.updateMany({
    where: { id: event.id, status: 'processing', attempts: event.attempts, leaseToken: event.leaseToken, availableAt: { gt: now } },
    data: { ...data, deliveryEvidence: [...history, evidenceEntry(dispatcher, event, result, now)] },
  });
  return count === 1 ? outcome : 'leaseLost';
}

export async function outboxBacklog(prisma: any, now: Date, hostOrganizationId: string | null = null): Promise<OutboxBacklog> {
  const host = hostOrganizationId ? { hostOrganizationId } : {};
  const [due, scheduled, processing, unknown, failed, delivered] = await Promise.all([
    prisma.outboxEvent.count({ where: { ...host, status: 'pending', OR: [{ availableAt: null }, { availableAt: { lte: now } }] } }),
    prisma.outboxEvent.count({ where: { ...host, status: 'pending', availableAt: { gt: now } } }),
    prisma.outboxEvent.count({ where: { ...host, status: 'processing' } }),
    prisma.outboxEvent.count({ where: { ...host, status: 'unknown' } }),
    prisma.outboxEvent.count({ where: { ...host, status: 'failed' } }),
    prisma.outboxEvent.count({ where: { ...host, status: 'delivered' } }),
  ]);
  return { due, scheduled, processing, unknown, failed, delivered };
}

/**
 * Leases and dispatches up to `limit` due events one at a time. Without a dispatcher nothing is
 * claimed or recovered: events stay exactly as they are and the run reports `no_dispatcher`.
 */
export async function runOutboxDelivery(prisma: any, options: {
  dispatcher: OutboxDispatcher | null;
  limit?: number;
  hostOrganizationId?: string | null;
  now?: () => Date;
  signal?: AbortSignal;
  leaseMs?: number;
  timeoutMs?: number;
}): Promise<OutboxDeliveryRun> {
  const clock = options.now || (() => new Date());
  const limit = Math.min(Math.max(Math.trunc(Number(options.limit ?? OUTBOX_DEFAULT_BATCH)) || OUTBOX_DEFAULT_BATCH, 1), OUTBOX_MAX_BATCH);
  const leaseMs = options.leaseMs ?? OUTBOX_LEASE_MS;
  const timeoutMs = options.timeoutMs ?? OUTBOX_DISPATCH_TIMEOUT_MS;
  if (!(timeoutMs > 0 && leaseMs > timeoutMs)) throw new RangeError('The outbox lease must outlast the dispatch timeout.');
  const hostOrganizationId = options.hostOrganizationId || null;
  const counts = { claimed: 0, delivered: 0, retried: 0, failed: 0, unknown: 0, leaseLost: 0, notDispatched: 0, reconciled: 0 };
  const dispatcher = options.dispatcher;
  if (!dispatcher) {
    return { status: 'no_dispatcher', dispatcher: null, ...counts, recoveredLeases: 0, backlog: await outboxBacklog(prisma, clock(), hostOrganizationId) };
  }
  const eventTypes = dispatcher.eventTypes ? [...dispatcher.eventTypes] : null;
  const recoveredLeases = Number(await prisma.$executeRawUnsafe(
    RECOVER_SQL,
    clock().toISOString(),
    'Delivery lease expired before the attempt reached the target.',
    'Delivery lease expired after the attempt started; the target may have accepted it.',
    hostOrganizationId,
    eventTypes,
    RECOVERY_BATCH,
  ));
  counts.reconciled = await reconcileUnknownOutboxEvents(prisma, dispatcher, { hostOrganizationId, eventTypes, signal: options.signal, now: clock });
  const servedHosts: string[] = [];
  while (counts.claimed < limit && !options.signal?.aborted) {
    const now = clock();
    const claim = (exclude: string[] | null) => prisma.$queryRawUnsafe(
      CLAIM_SQL,
      now.toISOString(),
      OUTBOX_MAX_ATTEMPTS,
      new Date(now.getTime() + leaseMs).toISOString(),
      hostOrganizationId,
      eventTypes,
      crypto.randomUUID(),
      exclude,
    );
    let [row] = await claim(servedHosts.length ? servedHosts : null);
    if (!row && servedHosts.length) { servedHosts.length = 0; [row] = await claim(null); }
    if (!row) break;
    const event: ClaimedOutboxEvent = { ...row, attempts: Number(row.attempts) };
    if (event.hostOrganizationId) servedHosts.push(event.hostOrganizationId);
    counts.claimed += 1;
    // Dispatch only while this claim holds a lease long enough to finish; mark that it started.
    const started = clock();
    const { count } = await prisma.outboxEvent.updateMany({
      where: { id: event.id, status: 'processing', attempts: event.attempts, leaseToken: event.leaseToken, availableAt: { gt: new Date(started.getTime() + timeoutMs) } },
      data: { dispatchStartedAt: started },
    });
    if (count !== 1) {
      counts.notDispatched += 1;
      await prisma.outboxEvent.updateMany({ where: { id: event.id, status: 'processing', leaseToken: event.leaseToken, dispatchStartedAt: null }, data: { status: 'pending', leaseToken: null } });
      continue;
    }
    const result = await dispatchWithTimeout(dispatcher, event, timeoutMs);
    counts[await settleOutboxEvent(prisma, dispatcher, event, result, clock())] += 1;
  }
  return {
    status: options.signal?.aborted ? 'stopped' : 'completed',
    dispatcher: dispatcher.name,
    ...counts,
    recoveredLeases,
    backlog: await outboxBacklog(prisma, clock(), hostOrganizationId),
  };
}

/**
 * Asks the target for its own receipt for events whose outcome is unknown. Only the target's
 * answer moves them: delivered with its receipt, or back to pending when it confirms it never
 * accepted them. Without a reconcile contract they stay unknown for an operator.
 */
async function reconcileUnknownOutboxEvents(prisma: any, dispatcher: OutboxDispatcher, scope: { hostOrganizationId: string | null; eventTypes: string[] | null; signal?: AbortSignal; now: () => Date }) {
  if (!dispatcher.reconcile) return 0;
  const events = await prisma.outboxEvent.findMany({
    where: { status: 'unknown', ...(scope.hostOrganizationId ? { hostOrganizationId: scope.hostOrganizationId } : {}), ...(scope.eventTypes ? { eventType: { in: scope.eventTypes } } : {}) },
    orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
    take: RECOVERY_BATCH,
  });
  let reconciled = 0;
  for (const event of events) {
    if (scope.signal?.aborted) break;
    const controller = new AbortController();
    const answer = await dispatcher.reconcile({ id: event.id, hostOrganizationId: event.hostOrganizationId, eventType: event.eventType, aggregateType: event.aggregateType, aggregateId: event.aggregateId, idempotencyKey: event.idempotencyKey, payload: event.payload, attempts: event.attempts }, { signal: controller.signal }).catch(() => ({ outcome: 'unknown' as const }));
    if (answer.outcome === 'unknown') continue;
    const now = scope.now();
    const history = Array.isArray(event.deliveryEvidence) ? event.deliveryEvidence.slice(-49) : [];
    const entry = { attempt: event.attempts, target: dispatcher.name, outcome: answer.outcome === 'delivered' ? 'reconciled_delivered' : 'reconciled_not_delivered', ...(answer.outcome === 'delivered' && answer.receipt ? { receipt: String(answer.receipt).slice(0, 200) } : {}), at: now.toISOString() };
    const { count } = await prisma.outboxEvent.updateMany({
      where: { id: event.id, status: 'unknown', attempts: event.attempts },
      data: answer.outcome === 'delivered'
        ? { status: 'delivered', processedAt: now, lastError: '', deliveryEvidence: [...history, entry] }
        : { status: 'pending', availableAt: now, dispatchStartedAt: null, lastError: 'The target confirmed it never received this event.', deliveryEvidence: [...history, entry] },
    });
    reconciled += count;
  }
  return reconciled;
}

function canRunOutboxDelivery(session: any) {
  const role = session?.data?.role;
  return Boolean(session?.itemId && session.data?.isActive === true && role?.canManageSettings && (role.canManageRoles || role.canManagePeople));
}

export async function deliverOutboxEvents(_root: unknown, args: { limit?: number | null; hostOrganizationId?: string | null }, context: any) {
  // A run can lease any host's events, so it stays with platform administrators.
  if (!canRunOutboxDelivery(context.session)) throw new Error('Only platform administrators can run outbox delivery.');
  return runOutboxDelivery(context.prisma, {
    dispatcher: configuredOutboxDispatcher(),
    limit: args.limit ?? undefined,
    hostOrganizationId: args.hostOrganizationId || null,
  });
}

export const outboxDeliveryTypeDefs = String.raw`
  type Mutation {
    deliverOutboxEvents(limit: Int, hostOrganizationId: ID): JSON!
  }
`;

export const outboxDeliveryResolvers = {
  Mutation: {
    deliverOutboxEvents,
  },
};
