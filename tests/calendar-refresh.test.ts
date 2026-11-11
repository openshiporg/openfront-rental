import assert from 'node:assert/strict';
import { test } from 'node:test';

import { runCalendarSubscriptionCycle } from '../features/keystone/mutations/refreshCalendarSubscriptions';

function fakePrisma(mapping: any) {
  const wheres: any[] = [];
  return {
    wheres,
    channelListing: { findMany: async (args: any) => { wheres.push(args.where); return [mapping]; }, update: async () => ({}) },
    dataExchangeJob: { findFirst: async () => ({ id: 'recent' }) },
  } as any;
}

const mapping = {
  id: 'm1', status: 'mapped', externalUrl: 'https://example.com/a.ics', listingId: 'l1', hostOrganizationId: 'h1', lastImportIssue: null,
  channelConnection: { id: 'c1', provider: 'ical', connectionType: 'ical', status: 'active', syncAvailability: true, hostOrganizationId: 'h1' },
};

test('an automatic refresh only picks stale links; Refresh (force) picks all and skips hosts the caller cannot manage', async () => {
  const stale = fakePrisma(mapping);
  await runCalendarSubscriptionCycle(stale, { fetchCalendar: async () => '' });
  assert.ok(stale.wheres[0].OR, 'stale filter applied');

  const forced = fakePrisma(mapping);
  const fetched: string[] = [];
  const results = await runCalendarSubscriptionCycle(forced, { force: true, fetchCalendar: async (url) => { fetched.push(url); return ''; }, canRefreshHost: async () => false });
  assert.equal(forced.wheres[0].OR, undefined, 'no stale filter when forced');
  assert.deepEqual(fetched, []);
  assert.deepEqual(results, []);
});
