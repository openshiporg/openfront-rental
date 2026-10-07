type Delegate = { findUnique: (args: any) => Promise<any>; upsert: (args: any) => Promise<any>; update: (args: any) => Promise<any> };

/** Narrow adapter for onboarding-owned payloads. Existing records are never reset.
 * Prisma is intentional here: synthetic financial snapshots cannot be created
 * through public lifecycle mutations. The caller must authorize and validate first.
 */
export function createOrReuseDatabase(prisma: any) {
  const created = new Map<string, Set<string>>();
  return new Proxy(prisma, {
    get(target, model: string) {
      const delegate: Delegate = target[model];
      if (!delegate || typeof delegate !== 'object') return delegate;
      return new Proxy(delegate, {
        get(record, method: string) {
          if (method === 'deleteMany' || method === 'delete') throw new Error('Onboarding may not delete merchant records.');
          if (method === 'upsert') return async ({ where, create }: any) => {
            const existing = await record.findUnique({ where });
            if (existing) return existing;
            const saved = await record.upsert({ where, create, update: {} });
            const ids = created.get(model) || new Set<string>();
            ids.add(String(saved.id)); created.set(model, ids);
            return saved;
          };
          if (method === 'update') return async ({ where, data }: any) => {
            const existing = await record.findUnique({ where });
            if (!existing) throw new Error(`Missing ${model} dependency.`);
            if (!created.get(model)?.has(String(existing.id))) return existing;
            return record.update({ where, data });
          };
          const value = (record as any)[method];
          return typeof value === 'function' ? value.bind(record) : value;
        },
      });
    },
  });
}
