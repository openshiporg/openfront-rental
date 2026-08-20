import { list } from '@keystone-6/core';
import { relationship, select } from '@keystone-6/core/fields';

import { isSignedIn, permissions, rules } from '../access';
import { hostMembershipHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const HostMembership = list({
  db: {
    extendPrismaSchema(schema) {
      return schema.replace(/\n}\s*$/, '\n\n  @@unique([hostOrganizationId, userId])\n}');
    },
  },
  access: {
    operation: {
      query: isSignedIn,
      create: permissions.canManageProperties,
      update: permissions.canManageProperties,
      delete: permissions.canManageProperties,
    },
    filter: {
      query: rules.canReadHostMemberships,
      update: rules.canManageHostMemberships,
      delete: rules.canManageHostMemberships,
    },
  },
  hooks: hostMembershipHooks,
  ui: { listView: { initialColumns: ['hostOrganization', 'user', 'membershipRole', 'status'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization.memberships' }),
    user: relationship({ ref: 'User.hostMemberships' }),
    membershipRole: select({
      type: 'string',
      options: [
        { label: 'Owner', value: 'owner' },
        { label: 'Administrator', value: 'admin' },
        { label: 'Property Manager', value: 'manager' },
        { label: 'Operations', value: 'operations' },
        { label: 'Finance', value: 'finance' },
      ],
      defaultValue: 'manager',
    }),
    status: select({
      type: 'string',
      options: [
        { label: 'Invited', value: 'invited' },
        { label: 'Active', value: 'active' },
        { label: 'Suspended', value: 'suspended' },
      ],
      defaultValue: 'invited',
    }),
    ...trackingFields,
  },
});
