import { normalizeStorefrontAccentHue } from '@/features/platform/store-settings/lib/theme';
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
    accentHue: normalizeStorefrontAccentHue(settings.accentHue),
  };
}

export function phoneHref(phone: string) {
  const normalized = phone.replace(/[^+\d]/g, '');
  return normalized ? `tel:${normalized}` : '';
}
