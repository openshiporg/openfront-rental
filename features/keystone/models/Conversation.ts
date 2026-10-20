import { list } from '@keystone-6/core';
import { json, relationship, select, text, timestamp } from '@keystone-6/core/fields';

import { hostScopedListAccess, permissions } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const Conversation = list({
  access: hostScopedListAccess('canReadMessages', 'canManageMessages'),
  hooks: hostScopedHooks('canManageMessages'),
  ui: { listView: { initialColumns: ['subject', 'guest', 'listing', 'reservation', 'status', 'lastMessageAt'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization.conversations' }),
    // A conversation stays with the stay, home, guest and channel it began with: moving it would move its history.
    reservation: relationship({ ref: 'Reservation.conversation', access: { create: () => false, update: () => false } }),
    listing: relationship({ ref: 'Listing.conversations', access: { create: () => false, update: () => false } }),
    guest: relationship({ ref: 'GuestProfile.conversations', access: { create: () => false, update: () => false } }),
    channelConnection: relationship({ ref: 'ChannelConnection.conversations', access: { create: () => false, update: () => false } }),
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
    guestAccessTokenHash: text({
      isIndexed: 'unique',
      db: { isNullable: true },
      access: { read: permissions.canManageMessages, create: () => false, update: () => false },
      ui: { itemView: { fieldMode: 'hidden' }, createView: { fieldMode: 'hidden' }, listView: { fieldMode: 'hidden' } },
    }),
    guestAccessTokenExpiresAt: timestamp({
      access: { create: () => false, update: () => false },
      ui: { description: 'When the guest’s private conversation link stops working. Each guest or host message extends it to 30 days after that message.', itemView: { fieldMode: 'read' }, createView: { fieldMode: 'hidden' } },
    }),
    guestAccessTokenRevokedAt: timestamp({
      access: { create: () => false, update: () => false },
      ui: { description: 'Set when the host turns off the guest’s private conversation link.', itemView: { fieldMode: 'read' }, createView: { fieldMode: 'hidden' } },
    }),
    guestLinkDelivery: json({
      access: { read: permissions.canManageMessages, create: () => false, update: () => false },
      ui: {
        description: 'Last emailed conversation link: attempt id, status (sending, sent, failed, unknown) and times. Never holds a link.',
        itemView: { fieldMode: 'read' }, createView: { fieldMode: 'hidden' }, listView: { fieldMode: 'hidden' },
      },
    }),
    guestEmail: text({ ui: { description: 'Reply-to address the guest supplied with an inquiry.' } }),
    lastMessageAt: timestamp(),
    // Sent and received messages never move between conversations.
    messages: relationship({ ref: 'Message.conversation', many: true, access: { create: () => false, update: () => false }, ui: { displayMode: 'count' } }),
    ...trackingFields,
  },
});
