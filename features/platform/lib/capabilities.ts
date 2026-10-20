import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';

export const platformManagePermissions = [
  'canManageProperties',
  'canManageListings',
  'canManageCalendar',
  'canManagePricing',
  'canManageReservations',
  'canManageGuests',
  'canManageMessages',
  'canManageChannels',
  'canManagePayouts',
  'canManageReviews',
  'canManagePayments',
  'canManageReports',
  'canManageSettings',
] as const;

export type PlatformManagePermission = (typeof platformManagePermissions)[number];

/** Reads that decide whether a related fact is hidden from this role rather than absent. */
export const platformReadPermissions = ['canReadProperties', 'canReadListings', 'canReadPricing', 'canReadReservations'] as const;

export type PlatformReadPermission = (typeof platformReadPermissions)[number];

/**
 * What the signed-in operator may change, for showing or hiding controls, and which related
 * facts their role can see (a hidden relation is "not visible", never "none"). `known` is false
 * when the role couldn't be read: show an unavailable state, not a read-only denial.
 * Every command still enforces its own permission and host membership on the server.
 */
export type PlatformCapabilities = Record<PlatformManagePermission | PlatformReadPermission, boolean> & { known: boolean };

export async function getPlatformCapabilities(): Promise<PlatformCapabilities> {
  const response = await keystoneClient<any>(`
    query PlatformCapabilities {
      authenticatedItem { ... on User { isActive role { ${[...platformManagePermissions, ...platformReadPermissions].join(' ')} } } }
    }
  `);
  const user = response.success ? response.data?.authenticatedItem : null;
  const role = user?.isActive === true ? user.role : null;
  return {
    known: response.success,
    ...Object.fromEntries([...platformManagePermissions, ...platformReadPermissions].map((permission) => [permission, role?.[permission] === true])),
  } as PlatformCapabilities;
}
