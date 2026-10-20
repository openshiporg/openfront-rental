import { list } from '@keystone-6/core';
import { relationship, select, text } from '@keystone-6/core/fields';

import { hostScopedListAccess } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

const scopedHooks = hostScopedHooks('canManageCalendar');
const reservationBlockMutationError = 'Reservation-backed capacity blocks can only be changed by reservation lifecycle operations.';

export const CalendarBlock = list({
  access: hostScopedListAccess('canReadCalendar', 'canManageCalendar'),
  hooks: {
    ...scopedHooks,
    validate: async (args: any) => {
      await scopedHooks.validate(args);
      if (args.item?.reservationId || args.resolvedData?.reservation) {
        args.addValidationError(reservationBlockMutationError);
      }
    },
  },
  ui: { listView: { initialColumns: ['listing', 'startDate', 'endDate', 'reason', 'status', 'source'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization' }),
    listing: relationship({ ref: 'Listing.calendarBlocks' }),
    reservation: relationship({ ref: 'Reservation.calendarBlocks' }),
    channelReservation: relationship({ ref: 'ChannelReservation.calendarBlocks' }),
    startDate: text({ validation: { isRequired: true }, ui: { description: 'Inclusive YYYY-MM-DD.' } }),
    endDate: text({ validation: { isRequired: true }, ui: { description: 'Exclusive YYYY-MM-DD.' } }),
    reason: select({
      type: 'string',
      options: [
        { label: 'Reservation', value: 'reservation' },
        { label: 'Quote Hold', value: 'quote_hold' },
        { label: 'Owner Block', value: 'owner_block' },
        { label: 'Preparation', value: 'preparation' },
        { label: 'Maintenance', value: 'property_maintenance' },
        { label: 'Channel Import', value: 'channel_import' },
      ],
      defaultValue: 'owner_block',
    }),
    status: select({
      type: 'string',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Released', value: 'released' },
        { label: 'Expired', value: 'expired' },
      ],
      defaultValue: 'active',
    }),
    source: select({
      type: 'string',
      options: [
        { label: 'Direct', value: 'direct' },
        { label: 'Operator', value: 'operator' },
        { label: 'iCal', value: 'ical' },
        { label: 'Channel API', value: 'channel_api' },
      ],
      defaultValue: 'operator',
    }),
    externalUid: text({ isIndexed: true }),
    fixtureOrigin: text({
      db: { isNullable: true },
      access: { create: () => false, update: () => false },
      ui: { description: 'Set only for onboarding sample holds and sample stays: they never block real bookings.', itemView: { fieldMode: 'read' }, createView: { fieldMode: 'hidden' } },
    }),
    notes: text({ ui: { displayMode: 'textarea' } }),
    ...trackingFields,
  },
});
