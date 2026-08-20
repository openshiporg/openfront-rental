import { list } from '@keystone-6/core';
import { integer, json, relationship, select, text } from '@keystone-6/core/fields';

import { isSignedIn, rules } from '../access';
import { trackingFields } from './trackingFields';

export const OwnerStatementLine = list({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords('canReadPayouts') },
  },
  ui: { listView: { initialColumns: ['statement', 'lineType', 'description', 'serviceDate', 'amountCents'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization.ownerStatementLines' }),
    statement: relationship({ ref: 'OwnerStatement.lines' }),
    owner: relationship({ ref: 'PropertyOwner' }),
    reservation: relationship({ ref: 'Reservation' }),
    refund: relationship({ ref: 'Refund' }),
    payout: relationship({ ref: 'Payout' }),
    lineKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    lineType: select({
      type: 'string',
      options: [
        { label: 'Reservation revenue', value: 'reservation_revenue' },
        { label: 'Refund', value: 'refund' },
        { label: 'Expense', value: 'expense' },
        { label: 'Adjustment', value: 'adjustment' },
        { label: 'Manager commission', value: 'manager_commission' },
        { label: 'Payout', value: 'payout' },
      ],
      defaultValue: 'reservation_revenue',
    }),
    description: text({ validation: { isRequired: true } }),
    serviceDate: text(),
    amountCents: integer({ validation: { isRequired: true } }),
    sourceId: text(),
    metadata: json(),
    ...trackingFields,
  },
});
