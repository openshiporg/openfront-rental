import type { Metadata } from 'next';

import { storefrontThemeColor } from '@/features/platform/store-settings/lib/theme';
import { resolveStorefrontBrand } from './brand';
import { getPublicMarketplaceSettings } from './data/marketplace';

const unavailableMetadata = {
  unconfigured: {
    title: 'Storefront not configured',
    description: 'This accommodation storefront has not been configured.',
  },
  unpublished: {
    title: 'Storefront unavailable',
    description: 'This accommodation storefront is not currently published.',
  },
  error: {
    title: 'Storefront temporarily unavailable',
    description: 'Storefront settings could not be loaded.',
  },
} as const;

export async function buildStorefrontMetadata({
  title,
  description,
  path,
  index = true,
}: {
  title?: string;
  description?: string;
  path: string;
  index?: boolean;
}): Promise<Metadata> {
  const settings = await getPublicMarketplaceSettings();
  const brand = resolveStorefrontBrand(settings);

  if (!brand) {
    const status = settings.status === 'published' ? 'error' : settings.status;
    const unavailable = unavailableMetadata[status];
    return {
      title: unavailable.title,
      description: unavailable.description,
      robots: { index: false, follow: false, noarchive: true },
    };
  }

  const pageTitle = title ? `${title} | ${brand.name}` : brand.name;
  const pageDescription = description || brand.description || 'Independent short-term accommodation, booked directly with the host.';

  return {
    title: pageTitle,
    description: pageDescription,
    alternates: index ? { canonical: path } : undefined,
    robots: index ? { index: true, follow: true } : { index: false, follow: false, noarchive: true },
    other: { 'theme-color': storefrontThemeColor(brand.accentHue) },
    openGraph: index
      ? {
          type: 'website',
          url: path,
          siteName: brand.name,
          title: pageTitle,
          description: pageDescription,
        }
      : undefined,
  };
}
