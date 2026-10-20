import { list } from '@keystone-6/core';
import { checkbox, integer, relationship, select, text } from '@keystone-6/core/fields';

import { hostScopedListAccess } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const FeeDefinition = list({
  access: hostScopedListAccess('canReadPricing', 'canManagePricing'),
  hooks: hostScopedHooks('canManagePricing', { parent: 'listing' }),
  ui: { listView: { initialColumns: ['name', 'listing', 'feeType', 'calculation', 'amountCents', 'percentageBasisPoints', 'isActive'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization' }),
    listing: relationship({ ref: 'Listing.feeDefinitions' }),
    name: text({ validation: { isRequired: true } }),
    feeType: select({
      type: 'string',
      options: [
        { label: 'Cleaning', value: 'cleaning' },
        { label: 'Service', value: 'service' },
        { label: 'Pet', value: 'pet' },
        { label: 'Extra Guest', value: 'extra_guest' },
        { label: 'Resort', value: 'resort' },
        { label: 'Custom', value: 'custom' },
      ],
      defaultValue: 'cleaning',
    }),
    calculation: select({
      type: 'string',
      options: [
        { label: 'Fixed per stay', value: 'fixed' },
        { label: 'Per night', value: 'per_night' },
        { label: 'Per guest', value: 'per_guest' },
        { label: 'Percentage', value: 'percentage' },
      ],
      defaultValue: 'fixed',
    }),
    amountCents: integer({ defaultValue: 0, validation: { min: 0 } }),
    percentageBasisPoints: integer({ defaultValue: 0, validation: { min: 0 } }),
    taxable: checkbox({ defaultValue: true }),
    required: checkbox({ defaultValue: true }),
    isActive: checkbox({ defaultValue: true }),
    ...trackingFields,
  },
});
