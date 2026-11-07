import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Prisma } from '@prisma/client';
import { DELETE_HISTORY, dateRangeProblem, deleteHistoryProblem, withChecks } from '../features/keystone/utils/deleteHistoryGuard';

test('every delete-history reference is a real foreign key to that parent', () => {
  const models = Prisma.dmmf.datamodel.models;
  for (const [parent, rule] of Object.entries(DELETE_HISTORY)) {
    for (const ref of rule.references) {
      const model = models.find(m => m.name[0].toLowerCase() + m.name.slice(1) === ref.model);
      const relation = model?.fields.find(f => f.kind === 'object' && f.relationFromFields?.[0] === ref.field);
      assert.equal(relation?.type, parent, `${ref.model}.${ref.field} points at ${parent}`);
    }
  }
});

test('a record with history names what it has and how to retire it; one without can go', async () => {
  const prisma = new Proxy({}, { get: (_t, model) => ({ count: async ({ where }: any) => (model === 'reservation' && where.listingId === 'l1' ? 3 : 0) }) });
  assert.equal(await deleteHistoryProblem(prisma, 'Listing', 'l1'), 'This record has 3 reservations. Archive the listing instead of deleting it.');
  assert.equal(await deleteHistoryProblem(prisma, 'Listing', 'l2'), null);
});

test('stay-style date ranges must be real YYYY-MM-DD dates ending after they start', () => {
  assert.equal(dateRangeProblem('2026-12-01', '2026-12-05', 'A season'), null);
  assert.match(dateRangeProblem('2026-12-05', '2026-12-01', 'A season') || '', /must end after it starts/);
  assert.match(dateRangeProblem('2026-12-01', '2026-12-01', 'A season') || '', /must end after it starts/);
  assert.match(dateRangeProblem('2026-02-30', '2026-03-02', 'A season') || '', /real dates/);
  assert.match(dateRangeProblem('12/01/2026', '2026-12-05', 'A season') || '', /real dates/);
});

test('extra checks compose into the host-scoped validate hook (Keystone refuses validate plus validateDelete)', async () => {
  const calls: string[] = [];
  const hooks = withChecks({ validate: async () => { calls.push('host'); } }, { input: () => { calls.push('input'); }, delete: () => { calls.push('delete'); } });
  assert.deepEqual(Object.keys(hooks), ['validate']);
  await hooks.validate({ operation: 'create' });
  await hooks.validate({ operation: 'delete' });
  assert.deepEqual(calls, ['host', 'input', 'host', 'delete']);
});

test('no list mixes validate with validateInput or validateDelete', () => {
  for (const file of ['HostOrganization', 'Property', 'Listing', 'AccommodationUnit', 'GuestProfile', 'RatePlan', 'CancellationPolicy', 'PropertyOwner', 'ChannelConnection', 'ChannelListing', 'ChannelReservation', 'Conversation', 'User', 'Role', 'SeasonalRate', 'CalendarBlock']) {
    const source = readFileSync(new URL(`../features/keystone/models/${file}.ts`, import.meta.url), 'utf8');
    assert.ok(!(/\bvalidate:/.test(source) && /validate(Input|Delete):/.test(source)), file);
    assert.match(source, /historyDeleteGuard|dateRangeProblem/, file);
  }
});

test('a host organization keeps at least one active owner', async () => {
  const { lastActiveOwnerProblem } = await import('../features/keystone/utils/hostOrganizationAccess');
  const owner = { id: 'm1', hostOrganizationId: 'h1', membershipRole: 'owner', status: 'active' };
  const ctx = (others: number) => ({ prisma: { hostMembership: { count: async () => others } } });
  assert.match(await lastActiveOwnerProblem({ operation: 'delete', item: owner, context: ctx(0) }) || '', /only active owner/);
  assert.match(await lastActiveOwnerProblem({ operation: 'update', item: owner, resolvedData: { membershipRole: 'admin' }, context: ctx(0) }) || '', /only active owner/);
  assert.match(await lastActiveOwnerProblem({ operation: 'update', item: owner, resolvedData: { status: 'suspended' }, context: ctx(0) }) || '', /only active owner/);
  assert.equal(await lastActiveOwnerProblem({ operation: 'delete', item: owner, context: ctx(1) }), null);
  assert.equal(await lastActiveOwnerProblem({ operation: 'update', item: owner, resolvedData: { notes: 'x' }, context: ctx(0) }), null);
  assert.equal(await lastActiveOwnerProblem({ operation: 'delete', item: { ...owner, membershipRole: 'admin' }, context: ctx(0) }), null);
});

test('counts read naturally', async () => {
  const prisma = new Proxy({}, { get: (_t, model) => ({ count: async () => (model === 'payout' ? 1 : model === 'property' ? 1 : 0) }) });
  assert.equal(await deleteHistoryProblem(prisma, 'HostOrganization', 'h'), 'This record has 1 payout, 1 property. Archive the host organization instead of deleting it.');
});
