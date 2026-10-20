import { PAGE_SIZE, type PageSlice } from '@/features/platform/operations/lib/listParams';

export type Where = Record<string, unknown>;

/** Case-insensitive substring filter for Keystone string fields. */
export function contains(q: string) {
  return { contains: q, mode: 'insensitive' };
}

/** AND of the non-empty filters; `{}` matches everything. */
export function allOf(...filters: Array<Where | null | undefined | false>): Where {
  const parts = filters.filter((filter): filter is Where => Boolean(filter && Object.keys(filter).length));
  if (!parts.length) return {};
  return parts.length === 1 ? parts[0] : { AND: parts };
}

/** Pagination for rows the server already filtered and paged; `total` is the matching count. */
export function serverPage<T>(rows: T[], page: number, total: number, size = PAGE_SIZE): PageSlice<T> {
  const pageCount = Math.max(1, Math.ceil(total / size));
  const offset = (page - 1) * size;
  return { rows, page, pageCount, start: rows.length ? offset + 1 : 0, end: offset + rows.length, total };
}

