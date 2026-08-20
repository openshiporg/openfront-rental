import { list } from '@keystone-6/core';
import { checkbox, integer, relationship, select, text } from '@keystone-6/core/fields';

import { hostScopedListAccess } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const RatePlan = list({
  access: hostScopedListAccess('canReadPricing', 'canManagePricing'),
  hooks: hostScopedHooks('canManagePricing'),
  ui: { listView: { initialColumns: ['name', 'listing', 'baseNightlyRateCents', 'minimumStay', 'status'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization' }),
    listing: relationship({ ref: 'Listing.ratePlans' }),
    cancellationPolicy: relationship({ ref: 'CancellationPolicy.ratePlans' }),
    name: text({ validation: { isRequired: true } }),
    description: text({ ui: { displayMode: 'textarea' } }),
    status: select({
      type: 'string',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Active', value: 'active' },
        { label: 'Archived', value: 'archived' },
      ],
      defaultValue: 'draft',
    }),
    currencyCode: text({ defaultValue: 'USD', validation: { isRequired: true } }),
    baseNightlyRateCents: integer({ defaultValue: 0, validation: { min: 0 } }),
    minimumStay: integer({ defaultValue: 1, validation: { min: 1 } }),
    maximumStay: integer({ validation: { min: 1 } }),
    advanceNoticeHours: integer({ defaultValue: 24, validation: { min: 0 } }),
    bookingWindowDays: integer({ defaultValue: 365, validation: { min: 1 } }),
    isDefault: checkbox({ defaultValue: false }),
    seasonalRates: relationship({ ref: 'SeasonalRate.ratePlan', many: true }),
    quotes: relationship({ ref: 'StayQuote.ratePlan', many: true }),
    ...trackingFields,
  },
});
