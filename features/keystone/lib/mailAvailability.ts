/** Email-dependent flows must not claim a message was sent when no transport is configured. */
export function passwordResetEmailConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.SMTP_HOST?.trim() && env.SMTP_FROM?.trim() && env.SMTP_STORE_LINK?.trim());
}
