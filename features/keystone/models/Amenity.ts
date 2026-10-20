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
  ui: { listView: { initialColumns: ['name', 'category', 'iconKey'] } },
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
    // Hosts attach amenities from their own listings; a global amenity can't rewire other hosts' listings.
    listings: relationship({ ref: 'Listing.amenities', many: true, access: { create: () => false, update: () => false }, ui: { displayMode: 'count' } }),
    ...trackingFields,
  },
});
