import type { MetadataRoute } from 'next';

import { resolveStorefrontBrand } from '@/features/storefront/lib/brand';
import { getPublicMarketplaceSettings } from '@/features/storefront/lib/data/marketplace';
import { searchPublicStays } from '@/features/storefront/lib/data/stays';
import { storefrontOrigin } from '@/features/storefront/lib/site-url';

export const dynamic = 'force-dynamic';

const PAGE = 100;
const MAX_STAYS = 5000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const brand = resolveStorefrontBrand(await getPublicMarketplaceSettings());
  if (!brand) return [];
  const origin = await storefrontOrigin();
  const slugs: string[] = [];
  let collections: Array<{ slug: string }> = [];
  for (let offset = 0; offset < MAX_STAYS; offset += PAGE) {
    const page = await searchPublicStays({ offset, limit: PAGE });
    if (page.error) break;
    if (!offset) collections = page.collections;
    // Homes without a published photo aren't ready to promote to search engines.
    slugs.push(...page.results.filter((stay) => stay.slug && (stay.thumbnail || stay.media?.some((photo) => photo?.url))).map((stay) => stay.slug));
    if (page.results.length < PAGE || offset + PAGE >= page.totalCount) break;
  }
  return [
    ...['/', '/search', '/collections', '/help', '/policies'].map((path) => ({ url: `${origin}${path}` })),
    ...collections.map((collection) => ({ url: `${origin}/collections/${encodeURIComponent(collection.slug)}` })),
    ...slugs.map((slug) => ({ url: `${origin}/stays/${encodeURIComponent(slug)}` })),
  ];
}
