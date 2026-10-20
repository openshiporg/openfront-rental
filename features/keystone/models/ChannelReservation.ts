import { list } from '@keystone-6/core';
import { denyAll } from '@keystone-6/core/access';
import { integer, json, relationship, select, text, timestamp } from '@keystone-6/core/fields';

import { hostScopedListAccess } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const ChannelReservation = list({
  access: hostScopedListAccess('canReadChannels', 'canManageChannels'),
  hooks: hostScopedHooks('canManageChannels'),
  ui: { listView: { initialColumns: ['externalReservationId', 'channelConnection', 'channelListing', 'reservation', 'status', 'checkInDate', 'checkOutDate'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization' }),
    channelConnection: relationship({ ref: 'ChannelConnection.channelReservations' }),
    channelListing: relationship({ ref: 'ChannelListing.channelReservations' }),
    reservation: relationship({ ref: 'Reservation.channelReservation', access: { create: () => false, update: () => false } }),
    externalReservationId: text({ validation: { isRequired: true }, isIndexed: true }),
    status: select({
      type: 'string',
      options: [
        { label: 'Imported', value: 'imported' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Modified', value: 'modified' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Conflict', value: 'conflict' },
      ],
      defaultValue: 'imported',
    }),
    guestName: text(),
    guestEmail: text(),
    checkInDate: text({ validation: { isRequired: true } }),
    checkOutDate: text({ validation: { isRequired: true } }),
    totalAmountCents: integer({ validation: { min: 0 } }),
    commissionAmountCents: integer({ validation: { min: 0 } }),
    currencyCode: text({ defaultValue: 'USD' }),
    rawData: json({ defaultValue: {} }),
    lastSyncedAt: timestamp(),
    calendarBlocks: relationship({
      ref: 'CalendarBlock.channelReservation',
      many: true,
      access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    syncEvents: relationship({ ref: 'ChannelSyncEvent.channelReservation', many: true, access: { create: () => false, update: () => false }, ui: { displayMode: 'count' } }),
    ...trackingFields,
  },
});
