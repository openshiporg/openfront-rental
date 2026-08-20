export const DEFAULT_STOREFRONT_ACCENT_HUE = 155;

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
