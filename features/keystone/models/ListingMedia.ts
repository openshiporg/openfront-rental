import { list } from '@keystone-6/core';
import { image, integer, json, relationship, text } from '@keystone-6/core/fields';

import { hostScopedListAccess } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const ListingMedia = list({
  access: hostScopedListAccess('canReadListings', 'canManageListings'),
  hooks: hostScopedHooks('canManageListings'),
  ui: { listView: { initialColumns: ['listing', 'image', 'imagePath', 'altText', 'order'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization' }),
    listing: relationship({ ref: 'Listing.media' }),
    image: image({ storage: 'my_images' }),
    imagePath: text({ isIndexed: 'unique' }),
    altText: text({ validation: { isRequired: true } }),
    caption: text(),
    order: integer({ defaultValue: 0 }),
    metadata: json(),
    ...trackingFields,
  },
});
