import type { GraphQLSchema } from 'graphql';

import { passwordResetEmailConfigured } from '../lib/mailAvailability';

/**
 * Keystone answers `sendUserPasswordResetLink` with `true` for every email. Without a mail
 * transport that claims a link was sent when none can be, so fail the request for every
 * email alike (no account enumeration) until SMTP is configured.
 */
export function installPasswordResetGraphqlBoundary(baseSchema: GraphQLSchema) {
  const field = baseSchema.getMutationType()?.getFields().sendUserPasswordResetLink;
  const resolve = field?.resolve;
  if (!field || typeof resolve !== 'function') return;
  field.resolve = (root, args, context, info) => {
    if (!passwordResetEmailConfigured()) throw new Error('Password reset email isn’t available for this store.');
    return resolve(root, args, context, info);
  };
}
