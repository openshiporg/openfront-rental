import { sanitizeStoreLogoSvg } from '../lib/sanitize-store-logo';
import { normalizeStoreLogoColor } from '../lib/store-logo';

/**
 * The single logo renderer for the storefront header, mobile menu, footer and
 * the Store Settings preview. Like Restaurant's StoreBrand it applies the saved
 * logo color as a hue rotation, but it re-runs the allow-list sanitizer at
 * render so stored or draft markup that fails validation is never inserted.
 */
export function StoreLogoMark({ logoIcon, logoColor, className }: { logoIcon?: string | null; logoColor?: string | null; className?: string }) {
  const svg = logoIcon ? sanitizeStoreLogoSvg(logoIcon) : '';
  if (!svg) return null;
  return (
    <span
      className={className}
      style={{ filter: `hue-rotate(${normalizeStoreLogoColor(logoColor)}deg)` }}
      dangerouslySetInnerHTML={{ __html: svg }}
      aria-hidden="true"
    />
  );
}
