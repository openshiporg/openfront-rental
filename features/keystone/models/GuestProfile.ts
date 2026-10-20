import { list } from '@keystone-6/core';
import { denyAll } from '@keystone-6/core/access';
import { checkbox, relationship, select, text } from '@keystone-6/core/fields';

import { hostScopedListAccess, permissions } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const GuestProfile = list({
  access: hostScopedListAccess('canReadGuests', 'canManageGuests'),
  hooks: hostScopedHooks('canManageGuests'),
  ui: { listView: { initialColumns: ['name', 'email', 'phone', 'verificationStatus', 'reservations'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization.guests' }),
    // Linking a guest profile to a sign-in account is a global identity fact: never set from a form.
    user: relationship({ ref: 'User.guestProfile', access: { create: denyAll, update: denyAll } }),
    name: text({ validation: { isRequired: true } }),
    email: text({ validation: { isRequired: true } }),
    phone: text(),
    verificationStatus: select({
      type: 'string',
      options: [
        { label: 'Unverified', value: 'unverified' },
        { label: 'Pending', value: 'pending' },
        { label: 'Verified', value: 'verified' },
        { label: 'Rejected', value: 'rejected' },
      ],
      defaultValue: 'unverified',
    }),
    preferredLanguage: text({ defaultValue: 'en' }),
    marketingConsent: checkbox({ defaultValue: false }),
    internalNotes: text({ ui: { displayMode: 'textarea' } }),
    reservations: relationship({
      ref: 'Reservation.guest',
      many: true,
      // Reservations move only through allocation and lifecycle commands, never from a parent's form.
      access: { read: permissions.canReadReservations, create: () => false, update: () => false },
      ui: { displayMode: 'count' },
    }),
    conversations: relationship({ ref: 'Conversation.guest', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    reviews: relationship({ ref: 'Review.guest', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    payments: relationship({
      ref: 'Payment.guest',
      many: true,
      access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    ...trackingFields,
  },
});
