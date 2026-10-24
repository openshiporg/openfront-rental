import { DEFAULT_STORE_LOGO_ICON, normalizeStoreLogoColor } from '@/features/platform/store-settings/lib/store-logo';
import { storefrontAccentHueFromLogoColor } from '@/features/platform/store-settings/lib/theme';
import type { PublicMarketplaceSettingsState } from './data/marketplace';

function clean(value?: string | null) {
  return value?.trim() || '';
}

// Reserved for documentation (RFC 2606/6761); mail to them can never arrive.
const PLACEHOLDER_EMAIL_DOMAIN = /@(?:[^@\s]+\.)?(?:example\.(?:com|net|org)|example|test|invalid|localhost)$/i;

/** A support address guests can actually write to, or '' for a placeholder. */
export function reachableSupportEmail(value?: string | null) {
  const email = clean(value);
  return email && !PLACEHOLDER_EMAIL_DOMAIN.test(email) ? email : '';
}

/** A support phone guests can actually call, or '' for a fictional NANP 555-01xx number. */
export function reachableSupportPhone(value?: string | null) {
  const phone = clean(value);
  const digits = phone.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return digits.length === 10 && /^\d{3}55501\d{2}$/.test(digits) ? '' : phone;
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
    phone: reachableSupportPhone(settings.supportPhone),
    email: reachableSupportEmail(settings.supportEmail),
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
