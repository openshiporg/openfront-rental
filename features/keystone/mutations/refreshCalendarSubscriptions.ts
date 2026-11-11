import { applyListingCalendarImport } from './calendarExchange';
import { CALENDAR_SUBSCRIPTION_INTERVAL_MS, fetchSubscribedCalendar } from '../lib/calendarSubscription';
import { calendarImportConnectionBlocker, calendarImportMappingBlocker } from '../../integrations/channels/support';
import { assertHostOrganizationAccess } from '../utils/hostOrganizationAccess';

/** Subscribed calendars one refresh may poll: active iCal connections with a mapped listing and URL. */
const MAX_SUBSCRIPTIONS_PER_REFRESH = 25;
const MAX_SUBSCRIPTIONS_PER_PAGE_LOAD = 3;
// Overlapping replicas are safe: block ids derive from connection, listing and UID, and each
// apply runs in one Serializable transaction, so a duplicate poll replays instead of doubling.

type SubscriptionResult = { mappingId: string; status: string; error?: string };

/**
 * Airbnb/Guesty-style "import calendar by URL": a mapped listing whose channel mapping has a
 * calendar link is re-read when its last check is over an hour old (on the Channels page load,
 * a few at a time) or when staff press Refresh (`force`), and applied as a full snapshot, so
 * channel bookings block nights here and channel cancellations release them. No timer runs it.
 */
export async function runCalendarSubscriptionCycle(prisma: any, deps: { fetchCalendar?: (url: string) => Promise<string>; now?: () => Date; force?: boolean; limit?: number; canRefreshHost?: (hostOrganizationId: string) => Promise<boolean> } = {}) {
  const fetchCalendar = deps.fetchCalendar ?? ((url: string) => fetchSubscribedCalendar(url));
  const now = deps.now ?? (() => new Date());
  const force = deps.force === true;
  const dueBefore = new Date(now().getTime() - CALENDAR_SUBSCRIPTION_INTERVAL_MS + 60_000);
  const mappings = await prisma.channelListing.findMany({
    where: {
      externalUrl: { startsWith: 'https://' },
      listingId: { not: null },
      hostOrganizationId: { not: null },
      ...(force ? {} : { OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: dueBefore } }] }),
    },
    orderBy: [{ lastSyncedAt: { sort: 'asc', nulls: 'first' } }, { id: 'asc' }],
    take: Math.min(deps.limit ?? MAX_SUBSCRIPTIONS_PER_REFRESH, MAX_SUBSCRIPTIONS_PER_REFRESH),
    select: {
      id: true, status: true, externalUrl: true, listingId: true, hostOrganizationId: true, lastImportIssue: true,
      channelConnection: { select: { id: true, provider: true, connectionType: true, status: true, syncAvailability: true, hostOrganizationId: true } },
    },
  });
  const results: SubscriptionResult[] = [];
  for (const mapping of mappings) {
    const connection = mapping.channelConnection;
    if (!connection || connection.hostOrganizationId !== mapping.hostOrganizationId) continue;
    if (deps.canRefreshHost && !(await deps.canRefreshHost(mapping.hostOrganizationId))) continue;
    if (calendarImportConnectionBlocker(connection) || calendarImportMappingBlocker(mapping)) continue;
    // A failing link is retried at the normal cadence, not every cycle.
    const lastAttempt = (mapping.lastImportIssue as any)?.subscriptionAttemptAt;
    if (!force && lastAttempt && new Date(lastAttempt).getTime() > dueBefore.getTime()) continue;
    // A conflicted import doesn't advance lastSyncedAt; its recent job still sets the cadence.
    const recentJob = force ? null : await prisma.dataExchangeJob.findFirst({ where: { channelConnectionId: connection.id, listingId: mapping.listingId, direction: 'import', createdAt: { gt: dueBefore } }, select: { id: true } });
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

/** Staff Refresh button and Channels page load: polls the calendar links of hosts the caller manages channels for. */
export async function refreshCalendarSubscriptions(_root: unknown, args: { force?: boolean | null; limit?: number | null }, context: any) {
  const verdicts = new Map<string, boolean>();
  const canRefreshHost = async (hostOrganizationId: string) => {
    if (!verdicts.has(hostOrganizationId)) {
      verdicts.set(hostOrganizationId, await assertHostOrganizationAccess({ context, hostOrganizationId, permission: 'canManageChannels' }).then(() => true, () => false));
    }
    return verdicts.get(hostOrganizationId)!;
  };
  const force = args.force === true;
  const limit = force ? MAX_SUBSCRIPTIONS_PER_REFRESH : MAX_SUBSCRIPTIONS_PER_PAGE_LOAD;
  const results = await runCalendarSubscriptionCycle(context.sudo().prisma, { force, limit, canRefreshHost });
  return { checked: results.length, failed: results.filter((result) => result.status === 'failed').length };
}
