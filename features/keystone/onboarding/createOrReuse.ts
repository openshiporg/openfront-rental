type Delegate = { findUnique: (args: any) => Promise<any>; upsert: (args: any) => Promise<any>; update: (args: any) => Promise<any> };

/** Foreign keys of host-scoped parents that an onboarding record may point at. */
const HOST_SCOPED_PARENTS: Record<string, string> = {
  addressId: 'propertyAddress',
  propertyId: 'property',
  accommodationUnitId: 'accommodationUnit',
  bedroomId: 'bedroom',
  listingId: 'listing',
  ratePlanId: 'ratePlan',
  cancellationPolicyId: 'cancellationPolicy',
  guestId: 'guestProfile',
  primaryGuestId: 'guestProfile',
  reservationId: 'reservation',
  agreementId: 'stayAgreement',
  securityDepositId: 'securityDeposit',
  paymentProviderId: 'paymentProvider',
  paymentId: 'payment',
  conversationId: 'conversation',
  ownerId: 'propertyOwner',
  statementId: 'ownerStatement',
  taskRuleId: 'taskRule',
  connectionId: 'channelConnection',
  channelConnectionId: 'channelConnection',
  channelListingId: 'channelListing',
};

/**
 * Every existing parent a record points at must belong to the record's own host, checked
 * inside the same transaction as the write, whatever order or subset of items is submitted.
 */
async function assertSameHostParents(prisma: any, model: string, data: any) {
  const hostOrganizationId = data?.hostOrganizationId;
  if (!hostOrganizationId) return;
  for (const [field, parentModel] of Object.entries(HOST_SCOPED_PARENTS)) {
    const id = data[field];
    if (typeof id !== 'string' || !id) continue;
    const parent = await prisma[parentModel]?.findUnique({ where: { id }, select: { hostOrganizationId: true } });
    if (!parent) throw new Error(`Missing ${parentModel} dependency for ${model}. Complete the earlier setup step first.`);
    if (parent.hostOrganizationId !== hostOrganizationId) throw new Error(`The ${parentModel} for this ${model} belongs to a different host organization.`);
  }
}

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
            if (existing) {
              // Reusing a record is only allowed within the same host organization.
              if (create?.hostOrganizationId && existing.hostOrganizationId && existing.hostOrganizationId !== create.hostOrganizationId) {
                throw new Error(`This ${model} belongs to a different host organization.`);
              }
              return existing;
            }
            await assertSameHostParents(target, model, create);
            const saved = await record.upsert({ where, create, update: {} });
            const ids = created.get(model) || new Set<string>();
            ids.add(String(saved.id)); created.set(model, ids);
            return saved;
          };
          if (method === 'update') return async ({ where, data }: any) => {
            const existing = await record.findUnique({ where });
            if (!existing) throw new Error(`Missing ${model} dependency.`);
            if (!created.get(model)?.has(String(existing.id))) return existing;
            await assertSameHostParents(target, model, { ...data, hostOrganizationId: data?.hostOrganizationId || existing.hostOrganizationId });
            return record.update({ where, data });
          };
          const value = (record as any)[method];
          return typeof value === 'function' ? value.bind(record) : value;
        },
      });
    },
  });
}
