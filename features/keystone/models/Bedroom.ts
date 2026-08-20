import { list } from '@keystone-6/core';
import { integer, relationship, text } from '@keystone-6/core/fields';

import { hostScopedListAccess } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const Bedroom = list({
  access: hostScopedListAccess('canReadProperties', 'canManageProperties'),
  hooks: hostScopedHooks('canManageProperties'),
  ui: { listView: { initialColumns: ['name', 'accommodationUnit', 'order', 'beds'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization' }),
    accommodationUnit: relationship({ ref: 'AccommodationUnit.bedrooms' }),
    name: text({ validation: { isRequired: true } }),
    order: integer({ defaultValue: 0 }),
    beds: relationship({ ref: 'Bed.bedroom', many: true }),
    ...trackingFields,
  },
});
