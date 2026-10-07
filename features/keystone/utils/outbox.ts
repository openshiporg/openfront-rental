import crypto from 'node:crypto';

const SECRET_KEY = /(password|secret|credential|token|authorization|cookie|rawpayload|webhooksignature)/i;

export function assertSafeOutboxPayload(payload: unknown, path = 'payload'): void {
  if (typeof payload === 'number' && !Number.isFinite(payload)) {
    throw new Error('Outbox payload must be JSON-compatible.');
  }
  if (payload == null || ['string', 'number', 'boolean'].includes(typeof payload)) return;
  if (Array.isArray(payload)) {
    payload.forEach((value, index) => assertSafeOutboxPayload(value, `${path}[${index}]`));
    return;
  }
  if (typeof payload !== 'object') throw new Error('Outbox payload must be JSON-compatible.');
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (SECRET_KEY.test(key)) throw new Error(`Outbox payload cannot include secret field ${path}.${key}.`);
    assertSafeOutboxPayload(value, `${path}.${key}`);
  }
}

export function outboxIdempotencyKey(eventType: string, aggregateType: string, aggregateId: string, operationKey: string) {
  const canonical = [eventType, aggregateType, aggregateId, operationKey].map((value) => value.trim()).join('|');
  return `outbox:${crypto.createHash('sha256').update(canonical).digest('hex')}`;
}

export async function enqueueOutboxEvent(tx: any, input: {
  hostOrganizationId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  operationKey: string;
  payload: Record<string, unknown>;
  availableAt?: Date;
}) {
  assertSafeOutboxPayload(input.payload);
  const idempotencyKey = outboxIdempotencyKey(input.eventType, input.aggregateType, input.aggregateId, input.operationKey);
  return tx.outboxEvent.upsert({
    where: { idempotencyKey },
    update: {},
    create: {
      hostOrganizationId: input.hostOrganizationId,
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      idempotencyKey,
      payload: { ...structuredClone(input.payload), version: 1 },
      status: 'pending',
      attempts: 0,
      availableAt: input.availableAt || new Date(),
    },
  });
}
