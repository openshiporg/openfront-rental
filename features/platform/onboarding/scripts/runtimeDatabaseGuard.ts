export function assertCliRuntimeDatabase(databaseUrl = process.env.DATABASE_URL || '') {
  let url: URL;
  try { url = new URL(databaseUrl); } catch { throw new Error('Refusing to seed: a local runtime_rental database is required.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)
    || !['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname)
    || !/^\/runtime_rental(?:_[a-z0-9_]+)?$/i.test(url.pathname)) {
    throw new Error('Refusing to seed: DATABASE_URL must point at a local runtime_rental database.');
  }
}
