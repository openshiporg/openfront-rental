import { list } from '@keystone-6/core';
import { json, relationship, select, text, timestamp } from '@keystone-6/core/fields';

import { isSignedIn, rules } from '../access';
import { trackingFields } from './trackingFields';

export const PaymentWebhookEvent = list({
  access: {
    operation: {
      query: isSignedIn,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: { query: rules.canReadHostScopedRecords('canReadPayments') },
  },
  ui: {
    listView: { initialColumns: ['providerCode', 'providerEventId', 'eventType', 'status', 'processedAt'] },
  },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization.paymentWebhookEvents' }),
    paymentProvider: relationship({ ref: 'PaymentProvider.webhookEvents' }),
    payment: relationship({ ref: 'Payment.webhookEvents' }),
    replayKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    providerCode: text({ validation: { isRequired: true } }),
    providerEventId: text({ validation: { isRequired: true } }),
    eventType: text({ validation: { isRequired: true } }),
    payloadSha256: text({ validation: { isRequired: true } }),
    status: select({
      type: 'string',
      options: [
        { label: 'Processed', value: 'processed' },
        { label: 'Ignored', value: 'ignored' },
        { label: 'Failed', value: 'failed' },
      ],
      defaultValue: 'processed',
    }),
    processedAt: timestamp({ validation: { isRequired: true } }),
    errorMessage: text(),
    evidence: json({ defaultValue: {} }),
    ...trackingFields,
  },
});
