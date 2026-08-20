import { list } from '@keystone-6/core';
import { integer, json, relationship, select, text } from '@keystone-6/core/fields';

import { isSignedIn, rules } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const ReservationLineItem = list({
  access: {
    operation: {
      query: isSignedIn,
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: { query: rules.canReadHostScopedRecords('canReadReservations') },
  },
  hooks: hostScopedHooks('canManageReservations'),
  ui: { listView: { initialColumns: ['reservation', 'lineType', 'description', 'serviceDate', 'totalAmountCents'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization' }),
    reservation: relationship({ ref: 'Reservation.lineItems' }),
    snapshotKey: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    lineType: select({
      type: 'string',
      options: [
        { label: 'Night', value: 'night' },
        { label: 'Cleaning Fee', value: 'cleaning_fee' },
        { label: 'Service Fee', value: 'service_fee' },
        { label: 'Pet Fee', value: 'pet_fee' },
        { label: 'Guest Fee', value: 'guest_fee' },
        { label: 'Tax', value: 'tax' },
        { label: 'Discount', value: 'discount' },
        { label: 'Security Deposit', value: 'security_deposit' },
        { label: 'Adjustment', value: 'adjustment' },
      ],
      defaultValue: 'night',
    }),
    description: text({ validation: { isRequired: true } }),
    serviceDate: text(),
    quantity: integer({ defaultValue: 1, validation: { min: 1 } }),
    unitAmountCents: integer({ validation: { isRequired: true } }),
    totalAmountCents: integer({ validation: { isRequired: true } }),
    currencyCode: text({ defaultValue: 'USD', validation: { isRequired: true } }),
    metadataSnapshot: json({ access: { update: () => false }, ui: { itemView: { fieldMode: 'read' } } }),
    ...trackingFields,
  },
});
