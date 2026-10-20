const NEXT_BASE = 'https://stay.invalid';

/**
 * Only same-site guest routes may be used as a post-sign-in destination. The path is
 * normalized first (dot segments, encoded dots), and the sign-in, register and reset
 * pages themselves are never a destination, so there's no redirect loop.
 */
export function safeAccountNext(value: unknown, fallback = '/account') {
  const path = typeof value === 'string' ? value.trim() : '';
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || path.length > 500 || /[\u0000-\u001f]/.test(path)) return fallback;
  let url: URL;
  try { url = new URL(path, NEXT_BASE); } catch { return fallback; }
  if (url.origin !== NEXT_BASE) return fallback;
  if (!/^\/(account|trips|checkout|stays|help|messages)(\/|$)/.test(url.pathname)) return fallback;
  if (/^\/account\/(sign-in|register|reset)(\/|$)/.test(url.pathname)) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}

export function withQuery(path: string, params: Record<string, string>, hash = '') {
  const [base, existing = ''] = path.split('?');
  const query = new URLSearchParams(existing);
  for (const [key, entry] of Object.entries(params)) query.set(key, entry);
  const text = query.toString();
  return `${base}${text ? `?${text}` : ''}${hash ? `#${hash}` : ''}`;
}
