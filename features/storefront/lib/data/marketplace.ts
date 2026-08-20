import { cache } from 'react';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';

export type PublicMarketplaceSettings = {
  status: 'published';
  id: string;
  name: string;
  tagline?: string | null;
  homepageHeadline: string;
  publicDescription?: string | null;
  supportPhone?: string | null;
  supportEmail?: string | null;
  currencyCode: string;
  locale: string;
  timezone: string;
  accentHue: number;
};

export type PublicMarketplaceSettingsState =
  | PublicMarketplaceSettings
  | { status: 'unconfigured' }
  | { status: 'unpublished' }
  | { status: 'error' };

type PublicMarketplaceSettingsResponse = {
  publicMarketplaceSettings: {
    status: string;
    id?: string | null;
    name?: string | null;
    tagline?: string | null;
    homepageHeadline?: string | null;
    publicDescription?: string | null;
    supportPhone?: string | null;
    supportEmail?: string | null;
    currencyCode?: string | null;
    locale?: string | null;
    timezone?: string | null;
    accentHue?: number | null;
  };
};

export const getPublicMarketplaceSettings = cache(async function (): Promise<PublicMarketplaceSettingsState> {
  const response = await keystoneClient<PublicMarketplaceSettingsResponse>(`
    query PublicMarketplaceSettings {
      publicMarketplaceSettings {
        status id name tagline homepageHeadline publicDescription supportPhone supportEmail currencyCode locale timezone accentHue
      }
    }
  `);

  if (!response.success) return { status: 'error' };
  const settings = response.data.publicMarketplaceSettings;
  if (settings.status === 'unconfigured') return { status: 'unconfigured' };
  if (settings.status === 'unpublished') return { status: 'unpublished' };
  if (
    settings.status !== 'published'
    || !settings.id
    || !settings.name?.trim()
    || !settings.homepageHeadline?.trim()
    || !settings.currencyCode?.trim()
    || !settings.locale?.trim()
    || !settings.timezone?.trim()
    || settings.accentHue === null
    || settings.accentHue === undefined
  ) return { status: 'error' };

  return settings as PublicMarketplaceSettings;
});
