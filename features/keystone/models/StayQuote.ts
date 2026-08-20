import { list } from '@keystone-6/core';
import { integer, json, relationship, select, text, timestamp } from '@keystone-6/core/fields';

import { hostScopedListAccess, permissions } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const StayQuote = list({
  access: hostScopedListAccess('canReadReservations', 'canManageReservations'),
  hooks: hostScopedHooks('canManageReservations'),
  ui: { listView: { initialColumns: ['quoteNumber', 'listing', 'checkInDate', 'checkOutDate', 'totalAmountCents', 'status', 'expiresAt'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization' }),
    listing: relationship({ ref: 'Listing.quotes' }),
    ratePlan: relationship({ ref: 'RatePlan.quotes' }),
    reservation: relationship({ ref: 'Reservation.quote' }),
    quoteNumber: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    tokenHash: text({
      validation: { isRequired: true },
      isIndexed: 'unique',
      access: { read: permissions.canManageReservations, update: () => false },
      ui: { itemView: { fieldMode: 'hidden' }, createView: { fieldMode: 'hidden' }, listView: { fieldMode: 'hidden' } },
    }),
    status: select({
      type: 'string',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Consumed', value: 'consumed' },
        { label: 'Expired', value: 'expired' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      defaultValue: 'active',
    }),
    checkInDate: text({ validation: { isRequired: true } }),
    checkOutDate: text({ validation: { isRequired: true } }),
    adults: integer({ defaultValue: 1, validation: { min: 1 } }),
    children: integer({ defaultValue: 0, validation: { min: 0 } }),
    infants: integer({ defaultValue: 0, validation: { min: 0 } }),
    pets: integer({ defaultValue: 0, validation: { min: 0 } }),
    currencyCode: text({ validation: { isRequired: true }, defaultValue: 'USD' }),
    lodgingSubtotalCents: integer({ defaultValue: 0, validation: { min: 0 } }),
    feeTotalCents: integer({ defaultValue: 0, validation: { min: 0 } }),
    taxTotalCents: integer({ defaultValue: 0, validation: { min: 0 } }),
    securityDepositCents: integer({ defaultValue: 0, validation: { min: 0 } }),
    totalAmountCents: integer({ defaultValue: 0, validation: { min: 0 } }),
    quoteSnapshot: json({ access: { update: () => false }, ui: { itemView: { fieldMode: 'read' } } }),
    expiresAt: timestamp({ validation: { isRequired: true } }),
    consumedAt: timestamp(),
    ...trackingFields,
  },
});
