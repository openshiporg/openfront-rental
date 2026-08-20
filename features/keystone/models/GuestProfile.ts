import { list } from '@keystone-6/core';
import { checkbox, relationship, select, text } from '@keystone-6/core/fields';

import { hostScopedListAccess } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const GuestProfile = list({
  access: hostScopedListAccess('canReadGuests', 'canManageGuests'),
  hooks: hostScopedHooks('canManageGuests'),
  ui: { listView: { initialColumns: ['name', 'email', 'phone', 'verificationStatus', 'reservations'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization.guests' }),
    user: relationship({ ref: 'User.guestProfile' }),
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
    reservations: relationship({ ref: 'Reservation.guest', many: true }),
    conversations: relationship({ ref: 'Conversation.guest', many: true }),
    reviews: relationship({ ref: 'Review.guest', many: true }),
    payments: relationship({ ref: 'Payment.guest', many: true }),
    ...trackingFields,
  },
});
