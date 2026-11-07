import assert from 'node:assert/strict';
import test from 'node:test';
import { cancelUnstartedStayTasks } from './stayClosure';

function fakeTx(open: Array<{ id: string }>) {
  const calls: any = { find: null, update: null, outbox: [] as any[] };
  const tx: any = {
    propertyTask: {
      findMany: async (args: any) => { calls.find = args; return open; },
      updateMany: async (args: any) => { calls.update = args; return { count: open.length }; },
    },
    outboxEvent: { create: async (args: any) => { calls.outbox.push(args); return args; } },
  };
  return { tx, calls };
}

test('only rule-made work nobody has started is selected, and the cancellation rules own tasks are excluded', async () => {
  const { tx, calls } = fakeTx([]);
  const count = await cancelUnstartedStayTasks(tx, { id: 'r1', hostOrganizationId: 'h1' }, new Date(), 'cancel:1');
  assert.equal(count, 0);
  assert.equal(calls.find.where.reservationId, 'r1');
  assert.equal(calls.find.where.source, 'task_rule');
  assert.deepEqual(calls.find.where.status.in, ['queued', 'assigned', 'blocked']);
  assert.equal(calls.find.where.NOT.taskRule.is.trigger, 'reservation_cancelled');
  assert.equal(calls.update, null, 'nothing to update when no work is open');
});

test('started or finished work is never touched by the update', async () => {
  const { tx, calls } = fakeTx([{ id: 't1' }]);
  await cancelUnstartedStayTasks(tx, { id: 'r1', hostOrganizationId: 'h1' }, new Date(), 'cancel:1').catch(() => undefined);
  assert.deepEqual(calls.update.where.status.in, ['queued', 'assigned', 'blocked']);
  assert.equal(calls.update.data.status, 'cancelled');
});
