export type RolePermissions = {
  canAccessDashboard: boolean;
  canReadProperties: boolean;
  canManageProperties: boolean;
  canReadListings: boolean;
  canManageListings: boolean;
  canReadCalendar: boolean;
  canManageCalendar: boolean;
  canReadPricing: boolean;
  canManagePricing: boolean;
  canReadReservations: boolean;
  canManageReservations: boolean;
  canReadGuests: boolean;
  canManageGuests: boolean;
  canReadMessages: boolean;
  canManageMessages: boolean;
  canReadChannels: boolean;
  canManageChannels: boolean;
  canReadPayouts: boolean;
  canManagePayouts: boolean;
  canReadReviews: boolean;
  canManageReviews: boolean;
  canReadPayments: boolean;
  canManagePayments: boolean;
  canReadReports: boolean;
  canManageReports: boolean;
  canSeeOtherPeople: boolean;
  canEditOtherPeople: boolean;
  canManagePeople: boolean;
  canManageRoles: boolean;
  canManageOnboarding: boolean;
  canManageSettings: boolean;
};

export type Session = {
  itemId: string;
  listKey: string;
  data: {
    name: string;
    isActive: boolean;
    role: RolePermissions;
  };
};

type AccessArgs = { session?: Session };
type PermissionName = keyof RolePermissions;

export function isSignedIn({ session }: AccessArgs) {
  return Boolean(session?.itemId && session.data.isActive === true);
}

function hasPermission(permission: PermissionName) {
  return ({ session }: AccessArgs) => Boolean(session?.itemId && session.data.isActive === true && session.data.role?.[permission]);
}

export const permissions = {
  canAccessDashboard: hasPermission('canAccessDashboard'),
  canReadProperties: hasPermission('canReadProperties'),
  canManageProperties: hasPermission('canManageProperties'),
  canReadListings: hasPermission('canReadListings'),
  canManageListings: hasPermission('canManageListings'),
  canReadCalendar: hasPermission('canReadCalendar'),
  canManageCalendar: hasPermission('canManageCalendar'),
  canReadPricing: hasPermission('canReadPricing'),
  canManagePricing: hasPermission('canManagePricing'),
  canReadReservations: hasPermission('canReadReservations'),
  canManageReservations: hasPermission('canManageReservations'),
  canReadGuests: hasPermission('canReadGuests'),
  canManageGuests: hasPermission('canManageGuests'),
  canReadMessages: hasPermission('canReadMessages'),
  canManageMessages: hasPermission('canManageMessages'),
  canReadChannels: hasPermission('canReadChannels'),
  canManageChannels: hasPermission('canManageChannels'),
  canReadPayouts: hasPermission('canReadPayouts'),
  canManagePayouts: hasPermission('canManagePayouts'),
  canReadReviews: hasPermission('canReadReviews'),
  canManageReviews: hasPermission('canManageReviews'),
  canReadPayments: hasPermission('canReadPayments'),
  canManagePayments: hasPermission('canManagePayments'),
  canReadReports: hasPermission('canReadReports'),
  canManageReports: hasPermission('canManageReports'),
  canManagePeople: hasPermission('canManagePeople'),
  canManageRoles: hasPermission('canManageRoles'),
  canManageOnboarding: hasPermission('canManageOnboarding'),
  canManageSettings: hasPermission('canManageSettings'),
};

function isPlatformAdministrator(session?: Session) {
  return Boolean(session?.data.role?.canManageRoles || session?.data.role?.canManagePeople);
}

function activeMembershipFilter(itemId: string) {
  return {
    hostOrganization: {
      memberships: {
        some: {
          user: { id: { equals: itemId } },
          status: { equals: 'active' },
        },
      },
    },
  };
}

function hostScopedFilter(permission: PermissionName) {
  return ({ session }: AccessArgs) => {
    if (!session || !session.data.role?.[permission]) return false;
    if (isPlatformAdministrator(session)) return true;
    return activeMembershipFilter(session.itemId);
  };
}

export const rules = {
  canReadPeople: ({ session }: AccessArgs) => {
    if (!session) return false;
    if (session.data.role?.canSeeOtherPeople || session.data.role?.canManagePeople) return true;
    return { id: { equals: session.itemId } };
  },
  canUpdatePeople: ({ session }: AccessArgs) => {
    if (!session) return false;
    if (session.data.role?.canEditOtherPeople || session.data.role?.canManagePeople) return true;
    return { id: { equals: session.itemId } };
  },
  canReadHostOrganizations: ({ session }: AccessArgs) => {
    if (!session || !session.data.role?.canReadProperties) return false;
    if (isPlatformAdministrator(session)) return true;
    return {
      memberships: {
        some: {
          user: { id: { equals: session.itemId } },
          status: { equals: 'active' },
        },
      },
    };
  },
  canManageHostOrganizations: ({ session }: AccessArgs) => {
    if (!session || !session.data.role?.canManageProperties) return false;
    if (isPlatformAdministrator(session)) return true;
    return {
      memberships: {
        some: {
          user: { id: { equals: session.itemId } },
          status: { equals: 'active' },
          membershipRole: { in: ['owner', 'admin'] },
        },
      },
    };
  },
  canReadHostMemberships: ({ session }: AccessArgs) => {
    if (!session) return false;
    if (isPlatformAdministrator(session)) return true;
    return {
      OR: [
        { user: { id: { equals: session.itemId } } },
        {
          hostOrganization: {
            memberships: {
              some: {
                user: { id: { equals: session.itemId } },
                status: { equals: 'active' },
              },
            },
          },
        },
      ],
    };
  },
  canManageHostMemberships: ({ session }: AccessArgs) => {
    if (!session || !session.data.role?.canManageProperties) return false;
    if (isPlatformAdministrator(session)) return true;
    return {
      hostOrganization: {
        memberships: {
          some: {
            user: { id: { equals: session.itemId } },
            status: { equals: 'active' },
            membershipRole: { in: ['owner', 'admin'] },
          },
        },
      },
    };
  },
  canReadHostScopedRecords: hostScopedFilter,
  canManageHostScopedRecords: hostScopedFilter,
};

/**
 * Host-scoped records written only by domain commands (sent messages, moderated reviews,
 * execution receipts): readable within the host, never created or rewritten as raw CRUD.
 */
export function hostScopedDomainOwnedListAccess(readPermission: PermissionName) {
  return {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: hostScopedFilter(readPermission) },
  };
}

export function hostScopedListAccess(
  readPermission: PermissionName,
  managePermission: PermissionName,
) {
  return {
    operation: {
      query: isSignedIn,
      create: hasPermission(managePermission),
      update: hasPermission(managePermission),
      delete: hasPermission(managePermission),
    },
    filter: {
      query: hostScopedFilter(readPermission),
      update: hostScopedFilter(managePermission),
      delete: hostScopedFilter(managePermission),
    },
  };
}
