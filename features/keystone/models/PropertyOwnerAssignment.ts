import { list } from '@keystone-6/core';
import { checkbox, integer, relationship, select, text } from '@keystone-6/core/fields';

import { hostScopedListAccess } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const PropertyOwnerAssignment = list({
  db: {
    extendPrismaSchema(schema) {
      return schema.replace(/\n}\s*$/, '\n\n  @@unique([propertyId, ownerId, effectiveFrom])\n}');
    },
  },
  access: hostScopedListAccess('canReadPayouts', 'canManagePayouts'),
  hooks: hostScopedHooks('canManagePayouts'),
  ui: { listView: { initialColumns: ['owner', 'property', 'status', 'ownershipBasisPoints', 'managerCommissionBasisPoints', 'effectiveFrom'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization.propertyOwnerAssignments' }),
    owner: relationship({ ref: 'PropertyOwner.assignments' }),
    property: relationship({ ref: 'Property.ownerAssignments' }),
    status: select({
      type: 'string',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Ended', value: 'ended' },
      ],
      defaultValue: 'active',
    }),
    isPrimary: checkbox({ defaultValue: true }),
    ownershipBasisPoints: integer({ defaultValue: 10000, validation: { min: 1, max: 10000 } }),
    managerCommissionBasisPoints: integer({ defaultValue: 1500, validation: { min: 0, max: 10000 } }),
    effectiveFrom: text({ validation: { isRequired: true }, ui: { description: 'Inclusive date in YYYY-MM-DD format.' } }),
    effectiveTo: text({ ui: { description: 'Exclusive date in YYYY-MM-DD format.' } }),
    notes: text({ ui: { displayMode: 'textarea' } }),
    ...trackingFields,
  },
});
