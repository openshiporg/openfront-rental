import type { GraphQLFieldResolver, GraphQLSchema } from 'graphql';

import { assertCalendarBlockWriteWithinCapacity } from './calendarBlockCapacity';

type CalendarBlockOperation = 'create' | 'update';
type CalendarBlockWriteGuard = (
  operation: CalendarBlockOperation,
  args: { data: Record<string, any>; where?: Record<string, any> },
  context: any,
) => Promise<void>;

function requiredResolver(fields: Record<string, any>, fieldName: string): GraphQLFieldResolver<any, any> {
  const resolve = fields[fieldName]?.resolve;
  if (typeof resolve !== 'function') {
    throw new Error(`Keystone generated mutation resolver ${fieldName} is missing; CalendarBlock capacity protection cannot be installed.`);
  }
  return resolve;
}

function runInTransaction(
  operation: CalendarBlockOperation,
  resolver: GraphQLFieldResolver<any, any>,
  root: unknown,
  args: { data: Record<string, any>; where?: Record<string, any> },
  context: any,
  info: any,
  guard: CalendarBlockWriteGuard,
) {
  if (typeof context?.transaction !== 'function') {
    throw new Error('CalendarBlock writes require a Keystone transaction Context.');
  }
  return context.transaction(async (transactionContext: any) => {
    await guard(operation, args, transactionContext);
    return resolver(root, args, transactionContext, info);
  });
}

function sequentialPromises<T>(items: T[], run: (item: T) => Promise<unknown>) {
  let previous = Promise.resolve();
  return items.map((item) => {
    const result = previous.then(() => run(item));
    previous = result.then(() => undefined, () => undefined);
    return result;
  });
}

export function installCalendarBlockGraphqlBoundary(
  baseSchema: GraphQLSchema,
  guard: CalendarBlockWriteGuard = assertCalendarBlockWriteWithinCapacity,
) {
  const mutation = baseSchema.getMutationType();
  if (!mutation) throw new Error('Keystone mutation root is missing; CalendarBlock capacity protection cannot be installed.');
  const fields = mutation.getFields();
  const createOne = requiredResolver(fields, 'createCalendarBlock');
  const updateOne = requiredResolver(fields, 'updateCalendarBlock');
  const createOneField = fields.createCalendarBlock;
  const updateOneField = fields.updateCalendarBlock;
  const createManyField = fields.createCalendarBlocks;
  const updateManyField = fields.updateCalendarBlocks;

  if (!createManyField || !updateManyField) {
    throw new Error('Keystone generated CalendarBlock bulk mutations are missing; capacity protection cannot be installed.');
  }

  createOneField.resolve = (root, args, context, info) =>
    runInTransaction('create', createOne, root, args, context, info, guard);
  updateOneField.resolve = (root, args, context, info) =>
    runInTransaction('update', updateOne, root, args, context, info, guard);

  createManyField.resolve = (_root, { data }, context, info) => sequentialPromises(
    data as Record<string, any>[],
    (item) => runInTransaction('create', createOne, _root, { data: item }, context, info, guard),
  );
  updateManyField.resolve = (_root, { data }, context, info) => sequentialPromises(
    data as Array<{ where: Record<string, any>; data: Record<string, any> }>,
    (item) => runInTransaction('update', updateOne, _root, { where: item.where, data: item.data }, context, info, guard),
  );

  return baseSchema;
}
