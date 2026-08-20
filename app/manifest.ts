import type { MetadataRoute } from 'next';

import { storefrontThemeColor } from '@/features/platform/store-settings/lib/theme';
import { resolveStorefrontBrand } from '@/features/storefront/lib/brand';
import { getPublicMarketplaceSettings } from '@/features/storefront/lib/data/marketplace';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const brand = resolveStorefrontBrand(await getPublicMarketplaceSettings());
  const name = brand?.name || 'Independent stays';
  return {
    name,
    short_name: name,
    description: brand?.description || 'Short-term accommodation booked directly with the host.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f0e7',
    theme_color: brand ? storefrontThemeColor(brand.accentHue) : '#292929',
    icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
