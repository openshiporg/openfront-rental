import { LOGO_ICONS } from './untitled-logo-registry';

// Unsaved stores use 3Portals from the donor library, without a settings write.
export const DEFAULT_STORE_LOGO_ICON = LOGO_ICONS.find((icon) => icon.id === '3portals')!.lightSvg;
// Forest hue rotation, independent of the storefront accent.
export const DEFAULT_LIBRARY_LOGO_COLOR = '266';
export const DEFAULT_STORE_LOGO_COLOR = '0';

// Historical database default, not a picker entry. Keep its schema default stable;
// only the untouched value (original color) is treated as an unsaved choice.
export const LEGACY_DEFAULT_STORE_LOGO_ICON = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" height="100%" width="100%" viewBox="0 0 42 48"><path fill="#155eef" fill-rule="evenodd" d="m22.102 20.86 9.9-9.9L29.88 8.84l-7.339 7.339V3h-3v13.178l-7.339-7.34-2.121 2.122 9.9 9.9 1.06 1.06zm2.12 2.121 9.9-9.9 2.121 2.122-7.339 7.339H42v3H28.904l7.34 7.339L34.121 35l-9.9-9.899-1.06-1.06zM7.96 35.001l9.9-9.899 1.06-1.06-1.06-1.061-9.9-9.9-2.121 2.122 7.339 7.339H.002v3h13.176l-7.34 7.339zm12.02-7.777-9.9 9.9 2.122 2.12 7.339-7.338V45h3V31.906l7.339 7.338L32 37.124l-9.9-9.9-1.06-1.061z" clip-rule="evenodd"/></svg>';
export function usesDefaultStoreLogo(icon: unknown, color: unknown): boolean {
  return !icon || (icon === LEGACY_DEFAULT_STORE_LOGO_ICON && normalizeStoreLogoColor(color) === '0');
}

// This module is intentionally browser-safe. SVG sanitization lives in
// ./sanitize-store-logo (shared with the Store Settings preview) and is enforced by the MarketplaceSettings model.
export function normalizeStoreLogoColor(value: unknown): string {
  const numeric = Number.parseFloat(String(value ?? DEFAULT_STORE_LOGO_COLOR));
  if (!Number.isFinite(numeric)) return DEFAULT_STORE_LOGO_COLOR;
  return String(((numeric % 360) + 360) % 360);
}
