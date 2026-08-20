import { normalizeStorefrontAccentHue } from '../../platform/store-settings/lib/theme';

const PUBLIC_SETTINGS_PROJECTION = [
  'id',
  'name',
  'tagline',
  'homepageHeadline',
  'publicDescription',
  'supportEmail',
  'supportPhone',
  'currencyCode',
  'locale',
  'timezone',
  'defaultMapLatitude',
  'defaultMapLongitude',
  'accentHue',
  'isPublished',
].join(' ');

export async function publicMarketplaceSettings(_root: unknown, _args: unknown, context: any) {
  // This is the only anonymous MarketplaceSettings read. sudo is intentionally
  // bounded to singleton id 1 and the explicit public projection above.
  const settings = await context.sudo().query.MarketplaceSettings.findOne({
    where: { id: '1' },
    query: PUBLIC_SETTINGS_PROJECTION,
  });

  if (!settings) return { status: 'unconfigured' };
  if (!settings.isPublished) return { status: 'unpublished' };

  return {
    status: 'published',
    id: settings.id,
    name: settings.name,
    tagline: settings.tagline,
    homepageHeadline: settings.homepageHeadline,
    publicDescription: settings.publicDescription,
    supportEmail: settings.supportEmail,
    supportPhone: settings.supportPhone,
    currencyCode: settings.currencyCode,
    locale: settings.locale,
    timezone: settings.timezone,
    defaultMapLatitude: settings.defaultMapLatitude,
    defaultMapLongitude: settings.defaultMapLongitude,
    accentHue: normalizeStorefrontAccentHue(settings.accentHue),
  };
}
