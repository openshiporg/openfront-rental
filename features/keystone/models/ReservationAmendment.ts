import { list } from '@keystone-6/core';
import { json, relationship, text } from '@keystone-6/core/fields';

import { isSignedIn, rules } from '../access';
import { trackingFields } from './trackingFields';

export const ReservationAmendment = list({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords('canReadReservations') },
  },
  ui: { listView: { initialColumns: ['reservation', 'previousCheckInDate', 'previousCheckOutDate', 'checkInDate', 'checkOutDate', 'reason'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization.reservationAmendments', access: { create: () => false, update: () => false } }),
    reservation: relationship({ ref: 'Reservation.amendments', access: { create: () => false, update: () => false } }),
    idempotencyKey: text({ isIndexed: 'unique', access: { update: () => false } }),
    requestHash: text({ access: { update: () => false } }),
    actorUserId: text({ access: { update: () => false } }),
    reason: text({ access: { update: () => false }, ui: { displayMode: 'textarea' } }),
    previousCheckInDate: text({ access: { update: () => false } }),
    previousCheckOutDate: text({ access: { update: () => false } }),
    checkInDate: text({ access: { update: () => false } }),
    checkOutDate: text({ access: { update: () => false } }),
    currencyCode: text({ access: { update: () => false } }),
    originalBookingSnapshotHash: text({ access: { update: () => false } }),
    beforeSnapshot: json({ access: { update: () => false }, ui: { itemView: { fieldMode: 'read' } } }),
    afterSnapshot: json({ access: { update: () => false }, ui: { itemView: { fieldMode: 'read' } } }),
    delta: json({ access: { update: () => false }, ui: { itemView: { fieldMode: 'read' } } }),
    refunds: relationship({ ref: 'Refund.reservationAmendment', many: true, access: { create: () => false, update: () => false } }),
    ...trackingFields,
  },
});
