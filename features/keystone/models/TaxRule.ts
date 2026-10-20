import { list } from '@keystone-6/core';
import { checkbox, integer, relationship, text } from '@keystone-6/core/fields';

import { hostScopedListAccess } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const TaxRule = list({
  access: hostScopedListAccess('canReadPricing', 'canManagePricing'),
  hooks: hostScopedHooks('canManagePricing', { parent: 'listing' }),
  ui: { listView: { initialColumns: ['name', 'listing', 'jurisdiction', 'rateBasisPoints', 'isActive'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization' }),
    listing: relationship({ ref: 'Listing.taxRules' }),
    name: text({ validation: { isRequired: true } }),
    jurisdiction: text(),
    registrationNumber: text(),
    rateBasisPoints: integer({ validation: { isRequired: true, min: 0 } }),
    isInclusive: checkbox({ defaultValue: false }),
    isActive: checkbox({ defaultValue: true }),
    ...trackingFields,
  },
});
