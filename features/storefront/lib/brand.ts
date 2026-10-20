import { DEFAULT_STORE_LOGO_ICON, normalizeStoreLogoColor } from '@/features/platform/store-settings/lib/store-logo';
import { storefrontAccentHueFromLogoColor } from '@/features/platform/store-settings/lib/theme';
import type { PublicMarketplaceSettingsState } from './data/marketplace';

function clean(value?: string | null) {
  return value?.trim() || '';
}

export function resolveStorefrontBrand(settings: PublicMarketplaceSettingsState) {
  if (settings.status !== 'published') return null;

  const name = clean(settings.name);
  const homepageHeadline = clean(settings.homepageHeadline);
  const currencyCode = clean(settings.currencyCode);
  const locale = clean(settings.locale);
  const timezone = clean(settings.timezone);
  if (!name || !homepageHeadline || !currencyCode || !locale || !timezone) return null;

  return {
    name,
    tagline: clean(settings.tagline),
    homepageHeadline,
    description: clean(settings.publicDescription),
    phone: clean(settings.supportPhone),
    email: clean(settings.supportEmail),
    currencyCode,
    locale,
    timezone,
    // The accent follows the logo colour (Restaurant MainLayout's brandHue).
    // StoreLogoMark sanitizes the SVG again before it reaches the page.
    accentHue: storefrontAccentHueFromLogoColor(settings.logoColor),
    logoIcon: settings.logoIcon || DEFAULT_STORE_LOGO_ICON,
    logoColor: normalizeStoreLogoColor(settings.logoColor),
  };
}

export function phoneHref(phone: string) {
  const normalized = phone.replace(/[^+\d]/g, '');
  return normalized ? `tel:${normalized}` : '';
}
