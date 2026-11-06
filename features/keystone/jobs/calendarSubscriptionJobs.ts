import { applyListingCalendarImport } from '../mutations/calendarExchange';
import { CALENDAR_SUBSCRIPTION_INTERVAL_MS, fetchSubscribedCalendar } from '../lib/calendarSubscription';
import { calendarImportConnectionBlocker, calendarImportMappingBlocker } from '../../integrations/channels/support';

/** Subscribed calendars a cycle may poll: active iCal connections with a mapped listing and URL. */
const MAX_SUBSCRIPTIONS_PER_CYCLE = 200;
// Overlapping replicas are safe: block ids derive from connection, listing and UID, and each
// apply runs in one Serializable transaction, so a duplicate poll replays instead of doubling.

type SubscriptionResult = { mappingId: string; status: string; error?: string };

/**
 * Airbnb/Guesty-style "import calendar by URL": every mapped listing whose channel mapping has
 * a calendar link is re-read about hourly and applied as a full snapshot, so channel bookings
 * block nights here and channel cancellations release them.
 */
export async function runCalendarSubscriptionCycle(prisma: any, deps: { fetchCalendar?: (url: string) => Promise<string>; now?: () => Date } = {}) {
  const fetchCalendar = deps.fetchCalendar ?? ((url: string) => fetchSubscribedCalendar(url));
  const now = deps.now ?? (() => new Date());
  const dueBefore = new Date(now().getTime() - CALENDAR_SUBSCRIPTION_INTERVAL_MS + 60_000);
  const mappings = await prisma.channelListing.findMany({
    where: {
      externalUrl: { startsWith: 'https://' },
      listingId: { not: null },
      hostOrganizationId: { not: null },
      OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: dueBefore } }],
    },
    orderBy: [{ lastSyncedAt: { sort: 'asc', nulls: 'first' } }, { id: 'asc' }],
    take: MAX_SUBSCRIPTIONS_PER_CYCLE,
    select: {
      id: true, status: true, externalUrl: true, listingId: true, hostOrganizationId: true, lastImportIssue: true,
      channelConnection: { select: { id: true, provider: true, connectionType: true, status: true, syncAvailability: true, hostOrganizationId: true } },
    },
  });
  const results: SubscriptionResult[] = [];
  for (const mapping of mappings) {
    const connection = mapping.channelConnection;
    if (!connection || connection.hostOrganizationId !== mapping.hostOrganizationId) continue;
    if (calendarImportConnectionBlocker(connection) || calendarImportMappingBlocker(mapping)) continue;
    // A failing link is retried at the normal cadence, not every cycle.
    const lastAttempt = (mapping.lastImportIssue as any)?.subscriptionAttemptAt;
    if (lastAttempt && new Date(lastAttempt).getTime() > dueBefore.getTime()) continue;
    // A conflicted import doesn't advance lastSyncedAt; its recent job still sets the cadence.
    const recentJob = await prisma.dataExchangeJob.findFirst({ where: { channelConnectionId: connection.id, listingId: mapping.listingId, direction: 'import', createdAt: { gt: dueBefore } }, select: { id: true } });
    if (recentJob) continue;
    try {
      const calendarText = await fetchCalendar(mapping.externalUrl);
      const job = await applyListingCalendarImport(prisma, {
        hostOrganizationId: mapping.hostOrganizationId,
        connectionId: connection.id,
        listingId: mapping.listingId,
        calendarText,
        sourceLabel: `Subscribed calendar · ${new URL(mapping.externalUrl).hostname}`,
        fullSnapshot: true,
      });
      // A replayed identical snapshot still counts as a fresh check of the link.
      if (job?.status === 'succeeded') await prisma.channelListing.update({ where: { id: mapping.id }, data: { lastSyncedAt: now() } });
      results.push({ mappingId: mapping.id, status: job?.status || 'unknown' });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 300) : 'Calendar link could not be read.';
      await prisma.channelListing.update({
        where: { id: mapping.id },
        data: { lastImportIssue: { open: true, subscription: true, error: message, subscriptionAttemptAt: now().toISOString(), listingId: mapping.listingId, at: now().toISOString() } },
      }).catch(() => {});
      results.push({ mappingId: mapping.id, status: 'failed', error: message });
    }
  }
  return results;
}

let started = false;

export function startCalendarSubscriptionJobs(prisma: any, intervalMs = 5 * 60 * 1000) {
  if (started) return;
  started = true;
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const results = await runCalendarSubscriptionCycle(prisma);
      const failed = results.filter((result) => result.status === 'failed');
      if (results.length) console.log(`Calendar subscriptions: ${results.length} checked, ${failed.length} failed.`);
    } catch (error) {
      console.error('Calendar subscription cycle failed', error instanceof Error ? error.message : error);
    } finally {
      running = false;
    }
  };
  setTimeout(tick, 30_000).unref?.();
  setInterval(tick, intervalMs).unref?.();
}
