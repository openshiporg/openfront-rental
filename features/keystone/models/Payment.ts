import { graphql, list } from '@keystone-6/core';
import { integer, json, relationship, select, text, timestamp, virtual } from '@keystone-6/core/fields';

import { isSignedIn, rules } from '../access';
import { tenderKind } from '../utils/tenderProvenance';
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
    // Test, sample, manual, provider or unknown, from this payment's own evidence (never its booking's flag).
    tenderKind: virtual({
      field: graphql.field({ type: graphql.String, resolve: (item: any) => tenderKind(item) }),
      ui: { itemView: { fieldMode: 'read' }, listView: { fieldMode: 'hidden' }, createView: { fieldMode: 'hidden' } },
    }),
    // Complete refund facts for this payment (every refund, not a preview): what is still owed
    // and what can still be refunded. Commands re-check under their locks; this is for display.
    refundAvailability: virtual({
      field: graphql.field({
        type: graphql.JSON,
        resolve: async (item: any, _args, context) => {
          const open = await context.prisma.refund.aggregate({
            where: { paymentId: String(item.id), status: { in: ['pending', 'processing', 'failed'] } },
            _sum: { amountCents: true },
            _count: { _all: true },
          });
          const openRefundCents = open._sum.amountCents || 0;
          const settled = ['succeeded', 'partially_refunded'].includes(item.status);
          return {
            openRefundCents,
            openRefundCount: open._count._all,
            refundableCents: settled ? Math.max((item.amountCents || 0) - (item.refundedAmountCents || 0) - openRefundCents, 0) : 0,
          };
        },
      }),
      ui: { itemView: { fieldMode: 'hidden' }, listView: { fieldMode: 'hidden' }, createView: { fieldMode: 'hidden' } },
    }),
    processedAt: timestamp(),
    errorMessage: text({ ui: { displayMode: 'textarea' } }),
    processedBy: relationship({ ref: 'User' }),
    refunds: relationship({ ref: 'Refund.payment', many: true, ui: { displayMode: 'count' } }),
    securityDeposits: relationship({ ref: 'SecurityDeposit.payment', many: true, ui: { displayMode: 'count' } }),
    webhookEvents: relationship({ ref: 'PaymentWebhookEvent.payment', many: true, ui: { displayMode: 'count' } }),
    ...trackingFields,
  },
});
