import { list } from '@keystone-6/core';
import { json, relationship, select, text, timestamp } from '@keystone-6/core/fields';

import { hostScopedListAccess } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';
import { calendarUrlProblem } from '../lib/calendarSubscription';

const urlProblem = (value: unknown) => (typeof value === 'string' && value.trim() ? calendarUrlProblem(value.trim()) : null);

export const ChannelListing = list({
  access: hostScopedListAccess('canReadChannels', 'canManageChannels'),
  hooks: hostScopedHooks('canManageChannels'),
  ui: { listView: { initialColumns: ['listing', 'channelConnection', 'externalListingId', 'status', 'lastSyncedAt'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization' }),
    listing: relationship({ ref: 'Listing.channelListings' }),
    channelConnection: relationship({ ref: 'ChannelConnection.channelListings' }),
    externalListingId: text({ validation: { isRequired: true }, isIndexed: true }),
    // The channel's "Export calendar" link, polled about hourly when set (https, public host).
    externalUrl: text({
      hooks: {
        validate: {
          create: ({ resolvedData, addValidationError }) => { const problem = urlProblem(resolvedData.externalUrl); if (problem) addValidationError(problem); },
          update: ({ resolvedData, addValidationError }) => { const problem = urlProblem(resolvedData.externalUrl); if (problem) addValidationError(problem); },
        },
      },
    }),
    status: select({
      type: 'string',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Mapped', value: 'mapped' },
        { label: 'Published', value: 'published' },
        { label: 'Paused', value: 'paused' },
        { label: 'Error', value: 'error' },
      ],
      defaultValue: 'pending',
    }),
    mapping: json({ defaultValue: {} }),
    lastSyncedAt: timestamp(),
    // This mapping's own availability-import health: `open` while its last import needs review (job, status, conflicts).
    lastImportIssue: json({ access: { create: () => false, update: () => false }, ui: { itemView: { fieldMode: 'read' }, createView: { fieldMode: 'hidden' } } }),
    channelReservations: relationship({ ref: 'ChannelReservation.channelListing', many: true, ui: { displayMode: 'count' } }),
    syncEvents: relationship({ ref: 'ChannelSyncEvent.channelListing', many: true, access: { create: () => false, update: () => false }, ui: { displayMode: 'count' } }),
    ...trackingFields,
  },
});
