const DEVELOPMENT_SESSION_SECRET = 'openfront-local-development-session-secret-only';

export function resolveSessionSecret(environment: NodeJS.ProcessEnv = process.env) {
  const configured = environment.SESSION_SECRET?.trim();
  if (configured) {
    if (configured.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters.');
    return configured;
  }
  if (environment.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET is required in production.');
  }
  return DEVELOPMENT_SESSION_SECRET;
}
