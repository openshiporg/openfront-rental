import { list } from '@keystone-6/core';
import { denyAll } from '@keystone-6/core/access';
import { integer, json, relationship, select, text } from '@keystone-6/core/fields';

import { hostScopedListAccess } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const PropertyOwner = list({
  access: hostScopedListAccess('canReadPayouts', 'canManagePayouts'),
  hooks: hostScopedHooks('canManagePayouts'),
  ui: { listView: { initialColumns: ['ownerNumber', 'displayName', 'companyName', 'status', 'payoutSchedule'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization.propertyOwners' }),
    user: relationship({ ref: 'User' }),
    ownerNumber: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    displayName: text({ validation: { isRequired: true } }),
    companyName: text(),
    email: text({ validation: { isRequired: true } }),
    phone: text(),
    status: select({
      type: 'string',
      options: [
        { label: 'Invited', value: 'invited' },
        { label: 'Active', value: 'active' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Archived', value: 'archived' },
      ],
      defaultValue: 'invited',
    }),
    payoutSchedule: select({
      type: 'string',
      options: [
        { label: 'Monthly', value: 'monthly' },
        { label: 'Quarterly', value: 'quarterly' },
        { label: 'Manual', value: 'manual' },
      ],
      defaultValue: 'monthly',
    }),
    defaultManagerCommissionBasisPoints: integer({ defaultValue: 1500, validation: { min: 0, max: 10000 } }),
    payoutMethod: select({
      type: 'string',
      options: [
        { label: 'Manual', value: 'manual' },
        { label: 'External bank transfer', value: 'external_bank' },
        { label: 'External payment provider', value: 'external_provider' },
      ],
      defaultValue: 'manual',
    }),
    payoutReference: text({ ui: { description: 'Non-secret external payee or accounting reference.' } }),
    taxProfile: json({
      defaultValue: {},
      ui: { description: 'Non-secret tax classification and reporting metadata. Never store tax IDs or bank credentials here.' },
    }),
    assignments: relationship({ ref: 'PropertyOwnerAssignment.owner', many: true, ui: { displayMode: 'count' } }),
    statements: relationship({
      ref: 'OwnerStatement.owner',
      many: true,
      access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    payouts: relationship({
      ref: 'Payout.propertyOwner',
      many: true,
      access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    ...trackingFields,
  },
});
