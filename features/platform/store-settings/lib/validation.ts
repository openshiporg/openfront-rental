import { normalizeStorefrontAccentHue } from './theme';

export type MarketplaceSettingsInput = {
  name: string;
  tagline: string;
  homepageHeadline: string;
  publicDescription: string;
  supportEmail: string;
  supportPhone: string;
  currencyCode: string;
  locale: string;
  timezone: string;
  defaultMapLatitude: number | null;
  defaultMapLongitude: number | null;
  accentHue: number;
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
  const currencyCode = text(formData, 'currencyCode').toUpperCase();
  const locale = text(formData, 'locale');
  const timezone = text(formData, 'timezone');

  if (name.length < 2 || name.length > 120) return { ok: false, error: 'Storefront name must be 2–120 characters.' };
  if (tagline.length > 160) return { ok: false, error: 'Tagline must be 160 characters or fewer.' };
  if (homepageHeadline.length < 2 || homepageHeadline.length > 160) return { ok: false, error: 'Homepage headline must be 2–160 characters.' };
  if (publicDescription.length > 1000) return { ok: false, error: 'Public description must be 1,000 characters or fewer.' };
  if (supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) return { ok: false, error: 'Support email must be a valid email address.' };
  if (supportPhone.length > 80) return { ok: false, error: 'Support phone must be 80 characters or fewer.' };
  if (!/^[A-Z]{3}$/.test(currencyCode)) return { ok: false, error: 'Currency must be a three-letter ISO code.' };
  if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})+$/.test(locale)) return { ok: false, error: 'Locale must use a value such as en-US.' };
  if (!/^[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)+$/.test(timezone)) return { ok: false, error: 'Timezone must be an IANA value such as America/New_York.' };

  const latitude = optionalCoordinate(text(formData, 'defaultMapLatitude'), 'Latitude', -90, 90);
  if (!latitude.ok) return latitude;
  const longitude = optionalCoordinate(text(formData, 'defaultMapLongitude'), 'Longitude', -180, 180);
  if (!longitude.ok) return longitude;

  return {
    ok: true,
    data: {
      name,
      tagline,
      homepageHeadline,
      publicDescription,
      supportEmail,
      supportPhone,
      currencyCode,
      locale,
      timezone,
      defaultMapLatitude: latitude.value,
      defaultMapLongitude: longitude.value,
      accentHue: normalizeStorefrontAccentHue(formData.get('accentHue')),
      isPublished: formData.get('isPublished') === 'on',
    },
  };
}
