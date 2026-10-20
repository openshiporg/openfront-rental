import { cache } from 'react';

import { resolveStorefrontBrand } from '../brand';
import { DEFAULT_STOREFRONT_LOCALE, validStorefrontLocale } from '../locale';
import { getPublicMarketplaceSettings } from './marketplace';

/**
 * This request's formatting locale for server components: exactly what the storefront shell
 * gives client components. The published store's validated locale; while the store is
 * unpublished or its settings can't load (private guest service only), the stated default.
 */
export const getStorefrontLocale = cache(async function (): Promise<string> {
  const brand = resolveStorefrontBrand(await getPublicMarketplaceSettings());
  return brand ? validStorefrontLocale(brand.locale) : DEFAULT_STOREFRONT_LOCALE;
});
