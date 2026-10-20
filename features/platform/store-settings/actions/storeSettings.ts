'use server';

import { revalidatePath } from 'next/cache';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { canManageStoreSettings, type StoreSettingsActor } from '../lib/authorization';
import { parseMarketplaceSettingsForm } from '../lib/validation';

export type OperatorMarketplaceSettings = {
  id: string;
  name: string;
  tagline?: string | null;
  homepageHeadline: string;
  publicDescription?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  supportHours?: string | null;
  officeAddress?: string | null;
  privacyPolicyUrl?: string | null;
  privacyPolicyVersion?: string | null;
  termsUrl?: string | null;
  termsVersion?: string | null;
  allowTestBookings?: boolean | null;
  currencyCode: string;
  locale: string;
  timezone: string;
  defaultMapLatitude?: number | null;
  defaultMapLongitude?: number | null;
  accentHue: number;
  logoIcon?: string | null;
  logoColor?: string | null;
  isPublished: boolean;
};

export type StoreSettingsLoadResult =
  | { status: 'ready'; settings: OperatorMarketplaceSettings }
  | { status: 'unconfigured'; settings: null }
  | { status: 'unauthorized'; message: string }
  | { status: 'error'; message: string };

export type StoreSettingsActionState = {
  ok: boolean;
  message: string;
};

const SETTINGS_FIELDS = `
  id name tagline homepageHeadline publicDescription supportEmail supportPhone supportHours officeAddress
  privacyPolicyUrl privacyPolicyVersion termsUrl termsVersion allowTestBookings currencyCode locale timezone defaultMapLatitude defaultMapLongitude accentHue logoIcon logoColor isPublished
`;

async function authorizeSettingsManager() {
  const auth = await keystoneClient<{ authenticatedItem: StoreSettingsActor }>(`
    query StoreSettingsAuthorization {
      authenticatedItem {
        ... on User { id isActive role { canManageSettings } }
      }
    }
  `);
  if (!auth.success) return { ok: false as const, message: 'Store Settings permission could not be verified.' };
  if (!canManageStoreSettings(auth.data.authenticatedItem)) {
    return { ok: false as const, message: 'You do not have permission to manage Store Settings.' };
  }
  return { ok: true as const };
}

export async function getOperatorMarketplaceSettings(): Promise<StoreSettingsLoadResult> {
  const authorization = await authorizeSettingsManager();
  if (!authorization.ok) return { status: 'unauthorized', message: authorization.message };

  const response = await keystoneClient<{ marketplaceSettings: OperatorMarketplaceSettings | null }>(`
    query OperatorMarketplaceSettings {
      marketplaceSettings { ${SETTINGS_FIELDS} }
    }
  `);
  if (!response.success) return { status: 'error', message: response.error || 'Store Settings could not be loaded.' };
  const settings = response.data.marketplaceSettings;
  return settings ? { status: 'ready', settings } : { status: 'unconfigured', settings: null };
}

export async function saveMarketplaceSettings(
  _previousState: StoreSettingsActionState,
  formData: FormData,
): Promise<StoreSettingsActionState> {
  const authorization = await authorizeSettingsManager();
  if (!authorization.ok) return { ok: false, message: authorization.message };

  const parsed = parseMarketplaceSettingsForm(formData);
  if (!parsed.ok) return { ok: false, message: parsed.error };

  const current = await keystoneClient<{ marketplaceSettings: { id: string } | null }>(`
    query CurrentMarketplaceSettings { marketplaceSettings { id } }
  `);
  if (!current.success) return { ok: false, message: current.error || 'Store Settings could not be checked.' };

  const operation = current.data.marketplaceSettings
    ? `mutation UpdateMarketplaceSettings($data: MarketplaceSettingsUpdateInput!) {
        settings: updateMarketplaceSettings(data: $data) { ${SETTINGS_FIELDS} }
      }`
    : `mutation CreateMarketplaceSettings($data: MarketplaceSettingsCreateInput!) {
        settings: createMarketplaceSettings(data: $data) { ${SETTINGS_FIELDS} }
      }`;

  const response = await keystoneClient<{ settings: OperatorMarketplaceSettings }>(operation, { data: parsed.data });
  if (!response.success) return { ok: false, message: response.error || 'Store Settings could not be saved.' };

  revalidatePath('/dashboard/platform/store-settings');
  revalidatePath('/', 'layout');
  return {
    ok: true,
    message: parsed.data.isPublished
      ? 'Storefront identity and theme saved and published.'
      : 'Store Settings saved. The public storefront remains unpublished.',
  };
}
