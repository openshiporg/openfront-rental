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
    memberships: relationship({ ref: 'HostMembership.hostOrganization', many: true, access: { create: denyAll, update: denyAll } }),
    properties: relationship({ ref: 'Property.hostOrganization', many: true, access: { create: denyAll, update: denyAll } }),
    listings: relationship({ ref: 'Listing.hostOrganization', many: true, access: { create: denyAll, update: denyAll } }),
    guests: relationship({ ref: 'GuestProfile.hostOrganization', many: true, access: { create: denyAll, update: denyAll } }),
    reservations: relationship({ ref: 'Reservation.hostOrganization', many: true, access: { create: denyAll, update: () => false } }),
    reservationAmendments: relationship({ ref: 'ReservationAmendment.hostOrganization', many: true, access: { create: () => false, update: () => false } }),
    payments: relationship({ ref: 'Payment.hostOrganization', many: true, access: { create: denyAll, update: denyAll } }),
    paymentProviders: relationship({ ref: 'PaymentProvider.hostOrganization', many: true, access: { create: denyAll, update: denyAll } }),
    paymentWebhookEvents: relationship({ ref: 'PaymentWebhookEvent.hostOrganization', many: true, access: { create: denyAll, update: denyAll } }),
    payouts: relationship({ ref: 'Payout.hostOrganization', many: true, access: { create: denyAll, update: denyAll } }),
    propertyOwners: relationship({ ref: 'PropertyOwner.hostOrganization', many: true, access: { create: denyAll, update: denyAll } }),
    propertyOwnerAssignments: relationship({ ref: 'PropertyOwnerAssignment.hostOrganization', many: true, access: { create: denyAll, update: denyAll } }),
    ownerStatements: relationship({ ref: 'OwnerStatement.hostOrganization', many: true, access: { create: denyAll, update: denyAll } }),
    ownerStatementLines: relationship({ ref: 'OwnerStatementLine.hostOrganization', many: true, access: { create: denyAll, update: denyAll } }),
    cancellationPolicies: relationship({ ref: 'CancellationPolicy.hostOrganization', many: true, access: { create: denyAll, update: denyAll } }),
    conversations: relationship({ ref: 'Conversation.hostOrganization', many: true, access: { create: denyAll, update: denyAll } }),
    reviews: relationship({ ref: 'Review.hostOrganization', many: true, access: { create: denyAll, update: denyAll } }),
    tasks: relationship({ ref: 'PropertyTask.hostOrganization', many: true, access: { create: denyAll, update: denyAll } }),
    taskRules: relationship({ ref: 'TaskRule.hostOrganization', many: true, access: { create: denyAll, update: denyAll } }),
    channelConnections: relationship({ ref: 'ChannelConnection.hostOrganization', many: true, access: { create: denyAll, update: denyAll } }),
    dataExchangeJobs: relationship({ ref: 'DataExchangeJob.hostOrganization', many: true, access: { create: denyAll, update: denyAll } }),
    outboxEvents: relationship({ ref: 'OutboxEvent.hostOrganization', many: true, access: { create: denyAll, update: denyAll } }),
    ...trackingFields,
  },
});
