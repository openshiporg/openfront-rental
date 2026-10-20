import { calendarImportConnectionBlocker } from '@/features/integrations/channels/support';
import type { OperationalTone } from '@/features/platform/operations/lib/operations';
import { mappingHealth, type MappingHealth } from './mappingStatus';

export const mappingHealthTone: Record<MappingHealth, OperationalTone> = { healthy: 'success', pending: 'warning', unhealthy: 'danger' };

const needsReview = (status: unknown) => status === 'failed' || status === 'partially_succeeded';

/** Failed or partial jobs (newest first) not followed by a successful run of the same exchange. */
export function unresolvedJobs(jobs: any[]) {
  const resolved = new Set<string>();
  return jobs.filter((job) => {
    const key = [job.direction, job.domain, job.channelConnection?.id || '', job.listing?.id || ''].join(':');
    if (job.status === 'succeeded') resolved.add(key);
    return needsReview(job.status) && !resolved.has(key);
  });
}

/** Failed or partial sync events (newest first) not followed by a success for the same mapping and action. */
export function unresolvedSyncEvents(events: any[]) {
  const resolvedMappings = new Set<string>();
  const resolvedConnections = new Set<string>();
  return events.filter((event) => {
    const connectionKey = `${event.channelConnection?.id || ''}:${event.action}`;
    const mappingKey = `${connectionKey}:${event.channelListing?.id || ''}`;
    if (event.status === 'succeeded') {
      resolvedMappings.add(mappingKey);
      resolvedConnections.add(connectionKey);
    }
    // Older receipts carry no mapping, so any later success on the connection settles them.
    const resolved = event.channelListing?.id ? resolvedMappings.has(mappingKey) : resolvedConnections.has(connectionKey);
    return needsReview(event.status) && !resolved;
  });
}

export type CalendarImportOption = { key: string; connectionId: string; label: string; blocker: string | null };

/** Every mapping, eligible first; ineligible ones carry the same reason the import command would give. */
export function calendarImportOptions(connections: any[]): CalendarImportOption[] {
  const options = new Map<string, CalendarImportOption>();
  for (const connection of connections) {
    for (const mapping of connection.channelListings || []) {
      const key = `${connection.id}:${mapping.listing?.id || mapping.id}`;
      const blocker = calendarImportConnectionBlocker(connection)
        || (mapping.listing?.id ? null : 'listing unavailable')
        || (mappingHealth(mapping.status) === 'healthy' ? null : `mapping ${String(mapping.status || 'not set').replaceAll('_', ' ')}`);
      const existing = options.get(key);
      if (!existing || (existing.blocker && !blocker)) {
        options.set(key, { key, connectionId: connection.id, label: `${connection.name} · ${mapping.listing?.title || 'Listing unavailable'}`, blocker });
      }
    }
  }
  return [...options.values()].sort((a, b) => Number(Boolean(a.blocker)) - Number(Boolean(b.blocker)) || a.label.localeCompare(b.label));
}
