import { platformDetailPath } from '@/features/platform/operations/lib/routes';

function withContext(path: string, context: Record<string, string | null | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(context)) if (value) params.set(key, value);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function listingCreatePath(context: { propertyId?: string | null; unitId?: string | null } = {}) {
  return withContext('/dashboard/platform/listings/create', context);
}

export function listingEditPath(id: string, section?: 'content' | 'rules' | 'amenities' | 'media') {
  return `${platformDetailPath('listing', id)}/edit${section ? `#listing-${section}` : ''}`;
}

export function ratePlanCreatePath(context: { listingId?: string | null } = {}) {
  return withContext('/dashboard/platform/pricing/create', context);
}

export function ratePlanEditPath(id: string) {
  return `${platformDetailPath('ratePlan', id)}/edit`;
}
