import { list } from '@keystone-6/core';
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
    memberships: relationship({ ref: 'HostMembership.hostOrganization', many: true }),
    properties: relationship({ ref: 'Property.hostOrganization', many: true }),
    listings: relationship({ ref: 'Listing.hostOrganization', many: true }),
    guests: relationship({ ref: 'GuestProfile.hostOrganization', many: true }),
    reservations: relationship({ ref: 'Reservation.hostOrganization', many: true }),
    payments: relationship({ ref: 'Payment.hostOrganization', many: true }),
    paymentProviders: relationship({ ref: 'PaymentProvider.hostOrganization', many: true }),
    paymentWebhookEvents: relationship({ ref: 'PaymentWebhookEvent.hostOrganization', many: true }),
    payouts: relationship({ ref: 'Payout.hostOrganization', many: true }),
    propertyOwners: relationship({ ref: 'PropertyOwner.hostOrganization', many: true }),
    propertyOwnerAssignments: relationship({ ref: 'PropertyOwnerAssignment.hostOrganization', many: true }),
    ownerStatements: relationship({ ref: 'OwnerStatement.hostOrganization', many: true }),
    ownerStatementLines: relationship({ ref: 'OwnerStatementLine.hostOrganization', many: true }),
    cancellationPolicies: relationship({ ref: 'CancellationPolicy.hostOrganization', many: true }),
    conversations: relationship({ ref: 'Conversation.hostOrganization', many: true }),
    reviews: relationship({ ref: 'Review.hostOrganization', many: true }),
    tasks: relationship({ ref: 'PropertyTask.hostOrganization', many: true }),
    taskRules: relationship({ ref: 'TaskRule.hostOrganization', many: true }),
    channelConnections: relationship({ ref: 'ChannelConnection.hostOrganization', many: true }),
    dataExchangeJobs: relationship({ ref: 'DataExchangeJob.hostOrganization', many: true }),
    outboxEvents: relationship({ ref: 'OutboxEvent.hostOrganization', many: true }),
    ...trackingFields,
  },
});
