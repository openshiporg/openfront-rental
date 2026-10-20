import { list } from '@keystone-6/core';
import { integer, json, relationship, select, text, timestamp } from '@keystone-6/core/fields';

import { hostScopedDomainOwnedListAccess } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const ChannelSyncEvent = list({
  // Written only by domain commands, so authors, delivery, moderation and history can't be forged.
  access: hostScopedDomainOwnedListAccess('canReadChannels'),
  hooks: hostScopedHooks('canManageChannels'),
  ui: { listView: { initialColumns: ['channelConnection', 'action', 'status', 'attempts', 'occurredAt'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization' }),
    channelConnection: relationship({ ref: 'ChannelConnection.syncEvents' }),
    channelListing: relationship({ ref: 'ChannelListing.syncEvents' }),
    channelReservation: relationship({ ref: 'ChannelReservation.syncEvents' }),
    action: select({
      type: 'string',
      options: [
        { label: 'Availability Import', value: 'availability_import' },
        { label: 'Availability Push', value: 'availability_push' },
        { label: 'Rates Push', value: 'rates_push' },
        { label: 'Reservation Import', value: 'reservation_import' },
        { label: 'Message Import', value: 'message_import' },
        { label: 'Webhook', value: 'webhook' },
        { label: 'Retry', value: 'retry' },
      ],
      defaultValue: 'availability_import',
    }),
    status: select({
      type: 'string',
      options: [
        { label: 'Processing', value: 'processing' },
        { label: 'Succeeded', value: 'succeeded' },
        { label: 'Partially succeeded', value: 'partially_succeeded' },
        { label: 'Failed', value: 'failed' },
      ],
      defaultValue: 'processing',
    }),
    message: text({ ui: { displayMode: 'textarea' } }),
    payload: json(),
    errorMessage: text({ ui: { displayMode: 'textarea' } }),
    attempts: integer({ defaultValue: 0, validation: { min: 0 } }),
    nextAttemptAt: timestamp(),
    occurredAt: timestamp({ defaultValue: { kind: 'now' } }),
    ...trackingFields,
  },
});
