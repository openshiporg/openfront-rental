import { graphql, list } from '@keystone-6/core';
import { denyAll } from '@keystone-6/core/access';
import { relationship, select, text, virtual } from '@keystone-6/core/fields';

import { hostScopedListAccess, permissions } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { archivedRecordGuard } from '../mutations/catalogLifecycle';
import { propertyListingSummary } from '../utils/listingReadiness';
import { trackingFields } from './trackingFields';

const propertyHostHooks = hostScopedHooks('canManageProperties');
const archivedPropertyGuard = archivedRecordGuard('property');

export const Property = list({
  access: hostScopedListAccess('canReadProperties', 'canManageProperties'),
  hooks: {
    resolveInput: propertyHostHooks.resolveInput,
    validate: async (args: any) => {
      await propertyHostHooks.validate(args);
      archivedPropertyGuard(args);
    },
  },
  ui: { listView: { initialColumns: ['name', 'hostOrganization', 'propertyType', 'status', 'timezone'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization.properties' }),
    name: text({ validation: { isRequired: true } }),
    internalCode: text({ isIndexed: 'unique' }),
    propertyType: select({
      type: 'string',
      options: [
        { label: 'House', value: 'house' },
        { label: 'Apartment Building', value: 'apartment_building' },
        { label: 'Cabin', value: 'cabin' },
        { label: 'Villa', value: 'villa' },
        { label: 'Cottage', value: 'cottage' },
        { label: 'Chalet', value: 'chalet' },
        { label: 'Condo', value: 'condo' },
        { label: 'Townhouse', value: 'townhouse' },
        { label: 'Unique Stay', value: 'unique_stay' },
      ],
      defaultValue: 'house',
    }),
    // Lifecycle moves only through the locked catalog transition command.
    status: select({
      type: 'string',
      access: { update: () => false },
      options: [
        { label: 'Onboarding', value: 'onboarding' },
        { label: 'Active', value: 'active' },
        { label: 'Paused', value: 'paused' },
        { label: 'Archived', value: 'archived' },
      ],
      defaultValue: 'onboarding',
    }),
    timezone: text({ defaultValue: 'America/New_York', validation: { isRequired: true } }),
    checkInFrom: text({ defaultValue: '16:00' }),
    checkInUntil: text({ defaultValue: '22:00' }),
    checkOutBy: text({ defaultValue: '11:00' }),
    registrationNumber: text(),
    arrivalInstructions: text({
      validation: { length: { max: 4000 } },
      ui: {
        displayMode: 'textarea',
        description: 'Entry, parking and access details. Shown only to guests with a confirmed stay, never on public listing pages.',
      },
    }),
    internalNotes: text({ ui: { displayMode: 'textarea' } }),
    address: relationship({ ref: 'PropertyAddress.property' }),
    units: relationship({ ref: 'AccommodationUnit.property', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    listings: relationship({
      ref: 'Listing.property',
      many: true,
      access: { read: permissions.canReadListings, create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    // Counts only (all, published, bookable online), readable with the property: a property
    // reader without listing access sees the true sellable state, not an empty relation.
    listingSummary: virtual({
      field: graphql.field({
        type: graphql.JSON,
        resolve: (item, _args, context) => propertyListingSummary(context.prisma, String(item.id)),
      }),
      ui: { itemView: { fieldMode: 'hidden' }, listView: { fieldMode: 'hidden' }, createView: { fieldMode: 'hidden' } },
    }),
    ownerAssignments: relationship({ ref: 'PropertyOwnerAssignment.property', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    tasks: relationship({ ref: 'PropertyTask.property', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    taskRules: relationship({ ref: 'TaskRule.property', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    ...trackingFields,
  },
});
