import { list } from '@keystone-6/core';
import { relationship, select, text } from '@keystone-6/core/fields';

import { hostScopedListAccess } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const Property = list({
  access: hostScopedListAccess('canReadProperties', 'canManageProperties'),
  hooks: hostScopedHooks('canManageProperties'),
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
    status: select({
      type: 'string',
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
    internalNotes: text({ ui: { displayMode: 'textarea' } }),
    address: relationship({ ref: 'PropertyAddress.property' }),
    units: relationship({ ref: 'AccommodationUnit.property', many: true }),
    listings: relationship({ ref: 'Listing.property', many: true }),
    ownerAssignments: relationship({ ref: 'PropertyOwnerAssignment.property', many: true }),
    tasks: relationship({ ref: 'PropertyTask.property', many: true }),
    taskRules: relationship({ ref: 'TaskRule.property', many: true }),
    ...trackingFields,
  },
});
