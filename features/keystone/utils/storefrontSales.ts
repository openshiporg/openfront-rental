/**
 * The storefront's sale gate and its published legal documents. New public quotes and
 * bookings are taken only while the storefront is published; existing guests keep their
 * private trip, agreement, message and account pages either way.
 */
export const STOREFRONT_PAUSED_MESSAGE = 'New bookings are paused on this storefront. Existing trips are still available.';

export type LegalDocument = { url: string; version: string };

export type StorefrontSales = {
  open: boolean;
  allowTestBookings: boolean;
  termsOfUse: LegalDocument | null;
  privacyPolicy: LegalDocument | null;
};

const settingsSelect = {
  isPublished: true, allowTestBookings: true, termsUrl: true, termsVersion: true, privacyPolicyUrl: true, privacyPolicyVersion: true,
};

function legalDocument(url: unknown, version: unknown): LegalDocument | null {
  const link = typeof url === 'string' ? url.trim() : '';
  const label = typeof version === 'string' ? version.trim() : '';
  // A document counts as published only with both its link and its version label.
  return link && label ? { url: link, version: label } : null;
}

export function storefrontSalesFrom(settings: any): StorefrontSales {
  const open = settings?.isPublished === true;
  return {
    open,
    allowTestBookings: open && settings?.allowTestBookings === true,
    termsOfUse: legalDocument(settings?.termsUrl, settings?.termsVersion),
    privacyPolicy: legalDocument(settings?.privacyPolicyUrl, settings?.privacyPolicyVersion),
  };
}

/**
 * Current sale state. Inside a booking transaction pass `lock`: the settings row is
 * share-locked, so an unpublish either waits for this booking or is seen by it.
 */
export async function readStorefrontSales(db: any, { lock = false }: { lock?: boolean } = {}): Promise<StorefrontSales> {
  if (lock) await db.$queryRawUnsafe('SELECT "id" FROM "MarketplaceSettings" WHERE "id" = 1 FOR SHARE');
  const settings = await db.marketplaceSettings.findUnique({ where: { id: 1 }, select: settingsSelect });
  return storefrontSalesFrom(settings);
}

export function assertStorefrontSelling(sales: StorefrontSales) {
  if (!sales.open) throw new Error(STOREFRONT_PAUSED_MESSAGE);
}
