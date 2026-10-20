export type SearchParams = Record<string, string | string[] | undefined>;
export const searchKeys = ['destination', 'checkIn', 'checkOut', 'adults', 'children', 'infants', 'pets', 'bedrooms', 'instantBook', 'collection', 'offset'] as const;
export function single(value: string | string[] | undefined) { return typeof value === 'string' ? value : ''; }
export function comparisonSlugs(value: string | string[] | undefined) {
  return [...new Set((Array.isArray(value) ? value : [single(value)]).filter(slug => slug.length > 0))].slice(0, 3);
}
export function searchQuery(params: SearchParams, updates: Record<string, string | undefined> = {}) {
  const query = new URLSearchParams();
  for (const key of searchKeys) {
    const value = key in updates ? updates[key] : single(params[key]);
    if (value) query.set(key, value.slice(0, 200));
  }
  return query.toString();
}
/** Index of the last result a page can start at: the server ranks at most 5,000 homes. */
export const MAX_RESULT_INDEX = 4999;

export function countParam(value: string | string[] | undefined, fallback = 0, max = 16) {
  const text = single(value);
  return /^\d{1,4}$/.test(text) ? Math.min(Number(text), max) : fallback;
}
export function privateToken(value: unknown): string { return typeof value === 'string' && /^[a-f0-9]{48}$/.test(value) ? value : ''; }
export function tripPath(token: string, agreement?: string) {
  return `/trips/${encodeURIComponent(token)}${privateToken(agreement) ? `?agreement=${agreement}` : ''}`;
}
export function parseTripLink(value: string, origin: string) {
  try {
    const url = new URL(value.trim(), origin);
    if (url.origin !== origin || url.username || url.password) return null;
    const match = /^\/trips\/([a-f0-9]{48})\/?$/.exec(url.pathname);
    return match ? tripPath(match[1], url.searchParams.get('agreement') || '') : null;
  } catch { return null; }
}
export const storefrontNav = [
  { key: 'search', href: '/search', label: 'Find a stay' },
  { key: 'collections', href: '/collections', label: 'Collections' },
  { key: 'trips', href: '/trips', label: 'Your trip' },
  { key: 'help', href: '/help', label: 'Help' },
  { key: 'account', href: '/account', label: 'Account' },
] as const;
