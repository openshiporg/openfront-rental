/** One leased outbox event handed to a dispatcher. `idempotencyKey` is the event's stable identity across attempts. */
export type ClaimedOutboxEvent = {
  id: string;
  hostOrganizationId: string | null;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  idempotencyKey: string;
  payload: unknown;
  attempts: number;
  /** This claim's lease identity; a reclaimed event gets a new one. */
  leaseToken: string;
};

/**
 * `delivered`: the target durably accepted the event (with its receipt, when it gives one).
 * `retry`: the target definitely did NOT accept it and asks for a later attempt.
 * `rejected`: the target definitely refused it for good.
 * `unknown`: it may or may not have been accepted (timeout, crash, abort, lost response). It is
 * never treated as failed or resent automatically; it waits for `reconcile` or an operator.
 * Errors are stored on the event, so they must be safe operator text without secrets or bodies.
 */
export type OutboxDispatchResult =
  | { outcome: 'delivered'; receipt?: string }
  | { outcome: 'retry'; error: string }
  | { outcome: 'rejected'; error: string }
  | { outcome: 'unknown'; error: string };

/**
 * A delivery target. It must route by `hostOrganizationId` and deduplicate on `idempotencyKey`
 * in the same transaction as its effect (an inbox keyed by it, returning the original receipt for
 * a repeat). An event may be offered again after a lost lease.
 */
export interface OutboxDispatcher {
  name: string;
  /** Event types this target delivers; others stay pending for another dispatcher. Omit for all. */
  eventTypes?: readonly string[];
  dispatch(event: ClaimedOutboxEvent, options: { signal: AbortSignal }): Promise<OutboxDispatchResult>;
  /** Looks up the target's own receipt for an event whose outcome is unknown. Without it, unknown events wait for an operator. */
  reconcile?(event: Omit<ClaimedOutboxEvent, 'leaseToken'>, options: { signal: AbortSignal }): Promise<{ outcome: 'delivered'; receipt?: string } | { outcome: 'not_delivered' } | { outcome: 'unknown' }>;
}

// No delivery target ships installed: choosing one is an owner decision. Until one is added here,
// runs report `no_dispatcher`, claim nothing, recover nothing, and events stay as they are.
const installedOutboxDispatchers: OutboxDispatcher[] = [];

export function configuredOutboxDispatcher(): OutboxDispatcher | null {
  return installedOutboxDispatchers[0] || null;
}
