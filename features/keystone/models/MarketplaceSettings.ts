import { list } from '@keystone-6/core';
import { checkbox, float, integer, text } from '@keystone-6/core/fields';

import {
  DEFAULT_STORE_LOGO_COLOR,
  LEGACY_DEFAULT_STORE_LOGO_ICON as DEFAULT_STORE_LOGO_ICON,
  normalizeStoreLogoColor,
} from '../../platform/store-settings/lib/store-logo';
import { normalizeStorefrontAccentHue } from '../../platform/store-settings/lib/theme';
import { isSupportedLocale, isSupportedTimeZone } from '../../platform/store-settings/lib/validation';
import { permissions } from '../access';
import { sanitizeStoreLogoSvg } from '../utils/storeLogo';
import { trackingFields } from './trackingFields';

/** A legal document link must be https:// or a path on this site; the store supplies the document. */
function legalDocumentUrlHook(label: string) {
  return ({ resolvedData, fieldKey, addValidationError }: any) => {
    const value = resolvedData?.[fieldKey];
    if (value === undefined || value === null || value === '') return;
    const valid = typeof value === 'string' && (/^\/[^/\\]/.test(value) || /^https:\/\/[^\s]+$/.test(value));
    if (!valid) addValidationError(`${label} link must start with https:// or be a page on this site (starting with /).`);
  };
}

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
  hooks: {
    // A published legal document carries the version label guests accept or are shown.
    validate: ({ operation, item, resolvedData, addValidationError }: any) => {
      if (operation === 'delete') return;
      const merged = { ...(item || {}), ...(resolvedData || {}) };
      for (const [url, version, label] of [['privacyPolicyUrl', 'privacyPolicyVersion', 'Privacy policy'], ['termsUrl', 'termsVersion', 'Terms of use']] as const) {
        if (String(merged[url] || '').trim() && !String(merged[version] || '').trim()) {
          addValidationError(`${label} needs a version label while its link is published.`);
        }
      }
    },
  },
  ui: {
    isHidden: (args) => !permissions.canManageSettings(args),
    label: 'Store Settings',
    singular: 'Store Settings',
    plural: 'Store Settings',
    // Human labels follow the family's "Store Settings"; the existing records URL is kept.
    path: 'marketplace-settings-items',
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
    supportHours: text({
      validation: { length: { max: 300 } },
      ui: { displayMode: 'textarea', description: 'When guests can expect a reply, shown on the public help page.' },
    }),
    officeAddress: text({
      validation: { length: { max: 300 } },
      ui: { displayMode: 'textarea', description: 'Business mailing or office address shown on the public help page. Leave blank to hide it.' },
    }),
    privacyPolicyUrl: text({
      validation: { length: { max: 500 } },
      hooks: { validate: legalDocumentUrlHook('Privacy policy') },
      ui: { description: 'Link to the store’s published privacy policy (https:// or a page on this site). Shown at sign-up and checkout.' },
    }),
    termsUrl: text({
      validation: { length: { max: 500 } },
      hooks: { validate: legalDocumentUrlHook('Terms of use') },
      ui: { description: 'Link to the store’s published terms of use. Shown at sign-up and checkout.' },
    }),
    privacyPolicyVersion: text({
      validation: { length: { max: 60 } },
      ui: { description: 'Version label of the published privacy policy, for example 2026-10-01. Recorded with each sign-up and booking that showed it.' },
    }),
    termsVersion: text({
      validation: { length: { max: 60 } },
      ui: { description: 'Version label of the published terms of use. Guests accept this exact version at sign-up and checkout.' },
    }),
    allowTestBookings: checkbox({
      defaultValue: false,
      ui: {
        description: 'Lets guests choose an explicit test booking while card checkout runs in Stripe test mode. Test bookings hold no dates, take only test-card payments, and are kept out of real money, statements and reports.',
      },
    }),
    currencyCode: text({ defaultValue: 'USD', validation: { isRequired: true } }),
    locale: text({
      defaultValue: 'en-US',
      validation: { isRequired: true },
      hooks: {
        validate: ({ resolvedData, fieldKey, addValidationError }) => {
          const value = resolvedData?.[fieldKey];
          if (value !== undefined && !isSupportedLocale(value)) addValidationError('Locale must be a supported value such as en-US.');
        },
      },
    }),
    timezone: text({
      defaultValue: 'America/New_York',
      validation: { isRequired: true },
      hooks: {
        // Same rule as the Store Settings form, enforced for every write path.
        validate: ({ resolvedData, fieldKey, addValidationError }) => {
          const value = resolvedData?.[fieldKey];
          if (value !== undefined && !isSupportedTimeZone(value)) addValidationError('Timezone must be a real IANA timezone such as America/New_York.');
        },
      },
    }),
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
      ui: { description: 'Storefront accent hue in degrees (0–359). Store Settings derives it from the logo color.' },
    }),
    logoIcon: text({
      defaultValue: DEFAULT_STORE_LOGO_ICON,
      ui: { description: 'Sanitized SVG used by the storefront header, menu and footer' },
      hooks: {
        resolveInput: ({ resolvedData, fieldKey }) => {
          const value = resolvedData[fieldKey];
          if (value === undefined || value === null || value === '') return value;
          return typeof value === 'string' ? sanitizeStoreLogoSvg(value) : '';
        },
        validate: ({ inputData, resolvedData, fieldKey, addValidationError }) => {
          const submitted = inputData?.[fieldKey];
          if (typeof submitted === 'string' && submitted.trim() && !resolvedData?.[fieldKey]) {
            addValidationError('Logo must be a valid, safe SVG document');
          }
        },
      },
    }),
    logoColor: text({
      defaultValue: DEFAULT_STORE_LOGO_COLOR,
      ui: { description: 'Logo hue rotation in degrees; independent of the storefront accent' },
      hooks: {
        resolveInput: ({ resolvedData, fieldKey }) => {
          const value = resolvedData[fieldKey];
          return value === undefined ? value : normalizeStoreLogoColor(value);
        },
      },
    }),
    isPublished: checkbox({
      defaultValue: true,
      ui: { description: 'Publishes the storefront. While unpublished, browsing, new quotes and new bookings are paused; existing guests can still manage their stays.' },
    }),
    ...trackingFields,
  },
});
