import { list } from '@keystone-6/core';
import { integer, json, relationship } from '@keystone-6/core/fields';

import { isSignedIn, rules } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

const partyHostHooks = hostScopedHooks('canManageGuests');
const BOOKED_PARTY_FIELDS = ['primaryGuest', 'adults', 'children', 'infants', 'pets'];

/**
 * A stay's party is booking evidence: who was booked and who was invited. It is created by the
 * booking and changed only by the host's locked party and invitation commands, which keep the
 * original in the booking snapshot and append each change as an attributable event. It is never
 * deleted, and nobody can record a guest's acceptance of an invitation from a form.
 */
export const GuestParty = list({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords('canReadGuests') },
  },
  hooks: {
    ...partyHostHooks,
    validate: async (args: any) => {
      await partyHostHooks.validate(args);
      // A booked party is part of the stay's capacity and price evidence: it changes only
      // through the host's locked party-change command, which checks capacity and pet rules.
      if (args.operation === 'update' && args.item?.reservationId && BOOKED_PARTY_FIELDS.some((field) => args.resolvedData?.[field] !== undefined)) {
        args.addValidationError('This party belongs to a booked stay. Change guests or pets from the reservation, not here.');
      }
    },
  },
  ui: { listView: { initialColumns: ['reservation', 'primaryGuest', 'adults', 'children', 'infants', 'pets'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization' }),
    reservation: relationship({ ref: 'Reservation.guestParty', access: { create: () => false, update: () => false } }),
    primaryGuest: relationship({ ref: 'GuestProfile' }),
    adults: integer({ defaultValue: 1, validation: { min: 1 } }),
    children: integer({ defaultValue: 0, validation: { min: 0 } }),
    infants: integer({ defaultValue: 0, validation: { min: 0 } }),
    pets: integer({ defaultValue: 0, validation: { min: 0 } }),
    invitedGuests: json({
      access: { create: () => false, update: () => false },
      ui: { description: 'Invited guest names and emails as booked or corrected by the host’s invitation command. Acceptance is never recorded from a form.', itemView: { fieldMode: 'read' } },
    }),
    ...trackingFields,
  },
});
