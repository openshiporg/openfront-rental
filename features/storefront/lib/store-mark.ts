import { sanitizeStoreLogoSvg } from '@/features/platform/store-settings/lib/sanitize-store-logo';
import { LEGACY_DEFAULT_STORE_LOGO_ICON } from '@/features/platform/store-settings/lib/store-logo';

/** Restaurant's own-mark rule: render a safe store choice, never a platform placeholder. */
export function storeOwnMark(logoIcon: string | null | undefined): string {
  const raw = (logoIcon || '').trim();
  if (!raw || raw === LEGACY_DEFAULT_STORE_LOGO_ICON) return '';
  const svg = sanitizeStoreLogoSvg(raw);
  return svg && svg !== sanitizeStoreLogoSvg(LEGACY_DEFAULT_STORE_LOGO_ICON) ? svg : '';
}
