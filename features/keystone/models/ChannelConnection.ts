import { list } from '@keystone-6/core';
import { checkbox, json, relationship, select, text, timestamp } from '@keystone-6/core/fields';

import { hostScopedListAccess } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const ChannelConnection = list({
  access: hostScopedListAccess('canReadChannels', 'canManageChannels'),
  hooks: hostScopedHooks('canManageChannels'),
  ui: { listView: { initialColumns: ['name', 'provider', 'connectionType', 'status', 'lastSyncedAt'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization.channelConnections' }),
    name: text({ validation: { isRequired: true } }),
    provider: select({
      type: 'string',
      options: [
        { label: 'Direct', value: 'direct' },
        { label: 'Airbnb', value: 'airbnb' },
        { label: 'Vrbo', value: 'vrbo' },
        { label: 'Booking.com', value: 'booking_com' },
        { label: 'iCal', value: 'ical' },
        { label: 'PMS', value: 'pms' },
      ],
      defaultValue: 'ical',
    }),
    connectionType: select({
      type: 'string',
      options: [
        { label: 'Direct API', value: 'api' },
        { label: 'Webhook', value: 'webhook' },
        { label: 'iCal', value: 'ical' },
        { label: 'Manual', value: 'manual' },
      ],
      defaultValue: 'ical',
    }),
    status: select({
      type: 'string',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Active', value: 'active' },
        { label: 'Paused', value: 'paused' },
        { label: 'Error', value: 'error' },
        { label: 'Disconnected', value: 'disconnected' },
      ],
      defaultValue: 'pending',
    }),
    settings: json({
      defaultValue: {},
      ui: { description: 'Non-secret adapter settings only. Provider credentials are environment-managed.' },
    }),
    syncAvailability: checkbox({ defaultValue: true }),
    syncRates: checkbox({ defaultValue: false }),
    syncReservations: checkbox({ defaultValue: false }),
    syncMessages: checkbox({ defaultValue: false }),
    lastSyncedAt: timestamp(),
    lastError: text({ ui: { displayMode: 'textarea' } }),
    channelListings: relationship({ ref: 'ChannelListing.channelConnection', many: true, ui: { displayMode: 'count' } }),
    channelReservations: relationship({ ref: 'ChannelReservation.channelConnection', many: true, access: { create: () => false, update: () => false }, ui: { displayMode: 'count' } }),
    syncEvents: relationship({ ref: 'ChannelSyncEvent.channelConnection', many: true, access: { create: () => false, update: () => false }, ui: { displayMode: 'count' } }),
    dataExchangeJobs: relationship({ ref: 'DataExchangeJob.channelConnection', many: true, access: { create: () => false, update: () => false }, ui: { displayMode: 'count' } }),
    conversations: relationship({ ref: 'Conversation.channelConnection', many: true, access: { create: () => false, update: () => false }, ui: { displayMode: 'count' } }),
    ...trackingFields,
  },
});
