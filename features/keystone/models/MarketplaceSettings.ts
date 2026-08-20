import { list } from '@keystone-6/core';
import { checkbox, float, integer, text } from '@keystone-6/core/fields';

import { normalizeStorefrontAccentHue } from '../../platform/store-settings/lib/theme';
import { permissions } from '../access';
import { trackingFields } from './trackingFields';

export const MarketplaceSettings = list({
  isSingleton: true,
  graphql: { plural: 'marketplaceSettingsItems' },
  access: {
    operation: {
      query: permissions.canManageSettings,
      create: permissions.canManageSettings,
      update: permissions.canManageSettings,
      delete: permissions.canManageSettings,
    },
  },
  ui: {
    isHidden: (args) => !permissions.canManageSettings(args),
    label: 'Marketplace Settings',
    singular: 'Marketplace Settings',
    plural: 'Marketplace Settings Items',
    labelField: 'name',
    listView: { initialColumns: ['name', 'tagline', 'currencyCode', 'isPublished'] },
  },
  fields: {
    name: text({ validation: { isRequired: true, length: { min: 2, max: 120 } } }),
    tagline: text({ validation: { length: { max: 160 } } }),
    homepageHeadline: text({
      defaultValue: 'Stay somewhere considered.',
      validation: { isRequired: true, length: { min: 2, max: 160 } },
    }),
    publicDescription: text({ validation: { length: { max: 1000 } }, ui: { displayMode: 'textarea' } }),
    supportEmail: text(),
    supportPhone: text(),
    currencyCode: text({ defaultValue: 'USD', validation: { isRequired: true } }),
    locale: text({ defaultValue: 'en-US', validation: { isRequired: true } }),
    timezone: text({ defaultValue: 'America/New_York', validation: { isRequired: true } }),
    defaultMapLatitude: float({ validation: { min: -90, max: 90 } }),
    defaultMapLongitude: float({ validation: { min: -180, max: 180 } }),
    accentHue: integer({
      defaultValue: 155,
      validation: { isRequired: true, min: 0, max: 359 },
      hooks: {
        resolveInput: ({ resolvedData, fieldKey }) => {
          const value = resolvedData[fieldKey];
          return value === undefined ? value : normalizeStorefrontAccentHue(value);
        },
      },
      ui: { description: 'Storefront accent hue in degrees (0–359).' },
    }),
    isPublished: checkbox({
      defaultValue: true,
      ui: { description: 'Publishes only the storefront identity and theme. Listing availability and payment state remain evidence-driven.' },
    }),
    ...trackingFields,
  },
});
