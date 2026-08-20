import { getArgumentValues, Kind, type FieldNode, type FragmentDefinitionNode, type GraphQLSchema, type SelectionSetNode } from 'graphql';

import { enforceAbuseControl, type AbuseControlRouteKey } from './index';

type ProtectedOperation = {
  routeKey: AbuseControlRouteKey;
  subject: (args: Record<string, any>) => readonly unknown[];
};

const OPERATIONS: Record<string, ProtectedOperation> = {
  authenticateUserWithPassword: { routeKey: 'auth.sign-in', subject: (args) => [args.email] },
  createUser: { routeKey: 'auth.sign-up', subject: (args) => [args.data?.email] },
  createUsers: { routeKey: 'auth.sign-up', subject: (args) => (args.data || []).map((item: any) => item?.email) },
  sendUserPasswordResetLink: { routeKey: 'auth.password-reset-request', subject: (args) => [args.email] },
  redeemUserPasswordResetToken: { routeKey: 'auth.password-reset-redeem', subject: (args) => [args.email] },
  validateUserPasswordResetToken: { routeKey: 'auth.password-reset-validate', subject: (args) => [args.email] },
  createInitialUser: { routeKey: 'auth.initial-user', subject: (args) => [args.data?.email] },
  searchStays: { routeKey: 'storefront.search', subject: (args) => [args.destination, args.checkIn, args.checkOut] },
  publicListing: { routeKey: 'storefront.listing-read', subject: (args) => [args.slug] },
  publicStayQuote: { routeKey: 'storefront.quote-read', subject: (args) => [args.token] },
  publicTrip: { routeKey: 'storefront.trip-read', subject: (args) => [args.token] },
  publicStayAgreement: { routeKey: 'storefront.agreement-read', subject: (args) => [args.token] },
  quoteStay: { routeKey: 'storefront.quote-create', subject: (args) => [args.listingId, args.checkIn, args.checkOut] },
  createStayReservation: { routeKey: 'storefront.reservation-create', subject: (args) => [args.quoteToken, args.guestEmail] },
  requestStayCancellation: { routeKey: 'storefront.cancellation-request', subject: (args) => [args.tripToken] },
  signStayAgreement: { routeKey: 'storefront.agreement-sign', subject: (args) => [args.token] },
};

function collectRootFields(
  selectionSet: SelectionSetNode,
  fragments: Record<string, FragmentDefinitionNode>,
  seenFragments = new Set<string>(),
): FieldNode[] {
  const fields: FieldNode[] = [];
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) fields.push(selection);
    if (selection.kind === Kind.INLINE_FRAGMENT) fields.push(...collectRootFields(selection.selectionSet, fragments, seenFragments));
    if (selection.kind === Kind.FRAGMENT_SPREAD && !seenFragments.has(selection.name.value)) {
      seenFragments.add(selection.name.value);
      const fragment = fragments[selection.name.value];
      if (fragment) fields.push(...collectRootFields(fragment.selectionSet, fragments, seenFragments));
    }
  }
  return fields;
}

export function createAbuseControlGraphqlPlugin() {
  return {
    async requestDidStart() {
      return {
        async didResolveOperation(requestContext: any) {
          const operation = requestContext.operation;
          if (!operation) return;
          const schema = requestContext.schema as GraphQLSchema;
          const rootType = operation.operation === 'mutation' ? schema.getMutationType() : schema.getQueryType();
          if (!rootType) return;
          const fragments = requestContext.document.definitions.reduce((result: Record<string, FragmentDefinitionNode>, definition: any) => {
            if (definition.kind === Kind.FRAGMENT_DEFINITION) result[definition.name.value] = definition;
            return result;
          }, {});
          const fields = collectRootFields(operation.selectionSet, fragments);
          const occurrences = new Map<string, number>();
          for (const node of fields) {
            const fieldName = node.name.value;
            const protectedOperation = OPERATIONS[fieldName];
            if (!protectedOperation) continue;
            const field = rootType.getFields()[fieldName];
            if (!field) continue;
            const args = getArgumentValues(field, node, requestContext.request.variables || {});
            const occurrence = occurrences.get(fieldName) || 0;
            occurrences.set(fieldName, occurrence + 1);
            await enforceAbuseControl({
              routeKey: protectedOperation.routeKey,
              requestInput: args,
              subjectParts: protectedOperation.subject(args),
              headers: requestContext.contextValue?.req?.headers,
              operationScope: `${node.alias?.value || fieldName}:${occurrence}`,
            });
          }
        },
      };
    },
  };
}

export const PROTECTED_GRAPHQL_OPERATIONS = Object.freeze({ ...OPERATIONS });
