import { list } from '@keystone-6/core';
import { integer, json, relationship, select, text, timestamp } from '@keystone-6/core/fields';

import { isSignedIn, rules } from '../access';
import { trackingFields } from './trackingFields';

export const Refund = list({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords('canReadPayments') },
  },
  ui: { listView: { initialColumns: ['refundNumber', 'reservation', 'payment', 'status', 'amountCents', 'processedAt'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization' }),
    reservation: relationship({ ref: 'Reservation.refunds' }),
    payment: relationship({ ref: 'Payment.refunds' }),
    reservationAmendment: relationship({ ref: 'ReservationAmendment.refunds', access: { create: () => false, update: () => false } }),
    refundNumber: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    status: select({
      type: 'string',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Processing', value: 'processing' },
        { label: 'Succeeded (recorded)', value: 'succeeded' },
        { label: 'Failed', value: 'failed' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      defaultValue: 'pending',
    }),
    reason: select({
      type: 'string',
      options: [
        { label: 'Guest cancellation', value: 'guest_cancellation' },
        { label: 'Host cancellation', value: 'host_cancellation' },
        { label: 'Stay issue', value: 'stay_issue' },
        { label: 'Stay amendment', value: 'stay_amendment' },
        { label: 'Overpayment', value: 'overpayment' },
        { label: 'Goodwill', value: 'goodwill' },
        { label: 'Other', value: 'other' },
      ],
      defaultValue: 'other',
    }),
    amountCents: integer({ validation: { isRequired: true, min: 1 } }),
    currencyCode: text({ defaultValue: 'USD' }),
    providerRefundId: text({
      isIndexed: 'unique',
      db: { isNullable: true },
      ui: { description: 'External provider reference only. Manual refund liabilities and attestations do not receive a provider ID.' },
    }),
    processedAt: timestamp(),
    data: json(),
    ...trackingFields,
  },
});
