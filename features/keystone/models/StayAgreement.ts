import { list } from '@keystone-6/core';
import { json, relationship, select, text, timestamp } from '@keystone-6/core/fields';

import { isSignedIn, permissions, rules } from '../access';
import { trackingFields } from './trackingFields';

export const StayAgreement = list({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords('canReadReservations') },
  },
  ui: { listView: { initialColumns: ['agreementNumber', 'reservation', 'status', 'signerEmail', 'signedAt'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization' }),
    reservation: relationship({ ref: 'Reservation.agreement' }),
    guest: relationship({ ref: 'GuestProfile' }),
    cancellationPolicy: relationship({ ref: 'CancellationPolicy.agreements' }),
    agreementNumber: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    signingTokenHash: text({
      isIndexed: 'unique',
      access: { read: permissions.canManageReservations, update: () => false },
      ui: { itemView: { fieldMode: 'hidden' }, createView: { fieldMode: 'hidden' }, listView: { fieldMode: 'hidden' } },
    }),
    signingTokenExpiresAt: timestamp(),
    signingTokenRevokedAt: timestamp(),
    status: select({
      type: 'string',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Sent', value: 'sent' },
        { label: 'Signed', value: 'signed' },
        { label: 'Voided', value: 'voided' },
      ],
      defaultValue: 'draft',
    }),
    title: text({ validation: { isRequired: true } }),
    signerEmail: text({ validation: { isRequired: true } }),
    signatureName: text(),
    signedAt: timestamp(),
    termsSnapshot: json({ access: { update: () => false }, ui: { itemView: { fieldMode: 'read' } } }),
    signatureEvidence: json({
      access: { create: () => false, update: () => false },
      ui: { description: 'What the guest accepted when signing: time, statement and terms fingerprint.', itemView: { fieldMode: 'read' }, createView: { fieldMode: 'hidden' } },
    }),
    ...trackingFields,
  },
});
