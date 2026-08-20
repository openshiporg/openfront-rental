import { list } from '@keystone-6/core';
import { integer, json, relationship, select, text } from '@keystone-6/core/fields';

import { hostScopedListAccess } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const CancellationPolicy = list({
  access: hostScopedListAccess('canReadPricing', 'canManagePricing'),
  hooks: hostScopedHooks('canManagePricing'),
  ui: { listView: { initialColumns: ['name', 'hostOrganization', 'policyType', 'version', 'ratePlans'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization.cancellationPolicies' }),
    name: text({ validation: { isRequired: true } }),
    version: text({ validation: { isRequired: true } }),
    policyType: select({
      type: 'string',
      options: [
        { label: 'Flexible', value: 'flexible' },
        { label: 'Moderate', value: 'moderate' },
        { label: 'Firm', value: 'firm' },
        { label: 'Strict', value: 'strict' },
        { label: 'Non-refundable', value: 'non_refundable' },
        { label: 'Custom', value: 'custom' },
      ],
      defaultValue: 'moderate',
    }),
    summary: text({ ui: { displayMode: 'textarea' } }),
    fullTerms: text({ ui: { displayMode: 'textarea' } }),
    freeCancellationHours: integer({ defaultValue: 24, validation: { min: 0 } }),
    rules: json({ ui: { description: 'Versioned refund-window rules in integer basis points.' } }),
    ratePlans: relationship({ ref: 'RatePlan.cancellationPolicy', many: true }),
    agreements: relationship({ ref: 'StayAgreement.cancellationPolicy', many: true }),
    ...trackingFields,
  },
});
