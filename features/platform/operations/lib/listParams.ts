export type PlatformSearchParams = Promise<Record<string, string | string[] | undefined>> | undefined;

export async function readSearchParams(searchParams: PlatformSearchParams) {
  const params = (await searchParams) || {};
  const get = (key: string) => {
    const value = params[key];
    return typeof value === 'string' ? value : Array.isArray(value) ? value[0] || '' : '';
  };
  return { get, q: get('q').trim().slice(0, 120), view: get('view'), page: get('page'), error: get('error') || null };
}

export const PAGE_SIZE = 25;

export interface PageSlice<T> {
  rows: T[];
  page: number;
  pageCount: number;
  /** 1-based index of the first row on this page (0 when empty). */
  start: number;
  end: number;
  total: number;
}

/** Slice already-filtered rows for the requested `?page=`; out-of-range pages clamp to the nearest real page. */
export function paginate<T>(rows: T[], requested?: string, size = PAGE_SIZE): PageSlice<T> {
  const pageCount = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.min(Math.max(1, Number.parseInt(requested || '', 10) || 1), pageCount);
  const offset = (page - 1) * size;
  return { rows: rows.slice(offset, offset + size), page, pageCount, start: rows.length ? offset + 1 : 0, end: Math.min(offset + size, rows.length), total: rows.length };
}

/** The `?page=` number as requested (1-based), before it is clamped to the real page count. */
export function requestedPage(requested?: string) {
  return Math.max(1, Number.parseInt(requested || '', 10) || 1);
}

/** Page window for a list the server counts and pages; out-of-range pages clamp to the last real page. */
export function pageWindow(total: number, requested?: string | number, size = PAGE_SIZE): Omit<PageSlice<never>, 'rows'> & { skip: number; take: number } {
  const pageCount = Math.max(1, Math.ceil(total / size));
  const page = Math.min(typeof requested === 'number' ? Math.max(1, Math.trunc(requested)) : requestedPage(requested), pageCount);
  const skip = (page - 1) * size;
  return { page, pageCount, skip, take: size, start: total ? skip + 1 : 0, end: Math.min(skip + size, total), total };
}

/** Accept a requested view only when it is one of the page's declared views. */
export function pickView<T extends string>(requested: string, views: readonly T[], fallback: T): T {
  return (views as readonly string[]).includes(requested) ? (requested as T) : fallback;
}

/** Case-insensitive match of a free-text query against any of the provided fields. */
export function matchesQuery(q: string, fields: Array<string | number | null | undefined>) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return fields.some((field) => field != null && String(field).toLowerCase().includes(needle));
}

/** Build a list URL that keeps the active search while switching views (and vice versa). */
export function listHref(basePath: string, params: Record<string, string | null | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && value !== 'all') search.set(key, value);
  }
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}
