export function assertCliRuntimeDatabase(databaseUrl = process.env.DATABASE_URL || '') {
  if (!/\/runtime_rental(?:_[a-z0-9_]+)?(?:[?]|$)/i.test(databaseUrl)) {
    throw new Error('Refusing to seed: DATABASE_URL must point at a safe local runtime_rental database.');
  }
}
