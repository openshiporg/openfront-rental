import { list } from '@keystone-6/core';
import { checkbox, integer, relationship, text } from '@keystone-6/core/fields';

import { hostScopedListAccess } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const SeasonalRate = list({
  access: hostScopedListAccess('canReadPricing', 'canManagePricing'),
  hooks: hostScopedHooks('canManagePricing'),
  ui: { listView: { initialColumns: ['name', 'ratePlan', 'startDate', 'endDate', 'nightlyRateCents', 'priority', 'isActive'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization' }),
    ratePlan: relationship({ ref: 'RatePlan.seasonalRates' }),
    name: text({ validation: { isRequired: true } }),
    startDate: text({ validation: { isRequired: true }, ui: { description: 'Inclusive YYYY-MM-DD.' } }),
    endDate: text({ validation: { isRequired: true }, ui: { description: 'Exclusive YYYY-MM-DD.' } }),
    nightlyRateCents: integer({ validation: { min: 0 } }),
    adjustmentBasisPoints: integer(),
    minimumStay: integer({ validation: { min: 1 } }),
    priority: integer({ defaultValue: 0 }),
    isActive: checkbox({ defaultValue: true }),
    ...trackingFields,
  },
});
