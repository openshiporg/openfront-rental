import { list } from '@keystone-6/core';
import { integer, relationship, select } from '@keystone-6/core/fields';

import { hostScopedListAccess } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const Bed = list({
  access: hostScopedListAccess('canReadProperties', 'canManageProperties'),
  hooks: hostScopedHooks('canManageProperties'),
  ui: { listView: { initialColumns: ['bedroom', 'bedType', 'quantity'] } },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization' }),
    bedroom: relationship({ ref: 'Bedroom.beds' }),
    bedType: select({
      type: 'string',
      options: [
        { label: 'King', value: 'king' },
        { label: 'Queen', value: 'queen' },
        { label: 'Double', value: 'double' },
        { label: 'Single', value: 'single' },
        { label: 'Bunk', value: 'bunk' },
        { label: 'Sofa Bed', value: 'sofa_bed' },
        { label: 'Floor Mattress', value: 'floor_mattress' },
        { label: 'Crib', value: 'crib' },
      ],
      defaultValue: 'queen',
    }),
    quantity: integer({ defaultValue: 1, validation: { min: 1 } }),
    ...trackingFields,
  },
});
