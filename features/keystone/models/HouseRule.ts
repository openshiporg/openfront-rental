import { list } from '@keystone-6/core';
import { checkbox, relationship, select, text } from '@keystone-6/core/fields';

import { hostScopedListAccess } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const HouseRule = list({
  access: hostScopedListAccess('canReadListings', 'canManageListings'),
  hooks: hostScopedHooks('canManageListings'),
  ui: { listView: { initialColumns: ['listing', 'ruleType', 'title', 'isAllowed'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization' }),
    listing: relationship({ ref: 'Listing.houseRules' }),
    ruleType: select({
      type: 'string',
      options: [
        { label: 'Smoking', value: 'smoking' },
        { label: 'Pets', value: 'pets' },
        { label: 'Events', value: 'events' },
        { label: 'Quiet Hours', value: 'quiet_hours' },
        { label: 'Maximum Guests', value: 'maximum_guests' },
        { label: 'Check-in', value: 'check_in' },
        { label: 'Check-out', value: 'check_out' },
        { label: 'Custom', value: 'custom' },
      ],
      defaultValue: 'custom',
    }),
    title: text({ validation: { isRequired: true } }),
    description: text({ ui: { displayMode: 'textarea' } }),
    isAllowed: checkbox(),
    isRequired: checkbox({ defaultValue: true }),
    ...trackingFields,
  },
});
