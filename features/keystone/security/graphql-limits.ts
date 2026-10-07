import { createHash } from 'node:crypto';
import { GraphQLError, Kind, type ValidationRule } from 'graphql';

export const MAX_GRAPHQL_LIST_TAKE = 5001;
export const MAX_GRAPHQL_PARSE_TOKENS = 20_000;
export const MAX_GRAPHQL_SELECTION_DEPTH = 24;
export const MAX_GRAPHQL_FIELD_COUNT = 3000;
export const MAX_GRAPHQL_ALIAS_COUNT = 500;

export function withGraphqlListMaxTake(models: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(models).map(([key, value]) => [key, {
    ...value,
    graphql: { ...(value as any).graphql, maxTake: MAX_GRAPHQL_LIST_TAKE },
  }]));
}

/** Count expanded fragments so aliases and fragment spreads cannot hide query work. */
export const rentalQueryLimits: ValidationRule = (context) => ({
  Document(document) {
    const fragments = new Map(
      document.definitions
        .filter((node) => node.kind === Kind.FRAGMENT_DEFINITION)
        .map((node) => [node.name.value, node]),
    );
    let fields = 0;
    let aliases = 0;

    const inspect = (selection: any, depth: number, fragmentStack: Set<string>) => {
      if (depth > MAX_GRAPHQL_SELECTION_DEPTH) {
        throw new Error(`Query exceeds maximum selection depth (${MAX_GRAPHQL_SELECTION_DEPTH})`);
      }
      for (const node of selection?.selections || []) {
        if (node.kind === Kind.FIELD) {
          fields += 1;
          if (fields > MAX_GRAPHQL_FIELD_COUNT) throw new Error('Query exceeds maximum field count');
          if (node.alias && ++aliases > MAX_GRAPHQL_ALIAS_COUNT) throw new Error('Query exceeds maximum alias count');
          inspect(node.selectionSet, depth + 1, fragmentStack);
        } else if (node.kind === Kind.FRAGMENT_SPREAD) {
          if (fragmentStack.has(node.name.value)) throw new Error('Cyclic fragments are not supported');
          const fragment = fragments.get(node.name.value);
          if (fragment) {
            const nextStack = new Set(fragmentStack);
            nextStack.add(node.name.value);
            inspect(fragment.selectionSet, depth, nextStack);
          }
        } else {
          inspect(node.selectionSet, depth, fragmentStack);
        }
      }
    };

    try {
      for (const definition of document.definitions) {
        if (definition.kind === Kind.OPERATION_DEFINITION) inspect(definition.selectionSet, 0, new Set());
      }
    } catch (error) {
      context.reportError(new GraphQLError(error instanceof Error ? error.message : 'Query limit exceeded'));
    }
  },
});

const REQUEST_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 600;
const MAX_REQUEST_IDENTITIES = 10_000;
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

/** Process-local admission control. The deployment proxy still needs shared edge limits. */
export function admitGraphqlRequest(identity: string, now = Date.now()) {
  const key = createHash('sha256').update(identity).digest('hex');
  const existing = requestBuckets.get(key);
  if (existing && existing.resetAt > now) {
    existing.count += 1;
    return existing.count <= MAX_REQUESTS_PER_WINDOW;
  }

  if (requestBuckets.size >= MAX_REQUEST_IDENTITIES) {
    for (const [bucketKey, bucket] of requestBuckets) {
      if (bucket.resetAt <= now) requestBuckets.delete(bucketKey);
    }
    if (requestBuckets.size >= MAX_REQUEST_IDENTITIES) return false;
  }

  requestBuckets.set(key, { count: 1, resetAt: now + REQUEST_WINDOW_MS });
  return true;
}
