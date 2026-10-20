import { list } from '@keystone-6/core';
import { integer, json, relationship, select, text, timestamp } from '@keystone-6/core/fields';

import { isSignedIn, rules } from '../access';
import { trackingFields } from './trackingFields';

export const OutboxEvent = list({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords('canReadReports') },
  },
  ui: {
    listView: { initialColumns: ['eventType', 'aggregateType', 'aggregateId', 'status', 'attempts', 'availableAt', 'processedAt'] },
  },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization.outboxEvents' }),
    eventType: text({ validation: { isRequired: true } }),
    aggregateType: text({ validation: { isRequired: true } }),
    aggregateId: text({ validation: { isRequired: true } }),
    idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    payload: json({
      ui: { description: 'Versioned non-secret event payload. Public credentials and provider secrets are prohibited.' },
    }),
    status: select({
      type: 'string',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Processing', value: 'processing' },
        { label: 'Delivered', value: 'delivered' },
        // The target may or may not have accepted it; reconciled from the target's receipt, never resent blindly.
        { label: 'Outcome unknown', value: 'unknown' },
        { label: 'Failed', value: 'failed' },
      ],
      defaultValue: 'pending',
    }),
    attempts: integer({ defaultValue: 0, validation: { min: 0 } }),
    availableAt: timestamp({ defaultValue: { kind: 'now' } }),
    processedAt: timestamp(),
    lastError: text({ ui: { displayMode: 'textarea' } }),
    // The current claim's lease identity and when its dispatch started (set only while processing).
    leaseToken: text({ db: { isNullable: true }, ui: { itemView: { fieldMode: 'hidden' }, listView: { fieldMode: 'hidden' } } }),
    dispatchStartedAt: timestamp({ ui: { itemView: { fieldMode: 'read' } } }),
    // Append-only per-attempt outcomes: target, attempt, lease, outcome and the target's receipt.
    deliveryEvidence: json({ ui: { itemView: { fieldMode: 'read' } } }),
    ...trackingFields,
  },
});
