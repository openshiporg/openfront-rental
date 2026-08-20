export type OperationalTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export function humanize(value?: string | null) {
  if (!value) return 'Not set';
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatMoney(cents?: number | null, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format((cents || 0) / 100);
}

export function formatTimestamp(value?: string | null) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

export function operationalTone(status?: string | null): OperationalTone {
  if (!status) return 'neutral';
  if (['active', 'available', 'published', 'signed', 'succeeded', 'paid', 'completed', 'delivered', 'received', 'verified'].includes(status)) return 'success';
  if (['failed', 'rejected', 'cancelled', 'removed', 'reversed', 'voided', 'archived'].includes(status)) return 'danger';
  if (['pending', 'processing', 'draft', 'onboarding', 'snoozed', 'submitted', 'partially_refunded', 'partially_succeeded'].includes(status)) return 'warning';
  if (['confirmed', 'sent', 'queued', 'in_progress', 'scheduled'].includes(status)) return 'info';
  return 'neutral';
}

export interface ReadinessInput {
  status?: string | null;
  registrationNumber?: string | null;
  timezone?: string | null;
  addressReady?: boolean;
  unitCount?: number;
  publishedListingCount?: number;
}

export function propertyReadiness(input: ReadinessInput) {
  const checks = [
    { id: 'address', label: 'Guest location', ready: Boolean(input.addressReady) },
    { id: 'unit', label: 'Rentable unit', ready: (input.unitCount || 0) > 0 },
    { id: 'timezone', label: 'Stay timezone', ready: Boolean(input.timezone) },
    { id: 'registration', label: 'Registration evidence', ready: Boolean(input.registrationNumber) },
    { id: 'listing', label: 'Published listing', ready: (input.publishedListingCount || 0) > 0 },
  ];
  const readyCount = checks.filter((check) => check.ready).length;
  return { checks, readyCount, percent: Math.round((readyCount / checks.length) * 100) };
}

export interface ListingReadinessInput {
  status?: string | null;
  title?: string | null;
  description?: string | null;
  mediaCount?: number;
  amenityCount?: number;
  ratePlanCount?: number;
  baseNightlyRateCents?: number | null;
  propertyReady?: boolean;
  unitReady?: boolean;
}

export function listingReadiness(input: ListingReadinessInput) {
  const checks = [
    { id: 'content', label: 'Guest-facing copy', ready: Boolean(input.title && input.description) },
    { id: 'media', label: 'Media', ready: (input.mediaCount || 0) > 0 },
    { id: 'amenities', label: 'Amenities', ready: (input.amenityCount || 0) > 0 },
    { id: 'inventory', label: 'Property & unit', ready: Boolean(input.propertyReady && input.unitReady) },
    { id: 'rate', label: 'Sellable rate', ready: (input.baseNightlyRateCents || 0) > 0 || (input.ratePlanCount || 0) > 0 },
  ];
  const readyCount = checks.filter((check) => check.ready).length;
  return { checks, readyCount, percent: Math.round((readyCount / checks.length) * 100) };
}

export function isPaymentException(status?: string | null) {
  return ['failed', 'cancelled', 'partially_refunded', 'refunded'].includes(status || '');
}

export function isMessageException(message?: { direction?: string | null; status?: string | null }) {
  return message?.status === 'failed' || (message?.direction === 'inbound' && message?.status === 'received');
}
