import { list } from '@keystone-6/core';
import { relationship, select, text, timestamp } from '@keystone-6/core/fields';

import { hostScopedListAccess } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const Conversation = list({
  access: hostScopedListAccess('canReadMessages', 'canManageMessages'),
  hooks: hostScopedHooks('canManageMessages'),
  ui: { listView: { initialColumns: ['subject', 'guest', 'listing', 'reservation', 'status', 'lastMessageAt'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization.conversations' }),
    reservation: relationship({ ref: 'Reservation.conversation' }),
    listing: relationship({ ref: 'Listing.conversations' }),
    guest: relationship({ ref: 'GuestProfile.conversations' }),
    channelConnection: relationship({ ref: 'ChannelConnection.conversations' }),
    subject: text(),
    status: select({
      type: 'string',
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Snoozed', value: 'snoozed' },
        { label: 'Archived', value: 'archived' },
      ],
      defaultValue: 'open',
    }),
    externalThreadId: text({ isIndexed: true }),
    lastMessageAt: timestamp(),
    messages: relationship({ ref: 'Message.conversation', many: true }),
    ...trackingFields,
  },
});
