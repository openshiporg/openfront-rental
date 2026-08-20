export const platformDetailSegments = {
  property: 'properties',
  listing: 'listings',
  guest: 'guests',
  agreement: 'agreements',
  ratePlan: 'pricing',
  conversation: 'inbox',
  payment: 'payments',
  payout: 'payouts',
  review: 'reviews',
} as const;

export type PlatformDetailKind = keyof typeof platformDetailSegments;

export function platformDetailPath(kind: PlatformDetailKind, id: string) {
  if (!id || id.includes('/') || id.includes('..')) throw new Error('A safe record id is required.');
  return `/dashboard/platform/${platformDetailSegments[kind]}/${encodeURIComponent(id)}`;
}

export function platformCreatePath(kind: 'property') {
  return `/dashboard/platform/${platformDetailSegments[kind]}/create`;
}

export function rawRecordPath(listKey: string, id?: string) {
  if (!/^[a-z0-9-]+$/.test(listKey)) throw new Error('A safe list key is required.');
  if (id && (id.includes('/') || id.includes('..'))) throw new Error('A safe record id is required.');
  return id ? `/dashboard/${listKey}/${encodeURIComponent(id)}` : `/dashboard/${listKey}`;
}
