import { list } from '@keystone-6/core';
import { integer, json, relationship } from '@keystone-6/core/fields';

import { hostScopedListAccess } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const GuestParty = list({
  access: hostScopedListAccess('canReadGuests', 'canManageGuests'),
  hooks: hostScopedHooks('canManageGuests'),
  ui: { listView: { initialColumns: ['reservation', 'primaryGuest', 'adults', 'children', 'infants', 'pets'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization' }),
    reservation: relationship({ ref: 'Reservation.guestParty' }),
    primaryGuest: relationship({ ref: 'GuestProfile' }),
    adults: integer({ defaultValue: 1, validation: { min: 1 } }),
    children: integer({ defaultValue: 0, validation: { min: 0 } }),
    infants: integer({ defaultValue: 0, validation: { min: 0 } }),
    pets: integer({ defaultValue: 0, validation: { min: 0 } }),
    invitedGuests: json({ ui: { description: 'Snapshotted invited guest names and acceptance state; no sensitive identity documents.' } }),
    ...trackingFields,
  },
});
