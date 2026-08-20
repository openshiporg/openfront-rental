import { list } from '@keystone-6/core';
import { allOperations } from '@keystone-6/core/access';
import { checkbox, relationship, text } from '@keystone-6/core/fields';

import { isSignedIn, permissions } from '../access';
import { trackingFields } from './trackingFields';

export const Role = list({
  access: {
    operation: {
      ...allOperations(permissions.canManageRoles),
      query: isSignedIn,
    },
  },
  ui: {
    hideCreate: (args) => !permissions.canManageRoles(args),
    hideDelete: (args) => !permissions.canManageRoles(args),
    listView: { initialColumns: ['name', 'assignedTo'] },
    itemView: { defaultFieldMode: (args) => (permissions.canManageRoles(args) ? 'edit' : 'read') },
  },
  fields: {
    name: text({ validation: { isRequired: true } }),
    canAccessDashboard: checkbox({ defaultValue: false }),
    canReadProperties: checkbox({ defaultValue: false }),
    canManageProperties: checkbox({ defaultValue: false }),
    canReadListings: checkbox({ defaultValue: false }),
    canManageListings: checkbox({ defaultValue: false }),
    canReadCalendar: checkbox({ defaultValue: false }),
    canManageCalendar: checkbox({ defaultValue: false }),
    canReadPricing: checkbox({ defaultValue: false }),
    canManagePricing: checkbox({ defaultValue: false }),
    canReadReservations: checkbox({ defaultValue: false }),
    canManageReservations: checkbox({ defaultValue: false }),
    canReadGuests: checkbox({ defaultValue: false }),
    canManageGuests: checkbox({ defaultValue: false }),
    canReadMessages: checkbox({ defaultValue: false }),
    canManageMessages: checkbox({ defaultValue: false }),
    canReadChannels: checkbox({ defaultValue: false }),
    canManageChannels: checkbox({ defaultValue: false }),
    canReadPayouts: checkbox({ defaultValue: false }),
    canManagePayouts: checkbox({ defaultValue: false }),
    canReadReviews: checkbox({ defaultValue: false }),
    canManageReviews: checkbox({ defaultValue: false }),
    canReadPayments: checkbox({ defaultValue: false }),
    canManagePayments: checkbox({ defaultValue: false }),
    canReadReports: checkbox({ defaultValue: false }),
    canManageReports: checkbox({ defaultValue: false }),
    canSeeOtherPeople: checkbox({ defaultValue: false }),
    canEditOtherPeople: checkbox({ defaultValue: false }),
    canManagePeople: checkbox({ defaultValue: false }),
    canManageRoles: checkbox({ defaultValue: false }),
    canManageOnboarding: checkbox({ defaultValue: false }),
    canManageSettings: checkbox({ defaultValue: false }),
    assignedTo: relationship({ ref: 'User.role', many: true, ui: { itemView: { fieldMode: 'read' } } }),
    ...trackingFields,
  },
});
