import { list } from '@keystone-6/core';
import { integer, relationship, select, text } from '@keystone-6/core/fields';

import { hostScopedListAccess, permissions } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const AccommodationUnit = list({
  access: hostScopedListAccess('canReadProperties', 'canManageProperties'),
  hooks: hostScopedHooks('canManageProperties', { parent: 'property' }),
  ui: { listView: { initialColumns: ['name', 'property', 'accommodationType', 'maxGuests', 'bedroomCount', 'bathroomCountHalfUnits'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization' }),
    // A unit's property is fixed once created: its listings and stays depend on it.
    property: relationship({ ref: 'Property.units', access: { update: () => false } }),
    name: text({ validation: { isRequired: true } }),
    accommodationType: select({
      type: 'string',
      options: [
        { label: 'Entire Home', value: 'entire_home' },
        { label: 'Apartment', value: 'apartment' },
        { label: 'Cabin', value: 'cabin' },
        { label: 'Villa', value: 'villa' },
        { label: 'Cottage', value: 'cottage' },
        { label: 'Chalet', value: 'chalet' },
        { label: 'Condo', value: 'condo' },
        { label: 'Townhouse', value: 'townhouse' },
        { label: 'Guesthouse', value: 'guesthouse' },
        { label: 'Unique Stay', value: 'unique_stay' },
      ],
      defaultValue: 'entire_home',
    }),
    status: select({
      type: 'string',
      options: [
        { label: 'Available', value: 'available' },
        { label: 'Unavailable', value: 'unavailable' },
        { label: 'Archived', value: 'archived' },
      ],
      defaultValue: 'available',
    }),
    maxGuests: integer({ defaultValue: 2, validation: { min: 1 } }),
    bedroomCount: integer({ defaultValue: 1, validation: { min: 0 } }),
    bedCount: integer({ defaultValue: 1, validation: { min: 1 } }),
    bathroomCountHalfUnits: integer({ defaultValue: 2, validation: { min: 1 }, ui: { description: 'Bathrooms in half-units; 3 = 1.5 bathrooms.' } }),
    squareFeet: integer({ validation: { min: 0 } }),
    floorLabel: text(),
    // A listing's unit is changed on the listing, where live capacity is checked.
    listings: relationship({ ref: 'Listing.accommodationUnit', many: true, access: { create: () => false, update: () => false }, ui: { displayMode: 'count' } }),
    bedrooms: relationship({ ref: 'Bedroom.accommodationUnit', many: true }),
    reservations: relationship({
      ref: 'Reservation.accommodationUnit',
      many: true,
      // Reservations move only through allocation and lifecycle commands, never from a parent's form.
      access: { read: permissions.canReadReservations, create: () => false, update: () => false }, ui: { displayMode: 'count' } }),
    ...trackingFields,
  },
});
