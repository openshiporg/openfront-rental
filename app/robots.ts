import type { MetadataRoute } from 'next';

import { resolveStorefrontBrand } from '@/features/storefront/lib/brand';
import { getPublicMarketplaceSettings } from '@/features/storefront/lib/data/marketplace';
import { storefrontOrigin } from '@/features/storefront/lib/site-url';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const brand = resolveStorefrontBrand(await getPublicMarketplaceSettings());
  if (!brand) return { rules: { userAgent: '*', disallow: '/' } };
  const origin = await storefrontOrigin();
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Private guest links, checkout and the host workspace stay out of search.
      disallow: ['/dashboard', '/api/', '/account', '/checkout/', '/trips/', '/agreements/', '/messages/'],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
