import { sanitizeStoreLogoSvg } from './sanitize-store-logo';
import { DEFAULT_STORE_LOGO_ICON, normalizeStoreLogoColor } from './store-logo';
import { storefrontAccentHueFromLogoColor } from './theme';

export type MarketplaceSettingsInput = {
  name: string;
  tagline: string;
  homepageHeadline: string;
  publicDescription: string;
  supportEmail: string;
  supportPhone: string;
  supportHours: string;
  officeAddress: string;
  privacyPolicyUrl: string;
  privacyPolicyVersion: string;
  termsUrl: string;
  termsVersion: string;
  allowTestBookings: boolean;
  currencyCode: string;
  locale: string;
  timezone: string;
  defaultMapLatitude: number | null;
  defaultMapLongitude: number | null;
  accentHue: number;
  logoIcon: string;
  logoColor: string;
  isPublished: boolean;
};

export type MarketplaceSettingsValidation =
  | { ok: true; data: MarketplaceSettingsInput }
  | { ok: false; error: string };

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function optionalCoordinate(raw: string, label: string, minimum: number, maximum: number) {
  if (!raw) return { ok: true as const, value: null };
  const value = Number(raw);
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    return { ok: false as const, error: `${label} must be between ${minimum} and ${maximum}.` };
  }
  return { ok: true as const, value };
}

export function parseMarketplaceSettingsForm(formData: FormData): MarketplaceSettingsValidation {
  const name = text(formData, 'name');
  const tagline = text(formData, 'tagline');
  const homepageHeadline = text(formData, 'homepageHeadline');
  const publicDescription = text(formData, 'publicDescription');
  const supportEmail = text(formData, 'supportEmail').toLowerCase();
  const supportPhone = text(formData, 'supportPhone');
  const supportHours = text(formData, 'supportHours');
  const officeAddress = text(formData, 'officeAddress');
  const privacyPolicyUrl = text(formData, 'privacyPolicyUrl');
  const termsUrl = text(formData, 'termsUrl');
  const privacyPolicyVersion = text(formData, 'privacyPolicyVersion');
  const termsVersion = text(formData, 'termsVersion');
  const currencyCode = text(formData, 'currencyCode').toUpperCase();
  const locale = text(formData, 'locale');
  const timezone = text(formData, 'timezone');

  if (name.length < 2 || name.length > 120) return { ok: false, error: 'Storefront name must be 2–120 characters.' };
  if (tagline.length > 160) return { ok: false, error: 'Tagline must be 160 characters or fewer.' };
  if (homepageHeadline.length < 2 || homepageHeadline.length > 160) return { ok: false, error: 'Homepage headline must be 2–160 characters.' };
  if (publicDescription.length > 1000) return { ok: false, error: 'Public description must be 1,000 characters or fewer.' };
  if (supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) return { ok: false, error: 'Support email must be a valid email address.' };
  if (supportPhone.length > 80) return { ok: false, error: 'Support phone must be 80 characters or fewer.' };
  if (supportHours.length > 300) return { ok: false, error: 'Support hours must be 300 characters or fewer.' };
  if (officeAddress.length > 300) return { ok: false, error: 'Office address must be 300 characters or fewer.' };
  for (const [label, value, version] of [['Privacy policy', privacyPolicyUrl, privacyPolicyVersion], ['Terms of use', termsUrl, termsVersion]] as const) {
    if (value && (value.length > 500 || !(/^\/[^/\\]/.test(value) || /^https:\/\/\S+$/.test(value)))) {
      return { ok: false, error: `${label} link must start with https:// or be a page on this site (starting with /).` };
    }
    if (version.length > 60) return { ok: false, error: `${label} version must be 60 characters or fewer.` };
    if (value && !version) return { ok: false, error: `${label} needs a version label, such as its publication date, while its link is set.` };
  }
  if (!/^[A-Z]{3}$/.test(currencyCode)) return { ok: false, error: 'Currency must be a three-letter ISO code.' };
  if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})+$/.test(locale) || !isSupportedLocale(locale)) return { ok: false, error: 'Locale must be a supported value such as en-US.' };
  if (!isSupportedTimeZone(timezone)) return { ok: false, error: 'Timezone must be a real IANA timezone such as America/New_York.' };

  const latitude = optionalCoordinate(text(formData, 'defaultMapLatitude'), 'Latitude', -90, 90);
  if (!latitude.ok) return latitude;
  const longitude = optionalCoordinate(text(formData, 'defaultMapLongitude'), 'Longitude', -180, 180);
  if (!longitude.ok) return longitude;
  // Same allow-list as the model hook, checked here so the operator gets a clear message.
  const submittedLogo = text(formData, 'logoIcon');
  const logoIcon = submittedLogo ? sanitizeStoreLogoSvg(submittedLogo) : DEFAULT_STORE_LOGO_ICON;
  if (!logoIcon) return { ok: false, error: 'Logo must be a complete, safe SVG. Scripts, links, styles, event handlers and external assets are not allowed.' };

  return {
    ok: true,
    data: {
      name,
      tagline,
      homepageHeadline,
      publicDescription,
      supportEmail,
      supportPhone,
      supportHours,
      officeAddress,
      privacyPolicyUrl,
      privacyPolicyVersion: privacyPolicyUrl ? privacyPolicyVersion : '',
      termsUrl,
      termsVersion: termsUrl ? termsVersion : '',
      allowTestBookings: formData.get('allowTestBookings') === 'on',
      currencyCode,
      locale,
      timezone,
      defaultMapLatitude: latitude.value,
      defaultMapLongitude: longitude.value,
      // Saved for consistency; the storefront derives its accent from the logo colour.
      accentHue: storefrontAccentHueFromLogoColor(formData.get('logoColor')),
      logoIcon,
      logoColor: normalizeStoreLogoColor(formData.get('logoColor')),
      isPublished: formData.get('isPublished') === 'on',
    },
  };
}

/** A timezone the runtime actually knows (not just slash-shaped text). */
export function isSupportedTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || !value || value.length > 100) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function isSupportedLocale(value: unknown): value is string {
  if (typeof value !== 'string' || !value || value.length > 35) return false;
  try {
    return Intl.getCanonicalLocales(value).length === 1 && Intl.NumberFormat.supportedLocalesOf(value).length === 1;
  } catch {
    return false;
  }
}
