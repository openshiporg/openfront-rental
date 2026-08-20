import { list } from '@keystone-6/core';
import { checkbox, float, relationship, text } from '@keystone-6/core/fields';

import { hostScopedListAccess } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const PropertyAddress = list({
  access: hostScopedListAccess('canReadProperties', 'canManageProperties'),
  hooks: hostScopedHooks('canManageProperties'),
  ui: { listView: { initialColumns: ['property', 'city', 'region', 'countryCode', 'showExactAddressPublicly'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization' }),
    property: relationship({ ref: 'Property.address' }),
    addressLine1: text(),
    addressLine2: text(),
    city: text({ validation: { isRequired: true } }),
    region: text(),
    postalCode: text(),
    countryCode: text({ validation: { isRequired: true }, defaultValue: 'US' }),
    latitude: float(),
    longitude: float(),
    publicLocationLabel: text(),
    showExactAddressPublicly: checkbox({ defaultValue: false }),
    ...trackingFields,
  },
});
