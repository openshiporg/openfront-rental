import { list } from '@keystone-6/core';
import { integer, json, relationship, select, text, timestamp } from '@keystone-6/core/fields';

import { isSignedIn, rules } from '../access';
import { trackingFields } from './trackingFields';

export const OwnerStatement = list({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords('canReadPayouts') },
  },
  ui: { listView: { initialColumns: ['statementNumber', 'owner', 'periodStart', 'periodEnd', 'status', 'ownerEarningsCents', 'balanceDueCents'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization.ownerStatements' }),
    owner: relationship({ ref: 'PropertyOwner.statements' }),
    statementNumber: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    idempotencyKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    status: select({
      type: 'string',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Approved', value: 'approved' },
        { label: 'Sent', value: 'sent' },
        { label: 'Paid', value: 'paid' },
        { label: 'Voided', value: 'voided' },
      ],
      defaultValue: 'draft',
    }),
    periodStart: text({ validation: { isRequired: true } }),
    periodEnd: text({ validation: { isRequired: true } }),
    currencyCode: text({ validation: { isRequired: true }, defaultValue: 'USD' }),
    grossRevenueCents: integer({ defaultValue: 0 }),
    taxAmountCents: integer({ defaultValue: 0 }),
    refundAmountCents: integer({ defaultValue: 0 }),
    expenseAmountCents: integer({ defaultValue: 0 }),
    adjustmentAmountCents: integer({ defaultValue: 0 }),
    managerCommissionCents: integer({ defaultValue: 0 }),
    ownerEarningsCents: integer({ defaultValue: 0 }),
    paidOutCents: integer({ defaultValue: 0 }),
    balanceDueCents: integer({ defaultValue: 0 }),
    statementSnapshot: json({ ui: { itemView: { fieldMode: 'read' } } }),
    generatedAt: timestamp({ defaultValue: { kind: 'now' } }),
    approvedAt: timestamp(),
    sentAt: timestamp(),
    paidAt: timestamp(),
    paidReference: text(),
    lines: relationship({ ref: 'OwnerStatementLine.statement', many: true, ui: { displayMode: 'count' } }),
    payouts: relationship({ ref: 'Payout.ownerStatement', many: true, ui: { displayMode: 'count' } }),
    ...trackingFields,
  },
});
