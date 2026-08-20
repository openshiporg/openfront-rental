import { list } from '@keystone-6/core';
import { relationship, select, text } from '@keystone-6/core/fields';

import { permissions } from '../access';
import { trackingFields } from './trackingFields';

export const Amenity = list({
  access: {
    operation: {
      query: permissions.canReadListings,
      create: permissions.canManageListings,
      update: permissions.canManageListings,
      delete: permissions.canManageListings,
    },
  },
  ui: { listView: { initialColumns: ['name', 'category', 'iconKey', 'listings'] } },
  fields: {
    name: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    slug: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    category: select({
      type: 'string',
      options: [
        { label: 'Essentials', value: 'essentials' },
        { label: 'Kitchen', value: 'kitchen' },
        { label: 'Outdoor', value: 'outdoor' },
        { label: 'Parking', value: 'parking' },
        { label: 'Family', value: 'family' },
        { label: 'Accessibility', value: 'accessibility' },
        { label: 'Safety', value: 'safety' },
        { label: 'Entertainment', value: 'entertainment' },
        { label: 'Workspace', value: 'workspace' },
      ],
      defaultValue: 'essentials',
    }),
    iconKey: text(),
    listings: relationship({ ref: 'Listing.amenities', many: true }),
    ...trackingFields,
  },
});
