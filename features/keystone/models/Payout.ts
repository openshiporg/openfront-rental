import { list } from '@keystone-6/core';
import { integer, json, relationship, select, text, timestamp } from '@keystone-6/core/fields';

import { isSignedIn, rules } from '../access';
import { trackingFields } from './trackingFields';

export const Payout = list({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords('canReadPayouts') },
  },
  ui: { listView: { initialColumns: ['payoutNumber', 'hostOrganization', 'reservation', 'status', 'netAmountCents', 'scheduledAt'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization.payouts' }),
    reservation: relationship({ ref: 'Reservation.payout' }),
    propertyOwner: relationship({ ref: 'PropertyOwner.payouts' }),
    ownerStatement: relationship({ ref: 'OwnerStatement.payouts' }),
    payoutNumber: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    status: select({
      type: 'string',
      options: [
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Processing', value: 'processing' },
        { label: 'Paid', value: 'paid' },
        { label: 'Failed', value: 'failed' },
        { label: 'Reversed', value: 'reversed' },
      ],
      defaultValue: 'scheduled',
    }),
    currencyCode: text({ defaultValue: 'USD' }),
    grossAmountCents: integer({ defaultValue: 0 }),
    platformFeeCents: integer({ defaultValue: 0 }),
    managerFeeCents: integer({ defaultValue: 0 }),
    refundAmountCents: integer({ defaultValue: 0 }),
    netAmountCents: integer({ defaultValue: 0 }),
    providerPayoutId: text({
      isIndexed: 'unique',
      db: { isNullable: true },
      ui: { description: 'External provider reference only. Payouts an operator records as paid outside the app do not receive a provider ID.' },
    }),
    scheduledAt: timestamp(),
    paidAt: timestamp(),
    data: json(),
    ...trackingFields,
  },
});
