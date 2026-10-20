import { list } from '@keystone-6/core';
import { denyAll } from '@keystone-6/core/access';
import { checkbox, relationship, select, text } from '@keystone-6/core/fields';

import { isSignedIn, permissions, rules } from '../access';
import { trackingFields } from './trackingFields';

export const HostOrganization = list({
  access: {
    operation: {
      query: isSignedIn,
      create: permissions.canManageRoles,
      update: permissions.canManageProperties,
      delete: permissions.canManageProperties,
    },
    filter: {
      query: rules.canReadHostOrganizations,
      update: rules.canManageHostOrganizations,
      delete: rules.canManageHostOrganizations,
    },
  },
  ui: {
    listView: { initialColumns: ['name', 'organizationType', 'status', 'slug', 'dataCustody'] },
  },
  fields: {
    name: text({ validation: { isRequired: true } }),
    slug: text({ isIndexed: 'unique', validation: { isRequired: true } }),
    organizationType: select({
      type: 'string',
      options: [
        { label: 'Individual Host', value: 'individual_host' },
        { label: 'Property Manager', value: 'property_manager' },
        { label: 'Co-operative', value: 'cooperative' },
      ],
      defaultValue: 'individual_host',
    }),
    status: select({
      type: 'string',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Onboarding', value: 'onboarding' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Archived', value: 'archived' },
      ],
      defaultValue: 'onboarding',
    }),
    publicBio: text({ ui: { displayMode: 'textarea' } }),
    publicEmail: text(),
    publicPhone: text(),
    website: text(),
    canonicalUrl: text(),
    federationId: text({ isIndexed: 'unique' }),
    dataCustody: select({
      type: 'string',
      options: [
        { label: 'Self-hosted', value: 'self_hosted' },
        { label: 'Managed', value: 'managed' },
      ],
      defaultValue: 'self_hosted',
    }),
    isPublic: checkbox({ defaultValue: true }),
    onboardingAnchorDate: text({
      access: { create: denyAll, update: denyAll },
      ui: { description: 'Date the setup run started; sample dates are relative to it so resuming setup stays consistent.', itemView: { fieldMode: 'read' }, createView: { fieldMode: 'hidden' }, listView: { fieldMode: 'hidden' } },
    }),
    onboardingFingerprint: text({
      access: { create: denyAll, update: denyAll },
      ui: { itemView: { fieldMode: 'hidden' }, createView: { fieldMode: 'hidden' }, listView: { fieldMode: 'hidden' } },
    }),
    memberships: relationship({ ref: 'HostMembership.hostOrganization', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    properties: relationship({ ref: 'Property.hostOrganization', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    listings: relationship({ ref: 'Listing.hostOrganization', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    guests: relationship({ ref: 'GuestProfile.hostOrganization', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    reservations: relationship({ ref: 'Reservation.hostOrganization', many: true, access: { create: denyAll, update: () => false }, ui: { displayMode: 'count' } }),
    reservationAmendments: relationship({ ref: 'ReservationAmendment.hostOrganization', many: true, access: { create: () => false, update: () => false }, ui: { displayMode: 'count' } }),
    payments: relationship({ ref: 'Payment.hostOrganization', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    paymentProviders: relationship({ ref: 'PaymentProvider.hostOrganization', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    paymentWebhookEvents: relationship({ ref: 'PaymentWebhookEvent.hostOrganization', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    payouts: relationship({ ref: 'Payout.hostOrganization', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    propertyOwners: relationship({ ref: 'PropertyOwner.hostOrganization', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    propertyOwnerAssignments: relationship({ ref: 'PropertyOwnerAssignment.hostOrganization', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    ownerStatements: relationship({ ref: 'OwnerStatement.hostOrganization', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    ownerStatementLines: relationship({ ref: 'OwnerStatementLine.hostOrganization', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    cancellationPolicies: relationship({ ref: 'CancellationPolicy.hostOrganization', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    conversations: relationship({ ref: 'Conversation.hostOrganization', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    reviews: relationship({ ref: 'Review.hostOrganization', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    tasks: relationship({ ref: 'PropertyTask.hostOrganization', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    taskRules: relationship({ ref: 'TaskRule.hostOrganization', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    channelConnections: relationship({ ref: 'ChannelConnection.hostOrganization', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    dataExchangeJobs: relationship({ ref: 'DataExchangeJob.hostOrganization', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    outboxEvents: relationship({ ref: 'OutboxEvent.hostOrganization', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    ...trackingFields,
  },
});
