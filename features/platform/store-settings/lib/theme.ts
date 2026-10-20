import { normalizeStoreLogoColor } from './store-logo';

export const DEFAULT_STOREFRONT_ACCENT_HUE = 155;

/**
 * The storefront accent follows the logo colour, as in Restaurant's MainLayout
 * (normalizeStoreLogoColor → brandHue). Library logos are drawn in indigo, so the
 * logo's hue rotation is added to that base; the default forest logo (266°) lands
 * on the forest accent (155°).
 */
export const LOGO_LIBRARY_BASE_HUE = 249;

export const STOREFRONT_ACCENT_PRESETS = [
  { label: 'Terracotta', value: 28 },
  { label: 'Ochre', value: 68 },
  { label: 'Forest', value: 155 },
  { label: 'Coast', value: 205 },
  { label: 'Indigo', value: 265 },
  { label: 'Plum', value: 320 },
] as const;

export function normalizeStorefrontAccentHue(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_STOREFRONT_ACCENT_HUE;
  const rounded = Math.round(numeric);
  return ((rounded % 360) + 360) % 360;
}

export function storefrontThemeColor(value: unknown): string {
  return `hsl(${normalizeStorefrontAccentHue(value)} 35% 22%)`;
}

export function storefrontAccentHueFromLogoColor(logoColor: unknown): number {
  return normalizeStorefrontAccentHue(LOGO_LIBRARY_BASE_HUE + Number(normalizeStoreLogoColor(logoColor)));
}

/** The logo colour that produces a given storefront accent hue. */
export function logoColorForAccentHue(hue: unknown): string {
  return normalizeStoreLogoColor(normalizeStorefrontAccentHue(hue) - LOGO_LIBRARY_BASE_HUE);
}
