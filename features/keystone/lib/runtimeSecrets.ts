const DEVELOPMENT_SESSION_SECRET = 'openfront-local-development-session-secret-only';

export function resolvePostgresDatabaseUrl(environment: NodeJS.ProcessEnv = process.env) {
  const configured = environment.DATABASE_URL?.trim();
  if (!configured) throw new Error('DATABASE_URL is required.');

  let parsed: URL;
  try {
    parsed = new URL(configured);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname || parsed.pathname === '' || parsed.pathname === '/') {
    throw new Error('DATABASE_URL must identify a PostgreSQL host and database.');
  }
  return configured;
}

export function resolveSessionSecret(environment: NodeJS.ProcessEnv = process.env) {
  const configured = environment.SESSION_SECRET?.trim();
  if (configured) {
    if (configured.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters.');
    if (environment.NODE_ENV === 'production' && configured === DEVELOPMENT_SESSION_SECRET) {
      throw new Error('A development session secret cannot be used in production.');
    }
    return configured;
  }
  if (environment.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET is required in production.');
  }
  return DEVELOPMENT_SESSION_SECRET;
}
