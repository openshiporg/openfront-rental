import { list } from '@keystone-6/core';
import { integer, json, relationship, select, text, timestamp } from '@keystone-6/core/fields';

import { isSignedIn, rules } from '../access';
import { trackingFields } from './trackingFields';

export const SecurityDeposit = list({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords('canReadReservations') },
  },
  ui: { listView: { initialColumns: ['depositNumber', 'reservation', 'status', 'amountCents', 'heldAt', 'releasedAt'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization' }),
    reservation: relationship({ ref: 'Reservation.securityDeposit' }),
    payment: relationship({ ref: 'Payment.securityDeposits' }),
    depositNumber: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    status: select({
      type: 'string',
      options: [
        { label: 'Required', value: 'required' },
        { label: 'Authorized', value: 'authorized' },
        { label: 'Held', value: 'held' },
        { label: 'Partially Captured', value: 'partially_captured' },
        { label: 'Captured', value: 'captured' },
        { label: 'Released', value: 'released' },
        { label: 'Failed', value: 'failed' },
      ],
      defaultValue: 'required',
    }),
    amountCents: integer({ defaultValue: 0, validation: { min: 0 } }),
    capturedAmountCents: integer({ defaultValue: 0, validation: { min: 0 } }),
    currencyCode: text({ defaultValue: 'USD', validation: { isRequired: true } }),
    heldAt: timestamp(),
    releasedAt: timestamp(),
    providerReference: text(),
    metadata: json(),
    ...trackingFields,
  },
});
