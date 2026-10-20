import { list } from '@keystone-6/core';
import { allOperations, denyAll } from '@keystone-6/core/access';
import { checkbox, json, password, relationship, select, text } from '@keystone-6/core/fields';

import { isSignedIn, permissions, rules } from '../access';
import { trackingFields } from './trackingFields';

export const User = list({
  access: {
    operation: {
      ...allOperations(isSignedIn),
      create: (args) => process.env.PUBLIC_SIGNUPS_ALLOWED === 'true' || permissions.canManagePeople(args),
      delete: permissions.canManagePeople,
    },
    filter: {
      query: rules.canReadPeople,
      update: rules.canUpdatePeople,
    },
  },
  ui: {
    hideCreate: (args) => !permissions.canManagePeople(args),
    hideDelete: (args) => !permissions.canManagePeople(args),
    listView: { initialColumns: ['name', 'email', 'role', 'hostMemberships', 'guestProfile', 'isActive'] },
    itemView: {
      defaultFieldMode: ({ session, item }) => {
        if (session?.data.role?.canEditOtherPeople) return 'edit';
        if (session?.itemId === item?.id) return 'edit';
        return 'read';
      },
    },
  },
  fields: {
    name: text({ validation: { isRequired: true } }),
    email: text({
      isFilterable: false,
      isOrderable: false,
      isIndexed: 'unique',
      validation: { isRequired: true },
      // Only a people manager changes a sign-in email. Guest self-service email change is held
      // until a verified-address policy exists: a current password doesn't prove the new address.
      access: { update: permissions.canManagePeople },
    }),
    password: password({
      access: {
        read: denyAll,
        // No raw self update: a guest changes their own password through changeGuestPassword,
        // which checks the current password against this exact account inside the write.
        update: permissions.canManagePeople,
      },
      ui: { itemView: { fieldMode: (args) => (permissions.canManagePeople(args) ? 'edit' : 'read') } },
      validation: { isRequired: true },
    }),
    registrationEvidence: json({
      access: { read: permissions.canManagePeople, create: denyAll, update: denyAll },
      ui: {
        description: 'Store documents shown and accepted when a guest registered on the storefront (versions and time). Recorded once; never edited.',
        itemView: { fieldMode: 'read' }, createView: { fieldMode: 'hidden' }, listView: { fieldMode: 'hidden' },
      },
    }),
    role: relationship({
      ref: 'Role.assignedTo',
      access: { create: permissions.canManagePeople, update: permissions.canManagePeople },
      ui: { itemView: { fieldMode: (args) => (permissions.canManagePeople(args) ? 'edit' : 'read') } },
    }),
    phone: text(),
    isActive: checkbox({
      defaultValue: true,
      access: { create: permissions.canManagePeople, update: permissions.canManagePeople },
    }),
    onboardingStatus: select({
      type: 'string',
      options: [
        { label: 'Not Started', value: 'not_started' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Completed', value: 'completed' },
        { label: 'Dismissed', value: 'dismissed' },
      ],
      defaultValue: 'not_started',
      // Only the verified onboarding command changes this; nobody can create a user as already set up.
      access: { create: () => false, update: () => false },
    }),
    hostMemberships: relationship({ ref: 'HostMembership.user', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    guestProfile: relationship({ ref: 'GuestProfile.user', access: { create: denyAll, update: denyAll }, ui: { itemView: { fieldMode: 'read' } } }),
    customerReservations: relationship({
      ref: 'Reservation.bookedBy',
      many: true,
      access: { create: denyAll, update: denyAll },
      ui: { displayMode: 'count', itemView: { fieldMode: 'read' }, createView: { fieldMode: 'hidden' } },
    }),
    // Authorship and assignment are set by the send, review and task commands, never by editing a user.
    sentMessages: relationship({ ref: 'Message.senderUser', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    authoredReviews: relationship({ ref: 'Review.authorUser', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    assignedPropertyTasks: relationship({ ref: 'PropertyTask.assignee', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    ...trackingFields,
  },
});
