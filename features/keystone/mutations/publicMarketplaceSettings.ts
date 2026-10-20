import { DEFAULT_STORE_LOGO_ICON, DEFAULT_LIBRARY_LOGO_COLOR, usesDefaultStoreLogo, normalizeStoreLogoColor } from '../../platform/store-settings/lib/store-logo';
import { storefrontAccentHueFromLogoColor } from '../../platform/store-settings/lib/theme';
import { sanitizeStoreLogoSvg } from '../utils/storeLogo';
import { stripeCheckoutEnabled } from '../../integrations/payment/stripe';

const PUBLIC_SETTINGS_PROJECTION = [
  'id',
  'name',
  'tagline',
  'homepageHeadline',
  'publicDescription',
  'supportEmail',
  'supportPhone',
  'supportHours',
  'officeAddress',
  'privacyPolicyUrl',
  'privacyPolicyVersion',
  'termsUrl',
  'termsVersion',
  'allowTestBookings',
  'currencyCode',
  'locale',
  'timezone',
  'defaultMapLatitude',
  'defaultMapLongitude',
  'accentHue',
  'logoIcon',
  'logoColor',
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

  const savedLogo = !usesDefaultStoreLogo(settings.logoIcon, settings.logoColor) && typeof settings.logoIcon === 'string'
    ? sanitizeStoreLogoSvg(settings.logoIcon) : '';
  const logoColor = savedLogo ? normalizeStoreLogoColor(settings.logoColor) : DEFAULT_LIBRARY_LOGO_COLOR;
  return {
    status: 'published',
    id: settings.id,
    name: settings.name,
    tagline: settings.tagline,
    homepageHeadline: settings.homepageHeadline,
    publicDescription: settings.publicDescription,
    supportEmail: settings.supportEmail,
    supportPhone: settings.supportPhone,
    supportHours: settings.supportHours || null,
    officeAddress: settings.officeAddress || null,
    // A document is published only with both its link and its version label.
    privacyPolicyUrl: settings.privacyPolicyUrl && settings.privacyPolicyVersion ? settings.privacyPolicyUrl : null,
    privacyPolicyVersion: settings.privacyPolicyUrl && settings.privacyPolicyVersion ? settings.privacyPolicyVersion : null,
    termsUrl: settings.termsUrl && settings.termsVersion ? settings.termsUrl : null,
    termsVersion: settings.termsUrl && settings.termsVersion ? settings.termsVersion : null,
    // Test bookings need the store's permission and card checkout in Stripe test mode.
    testBookingsAvailable: settings.allowTestBookings === true && stripeCheckoutEnabled(),
    currencyCode: settings.currencyCode,
    locale: settings.locale,
    timezone: settings.timezone,
    defaultMapLatitude: settings.defaultMapLatitude,
    defaultMapLongitude: settings.defaultMapLongitude,
    // The logo colour is the storefront's brand colour, for built-in and external storefronts alike.
    accentHue: storefrontAccentHueFromLogoColor(logoColor),
    // Re-sanitized on read; an empty or unsafe stored value falls back to the library default.
    logoIcon: savedLogo || DEFAULT_STORE_LOGO_ICON,
    logoColor,
  };
}
