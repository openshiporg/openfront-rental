import { list } from '@keystone-6/core';
import { json, relationship, select, text, timestamp } from '@keystone-6/core/fields';

import { hostScopedListAccess } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const Message = list({
  access: hostScopedListAccess('canReadMessages', 'canManageMessages'),
  hooks: hostScopedHooks('canManageMessages'),
  ui: { listView: { initialColumns: ['conversation', 'direction', 'senderType', 'status', 'sentAt'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization' }),
    conversation: relationship({ ref: 'Conversation.messages' }),
    senderUser: relationship({ ref: 'User.sentMessages' }),
    direction: select({
      type: 'string',
      options: [
        { label: 'Inbound', value: 'inbound' },
        { label: 'Outbound', value: 'outbound' },
        { label: 'System', value: 'system' },
      ],
      defaultValue: 'outbound',
    }),
    senderType: select({
      type: 'string',
      options: [
        { label: 'Guest', value: 'guest' },
        { label: 'Host', value: 'host' },
        { label: 'System', value: 'system' },
        { label: 'Channel', value: 'channel' },
      ],
      defaultValue: 'host',
    }),
    body: text({ validation: { isRequired: true }, ui: { displayMode: 'textarea' } }),
    status: select({
      type: 'string',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Queued', value: 'queued' },
        { label: 'Sent', value: 'sent' },
        { label: 'Delivered', value: 'delivered' },
        { label: 'Failed', value: 'failed' },
        { label: 'Received', value: 'received' },
      ],
      defaultValue: 'draft',
    }),
    externalMessageId: text({ isIndexed: true }),
    attachments: json(),
    sentAt: timestamp(),
    receivedAt: timestamp(),
    ...trackingFields,
  },
});
