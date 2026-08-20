import { list } from '@keystone-6/core';
import { checkbox, relationship, text } from '@keystone-6/core/fields';

import { permissions } from '../access';
import { trackingFields } from './trackingFields';

export const StayCollection = list({
  access: {
    operation: {
      query: permissions.canReadListings,
      create: permissions.canManageListings,
      update: permissions.canManageListings,
      delete: permissions.canManageListings,
    },
  },
  ui: { listView: { initialColumns: ['name', 'slug', 'isActive', 'listings'] } },
  fields: {
    name: text({ validation: { isRequired: true } }),
    slug: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    description: text({ ui: { displayMode: 'textarea' } }),
    isActive: checkbox({ defaultValue: true }),
    listings: relationship({ ref: 'Listing.collections', many: true }),
    ...trackingFields,
  },
});
