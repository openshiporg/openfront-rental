import { list } from '@keystone-6/core';
import { integer, json, relationship, select, text, timestamp } from '@keystone-6/core/fields';

import { isSignedIn, rules } from '../access';
import { trackingFields } from './trackingFields';

export const Payment = list({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords('canReadPayments') },
  },
  ui: { listView: { initialColumns: ['amountCents', 'status', 'paymentMethod', 'reservation', 'processedAt'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization.payments' }),
    reservation: relationship({ ref: 'Reservation.payments' }),
    guest: relationship({ ref: 'GuestProfile.payments' }),
    paymentProvider: relationship({ ref: 'PaymentProvider.payments' }),
    amountCents: integer({ validation: { isRequired: true, min: 1 } }),
    refundedAmountCents: integer({ defaultValue: 0, validation: { min: 0 } }),
    currencyCode: text({ defaultValue: 'USD', validation: { isRequired: true } }),
    status: select({
      type: 'string',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Processing', value: 'processing' },
        { label: 'Succeeded', value: 'succeeded' },
        { label: 'Failed', value: 'failed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Partially Refunded', value: 'partially_refunded' },
        { label: 'Refunded', value: 'refunded' },
      ],
      defaultValue: 'pending',
    }),
    paymentMethod: select({
      type: 'string',
      options: [
        { label: 'Card', value: 'card' },
        { label: 'Bank transfer', value: 'bank_transfer' },
        { label: 'Cash', value: 'cash' },
        { label: 'Check', value: 'check' },
        { label: 'Manual', value: 'manual' },
      ],
      defaultValue: 'manual',
    }),
    provider: text({ defaultValue: 'manual' }),
    providerPaymentId: text({ isIndexed: 'unique' }),
    idempotencyKey: text({ isIndexed: 'unique' }),
    data: json(),
    processedAt: timestamp(),
    errorMessage: text({ ui: { displayMode: 'textarea' } }),
    processedBy: relationship({ ref: 'User' }),
    refunds: relationship({ ref: 'Refund.payment', many: true }),
    securityDeposits: relationship({ ref: 'SecurityDeposit.payment', many: true }),
    webhookEvents: relationship({ ref: 'PaymentWebhookEvent.payment', many: true }),
    ...trackingFields,
  },
});
