import { list } from '@keystone-6/core';
import { integer, json, relationship, select, text, timestamp } from '@keystone-6/core/fields';

import { isSignedIn, rules } from '../access';
import { trackingFields } from './trackingFields';

export const DamageClaim = list({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords('canReadReservations') },
  },
  ui: { listView: { initialColumns: ['claimNumber', 'reservation', 'listing', 'status', 'claimedAmountCents'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization' }),
    reservation: relationship({ ref: 'Reservation.damageClaims' }),
    listing: relationship({ ref: 'Listing' }),
    guest: relationship({ ref: 'GuestProfile' }),
    claimNumber: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    status: select({
      type: 'string',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Submitted', value: 'submitted' },
        { label: 'Guest Response', value: 'guest_response' },
        { label: 'Approved', value: 'approved' },
        { label: 'Partially Approved', value: 'partially_approved' },
        { label: 'Declined', value: 'declined' },
        { label: 'Settled', value: 'settled' },
      ],
      defaultValue: 'draft',
    }),
    description: text({ validation: { isRequired: true }, ui: { displayMode: 'textarea' } }),
    claimedAmountCents: integer({ defaultValue: 0, validation: { min: 0 } }),
    approvedAmountCents: integer({ defaultValue: 0, validation: { min: 0 } }),
    currencyCode: text({ defaultValue: 'USD' }),
    evidence: json({ ui: { description: 'Ordered evidence references and captions; media storage remains provider-owned.' } }),
    settlementEvidence: json({
      access: { create: () => false, update: () => false },
      ui: { description: 'How the approved amount was actually settled: method, reference, amount, who recorded it and when.', itemView: { fieldMode: 'read' }, createView: { fieldMode: 'hidden' } },
    }),
    submittedAt: timestamp(),
    resolvedAt: timestamp(),
    ...trackingFields,
  },
});
