import type { RolePermissions, Session } from '../access';

type MembershipGrant = {
  hostOrganizationId: string;
  membershipRole: string;
  status: string;
};

type MutationSession = Pick<Session, 'itemId'> & {
  data: { isActive: boolean; role: Partial<RolePermissions> };
};

function isPlatformAdministrator(session?: MutationSession | null) {
  return Boolean(session?.data.role?.canManageRoles || session?.data.role?.canManagePeople);
}

export function extractRelationshipId(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'object') throw new Error('A host organization relationship is required.');
  const relation = value as { connect?: { id?: string } | null; disconnect?: boolean; create?: unknown };
  if (relation.disconnect || relation.create) throw new Error('A pre-existing host organization relationship is required.');
  return relation.connect?.id || null;
}

function assertPermission(session: MutationSession | null | undefined, permission: keyof RolePermissions) {
  if (!session?.itemId || session.data.isActive !== true || !session.data.role?.[permission]) {
    throw new Error('You do not have permission to manage this host organization.');
  }
}

function activeMembership(memberships: MembershipGrant[], hostOrganizationId: string) {
  return memberships.find((membership) => membership.hostOrganizationId === hostOrganizationId && membership.status === 'active');
}

export function authorizeHostScopedMutation({
  session,
  permission,
  operation,
  currentHostOrganizationId,
  targetHostOrganizationId,
  memberships,
}: {
  session: MutationSession | null | undefined;
  permission: keyof RolePermissions;
  operation: 'create' | 'update' | 'delete';
  currentHostOrganizationId?: string | null;
  targetHostOrganizationId?: string | null;
  memberships: MembershipGrant[];
}) {
  assertPermission(session, permission);
  const target = targetHostOrganizationId || currentHostOrganizationId;
  if (!target) throw new Error('A host organization relationship is required.');
  if (operation !== 'create' && currentHostOrganizationId && target !== currentHostOrganizationId) {
    throw new Error('Records cannot be moved between host organizations.');
  }
  if (isPlatformAdministrator(session)) return;
  if (!activeMembership(memberships, target)) {
    throw new Error('You do not have access to the target host organization.');
  }
}

const roleRank: Record<string, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  operations: 2,
  finance: 2,
};

export function authorizeHostMembershipMutation({
  session,
  operation,
  currentHostOrganizationId,
  targetHostOrganizationId,
  currentMembershipRole,
  requestedRole,
  memberships,
}: {
  session: MutationSession | null | undefined;
  operation: 'create' | 'update' | 'delete';
  currentHostOrganizationId?: string | null;
  targetHostOrganizationId?: string | null;
  currentMembershipRole?: string | null;
  requestedRole?: string | null;
  memberships: MembershipGrant[];
}) {
  assertPermission(session, 'canManageProperties');
  const target = targetHostOrganizationId || currentHostOrganizationId;
  if (!target) throw new Error('A host organization relationship is required.');
  if (operation !== 'create' && currentHostOrganizationId && target !== currentHostOrganizationId) {
    throw new Error('Memberships cannot be moved between host organizations.');
  }
  if (isPlatformAdministrator(session)) return;

  const actorMembership = activeMembership(memberships, target);
  if (!actorMembership || !['owner', 'admin'].includes(actorMembership.membershipRole)) {
    throw new Error('You do not have permission to manage memberships for this host organization.');
  }
  if (actorMembership.membershipRole === 'admin') {
    if (currentMembershipRole === 'owner') throw new Error('Administrators cannot modify an owner membership.');
    if ((requestedRole || currentMembershipRole) === 'owner') throw new Error('Administrators cannot grant the owner role.');
    if ((roleRank[requestedRole || currentMembershipRole || 'manager'] || 0) > roleRank.admin) {
      throw new Error('Administrators cannot grant a higher organization role.');
    }
  }
}

async function membershipsForSession(context: any): Promise<MembershipGrant[]> {
  const userId = context.session?.itemId;
  if (!userId || isPlatformAdministrator(context.session)) return [];
  const memberships = await context.query.HostMembership.findMany({
    where: { user: { id: { equals: userId } }, status: { equals: 'active' } },
    take: 100,
    query: 'id membershipRole status hostOrganization { id }',
  });
  return memberships
    .filter((membership: any) => membership.hostOrganization?.id)
    .map((membership: any) => ({
      hostOrganizationId: membership.hostOrganization.id,
      membershipRole: membership.membershipRole,
      status: membership.status,
    }));
}

const hostScopedRelationshipDelegates: Record<string, string> = {
  property: 'property',
  owner: 'propertyOwner',
  propertyOwner: 'propertyOwner',
  ownerStatement: 'ownerStatement',
  statement: 'ownerStatement',
  taskRule: 'taskRule',
  address: 'propertyAddress',
  accommodationUnit: 'accommodationUnit',
  bedroom: 'bedroom',
  listing: 'listing',
  cancellationPolicy: 'cancellationPolicy',
  ratePlan: 'ratePlan',
  quote: 'stayQuote',
  guest: 'guestProfile',
  primaryGuest: 'guestProfile',
  guestParty: 'guestParty',
  reservation: 'reservation',
  agreement: 'stayAgreement',
  securityDeposit: 'securityDeposit',
  payment: 'payment',
  paymentProvider: 'paymentProvider',
  payout: 'payout',
  conversation: 'conversation',
  channelConnection: 'channelConnection',
  channelListing: 'channelListing',
  channelReservation: 'channelReservation',
  lineItems: 'reservationLineItem',
  calendarBlocks: 'calendarBlock',
  damageClaims: 'damageClaim',
  payments: 'payment',
  refunds: 'refund',
  reviews: 'review',
  tasks: 'propertyTask',
  messages: 'message',
};

function relationshipWriteIds(value: any): string[] {
  if (!value || typeof value !== 'object') return [];
  const values = [value.connect, value.set].flatMap((entry) => Array.isArray(entry) ? entry : entry ? [entry] : []);
  return values.map((entry: any) => entry?.id).filter((id): id is string => typeof id === 'string' && id.length > 0);
}

async function assertSubmittedRelationshipsBelongToHost(context: any, resolvedData: any, hostOrganizationId: string) {
  for (const [field, delegateName] of Object.entries(hostScopedRelationshipDelegates)) {
    const ids = relationshipWriteIds(resolvedData?.[field]);
    if (!ids.length) continue;
    const delegate = context.prisma?.[delegateName];
    if (!delegate?.findMany) throw new Error(`Cannot validate the ${field} relationship.`);
    const related = await delegate.findMany({ where: { id: { in: ids } }, select: { id: true, hostOrganizationId: true } });
    if (related.length !== ids.length || related.some((record: any) => record.hostOrganizationId !== hostOrganizationId)) {
      throw new Error(`The ${field} relationship must belong to the same host organization.`);
    }
  }
  for (const field of ['assignee', 'defaultAssignee']) {
    const userIds = relationshipWriteIds(resolvedData?.[field]);
    if (!userIds.length) continue;
    const memberships = await context.prisma.hostMembership.findMany({
      where: { hostOrganizationId, userId: { in: userIds }, status: 'active' },
      select: { userId: true },
    });
    const memberIds = new Set(memberships.map((membership: any) => membership.userId));
    if (userIds.some((id) => !memberIds.has(id))) {
      throw new Error(`The ${field} must be an active member of the same host organization.`);
    }
  }
}

export function hostScopedHooks(permission: keyof RolePermissions) {
  return {
    validate: async ({ operation, resolvedData, item, context, addValidationError }: any) => {
      // Anonymous raw CRUD is denied by list operation access. Sessionless writes
      // reaching this hook originate from narrow public domain mutations that
      // have already established their quote/token ownership boundary.
      if (!context.session?.itemId) return;
      try {
        const currentHostOrganizationId = item?.hostOrganizationId || null;
        const submittedHostOrganizationId = extractRelationshipId(resolvedData?.hostOrganization);
        const targetHostOrganizationId = submittedHostOrganizationId || currentHostOrganizationId;
        await authorizeHostScopedMutation({
          session: context.session,
          permission,
          operation,
          currentHostOrganizationId,
          targetHostOrganizationId,
          memberships: await membershipsForSession(context),
        });
        await assertSubmittedRelationshipsBelongToHost(context, resolvedData, targetHostOrganizationId!);
      } catch (error) {
        addValidationError(error instanceof Error ? error.message : 'Host organization validation failed.');
      }
    },
  };
}

export const hostMembershipHooks = {
  validate: async ({ operation, resolvedData, item, context, addValidationError }: any) => {
    try {
      const currentHostOrganizationId = item?.hostOrganizationId || null;
      const submittedHostOrganizationId = extractRelationshipId(resolvedData?.hostOrganization);
      await authorizeHostMembershipMutation({
        session: context.session,
        operation,
        currentHostOrganizationId,
        targetHostOrganizationId: submittedHostOrganizationId || currentHostOrganizationId,
        currentMembershipRole: item?.membershipRole || null,
        requestedRole: resolvedData?.membershipRole || item?.membershipRole || null,
        memberships: await membershipsForSession(context),
      });
    } catch (error) {
      addValidationError(error instanceof Error ? error.message : 'Host membership validation failed.');
    }
  },
};

export async function assertHostOrganizationAccess({
  context,
  hostOrganizationId,
  permission,
}: {
  context: any;
  hostOrganizationId: string;
  permission: keyof RolePermissions;
}) {
  authorizeHostScopedMutation({
    session: context.session,
    permission,
    operation: 'update',
    currentHostOrganizationId: hostOrganizationId,
    targetHostOrganizationId: hostOrganizationId,
    memberships: await membershipsForSession(context),
  });
}
