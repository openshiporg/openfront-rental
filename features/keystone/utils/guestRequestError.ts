import { GraphQLError } from 'graphql';

import { safeHostCommandMessage } from './hostCommandError';

export const GUEST_REQUEST_REFUSED = 'STAY_REQUEST_REFUSED';
const GENERIC = safeHostCommandMessage(null);

/**
 * Yoga masks plain Errors as "Unexpected error.", so a guest never saw why a quote, booking,
 * cancellation or signature was refused. A refusal written for people is passed on with its
 * reason; database and provider internals stay masked exactly as before.
 */
export function guestFacing<A extends unknown[], R>(resolver: (...args: A) => Promise<R>) {
  return async (...args: A): Promise<R> => {
    try {
      return await resolver(...args);
    } catch (error) {
      if (error instanceof GraphQLError) throw error;
      const message = safeHostCommandMessage(error);
      if (message === GENERIC) throw error;
      throw new GraphQLError(message, { extensions: { code: GUEST_REQUEST_REFUSED } });
    }
  };
}
