"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// keystone.ts
var keystone_exports = {};
__export(keystone_exports, {
  default: () => keystone_default2
});
module.exports = __toCommonJS(keystone_exports);

// features/keystone/lib/s3-storage.ts
function s3ForcePathStyle(endpoint2) {
  let hostname = "";
  try {
    hostname = endpoint2 ? new URL(endpoint2).hostname : "";
  } catch {
  }
  return !(hostname === "storageapi.dev" || hostname.endsWith(".storageapi.dev"));
}

// features/keystone/index.ts
var import_auth = require("@keystone-6/auth");
var import_core50 = require("@keystone-6/core");
var import_config = require("dotenv/config");

// features/keystone/models/AccommodationUnit.ts
var import_core = require("@keystone-6/core");
var import_fields2 = require("@keystone-6/core/fields");

// features/keystone/access.ts
function isSignedIn({ session }) {
  return Boolean(session?.itemId && session.data.isActive === true);
}
function hasPermission(permission) {
  return ({ session }) => Boolean(session?.itemId && session.data.isActive === true && session.data.role?.[permission]);
}
var permissions = {
  canAccessDashboard: hasPermission("canAccessDashboard"),
  canReadProperties: hasPermission("canReadProperties"),
  canManageProperties: hasPermission("canManageProperties"),
  canReadListings: hasPermission("canReadListings"),
  canManageListings: hasPermission("canManageListings"),
  canReadCalendar: hasPermission("canReadCalendar"),
  canManageCalendar: hasPermission("canManageCalendar"),
  canReadPricing: hasPermission("canReadPricing"),
  canManagePricing: hasPermission("canManagePricing"),
  canReadReservations: hasPermission("canReadReservations"),
  canManageReservations: hasPermission("canManageReservations"),
  canReadGuests: hasPermission("canReadGuests"),
  canManageGuests: hasPermission("canManageGuests"),
  canReadMessages: hasPermission("canReadMessages"),
  canManageMessages: hasPermission("canManageMessages"),
  canReadChannels: hasPermission("canReadChannels"),
  canManageChannels: hasPermission("canManageChannels"),
  canReadPayouts: hasPermission("canReadPayouts"),
  canManagePayouts: hasPermission("canManagePayouts"),
  canReadReviews: hasPermission("canReadReviews"),
  canManageReviews: hasPermission("canManageReviews"),
  canReadPayments: hasPermission("canReadPayments"),
  canManagePayments: hasPermission("canManagePayments"),
  canReadReports: hasPermission("canReadReports"),
  canManageReports: hasPermission("canManageReports"),
  canManagePeople: hasPermission("canManagePeople"),
  canManageRoles: hasPermission("canManageRoles"),
  canManageOnboarding: hasPermission("canManageOnboarding"),
  canManageSettings: hasPermission("canManageSettings")
};
function isPlatformAdministrator(session) {
  return Boolean(session?.data.role?.canManageRoles || session?.data.role?.canManagePeople);
}
function activeMembershipFilter(itemId) {
  return {
    hostOrganization: {
      memberships: {
        some: {
          user: { id: { equals: itemId } },
          status: { equals: "active" }
        }
      }
    }
  };
}
function hostScopedFilter(permission) {
  return ({ session }) => {
    if (!session || !session.data.role?.[permission]) return false;
    if (isPlatformAdministrator(session)) return true;
    return activeMembershipFilter(session.itemId);
  };
}
var rules = {
  canReadPeople: ({ session }) => {
    if (!session) return false;
    if (session.data.role?.canSeeOtherPeople || session.data.role?.canManagePeople) return true;
    return { id: { equals: session.itemId } };
  },
  canUpdatePeople: ({ session }) => {
    if (!session) return false;
    if (session.data.role?.canEditOtherPeople || session.data.role?.canManagePeople) return true;
    return { id: { equals: session.itemId } };
  },
  canReadHostOrganizations: ({ session }) => {
    if (!session || !session.data.role?.canReadProperties) return false;
    if (isPlatformAdministrator(session)) return true;
    return {
      memberships: {
        some: {
          user: { id: { equals: session.itemId } },
          status: { equals: "active" }
        }
      }
    };
  },
  canManageHostOrganizations: ({ session }) => {
    if (!session || !session.data.role?.canManageProperties) return false;
    if (isPlatformAdministrator(session)) return true;
    return {
      memberships: {
        some: {
          user: { id: { equals: session.itemId } },
          status: { equals: "active" },
          membershipRole: { in: ["owner", "admin"] }
        }
      }
    };
  },
  canReadHostMemberships: ({ session }) => {
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
                status: { equals: "active" }
              }
            }
          }
        }
      ]
    };
  },
  canManageHostMemberships: ({ session }) => {
    if (!session || !session.data.role?.canManageProperties) return false;
    if (isPlatformAdministrator(session)) return true;
    return {
      hostOrganization: {
        memberships: {
          some: {
            user: { id: { equals: session.itemId } },
            status: { equals: "active" },
            membershipRole: { in: ["owner", "admin"] }
          }
        }
      }
    };
  },
  canReadHostScopedRecords: hostScopedFilter,
  canManageHostScopedRecords: hostScopedFilter
};
function hostScopedDomainOwnedListAccess(readPermission) {
  return {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: hostScopedFilter(readPermission) }
  };
}
function hostScopedListAccess(readPermission, managePermission) {
  return {
    operation: {
      query: isSignedIn,
      create: hasPermission(managePermission),
      update: hasPermission(managePermission),
      delete: hasPermission(managePermission)
    },
    filter: {
      query: hostScopedFilter(readPermission),
      update: hostScopedFilter(managePermission),
      delete: hostScopedFilter(managePermission)
    }
  };
}

// features/keystone/utils/hostOrganizationAccess.ts
function isPlatformAdministrator2(session) {
  return Boolean(session?.data.role?.canManageRoles || session?.data.role?.canManagePeople);
}
function extractRelationshipId(value) {
  if (value === void 0 || value === null) return null;
  if (typeof value !== "object") throw new Error("A host organization relationship is required.");
  const relation = value;
  if (relation.disconnect || relation.create) throw new Error("A pre-existing host organization relationship is required.");
  return relation.connect?.id || null;
}
function assertPermission(session, permission) {
  if (!session?.itemId || session.data.isActive !== true || !session.data.role?.[permission]) {
    throw new Error("You do not have permission to manage this host organization.");
  }
}
function activeMembership(memberships, hostOrganizationId) {
  return memberships.find((membership) => membership.hostOrganizationId === hostOrganizationId && membership.status === "active");
}
function authorizeHostScopedMutation({
  session,
  permission,
  operation,
  currentHostOrganizationId,
  targetHostOrganizationId,
  memberships
}) {
  assertPermission(session, permission);
  const target = targetHostOrganizationId || currentHostOrganizationId;
  if (!target) throw new Error("A host organization relationship is required.");
  if (operation !== "create" && currentHostOrganizationId && target !== currentHostOrganizationId) {
    throw new Error("Records cannot be moved between host organizations.");
  }
  if (isPlatformAdministrator2(session)) return;
  if (!activeMembership(memberships, target)) {
    throw new Error("You do not have access to the target host organization.");
  }
}
var roleRank = {
  owner: 5,
  admin: 4,
  manager: 3,
  operations: 2,
  finance: 2
};
function authorizeHostMembershipMutation({
  session,
  operation,
  currentHostOrganizationId,
  targetHostOrganizationId,
  currentMembershipRole,
  requestedRole,
  memberships
}) {
  assertPermission(session, "canManageProperties");
  const target = targetHostOrganizationId || currentHostOrganizationId;
  if (!target) throw new Error("A host organization relationship is required.");
  if (operation !== "create" && currentHostOrganizationId && target !== currentHostOrganizationId) {
    throw new Error("Memberships cannot be moved between host organizations.");
  }
  if (isPlatformAdministrator2(session)) return;
  const actorMembership = activeMembership(memberships, target);
  if (!actorMembership || !["owner", "admin"].includes(actorMembership.membershipRole)) {
    throw new Error("You do not have permission to manage memberships for this host organization.");
  }
  if (actorMembership.membershipRole === "admin") {
    if (currentMembershipRole === "owner") throw new Error("Administrators cannot modify an owner membership.");
    if ((requestedRole || currentMembershipRole) === "owner") throw new Error("Administrators cannot grant the owner role.");
    if ((roleRank[requestedRole || currentMembershipRole || "manager"] || 0) > roleRank.admin) {
      throw new Error("Administrators cannot grant a higher organization role.");
    }
  }
}
async function membershipsForSession(context) {
  const userId = context.session?.itemId;
  if (!userId || isPlatformAdministrator2(context.session)) return [];
  const memberships = await context.query.HostMembership.findMany({
    where: { user: { id: { equals: userId } }, status: { equals: "active" } },
    take: 100,
    query: "id membershipRole status hostOrganization { id }"
  });
  return memberships.filter((membership) => membership.hostOrganization?.id).map((membership) => ({
    hostOrganizationId: membership.hostOrganization.id,
    membershipRole: membership.membershipRole,
    status: membership.status
  }));
}
var hostScopedRelationshipDelegates = {
  property: "property",
  owner: "propertyOwner",
  propertyOwner: "propertyOwner",
  ownerStatement: "ownerStatement",
  statement: "ownerStatement",
  taskRule: "taskRule",
  address: "propertyAddress",
  accommodationUnit: "accommodationUnit",
  bedroom: "bedroom",
  listing: "listing",
  cancellationPolicy: "cancellationPolicy",
  ratePlan: "ratePlan",
  quote: "stayQuote",
  guest: "guestProfile",
  primaryGuest: "guestProfile",
  guestParty: "guestParty",
  reservation: "reservation",
  agreement: "stayAgreement",
  securityDeposit: "securityDeposit",
  payment: "payment",
  paymentProvider: "paymentProvider",
  payout: "payout",
  conversation: "conversation",
  channelConnection: "channelConnection",
  channelListing: "channelListing",
  channelReservation: "channelReservation",
  lineItems: "reservationLineItem",
  calendarBlocks: "calendarBlock",
  damageClaims: "damageClaim",
  payments: "payment",
  refunds: "refund",
  reviews: "review",
  tasks: "propertyTask",
  messages: "message",
  // Reverse and remaining forward relationships: every connect/set target is checked too.
  refund: "refund",
  channelReservations: "channelReservation",
  listings: "listing",
  units: "accommodationUnit",
  bedrooms: "bedroom",
  beds: "bed",
  media: "listingMedia",
  houseRules: "houseRule",
  ratePlans: "ratePlan",
  seasonalRates: "seasonalRate",
  feeDefinitions: "feeDefinition",
  taxRules: "taxRule",
  quotes: "stayQuote",
  channelListings: "channelListing",
  syncEvents: "channelSyncEvent",
  dataExchangeJobs: "dataExchangeJob",
  conversations: "conversation",
  taskRules: "taskRule",
  ownerAssignments: "propertyOwnerAssignment",
  assignments: "propertyOwnerAssignment",
  statements: "ownerStatement",
  payouts: "payout",
  lines: "ownerStatementLine",
  agreements: "stayAgreement",
  amendments: "reservationAmendment",
  securityDeposits: "securityDeposit",
  webhookEvents: "paymentWebhookEvent"
};
function relationshipWriteIds(value) {
  if (!value || typeof value !== "object") return [];
  const values = [value.connect, value.set].flatMap((entry) => Array.isArray(entry) ? entry : entry ? [entry] : []);
  return values.map((entry) => entry?.id).filter((id2) => typeof id2 === "string" && id2.length > 0);
}
async function assertSubmittedRelationshipsBelongToHost(context, resolvedData, hostOrganizationId) {
  for (const [field, delegateName] of Object.entries(hostScopedRelationshipDelegates)) {
    const ids = relationshipWriteIds(resolvedData?.[field]);
    if (!ids.length) continue;
    const delegate = context.prisma?.[delegateName];
    if (!delegate?.findMany) throw new Error(`Cannot validate the ${field} relationship.`);
    const related = await delegate.findMany({ where: { id: { in: ids } }, select: { id: true, hostOrganizationId: true } });
    if (related.length !== ids.length || related.some((record5) => record5.hostOrganizationId !== hostOrganizationId)) {
      throw new Error(`The ${field} relationship must belong to the same host organization.`);
    }
  }
  for (const field of ["assignee", "defaultAssignee"]) {
    const userIds = relationshipWriteIds(resolvedData?.[field]);
    if (!userIds.length) continue;
    const memberships = await context.prisma.hostMembership.findMany({
      where: { hostOrganizationId, userId: { in: userIds }, status: "active" },
      select: { userId: true }
    });
    const memberIds = new Set(memberships.map((membership) => membership.userId));
    if (userIds.some((id2) => !memberIds.has(id2))) {
      throw new Error(`The ${field} must be an active member of the same host organization.`);
    }
  }
}
async function inheritParentHostOrganization({ operation, resolvedData, context }) {
  if (operation !== "create" || !context.session?.itemId || resolvedData?.hostOrganization) return resolvedData;
  const hostOrganizationIds = /* @__PURE__ */ new Set();
  for (const [field, delegateName] of Object.entries(hostScopedRelationshipDelegates)) {
    const ids = relationshipWriteIds(resolvedData?.[field]);
    if (!ids.length) continue;
    const delegate = context.prisma?.[delegateName];
    if (!delegate?.findMany) continue;
    const related = await delegate.findMany({ where: { id: { in: ids } }, select: { hostOrganizationId: true } });
    for (const record5 of related) if (record5.hostOrganizationId) hostOrganizationIds.add(record5.hostOrganizationId);
  }
  if (hostOrganizationIds.size === 0) {
    const memberships = await membershipsForSession(context);
    if (memberships.length === 1) hostOrganizationIds.add(memberships[0].hostOrganizationId);
  }
  if (hostOrganizationIds.size !== 1) return resolvedData;
  return { ...resolvedData, hostOrganization: { connect: { id: [...hostOrganizationIds][0] } } };
}
async function archivedParentProblem(context, item, resolvedData, { parent, foreignKeyOnParent }) {
  const ids = /* @__PURE__ */ new Set();
  if (foreignKeyOnParent) {
    if (item?.id) {
      const owner = await context.prisma[parent].findFirst({ where: { [foreignKeyOnParent]: item.id }, select: { id: true } });
      if (owner) ids.add(owner.id);
    }
  } else if (item?.[`${parent}Id`]) ids.add(item[`${parent}Id`]);
  const submitted = resolvedData?.[parent]?.connect?.id;
  if (submitted) ids.add(submitted);
  if (!ids.size) return null;
  const archived = await context.prisma[parent].findFirst({ where: { id: { in: [...ids] }, status: "archived" }, select: { id: true } });
  return archived ? `This ${parent} is archived; its setup is read-only.` : null;
}
function hostScopedHooks(permission, archivedParent) {
  return {
    resolveInput: inheritParentHostOrganization,
    validate: async ({ operation, resolvedData, item, context, addValidationError }) => {
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
          memberships: await membershipsForSession(context)
        });
        await assertSubmittedRelationshipsBelongToHost(context, resolvedData, targetHostOrganizationId);
        if (archivedParent && operation !== "delete") {
          const problem = await archivedParentProblem(context, item, resolvedData, archivedParent);
          if (problem) throw new Error(problem);
        }
      } catch (error) {
        addValidationError(error instanceof Error ? error.message : "Host organization validation failed.");
      }
    }
  };
}
var hostMembershipHooks = {
  validate: async ({ operation, resolvedData, item, context, addValidationError }) => {
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
        memberships: await membershipsForSession(context)
      });
      const lastOwnerProblem = await lastActiveOwnerProblem({ operation, resolvedData, item, context });
      if (lastOwnerProblem) addValidationError(lastOwnerProblem);
    } catch (error) {
      addValidationError(error instanceof Error ? error.message : "Host membership validation failed.");
    }
  }
};
async function lastActiveOwnerProblem({ operation, resolvedData, item, context }) {
  if (operation === "create" || item?.membershipRole !== "owner" || item?.status !== "active" || !item?.hostOrganizationId) return null;
  const staysActiveOwner = operation === "update" && (resolvedData?.membershipRole ?? item.membershipRole) === "owner" && (resolvedData?.status ?? item.status) === "active";
  if (staysActiveOwner) return null;
  const otherOwners = await context.prisma.hostMembership.count({
    where: { hostOrganizationId: item.hostOrganizationId, membershipRole: "owner", status: "active", id: { not: item.id } }
  });
  return otherOwners ? null : "This is the only active owner of the host organization. Make another member an owner first.";
}
async function assertHostOrganizationAccess({
  context,
  hostOrganizationId,
  permission
}) {
  authorizeHostScopedMutation({
    session: context.session,
    permission,
    operation: "update",
    currentHostOrganizationId: hostOrganizationId,
    targetHostOrganizationId: hostOrganizationId,
    memberships: await membershipsForSession(context)
  });
}

// features/keystone/models/trackingFields.ts
var import_fields = require("@keystone-6/core/fields");
var trackingFields = {
  createdAt: (0, import_fields.timestamp)({
    access: { read: () => true, create: () => false, update: () => false },
    validation: { isRequired: true },
    defaultValue: { kind: "now" },
    ui: {
      createView: { fieldMode: "hidden" },
      itemView: { fieldMode: "read" }
    }
  }),
  updatedAt: (0, import_fields.timestamp)({
    access: { read: () => true, create: () => false, update: () => false },
    db: { updatedAt: true },
    validation: { isRequired: true },
    defaultValue: { kind: "now" },
    ui: {
      createView: { fieldMode: "hidden" },
      itemView: { fieldMode: "read" }
    }
  })
};

// features/keystone/utils/deleteHistoryGuard.ts
var SINGULAR = { people: "person", properties: "property", "damage claims": "damage claim", "channel listings": "channel listing" };
function countLabel(count, plural) {
  if (count !== 1) return `${count} ${plural}`;
  return `1 ${SINGULAR[plural] ?? plural.replace(/s$/, "")}`;
}
var DELETE_HISTORY = {
  HostOrganization: {
    instead: "Archive the host organization instead of deleting it.",
    references: [
      { model: "reservation", field: "hostOrganizationId", label: "reservations" },
      { model: "payment", field: "hostOrganizationId", label: "payments" },
      { model: "payout", field: "hostOrganizationId", label: "payouts" },
      { model: "ownerStatement", field: "hostOrganizationId", label: "owner statements" },
      { model: "property", field: "hostOrganizationId", label: "properties" },
      { model: "listing", field: "hostOrganizationId", label: "listings" },
      { model: "guestProfile", field: "hostOrganizationId", label: "guests" },
      { model: "hostMembership", field: "hostOrganizationId", label: "team memberships" }
    ]
  },
  Property: {
    instead: "Archive the property instead of deleting it.",
    references: [
      { model: "listing", field: "propertyId", label: "listings" },
      { model: "accommodationUnit", field: "propertyId", label: "units" },
      { model: "propertyTask", field: "propertyId", label: "tasks" },
      { model: "propertyOwnerAssignment", field: "propertyId", label: "owner assignments" }
    ]
  },
  Listing: {
    instead: "Archive the listing instead of deleting it.",
    references: [
      { model: "reservation", field: "listingId", label: "reservations" },
      { model: "stayQuote", field: "listingId", label: "quotes" },
      { model: "calendarBlock", field: "listingId", label: "calendar blocks" },
      { model: "review", field: "listingId", label: "reviews" },
      { model: "damageClaim", field: "listingId", label: "damage claims" },
      { model: "conversation", field: "listingId", label: "conversations" },
      { model: "propertyTask", field: "listingId", label: "tasks" },
      { model: "channelListing", field: "listingId", label: "channel listings" }
    ]
  },
  AccommodationUnit: {
    instead: "Keep the unit; remove it from the listing instead.",
    references: [
      { model: "reservation", field: "accommodationUnitId", label: "reservations" },
      { model: "listing", field: "accommodationUnitId", label: "listings" }
    ]
  },
  GuestProfile: {
    instead: "Guest records with stays are kept for the host\u2019s records.",
    references: [
      { model: "reservation", field: "guestId", label: "reservations" },
      { model: "payment", field: "guestId", label: "payments" },
      { model: "stayAgreement", field: "guestId", label: "agreements" },
      { model: "damageClaim", field: "guestId", label: "damage claims" },
      { model: "review", field: "guestId", label: "reviews" },
      { model: "conversation", field: "guestId", label: "conversations" }
    ]
  },
  RatePlan: {
    instead: "Set the rate plan to inactive instead of deleting it.",
    references: [{ model: "stayQuote", field: "ratePlanId", label: "quotes" }]
  },
  CancellationPolicy: {
    instead: "Create a new policy version instead of deleting this one.",
    references: [
      { model: "stayAgreement", field: "cancellationPolicyId", label: "signed agreements" },
      { model: "ratePlan", field: "cancellationPolicyId", label: "rate plans" }
    ]
  },
  PropertyOwner: {
    instead: "Mark the owner inactive instead of deleting them.",
    references: [
      { model: "ownerStatement", field: "ownerId", label: "owner statements" },
      { model: "payout", field: "propertyOwnerId", label: "payouts" },
      { model: "propertyOwnerAssignment", field: "ownerId", label: "property assignments" }
    ]
  },
  ChannelConnection: {
    instead: "Disconnect the channel instead of deleting it.",
    references: [
      { model: "channelReservation", field: "channelConnectionId", label: "channel reservations" },
      { model: "channelListing", field: "channelConnectionId", label: "channel listings" },
      { model: "conversation", field: "channelConnectionId", label: "conversations" }
    ]
  },
  ChannelListing: {
    instead: "Pause the channel listing instead of deleting it.",
    references: [{ model: "channelReservation", field: "channelListingId", label: "channel reservations" }]
  },
  ChannelReservation: {
    instead: "Channel reservations are kept as sync history.",
    references: [{ model: "calendarBlock", field: "channelReservationId", label: "calendar blocks" }]
  },
  Conversation: {
    instead: "Close the conversation instead of deleting it.",
    references: [{ model: "message", field: "conversationId", label: "messages" }]
  },
  User: {
    instead: "Turn off Active instead of deleting the account.",
    references: [
      { model: "reservation", field: "bookedById", label: "reservations" },
      { model: "payment", field: "processedById", label: "payments" },
      { model: "hostMembership", field: "userId", label: "team memberships" },
      { model: "guestProfile", field: "userId", label: "guest profiles" },
      { model: "propertyOwner", field: "userId", label: "owner records" },
      { model: "message", field: "senderUserId", label: "messages" }
    ]
  },
  Role: {
    instead: "Give those people another role first.",
    references: [{ model: "user", field: "roleId", label: "people" }]
  }
};
async function deleteHistoryProblem(prisma, listKey, id2) {
  const rule = DELETE_HISTORY[listKey];
  if (!rule) return null;
  const counts = await Promise.all(rule.references.map((ref) => prisma[ref.model].count({ where: { [ref.field]: id2 } })));
  const found = rule.references.map((ref, i) => counts[i] ? countLabel(counts[i], ref.label) : "").filter(Boolean);
  return found.length ? `This record has ${found.join(", ")}. ${rule.instead}` : null;
}
function historyDeleteGuard(listKey) {
  return async ({ item, context, addValidationError }) => {
    if (listKey === "User" && String(item.id) === String(context.session?.itemId || "")) {
      addValidationError("You can\u2019t delete your own account.");
      return;
    }
    const problem = await deleteHistoryProblem(context.prisma, listKey, String(item.id));
    if (problem) addValidationError(problem);
  };
}
var DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
function validDateOnly(value) {
  if (typeof value !== "string" || !DATE_ONLY.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}
function dateRangeProblem(start, end, label) {
  if (start == null && end == null) return null;
  if (!validDateOnly(start) || !validDateOnly(end)) return `${label} dates must be real dates in YYYY-MM-DD format.`;
  if (String(end) <= String(start)) return `${label} must end after it starts (the end date is the first day it no longer applies).`;
  return null;
}
function withChecks(hooks, extra) {
  const base = hooks?.validate;
  return {
    ...hooks,
    validate: async (args) => {
      if (base) await base(args);
      if (args.operation === "delete") {
        if (extra.delete) await extra.delete(args);
      } else if (extra.input) await extra.input(args);
    }
  };
}

// features/keystone/models/AccommodationUnit.ts
var AccommodationUnit = (0, import_core.list)({
  access: hostScopedListAccess("canReadProperties", "canManageProperties"),
  hooks: withChecks(hostScopedHooks("canManageProperties", { parent: "property" }), { delete: historyDeleteGuard("AccommodationUnit") }),
  ui: { listView: { initialColumns: ["name", "property", "accommodationType", "maxGuests", "bedroomCount", "bathroomCountHalfUnits"] } },
  fields: {
    hostOrganization: (0, import_fields2.relationship)({ ref: "HostOrganization" }),
    // A unit's property is fixed once created: its listings and stays depend on it.
    property: (0, import_fields2.relationship)({ ref: "Property.units", access: { update: () => false } }),
    name: (0, import_fields2.text)({ validation: { isRequired: true } }),
    accommodationType: (0, import_fields2.select)({
      type: "string",
      options: [
        { label: "Entire Home", value: "entire_home" },
        { label: "Apartment", value: "apartment" },
        { label: "Cabin", value: "cabin" },
        { label: "Villa", value: "villa" },
        { label: "Cottage", value: "cottage" },
        { label: "Chalet", value: "chalet" },
        { label: "Condo", value: "condo" },
        { label: "Townhouse", value: "townhouse" },
        { label: "Guesthouse", value: "guesthouse" },
        { label: "Unique Stay", value: "unique_stay" }
      ],
      defaultValue: "entire_home"
    }),
    status: (0, import_fields2.select)({
      type: "string",
      options: [
        { label: "Available", value: "available" },
        { label: "Unavailable", value: "unavailable" },
        { label: "Archived", value: "archived" }
      ],
      defaultValue: "available"
    }),
    maxGuests: (0, import_fields2.integer)({ defaultValue: 2, validation: { min: 1 } }),
    bedroomCount: (0, import_fields2.integer)({ defaultValue: 1, validation: { min: 0 } }),
    bedCount: (0, import_fields2.integer)({ defaultValue: 1, validation: { min: 1 } }),
    bathroomCountHalfUnits: (0, import_fields2.integer)({ defaultValue: 2, validation: { min: 1 }, ui: { description: "Bathrooms in half-units; 3 = 1.5 bathrooms." } }),
    squareFeet: (0, import_fields2.integer)({ validation: { min: 0 } }),
    floorLabel: (0, import_fields2.text)(),
    // A listing's unit is changed on the listing, where live capacity is checked.
    listings: (0, import_fields2.relationship)({ ref: "Listing.accommodationUnit", many: true, access: { create: () => false, update: () => false }, ui: { displayMode: "count" } }),
    bedrooms: (0, import_fields2.relationship)({ ref: "Bedroom.accommodationUnit", many: true }),
    reservations: (0, import_fields2.relationship)({
      ref: "Reservation.accommodationUnit",
      many: true,
      // Reservations move only through allocation and lifecycle commands, never from a parent's form.
      access: { read: permissions.canReadReservations, create: () => false, update: () => false },
      ui: { displayMode: "count" }
    }),
    ...trackingFields
  }
});

// features/keystone/models/Amenity.ts
var import_core2 = require("@keystone-6/core");
var import_fields3 = require("@keystone-6/core/fields");
var Amenity = (0, import_core2.list)({
  access: {
    operation: {
      query: permissions.canReadListings,
      create: permissions.canManageListings,
      update: permissions.canManageListings,
      delete: permissions.canManageListings
    }
  },
  ui: { listView: { initialColumns: ["name", "category", "iconKey"] } },
  fields: {
    name: (0, import_fields3.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    slug: (0, import_fields3.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    category: (0, import_fields3.select)({
      type: "string",
      options: [
        { label: "Essentials", value: "essentials" },
        { label: "Kitchen", value: "kitchen" },
        { label: "Outdoor", value: "outdoor" },
        { label: "Parking", value: "parking" },
        { label: "Family", value: "family" },
        { label: "Accessibility", value: "accessibility" },
        { label: "Safety", value: "safety" },
        { label: "Entertainment", value: "entertainment" },
        { label: "Workspace", value: "workspace" }
      ],
      defaultValue: "essentials"
    }),
    iconKey: (0, import_fields3.text)(),
    // Hosts attach amenities from their own listings; a global amenity can't rewire other hosts' listings.
    listings: (0, import_fields3.relationship)({ ref: "Listing.amenities", many: true, access: { create: () => false, update: () => false }, ui: { displayMode: "count" } }),
    ...trackingFields
  }
});

// features/keystone/models/Bed.ts
var import_core3 = require("@keystone-6/core");
var import_fields4 = require("@keystone-6/core/fields");
var Bed = (0, import_core3.list)({
  access: hostScopedListAccess("canReadProperties", "canManageProperties"),
  hooks: hostScopedHooks("canManageProperties"),
  ui: { listView: { initialColumns: ["bedroom", "bedType", "quantity"] } },
  fields: {
    hostOrganization: (0, import_fields4.relationship)({ ref: "HostOrganization" }),
    bedroom: (0, import_fields4.relationship)({ ref: "Bedroom.beds" }),
    bedType: (0, import_fields4.select)({
      type: "string",
      options: [
        { label: "King", value: "king" },
        { label: "Queen", value: "queen" },
        { label: "Double", value: "double" },
        { label: "Single", value: "single" },
        { label: "Bunk", value: "bunk" },
        { label: "Sofa Bed", value: "sofa_bed" },
        { label: "Floor Mattress", value: "floor_mattress" },
        { label: "Crib", value: "crib" }
      ],
      defaultValue: "queen"
    }),
    quantity: (0, import_fields4.integer)({ defaultValue: 1, validation: { min: 1 } }),
    ...trackingFields
  }
});

// features/keystone/models/Bedroom.ts
var import_core4 = require("@keystone-6/core");
var import_fields5 = require("@keystone-6/core/fields");
var Bedroom = (0, import_core4.list)({
  access: hostScopedListAccess("canReadProperties", "canManageProperties"),
  hooks: hostScopedHooks("canManageProperties"),
  ui: { listView: { initialColumns: ["name", "accommodationUnit", "order"] } },
  fields: {
    hostOrganization: (0, import_fields5.relationship)({ ref: "HostOrganization" }),
    accommodationUnit: (0, import_fields5.relationship)({ ref: "AccommodationUnit.bedrooms" }),
    name: (0, import_fields5.text)({ validation: { isRequired: true } }),
    order: (0, import_fields5.integer)({ defaultValue: 0 }),
    beds: (0, import_fields5.relationship)({ ref: "Bed.bedroom", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/CalendarBlock.ts
var import_core5 = require("@keystone-6/core");
var import_fields6 = require("@keystone-6/core/fields");
var scopedHooks = hostScopedHooks("canManageCalendar");
var reservationBlockMutationError = "Reservation-backed capacity blocks can only be changed by reservation lifecycle operations.";
var CalendarBlock = (0, import_core5.list)({
  access: hostScopedListAccess("canReadCalendar", "canManageCalendar"),
  hooks: {
    ...scopedHooks,
    validate: async (args) => {
      await scopedHooks.validate(args);
      if (args.item?.reservationId || args.resolvedData?.reservation) {
        args.addValidationError(reservationBlockMutationError);
      }
      if (args.operation !== "delete") {
        const problem = dateRangeProblem(args.resolvedData.startDate ?? args.item?.startDate, args.resolvedData.endDate ?? args.item?.endDate, "A calendar block");
        if (problem) args.addValidationError(problem);
      }
    }
  },
  ui: { listView: { initialColumns: ["listing", "startDate", "endDate", "reason", "status", "source"] } },
  fields: {
    hostOrganization: (0, import_fields6.relationship)({ ref: "HostOrganization" }),
    listing: (0, import_fields6.relationship)({ ref: "Listing.calendarBlocks" }),
    reservation: (0, import_fields6.relationship)({ ref: "Reservation.calendarBlocks" }),
    channelReservation: (0, import_fields6.relationship)({ ref: "ChannelReservation.calendarBlocks" }),
    startDate: (0, import_fields6.text)({ validation: { isRequired: true }, ui: { description: "Inclusive YYYY-MM-DD." } }),
    endDate: (0, import_fields6.text)({ validation: { isRequired: true }, ui: { description: "Exclusive YYYY-MM-DD." } }),
    reason: (0, import_fields6.select)({
      type: "string",
      options: [
        { label: "Reservation", value: "reservation" },
        { label: "Quote Hold", value: "quote_hold" },
        { label: "Owner Block", value: "owner_block" },
        { label: "Preparation", value: "preparation" },
        { label: "Maintenance", value: "property_maintenance" },
        { label: "Channel Import", value: "channel_import" }
      ],
      defaultValue: "owner_block"
    }),
    status: (0, import_fields6.select)({
      type: "string",
      options: [
        { label: "Active", value: "active" },
        { label: "Released", value: "released" },
        { label: "Expired", value: "expired" }
      ],
      defaultValue: "active"
    }),
    source: (0, import_fields6.select)({
      type: "string",
      options: [
        { label: "Direct", value: "direct" },
        { label: "Operator", value: "operator" },
        { label: "iCal", value: "ical" },
        { label: "Channel API", value: "channel_api" }
      ],
      defaultValue: "operator"
    }),
    externalUid: (0, import_fields6.text)({ isIndexed: true }),
    fixtureOrigin: (0, import_fields6.text)({
      db: { isNullable: true },
      access: { create: () => false, update: () => false },
      ui: { description: "Set only for onboarding sample holds and sample stays: they never block real bookings.", itemView: { fieldMode: "read" }, createView: { fieldMode: "hidden" } }
    }),
    notes: (0, import_fields6.text)({ ui: { displayMode: "textarea" } }),
    ...trackingFields
  }
});

// features/keystone/models/CancellationPolicy.ts
var import_core6 = require("@keystone-6/core");
var import_fields7 = require("@keystone-6/core/fields");
var CancellationPolicy = (0, import_core6.list)({
  access: hostScopedListAccess("canReadPricing", "canManagePricing"),
  hooks: withChecks(hostScopedHooks("canManagePricing"), { delete: historyDeleteGuard("CancellationPolicy") }),
  ui: { listView: { initialColumns: ["name", "hostOrganization", "policyType", "version"] } },
  fields: {
    hostOrganization: (0, import_fields7.relationship)({ ref: "HostOrganization.cancellationPolicies" }),
    name: (0, import_fields7.text)({ validation: { isRequired: true } }),
    version: (0, import_fields7.text)({ validation: { isRequired: true } }),
    policyType: (0, import_fields7.select)({
      type: "string",
      options: [
        { label: "Flexible", value: "flexible" },
        { label: "Moderate", value: "moderate" },
        { label: "Firm", value: "firm" },
        { label: "Strict", value: "strict" },
        { label: "Non-refundable", value: "non_refundable" },
        { label: "Custom", value: "custom" }
      ],
      defaultValue: "moderate"
    }),
    summary: (0, import_fields7.text)({ ui: { displayMode: "textarea" } }),
    fullTerms: (0, import_fields7.text)({ ui: { displayMode: "textarea" } }),
    freeCancellationHours: (0, import_fields7.integer)({ defaultValue: 24, validation: { min: 0 } }),
    rules: (0, import_fields7.json)({ ui: { description: "Versioned refund-window rules in integer basis points." } }),
    ratePlans: (0, import_fields7.relationship)({ ref: "RatePlan.cancellationPolicy", many: true, ui: { displayMode: "count" } }),
    // Agreements keep the policy they were issued under; a policy form can't repoint them.
    agreements: (0, import_fields7.relationship)({ ref: "StayAgreement.cancellationPolicy", many: true, access: { create: () => false, update: () => false }, ui: { displayMode: "count" } }),
    ...trackingFields
  }
});

// features/keystone/models/ChannelConnection.ts
var import_core7 = require("@keystone-6/core");
var import_fields8 = require("@keystone-6/core/fields");
var ChannelConnection = (0, import_core7.list)({
  access: hostScopedListAccess("canReadChannels", "canManageChannels"),
  hooks: withChecks(hostScopedHooks("canManageChannels"), { delete: historyDeleteGuard("ChannelConnection") }),
  ui: { listView: { initialColumns: ["name", "provider", "connectionType", "status", "lastSyncedAt"] } },
  fields: {
    hostOrganization: (0, import_fields8.relationship)({ ref: "HostOrganization.channelConnections" }),
    name: (0, import_fields8.text)({ validation: { isRequired: true } }),
    provider: (0, import_fields8.select)({
      type: "string",
      options: [
        { label: "Direct", value: "direct" },
        { label: "Airbnb", value: "airbnb" },
        { label: "Vrbo", value: "vrbo" },
        { label: "Booking.com", value: "booking_com" },
        { label: "iCal", value: "ical" },
        { label: "PMS", value: "pms" }
      ],
      defaultValue: "ical"
    }),
    connectionType: (0, import_fields8.select)({
      type: "string",
      options: [
        { label: "Direct API", value: "api" },
        { label: "Webhook", value: "webhook" },
        { label: "iCal", value: "ical" },
        { label: "Manual", value: "manual" }
      ],
      defaultValue: "ical"
    }),
    status: (0, import_fields8.select)({
      type: "string",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Active", value: "active" },
        { label: "Paused", value: "paused" },
        { label: "Error", value: "error" },
        { label: "Disconnected", value: "disconnected" }
      ],
      defaultValue: "pending"
    }),
    settings: (0, import_fields8.json)({
      defaultValue: {},
      ui: { description: "Non-secret adapter settings only. Provider credentials are environment-managed." }
    }),
    syncAvailability: (0, import_fields8.checkbox)({ defaultValue: true }),
    syncRates: (0, import_fields8.checkbox)({ defaultValue: false }),
    syncReservations: (0, import_fields8.checkbox)({ defaultValue: false }),
    syncMessages: (0, import_fields8.checkbox)({ defaultValue: false }),
    lastSyncedAt: (0, import_fields8.timestamp)(),
    lastError: (0, import_fields8.text)({ ui: { displayMode: "textarea" } }),
    channelListings: (0, import_fields8.relationship)({ ref: "ChannelListing.channelConnection", many: true, ui: { displayMode: "count" } }),
    channelReservations: (0, import_fields8.relationship)({ ref: "ChannelReservation.channelConnection", many: true, access: { create: () => false, update: () => false }, ui: { displayMode: "count" } }),
    syncEvents: (0, import_fields8.relationship)({ ref: "ChannelSyncEvent.channelConnection", many: true, access: { create: () => false, update: () => false }, ui: { displayMode: "count" } }),
    dataExchangeJobs: (0, import_fields8.relationship)({ ref: "DataExchangeJob.channelConnection", many: true, access: { create: () => false, update: () => false }, ui: { displayMode: "count" } }),
    conversations: (0, import_fields8.relationship)({ ref: "Conversation.channelConnection", many: true, access: { create: () => false, update: () => false }, ui: { displayMode: "count" } }),
    ...trackingFields
  }
});

// features/keystone/models/ChannelListing.ts
var import_core8 = require("@keystone-6/core");
var import_fields9 = require("@keystone-6/core/fields");

// features/keystone/lib/calendarSubscription.ts
var import_promises = require("node:dns/promises");
var import_node_net = __toESM(require("node:net"));
var CALENDAR_SUBSCRIPTION_INTERVAL_MS = 60 * 60 * 1e3;
function calendarUrlProblem(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return "Enter the full calendar link, starting with https://.";
  }
  if (url.protocol !== "https:") return "Calendar links must start with https://.";
  if (url.username || url.password) return "Calendar links can\u2019t contain a username or password.";
  if (url.port && url.port !== "443") return "Calendar links must use the standard https port.";
  if (import_node_net.default.isIP(url.hostname.replace(/^\[|\]$/g, "")) || !url.hostname.includes(".") || /\.(local|internal|localhost)$/i.test(url.hostname)) return "Calendar links must use a public host name.";
  if (value.length > 2e3) return "That calendar link is too long.";
  return null;
}

// features/keystone/models/ChannelListing.ts
var urlProblem = (value) => typeof value === "string" && value.trim() ? calendarUrlProblem(value.trim()) : null;
var ChannelListing = (0, import_core8.list)({
  access: hostScopedListAccess("canReadChannels", "canManageChannels"),
  hooks: withChecks(hostScopedHooks("canManageChannels"), { delete: historyDeleteGuard("ChannelListing") }),
  ui: { listView: { initialColumns: ["listing", "channelConnection", "externalListingId", "status", "lastSyncedAt"] } },
  fields: {
    hostOrganization: (0, import_fields9.relationship)({ ref: "HostOrganization" }),
    listing: (0, import_fields9.relationship)({ ref: "Listing.channelListings" }),
    channelConnection: (0, import_fields9.relationship)({ ref: "ChannelConnection.channelListings" }),
    externalListingId: (0, import_fields9.text)({ validation: { isRequired: true }, isIndexed: true }),
    // The channel's "Export calendar" link, polled about hourly when set (https, public host).
    externalUrl: (0, import_fields9.text)({
      hooks: {
        validate: {
          create: ({ resolvedData, addValidationError }) => {
            const problem = urlProblem(resolvedData.externalUrl);
            if (problem) addValidationError(problem);
          },
          update: ({ resolvedData, addValidationError }) => {
            const problem = urlProblem(resolvedData.externalUrl);
            if (problem) addValidationError(problem);
          }
        }
      }
    }),
    status: (0, import_fields9.select)({
      type: "string",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Mapped", value: "mapped" },
        { label: "Published", value: "published" },
        { label: "Paused", value: "paused" },
        { label: "Error", value: "error" }
      ],
      defaultValue: "pending"
    }),
    mapping: (0, import_fields9.json)({ defaultValue: {} }),
    lastSyncedAt: (0, import_fields9.timestamp)(),
    // This mapping's own availability-import health: `open` while its last import needs review (job, status, conflicts).
    lastImportIssue: (0, import_fields9.json)({ access: { create: () => false, update: () => false }, ui: { itemView: { fieldMode: "read" }, createView: { fieldMode: "hidden" } } }),
    channelReservations: (0, import_fields9.relationship)({ ref: "ChannelReservation.channelListing", many: true, ui: { displayMode: "count" } }),
    syncEvents: (0, import_fields9.relationship)({ ref: "ChannelSyncEvent.channelListing", many: true, access: { create: () => false, update: () => false }, ui: { displayMode: "count" } }),
    ...trackingFields
  }
});

// features/keystone/models/ChannelReservation.ts
var import_core9 = require("@keystone-6/core");
var import_access9 = require("@keystone-6/core/access");
var import_fields10 = require("@keystone-6/core/fields");
var ChannelReservation = (0, import_core9.list)({
  access: hostScopedListAccess("canReadChannels", "canManageChannels"),
  hooks: withChecks(hostScopedHooks("canManageChannels"), { delete: historyDeleteGuard("ChannelReservation") }),
  ui: { listView: { initialColumns: ["externalReservationId", "channelConnection", "channelListing", "reservation", "status", "checkInDate", "checkOutDate"] } },
  fields: {
    hostOrganization: (0, import_fields10.relationship)({ ref: "HostOrganization" }),
    channelConnection: (0, import_fields10.relationship)({ ref: "ChannelConnection.channelReservations" }),
    channelListing: (0, import_fields10.relationship)({ ref: "ChannelListing.channelReservations" }),
    reservation: (0, import_fields10.relationship)({ ref: "Reservation.channelReservation", access: { create: () => false, update: () => false } }),
    externalReservationId: (0, import_fields10.text)({ validation: { isRequired: true }, isIndexed: true }),
    status: (0, import_fields10.select)({
      type: "string",
      options: [
        { label: "Imported", value: "imported" },
        { label: "Confirmed", value: "confirmed" },
        { label: "Modified", value: "modified" },
        { label: "Cancelled", value: "cancelled" },
        { label: "Conflict", value: "conflict" }
      ],
      defaultValue: "imported"
    }),
    guestName: (0, import_fields10.text)(),
    guestEmail: (0, import_fields10.text)(),
    checkInDate: (0, import_fields10.text)({ validation: { isRequired: true } }),
    checkOutDate: (0, import_fields10.text)({ validation: { isRequired: true } }),
    totalAmountCents: (0, import_fields10.integer)({ validation: { min: 0 } }),
    commissionAmountCents: (0, import_fields10.integer)({ validation: { min: 0 } }),
    currencyCode: (0, import_fields10.text)({ defaultValue: "USD" }),
    rawData: (0, import_fields10.json)({ defaultValue: {} }),
    lastSyncedAt: (0, import_fields10.timestamp)(),
    calendarBlocks: (0, import_fields10.relationship)({
      ref: "CalendarBlock.channelReservation",
      many: true,
      access: { create: import_access9.denyAll, update: import_access9.denyAll },
      ui: { displayMode: "count" }
    }),
    syncEvents: (0, import_fields10.relationship)({ ref: "ChannelSyncEvent.channelReservation", many: true, access: { create: () => false, update: () => false }, ui: { displayMode: "count" } }),
    ...trackingFields
  }
});

// features/keystone/models/ChannelSyncEvent.ts
var import_core10 = require("@keystone-6/core");
var import_fields11 = require("@keystone-6/core/fields");
var ChannelSyncEvent = (0, import_core10.list)({
  // Written only by domain commands, so authors, delivery, moderation and history can't be forged.
  access: hostScopedDomainOwnedListAccess("canReadChannels"),
  hooks: hostScopedHooks("canManageChannels"),
  ui: { listView: { initialColumns: ["channelConnection", "action", "status", "attempts", "occurredAt"] } },
  fields: {
    hostOrganization: (0, import_fields11.relationship)({ ref: "HostOrganization" }),
    channelConnection: (0, import_fields11.relationship)({ ref: "ChannelConnection.syncEvents" }),
    channelListing: (0, import_fields11.relationship)({ ref: "ChannelListing.syncEvents" }),
    channelReservation: (0, import_fields11.relationship)({ ref: "ChannelReservation.syncEvents" }),
    action: (0, import_fields11.select)({
      type: "string",
      options: [
        { label: "Availability Import", value: "availability_import" },
        { label: "Availability Push", value: "availability_push" },
        { label: "Rates Push", value: "rates_push" },
        { label: "Reservation Import", value: "reservation_import" },
        { label: "Message Import", value: "message_import" },
        { label: "Webhook", value: "webhook" },
        { label: "Retry", value: "retry" }
      ],
      defaultValue: "availability_import"
    }),
    status: (0, import_fields11.select)({
      type: "string",
      options: [
        { label: "Processing", value: "processing" },
        { label: "Succeeded", value: "succeeded" },
        { label: "Partially succeeded", value: "partially_succeeded" },
        { label: "Failed", value: "failed" }
      ],
      defaultValue: "processing"
    }),
    message: (0, import_fields11.text)({ ui: { displayMode: "textarea" } }),
    payload: (0, import_fields11.json)(),
    errorMessage: (0, import_fields11.text)({ ui: { displayMode: "textarea" } }),
    attempts: (0, import_fields11.integer)({ defaultValue: 0, validation: { min: 0 } }),
    nextAttemptAt: (0, import_fields11.timestamp)(),
    occurredAt: (0, import_fields11.timestamp)({ defaultValue: { kind: "now" } }),
    ...trackingFields
  }
});

// features/keystone/models/Conversation.ts
var import_core11 = require("@keystone-6/core");
var import_fields12 = require("@keystone-6/core/fields");
var Conversation = (0, import_core11.list)({
  access: hostScopedListAccess("canReadMessages", "canManageMessages"),
  hooks: withChecks(hostScopedHooks("canManageMessages"), { delete: historyDeleteGuard("Conversation") }),
  ui: { listView: { initialColumns: ["subject", "guest", "listing", "reservation", "status", "lastMessageAt"] } },
  fields: {
    hostOrganization: (0, import_fields12.relationship)({ ref: "HostOrganization.conversations" }),
    // A conversation stays with the stay, home, guest and channel it began with: moving it would move its history.
    reservation: (0, import_fields12.relationship)({ ref: "Reservation.conversation", access: { create: () => false, update: () => false } }),
    listing: (0, import_fields12.relationship)({ ref: "Listing.conversations", access: { create: () => false, update: () => false } }),
    guest: (0, import_fields12.relationship)({ ref: "GuestProfile.conversations", access: { create: () => false, update: () => false } }),
    channelConnection: (0, import_fields12.relationship)({ ref: "ChannelConnection.conversations", access: { create: () => false, update: () => false } }),
    subject: (0, import_fields12.text)(),
    status: (0, import_fields12.select)({
      type: "string",
      options: [
        { label: "Open", value: "open" },
        { label: "Snoozed", value: "snoozed" },
        { label: "Archived", value: "archived" }
      ],
      defaultValue: "open"
    }),
    externalThreadId: (0, import_fields12.text)({ isIndexed: true }),
    guestAccessTokenHash: (0, import_fields12.text)({
      isIndexed: "unique",
      db: { isNullable: true },
      access: { read: permissions.canManageMessages, create: () => false, update: () => false },
      ui: { itemView: { fieldMode: "hidden" }, createView: { fieldMode: "hidden" }, listView: { fieldMode: "hidden" } }
    }),
    guestAccessTokenExpiresAt: (0, import_fields12.timestamp)({
      access: { create: () => false, update: () => false },
      ui: { description: "When the guest\u2019s private conversation link stops working. Each guest or host message extends it to 30 days after that message.", itemView: { fieldMode: "read" }, createView: { fieldMode: "hidden" } }
    }),
    guestAccessTokenRevokedAt: (0, import_fields12.timestamp)({
      access: { create: () => false, update: () => false },
      ui: { description: "Set when the host turns off the guest\u2019s private conversation link.", itemView: { fieldMode: "read" }, createView: { fieldMode: "hidden" } }
    }),
    guestLinkDelivery: (0, import_fields12.json)({
      access: { read: permissions.canManageMessages, create: () => false, update: () => false },
      ui: {
        description: "Last emailed conversation link: attempt id, status (sending, sent, failed, unknown) and times. Never holds a link.",
        itemView: { fieldMode: "read" },
        createView: { fieldMode: "hidden" },
        listView: { fieldMode: "hidden" }
      }
    }),
    guestEmail: (0, import_fields12.text)({ ui: { description: "Reply-to address the guest supplied with an inquiry." } }),
    lastMessageAt: (0, import_fields12.timestamp)(),
    // Sent and received messages never move between conversations.
    messages: (0, import_fields12.relationship)({ ref: "Message.conversation", many: true, access: { create: () => false, update: () => false }, ui: { displayMode: "count" } }),
    ...trackingFields
  }
});

// features/keystone/models/DamageClaim.ts
var import_core12 = require("@keystone-6/core");
var import_fields13 = require("@keystone-6/core/fields");
var DamageClaim = (0, import_core12.list)({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords("canReadReservations") }
  },
  ui: { listView: { initialColumns: ["claimNumber", "reservation", "listing", "status", "claimedAmountCents"] } },
  fields: {
    hostOrganization: (0, import_fields13.relationship)({ ref: "HostOrganization" }),
    reservation: (0, import_fields13.relationship)({ ref: "Reservation.damageClaims" }),
    listing: (0, import_fields13.relationship)({ ref: "Listing" }),
    guest: (0, import_fields13.relationship)({ ref: "GuestProfile" }),
    claimNumber: (0, import_fields13.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    status: (0, import_fields13.select)({
      type: "string",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Submitted", value: "submitted" },
        { label: "Guest Response", value: "guest_response" },
        { label: "Approved", value: "approved" },
        { label: "Partially Approved", value: "partially_approved" },
        { label: "Declined", value: "declined" },
        { label: "Settled", value: "settled" }
      ],
      defaultValue: "draft"
    }),
    description: (0, import_fields13.text)({ validation: { isRequired: true }, ui: { displayMode: "textarea" } }),
    claimedAmountCents: (0, import_fields13.integer)({ defaultValue: 0, validation: { min: 0 } }),
    approvedAmountCents: (0, import_fields13.integer)({ defaultValue: 0, validation: { min: 0 } }),
    currencyCode: (0, import_fields13.text)({ defaultValue: "USD" }),
    evidence: (0, import_fields13.json)({ ui: { description: "Ordered evidence references and captions; media storage remains provider-owned." } }),
    settlementEvidence: (0, import_fields13.json)({
      access: { create: () => false, update: () => false },
      ui: { description: "How the approved amount was actually settled: method, reference, amount, who recorded it and when.", itemView: { fieldMode: "read" }, createView: { fieldMode: "hidden" } }
    }),
    submittedAt: (0, import_fields13.timestamp)(),
    resolvedAt: (0, import_fields13.timestamp)(),
    ...trackingFields
  }
});

// features/keystone/models/DataExchangeJob.ts
var import_core13 = require("@keystone-6/core");
var import_fields14 = require("@keystone-6/core/fields");
var DataExchangeJob = (0, import_core13.list)({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords("canReadChannels") }
  },
  ui: { listView: { initialColumns: ["direction", "domain", "format", "status", "channelConnection", "processedCount", "completedAt"] } },
  fields: {
    hostOrganization: (0, import_fields14.relationship)({ ref: "HostOrganization.dataExchangeJobs" }),
    channelConnection: (0, import_fields14.relationship)({ ref: "ChannelConnection.dataExchangeJobs" }),
    listing: (0, import_fields14.relationship)({ ref: "Listing" }),
    direction: (0, import_fields14.select)({
      type: "string",
      options: [
        { label: "Import", value: "import" },
        { label: "Export", value: "export" }
      ],
      defaultValue: "import"
    }),
    domain: (0, import_fields14.select)({
      type: "string",
      options: [
        { label: "Availability", value: "availability" },
        { label: "Listings", value: "listings" },
        { label: "Reservations", value: "reservations" },
        { label: "Guests", value: "guests" },
        { label: "Owner accounting", value: "owner_accounting" },
        { label: "Host archive", value: "host_archive" }
      ],
      defaultValue: "availability"
    }),
    format: (0, import_fields14.select)({
      type: "string",
      options: [
        { label: "iCalendar", value: "ical" },
        { label: "JSON", value: "json" },
        { label: "CSV", value: "csv" }
      ],
      defaultValue: "json"
    }),
    status: (0, import_fields14.select)({
      type: "string",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Processing", value: "processing" },
        { label: "Succeeded", value: "succeeded" },
        { label: "Partially succeeded", value: "partially_succeeded" },
        { label: "Failed", value: "failed" }
      ],
      defaultValue: "pending"
    }),
    idempotencyKey: (0, import_fields14.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    payloadSha256: (0, import_fields14.text)({ validation: { isRequired: true } }),
    sourceLabel: (0, import_fields14.text)(),
    processedCount: (0, import_fields14.integer)({ defaultValue: 0, validation: { min: 0 } }),
    createdCount: (0, import_fields14.integer)({ defaultValue: 0, validation: { min: 0 } }),
    updatedCount: (0, import_fields14.integer)({ defaultValue: 0, validation: { min: 0 } }),
    skippedCount: (0, import_fields14.integer)({ defaultValue: 0, validation: { min: 0 } }),
    conflictCount: (0, import_fields14.integer)({ defaultValue: 0, validation: { min: 0 } }),
    resultSummary: (0, import_fields14.json)(),
    errorMessage: (0, import_fields14.text)({ ui: { displayMode: "textarea" } }),
    startedAt: (0, import_fields14.timestamp)(),
    completedAt: (0, import_fields14.timestamp)(),
    ...trackingFields
  }
});

// features/keystone/models/FeeDefinition.ts
var import_core14 = require("@keystone-6/core");
var import_fields15 = require("@keystone-6/core/fields");
var FeeDefinition = (0, import_core14.list)({
  access: hostScopedListAccess("canReadPricing", "canManagePricing"),
  hooks: hostScopedHooks("canManagePricing", { parent: "listing" }),
  ui: { listView: { initialColumns: ["name", "listing", "feeType", "calculation", "amountCents", "percentageBasisPoints", "isActive"] } },
  fields: {
    hostOrganization: (0, import_fields15.relationship)({ ref: "HostOrganization" }),
    listing: (0, import_fields15.relationship)({ ref: "Listing.feeDefinitions" }),
    name: (0, import_fields15.text)({ validation: { isRequired: true } }),
    feeType: (0, import_fields15.select)({
      type: "string",
      options: [
        { label: "Cleaning", value: "cleaning" },
        { label: "Service", value: "service" },
        { label: "Pet", value: "pet" },
        { label: "Extra Guest", value: "extra_guest" },
        { label: "Resort", value: "resort" },
        { label: "Custom", value: "custom" }
      ],
      defaultValue: "cleaning"
    }),
    calculation: (0, import_fields15.select)({
      type: "string",
      options: [
        { label: "Fixed per stay", value: "fixed" },
        { label: "Per night", value: "per_night" },
        { label: "Per guest", value: "per_guest" },
        { label: "Percentage", value: "percentage" }
      ],
      defaultValue: "fixed"
    }),
    amountCents: (0, import_fields15.integer)({ defaultValue: 0, validation: { min: 0 } }),
    percentageBasisPoints: (0, import_fields15.integer)({ defaultValue: 0, validation: { min: 0 } }),
    taxable: (0, import_fields15.checkbox)({ defaultValue: true }),
    required: (0, import_fields15.checkbox)({ defaultValue: true }),
    isActive: (0, import_fields15.checkbox)({ defaultValue: true }),
    ...trackingFields
  }
});

// features/keystone/models/GuestParty.ts
var import_core15 = require("@keystone-6/core");
var import_fields16 = require("@keystone-6/core/fields");
var partyHostHooks = hostScopedHooks("canManageGuests");
var BOOKED_PARTY_FIELDS = ["primaryGuest", "adults", "children", "infants", "pets"];
var GuestParty = (0, import_core15.list)({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords("canReadGuests") }
  },
  hooks: {
    ...partyHostHooks,
    validate: async (args) => {
      await partyHostHooks.validate(args);
      if (args.operation === "update" && args.item?.reservationId && BOOKED_PARTY_FIELDS.some((field) => args.resolvedData?.[field] !== void 0)) {
        args.addValidationError("This party belongs to a booked stay. Change guests or pets from the reservation, not here.");
      }
    }
  },
  ui: { listView: { initialColumns: ["reservation", "primaryGuest", "adults", "children", "infants", "pets"] } },
  fields: {
    hostOrganization: (0, import_fields16.relationship)({ ref: "HostOrganization" }),
    reservation: (0, import_fields16.relationship)({ ref: "Reservation.guestParty", access: { create: () => false, update: () => false } }),
    primaryGuest: (0, import_fields16.relationship)({ ref: "GuestProfile" }),
    adults: (0, import_fields16.integer)({ defaultValue: 1, validation: { min: 1 } }),
    children: (0, import_fields16.integer)({ defaultValue: 0, validation: { min: 0 } }),
    infants: (0, import_fields16.integer)({ defaultValue: 0, validation: { min: 0 } }),
    pets: (0, import_fields16.integer)({ defaultValue: 0, validation: { min: 0 } }),
    invitedGuests: (0, import_fields16.json)({
      access: { create: () => false, update: () => false },
      ui: { description: "Invited guest names and emails as booked or corrected by the host\u2019s invitation command. Acceptance is never recorded from a form.", itemView: { fieldMode: "read" } }
    }),
    ...trackingFields
  }
});

// features/keystone/models/GuestProfile.ts
var import_core16 = require("@keystone-6/core");
var import_access17 = require("@keystone-6/core/access");
var import_fields17 = require("@keystone-6/core/fields");
var GuestProfile = (0, import_core16.list)({
  access: hostScopedListAccess("canReadGuests", "canManageGuests"),
  hooks: withChecks(hostScopedHooks("canManageGuests"), { delete: historyDeleteGuard("GuestProfile") }),
  ui: { listView: { initialColumns: ["name", "email", "phone", "verificationStatus", "reservations"] } },
  fields: {
    hostOrganization: (0, import_fields17.relationship)({ ref: "HostOrganization.guests" }),
    // Linking a guest profile to a sign-in account is a global identity fact: never set from a form.
    user: (0, import_fields17.relationship)({ ref: "User.guestProfile", access: { create: import_access17.denyAll, update: import_access17.denyAll } }),
    name: (0, import_fields17.text)({ validation: { isRequired: true } }),
    email: (0, import_fields17.text)({ validation: { isRequired: true } }),
    phone: (0, import_fields17.text)(),
    verificationStatus: (0, import_fields17.select)({
      type: "string",
      options: [
        { label: "Unverified", value: "unverified" },
        { label: "Pending", value: "pending" },
        { label: "Verified", value: "verified" },
        { label: "Rejected", value: "rejected" }
      ],
      defaultValue: "unverified"
    }),
    preferredLanguage: (0, import_fields17.text)({ defaultValue: "en" }),
    marketingConsent: (0, import_fields17.checkbox)({ defaultValue: false }),
    internalNotes: (0, import_fields17.text)({ ui: { displayMode: "textarea" } }),
    reservations: (0, import_fields17.relationship)({
      ref: "Reservation.guest",
      many: true,
      // Reservations move only through allocation and lifecycle commands, never from a parent's form.
      access: { read: permissions.canReadReservations, create: () => false, update: () => false },
      ui: { displayMode: "count" }
    }),
    conversations: (0, import_fields17.relationship)({ ref: "Conversation.guest", many: true, access: { create: import_access17.denyAll, update: import_access17.denyAll }, ui: { displayMode: "count" } }),
    reviews: (0, import_fields17.relationship)({ ref: "Review.guest", many: true, access: { create: import_access17.denyAll, update: import_access17.denyAll }, ui: { displayMode: "count" } }),
    payments: (0, import_fields17.relationship)({
      ref: "Payment.guest",
      many: true,
      access: { create: import_access17.denyAll, update: import_access17.denyAll },
      ui: { displayMode: "count" }
    }),
    ...trackingFields
  }
});

// features/keystone/models/HostMembership.ts
var import_core17 = require("@keystone-6/core");
var import_fields18 = require("@keystone-6/core/fields");
var HostMembership = (0, import_core17.list)({
  db: {
    extendPrismaSchema(schema) {
      return schema.replace(/\n}\s*$/, "\n\n  @@unique([hostOrganizationId, userId])\n}");
    }
  },
  access: {
    operation: {
      query: isSignedIn,
      create: permissions.canManageProperties,
      update: permissions.canManageProperties,
      delete: permissions.canManageProperties
    },
    filter: {
      query: rules.canReadHostMemberships,
      update: rules.canManageHostMemberships,
      delete: rules.canManageHostMemberships
    }
  },
  hooks: hostMembershipHooks,
  ui: { listView: { initialColumns: ["hostOrganization", "user", "membershipRole", "status"] } },
  fields: {
    hostOrganization: (0, import_fields18.relationship)({ ref: "HostOrganization.memberships" }),
    user: (0, import_fields18.relationship)({ ref: "User.hostMemberships" }),
    membershipRole: (0, import_fields18.select)({
      type: "string",
      options: [
        { label: "Owner", value: "owner" },
        { label: "Administrator", value: "admin" },
        { label: "Property Manager", value: "manager" },
        { label: "Operations", value: "operations" },
        { label: "Finance", value: "finance" }
      ],
      defaultValue: "manager"
    }),
    status: (0, import_fields18.select)({
      type: "string",
      options: [
        { label: "Invited", value: "invited" },
        { label: "Active", value: "active" },
        { label: "Suspended", value: "suspended" }
      ],
      defaultValue: "invited"
    }),
    ...trackingFields
  }
});

// features/keystone/models/HostOrganization.ts
var import_core18 = require("@keystone-6/core");
var import_access20 = require("@keystone-6/core/access");
var import_fields19 = require("@keystone-6/core/fields");
var HostOrganization = (0, import_core18.list)({
  hooks: { validateDelete: historyDeleteGuard("HostOrganization") },
  access: {
    operation: {
      query: isSignedIn,
      create: permissions.canManageRoles,
      update: permissions.canManageProperties,
      delete: permissions.canManageProperties
    },
    filter: {
      query: rules.canReadHostOrganizations,
      update: rules.canManageHostOrganizations,
      delete: rules.canManageHostOrganizations
    }
  },
  ui: {
    listView: { initialColumns: ["name", "organizationType", "status", "slug", "dataCustody"] }
  },
  fields: {
    name: (0, import_fields19.text)({ validation: { isRequired: true } }),
    slug: (0, import_fields19.text)({ isIndexed: "unique", validation: { isRequired: true } }),
    organizationType: (0, import_fields19.select)({
      type: "string",
      options: [
        { label: "Individual Host", value: "individual_host" },
        { label: "Property Manager", value: "property_manager" },
        { label: "Co-operative", value: "cooperative" }
      ],
      defaultValue: "individual_host"
    }),
    status: (0, import_fields19.select)({
      type: "string",
      options: [
        { label: "Active", value: "active" },
        { label: "Onboarding", value: "onboarding" },
        { label: "Suspended", value: "suspended" },
        { label: "Archived", value: "archived" }
      ],
      defaultValue: "onboarding"
    }),
    publicBio: (0, import_fields19.text)({ ui: { displayMode: "textarea" } }),
    publicEmail: (0, import_fields19.text)(),
    publicPhone: (0, import_fields19.text)(),
    website: (0, import_fields19.text)(),
    canonicalUrl: (0, import_fields19.text)(),
    federationId: (0, import_fields19.text)({ isIndexed: "unique" }),
    dataCustody: (0, import_fields19.select)({
      type: "string",
      options: [
        { label: "Self-hosted", value: "self_hosted" },
        { label: "Managed", value: "managed" }
      ],
      defaultValue: "self_hosted"
    }),
    isPublic: (0, import_fields19.checkbox)({ defaultValue: true }),
    onboardingAnchorDate: (0, import_fields19.text)({
      access: { create: import_access20.denyAll, update: import_access20.denyAll },
      ui: { description: "Date the setup run started; sample dates are relative to it so resuming setup stays consistent.", itemView: { fieldMode: "read" }, createView: { fieldMode: "hidden" }, listView: { fieldMode: "hidden" } }
    }),
    onboardingFingerprint: (0, import_fields19.text)({
      access: { create: import_access20.denyAll, update: import_access20.denyAll },
      ui: { itemView: { fieldMode: "hidden" }, createView: { fieldMode: "hidden" }, listView: { fieldMode: "hidden" } }
    }),
    memberships: (0, import_fields19.relationship)({ ref: "HostMembership.hostOrganization", many: true, access: { create: import_access20.denyAll, update: import_access20.denyAll }, ui: { displayMode: "count" } }),
    properties: (0, import_fields19.relationship)({ ref: "Property.hostOrganization", many: true, access: { create: import_access20.denyAll, update: import_access20.denyAll }, ui: { displayMode: "count" } }),
    listings: (0, import_fields19.relationship)({ ref: "Listing.hostOrganization", many: true, access: { create: import_access20.denyAll, update: import_access20.denyAll }, ui: { displayMode: "count" } }),
    guests: (0, import_fields19.relationship)({ ref: "GuestProfile.hostOrganization", many: true, access: { create: import_access20.denyAll, update: import_access20.denyAll }, ui: { displayMode: "count" } }),
    reservations: (0, import_fields19.relationship)({ ref: "Reservation.hostOrganization", many: true, access: { create: import_access20.denyAll, update: () => false }, ui: { displayMode: "count" } }),
    reservationAmendments: (0, import_fields19.relationship)({ ref: "ReservationAmendment.hostOrganization", many: true, access: { create: () => false, update: () => false }, ui: { displayMode: "count" } }),
    payments: (0, import_fields19.relationship)({ ref: "Payment.hostOrganization", many: true, access: { create: import_access20.denyAll, update: import_access20.denyAll }, ui: { displayMode: "count" } }),
    paymentProviders: (0, import_fields19.relationship)({ ref: "PaymentProvider.hostOrganization", many: true, access: { create: import_access20.denyAll, update: import_access20.denyAll }, ui: { displayMode: "count" } }),
    paymentWebhookEvents: (0, import_fields19.relationship)({ ref: "PaymentWebhookEvent.hostOrganization", many: true, access: { create: import_access20.denyAll, update: import_access20.denyAll }, ui: { displayMode: "count" } }),
    payouts: (0, import_fields19.relationship)({ ref: "Payout.hostOrganization", many: true, access: { create: import_access20.denyAll, update: import_access20.denyAll }, ui: { displayMode: "count" } }),
    propertyOwners: (0, import_fields19.relationship)({ ref: "PropertyOwner.hostOrganization", many: true, access: { create: import_access20.denyAll, update: import_access20.denyAll }, ui: { displayMode: "count" } }),
    propertyOwnerAssignments: (0, import_fields19.relationship)({ ref: "PropertyOwnerAssignment.hostOrganization", many: true, access: { create: import_access20.denyAll, update: import_access20.denyAll }, ui: { displayMode: "count" } }),
    ownerStatements: (0, import_fields19.relationship)({ ref: "OwnerStatement.hostOrganization", many: true, access: { create: import_access20.denyAll, update: import_access20.denyAll }, ui: { displayMode: "count" } }),
    ownerStatementLines: (0, import_fields19.relationship)({ ref: "OwnerStatementLine.hostOrganization", many: true, access: { create: import_access20.denyAll, update: import_access20.denyAll }, ui: { displayMode: "count" } }),
    cancellationPolicies: (0, import_fields19.relationship)({ ref: "CancellationPolicy.hostOrganization", many: true, access: { create: import_access20.denyAll, update: import_access20.denyAll }, ui: { displayMode: "count" } }),
    conversations: (0, import_fields19.relationship)({ ref: "Conversation.hostOrganization", many: true, access: { create: import_access20.denyAll, update: import_access20.denyAll }, ui: { displayMode: "count" } }),
    reviews: (0, import_fields19.relationship)({ ref: "Review.hostOrganization", many: true, access: { create: import_access20.denyAll, update: import_access20.denyAll }, ui: { displayMode: "count" } }),
    tasks: (0, import_fields19.relationship)({ ref: "PropertyTask.hostOrganization", many: true, access: { create: import_access20.denyAll, update: import_access20.denyAll }, ui: { displayMode: "count" } }),
    taskRules: (0, import_fields19.relationship)({ ref: "TaskRule.hostOrganization", many: true, access: { create: import_access20.denyAll, update: import_access20.denyAll }, ui: { displayMode: "count" } }),
    channelConnections: (0, import_fields19.relationship)({ ref: "ChannelConnection.hostOrganization", many: true, access: { create: import_access20.denyAll, update: import_access20.denyAll }, ui: { displayMode: "count" } }),
    dataExchangeJobs: (0, import_fields19.relationship)({ ref: "DataExchangeJob.hostOrganization", many: true, access: { create: import_access20.denyAll, update: import_access20.denyAll }, ui: { displayMode: "count" } }),
    ...trackingFields
  }
});

// features/keystone/models/HouseRule.ts
var import_core19 = require("@keystone-6/core");
var import_fields20 = require("@keystone-6/core/fields");
var HouseRule = (0, import_core19.list)({
  access: hostScopedListAccess("canReadListings", "canManageListings"),
  hooks: hostScopedHooks("canManageListings", { parent: "listing" }),
  ui: { listView: { initialColumns: ["listing", "ruleType", "title", "isAllowed"] } },
  fields: {
    hostOrganization: (0, import_fields20.relationship)({ ref: "HostOrganization" }),
    listing: (0, import_fields20.relationship)({ ref: "Listing.houseRules" }),
    ruleType: (0, import_fields20.select)({
      type: "string",
      options: [
        { label: "Smoking", value: "smoking" },
        { label: "Pets", value: "pets" },
        { label: "Events", value: "events" },
        { label: "Quiet Hours", value: "quiet_hours" },
        { label: "Maximum Guests", value: "maximum_guests" },
        { label: "Check-in", value: "check_in" },
        { label: "Check-out", value: "check_out" },
        { label: "Custom", value: "custom" }
      ],
      defaultValue: "custom"
    }),
    title: (0, import_fields20.text)({ validation: { isRequired: true } }),
    description: (0, import_fields20.text)({ ui: { displayMode: "textarea" } }),
    isAllowed: (0, import_fields20.checkbox)(),
    isRequired: (0, import_fields20.checkbox)({ defaultValue: true }),
    ...trackingFields
  }
});

// features/keystone/models/Listing.ts
var import_core20 = require("@keystone-6/core");
var import_access23 = require("@keystone-6/core/access");
var import_fields21 = require("@keystone-6/core/fields");

// features/keystone/utils/listingIntegrity.ts
var LIVE_RESERVATION_STATUSES = ["pending", "confirmed", "in_stay"];
function coherentBookingMode(resolvedData, item) {
  if (!resolvedData) return resolvedData;
  if (resolvedData.bookingMode !== void 0) return { ...resolvedData, instantBook: resolvedData.bookingMode === "instant" };
  if (resolvedData.instantBook !== void 0) return { ...resolvedData, bookingMode: resolvedData.instantBook ? "instant" : "request" };
  if (!item) return { ...resolvedData, instantBook: false, bookingMode: "request" };
  return resolvedData;
}
async function assertListingAllocation({ operation, resolvedData, item, context }) {
  const unitChange = resolvedData?.accommodationUnit !== void 0;
  const propertyChange = resolvedData?.property !== void 0;
  if (!unitChange && !propertyChange && operation !== "create") return;
  const unitId = unitChange ? extractRelationshipId(resolvedData.accommodationUnit) : item?.accommodationUnitId || null;
  const propertyId = propertyChange ? extractRelationshipId(resolvedData.property) : item?.propertyId || null;
  if (unitId && propertyId) {
    const unit = await context.prisma.accommodationUnit.findUnique({ where: { id: unitId }, select: { propertyId: true } });
    if (!unit || unit.propertyId !== propertyId) throw new Error("The accommodation unit must belong to the listing\u2019s property.");
  }
  if (operation === "update" && unitChange && unitId !== (item?.accommodationUnitId || null)) {
    const [liveStay, activeHold] = await Promise.all([
      context.prisma.reservation.findFirst({ where: { listingId: item.id, status: { in: LIVE_RESERVATION_STATUSES } }, select: { id: true } }),
      context.prisma.calendarBlock.findFirst({ where: { listingId: item.id, status: "active" }, select: { id: true } })
    ]);
    if (liveStay || activeHold) {
      throw new Error("This listing has upcoming stays or calendar holds on its current unit. Re-accommodate or release them before moving the listing to another unit.");
    }
  }
}

// features/keystone/utils/stayBookingRules.ts
var DATE_ONLY2 = /^\d{4}-\d{2}-\d{2}$/;
var DAY_MS = 24 * 60 * 60 * 1e3;
var HOUR_MS = 60 * 60 * 1e3;
var DEFAULT_CHECK_IN_TIME = "15:00";
function effectiveStayRatePlan(listing) {
  const plan = listing?.ratePlans?.[0];
  if (plan) return plan;
  const base = listing?.baseNightlyRateCents;
  if (!Number.isSafeInteger(base) || base <= 0) return null;
  return {
    id: null,
    isBaseRate: true,
    name: "Standard rate",
    description: null,
    currencyCode: listing.currencyCode || "USD",
    baseNightlyRateCents: base,
    minimumStay: listing.minimumStay ?? 1,
    maximumStay: listing.maximumStay ?? null,
    advanceNoticeHours: listing.advanceNoticeHours ?? null,
    bookingWindowDays: listing.bookingWindowDays ?? null,
    isDefault: true,
    seasonalRates: [],
    cancellationPolicy: listing.hostOrganization?.cancellationPolicies?.[0] || null
  };
}
function stayArrivalRules(plan, listing) {
  const notice = plan?.advanceNoticeHours ?? listing?.advanceNoticeHours ?? 0;
  const window2 = plan?.bookingWindowDays ?? listing?.bookingWindowDays ?? null;
  return {
    advanceNoticeHours: Number.isSafeInteger(notice) && notice > 0 ? notice : 0,
    bookingWindowDays: Number.isSafeInteger(window2) && window2 > 0 ? window2 : null
  };
}
function validTimeZone(timeZone) {
  if (typeof timeZone !== "string" || !timeZone) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(0);
    return timeZone;
  } catch {
    return "UTC";
  }
}
function zonedParts(timestamp22, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(new Date(timestamp22));
  const get = (type) => Number(parts.find((part) => part.type === type)?.value || 0);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour") % 24, minute: get("minute"), second: get("second") };
}
function offsetMs(timestamp22, timeZone) {
  const local = zonedParts(timestamp22, timeZone);
  const asUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
  return asUtc - Math.floor(timestamp22 / 1e3) * 1e3;
}
function parseTime(value) {
  const match = typeof value === "string" ? /^(\d{1,2}):(\d{2})/.exec(value.trim()) : null;
  const hour = match ? Number(match[1]) : NaN;
  const minute = match ? Number(match[2]) : NaN;
  if (!match || hour > 23 || minute > 59) return parseTime(DEFAULT_CHECK_IN_TIME);
  return { hour, minute };
}
function zonedLocalTimestamp(dateIso, time, timeZone) {
  const zone = validTimeZone(timeZone);
  const [year, month, day] = dateIso.split("-").map(Number);
  const { hour, minute } = parseTime(time);
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  const first = naive - offsetMs(naive, zone);
  return naive - offsetMs(first, zone);
}
function zonedTodayIso(timeZone, now = /* @__PURE__ */ new Date()) {
  const local = zonedParts(now.getTime(), validTimeZone(timeZone));
  return `${local.year}-${String(local.month).padStart(2, "0")}-${String(local.day).padStart(2, "0")}`;
}
function addDays(dateIso, days) {
  const [year, month, day] = dateIso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * DAY_MS).toISOString().slice(0, 10);
}
function noticeLabel(hours) {
  if (hours % 24 === 0 && hours >= 48) return `${hours / 24} days\u2019`;
  return `${hours} ${hours === 1 ? "hour\u2019s" : "hours\u2019"}`;
}
function stayArrivalProblem(checkIn, rules2, now = /* @__PURE__ */ new Date()) {
  if (!DATE_ONLY2.test(checkIn)) return "Choose a valid check-in date.";
  if (checkIn < zonedTodayIso(rules2.timeZone, now)) return "Check-in cannot be in the past.";
  if (rules2.advanceNoticeHours > 0) {
    const arrival = zonedLocalTimestamp(checkIn, rules2.checkInFrom, rules2.timeZone);
    if (arrival - now.getTime() < rules2.advanceNoticeHours * HOUR_MS) {
      return `This home needs at least ${noticeLabel(rules2.advanceNoticeHours)} notice before check-in. Choose a later arrival date.`;
    }
  }
  if (rules2.bookingWindowDays) {
    const latest = addDays(zonedTodayIso(rules2.timeZone, now), rules2.bookingWindowDays);
    if (checkIn > latest) {
      return `This home takes bookings up to ${rules2.bookingWindowDays} ${rules2.bookingWindowDays === 1 ? "day" : "days"} ahead. Choose an earlier arrival date.`;
    }
  }
  return null;
}
function stayArrivalBounds(rules2, now = /* @__PURE__ */ new Date()) {
  const today = zonedTodayIso(rules2.timeZone, now);
  let earliest = today;
  const scanDays = Math.ceil(rules2.advanceNoticeHours / 24) + 2;
  for (let offset = 0; offset <= scanDays; offset += 1) {
    const candidate = addDays(today, offset);
    earliest = candidate;
    if (rules2.advanceNoticeHours <= 0) break;
    const arrival = zonedLocalTimestamp(candidate, rules2.checkInFrom, rules2.timeZone);
    if (arrival - now.getTime() >= rules2.advanceNoticeHours * HOUR_MS) break;
  }
  const latest = rules2.bookingWindowDays ? addDays(today, rules2.bookingWindowDays) : null;
  return { earliestCheckIn: earliest, latestCheckIn: latest };
}
function listingArrivalContext(listing, plan = effectiveStayRatePlan(listing)) {
  return {
    ...stayArrivalRules(plan, listing),
    timeZone: listing?.property?.timezone || null,
    checkInFrom: listing?.property?.checkInFrom || null
  };
}
function assertStayArrivalAllowed(checkIn, rules2, now = /* @__PURE__ */ new Date()) {
  const problem = stayArrivalProblem(checkIn, rules2, now);
  if (problem) throw new Error(problem);
}
function stayCalculationInput(listing, plan, stay) {
  return {
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    baseNightlyRateCents: plan.baseNightlyRateCents ?? listing.baseNightlyRateCents ?? 0,
    currencyCode: plan.currencyCode || listing.currencyCode || "USD",
    baseMinimumStay: plan.minimumStay ?? listing.minimumStay ?? 1,
    maximumStay: plan.maximumStay ?? listing.maximumStay,
    guestCount: stay.guestCount,
    pets: stay.pets ?? 0,
    maxGuests: listing.accommodationUnit?.maxGuests ?? listing.accommodation?.maxGuests,
    securityDepositCents: listing.securityDepositCents ?? 0,
    seasonalRates: plan.seasonalRates || [],
    weeklyDiscountBasisPoints: plan.weeklyDiscountBasisPoints ?? 0,
    monthlyDiscountBasisPoints: plan.monthlyDiscountBasisPoints ?? 0,
    fees: (listing.feeDefinitions || []).map((fee) => ({
      name: fee.name,
      feeType: fee.feeType,
      kind: fee.calculation,
      amountCents: fee.amountCents,
      percentageBasisPoints: fee.percentageBasisPoints,
      taxable: fee.taxable,
      required: fee.required
    })),
    taxes: (listing.taxRules || []).map((tax) => ({
      name: tax.name,
      rateBasisPoints: tax.rateBasisPoints,
      inclusive: tax.isInclusive === true
    }))
  };
}

// features/keystone/utils/stayEligibility.ts
function sellableListingWhere() {
  return {
    status: { equals: "published" },
    hostOrganization: { isPublic: { equals: true }, status: { notIn: ["suspended", "archived"] } },
    property: { status: { equals: "active" } }
  };
}
function listingSellabilityProblem(listing) {
  if (!listing || listing.status !== "published") return "This stay is not available for booking.";
  const host = listing.hostOrganization;
  if (!host?.id || host.isPublic === false || ["suspended", "archived"].includes(host.status)) return "This stay is not available for booking.";
  if (listing.property?.status !== "active") return "This stay is not available for booking.";
  if (listing.accommodationUnit?.status !== "available") return "This stay is not available for booking.";
  return null;
}
function partyEligibilityProblem(listing, party) {
  if (!Number.isSafeInteger(party.adults) || party.adults < 1) return "A stay needs at least one adult.";
  const maxGuests = listing?.accommodationUnit?.maxGuests;
  if (Number.isSafeInteger(maxGuests) && party.adults + party.children > maxGuests) return `This home sleeps up to ${maxGuests} guests.`;
  if (party.pets > 0) {
    const petRule = (listing?.houseRules || []).find((rule) => rule.ruleType === "pets");
    if (petRule && petRule.isAllowed === false) return "This stay does not allow pets.";
  }
  return null;
}
var NO_ONLINE_TERMS_MESSAGE = "This home\u2019s cancellation terms aren\u2019t published yet, so it can\u2019t be booked online. Message the host.";
function onlineQuoteReadinessProblem(plan, listing) {
  if (!plan) return "This stay does not have a published nightly rate.";
  const policy = plan.cancellationPolicy;
  const text50 = (value) => typeof value === "string" ? value.trim() : "";
  if (!policy?.id || !text50(policy.version) || !(text50(policy.summary) || text50(policy.fullTerms))) return NO_ONLINE_TERMS_MESSAGE;
  if ((listing?.feeDefinitions || []).some((fee) => fee?.feeType === "extra_guest" && fee?.required !== false && fee?.isActive !== false)) {
    return EXTRA_GUEST_FEE_MESSAGE;
  }
  return null;
}
var EXTRA_GUEST_FEE_MESSAGE = "This home has an extra-guest fee that can\u2019t be priced online yet. Message the host for a quote.";

// features/keystone/utils/listingReadiness.ts
var policySelect = { id: true, version: true, summary: true, fullTerms: true };
async function listingReadinessFor(prisma, listingIds) {
  const result = /* @__PURE__ */ new Map();
  if (!listingIds.length) return result;
  const listings = await prisma.listing.findMany({
    where: { id: { in: listingIds } },
    select: {
      id: true,
      status: true,
      currencyCode: true,
      baseNightlyRateCents: true,
      minimumStay: true,
      maximumStay: true,
      advanceNoticeHours: true,
      bookingWindowDays: true,
      hostOrganization: { select: { id: true, isPublic: true, status: true, cancellationPolicies: { orderBy: [{ createdAt: "asc" }], take: 1, select: policySelect } } },
      property: { select: { status: true } },
      accommodationUnit: { select: { status: true } },
      ratePlans: { where: { status: "active" }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }, { id: "asc" }], take: 1, select: { id: true, name: true, baseNightlyRateCents: true, currencyCode: true, minimumStay: true, maximumStay: true, advanceNoticeHours: true, bookingWindowDays: true, cancellationPolicy: { select: policySelect } } },
      feeDefinitions: { where: { isActive: true }, select: { feeType: true, required: true, isActive: true } }
    }
  });
  for (const listing of listings) {
    const plan = effectiveStayRatePlan(listing);
    const rate = plan?.baseNightlyRateCents || 0;
    const priced = rate > 0 && (!plan?.currencyCode || plan.currencyCode === listing.currencyCode);
    const quoteProblem = !priced ? plan && rate > 0 ? `Priced in ${plan.currencyCode}; the listing sells in ${listing.currencyCode}.` : "No positive nightly rate." : onlineQuoteReadinessProblem(plan, listing);
    const problem = listingSellabilityProblem(listing) ? listing.status !== "published" ? "Not published." : "Its host, property or unit isn\u2019t open for booking." : quoteProblem;
    result.set(listing.id, { priced, bookable: !problem, problem, quoteProblem });
  }
  return result;
}
async function publishedListingsOf(prisma, propertyIds, cap) {
  const rows = [];
  for (let skip = 0; ; skip += 500) {
    const page = await prisma.listing.findMany({ where: { propertyId: { in: propertyIds }, status: "published" }, orderBy: [{ id: "asc" }], skip, take: 500, select: { id: true, propertyId: true } });
    rows.push(...page);
    if (rows.length > cap) return { rows: [], complete: false };
    if (page.length < 500) return { rows, complete: true };
  }
}
async function sellablePropertyIdsFor(prisma, propertyIds, cap = 5e3) {
  if (!propertyIds.length) return { propertyIds: [], complete: true };
  const published = await publishedListingsOf(prisma, propertyIds, cap);
  if (!published.complete) return { propertyIds: [], complete: false };
  const readiness = await listingReadinessFor(prisma, published.rows.map((row) => row.id));
  const sellable = /* @__PURE__ */ new Set();
  for (const row of published.rows) if (row.propertyId && readiness.get(row.id)?.bookable) sellable.add(row.propertyId);
  return { propertyIds: [...sellable], complete: true };
}
async function propertyListingSummary(prisma, propertyId, cap = 5e3) {
  const [total, published] = await Promise.all([
    prisma.listing.count({ where: { propertyId } }),
    publishedListingsOf(prisma, [propertyId], cap)
  ]);
  if (!published.complete) return { total, published: 0, bookable: 0, complete: false };
  const readiness = await listingReadinessFor(prisma, published.rows.map((row) => row.id));
  const bookable = published.rows.filter((row) => readiness.get(row.id)?.bookable).length;
  return { total, published: published.rows.length, bookable, complete: true };
}

// features/keystone/mutations/catalogLifecycle.ts
var transitions = {
  property: {
    onboarding: { activate: "active", archive: "archived" },
    active: { pause: "paused", archive: "archived" },
    paused: { activate: "active", archive: "archived" },
    archived: {}
  },
  listing: {
    draft: { publish: "published", archive: "archived" },
    published: { pause: "paused", archive: "archived" },
    paused: { publish: "published", archive: "archived" },
    archived: {}
  }
};
function text17(value) {
  return typeof value === "string" ? value.trim() : "";
}
async function transitionCatalogRecord(context, input) {
  const kind = text17(input.kind);
  if (kind !== "property" && kind !== "listing") throw new Error("Choose a property or a listing.");
  const id2 = text17(input.id);
  const expectedStatus = text17(input.expectedStatus);
  const transition = text17(input.transition);
  const table = kind === "property" ? "Property" : "Listing";
  const delegate = kind === "property" ? "property" : "listing";
  const record5 = id2 ? await context.prisma[delegate].findUnique({ where: { id: id2 }, select: { hostOrganizationId: true } }) : null;
  if (!record5?.hostOrganizationId) throw new Error(`${table} not found.`);
  await assertHostOrganizationAccess({ context, hostOrganizationId: record5.hostOrganizationId, permission: kind === "property" ? "canManageProperties" : "canManageListings" });
  return context.prisma.$transaction(async (tx) => {
    await tx.$queryRawUnsafe(`SELECT "id" FROM "${table}" WHERE "id" = $1 FOR UPDATE`, id2);
    const current2 = await tx[delegate].findUnique({ where: { id: id2 }, select: { id: true, status: true, hostOrganizationId: true } });
    if (!current2 || current2.hostOrganizationId !== record5.hostOrganizationId) throw new Error(`${table} not found.`);
    if (current2.status !== expectedStatus) throw new Error(`This ${kind} changed before the action was applied. Refresh and try again.`);
    const allowed = transitions[kind];
    const nextStatus = allowed[current2.status || ""]?.[transition];
    if (!nextStatus) throw new Error(current2.status === "archived" ? `Archived ${kind === "property" ? "properties" : "listings"} are read-only.` : `This ${kind} can no longer take that action. Refresh and try again.`);
    if (kind === "listing" && nextStatus === "published") {
      const listing = await tx.listing.findUnique({ where: { id: id2 }, select: { accommodationUnit: { select: { id: true, status: true } }, property: { select: { status: true } } } });
      if (!listing?.accommodationUnit?.id || listing.accommodationUnit.status !== "available") throw new Error("Attach this listing to an available unit before publishing.");
      if (listing.property?.status === "archived") throw new Error("This listing\u2019s property is archived.");
      const readiness = (await listingReadinessFor(tx, [id2])).get(id2);
      if (!readiness?.priced) throw new Error(`${readiness?.problem || "No positive nightly rate."} Guests can\u2019t book a listing without a usable price.`);
    }
    await tx[delegate].update({ where: { id: id2 }, data: { status: nextStatus } });
    const now = /* @__PURE__ */ new Date();
    return { id: id2, status: nextStatus };
  }, { maxWait: 5e3, timeout: 1e4, isolationLevel: "ReadCommitted" });
}
function archivedRecordGuard(label) {
  return ({ operation, item, addValidationError }) => {
    if (operation === "update" && item?.status === "archived") {
      addValidationError(`Archived ${label === "property" ? "properties" : "listings"} are read-only.`);
    }
  };
}

// features/keystone/models/Listing.ts
var listingHostHooks = hostScopedHooks("canManageListings");
var archivedListingGuard = archivedRecordGuard("listing");
var Listing = (0, import_core20.list)({
  access: hostScopedListAccess("canReadListings", "canManageListings"),
  hooks: {
    resolveInput: async (args) => coherentBookingMode(await listingHostHooks.resolveInput(args), args.item),
    validate: async (args) => {
      if (args.operation === "delete") await historyDeleteGuard("Listing")(args);
      await listingHostHooks.validate(args);
      archivedListingGuard(args);
      try {
        await assertListingAllocation(args);
      } catch (error) {
        args.addValidationError(error instanceof Error ? error.message : "Listing allocation is invalid.");
      }
    }
  },
  ui: {
    labelField: "title",
    listView: { initialColumns: ["title", "status", "property", "accommodationUnit", "baseNightlyRateCents", "instantBook"] }
  },
  fields: {
    hostOrganization: (0, import_fields21.relationship)({ ref: "HostOrganization.listings" }),
    // Set when the listing is created; moved later only by the locked allocation command, which
    // serializes with bookings, amendments and re-accommodation on the same listing and units.
    property: (0, import_fields21.relationship)({
      ref: "Property.listings",
      access: { read: permissions.canReadProperties, update: () => false }
    }),
    accommodationUnit: (0, import_fields21.relationship)({ ref: "AccommodationUnit.listings", access: { update: () => false } }),
    title: (0, import_fields21.text)({ validation: { isRequired: true } }),
    slug: (0, import_fields21.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    subtitle: (0, import_fields21.text)(),
    description: (0, import_fields21.text)({ ui: { displayMode: "textarea" } }),
    // Lifecycle moves only through the locked catalog transition command.
    status: (0, import_fields21.select)({
      type: "string",
      access: { update: () => false },
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
        { label: "Paused", value: "paused" },
        { label: "Archived", value: "archived" }
      ],
      defaultValue: "draft"
    }),
    bookingMode: (0, import_fields21.select)({
      type: "string",
      options: [
        { label: "Instant Book", value: "instant" },
        { label: "Request to Book", value: "request" }
      ],
      defaultValue: "request"
    }),
    instantBook: (0, import_fields21.checkbox)({ defaultValue: false }),
    isFeatured: (0, import_fields21.checkbox)({ defaultValue: false }),
    currencyCode: (0, import_fields21.text)({ defaultValue: "USD", validation: { isRequired: true } }),
    baseNightlyRateCents: (0, import_fields21.integer)({ defaultValue: 0, validation: { min: 0 } }),
    securityDepositCents: (0, import_fields21.integer)({ defaultValue: 0, validation: { min: 0 } }),
    minimumStay: (0, import_fields21.integer)({ defaultValue: 1, validation: { min: 1 } }),
    maximumStay: (0, import_fields21.integer)({ validation: { min: 1 } }),
    advanceNoticeHours: (0, import_fields21.integer)({ defaultValue: 24, validation: { min: 0 }, ui: { description: "Minimum hours between booking and check-in (at the property\u2019s check-in time). Enforced in search, quotes and booking; an active rate plan\u2019s value takes precedence." } }),
    bookingWindowDays: (0, import_fields21.integer)({ defaultValue: 365, validation: { min: 1 }, ui: { description: "How many days ahead a check-in can be booked. Enforced in search, quotes and booking; an active rate plan\u2019s value takes precedence." } }),
    reviewAverageHundredths: (0, import_fields21.integer)({ defaultValue: 0, validation: { min: 0, max: 500 } }),
    reviewCount: (0, import_fields21.integer)({ defaultValue: 0, validation: { min: 0 } }),
    // Bookable-online readiness from the quote rules, readable with the listing itself; it
    // carries no prices or terms, so hidden pricing is never misread as missing pricing.
    onlineReadiness: (0, import_fields21.virtual)({
      field: import_core20.graphql.field({
        type: import_core20.graphql.JSON,
        resolve: async (item, _args, context) => (await listingReadinessFor(context.prisma, [String(item.id)])).get(String(item.id)) || null
      }),
      ui: { itemView: { fieldMode: "hidden" }, listView: { fieldMode: "hidden" }, createView: { fieldMode: "hidden" } }
    }),
    thumbnail: (0, import_fields21.virtual)({
      field: import_core20.graphql.field({
        type: import_core20.graphql.String,
        resolve: async (item, _args, context) => {
          const listing = await context.query.Listing.findOne({
            where: { id: String(item.id) },
            query: "media(orderBy: [{ order: asc }], take: 1) { image { url } imagePath }"
          });
          const media = listing?.media?.[0];
          return media?.image?.url || media?.imagePath || null;
        }
      })
    }),
    media: (0, import_fields21.relationship)({
      ref: "ListingMedia.listing",
      many: true,
      ui: {
        displayMode: "cards",
        cardFields: ["image", "imagePath", "altText", "caption", "order"],
        inlineCreate: { fields: ["image", "imagePath", "altText", "caption", "order"] },
        inlineEdit: { fields: ["image", "imagePath", "altText", "caption", "order"] }
      }
    }),
    amenities: (0, import_fields21.relationship)({ ref: "Amenity.listings", many: true }),
    collections: (0, import_fields21.relationship)({ ref: "StayCollection.listings", many: true }),
    houseRules: (0, import_fields21.relationship)({ ref: "HouseRule.listing", many: true }),
    calendarBlocks: (0, import_fields21.relationship)({
      ref: "CalendarBlock.listing",
      many: true,
      access: { create: import_access23.denyAll, update: import_access23.denyAll },
      ui: { displayMode: "count" }
    }),
    // Pricing links need pricing authority, not only listing authority; read-only pricing can't repoint them.
    ratePlans: (0, import_fields21.relationship)({ ref: "RatePlan.listing", many: true, access: { create: permissions.canManagePricing, update: permissions.canManagePricing }, ui: { displayMode: "count" } }),
    feeDefinitions: (0, import_fields21.relationship)({ ref: "FeeDefinition.listing", many: true, access: { create: permissions.canManagePricing, update: permissions.canManagePricing } }),
    taxRules: (0, import_fields21.relationship)({ ref: "TaxRule.listing", many: true, access: { create: permissions.canManagePricing, update: permissions.canManagePricing } }),
    // History (issued quotes, conversations, reviews, tasks) is never moved or detached from a parent's form.
    quotes: (0, import_fields21.relationship)({ ref: "StayQuote.listing", many: true, access: { create: import_access23.denyAll, update: import_access23.denyAll }, ui: { displayMode: "count", createView: { fieldMode: "hidden" } } }),
    reservations: (0, import_fields21.relationship)({
      ref: "Reservation.listing",
      many: true,
      // Reservations move only through allocation and lifecycle commands, never from a parent's form.
      access: { read: permissions.canReadReservations, create: () => false, update: () => false },
      ui: { displayMode: "count" }
    }),
    conversations: (0, import_fields21.relationship)({ ref: "Conversation.listing", many: true, access: { create: import_access23.denyAll, update: import_access23.denyAll }, ui: { displayMode: "count", createView: { fieldMode: "hidden" } } }),
    reviews: (0, import_fields21.relationship)({ ref: "Review.listing", many: true, access: { create: import_access23.denyAll, update: import_access23.denyAll }, ui: { displayMode: "count", createView: { fieldMode: "hidden" } } }),
    tasks: (0, import_fields21.relationship)({ ref: "PropertyTask.listing", many: true, access: { create: import_access23.denyAll, update: import_access23.denyAll }, ui: { displayMode: "count", createView: { fieldMode: "hidden" } } }),
    channelListings: (0, import_fields21.relationship)({ ref: "ChannelListing.listing", many: true, access: { create: permissions.canManageChannels, update: permissions.canManageChannels }, ui: { displayMode: "count" } }),
    ...trackingFields
  }
});

// features/keystone/models/ListingMedia.ts
var import_core21 = require("@keystone-6/core");
var import_fields22 = require("@keystone-6/core/fields");
var ListingMedia = (0, import_core21.list)({
  access: hostScopedListAccess("canReadListings", "canManageListings"),
  hooks: hostScopedHooks("canManageListings", { parent: "listing" }),
  ui: { listView: { initialColumns: ["listing", "image", "imagePath", "altText", "order"] } },
  fields: {
    hostOrganization: (0, import_fields22.relationship)({ ref: "HostOrganization" }),
    listing: (0, import_fields22.relationship)({ ref: "Listing.media" }),
    image: (0, import_fields22.image)({ storage: "my_images" }),
    imagePath: (0, import_fields22.text)({
      isIndexed: "unique",
      db: { isNullable: true },
      ui: { description: "Image URL, used when no file is uploaded. Leave blank for an uploaded image." },
      hooks: {
        resolveInput: ({ resolvedData, fieldKey }) => {
          const value = resolvedData[fieldKey];
          return typeof value === "string" && !value.trim() ? null : value;
        }
      }
    }),
    altText: (0, import_fields22.text)({ validation: { isRequired: true } }),
    caption: (0, import_fields22.text)(),
    order: (0, import_fields22.integer)({ defaultValue: 0 }),
    metadata: (0, import_fields22.json)(),
    ...trackingFields
  }
});

// features/keystone/models/MarketplaceSettings.ts
var import_core22 = require("@keystone-6/core");
var import_fields23 = require("@keystone-6/core/fields");

// features/platform/store-settings/lib/icon-registry.ts
var LOGO_ICONS = [
  {
    id: "3portals",
    name: "3Portals",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g clip-rule="evenodd" fill-rule="evenodd"><path d="m34.5868 8.40061-9.6868-2.59556c-.6687-.17919-1.2108.23679-1.2108.92911v10.02854c0 .6923.5421 1.3988 1.2108 1.578l9.6868 2.5955c.6687.1792 1.2109-.2368 1.2109-.9291v-10.02848c0-.69232-.5422-1.39882-1.2109-1.57801zm-9.6868-6.35625c-2.6749-.71674-4.8434.94718-4.8434 3.71647v10.02847c0 2.7693 2.1685 5.5953 4.8434 6.312l9.6868 2.5956c2.6749.7168 4.8434-.9472 4.8434-3.7165v-10.0284c0-2.76934-2.1685-5.59533-4.8434-6.31207z" fill="#8098f9"/><path d="m26.9812 16.5707-12.1085-3.2444c-.6687-.1792-1.2109.2368-1.2109.9291v12.5356c0 .6923.5422 1.3988 1.2109 1.578l12.1085 3.2445c.6687.1792 1.2108-.2368 1.2108-.9291v-12.5356c0-.6924-.5421-1.3989-1.2108-1.5781zm-12.1085-7.0051c-2.6749-.71674-4.8434.9472-4.8434 3.7165v12.5356c0 2.7693 2.1685 5.5953 4.8434 6.312l12.1085 3.2445c2.6749.7167 4.8433-.9472 4.8433-3.7165v-12.5356c0-2.7693-2.1684-5.5953-4.8433-6.312z" fill="#6172f3"/><path d="m19.3736 24.7409-14.53021-3.8934c-.66873-.1792-1.21085.2368-1.21085.9291v15.0428c0 .6923.54212 1.3988 1.21085 1.578l14.53021 3.8933c.6687.1792 1.2108-.2368 1.2108-.9291v-15.0427c0-.6923-.5421-1.3988-1.2108-1.578zm-14.53021-7.6541c-2.67493-.7167-4.84339.9472-4.84339 3.7165v15.0427c0 2.7693 2.16846 5.5953 4.84339 6.3121l14.53021 3.8933c2.6749.7168 4.8433-.9472 4.8433-3.7164v-15.0428c0-2.7693-2.1684-5.5953-4.8433-6.312z" fill="#444ce7"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g clip-rule="evenodd" fill="#fff" fill-rule="evenodd"><path d="m34.5868 8.40061-9.6868-2.59556c-.6687-.17919-1.2108.23679-1.2108.92911v10.02854c0 .6923.5421 1.3988 1.2108 1.578l9.6868 2.5955c.6687.1792 1.2109-.2368 1.2109-.9291v-10.02848c0-.69232-.5422-1.39882-1.2109-1.57801zm-9.6868-6.35625c-2.6749-.71674-4.8434.94718-4.8434 3.71647v10.02847c0 2.7693 2.1685 5.5953 4.8434 6.312l9.6868 2.5956c2.6749.7168 4.8434-.9472 4.8434-3.7165v-10.0284c0-2.76934-2.1685-5.59533-4.8434-6.31207z" opacity=".5"/><path d="m26.9812 16.5707-12.1085-3.2444c-.6687-.1792-1.2109.2368-1.2109.9291v12.5356c0 .6923.5422 1.3988 1.2109 1.578l12.1085 3.2445c.6687.1792 1.2108-.2368 1.2108-.9291v-12.5356c0-.6924-.5421-1.3989-1.2108-1.5781zm-12.1085-7.0051c-2.6749-.71674-4.8434.9472-4.8434 3.7165v12.5356c0 2.7693 2.1685 5.5953 4.8434 6.312l12.1085 3.2445c2.6749.7167 4.8433-.9472 4.8433-3.7165v-12.5356c0-2.7693-2.1684-5.5953-4.8433-6.312z" opacity=".7"/><path d="m19.3736 24.7409-14.53021-3.8934c-.66873-.1792-1.21085.2368-1.21085.9291v15.0428c0 .6923.54212 1.3988 1.21085 1.578l14.53021 3.8933c.6687.1792 1.2108-.2368 1.2108-.9291v-15.0427c0-.6923-.5421-1.3988-1.2108-1.578zm-14.53021-7.6541c-2.67493-.7167-4.84339.9472-4.84339 3.7165v15.0427c0 2.7693 2.16846 5.5953 4.84339 6.3121l14.53021 3.8933c2.6749.7168 4.8433-.9472 4.8433-3.7164v-15.0428c0-2.7693-2.1684-5.5953-4.8433-6.312z"/></g></svg>`
  },
  {
    id: "45-degrees",
    name: "45 Degrees",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 24 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m0 15.8981h17.3455l-17.061314 17.0613 2.756374 2.7564 17.06134-17.0613v17.3455h.1104l3.7877-3.7877v-15.9638l-4.2485-4.2485h-15.96596l-3.78553995 3.7855z" fill="#155eef"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 24 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m0 15.8981h17.3455l-17.061314 17.0613 2.756374 2.7564 17.06134-17.0613v17.3455h.1104l3.7877-3.7877v-15.9638l-4.2485-4.2485h-15.96596l-3.78553995 3.7855z" fill="#155eef"/></svg>`
  },
  {
    id: "acme-corp",
    name: "Acme Corp",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 48 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m0 24c15.2548 0 24-8.7452 24-24 0 15.2548 8.7452 24 24 24-15.2548 0-24 8.7452-24 24 0-15.2548-8.7452-24-24-24z" fill="#155eef" fill-rule="evenodd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 48 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m0 24c15.2548 0 24-8.7452 24-24 0 15.2548 8.7452 24 24 24-15.2548 0-24 8.7452-24 24 0-15.2548-8.7452-24-24-24z" fill="#155eef" fill-rule="evenodd"/></svg>`
  },
  {
    id: "alphawave",
    name: "AlphaWave",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 47 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m24.9706 7.03309c-3.1242-3.1242-8.1896-3.1242-11.3137 0l-11.31375 11.31371c-3.124199 3.1242-3.124199 8.1895 0 11.3137l11.31375 11.3137c3.1241 3.1242 8.1895 3.1242 11.3137 0l5.3982-5.3983c-4.4939-1.7337-7.682-6.0944-7.682-11.1997 0-5.3087 3.4472-9.8123 8.2254-11.3943-.0935-.0982-.1884-.1955-.2848-.292z" fill="#155eef"/><path d="m30.3691 35.5798c1.3398.5168 2.7955.8001 4.3174.8001 6.6274 0 12-5.3726 12-12s-5.3726-12-12-12c-1.3185 0-2.5873.2126-3.774.6055 5.9623 6.2681 5.8675 16.1836-.2846 22.3356z" fill="#155eef" opacity=".7"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 47 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m24.9706 7.03309c-3.1242-3.1242-8.1896-3.1242-11.3137 0l-11.31375 11.31371c-3.124199 3.1242-3.124199 8.1895 0 11.3137l11.31375 11.3137c3.1241 3.1242 8.1895 3.1242 11.3137 0l5.3982-5.3983c-4.4939-1.7337-7.682-6.0944-7.682-11.1997 0-5.3087 3.4472-9.8123 8.2254-11.3943-.0935-.0982-.1884-.1955-.2848-.292z" fill="#155eef"/><path d="m30.3691 35.5798c1.3398.5168 2.7955.8001 4.3174.8001 6.6274 0 12-5.3726 12-12s-5.3726-12-12-12c-1.3185 0-2.5873.2126-3.774.6055 5.9623 6.2681 5.8675 16.1836-.2846 22.3356z" fill="#155eef" opacity=".7"/></svg>`
  },
  {
    id: "alt-shift",
    name: "Alt+Shift",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m23.4538 34.7189c-3.1818-1.1818-6.4544-1.3636-9.4544-.5455-2.0909.5455-4.09082 1.6364-5.90897 3l-1.27273 1.0909-.36362.3636.81816.7273c.09091 0 .09092.0909.18183.1818.18181.1818.36364.2727.63636.4545l.54542.3636.54545-.4545c.09091-.0909.27273-.2727.45454-.3636 1.63636-1.3636 3.45446-2.2727 5.36356-2.7272 2.4545-.6364 5.0908-.5455 7.7271.4545 2.1818.8182 6.6363 1.8181 11.9998-.4545l.1818-.091.2728-.2727c0-.0909.0909-.0909.1818-.1818.4545-.5454.9091-1.0909 1.2727-1.7272l1.8181-2.8182-2.909 1.6363c-4.2727 2.3636-8.1817 2.8182-12.0907 1.3637z"/><path d="m10.9998 24.9011c2.4545-.6363 5.0908-.5454 7.7272.4546 2.909 1.0909 10.3634 2.6363 18.7269-4.909l1.8182-1.8182-.1819-.4545c-.0909-.3636-.2727-.8182-.4545-1.2727l-.4545-1.2727-.9091.909c-.0909.1819-.2727.2728-.4546.4546-3.9999 4.0908-10.1816 8.2726-17.2724 5.7272-3.1817-1.1818-6.4544-1.3637-9.4544-.5455-2.909.8182-5.45442 2.3636-7.81801 4.5454v-.0909l-1.363614 1.4545c0 .0909-.090891.0909-.181798.1818l-.27274.2727.090913.3637c.090908.4545.272717.909.363625 1.3636l.545454 1.4545.90907-1.1818c.09091-.1818.27272-.2727.36363-.4545 1.90905-1.7273 4.54538-4.1818 8.27257-5.1818z"/><path d="m2.1818 23.2646c2.09088-2.1818 4.45445-3.5454 6.99987-4.2727 2.45453-.6363 5.09083-.5454 7.72713.4546 8.1817 2.9999 15.2725-1.9091 18.3633-4.5454l1.1818-1.1818.4546-.3636-.3637-.5455c-.2727-.2727-.4545-.6363-.7272-1l-.5455-.7272-.6363.6363c-.0909.0909-.2727.2727-.3637.3637-3.8181 3.6363-9.7271 7.3635-16.4542 4.8181-3.1818-1.1818-6.4544-1.3637-9.4544-.5455-1.90906.5455-3.72721 1.4545-5.54536 2.6363l-1.909065 1.5455c-.181815.1818-.272722.2727-.454537.4545l-.181799.1818v.2727c-.090907.6364-.090918 1.2727-.1818259 1.8182l-.0909131 2.2727 1.54544-1.6364c.18181-.1818.36364-.4545.63636-.6363z"/><path d="m26.0908 40.9007c-.2727-.0909-.4545-.1819-.7272-.2728-3.1818-1.1818-6.4545-1.3636-9.4545-.5454-.6363.1818-1.2726.3636-1.909.6364l-2.1818.9999-.5454.2728 1.8181.6363c.5455.1818 1.0909.3637 1.6364.5455l.2727.0909.2727-.0909c.2727-.0909.5455-.2728.8182-.2728.1818 0 .3636-.0909.5454-.1818 2.1818-.5454 4.5454-.5454 7.0908.2727.2727.091.4546.1819.7273.2728l.4545.1818.2727-.0909c.6364-.1818 1.3636-.3636 1.9091-.6364l2.5454-.909-2.6363-.6364c-.2727-.0909-.6364-.1818-.9091-.2727z"/><path d="m40 22.0829-1.3636 1.3636c-.1818.1818-.3636.3636-.5454.5454-3.7272 3.5454-9.7271 7.3635-16.4543 4.8181-3.1818-1.1818-6.4544-1.3636-9.4544-.5454-2.81811.8182-5.36354 2.2727-7.63623 4.4545l-1.18179 1.2727-.36362.4545.36362.5454c.27273.3637.45455.6364.63637 1l.54542.8182.63636-.8182c.09091-.0909.27272-.2727.36363-.3636 2.18178-2.3636 4.54534-3.8181 7.27264-4.5454 2.4545-.6364 5.0908-.5454 7.7271.4545 2.2727.8182 4.6363 1.0909 6.9999.8182 4.1817-.4545 8.3635-2.8181 11.4543-5.4544.1819-.1818.3636-.2727.5455-.4546l.2727-.2727v-.2727c0-.5455.0909-1.1818.0909-1.7273z"/><path d="m5.45373 13.7196c.54545-.2728 1.18182-.4546 1.72726-.6364 2.45451-.6364 5.09081-.5455 7.72711.4545 1.7273.6364 3.4545.9091 5.3636.9091 3.8181 0 7.6362-1.3636 11.1816-3.9999l1.8181-1.45455-.8181-.63636c-.2727-.27273-.6364-.54544-1-.72725l-.5455-.36363-.4545.36363c-.1818.09091-.2727.27272-.4545.36362-4.8181 3.63634-9.6362 4.63634-14.1816 2.90904-3.2727-1.18178-6.54535-1.45451-9.81802-.4545-.27272.0909-.54544.1818-.90907.2727l-.1818.0909-.27274.2727c0 .0909-.09089.0909-.1818.1818-.36363.5455-.81818 1-1.18181 1.5455l-1.72724 2.6363 2.81814-1.4545c.45453 0 .81815-.1818 1.09087-.2727z"/><path d="m12.9089 7.53769.2727.09091c1.1818.45454 3 .90907 5.2726.90907 2.3636 0 4.6363-.54545 6.909-1.45452l2.8181-1.36361-1.909-.63634c-.5454-.18182-1.0909-.36363-1.7273-.45454h-.2727l-.2727.09089c-.2727.0909-.5455.27274-.8182.36365-2.7272.99998-5.4544 1.1818-8.0907.45454-.2728-.09091-.5455-.18183-.8182-.27274l-.2727-.09091-.2728.09091c-.5454.18181-1.0908.36364-1.6363.63636l-2.09087.90908 2.18177.63633c.1818-.0909.4546.00001.7273.09092z"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m23.4538 34.7189c-3.1818-1.1818-6.4544-1.3636-9.4544-.5455-2.0909.5455-4.09082 1.6364-5.90897 3l-1.27273 1.0909-.36362.3636.81816.7273c.09091 0 .09092.0909.18183.1818.18181.1818.36364.2727.63636.4545l.54542.3636.54545-.4545c.09091-.0909.27273-.2727.45454-.3636 1.63636-1.3636 3.45446-2.2727 5.36356-2.7272 2.4545-.6364 5.0908-.5455 7.7271.4545 2.1818.8182 6.6363 1.8181 11.9998-.4545l.1818-.091.2728-.2727c0-.0909.0909-.0909.1818-.1818.4545-.5454.9091-1.0909 1.2727-1.7272l1.8181-2.8182-2.909 1.6363c-4.2727 2.3636-8.1817 2.8182-12.0907 1.3637z"/><path d="m10.9998 24.9011c2.4545-.6363 5.0908-.5454 7.7272.4546 2.909 1.0909 10.3634 2.6363 18.7269-4.909l1.8182-1.8182-.1819-.4545c-.0909-.3636-.2727-.8182-.4545-1.2727l-.4545-1.2727-.9091.909c-.0909.1819-.2727.2728-.4546.4546-3.9999 4.0908-10.1816 8.2726-17.2724 5.7272-3.1817-1.1818-6.4544-1.3637-9.4544-.5455-2.909.8182-5.45442 2.3636-7.81801 4.5454v-.0909l-1.363614 1.4545c0 .0909-.090891.0909-.181798.1818l-.27274.2727.090913.3637c.090908.4545.272717.909.363625 1.3636l.545454 1.4545.90907-1.1818c.09091-.1818.27272-.2727.36363-.4545 1.90905-1.7273 4.54538-4.1818 8.27257-5.1818z"/><path d="m2.1818 23.2646c2.09088-2.1818 4.45445-3.5454 6.99987-4.2727 2.45453-.6363 5.09083-.5454 7.72713.4546 8.1817 2.9999 15.2725-1.9091 18.3633-4.5454l1.1818-1.1818.4546-.3636-.3637-.5455c-.2727-.2727-.4545-.6363-.7272-1l-.5455-.7272-.6363.6363c-.0909.0909-.2727.2727-.3637.3637-3.8181 3.6363-9.7271 7.3635-16.4542 4.8181-3.1818-1.1818-6.4544-1.3637-9.4544-.5455-1.90906.5455-3.72721 1.4545-5.54536 2.6363l-1.909065 1.5455c-.181815.1818-.272722.2727-.454537.4545l-.181799.1818v.2727c-.090907.6364-.090918 1.2727-.1818259 1.8182l-.0909131 2.2727 1.54544-1.6364c.18181-.1818.36364-.4545.63636-.6363z"/><path d="m26.0908 40.9007c-.2727-.0909-.4545-.1819-.7272-.2728-3.1818-1.1818-6.4545-1.3636-9.4545-.5454-.6363.1818-1.2726.3636-1.909.6364l-2.1818.9999-.5454.2728 1.8181.6363c.5455.1818 1.0909.3637 1.6364.5455l.2727.0909.2727-.0909c.2727-.0909.5455-.2728.8182-.2728.1818 0 .3636-.0909.5454-.1818 2.1818-.5454 4.5454-.5454 7.0908.2727.2727.091.4546.1819.7273.2728l.4545.1818.2727-.0909c.6364-.1818 1.3636-.3636 1.9091-.6364l2.5454-.909-2.6363-.6364c-.2727-.0909-.6364-.1818-.9091-.2727z"/><path d="m40 22.0829-1.3636 1.3636c-.1818.1818-.3636.3636-.5454.5454-3.7272 3.5454-9.7271 7.3635-16.4543 4.8181-3.1818-1.1818-6.4544-1.3636-9.4544-.5454-2.81811.8182-5.36354 2.2727-7.63623 4.4545l-1.18179 1.2727-.36362.4545.36362.5454c.27273.3637.45455.6364.63637 1l.54542.8182.63636-.8182c.09091-.0909.27272-.2727.36363-.3636 2.18178-2.3636 4.54534-3.8181 7.27264-4.5454 2.4545-.6364 5.0908-.5454 7.7271.4545 2.2727.8182 4.6363 1.0909 6.9999.8182 4.1817-.4545 8.3635-2.8181 11.4543-5.4544.1819-.1818.3636-.2727.5455-.4546l.2727-.2727v-.2727c0-.5455.0909-1.1818.0909-1.7273z"/><path d="m5.45373 13.7196c.54545-.2728 1.18182-.4546 1.72726-.6364 2.45451-.6364 5.09081-.5455 7.72711.4545 1.7273.6364 3.4545.9091 5.3636.9091 3.8181 0 7.6362-1.3636 11.1816-3.9999l1.8181-1.45455-.8181-.63636c-.2728-.27273-.6364-.54544-1-.72725l-.5455-.36363-.4545.36363c-.1818.09091-.2727.27272-.4545.36362-4.8181 3.63634-9.6362 4.63634-14.1816 2.90904-3.2727-1.18178-6.54535-1.45451-9.81802-.4545-.27272.0909-.54544.1818-.90907.2727l-.1818.0909-.27274.2727c0 .0909-.09089.0909-.1818.1818-.36363.5455-.81818 1-1.18181 1.5455l-1.72724 2.6363 2.81814-1.4545c.45453 0 .81815-.1818 1.09087-.2727z"/><path d="m12.9089 7.53769.2727.09091c1.1818.45454 3 .90907 5.2726.90907 2.3636 0 4.6363-.54545 6.909-1.45452l2.8181-1.36361-1.909-.63634c-.5454-.18182-1.0909-.36363-1.7273-.45454h-.2727l-.2727.09089c-.2727.0909-.5455.27274-.8182.36365-2.7272.99998-5.4544 1.1818-8.0907.45454-.2728-.09091-.5455-.18183-.8182-.27274l-.2727-.09091-.2728.09091c-.5454.18181-1.0908.36364-1.6363.63636l-2.09087.90908 2.18177.63633c.1818-.0909.4546.00001.7273.09092z"/></g></svg>`
  },
  {
    id: "biosynthesis",
    name: "Biosynthesis",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g clip-rule="evenodd" fill-rule="evenodd"><path d="m4.29111 28.6025c.90712.9019.9071 2.3641-.00003 3.266l-.04646.0462c-.90713.9019-2.37788.9018-3.284994-.0001-.9071177-.9019-.9071038-2.3641.000031-3.266l.046453-.0462c.90714-.9019 2.37788-.9018 3.285.0001z" fill="#a4bcfd"/><path d="m15.2112 29.298c.9055.9035.9028 2.3658-.006 3.266l-6.43424 6.3741c-.90876.9002-2.3795.8976-3.28499-.0059-.90548-.9035-.90282-2.3658.00594-3.266l6.43429-6.3741c.9088-.9002 2.3795-.8976 3.285.0059z" fill="#6172f3"/><path d="m23.9431 40.2706c.7116-1.0613 2.1538-1.348 3.2212-.6405l.1394.0923c1.0674.7075 1.3558 2.1414.6442 3.2026-.7116 1.0613-2.1538 1.3481-3.2212.6406l-.1394-.0924c-1.0674-.7075-1.3558-2.1414-.6442-3.2026z" fill="#a4bcfd"/><path d="m39.2728 28.4638c.9072.9019.9072 2.3641 0 3.266l-3.159 3.1408c-.9072.9019-2.3779.9019-3.285 0s-.9071-2.3641 0-3.266l3.1591-3.1408c.9071-.9019 2.3778-.9019 3.2849 0z" fill="#6172f3"/><g fill="#444ce7"><path d="m39.3197 16.8473c.9071.9019.9071 2.3642 0 3.266l-23.3446 23.2098c-.9071.9019-2.3779.9019-3.285 0s-.9071-2.3641 0-3.266l23.3446-23.2098c.9071-.9019 2.3778-.9019 3.285 0z"/><path d="m34.905 9.71133c.9072.90187.9072 2.36417 0 3.26607l-13.426 13.3485c-.9071.9019-2.3779.9019-3.285 0s-.9071-2.3642 0-3.2661l13.4261-13.34847c.9071-.90189 2.3778-.90189 3.2849 0z"/><path d="m27.8187 5.18362c.9077.90128.9087 2.36353.0022 3.26603l-17.2588 17.18215c-.90647.9025-2.37721.9035-3.28495.0022-.90773-.9013-.90872-2.3635-.00221-3.266l17.25876-17.18218c.9065-.9025 2.3772-.90348 3.285-.0022z"/></g><path d="m10.7276 10.6841c.9056.9035.9031 2.3657-.0056 3.266l-6.75949 6.6974c-.90869.9003-2.37943.8978-3.28499-.0056-.905563-.9035-.903032-2.3657.005654-3.2661l6.759476-6.6973c.90868-.90034 2.37942-.89783 3.28495.0056z" fill="#6172f3"/><path d="m14.8678 4.00024c1.2828 0 2.3228 1.03397 2.3228 2.30944v.23094c0 1.27546-1.04 2.30943-2.3228 2.30943-1.2829 0-2.3229-1.03397-2.3229-2.30943v-.23094c0-1.27547 1.04-2.30944 2.3229-2.30944z" fill="#a4bcfd"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g clip-rule="evenodd" fill="#fff" fill-rule="evenodd"><path d="m4.29111 28.6025c.90712.9019.9071 2.3641-.00003 3.266l-.04646.0462c-.90713.9019-2.37788.9018-3.284994-.0001-.9071177-.9019-.9071038-2.3641.000031-3.266l.046453-.0462c.90714-.9019 2.37788-.9018 3.285.0001z" opacity=".5"/><path d="m15.2112 29.298c.9055.9035.9028 2.3658-.006 3.266l-6.43424 6.3741c-.90876.9002-2.3795.8976-3.28499-.0059-.90548-.9035-.90282-2.3658.00594-3.266l6.43429-6.3741c.9088-.9002 2.3795-.8976 3.285.0059z" opacity=".7"/><path d="m23.9431 40.2706c.7116-1.0613 2.1538-1.348 3.2212-.6405l.1394.0923c1.0674.7075 1.3558 2.1414.6442 3.2026-.7116 1.0613-2.1538 1.3481-3.2212.6406l-.1394-.0924c-1.0674-.7075-1.3558-2.1414-.6442-3.2026z" opacity=".5"/><path d="m39.2728 28.4638c.9072.9019.9072 2.3641 0 3.266l-3.159 3.1408c-.9072.9019-2.3779.9019-3.285 0s-.9071-2.3641 0-3.266l3.1591-3.1408c.9071-.9019 2.3778-.9019 3.2849 0z" opacity=".7"/><path d="m39.3197 16.8473c.9071.9019.9071 2.3642 0 3.266l-23.3446 23.2098c-.9071.9019-2.3779.9019-3.285 0s-.9071-2.3641 0-3.266l23.3446-23.2098c.9071-.9019 2.3778-.9019 3.285 0z"/><path d="m34.905 9.71133c.9072.90187.9072 2.36417 0 3.26607l-13.426 13.3485c-.9071.9019-2.3779.9019-3.285 0s-.9071-2.3642 0-3.2661l13.4261-13.34847c.9071-.90189 2.3778-.90189 3.2849 0z"/><path d="m27.8187 5.18362c.9077.90128.9087 2.36353.0022 3.26603l-17.2588 17.18215c-.90647.9025-2.37721.9035-3.28495.0022-.90773-.9013-.90872-2.3635-.00221-3.266l17.25876-17.18218c.9065-.9025 2.3772-.90348 3.285-.0022z"/><path d="m10.7276 10.6841c.9056.9035.9031 2.3657-.0056 3.266l-6.75949 6.6974c-.90869.9003-2.37943.8978-3.28499-.0056-.905563-.9035-.903032-2.3657.005654-3.2661l6.759476-6.6973c.90868-.90034 2.37942-.89783 3.28495.0056z" opacity=".7"/><path d="m14.8678 4.00024c1.2828 0 2.3228 1.03397 2.3228 2.30944v.23094c0 1.27546-1.04 2.30943-2.3228 2.30943-1.2829 0-2.3229-1.03397-2.3229-2.30943v-.23094c0-1.27547 1.04-2.30944 2.3229-2.30944z" opacity=".5"/></g></svg>`
  },
  {
    id: "boltshift",
    name: "Boltshift",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m20 44c11.0457 0 20-8.9543 20-20s-8.9543-20-20-20c-11.04572 0-20 8.9543-20 20s8.95428 20 20 20zm6.2393-30.6832c.3037-1.0787-.7432-1.7167-1.6993-1.0355l-13.3469 9.5083c-1.0369.7387-.8738 2.2104.245 2.2104h3.5146v-.0272h6.8498l-5.5813 1.9693-2.4605 8.7411c-.3037 1.0788.7431 1.7167 1.6993 1.0355l13.3469-9.5082c1.0369-.7387.8737-2.2105-.245-2.2105h-5.3298z" fill="#155eef" fill-rule="evenodd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m20 44c11.0457 0 20-8.9543 20-20s-8.9543-20-20-20c-11.04572 0-20 8.9543-20 20s8.95428 20 20 20zm6.2393-30.6832c.3037-1.0787-.7432-1.7167-1.6993-1.0355l-13.3469 9.5083c-1.0369.7387-.8738 2.2104.245 2.2104h3.5146v-.0272h6.8498l-5.5813 1.9693-2.4605 8.7411c-.3037 1.0788.7431 1.7167 1.6993 1.0355l13.3469-9.5082c1.0369-.7387.8737-2.2105-.245-2.2105h-5.3298z" fill="#fff" fill-rule="evenodd"/></svg>`
  },
  {
    id: "buildingblocks",
    name: "BuildingBlocks",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 37 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m12.8841 4.30945-6.8842 3.97574 6.8891 3.97661 6.8862-3.97575zm8.8919 7.44025-6.887 3.9762-.0007 7.9532 6.8877-3.9771zm2 11.4164-6.8879 3.9772 6.8889 3.9765 6.8871-3.9763zm8.8879 7.4416-6.8868 3.9761v7.9522l6.8868-3.9761zm-10.8868 11.9287v-7.9525l-6.8891-3.9766v7.9525zm-10.8888-18.8569-6.8883-3.9775v-7.9526l6.889 3.9765zm-.0003 4.6187-9.38814-5.4209c-.928127-.5359-1.49986-1.5262-1.49986-2.598v-11.99368c0-.71444.381106-1.37463.999789-1.73193l10.383811-5.996798c.9281-.5359626 2.0716-.5361538 2.9998-.000505l10.3922 5.996973c.619.3572 1.0004 1.01758 1.0004 1.73226v11.41638l9.888 5.7096c.6188.3573.9999 1.0175.9999 1.732v11.9937c0 1.0718-.5718 2.0621-1.5 2.598l-10.3868 5.9969c-.6187.3572-1.381.3572-1.9998.0001l-10.3891-5.9969c-.9283-.5358-1.5002-1.5263-1.5002-2.5982z" fill="#155eef" fill-rule="evenodd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 37 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m12.8841 4.30945-6.8842 3.97574 6.8891 3.97661 6.8862-3.97575zm8.8919 7.44025-6.887 3.9762-.0007 7.9532 6.8877-3.9771zm2 11.4164-6.8879 3.9772 6.8889 3.9765 6.8871-3.9763zm8.8879 7.4416-6.8868 3.9761v7.9522l6.8868-3.9761zm-10.8868 11.9287v-7.9525l-6.8891-3.9766v7.9525zm-10.8888-18.8569-6.8883-3.9775v-7.9526l6.889 3.9765zm-.0003 4.6187-9.38814-5.4209c-.928127-.5359-1.49986-1.5262-1.49986-2.598v-11.99368c0-.71444.381106-1.37463.999789-1.73193l10.383811-5.996798c.9281-.5359626 2.0716-.5361538 2.9998-.000505l10.3922 5.996973c.619.3572 1.0004 1.01758 1.0004 1.73226v11.41638l9.888 5.7096c.6188.3573.9999 1.0175.9999 1.732v11.9937c0 1.0718-.5718 2.0621-1.5 2.598l-10.3868 5.9969c-.6187.3572-1.381.3572-1.9998.0001l-10.3891-5.9969c-.9283-.5358-1.5002-1.5263-1.5002-2.5982z" fill="#155eef" fill-rule="evenodd"/></svg>`
  },
  {
    id: "calescence",
    name: "Calescence",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 36 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g clip-rule="evenodd" fill="#1570ef" fill-rule="evenodd"><path d="m35.3721 14v8.0492h-9.9698v-2.2927z"/><path d="m35.3699 14.0001-9.9698 5.7565-7.3513-4.2436v-11.513z" opacity=".9"/><path d="m18.0512 4v11.513l-7.349 4.2436-9.969778-5.7565z" opacity=".8"/><path d="m10.7002 19.7565v8.4868l-9.969731 5.756v-19.9993z" opacity=".7"/><path d="m18.0492 32.4871v11.5129l-17.318731-10.0006 9.969731-5.756z" opacity=".6"/><path d="m35.3699 33.9994-17.3211 10.0006v-11.5129l7.3513-4.2437z" opacity=".5"/><path d="m35.3721 25.9507v8.0487l-9.9698-5.756v-2.2927z" opacity=".4"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 36 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g clip-rule="evenodd" fill="#fff" fill-rule="evenodd"><path d="m35.3721 14v8.0492h-9.9698v-2.2927z"/><path d="m35.3699 14.0001-9.9698 5.7565-7.3513-4.2436v-11.513z" opacity=".9"/><path d="m18.0512 4v11.513l-7.349 4.2436-9.969778-5.7565z" opacity=".8"/><path d="m10.7002 19.7565v8.4868l-9.969731 5.756v-19.9993z" opacity=".7"/><path d="m18.0492 32.4871v11.5129l-17.318731-10.0006 9.969731-5.756z" opacity=".6"/><path d="m35.3699 33.9994-17.3211 10.0006v-11.5129l7.3513-4.2437z" opacity=".5"/><path d="m35.3721 25.9507v8.0487l-9.9698-5.756v-2.2927z" opacity=".4"/></g></svg>`
  },
  {
    id: "capsule",
    name: "Capsule",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="18" fill="#1570ef" r="14"/><circle cx="26" cy="30" fill="#53b1fd" r="14"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><circle cx="14" cy="18" opacity=".7" r="14"/><circle cx="26" cy="30" opacity=".7" r="14"/></g></svg>`
  },
  {
    id: "constellation",
    name: "Constellation",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 44 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m16 8 5.0912 10.9088 10.9088 5.0912-10.9088 5.0912-5.0912 10.9088-5.0912-10.9088-10.9088-5.0912 10.9088-5.0912z"/><path d="m20.0469 31.3286 6.3539-1.0932 3.6 9.7646 3.6-9.7646 10.2565 1.7646-6.6564-8 6.6564-8-10.2565 1.7646-3.6-9.7646-3.6 9.7646-6.3539-1.0932 1.0442 2.2374 10.9088 5.0912-10.9088 5.0912z" opacity=".5"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 44 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m16 8 5.0912 10.9088 10.9088 5.0912-10.9088 5.0912-5.0912 10.9088-5.0912-10.9088-10.9088-5.0912 10.9088-5.0912z"/><path d="m20.0469 31.3286 6.3539-1.0932 3.6 9.7646 3.6-9.7646 10.2565 1.7646-6.6564-8 6.6564-8-10.2565 1.7646-3.6-9.7646-3.6 9.7646-6.3539-1.0932 1.0442 2.2374 10.9088 5.0912-10.9088 5.0912z" opacity=".5"/></g></svg>`
  },
  {
    id: "codecraft",
    name: "Codecraft",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m0 9c0-2.76142 2.23858-5 5-5h10c2.7614 0 5 2.23858 5 5v9.8192c.0002.06.0003.1203.0003.1808 0 2.7575 2.2322 4.9936 4.9881 5h.0116 10c2.7614 0 5 2.2386 5 5v10c0 2.7614-2.2386 5-5 5h-10c-2.7614 0-5-2.2386-5-5v-10c0-.0139.0001-.0277.0002-.0416-.0224-2.7422-2.2523-4.9584-4.9999-4.9584-.0129 0-.0258 0-.0387 0h-9.9616c-2.76142 0-5-2.2386-5-5z" fill="#155eef"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m0 9c0-2.76142 2.23858-5 5-5h10c2.7614 0 5 2.23858 5 5v9.8192c.0002.06.0003.1203.0003.1808 0 2.7575 2.2322 4.9936 4.9881 5h.0116 10c2.7614 0 5 2.2386 5 5v10c0 2.7614-2.2386 5-5 5h-10c-2.7614 0-5-2.2386-5-5v-10c0-.0139.0001-.0277.0002-.0416-.0224-2.7422-2.2523-4.9584-4.9999-4.9584-.0129 0-.0258 0-.0387 0h-9.9616c-2.76142 0-5-2.2386-5-5z" fill="#155eef"/></svg>`
  },
  {
    id: "command-r",
    name: "Command+R",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 32 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m18.6667 30.6667c7.3638 0 13.3333-5.9696 13.3333-13.3334 0-7.36376-5.9695-13.3333-13.3333-13.3333h-18.6667v26.6667z" fill="#155eef"/><path d="m0 4 32 40h-21.3333l-10.6667-13.3333z" fill="#2e90fa"/><path d="m21.1488 30.436c-.8042.1515-1.6339.2307-2.4821.2307h-18.6667v-26.6667z" fill="#53b1fd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 32 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m18.6667 30.6667c7.3638 0 13.3333-5.9696 13.3333-13.3334 0-7.36376-5.9695-13.3333-13.3333-13.3333h-18.6667v26.6667z" opacity=".7"/><path d="m0 4 32 40h-21.3333l-10.6667-13.3333z" opacity=".7"/><path d="m21.1488 30.436c-.8042.1515-1.6339.2307-2.4821.2307h-18.6667v-26.6667z" opacity=".7"/></g></svg>`
  },
  {
    id: "contrast-ai",
    name: "ContrastAI",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m20 4c11.0457 0 20 8.9543 20 20s-8.9543 20-20 20-20-8.9543-20-20 8.9543-20 20-20zm15 20c0 8.2843-6.7157 15-15 15v-30c8.2843 0 15 6.7157 15 15z" fill="#155eef" fill-rule="evenodd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m20 4c11.0457 0 20 8.9543 20 20s-8.9543 20-20 20-20-8.9543-20-20 8.9543-20 20-20zm15 20c0 8.2843-6.7157 15-15 15v-30c8.2843 0 15 6.7157 15 15z" fill="#fff" fill-rule="evenodd"/></svg>`
  },
  {
    id: "convergence",
    name: "Convergence",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 42 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m22.1017 20.8596 9.8995-9.8994-2.1213-2.12137-7.3389 7.33887v-13.1777h-3v13.1777l-7.3388-7.33887-2.1213 2.12137 9.8995 9.8994 1.0606 1.0607zm2.1207 2.1214 9.8995-9.8995 2.1213 2.1213-7.3388 7.3388h13.0956v3h-13.0956l7.3388 7.3389-2.1213 2.1213-9.8995-9.8995-1.0607-1.0607zm-16.26224 12.0208 9.89944-9.8995 1.0607-1.0607-1.0607-1.0606-9.89944-9.8995-2.12133 2.1213 7.33887 7.3388h-13.17574688v3h13.17574688l-7.33887 7.3389zm12.02024-7.7782-9.8995 9.8995 2.1213 2.1213 7.3388-7.3388v13.0944h3v-13.0944l7.3389 7.3388 2.1213-2.1213-9.8995-9.8995-1.0607-1.0607z" fill="#155eef" fill-rule="evenodd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 42 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m22.1017 20.8596 9.8995-9.8994-2.1213-2.12137-7.3389 7.33887v-13.1777h-3v13.1777l-7.3388-7.33887-2.1213 2.12137 9.8995 9.8994 1.0606 1.0607zm2.1207 2.1214 9.8995-9.8995 2.1213 2.1213-7.3388 7.3388h13.0956v3h-13.0956l7.3388 7.3389-2.1213 2.1213-9.8995-9.8995-1.0607-1.0607zm-16.26224 12.0208 9.89944-9.8995 1.0607-1.0607-1.0607-1.0606-9.89944-9.8995-2.12133 2.1213 7.33887 7.3388h-13.17574688v3h13.17574688l-7.33887 7.3389zm12.02024-7.7782-9.8995 9.8995 2.1213 2.1213 7.3388-7.3388v13.0944h3v-13.0944l7.3389 7.3388 2.1213-2.1213-9.8995-9.8995-1.0607-1.0607z" fill="#155eef" fill-rule="evenodd"/></svg>`
  },
  {
    id: "core-os",
    name: "CoreOS",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 42 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m15.2286 4.99951c-3.2154 0-6.18655 1.71539-7.79425 4.5l-5.7735 9.99999c-1.6076941 2.7846-1.607697 6.2154 0 9l5.7735 10c1.6077 2.7846 4.57885 4.5 7.79425 4.5h11.547c3.2154 0 6.1865-1.7154 7.7942-4.5l5.7735-10c1.6077-2.7846 1.6077-6.2154 0-9l-5.7735-9.99999c-1.6077-2.78461-4.5788-4.5-7.7942-4.5zm11.547 5.99999h-7.2169c-1.1547 0-1.8762 1.2499-1.298 2.2494 1.784 3.0838 3.5722 6.1653 5.3536 9.2506.5359.9282.5359 2.0718 0 3-1.7814 3.0854-3.5696 6.1668-5.3536 9.2506-.5782.9995.1433 2.2494 1.298 2.2494h7.2169c1.0718 0 2.0622-.5718 2.5981-1.5l5.7735-10c.5359-.9282.5359-2.0718 0-3l-5.7735-10c-.5359-.9282-1.5263-1.5-2.5981-1.5z" fill="#155eef" fill-rule="evenodd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 42 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m15.2286 4.99951c-3.2154 0-6.18655 1.71539-7.79425 4.5l-5.7735 9.99999c-1.6076941 2.7846-1.607697 6.2154 0 9l5.7735 10c1.6077 2.7846 4.57885 4.5 7.79425 4.5h11.547c3.2154 0 6.1865-1.7154 7.7942-4.5l5.7735-10c1.6077-2.7846 1.6077-6.2154 0-9l-5.7735-9.99999c-1.6077-2.78461-4.5788-4.5-7.7942-4.5zm11.547 5.99999h-7.2169c-1.1547 0-1.8762 1.2499-1.298 2.2494 1.784 3.0838 3.5722 6.1653 5.3536 9.2506.5359.9282.5359 2.0718 0 3-1.7814 3.0854-3.5696 6.1668-5.3536 9.2506-.5782.9995.1433 2.2494 1.298 2.2494h7.2169c1.0718 0 2.0622-.5718 2.5981-1.5l5.7735-10c.5359-.9282.5359-2.0718 0-3l-5.7735-10c-.5359-.9282-1.5263-1.5-2.5981-1.5z" fill="#155eef" fill-rule="evenodd"/></svg>`
  },
  {
    id: "cubekit",
    name: "Cubekit",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m0 14.5264v18.9473l17.8947-12.2437v-18.94741z" fill="#155eef" opacity=".5"/><path d="m0 33.4737v-18.9474l17.8947 12.2438v18.9474z" fill="#1570ef" opacity=".5"/><path d="m40 14.5263v18.9474l-17.8947-12.2438v-18.94737z" fill="#155eef" opacity=".5"/><path d="m40 33.4737v-18.9474l-17.8947 12.2438v18.9474z" fill="#1570ef" opacity=".5"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m0 14.5264v18.9473l17.8947-12.2437v-18.94741z" opacity=".5"/><path d="m0 33.4737v-18.9474l17.8947 12.2438v18.9474z" opacity=".5"/><path d="m40 14.5263v18.9474l-17.8947-12.2438v-18.94737z" opacity=".5"/><path d="m40 33.4737v-18.9474l-17.8947 12.2438v18.9474z" opacity=".5"/></g></svg>`
  },
  {
    id: "europa",
    name: "Europa",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m28.6446 39.168c-.6032 1.3404-1.353 2.6531-2.2519 3.7888 7.4581-2.5137 12.9483-9.3054 13.5527-17.4568h-2.6549c-3.2399 0-5.8424 2.5861-6.369 5.7829-.4855 2.9468-1.2621 5.6301-2.2769 7.8851z"/><path d="m22.7724 25.5c3.3921 0 6.167 2.8299 5.5439 6.1643-1.3533 7.2424-4.5667 12.3357-8.3155 12.3357-4.7435 0-8.6299-8.1549-8.975-18.5z"/><path d="m30.9904 17.1502c.4961 3.2267 3.1106 5.8498 6.3752 5.8498h2.6107c-.4123-8.3729-5.9735-15.39183-13.5836-17.95683.8989 1.13575 1.6487 2.44843 2.2519 3.78878 1.0643 2.36505 1.8666 5.20115 2.3458 8.31825z"/><path d="m28.4165 16.8957c.5674 3.3176-2.1954 6.1043-5.5612 6.1043h-11.8434c.2344-10.5811 4.1693-19 8.9889-19 3.8447 0 7.1263 5.35721 8.4157 12.8957z"/><path d="m8.51131 23c.11359-5.4083 1.14536-10.3894 2.84579-14.16805.6031-1.34035 1.3529-2.65303 2.2519-3.78878-7.61011 2.565-13.171316 9.58393-13.5836094 17.95683z"/><path d="m.0562286 25.5c.6043994 8.1514 6.0946514 14.9431 13.5527714 17.4568-.899-1.1357-1.6488-2.4484-2.2519-3.7888-1.6479-3.6619-2.66781-8.4531-2.83264-13.668z"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m28.6446 39.168c-.6032 1.3404-1.353 2.6531-2.2519 3.7888 7.4581-2.5137 12.9483-9.3054 13.5527-17.4568h-2.6549c-3.2399 0-5.8424 2.5861-6.369 5.7829-.4855 2.9468-1.2621 5.6301-2.2769 7.8851z"/><path d="m22.7724 25.5c3.3921 0 6.167 2.8299 5.5439 6.1643-1.3533 7.2424-4.5667 12.3357-8.3155 12.3357-4.7435 0-8.6299-8.1549-8.975-18.5z"/><path d="m30.9904 17.1502c.4961 3.2267 3.1106 5.8498 6.3752 5.8498h2.6107c-.4123-8.3729-5.9735-15.39183-13.5836-17.95683.8989 1.13575 1.6487 2.44843 2.2519 3.78878 1.0643 2.36505 1.8666 5.20115 2.3458 8.31825z"/><path d="m28.4165 16.8957c.5674 3.3176-2.1954 6.1043-5.5612 6.1043h-11.8434c.2344-10.5811 4.1693-19 8.9889-19 3.8447 0 7.1263 5.35721 8.4157 12.8957z"/><path d="m8.51131 23c.11359-5.4083 1.14536-10.3894 2.84579-14.16805.6031-1.34035 1.3529-2.65303 2.2519-3.78878-7.61011 2.565-13.171316 9.58393-13.5836094 17.95683z"/><path d="m.0562286 25.5c.6043994 8.1514 6.0946514 14.9431 13.5527714 17.4568-.899-1.1357-1.6488-2.4484-2.2519-3.7888-1.6479-3.6619-2.66781-8.4531-2.83264-13.668z"/></g></svg>`
  },
  {
    id: "feather-dev",
    name: "FeatherDev",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 44 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m36.3068 11.4224c-.4322-.4323-.8644-.8645-1.2967-1.2967-1.2966-1.38311-2.6797-2.76621-4.4086-3.63065-1.9882-1.03733-4.1493-.778-6.3104-.778-3.2849 0-11.4971 0-16.33798 0l3.28488 4.40865h19.6228c1.8153 0 3.3713.3458 4.8409 1.2967.2593.0864.5186.0864.6051 0z" fill="#53b1fd"/><path d="m39.9368 18.511c-.4322-.4322-.8645-.8645-1.2967-1.2967-1.2967-1.3831-2.6797-2.7662-4.4086-3.6306-1.9882-1.0374-4.1494-.778-6.3105-.778-2.8526 0-9.6817 0-14.5226 0l3.2849 4.4086h17.8939c1.8154 0 3.3714.3458 4.8409 1.2967.1729.0864.3458.0864.5187 0z" fill="#2e90fa"/><path d="m44 25.4263c-.4322-.4323-.8645-.8645-1.2967-1.2967-1.2966-1.3831-2.6797-2.7662-4.4086-3.6307-1.9882-1.0373-4.1493-.7779-6.3104-.7779-2.6798 0-8.558 0-13.3124 0l3.2848 4.4086h16.5973c1.8153 0 3.3713.3458 4.8409 1.2967.2593.0864.4322.1729.6051 0z" fill="#1570ef"/><path d="m7.60742 37.0961c.43222.4322.86444.8644 1.29666 1.2966 1.29662 1.3831 2.67972 2.7662 4.40862 3.6307 1.9882 1.0373 4.1493.778 6.3104.778h16.338l-3.2849-4.4087c-5.9646 0-15.3006 0-19.6228 0-1.8153 0-3.37132-.3457-4.84087-1.2966-.25933-.0865-.43222-.0865-.60511 0z" fill="#53b1fd"/><path d="m3.97656 30.0079c.43222.4323.86444.8645 1.29666 1.2967 1.29667 1.3831 2.67976 2.7662 4.40864 3.6307 1.98824 1.0373 4.14934.778 6.31044.778h14.5226l-3.2849-4.4087c-5.8782 0-13.9175 0-17.89391 0-1.81532 0-3.37132-.3458-4.84087-1.2967-.17289-.0864-.34577-.0864-.51866 0z" fill="#2e90fa"/><path d="m0 23.0058c.43222.4322.864441.8644 1.29666 1.2966 1.29666 1.3831 2.67977 2.7662 4.40866 3.6307 1.98821 1.0373 4.1493.778 6.31038.778h13.3124l-3.2849-4.4087c-5.7053 0-12.96657 0-16.59722 0-1.81533 0-3.37132-.3458-4.840874-1.2966-.259332-.0865-.432218-.0865-.605106 0z" fill="#1570ef"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 44 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m36.3068 11.4224c-.4322-.4323-.8644-.8645-1.2967-1.2967-1.2966-1.38311-2.6797-2.76621-4.4086-3.63065-1.9882-1.03733-4.1493-.778-6.3104-.778-3.2849 0-11.4971 0-16.33798 0l3.28488 4.40865h19.6228c1.8153 0 3.3713.3458 4.8409 1.2967.2593.0864.5186.0864.6051 0z" opacity=".5"/><path d="m39.9368 18.511c-.4322-.4322-.8645-.8645-1.2967-1.2967-1.2967-1.3831-2.6797-2.7662-4.4086-3.6306-1.9882-1.0374-4.1494-.778-6.3105-.778-2.8526 0-9.6817 0-14.5226 0l3.2849 4.4086h17.8939c1.8154 0 3.3714.3458 4.8409 1.2967.1729.0864.3458.0864.5187 0z" opacity=".7"/><path d="m44 25.4263c-.4322-.4323-.8645-.8645-1.2967-1.2967-1.2966-1.3831-2.6797-2.7662-4.4086-3.6307-1.9882-1.0373-4.1493-.7779-6.3104-.7779-2.6798 0-8.558 0-13.3124 0l3.2848 4.4086h16.5973c1.8153 0 3.3713.3458 4.8409 1.2967.2593.0864.4322.1729.6051 0z"/><path d="m7.60742 37.0961c.43222.4322.86444.8644 1.29666 1.2966 1.29662 1.3832 2.67972 2.7662 4.40862 3.6307 1.9882 1.0373 4.1493.778 6.3104.778h16.338l-3.2849-4.4087c-5.9646 0-15.3006 0-19.6228 0-1.8153 0-3.37132-.3457-4.84087-1.2966-.25933-.0865-.43222-.0865-.60511 0z" opacity=".5"/><path d="m3.97656 30.0079c.43222.4323.86444.8645 1.29666 1.2967 1.29667 1.3831 2.67976 2.7662 4.40864 3.6307 1.98824 1.0373 4.14934.778 6.31044.778h14.5226l-3.2849-4.4087c-5.8782 0-13.9175 0-17.89391 0-1.81532 0-3.37132-.3458-4.84087-1.2967-.17289-.0864-.34577-.0864-.51866 0z" opacity=".7"/><path d="m0 23.0058c.43222.4322.864441.8644 1.29666 1.2966 1.29666 1.3831 2.67977 2.7662 4.40866 3.6307 1.98821 1.0373 4.1493.778 6.31038.778h13.3124l-3.2849-4.4087c-5.7053 0-12.96657 0-16.59722 0-1.81533 0-3.37132-.3458-4.840874-1.2966-.259332-.0865-.432218-.0865-.605106 0z"/></g></svg>`
  },
  {
    id: "flora-fauna",
    name: "Flora&Fauna",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m13.7146 4c-2.2564 0-4.4203.89634-6.01579 2.49183l-7.69881 7.69877v3.524c0 2.4897 1.06944 4.7296 2.77401 6.2854-1.70457 1.5558-2.77401 3.7957-2.77401 6.2854v3.524l7.69881 7.6988c1.59549 1.5955 3.75939 2.4918 6.01579 2.4918 2.4897 0 4.7296-1.0694 6.2854-2.774 1.5558 1.7046 3.7957 2.774 6.2854 2.774 2.2564 0 4.4203-.8963 6.0158-2.4918l7.6988-7.6988v-3.524c0-2.4897-1.0694-4.7296-2.774-6.2854 1.7046-1.5558 2.774-3.7957 2.774-6.2854v-3.524l-7.6988-7.69877c-1.5955-1.59549-3.7594-2.49183-6.0158-2.49183-2.4897 0-4.7296 1.06944-6.2854 2.77401-1.5558-1.70457-3.7957-2.77401-6.2854-2.77401zm12.0442 20c-.0959-.0875-.19-.1774-.2822-.2696l-5.4766-5.4766-5.4766 5.4766c-.0922.0922-.1863.1821-.2822.2696.0959.0875.19.1774.2822.2696l5.4766 5.4766 5.4766-5.4766c.0922-.0922.1863-.1821.2822-.2696zm-3.5366 9.8094v1.683c0 2.244 1.8192 4.0632 4.0632 4.0632 1.0776 0 2.1111-.4281 2.8731-1.1901l6.3971-6.3971v-1.683c0-2.244-1.8192-4.0632-4.0632-4.0632-1.0776 0-2.1111.4281-2.8731 1.1901zm-4.4444 0-6.3971-6.3971c-.762-.762-1.79546-1.1901-2.87308-1.1901-2.24403 0-4.06318 1.8192-4.06318 4.0632v1.683l6.39706 6.3971c.762.762 1.7955 1.1901 2.8731 1.1901 2.244 0 4.0632-1.8192 4.0632-4.0632zm0-21.3018v1.683l-6.3971 6.3971c-.762.762-1.79546 1.1901-2.87308 1.1901-2.24403 0-4.06318-1.8192-4.06318-4.0632v-1.683l6.39706-6.39708c.762-.76199 1.7955-1.19007 2.8731-1.19007 2.244 0 4.0632 1.81915 4.0632 4.06315zm10.8415 8.0801-6.3971-6.3971v-1.683c0-2.244 1.8192-4.06315 4.0632-4.06315 1.0776 0 2.1111.42808 2.8731 1.19007l6.3971 6.39708v1.683c0 2.244-1.8192 4.0632-4.0632 4.0632-1.0776 0-2.1111-.4281-2.8731-1.1901z" fill="#155eef" fill-rule="evenodd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m13.7146 4c-2.2564 0-4.4203.89634-6.01579 2.49183l-7.69881 7.69877v3.524c0 2.4897 1.06944 4.7296 2.77401 6.2854-1.70457 1.5558-2.77401 3.7957-2.77401 6.2854v3.524l7.69881 7.6988c1.59549 1.5955 3.75939 2.4918 6.01579 2.4918 2.4897 0 4.7296-1.0694 6.2854-2.774 1.5558 1.7046 3.7957 2.774 6.2854 2.774 2.2564 0 4.4203-.8963 6.0158-2.4918l7.6988-7.6988v-3.524c0-2.4897-1.0694-4.7296-2.774-6.2854 1.7046-1.5558 2.774-3.7957 2.774-6.2854v-3.524l-7.6988-7.69877c-1.5955-1.59549-3.7594-2.49183-6.0158-2.49183-2.4897 0-4.7296 1.06944-6.2854 2.77401-1.5558-1.70457-3.7957-2.77401-6.2854-2.77401zm12.0442 20c-.0959-.0875-.19-.1774-.2822-.2696l-5.4766-5.4766-5.4766 5.4766c-.0922.0922-.1863.1821-.2822.2696.0959.0875.19.1774.2822.2696l5.4766 5.4766 5.4766-5.4766c.0922-.0922.1863-.1821.2822-.2696zm-3.5366 9.8094v1.683c0 2.244 1.8192 4.0632 4.0632 4.0632 1.0776 0 2.1111-.4281 2.8731-1.1901l6.3971-6.3971v-1.683c0-2.244-1.8192-4.0632-4.0632-4.0632-1.0776 0-2.1111.4281-2.8731 1.1901zm-4.4444 0-6.3971-6.3971c-.762-.762-1.79546-1.1901-2.87308-1.1901-2.24403 0-4.06318 1.8192-4.06318 4.0632v1.683l6.39706 6.3971c.762.762 1.7955 1.1901 2.8731 1.1901 2.244 0 4.0632-1.8192 4.0632-4.0632zm0-21.3018v1.683l-6.3971 6.3971c-.762.762-1.79546 1.1901-2.87308 1.1901-2.24403 0-4.06318-1.8192-4.06318-4.0632v-1.683l6.39706-6.39708c.762-.76199 1.7955-1.19007 2.8731-1.19007 2.244 0 4.0632 1.81915 4.0632 4.06315zm10.8415 8.0801-6.3971-6.3971v-1.683c0-2.244 1.8192-4.06315 4.0632-4.06315 1.0776 0 2.1111.42808 2.8731 1.19007l6.3971 6.39708v1.683c0 2.244-1.8192 4.0632-4.0632 4.0632-1.0776 0-2.1111-.4281-2.8731-1.1901z" fill="#fff" fill-rule="evenodd"/></svg>`
  },
  {
    id: "focal-point",
    name: "FocalPoint",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m10.7788 6.1817 4.6901 17.5036v-19.24382c.3719-.08679.7478-.16322 1.1273-.22897v19.47459l5.2752-19.6871c.3801.03442.7572.07945 1.1309.13479l-5.3176 19.84571 10.5701-18.30794c.3443.15492.6835.31927 1.0172.49274l-10.6095 18.3763 15.1464-15.1465c.2731.25824.5389.52407.7971.7972l-15.1486 15.1487 18.3784-10.6108c.1734.3337.3377.6729.4926 1.0173l-18.3034 10.5675 19.8403-5.3162c.0553.3737.1003.7508.1347 1.1309l-19.6869 5.2751h19.4741c-.0658.3796-.1422.7554-.229 1.1273h-19.2481l17.507 4.691c-.1798.3443-.3693.6827-.5681 1.0149l-17.2257-4.6156 14.3874 8.3066c-.2723.2801-.5528.5522-.8411.8161l-14.1087-8.1457 10.6759 10.6758c-.3377.1973-.6817.385-1.0316.5628l-10.4426-10.4426 6.8421 11.8508c-.3746.1059-.7537.2012-1.1368.2855l-6.6825-11.5744 3.2219 12.0243c-.2872.0122-.5759.0184-.8661.0184-.0991 0-.198-.0007-.2967-.0022l-3.1483-11.7497v11.4569c-.3795-.0657-.7554-.1421-1.1273-.2289v-11.2261l-2.7759 10.36c-.3541-.1396-.7033-.289-1.0471-.4478l2.7337-10.2024-5.13175 8.8884c-.3177-.2034-.62928-.4156-.9344-.6361l5.09135-8.8186-7.1301 7.1302c-.2731-.2583-.53893-.5241-.79717-.7971l7.12787-7.1279-8.81599 5.0899c-.22059-.3051-.4328-.6167-.6363-.9344l8.89259-5.1341-10.20737 2.735c-.15888-.3438-.3083-.693-.44793-1.047l10.3599-2.776h-11.226124c-.086806-.3719-.163256-.7477-.22903-1.1273h11.452154l-11.74511583-3.1471c-.00145443-.0995-.00218417-.1991-.00218417-.2989 0-.2894.00613487-.5774.0182816-.8639l12.0258184 3.2224-11.57621-6.6836c.084291-.3832.179549-.7623.285427-1.1369l11.855683 6.8449-10.44698-10.447c.17774-.3499.36544-.6939.56273-1.0315l10.68025 10.6802-8.14896-14.1144c.26387-.2882.53605-.56863.81617-.84096l8.30809 14.38996-4.61634-17.22828c.33214-.1988.67064-.38826 1.01484-.56802z" fill="#155eef"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m10.7788 6.1817 4.6901 17.5036v-19.24382c.3719-.08679.7478-.16322 1.1273-.22897v19.47459l5.2752-19.6871c.3801.03442.7572.07945 1.1309.13479l-5.3176 19.84571 10.5701-18.30794c.3443.15492.6835.31927 1.0172.49274l-10.6095 18.3763 15.1464-15.1465c.2731.25824.5389.52407.7971.7972l-15.1486 15.1487 18.3784-10.6108c.1734.3337.3377.6729.4926 1.0173l-18.3034 10.5675 19.8403-5.3162c.0553.3737.1003.7508.1347 1.1309l-19.6869 5.2751h19.4741c-.0658.3796-.1422.7554-.229 1.1273h-19.2481l17.507 4.691c-.1798.3443-.3693.6827-.5681 1.0149l-17.2257-4.6156 14.3874 8.3066c-.2723.2801-.5528.5522-.8411.8161l-14.1087-8.1457 10.6759 10.6758c-.3377.1973-.6817.385-1.0316.5628l-10.4426-10.4426 6.8421 11.8508c-.3746.1059-.7537.2012-1.1368.2855l-6.6825-11.5744 3.2219 12.0243c-.2872.0122-.5759.0184-.8661.0184-.0991 0-.198-.0007-.2967-.0022l-3.1483-11.7497v11.4569c-.3795-.0657-.7554-.1421-1.1273-.2289v-11.2261l-2.7759 10.36c-.3541-.1396-.7033-.289-1.0471-.4478l2.7337-10.2024-5.13174 8.8884c-.31771-.2034-.62929-.4156-.93441-.6361l5.09135-8.8186-7.1301 7.1302c-.2731-.2583-.53893-.5241-.79717-.7971l7.12787-7.1279-8.81599 5.0899c-.22059-.3051-.4328-.6167-.6363-.9344l8.89259-5.1341-10.20737 2.735c-.15888-.3438-.3083-.693-.44793-1.047l10.3599-2.776h-11.226124c-.086806-.3719-.163256-.7477-.22903-1.1273h11.452154l-11.74511583-3.1471c-.00145443-.0995-.00218417-.1991-.00218417-.2989 0-.2894.00613486-.5774.0182816-.8639l12.0258184 3.2224-11.57621-6.6836c.084291-.3832.179549-.7623.285427-1.1369l11.855683 6.8449-10.44698-10.447c.17774-.3499.36544-.6939.56273-1.0315l10.68025 10.6802-8.14896-14.1144c.26387-.2882.53605-.56863.81617-.84096l8.30809 14.38996-4.61634-17.22828c.33214-.1988.67064-.38826 1.01484-.56802z" fill="#fff"/></svg>`
  },
  {
    id: "foresight",
    name: "Foresight",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 31 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#444ce7"><path d="m-.00195312 17.8433 30.90545312-17.8433-.8189 12.6994-26.32058 15.1961z"/><path d="m3.76367 27.8951 21.73573-12.5492-.8189 12.6994-17.15086 9.902z" opacity=".5"/><path d="m7.52734 37.9477 12.56596-7.255-.8189 12.6994-7.9811 4.6079z" opacity=".25"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 31 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m-.00195312 17.8433 30.90545312-17.8433-.8189 12.6994-26.32058 15.1961z"/><path d="m3.76367 27.8951 21.73573-12.5492-.8189 12.6994-17.15086 9.902z" opacity=".5"/><path d="m7.52734 37.9477 12.56596-7.255-.8189 12.6994-7.9811 4.6079z" opacity=".25"/></g></svg>`
  },
  {
    id: "galileo",
    name: "Galileo",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m29.5411 6.41772c2.6913 5.27688 4.209 11.25228 4.209 17.58218s-1.5177 12.3054-4.2091 17.5823c6.2304-3.3881 10.4593-9.9914 10.4593-17.5823s-4.2289-14.19404-10.4592-17.58218z" fill="#6172f3"/><path d="m20.5481 5.99826c-.9047-1.28153-2.4457-1.9717-3.9913-1.70349-9.40496 1.63214-16.5568 9.83343-16.5568 19.70503 0 9.8717 7.1518 18.0729 16.5567 19.7051 1.5456.2682 3.0867-.4219 3.9913-1.7035 3.5923-5.0889 5.7025-11.2988 5.7025-18.0016 0-6.7027-2.1101-12.9126-5.7024-18.00154z" fill="#444ce7"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m29.5411 6.41772c2.6913 5.27688 4.209 11.25228 4.209 17.58218s-1.5177 12.3054-4.2091 17.5823c6.2304-3.3881 10.4593-9.9914 10.4593-17.5823s-4.2289-14.19404-10.4592-17.58218z" opacity=".7"/><path d="m20.5481 5.99826c-.9047-1.28153-2.4457-1.9717-3.9913-1.70349-9.40496 1.63214-16.5568 9.83343-16.5568 19.70503 0 9.8717 7.1518 18.0729 16.5567 19.7051 1.5456.2682 3.0867-.4219 3.9913-1.7035 3.5923-5.0889 5.7025-11.2988 5.7025-18.0016 0-6.7027-2.1101-12.9126-5.7024-18.00154z"/></g></svg>`
  },
  {
    id: "global-bank",
    name: "GlobalBank",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m27.6627 4h-15.3253l-12.3374 12.3373v15.3253l12.3374 12.3374h15.3253l12.3373-12.3374v-15.3253zm-13.2049 27.8554-7.90357-7.9036 7.90357-7.9036c2.988-2.988 7.9037-2.988 10.8916 0l7.9036 7.9036-7.9036 7.9036c-2.9879 2.988-7.8072 2.988-10.8916 0z" fill="#444ce7"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m27.6627 4h-15.3253l-12.3374 12.3373v15.3253l12.3374 12.3374h15.3253l12.3373-12.3374v-15.3253zm-13.2049 27.8554-7.90357-7.9036 7.90357-7.9036c2.988-2.988 7.9037-2.988 10.8916 0l7.9036 7.9036-7.9036 7.9036c-2.9879 2.988-7.8072 2.988-10.8916 0z" fill="#fff"/></svg>`
  },
  {
    id: "hexsmith",
    name: "Hexsmith",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m9.72461 41.7983h18.49589c1.2717 0 2.4469-.6785 3.0827-1.7798l4.1102-7.1191h-20.5481z" opacity=".7"/><path d="m25.1445 15.1015h-20.55661l4.11021-7.11909c.63585-1.10133 1.811-1.77977 3.0827-1.77977h18.4959z" opacity=".4"/><path d="m39.5272 25.7801c.6358-1.1014.6358-2.4582 0-3.5596l-4.1102-7.1191-5.1378 8.8989h-20.55068l5.13718 8.8989h20.5481l.0016-.0027.0016.0027z" opacity=".4"/><path d="m14.8634 32.8992-5.13775-8.8988-5.13776 8.8988 5.13776 8.8989z"/><path d="m25.1445 15.1014h-20.55593l-4.108166 7.1192c-.635516 1.1013-.635318 2.458.000521 3.5591l4.111125 7.1195 5.13775-8.8989h20.55l.0013-.0021z" opacity=".7"/><path d="m35.4181 15.1015-5.1378-8.89886-5.1377 8.89886 5.1377 8.8989z"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m9.72461 41.7983h18.49589c1.2717 0 2.4469-.6785 3.0827-1.7798l4.1102-7.1191h-20.5481z" opacity=".7"/><path d="m25.1445 15.1015h-20.55661l4.11021-7.11909c.63585-1.10133 1.811-1.77977 3.0827-1.77977h18.4959z" opacity=".4"/><path d="m39.5272 25.7801c.6358-1.1013.6358-2.4582 0-3.5596l-4.1102-7.1191-5.1378 8.8989h-20.55068l5.13718 8.8989h20.5481l.0016-.0027.0016.0027z" opacity=".4"/><path d="m14.8634 32.8992-5.13775-8.8988-5.13776 8.8988 5.13776 8.8989z"/><path d="m25.1445 15.1014h-20.55593l-4.108166 7.1192c-.635516 1.1013-.635318 2.458.000521 3.5591l4.111125 7.1195 5.13775-8.8989h20.55l.0013-.0022z" opacity=".7"/><path d="m35.4181 15.1015-5.1378-8.89886-5.1377 8.89886 5.1377 8.8989z"/></g></svg>`
  },
  {
    id: "hourglass",
    name: "Hourglass",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 30 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m0 41.2222c0 1.5341 1.24365 2.7778 2.77778 2.7778h24.44442c1.5341 0 2.7778-1.2437 2.7778-2.7778v-7.2222c0-8.2843-6.7157-15-15-15-8.28427 0-15 6.7157-15 15z" fill="#1570ef"/><path d="m0 6.77778c0-1.53413 1.24365-2.77778 2.77778-2.77778h24.44442c1.5341 0 2.7778 1.24365 2.7778 2.77778v7.22222c0 8.2843-6.7157 15-15 15-8.28427 0-15-6.7157-15-15z" fill="#53b1fd" opacity=".5"/></svg>`,
    darkSvg: `<svg width="100%" height="100%" viewBox="0 0 30 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path opacity="0.7" d="M0 41.2222C0 42.7563 1.24365 44 2.77778 44H27.2222C28.7563 44 30 42.7563 30 41.2222V34C30 25.7157 23.2843 19 15 19C6.71573 19 0 25.7157 0 34V41.2222Z" fill="white"/><path opacity="0.7" d="M0 6.77778C0 5.24365 1.24365 4 2.77778 4H27.2222C28.7563 4 30 5.24365 30 6.77778V14C30 22.2843 23.2843 29 15 29C6.71573 29 0 22.2843 0 14V6.77778Z" fill="white"/></svg>`
  },
  {
    id: "kintsugi",
    name: "Kintsugi",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m20 4 4.2861 9.6525 9.856-3.79464-3.7946 9.85604 9.6525 4.2861-9.6525 4.2861 3.7946 9.856-9.856-3.7946-4.2861 9.6525-4.2861-9.6525-9.85604 3.7946 3.79469-9.856-9.65255-4.2861 9.65255-4.2861-3.79469-9.85604 9.85604 3.79464z" fill="#155eef"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m20 4 4.2861 9.6525 9.856-3.79464-3.7946 9.85604 9.6525 4.2861-9.6525 4.2861 3.7946 9.856-9.856-3.7946-4.2861 9.6525-4.2861-9.6525-9.85604 3.7946 3.79469-9.856-9.65255-4.2861 9.65255-4.2861-3.79469-9.85604 9.85604 3.79464z" fill="#155eef"/></svg>`
  },
  {
    id: "layers",
    name: "Layers",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m5.03741 15.4637c.7506-2.8008 3.62961-5.67985 6.43049-6.43044l17.4617-4.67957c2.8009-.7506 4.4629.91146 3.7123 3.71231l-4.6795 17.4617c-.7506 2.8009-3.6297 5.6799-6.4305 6.4305l-17.46175 4.6796c-2.80085.7505-4.462904-.9115-3.712306-3.7124z" opacity=".7"/><path d="m12.0355 22.4642c.7506-2.8008 3.6296-5.6799 6.4304-6.4305l17.4617-4.6795c2.8009-.7506 4.4629.9114 3.7123 3.7123l-4.6795 17.4617c-.7506 2.8009-3.6296 5.6799-6.4305 6.4305l-17.4617 4.6795c-2.80085.7506-4.46291-.9114-3.71231-3.7123z" opacity=".7"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m5.03741 15.4637c.7506-2.8008 3.62961-5.67985 6.43049-6.43044l17.4617-4.67957c2.8009-.7506 4.4629.91146 3.7123 3.71231l-4.6795 17.4617c-.7506 2.8009-3.6297 5.6799-6.4305 6.4305l-17.46175 4.6795c-2.80085.7506-4.462904-.9114-3.712306-3.7123z" opacity=".7"/><path d="m12.0355 22.4642c.7506-2.8008 3.6296-5.6799 6.4304-6.4305l17.4617-4.6795c2.8009-.7506 4.4629.9114 3.7123 3.7123l-4.6795 17.4617c-.7506 2.8009-3.6296 5.6799-6.4305 6.4305l-17.4617 4.6795c-2.80085.7506-4.46291-.9114-3.71231-3.7123z" opacity=".7"/></g></svg>`
  },
  {
    id: "lightspeed",
    name: "Lightspeed",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 48 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m0 24c0 6.6274 5.37258 12 12 12v-12c0 6.6274 5.3726 12 12 12v-12c0 6.6274 5.3726 12 12 12s12-5.3726 12-12-5.3726-12-12-12-12 5.3726-12 12v-12c-6.6274 0-12 5.3726-12 12v-12c-6.62742 0-12 5.3726-12 12z" fill="#155eef"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 48 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m0 24c0 6.6274 5.37258 12 12 12v-12c0 6.6274 5.3726 12 12 12v-12c0 6.6274 5.3726 12 12 12s12-5.3726 12-12-5.3726-12-12-12-12 5.3726-12 12v-12c-6.6274 0-12 5.3726-12 12v-12c-6.62742 0-12 5.3726-12 12z" fill="#155eef"/></svg>`
  },
  {
    id: "luminescence",
    name: "Luminescence",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m32.3008 36h-.1015c-.0261.0402-.0523.0804-.0787.1204-2.7604 1.8201-6.0668 2.8794-9.6206 2.8794-9.665 0-17.5-7.835-17.5-17.5 0-3.5538 1.05931-6.8602 2.87939-9.6206.04009-.0264.08029-.0527.12061-.0788v-.1017c-.04056.0599-.08077.1201-.12061.1805-4.7469 3.1299-7.87939 8.5094-7.87939 14.6206 0 9.665 7.83502 17.5 17.5 17.5 6.1112 0 11.4907-3.1325 14.6206-7.8794.0603-.0398.1204-.0799.1802-.1204z"/><g opacity=".5"><path d="m40.0003 21.5c0 6.1112-3.1325 11.4907-7.8794 14.6206 1.8201-2.7604 2.8794-6.0668 2.8794-9.6206 0-9.665-7.835-17.5-17.5-17.5-3.5538 0-6.8602 1.0593-9.6206 2.8794 3.1299-4.74691 8.5094-7.8794 14.6206-7.8794 9.665 0 17.5 7.835 17.5 17.5z"/><path d="m32.0003 36.1994c.0403-.0261.0805-.0524.1206-.0788-.0398.0604-.08.1206-.1206.1805z"/><path d="m7.80088 12c.02611-.0403.05238-.0805.07882-.1206-.06043.0398-.12059.08-.18048.1206z"/></g></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m32.3008 36h-.1015c-.0261.0402-.0523.0804-.0787.1204-2.7604 1.8201-6.0668 2.8794-9.6206 2.8794-9.665 0-17.5-7.835-17.5-17.5 0-3.5538 1.05931-6.8602 2.87939-9.6206.04009-.0264.08029-.0527.12061-.0788v-.1017c-.04056.0599-.08077.1201-.12061.1805-4.7469 3.1299-7.87939 8.5094-7.87939 14.6206 0 9.665 7.83502 17.5 17.5 17.5 6.1112 0 11.4907-3.1325 14.6206-7.8794.0603-.0398.1204-.0799.1802-.1204z"/><g opacity=".5"><path d="m40.0003 21.5c0 6.1112-3.1325 11.4907-7.8794 14.6206 1.8201-2.7604 2.8794-6.0668 2.8794-9.6206 0-9.665-7.835-17.5-17.5-17.5-3.5538 0-6.8602 1.0593-9.6206 2.8794 3.1299-4.74691 8.5094-7.8794 14.6206-7.8794 9.665 0 17.5 7.835 17.5 17.5z"/><path d="m32.0003 36.1994c.0403-.0261.0805-.0524.1206-.0788-.0398.0604-.08.1206-.1206.1805z"/><path d="m7.80088 12c.02611-.0403.05238-.0805.07882-.1206-.06043.0398-.12059.08-.18048.1206z"/></g></g></svg>`
  },
  {
    id: "luminous",
    name: "Luminous",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 42 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m14.1061 19.6565c5.499-2.6299 9.8025-7.0929 12.2731-12.67168-1.5939-1.67362-3.666-2.86907-5.8975-3.58634l-1.1954-.39848c-.0797.15939-.1594.39849-.1594.55788-1.9127 5.41936-5.8178 9.80262-11.07766 12.27322-3.66599 1.7533-6.37564 4.9412-7.650763 8.7666l-.398477 1.1955c.159391.0797.39848.1593.557871.1593 1.514209.5579 3.028419 1.2752 4.462939 2.1519 1.99238-3.5864 5.18019-6.6148 9.08529-8.4479z"/><path d="m37.2173 19.9753c-2.9487 4.463-7.0132 8.0494-12.034 10.4403-4.0645 1.9127-7.1726 5.499-8.6071 9.8026l-.3985 1.3549c1.5142 1.3548 3.3472 2.3909 5.3396 3.0284l1.1955.3985c.0796-.1594.1593-.3985.1593-.5579 1.9127-5.4193 5.8178-9.8026 11.0777-12.2732 3.666-1.7533 6.4553-4.9412 7.6507-8.7666l.3985-1.1954c-1.6736-.4782-3.2675-1.2752-4.7817-2.2316z" opacity=".6"/><path d="m12.9903 37.4284c1.9924-4.7818 5.6584-8.6869 10.3604-10.9184 4.3035-2.0721 7.8898-5.26 10.3604-9.1651-1.833-1.7533-3.3472-3.7458-4.463-6.1366-2.9487 5.4193-7.571 9.8026-13.2294 12.5123-3.2675 1.5142-5.8974 4.1442-7.49136 7.3321 1.75326 1.6736 3.18786 3.7457 4.30356 6.0569 0 0 .0797.1594.1594.3188z" opacity=".8"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 42 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m14.1061 19.6565c5.499-2.6299 9.8025-7.0929 12.2731-12.67168-1.5939-1.67362-3.666-2.86907-5.8975-3.58634l-1.1954-.39848c-.0797.15939-.1594.39849-.1594.55788-1.9127 5.41936-5.8178 9.80262-11.07766 12.27322-3.66599 1.7533-6.37564 4.9412-7.650763 8.7666l-.398477 1.1955c.159391.0797.39848.1593.557871.1593 1.514209.5579 3.028419 1.2752 4.462939 2.1519 1.99238-3.5864 5.18019-6.6148 9.08529-8.4479z"/><path d="m37.2173 19.9753c-2.9487 4.463-7.0132 8.0494-12.034 10.4403-4.0645 1.9127-7.1726 5.499-8.6071 9.8026l-.3985 1.3549c1.5142 1.3548 3.3472 2.3909 5.3396 3.0284l1.1955.3985c.0796-.1594.1593-.3985.1593-.5579 1.9127-5.4193 5.8178-9.8026 11.0777-12.2732 3.666-1.7533 6.4553-4.9412 7.6507-8.7666l.3985-1.1954c-1.6736-.4782-3.2675-1.2752-4.7817-2.2316z" opacity=".5"/><path d="m12.9903 37.4284c1.9924-4.7818 5.6584-8.6869 10.3604-10.9184 4.3035-2.0721 7.8898-5.26 10.3604-9.1651-1.833-1.7533-3.3472-3.7458-4.463-6.1366-2.9487 5.4193-7.571 9.8026-13.2294 12.5123-3.2675 1.5142-5.8974 4.1442-7.49136 7.3321 1.75326 1.6736 3.18786 3.7457 4.30356 6.0569 0 0 .0797.1594.1594.3188z" opacity=".7"/></g></svg>`
  },
  {
    id: "pollinate",
    name: "Pollinate",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 38 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m25.0008 24c0 3.3137-2.6863 6-6 6s-6-2.6863-6-6 2.6863-6 6-6 6 2.6863 6 6z"/><path d="m25.0008 10c0 3.3137-2.6863 6-6 6s-6-2.6863-6-6c0-3.31371 2.6863-6 6-6s6 2.68629 6 6z"/><path d="m37.125 31c0 3.3137-2.6863 6-6 6s-6-2.6863-6-6 2.6863-6 6-6 6 2.6863 6 6z"/><path d="m37.127 17.0002c0 3.3137-2.6863 6-6 6-3.3138 0-6-2.6863-6-6s2.6862-6 6-6c3.3137 0 6 2.6863 6 6z"/><path d="m25.0008 38c0 3.3137-2.6863 6-6 6s-6-2.6863-6-6 2.6863-6 6-6 6 2.6863 6 6z"/><path d="m12.877 17c0 3.3137-2.6863 6-6.00005 6-3.31371 0-5.999997-2.6863-5.999997-6s2.686287-6 5.999997-6c3.31375 0 6.00005 2.6863 6.00005 6z"/><path d="m12.875 30.9997c0 3.3137-2.6863 6-6 6-3.31371 0-6-2.6863-6-6s2.68629-6 6-6c3.3137 0 6 2.6863 6 6z"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 38 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m25.0008 24c0 3.3137-2.6863 6-6 6s-6-2.6863-6-6 2.6863-6 6-6 6 2.6863 6 6z"/><path d="m25.0008 10c0 3.3137-2.6863 6-6 6s-6-2.6863-6-6c0-3.31371 2.6863-6 6-6s6 2.68629 6 6z"/><path d="m37.125 31c0 3.3137-2.6863 6-6 6s-6-2.6863-6-6 2.6863-6 6-6 6 2.6863 6 6z"/><path d="m37.127 17.0002c0 3.3137-2.6863 6-6 6-3.3138 0-6-2.6863-6-6s2.6862-6 6-6c3.3137 0 6 2.6863 6 6z"/><path d="m25.0008 38c0 3.3137-2.6863 6-6 6s-6-2.6863-6-6 2.6863-6 6-6 6 2.6863 6 6z"/><path d="m12.877 17c0 3.3137-2.6863 6-6.00005 6-3.31371 0-5.999997-2.6863-5.999997-6s2.686287-6 5.999997-6c3.31375 0 6.00005 2.6863 6.00005 6z"/><path d="m12.875 30.9997c0 3.3137-2.6863 6-6 6-3.31371 0-6-2.6863-6-6s2.68629-6 6-6c3.3137 0 6 2.6863 6 6z"/></g></svg>`
  },
  {
    id: "polymath",
    name: "Polymath",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 38 48" width="100%" xmlns="http://www.w3.org/2000/svg"><circle cx="19" cy="24" r="16" stroke="#155eef" stroke-width="6"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 38 48" width="100%" xmlns="http://www.w3.org/2000/svg"><circle cx="19" cy="24" r="16" stroke="#fff" stroke-width="6"/></svg>`
  },
  {
    id: "prometheus",
    name: "Prometheus",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 44 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m10.4993 16.5h-7.29875c-1.76731 0-3.20055 1.4327-3.20055 3.2v2.8h11c2.7614 0 5-2.2386 5-5s2.2386-5 5-5h19c2.2091 0 4-1.7909 4-4v-3h-22.5c-3.0376 0-5.5 2.46243-5.5 5.5 0 3.0376-2.4631 5.5-5.5007 5.5z"/><path d="m10.4993 26.5h-7.29875c-1.76731 0-3.20055 1.4327-3.20055 3.2v2.8h11c2.7614 0 5-2.2386 5-5s2.2386-5 5-5h13c2.2091 0 4-1.7909 4-4v-3h-16.5c-3.0376 0-5.5 2.4624-5.5 5.5s-2.4631 5.5-5.5007 5.5z" opacity=".7"/><path d="m10.4993 36.5h-7.29875c-1.76731 0-3.20055 1.4327-3.20055 3.2v2.8h11c2.7614 0 5-2.2386 5-5s2.2386-5 5-5h7.8c1.7673 0 3.2-1.4327 3.2-3.2v-3.8h-10.5c-3.0376 0-5.5 2.4624-5.5 5.5s-2.4631 5.5-5.5007 5.5z" opacity=".5"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 44 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m10.4993 16.5h-7.29875c-1.76731 0-3.20055 1.4327-3.20055 3.2v2.8h11c2.7614 0 5-2.2386 5-5s2.2386-5 5-5h19c2.2091 0 4-1.7909 4-4v-3h-22.5c-3.0376 0-5.5 2.46243-5.5 5.5 0 3.0376-2.4631 5.5-5.5007 5.5z"/><path d="m10.4993 26.5h-7.29875c-1.76731 0-3.20055 1.4327-3.20055 3.2v2.8h11c2.7614 0 5-2.2386 5-5s2.2386-5 5-5h13c2.2091 0 4-1.7909 4-4v-3h-16.5c-3.0376 0-5.5 2.4624-5.5 5.5s-2.4631 5.5-5.5007 5.5z" opacity=".75"/><path d="m10.4993 36.5h-7.29875c-1.76731 0-3.20055 1.4327-3.20055 3.2v2.8h11c2.7614 0 5-2.2386 5-5s2.2386-5 5-5h7.8c1.7673 0 3.2-1.4327 3.2-3.2v-3.8h-10.5c-3.0376 0-5.5 2.4624-5.5 5.5s-2.4631 5.5-5.5007 5.5z" opacity=".5"/></g></svg>`
  },
  {
    id: "quantum",
    name: "Quantum",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 39 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m9 23c0-5.5228 4.4772-10 10-10 5.5229 0 10 4.4772 10 10h9c0-10.4934-8.5066-19-19-19-10.49341 0-18.99999908 8.5066-19 19s8.50659 19 19 19v-9c-5.5228 0-10-4.4771-10-10z"/><path d="m29 23c0 5.5228 4.4772 10 10 10v9c-10.4934 0-19-8.5066-19-19z" opacity=".5"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 39 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m9 23c0-5.5228 4.4772-10 10-10 5.5229 0 10 4.4772 10 10h9c0-10.4934-8.5066-19-19-19-10.49341 0-18.99999908 8.5066-19 19s8.50659 19 19 19v-9c-5.5228 0-10-4.4771-10-10z"/><path d="m29 23c0 5.5228 4.4772 10 10 10v9c-10.4934 0-19-8.5066-19-19z" opacity=".5"/></g></svg>`
  },
  {
    id: "quartz-ai",
    name: "QuartzAI",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 44 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m17.6264 6.5h14.8017l11.4661 18.6661-15.7786 15.9489-22.68835-4.0459-5.157719-19.2098zm.5273 4.9692-6.816 15.105 6.4504 5.3411 8.8246-3.7975zm12.3276 15.3 9.2139-2.7073-7.1983-11.7184zm-.6163-17.2692h-9.3468l7.3309 14.4284zm6.9795 18.5263-6.779 1.9919-.5448 5.4109zm-10.5005 9.008.5824-5.7856-6.0573 2.6067zm-6.8394-.5022-10.91261-1.9459 1.64741-5.0264 6.438 5.3308zm-11.69782-9.1824-2.7037-3.0571 1.66868 6.215zm-3.53432-8.5248 4.81433 5.4437 5.50351-12.1963z" fill="#155eef" fill-rule="evenodd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 44 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m17.6264 6.5h14.8017l11.4661 18.6661-15.7786 15.9489-22.68835-4.0459-5.157719-19.2098zm.5273 4.9692-6.816 15.105 6.4504 5.3411 8.8246-3.7975zm12.3276 15.3 9.2139-2.7073-7.1983-11.7184zm-.6163-17.2692h-9.3468l7.3309 14.4284zm6.9795 18.5263-6.779 1.9919-.5448 5.4109zm-10.5005 9.008.5824-5.7856-6.0573 2.6067zm-6.8394-.5022-10.91261-1.9459 1.64741-5.0264 6.438 5.3308zm-11.69782-9.1824-2.7037-3.0571 1.66868 6.215zm-3.53432-8.5248 4.81433 5.4437 5.50351-12.1963z" fill="#fff" fill-rule="evenodd"/></svg>`
  },
  {
    id: "radius",
    name: "Radius",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g clip-rule="evenodd" fill="#155eef" fill-rule="evenodd"><path d="m18.5 19v-15h3v15z"/><path d="m18.5 44v-15h3v15z"/><path d="m22.4754 19.404 10.6066-10.60664 2.1214 2.12134-8.4853 8.4853z"/><path d="m4.79776 37.0816 10.60664-10.6066 2.1213 2.1214-10.60662 10.6066z"/><path d="m26.7178 28.5963 8.4853 8.4852-2.1213 2.1214-10.6066-10.6066z"/><path d="m6.91885 8.79727 10.60665 10.60663-2.1214 2.1213-10.60657-10.6066z"/><path d="m18.5 22.5h21.5v3h-21.5z"/><path d="m.00000026 22.5h14.99999974v3h-15z"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 40 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g clip-rule="evenodd" fill="#155eef" fill-rule="evenodd"><path d="m18.5 19v-15h3v15z"/><path d="m18.5 44v-15h3v15z"/><path d="m22.4754 19.404 10.6066-10.60664 2.1214 2.12134-8.4853 8.4853z"/><path d="m4.79776 37.0816 10.60664-10.6066 2.1213 2.1214-10.60662 10.6066z"/><path d="m26.7178 28.5963 8.4853 8.4852-2.1213 2.1214-10.6066-10.6066z"/><path d="m6.91885 8.79727 10.60665 10.60663-2.1214 2.1213-10.60657-10.6066z"/><path d="m18.5 22.5h21.5v3h-21.5z"/><path d="m.00000026 22.5h14.99999974v3h-15z"/></g></svg>`
  },
  {
    id: "railspeed",
    name: "Railspeed",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 36 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m0 7.5h28.8c2.5202 0 3.7804 0 4.743.49047.8467.43143 1.5351 1.11984 1.9665 1.96657.4905.96256.4905 2.22276.4905 4.74296v1.8h-28.8c-2.52024 0-3.78035 0-4.74296-.4905-.84673-.4314-1.535139-1.1198-1.966569-1.9665-.490471-.9626-.490471-2.2228-.490471-4.743z"/><path d="m0 28.5h28.8c2.5202 0 3.7804 0 4.743-.4905.8467-.4314 1.5351-1.1198 1.9665-1.9665.4905-.9626.4905-2.2228.4905-4.743v-1.8h-28.8c-2.52024 0-3.78035 0-4.74296.4905-.84673.4314-1.535139 1.1198-1.966569 1.9665-.490471.9626-.490471 2.2228-.490471 4.743z"/><path d="m14 31.5h14.8c2.5202 0 3.7804 0 4.743.4905.8467.4314 1.5351 1.1198 1.9665 1.9665.4905.9626.4905 2.2228.4905 4.743v1.8h-14.8c-2.5202 0-3.7804 0-4.743-.4905-.8467-.4314-1.5351-1.1198-1.9665-1.9665-.4905-.9626-.4905-2.2228-.4905-4.743z"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 36 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m0 7.5h28.8c2.5202 0 3.7804 0 4.743.49047.8467.43143 1.5351 1.11984 1.9665 1.96657.4905.96256.4905 2.22276.4905 4.74296v1.8h-28.8c-2.52024 0-3.78035 0-4.74296-.4905-.84673-.4314-1.535139-1.1198-1.966569-1.9665-.490471-.9626-.490471-2.2228-.490471-4.743z"/><path d="m0 28.5h28.8c2.5202 0 3.7804 0 4.743-.4905.8467-.4314 1.5351-1.1198 1.9665-1.9665.4905-.9626.4905-2.2228.4905-4.743v-1.8h-28.8c-2.52024 0-3.78035 0-4.74296.4905-.84673.4314-1.535139 1.1198-1.966569 1.9665-.490471.9626-.490471 2.2228-.490471 4.743z"/><path d="m14 31.5h14.8c2.5202 0 3.7804 0 4.743.4905.8467.4314 1.5351 1.1198 1.9665 1.9665.4905.9626.4905 2.2228.4905 4.743v1.8h-14.8c-2.5202 0-3.7804 0-4.743-.4905-.8467-.4314-1.5351-1.1198-1.9665-1.9665-.4905-.9626-.4905-2.2228-.4905-4.743z"/></g></svg>`
  },
  {
    id: "refractional",
    name: "Refractional",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 48 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path d="m48 11h-17.0775c-1.2151 0-2.3644.5524-3.1235 1.5012l-1.598 1.9976c-.7591.9488-1.9084 1.5012-3.1235 1.5012h-15.0775l-4 5h17.0775c1.2151 0 2.3644-.5524 3.1235-1.5012l1.598-1.9976c.7591-.9488 1.9084-1.5012 3.1235-1.5012h15.0775z" fill="#444ce7"/><path d="m46 19h-17.0775c-1.2151 0-2.3644.5524-3.1235 1.5012l-1.598 1.9976c-.7591.9488-1.9084 1.5012-3.1235 1.5012h-15.0775l-4 5h17.0775c1.2151 0 2.3644-.5524 3.1235-1.5012l1.598-1.9976c.7591-.9488 1.9084-1.5012 3.1235-1.5012h15.0775z" fill="#155eef"/><path d="m44 27h-17.0775c-1.2151 0-2.3644.5524-3.1235 1.5012l-1.598 1.9976c-.7591.9488-1.9084 1.5012-3.1235 1.5012h-15.0775l-4 5h17.0775c1.2151 0 2.3644-.5524 3.1235-1.5012l1.598-1.9976c.7591-.9488 1.9084-1.5012 3.1235-1.5012h15.0775z" fill="#8098f9"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 48 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#fff"><path d="m48 11h-17.0775c-1.2151 0-2.3644.5524-3.1235 1.5012l-1.598 1.9976c-.7591.9488-1.9084 1.5012-3.1235 1.5012h-15.0775l-4 5h17.0775c1.2151 0 2.3644-.5524 3.1235-1.5012l1.598-1.9976c.7591-.9488 1.9084-1.5012 3.1235-1.5012h15.0775z"/><path d="m46 19h-17.0775c-1.2151 0-2.3644.5524-3.1235 1.5012l-1.598 1.9976c-.7591.9488-1.9084 1.5012-3.1235 1.5012h-15.0775l-4 5h17.0775c1.2151 0 2.3644-.5524 3.1235-1.5012l1.598-1.9976c.7591-.9488 1.9084-1.5012 3.1235-1.5012h15.0775z"/><path d="m44 27h-17.0775c-1.2151 0-2.3644.5524-3.1235 1.5012l-1.598 1.9976c-.7591.9488-1.9084 1.5012-3.1235 1.5012h-15.0775l-4 5h17.0775c1.2151 0 2.3644-.5524 3.1235-1.5012l1.598-1.9976c.7591-.9488 1.9084-1.5012 3.1235-1.5012h15.0775z"/></g></svg>`
  },
  {
    id: "renaissance",
    name: "Renaissance",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 35 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m12.7018 5c1.841 0 3.4172 1.31967 3.7408 3.13199l.4648 2.60271c.3236 1.8123 1.8998 3.132 3.7408 3.132h3.1518c4.8969 0 8.8667 3.9697 8.8667 8.8666 0 2.9333-1.4244 5.5339-3.6191 7.1479.92.3126 1.6466.809 2.1799 1.461.549.7191.9411 1.7411 1.1764 3.028.0392.3406.0883.6718.1373 1.003s.098.6624.1372 1.003c.0408.3538.0709.6566.096.9083.0232.233.042.4223.0609.5679.0784 1.0598.1961 1.9303.3529 2.5738.1655.9048.4994 1.7867.9727 2.5738h-6.6982c-.3137-.6056-.5098-1.3248-.6666-2.1196-.1349-.6836-.2408-1.5352-.3676-2.5548-.0207-.1659-.0418-.3362-.0638-.5111l-.2353-1.7411c-.1961-1.3247-.4314-2.271-.6667-2.8766-.2745-.5677-.7058-.9841-1.2941-1.2112-.6274-.2271-1.5686-.3856-2.9019-.3856h-.3018c-1.841 0-3.4172-1.3197-3.7408-3.132l-.4648-2.6027c-.3236-1.8123-1.8998-3.132-3.7408-3.132h-5.68517v10.1334h-6.33333v-27.8667zm13.6315 17.7333c0 1.3992-1.1342 2.5334-2.5333 2.5334h-3.1518c-1.841 0-3.4172-1.3197-3.7408-3.132l-.4648-2.6027c-.3236-1.8123-1.8998-3.132-3.7408-3.132h-5.36847v-5.0667h5.68517c1.841 0 3.4172 1.3197 3.7408 3.132l.4647 2.6027c.3237 1.8123 1.8999 3.132 3.7409 3.132h2.8351c1.3991 0 2.5333 1.1342 2.5333 2.5333z" fill="#1849a9" fill-rule="evenodd"/></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 35 48" width="100%" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m12.7018 5c1.841 0 3.4172 1.31967 3.7408 3.13199l.4648 2.60271c.3236 1.8123 1.8998 3.132 3.7408 3.132h3.1518c4.8969 0 8.8667 3.9697 8.8667 8.8666 0 2.9333-1.4244 5.5339-3.6191 7.1479.92.3126 1.6466.809 2.1799 1.461.549.7191.9411 1.7411 1.1764 3.028.0392.3406.0883.6718.1373 1.003s.098.6624.1372 1.003c.0408.3538.0709.6566.096.9083.0232.233.042.4223.0609.5679.0784 1.0598.1961 1.9303.3529 2.5738.1655.9048.4994 1.7867.9727 2.5738h-6.6982c-.3137-.6056-.5098-1.3247-.6666-2.1196-.1349-.6836-.2408-1.5352-.3676-2.5548-.0207-.1659-.0418-.3362-.0638-.5111l-.2353-1.7411c-.1961-1.3247-.4314-2.271-.6667-2.8766-.2745-.5677-.7058-.9841-1.2941-1.2112-.6274-.2271-1.5686-.3856-2.9019-.3856h-.3018c-1.841 0-3.4172-1.3197-3.7408-3.132l-.4648-2.6027c-.3236-1.8123-1.8998-3.132-3.7408-3.132h-5.68517v10.1334h-6.33333v-27.8667zm13.6315 17.7333c0 1.3992-1.1342 2.5334-2.5333 2.5334h-3.1518c-1.841 0-3.4172-1.3197-3.7408-3.132l-.4648-2.6027c-.3236-1.8123-1.8998-3.132-3.7408-3.132h-5.36847v-5.0667h5.68517c1.841 0 3.4172 1.3197 3.7408 3.132l.4647 2.6027c.3237 1.8123 1.8999 3.132 3.7409 3.132h2.8351c1.3991 0 2.5333 1.1342 2.5333 2.5333z" fill="#fff" fill-rule="evenodd"/></svg>`
  },
  {
    id: "sisyphus",
    name: "Sisyphus",
    lightSvg: `<svg fill="none" height="100%" viewBox="0 0 32 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m.599609 19.2002h9.59998v9.59999h-9.59998z"/><path d="m31.4004 28.7998h9.6v9.59999h-9.6z" transform="matrix(-1 0 -0 -1 62.8008 57.5996)"/><path d="m10.1992 19.2001 11.6-9.6v9.6l-11.6 9.6z" opacity=".2"/><path d="m21.7988 28.7999-11.6 9.6v-9.6l11.6-9.6z" opacity=".5"/><path d="m.599609 19.2 21.199991-19.2v9.59999l-11.6 9.60001z" opacity=".6"/><path d="m31.4004 28.8-21.2 19.2v-9.6l11.6-9.6z" opacity=".7"/></g></svg>`,
    darkSvg: `<svg fill="none" height="100%" viewBox="0 0 32 48" width="100%" xmlns="http://www.w3.org/2000/svg"><g fill="#155eef"><path d="m.599609 19.2002h9.59998v9.59999h-9.59998z"/><path d="m31.4004 28.7998h9.6v9.59999h-9.6z" transform="matrix(-1 0 -0 -1 62.8008 57.5996)"/><path d="m10.1992 19.2001 11.6-9.6v9.6l-11.6 9.6z" opacity=".2"/><path d="m21.7988 28.7999-11.6 9.6v-9.6l11.6-9.6z" opacity=".5"/><path d="m.599609 19.2 21.199991-19.2v9.59999l-11.6 9.60001z" opacity=".6"/><path d="m31.4004 28.8-21.2 19.2v-9.6l11.6-9.6z" opacity=".7"/></g></svg>`
  },
  {
    id: "solaris-energy",
    name: "Solaris Energy",
    lightSvg: `<svg width="100%" height="100%" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 4V16.3604C20 19.087 16.6569 20.3998 14.8016 18.4017L7 10M40 24H27.6396C24.913 24 23.6002 20.6569 25.5983 18.8016L34 11M20 44V31.6396C20 28.913 23.3431 27.6002 25.1984 29.5983L33 38M0 24L12.3604 24C15.087 24 16.3998 27.3431 14.4017 29.1984L6 37" stroke="#175CD3" stroke-width="4"/></svg>`,
    darkSvg: `<svg width="100%" height="100%" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 4V16.3604C20 19.087 16.6569 20.3998 14.8016 18.4017L7 10M40 24H27.6396C24.913 24 23.6002 20.6569 25.5983 18.8016L34 11M20 44V31.6396C20 28.913 23.3431 27.6002 25.1984 29.5983L33 38M0 24L12.3604 24C15.087 24 16.3998 27.3431 14.4017 29.1984L6 37" stroke="white" stroke-width="4"/></svg>`
  }
];

// features/platform/store-settings/lib/store-logo.ts
var DEFAULT_STORE_LOGO_ICON = LOGO_ICONS.find((icon) => icon.id === "3portals").lightSvg;
var DEFAULT_LIBRARY_LOGO_COLOR = "266";
var DEFAULT_STORE_LOGO_COLOR = "0";
function normalizeStoreLogoColor(value) {
  const numeric = Number.parseFloat(String(value ?? DEFAULT_STORE_LOGO_COLOR));
  if (!Number.isFinite(numeric)) return DEFAULT_STORE_LOGO_COLOR;
  return String((numeric % 360 + 360) % 360);
}

// features/platform/store-settings/lib/theme.ts
var DEFAULT_STOREFRONT_ACCENT_HUE = 155;
var LOGO_LIBRARY_BASE_HUE = 249;
function normalizeStorefrontAccentHue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_STOREFRONT_ACCENT_HUE;
  const rounded = Math.round(numeric);
  return (rounded % 360 + 360) % 360;
}
function storefrontAccentHueFromLogoColor(logoColor) {
  return normalizeStorefrontAccentHue(LOGO_LIBRARY_BASE_HUE + Number(normalizeStoreLogoColor(logoColor)));
}

// features/keystone/utils/storeLogo.ts
var ALLOWED_ELEMENTS = /* @__PURE__ */ new Set([
  "svg",
  "g",
  "path",
  "defs",
  "lineargradient",
  "radialgradient",
  "stop",
  "clippath",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "title",
  "desc"
]);
var ALLOWED_ATTRIBUTES = /* @__PURE__ */ new Set([
  "xmlns",
  "fill",
  "fill-rule",
  "clip-rule",
  "height",
  "width",
  "viewbox",
  "d",
  "clip-path",
  "id",
  "x1",
  "x2",
  "y1",
  "y2",
  "gradientunits",
  "gradienttransform",
  "offset",
  "stop-color",
  "stop-opacity",
  "opacity",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x",
  "y",
  "transform",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "points",
  "role",
  "aria-hidden",
  "aria-label",
  "preserveaspectratio"
]);
var ATTRIBUTE_PATTERN = /\s+([A-Za-z_:][\w:.-]*)\s*=\s*("[^"]*"|'[^']*')/g;
var TAG_PATTERN = /<\/?\s*([A-Za-z][\w:-]*)([^<>]*)>/g;
function sanitizeStoreLogoSvg(svg) {
  const source = svg.trim();
  if (!source.startsWith("<svg") || !source.endsWith("</svg>") || source.length > 1e5) {
    return "";
  }
  if (/<!|<\?|\b(?:javascript|data|vbscript):|\bon[a-z]+\s*=|\b(?:href|src|style)\s*=/i.test(source)) {
    return "";
  }
  let tagCount = 0;
  let match;
  TAG_PATTERN.lastIndex = 0;
  while (match = TAG_PATTERN.exec(source)) {
    tagCount += 1;
    const element = match[1].toLowerCase();
    if (!ALLOWED_ELEMENTS.has(element)) return "";
    if (match[0].startsWith("</")) continue;
    const attributes = match[2];
    let consumed = "";
    ATTRIBUTE_PATTERN.lastIndex = 0;
    let attributeMatch;
    while (attributeMatch = ATTRIBUTE_PATTERN.exec(attributes)) {
      consumed += attributeMatch[0];
      const attribute = attributeMatch[1].toLowerCase();
      const value = attributeMatch[2].slice(1, -1);
      if (!ALLOWED_ATTRIBUTES.has(attribute)) return "";
      if (attribute === "id" && !/^[A-Za-z_][\w:.-]*$/.test(value)) return "";
      if (/url\(/i.test(value) && !/^url\(#[A-Za-z_][\w:.-]*\)$/.test(value)) return "";
    }
    const remainder = attributes.replace(consumed, "").replace(/\//g, "").trim();
    if (remainder) return "";
  }
  TAG_PATTERN.lastIndex = 0;
  if (tagCount === 0 || source.replace(TAG_PATTERN, "").trim()) return "";
  return source;
}

// features/platform/store-settings/lib/validation.ts
function isSupportedTimeZone(value) {
  if (typeof value !== "string" || !value || value.length > 100) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}
function isSupportedLocale(value) {
  if (typeof value !== "string" || !value || value.length > 35) return false;
  try {
    return Intl.getCanonicalLocales(value).length === 1 && Intl.NumberFormat.supportedLocalesOf(value).length === 1;
  } catch {
    return false;
  }
}

// features/keystone/models/MarketplaceSettings.ts
function legalDocumentUrlHook(label) {
  return ({ resolvedData, fieldKey, addValidationError }) => {
    const value = resolvedData?.[fieldKey];
    if (value === void 0 || value === null || value === "") return;
    const valid = typeof value === "string" && (/^\/[^/\\]/.test(value) || /^https:\/\/[^\s]+$/.test(value));
    if (!valid) addValidationError(`${label} link must start with https:// or be a page on this site (starting with /).`);
  };
}
var MarketplaceSettings = (0, import_core22.list)({
  isSingleton: true,
  graphql: { plural: "marketplaceSettingsItems" },
  access: {
    operation: {
      query: permissions.canManageSettings,
      create: permissions.canManageSettings,
      update: permissions.canManageSettings,
      delete: permissions.canManageSettings
    }
  },
  hooks: {
    // A published legal document carries the version label guests accept or are shown.
    validate: ({ operation, item, resolvedData, addValidationError }) => {
      if (operation === "delete") return;
      const merged = { ...item || {}, ...resolvedData || {} };
      for (const [url, version, label] of [["privacyPolicyUrl", "privacyPolicyVersion", "Privacy policy"], ["termsUrl", "termsVersion", "Terms of use"]]) {
        if (String(merged[url] || "").trim() && !String(merged[version] || "").trim()) {
          addValidationError(`${label} needs a version label while its link is published.`);
        }
      }
    }
  },
  ui: {
    isHidden: (args) => !permissions.canManageSettings(args),
    label: "Store Settings",
    singular: "Store Settings",
    plural: "Store Settings",
    // Human labels follow the family's "Store Settings"; the existing records URL is kept.
    path: "marketplace-settings-items",
    labelField: "name",
    listView: { initialColumns: ["name", "tagline", "currencyCode", "isPublished"] }
  },
  fields: {
    name: (0, import_fields23.text)({ validation: { isRequired: true, length: { min: 2, max: 120 } } }),
    tagline: (0, import_fields23.text)({ validation: { length: { max: 160 } } }),
    homepageHeadline: (0, import_fields23.text)({
      defaultValue: "Stay somewhere considered.",
      validation: { isRequired: true, length: { min: 2, max: 160 } }
    }),
    publicDescription: (0, import_fields23.text)({ validation: { length: { max: 1e3 } }, ui: { displayMode: "textarea" } }),
    supportEmail: (0, import_fields23.text)(),
    supportPhone: (0, import_fields23.text)(),
    supportHours: (0, import_fields23.text)({
      validation: { length: { max: 300 } },
      ui: { displayMode: "textarea", description: "When guests can expect a reply, shown on the public help page." }
    }),
    officeAddress: (0, import_fields23.text)({
      validation: { length: { max: 300 } },
      ui: { displayMode: "textarea", description: "Business mailing or office address shown on the public help page. Leave blank to hide it." }
    }),
    privacyPolicyUrl: (0, import_fields23.text)({
      validation: { length: { max: 500 } },
      hooks: { validate: legalDocumentUrlHook("Privacy policy") },
      ui: { description: "Link to the store\u2019s published privacy policy (https:// or a page on this site). Shown at sign-up and checkout." }
    }),
    termsUrl: (0, import_fields23.text)({
      validation: { length: { max: 500 } },
      hooks: { validate: legalDocumentUrlHook("Terms of use") },
      ui: { description: "Link to the store\u2019s published terms of use. Shown at sign-up and checkout." }
    }),
    privacyPolicyVersion: (0, import_fields23.text)({
      validation: { length: { max: 60 } },
      ui: { description: "Version label of the published privacy policy, for example 2026-10-01. Recorded with each sign-up and booking that showed it." }
    }),
    termsVersion: (0, import_fields23.text)({
      validation: { length: { max: 60 } },
      ui: { description: "Version label of the published terms of use. Guests accept this exact version at sign-up and checkout." }
    }),
    allowTestBookings: (0, import_fields23.checkbox)({
      defaultValue: false,
      ui: {
        description: "Lets guests choose an explicit test booking while card checkout runs in Stripe test mode. Test bookings hold no dates, take only test-card payments, and are kept out of real money, statements and reports."
      }
    }),
    currencyCode: (0, import_fields23.text)({ defaultValue: "USD", validation: { isRequired: true } }),
    locale: (0, import_fields23.text)({
      defaultValue: "en-US",
      validation: { isRequired: true },
      hooks: {
        validate: ({ resolvedData, fieldKey, addValidationError }) => {
          const value = resolvedData?.[fieldKey];
          if (value !== void 0 && !isSupportedLocale(value)) addValidationError("Locale must be a supported value such as en-US.");
        }
      }
    }),
    timezone: (0, import_fields23.text)({
      defaultValue: "America/New_York",
      validation: { isRequired: true },
      hooks: {
        // Same rule as the Store Settings form, enforced for every write path.
        validate: ({ resolvedData, fieldKey, addValidationError }) => {
          const value = resolvedData?.[fieldKey];
          if (value !== void 0 && !isSupportedTimeZone(value)) addValidationError("Timezone must be a real IANA timezone such as America/New_York.");
        }
      }
    }),
    defaultMapLatitude: (0, import_fields23.float)({ validation: { min: -90, max: 90 } }),
    defaultMapLongitude: (0, import_fields23.float)({ validation: { min: -180, max: 180 } }),
    accentHue: (0, import_fields23.integer)({
      defaultValue: 155,
      validation: { isRequired: true, min: 0, max: 359 },
      hooks: {
        resolveInput: ({ resolvedData, fieldKey }) => {
          const value = resolvedData[fieldKey];
          return value === void 0 ? value : normalizeStorefrontAccentHue(value);
        }
      },
      ui: { description: "Storefront accent hue in degrees (0\u2013359). Store Settings derives it from the logo color." }
    }),
    logoIcon: (0, import_fields23.text)({
      defaultValue: DEFAULT_STORE_LOGO_ICON,
      ui: { description: "Sanitized SVG used by the storefront header, menu and footer" },
      hooks: {
        resolveInput: ({ resolvedData, fieldKey }) => {
          const value = resolvedData[fieldKey];
          if (value === void 0 || value === null || value === "") return value;
          return typeof value === "string" ? sanitizeStoreLogoSvg(value) : "";
        },
        validate: ({ inputData, resolvedData, fieldKey, addValidationError }) => {
          const submitted = inputData?.[fieldKey];
          if (typeof submitted === "string" && submitted.trim() && !resolvedData?.[fieldKey]) {
            addValidationError("Logo must be a valid, safe SVG document");
          }
        }
      }
    }),
    logoColor: (0, import_fields23.text)({
      defaultValue: DEFAULT_STORE_LOGO_COLOR,
      ui: { description: "Logo hue rotation in degrees; independent of the storefront accent" },
      hooks: {
        resolveInput: ({ resolvedData, fieldKey }) => {
          const value = resolvedData[fieldKey];
          return value === void 0 ? value : normalizeStoreLogoColor(value);
        }
      }
    }),
    isPublished: (0, import_fields23.checkbox)({
      defaultValue: true,
      ui: { description: "Publishes the storefront. While unpublished, browsing, new quotes and new bookings are paused; existing guests can still manage their stays." }
    }),
    ...trackingFields
  }
});

// features/keystone/models/Message.ts
var import_core23 = require("@keystone-6/core");
var import_fields24 = require("@keystone-6/core/fields");
var Message = (0, import_core23.list)({
  // Written only by domain commands, so authors, delivery, moderation and history can't be forged.
  access: hostScopedDomainOwnedListAccess("canReadMessages"),
  hooks: hostScopedHooks("canManageMessages"),
  ui: { listView: { initialColumns: ["conversation", "direction", "senderType", "status", "sentAt"] } },
  fields: {
    hostOrganization: (0, import_fields24.relationship)({ ref: "HostOrganization" }),
    conversation: (0, import_fields24.relationship)({ ref: "Conversation.messages" }),
    senderUser: (0, import_fields24.relationship)({ ref: "User.sentMessages" }),
    direction: (0, import_fields24.select)({
      type: "string",
      options: [
        { label: "Inbound", value: "inbound" },
        { label: "Outbound", value: "outbound" },
        { label: "System", value: "system" }
      ],
      defaultValue: "outbound"
    }),
    senderType: (0, import_fields24.select)({
      type: "string",
      options: [
        { label: "Guest", value: "guest" },
        { label: "Host", value: "host" },
        { label: "System", value: "system" },
        { label: "Channel", value: "channel" }
      ],
      defaultValue: "host"
    }),
    body: (0, import_fields24.text)({ validation: { isRequired: true }, ui: { displayMode: "textarea" } }),
    status: (0, import_fields24.select)({
      type: "string",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Queued", value: "queued" },
        { label: "Sent", value: "sent" },
        { label: "Delivered", value: "delivered" },
        { label: "Failed", value: "failed" },
        { label: "Received", value: "received" }
      ],
      defaultValue: "draft"
    }),
    externalMessageId: (0, import_fields24.text)({ isIndexed: true }),
    attachments: (0, import_fields24.json)(),
    sentAt: (0, import_fields24.timestamp)(),
    receivedAt: (0, import_fields24.timestamp)(),
    ...trackingFields
  }
});

// features/keystone/models/Payment.ts
var import_core24 = require("@keystone-6/core");
var import_fields25 = require("@keystone-6/core/fields");

// features/keystone/utils/paymentReconciliation.ts
var settledPaymentStatuses = /* @__PURE__ */ new Set(["succeeded", "partially_refunded", "refunded"]);
var completedRefundStatuses = /* @__PURE__ */ new Set(["succeeded"]);
var openRefundStatuses = /* @__PURE__ */ new Set(["pending", "processing", "failed"]);
function assertCents(value, label, allowZero = true) {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    throw new Error(`${label} must be a ${allowZero ? "non-negative" : "positive"} integer number of cents.`);
  }
}
function isTestTender(payment) {
  const data = payment.data && typeof payment.data === "object" ? payment.data : {};
  if (data.mode === "card") return false;
  return payment.provider === "pp_stripe_stripe" || data.mode === "test";
}
function reconcileReservationPaymentEvidence({
  payments,
  refunds,
  currencyCode,
  testMode
}) {
  const expectedCurrency = currencyCode?.toUpperCase();
  if (!expectedCurrency || !/^[A-Z]{3}$/.test(expectedCurrency)) {
    throw new Error("Reservation currency code is invalid.");
  }
  const segregatedIds = new Set(payments.filter((payment) => isTestTender(payment) !== testMode).map((payment) => payment.id));
  const segregatedTender = { count: segregatedIds.size, grossCents: 0, netCents: 0, completedRefundCents: 0, openRefundCents: 0, pendingCents: 0 };
  const refundTotals = /* @__PURE__ */ new Map();
  let completedRefundCents = 0;
  let openRefundCents = 0;
  let hasRefunds = false;
  for (const refund of refunds) {
    assertCents(refund.amountCents, `Refund ${refund.id} amount`, false);
    if (refund.currencyCode?.toUpperCase() !== expectedCurrency) {
      throw new Error("Refund currency does not match the reservation currency.");
    }
    if (refund.paymentId && segregatedIds.has(refund.paymentId)) {
      if (completedRefundStatuses.has(refund.status || "")) {
        segregatedTender.completedRefundCents += refund.amountCents;
        refundTotals.set(refund.paymentId, (refundTotals.get(refund.paymentId) || 0) + refund.amountCents);
      } else if (openRefundStatuses.has(refund.status || "")) segregatedTender.openRefundCents += refund.amountCents;
      continue;
    }
    if (completedRefundStatuses.has(refund.status || "")) {
      if (!refund.paymentId) throw new Error("A successful refund is missing its payment link.");
      refundTotals.set(refund.paymentId, (refundTotals.get(refund.paymentId) || 0) + refund.amountCents);
      completedRefundCents += refund.amountCents;
      hasRefunds = true;
    } else if (openRefundStatuses.has(refund.status || "")) {
      openRefundCents += refund.amountCents;
    }
  }
  let grossCollectedCents = 0;
  let netPaidCents = 0;
  let pendingTenderCents = 0;
  const seenPaymentIds = /* @__PURE__ */ new Set();
  for (const payment of payments) {
    if (seenPaymentIds.has(payment.id)) throw new Error("Reservation payment evidence contains a duplicate payment.");
    seenPaymentIds.add(payment.id);
    const ledgerRefundCents = refundTotals.get(payment.id) || 0;
    const segregated = segregatedIds.has(payment.id);
    if (!settledPaymentStatuses.has(payment.status || "")) {
      if ((payment.refundedAmountCents || 0) > 0 || ledgerRefundCents > 0) {
        throw new Error("Payment status and refund evidence do not reconcile.");
      }
      if (["pending", "processing"].includes(payment.status || "")) {
        assertCents(payment.amountCents, "Pending payment amount", false);
        if (payment.currencyCode?.toUpperCase() !== expectedCurrency) {
          throw new Error("Payment currency does not match the reservation currency.");
        }
        if (segregated) segregatedTender.pendingCents += payment.amountCents;
        else pendingTenderCents += payment.amountCents;
      }
      continue;
    }
    assertCents(payment.amountCents, "Payment amount", false);
    assertCents(payment.refundedAmountCents ?? 0, "Refunded payment amount");
    if (payment.currencyCode?.toUpperCase() !== expectedCurrency) {
      throw new Error("Payment currency does not match the reservation currency.");
    }
    const recordedRefundCents = payment.refundedAmountCents ?? 0;
    if (recordedRefundCents > payment.amountCents || recordedRefundCents !== ledgerRefundCents) {
      throw new Error("Payment refund totals do not reconcile to the refund ledger.");
    }
    if (payment.status === "succeeded" && ledgerRefundCents !== 0 || payment.status === "partially_refunded" && (ledgerRefundCents === 0 || ledgerRefundCents >= payment.amountCents) || payment.status === "refunded" && ledgerRefundCents !== payment.amountCents) {
      throw new Error("Payment status and refund evidence do not reconcile.");
    }
    if (segregated) {
      segregatedTender.grossCents += payment.amountCents;
      segregatedTender.netCents += payment.amountCents - ledgerRefundCents;
    } else {
      grossCollectedCents += payment.amountCents;
      netPaidCents += payment.amountCents - ledgerRefundCents;
    }
    refundTotals.delete(payment.id);
  }
  if ([...refundTotals.values()].some((amount) => amount > 0)) {
    throw new Error("The successful refund ledger does not match the reservation payment records.");
  }
  assertCents(grossCollectedCents, "Gross collected amount");
  assertCents(completedRefundCents, "Completed refund amount");
  assertCents(netPaidCents, "Net paid amount");
  assertCents(pendingTenderCents, "Pending tender amount");
  assertCents(openRefundCents, "Open refund liability amount");
  return { grossCollectedCents, completedRefundCents, netPaidCents, pendingTenderCents, openRefundCents, hasRefunds, segregatedTender };
}
function unreservedReservationBalance({ totalAmountCents, netPaidCents, pendingTenderCents }) {
  assertCents(totalAmountCents, "Reservation total");
  assertCents(netPaidCents, "Net paid amount");
  assertCents(pendingTenderCents, "Pending tender amount");
  return Math.max(totalAmountCents - netPaidCents - pendingTenderCents, 0);
}
function reservationPaymentStatus({ netPaidCents, totalAmountCents, hasRefunds, openRefundCents }) {
  assertCents(netPaidCents, "Net paid amount");
  assertCents(totalAmountCents, "Reservation total");
  assertCents(openRefundCents, "Open refund liability amount");
  if (openRefundCents > 0) return "refund_pending";
  if (netPaidCents === 0) return hasRefunds ? "refunded" : "unpaid";
  if (netPaidCents >= totalAmountCents) return "paid";
  return hasRefunds ? "partially_refunded" : "partial";
}

// features/keystone/utils/tenderProvenance.ts
function tenderKind(payment) {
  const data = payment.data && typeof payment.data === "object" && !Array.isArray(payment.data) ? payment.data : {};
  if (data.kind === "seeded_manual_capture" || data.provenance === "onboarding_sample") return "sample";
  if (isTestTender(payment)) return "test";
  if (payment.provider === "pp_system_default" || payment.provider === "manual") return "manual";
  if (payment.provider) return "provider";
  return "unknown";
}
function isRealMoneyTender(kind) {
  return kind === "manual" || kind === "provider" || kind === "unknown";
}

// features/keystone/models/Payment.ts
var Payment = (0, import_core24.list)({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords("canReadPayments") }
  },
  ui: { listView: { initialColumns: ["amountCents", "status", "paymentMethod", "reservation", "processedAt"] } },
  fields: {
    hostOrganization: (0, import_fields25.relationship)({ ref: "HostOrganization.payments" }),
    reservation: (0, import_fields25.relationship)({ ref: "Reservation.payments" }),
    guest: (0, import_fields25.relationship)({ ref: "GuestProfile.payments" }),
    paymentProvider: (0, import_fields25.relationship)({ ref: "PaymentProvider.payments" }),
    amountCents: (0, import_fields25.integer)({ validation: { isRequired: true, min: 1 } }),
    refundedAmountCents: (0, import_fields25.integer)({ defaultValue: 0, validation: { min: 0 } }),
    currencyCode: (0, import_fields25.text)({ defaultValue: "USD", validation: { isRequired: true } }),
    status: (0, import_fields25.select)({
      type: "string",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Processing", value: "processing" },
        { label: "Succeeded", value: "succeeded" },
        { label: "Failed", value: "failed" },
        { label: "Cancelled", value: "cancelled" },
        { label: "Partially Refunded", value: "partially_refunded" },
        { label: "Refunded", value: "refunded" }
      ],
      defaultValue: "pending"
    }),
    paymentMethod: (0, import_fields25.select)({
      type: "string",
      options: [
        { label: "Card", value: "card" },
        { label: "Bank transfer", value: "bank_transfer" },
        { label: "Cash", value: "cash" },
        { label: "Check", value: "check" },
        { label: "Manual", value: "manual" }
      ],
      defaultValue: "manual"
    }),
    provider: (0, import_fields25.text)({ defaultValue: "manual" }),
    providerPaymentId: (0, import_fields25.text)({ isIndexed: "unique" }),
    idempotencyKey: (0, import_fields25.text)({ isIndexed: "unique" }),
    data: (0, import_fields25.json)(),
    // Test, sample, manual, provider or unknown, from this payment's own evidence (never its booking's flag).
    tenderKind: (0, import_fields25.virtual)({
      field: import_core24.graphql.field({ type: import_core24.graphql.String, resolve: (item) => tenderKind(item) }),
      ui: { itemView: { fieldMode: "read" }, listView: { fieldMode: "hidden" }, createView: { fieldMode: "hidden" } }
    }),
    // Complete refund facts for this payment (every refund, not a preview): what is still owed
    // and what can still be refunded. Commands re-check under their locks; this is for display.
    refundAvailability: (0, import_fields25.virtual)({
      field: import_core24.graphql.field({
        type: import_core24.graphql.JSON,
        resolve: async (item, _args, context) => {
          const open = await context.prisma.refund.aggregate({
            where: { paymentId: String(item.id), status: { in: ["pending", "processing", "failed"] } },
            _sum: { amountCents: true },
            _count: { _all: true }
          });
          const openRefundCents = open._sum.amountCents || 0;
          const settled = ["succeeded", "partially_refunded"].includes(item.status);
          return {
            openRefundCents,
            openRefundCount: open._count._all,
            refundableCents: settled ? Math.max((item.amountCents || 0) - (item.refundedAmountCents || 0) - openRefundCents, 0) : 0
          };
        }
      }),
      ui: { itemView: { fieldMode: "hidden" }, listView: { fieldMode: "hidden" }, createView: { fieldMode: "hidden" } }
    }),
    processedAt: (0, import_fields25.timestamp)(),
    errorMessage: (0, import_fields25.text)({ ui: { displayMode: "textarea" } }),
    processedBy: (0, import_fields25.relationship)({ ref: "User" }),
    refunds: (0, import_fields25.relationship)({ ref: "Refund.payment", many: true, ui: { displayMode: "count" } }),
    securityDeposits: (0, import_fields25.relationship)({ ref: "SecurityDeposit.payment", many: true, ui: { displayMode: "count" } }),
    webhookEvents: (0, import_fields25.relationship)({ ref: "PaymentWebhookEvent.payment", many: true, ui: { displayMode: "count" } }),
    ...trackingFields
  }
});

// features/keystone/models/PaymentProvider.ts
var import_core25 = require("@keystone-6/core");
var import_access29 = require("@keystone-6/core/access");
var import_fields26 = require("@keystone-6/core/fields");

// features/integrations/payment/index.ts
var import_node_crypto2 = __toESM(require("node:crypto"));

// features/integrations/payment/manual.ts
async function createPaymentFunction({ reservation, amount, currency }) {
  const providerPaymentId = `manual_${reservation?.confirmationCode || reservation?.id || Date.now()}`;
  return {
    status: "pending",
    providerPaymentId,
    data: {
      providerPaymentId,
      status: "pending",
      amount,
      currency: currency.toLowerCase(),
      reservationId: reservation?.id,
      confirmationCode: reservation?.confirmationCode,
      instructions: "Record the offline payment. External card providers remain disabled until signed webhook and secret-storage work is complete."
    }
  };
}
async function capturePaymentFunction({ paymentId, amount }) {
  return { status: "captured", amount, data: { paymentId, status: "captured", amount, capturedAt: (/* @__PURE__ */ new Date()).toISOString() } };
}
async function refundPaymentFunction({ paymentId, amount }) {
  return {
    status: "pending",
    amount,
    data: {
      paymentId,
      status: "pending",
      amount,
      mode: "manual",
      instructions: "This adapter does not transfer funds. Record a refund liability, then reconcile only after an operator confirms the external or cash refund has already been completed."
    }
  };
}
async function getPaymentStatusFunction({ paymentId }) {
  return { status: "pending", data: { paymentId, status: "pending" } };
}
async function generatePaymentLinkFunction() {
  return null;
}

// features/integrations/payment/stripe.ts
var import_node_crypto = __toESM(require("node:crypto"));
var import_stripe = __toESM(require("stripe"));

// features/integrations/payment/errors.ts
var ProviderDefiniteRejection = class extends Error {
  constructor(message) {
    super(message);
    this.definite = true;
    this.name = "ProviderDefiniteRejection";
  }
};
var ProviderOutcomeUnknown = class extends Error {
  constructor(message) {
    super(message);
    this.unknownOutcome = true;
    this.name = "ProviderOutcomeUnknown";
  }
};

// features/integrations/payment/stripe.ts
var STRIPE_PROVIDER_CODE = "pp_stripe_stripe";
var RENTAL_PAYMENT_SOURCE = "openfront-rental";
var STRIPE_KEY_REPLAY_WINDOW_MS = 22 * 60 * 60 * 1e3;
function stripeCredentialVersion() {
  const key = process.env.STRIPE_SECRET_KEY || "";
  return key ? import_node_crypto.default.createHash("sha256").update(`rental-stripe:${key}`).digest("hex").slice(0, 16) : null;
}
function stripeCheckoutEnabled() {
  return process.env.STRIPE_ENABLED === "true" && Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) && Boolean(process.env.STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test_")) && Boolean(process.env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_"));
}
function client() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith("sk_test_")) throw new Error("Card payment is not configured.");
  return new import_stripe.default(key, { timeout: 2e4, maxNetworkRetries: 1 });
}
function settlement(intent) {
  return {
    amountCents: intent.amount_received,
    currencyCode: intent.currency.toUpperCase(),
    source: intent.metadata.source,
    reservationId: intent.metadata.reservationId,
    paymentId: intent.metadata.rentalPaymentId,
    idempotencyKey: intent.metadata.idempotencyKey,
    livemode: intent.livemode
  };
}
async function createPaymentFunction2({ amount, currency, reservation, idempotencyKey, metadata }) {
  if (!stripeCheckoutEnabled()) throw new Error("Card payment is currently unavailable.");
  if (!Number.isSafeInteger(amount) || amount <= 0 || !idempotencyKey || !metadata?.rentalPaymentId) throw new Error("Invalid card payment request.");
  const intent = await client().paymentIntents.create({
    amount,
    currency: currency.toLowerCase(),
    payment_method_types: ["card"],
    metadata: { ...metadata, source: RENTAL_PAYMENT_SOURCE, reservationId: reservation.id, idempotencyKey }
  }, { idempotencyKey });
  if (intent.livemode) throw new Error("Live payments are not available.");
  return { status: "pending", providerPaymentId: intent.id, data: { clientSecret: intent.client_secret } };
}
function intentResult(intent) {
  return {
    // `canceled` is terminal: the attempt can never collect money. Every other unpaid
    // state (including a declined card) stays retryable with the same intent.
    status: intent.status === "succeeded" ? "captured" : intent.status === "canceled" ? "failed" : "pending",
    providerPaymentId: intent.id,
    data: { ...settlement(intent), providerStatus: intent.status, clientSecret: intent.client_secret }
  };
}
async function getPaymentStatusFunction2({ paymentId }) {
  return intentResult(await client().paymentIntents.retrieve(paymentId));
}
function assertIntentIdentity(intent, expected) {
  if (intent.livemode || intent.metadata?.source !== RENTAL_PAYMENT_SOURCE || intent.metadata?.rentalPaymentId !== expected.rentalPaymentId || (intent.metadata?.reservationId || null) !== (expected.reservationId || null) || expected.idempotencyKey && intent.metadata?.idempotencyKey !== expected.idempotencyKey || intent.amount !== expected.amountCents || intent.currency.toUpperCase() !== expected.currencyCode.toUpperCase()) {
    throw new Error("This card payment doesn\u2019t match this payment attempt. Nothing was changed.");
  }
}
async function cancelPaymentFunction({ paymentId, expected }) {
  const stripe = client();
  const intent = await stripe.paymentIntents.retrieve(paymentId);
  assertIntentIdentity(intent, expected);
  if (["succeeded", "canceled", "processing"].includes(intent.status)) return intentResult(intent);
  return intentResult(await stripe.paymentIntents.cancel(paymentId, { cancellation_reason: "abandoned" }));
}
async function findPaymentFunction({ rentalPaymentId }) {
  if (!/^[a-z0-9]+$/i.test(rentalPaymentId)) throw new Error("Invalid card payment reference.");
  const found = await client().paymentIntents.search({ query: `metadata['rentalPaymentId']:'${rentalPaymentId}'`, limit: 10 });
  const own = found.data.filter((intent) => !intent.livemode && intent.metadata?.source === RENTAL_PAYMENT_SOURCE && intent.metadata?.rentalPaymentId === rentalPaymentId);
  if (own.length > 1) throw new Error("More than one card payment matches this attempt. Reconcile it in Stripe.");
  return own[0] ? intentResult(own[0]) : null;
}
function verifyWebhook({ rawBody, headers }) {
  const signature = headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) throw new Error("Payment webhook signature is required.");
  let event;
  try {
    event = client().webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    throw new Error("Payment webhook signature is invalid.");
  }
  const intent = event.data.object;
  if (event.livemode || event.type !== "payment_intent.succeeded" || intent.metadata?.source !== RENTAL_PAYMENT_SOURCE) {
    return { id: event.id, type: "ignored" };
  }
  if (intent.status !== "succeeded" || intent.livemode) throw new Error("Payment settlement is incomplete.");
  return { id: event.id, type: "payment.succeeded", data: { ...settlement(intent), providerPaymentId: intent.id } };
}
async function createRefundFunction({ providerPaymentId, amount, idempotencyKey, metadata, expected, firstSubmittedAt }) {
  if (!providerPaymentId.startsWith("pi_") || !Number.isSafeInteger(amount) || amount <= 0 || !idempotencyKey || !metadata?.rentalRefundId) throw new Error("Invalid card refund request.");
  const stripe = client();
  const intent = await stripe.paymentIntents.retrieve(providerPaymentId);
  if (intent.livemode || intent.metadata?.source !== RENTAL_PAYMENT_SOURCE || intent.metadata?.rentalPaymentId !== expected.rentalPaymentId || (intent.metadata?.reservationId || null) !== (expected.reservationId || null)) throw new Error("This card payment doesn\u2019t match this refund. Nothing was changed.");
  let prior;
  let startingAfter;
  for (let page = 0; !prior; page += 1) {
    if (page >= 20) throw new Error("Too many refunds to check this payment safely. Reconcile it in Stripe before refunding again.");
    const existing = await stripe.refunds.list({ payment_intent: providerPaymentId, limit: 100, ...startingAfter ? { starting_after: startingAfter } : {} });
    prior = existing.data.find((refund2) => refund2.metadata?.rentalRefundId === metadata.rentalRefundId && refund2.status !== "failed" && refund2.status !== "canceled");
    if (!existing.has_more || !existing.data.length) break;
    startingAfter = existing.data[existing.data.length - 1].id;
  }
  if (prior) return refundResult(prior, providerPaymentId);
  const submittedAt = Date.parse(firstSubmittedAt);
  if (!Number.isFinite(submittedAt) || Date.now() - submittedAt >= STRIPE_KEY_REPLAY_WINDOW_MS) {
    throw new ProviderOutcomeUnknown("Stripe shows no refund for this request, but it was first sent too long ago to resend safely. Check the payment in Stripe and record what happened.");
  }
  let refund;
  try {
    refund = await stripe.refunds.create({
      payment_intent: providerPaymentId,
      amount,
      metadata: { ...metadata, source: RENTAL_PAYMENT_SOURCE }
    }, { idempotencyKey });
  } catch (error) {
    if (["StripeInvalidRequestError", "StripeCardError"].includes(error?.type) && error?.statusCode && error.statusCode < 500 && error?.type !== "StripeIdempotencyError") {
      throw new ProviderDefiniteRejection(typeof error.message === "string" ? error.message : "Stripe refused this refund.");
    }
    throw error;
  }
  return refundResult(refund, providerPaymentId);
}
async function getRefundFunction({ providerRefundId, providerPaymentId }) {
  if (!providerRefundId.startsWith("re_")) throw new Error("Invalid card refund reference.");
  return refundResult(await client().refunds.retrieve(providerRefundId), providerPaymentId);
}
function refundResult(refund, providerPaymentId) {
  const paymentIntent = typeof refund.payment_intent === "string" ? refund.payment_intent : refund.payment_intent?.id;
  if (paymentIntent !== providerPaymentId || refund.metadata?.source !== RENTAL_PAYMENT_SOURCE) throw new Error("Card refund identity does not match this payment.");
  return {
    providerRefundId: refund.id,
    status: refund.status === "succeeded" ? "succeeded" : refund.status === "failed" || refund.status === "canceled" ? "failed" : "pending",
    providerStatus: refund.status,
    amountCents: refund.amount,
    currencyCode: refund.currency.toUpperCase(),
    rentalRefundId: refund.metadata?.rentalRefundId || null,
    failureReason: refund.failure_reason || null
  };
}

// features/integrations/payment/index.ts
function verifySignedWebhook({ rawBody, signature, secret }) {
  if (!secret || !signature) throw new Error("Payment webhook signature is required.");
  const expected = import_node_crypto2.default.createHmac("sha256", secret).update(rawBody).digest("hex");
  const providedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (providedBuffer.length !== expectedBuffer.length || !import_node_crypto2.default.timingSafeEqual(providedBuffer, expectedBuffer)) {
    throw new Error("Payment webhook signature is invalid.");
  }
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    throw new Error("Payment webhook payload is invalid.");
  }
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    throw new Error("Payment webhook event must be an object.");
  }
  const record5 = event;
  if (typeof record5.id !== "string" || !record5.id || typeof record5.type !== "string" || !record5.type) {
    throw new Error("Payment webhook event id and type are required.");
  }
  if (record5.data !== void 0 && (!record5.data || typeof record5.data !== "object" || Array.isArray(record5.data))) {
    throw new Error("Payment webhook event data must be an object.");
  }
  return event;
}
var manualAdapter = {
  code: "pp_system_default",
  mode: "manual",
  capabilities: ["createPayment", "capturePayment", "refundInstruction", "getPaymentStatus", "generatePaymentLink"],
  createPayment: createPaymentFunction,
  capturePayment: capturePaymentFunction,
  refundPayment: refundPaymentFunction,
  getPaymentStatus: getPaymentStatusFunction,
  generatePaymentLink: generatePaymentLinkFunction
};
var signedTestAdapter = {
  code: "pp_signed_test",
  mode: "signed_test",
  capabilities: ["getPaymentStatus", "verifyWebhook"],
  async createPayment() {
    throw new Error("The signed test provider is webhook-only.");
  },
  async capturePayment() {
    throw new Error("The signed test provider settles only through verified webhooks.");
  },
  async refundPayment() {
    throw new Error("The signed test provider does not issue refunds.");
  },
  async getPaymentStatus({ paymentId }) {
    return { status: "pending", data: { paymentId } };
  },
  async generatePaymentLink() {
    return null;
  },
  verifyWebhook({ rawBody, headers }) {
    const secret = process.env.PAYMENT_WEBHOOK_SIGNED_TEST_SECRET || "";
    const signature = headers.get("x-openfront-signature") || "";
    return verifySignedWebhook({ rawBody, signature, secret });
  }
};
var stripeAdapter = {
  code: "pp_stripe_stripe",
  mode: "stripe",
  capabilities: ["createPayment", "getPaymentStatus", "verifyWebhook"],
  createPayment: createPaymentFunction2,
  createRefund: createRefundFunction,
  getRefund: getRefundFunction,
  getPaymentStatus: getPaymentStatusFunction2,
  cancelPayment: cancelPaymentFunction,
  findPayment: findPaymentFunction,
  verifyWebhook,
  async capturePayment() {
    throw new Error("Card payment is confirmed by Stripe.");
  },
  async refundPayment() {
    throw new Error("Card refunds require host review.");
  },
  async generatePaymentLink() {
    return null;
  }
};
var paymentProviderAdapters = {
  pp_system_default: manualAdapter,
  pp_signed_test: signedTestAdapter,
  pp_stripe_stripe: stripeAdapter
};
function isSupportedPaymentProviderCode(providerCode) {
  return typeof providerCode === "string" && Object.prototype.hasOwnProperty.call(paymentProviderAdapters, providerCode);
}
function getPaymentAdapter(providerCode) {
  if (!isSupportedPaymentProviderCode(providerCode)) throw new Error("Unsupported payment provider.");
  return paymentProviderAdapters[providerCode];
}

// features/keystone/models/PaymentProvider.ts
var providerHostHooks = hostScopedHooks("canManagePayments");
var providerAccess = hostScopedListAccess("canReadPayments", "canManagePayments");
var PaymentProvider = (0, import_core25.list)({
  db: {
    extendPrismaSchema(schema) {
      return schema.replace(/\n}\s*$/, "\n\n  @@unique([hostOrganizationId, code])\n}");
    }
  },
  // A provider is turned off, never deleted: its id and code are the lineage its payments,
  // refunds and late events are matched against.
  access: { ...providerAccess, operation: { ...providerAccess.operation, delete: () => false } },
  hooks: {
    ...providerHostHooks,
    validate: async (args) => {
      await providerHostHooks.validate(args);
      const { operation, resolvedData, item, context, addValidationError } = args;
      const code = resolvedData?.code ?? item?.code;
      const installing = (resolvedData?.isInstalled ?? item?.isInstalled) === true;
      if ((operation === "create" || resolvedData?.code !== void 0 || resolvedData?.isInstalled === true) && installing && !isSupportedPaymentProviderCode(code)) {
        addValidationError("This payment provider isn\u2019t supported by the store. Use the manual or card provider.");
      }
      if ((operation === "delete" || operation === "update" && resolvedData?.code !== void 0 && resolvedData.code !== item?.code) && item?.id) {
        const [payment, event] = await Promise.all([
          context.prisma.payment.findFirst({ where: { paymentProviderId: item.id }, select: { id: true } }),
          context.prisma.paymentWebhookEvent.findFirst({ where: { paymentProviderId: item.id }, select: { id: true } })
        ]);
        if (payment || event) addValidationError("This provider has payment history. Turn it off instead; its payments and refunds still need it.");
      }
    }
  },
  ui: { listView: { initialColumns: ["name", "code", "hostOrganization", "isInstalled"] } },
  fields: {
    hostOrganization: (0, import_fields26.relationship)({ ref: "HostOrganization.paymentProviders" }),
    name: (0, import_fields26.text)({ validation: { isRequired: true } }),
    // Fixed once created, so an in-flight attempt's provider can't be renamed under it.
    code: (0, import_fields26.text)({
      access: { update: () => false },
      validation: {
        isRequired: true,
        match: {
          regex: /^pp_[a-zA-Z0-9-_]+$/,
          explanation: "Payment provider code must start with pp_."
        }
      },
      isIndexed: true
    }),
    isInstalled: (0, import_fields26.checkbox)({ defaultValue: false }),
    metadata: (0, import_fields26.json)({
      defaultValue: {},
      ui: { description: "Non-secret provider configuration only. Provider secrets are read from server environment variables." }
    }),
    payments: (0, import_fields26.relationship)({
      ref: "Payment.paymentProvider",
      many: true,
      access: { create: import_access29.denyAll, update: import_access29.denyAll },
      ui: { displayMode: "count" }
    }),
    webhookEvents: (0, import_fields26.relationship)({
      ref: "PaymentWebhookEvent.paymentProvider",
      many: true,
      access: { create: import_access29.denyAll, update: import_access29.denyAll },
      ui: { displayMode: "count" }
    }),
    ...trackingFields
  }
});

// features/keystone/models/PaymentWebhookEvent.ts
var import_core26 = require("@keystone-6/core");
var import_fields27 = require("@keystone-6/core/fields");
var PaymentWebhookEvent = (0, import_core26.list)({
  access: {
    operation: {
      query: isSignedIn,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: { query: rules.canReadHostScopedRecords("canReadPayments") }
  },
  ui: {
    listView: { initialColumns: ["providerCode", "providerEventId", "eventType", "status", "processedAt"] }
  },
  fields: {
    hostOrganization: (0, import_fields27.relationship)({ ref: "HostOrganization.paymentWebhookEvents" }),
    paymentProvider: (0, import_fields27.relationship)({ ref: "PaymentProvider.webhookEvents" }),
    payment: (0, import_fields27.relationship)({ ref: "Payment.webhookEvents" }),
    replayKey: (0, import_fields27.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    providerCode: (0, import_fields27.text)({ validation: { isRequired: true } }),
    providerEventId: (0, import_fields27.text)({ validation: { isRequired: true } }),
    eventType: (0, import_fields27.text)({ validation: { isRequired: true } }),
    payloadSha256: (0, import_fields27.text)({ validation: { isRequired: true } }),
    status: (0, import_fields27.select)({
      type: "string",
      options: [
        { label: "Processed", value: "processed" },
        { label: "Ignored", value: "ignored" },
        { label: "Failed", value: "failed" }
      ],
      defaultValue: "processed"
    }),
    processedAt: (0, import_fields27.timestamp)({ validation: { isRequired: true } }),
    errorMessage: (0, import_fields27.text)(),
    evidence: (0, import_fields27.json)({ defaultValue: {} }),
    ...trackingFields
  }
});

// features/keystone/models/Payout.ts
var import_core27 = require("@keystone-6/core");
var import_fields28 = require("@keystone-6/core/fields");
var Payout = (0, import_core27.list)({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords("canReadPayouts") }
  },
  ui: { listView: { initialColumns: ["payoutNumber", "hostOrganization", "reservation", "status", "netAmountCents", "scheduledAt"] } },
  fields: {
    hostOrganization: (0, import_fields28.relationship)({ ref: "HostOrganization.payouts" }),
    reservation: (0, import_fields28.relationship)({ ref: "Reservation.payout" }),
    propertyOwner: (0, import_fields28.relationship)({ ref: "PropertyOwner.payouts" }),
    ownerStatement: (0, import_fields28.relationship)({ ref: "OwnerStatement.payouts" }),
    payoutNumber: (0, import_fields28.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    status: (0, import_fields28.select)({
      type: "string",
      options: [
        { label: "Scheduled", value: "scheduled" },
        { label: "Processing", value: "processing" },
        { label: "Paid", value: "paid" },
        { label: "Failed", value: "failed" },
        { label: "Reversed", value: "reversed" }
      ],
      defaultValue: "scheduled"
    }),
    currencyCode: (0, import_fields28.text)({ defaultValue: "USD" }),
    grossAmountCents: (0, import_fields28.integer)({ defaultValue: 0 }),
    platformFeeCents: (0, import_fields28.integer)({ defaultValue: 0 }),
    managerFeeCents: (0, import_fields28.integer)({ defaultValue: 0 }),
    refundAmountCents: (0, import_fields28.integer)({ defaultValue: 0 }),
    netAmountCents: (0, import_fields28.integer)({ defaultValue: 0 }),
    providerPayoutId: (0, import_fields28.text)({
      isIndexed: "unique",
      db: { isNullable: true },
      ui: { description: "External provider reference only. Payouts an operator records as paid outside the app do not receive a provider ID." }
    }),
    scheduledAt: (0, import_fields28.timestamp)(),
    paidAt: (0, import_fields28.timestamp)(),
    data: (0, import_fields28.json)(),
    ...trackingFields
  }
});

// features/keystone/models/OwnerStatement.ts
var import_core28 = require("@keystone-6/core");
var import_fields29 = require("@keystone-6/core/fields");
var OwnerStatement = (0, import_core28.list)({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords("canReadPayouts") }
  },
  ui: { listView: { initialColumns: ["statementNumber", "owner", "periodStart", "periodEnd", "status", "ownerEarningsCents", "balanceDueCents"] } },
  fields: {
    hostOrganization: (0, import_fields29.relationship)({ ref: "HostOrganization.ownerStatements" }),
    owner: (0, import_fields29.relationship)({ ref: "PropertyOwner.statements" }),
    statementNumber: (0, import_fields29.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    idempotencyKey: (0, import_fields29.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    status: (0, import_fields29.select)({
      type: "string",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Approved", value: "approved" },
        { label: "Sent", value: "sent" },
        { label: "Paid", value: "paid" },
        { label: "Voided", value: "voided" }
      ],
      defaultValue: "draft"
    }),
    periodStart: (0, import_fields29.text)({ validation: { isRequired: true } }),
    periodEnd: (0, import_fields29.text)({ validation: { isRequired: true } }),
    currencyCode: (0, import_fields29.text)({ validation: { isRequired: true }, defaultValue: "USD" }),
    grossRevenueCents: (0, import_fields29.integer)({ defaultValue: 0 }),
    taxAmountCents: (0, import_fields29.integer)({ defaultValue: 0 }),
    refundAmountCents: (0, import_fields29.integer)({ defaultValue: 0 }),
    expenseAmountCents: (0, import_fields29.integer)({ defaultValue: 0 }),
    adjustmentAmountCents: (0, import_fields29.integer)({ defaultValue: 0 }),
    managerCommissionCents: (0, import_fields29.integer)({ defaultValue: 0 }),
    ownerEarningsCents: (0, import_fields29.integer)({ defaultValue: 0 }),
    paidOutCents: (0, import_fields29.integer)({ defaultValue: 0 }),
    balanceDueCents: (0, import_fields29.integer)({ defaultValue: 0 }),
    statementSnapshot: (0, import_fields29.json)({ ui: { itemView: { fieldMode: "read" } } }),
    generatedAt: (0, import_fields29.timestamp)({ defaultValue: { kind: "now" } }),
    approvedAt: (0, import_fields29.timestamp)(),
    sentAt: (0, import_fields29.timestamp)(),
    paidAt: (0, import_fields29.timestamp)(),
    paidReference: (0, import_fields29.text)(),
    lines: (0, import_fields29.relationship)({ ref: "OwnerStatementLine.statement", many: true, ui: { displayMode: "count" } }),
    payouts: (0, import_fields29.relationship)({ ref: "Payout.ownerStatement", many: true, ui: { displayMode: "count" } }),
    ...trackingFields
  }
});

// features/keystone/models/OwnerStatementLine.ts
var import_core29 = require("@keystone-6/core");
var import_fields30 = require("@keystone-6/core/fields");
var OwnerStatementLine = (0, import_core29.list)({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords("canReadPayouts") }
  },
  ui: { listView: { initialColumns: ["statement", "lineType", "description", "serviceDate", "amountCents"] } },
  fields: {
    hostOrganization: (0, import_fields30.relationship)({ ref: "HostOrganization.ownerStatementLines" }),
    statement: (0, import_fields30.relationship)({ ref: "OwnerStatement.lines" }),
    owner: (0, import_fields30.relationship)({ ref: "PropertyOwner" }),
    reservation: (0, import_fields30.relationship)({ ref: "Reservation" }),
    refund: (0, import_fields30.relationship)({ ref: "Refund" }),
    payout: (0, import_fields30.relationship)({ ref: "Payout" }),
    lineKey: (0, import_fields30.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    lineType: (0, import_fields30.select)({
      type: "string",
      options: [
        { label: "Reservation revenue", value: "reservation_revenue" },
        { label: "Refund", value: "refund" },
        { label: "Expense", value: "expense" },
        { label: "Adjustment", value: "adjustment" },
        { label: "Manager commission", value: "manager_commission" },
        { label: "Payout", value: "payout" }
      ],
      defaultValue: "reservation_revenue"
    }),
    description: (0, import_fields30.text)({ validation: { isRequired: true } }),
    serviceDate: (0, import_fields30.text)(),
    amountCents: (0, import_fields30.integer)({ validation: { isRequired: true } }),
    sourceId: (0, import_fields30.text)(),
    metadata: (0, import_fields30.json)(),
    ...trackingFields
  }
});

// features/keystone/models/Property.ts
var import_core30 = require("@keystone-6/core");
var import_access35 = require("@keystone-6/core/access");
var import_fields31 = require("@keystone-6/core/fields");
var propertyHostHooks = hostScopedHooks("canManageProperties");
var archivedPropertyGuard = archivedRecordGuard("property");
var Property = (0, import_core30.list)({
  access: hostScopedListAccess("canReadProperties", "canManageProperties"),
  hooks: {
    resolveInput: propertyHostHooks.resolveInput,
    validate: async (args) => {
      if (args.operation === "delete") await historyDeleteGuard("Property")(args);
      await propertyHostHooks.validate(args);
      archivedPropertyGuard(args);
    }
  },
  ui: { listView: { initialColumns: ["name", "hostOrganization", "propertyType", "status", "timezone"] } },
  fields: {
    hostOrganization: (0, import_fields31.relationship)({ ref: "HostOrganization.properties" }),
    name: (0, import_fields31.text)({ validation: { isRequired: true } }),
    internalCode: (0, import_fields31.text)({ isIndexed: "unique" }),
    propertyType: (0, import_fields31.select)({
      type: "string",
      options: [
        { label: "House", value: "house" },
        { label: "Apartment Building", value: "apartment_building" },
        { label: "Cabin", value: "cabin" },
        { label: "Villa", value: "villa" },
        { label: "Cottage", value: "cottage" },
        { label: "Chalet", value: "chalet" },
        { label: "Condo", value: "condo" },
        { label: "Townhouse", value: "townhouse" },
        { label: "Unique Stay", value: "unique_stay" }
      ],
      defaultValue: "house"
    }),
    // Lifecycle moves only through the locked catalog transition command.
    status: (0, import_fields31.select)({
      type: "string",
      access: { update: () => false },
      options: [
        { label: "Onboarding", value: "onboarding" },
        { label: "Active", value: "active" },
        { label: "Paused", value: "paused" },
        { label: "Archived", value: "archived" }
      ],
      defaultValue: "onboarding"
    }),
    timezone: (0, import_fields31.text)({ defaultValue: "America/New_York", validation: { isRequired: true } }),
    checkInFrom: (0, import_fields31.text)({ defaultValue: "16:00" }),
    checkInUntil: (0, import_fields31.text)({ defaultValue: "22:00" }),
    checkOutBy: (0, import_fields31.text)({ defaultValue: "11:00" }),
    registrationNumber: (0, import_fields31.text)(),
    arrivalInstructions: (0, import_fields31.text)({
      validation: { length: { max: 4e3 } },
      ui: {
        displayMode: "textarea",
        description: "Entry, parking and access details. Shown only to guests with a confirmed stay, never on public listing pages."
      }
    }),
    internalNotes: (0, import_fields31.text)({ ui: { displayMode: "textarea" } }),
    address: (0, import_fields31.relationship)({ ref: "PropertyAddress.property" }),
    units: (0, import_fields31.relationship)({ ref: "AccommodationUnit.property", many: true, access: { create: import_access35.denyAll, update: import_access35.denyAll }, ui: { displayMode: "count" } }),
    listings: (0, import_fields31.relationship)({
      ref: "Listing.property",
      many: true,
      access: { read: permissions.canReadListings, create: import_access35.denyAll, update: import_access35.denyAll },
      ui: { displayMode: "count" }
    }),
    // Counts only (all, published, bookable online), readable with the property: a property
    // reader without listing access sees the true sellable state, not an empty relation.
    listingSummary: (0, import_fields31.virtual)({
      field: import_core30.graphql.field({
        type: import_core30.graphql.JSON,
        resolve: (item, _args, context) => propertyListingSummary(context.prisma, String(item.id))
      }),
      ui: { itemView: { fieldMode: "hidden" }, listView: { fieldMode: "hidden" }, createView: { fieldMode: "hidden" } }
    }),
    ownerAssignments: (0, import_fields31.relationship)({ ref: "PropertyOwnerAssignment.property", many: true, access: { create: import_access35.denyAll, update: import_access35.denyAll }, ui: { displayMode: "count" } }),
    tasks: (0, import_fields31.relationship)({ ref: "PropertyTask.property", many: true, access: { create: import_access35.denyAll, update: import_access35.denyAll }, ui: { displayMode: "count" } }),
    taskRules: (0, import_fields31.relationship)({ ref: "TaskRule.property", many: true, access: { create: import_access35.denyAll, update: import_access35.denyAll }, ui: { displayMode: "count" } }),
    ...trackingFields
  }
});

// features/keystone/models/PropertyAddress.ts
var import_core31 = require("@keystone-6/core");
var import_fields32 = require("@keystone-6/core/fields");
var PropertyAddress = (0, import_core31.list)({
  access: hostScopedListAccess("canReadProperties", "canManageProperties"),
  hooks: hostScopedHooks("canManageProperties", { parent: "property", foreignKeyOnParent: "addressId" }),
  ui: { listView: { initialColumns: ["property", "city", "region", "countryCode", "showExactAddressPublicly"] } },
  fields: {
    hostOrganization: (0, import_fields32.relationship)({ ref: "HostOrganization" }),
    property: (0, import_fields32.relationship)({ ref: "Property.address" }),
    addressLine1: (0, import_fields32.text)(),
    addressLine2: (0, import_fields32.text)(),
    city: (0, import_fields32.text)({ validation: { isRequired: true } }),
    region: (0, import_fields32.text)(),
    postalCode: (0, import_fields32.text)(),
    countryCode: (0, import_fields32.text)({ validation: { isRequired: true }, defaultValue: "US" }),
    latitude: (0, import_fields32.float)(),
    longitude: (0, import_fields32.float)(),
    publicLocationLabel: (0, import_fields32.text)(),
    showExactAddressPublicly: (0, import_fields32.checkbox)({ defaultValue: false }),
    ...trackingFields
  }
});

// features/keystone/models/PropertyOwner.ts
var import_core32 = require("@keystone-6/core");
var import_access38 = require("@keystone-6/core/access");
var import_fields33 = require("@keystone-6/core/fields");
var PropertyOwner = (0, import_core32.list)({
  access: hostScopedListAccess("canReadPayouts", "canManagePayouts"),
  hooks: withChecks(hostScopedHooks("canManagePayouts"), { delete: historyDeleteGuard("PropertyOwner") }),
  ui: { listView: { initialColumns: ["ownerNumber", "displayName", "companyName", "status", "payoutSchedule"] } },
  fields: {
    hostOrganization: (0, import_fields33.relationship)({ ref: "HostOrganization.propertyOwners" }),
    user: (0, import_fields33.relationship)({ ref: "User" }),
    ownerNumber: (0, import_fields33.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    displayName: (0, import_fields33.text)({ validation: { isRequired: true } }),
    companyName: (0, import_fields33.text)(),
    email: (0, import_fields33.text)({ validation: { isRequired: true } }),
    phone: (0, import_fields33.text)(),
    status: (0, import_fields33.select)({
      type: "string",
      options: [
        { label: "Invited", value: "invited" },
        { label: "Active", value: "active" },
        { label: "Suspended", value: "suspended" },
        { label: "Archived", value: "archived" }
      ],
      defaultValue: "invited"
    }),
    payoutSchedule: (0, import_fields33.select)({
      type: "string",
      options: [
        { label: "Monthly", value: "monthly" },
        { label: "Quarterly", value: "quarterly" },
        { label: "Manual", value: "manual" }
      ],
      defaultValue: "monthly"
    }),
    defaultManagerCommissionBasisPoints: (0, import_fields33.integer)({ defaultValue: 1500, validation: { min: 0, max: 1e4 } }),
    payoutMethod: (0, import_fields33.select)({
      type: "string",
      options: [
        { label: "Manual", value: "manual" },
        { label: "External bank transfer", value: "external_bank" },
        { label: "External payment provider", value: "external_provider" }
      ],
      defaultValue: "manual"
    }),
    payoutReference: (0, import_fields33.text)({ ui: { description: "Non-secret external payee or accounting reference." } }),
    taxProfile: (0, import_fields33.json)({
      defaultValue: {},
      ui: { description: "Non-secret tax classification and reporting metadata. Never store tax IDs or bank credentials here." }
    }),
    assignments: (0, import_fields33.relationship)({ ref: "PropertyOwnerAssignment.owner", many: true, ui: { displayMode: "count" } }),
    statements: (0, import_fields33.relationship)({
      ref: "OwnerStatement.owner",
      many: true,
      access: { create: import_access38.denyAll, update: import_access38.denyAll },
      ui: { displayMode: "count" }
    }),
    payouts: (0, import_fields33.relationship)({
      ref: "Payout.propertyOwner",
      many: true,
      access: { create: import_access38.denyAll, update: import_access38.denyAll },
      ui: { displayMode: "count" }
    }),
    ...trackingFields
  }
});

// features/keystone/models/PropertyOwnerAssignment.ts
var import_core33 = require("@keystone-6/core");
var import_fields34 = require("@keystone-6/core/fields");
var PropertyOwnerAssignment = (0, import_core33.list)({
  db: {
    extendPrismaSchema(schema) {
      return schema.replace(/\n}\s*$/, "\n\n  @@unique([propertyId, ownerId, effectiveFrom])\n}");
    }
  },
  access: hostScopedListAccess("canReadPayouts", "canManagePayouts"),
  hooks: hostScopedHooks("canManagePayouts"),
  ui: { listView: { initialColumns: ["owner", "property", "status", "ownershipBasisPoints", "managerCommissionBasisPoints", "effectiveFrom"] } },
  fields: {
    hostOrganization: (0, import_fields34.relationship)({ ref: "HostOrganization.propertyOwnerAssignments" }),
    owner: (0, import_fields34.relationship)({ ref: "PropertyOwner.assignments" }),
    property: (0, import_fields34.relationship)({ ref: "Property.ownerAssignments" }),
    status: (0, import_fields34.select)({
      type: "string",
      options: [
        { label: "Active", value: "active" },
        { label: "Ended", value: "ended" }
      ],
      defaultValue: "active"
    }),
    isPrimary: (0, import_fields34.checkbox)({ defaultValue: true }),
    ownershipBasisPoints: (0, import_fields34.integer)({ defaultValue: 1e4, validation: { min: 1, max: 1e4 } }),
    managerCommissionBasisPoints: (0, import_fields34.integer)({ defaultValue: 1500, validation: { min: 0, max: 1e4 } }),
    effectiveFrom: (0, import_fields34.text)({ validation: { isRequired: true }, ui: { description: "Inclusive date in YYYY-MM-DD format." } }),
    effectiveTo: (0, import_fields34.text)({ ui: { description: "Exclusive date in YYYY-MM-DD format." } }),
    notes: (0, import_fields34.text)({ ui: { displayMode: "textarea" } }),
    ...trackingFields
  }
});

// features/keystone/models/PropertyTask.ts
var import_core34 = require("@keystone-6/core");
var import_fields35 = require("@keystone-6/core/fields");

// features/keystone/utils/propertyTaskLifecycle.ts
var import_node_crypto3 = __toESM(require("node:crypto"));
var propertyTaskTypeOptions = [
  { label: "Turnover Cleaning", value: "turnover_cleaning" },
  { label: "Readiness Inspection", value: "readiness_inspection" },
  { label: "Property Maintenance", value: "property_maintenance" },
  { label: "Guest Request", value: "guest_request" },
  { label: "Restocking", value: "restocking" },
  { label: "Check-in Support", value: "check_in_support" }
];
var propertyTaskPriorityOptions = [
  { label: "Low", value: "low" },
  { label: "Normal", value: "normal" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" }
];
var taskRuleTriggerOptions = [
  { label: "Reservation confirmed", value: "reservation_confirmed" },
  { label: "Before check-in", value: "before_check_in" },
  { label: "After check-out", value: "after_check_out" },
  { label: "Reservation cancelled", value: "reservation_cancelled" },
  { label: "Calendar schedule", value: "calendar_schedule" }
];
var unsupportedTaskRuleTriggers = ["calendar_schedule"];
function isPropertyTaskType(value) {
  return propertyTaskTypeOptions.some((option) => option.value === value);
}
function isPropertyTaskPriority(value) {
  return propertyTaskPriorityOptions.some((option) => option.value === value);
}
var propertyTaskMessages = {
  propertyNotFound: "Property not found.",
  archivedProperty: "Archived properties can\u2019t take new tasks.",
  title: "Task title is required and must be at most 240 characters.",
  notes: "Task notes are too long.",
  taskType: "Choose a supported task type.",
  priority: "Choose a supported task priority.",
  dueInvalid: "The task due date and time are invalid.",
  dueZone: "The property\u2019s time zone changed. Review the due time and try again.",
  dueGap: "That time doesn\u2019t exist at the property because of a daylight-saving change.",
  zoneInvalid: "The property\u2019s time zone is invalid. Fix it before scheduling work.",
  listing: "Task listing must belong to the selected property and host organization.",
  reservation: "Task reservation must belong to the selected property and host organization.",
  reservationListing: "The selected stay is booked on a different listing.",
  assignee: "Task assignee must be an active member of the host organization.",
  staleAssignee: "This task\u2019s assignee is no longer an active member. Reassign it first.",
  checklistIncomplete: "Check every checklist item, or block the task with a reason.",
  workUnconfirmed: "Confirm the work is done before completing the task."
};
function propertyTaskRuleKey(ruleId, reservationId) {
  const digest3 = import_node_crypto3.default.createHash("sha256").update(`${ruleId.trim()}|${reservationId.trim()}`).digest("hex");
  return `property-task:${digest3}`;
}
function propertyTaskChecklist(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    if (typeof entry === "string") return entry;
    if (entry && typeof entry === "object") {
      const record5 = entry;
      const text50 = record5.label ?? record5.title ?? record5.item ?? record5.name;
      return typeof text50 === "string" ? text50 : "";
    }
    return "";
  }).map((item) => item.trim()).filter(Boolean);
}
async function isActiveTaskAssignee(tx, hostOrganizationId, userId) {
  if (!userId) return false;
  const membership = await tx.hostMembership.findFirst({
    where: { hostOrganizationId, userId, status: "active", user: { isActive: true } },
    select: { id: true }
  });
  return Boolean(membership);
}
function isValidTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(0);
    return true;
  } catch {
    return false;
  }
}
function validDateOnly2(value) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
function wallTime(instant, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(instant));
  const get = (type) => parts.find((part) => part.type === type)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")}T${String(Number(get("hour")) % 24).padStart(2, "0")}:${get("minute")}`;
}
var ZONED_LOCAL_DUE = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})\[([^\]]{1,64})\]$/;
var ABSOLUTE_DUE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
function resolvePropertyTaskDueAt(value, propertyTimeZone) {
  const raw = value?.trim() || "";
  if (!raw) return null;
  const local = ZONED_LOCAL_DUE.exec(raw);
  if (local) {
    const [, date, hour, minute, zone] = local;
    if (!isValidTimeZone(propertyTimeZone)) throw new Error(propertyTaskMessages.zoneInvalid);
    if (zone !== propertyTimeZone) throw new Error(propertyTaskMessages.dueZone);
    if (!validDateOnly2(date) || Number(hour) > 23 || Number(minute) > 59) throw new Error(propertyTaskMessages.dueInvalid);
    const instant = zonedLocalTimestamp(date, `${hour}:${minute}`, propertyTimeZone);
    if (wallTime(instant, propertyTimeZone) !== `${date}T${hour}:${minute}`) throw new Error(propertyTaskMessages.dueGap);
    return new Date(instant);
  }
  if (ABSOLUTE_DUE.test(raw)) {
    const instant = new Date(raw);
    if (!Number.isNaN(instant.getTime())) return instant;
  }
  throw new Error(propertyTaskMessages.dueInvalid);
}
function boundedNotes(notes) {
  const value = notes?.trim() || "";
  if (value.length > 4e3) throw new Error("Task completion notes are too long.");
  return value;
}
var DERIVED_EVIDENCE_KEYS = ["checkedItems", "checklist", "checklistConfirmed", "workConfirmed"];
function completionEvidenceFor(checklist, submitted) {
  const evidence = submitted ? structuredClone(submitted) : {};
  if (JSON.stringify(evidence).length > 16e3) throw new Error("Task completion evidence is too large.");
  const items = propertyTaskChecklist(checklist);
  const checkedItems = evidence.checkedItems;
  const ticked = new Set(Array.isArray(checkedItems) ? checkedItems.filter((item) => typeof item === "string") : []);
  if (items.length) {
    if (items.some((item) => !ticked.has(item))) throw new Error(propertyTaskMessages.checklistIncomplete);
  } else if (evidence.workConfirmed !== true && evidence.checklistConfirmed !== true) {
    throw new Error(propertyTaskMessages.workUnconfirmed);
  }
  const extra = Object.fromEntries(Object.entries(evidence).filter(([key]) => !DERIVED_EVIDENCE_KEYS.includes(key)));
  return { ...extra, checklist: items.map((item) => ({ item, checked: true })), checklistConfirmed: true, workConfirmed: true };
}
function applyPropertyTaskTransition(state, transition, now = /* @__PURE__ */ new Date()) {
  if (["completed", "cancelled"].includes(state.status)) throw new Error(`A ${state.status} task is terminal.`);
  switch (transition.action) {
    case "assign": {
      const assigneeId = transition.assigneeId?.trim();
      if (!assigneeId) throw new Error("Task assignee is required.");
      if (!["queued", "assigned", "blocked"].includes(state.status)) throw new Error(`Cannot assign a ${state.status} task.`);
      return { status: "assigned", assigneeId, claimedAt: now };
    }
    case "start":
      if (state.status !== "assigned" || !state.assigneeId) throw new Error("A task must be assigned before it can start.");
      return { status: "in_progress", startedAt: now };
    case "complete": {
      if (state.status !== "in_progress") throw new Error("A task must be in progress before completion.");
      const completionNotes = boundedNotes(transition.completionNotes);
      const completionEvidence = completionEvidenceFor(state.checklist, transition.completionEvidence);
      return {
        status: "completed",
        completedAt: now,
        ...completionNotes ? { completionNotes } : {},
        completionEvidence
      };
    }
    case "block": {
      const completionNotes = boundedNotes(transition.completionNotes);
      if (!completionNotes) throw new Error("A blocked task requires a reason.");
      return { status: "blocked", completionNotes };
    }
    case "cancel": {
      const completionNotes = boundedNotes(transition.completionNotes);
      return { status: "cancelled", cancelledAt: now, ...completionNotes ? { completionNotes } : {} };
    }
    case "reopen":
      if (state.status !== "blocked") throw new Error("Only a blocked task can be reopened.");
      return { status: state.assigneeId ? "assigned" : "queued", completionNotes: "" };
  }
}

// features/keystone/models/PropertyTask.ts
var PropertyTask = (0, import_core34.list)({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords("canReadProperties") }
  },
  hooks: hostScopedHooks("canManageProperties"),
  ui: { listView: { initialColumns: ["title", "taskType", "property", "reservation", "assignee", "status", "dueAt"] } },
  fields: {
    hostOrganization: (0, import_fields35.relationship)({ ref: "HostOrganization.tasks" }),
    property: (0, import_fields35.relationship)({ ref: "Property.tasks" }),
    listing: (0, import_fields35.relationship)({ ref: "Listing.tasks" }),
    reservation: (0, import_fields35.relationship)({ ref: "Reservation.tasks" }),
    taskRule: (0, import_fields35.relationship)({ ref: "TaskRule.tasks" }),
    assignee: (0, import_fields35.relationship)({ ref: "User.assignedPropertyTasks" }),
    idempotencyKey: (0, import_fields35.text)({ isIndexed: "unique" }),
    source: (0, import_fields35.select)({
      type: "string",
      options: [
        { label: "Manual", value: "manual" },
        { label: "Task rule", value: "task_rule" },
        { label: "System", value: "system" },
        { label: "Channel", value: "channel" }
      ],
      defaultValue: "manual"
    }),
    title: (0, import_fields35.text)({ validation: { isRequired: true } }),
    taskType: (0, import_fields35.select)({
      type: "string",
      options: propertyTaskTypeOptions,
      defaultValue: "turnover_cleaning"
    }),
    status: (0, import_fields35.select)({
      type: "string",
      options: [
        { label: "Queued", value: "queued" },
        { label: "Assigned", value: "assigned" },
        { label: "In Progress", value: "in_progress" },
        { label: "Completed", value: "completed" },
        { label: "Blocked", value: "blocked" },
        { label: "Cancelled", value: "cancelled" }
      ],
      defaultValue: "queued"
    }),
    priority: (0, import_fields35.select)({
      type: "string",
      options: propertyTaskPriorityOptions,
      defaultValue: "normal"
    }),
    dueAt: (0, import_fields35.timestamp)(),
    claimedAt: (0, import_fields35.timestamp)(),
    startedAt: (0, import_fields35.timestamp)(),
    completedAt: (0, import_fields35.timestamp)(),
    cancelledAt: (0, import_fields35.timestamp)(),
    checklist: (0, import_fields35.json)(),
    completionEvidence: (0, import_fields35.json)({ access: { update: () => false }, ui: { itemView: { fieldMode: "read" } } }),
    completionNotes: (0, import_fields35.text)({ ui: { displayMode: "textarea" } }),
    notes: (0, import_fields35.text)({ ui: { displayMode: "textarea" } }),
    ...trackingFields
  }
});

// features/keystone/models/RatePlan.ts
var import_core35 = require("@keystone-6/core");
var import_fields36 = require("@keystone-6/core/fields");
var RatePlan = (0, import_core35.list)({
  access: hostScopedListAccess("canReadPricing", "canManagePricing"),
  hooks: withChecks(hostScopedHooks("canManagePricing", { parent: "listing" }), { delete: historyDeleteGuard("RatePlan") }),
  ui: { listView: { initialColumns: ["name", "listing", "baseNightlyRateCents", "minimumStay", "status"] } },
  fields: {
    hostOrganization: (0, import_fields36.relationship)({ ref: "HostOrganization" }),
    listing: (0, import_fields36.relationship)({ ref: "Listing.ratePlans" }),
    cancellationPolicy: (0, import_fields36.relationship)({ ref: "CancellationPolicy.ratePlans" }),
    name: (0, import_fields36.text)({ validation: { isRequired: true } }),
    description: (0, import_fields36.text)({ ui: { displayMode: "textarea" } }),
    status: (0, import_fields36.select)({
      type: "string",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Active", value: "active" },
        { label: "Archived", value: "archived" }
      ],
      defaultValue: "draft"
    }),
    currencyCode: (0, import_fields36.text)({ defaultValue: "USD", validation: { isRequired: true } }),
    baseNightlyRateCents: (0, import_fields36.integer)({ defaultValue: 0, validation: { min: 0 } }),
    minimumStay: (0, import_fields36.integer)({ defaultValue: 1, validation: { min: 1 } }),
    maximumStay: (0, import_fields36.integer)({ validation: { min: 1 } }),
    advanceNoticeHours: (0, import_fields36.integer)({ defaultValue: 24, validation: { min: 0 }, ui: { description: "Minimum hours between booking and check-in (at the property\u2019s check-in time). Enforced in search, quotes and booking." } }),
    bookingWindowDays: (0, import_fields36.integer)({ defaultValue: 365, validation: { min: 1 }, ui: { description: "How many days ahead a check-in can be booked. Enforced in search, quotes and booking." } }),
    weeklyDiscountBasisPoints: (0, import_fields36.integer)({ defaultValue: 0, validation: { min: 0, max: 9e3 }, ui: { description: "Discount on the nightly rates for stays of 7 nights or more, in basis points (1000 = 10%)." } }),
    monthlyDiscountBasisPoints: (0, import_fields36.integer)({ defaultValue: 0, validation: { min: 0, max: 9e3 }, ui: { description: "Discount on the nightly rates for stays of 28 nights or more, in basis points (2000 = 20%). Replaces the weekly discount." } }),
    isDefault: (0, import_fields36.checkbox)({ defaultValue: false }),
    seasonalRates: (0, import_fields36.relationship)({ ref: "SeasonalRate.ratePlan", many: true }),
    quotes: (0, import_fields36.relationship)({ ref: "StayQuote.ratePlan", many: true, access: { create: () => false, update: () => false }, ui: { displayMode: "count" } }),
    ...trackingFields
  }
});

// features/keystone/models/Refund.ts
var import_core36 = require("@keystone-6/core");
var import_fields37 = require("@keystone-6/core/fields");
var Refund = (0, import_core36.list)({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords("canReadPayments") }
  },
  ui: { listView: { initialColumns: ["refundNumber", "reservation", "payment", "status", "amountCents", "processedAt"] } },
  fields: {
    hostOrganization: (0, import_fields37.relationship)({ ref: "HostOrganization" }),
    reservation: (0, import_fields37.relationship)({ ref: "Reservation.refunds" }),
    payment: (0, import_fields37.relationship)({ ref: "Payment.refunds" }),
    reservationAmendment: (0, import_fields37.relationship)({ ref: "ReservationAmendment.refunds", access: { create: () => false, update: () => false } }),
    refundNumber: (0, import_fields37.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    idempotencyKey: (0, import_fields37.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    status: (0, import_fields37.select)({
      type: "string",
      options: [
        // A refund the cancellation policy couldn't assess: a candidate for the host's review,
        // not money owed until the host assesses it (it then becomes pending) or declines it.
        { label: "Under review (not owed yet)", value: "review" },
        { label: "Pending", value: "pending" },
        { label: "Processing", value: "processing" },
        { label: "Succeeded (recorded)", value: "succeeded" },
        { label: "Failed", value: "failed" },
        { label: "Cancelled", value: "cancelled" }
      ],
      defaultValue: "pending"
    }),
    reason: (0, import_fields37.select)({
      type: "string",
      options: [
        { label: "Guest cancellation", value: "guest_cancellation" },
        { label: "Host cancellation", value: "host_cancellation" },
        { label: "Stay issue", value: "stay_issue" },
        { label: "Stay amendment", value: "stay_amendment" },
        { label: "Overpayment", value: "overpayment" },
        { label: "Goodwill", value: "goodwill" },
        { label: "Other", value: "other" }
      ],
      defaultValue: "other"
    }),
    amountCents: (0, import_fields37.integer)({ validation: { isRequired: true, min: 1 } }),
    currencyCode: (0, import_fields37.text)({ defaultValue: "USD" }),
    providerRefundId: (0, import_fields37.text)({
      isIndexed: "unique",
      db: { isNullable: true },
      ui: { description: "External provider reference only. Manual refund liabilities and attestations do not receive a provider ID." }
    }),
    processedAt: (0, import_fields37.timestamp)(),
    data: (0, import_fields37.json)(),
    ...trackingFields
  }
});

// features/keystone/models/Reservation.ts
var import_core37 = require("@keystone-6/core");
var import_access44 = require("@keystone-6/core/access");
var import_fields38 = require("@keystone-6/core/fields");
var Reservation = (0, import_core37.list)({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords("canReadReservations") }
  },
  ui: {
    listView: { initialColumns: ["confirmationCode", "status", "listing", "guest", "checkInDate", "checkOutDate", "totalAmountCents"] }
  },
  fields: {
    hostOrganization: (0, import_fields38.relationship)({ ref: "HostOrganization.reservations" }),
    listing: (0, import_fields38.relationship)({ ref: "Listing.reservations" }),
    accommodationUnit: (0, import_fields38.relationship)({ ref: "AccommodationUnit.reservations" }),
    guest: (0, import_fields38.relationship)({ ref: "GuestProfile.reservations" }),
    guestParty: (0, import_fields38.relationship)({ ref: "GuestParty.reservation" }),
    bookedBy: (0, import_fields38.relationship)({
      ref: "User.customerReservations",
      access: { read: permissions.canReadReservations, create: import_access44.denyAll, update: import_access44.denyAll },
      ui: { itemView: { fieldMode: "read" }, createView: { fieldMode: "hidden" } }
    }),
    quote: (0, import_fields38.relationship)({ ref: "StayQuote.reservation" }),
    confirmationCode: (0, import_fields38.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    tripTokenHash: (0, import_fields38.text)({
      validation: { isRequired: true },
      isIndexed: "unique",
      access: { read: permissions.canManageReservations, update: () => false },
      ui: { itemView: { fieldMode: "hidden" }, createView: { fieldMode: "hidden" }, listView: { fieldMode: "hidden" } }
    }),
    tripTokenExpiresAt: (0, import_fields38.timestamp)({ validation: { isRequired: true } }),
    tripTokenRevokedAt: (0, import_fields38.timestamp)(),
    status: (0, import_fields38.select)({
      type: "string",
      options: [
        { label: "Inquiry", value: "inquiry" },
        { label: "Quoted", value: "quoted" },
        { label: "Pending", value: "pending" },
        { label: "Confirmed", value: "confirmed" },
        { label: "In Stay", value: "in_stay" },
        { label: "Completed", value: "completed" },
        { label: "Cancelled", value: "cancelled" },
        { label: "No-show", value: "no_show" }
      ],
      defaultValue: "pending"
    }),
    testMode: (0, import_fields38.checkbox)({
      defaultValue: false,
      access: { create: import_access44.denyAll, update: import_access44.denyAll },
      ui: {
        description: "A test booking the guest explicitly chose at checkout (store permission and Stripe test mode required). It holds no dates, takes only test-card payments, and is kept out of real money, statements and reports.",
        itemView: { fieldMode: "read" },
        createView: { fieldMode: "hidden" }
      }
    }),
    paymentStatus: (0, import_fields38.select)({
      type: "string",
      options: [
        { label: "Unpaid", value: "unpaid" },
        { label: "Partial", value: "partial" },
        { label: "Paid", value: "paid" },
        { label: "Partially Refunded", value: "partially_refunded" },
        { label: "Refund Pending", value: "refund_pending" },
        { label: "Refunded", value: "refunded" }
      ],
      defaultValue: "unpaid"
    }),
    source: (0, import_fields38.select)({
      type: "string",
      options: [
        { label: "Direct", value: "direct" },
        { label: "Operator", value: "operator" },
        { label: "Airbnb", value: "airbnb" },
        { label: "Vrbo", value: "vrbo" },
        { label: "Booking.com", value: "booking_com" },
        { label: "PMS", value: "pms" },
        { label: "iCal", value: "ical" }
      ],
      defaultValue: "direct"
    }),
    checkInDate: (0, import_fields38.text)({ validation: { isRequired: true } }),
    checkOutDate: (0, import_fields38.text)({ validation: { isRequired: true } }),
    scheduledCheckInTime: (0, import_fields38.text)(),
    scheduledCheckOutTime: (0, import_fields38.text)(),
    checkedInAt: (0, import_fields38.timestamp)(),
    checkedOutAt: (0, import_fields38.timestamp)(),
    cancelledAt: (0, import_fields38.timestamp)(),
    cancellationReason: (0, import_fields38.text)({ ui: { displayMode: "textarea" } }),
    cancelledBy: (0, import_fields38.select)({
      type: "string",
      options: [
        { label: "Guest", value: "guest" },
        { label: "Host", value: "host" },
        { label: "System", value: "system" },
        { label: "Channel", value: "channel" }
      ]
    }),
    currencyCode: (0, import_fields38.text)({ defaultValue: "USD", validation: { isRequired: true } }),
    lodgingSubtotalCents: (0, import_fields38.integer)({ defaultValue: 0, validation: { min: 0 } }),
    feeTotalCents: (0, import_fields38.integer)({ defaultValue: 0, validation: { min: 0 } }),
    taxTotalCents: (0, import_fields38.integer)({ defaultValue: 0, validation: { min: 0 } }),
    discountTotalCents: (0, import_fields38.integer)({ defaultValue: 0, validation: { min: 0 } }),
    securityDepositCents: (0, import_fields38.integer)({ defaultValue: 0, validation: { min: 0 } }),
    totalAmountCents: (0, import_fields38.integer)({ defaultValue: 0, validation: { min: 0 } }),
    amountPaidCents: (0, import_fields38.integer)({ defaultValue: 0, validation: { min: 0 } }),
    bookingSnapshot: (0, import_fields38.json)({ access: { update: () => false }, ui: { itemView: { fieldMode: "read" } } }),
    fixtureOrigin: (0, import_fields38.text)({
      db: { isNullable: true },
      access: { create: import_access44.denyAll, update: import_access44.denyAll },
      ui: {
        description: "Set only for onboarding sample stays, from setup lineage. A sample holds no real capacity, money, earnings or guest assent.",
        itemView: { fieldMode: "read" },
        createView: { fieldMode: "hidden" }
      }
    }),
    fixtureEvidence: (0, import_fields38.json)({
      access: { create: import_access44.denyAll, update: import_access44.denyAll },
      ui: { description: "How this stay was identified as a setup sample (setup run, or an exact setup identity).", itemView: { fieldMode: "read" }, createView: { fieldMode: "hidden" }, listView: { fieldMode: "hidden" } }
    }),
    tripLinkDelivery: (0, import_fields38.json)({
      access: { create: import_access44.denyAll, update: import_access44.denyAll },
      ui: {
        description: "Last emailed trip-link delivery from Find my trip: attempt id, status (sending, sent, failed, unknown) and times. Never holds a link.",
        itemView: { fieldMode: "read" },
        createView: { fieldMode: "hidden" },
        listView: { fieldMode: "hidden" }
      }
    }),
    guestNotes: (0, import_fields38.text)({ ui: { displayMode: "textarea" } }),
    internalNotes: (0, import_fields38.text)({ ui: { displayMode: "textarea" } }),
    lineItems: (0, import_fields38.relationship)({ ref: "ReservationLineItem.reservation", many: true, ui: { displayMode: "count" } }),
    amendments: (0, import_fields38.relationship)({ ref: "ReservationAmendment.reservation", many: true, access: { create: () => false, update: () => false }, ui: { displayMode: "count" } }),
    calendarBlocks: (0, import_fields38.relationship)({
      ref: "CalendarBlock.reservation",
      many: true,
      access: { create: import_access44.denyAll, update: import_access44.denyAll },
      ui: { displayMode: "count" }
    }),
    agreement: (0, import_fields38.relationship)({ ref: "StayAgreement.reservation" }),
    securityDeposit: (0, import_fields38.relationship)({ ref: "SecurityDeposit.reservation" }),
    damageClaims: (0, import_fields38.relationship)({ ref: "DamageClaim.reservation", many: true, ui: { displayMode: "count" } }),
    payments: (0, import_fields38.relationship)({ ref: "Payment.reservation", many: true, ui: { displayMode: "count" } }),
    refunds: (0, import_fields38.relationship)({ ref: "Refund.reservation", many: true, ui: { displayMode: "count" } }),
    payout: (0, import_fields38.relationship)({ ref: "Payout.reservation" }),
    conversation: (0, import_fields38.relationship)({ ref: "Conversation.reservation" }),
    reviews: (0, import_fields38.relationship)({ ref: "Review.reservation", many: true, ui: { displayMode: "count" } }),
    channelReservation: (0, import_fields38.relationship)({ ref: "ChannelReservation.reservation" }),
    tasks: (0, import_fields38.relationship)({ ref: "PropertyTask.reservation", many: true, ui: { displayMode: "count" } }),
    ...trackingFields
  }
});

// features/keystone/models/ReservationAmendment.ts
var import_core38 = require("@keystone-6/core");
var import_fields39 = require("@keystone-6/core/fields");
var ReservationAmendment = (0, import_core38.list)({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords("canReadReservations") }
  },
  ui: { listView: { initialColumns: ["reservation", "previousCheckInDate", "previousCheckOutDate", "checkInDate", "checkOutDate", "reason"] } },
  fields: {
    hostOrganization: (0, import_fields39.relationship)({ ref: "HostOrganization.reservationAmendments", access: { create: () => false, update: () => false } }),
    reservation: (0, import_fields39.relationship)({ ref: "Reservation.amendments", access: { create: () => false, update: () => false } }),
    idempotencyKey: (0, import_fields39.text)({ isIndexed: "unique", access: { update: () => false } }),
    requestHash: (0, import_fields39.text)({ access: { update: () => false } }),
    actorUserId: (0, import_fields39.text)({ access: { update: () => false } }),
    reason: (0, import_fields39.text)({ access: { update: () => false }, ui: { displayMode: "textarea" } }),
    previousCheckInDate: (0, import_fields39.text)({ access: { update: () => false } }),
    previousCheckOutDate: (0, import_fields39.text)({ access: { update: () => false } }),
    checkInDate: (0, import_fields39.text)({ access: { update: () => false } }),
    checkOutDate: (0, import_fields39.text)({ access: { update: () => false } }),
    currencyCode: (0, import_fields39.text)({ access: { update: () => false } }),
    originalBookingSnapshotHash: (0, import_fields39.text)({ access: { update: () => false } }),
    beforeSnapshot: (0, import_fields39.json)({ access: { update: () => false }, ui: { itemView: { fieldMode: "read" } } }),
    afterSnapshot: (0, import_fields39.json)({ access: { update: () => false }, ui: { itemView: { fieldMode: "read" } } }),
    delta: (0, import_fields39.json)({ access: { update: () => false }, ui: { itemView: { fieldMode: "read" } } }),
    refunds: (0, import_fields39.relationship)({ ref: "Refund.reservationAmendment", many: true, access: { create: () => false, update: () => false }, ui: { displayMode: "count" } }),
    ...trackingFields
  }
});

// features/keystone/models/ReservationLineItem.ts
var import_core39 = require("@keystone-6/core");
var import_fields40 = require("@keystone-6/core/fields");
var ReservationLineItem = (0, import_core39.list)({
  access: {
    operation: {
      query: isSignedIn,
      create: () => false,
      update: () => false,
      delete: () => false
    },
    filter: { query: rules.canReadHostScopedRecords("canReadReservations") }
  },
  hooks: hostScopedHooks("canManageReservations"),
  ui: { listView: { initialColumns: ["reservation", "lineType", "description", "serviceDate", "totalAmountCents"] } },
  fields: {
    hostOrganization: (0, import_fields40.relationship)({ ref: "HostOrganization" }),
    reservation: (0, import_fields40.relationship)({ ref: "Reservation.lineItems" }),
    snapshotKey: (0, import_fields40.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    lineType: (0, import_fields40.select)({
      type: "string",
      options: [
        { label: "Night", value: "night" },
        { label: "Cleaning Fee", value: "cleaning_fee" },
        { label: "Service Fee", value: "service_fee" },
        { label: "Pet Fee", value: "pet_fee" },
        { label: "Guest Fee", value: "guest_fee" },
        { label: "Tax", value: "tax" },
        { label: "Discount", value: "discount" },
        { label: "Security Deposit", value: "security_deposit" },
        { label: "Adjustment", value: "adjustment" }
      ],
      defaultValue: "night"
    }),
    description: (0, import_fields40.text)({ validation: { isRequired: true } }),
    serviceDate: (0, import_fields40.text)(),
    quantity: (0, import_fields40.integer)({ defaultValue: 1, validation: { min: 1 } }),
    unitAmountCents: (0, import_fields40.integer)({ validation: { isRequired: true } }),
    totalAmountCents: (0, import_fields40.integer)({ validation: { isRequired: true } }),
    currencyCode: (0, import_fields40.text)({ defaultValue: "USD", validation: { isRequired: true } }),
    metadataSnapshot: (0, import_fields40.json)({ access: { update: () => false }, ui: { itemView: { fieldMode: "read" } } }),
    ...trackingFields
  }
});

// features/keystone/models/Review.ts
var import_core40 = require("@keystone-6/core");
var import_fields41 = require("@keystone-6/core/fields");
var Review = (0, import_core40.list)({
  // Written only by domain commands, so authors, delivery, moderation and history can't be forged.
  access: hostScopedDomainOwnedListAccess("canReadReviews"),
  hooks: hostScopedHooks("canManageReviews"),
  ui: { listView: { initialColumns: ["reservation", "listing", "direction", "overallRating", "status", "publishedAt"] } },
  fields: {
    hostOrganization: (0, import_fields41.relationship)({ ref: "HostOrganization.reviews" }),
    reservation: (0, import_fields41.relationship)({ ref: "Reservation.reviews" }),
    listing: (0, import_fields41.relationship)({ ref: "Listing.reviews" }),
    guest: (0, import_fields41.relationship)({ ref: "GuestProfile.reviews" }),
    authorUser: (0, import_fields41.relationship)({ ref: "User.authoredReviews" }),
    direction: (0, import_fields41.select)({
      type: "string",
      options: [
        { label: "Guest to Host/Listing", value: "guest_to_host" },
        { label: "Host to Guest", value: "host_to_guest" }
      ],
      defaultValue: "guest_to_host"
    }),
    status: (0, import_fields41.select)({
      type: "string",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Submitted / Held", value: "submitted" },
        { label: "Published", value: "published" },
        { label: "Removed", value: "removed" }
      ],
      defaultValue: "draft"
    }),
    overallRating: (0, import_fields41.integer)({ validation: { min: 1, max: 5 } }),
    cleanlinessRating: (0, import_fields41.integer)({ validation: { min: 1, max: 5 } }),
    accuracyRating: (0, import_fields41.integer)({ validation: { min: 1, max: 5 } }),
    communicationRating: (0, import_fields41.integer)({ validation: { min: 1, max: 5 } }),
    locationRating: (0, import_fields41.integer)({ validation: { min: 1, max: 5 } }),
    valueRating: (0, import_fields41.integer)({ validation: { min: 1, max: 5 } }),
    body: (0, import_fields41.text)({ ui: { displayMode: "textarea" } }),
    privateFeedback: (0, import_fields41.text)({ ui: { displayMode: "textarea" } }),
    submittedAt: (0, import_fields41.timestamp)(),
    publishAfter: (0, import_fields41.timestamp)({ ui: { description: "Publish when both sides submit or the review window closes." } }),
    publishedAt: (0, import_fields41.timestamp)(),
    ...trackingFields
  }
});

// features/keystone/models/Role.ts
var import_core41 = require("@keystone-6/core");
var import_access49 = require("@keystone-6/core/access");
var import_fields42 = require("@keystone-6/core/fields");
var Role = (0, import_core41.list)({
  hooks: { validateDelete: historyDeleteGuard("Role") },
  access: {
    operation: {
      ...(0, import_access49.allOperations)(permissions.canManageRoles),
      query: (args) => isSignedIn(args) && permissions.canAccessDashboard(args)
    }
  },
  ui: {
    hideCreate: (args) => !permissions.canManageRoles(args),
    hideDelete: (args) => !permissions.canManageRoles(args),
    listView: { initialColumns: ["name"] },
    itemView: { defaultFieldMode: (args) => permissions.canManageRoles(args) ? "edit" : "read" }
  },
  fields: {
    name: (0, import_fields42.text)({ validation: { isRequired: true } }),
    canAccessDashboard: (0, import_fields42.checkbox)({ defaultValue: false }),
    canReadProperties: (0, import_fields42.checkbox)({ defaultValue: false }),
    canManageProperties: (0, import_fields42.checkbox)({ defaultValue: false }),
    canReadListings: (0, import_fields42.checkbox)({ defaultValue: false }),
    canManageListings: (0, import_fields42.checkbox)({ defaultValue: false }),
    canReadCalendar: (0, import_fields42.checkbox)({ defaultValue: false }),
    canManageCalendar: (0, import_fields42.checkbox)({ defaultValue: false }),
    canReadPricing: (0, import_fields42.checkbox)({ defaultValue: false }),
    canManagePricing: (0, import_fields42.checkbox)({ defaultValue: false }),
    canReadReservations: (0, import_fields42.checkbox)({ defaultValue: false }),
    canManageReservations: (0, import_fields42.checkbox)({ defaultValue: false }),
    canReadGuests: (0, import_fields42.checkbox)({ defaultValue: false }),
    canManageGuests: (0, import_fields42.checkbox)({ defaultValue: false }),
    canReadMessages: (0, import_fields42.checkbox)({ defaultValue: false }),
    canManageMessages: (0, import_fields42.checkbox)({ defaultValue: false }),
    canReadChannels: (0, import_fields42.checkbox)({ defaultValue: false }),
    canManageChannels: (0, import_fields42.checkbox)({ defaultValue: false }),
    canReadPayouts: (0, import_fields42.checkbox)({ defaultValue: false }),
    canManagePayouts: (0, import_fields42.checkbox)({ defaultValue: false }),
    canReadReviews: (0, import_fields42.checkbox)({ defaultValue: false }),
    canManageReviews: (0, import_fields42.checkbox)({ defaultValue: false }),
    canReadPayments: (0, import_fields42.checkbox)({ defaultValue: false }),
    canManagePayments: (0, import_fields42.checkbox)({ defaultValue: false }),
    canReadReports: (0, import_fields42.checkbox)({ defaultValue: false }),
    canManageReports: (0, import_fields42.checkbox)({ defaultValue: false }),
    canSeeOtherPeople: (0, import_fields42.checkbox)({ defaultValue: false }),
    canEditOtherPeople: (0, import_fields42.checkbox)({ defaultValue: false }),
    canManagePeople: (0, import_fields42.checkbox)({ defaultValue: false }),
    canManageRoles: (0, import_fields42.checkbox)({ defaultValue: false }),
    canManageOnboarding: (0, import_fields42.checkbox)({ defaultValue: false }),
    canManageSettings: (0, import_fields42.checkbox)({ defaultValue: false }),
    assignedTo: (0, import_fields42.relationship)({ ref: "User.role", many: true, ui: { displayMode: "count", itemView: { fieldMode: "read" } } }),
    ...trackingFields
  }
});

// features/keystone/models/SeasonalRate.ts
var import_core42 = require("@keystone-6/core");
var import_fields43 = require("@keystone-6/core/fields");
var SeasonalRate = (0, import_core42.list)({
  access: hostScopedListAccess("canReadPricing", "canManagePricing"),
  hooks: withChecks(hostScopedHooks("canManagePricing"), {
    input: ({ resolvedData, item, addValidationError }) => {
      const problem = dateRangeProblem(resolvedData.startDate ?? item?.startDate, resolvedData.endDate ?? item?.endDate, "A season");
      if (problem) addValidationError(problem);
    }
  }),
  ui: { listView: { initialColumns: ["name", "ratePlan", "startDate", "endDate", "nightlyRateCents", "priority", "isActive"] } },
  fields: {
    hostOrganization: (0, import_fields43.relationship)({ ref: "HostOrganization" }),
    ratePlan: (0, import_fields43.relationship)({ ref: "RatePlan.seasonalRates" }),
    name: (0, import_fields43.text)({ validation: { isRequired: true } }),
    startDate: (0, import_fields43.text)({ validation: { isRequired: true }, ui: { description: "Inclusive YYYY-MM-DD." } }),
    endDate: (0, import_fields43.text)({ validation: { isRequired: true }, ui: { description: "Exclusive YYYY-MM-DD." } }),
    nightlyRateCents: (0, import_fields43.integer)({ validation: { min: 0 } }),
    adjustmentBasisPoints: (0, import_fields43.integer)(),
    minimumStay: (0, import_fields43.integer)({ validation: { min: 1 } }),
    priority: (0, import_fields43.integer)({ defaultValue: 0 }),
    isActive: (0, import_fields43.checkbox)({ defaultValue: true }),
    ...trackingFields
  }
});

// features/keystone/models/SecurityDeposit.ts
var import_core43 = require("@keystone-6/core");
var import_fields44 = require("@keystone-6/core/fields");
var SecurityDeposit = (0, import_core43.list)({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords("canReadReservations") }
  },
  ui: { listView: { initialColumns: ["depositNumber", "reservation", "status", "amountCents", "heldAt", "releasedAt"] } },
  fields: {
    hostOrganization: (0, import_fields44.relationship)({ ref: "HostOrganization" }),
    reservation: (0, import_fields44.relationship)({ ref: "Reservation.securityDeposit" }),
    payment: (0, import_fields44.relationship)({ ref: "Payment.securityDeposits" }),
    depositNumber: (0, import_fields44.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    status: (0, import_fields44.select)({
      type: "string",
      options: [
        { label: "Required", value: "required" },
        { label: "Authorized", value: "authorized" },
        { label: "Held", value: "held" },
        { label: "Partially Captured", value: "partially_captured" },
        { label: "Captured", value: "captured" },
        { label: "Released", value: "released" },
        { label: "Failed", value: "failed" }
      ],
      defaultValue: "required"
    }),
    amountCents: (0, import_fields44.integer)({ defaultValue: 0, validation: { min: 0 } }),
    capturedAmountCents: (0, import_fields44.integer)({ defaultValue: 0, validation: { min: 0 } }),
    currencyCode: (0, import_fields44.text)({ defaultValue: "USD", validation: { isRequired: true } }),
    heldAt: (0, import_fields44.timestamp)(),
    releasedAt: (0, import_fields44.timestamp)(),
    providerReference: (0, import_fields44.text)(),
    metadata: (0, import_fields44.json)(),
    ...trackingFields
  }
});

// features/keystone/models/StayAgreement.ts
var import_core44 = require("@keystone-6/core");
var import_fields45 = require("@keystone-6/core/fields");
var StayAgreement = (0, import_core44.list)({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords("canReadReservations") }
  },
  ui: { listView: { initialColumns: ["agreementNumber", "reservation", "status", "signerEmail", "signedAt"] } },
  fields: {
    hostOrganization: (0, import_fields45.relationship)({ ref: "HostOrganization" }),
    reservation: (0, import_fields45.relationship)({ ref: "Reservation.agreement" }),
    guest: (0, import_fields45.relationship)({ ref: "GuestProfile" }),
    cancellationPolicy: (0, import_fields45.relationship)({ ref: "CancellationPolicy.agreements" }),
    agreementNumber: (0, import_fields45.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    signingTokenHash: (0, import_fields45.text)({
      isIndexed: "unique",
      access: { read: permissions.canManageReservations, update: () => false },
      ui: { itemView: { fieldMode: "hidden" }, createView: { fieldMode: "hidden" }, listView: { fieldMode: "hidden" } }
    }),
    signingTokenExpiresAt: (0, import_fields45.timestamp)(),
    signingTokenRevokedAt: (0, import_fields45.timestamp)(),
    status: (0, import_fields45.select)({
      type: "string",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Sent", value: "sent" },
        { label: "Signed", value: "signed" },
        { label: "Voided", value: "voided" }
      ],
      defaultValue: "draft"
    }),
    title: (0, import_fields45.text)({ validation: { isRequired: true } }),
    signerEmail: (0, import_fields45.text)({ validation: { isRequired: true } }),
    signatureName: (0, import_fields45.text)(),
    signedAt: (0, import_fields45.timestamp)(),
    termsSnapshot: (0, import_fields45.json)({ access: { update: () => false }, ui: { itemView: { fieldMode: "read" } } }),
    signatureEvidence: (0, import_fields45.json)({
      access: { create: () => false, update: () => false },
      ui: { description: "What the guest accepted when signing: time, statement and terms fingerprint.", itemView: { fieldMode: "read" }, createView: { fieldMode: "hidden" } }
    }),
    ...trackingFields
  }
});

// features/keystone/models/StayCollection.ts
var import_core45 = require("@keystone-6/core");
var import_fields46 = require("@keystone-6/core/fields");
var StayCollection = (0, import_core45.list)({
  access: {
    operation: {
      query: permissions.canReadListings,
      create: permissions.canManageListings,
      update: permissions.canManageListings,
      delete: permissions.canManageListings
    }
  },
  ui: { listView: { initialColumns: ["name", "slug", "isActive"] } },
  fields: {
    name: (0, import_fields46.text)({ validation: { isRequired: true } }),
    slug: (0, import_fields46.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    description: (0, import_fields46.text)({ ui: { displayMode: "textarea" } }),
    isActive: (0, import_fields46.checkbox)({ defaultValue: true }),
    // Listings join collections from their own side, under host validation.
    listings: (0, import_fields46.relationship)({ ref: "Listing.collections", many: true, access: { create: () => false, update: () => false }, ui: { displayMode: "count" } }),
    ...trackingFields
  }
});

// features/keystone/models/StayQuote.ts
var import_core46 = require("@keystone-6/core");
var import_fields47 = require("@keystone-6/core/fields");
var issuedQuoteAccess = hostScopedListAccess("canReadReservations", "canManageReservations");
var StayQuote = (0, import_core46.list)({
  // Issued quote terms are append-only evidence; changes require a fresh quote.
  // Internal booking consumption continues through the transaction's Prisma client.
  access: {
    ...issuedQuoteAccess,
    operation: { ...issuedQuoteAccess.operation, update: () => false, delete: () => false },
    filter: { ...issuedQuoteAccess.filter, update: () => false, delete: () => false }
  },
  hooks: hostScopedHooks("canManageReservations"),
  ui: { listView: { initialColumns: ["quoteNumber", "listing", "checkInDate", "checkOutDate", "totalAmountCents", "status", "expiresAt"] } },
  fields: {
    hostOrganization: (0, import_fields47.relationship)({ ref: "HostOrganization" }),
    listing: (0, import_fields47.relationship)({ ref: "Listing.quotes" }),
    ratePlan: (0, import_fields47.relationship)({ ref: "RatePlan.quotes" }),
    reservation: (0, import_fields47.relationship)({ ref: "Reservation.quote", access: { create: () => false, update: () => false } }),
    quoteNumber: (0, import_fields47.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    tokenHash: (0, import_fields47.text)({
      validation: { isRequired: true },
      isIndexed: "unique",
      access: { read: permissions.canManageReservations, update: () => false },
      ui: { itemView: { fieldMode: "hidden" }, createView: { fieldMode: "hidden" }, listView: { fieldMode: "hidden" } }
    }),
    status: (0, import_fields47.select)({
      type: "string",
      options: [
        { label: "Active", value: "active" },
        { label: "Consumed", value: "consumed" },
        { label: "Expired", value: "expired" },
        { label: "Cancelled", value: "cancelled" }
      ],
      defaultValue: "active"
    }),
    checkInDate: (0, import_fields47.text)({ validation: { isRequired: true } }),
    checkOutDate: (0, import_fields47.text)({ validation: { isRequired: true } }),
    adults: (0, import_fields47.integer)({ defaultValue: 1, validation: { min: 1 } }),
    children: (0, import_fields47.integer)({ defaultValue: 0, validation: { min: 0 } }),
    infants: (0, import_fields47.integer)({ defaultValue: 0, validation: { min: 0 } }),
    pets: (0, import_fields47.integer)({ defaultValue: 0, validation: { min: 0 } }),
    currencyCode: (0, import_fields47.text)({ validation: { isRequired: true }, defaultValue: "USD" }),
    lodgingSubtotalCents: (0, import_fields47.integer)({ defaultValue: 0, validation: { min: 0 } }),
    feeTotalCents: (0, import_fields47.integer)({ defaultValue: 0, validation: { min: 0 } }),
    taxTotalCents: (0, import_fields47.integer)({ defaultValue: 0, validation: { min: 0 } }),
    securityDepositCents: (0, import_fields47.integer)({ defaultValue: 0, validation: { min: 0 } }),
    totalAmountCents: (0, import_fields47.integer)({ defaultValue: 0, validation: { min: 0 } }),
    quoteSnapshot: (0, import_fields47.json)({ access: { update: () => false }, ui: { itemView: { fieldMode: "read" } } }),
    expiresAt: (0, import_fields47.timestamp)({ validation: { isRequired: true } }),
    consumedAt: (0, import_fields47.timestamp)(),
    ...trackingFields
  }
});

// features/keystone/models/TaskRule.ts
var import_core47 = require("@keystone-6/core");
var import_fields48 = require("@keystone-6/core/fields");
var scopedHooks2 = hostScopedHooks("canManageProperties");
var TaskRule = (0, import_core47.list)({
  access: hostScopedListAccess("canReadProperties", "canManageProperties"),
  hooks: {
    ...scopedHooks2,
    validate: async (args) => {
      await scopedHooks2.validate(args);
      const { operation, resolvedData, item, context, addValidationError } = args;
      if (operation === "delete") return;
      const trigger = resolvedData?.trigger ?? item?.trigger;
      const admitted = operation === "create" || resolvedData?.trigger !== void 0 && resolvedData.trigger !== item?.trigger || resolvedData?.isActive === true && item?.isActive !== true;
      if (admitted && unsupportedTaskRuleTriggers.includes(trigger)) {
        addValidationError("This trigger isn\u2019t supported yet and would never create tasks. Choose another trigger.");
      }
      const defaultAssigneeId = resolvedData?.defaultAssignee?.connect?.id;
      if (defaultAssigneeId) {
        const user = await context.prisma.user.findUnique({ where: { id: defaultAssigneeId }, select: { isActive: true } });
        if (user?.isActive !== true) addValidationError("The default assignee\u2019s account is inactive.");
      }
    }
  },
  ui: { listView: { initialColumns: ["name", "trigger", "property", "taskType", "priority", "isActive"] } },
  fields: {
    hostOrganization: (0, import_fields48.relationship)({ ref: "HostOrganization.taskRules" }),
    property: (0, import_fields48.relationship)({ ref: "Property.taskRules" }),
    listing: (0, import_fields48.relationship)({ ref: "Listing" }),
    defaultAssignee: (0, import_fields48.relationship)({ ref: "User" }),
    code: (0, import_fields48.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    name: (0, import_fields48.text)({ validation: { isRequired: true } }),
    trigger: (0, import_fields48.select)({
      type: "string",
      options: taskRuleTriggerOptions,
      defaultValue: "after_check_out"
    }),
    offsetMinutes: (0, import_fields48.integer)({ defaultValue: 0 }),
    taskType: (0, import_fields48.select)({
      type: "string",
      options: propertyTaskTypeOptions,
      defaultValue: "turnover_cleaning"
    }),
    titleTemplate: (0, import_fields48.text)({ validation: { isRequired: true } }),
    priority: (0, import_fields48.select)({
      type: "string",
      options: propertyTaskPriorityOptions,
      defaultValue: "normal"
    }),
    checklistTemplate: (0, import_fields48.json)({ defaultValue: [] }),
    isActive: (0, import_fields48.checkbox)({ defaultValue: true }),
    tasks: (0, import_fields48.relationship)({ ref: "PropertyTask.taskRule", many: true, access: { create: () => false, update: () => false }, ui: { displayMode: "count" } }),
    ...trackingFields
  }
});

// features/keystone/models/TaxRule.ts
var import_core48 = require("@keystone-6/core");
var import_fields49 = require("@keystone-6/core/fields");
var TaxRule = (0, import_core48.list)({
  access: hostScopedListAccess("canReadPricing", "canManagePricing"),
  hooks: hostScopedHooks("canManagePricing", { parent: "listing" }),
  ui: { listView: { initialColumns: ["name", "listing", "jurisdiction", "rateBasisPoints", "isActive"] } },
  fields: {
    hostOrganization: (0, import_fields49.relationship)({ ref: "HostOrganization" }),
    listing: (0, import_fields49.relationship)({ ref: "Listing.taxRules" }),
    name: (0, import_fields49.text)({ validation: { isRequired: true } }),
    jurisdiction: (0, import_fields49.text)(),
    registrationNumber: (0, import_fields49.text)(),
    rateBasisPoints: (0, import_fields49.integer)({ validation: { isRequired: true, min: 0 } }),
    isInclusive: (0, import_fields49.checkbox)({ defaultValue: false }),
    isActive: (0, import_fields49.checkbox)({ defaultValue: true }),
    ...trackingFields
  }
});

// features/keystone/models/User.ts
var import_core49 = require("@keystone-6/core");
var import_access58 = require("@keystone-6/core/access");
var import_fields50 = require("@keystone-6/core/fields");
var User = (0, import_core49.list)({
  hooks: { validateDelete: historyDeleteGuard("User") },
  access: {
    operation: {
      ...(0, import_access58.allOperations)(isSignedIn),
      create: (args) => process.env.PUBLIC_SIGNUPS_ALLOWED === "true" || permissions.canManagePeople(args),
      delete: permissions.canManagePeople
    },
    filter: {
      query: rules.canReadPeople,
      update: rules.canUpdatePeople
    }
  },
  ui: {
    hideCreate: (args) => !permissions.canManagePeople(args),
    hideDelete: (args) => !permissions.canManagePeople(args),
    listView: { initialColumns: ["name", "email", "role", "hostMemberships", "guestProfile", "isActive"] },
    itemView: {
      defaultFieldMode: ({ session, item }) => {
        if (session?.data.role?.canEditOtherPeople) return "edit";
        if (session?.itemId === item?.id) return "edit";
        return "read";
      }
    }
  },
  fields: {
    name: (0, import_fields50.text)({ validation: { isRequired: true } }),
    email: (0, import_fields50.text)({
      isFilterable: false,
      isOrderable: false,
      isIndexed: "unique",
      validation: { isRequired: true },
      // Only a people manager changes a sign-in email. Guest self-service email change is held
      // until a verified-address policy exists: a current password doesn't prove the new address.
      access: { update: permissions.canManagePeople }
    }),
    password: (0, import_fields50.password)({
      access: {
        read: import_access58.denyAll,
        // No raw self update: a guest changes their own password through changeGuestPassword,
        // which checks the current password against this exact account inside the write.
        update: permissions.canManagePeople
      },
      ui: { itemView: { fieldMode: (args) => permissions.canManagePeople(args) ? "edit" : "read" } },
      validation: { isRequired: true }
    }),
    registrationEvidence: (0, import_fields50.json)({
      access: { read: permissions.canManagePeople, create: import_access58.denyAll, update: import_access58.denyAll },
      ui: {
        description: "Store documents shown and accepted when a guest registered on the storefront (versions and time). Recorded once; never edited.",
        itemView: { fieldMode: "read" },
        createView: { fieldMode: "hidden" },
        listView: { fieldMode: "hidden" }
      }
    }),
    role: (0, import_fields50.relationship)({
      ref: "Role.assignedTo",
      access: { create: permissions.canManagePeople, update: permissions.canManagePeople },
      ui: { itemView: { fieldMode: (args) => permissions.canManagePeople(args) ? "edit" : "read" } }
    }),
    phone: (0, import_fields50.text)(),
    isActive: (0, import_fields50.checkbox)({
      defaultValue: true,
      access: { create: permissions.canManagePeople, update: permissions.canManagePeople }
    }),
    onboardingStatus: (0, import_fields50.select)({
      type: "string",
      options: [
        { label: "Not Started", value: "not_started" },
        { label: "In Progress", value: "in_progress" },
        { label: "Completed", value: "completed" },
        { label: "Dismissed", value: "dismissed" }
      ],
      defaultValue: "not_started",
      // Only the verified onboarding command changes this; nobody can create a user as already set up.
      access: { create: () => false, update: () => false }
    }),
    hostMemberships: (0, import_fields50.relationship)({ ref: "HostMembership.user", many: true, access: { create: import_access58.denyAll, update: import_access58.denyAll }, ui: { displayMode: "count" } }),
    guestProfile: (0, import_fields50.relationship)({ ref: "GuestProfile.user", access: { create: import_access58.denyAll, update: import_access58.denyAll }, ui: { itemView: { fieldMode: "read" } } }),
    customerReservations: (0, import_fields50.relationship)({
      ref: "Reservation.bookedBy",
      many: true,
      access: { create: import_access58.denyAll, update: import_access58.denyAll },
      ui: { displayMode: "count", itemView: { fieldMode: "read" }, createView: { fieldMode: "hidden" } }
    }),
    // Authorship and assignment are set by the send, review and task commands, never by editing a user.
    sentMessages: (0, import_fields50.relationship)({ ref: "Message.senderUser", many: true, access: { create: import_access58.denyAll, update: import_access58.denyAll }, ui: { displayMode: "count" } }),
    authoredReviews: (0, import_fields50.relationship)({ ref: "Review.authorUser", many: true, access: { create: import_access58.denyAll, update: import_access58.denyAll }, ui: { displayMode: "count" } }),
    assignedPropertyTasks: (0, import_fields50.relationship)({ ref: "PropertyTask.assignee", many: true, access: { create: import_access58.denyAll, update: import_access58.denyAll }, ui: { displayMode: "count" } }),
    ...trackingFields
  }
});

// features/keystone/models/index.ts
var models = {
  User,
  Role,
  MarketplaceSettings,
  HostOrganization,
  HostMembership,
  Property,
  PropertyAddress,
  PropertyOwner,
  PropertyOwnerAssignment,
  AccommodationUnit,
  Bedroom,
  Bed,
  Amenity,
  Listing,
  ListingMedia,
  StayCollection,
  HouseRule,
  CalendarBlock,
  RatePlan,
  SeasonalRate,
  FeeDefinition,
  TaxRule,
  CancellationPolicy,
  StayQuote,
  GuestProfile,
  GuestParty,
  Reservation,
  ReservationAmendment,
  ReservationLineItem,
  StayAgreement,
  SecurityDeposit,
  DamageClaim,
  Payment,
  PaymentProvider,
  PaymentWebhookEvent,
  Refund,
  Payout,
  OwnerStatement,
  OwnerStatementLine,
  Conversation,
  Message,
  Review,
  TaskRule,
  PropertyTask,
  ChannelConnection,
  ChannelListing,
  ChannelReservation,
  ChannelSyncEvent,
  DataExchangeJob
};

// features/keystone/index.ts
var import_session = require("@keystone-6/core/session");

// features/keystone/mutations/index.ts
var import_schema = require("@graphql-tools/schema");

// features/keystone/utils/manualPaymentLifecycle.ts
var import_node_crypto4 = __toESM(require("node:crypto"));
function manualPaymentOperationKey({ reservationId, operationKey }) {
  const key = operationKey.trim();
  if (key.length < 8 || key.length > 200 || Array.from(key).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) {
    throw new Error("Provide a stable payment operation key (8 to 200 characters).");
  }
  return import_node_crypto4.default.createHash("sha256").update(`manual-payment:${reservationId}:${key}`).digest("hex");
}
function validateManualPaymentSession({ amount, outstanding }) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Payment amount must be greater than zero and stored in integer cents.");
  }
  if (amount > outstanding) {
    throw new Error("Payment amount cannot exceed the outstanding balance.");
  }
}
function assertCaptureTransition(status) {
  if (status === "succeeded") return "already_succeeded";
  if (status === "refunded" || status === "cancelled" || status === "failed") {
    throw new Error(`A ${status} payment cannot be captured.`);
  }
  if (status !== "pending" && status !== "processing") {
    throw new Error("This payment is not in a capturable state.");
  }
  return "capture";
}

// features/keystone/utils/paymentProviderAdapter.ts
function adapterFor(provider) {
  const code = typeof provider === "string" ? provider : provider?.code || provider?.provider;
  if (!code) throw new Error("Payment provider is required.");
  if (typeof provider !== "string" && provider.isInstalled === false) {
    throw new Error("Payment provider is not available.");
  }
  return getPaymentAdapter(code);
}
var UnsupportedPaymentCapabilityError = class extends Error {
  constructor(providerCode, capability) {
    super(`Payment provider ${providerCode} does not support ${capability}.`);
    this.name = "UnsupportedPaymentCapabilityError";
  }
};
function requireCapability(adapter, capability) {
  if (!adapter.capabilities.includes(capability)) {
    throw new UnsupportedPaymentCapabilityError(adapter.code, capability);
  }
}
async function createPayment({
  provider,
  reservation,
  amount,
  currency,
  idempotencyKey,
  metadata
}) {
  const adapter = adapterFor(provider);
  requireCapability(adapter, "createPayment");
  return adapter.createPayment({ reservation, amount, currency, idempotencyKey, metadata });
}
async function capturePayment({
  provider,
  paymentId,
  amount
}) {
  const adapter = adapterFor(provider);
  requireCapability(adapter, "capturePayment");
  return adapter.capturePayment({ paymentId, amount });
}
async function getPaymentStatus({
  provider,
  paymentId
}) {
  const adapter = adapterFor(provider);
  requireCapability(adapter, "getPaymentStatus");
  return adapter.getPaymentStatus({ paymentId });
}
async function createProviderRefund({
  provider,
  providerPaymentId,
  amount,
  idempotencyKey,
  metadata,
  expected,
  firstSubmittedAt
}) {
  const adapter = adapterFor(provider);
  if (!adapter.createRefund) throw new Error("This payment method doesn\u2019t support refunds through the store. Record the refund after returning the money.");
  return adapter.createRefund({ providerPaymentId, amount, idempotencyKey, metadata, expected, firstSubmittedAt });
}
async function getProviderRefund({
  provider,
  providerRefundId,
  providerPaymentId
}) {
  const adapter = adapterFor(provider);
  if (!adapter.getRefund) throw new Error("This payment method has no refund status to check.");
  return adapter.getRefund({ providerRefundId, providerPaymentId });
}
async function cancelProviderPayment({ provider, paymentId, expected }) {
  const adapter = adapterFor(provider);
  if (!adapter.cancelPayment) throw new Error("This payment method has no provider attempt to cancel.");
  return adapter.cancelPayment({ paymentId, expected });
}
async function findProviderPayment({ provider, rentalPaymentId }) {
  const adapter = adapterFor(provider);
  if (!adapter.findPayment) return null;
  return adapter.findPayment({ rentalPaymentId });
}

// features/keystone/utils/refundReviewLiabilities.ts
var import_node_crypto5 = __toESM(require("node:crypto"));
var settledStatuses = /* @__PURE__ */ new Set(["succeeded", "partially_refunded", "refunded"]);
var openStatuses = /* @__PURE__ */ new Set(["pending", "processing", "failed"]);
async function createUncoveredRefundReviewLiabilities(tx, {
  reservation,
  payments,
  refunds,
  netPaidCents,
  targetAmountCents,
  reason,
  liabilityType,
  operationPrefix,
  review = false
}) {
  const openByPayment = /* @__PURE__ */ new Map();
  let openTotalCents = 0;
  for (const refund of refunds) {
    if (!openStatuses.has(refund.status || "")) continue;
    if (!refund.paymentId) throw new Error("An open refund liability is missing its payment association.");
    if (!Number.isSafeInteger(refund.amountCents) || refund.amountCents <= 0) {
      throw new Error("An open refund liability must contain a positive integer-cent amount.");
    }
    openByPayment.set(refund.paymentId, (openByPayment.get(refund.paymentId) || 0) + refund.amountCents);
    openTotalCents += refund.amountCents;
  }
  const target = targetAmountCents ?? netPaidCents;
  if (!Number.isSafeInteger(netPaidCents) || netPaidCents < 0 || !Number.isSafeInteger(target) || target < 0 || target > netPaidCents || !Number.isSafeInteger(openTotalCents)) {
    throw new Error("Refund review liability totals are invalid.");
  }
  let uncoveredCents = Math.max(target - openTotalCents, 0);
  let createdCents = 0;
  const created = [];
  for (const payment of payments) {
    if (!settledStatuses.has(payment.status || "") || uncoveredCents === 0) continue;
    const available = payment.amountCents - (payment.refundedAmountCents || 0) - (openByPayment.get(payment.id) || 0);
    if (!Number.isSafeInteger(available) || available < 0) throw new Error("Payment evidence cannot cover its recorded refund liabilities.");
    const amountCents = Math.min(available, uncoveredCents);
    if (amountCents <= 0) continue;
    const id2 = import_node_crypto5.default.randomUUID();
    const identity = import_node_crypto5.default.createHash("sha256").update(`${reservation.id}|${payment.id}|${liabilityType}`).digest("hex");
    const idempotencyKey = `${operationPrefix}:${identity}`;
    const existing = await tx.refund.findUnique({ where: { idempotencyKey } });
    if (existing) {
      if (existing.status !== (review ? "review" : "pending") || existing.amountCents !== amountCents || existing.paymentId !== payment.id) {
        throw new Error("An existing refund review identity conflicts with the uncovered liability.");
      }
      uncoveredCents -= amountCents;
      continue;
    }
    await tx.refund.create({
      data: {
        id: id2,
        hostOrganizationId: reservation.hostOrganizationId,
        reservationId: reservation.id,
        paymentId: payment.id,
        refundNumber: `REF-REV-${reservation.confirmationCode}-${id2.slice(0, 8).toUpperCase()}`,
        idempotencyKey,
        status: review ? "review" : "pending",
        reason,
        amountCents,
        currencyCode: reservation.currencyCode,
        data: {
          liabilityType,
          policyReviewRequired: review,
          ...review ? { candidate: true } : {},
          reviewOnly: true,
          transferCompleted: false
        }
      }
    });
    created.push({ id: id2, paymentId: payment.id, amountCents });
    createdCents += amountCents;
    uncoveredCents -= amountCents;
  }
  if (uncoveredCents > 0) throw new Error("Settled payment evidence cannot cover the required refund review liability.");
  const owedCents = review ? 0 : createdCents;
  return { created, createdCents: owedCents, reviewCents: review ? createdCents : 0, openTotalCents: openTotalCents + owedCents };
}

// features/keystone/utils/paymentSettlement.ts
var settledPaymentStatuses2 = /* @__PURE__ */ new Set(["succeeded", "partially_refunded", "refunded"]);
async function settleSucceededPayment(tx, {
  paymentId,
  expectedAmountCents,
  expectedCurrencyCode,
  evidence,
  processedAt,
  processedByUserId
}) {
  const initial = await tx.payment.findUnique({ where: { id: paymentId } });
  if (!initial) throw new Error("Payment not found.");
  if (initial.reservationId) {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `reservation:${initial.reservationId}`);
    await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', initial.reservationId);
  }
  await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `payment-refund:${paymentId}`);
  const payment = await tx.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new Error("Payment not found.");
  if (payment.reservationId !== initial.reservationId) throw new Error("Payment reservation changed during settlement.");
  if (payment.amountCents !== expectedAmountCents) throw new Error("Webhook payment amount does not match immutable payment evidence.");
  if ((payment.currencyCode || "").toUpperCase() !== expectedCurrencyCode.toUpperCase()) {
    throw new Error("Webhook payment currency does not match immutable payment evidence.");
  }
  const alreadySettled = settledPaymentStatuses2.has(payment.status);
  if (!alreadySettled && !["pending", "processing"].includes(payment.status)) {
    throw new Error(`Cannot settle a ${payment.status} payment.`);
  }
  const booking = payment.reservationId ? await tx.reservation.findUnique({ where: { id: payment.reservationId }, select: { testMode: true } }) : null;
  const segregated = Boolean(booking) && isTestTender(payment) !== (booking?.testMode === true);
  const updated = alreadySettled ? payment : await tx.payment.update({
    where: { id: payment.id },
    data: {
      status: "succeeded",
      processedAt,
      ...processedByUserId ? { processedById: processedByUserId } : {},
      data: { ...payment.data && typeof payment.data === "object" ? payment.data : {}, settlement: evidence, ...segregated ? { segregatedFromBooking: isTestTender(payment) ? "test_tender_on_real_stay" : "real_tender_on_test_booking" } : {} }
    }
  });
  if (payment.reservationId) {
    const [reservation, payments, refunds] = await Promise.all([
      tx.reservation.findUnique({ where: { id: payment.reservationId } }),
      tx.payment.findMany({
        where: { reservationId: payment.reservationId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, status: true, amountCents: true, refundedAmountCents: true, currencyCode: true, provider: true, data: true }
      }),
      tx.refund.findMany({
        where: { reservationId: payment.reservationId },
        select: { id: true, paymentId: true, status: true, amountCents: true, currencyCode: true }
      })
    ]);
    if (reservation) {
      const testMode = reservation.testMode === true;
      const reconciliation = reconcileReservationPaymentEvidence({ payments, refunds, currencyCode: reservation.currencyCode, testMode });
      const ledgerPayments = payments.filter((entry) => isTestTender(entry) === testMode);
      const totalAmountCents = reservation.totalAmountCents || 0;
      const cancelled = ["cancelled", "no_show"].includes(reservation.status || "");
      const targetLiabilityCents = cancelled ? reconciliation.netPaidCents : Math.max(reconciliation.netPaidCents - totalAmountCents, 0);
      let liability = { createdCents: 0 };
      if (targetLiabilityCents > 0) {
        const lateSettlement = cancelled;
        const reason = reservation.status === "no_show" ? "stay_issue" : cancelled && reservation.cancelledBy === "host" ? "host_cancellation" : cancelled ? "guest_cancellation" : "overpayment";
        liability = await createUncoveredRefundReviewLiabilities(tx, {
          reservation,
          payments: cancelled ? ledgerPayments : [...ledgerPayments].reverse(),
          refunds,
          netPaidCents: reconciliation.netPaidCents,
          targetAmountCents: targetLiabilityCents,
          reason,
          liabilityType: lateSettlement ? `late_settlement_after_${reservation.status}` : "overpayment_review",
          operationPrefix: lateSettlement ? "late-settlement-review" : "overpayment-review",
          // Money held above a live stay's total, or after a host cancellation, is owed. After a
          // guest cancellation or no-show, what's due depends on the policy: the host reviews it.
          review: reason === "guest_cancellation" || reason === "stay_issue"
        });
      }
      const paymentStatus = reservationPaymentStatus({
        ...reconciliation,
        totalAmountCents,
        openRefundCents: reconciliation.openRefundCents + liability.createdCents
      });
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { amountPaidCents: reconciliation.netPaidCents, paymentStatus }
      });
    }
  }
  return { payment: updated, alreadySettled };
}

// features/keystone/mutations/captureStayPayment.ts
async function captureStayPayment(_root, args, context) {
  const payment = await context.query.Payment.findOne({
    where: { id: args.paymentId },
    query: `
      id amountCents status provider providerPaymentId currencyCode data
      hostOrganization { id }
      paymentProvider { id code isInstalled }
      reservation { id status paymentStatus totalAmountCents amountPaidCents }
    `
  });
  if (!payment?.hostOrganization?.id) throw new Error("Payment not found.");
  await assertHostOrganizationAccess({ context, hostOrganizationId: payment.hostOrganization.id, permission: "canManagePayments" });
  const operatorUserId = context.session?.itemId;
  if (typeof operatorUserId !== "string" || !operatorUserId) throw new Error("An authenticated operator is required to attest manual payment receipt.");
  if (["cancelled", "no_show"].includes(payment.reservation?.status || "")) {
    throw new Error("A payment cannot be newly captured for a cancelled or no-show reservation.");
  }
  const transition = assertCaptureTransition(payment.status);
  if (transition === "already_succeeded") return payment;
  if (payment.provider !== "pp_system_default" || payment.paymentProvider?.code !== "pp_system_default") {
    throw new Error("Only manual payment capture is enabled.");
  }
  if (!payment.paymentProvider?.isInstalled) throw new Error("Payment provider is not available for capture.");
  const captureResult = await capturePayment({
    provider: payment.paymentProvider,
    paymentId: payment.providerPaymentId || payment.id,
    amount: payment.amountCents
  });
  const processedAt = /* @__PURE__ */ new Date();
  await context.prisma.$transaction(
    (tx) => settleSucceededPayment(tx, {
      paymentId: payment.id,
      expectedAmountCents: payment.amountCents,
      expectedCurrencyCode: payment.currencyCode,
      evidence: {
        kind: "operator_manual_capture",
        attestedByUserId: operatorUserId,
        attestedAt: processedAt.toISOString(),
        capture: captureResult?.data || captureResult
      },
      processedAt,
      processedByUserId: operatorUserId
    }),
    { maxWait: 5e3, timeout: 1e4, isolationLevel: "ReadCommitted" }
  );
  return context.sudo().query.Payment.findOne({
    where: { id: payment.id },
    query: "id amountCents status provider providerPaymentId currencyCode processedAt data"
  });
}

// features/keystone/mutations/amendConfirmedStay.ts
var import_node_crypto6 = __toESM(require("node:crypto"));

// features/keystone/utils/fixtureOrigin.ts
var FIXTURE_ORIGIN = "onboarding_sample";
function fixtureEvidence(identifiedBy, details = {}) {
  return { identifiedBy, recordedAt: (/* @__PURE__ */ new Date()).toISOString(), ...details };
}
var REAL_STAY = { fixtureOrigin: null, testMode: false };
var REAL_CAPACITY_BLOCK = { fixtureOrigin: null };
var REAL_CAPACITY_BLOCK_FILTER = { fixtureOrigin: { equals: null } };
var SAMPLE_STATEMENT = { lines: { some: { reservation: { fixtureOrigin: { not: null } } } } };

// features/keystone/utils/reservationAllocation.ts
var capacityReservationStatuses = ["pending", "confirmed", "in_stay"];
function parseCapacityDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} must use YYYY-MM-DD format.`);
  const [year, month, day] = value.split("-").map(Number);
  const date = /* @__PURE__ */ new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  if (year < 1 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`${label} must be a valid calendar date in YYYY-MM-DD format.`);
  }
  return date.getTime();
}
function assertCapacityDateRange(checkInDate, checkOutDate) {
  const start = parseCapacityDate(checkInDate, "Start date");
  const end = parseCapacityDate(checkOutDate, "End date");
  if (end <= start) throw new Error("End date must be after start date.");
}
async function lockListingCapacity(tx, listingIds) {
  const uniqueIds = [...new Set(listingIds.filter((id2) => Boolean(id2)))].sort();
  for (const listingId of uniqueIds) {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `stay-listing:${listingId}`);
  }
}
async function lockAccommodationUnitCapacity(tx, unitIds) {
  const uniqueIds = [...new Set(unitIds.filter((id2) => Boolean(id2)))].sort();
  for (const unitId of uniqueIds) {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `stay-unit:${unitId}`);
  }
}
async function findAccommodationUnitCapacityConflict(tx, {
  accommodationUnitId,
  hostOrganizationId,
  checkInDate,
  checkOutDate,
  excludeReservationId,
  excludeCalendarBlockId
}) {
  assertCapacityDateRange(checkInDate, checkOutDate);
  const unit = await tx.accommodationUnit.findUnique({
    where: { id: accommodationUnitId },
    select: { id: true, hostOrganizationId: true, propertyId: true, status: true }
  });
  if (!unit || unit.hostOrganizationId !== hostOrganizationId) {
    throw new Error("The selected accommodation unit must belong to the same host organization.");
  }
  if (unit.propertyId) {
    const property = await tx.property.findUnique({ where: { id: unit.propertyId }, select: { hostOrganizationId: true } });
    if (!property || property.hostOrganizationId !== hostOrganizationId) {
      throw new Error("The selected accommodation unit must belong to the same host organization.");
    }
  }
  const reservationWhere = {
    accommodationUnitId,
    ...REAL_STAY,
    status: { in: capacityReservationStatuses },
    checkInDate: { lt: checkOutDate },
    checkOutDate: { gt: checkInDate }
  };
  if (excludeReservationId) reservationWhere.id = { not: excludeReservationId };
  const reservationConflict = await tx.reservation.findFirst({ where: reservationWhere, select: { id: true } });
  if (reservationConflict) return true;
  const listings = await tx.listing.findMany({
    where: { accommodationUnitId, hostOrganizationId },
    select: { id: true }
  });
  const listingIds = listings.map((listing) => listing.id);
  if (listingIds.length) {
    const blockWhere = {
      listingId: { in: listingIds },
      status: "active",
      ...REAL_CAPACITY_BLOCK,
      startDate: { lt: checkOutDate },
      endDate: { gt: checkInDate }
    };
    if (excludeCalendarBlockId) blockWhere.id = { not: excludeCalendarBlockId };
    if (excludeReservationId) {
      blockWhere.OR = [{ reservationId: null }, { reservationId: { not: excludeReservationId } }];
    }
    const blockConflict = await tx.calendarBlock.findFirst({ where: blockWhere, select: { id: true } });
    if (blockConflict) return true;
  }
  return false;
}
async function findListingCapacityConflict(tx, {
  listingId,
  checkInDate,
  checkOutDate,
  excludeReservationId,
  excludeCalendarBlockId
}) {
  assertCapacityDateRange(checkInDate, checkOutDate);
  const reservationWhere = {
    listingId,
    ...REAL_STAY,
    status: { in: capacityReservationStatuses },
    checkInDate: { lt: checkOutDate },
    checkOutDate: { gt: checkInDate }
  };
  if (excludeReservationId) reservationWhere.id = { not: excludeReservationId };
  const reservationConflict = await tx.reservation.findFirst({ where: reservationWhere, select: { id: true } });
  if (reservationConflict) return true;
  const blockWhere = {
    listingId,
    status: "active",
    ...REAL_CAPACITY_BLOCK,
    startDate: { lt: checkOutDate },
    endDate: { gt: checkInDate }
  };
  if (excludeCalendarBlockId) blockWhere.id = { not: excludeCalendarBlockId };
  if (excludeReservationId) {
    blockWhere.OR = [{ reservationId: null }, { reservationId: { not: excludeReservationId } }];
  }
  return Boolean(await tx.calendarBlock.findFirst({ where: blockWhere, select: { id: true } }));
}
async function assertAccommodationUnitAvailable(tx, input) {
  assertCapacityDateRange(input.checkInDate, input.checkOutDate);
  const unit = await tx.accommodationUnit.findUnique({
    where: { id: input.accommodationUnitId },
    select: { id: true, hostOrganizationId: true, propertyId: true, status: true }
  });
  if (!unit || unit.hostOrganizationId !== input.hostOrganizationId) {
    throw new Error("The selected accommodation unit must belong to the same host organization.");
  }
  if (unit.propertyId) {
    const property = await tx.property.findUnique({ where: { id: unit.propertyId }, select: { hostOrganizationId: true } });
    if (!property || property.hostOrganizationId !== input.hostOrganizationId) {
      throw new Error("The selected accommodation unit must belong to the same host organization.");
    }
  }
  if (unit.status !== "available") throw new Error("The selected accommodation unit is not available for stays.");
  if (await findAccommodationUnitCapacityConflict(tx, input)) {
    throw new Error("The selected accommodation unit is not available for those dates.");
  }
}

// features/keystone/utils/stayPricing.ts
var DATE_ONLY3 = /^\d{4}-\d{2}-\d{2}$/;
var DAY_MS2 = 24 * 60 * 60 * 1e3;
var MAX_SUPPORTED_STAY_NIGHTS = 365;
var MAX_STORED_CENTS = 2147483647;
var WEEKLY_DISCOUNT_NIGHTS = 7;
var MONTHLY_DISCOUNT_NIGHTS = 28;
var MAX_LENGTH_OF_STAY_DISCOUNT_BASIS_POINTS = 9e3;
function lengthOfStayDiscountFor(nights, weeklyBasisPoints, monthlyBasisPoints) {
  const valid = (value) => Number.isSafeInteger(value) && value > 0 && value <= MAX_LENGTH_OF_STAY_DISCOUNT_BASIS_POINTS ? value : 0;
  const monthly = valid(monthlyBasisPoints), weekly = valid(weeklyBasisPoints);
  if (nights >= MONTHLY_DISCOUNT_NIGHTS && monthly) return { name: "Monthly stay discount", basisPoints: monthly };
  if (nights >= WEEKLY_DISCOUNT_NIGHTS && weekly) return { name: "Weekly stay discount", basisPoints: weekly };
  return null;
}
function parseDateOnly(value, label) {
  if (!DATE_ONLY3.test(value)) {
    throw new Error(`${label} must use YYYY-MM-DD format.`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const timestamp22 = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp22);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`${label} must be a valid calendar date in YYYY-MM-DD format.`);
  }
  return date;
}
function assertNonNegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer number of cents.`);
  }
}
function basisPointAmount(amountCents, basisPoints2) {
  if (!Number.isSafeInteger(basisPoints2) || basisPoints2 < 0) {
    throw new Error("Basis points must be a non-negative integer.");
  }
  return Math.round(amountCents * basisPoints2 / 1e4);
}
function assertStayNotInPast(checkIn, now = /* @__PURE__ */ new Date()) {
  const start = parseDateOnly(checkIn, "Check-in");
  const earliest = new Date(now.getTime() - 12 * 60 * 60 * 1e3);
  const todayTimestamp = Date.UTC(earliest.getUTCFullYear(), earliest.getUTCMonth(), earliest.getUTCDate());
  if (start.getTime() < todayTimestamp) {
    throw new Error("Check-in cannot be in the past.");
  }
}
function checkedStayRange(checkIn, checkOut) {
  const start = parseDateOnly(checkIn, "Check-in");
  const end = parseDateOnly(checkOut, "Check-out");
  const elapsed = end.getTime() - start.getTime();
  if (elapsed <= 0) throw new Error("Check-out must be after check-in.");
  const nightCount = elapsed / DAY_MS2;
  if (!Number.isSafeInteger(nightCount)) throw new Error("Stay dates exceed the supported calendar range.");
  return { startTimestamp: start.getTime(), nightCount };
}
function assertSupportedStayRange(nightCount) {
  if (nightCount > MAX_SUPPORTED_STAY_NIGHTS) {
    throw new Error(`This stay exceeds the maximum supported length of ${MAX_SUPPORTED_STAY_NIGHTS} nights.`);
  }
}
function stayNightDates(startTimestamp, nightCount) {
  return Array.from({ length: nightCount }, (_, index) => new Date(startTimestamp + index * DAY_MS2).toISOString().slice(0, 10));
}
function assertMaximumStayNights(nights, maximumStay) {
  if (maximumStay == null) return;
  if (!Number.isSafeInteger(maximumStay) || maximumStay < 1) {
    throw new Error("Maximum stay must be a positive integer number of nights.");
  }
  if (nights > maximumStay) {
    throw new Error(`This listing allows a maximum stay of ${maximumStay} nights for the selected dates.`);
  }
}
function assertStayWithinMaximum(checkIn, checkOut, maximumStay) {
  const range = checkedStayRange(checkIn, checkOut);
  assertMaximumStayNights(range.nightCount, maximumStay);
  assertSupportedStayRange(range.nightCount);
}
function assertGuestCapacity(guestCount, maxGuests) {
  if (!Number.isSafeInteger(guestCount) || guestCount < 1) {
    throw new Error("A stay requires at least one guest.");
  }
  if (!Number.isSafeInteger(maxGuests) || maxGuests < 1) {
    throw new Error("Listing maximum occupancy must be at least one guest.");
  }
  if (guestCount > maxGuests) {
    throw new Error(`Guest party exceeds the listing maximum occupancy of ${maxGuests}.`);
  }
}
function rateAppliesToNight(rate, night) {
  const nightTime = parseDateOnly(night, "Night").getTime();
  const startTime = parseDateOnly(rate.startDate, `${rate.name} start`).getTime();
  const endTime = parseDateOnly(rate.endDate, `${rate.name} end`).getTime();
  if (endTime <= startTime) throw new Error(`${rate.name} must end after it starts.`);
  return startTime <= nightTime && nightTime < endTime;
}
function rateForNight(night, baseNightlyRateCents, seasonalRates) {
  const applicable = seasonalRates.filter((rate) => rateAppliesToNight(rate, night)).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  const selected = applicable[0];
  if (!selected) {
    return { amountCents: baseNightlyRateCents, source: "Base rate", minimumStay: 1 };
  }
  const adjustment = selected.adjustmentBasisPoints ?? 0;
  if (!Number.isSafeInteger(adjustment) || adjustment < -1e4) throw new Error(`${selected.name} adjustment must be a whole number of basis points no lower than -10000.`);
  const amountCents = selected.nightlyRateCents == null ? baseNightlyRateCents + Math.round(baseNightlyRateCents * adjustment / 1e4) : selected.nightlyRateCents;
  assertNonNegativeInteger(amountCents, `${selected.name} nightly rate`);
  return {
    amountCents,
    source: selected.name,
    minimumStay: Math.max(selected.minimumStay ?? 1, 1)
  };
}
function calculateStayQuote(input) {
  assertNonNegativeInteger(input.baseNightlyRateCents, "Base nightly rate");
  assertNonNegativeInteger(input.securityDepositCents ?? 0, "Security deposit");
  assertGuestCapacity(input.guestCount, input.maxGuests);
  const stayRange = checkedStayRange(input.checkIn, input.checkOut);
  assertMaximumStayNights(stayRange.nightCount, input.maximumStay);
  assertSupportedStayRange(stayRange.nightCount);
  const nightDates = stayNightDates(stayRange.startTimestamp, stayRange.nightCount);
  const seasonalRates = input.seasonalRates ?? [];
  const listNights = nightDates.map((date) => ({ date, ...rateForNight(date, input.baseNightlyRateCents, seasonalRates) }));
  const listLodgingCents = listNights.reduce((sum, night) => sum + night.amountCents, 0);
  const discountRule = lengthOfStayDiscountFor(nightDates.length, input.weeklyDiscountBasisPoints, input.monthlyDiscountBasisPoints);
  const discountCents = discountRule ? basisPointAmount(listLodgingCents, discountRule.basisPoints) : 0;
  let discountLeft = discountCents;
  const nights = listNights.map((night, index) => {
    if (!discountCents) return night;
    const share = index === listNights.length - 1 ? discountLeft : Math.min(discountLeft, listLodgingCents ? Math.floor(night.amountCents * discountCents / listLodgingCents) : 0);
    discountLeft -= share;
    return { ...night, listAmountCents: night.amountCents, amountCents: night.amountCents - share };
  });
  const minimumStay = Math.max(
    input.baseMinimumStay ?? 1,
    ...nights.map((night) => night.minimumStay)
  );
  if (nightDates.length < minimumStay) {
    throw new Error(`This listing requires a minimum stay of ${minimumStay} nights for the selected dates.`);
  }
  const lodgingSubtotalCents = nights.reduce((sum, night) => sum + night.amountCents, 0);
  const pets = input.pets ?? 0;
  if (!Number.isSafeInteger(pets) || pets < 0) throw new Error("Pets must be a whole number.");
  const applicableFees = (input.fees ?? []).filter((fee) => fee.required !== false && (fee.feeType !== "pet" || pets > 0));
  const fees = applicableFees.map((fee) => {
    const amountCents = (() => {
      switch (fee.kind) {
        case "fixed":
          return fee.amountCents ?? 0;
        case "per_night":
          return (fee.amountCents ?? 0) * nightDates.length;
        case "per_guest":
          return (fee.amountCents ?? 0) * (fee.feeType === "pet" ? pets : input.guestCount);
        case "percentage":
          return basisPointAmount(lodgingSubtotalCents, fee.percentageBasisPoints ?? 0);
      }
    })();
    assertNonNegativeInteger(amountCents, `${fee.name} fee`);
    return { name: fee.name, feeType: fee.feeType, kind: fee.kind, amountCents, taxable: fee.taxable ?? true };
  });
  const feeTotalCents = fees.reduce((sum, fee) => sum + fee.amountCents, 0);
  const taxableSubtotalCents = lodgingSubtotalCents + fees.filter((fee) => fee.taxable).reduce((sum, fee) => sum + fee.amountCents, 0);
  const taxes = (input.taxes ?? []).filter((tax) => !tax.inclusive).map((tax) => ({
    name: tax.name,
    rateBasisPoints: tax.rateBasisPoints,
    amountCents: basisPointAmount(taxableSubtotalCents, tax.rateBasisPoints)
  }));
  const taxTotalCents = taxes.reduce((sum, tax) => sum + tax.amountCents, 0);
  const includedTaxes = (input.taxes ?? []).filter((tax) => tax.inclusive).map((tax) => {
    if (!Number.isSafeInteger(tax.rateBasisPoints) || tax.rateBasisPoints < 0) throw new Error("Basis points must be a non-negative integer.");
    return {
      name: tax.name,
      rateBasisPoints: tax.rateBasisPoints,
      amountCents: taxableSubtotalCents - Math.round(taxableSubtotalCents * 1e4 / (1e4 + tax.rateBasisPoints))
    };
  });
  const totalAmountCents = lodgingSubtotalCents + feeTotalCents + taxTotalCents;
  if (![lodgingSubtotalCents, feeTotalCents, taxTotalCents, totalAmountCents, input.securityDepositCents ?? 0].every((value) => value <= MAX_STORED_CENTS)) {
    throw new Error("This stay\u2019s total is too large to book online. Choose fewer nights or contact the host.");
  }
  return {
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    currencyCode: input.currencyCode ?? "USD",
    numberOfNights: nightDates.length,
    minimumStay,
    guestCount: input.guestCount,
    nights,
    lodgingSubtotalCents,
    // Present only when a discount applied, so undiscounted quotes keep their exact shape.
    ...discountRule && discountCents > 0 ? { lengthOfStayDiscount: { ...discountRule, listLodgingCents, amountCents: discountCents } } : {},
    fees,
    feeTotalCents,
    taxableSubtotalCents,
    taxes,
    taxTotalCents,
    includedTaxes,
    securityDepositCents: input.securityDepositCents ?? 0,
    totalAmountCents
  };
}

// features/keystone/mutations/amendConfirmedStay.ts
var settledPaymentStatuses3 = ["succeeded", "partially_refunded", "refunded"];
var pendingMoneyStatuses = ["pending", "processing"];
function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record5 = value;
    return `{${Object.keys(record5).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record5[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}
function digest(value) {
  return import_node_crypto6.default.createHash("sha256").update(stableJson(value)).digest("hex");
}
function assertSafeCents(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer number of cents.`);
  }
}
function reservationAmounts(reservation) {
  const amounts = {
    lodgingSubtotalCents: reservation.lodgingSubtotalCents ?? 0,
    feeTotalCents: reservation.feeTotalCents ?? 0,
    taxTotalCents: reservation.taxTotalCents ?? 0,
    discountTotalCents: reservation.discountTotalCents ?? 0,
    securityDepositCents: reservation.securityDepositCents ?? 0,
    totalAmountCents: reservation.totalAmountCents ?? 0,
    amountPaidCents: reservation.amountPaidCents ?? 0,
    balanceDueCents: Math.max((reservation.totalAmountCents ?? 0) - (reservation.amountPaidCents ?? 0), 0)
  };
  for (const [key, value] of Object.entries(amounts)) assertSafeCents(value, key);
  return amounts;
}
function validateDateRange(checkInDate, checkOutDate) {
  const parseDate = (value, label) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} must use YYYY-MM-DD format.`);
    const [year, month, day] = value.split("-").map(Number);
    const timestamp22 = Date.UTC(year, month - 1, day);
    const parsed = new Date(timestamp22);
    if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
      throw new Error(`${label} must be a valid calendar date in YYYY-MM-DD format.`);
    }
    return timestamp22;
  };
  const start = parseDate(checkInDate, "Check-in");
  const end = parseDate(checkOutDate, "Check-out");
  const nights = (end - start) / (24 * 60 * 60 * 1e3);
  if (nights <= 0) throw new Error("Check-out must be after check-in.");
  if (nights > 730) throw new Error("An amended stay cannot exceed 730 nights.");
  return nights;
}
function buildAmendedQuote({
  bookingSnapshot,
  currentParty,
  checkInDate,
  checkOutDate,
  currencyCode,
  securityDepositCents
}) {
  const listing = bookingSnapshot?.listing;
  const guestParty = bookingSnapshot?.guestParty;
  const ratePlan = listing?.ratePlans?.[0] || {};
  const unit = listing?.accommodation || listing?.accommodationUnit;
  if (!unit || !guestParty) {
    throw new Error("The original booking snapshot does not contain enough pricing evidence to amend this stay safely.");
  }
  if ((ratePlan.currencyCode || listing.currencyCode || currencyCode).toUpperCase() !== currencyCode.toUpperCase()) {
    throw new Error("The original booking currency does not match the reservation currency.");
  }
  const party = currentParty || guestParty;
  const guestCount = (party.adults || 0) + (party.children || 0);
  const calculation = calculateStayQuote({
    checkIn: checkInDate,
    checkOut: checkOutDate,
    baseNightlyRateCents: ratePlan.baseNightlyRateCents ?? listing.baseNightlyRateCents ?? 0,
    currencyCode,
    baseMinimumStay: ratePlan.minimumStay ?? listing.minimumStay ?? 1,
    guestCount,
    pets: party.pets || 0,
    maxGuests: unit.maxGuests,
    securityDepositCents,
    seasonalRates: ratePlan.seasonalRates || [],
    weeklyDiscountBasisPoints: ratePlan.weeklyDiscountBasisPoints ?? 0,
    monthlyDiscountBasisPoints: ratePlan.monthlyDiscountBasisPoints ?? 0,
    fees: (listing.feeDefinitions || []).map((fee) => ({
      name: fee.name,
      feeType: fee.feeType,
      kind: fee.calculation,
      amountCents: fee.amountCents,
      percentageBasisPoints: fee.percentageBasisPoints,
      taxable: fee.taxable,
      required: fee.required
    })),
    taxes: (listing.taxRules || []).map((tax) => ({ name: tax.name, rateBasisPoints: tax.rateBasisPoints, inclusive: tax.isInclusive === true }))
  });
  const maximumStay = ratePlan.maximumStay ?? listing.maximumStay;
  if (maximumStay != null && calculation.numberOfNights > maximumStay) {
    throw new Error(`This listing allows a maximum stay of ${maximumStay} nights.`);
  }
  for (const [key, value] of Object.entries({
    lodgingSubtotalCents: calculation.lodgingSubtotalCents,
    feeTotalCents: calculation.feeTotalCents,
    taxTotalCents: calculation.taxTotalCents,
    securityDepositCents: calculation.securityDepositCents,
    totalAmountCents: calculation.totalAmountCents
  })) assertSafeCents(value, key);
  return calculation;
}
function amendmentRefundAllocations(refundDueCents, payments) {
  let remaining = refundDueCents;
  const allocations = [];
  for (const payment of payments) {
    if (!settledPaymentStatuses3.includes(payment.status || "")) continue;
    const available = payment.amountCents - (payment.refundedAmountCents || 0);
    const amountCents = Math.min(available, remaining);
    if (amountCents <= 0) continue;
    if (!["pp_system_default", "pp_stripe_stripe"].includes(payment.provider)) {
      throw new Error("The amended total is below a payment from an unsupported provider; no refund transfer is available in this workflow, so the amendment cannot be applied.");
    }
    allocations.push({ paymentId: payment.id, amountCents });
    remaining -= amountCents;
    if (remaining === 0) break;
  }
  if (remaining !== 0) throw new Error("The settled payment ledger cannot cover the amendment refund liability.");
  return allocations;
}
function resultFromRecord(record5, replayed) {
  const after = record5.afterSnapshot || {};
  return {
    id: record5.id,
    reservationId: record5.reservationId,
    status: "applied",
    checkInDate: record5.checkInDate,
    checkOutDate: record5.checkOutDate,
    currencyCode: record5.currencyCode,
    delta: record5.delta,
    totalAmountCents: after.amounts?.totalAmountCents,
    amountPaidCents: after.amounts?.amountPaidCents,
    paymentStatus: after.amounts?.paymentStatus,
    balanceDueCents: after.amounts?.balanceDueCents,
    refundLiabilityCents: after.amounts?.refundDueCents,
    replayed
  };
}
async function runWithRetry(operation, attempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const retryable = error?.code === "P2034" || error?.meta?.code === "40001" || /write conflict|deadlock|serializ|could not serialize/i.test(error?.message || "");
      if (!retryable || attempt === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
    }
  }
  throw lastError;
}
async function lockReservationRow(tx, reservationId) {
  await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `reservation:${reservationId}`);
  await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', reservationId);
}
function requestHash(args) {
  return digest({
    reservationId: args.reservationId,
    expectedCheckInDate: args.expectedCheckInDate,
    expectedCheckOutDate: args.expectedCheckOutDate,
    checkInDate: args.checkInDate,
    checkOutDate: args.checkOutDate,
    reason: args.reason
  });
}
async function amendConfirmedStayOperation(_root, input, context, testHooks = {}) {
  const args = {
    ...input,
    reservationId: input.reservationId?.trim() || "",
    expectedCheckInDate: input.expectedCheckInDate?.trim() || "",
    expectedCheckOutDate: input.expectedCheckOutDate?.trim() || "",
    checkInDate: input.checkInDate?.trim() || "",
    checkOutDate: input.checkOutDate?.trim() || "",
    reason: input.reason?.trim() || "",
    idempotencyKey: input.idempotencyKey?.trim() || ""
  };
  if (!args.reservationId) throw new Error("A reservation is required.");
  if (args.reason.length < 3 || args.reason.length > 1e3) throw new Error("Provide an amendment reason of 3 to 1000 characters.");
  if (args.idempotencyKey.length < 8 || args.idempotencyKey.length > 200) throw new Error("The amendment idempotency key must contain 8 to 200 characters.");
  const requestDigest = requestHash(args);
  const initial = await context.prisma.reservation.findUnique({
    where: { id: args.reservationId },
    select: { id: true, hostOrganizationId: true }
  });
  if (!initial?.hostOrganizationId) throw new Error("Reservation not found.");
  await assertHostOrganizationAccess({
    context,
    hostOrganizationId: initial.hostOrganizationId,
    permission: "canManageReservations"
  });
  return runWithRetry(() => context.prisma.$transaction(async (tx) => {
    await lockReservationRow(tx, args.reservationId);
    const locked = await tx.reservation.findUnique({
      where: { id: args.reservationId },
      select: {
        id: true,
        hostOrganizationId: true,
        listingId: true,
        accommodationUnitId: true,
        confirmationCode: true,
        status: true,
        checkInDate: true,
        checkOutDate: true,
        currencyCode: true,
        lodgingSubtotalCents: true,
        feeTotalCents: true,
        taxTotalCents: true,
        discountTotalCents: true,
        securityDepositCents: true,
        totalAmountCents: true,
        amountPaidCents: true,
        bookingSnapshot: true,
        tripTokenExpiresAt: true,
        tripTokenRevokedAt: true
      }
    });
    if (!locked?.hostOrganizationId || locked.hostOrganizationId !== initial.hostOrganizationId) throw new Error("Reservation not found.");
    const existing = await tx.reservationAmendment.findUnique({ where: { idempotencyKey: args.idempotencyKey } });
    if (existing) {
      if (existing.reservationId !== locked.id || existing.hostOrganizationId !== locked.hostOrganizationId || existing.requestHash !== requestDigest) {
        throw new Error("This idempotency key was already used for a different amendment request.");
      }
      return resultFromRecord(existing, true);
    }
    if (!["confirmed"].includes(locked.status || "")) throw new Error("Only confirmed reservations can be amended.");
    if (locked.checkInDate !== args.expectedCheckInDate || locked.checkOutDate !== args.expectedCheckOutDate) {
      throw new Error("Reservation dates changed; reload the stay before submitting an amendment.");
    }
    if (locked.checkInDate === args.checkInDate && locked.checkOutDate === args.checkOutDate) {
      throw new Error("The amended dates must differ from the current reservation dates.");
    }
    assertStayNotInPast(args.checkInDate);
    const serviceUnit = locked.accommodationUnitId ? await tx.accommodationUnit.findUnique({ where: { id: locked.accommodationUnitId }, select: { property: { select: { timezone: true } } } }) : null;
    const serviceTimeZone = serviceUnit?.property?.timezone || locked.bookingSnapshot?.listing?.property?.timezone;
    if (args.checkInDate < zonedTodayIso(serviceTimeZone)) throw new Error("Check-in cannot be in the past.");
    validateDateRange(args.expectedCheckInDate, args.expectedCheckOutDate);
    validateDateRange(args.checkInDate, args.checkOutDate);
    const hostOrganizationId = locked.hostOrganizationId;
    const listingId = locked.listingId;
    const accommodationUnitId = locked.accommodationUnitId;
    if (!listingId || !accommodationUnitId) throw new Error("This reservation has no complete listing and unit allocation to amend safely.");
    await lockListingCapacity(tx, [listingId]);
    await lockAccommodationUnitCapacity(tx, [accommodationUnitId]);
    await tx.$queryRawUnsafe('SELECT "id" FROM "Listing" WHERE "id" = $1 FOR UPDATE', listingId);
    await tx.$queryRawUnsafe('SELECT "id" FROM "AccommodationUnit" WHERE "id" = $1 FOR UPDATE', accommodationUnitId);
    const [current2, listing, unit] = await Promise.all([
      tx.reservation.findUnique({
        where: { id: locked.id },
        select: {
          id: true,
          hostOrganizationId: true,
          listingId: true,
          accommodationUnitId: true,
          confirmationCode: true,
          status: true,
          checkInDate: true,
          checkOutDate: true,
          currencyCode: true,
          lodgingSubtotalCents: true,
          feeTotalCents: true,
          taxTotalCents: true,
          discountTotalCents: true,
          securityDepositCents: true,
          totalAmountCents: true,
          amountPaidCents: true,
          bookingSnapshot: true,
          tripTokenExpiresAt: true,
          tripTokenRevokedAt: true,
          testMode: true
        }
      }),
      tx.listing.findUnique({ where: { id: listingId }, select: { id: true, hostOrganizationId: true, accommodationUnitId: true } }),
      tx.accommodationUnit.findUnique({ where: { id: accommodationUnitId }, select: { id: true, hostOrganizationId: true, status: true } })
    ]);
    if (!current2 || current2.hostOrganizationId !== hostOrganizationId || current2.listingId !== listingId || current2.accommodationUnitId !== accommodationUnitId || current2.checkInDate !== args.expectedCheckInDate || current2.checkOutDate !== args.expectedCheckOutDate || current2.status !== "confirmed") {
      throw new Error("Reservation allocation or dates changed; reload the stay before submitting an amendment.");
    }
    if (current2.testMode) throw new Error("This is a test booking: it holds no dates, so it can\u2019t be amended. Cancel it and make a new test booking.");
    if (!listing || listing.hostOrganizationId !== hostOrganizationId || !unit || unit.hostOrganizationId !== hostOrganizationId || unit.status !== "available") {
      throw new Error("The reservation listing and accommodation unit are no longer a valid available allocation.");
    }
    const capacityBlocks = await tx.calendarBlock.findMany({
      where: { reservationId: current2.id, hostOrganizationId, reason: "reservation", status: "active" },
      orderBy: [{ id: "asc" }],
      select: { id: true, listingId: true, startDate: true, endDate: true }
    });
    if (capacityBlocks.length !== 1 || capacityBlocks[0].startDate !== current2.checkInDate || capacityBlocks[0].endDate !== current2.checkOutDate) {
      throw new Error("The reservation does not have exactly one matching active capacity block.");
    }
    const blockListing = capacityBlocks[0].listingId === listingId ? listing : await tx.listing.findUnique({ where: { id: capacityBlocks[0].listingId }, select: { id: true, hostOrganizationId: true, accommodationUnitId: true } });
    if (!blockListing || blockListing.hostOrganizationId !== hostOrganizationId || blockListing.accommodationUnitId !== accommodationUnitId) {
      throw new Error("The reservation\u2019s capacity block isn\u2019t on its allocated accommodation unit.");
    }
    if (blockListing.id !== listingId) await lockListingCapacity(tx, [blockListing.id]);
    const conflict = await findAccommodationUnitCapacityConflict(tx, {
      accommodationUnitId,
      hostOrganizationId,
      checkInDate: args.checkInDate,
      checkOutDate: args.checkOutDate,
      excludeReservationId: current2.id,
      excludeCalendarBlockId: capacityBlocks[0].id
    });
    if (conflict) throw new Error("The accommodation unit is not available for the amended dates.");
    const amountsBefore = reservationAmounts(current2);
    if (amountsBefore.amountPaidCents > amountsBefore.totalAmountCents) {
      throw new Error("The current settled amount exceeds the reservation total; reconcile the payment evidence before amending.");
    }
    if (amountsBefore.discountTotalCents !== 0) {
      throw new Error("This reservation has a discount that cannot be safely repriced by the amendment workflow.");
    }
    const bookingSnapshot = current2.bookingSnapshot;
    if (!bookingSnapshot || typeof bookingSnapshot !== "object") {
      throw new Error("The original booking snapshot is missing; this reservation cannot be amended safely.");
    }
    const originalQuote = bookingSnapshot.quote;
    if (!originalQuote || !bookingSnapshot.listing || originalQuote.currencyCode?.toUpperCase() !== current2.currencyCode.toUpperCase()) {
      throw new Error("The original booking pricing evidence is incomplete or inconsistent.");
    }
    const originalBookingSnapshotHash = digest(bookingSnapshot);
    const latestAmendment = await tx.reservationAmendment.findFirst({
      where: { reservationId: current2.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }]
    });
    const pricingBefore = latestAmendment?.afterSnapshot?.pricingQuote || originalQuote;
    const priorAmounts = latestAmendment?.afterSnapshot?.amounts;
    if (latestAmendment) {
      if (latestAmendment.checkInDate !== current2.checkInDate || latestAmendment.checkOutDate !== current2.checkOutDate || latestAmendment.currencyCode !== current2.currencyCode || latestAmendment.originalBookingSnapshotHash !== originalBookingSnapshotHash || !pricingBefore || pricingBefore.checkIn !== current2.checkInDate || pricingBefore.checkOut !== current2.checkOutDate || pricingBefore.totalAmountCents !== amountsBefore.totalAmountCents || !priorAmounts || priorAmounts.totalAmountCents !== amountsBefore.totalAmountCents || priorAmounts.lodgingSubtotalCents !== amountsBefore.lodgingSubtotalCents || priorAmounts.feeTotalCents !== amountsBefore.feeTotalCents || priorAmounts.taxTotalCents !== amountsBefore.taxTotalCents || priorAmounts.securityDepositCents !== amountsBefore.securityDepositCents) {
        throw new Error("The latest amendment evidence does not match the current reservation amounts.");
      }
    } else if (originalQuote.checkIn !== current2.checkInDate || originalQuote.checkOut !== current2.checkOutDate || originalQuote.totalAmountCents !== amountsBefore.totalAmountCents || originalQuote.lodgingSubtotalCents !== amountsBefore.lodgingSubtotalCents || originalQuote.feeTotalCents !== amountsBefore.feeTotalCents || originalQuote.taxTotalCents !== amountsBefore.taxTotalCents || originalQuote.securityDepositCents !== amountsBefore.securityDepositCents) {
      throw new Error("The original booking snapshot does not match the current reservation amounts.");
    }
    const payments = await tx.payment.findMany({
      where: { reservationId: current2.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, status: true, amountCents: true, refundedAmountCents: true, currencyCode: true, provider: true, data: true }
    });
    const unsettledRefund = await tx.refund.findFirst({
      where: { reservationId: current2.id, status: { in: pendingMoneyStatuses } },
      select: { id: true }
    });
    if (unsettledRefund) throw new Error("Resolve pending refunds before amending this stay.");
    const unresolvedAmendmentRefund = await tx.refund.findFirst({
      where: { reservationId: current2.id, reservationAmendmentId: { not: null }, status: "failed" },
      select: { id: true }
    });
    if (unresolvedAmendmentRefund) throw new Error("Resolve the failed amendment refund liability before amending this stay.");
    if (payments.some((payment) => pendingMoneyStatuses.includes(payment.status || ""))) {
      throw new Error("Settle or resolve pending payments before amending this stay.");
    }
    const refundEvidence = await tx.refund.findMany({
      where: { reservationId: current2.id },
      select: { id: true, paymentId: true, status: true, amountCents: true, currencyCode: true }
    });
    const reconciliation = reconcileReservationPaymentEvidence({
      payments,
      refunds: refundEvidence,
      currencyCode: current2.currencyCode,
      testMode: current2.testMode === true
    });
    const { netPaidCents, hasRefunds } = reconciliation;
    if (netPaidCents !== amountsBefore.amountPaidCents) {
      throw new Error("Reservation paid amount does not reconcile to settled payment evidence.");
    }
    const currentParty = await tx.guestParty.findUnique({ where: { reservationId: current2.id }, select: { adults: true, children: true, pets: true } });
    const quote = buildAmendedQuote({
      bookingSnapshot,
      currentParty,
      checkInDate: args.checkInDate,
      checkOutDate: args.checkOutDate,
      currencyCode: current2.currencyCode,
      securityDepositCents: amountsBefore.securityDepositCents
    });
    const refundDueCents = Math.max(netPaidCents - quote.totalAmountCents, 0);
    const refundAllocations = refundDueCents > 0 ? amendmentRefundAllocations(refundDueCents, payments) : [];
    const paymentStatus = reservationPaymentStatus({
      ...reconciliation,
      totalAmountCents: quote.totalAmountCents,
      openRefundCents: Math.max(reconciliation.openRefundCents, refundDueCents)
    });
    const amountsAfter = {
      lodgingSubtotalCents: quote.lodgingSubtotalCents,
      feeTotalCents: quote.feeTotalCents,
      taxTotalCents: quote.taxTotalCents,
      discountTotalCents: amountsBefore.discountTotalCents,
      securityDepositCents: amountsBefore.securityDepositCents,
      totalAmountCents: quote.totalAmountCents,
      amountPaidCents: netPaidCents,
      balanceDueCents: Math.max(quote.totalAmountCents - netPaidCents, 0),
      refundDueCents,
      paymentStatus
    };
    const pricingQuote = {
      ...quote,
      quoteNumber: `AMEND-${digest(args.idempotencyKey).slice(0, 20).toUpperCase()}`
    };
    const beforeSnapshot = {
      checkInDate: current2.checkInDate,
      checkOutDate: current2.checkOutDate,
      amounts: amountsBefore,
      pricingQuote: pricingBefore
    };
    const agreement = await tx.stayAgreement.findFirst({ where: { reservation: { id: current2.id } }, select: { id: true, agreementNumber: true, status: true, signedAt: true } });
    const afterSnapshot = {
      checkInDate: args.checkInDate,
      checkOutDate: args.checkOutDate,
      amounts: amountsAfter,
      pricingQuote,
      agreementAddendum: {
        agreementId: agreement?.id || null,
        agreementNumber: agreement?.agreementNumber || null,
        originalStatus: agreement?.status || null,
        originalSignedAt: agreement?.signedAt ? new Date(agreement.signedAt).toISOString() : null,
        guestAcceptance: "not_recorded"
      }
    };
    const delta = {
      lodgingSubtotalCents: amountsAfter.lodgingSubtotalCents - amountsBefore.lodgingSubtotalCents,
      feeTotalCents: amountsAfter.feeTotalCents - amountsBefore.feeTotalCents,
      taxTotalCents: amountsAfter.taxTotalCents - amountsBefore.taxTotalCents,
      discountTotalCents: amountsAfter.discountTotalCents - amountsBefore.discountTotalCents,
      securityDepositCents: amountsAfter.securityDepositCents - amountsBefore.securityDepositCents,
      totalAmountCents: amountsAfter.totalAmountCents - amountsBefore.totalAmountCents,
      amountPaidCents: amountsAfter.amountPaidCents - amountsBefore.amountPaidCents,
      balanceDueCents: amountsAfter.balanceDueCents - amountsBefore.balanceDueCents,
      refundDueCents: amountsAfter.refundDueCents
    };
    const id2 = import_node_crypto6.default.randomUUID();
    const now = /* @__PURE__ */ new Date();
    const tokenExpiryFromCheckout = new Date((/* @__PURE__ */ new Date(`${args.checkOutDate}T00:00:00.000Z`)).getTime() + 30 * 24 * 60 * 60 * 1e3);
    const tokenExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1e3);
    const tripTokenExpiresAt = tokenExpiryFromCheckout > tokenExpiry ? tokenExpiryFromCheckout : tokenExpiry;
    const amendment = await tx.reservationAmendment.create({
      data: {
        id: id2,
        hostOrganizationId,
        reservationId: current2.id,
        idempotencyKey: args.idempotencyKey,
        requestHash: requestDigest,
        actorUserId: context.session.itemId,
        reason: args.reason,
        previousCheckInDate: current2.checkInDate,
        previousCheckOutDate: current2.checkOutDate,
        checkInDate: args.checkInDate,
        checkOutDate: args.checkOutDate,
        currencyCode: current2.currencyCode,
        originalBookingSnapshotHash,
        beforeSnapshot,
        afterSnapshot,
        delta
      }
    });
    for (const allocation of refundAllocations) {
      const liabilityKey = `amendment-refund:${digest({ amendmentId: amendment.id, paymentId: allocation.paymentId, amountCents: allocation.amountCents })}`;
      const refundId = import_node_crypto6.default.randomUUID();
      await tx.refund.create({
        data: {
          id: refundId,
          hostOrganizationId,
          reservationId: current2.id,
          paymentId: allocation.paymentId,
          reservationAmendmentId: amendment.id,
          refundNumber: `REF-AMD-${amendment.id.slice(0, 8)}-${refundId.slice(0, 8)}`,
          idempotencyKey: liabilityKey,
          status: "pending",
          reason: "stay_amendment",
          amountCents: allocation.amountCents,
          currencyCode: current2.currencyCode,
          data: { liabilityType: "reservation_amendment", amendmentId: amendment.id, policyReviewRequired: false }
        }
      });
    }
    await tx.reservation.update({
      where: { id: current2.id },
      data: {
        checkInDate: args.checkInDate,
        checkOutDate: args.checkOutDate,
        lodgingSubtotalCents: amountsAfter.lodgingSubtotalCents,
        feeTotalCents: amountsAfter.feeTotalCents,
        taxTotalCents: amountsAfter.taxTotalCents,
        securityDepositCents: amountsAfter.securityDepositCents,
        totalAmountCents: amountsAfter.totalAmountCents,
        amountPaidCents: amountsAfter.amountPaidCents,
        paymentStatus,
        tripTokenExpiresAt
      }
    });
    const movedBlock = await tx.calendarBlock.updateMany({
      where: {
        id: capacityBlocks[0].id,
        reservationId: current2.id,
        hostOrganizationId,
        listingId: blockListing.id,
        status: "active",
        startDate: current2.checkInDate,
        endDate: current2.checkOutDate
      },
      data: { startDate: args.checkInDate, endDate: args.checkOutDate }
    });
    if (movedBlock.count !== 1) throw new Error("Reservation capacity changed while applying the amendment.");
    await testHooks.afterWrites?.();
    return resultFromRecord(amendment, false);
  }, { maxWait: 5e3, timeout: 2e4, isolationLevel: "ReadCommitted" }));
}
async function amendConfirmedStay(root, args, context) {
  return amendConfirmedStayOperation(root, args, context);
}

// features/keystone/mutations/calendarExchange.ts
var import_node_crypto8 = __toESM(require("node:crypto"));

// features/integrations/channels/ical.ts
var import_node_crypto7 = __toESM(require("node:crypto"));
var MAX_BYTES = 1e6;
var MAX_EVENTS = 500;
var RECURRENCE_PROPERTIES = ["RRULE", "RDATE", "EXDATE", "EXRULE", "RECURRENCE-ID"];
function dateOnly(value, field) {
  if (!/^\d{8}$/.test(value)) throw new Error(`${field} must be an iCalendar date-only value.`);
  const formatted = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  const parsed = /* @__PURE__ */ new Date(`${formatted}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== formatted) throw new Error(`${field} is not a valid date.`);
  return formatted;
}
function unescapeText(value) {
  return value.replace(/\\n/gi, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim().slice(0, 500);
}
function parseICalendar(input) {
  if (typeof input !== "string" || !input.trim()) throw new Error("iCalendar text is required.");
  if (Buffer.byteLength(input, "utf8") > MAX_BYTES) throw new Error("iCalendar payload is too large.");
  const lines = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").reduce((result, line) => {
    if (/^[ \t]/.test(line) && result.length) result[result.length - 1] += line.slice(1);
    else result.push(line);
    return result;
  }, []);
  if (!lines.includes("BEGIN:VCALENDAR") || !lines.includes("END:VCALENDAR")) throw new Error("Malformed iCalendar document.");
  const events = [];
  let current2 = null;
  let recurrence = null;
  let nestedDepth = 0;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      if (current2) throw new Error("Nested iCalendar events are invalid.");
      current2 = {};
      recurrence = null;
      continue;
    }
    if (line === "END:VEVENT") {
      if (!current2 || nestedDepth) throw new Error("Malformed iCalendar event.");
      const uid = current2.UID?.trim();
      if (!uid || uid.length > 255) throw new Error("Every iCalendar event requires a bounded UID.");
      if (recurrence) throw new Error(`iCalendar event ${uid.slice(0, 80)} repeats with ${recurrence}. Export each date as its own event and import again.`);
      const startDate = dateOnly(current2.DTSTART || "", "DTSTART");
      const endDate = dateOnly(current2.DTEND || "", "DTEND");
      if (startDate >= endDate) throw new Error("iCalendar event end must be after its start.");
      events.push({ uid, startDate, endDate, summary: unescapeText(current2.SUMMARY || "External calendar hold"), status: current2.STATUS?.toUpperCase() === "CANCELLED" ? "cancelled" : "confirmed" });
      if (events.length > MAX_EVENTS) throw new Error("iCalendar event limit exceeded.");
      current2 = null;
      continue;
    }
    if (!current2) continue;
    if (/^BEGIN:/i.test(line)) {
      nestedDepth += 1;
      continue;
    }
    if (/^END:/i.test(line)) {
      nestedDepth = Math.max(0, nestedDepth - 1);
      continue;
    }
    if (nestedDepth) continue;
    const separator = line.indexOf(":");
    if (separator < 1) continue;
    const name = line.slice(0, separator).split(";")[0].toUpperCase();
    if (["UID", "DTSTART", "DTEND", "SUMMARY", "STATUS"].includes(name)) current2[name] = line.slice(separator + 1);
    else if (RECURRENCE_PROPERTIES.includes(name) && !recurrence) recurrence = name;
  }
  if (current2) throw new Error("Unclosed iCalendar event.");
  const seen = /* @__PURE__ */ new Set();
  for (const event of events) {
    if (seen.has(event.uid)) throw new Error(`Duplicate iCalendar UID: ${event.uid}`);
    seen.add(event.uid);
  }
  return events.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.uid.localeCompare(b.uid));
}
function icalDate(value) {
  return value.replaceAll("-", "");
}
function escapeText(value) {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\r?\n/g, "\\n");
}
function exportICalendar(events, calendarName) {
  const body = [...events].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.uid.localeCompare(b.uid)).flatMap((event) => [
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTART;VALUE=DATE:${icalDate(event.startDate)}`,
    `DTEND;VALUE=DATE:${icalDate(event.endDate)}`,
    `SUMMARY:${escapeText(event.summary)}`,
    ...event.status === "cancelled" ? ["STATUS:CANCELLED"] : [],
    "END:VEVENT"
  ]);
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Openfront Rental//Availability 1.0//EN", `X-WR-CALNAME:${escapeText(calendarName)}`, ...body, "END:VCALENDAR", ""].join("\r\n");
}
function iCalendarChecksum(input) {
  return import_node_crypto7.default.createHash("sha256").update(input, "utf8").digest("hex");
}

// features/integrations/channels/support.ts
var calendarImportMappingStatuses = ["mapped", "published"];
function statusLabel(status) {
  return typeof status === "string" && status ? status.replaceAll("_", " ") : "not set";
}
function calendarImportConnectionBlocker(connection) {
  if (!connection) return "connection unavailable";
  if (connection.provider !== "ical" || connection.connectionType !== "ical") return "adapter not installed";
  if (connection.status !== "active") return `connection ${statusLabel(connection.status)}`;
  if (connection.syncAvailability !== true) return "availability sync off";
  return null;
}
function calendarImportMappingBlocker(mapping) {
  if (!mapping) return "listing not mapped";
  return calendarImportMappingStatuses.includes(mapping.status) ? null : `mapping ${statusLabel(mapping.status)}`;
}

// features/keystone/utils/readBoundedPages.ts
async function readBoundedPages(fetchPage, options) {
  const { pageSize, maxItems, label } = options;
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || !Number.isSafeInteger(maxItems) || maxItems < 1 || !label.trim()) {
    throw new RangeError("Bounded pagination requires positive limits and a description.");
  }
  const items = [];
  let skip = 0;
  while (true) {
    const take = Math.min(pageSize, maxItems + 1 - items.length);
    const page = await fetchPage(skip, take);
    if (page.length > maxItems - items.length) {
      throw new Error(`${label} is incomplete because more than ${maxItems} records match. Narrow the request and retry.`);
    }
    items.push(...page);
    if (page.length < take) return items;
    skip += page.length;
  }
}

// features/keystone/mutations/calendarExchange.ts
function importKey(hostId, connectionId, listingId, checksum) {
  return `ical-import:${hostId}:${connectionId}:${listingId}:${checksum}`;
}
function attemptKey(baseKey, attempt) {
  return attempt === 1 ? baseKey : `${baseKey}:attempt:${attempt}`;
}
function blockId(connectionId, listingId, uid) {
  return `ical_${import_node_crypto8.default.createHash("sha256").update(`${connectionId}|${listingId}|${uid}`).digest("hex")}`;
}
var CALENDAR_PAGE_SIZE = 250;
var MAX_CALENDAR_EVIDENCE = 5e3;
var MAX_UNIT_LISTINGS = 200;
var MAX_MAPPINGS_PER_PAIR = 20;
var CAPACITY_RESERVATION_STATUSES = ["pending", "confirmed", "in_stay"];
var IMPORT_ERROR_PREFIXES = ["Availability import for ", "Availability import needs review"];
function isImportHealthMessage(message) {
  return !message || IMPORT_ERROR_PREFIXES.some((prefix) => message.startsWith(prefix));
}
async function refreshConnectionImportHealth(tx, connectionId, currentError, completedAt, succeeded) {
  const unresolved = await tx.channelListing.count({ where: { channelConnectionId: connectionId, lastImportIssue: { path: ["open"], equals: true } } });
  const data = succeeded && unresolved === 0 ? { lastSyncedAt: completedAt } : {};
  if (isImportHealthMessage(currentError)) {
    data.lastError = unresolved ? `Availability import needs review for ${unresolved} mapped listing${unresolved === 1 ? "" : "s"}.` : "";
  }
  if (Object.keys(data).length) await tx.channelConnection.update({ where: { id: connectionId }, data });
}
function eligibleMapping(mappings) {
  const mapping = mappings.find((candidate) => !calendarImportMappingBlocker(candidate));
  if (!mapping) throw new Error(`Calendar import is unavailable: ${calendarImportMappingBlocker(mappings[0])}.`);
  return mapping;
}
function readPairMappings(db, where) {
  return db.channelListing.findMany({
    where,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, status: true },
    take: MAX_MAPPINGS_PER_PAIR
  });
}
async function lockCalendarImportTarget(tx, input) {
  await tx.$queryRawUnsafe('SELECT "id" FROM "ChannelConnection" WHERE "id" = $1 FOR UPDATE', input.connectionId);
  const connection = await tx.channelConnection.findUnique({
    where: { id: input.connectionId },
    select: { id: true, hostOrganizationId: true, provider: true, connectionType: true, status: true, syncAvailability: true, lastError: true }
  });
  if (!connection || connection.hostOrganizationId !== input.hostOrganizationId) throw new Error("Calendar connection not found.");
  const blocker = calendarImportConnectionBlocker(connection);
  if (blocker) throw new Error(`Calendar import is unavailable: ${blocker}.`);
  await tx.$queryRawUnsafe('SELECT "id" FROM "ChannelListing" WHERE "channelConnection" = $1 AND "listing" = $2 FOR SHARE', input.connectionId, input.listingId);
  const mapping = eligibleMapping(await readPairMappings(tx, { channelConnectionId: input.connectionId, listingId: input.listingId, hostOrganizationId: input.hostOrganizationId }));
  return { connection, mapping };
}
async function importListingCalendar(_root, args, context) {
  const connection = await context.query.ChannelConnection.findOne({
    where: { id: args.channelConnectionId },
    query: "id provider connectionType status syncAvailability hostOrganization { id }"
  });
  if (!connection?.hostOrganization?.id) throw new Error("Calendar connection not found.");
  const hostOrganizationId = connection.hostOrganization.id;
  await assertHostOrganizationAccess({ context, hostOrganizationId, permission: "canManageChannels" });
  const connectionBlocker = calendarImportConnectionBlocker(connection);
  if (connectionBlocker) throw new Error(`Calendar import is unavailable: ${connectionBlocker}.`);
  const listing = await context.query.Listing.findOne({
    where: { id: args.listingId },
    query: "id title hostOrganization { id }"
  });
  if (!listing || listing.hostOrganization?.id !== hostOrganizationId) throw new Error("Calendar listing must belong to the same host organization.");
  eligibleMapping(await readPairMappings(context.prisma, { channelConnectionId: connection.id, listingId: listing.id, hostOrganizationId }));
  const sourceLabel = args.sourceLabel?.trim() || "Operator-provided iCalendar text";
  if (sourceLabel.length > 240) throw new Error("Calendar source label is too long.");
  return applyListingCalendarImport(context.prisma, { hostOrganizationId, connectionId: connection.id, listingId: listing.id, calendarText: args.calendarText, sourceLabel });
}
async function applyListingCalendarImport(prisma, input) {
  const { hostOrganizationId } = input;
  const connection = { id: input.connectionId };
  const listing = { id: input.listingId };
  const sourceLabel = input.sourceLabel;
  const events = parseICalendar(input.calendarText);
  const checksum = iCalendarChecksum(input.calendarText);
  const baseKey = importKey(hostOrganizationId, connection.id, listing.id, checksum);
  return prisma.$transaction(async (tx) => {
    await lockListingCapacity(tx, [listing.id]);
    const inventoryListing = await tx.listing.findUnique({
      where: { id: listing.id },
      select: { hostOrganizationId: true, accommodationUnitId: true }
    });
    if (!inventoryListing || inventoryListing.hostOrganizationId !== hostOrganizationId) {
      throw new Error("Calendar listing must belong to the same host organization.");
    }
    await lockAccommodationUnitCapacity(tx, [inventoryListing.accommodationUnitId]);
    const { connection: lockedConnection, mapping } = await lockCalendarImportTarget(tx, { hostOrganizationId, connectionId: connection.id, listingId: listing.id });
    const priorWhere = { channelConnectionId: connection.id, listingId: listing.id, direction: "import", payloadSha256: checksum, idempotencyKey: { startsWith: baseKey } };
    const latest = await tx.dataExchangeJob.findFirst({ where: priorWhere, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
    if (latest?.status === "succeeded") {
      const newest = input.fullSnapshot ? await tx.dataExchangeJob.findFirst({ where: { channelConnectionId: connection.id, listingId: listing.id, direction: "import" }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true } }) : null;
      if (!newest || newest.id === latest.id) return latest;
    }
    const attempt = await tx.dataExchangeJob.count({ where: priorWhere }) + 1;
    const idempotencyKey = attemptKey(baseKey, attempt);
    const retryOf = latest?.id || null;
    const startedAt = /* @__PURE__ */ new Date();
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let unchangedCount = 0;
    let conflictCount = 0;
    const conflicts = [];
    for (const event of events) {
      const id2 = blockId(connection.id, listing.id, event.uid);
      const current2 = await tx.calendarBlock.findUnique({ where: { id: id2 } });
      if (current2 && (current2.reservationId || current2.reason === "reservation")) {
        conflictCount += 1;
        conflicts.push({ uid: event.uid, startDate: event.startDate, endDate: event.endDate });
        continue;
      }
      if (event.status === "cancelled") {
        if (current2?.status === "active") {
          await tx.calendarBlock.update({ where: { id: id2 }, data: { status: "released", notes: `${event.summary} (cancelled in source calendar)` } });
          updatedCount += 1;
        } else skippedCount += 1;
        continue;
      }
      if (current2?.status === "active" && current2.reason === "channel_import" && current2.startDate === event.startDate && current2.endDate === event.endDate && current2.notes === event.summary) {
        unchangedCount += 1;
        continue;
      }
      const capacityConflict = inventoryListing.accommodationUnitId ? await findAccommodationUnitCapacityConflict(tx, {
        accommodationUnitId: inventoryListing.accommodationUnitId,
        hostOrganizationId,
        checkInDate: event.startDate,
        checkOutDate: event.endDate,
        excludeCalendarBlockId: id2
      }) : await findListingCapacityConflict(tx, {
        listingId: listing.id,
        checkInDate: event.startDate,
        checkOutDate: event.endDate,
        excludeCalendarBlockId: id2
      });
      if (capacityConflict) {
        conflictCount += 1;
        conflicts.push({ uid: event.uid, startDate: event.startDate, endDate: event.endDate });
        continue;
      }
      const data = {
        hostOrganizationId,
        listingId: listing.id,
        startDate: event.startDate,
        endDate: event.endDate,
        reason: "channel_import",
        status: "active",
        source: "ical",
        externalUid: event.uid,
        notes: event.summary
      };
      if (current2) {
        await tx.calendarBlock.update({ where: { id: id2 }, data });
        updatedCount += 1;
      } else {
        await tx.calendarBlock.create({ data: { id: id2, ...data } });
        createdCount += 1;
      }
    }
    if (input.fullSnapshot) {
      const present = new Set(events.map((event) => blockId(connection.id, listing.id, event.uid)));
      const imported = await tx.calendarBlock.findMany({
        where: { listingId: listing.id, hostOrganizationId, status: "active", reason: "channel_import", source: "ical", reservationId: null },
        select: { id: true, notes: true, externalUid: true },
        take: MAX_CALENDAR_EVIDENCE
      });
      for (const block of imported) {
        const ownBlock = Boolean(block.externalUid) && block.id === blockId(connection.id, listing.id, block.externalUid);
        if (!ownBlock || present.has(block.id)) continue;
        await tx.calendarBlock.update({ where: { id: block.id }, data: { status: "released", notes: `${block.notes || "Unavailable"} (removed from source calendar)` } });
        updatedCount += 1;
      }
    }
    const applied = createdCount + updatedCount + unchangedCount;
    const status = conflictCount ? applied ? "partially_succeeded" : "failed" : "succeeded";
    const errorMessage = conflictCount ? `${conflictCount} event(s) conflicted with active local availability evidence.` : "";
    const counts = { processedCount: events.length, createdCount, updatedCount, skippedCount: skippedCount + unchangedCount, conflictCount };
    const completedAt = /* @__PURE__ */ new Date();
    const job = await tx.dataExchangeJob.create({
      data: {
        id: import_node_crypto8.default.randomUUID(),
        hostOrganizationId,
        channelConnectionId: connection.id,
        listingId: listing.id,
        direction: "import",
        domain: "availability",
        format: "ical",
        status,
        idempotencyKey,
        payloadSha256: checksum,
        sourceLabel,
        ...counts,
        resultSummary: { availabilityOnly: true, channelListingId: mapping.id, attempt, retryOf, unchangedCount, conflicts },
        errorMessage,
        startedAt,
        completedAt
      }
    });
    await tx.channelSyncEvent.create({
      data: {
        id: import_node_crypto8.default.randomUUID(),
        hostOrganizationId,
        channelConnectionId: connection.id,
        channelListingId: mapping.id,
        action: "availability_import",
        status,
        message: `iCalendar availability import ${status.replaceAll("_", " ")}.`,
        payload: { jobId: job.id, checksum, attempt, retryOf, ...counts },
        errorMessage,
        attempts: attempt,
        occurredAt: completedAt
      }
    });
    if (status === "succeeded") {
      await tx.channelListing.update({ where: { id: mapping.id }, data: { lastSyncedAt: completedAt, lastImportIssue: { open: false, resolvedByJobId: job.id, at: completedAt.toISOString() } } });
    } else {
      await tx.channelListing.update({ where: { id: mapping.id }, data: { lastImportIssue: { open: true, jobId: job.id, status, conflictCount, listingId: listing.id, at: completedAt.toISOString() } } });
    }
    await refreshConnectionImportHealth(tx, connection.id, String(lockedConnection.lastError || ""), completedAt, status === "succeeded");
    return job;
  }, { maxWait: 5e3, timeout: 2e4, isolationLevel: "Serializable" });
}
function blockSummary(reason) {
  return reason === "property_maintenance" ? "Unavailable - property maintenance" : "Unavailable";
}
async function exportListingCalendar(_root, args, context) {
  const listing = await context.query.Listing.findOne({ where: { id: args.listingId }, query: "id title hostOrganization { id }" });
  if (!listing?.hostOrganization?.id) throw new Error("Listing not found.");
  const hostOrganizationId = listing.hostOrganization.id;
  await assertHostOrganizationAccess({ context, hostOrganizationId, permission: "canReadChannels" });
  return listingAvailabilityCalendar(context.prisma, { id: listing.id, title: listing.title, hostOrganizationId });
}
async function listingAvailabilityCalendar(prisma, listing) {
  const hostOrganizationId = listing.hostOrganizationId;
  const { reservations, blocks } = await prisma.$transaction(async (tx) => {
    const inventory = await tx.listing.findUnique({ where: { id: listing.id }, select: { hostOrganizationId: true, accommodationUnitId: true } });
    if (!inventory || inventory.hostOrganizationId !== hostOrganizationId) throw new Error("Listing not found.");
    let listingIds = [listing.id];
    let reservationWhere = { listingId: listing.id, status: { in: CAPACITY_RESERVATION_STATUSES }, ...REAL_STAY };
    if (inventory.accommodationUnitId) {
      const unit = await tx.accommodationUnit.findUnique({ where: { id: inventory.accommodationUnitId }, select: { hostOrganizationId: true } });
      if (!unit || unit.hostOrganizationId !== hostOrganizationId) throw new Error("Listing inventory must belong to the same host organization.");
      const unitListings = await readBoundedPages(
        (skip, take) => tx.listing.findMany({ where: { accommodationUnitId: inventory.accommodationUnitId, hostOrganizationId }, orderBy: { id: "asc" }, select: { id: true }, take, skip }),
        { pageSize: MAX_UNIT_LISTINGS, maxItems: MAX_UNIT_LISTINGS, label: "Calendar export listings" }
      );
      listingIds = [.../* @__PURE__ */ new Set([listing.id, ...unitListings.map((unitListing) => unitListing.id)])];
      reservationWhere = { accommodationUnitId: inventory.accommodationUnitId, status: { in: CAPACITY_RESERVATION_STATUSES }, ...REAL_STAY };
    }
    return {
      reservations: await readBoundedPages(
        (skip, take) => tx.reservation.findMany({
          where: reservationWhere,
          orderBy: [{ checkInDate: "asc" }, { id: "asc" }],
          select: { id: true, checkInDate: true, checkOutDate: true },
          take,
          skip
        }),
        { pageSize: CALENDAR_PAGE_SIZE, maxItems: MAX_CALENDAR_EVIDENCE, label: "Calendar export reservations" }
      ),
      blocks: await readBoundedPages(
        (skip, take) => tx.calendarBlock.findMany({
          where: { listingId: { in: listingIds }, status: "active", ...REAL_CAPACITY_BLOCK },
          orderBy: [{ startDate: "asc" }, { id: "asc" }],
          select: { id: true, listingId: true, reservationId: true, externalUid: true, startDate: true, endDate: true, reason: true },
          take,
          skip
        }),
        { pageSize: CALENDAR_PAGE_SIZE, maxItems: MAX_CALENDAR_EVIDENCE, label: "Calendar export" }
      )
    };
  }, { maxWait: 5e3, timeout: 2e4, isolationLevel: "RepeatableRead" });
  const internalUid = (id2) => `housekind-${listing.id}-${id2}`;
  const reservationsById = new Map(reservations.map((reservation) => [reservation.id, reservation]));
  const reservationUids = /* @__PURE__ */ new Map();
  const events = [];
  const uids = /* @__PURE__ */ new Set();
  const push = (preferredUid, fallbackUid, event) => {
    const uid = uids.has(preferredUid) ? fallbackUid : preferredUid;
    uids.add(uid);
    events.push({ uid, ...event, status: "confirmed" });
  };
  for (const block of blocks) {
    const ownListing = block.listingId === listing.id;
    const reservation = block.reservationId ? reservationsById.get(block.reservationId) : null;
    if (reservation && reservation.checkInDate === block.startDate && reservation.checkOutDate === block.endDate) {
      if (ownListing && !reservationUids.has(reservation.id)) reservationUids.set(reservation.id, block.externalUid || internalUid(block.id));
      continue;
    }
    push(ownListing ? block.externalUid || internalUid(block.id) : internalUid(block.id), internalUid(block.id), { startDate: block.startDate, endDate: block.endDate, summary: blockSummary(block.reason) });
  }
  for (const reservation of reservations) {
    const fallbackUid = internalUid(`reservation-${reservation.id}`);
    push(reservationUids.get(reservation.id) || fallbackUid, fallbackUid, { startDate: reservation.checkInDate, endDate: reservation.checkOutDate, summary: "Unavailable" });
  }
  const calendarText = exportICalendar(events, `${listing.title} availability`);
  return { listingId: listing.id, checksum: iCalendarChecksum(calendarText), eventCount: events.length, calendarText };
}

// features/keystone/mutations/createStayReservation.ts
var import_node_crypto12 = __toESM(require("node:crypto"));
var import_node_util = require("node:util");

// features/keystone/utils/publicTokenAccess.ts
var import_node_crypto9 = __toESM(require("node:crypto"));
var TOKEN_BYTES = 24;
var TOKEN_LIFETIME_DAYS = 30;
function createPublicOwnershipToken() {
  return import_node_crypto9.default.randomBytes(TOKEN_BYTES).toString("hex");
}
function hashPublicOwnershipToken(token) {
  return import_node_crypto9.default.createHash("sha256").update(token).digest("hex");
}
function publicTokenExpiry(issuedAt = /* @__PURE__ */ new Date()) {
  return new Date(issuedAt.getTime() + TOKEN_LIFETIME_DAYS * 24 * 60 * 60 * 1e3);
}
function isExpired(value, now) {
  if (!value) return true;
  const expiresAt = value instanceof Date ? value : new Date(value);
  return Number.isNaN(expiresAt.getTime()) || expiresAt <= now;
}
function isPublicOwnershipTokenActive(record5, now = /* @__PURE__ */ new Date()) {
  return Boolean(record5 && !record5.tokenRevokedAt && !isExpired(record5.tokenExpiresAt, now));
}
async function resolvePublicTokenRecord({
  token,
  invalidMessage,
  findRecordByHash,
  isUnavailable = () => false,
  now = /* @__PURE__ */ new Date()
}) {
  if (!token || token.length < 16) {
    throw new Error(invalidMessage);
  }
  const record5 = await findRecordByHash(hashPublicOwnershipToken(token));
  const tokenRecord = record5;
  if (!record5 || !isPublicOwnershipTokenActive(tokenRecord, now) || isUnavailable(record5)) {
    return null;
  }
  return record5;
}

// features/keystone/lib/runtimeSecrets.ts
var DEVELOPMENT_SESSION_SECRET = "openfront-local-development-session-secret-only";
function resolvePostgresDatabaseUrl(environment = process.env) {
  const configured = environment.DATABASE_URL?.trim();
  if (!configured) throw new Error("DATABASE_URL is required.");
  let parsed;
  try {
    parsed = new URL(configured);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL.");
  }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol) || !parsed.hostname || parsed.pathname === "" || parsed.pathname === "/") {
    throw new Error("DATABASE_URL must identify a PostgreSQL host and database.");
  }
  return configured;
}
function resolveSessionSecret(environment = process.env) {
  const configured = environment.SESSION_SECRET?.trim();
  if (configured) {
    if (configured.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
    if (environment.NODE_ENV === "production" && configured === DEVELOPMENT_SESSION_SECRET) {
      throw new Error("A development session secret cannot be used in production.");
    }
    return configured;
  }
  if (environment.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production.");
  }
  return DEVELOPMENT_SESSION_SECRET;
}

// features/keystone/utils/reservationTaskAutomation.ts
var import_node_crypto10 = __toESM(require("node:crypto"));
var triggersForTransition = {
  confirm: ["reservation_confirmed", "before_check_in"],
  complete: ["after_check_out"],
  cancel: ["reservation_cancelled"]
};
var DAY_MS3 = 864e5;
var DEFAULT_CHECK_IN = "16:00";
var DEFAULT_CHECK_OUT = "11:00";
var STALE_DEFAULT_ASSIGNEE_NOTE = "Queued unassigned: the rule\u2019s default assignee isn\u2019t an active member of this host.";
var RULE_SCAN_LIMIT = 50;
var EVALUATION_CREATE_LIMIT = 200;
var listingSelect = { id: true, title: true, propertyId: true, property: { select: { timezone: true, checkInFrom: true, checkOutBy: true } } };
function renderTitle(template, listingTitle, confirmationCode2) {
  return template.replaceAll("{{listing.title}}", listingTitle).replaceAll("{{reservation.confirmationCode}}", confirmationCode2).slice(0, 240);
}
function clockTime(value, fallback) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim()) ? value.trim() : fallback;
}
function dateShift(dateIso, days) {
  return new Date(Date.parse(`${dateIso}T00:00:00.000Z`) + days * DAY_MS3).toISOString().slice(0, 10);
}
function localCheckIn(reservation, property) {
  return zonedLocalTimestamp(reservation.checkInDate, clockTime(reservation.scheduledCheckInTime, clockTime(property?.checkInFrom, DEFAULT_CHECK_IN)), property?.timezone);
}
async function localCheckOut(tx, reservation, property) {
  const scheduled = zonedLocalTimestamp(reservation.checkOutDate, clockTime(reservation.scheduledCheckOutTime, clockTime(property?.checkOutBy, DEFAULT_CHECK_OUT)), property?.timezone);
  const recorded = reservation.checkedOutAt ? new Date(reservation.checkedOutAt).getTime() : NaN;
  if (!Number.isFinite(recorded)) return scheduled;
  const stored = reservation.id ? await tx.reservation.findUnique({ where: { id: reservation.id }, select: { checkOutDate: true } }) : null;
  const shortened = Boolean(stored?.checkOutDate && reservation.checkOutDate < stored.checkOutDate);
  return shortened ? recorded : Math.min(recorded, scheduled);
}
async function serviceListing(tx, reservation) {
  const listing = await tx.listing.findUnique({ where: { id: reservation.listingId }, select: listingSelect });
  if (!listing || !reservation.accommodationUnitId) return listing;
  const unit = await tx.accommodationUnit.findUnique({ where: { id: reservation.accommodationUnitId }, select: { propertyId: true, property: { select: { timezone: true, checkInFrom: true, checkOutBy: true } } } });
  if (!unit?.propertyId || unit.propertyId === listing.propertyId) return listing;
  return { ...listing, propertyId: unit.propertyId, property: unit.property };
}
async function triggerAnchor(tx, trigger, reservation, property, now) {
  if (trigger === "reservation_confirmed") return now.getTime();
  if (trigger === "after_check_out") return localCheckOut(tx, reservation, property);
  return localCheckIn(reservation, property);
}
async function usableDefaultAssignee(tx, hostOrganizationId, userId, checked) {
  if (!userId) return null;
  if (!checked.has(userId)) checked.set(userId, await isActiveTaskAssignee(tx, hostOrganizationId, userId));
  return checked.get(userId) ? userId : null;
}
async function upsertRuleTask(tx, input) {
  const { rule, reservation, listing, trigger, anchor, assignees } = input;
  const idempotencyKey = propertyTaskRuleKey(rule.id, reservation.id);
  const assigneeId = await usableDefaultAssignee(tx, reservation.hostOrganizationId, rule.defaultAssigneeId, assignees);
  const staleDefault = Boolean(rule.defaultAssigneeId && !assigneeId);
  const task = await tx.propertyTask.upsert({
    where: { idempotencyKey },
    update: {},
    create: {
      id: import_node_crypto10.default.randomUUID(),
      hostOrganizationId: reservation.hostOrganizationId,
      propertyId: listing.propertyId,
      listingId: listing.id,
      reservationId: reservation.id,
      taskRuleId: rule.id,
      assigneeId,
      idempotencyKey,
      source: "task_rule",
      title: renderTitle(rule.titleTemplate, listing.title, reservation.confirmationCode),
      taskType: rule.taskType,
      status: assigneeId ? "assigned" : "queued",
      priority: rule.priority,
      dueAt: new Date(anchor + (rule.offsetMinutes || 0) * 6e4),
      claimedAt: assigneeId ? /* @__PURE__ */ new Date() : null,
      checklist: rule.checklistTemplate ?? [],
      ...staleDefault ? { notes: STALE_DEFAULT_ASSIGNEE_NOTE } : {}
    }
  });
  return task;
}
async function createReservationTasksForTransition(tx, reservation, transition) {
  const triggers = triggersForTransition[transition];
  if (!triggers || reservation.testMode === true || reservation.fixtureOrigin) return [];
  const listing = await serviceListing(tx, reservation);
  if (!listing?.propertyId) return [];
  const rules2 = await tx.taskRule.findMany({
    where: {
      hostOrganizationId: reservation.hostOrganizationId,
      isActive: true,
      trigger: { in: triggers },
      OR: [{ listingId: listing.id }, { listingId: null, propertyId: listing.propertyId }]
    },
    orderBy: [{ id: "asc" }]
  });
  const now = /* @__PURE__ */ new Date();
  const assignees = /* @__PURE__ */ new Map();
  const tasks = [];
  for (const rule of rules2) {
    if (rule.trigger === "before_check_in" && reservation.checkInDate < zonedTodayIso(listing.property?.timezone, now)) continue;
    const anchor = await triggerAnchor(tx, rule.trigger, reservation, listing.property, now);
    tasks.push(await upsertRuleTask(tx, { rule, reservation, listing, trigger: rule.trigger, anchor, assignees }));
  }
  return tasks;
}
async function createMissingBeforeCheckInTasks(tx, hostOrganizationId, now = /* @__PURE__ */ new Date(), afterRuleId = null) {
  const rules2 = await tx.taskRule.findMany({
    where: { hostOrganizationId, isActive: true, trigger: "before_check_in", OR: [{ listingId: { not: null } }, { propertyId: { not: null } }], ...afterRuleId ? { id: { gt: afterRuleId } } : {} },
    orderBy: [{ id: "asc" }],
    take: RULE_SCAN_LIMIT + 1
  });
  const page = rules2.slice(0, RULE_SCAN_LIMIT);
  const utcToday = now.toISOString().slice(0, 10);
  const assignees = /* @__PURE__ */ new Map();
  let created = 0;
  let resumeAt = null;
  for (const rule of page) {
    if (created >= EVALUATION_CREATE_LIMIT) {
      resumeAt ??= rule.id;
      break;
    }
    const scope = rule.listingId ? { listingId: rule.listingId } : { OR: [{ listing: { propertyId: rule.propertyId } }, { accommodationUnit: { propertyId: rule.propertyId } }] };
    const base = { hostOrganizationId, status: "confirmed", ...REAL_STAY, ...scope, tasks: { none: { taskRuleId: rule.id } } };
    const near = await tx.reservation.findMany({
      where: { ...base, checkInDate: { gte: dateShift(utcToday, -1), lte: dateShift(utcToday, 1) } },
      orderBy: [{ checkInDate: "asc" }, { id: "asc" }],
      take: EVALUATION_CREATE_LIMIT
    });
    const far = await tx.reservation.findMany({
      where: { ...base, checkInDate: { gt: dateShift(utcToday, 1) } },
      orderBy: [{ checkInDate: "asc" }, { id: "asc" }],
      take: EVALUATION_CREATE_LIMIT + 1
    });
    if (near.length >= EVALUATION_CREATE_LIMIT || far.length > EVALUATION_CREATE_LIMIT) resumeAt ??= rule.id;
    for (const reservation of [...near, ...far.slice(0, EVALUATION_CREATE_LIMIT)]) {
      if (created >= EVALUATION_CREATE_LIMIT) {
        resumeAt ??= rule.id;
        break;
      }
      const listing = await serviceListing(tx, reservation);
      if (!listing?.propertyId) continue;
      if (reservation.checkInDate < zonedTodayIso(listing.property?.timezone, now)) continue;
      await upsertRuleTask(tx, { rule, reservation, listing, trigger: "before_check_in", anchor: localCheckIn(reservation, listing.property), assignees });
      created += 1;
    }
  }
  const nextRuleCursor = resumeAt ? afterRuleIdBefore(page, resumeAt, afterRuleId) : rules2.length > RULE_SCAN_LIMIT ? page[page.length - 1].id : null;
  return { created, remaining: Boolean(resumeAt) || rules2.length > RULE_SCAN_LIMIT, nextRuleCursor };
}
function afterRuleIdBefore(rules2, ruleId, afterRuleId) {
  const index = rules2.findIndex((rule) => rule.id === ruleId);
  return index > 0 ? rules2[index - 1].id : afterRuleId;
}

// features/keystone/utils/stayBookingSnapshot.ts
function stayTermsVersion(quoteSnapshot) {
  const quoteNumber2 = quoteSnapshot?.quote?.quoteNumber || "unquoted";
  const policy = quoteSnapshot?.cancellationPolicy || {};
  return `${quoteNumber2}/${policy.id || "no-policy"}@${policy.version || "unversioned"}`;
}
function createStayBookingSnapshot(input) {
  return {
    version: 1,
    capturedAt: (input.capturedAt ?? /* @__PURE__ */ new Date()).toISOString(),
    listing: structuredClone(input.listing),
    guestParty: structuredClone(input.guestParty),
    cancellationPolicy: structuredClone(input.cancellationPolicy),
    quote: structuredClone(input.quote),
    ...input.consent ? { consent: structuredClone(input.consent) } : {},
    ...input.conversion ? { conversion: { ...input.conversion } } : {},
    ...input.simulation ? { simulation: { ...input.simulation } } : {}
  };
}
function feeLineType(feeType) {
  switch (feeType) {
    case "cleaning":
      return "cleaning_fee";
    case "pet":
      return "pet_fee";
    case "extra_guest":
      return "guest_fee";
    default:
      return "service_fee";
  }
}
function keyPart(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "line";
}
function createReservationLineItemsFromQuote(reservationId, quote) {
  const nightLines = quote.nights.map((night) => ({
    snapshotKey: `${reservationId}:night:${night.date}`,
    lineType: "night",
    description: `${night.source} \xB7 ${night.date}`,
    serviceDate: night.date,
    quantity: 1,
    unitAmountCents: night.amountCents,
    totalAmountCents: night.amountCents,
    currencyCode: quote.currencyCode,
    metadataSnapshot: { pricingSource: night.source }
  }));
  const feeLines = quote.fees.map((fee, index) => ({
    snapshotKey: `${reservationId}:fee:${index + 1}:${keyPart(fee.name)}`,
    lineType: feeLineType(fee.feeType),
    description: fee.name,
    quantity: 1,
    unitAmountCents: fee.amountCents,
    totalAmountCents: fee.amountCents,
    currencyCode: quote.currencyCode,
    metadataSnapshot: { feeType: fee.feeType ?? "service", taxable: fee.taxable ?? true }
  }));
  const taxLines = quote.taxes.map((tax, index) => ({
    snapshotKey: `${reservationId}:tax:${index + 1}:${keyPart(tax.name)}`,
    lineType: "tax",
    description: tax.name,
    quantity: 1,
    unitAmountCents: tax.amountCents,
    totalAmountCents: tax.amountCents,
    currencyCode: quote.currencyCode,
    metadataSnapshot: { rateBasisPoints: tax.rateBasisPoints }
  }));
  const depositLines = quote.securityDepositCents > 0 ? [{
    snapshotKey: `${reservationId}:security-deposit`,
    lineType: "security_deposit",
    description: "Refundable security deposit",
    quantity: 1,
    unitAmountCents: quote.securityDepositCents,
    totalAmountCents: quote.securityDepositCents,
    currencyCode: quote.currencyCode,
    metadataSnapshot: { refundable: true, includedInTotal: false }
  }] : [];
  return [...nightLines, ...feeLines, ...taxLines, ...depositLines];
}

// features/keystone/utils/unverifiedBookingGuest.ts
async function createIsolatedUnverifiedBookingGuest(tx, contact) {
  return tx.guestProfile.create({
    data: { ...contact, verificationStatus: "unverified" }
  });
}

// features/keystone/utils/stayQuoteAccess.ts
var import_node_crypto11 = __toESM(require("node:crypto"));
var TOKEN_BYTES2 = 24;
var QUOTE_LIFETIME_MINUTES = 30;
var TOKEN_PATTERN = /^[a-f0-9]{48}$/;
function createStayQuoteToken() {
  return import_node_crypto11.default.randomBytes(TOKEN_BYTES2).toString("hex");
}
function hashStayQuoteToken(token) {
  return import_node_crypto11.default.createHash("sha256").update(token).digest("hex");
}
function stayQuoteExpiry(issuedAt = /* @__PURE__ */ new Date()) {
  return new Date(issuedAt.getTime() + QUOTE_LIFETIME_MINUTES * 60 * 1e3);
}
function isExpired2(value, now) {
  if (!value) return true;
  const expiresAt = value instanceof Date ? value : new Date(value);
  return Number.isNaN(expiresAt.getTime()) || expiresAt <= now;
}
async function resolveActiveStayQuote({
  token,
  findByHash,
  now = /* @__PURE__ */ new Date()
}) {
  if (!TOKEN_PATTERN.test(token)) {
    throw new Error("Stay quote token is invalid.");
  }
  const quote = await findByHash(hashStayQuoteToken(token));
  if (!quote || quote.status !== "active" || quote.consumedAt || isExpired2(quote.expiresAt, now)) {
    return null;
  }
  return quote;
}

// features/keystone/utils/stayQuoteIntegrity.ts
var SNAPSHOT_FIELDS = [
  ["quoteNumber", "quoteNumber"],
  ["checkInDate", "checkIn"],
  ["checkOutDate", "checkOut"],
  ["adults", "adults"],
  ["children", "children"],
  ["infants", "infants"],
  ["pets", "pets"],
  ["currencyCode", "currencyCode"],
  ["lodgingSubtotalCents", "lodgingSubtotalCents"],
  ["feeTotalCents", "feeTotalCents"],
  ["taxTotalCents", "taxTotalCents"],
  ["securityDepositCents", "securityDepositCents"],
  ["totalAmountCents", "totalAmountCents"]
];
function relationId(record5, relation) {
  return record5?.[`${relation}Id`] ?? record5?.[relation]?.id ?? null;
}
function quoteChanged() {
  return new Error("Stay quote terms changed or are incomplete. Request a new quote.");
}
function assertStayQuoteMatchesSnapshot(record5) {
  const snapshot = record5?.quoteSnapshot;
  const issuedQuote = snapshot?.quote;
  const issuedListing = snapshot?.listing;
  const issuedHostId = issuedListing?.host?.id;
  const issuedUnitId = issuedListing?.accommodation?.id;
  const issuedPlan = issuedListing?.ratePlans?.[0];
  const issuedRatePlanId = issuedPlan?.isBaseRate === true && issuedPlan.id == null ? null : issuedPlan?.id;
  if (!issuedQuote || !issuedListing?.id || !issuedHostId || !issuedUnitId || issuedRatePlanId === void 0 || issuedRatePlanId !== null && !issuedRatePlanId || typeof issuedListing.bookingMode !== "string" || typeof issuedListing.instantBook !== "boolean") throw quoteChanged();
  if (relationId(record5, "listing") !== issuedListing.id || relationId(record5, "hostOrganization") !== issuedHostId || relationId(record5, "ratePlan") !== issuedRatePlanId || record5?.listing !== void 0 && (relationId(record5.listing, "accommodationUnit") !== issuedUnitId || relationId(record5.listing, "property") !== (issuedListing.property?.id ?? null) || record5.listing.bookingMode !== void 0 && record5.listing.bookingMode !== issuedListing.bookingMode || record5.listing.instantBook !== void 0 && record5.listing.instantBook !== issuedListing.instantBook)) throw quoteChanged();
  for (const [liveField, snapshotField] of SNAPSHOT_FIELDS) {
    if (record5[liveField] !== issuedQuote[snapshotField]) throw quoteChanged();
  }
  return { listing: issuedListing, quote: issuedQuote };
}
function assertStayListingMatchesSnapshot(currentListing, issuedListing) {
  if (!currentListing || currentListing.id !== issuedListing?.id || currentListing.status !== "published" || currentListing.hostOrganizationId !== issuedListing.host?.id || currentListing.accommodationUnitId !== issuedListing.accommodation?.id || currentListing.propertyId !== (issuedListing.property?.id ?? null) || currentListing.bookingMode !== issuedListing.bookingMode || currentListing.instantBook !== issuedListing.instantBook) {
    throw new Error("This listing changed after the quote. Request a new quote.");
  }
}

// features/keystone/utils/storefrontSales.ts
var STOREFRONT_PAUSED_MESSAGE = "New bookings are paused on this storefront. Existing trips are still available.";
var settingsSelect = {
  isPublished: true,
  allowTestBookings: true,
  termsUrl: true,
  termsVersion: true,
  privacyPolicyUrl: true,
  privacyPolicyVersion: true
};
function legalDocument(url, version) {
  const link = typeof url === "string" ? url.trim() : "";
  const label = typeof version === "string" ? version.trim() : "";
  return link && label ? { url: link, version: label } : null;
}
function storefrontSalesFrom(settings) {
  const open = settings?.isPublished === true;
  return {
    open,
    allowTestBookings: open && settings?.allowTestBookings === true,
    termsOfUse: legalDocument(settings?.termsUrl, settings?.termsVersion),
    privacyPolicy: legalDocument(settings?.privacyPolicyUrl, settings?.privacyPolicyVersion)
  };
}
async function readStorefrontSales(db, { lock = false } = {}) {
  if (lock) await db.$queryRawUnsafe('SELECT "id" FROM "MarketplaceSettings" WHERE "id" = 1 FOR SHARE');
  const settings = await db.marketplaceSettings.findUnique({ where: { id: 1 }, select: settingsSelect });
  return storefrontSalesFrom(settings);
}
function assertStorefrontSelling(sales) {
  if (!sales.open) throw new Error(STOREFRONT_PAUSED_MESSAGE);
}

// features/keystone/mutations/createStayReservation.ts
var RECEIPT_RECOVERY_MS = 24 * 60 * 60 * 1e3;
var CONVERSION_VERSION = 2;
var CheckoutReplayError = class extends Error {
};
function derivedOwnershipToken(kind, receiptKey, quoteTokenHash) {
  return import_node_crypto12.default.createHmac("sha256", resolveSessionSecret()).update(`stay-receipt:${kind}:${quoteTokenHash}:${receiptKey}`).digest("hex").slice(0, 48);
}
function receiptKeyHash(receiptKey) {
  return import_node_crypto12.default.createHash("sha256").update(`stay-receipt-key:${receiptKey}`).digest("hex");
}
function reservationResult(reservation, tripToken, agreementToken, recovered = false) {
  return {
    id: reservation.id,
    confirmationCode: reservation.confirmationCode,
    status: reservation.status,
    paymentStatus: reservation.paymentStatus,
    checkInDate: reservation.checkInDate,
    checkOutDate: reservation.checkOutDate,
    currencyCode: reservation.currencyCode,
    totalAmountCents: reservation.totalAmountCents,
    listing: reservation.listing,
    tripToken,
    agreementToken,
    recovered,
    testMode: reservation.testMode === true
  };
}
function requestFingerprint(input) {
  return import_node_crypto12.default.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
async function recoverConvertedCheckout(context, quoteTokenHash, receiptKey, expected) {
  const quote = await context.prisma.stayQuote.findUnique({ where: { tokenHash: quoteTokenHash }, select: { id: true, status: true, consumedAt: true } });
  if (!quote || quote.status !== "consumed" || !quote.consumedAt || Date.now() - quote.consumedAt.getTime() > RECEIPT_RECOVERY_MS) return null;
  const reservation = await context.prisma.reservation.findFirst({
    where: { quoteId: quote.id },
    include: { listing: { select: { id: true, title: true, slug: true } } }
  });
  const conversion = reservation?.bookingSnapshot?.conversion;
  if (!reservation || conversion?.version !== CONVERSION_VERSION || conversion.receiptKeyHash !== receiptKeyHash(receiptKey)) return null;
  if ((conversion.actorUserId ?? null) !== expected.actorUserId) {
    throw new CheckoutReplayError("This booking was made in a different session. Use Find my trip with your confirmation code and email.");
  }
  if (expected.fingerprint && conversion.requestFingerprint !== expected.fingerprint) {
    throw new CheckoutReplayError("This checkout was already submitted with different details. Use Find my trip with your confirmation code and email.");
  }
  const tripToken = derivedOwnershipToken("trip", receiptKey, quoteTokenHash);
  if (reservation.tripTokenHash !== hashPublicOwnershipToken(tripToken) || !isPublicOwnershipTokenActive({ tokenExpiresAt: reservation.tripTokenExpiresAt, tokenRevokedAt: reservation.tripTokenRevokedAt })) return null;
  const agreementToken = derivedOwnershipToken("agreement", receiptKey, quoteTokenHash);
  const agreement = reservation.agreementId ? await context.prisma.stayAgreement.findUnique({ where: { id: reservation.agreementId }, select: { signingTokenHash: true, signingTokenExpiresAt: true, signingTokenRevokedAt: true } }) : null;
  const agreementLive = Boolean(agreement && agreement.signingTokenHash === hashPublicOwnershipToken(agreementToken) && isPublicOwnershipTokenActive({ tokenExpiresAt: agreement.signingTokenExpiresAt, tokenRevokedAt: agreement.signingTokenRevokedAt }));
  return reservationResult(reservation, tripToken, agreementLive ? agreementToken : null, true);
}
function sessionActorId(context) {
  return typeof context.session?.itemId === "string" ? context.session.itemId : null;
}
function validReceiptKey(value) {
  return typeof value === "string" && /^[a-f0-9]{32,64}$/.test(value) ? value : null;
}
async function recoverStayCheckout(_root, args, context) {
  const receiptKey = validReceiptKey(args.receiptKey);
  if (!receiptKey || typeof args.quoteToken !== "string" || !args.quoteToken) return null;
  try {
    return await recoverConvertedCheckout(context, hashPublicOwnershipToken(args.quoteToken), receiptKey, { actorUserId: sessionActorId(context) });
  } catch (error) {
    if (error instanceof CheckoutReplayError) return null;
    throw error;
  }
}
function confirmationCode() {
  return `STAY-${Date.now().toString(36).toUpperCase()}-${import_node_crypto12.default.randomUUID().slice(0, 6).toUpperCase()}`;
}
function tripTokenExpiry(checkOutDate) {
  const checkout = /* @__PURE__ */ new Date(`${checkOutDate}T00:00:00.000Z`);
  const fallback = publicTokenExpiry();
  if (Number.isNaN(checkout.getTime())) return fallback;
  const afterTrip = new Date(checkout.getTime() + 30 * 24 * 60 * 60 * 1e3);
  return afterTrip > fallback ? afterTrip : fallback;
}
function cleanRequired(value, label) {
  const cleaned = typeof value === "string" ? value.trim() : "";
  if (!cleaned) throw new Error(`${label} is required.`);
  return cleaned;
}
function activeQuoteError() {
  return new Error("Stay quote is invalid, expired, or has already been used.");
}
function retryableTransactionError(message) {
  const error = new Error(message);
  error.code = "P2034";
  return error;
}
async function withSerializableRetry(operation, attempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const retryable = error?.code === "P2034" || /write conflict|deadlock|serialization/i.test(error?.message || "");
      if (!retryable || attempt === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
    }
  }
  throw lastError;
}
async function createStayReservation(_root, args, context) {
  const guestName = cleanRequired(args.guestName, "Guest name");
  const guestEmail = cleanRequired(args.guestEmail, "Guest email").toLowerCase();
  const guestPhone = args.guestPhone?.trim() || "";
  const guestNotes = args.guestNotes?.trim() || "";
  if (guestName.length > 200) throw new Error("Guest name is too long.");
  if (guestEmail.length > 320 || !/^\S+@\S+\.\S+$/.test(guestEmail)) throw new Error("Enter a valid guest email.");
  if (guestPhone.length > 64) throw new Error("Guest phone is too long.");
  if (guestNotes.length > 2e3) throw new Error("Arrival notes are too long.");
  const acceptedTermsVersion = typeof args.acceptedTermsVersion === "string" ? args.acceptedTermsVersion.trim() : "";
  if (!acceptedTermsVersion) throw new Error("Review and accept the stay terms before reserving.");
  const acceptedStoreTermsVersion = typeof args.acceptedStoreTermsVersion === "string" ? args.acceptedStoreTermsVersion.trim().slice(0, 60) : "";
  const privacyNoticeVersion = typeof args.privacyNoticeVersion === "string" ? args.privacyNoticeVersion.trim().slice(0, 60) : "";
  const receiptKey = validReceiptKey(args.receiptKey);
  if (args.invitedGuests != null && !Array.isArray(args.invitedGuests)) throw new Error("Invited guests must be a list.");
  if ((args.invitedGuests?.length || 0) > 15) throw new Error("A stay can include at most 15 invited guests.");
  const invitedGuests = (args.invitedGuests || []).map((guest) => {
    const record5 = guest && typeof guest === "object" ? guest : null;
    const name = cleanRequired(record5?.name, "Invited guest name");
    const email = typeof record5?.email === "string" ? record5.email.trim().toLowerCase() : "";
    if (name.length > 200) throw new Error("Invited guest name is too long.");
    if (email && (email.length > 320 || !/^\S+@\S+\.\S+$/.test(email))) throw new Error("Enter a valid invited guest email.");
    return { name, email: email || null };
  });
  const sudo = context.sudo();
  const quote = await resolveActiveStayQuote({
    token: args.quoteToken,
    findByHash: async (tokenHash2) => {
      const quotes = await sudo.query.StayQuote.findMany({
        where: { tokenHash: { equals: tokenHash2 } },
        take: 1,
        query: `
          id quoteNumber tokenHash status expiresAt consumedAt checkInDate checkOutDate
          adults children infants pets currencyCode lodgingSubtotalCents feeTotalCents taxTotalCents securityDepositCents totalAmountCents quoteSnapshot
          hostOrganization { id }
          ratePlan { id }
          listing { id title slug status bookingMode instantBook property { id } accommodationUnit { id maxGuests } }
        `
      });
      return quotes[0] || null;
    }
  });
  const tokenHash = hashPublicOwnershipToken(args.quoteToken);
  const sessionUserId = sessionActorId(context);
  const fingerprint = requestFingerprint({
    quote: tokenHash,
    guestName,
    guestEmail,
    guestPhone,
    guestNotes,
    invitedGuests,
    acceptedTermsVersion,
    acceptedStoreTermsVersion,
    privacyNoticeVersion,
    actor: sessionUserId
  });
  const recover = async () => receiptKey ? recoverConvertedCheckout(context, tokenHash, receiptKey, { actorUserId: sessionUserId, fingerprint }) : null;
  if (!quote) {
    const recovered = await recover();
    if (recovered) return recovered;
  }
  if (!quote || quote.listing?.status !== "published" || !quote.hostOrganization?.id || !quote.listing?.id) throw activeQuoteError();
  const { listing: originalListingSnapshot } = assertStayQuoteMatchesSnapshot(quote);
  const originalRatePlanSnapshot = originalListingSnapshot.ratePlans?.[0];
  assertStayWithinMaximum(
    quote.checkInDate,
    quote.checkOutDate,
    originalRatePlanSnapshot?.maximumStay ?? originalListingSnapshot?.maximumStay
  );
  assertStayArrivalAllowed(quote.checkInDate, listingArrivalContext(originalListingSnapshot, originalRatePlanSnapshot));
  const tripToken = receiptKey ? derivedOwnershipToken("trip", receiptKey, tokenHash) : createPublicOwnershipToken();
  const agreementToken = receiptKey ? derivedOwnershipToken("agreement", receiptKey, tokenHash) : createPublicOwnershipToken();
  const code = confirmationCode();
  const reservationId = import_node_crypto12.default.randomUUID();
  const agreementId = import_node_crypto12.default.randomUUID();
  const depositId = quote.securityDepositCents > 0 ? import_node_crypto12.default.randomUUID() : null;
  const now = /* @__PURE__ */ new Date();
  let reservation;
  try {
    reservation = await withSerializableRetry(() => context.prisma.$transaction(async (tx) => {
      const listingId = quote.listing.id;
      await lockListingCapacity(tx, [listingId]);
      const preloadedUnitId = quote.listing.accommodationUnit?.id || null;
      await lockAccommodationUnitCapacity(tx, [preloadedUnitId]);
      await tx.$queryRawUnsafe('SELECT "id" FROM "Listing" WHERE "id" = $1 FOR UPDATE', listingId);
      const lockedListing = await tx.listing.findUnique({
        where: { id: listingId },
        select: {
          id: true,
          hostOrganizationId: true,
          propertyId: true,
          accommodationUnitId: true,
          status: true,
          bookingMode: true,
          instantBook: true
        }
      });
      await tx.$queryRawUnsafe('SELECT "id" FROM "StayQuote" WHERE "id" = $1 FOR UPDATE', quote.id);
      const lockedQuote = await tx.stayQuote.findUnique({ where: { id: quote.id } });
      if (!lockedQuote || lockedQuote.tokenHash !== tokenHash || lockedQuote.status !== "active" || lockedQuote.consumedAt || lockedQuote.expiresAt.getTime() <= now.getTime() || lockedQuote.listingId !== listingId || lockedQuote.hostOrganizationId !== quote.hostOrganization.id || !(0, import_node_util.isDeepStrictEqual)(lockedQuote.quoteSnapshot, quote.quoteSnapshot)) throw activeQuoteError();
      const { listing: lockedListingSnapshot } = assertStayQuoteMatchesSnapshot(lockedQuote);
      assertStayListingMatchesSnapshot(lockedListing, lockedListingSnapshot);
      if (acceptedTermsVersion !== stayTermsVersion(lockedQuote.quoteSnapshot)) {
        throw new Error("The stay terms changed. Review them again before reserving.");
      }
      const sales = await readStorefrontSales(tx, { lock: true });
      assertStorefrontSelling(sales);
      await tx.$queryRawUnsafe('SELECT "id" FROM "HostOrganization" WHERE "id" = $1 FOR SHARE', lockedListing.hostOrganizationId);
      if (lockedListing.propertyId) await tx.$queryRawUnsafe('SELECT "id" FROM "Property" WHERE "id" = $1 FOR SHARE', lockedListing.propertyId);
      if (lockedListing.accommodationUnitId) await tx.$queryRawUnsafe('SELECT "id" FROM "AccommodationUnit" WHERE "id" = $1 FOR SHARE', lockedListing.accommodationUnitId);
      const [currentHost, currentProperty, currentUnit] = await Promise.all([
        tx.hostOrganization.findUnique({ where: { id: lockedListing.hostOrganizationId }, select: { id: true, isPublic: true, status: true } }),
        lockedListing.propertyId ? tx.property.findUnique({ where: { id: lockedListing.propertyId }, select: { status: true } }) : null,
        lockedListing.accommodationUnitId ? tx.accommodationUnit.findUnique({ where: { id: lockedListing.accommodationUnitId }, select: { status: true } }) : null
      ]);
      const sellability = listingSellabilityProblem({ status: lockedListing.status, hostOrganization: currentHost, property: currentProperty, accommodationUnit: currentUnit });
      if (sellability) throw new Error(sellability);
      if (sales.termsOfUse && acceptedStoreTermsVersion !== sales.termsOfUse.version) {
        throw new Error("The store\u2019s terms of use changed. Review them again before reserving.");
      }
      if (sales.privacyPolicy && privacyNoticeVersion !== sales.privacyPolicy.version) {
        throw new Error("The store\u2019s privacy policy changed. Review it again before reserving.");
      }
      const bookedBy = sessionUserId ? await tx.user.findUnique({ where: { id: sessionUserId }, select: { id: true, isActive: true } }) : null;
      const bookedById = bookedBy?.isActive === true ? bookedBy.id : null;
      const instant = lockedListing.bookingMode === "instant" && lockedListing.instantBook === true;
      const hostOrganizationId = lockedQuote.hostOrganizationId;
      const accommodationUnitId = lockedListing.accommodationUnitId;
      const checkInDate = lockedQuote.checkInDate;
      const checkOutDate = lockedQuote.checkOutDate;
      const lockedRatePlanSnapshot = lockedListingSnapshot.ratePlans?.[0];
      assertStayWithinMaximum(
        checkInDate,
        checkOutDate,
        lockedRatePlanSnapshot?.maximumStay ?? lockedListingSnapshot.maximumStay
      );
      assertStayArrivalAllowed(checkInDate, listingArrivalContext(lockedListingSnapshot, lockedRatePlanSnapshot));
      const overlap = await tx.calendarBlock.findFirst({
        where: {
          listingId: lockedListing.id,
          status: "active",
          ...REAL_CAPACITY_BLOCK,
          startDate: { lt: checkOutDate },
          endDate: { gt: checkInDate }
        },
        select: { id: true }
      });
      if (overlap) throw new Error("This stay became unavailable. Request a new quote for different dates.");
      await assertAccommodationUnitAvailable(tx, {
        accommodationUnitId,
        hostOrganizationId,
        checkInDate,
        checkOutDate
      });
      const lockedQuoteSnapshot = lockedQuote.quoteSnapshot;
      const bookingSnapshot = createStayBookingSnapshot({
        listing: lockedQuoteSnapshot.listing,
        guestParty: {
          primaryGuest: { name: guestName, email: guestEmail, phone: guestPhone },
          adults: lockedQuote.adults,
          children: lockedQuote.children,
          infants: lockedQuote.infants,
          pets: lockedQuote.pets,
          invitedGuests: structuredClone(invitedGuests)
        },
        cancellationPolicy: lockedQuoteSnapshot.cancellationPolicy,
        quote: lockedQuoteSnapshot.quote,
        capturedAt: now,
        consent: {
          termsVersion: acceptedTermsVersion,
          acceptedAt: now.toISOString(),
          acceptedBy: { kind: "guest", email: guestEmail, userId: bookedById },
          statement: "Accepted the stay terms, house rules and cancellation policy shown at checkout.",
          storeTermsOfUse: sales.termsOfUse ? { status: "accepted", url: sales.termsOfUse.url, version: sales.termsOfUse.version } : { status: "not_published" },
          privacyNotice: sales.privacyPolicy ? { status: "shown", url: sales.privacyPolicy.url, version: sales.privacyPolicy.version } : { status: "not_published" }
        },
        ...receiptKey ? {
          conversion: { version: CONVERSION_VERSION, receiptKeyHash: receiptKeyHash(receiptKey), requestFingerprint: fingerprint, actorUserId: sessionUserId }
        } : {}
      });
      const lineInputs = createReservationLineItemsFromQuote(reservationId, bookingSnapshot.quote);
      const consumed = await tx.stayQuote.updateMany({
        where: { id: lockedQuote.id, tokenHash, status: "active", consumedAt: null },
        data: { status: "consumed", consumedAt: now }
      });
      if (consumed.count !== 1) throw activeQuoteError();
      const guest = await createIsolatedUnverifiedBookingGuest(tx, {
        hostOrganizationId,
        name: guestName,
        email: guestEmail,
        phone: guestPhone
      });
      const created = await tx.reservation.create({
        data: {
          id: reservationId,
          hostOrganizationId,
          listingId: lockedListing.id,
          accommodationUnitId,
          guestId: guest.id,
          quoteId: lockedQuote.id,
          confirmationCode: code,
          tripTokenHash: hashPublicOwnershipToken(tripToken),
          tripTokenExpiresAt: tripTokenExpiry(checkOutDate),
          status: instant ? "confirmed" : "pending",
          paymentStatus: "unpaid",
          // Public bookings are always real.
          testMode: false,
          ...bookedById ? { bookedById } : {},
          source: "direct",
          checkInDate,
          checkOutDate,
          currencyCode: lockedQuote.currencyCode,
          lodgingSubtotalCents: lockedQuote.lodgingSubtotalCents,
          feeTotalCents: lockedQuote.feeTotalCents,
          taxTotalCents: lockedQuote.taxTotalCents,
          securityDepositCents: lockedQuote.securityDepositCents,
          totalAmountCents: lockedQuote.totalAmountCents,
          amountPaidCents: 0,
          bookingSnapshot,
          guestNotes
        },
        include: { listing: { select: { id: true, title: true, slug: true } } }
      });
      if (!created?.id) throw retryableTransactionError("Reservation transaction did not commit.");
      const createdParty = await tx.guestParty.create({
        data: {
          hostOrganizationId,
          reservationId,
          primaryGuestId: guest.id,
          adults: lockedQuote.adults,
          children: lockedQuote.children,
          infants: lockedQuote.infants,
          pets: lockedQuote.pets,
          invitedGuests
        }
      });
      if (!createdParty?.id) throw retryableTransactionError("Guest party transaction did not commit.");
      if (lineInputs.length) {
        const createdLines = await tx.reservationLineItem.createMany({
          data: lineInputs.map((line) => ({ ...line, hostOrganizationId, reservationId }))
        });
        if (createdLines?.count !== lineInputs.length) throw retryableTransactionError("Reservation line transaction did not commit.");
      }
      {
        const createdBlock = await tx.calendarBlock.create({
          data: {
            hostOrganizationId,
            listingId: lockedListing.id,
            reservationId,
            startDate: checkInDate,
            endDate: checkOutDate,
            reason: "reservation",
            status: "active",
            source: "direct",
            notes: `Direct booking ${code}`
          }
        });
        if (!createdBlock?.id) throw retryableTransactionError("Calendar capacity transaction did not commit.");
      }
      const createdAgreement = await tx.stayAgreement.create({
        data: {
          id: agreementId,
          hostOrganizationId,
          guestId: guest.id,
          cancellationPolicyId: lockedQuoteSnapshot.cancellationPolicy?.id || null,
          agreementNumber: `AGR-${code}`,
          signingTokenHash: hashPublicOwnershipToken(agreementToken),
          signingTokenExpiresAt: publicTokenExpiry(),
          status: "sent",
          title: `Stay terms for ${lockedQuoteSnapshot.listing.title}`,
          signerEmail: guestEmail,
          termsSnapshot: {
            listing: bookingSnapshot.listing,
            houseRules: bookingSnapshot.listing.houseRules || [],
            cancellationPolicy: bookingSnapshot.cancellationPolicy,
            checkInDate,
            checkOutDate
          }
        }
      });
      if (!createdAgreement?.id) throw retryableTransactionError("Stay agreement transaction did not commit.");
      if (depositId) {
        const createdDeposit = await tx.securityDeposit.create({
          data: {
            id: depositId,
            hostOrganizationId,
            depositNumber: `DEP-${code}`,
            status: "required",
            amountCents: lockedQuote.securityDepositCents,
            currencyCode: lockedQuote.currencyCode
          }
        });
        if (!createdDeposit?.id) throw retryableTransactionError("Security deposit transaction did not commit.");
      }
      const linkedReservation = await tx.reservation.update({
        where: { id: reservationId },
        data: { agreementId, securityDepositId: depositId }
      });
      if (!linkedReservation?.id) throw retryableTransactionError("Reservation relationship transaction did not commit.");
      if (instant) {
        await createReservationTasksForTransition(tx, created, "confirm");
      }
      return created;
    }, { maxWait: 5e3, timeout: 15e3, isolationLevel: "Serializable" }));
  } catch (error) {
    const recovered = await recover().catch((recoveryError) => {
      if (recoveryError instanceof CheckoutReplayError) throw recoveryError;
      return null;
    });
    if (recovered) return recovered;
    throw error;
  }
  return reservationResult(reservation, tripToken, agreementToken);
}

// features/keystone/mutations/cancelStayQuote.ts
async function cancelStayQuote(_root, args, context) {
  const quote = await context.query.StayQuote.findOne({
    where: { id: args.quoteId },
    query: "id quoteNumber status consumedAt hostOrganization { id }"
  });
  if (!quote?.hostOrganization?.id) throw new Error("Stay quote not found.");
  await assertHostOrganizationAccess({
    context,
    hostOrganizationId: quote.hostOrganization.id,
    permission: "canManageReservations"
  });
  return context.prisma.$transaction(async (tx) => {
    await tx.$queryRawUnsafe('SELECT "id" FROM "StayQuote" WHERE "id" = $1 FOR UPDATE', quote.id);
    const locked = await tx.stayQuote.findUnique({ where: { id: quote.id } });
    if (!locked || locked.status !== "active" || locked.consumedAt) {
      throw new Error("Only an active, unused stay quote can be cancelled.");
    }
    const cancelled = await tx.stayQuote.updateMany({
      where: { id: locked.id, status: "active", consumedAt: null },
      data: { status: "cancelled" }
    });
    if (cancelled.count !== 1) throw new Error("Stay quote changed before it could be cancelled.");
    return { id: locked.id, quoteNumber: locked.quoteNumber, status: "cancelled" };
  }, { isolationLevel: "Serializable" });
}

// features/keystone/mutations/initiateStayPayment.ts
var import_node_crypto13 = __toESM(require("node:crypto"));
async function initiateStayPayment(_root, args, context) {
  const reservation = await context.query.Reservation.findOne({
    where: { id: args.reservationId },
    query: "id hostOrganization { id }"
  });
  if (!reservation?.hostOrganization?.id) throw new Error("Reservation not found.");
  await assertHostOrganizationAccess({ context, hostOrganizationId: reservation.hostOrganization.id, permission: "canManagePayments" });
  const providerCode = args.paymentProviderCode || "pp_system_default";
  if (providerCode !== "pp_system_default") {
    throw new Error("Only the manual payment provider is enabled.");
  }
  return context.prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `reservation:${args.reservationId}`);
    await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', args.reservationId);
    const locked = await tx.reservation.findUnique({
      where: { id: args.reservationId },
      select: {
        id: true,
        hostOrganizationId: true,
        confirmationCode: true,
        status: true,
        totalAmountCents: true,
        amountPaidCents: true,
        currencyCode: true,
        guestId: true,
        testMode: true,
        fixtureOrigin: true
      }
    });
    if (!locked?.hostOrganizationId || locked.hostOrganizationId !== reservation.hostOrganization.id) throw new Error("Reservation not found.");
    const idempotencyKey = manualPaymentOperationKey({ reservationId: locked.id, operationKey: String(args.operationKey || "") });
    const fingerprint = import_node_crypto13.default.createHash("sha256").update(JSON.stringify({ reservationId: locked.id, providerCode, amountCents: args.amountCents ?? null })).digest("hex");
    const replay = await tx.payment.findUnique({ where: { idempotencyKey } });
    if (replay) {
      const recorded = replay.data && typeof replay.data === "object" ? replay.data.requestFingerprint : void 0;
      if (replay.reservationId !== locked.id || (recorded ? recorded !== fingerprint : args.amountCents != null && replay.amountCents !== args.amountCents)) {
        throw new Error("This payment operation was already used for a different payment.");
      }
      return replay;
    }
    if (locked.testMode) throw new Error("This is a test booking. Real payments can\u2019t be recorded against it.");
    if (locked.fixtureOrigin) throw new Error("This is a setup sample stay. Real payments can\u2019t be recorded against it; book the guest as a real stay.");
    if (!["pending", "confirmed", "in_stay", "completed"].includes(locked.status || "")) {
      throw new Error("Manual payment cannot be initiated for a cancelled or no-show reservation.");
    }
    const [payments, refunds] = await Promise.all([
      tx.payment.findMany({
        where: { reservationId: locked.id },
        select: { id: true, status: true, amountCents: true, refundedAmountCents: true, currencyCode: true, provider: true, data: true }
      }),
      tx.refund.findMany({
        where: { reservationId: locked.id },
        select: { id: true, paymentId: true, status: true, amountCents: true, currencyCode: true }
      })
    ]);
    const reconciliation = reconcileReservationPaymentEvidence({ payments, refunds, currencyCode: locked.currencyCode || "USD", testMode: locked.testMode === true });
    if (reconciliation.openRefundCents > 0) throw new Error("Resolve open refund liabilities before initiating another payment.");
    const outstanding = unreservedReservationBalance({
      totalAmountCents: locked.totalAmountCents || 0,
      netPaidCents: reconciliation.netPaidCents,
      pendingTenderCents: reconciliation.pendingTenderCents
    });
    const amountCents = args.amountCents ?? outstanding;
    if (outstanding <= 0) throw new Error("Reservation has no unreserved outstanding balance.");
    validateManualPaymentSession({ amount: amountCents, outstanding });
    if ((locked.amountPaidCents || 0) !== reconciliation.netPaidCents) {
      await tx.reservation.update({
        where: { id: locked.id },
        data: {
          amountPaidCents: reconciliation.netPaidCents,
          paymentStatus: reservationPaymentStatus({ ...reconciliation, totalAmountCents: locked.totalAmountCents || 0 })
        }
      });
    }
    const provider = await tx.paymentProvider.findFirst({
      where: { code: providerCode, hostOrganizationId: locked.hostOrganizationId },
      select: { id: true, name: true, code: true, isInstalled: true }
    }) || await tx.paymentProvider.create({
      data: {
        hostOrganizationId: locked.hostOrganizationId,
        name: "Manual payment",
        code: providerCode,
        isInstalled: true,
        metadata: { mode: "operator_only", secrets: "environment-only" }
      },
      select: { id: true, name: true, code: true, isInstalled: true }
    });
    if (!provider.isInstalled) throw new Error("Payment provider is not available.");
    const sessionData = await createPayment({
      provider,
      reservation: { id: locked.id, confirmationCode: locked.confirmationCode },
      amount: amountCents,
      currency: (locked.currencyCode || "USD").toLowerCase()
    });
    return tx.payment.create({
      data: {
        hostOrganizationId: locked.hostOrganizationId,
        reservationId: locked.id,
        guestId: locked.guestId,
        paymentProviderId: provider.id,
        amountCents,
        currencyCode: locked.currencyCode || "USD",
        status: "pending",
        paymentMethod: "manual",
        provider: providerCode,
        providerPaymentId: idempotencyKey,
        idempotencyKey,
        data: { ...sessionData.data || sessionData, idempotencyKey, requestFingerprint: fingerprint, scope: "manual-only" }
      }
    });
  }, { maxWait: 5e3, timeout: 1e4, isolationLevel: "ReadCommitted" });
}

// features/keystone/utils/paymentAttemptClaim.ts
var import_node_crypto14 = __toESM(require("node:crypto"));
var LEASE_MS = 9e4;
var PaymentAttemptBusy = class extends Error {
  constructor() {
    super("This payment is being processed. Try again in a minute.");
    this.name = "PaymentAttemptBusy";
  }
};
function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function providerLineage(provider) {
  return { providerId: provider.id, code: provider.code, mode: "test", credentialVersion: provider.code === STRIPE_PROVIDER_CODE ? stripeCredentialVersion() : null };
}
function assertLineageCurrent(payment) {
  const lineage = record(record(payment.data).lineage);
  if (payment.provider !== STRIPE_PROVIDER_CODE || !lineage.credentialVersion) return;
  if (lineage.credentialVersion !== stripeCredentialVersion()) {
    throw new Error("The card provider\u2019s account settings changed since this attempt was made. It needs review in Stripe; nothing was changed.");
  }
}
function attemptIdentity(payment) {
  return {
    rentalPaymentId: payment.id,
    reservationId: payment.reservationId || null,
    idempotencyKey: payment.idempotencyKey || null,
    amountCents: payment.amountCents,
    currencyCode: payment.currencyCode
  };
}
function replayWindowOpen(payment, now = Date.now()) {
  const first = Date.parse(String(record(payment.data).firstSubmittedAt || payment.createdAt?.toISOString?.() || payment.createdAt || ""));
  return Number.isFinite(first) && now - first < STRIPE_KEY_REPLAY_WINDOW_MS;
}
async function claimAttempt(tx, paymentId, purpose, actorUserId) {
  await tx.$queryRawUnsafe('SELECT "id" FROM "Payment" WHERE "id" = $1 FOR UPDATE', paymentId);
  const current2 = await tx.payment.findUnique({ where: { id: paymentId } });
  if (!current2 || !["pending", "processing"].includes(current2.status)) throw new Error("This payment attempt already changed. Refresh to see it.");
  assertLineageCurrent(current2);
  const data = record(current2.data);
  const execution = record(data.execution);
  if (execution.token && Date.parse(execution.leaseUntil) > Date.now()) throw new PaymentAttemptBusy();
  const claim = { paymentId, token: import_node_crypto14.default.randomUUID(), epoch: Number(execution.epoch || 0) + 1 };
  await tx.payment.update({
    where: { id: paymentId },
    data: { data: { ...data, execution: { epoch: claim.epoch, token: claim.token, leaseUntil: new Date(Date.now() + LEASE_MS).toISOString(), purpose, actorUserId: actorUserId || null } } }
  });
  return claim;
}
async function admitProviderCall(prisma, claim, options = {}) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRawUnsafe('SELECT "id" FROM "Payment" WHERE "id" = $1 FOR UPDATE', claim.paymentId);
    const current2 = await tx.payment.findUnique({ where: { id: claim.paymentId } });
    const data = record(current2?.data);
    const execution = record(data.execution);
    if (!current2 || !["pending", "processing"].includes(current2.status)) throw new Error("This payment attempt already changed. Refresh to see it.");
    if (execution.token !== claim.token || execution.epoch !== claim.epoch || !(Date.parse(execution.leaseUntil) > Date.now())) {
      throw new Error("This payment attempt was taken over or its stay changed. Refresh to see it.");
    }
    if (data.closureRequested && !options.closing) throw new Error("This stay is being closed, so this card payment can\u2019t continue.");
    assertLineageCurrent(current2);
    if (options.replay && !replayWindowOpen(current2)) throw new Error("This attempt is too old to resend safely. It needs review in Stripe.");
    const now = /* @__PURE__ */ new Date();
    await tx.payment.update({
      where: { id: claim.paymentId },
      data: { data: { ...data, ...options.submission && !data.firstSubmittedAt ? { firstSubmittedAt: now.toISOString() } : {}, execution: { ...execution, leaseUntil: new Date(now.getTime() + LEASE_MS).toISOString() } } }
    });
    return current2;
  }, { maxWait: 5e3, timeout: 1e4, isolationLevel: "ReadCommitted" });
}
async function claimIsCurrent(tx, claim) {
  const current2 = await tx.payment.findUnique({ where: { id: claim.paymentId }, select: { data: true } });
  const execution = record(record(current2?.data).execution);
  return execution.token === claim.token && execution.epoch === claim.epoch && Date.parse(execution.leaseUntil) > Date.now();
}
async function releaseClaim(tx, claim) {
  const current2 = await tx.payment.findUnique({ where: { id: claim.paymentId }, select: { data: true } });
  const data = record(current2?.data);
  if (record(data.execution).token !== claim.token) return;
  await tx.payment.update({ where: { id: claim.paymentId }, data: { data: { ...data, execution: { ...record(data.execution), token: null, leaseUntil: null } } } });
}
async function requestAttemptClosure(tx, reservationId, reason) {
  const open = await tx.payment.findMany({ where: { reservationId, status: { in: ["pending", "processing"] }, NOT: { provider: { in: ["manual", "pp_system_default"] } } }, select: { id: true, data: true } });
  for (const payment of open) {
    const data = record(payment.data);
    const execution = record(data.execution);
    await tx.payment.update({
      where: { id: payment.id },
      data: { data: { ...data, closureRequested: data.closureRequested || { at: (/* @__PURE__ */ new Date()).toISOString(), reason }, execution: { ...execution, epoch: Number(execution.epoch || 0) + 1, token: null, leaseUntil: null } } }
    });
  }
  return open.map((payment) => payment.id);
}

// features/keystone/mutations/paymentAttemptReconciliation.ts
var transactionOptions = { maxWait: 5e3, timeout: 1e4, isolationLevel: "ReadCommitted" };
function record2(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
async function lockStay(tx, reservationId) {
  if (!reservationId) return;
  await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `reservation:${reservationId}`);
  await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', reservationId);
}
async function reconcileProviderAttempt(prisma, paymentId, { reason, actorUserId, closing }) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || !["pending", "processing"].includes(payment.status) || payment.provider !== STRIPE_PROVIDER_CODE) return { status: "unchanged" };
  const claim = await prisma.$transaction(async (tx) => {
    await lockStay(tx, payment.reservationId);
    return claimAttempt(tx, payment.id, closing ? "stay_closure" : "host_reconcile", actorUserId);
  }, transactionOptions);
  const expected = attemptIdentity(payment);
  let result;
  try {
    let providerPaymentId = String(payment.providerPaymentId || "").startsWith("pi_") ? payment.providerPaymentId : null;
    if (!providerPaymentId && replayWindowOpen(payment)) {
      await admitProviderCall(prisma, claim, { closing: true, replay: true, submission: true });
      const original = await createPayment({ provider: STRIPE_PROVIDER_CODE, reservation: { id: payment.reservationId }, amount: payment.amountCents, currency: payment.currencyCode, idempotencyKey: payment.idempotencyKey, metadata: { rentalPaymentId: payment.id } });
      providerPaymentId = original.providerPaymentId || null;
    } else if (!providerPaymentId) {
      const found = await findProviderPayment({ provider: STRIPE_PROVIDER_CODE, rentalPaymentId: payment.id });
      providerPaymentId = found?.providerPaymentId || null;
    }
    if (!providerPaymentId) {
      const message = "Stripe shows no payment for this attempt, but its original request is too old to resend, so that doesn\u2019t prove nothing happened. It stays open until Stripe reports its outcome.";
      await prisma.$transaction(async (tx) => {
        await lockStay(tx, payment.reservationId);
        const current2 = await tx.payment.findUnique({ where: { id: payment.id } });
        const data = record2(current2?.data);
        await tx.payment.update({ where: { id: payment.id }, data: { data: { ...data, reconciliation: { state: "unknown", checkedAt: (/* @__PURE__ */ new Date()).toISOString(), byUserId: actorUserId || null, reason } } } });
        await releaseClaim(tx, claim);
      }, transactionOptions);
      return { status: "unknown", message };
    }
    await admitProviderCall(prisma, claim, { closing: true });
    result = await cancelProviderPayment({ provider: STRIPE_PROVIDER_CODE, paymentId: providerPaymentId, expected });
  } catch (error) {
    await prisma.$transaction(async (tx) => releaseClaim(tx, claim), transactionOptions).catch(() => void 0);
    throw error;
  }
  return prisma.$transaction(async (tx) => {
    await lockStay(tx, payment.reservationId);
    const current2 = await tx.payment.findUnique({ where: { id: payment.id } });
    if (!current2) return { status: "unchanged" };
    if (result.providerPaymentId && current2.providerPaymentId !== result.providerPaymentId) {
      await tx.payment.update({ where: { id: current2.id }, data: { providerPaymentId: result.providerPaymentId } });
    }
    if (!["pending", "processing"].includes(current2.status)) {
      await releaseClaim(tx, claim);
      return { status: "unchanged" };
    }
    if (result.status === "captured") {
      await settleSucceededPayment(tx, {
        paymentId: current2.id,
        expectedAmountCents: Number(result.data?.amountCents),
        expectedCurrencyCode: String(result.data?.currencyCode),
        evidence: { kind: "host_reconciliation", providerPaymentId: result.providerPaymentId, livemode: false, actorUserId: actorUserId || null },
        processedAt: /* @__PURE__ */ new Date(),
        ...actorUserId ? { processedByUserId: actorUserId } : {}
      });
      await releaseClaim(tx, claim);
      return { status: "succeeded" };
    }
    if (result.status !== "failed") {
      await releaseClaim(tx, claim);
      return { status: "processing", message: "Stripe is still processing this payment. Check again later; it can\u2019t be closed yet." };
    }
    const data = record2((await tx.payment.findUnique({ where: { id: current2.id }, select: { data: true } }))?.data);
    await tx.payment.update({
      where: { id: current2.id },
      data: {
        status: "cancelled",
        errorMessage: reason,
        data: { ...data, execution: { ...record2(data.execution), token: null, leaseUntil: null }, closedAt: (/* @__PURE__ */ new Date()).toISOString(), closedReason: reason, closedByUserId: actorUserId || null, providerOutcome: "canceled", providerReceipt: { providerPaymentId: result.providerPaymentId, providerStatus: result.data?.providerStatus || "canceled" } }
      }
    });
    return { status: "cancelled" };
  }, transactionOptions);
}
async function reconcileClosingAttempts(prisma, paymentIds) {
  const outcomes = [];
  for (const paymentId of paymentIds) {
    try {
      const outcome = await reconcileProviderAttempt(prisma, paymentId, { reason: "The stay was closed before this card payment was made.", closing: true });
      outcomes.push({ paymentId, status: outcome.status });
    } catch {
      outcomes.push({ paymentId, status: "needs_review" });
    }
  }
  return outcomes;
}

// features/keystone/mutations/guestStayPayment.ts
var transactionOptions2 = { maxWait: 5e3, timeout: 1e4, isolationLevel: "ReadCommitted" };
async function ownedReservation(db, tripToken) {
  if (!/^[a-f0-9]{48}$/.test(tripToken || "")) throw new Error("Trip link is invalid.");
  const reservation = await db.reservation.findUnique({ where: { tripTokenHash: hashPublicOwnershipToken(tripToken) } });
  if (!reservation || !isPublicOwnershipTokenActive({ tokenExpiresAt: reservation.tripTokenExpiresAt, tokenRevokedAt: reservation.tripTokenRevokedAt })) {
    throw new Error("Trip link is unavailable.");
  }
  return reservation;
}
async function lockedReservation(tx, tripToken, id2) {
  await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `reservation:${id2}`);
  await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', id2);
  const reservation = await ownedReservation(tx, tripToken);
  if (reservation.id !== id2) throw new Error("Trip link is unavailable.");
  return reservation;
}
function assertProviderIdentity(payment, result) {
  const data = result.data;
  if (result.providerPaymentId !== payment.providerPaymentId || data?.livemode !== false || data?.source !== "openfront-rental" || data?.reservationId !== payment.reservationId || data?.paymentId !== payment.id || data?.idempotencyKey !== payment.idempotencyKey) {
    throw new Error("Card payment identity does not match this reservation.");
  }
}
async function closeUnpayableAttempt(context, tripToken, reservationId, payment, reason) {
  await context.prisma.$transaction(async (tx) => {
    await lockedReservation(tx, tripToken, reservationId);
    const current2 = await tx.payment.findUnique({ where: { id: payment.id } });
    const references = [payment.providerPaymentId, `reserved:${current2?.idempotencyKey}`].filter(Boolean);
    if (!current2 || !references.includes(current2.providerPaymentId) || !["pending", "processing"].includes(current2.status)) return;
    await tx.payment.update({
      where: { id: current2.id },
      data: {
        status: "cancelled",
        errorMessage: reason,
        data: { ...current2.data && typeof current2.data === "object" ? current2.data : {}, closedAt: (/* @__PURE__ */ new Date()).toISOString(), closedReason: reason }
      }
    });
  }, transactionOptions2);
}
async function reserveAttempt(context, tripToken, reservationId) {
  return context.prisma.$transaction(async (tx) => {
    const locked = await lockedReservation(tx, tripToken, reservationId);
    if (!locked.hostOrganizationId || locked.status !== "confirmed") throw new Error("Your stay must be confirmed before paying by card.");
    const [payments, refunds] = await Promise.all([
      tx.payment.findMany({ where: { reservationId: locked.id } }),
      tx.refund.findMany({ where: { reservationId: locked.id } })
    ]);
    const evidence = reconcileReservationPaymentEvidence({ payments, refunds, currencyCode: locked.currencyCode, testMode: locked.testMode === true });
    if (evidence.openRefundCents > 0) throw new Error("Contact your host about the outstanding refund before paying again.");
    if (evidence.netPaidCents >= locked.totalAmountCents) return null;
    const existing = payments.find((p) => p.provider === STRIPE_PROVIDER_CODE && ["pending", "processing"].includes(p.status));
    if (existing) {
      const stale = existing.amountCents !== locked.totalAmountCents - evidence.netPaidCents || existing.currencyCode !== locked.currencyCode;
      return { payment: existing, stale, claim: await claimAttempt(tx, existing.id, "guest_checkout") };
    }
    const amountCents = unreservedReservationBalance({ totalAmountCents: locked.totalAmountCents, netPaidCents: evidence.netPaidCents, pendingTenderCents: evidence.pendingTenderCents });
    if (amountCents <= 0 || evidence.pendingTenderCents > 0) throw new Error("Another payment is awaiting confirmation. Contact your host before paying again.");
    const attemptNumber = payments.filter((p) => p.provider === STRIPE_PROVIDER_CODE).length + 1;
    const idempotencyKey = `rental:stripe:${locked.id}:${locked.totalAmountCents}:${evidence.netPaidCents}:${locked.currencyCode}:${attemptNumber}`;
    const previous = await tx.payment.findUnique({ where: { idempotencyKey } });
    if (previous) throw new Error("This payment needs host review before another attempt.");
    const found = await tx.paymentProvider.findFirst({ where: { hostOrganizationId: locked.hostOrganizationId, code: STRIPE_PROVIDER_CODE }, select: { id: true } });
    if (found) await tx.$queryRawUnsafe('SELECT "id" FROM "PaymentProvider" WHERE "id" = $1 FOR SHARE', found.id);
    const provider = found ? await tx.paymentProvider.findUnique({ where: { id: found.id } }) : null;
    if (!provider?.isInstalled || provider.code !== STRIPE_PROVIDER_CODE) throw new Error("Card payment isn\u2019t set up for this host. Arrange payment with your host.");
    const payment = await tx.payment.create({ data: {
      hostOrganizationId: locked.hostOrganizationId,
      reservationId: locked.id,
      guestId: locked.guestId,
      paymentProviderId: provider.id,
      amountCents,
      currencyCode: locked.currencyCode,
      status: "pending",
      paymentMethod: "card",
      provider: STRIPE_PROVIDER_CODE,
      providerPaymentId: `reserved:${idempotencyKey}`,
      idempotencyKey,
      // The provider configuration this attempt is made under, frozen (nonsecret).
      data: { source: "openfront-rental", mode: locked.testMode === true ? "test" : "card", lineage: providerLineage(provider) }
    } });
    return { payment, stale: false, claim: await claimAttempt(tx, payment.id, "guest_checkout") };
  }, transactionOptions2);
}
async function providerStateFor(context, tripToken, reservationId, payment, stale, claim) {
  const attached = payment.providerPaymentId.startsWith("pi_");
  const expected = attemptIdentity(payment);
  let result;
  if (!attached) {
    if (replayWindowOpen(payment)) {
      await admitProviderCall(context.prisma, claim, { replay: true, submission: true });
      result = await createPayment({
        provider: STRIPE_PROVIDER_CODE,
        reservation: { id: reservationId },
        amount: payment.amountCents,
        currency: payment.currencyCode,
        idempotencyKey: payment.idempotencyKey,
        metadata: { rentalPaymentId: payment.id }
      });
      if (!stale) return result;
      if (!result.providerPaymentId?.startsWith("pi_")) throw new Error("Card payment could not be prepared.");
      payment = { ...payment, providerPaymentId: result.providerPaymentId };
    } else {
      const found = await findProviderPayment({ provider: STRIPE_PROVIDER_CODE, rentalPaymentId: payment.id });
      if (!found) throw new Error("This payment needs host review before another attempt. Please don\u2019t pay again.");
      assertProviderIdentity({ ...payment, providerPaymentId: found.providerPaymentId }, found);
      if (found.status === "captured") return found;
      payment = { ...payment, providerPaymentId: found.providerPaymentId };
      stale = true;
    }
  }
  await admitProviderCall(context.prisma, claim);
  result = stale ? await cancelProviderPayment({ provider: STRIPE_PROVIDER_CODE, paymentId: payment.providerPaymentId, expected }) : await getPaymentStatus({ provider: STRIPE_PROVIDER_CODE, paymentId: payment.providerPaymentId });
  assertProviderIdentity(payment, result);
  if (result.status === "failed") {
    await closeUnpayableAttempt(context, tripToken, reservationId, { ...payment, providerPaymentId: attached ? payment.providerPaymentId : void 0 }, stale ? "The stay balance changed before this card payment was made." : "Stripe cancelled this payment attempt.");
    return null;
  }
  if (stale && result.status !== "captured") throw new Error("Your earlier card payment is still processing. Check again shortly; please don\u2019t pay again.");
  return result;
}
async function startGuestStayPayment(_root, args, context) {
  if (!stripeCheckoutEnabled()) throw new Error("Card payment is currently unavailable.");
  const reservation = await ownedReservation(context.prisma, args.tripToken);
  for (let round = 0; round < 3; round += 1) {
    const reserved = await reserveAttempt(context, args.tripToken, reservation.id);
    if (!reserved) return { status: "paid" };
    const { payment, stale, claim } = reserved;
    let result;
    try {
      result = await providerStateFor(context, args.tripToken, reservation.id, payment, stale, claim);
    } catch (error) {
      await context.prisma.$transaction(async (tx) => releaseClaim(tx, claim), transactionOptions2).catch(() => void 0);
      throw error;
    }
    if (!result) continue;
    if (!result.providerPaymentId?.startsWith("pi_")) throw new Error("Card payment could not be prepared.");
    const stillPayable = await context.prisma.$transaction(async (tx) => {
      const locked = await lockedReservation(tx, args.tripToken, reservation.id);
      const current2 = await tx.payment.findUnique({ where: { id: payment.id } });
      if (!current2 || ![payment.providerPaymentId, result.providerPaymentId].includes(current2.providerPaymentId)) throw new Error("Card payment identity changed.");
      if (current2.providerPaymentId !== result.providerPaymentId) await tx.payment.update({ where: { id: payment.id }, data: { providerPaymentId: result.providerPaymentId } });
      const claimCurrent = await claimIsCurrent(tx, claim);
      await releaseClaim(tx, claim);
      if (!["pending", "processing"].includes(current2.status)) throw new Error("This card payment was closed. Refresh your trip to see the latest balance.");
      return claimCurrent && locked.status === "confirmed";
    }, transactionOptions2);
    if (result.status === "captured") return { status: "verifying", paymentId: payment.id, mode: "test" };
    if (!stillPayable) {
      await reconcileProviderAttempt(context.prisma, payment.id, { reason: "The stay changed before this card payment was made.", closing: true }).catch(() => null);
      throw new Error("This stay can no longer be paid by card. Refresh your trip to see its status.");
    }
    return {
      status: "ready",
      clientSecret: result.data?.clientSecret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      paymentId: payment.id,
      // The exact tender reserved for this attempt: the Pay button shows this, not a page-load balance.
      amountCents: payment.amountCents,
      currencyCode: payment.currencyCode,
      mode: "test"
    };
  }
  throw new Error("Card payment could not be prepared. Please try again.");
}
async function completeGuestStayPayment(_root, args, context) {
  const reservation = await ownedReservation(context.prisma, args.tripToken);
  const payment = await context.prisma.payment.findUnique({ where: { id: args.paymentId } });
  if (!payment || payment.reservationId !== reservation.id || payment.hostOrganizationId !== reservation.hostOrganizationId || payment.provider !== STRIPE_PROVIDER_CODE || !payment.providerPaymentId.startsWith("pi_")) throw new Error("Payment not found for this stay.");
  const result = await getPaymentStatus({ provider: STRIPE_PROVIDER_CODE, paymentId: payment.providerPaymentId });
  assertProviderIdentity(payment, result);
  if (result.status === "failed") {
    await closeUnpayableAttempt(context, args.tripToken, reservation.id, payment, "Stripe cancelled this payment attempt.");
    return { status: "unpaid" };
  }
  if (result.status !== "captured") return { status: result.data?.providerStatus === "processing" ? "processing" : "unpaid" };
  const paymentStatus = await context.prisma.$transaction(async (tx) => {
    await lockedReservation(tx, args.tripToken, reservation.id);
    await settleSucceededPayment(tx, {
      paymentId: payment.id,
      expectedAmountCents: Number(result.data?.amountCents),
      expectedCurrencyCode: String(result.data?.currencyCode),
      evidence: { kind: "stripe_return", providerPaymentId: payment.providerPaymentId, livemode: false },
      processedAt: /* @__PURE__ */ new Date()
    });
    const settled = await tx.reservation.findUnique({ where: { id: reservation.id }, select: { paymentStatus: true } });
    return settled?.paymentStatus;
  }, transactionOptions2);
  return { status: paymentStatus === "paid" ? "paid" : "received", mode: "test" };
}

// features/keystone/mutations/hostReporting.ts
var import_node_crypto15 = __toESM(require("node:crypto"));
var import_graphql = require("graphql");
var DAY_MS4 = 864e5;
var PAGE_SIZE = 1e3;
var MAX_REPORT_NIGHTS = 366;
var reportLimits = { units: 5e3, listings: 5e3, reservations: 2e4, blocks: 5e4, amendments: 5e3 };
var ARCHIVE_VERSION = 3;
var ARCHIVE_MAX_RECORDS = 5e4;
var excludedStayStatuses = ["cancelled", "no_show", "inquiry", "quoted"];
var settledPaymentStatuses4 = ["succeeded", "partially_refunded", "refunded"];
var issuedStatementStatuses = ["approved", "sent", "paid"];
var contextPermissions = ["canReadReports", "canManageReports", "canReadPayouts", "canManagePayouts"];
function reportError(code, message) {
  return new import_graphql.GraphQLError(message, { extensions: { code } });
}
function hostOrganizationScope(context, permission) {
  const session = context.session;
  const role = session?.data?.role;
  if (!session?.itemId || session.data?.isActive !== true || !role?.[permission]) return null;
  if (role.canManageRoles || role.canManagePeople) return {};
  return { memberships: { some: { userId: session.itemId, status: "active" } } };
}
function hostChildScope(context, permission) {
  const scope = hostOrganizationScope(context, permission);
  if (!scope) return null;
  return Object.keys(scope).length ? { hostOrganization: scope } : {};
}
async function permittedHostOrganizations(_root, args, context) {
  const permission = contextPermissions.find((value) => value === args.permission);
  if (!permission) throw reportError("BAD_USER_INPUT", "Unsupported host permission.");
  const scope = hostOrganizationScope(context, permission);
  if (!scope) return { hosts: [], hasMore: false };
  const search = typeof args.search === "string" ? args.search.trim().slice(0, 120) : "";
  const where = search ? { AND: [scope, { name: { contains: search, mode: "insensitive" } }] } : scope;
  const rows = await context.prisma.hostOrganization.findMany({ where, select: { id: true, name: true }, orderBy: [{ name: "asc" }, { id: "asc" }], take: 201 });
  return { hosts: rows.slice(0, 200), hasMore: rows.length > 200 };
}
function dayNumber(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
  return parsed.getTime() / DAY_MS4;
}
function reportRange(startDate, endDate) {
  const startDay = dayNumber(startDate);
  const endDay = dayNumber(endDate);
  if (startDay == null || endDay == null) throw reportError("BAD_USER_INPUT", "Choose valid report dates in YYYY-MM-DD format.");
  if (endDay <= startDay) throw reportError("BAD_USER_INPUT", "The report end date must be after its start date.");
  if (endDay - startDay > MAX_REPORT_NIGHTS) throw reportError("BAD_USER_INPUT", `Report ranges are limited to ${MAX_REPORT_NIGHTS} nights.`);
  return { start: startDate, end: endDate, startDay, endDay, nights: endDay - startDay };
}
async function readAll(fetchPage, max) {
  const items = [];
  for (; ; ) {
    const take = Math.min(PAGE_SIZE, max + 1 - items.length);
    const page = await fetchPage(items.length, take);
    items.push(...page);
    if (items.length > max) return { items: items.slice(0, max), complete: false };
    if (page.length < take) return { items, complete: true };
  }
}
function addDays2(map, key, from, to, skip) {
  if (from >= to) return;
  const days = map.get(key) || /* @__PURE__ */ new Set();
  for (let day = from; day < to; day += 1) if (!skip?.has(day)) days.add(day);
  map.set(key, days);
}
async function hostOperationsReport(_root, args, context) {
  const range = reportRange(args.startDate, args.endDate);
  try {
    await assertHostOrganizationAccess({ context, hostOrganizationId: args.hostOrganizationId, permission: "canReadReports" });
  } catch (error) {
    throw reportError("FORBIDDEN", error instanceof Error ? error.message : "You do not have access to reports for this host.");
  }
  const hostOrganizationId = args.hostOrganizationId;
  const startAt = /* @__PURE__ */ new Date(`${range.start}T00:00:00.000Z`);
  const endAt = /* @__PURE__ */ new Date(`${range.end}T00:00:00.000Z`);
  return context.prisma.$transaction(async (tx) => {
    const [{ capturedAt }] = await tx.$queryRaw`SELECT now() AS "capturedAt"`;
    const incomplete = [];
    const units = await readAll((skip, take) => tx.accommodationUnit.findMany({ where: { hostOrganizationId }, select: { id: true, status: true }, orderBy: { id: "asc" }, skip, take }), reportLimits.units);
    const listings = await readAll((skip, take) => tx.listing.findMany({ where: { hostOrganizationId }, select: { id: true, status: true, accommodationUnitId: true }, orderBy: { id: "asc" }, skip, take }), reportLimits.listings);
    if (!units.complete || !listings.complete) incomplete.push("supply");
    const unitKeyOfListing = new Map(listings.items.map((listing) => [listing.id, listing.accommodationUnitId ? `unit:${listing.accommodationUnitId}` : `listing:${listing.id}`]));
    const availableUnits = new Set(units.items.filter((unit) => unit.status === "available").map((unit) => `unit:${unit.id}`));
    const publishedListings = listings.items.filter((listing) => listing.status === "published");
    const sellable = /* @__PURE__ */ new Set();
    for (const listing of publishedListings) {
      const key = unitKeyOfListing.get(listing.id);
      if (key.startsWith("listing:") || availableUnits.has(key)) sellable.add(key);
    }
    const overlap = { hostOrganizationId, checkInDate: { lt: range.end }, checkOutDate: { gt: range.start } };
    const reservations = await readAll((skip, take) => tx.reservation.findMany({
      where: overlap,
      select: {
        id: true,
        status: true,
        testMode: true,
        fixtureOrigin: true,
        currencyCode: true,
        checkInDate: true,
        checkOutDate: true,
        listingId: true,
        accommodationUnitId: true,
        lodgingSubtotalCents: true,
        feeTotalCents: true,
        taxTotalCents: true,
        discountTotalCents: true,
        totalAmountCents: true,
        amountPaidCents: true
      },
      orderBy: { id: "asc" },
      skip,
      take
    }), reportLimits.reservations);
    if (!reservations.complete) incomplete.push("reservations");
    const real = (reservation) => reservation.testMode !== true && !reservation.fixtureOrigin;
    const active = reservations.items.filter((reservation) => !excludedStayStatuses.includes(reservation.status) && real(reservation));
    const moneyStays = active;
    const sampleReservationCount = reservations.items.filter((reservation) => reservation.fixtureOrigin).length;
    const occupied = /* @__PURE__ */ new Map();
    const nightsByCurrency = /* @__PURE__ */ new Map();
    let invalidDates = 0;
    for (const reservation of active) {
      const checkIn = dayNumber(reservation.checkInDate);
      const checkOut = dayNumber(reservation.checkOutDate);
      if (checkIn == null || checkOut == null) {
        invalidDates += 1;
        continue;
      }
      const key = reservation.accommodationUnitId ? `unit:${reservation.accommodationUnitId}` : unitKeyOfListing.get(reservation.listingId) || `reservation:${reservation.id}`;
      const from = Math.max(checkIn, range.startDay);
      const to = Math.min(checkOut, range.endDay);
      addDays2(occupied, key, from, to);
      if (to > from) {
        const currency = (reservation.currencyCode || "").toUpperCase();
        nightsByCurrency.set(currency, (nightsByCurrency.get(currency) || 0) + (to - from));
      }
    }
    if (invalidDates) incomplete.push("reservation_dates");
    const blocks = await readAll((skip, take) => tx.calendarBlock.findMany({
      where: { hostOrganizationId, status: "active", ...REAL_CAPACITY_BLOCK, OR: [{ reason: null }, { reason: { not: "reservation" } }], startDate: { lt: range.end }, endDate: { gt: range.start } },
      select: { id: true, listingId: true, startDate: true, endDate: true },
      orderBy: { id: "asc" },
      skip,
      take
    }), reportLimits.blocks);
    if (!blocks.complete) incomplete.push("calendar_blocks");
    const blocked = /* @__PURE__ */ new Map();
    for (const block of blocks.items) {
      const key = unitKeyOfListing.get(block.listingId);
      const from = dayNumber(block.startDate);
      const to = dayNumber(block.endDate);
      if (!key || !sellable.has(key) || from == null || to == null) continue;
      addDays2(blocked, key, Math.max(from, range.startDay), Math.min(to, range.endDay), occupied.get(key));
    }
    const sumDays = (map, keys) => [...map.entries()].reduce((sum, [key, days]) => sum + (!keys || keys.has(key) ? days.size : 0), 0);
    const capacityNights = sellable.size * range.nights;
    const occupiedSellableNights = sumDays(occupied, sellable);
    const blockedNights = sumDays(blocked);
    const supplyComplete = units.complete && listings.complete && reservations.complete && blocks.complete && !invalidDates;
    const supply = supplyComplete ? {
      sellableUnitCount: sellable.size,
      publishedListingCount: publishedListings.length,
      capacityNights,
      bookedNights: sumDays(occupied),
      occupiedSellableNights,
      blockedNights,
      availableNights: Math.max(capacityNights - occupiedSellableNights - blockedNights, 0),
      occupancyBasisPoints: capacityNights ? Math.round(occupiedSellableNights * 1e4 / capacityNights) : 0
    } : null;
    const moneyStayFilter = { ...overlap, status: { notIn: excludedStayStatuses }, ...REAL_STAY };
    const nightLineGroups = await tx.reservationLineItem.groupBy({
      by: ["currencyCode"],
      where: { lineType: "night", serviceDate: { gte: range.start, lt: range.end }, reservation: { ...moneyStayFilter, amendments: { none: {} } } },
      _sum: { totalAmountCents: true }
    });
    const pricedStays = await tx.reservationLineItem.groupBy({
      by: ["reservationId"],
      where: { lineType: "night", reservation: { ...moneyStayFilter, amendments: { none: {} } } },
      _count: { _all: true }
    });
    const amendments = await readAll((skip, take) => tx.reservationAmendment.findMany({
      where: { reservation: moneyStayFilter },
      select: { id: true, reservationId: true, afterSnapshot: true, createdAt: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take
    }), reportLimits.amendments);
    if (!amendments.complete) incomplete.push("amendments");
    const latestAmendment = /* @__PURE__ */ new Map();
    for (const amendment of amendments.items) if (!latestAmendment.has(amendment.reservationId)) latestAmendment.set(amendment.reservationId, amendment);
    const withNightLines = new Set(pricedStays.map((group) => group.reservationId));
    const lodgingByCurrency = new Map(nightLineGroups.map((group) => [(group.currencyCode || "").toUpperCase(), group._sum?.totalAmountCents || 0]));
    let lodgingEstimatedReservationCount = 0;
    for (const stay of moneyStays) {
      const amendment = latestAmendment.get(stay.id);
      if (!amendment && withNightLines.has(stay.id)) continue;
      const currency = (stay.currencyCode || "").toUpperCase();
      const nights = amendment?.afterSnapshot?.pricingQuote?.nights;
      let cents3 = 0;
      if (Array.isArray(nights)) {
        cents3 = nights.filter((night) => typeof night?.date === "string" && night.date >= range.start && night.date < range.end).reduce((sum, night) => sum + (Number.isSafeInteger(night.amountCents) ? night.amountCents : 0), 0);
      } else {
        const checkIn = dayNumber(stay.checkInDate);
        const checkOut = dayNumber(stay.checkOutDate);
        if (checkIn == null || checkOut == null || checkOut <= checkIn) continue;
        const nightsCount = checkOut - checkIn;
        const lodging = stay.lodgingSubtotalCents ?? 0;
        const base = Math.floor(lodging / nightsCount);
        const extra = lodging - base * nightsCount;
        const from = Math.max(checkIn, range.startDay) - checkIn;
        const to = Math.min(checkOut, range.endDay) - checkIn;
        if (to <= from) continue;
        cents3 = base * (to - from) + Math.max(Math.min(to, extra) - Math.min(from, extra), 0);
        lodgingEstimatedReservationCount += 1;
      }
      lodgingByCurrency.set(currency, (lodgingByCurrency.get(currency) || 0) + cents3);
    }
    const stayCharges = /* @__PURE__ */ new Map();
    const chargeEntry = (currencyCode) => {
      const currency = (currencyCode || "").toUpperCase();
      const entry = stayCharges.get(currency) || { fee: 0, tax: 0, discount: 0, outstanding: 0 };
      stayCharges.set(currency, entry);
      return entry;
    };
    for (const stay of moneyStays) chargeEntry(stay.currencyCode).outstanding += Math.max((stay.totalAmountCents ?? 0) - (stay.amountPaidCents ?? 0), 0);
    const checkedOut = await readAll((skip, take) => tx.reservation.findMany({
      where: { hostOrganizationId, checkOutDate: { gte: range.start, lt: range.end }, status: { notIn: excludedStayStatuses }, ...REAL_STAY },
      select: { id: true, currencyCode: true, feeTotalCents: true, taxTotalCents: true, discountTotalCents: true },
      orderBy: { id: "asc" },
      skip,
      take
    }), reportLimits.reservations);
    if (!checkedOut.complete) incomplete.push("stay_charges");
    for (const stay of checkedOut.items) {
      const entry = chargeEntry(stay.currencyCode);
      entry.fee += stay.feeTotalCents ?? 0;
      entry.tax += stay.taxTotalCents ?? 0;
      entry.discount += stay.discountTotalCents ?? 0;
    }
    const datedInRange = { OR: [{ processedAt: { gte: startAt, lt: endAt } }, { processedAt: null, createdAt: { gte: startAt, lt: endAt } }] };
    const REPORT_ROW_PAGE = 2e3;
    const REPORT_ROW_LIMIT = 1e5;
    const readSettledRows = async (delegate, args2) => {
      const rows = [];
      for (let skip = 0; ; skip += REPORT_ROW_PAGE) {
        const page = await delegate.findMany({ ...args2, orderBy: [{ id: "asc" }], skip, take: REPORT_ROW_PAGE });
        rows.push(...page);
        if (rows.length > REPORT_ROW_LIMIT) throw reportError("BAD_USER_INPUT", "This range has too many payments to total. Choose a shorter range.");
        if (page.length < REPORT_ROW_PAGE) return rows;
      }
    };
    const settledPayments = await readSettledRows(tx.payment, {
      where: { hostOrganizationId, status: { in: settledPaymentStatuses4 }, AND: [datedInRange] },
      select: { amountCents: true, currencyCode: true, provider: true, data: true }
    });
    const succeededRefunds = await readSettledRows(tx.refund, {
      where: { hostOrganizationId, status: "succeeded", AND: [datedInRange] },
      select: { amountCents: true, currencyCode: true, paymentId: true, payment: { select: { provider: true, data: true } }, reservation: { select: { testMode: true } } }
    });
    const groupSum = (rows) => {
      const sums = /* @__PURE__ */ new Map();
      for (const row of rows) sums.set(row.currencyCode, (sums.get(row.currencyCode) || 0) + (row.amountCents || 0));
      return [...sums.entries()].map(([currencyCode, amountCents]) => ({ currencyCode, _sum: { amountCents } }));
    };
    const paymentGroups = groupSum(settledPayments.filter((payment) => isRealMoneyTender(tenderKind(payment))));
    const refundGroups = groupSum(succeededRefunds.filter((refund) => refund.payment ? isRealMoneyTender(tenderKind(refund.payment)) : refund.reservation?.testMode !== true));
    const testTenderPaymentCount = settledPayments.filter((payment) => tenderKind(payment) === "test").length;
    const notSamplePayout = { NOT: [{ reservation: { fixtureOrigin: { not: null } } }, { ownerStatement: SAMPLE_STATEMENT }] };
    const payoutGroups = await tx.payout.groupBy({
      by: ["currencyCode"],
      where: { hostOrganizationId, status: "paid", paidAt: { gte: startAt, lt: endAt }, ...notSamplePayout },
      _sum: { netAmountCents: true }
    });
    const statementGroups = await tx.ownerStatement.groupBy({
      by: ["currencyCode"],
      where: { hostOrganizationId, status: { in: issuedStatementStatuses }, periodStart: { lt: range.end }, periodEnd: { gt: range.start }, NOT: SAMPLE_STATEMENT },
      _sum: { ownerEarningsCents: true },
      _count: { _all: true }
    });
    const sampleStatementCount = await tx.ownerStatement.count({
      where: { hostOrganizationId, status: { in: issuedStatementStatuses }, periodStart: { lt: range.end }, periodEnd: { gt: range.start }, ...SAMPLE_STATEMENT }
    });
    const sumBy = (groups, field) => new Map(groups.map((group) => [(group.currencyCode || "").toUpperCase(), group._sum?.[field] || 0]));
    const collected = sumBy(paymentGroups, "amountCents");
    const refunded = sumBy(refundGroups, "amountCents");
    const paidOut = sumBy(payoutGroups, "netAmountCents");
    const statementEarnings = sumBy(statementGroups, "ownerEarningsCents");
    const statementCounts = new Map(statementGroups.map((group) => [(group.currencyCode || "").toUpperCase(), group._count?._all || 0]));
    const stayAmountsComplete = reservations.complete && amendments.complete && checkedOut.complete && !invalidDates;
    if (!stayAmountsComplete) incomplete.push("stay_amounts");
    const currencies = [.../* @__PURE__ */ new Set([...lodgingByCurrency.keys(), ...stayCharges.keys(), ...collected.keys(), ...refunded.keys(), ...paidOut.keys(), ...statementEarnings.keys()])].filter(Boolean).sort();
    const money2 = currencies.map((currencyCode) => {
      const lodging = lodgingByCurrency.get(currencyCode) || 0;
      const nights = nightsByCurrency.get(currencyCode) || 0;
      const charges = stayCharges.get(currencyCode) || { fee: 0, tax: 0, discount: 0, outstanding: 0 };
      const collectedCents = collected.get(currencyCode) || 0;
      const refundedCents = refunded.get(currencyCode) || 0;
      return {
        currencyCode,
        lodgingRevenueCents: stayAmountsComplete ? lodging : null,
        lodgingNights: stayAmountsComplete ? nights : null,
        adrCents: stayAmountsComplete && nights ? Math.round(lodging / nights) : null,
        feeRevenueCents: stayAmountsComplete ? charges.fee : null,
        taxAssessedCents: stayAmountsComplete ? charges.tax : null,
        discountCents: stayAmountsComplete ? charges.discount : null,
        outstandingCents: stayAmountsComplete ? charges.outstanding : null,
        collectedCents,
        refundedCents,
        netCollectedCents: collectedCents - refundedCents,
        payoutCents: paidOut.get(currencyCode) || 0,
        ownerStatementEarningsCents: statementEarnings.get(currencyCode) || 0,
        ownerStatementCount: statementCounts.get(currencyCode) || 0
      };
    });
    const statusGroups = await tx.reservation.groupBy({ by: ["status"], where: overlap, _count: { _all: true } });
    const sourceGroups = await tx.reservation.groupBy({ by: ["source"], where: overlap, _count: { _all: true } });
    const countsOf = (groups, field) => Object.fromEntries(groups.map((group) => [group[field] || "unknown", group._count?._all || 0]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
    const testModeReservationCount = await tx.reservation.count({ where: { ...overlap, testMode: true } });
    const now = capturedAt instanceof Date ? capturedAt : new Date(capturedAt);
    const openTasks = { hostOrganizationId, status: { notIn: ["completed", "cancelled"] }, dueAt: { lt: endAt } };
    const openTaskCount = await tx.propertyTask.count({ where: openTasks });
    const overdueTaskCount = await tx.propertyTask.count({ where: { ...openTasks, dueAt: { lt: now.getTime() < endAt.getTime() ? now : endAt } } });
    const syncWindow = { hostOrganizationId, occurredAt: { gte: startAt, lt: endAt } };
    const channelSyncFailureCount = await tx.channelSyncEvent.count({ where: { ...syncWindow, status: "failed" } });
    const lastSuccess = await tx.channelSyncEvent.findFirst({ where: { ...syncWindow, status: "succeeded" }, orderBy: [{ occurredAt: "desc" }], select: { occurredAt: true } });
    return {
      version: 2,
      hostOrganizationId,
      startDate: range.start,
      endDate: range.end,
      generatedAt: now.toISOString(),
      complete: incomplete.length === 0,
      incomplete,
      bases: {
        lodging: "nightly_rates_for_nights_in_range",
        stayCharges: "fees_tax_and_discounts_of_stays_whose_checkout_date_is_in_range (same as owner statements)",
        lodgingEstimate: "stays without dated nightly rates: lodging split evenly per night in whole cents, remainder to the earliest nights (an estimate, not captured nightly evidence)",
        outstanding: "open_balance_of_stays_overlapping_range",
        collections: "settled_payments_and_completed_refunds_dated_in_range_utc",
        payouts: "owner_payouts_paid_in_range_utc",
        ownerStatements: "issued_statements_whose_period_overlaps_range",
        capacity: "units_available_today_with_a_published_listing",
        pendingOwnerPolicy: ["fee_and_tax_recognition_period"]
      },
      supply,
      money: money2,
      lodgingEstimatedReservationCount: stayAmountsComplete ? lodgingEstimatedReservationCount : null,
      testModeReservationCount,
      testTenderPaymentCount,
      sampleReservationCount,
      sampleStatementCount,
      reservationsByStatus: countsOf(statusGroups, "status"),
      reservationsBySource: countsOf(sourceGroups, "source"),
      openTaskCount,
      overdueTaskCount,
      channelSyncFailureCount,
      lastSuccessfulSyncAt: lastSuccess?.occurredAt ? new Date(lastSuccess.occurredAt).toISOString() : null
    };
  }, { maxWait: 5e3, timeout: 3e4, isolationLevel: "RepeatableRead" });
}
function fields(names) {
  return Object.fromEntries(names.split(/\s+/).filter(Boolean).map((name) => [name, true]));
}
function withoutPrivateAddress(value) {
  if (Array.isArray(value)) return value.map(withoutPrivateAddress);
  if (!value || typeof value !== "object" || value instanceof Date) return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !["address", "addressLine1", "addressLine2", "postalCode"].includes(key)).map(([key, child]) => [key, withoutPrivateAddress(child)]));
}
var refundEvidenceKeys = ["totalAdjustment", "creditReversals", "manualReconciliation", "liabilityType", "amendmentId", "policyReviewRequired", "entitlement", "declined", "hostInitiated"];
var archiveCollections = [
  { key: "properties", delegate: "property", select: fields("id name internalCode propertyType status timezone checkInFrom checkInUntil checkOutBy registrationNumber createdAt updatedAt") },
  { key: "accommodationUnits", delegate: "accommodationUnit", select: fields("id propertyId name accommodationType status maxGuests bedroomCount bedCount bathroomCountHalfUnits squareFeet floorLabel createdAt updatedAt") },
  { key: "listings", delegate: "listing", select: fields("id propertyId accommodationUnitId title slug subtitle description status bookingMode instantBook isFeatured currencyCode baseNightlyRateCents securityDepositCents minimumStay maximumStay advanceNoticeHours bookingWindowDays createdAt updatedAt") },
  { key: "ratePlans", delegate: "ratePlan", select: fields("id listingId cancellationPolicyId name description status currencyCode baseNightlyRateCents minimumStay maximumStay advanceNoticeHours bookingWindowDays isDefault createdAt updatedAt") },
  { key: "seasonalRates", delegate: "seasonalRate", select: fields("id ratePlanId name startDate endDate nightlyRateCents adjustmentBasisPoints minimumStay priority isActive createdAt updatedAt") },
  { key: "feeDefinitions", delegate: "feeDefinition", select: fields("id listingId name feeType calculation amountCents percentageBasisPoints taxable required isActive createdAt updatedAt") },
  { key: "taxRules", delegate: "taxRule", select: fields("id listingId name jurisdiction registrationNumber rateBasisPoints isInclusive isActive createdAt updatedAt") },
  { key: "cancellationPolicies", delegate: "cancellationPolicy", select: fields("id name version policyType summary fullTerms freeCancellationHours rules createdAt updatedAt") },
  { key: "houseRules", delegate: "houseRule", select: fields("id listingId ruleType title description isAllowed isRequired createdAt updatedAt") },
  { key: "calendarBlocks", delegate: "calendarBlock", select: fields("id listingId reservationId startDate endDate reason status source externalUid fixtureOrigin createdAt updatedAt") },
  { key: "guests", delegate: "guestProfile", select: fields("id name email phone verificationStatus preferredLanguage marketingConsent createdAt updatedAt") },
  {
    key: "reservations",
    delegate: "reservation",
    select: fields("id listingId accommodationUnitId guestId agreementId securityDepositId confirmationCode status paymentStatus source testMode fixtureOrigin fixtureEvidence checkInDate checkOutDate scheduledCheckInTime scheduledCheckOutTime checkedInAt checkedOutAt cancelledAt cancellationReason cancelledBy currencyCode lodgingSubtotalCents feeTotalCents taxTotalCents discountTotalCents securityDepositCents totalAmountCents amountPaidCents bookingSnapshot guestNotes createdAt updatedAt"),
    sanitize: (row) => ({ ...row, bookingSnapshot: withoutPrivateAddress(row.bookingSnapshot) })
  },
  {
    key: "reservationLineItems",
    delegate: "reservationLineItem",
    select: fields("id reservationId snapshotKey lineType description serviceDate quantity unitAmountCents totalAmountCents currencyCode metadataSnapshot createdAt"),
    where: (hostOrganizationId) => ({ OR: [{ hostOrganizationId }, { hostOrganizationId: null, reservation: { hostOrganizationId } }] })
  },
  { key: "reservationAmendments", delegate: "reservationAmendment", select: fields("id reservationId actorUserId reason previousCheckInDate previousCheckOutDate checkInDate checkOutDate currencyCode originalBookingSnapshotHash beforeSnapshot afterSnapshot delta createdAt") },
  {
    key: "stayAgreements",
    delegate: "stayAgreement",
    select: fields("id guestId cancellationPolicyId agreementNumber status title signerEmail signatureName signedAt signatureEvidence termsSnapshot createdAt updatedAt"),
    sanitize: (row) => ({ ...row, termsSnapshot: withoutPrivateAddress(row.termsSnapshot) })
  },
  {
    key: "payments",
    delegate: "payment",
    select: fields("id reservationId guestId amountCents refundedAmountCents currencyCode status paymentMethod provider providerPaymentId processedAt data createdAt updatedAt"),
    // Manual attestation, setup-sample and test-mode evidence is kept; provider payloads aren't.
    sanitize: (row) => ({ ...row, data: pickKeys(row.data, paymentEvidenceKeys) })
  },
  {
    key: "refunds",
    delegate: "refund",
    select: fields("id reservationId paymentId reservationAmendmentId refundNumber status reason amountCents currencyCode providerRefundId processedAt data createdAt updatedAt"),
    sanitize: (row) => {
      const data = row.data && typeof row.data === "object" ? row.data : {};
      return { ...row, data: Object.fromEntries(refundEvidenceKeys.filter((key) => key in data).map((key) => [key, data[key]])) };
    }
  },
  {
    key: "securityDeposits",
    delegate: "securityDeposit",
    select: fields("id paymentId depositNumber status amountCents capturedAmountCents currencyCode heldAt releasedAt providerReference metadata createdAt updatedAt"),
    // The appended event history (each attested hold, capture and release) is part of the record.
    sanitize: (row) => ({ ...row, metadata: pickKeys(row.metadata, ["events"]) })
  },
  // The party on record now (after any host change) and its invitations; the booked party stays in each booking snapshot.
  { key: "guestParties", delegate: "guestParty", select: fields("id reservationId primaryGuestId adults children infants pets invitedGuests createdAt updatedAt") },
  { key: "conversations", delegate: "conversation", select: fields("id reservationId listingId guestId channelConnectionId subject status guestEmail guestAccessTokenExpiresAt guestAccessTokenRevokedAt lastMessageAt createdAt updatedAt") },
  {
    key: "messages",
    delegate: "message",
    select: fields("id conversationId direction senderType status sentAt receivedAt createdAt body"),
    // Message records are kept with their length; free-text bodies are left out (counted in omissions).
    sanitize: ({ body, ...row }) => ({ ...row, bodyLength: typeof body === "string" ? body.length : 0 })
  },
  { key: "listingMedia", delegate: "listingMedia", select: fields("id listingId imagePath altText caption order createdAt updatedAt") },
  { key: "bedrooms", delegate: "bedroom", select: fields("id accommodationUnitId name order createdAt updatedAt") },
  {
    key: "beds",
    delegate: "bed",
    select: fields("id bedroomId bedType quantity createdAt updatedAt"),
    where: (hostOrganizationId) => ({ OR: [{ hostOrganizationId }, { hostOrganizationId: null, bedroom: { hostOrganizationId } }] })
  },
  { key: "damageClaims", delegate: "damageClaim", select: fields("id reservationId listingId guestId claimNumber status description claimedAmountCents approvedAmountCents currencyCode evidence settlementEvidence submittedAt resolvedAt createdAt updatedAt") },
  { key: "owners", delegate: "propertyOwner", select: fields("id ownerNumber displayName companyName email phone status payoutSchedule defaultManagerCommissionBasisPoints payoutMethod payoutReference taxProfile createdAt updatedAt") },
  { key: "ownerAssignments", delegate: "propertyOwnerAssignment", select: fields("id ownerId propertyId status isPrimary ownershipBasisPoints managerCommissionBasisPoints effectiveFrom effectiveTo createdAt updatedAt") },
  { key: "ownerStatements", delegate: "ownerStatement", select: fields("id ownerId statementNumber status periodStart periodEnd currencyCode grossRevenueCents taxAmountCents refundAmountCents expenseAmountCents adjustmentAmountCents managerCommissionCents ownerEarningsCents paidOutCents balanceDueCents statementSnapshot generatedAt approvedAt sentAt paidAt paidReference createdAt updatedAt") },
  { key: "ownerStatementLines", delegate: "ownerStatementLine", select: fields("id statementId ownerId reservationId refundId payoutId lineKey lineType description serviceDate amountCents sourceId metadata createdAt") },
  { key: "payouts", delegate: "payout", select: fields("id reservationId propertyOwnerId ownerStatementId payoutNumber status currencyCode grossAmountCents platformFeeCents managerFeeCents refundAmountCents netAmountCents providerPayoutId scheduledAt paidAt data createdAt updatedAt") },
  { key: "tasks", delegate: "propertyTask", select: fields("id propertyId listingId reservationId title taskType status priority dueAt claimedAt startedAt completedAt cancelledAt checklist completionEvidence completionNotes createdAt updatedAt") },
  { key: "channelConnections", delegate: "channelConnection", select: fields("id name provider connectionType status syncAvailability syncRates syncReservations syncMessages lastSyncedAt createdAt updatedAt") },
  { key: "channelListings", delegate: "channelListing", select: fields("id listingId channelConnectionId externalListingId externalUrl status mapping lastSyncedAt createdAt updatedAt") },
  { key: "channelSyncEvents", delegate: "channelSyncEvent", select: fields("id channelConnectionId channelListingId action status attempts occurredAt createdAt") },
  { key: "reviews", delegate: "review", select: fields("id reservationId listingId guestId direction status overallRating cleanlinessRating accuracyRating communicationRating locationRating valueRating body submittedAt publishAfter publishedAt createdAt updatedAt") }
];
var archiveOmissionDefinitions = [
  { collection: "propertyAddresses", reason: "Exact private addresses are excluded. Address fields are also removed from booking and agreement snapshots, so archived agreement terms no longer match their signed terms hash.", count: (tx, hostOrganizationId) => tx.propertyAddress.count({ where: { hostOrganizationId } }) },
  { collection: "arrivalInstructions", reason: "Property arrival instructions are excluded; they can contain access codes.", count: (tx, hostOrganizationId) => tx.property.count({ where: { hostOrganizationId, NOT: { arrivalInstructions: "" } } }) },
  {
    collection: "internalNotes",
    reason: "Internal notes on properties, guests, reservations, tasks, calendar blocks and owner assignments are excluded.",
    count: async (tx, hostOrganizationId) => (await Promise.all([
      tx.property.count({ where: { hostOrganizationId, NOT: { internalNotes: "" } } }),
      tx.guestProfile.count({ where: { hostOrganizationId, NOT: { internalNotes: "" } } }),
      tx.reservation.count({ where: { hostOrganizationId, NOT: { internalNotes: "" } } }),
      tx.propertyTask.count({ where: { hostOrganizationId, NOT: { notes: "" } } }),
      tx.calendarBlock.count({ where: { hostOrganizationId, NOT: { notes: "" } } }),
      tx.propertyOwnerAssignment.count({ where: { hostOrganizationId, NOT: { notes: "" } } })
    ])).reduce((sum, count) => sum + count, 0)
  },
  { collection: "messageBodies", reason: "Message text is excluded (it is free text that can hold personal data); each message record and its length are included.", count: (tx, hostOrganizationId) => tx.message.count({ where: { hostOrganizationId } }) },
  {
    collection: "messageAttachments",
    reason: "Message attachments are excluded.",
    count: async (tx, hostOrganizationId) => {
      const [row] = await tx.$queryRaw`SELECT count(*)::int AS "count" FROM "Message" WHERE "hostOrganization" = ${hostOrganizationId} AND "attachments" IS NOT NULL AND "attachments"::text NOT IN ('null', '[]', '{}')`;
      return Number(row?.count || 0);
    }
  },
  { collection: "reviewPrivateFeedback", reason: "Private review feedback is excluded.", count: (tx, hostOrganizationId) => tx.review.count({ where: { hostOrganizationId, NOT: { privateFeedback: "" } } }) },
  { collection: "paymentProviders", reason: "Provider configuration and credentials are excluded.", count: (tx, hostOrganizationId) => tx.paymentProvider.count({ where: { hostOrganizationId } }) },
  { collection: "paymentProviderPayloads", reason: "Payment provider payloads and webhook events are excluded; payment and refund evidence kept by this app is included.", count: (tx, hostOrganizationId) => tx.paymentWebhookEvent.count({ where: { hostOrganizationId } }) },
  { collection: "channelConnectionSettings", reason: "Channel settings, feed URLs and sync errors are excluded; they can contain access tokens.", count: (tx, hostOrganizationId) => tx.channelConnection.count({ where: { hostOrganizationId } }) },
  { collection: "stayQuotes", reason: "Issued quotes are not included; converted ones are captured in each booking snapshot.", count: (tx, hostOrganizationId) => tx.stayQuote.count({ where: { hostOrganizationId } }) },
  { collection: "mediaFiles", reason: "Photo and media files are not included; their references are, under listingMedia.", count: (tx, hostOrganizationId) => tx.listingMedia.count({ where: { hostOrganizationId } }) },
  { collection: "teamAccess", reason: "Users, memberships and roles are excluded.", count: (tx, hostOrganizationId) => tx.hostMembership.count({ where: { hostOrganizationId } }) }
];
var paymentEvidenceKeys = ["kind", "provenance", "attestation", "scope", "mode", "idempotencyKey", "closedAt", "closedReason"];
function pickKeys(value, keys) {
  const data = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(keys.filter((key) => key in data).map((key) => [key, data[key]]));
}
var archiveContract = {
  scope: "Operational, financial and legal records of one host, for its own records and review.",
  restorable: false,
  statement: "This is not a full restorable backup: the omissions listed (with exact counts) are left out, and free text is not checked for personal data.",
  signedTerms: "Agreement terms here have private address fields removed, so they will not match the signature evidence hash recorded at signing.",
  samples: "Reservations with fixtureOrigin are onboarding samples created by setup; their money, signatures and reviews are not real activity."
};
var archivePrivacy = {
  exactPrivateAddresses: false,
  guestContactDetails: true,
  signerNamesAndEmails: true,
  internalNotes: false,
  credentials: false,
  paymentProviderPayloads: false,
  messageContent: false,
  messageMetadata: true,
  privateReviewFeedback: false
};
async function exportHostArchive(_root, args, context) {
  try {
    await assertHostOrganizationAccess({ context, hostOrganizationId: args.hostOrganizationId, permission: "canManageReports" });
  } catch (error) {
    throw reportError("FORBIDDEN", error instanceof Error ? error.message : "You do not have access to export this host.");
  }
  const hostOrganizationId = args.hostOrganizationId;
  const { archive, counts, capturedAt, omissions } = await context.prisma.$transaction(async (tx) => {
    const [{ capturedAt: snapshotAt }] = await tx.$queryRaw`SELECT now() AS "capturedAt"`;
    const capturedIso = (snapshotAt instanceof Date ? snapshotAt : new Date(snapshotAt)).toISOString();
    const host = await tx.hostOrganization.findUnique({
      where: { id: hostOrganizationId },
      select: fields("id name slug organizationType status publicBio publicEmail publicPhone website canonicalUrl federationId dataCustody isPublic createdAt")
    });
    if (!host) throw reportError("BAD_USER_INPUT", "Host organization not found.");
    const collections = {};
    const collectionCounts = {};
    for (const collection of archiveCollections) {
      const read = await readAll((skip, take) => tx[collection.delegate].findMany({
        where: collection.where ? collection.where(hostOrganizationId) : { hostOrganizationId },
        select: collection.select,
        orderBy: { id: "asc" },
        skip,
        take
      }), ARCHIVE_MAX_RECORDS);
      if (!read.complete) {
        throw reportError("BAD_USER_INPUT", `This host has more than ${ARCHIVE_MAX_RECORDS} ${collection.key} records, so a complete archive can't be produced in one export.`);
      }
      collections[collection.key] = collection.sanitize ? read.items.map(collection.sanitize) : read.items;
      collectionCounts[collection.key] = read.items.length;
    }
    const archiveOmissions = [];
    for (const omission of archiveOmissionDefinitions) archiveOmissions.push({ collection: omission.collection, reason: omission.reason, omittedCount: await omission.count(tx, hostOrganizationId) });
    return {
      capturedAt: capturedIso,
      counts: collectionCounts,
      omissions: archiveOmissions,
      archive: {
        format: "openfront-rental.host-archive",
        version: ARCHIVE_VERSION,
        exportedAt: capturedIso,
        snapshot: { isolation: "repeatable_read", capturedAt: capturedIso, note: "capturedAt is the database time when this export read its snapshot; it is not a PostgreSQL snapshot identifier." },
        manifest: { contract: archiveContract, collections: collectionCounts, omissions: archiveOmissions, privacy: archivePrivacy },
        host,
        ...collections
      }
    };
  }, { maxWait: 5e3, timeout: 6e4, isolationLevel: "RepeatableRead" });
  const serialized = JSON.stringify(archive);
  const checksum = import_node_crypto15.default.createHash("sha256").update(serialized).digest("hex");
  const idempotencyKey = `host-archive:${hostOrganizationId}:${checksum}`;
  const processedCount = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const job = await context.prisma.$transaction(async (tx) => {
    const record5 = await tx.dataExchangeJob.upsert({
      where: { idempotencyKey },
      update: {},
      create: {
        id: import_node_crypto15.default.randomUUID(),
        hostOrganizationId,
        direction: "export",
        domain: "host_archive",
        format: "json",
        status: "succeeded",
        idempotencyKey,
        payloadSha256: checksum,
        sourceLabel: `Host archive v${ARCHIVE_VERSION}`,
        processedCount,
        resultSummary: { version: ARCHIVE_VERSION, snapshotCapturedAt: capturedAt, collections: counts, omissions: omissions.map((omission) => ({ collection: omission.collection, omittedCount: omission.omittedCount })), privacy: archivePrivacy },
        startedAt: /* @__PURE__ */ new Date(),
        completedAt: /* @__PURE__ */ new Date()
      }
    });
    return record5;
  });
  return { jobId: job.id, checksum, archive };
}
var hostReportingTypeDefs = String.raw`
  type Query {
    """Id and name of the host organizations where the operator holds the given reports or payouts permission."""
    permittedHostOrganizations(permission: String!, search: String): JSON!
  }
`;
var hostReportingResolvers = {
  Query: {
    permittedHostOrganizations
  }
};

// features/keystone/mutations/ownerStatements.ts
var import_node_crypto17 = __toESM(require("node:crypto"));
var import_graphql2 = require("graphql");

// features/keystone/utils/ownerStatementAccounting.ts
var import_node_crypto16 = __toESM(require("node:crypto"));
var recognizedStayStatuses = ["confirmed", "in_stay", "completed"];
function dateOnly2(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) throw new Error(`${label} must be a date-only value.`);
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new Error(`${label} must be a real calendar date.`);
  }
  return value;
}
function previousDay(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}
function cents(value, label) {
  if (!Number.isSafeInteger(value)) throw new Error(`${label} must use integer cents.`);
  return value;
}
function basisPoints(value, label, minimum = 0) {
  if (!Number.isInteger(value) || value < minimum || value > 1e4) {
    throw new Error(`${label} must use basis points from ${minimum} to 10000.`);
  }
  return value;
}
function prorate(value, shareBasisPoints) {
  return Math.round(cents(value, "Prorated amount") * shareBasisPoints / 1e4);
}
function ownerStatementIdempotencyKey({
  ownerId,
  periodStart,
  periodEnd,
  currencyCode,
  revision = 1
}) {
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error("Statement revision must be a positive integer.");
  const parts = [ownerId.trim(), dateOnly2(periodStart, "Period start"), dateOnly2(periodEnd, "Period end"), currencyCode.trim().toUpperCase()];
  if (revision > 1) parts.push(`r${revision}`);
  return `owner-statement:${import_node_crypto16.default.createHash("sha256").update(parts.join("|")).digest("hex")}`;
}
function stayOwnershipDate(reservation) {
  const lastNight = previousDay(dateOnly2(reservation.checkOutDate, "Check-out"));
  return reservation.checkInDate && lastNight < reservation.checkInDate ? reservation.checkInDate : lastNight;
}
function covers(assignment, date) {
  return (!assignment.effectiveFrom || assignment.effectiveFrom <= date) && (!assignment.effectiveTo || date < assignment.effectiveTo);
}
function allocateRefundComponents(refund, stay) {
  const amount = cents(refund.amountCents, "Refund amount");
  const kind = refund.kind || "stay_refund";
  if (kind === "concession") return { kind, revenueCents: amount, taxCents: 0, otherCents: 0 };
  if (kind === "concession_already_netted") return { kind, revenueCents: 0, taxCents: 0, otherCents: amount };
  if (kind === "amendment_settlement" || kind === "overpayment") return { kind, revenueCents: 0, taxCents: 0, otherCents: amount };
  const revenue = Math.max(stayRevenueCents(stay), 0);
  const tax = Math.max(stay.taxTotalCents, 0);
  const chargeable = revenue + tax;
  if (chargeable <= 0) return { kind, revenueCents: 0, taxCents: 0, otherCents: amount };
  const allocated = Math.min(amount, chargeable);
  const revenueCents = Math.round(allocated * revenue / chargeable);
  return { kind, revenueCents, taxCents: allocated - revenueCents, otherCents: amount - allocated };
}
function stayRevenueCents(stay) {
  const credits = cents(stay.concessionCreditCents ?? 0, "Concession credit");
  if (credits < 0 || credits > stay.discountTotalCents) {
    throw new Error(`Reservation ${stay.confirmationCode} discount does not reconcile to its concession refunds.`);
  }
  return stay.lodgingSubtotalCents + stay.feeTotalCents - (stay.discountTotalCents - credits);
}
function buildOwnerStatement({
  ownerId,
  propertyAssignments,
  periodStart,
  periodEnd,
  currencyCode,
  reservations,
  refunds,
  refundStays = [],
  payouts,
  adjustments
}) {
  const start = dateOnly2(periodStart, "Period start");
  const end = dateOnly2(periodEnd, "Period end");
  if (start >= end) throw new Error("Statement period end must be after its start.");
  if (!ownerId?.trim()) throw new Error("Property owner is required.");
  if (!propertyAssignments.length) throw new Error("At least one owner property assignment is required.");
  const assignmentsByProperty = /* @__PURE__ */ new Map();
  for (const assignment of propertyAssignments) {
    if (!assignment.propertyId?.trim()) throw new Error("Owner assignment property is required.");
    basisPoints(assignment.ownershipBasisPoints, "Ownership", 1);
    basisPoints(assignment.managerCommissionBasisPoints, "Manager commission");
    if (assignment.effectiveFrom) dateOnly2(assignment.effectiveFrom, "Assignment start");
    if (assignment.effectiveTo) dateOnly2(assignment.effectiveTo, "Assignment end");
    if (assignment.effectiveFrom && assignment.effectiveTo && assignment.effectiveTo <= assignment.effectiveFrom) {
      throw new Error("An owner assignment ends on or before its start date.");
    }
    const intervals = assignmentsByProperty.get(assignment.propertyId) || [];
    for (const other of intervals) {
      const overlaps = (!assignment.effectiveTo || !other.effectiveFrom || other.effectiveFrom < assignment.effectiveTo) && (!other.effectiveTo || !assignment.effectiveFrom || assignment.effectiveFrom < other.effectiveTo);
      if (overlaps) throw new Error("Two assignments for the same owner and property overlap in time. Correct their dates before generating a statement.");
    }
    assignmentsByProperty.set(assignment.propertyId, [...intervals, assignment]);
  }
  const assignmentFor = (propertyId, date) => (assignmentsByProperty.get(propertyId) || []).find((assignment) => covers(assignment, date)) || null;
  const currency = currencyCode.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Statement currency is invalid.");
  const assertCurrency = (value, label) => {
    if (value && value.toUpperCase() !== currency) throw new Error(`${label} currency does not match the owner statement currency.`);
  };
  const exceptions = [];
  const includedReservations = reservations.filter((reservation) => reservation.checkOutDate >= start && reservation.checkOutDate < end).filter((reservation) => recognizedStayStatuses.includes(reservation.status)).map((reservation) => ({ reservation, ownershipDate: stayOwnershipDate(reservation) })).map((item) => ({ ...item, assignment: assignmentFor(item.reservation.propertyId, item.ownershipDate) })).filter((item) => Boolean(item.assignment)).sort((a, b) => a.reservation.checkOutDate.localeCompare(b.reservation.checkOutDate) || a.reservation.id.localeCompare(b.reservation.id));
  for (const { reservation, assignment } of includedReservations) {
    assertCurrency(reservation.currencyCode, "Reservation");
    if (reservation.checkInDate && assignment.effectiveFrom && assignment.effectiveFrom > reservation.checkInDate) {
      exceptions.push({ type: "stay_spans_assignment_start", reservationId: reservation.id, confirmationCode: reservation.confirmationCode, assignmentId: assignment.id || null });
    }
    if (reservation.servicePropertyId && reservation.servicePropertyId !== reservation.propertyId) {
      exceptions.push({ type: "reaccommodated_to_other_property", reservationId: reservation.id, confirmationCode: reservation.confirmationCode, servicePropertyId: reservation.servicePropertyId });
    }
    if (reservation.allocationBasis === "current_listing") {
      exceptions.push({ type: "no_booking_snapshot_property", reservationId: reservation.id, confirmationCode: reservation.confirmationCode });
    }
  }
  const stayById = /* @__PURE__ */ new Map();
  for (const stay of [...refundStays, ...reservations]) stayById.set(stay.id, stay);
  const recognizedRefunds = refunds.filter((refund) => refund.status === "succeeded").map((refund) => {
    const stay = stayById.get(refund.reservationId);
    if (!stay) throw new Error(`Refund ${refund.id} is missing its stay evidence.`);
    return { refund, stay };
  }).filter(({ refund }) => !refund.recognizedOn || refund.recognizedOn >= start && refund.recognizedOn < end).filter(({ stay }) => recognizedStayStatuses.includes(stay.status)).map((item) => ({ ...item, assignment: assignmentFor(item.stay.propertyId, stayOwnershipDate(item.stay)) })).filter((item) => Boolean(item.assignment)).sort((a, b) => (a.refund.recognizedOn || "").localeCompare(b.refund.recognizedOn || "") || a.refund.id.localeCompare(b.refund.id));
  for (const { refund, stay } of recognizedRefunds) {
    assertCurrency(stay.currencyCode, "Refunded stay");
    assertCurrency(refund.currencyCode, "Refund");
  }
  const paidPayouts = payouts.filter((payout) => payout.ownerId === ownerId && payout.status === "paid" && Boolean(payout.paidAt) && !payout.ownerStatementId).filter((payout) => payout.paidAt.slice(0, 10) >= start && payout.paidAt.slice(0, 10) < end).filter((payout) => !payout.currencyCode || payout.currencyCode.toUpperCase() === currency).sort((a, b) => (a.paidAt || "").localeCompare(b.paidAt || "") || a.id.localeCompare(b.id));
  const orderedAdjustments = adjustments.filter((adjustment) => adjustment.ownerId === ownerId).filter((adjustment) => !adjustment.propertyId || assignmentsByProperty.has(adjustment.propertyId)).sort((a, b) => a.id.localeCompare(b.id));
  const stayAmounts = includedReservations.map(({ reservation, ownershipDate, assignment }) => {
    const revenueCents = stayRevenueCents(reservation);
    const grossCents = prorate(revenueCents, assignment.ownershipBasisPoints);
    return {
      reservation,
      ownershipDate,
      assignment,
      revenueCents,
      grossCents,
      taxCents: prorate(reservation.taxTotalCents, assignment.ownershipBasisPoints),
      commissionCents: prorate(grossCents, assignment.managerCommissionBasisPoints)
    };
  });
  const refundAmounts = recognizedRefunds.map(({ refund, stay, assignment }) => {
    const components = allocateRefundComponents(refund, stay);
    const revenueCents = prorate(components.revenueCents, assignment.ownershipBasisPoints);
    return {
      refund,
      stay,
      assignment,
      components,
      revenueCents,
      taxCents: prorate(components.taxCents, assignment.ownershipBasisPoints),
      commissionReversalCents: prorate(revenueCents, assignment.managerCommissionBasisPoints)
    };
  });
  const grossRevenueCents = stayAmounts.reduce((sum, item) => sum + item.grossCents, 0);
  const taxAmountCents = stayAmounts.reduce((sum, item) => sum + item.taxCents, 0) - refundAmounts.reduce((sum, item) => sum + item.taxCents, 0);
  const refundAmountCents = refundAmounts.reduce((sum, item) => sum + item.revenueCents, 0);
  const expenseAmountCents = orderedAdjustments.filter((item) => item.type === "expense").reduce((sum, item) => sum + cents(item.amountCents, "Expense amount"), 0);
  const adjustmentAmountCents = orderedAdjustments.filter((item) => item.type === "adjustment").reduce((sum, item) => sum + cents(item.amountCents, "Adjustment amount"), 0);
  const managerCommissionCents = stayAmounts.reduce((sum, item) => sum + item.commissionCents, 0) - refundAmounts.reduce((sum, item) => sum + item.commissionReversalCents, 0);
  const ownerEarningsCents = grossRevenueCents - refundAmountCents - expenseAmountCents + adjustmentAmountCents - managerCommissionCents;
  const paidOutCents = paidPayouts.reduce((sum, payout) => sum + cents(payout.amountCents, "Payout amount"), 0);
  const balanceDueCents = ownerEarningsCents - paidOutCents;
  const lines = [
    ...stayAmounts.flatMap((item) => {
      const { reservation, assignment } = item;
      const revenueLine = {
        lineKey: `reservation:${reservation.id}`,
        lineType: "reservation_revenue",
        description: `${reservation.confirmationCode} accommodation revenue`,
        amountCents: item.grossCents,
        reservationId: reservation.id,
        sourceId: reservation.id,
        serviceDate: reservation.checkOutDate,
        metadata: {
          source: reservation.source,
          propertyId: reservation.propertyId,
          allocationBasis: reservation.allocationBasis || "booking_snapshot",
          servicePropertyId: reservation.servicePropertyId || null,
          assignmentId: assignment.id || null,
          ownershipDate: item.ownershipDate,
          ownershipBasisPoints: assignment.ownershipBasisPoints,
          managerCommissionBasisPoints: assignment.managerCommissionBasisPoints,
          stayRevenueCents: item.revenueCents,
          lodgingSubtotalCents: reservation.lodgingSubtotalCents,
          feeTotalCents: reservation.feeTotalCents,
          discountTotalCents: reservation.discountTotalCents,
          concessionCreditCents: reservation.concessionCreditCents ?? 0,
          taxAmountCents: item.taxCents,
          totalAmountCents: reservation.totalAmountCents
        }
      };
      if (!item.commissionCents) return [revenueLine];
      return [revenueLine, {
        lineKey: `manager-commission:reservation:${reservation.id}`,
        lineType: "manager_commission",
        description: `${reservation.confirmationCode} management commission`,
        amountCents: -item.commissionCents,
        reservationId: reservation.id,
        sourceId: reservation.id,
        serviceDate: reservation.checkOutDate,
        metadata: { basisPoints: assignment.managerCommissionBasisPoints, baseCents: item.grossCents, assignmentId: assignment.id || null }
      }];
    }),
    ...refundAmounts.flatMap((item) => {
      const { refund, stay, assignment } = item;
      const refundLine = {
        lineKey: `refund:${refund.id}`,
        lineType: "refund",
        description: `${stay.confirmationCode} refund`,
        amountCents: -item.revenueCents,
        reservationId: stay.id,
        refundId: refund.id,
        sourceId: refund.id,
        serviceDate: refund.recognizedOn,
        metadata: {
          refundAmountCents: refund.amountCents,
          allocation: item.components,
          ownerTaxCents: item.taxCents,
          propertyId: stay.propertyId,
          assignmentId: assignment.id || null,
          ownershipBasisPoints: assignment.ownershipBasisPoints,
          stayCheckOutDate: stay.checkOutDate,
          ...refund.nettedOn ? { correction: { kind: "concession_already_netted", statementNumber: refund.nettedOn } } : {}
        }
      };
      if (!item.commissionReversalCents) return [refundLine];
      return [refundLine, {
        lineKey: `manager-commission:refund:${refund.id}`,
        lineType: "manager_commission",
        description: `${stay.confirmationCode} commission returned on refund`,
        amountCents: item.commissionReversalCents,
        reservationId: stay.id,
        refundId: refund.id,
        sourceId: refund.id,
        serviceDate: refund.recognizedOn,
        metadata: { basisPoints: assignment.managerCommissionBasisPoints, baseCents: item.revenueCents, assignmentId: assignment.id || null }
      }];
    }),
    ...orderedAdjustments.map((adjustment) => ({
      lineKey: `${adjustment.type}:${adjustment.id}`,
      lineType: adjustment.type,
      description: adjustment.description,
      amountCents: adjustment.type === "expense" ? -adjustment.amountCents : adjustment.amountCents,
      sourceId: adjustment.id
    })),
    ...paidPayouts.map((payout) => ({
      lineKey: `payout:${payout.id}`,
      lineType: "payout",
      description: `Owner payout ${payout.id}`,
      amountCents: -payout.amountCents,
      payoutId: payout.id,
      sourceId: payout.id,
      serviceDate: payout.paidAt?.slice(0, 10)
    }))
  ];
  return {
    ownerId,
    propertyIds: [...assignmentsByProperty.keys()].sort(),
    periodStart: start,
    periodEnd: end,
    currencyCode: currency,
    grossRevenueCents,
    taxAmountCents,
    refundAmountCents,
    expenseAmountCents,
    adjustmentAmountCents,
    managerCommissionCents,
    ownerEarningsCents,
    paidOutCents,
    balanceDueCents,
    reservationIds: includedReservations.map(({ reservation }) => reservation.id),
    refundIds: recognizedRefunds.map(({ refund }) => refund.id),
    payoutIds: paidPayouts.map((payout) => payout.id),
    exceptions,
    /**
     * Owner policy this statement's amounts depend on but no owner has approved: allocation
     * across ownership changes or moved stays, and how a stay refund splits across revenue,
     * tax and fees. A statement with any of these stays a provisional draft; it can't be
     * approved or paid until the policy is resolved.
     */
    unresolvedPolicy: [
      ...exceptions.length ? ["mid_stay_ownership_or_property_allocation"] : [],
      ...refundAmounts.some((item) => item.components.kind === "stay_refund") ? ["refund_component_allocation"] : []
    ],
    lines
  };
}

// features/keystone/mutations/ownerStatements.ts
var DAY_MS5 = 864e5;
var MAX_PERIOD_DAYS = 400;
var MAX_STATEMENT_EVENTS = 5e3;
var MAX_OWNER_ASSIGNMENTS = 500;
var liveStatementStatuses = ["draft", "approved", "sent", "paid"];
var issuedStatementStatuses2 = ["approved", "sent", "paid"];
function financeError(code, message) {
  return new import_graphql2.GraphQLError(message, { extensions: { code } });
}
function calendarDate(value, label) {
  const text50 = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text50)) throw financeError("BAD_USER_INPUT", `${label} must be a date in YYYY-MM-DD format.`);
  const [year, month, day] = text50.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw financeError("BAD_USER_INPUT", `${label} is not a real calendar date.`);
  }
  return text50;
}
async function authorizePayouts(context, hostOrganizationId) {
  try {
    await assertHostOrganizationAccess({ context, hostOrganizationId, permission: "canManagePayouts" });
  } catch (error) {
    throw financeError("FORBIDDEN", error instanceof Error ? error.message : "You do not have permission to manage owner payouts.");
  }
}
function isSerializationFailure(error) {
  return error?.code === "P2034" || /could not serialize|deadlock detected|write conflict/i.test(error?.message || "");
}
async function withSerializableRetry2(operation, attempts = 3) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isSerializationFailure(error)) throw error;
      if (attempt >= attempts) throw financeError("CONFLICT", "Owner records changed while the statement was being generated. Try again.");
      await new Promise((resolve) => setTimeout(resolve, 25 * attempt));
    }
  }
}
function statementNumber(ownerNumber, periodEnd, key, revision) {
  const base = `OST-${periodEnd.replaceAll("-", "")}-${ownerNumber.replace(/[^A-Z0-9]/gi, "").toUpperCase()}-${key.slice(-6).toUpperCase()}`;
  return revision > 1 ? `${base}-R${revision}` : base;
}
function record3(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function concessionCreditCents(refund) {
  const data = record3(refund.data);
  const adjustment = record3(data.totalAdjustment);
  if (!Object.keys(adjustment).length) return 0;
  const opened = Number(adjustment.previousTotalCents) - Number(adjustment.adjustedTotalCents);
  const reversed = (Array.isArray(data.creditReversals) ? data.creditReversals : []).reduce((sum, reversal) => sum + Number(reversal?.reversedCents || 0), 0);
  const credit = opened - reversed;
  if (!Number.isSafeInteger(credit) || credit < 0) {
    throw financeError("CONFLICT", `Refund ${refund.refundNumber || refund.id} has concession evidence that doesn't reconcile. Resolve it before generating this statement.`);
  }
  return credit;
}
function refundKind(refund) {
  if (Object.keys(record3(record3(refund.data).totalAdjustment)).length) return "concession";
  if (refund.reservationAmendmentId || refund.reason === "stay_amendment") return "amendment_settlement";
  if (refund.reason === "overpayment") return "overpayment";
  return "stay_refund";
}
function allocationFor(row) {
  if (row.bookedPropertyId) return { propertyId: row.bookedPropertyId, basis: "booking_snapshot" };
  if (row.listingPropertyId) return { propertyId: row.listingPropertyId, basis: "current_listing" };
  return null;
}
async function generateOwnerStatement(_root, args, context) {
  const periodStart = calendarDate(args.periodStart, "Period start");
  const periodEnd = calendarDate(args.periodEnd, "Period end");
  if (periodEnd <= periodStart) throw financeError("BAD_USER_INPUT", "Period end must be after the period start.");
  if ((Date.parse(`${periodEnd}T00:00:00Z`) - Date.parse(`${periodStart}T00:00:00Z`)) / DAY_MS5 > MAX_PERIOD_DAYS) {
    throw financeError("BAD_USER_INPUT", `Statement periods are limited to ${MAX_PERIOD_DAYS} days.`);
  }
  const currencyCode = String(args.currencyCode || "USD").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currencyCode)) throw financeError("BAD_USER_INPUT", "Use a three-letter currency code such as USD.");
  const owner = await context.query.PropertyOwner.findOne({
    where: { id: args.ownerId },
    query: "id ownerNumber hostOrganization { id }"
  });
  if (!owner?.hostOrganization?.id) throw financeError("NOT_FOUND", "Property owner not found.");
  const hostOrganizationId = owner.hostOrganization.id;
  await authorizePayouts(context, hostOrganizationId);
  return withSerializableRetry2(() => context.prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `owner-statement-scope:${owner.id}`);
    const samePeriod = await tx.ownerStatement.findMany({
      where: { ownerId: owner.id, periodStart, periodEnd, currencyCode },
      orderBy: [{ generatedAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      select: { id: true, status: true, statementNumber: true }
    });
    const live = samePeriod.find((statement) => statement.status !== "voided");
    if (live) return tx.ownerStatement.findUnique({ where: { id: live.id } });
    const revision = samePeriod.length + 1;
    const supersedes = samePeriod.length ? samePeriod[samePeriod.length - 1] : null;
    const idempotencyKey = ownerStatementIdempotencyKey({ ownerId: owner.id, periodStart, periodEnd, currencyCode, revision });
    const assignments = await tx.propertyOwnerAssignment.findMany({
      where: { ownerId: owner.id, hostOrganizationId },
      select: { id: true, propertyId: true, status: true, ownershipBasisPoints: true, managerCommissionBasisPoints: true, effectiveFrom: true, effectiveTo: true },
      orderBy: [{ effectiveFrom: "asc" }, { id: "asc" }],
      take: MAX_OWNER_ASSIGNMENTS + 1
    });
    if (!assignments.length) throw financeError("BAD_USER_INPUT", "This owner has no property assignments.");
    if (assignments.length > MAX_OWNER_ASSIGNMENTS) throw financeError("BAD_USER_INPUT", `This owner has more than ${MAX_OWNER_ASSIGNMENTS} assignments; statements can't be generated safely.`);
    for (const assignment of assignments) {
      if (!assignment.propertyId) throw financeError("BAD_USER_INPUT", "An owner assignment has no property. Fix it before generating statements.");
      if (assignment.status === "ended" && !assignment.effectiveTo) {
        throw financeError("BAD_USER_INPUT", "An ended owner assignment has no end date. Set its end date before generating statements.");
      }
    }
    const ownerPropertyIds = [...new Set(assignments.map((assignment) => assignment.propertyId))];
    const properties = await tx.property.findMany({ where: { id: { in: ownerPropertyIds } }, select: { id: true, name: true, timezone: true } });
    const timeZoneByProperty = new Map(properties.map((property) => [property.id, property.timezone]));
    const nameByProperty = new Map(properties.map((property) => [property.id, property.name]));
    const localToday = ownerPropertyIds.map((id3) => zonedTodayIso(timeZoneByProperty.get(id3))).sort()[0];
    if (periodEnd > localToday) throw financeError("BAD_USER_INPUT", `Statements cover finished periods. Choose a period ending on or before ${localToday}.`);
    const stayRows = await tx.$queryRaw`
      SELECT r."id" AS "id",
        r."bookingSnapshot" #>> '{listing,property,id}' AS "bookedPropertyId",
        l."property" AS "listingPropertyId",
        u."property" AS "unitPropertyId"
      FROM "Reservation" r
      LEFT JOIN "Listing" l ON l."id" = r."listing"
      LEFT JOIN "AccommodationUnit" u ON u."id" = r."accommodationUnit"
      WHERE r."hostOrganization" = ${hostOrganizationId}
        AND r."checkOutDate" >= ${periodStart} AND r."checkOutDate" < ${periodEnd}
      ORDER BY r."id"
      LIMIT ${MAX_STATEMENT_EVENTS + 1}::int`;
    if (stayRows.length > MAX_STATEMENT_EVENTS) throw financeError("BAD_USER_INPUT", `More than ${MAX_STATEMENT_EVENTS} stays end in this period. Generate shorter statements.`);
    const windowStart = new Date(Date.parse(`${periodStart}T00:00:00Z`) - DAY_MS5).toISOString();
    const windowEnd = new Date(Date.parse(`${periodEnd}T00:00:00Z`) + DAY_MS5).toISOString();
    const refundRows = await tx.$queryRaw`
      SELECT f."id" AS "refundId", r."id" AS "id",
        r."bookingSnapshot" #>> '{listing,property,id}' AS "bookedPropertyId",
        l."property" AS "listingPropertyId",
        u."property" AS "unitPropertyId"
      FROM "Refund" f
      JOIN "Reservation" r ON r."id" = f."reservation"
      LEFT JOIN "Listing" l ON l."id" = r."listing"
      LEFT JOIN "AccommodationUnit" u ON u."id" = r."accommodationUnit"
      WHERE f."hostOrganization" = ${hostOrganizationId}
        AND f."status" = 'succeeded'
        AND COALESCE(f."processedAt", f."createdAt") >= ${windowStart}::timestamp
        AND COALESCE(f."processedAt", f."createdAt") < ${windowEnd}::timestamp
      ORDER BY f."id"
      LIMIT ${MAX_STATEMENT_EVENTS + 1}::int`;
    if (refundRows.length > MAX_STATEMENT_EVENTS) throw financeError("BAD_USER_INPUT", `More than ${MAX_STATEMENT_EVENTS} refunds fall in this period. Generate shorter statements.`);
    const ownerProperties = new Set(ownerPropertyIds);
    const allocations = /* @__PURE__ */ new Map();
    for (const row of [...stayRows, ...refundRows]) {
      const allocation = allocationFor(row);
      if (allocation && ownerProperties.has(allocation.propertyId)) allocations.set(row.id, { ...row, ...allocation });
    }
    const periodStayIds = stayRows.map((row) => row.id).filter((id3) => allocations.has(id3));
    const ownerRefundRows = refundRows.filter((row) => allocations.has(row.id));
    const stayIds = [.../* @__PURE__ */ new Set([...periodStayIds, ...ownerRefundRows.map((row) => row.id)])];
    const [stays, stayRefunds] = stayIds.length ? await Promise.all([
      tx.reservation.findMany({
        where: { id: { in: stayIds }, hostOrganizationId },
        select: {
          id: true,
          confirmationCode: true,
          status: true,
          source: true,
          testMode: true,
          fixtureOrigin: true,
          checkInDate: true,
          checkOutDate: true,
          currencyCode: true,
          lodgingSubtotalCents: true,
          feeTotalCents: true,
          taxTotalCents: true,
          discountTotalCents: true,
          totalAmountCents: true
        }
      }),
      tx.refund.findMany({
        where: { reservationId: { in: stayIds }, hostOrganizationId },
        select: { id: true, refundNumber: true, reservationId: true, reservationAmendmentId: true, status: true, reason: true, amountCents: true, currencyCode: true, processedAt: true, createdAt: true, data: true, payment: { select: { provider: true } } }
      })
    ]) : [[], []];
    const creditsByStay = /* @__PURE__ */ new Map();
    for (const refund of stayRefunds) {
      if (refund.payment?.provider === "pp_stripe_stripe") continue;
      creditsByStay.set(refund.reservationId, (creditsByStay.get(refund.reservationId) || 0) + concessionCreditCents(refund));
    }
    const excluded = { otherCurrencyStays: 0, otherCurrencyRefunds: 0, otherCurrencyPayouts: 0, testModeStays: 0, sampleStays: 0, testTenderRefunds: 0, unrecognizedStatusStays: [], refundsOnUnrecognizedStays: 0, alreadyRecognizedStays: 0, alreadyRecognizedRefunds: 0, alreadyRecognizedPayouts: 0 };
    const stayById = /* @__PURE__ */ new Map();
    for (const stay of stays) {
      const allocation = allocations.get(stay.id);
      stayById.set(stay.id, {
        id: stay.id,
        confirmationCode: stay.confirmationCode,
        propertyId: allocation.propertyId,
        status: stay.status || "",
        source: stay.source || "direct",
        testMode: stay.testMode === true,
        sample: Boolean(stay.fixtureOrigin),
        checkInDate: stay.checkInDate,
        checkOutDate: stay.checkOutDate,
        currencyCode: (stay.currencyCode || "").toUpperCase(),
        lodgingSubtotalCents: stay.lodgingSubtotalCents ?? 0,
        feeTotalCents: stay.feeTotalCents ?? 0,
        taxTotalCents: stay.taxTotalCents ?? 0,
        discountTotalCents: stay.discountTotalCents ?? 0,
        totalAmountCents: stay.totalAmountCents ?? 0,
        concessionCreditCents: creditsByStay.get(stay.id) || 0,
        allocationBasis: allocation.basis,
        servicePropertyId: allocation.unitPropertyId && allocation.unitPropertyId !== allocation.propertyId ? allocation.unitPropertyId : null
      });
    }
    const eligibleStays = periodStayIds.map((id3) => stayById.get(id3)).filter(Boolean).filter((stay) => {
      if (stay.testMode) {
        excluded.testModeStays += 1;
        return false;
      }
      if (stay.sample) {
        excluded.sampleStays += 1;
        return false;
      }
      if (stay.currencyCode !== currencyCode) {
        excluded.otherCurrencyStays += 1;
        return false;
      }
      if (!recognizedStayStatuses.includes(stay.status)) {
        if (!["cancelled", "no_show"].includes(stay.status) && excluded.unrecognizedStatusStays.length < 20) excluded.unrecognizedStatusStays.push(stay.confirmationCode);
        return false;
      }
      return true;
    });
    const ownerRefundIds = new Set(ownerRefundRows.map((row) => row.refundId));
    const eligibleRefunds = stayRefunds.filter((refund) => ownerRefundIds.has(refund.id)).flatMap((refund) => {
      const stay = stayById.get(refund.reservationId);
      if (!stay || refund.status !== "succeeded") return [];
      const recognizedOn = zonedTodayIso(timeZoneByProperty.get(stay.propertyId), new Date(refund.processedAt || refund.createdAt));
      if (recognizedOn < periodStart || recognizedOn >= periodEnd) return [];
      if (stay.testMode || stay.sample) return [];
      if (refund.payment?.provider === "pp_stripe_stripe") {
        excluded.testTenderRefunds += 1;
        return [];
      }
      if (stay.currencyCode !== currencyCode || (refund.currencyCode || "").toUpperCase() !== currencyCode) {
        excluded.otherCurrencyRefunds += 1;
        return [];
      }
      if (!recognizedStayStatuses.includes(stay.status)) {
        excluded.refundsOnUnrecognizedStays += 1;
        return [];
      }
      return [{ id: refund.id, reservationId: refund.reservationId, status: refund.status, amountCents: refund.amountCents, currencyCode: refund.currencyCode, recognizedOn, kind: refundKind(refund) }];
    });
    const payoutRows = await tx.payout.findMany({
      where: {
        hostOrganizationId,
        propertyOwnerId: owner.id,
        status: "paid",
        ownerStatementId: null,
        paidAt: { gte: /* @__PURE__ */ new Date(`${periodStart}T00:00:00.000Z`), lt: /* @__PURE__ */ new Date(`${periodEnd}T00:00:00.000Z`) }
      },
      select: { id: true, status: true, netAmountCents: true, paidAt: true, currencyCode: true, ownerStatementId: true },
      orderBy: [{ paidAt: "asc" }, { id: "asc" }],
      take: MAX_STATEMENT_EVENTS + 1
    });
    if (payoutRows.length > MAX_STATEMENT_EVENTS) throw financeError("BAD_USER_INPUT", `More than ${MAX_STATEMENT_EVENTS} owner payouts fall in this period. Generate shorter statements.`);
    const eligiblePayouts = payoutRows.filter((payout) => {
      if ((payout.currencyCode || "").toUpperCase() === currencyCode) return true;
      excluded.otherCurrencyPayouts += 1;
      return false;
    });
    const prior = await tx.ownerStatementLine.findMany({
      where: {
        ownerId: owner.id,
        statement: { status: { in: liveStatementStatuses } },
        OR: [
          { lineType: "reservation_revenue", reservationId: { in: eligibleStays.map((stay) => stay.id) } },
          { lineType: "refund", refundId: { in: eligibleRefunds.map((refund) => refund.id) } },
          { lineType: "payout", payoutId: { in: eligiblePayouts.map((payout) => payout.id) } }
        ]
      },
      select: { lineType: true, reservationId: true, refundId: true, payoutId: true }
    });
    const recognizedStays = new Set(prior.filter((line) => line.lineType === "reservation_revenue").map((line) => line.reservationId));
    const recognizedRefunds = new Set(prior.filter((line) => line.lineType === "refund").map((line) => line.refundId));
    const recognizedPayouts = new Set(prior.filter((line) => line.lineType === "payout").map((line) => line.payoutId));
    const newStays = eligibleStays.filter((stay) => !recognizedStays.has(stay.id));
    const unrecognizedRefunds = eligibleRefunds.filter((refund) => !recognizedRefunds.has(refund.id));
    const concessionStays = [...new Set(unrecognizedRefunds.filter((refund) => refund.kind === "concession").map((refund) => refund.reservationId))];
    const legacyRevenueLines = concessionStays.length ? await tx.ownerStatementLine.findMany({
      where: { lineType: "reservation_revenue", reservationId: { in: concessionStays }, statement: { status: { in: issuedStatementStatuses2 } } },
      select: { reservationId: true, metadata: true, statement: { select: { statementNumber: true } } }
    }) : [];
    const nettedOn = /* @__PURE__ */ new Map();
    for (const line of legacyRevenueLines) {
      if (record3(line.metadata).concessionCreditCents === void 0) nettedOn.set(line.reservationId, line.statement?.statementNumber || "an earlier statement");
    }
    const newRefunds = unrecognizedRefunds.map((refund) => refund.kind === "concession" && nettedOn.has(refund.reservationId) ? { ...refund, kind: "concession_already_netted", nettedOn: nettedOn.get(refund.reservationId) } : refund);
    const newPayouts = eligiblePayouts.filter((payout) => !recognizedPayouts.has(payout.id));
    excluded.alreadyRecognizedStays = eligibleStays.length - newStays.length;
    excluded.alreadyRecognizedRefunds = eligibleRefunds.length - newRefunds.length;
    excluded.alreadyRecognizedPayouts = eligiblePayouts.length - newPayouts.length;
    const coversPeriod = assignments.some((assignment) => (!assignment.effectiveFrom || assignment.effectiveFrom < periodEnd) && (!assignment.effectiveTo || assignment.effectiveTo > periodStart));
    if (!coversPeriod && !newStays.length && !newRefunds.length && !newPayouts.length) {
      throw financeError("BAD_USER_INPUT", "No owner assignment or owner activity falls in this period.");
    }
    const calculation = (() => {
      try {
        return buildOwnerStatement({
          ownerId: owner.id,
          propertyAssignments: assignments.map((assignment) => ({
            id: assignment.id,
            propertyId: assignment.propertyId,
            ownershipBasisPoints: assignment.ownershipBasisPoints,
            managerCommissionBasisPoints: assignment.managerCommissionBasisPoints,
            effectiveFrom: assignment.effectiveFrom || null,
            effectiveTo: assignment.effectiveTo || null
          })),
          periodStart,
          periodEnd,
          currencyCode,
          reservations: newStays,
          refunds: newRefunds,
          refundStays: newRefunds.map((refund) => stayById.get(refund.reservationId)),
          payouts: newPayouts.map((payout) => ({ id: payout.id, ownerId: owner.id, status: payout.status, amountCents: payout.netAmountCents ?? 0, paidAt: payout.paidAt?.toISOString(), currencyCode: payout.currencyCode, ownerStatementId: payout.ownerStatementId })),
          adjustments: []
        });
      } catch (error) {
        throw financeError("BAD_USER_INPUT", error instanceof Error ? error.message : "The statement could not be calculated.");
      }
    })();
    const id2 = import_node_crypto17.default.randomUUID();
    const number = statementNumber(owner.ownerNumber, periodEnd, idempotencyKey, revision);
    const generatedAt = /* @__PURE__ */ new Date();
    const created = await tx.ownerStatement.create({
      data: {
        id: id2,
        hostOrganizationId,
        ownerId: owner.id,
        statementNumber: number,
        idempotencyKey,
        status: "draft",
        periodStart,
        periodEnd,
        currencyCode,
        grossRevenueCents: calculation.grossRevenueCents,
        taxAmountCents: calculation.taxAmountCents,
        refundAmountCents: calculation.refundAmountCents,
        expenseAmountCents: calculation.expenseAmountCents,
        adjustmentAmountCents: calculation.adjustmentAmountCents,
        managerCommissionCents: calculation.managerCommissionCents,
        ownerEarningsCents: calculation.ownerEarningsCents,
        paidOutCents: calculation.paidOutCents,
        balanceDueCents: calculation.balanceDueCents,
        generatedAt,
        statementSnapshot: {
          version: 2,
          generatedAt: generatedAt.toISOString(),
          revision,
          supersedes: supersedes ? { id: supersedes.id, statementNumber: supersedes.statementNumber } : null,
          recognition: {
            stays: "check_out_in_period; ownership by assignment effective on the last night; booked property from the booking snapshot",
            refunds: "completed refunds dated in the period (property-local), each recognized once",
            refundAllocation: "concession credits are revenue; amendment and overpayment settlements are owner-neutral; other refunds are split across revenue and tax in proportion to the stay charges",
            payouts: "paid owner payouts not linked to another statement, dated in the period (UTC)",
            pendingOwnerPolicy: ["refund_component_allocation", "mid_stay_ownership_changes", "inclusive_tax_share", "retained_cancellation_revenue"]
          },
          assignments: assignments.map((assignment) => ({
            id: assignment.id,
            propertyId: assignment.propertyId,
            propertyName: nameByProperty.get(assignment.propertyId) || null,
            status: assignment.status,
            ownershipBasisPoints: assignment.ownershipBasisPoints,
            managerCommissionBasisPoints: assignment.managerCommissionBasisPoints,
            effectiveFrom: assignment.effectiveFrom,
            effectiveTo: assignment.effectiveTo || null
          })),
          excluded,
          calculation
        }
      }
    });
    if (calculation.lines.length) {
      await tx.ownerStatementLine.createMany({
        data: calculation.lines.map((line) => ({
          id: import_node_crypto17.default.randomUUID(),
          hostOrganizationId,
          statementId: id2,
          ownerId: owner.id,
          reservationId: line.reservationId || null,
          refundId: line.refundId || null,
          payoutId: line.payoutId || null,
          lineKey: `${id2}:${line.lineKey}`,
          lineType: line.lineType,
          description: line.description,
          serviceDate: line.serviceDate || "",
          amountCents: line.amountCents,
          sourceId: line.sourceId || "",
          metadata: line.metadata || {}
        }))
      });
    }
    return created;
  }, { maxWait: 5e3, timeout: 3e4, isolationLevel: "Serializable" }));
}
var statementTransitions = {
  approve: { from: ["draft"], to: "approved", verb: "approved" },
  send: { from: ["approved"], to: "sent", verb: "marked sent" },
  pay: { from: ["sent"], to: "paid", verb: "recorded as paid" },
  void: { from: ["draft", "approved"], to: "voided", verb: "voided" }
};
function formatCents(cents3, currencyCode) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format(cents3 / 100);
  } catch {
    return `${cents3} ${currencyCode} cents`;
  }
}
var transferMethods = ["bank_transfer", "check", "cash", "other"];
function transferEvidence(value) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const text50 = (key, label, max) => {
    const entry = typeof input[key] === "string" ? input[key].trim() : "";
    if (!entry) throw financeError("BAD_USER_INPUT", `${label} is required to record a paid statement.`);
    if (entry.length > max) throw financeError("BAD_USER_INPUT", `${label} must be ${max} characters or fewer.`);
    return entry;
  };
  const amountCents = Number(input.amountCents);
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw financeError("BAD_USER_INPUT", "Enter the amount actually transferred.");
  const paidOn = text50("paidOn", "Transfer date", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn) || Number.isNaN(Date.parse(`${paidOn}T00:00:00Z`))) throw financeError("BAD_USER_INPUT", "Transfer date must be a valid date.");
  const method = String(input.method || "");
  if (!transferMethods.includes(method)) throw financeError("BAD_USER_INPUT", "Choose how the transfer was made.");
  if (input.attested !== true) throw financeError("BAD_USER_INPUT", "Confirm that this transfer was actually made to the owner.");
  return {
    amountCents,
    currencyCode: text50("currencyCode", "Transfer currency", 3).toUpperCase(),
    paidOn,
    payee: text50("payee", "Payee", 200),
    method,
    reference: text50("reference", "Transfer reference", 120),
    custody: text50("custody", "Where the proof is kept", 300)
  };
}
async function transitionOwnerStatement(_root, args, context) {
  const statement = await context.query.OwnerStatement.findOne({
    where: { id: args.statementId },
    query: "id status owner { id } hostOrganization { id }"
  });
  if (!statement?.hostOrganization?.id) throw financeError("NOT_FOUND", "Owner statement not found.");
  await authorizePayouts(context, statement.hostOrganization.id);
  const transition = statementTransitions[args.transition];
  if (!transition) throw financeError("BAD_USER_INPUT", "Unsupported owner statement transition.");
  const reference = args.reference?.trim() || "";
  if (reference.length > 500) throw financeError("BAD_USER_INPUT", "Statement reference is too long.");
  const operationKey = args.operationKey?.trim() || "";
  if (operationKey.length > 200) throw financeError("BAD_USER_INPUT", "Operation key is too long.");
  const actorUserId = context.session?.itemId || null;
  return context.prisma.$transaction(async (tx) => {
    if (statement.owner?.id) await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `owner-statement-scope:${statement.owner.id}`);
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `owner-statement:${statement.id}`);
    const locked = await tx.ownerStatement.findUnique({ where: { id: statement.id } });
    if (!locked) throw financeError("NOT_FOUND", "Owner statement not found.");
    if (args.transition === "pay" && operationKey && locked.status === "paid") {
      const prior = await tx.payout.findFirst({ where: { ownerStatementId: locked.id, status: "paid" }, orderBy: [{ createdAt: "desc" }] });
      const priorData = prior?.data && typeof prior.data === "object" ? prior.data : {};
      if (priorData.operationKey === operationKey) {
        const evidence = transferEvidence(args.transfer);
        if (priorData.evidenceFingerprint !== import_node_crypto17.default.createHash("sha256").update(JSON.stringify(evidence)).digest("hex")) {
          throw financeError("CONFLICT", "This payment was already recorded with different transfer evidence.");
        }
        return locked;
      }
    }
    if (!transition.from.includes(locked.status)) {
      throw financeError("CONFLICT", `This statement is ${locked.status} and can\u2019t be ${transition.verb}. Refresh to see its current state.`);
    }
    if (args.transition !== "void") {
      const sample = await tx.ownerStatementLine.findFirst({ where: { statementId: locked.id, reservation: { fixtureOrigin: { not: null } } }, select: { id: true } });
      if (sample) throw financeError("CONFLICT", "This statement includes setup sample stays, so it isn\u2019t real owner money. Void it; real statements leave samples out.");
    }
    const now = /* @__PURE__ */ new Date();
    const data = { status: transition.to };
    let payout = null;
    if (args.transition === "approve") {
      const snapshot = locked.statementSnapshot && typeof locked.statementSnapshot === "object" ? locked.statementSnapshot : {};
      const unresolved = Array.isArray(snapshot.calculation?.unresolvedPolicy) ? snapshot.calculation.unresolvedPolicy : [];
      if ((snapshot.calculation?.exceptions || []).length && !unresolved.length) unresolved.push("mid_stay_ownership_or_property_allocation");
      if (unresolved.length) {
        throw financeError("CONFLICT", `This draft depends on owner policy that isn\u2019t set (${unresolved.join(", ").replaceAll("_", " ")}). It stays a provisional draft and can\u2019t be approved yet.`);
      }
      await assertPropertySharesWithinWhole(tx, locked.id);
      const sources = await tx.ownerStatementLine.findMany({
        where: { statementId: locked.id, lineType: { in: ["reservation_revenue", "refund", "payout"] } },
        select: { lineType: true, reservationId: true, refundId: true, payoutId: true }
      });
      const idsOf = (lineType, field) => sources.filter((line) => line.lineType === lineType && line[field]).map((line) => line[field]);
      const duplicate = sources.length ? await tx.ownerStatementLine.findFirst({
        where: {
          ownerId: locked.ownerId,
          statementId: { not: locked.id },
          statement: { status: { in: issuedStatementStatuses2 } },
          OR: [
            { lineType: "reservation_revenue", reservationId: { in: idsOf("reservation_revenue", "reservationId") } },
            { lineType: "refund", refundId: { in: idsOf("refund", "refundId") } },
            { lineType: "payout", payoutId: { in: idsOf("payout", "payoutId") } }
          ]
        },
        select: { statement: { select: { statementNumber: true } } }
      }) : null;
      if (duplicate) {
        throw financeError("CONFLICT", `Some earnings on this statement are already on ${duplicate.statement?.statementNumber || "another issued statement"}. Void this draft and generate a new one.`);
      }
      data.approvedAt = now;
      data.statementSnapshot = { ...locked.statementSnapshot, approvedAt: now.toISOString() };
    }
    if (args.transition === "send") data.sentAt = now;
    if (args.transition === "pay") {
      const balance = locked.balanceDueCents ?? 0;
      if (balance < 0) {
        throw financeError("CONFLICT", `This statement shows the owner owes ${formatCents(-balance, locked.currencyCode)}. Owner collections aren\u2019t recorded here.`);
      }
      if (balance > 0) {
        const evidence = transferEvidence(args.transfer);
        if (evidence.amountCents !== balance) throw financeError("CONFLICT", `The transfer must be exactly the ${formatCents(balance, locked.currencyCode)} still due on this statement.`);
        if (evidence.currencyCode !== String(locked.currencyCode || "").toUpperCase()) throw financeError("CONFLICT", `The transfer must be in ${locked.currencyCode}, this statement\u2019s currency.`);
        const today = now.toISOString().slice(0, 10);
        if (evidence.paidOn > today) throw financeError("BAD_USER_INPUT", "A transfer can\u2019t be dated in the future.");
        if (evidence.paidOn < locked.periodStart) throw financeError("BAD_USER_INPUT", "The transfer date is before this statement\u2019s period.");
        await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `owner-transfer-reference:${locked.hostOrganizationId}`);
        const reused = await tx.payout.findFirst({
          where: { hostOrganizationId: locked.hostOrganizationId, status: "paid", data: { path: ["transfer", "reference"], equals: evidence.reference } },
          select: { payoutNumber: true }
        });
        if (reused) throw financeError("CONFLICT", `Transfer reference ${evidence.reference} already settles ${reused.payoutNumber}. Each transfer settles one statement.`);
        const evidenceFingerprint = import_node_crypto17.default.createHash("sha256").update(JSON.stringify(evidence)).digest("hex");
        payout = await tx.payout.create({
          data: {
            id: import_node_crypto17.default.randomUUID(),
            hostOrganizationId: locked.hostOrganizationId,
            propertyOwnerId: locked.ownerId,
            ownerStatementId: locked.id,
            payoutNumber: `PO-${locked.statementNumber}`,
            status: "paid",
            currencyCode: locked.currencyCode,
            grossAmountCents: balance,
            platformFeeCents: 0,
            managerFeeCents: 0,
            refundAmountCents: 0,
            netAmountCents: balance,
            providerPayoutId: null,
            scheduledAt: now,
            paidAt: /* @__PURE__ */ new Date(`${evidence.paidOn}T12:00:00.000Z`),
            data: {
              kind: "manual_transfer_attestation",
              basis: "owner_statement_balance",
              transfer: evidence,
              statementId: locked.id,
              statementNumber: locked.statementNumber,
              attestedByUserId: actorUserId,
              attestedAt: now.toISOString(),
              providerVerified: false,
              evidenceFingerprint,
              ...operationKey ? { operationKey } : {}
            }
          }
        });
      }
      data.paidAt = payout?.paidAt || now;
      data.paidReference = payout ? payout.data.transfer.reference : reference;
      data.paidOutCents = (locked.paidOutCents ?? 0) + balance;
      data.balanceDueCents = 0;
    }
    const updated = await tx.ownerStatement.update({ where: { id: locked.id }, data });
    return updated;
  }, { maxWait: 5e3, timeout: 1e4, isolationLevel: "ReadCommitted" });
}
async function assertPropertySharesWithinWhole(tx, statementId) {
  const lines = await tx.ownerStatementLine.findMany({
    where: { statementId, lineType: "reservation_revenue" },
    select: { serviceDate: true, metadata: true }
  });
  const datesByProperty = /* @__PURE__ */ new Map();
  for (const line of lines) {
    const meta = line.metadata && typeof line.metadata === "object" ? line.metadata : {};
    const propertyId = typeof meta.propertyId === "string" ? meta.propertyId : null;
    const date = typeof meta.ownershipDate === "string" ? meta.ownershipDate : line.serviceDate;
    if (!propertyId || !date) continue;
    datesByProperty.set(propertyId, (datesByProperty.get(propertyId) || /* @__PURE__ */ new Set()).add(date));
  }
  for (const propertyId of [...datesByProperty.keys()].sort()) {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `owner-property-shares:${propertyId}`);
    const assignments = await tx.propertyOwnerAssignment.findMany({
      where: { propertyId, status: { not: "ended" } },
      select: { ownerId: true, ownershipBasisPoints: true, effectiveFrom: true, effectiveTo: true, status: true }
    });
    for (const date of datesByProperty.get(propertyId)) {
      const total = assignments.filter((assignment) => (!assignment.effectiveFrom || assignment.effectiveFrom <= date) && (!assignment.effectiveTo || date < assignment.effectiveTo)).reduce((sum, assignment) => sum + (assignment.ownershipBasisPoints || 0), 0);
      if (total > 1e4) {
        throw financeError("CONFLICT", `Owner shares for a property on this statement add up to ${total / 100}% on ${date}. Correct the owner assignments so they total at most 100% before approving.`);
      }
    }
  }
}
async function ownerFinanceSummary(_root, _args, context) {
  const scope = hostChildScope(context, "canReadPayouts");
  if (!scope) return { byCurrency: [], statementCount: 0, payoutCount: 0, payoutExceptionCount: 0, ownerCount: 0 };
  const [groups, statementCount, payoutCount, payoutExceptionCount, ownerCount] = await Promise.all([
    context.prisma.ownerStatement.groupBy({
      by: ["currencyCode", "status"],
      where: scope,
      _sum: { ownerEarningsCents: true, balanceDueCents: true },
      _count: { _all: true }
    }),
    context.prisma.ownerStatement.count({ where: scope }),
    context.prisma.payout.count({ where: scope }),
    context.prisma.payout.count({
      where: {
        AND: [scope, {
          OR: [
            { status: { in: ["failed", "reversed"] } },
            { status: "paid", ownerStatementId: null, OR: [{ providerPayoutId: null }, { providerPayoutId: "" }] }
          ]
        }]
      }
    }),
    context.prisma.propertyOwner.count({ where: scope })
  ]);
  const totals = /* @__PURE__ */ new Map();
  for (const group of groups) {
    const currencyCode = (group.currencyCode || "").toUpperCase();
    const entry = totals.get(currencyCode) || { currencyCode, issuedEarningsCents: 0, balanceDueCents: 0, issuedCount: 0, dueCount: 0, draftCount: 0 };
    const count = group._count?._all || 0;
    if (issuedStatementStatuses2.includes(group.status)) {
      entry.issuedEarningsCents += group._sum?.ownerEarningsCents || 0;
      entry.issuedCount += count;
    }
    if (["approved", "sent"].includes(group.status)) {
      entry.balanceDueCents += group._sum?.balanceDueCents || 0;
      entry.dueCount += count;
    }
    if (group.status === "draft") entry.draftCount += count;
    totals.set(currencyCode, entry);
  }
  return {
    byCurrency: [...totals.values()].sort((a, b) => a.currencyCode.localeCompare(b.currencyCode)),
    statementCount,
    payoutCount,
    payoutExceptionCount,
    ownerCount
  };
}
var ownerFinanceTypeDefs = String.raw`
  type Query {
    """Per-currency owner statement totals and payout counts for the owners the operator can read."""
    ownerFinanceSummary: JSON!
  }
`;
var ownerFinanceResolvers = {
  Query: {
    ownerFinanceSummary
  }
};

// features/keystone/mutations/propertyTasks.ts
var import_node_crypto18 = __toESM(require("node:crypto"));
async function createPropertyTask(_root, args, context) {
  const property = await context.query.Property.findOne({ where: { id: args.propertyId }, query: "id status timezone hostOrganization { id }" });
  if (!property?.hostOrganization?.id) throw new Error(propertyTaskMessages.propertyNotFound);
  await assertHostOrganizationAccess({ context, hostOrganizationId: property.hostOrganization.id, permission: "canManageProperties" });
  if (property.status === "archived") throw new Error(propertyTaskMessages.archivedProperty);
  const title = args.title.trim();
  if (!title || title.length > 240) throw new Error(propertyTaskMessages.title);
  const notes = args.notes?.trim() || "";
  if (notes.length > 4e3) throw new Error(propertyTaskMessages.notes);
  if (!isPropertyTaskType(args.taskType)) throw new Error(propertyTaskMessages.taskType);
  const priority = args.priority || "normal";
  if (!isPropertyTaskPriority(priority)) throw new Error(propertyTaskMessages.priority);
  const dueAt = resolvePropertyTaskDueAt(args.dueAt, property.timezone);
  const id2 = import_node_crypto18.default.randomUUID();
  return context.prisma.$transaction(async (tx) => {
    let listingId = args.listingId || null;
    if (listingId) {
      const listing = await tx.listing.findFirst({ where: { id: listingId, propertyId: property.id, hostOrganizationId: property.hostOrganization.id }, select: { id: true } });
      if (!listing) throw new Error(propertyTaskMessages.listing);
    }
    if (args.reservationId) {
      const reservation = await tx.reservation.findFirst({ where: { id: args.reservationId, hostOrganizationId: property.hostOrganization.id }, select: { id: true, listingId: true, listing: { select: { propertyId: true } } } });
      if (!reservation || reservation.listing?.propertyId !== property.id) throw new Error(propertyTaskMessages.reservation);
      if (listingId && reservation.listingId !== listingId) throw new Error(propertyTaskMessages.reservationListing);
      listingId = reservation.listingId;
    }
    if (args.assigneeId && !await isActiveTaskAssignee(tx, property.hostOrganization.id, args.assigneeId)) {
      throw new Error(propertyTaskMessages.assignee);
    }
    const created = await tx.propertyTask.create({
      data: {
        id: id2,
        hostOrganizationId: property.hostOrganization.id,
        propertyId: property.id,
        listingId,
        reservationId: args.reservationId || null,
        assigneeId: args.assigneeId || null,
        idempotencyKey: `manual-property-task:${id2}`,
        source: "manual",
        title,
        taskType: args.taskType,
        status: args.assigneeId ? "assigned" : "queued",
        priority,
        dueAt,
        claimedAt: args.assigneeId ? /* @__PURE__ */ new Date() : null,
        checklist: [],
        notes
      }
    });
    return created;
  }, { maxWait: 5e3, timeout: 1e4, isolationLevel: "ReadCommitted" });
}
async function transitionPropertyTask(_root, args, context) {
  const task = await context.query.PropertyTask.findOne({ where: { id: args.taskId }, query: "id status hostOrganization { id }" });
  if (!task?.hostOrganization?.id) throw new Error("Property task not found.");
  await assertHostOrganizationAccess({ context, hostOrganizationId: task.hostOrganization.id, permission: "canManageProperties" });
  return context.prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `property-task:${task.id}`);
    const locked = await tx.propertyTask.findUnique({ where: { id: task.id } });
    if (!locked) throw new Error("Property task not found.");
    if (args.action === "assign" && !await isActiveTaskAssignee(tx, task.hostOrganization.id, args.assigneeId?.trim())) {
      throw new Error(propertyTaskMessages.assignee);
    }
    const assigneeActive = !locked.assigneeId || await isActiveTaskAssignee(tx, task.hostOrganization.id, locked.assigneeId);
    if (args.action === "start" && !assigneeActive) throw new Error(propertyTaskMessages.staleAssignee);
    const transition = args.action === "assign" ? { action: "assign", assigneeId: args.assigneeId || "" } : args.action === "complete" ? { action: "complete", completionNotes: args.completionNotes || void 0, completionEvidence: args.completionEvidence || void 0 } : args.action === "block" ? { action: "block", completionNotes: args.completionNotes || "" } : args.action === "cancel" ? { action: "cancel", completionNotes: args.completionNotes || void 0 } : args.action === "start" ? { action: "start" } : args.action === "reopen" ? { action: "reopen" } : null;
    if (!transition) throw new Error("Unsupported property task transition.");
    const now = /* @__PURE__ */ new Date();
    const releaseStaleAssignee = args.action === "reopen" && !assigneeActive;
    const data = applyPropertyTaskTransition({
      status: locked.status,
      assigneeId: releaseStaleAssignee ? null : locked.assigneeId,
      checklist: locked.checklist
    }, transition, now);
    const updated = await tx.propertyTask.update({ where: { id: locked.id }, data: releaseStaleAssignee ? { ...data, assigneeId: null, claimedAt: null } : data });
    return updated;
  }, { maxWait: 5e3, timeout: 1e4, isolationLevel: "ReadCommitted" });
}
async function runPropertyTaskRules(_root, args, context) {
  const hostOrganizationId = String(args.hostOrganizationId || "").trim();
  if (!hostOrganizationId) throw new Error("Choose a host organization.");
  await assertHostOrganizationAccess({ context, hostOrganizationId, permission: "canManageProperties" });
  return context.prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `property-task-rules:${hostOrganizationId}`);
    const afterRuleId = typeof args.afterRuleId === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(args.afterRuleId) ? args.afterRuleId : null;
    return createMissingBeforeCheckInTasks(tx, hostOrganizationId, /* @__PURE__ */ new Date(), afterRuleId);
  }, { maxWait: 5e3, timeout: 3e4, isolationLevel: "ReadCommitted" });
}
var propertyTaskRuleTypeDefs = String.raw`
  type Mutation {
    "Creates missing before-arrival tasks a page of rules at a time; pass the returned nextRuleCursor to continue."
    runPropertyTaskRules(hostOrganizationId: ID!, afterRuleId: String): JSON!
  }
`;
var propertyTaskRuleResolvers = {
  Mutation: {
    runPropertyTaskRules
  }
};

// features/keystone/utils/stayListing.ts
var STAY_LISTING_SELECTION = `
  id
  title
  slug
  subtitle
  description
  status
  bookingMode
  instantBook
  isFeatured
  currencyCode
  baseNightlyRateCents
  securityDepositCents
  minimumStay
  maximumStay
  advanceNoticeHours
  bookingWindowDays
  reviewAverageHundredths
  reviewCount
  thumbnail
  hostOrganization {
    id
    name
    slug
    status
    isPublic
    publicBio
    cancellationPolicies(orderBy: [{ createdAt: asc }], take: 1) { id name version policyType summary fullTerms freeCancellationHours rules }
  }
  property {
    id
    name
    status
    propertyType
    timezone
    checkInFrom
    checkInUntil
    checkOutBy
    address {
      id
      addressLine1
      addressLine2
      city
      region
      postalCode
      countryCode
      latitude
      longitude
      publicLocationLabel
      showExactAddressPublicly
    }
  }
  accommodationUnit {
    id
    status
    name
    accommodationType
    maxGuests
    bedroomCount
    bedCount
    bathroomCountHalfUnits
    squareFeet
    bedrooms(orderBy: [{ order: asc }]) {
      id
      name
      order
      beds { id bedType quantity }
    }
  }
  media(orderBy: [{ order: asc }]) { id image { url } imagePath altText caption order }
  amenities(orderBy: [{ category: asc }, { name: asc }]) { id name slug category iconKey }
  collections { id name slug }
  houseRules(orderBy: [{ createdAt: asc }]) { id ruleType title description isAllowed isRequired }
  ratePlans(where: { status: { equals: "active" } }, orderBy: [{ isDefault: desc }, { createdAt: asc }]) {
    id
    name
    description
    currencyCode
    baseNightlyRateCents
    minimumStay
    maximumStay
    advanceNoticeHours
    bookingWindowDays
    weeklyDiscountBasisPoints
    monthlyDiscountBasisPoints
    isDefault
    cancellationPolicy { id name version policyType summary fullTerms freeCancellationHours rules }
    seasonalRates(where: { isActive: { equals: true } }, orderBy: [{ priority: desc }]) {
      id name startDate endDate nightlyRateCents adjustmentBasisPoints minimumStay priority
    }
  }
  feeDefinitions(where: { isActive: { equals: true } }, orderBy: [{ createdAt: asc }]) {
    id name feeType calculation amountCents percentageBasisPoints taxable required
  }
  taxRules(where: { isActive: { equals: true } }, orderBy: [{ createdAt: asc }]) {
    id name jurisdiction rateBasisPoints isInclusive
  }
`;
function publicRatePlans(listing) {
  const plans = listing.ratePlans?.length ? listing.ratePlans : [effectiveStayRatePlan(listing)].filter(Boolean);
  return plans.map((plan) => ({
    ...plan,
    advanceNoticeHours: plan.advanceNoticeHours ?? listing.advanceNoticeHours ?? null,
    bookingWindowDays: plan.bookingWindowDays ?? listing.bookingWindowDays ?? null
  }));
}
function coarseCoordinate(value) {
  return typeof value === "number" ? Math.round(value * 1e3) / 1e3 : null;
}
function mediaUrl(media) {
  return media?.image?.url || media?.imagePath || null;
}
function toPublicListing(listing) {
  const accommodation = listing.accommodationUnit ? { ...listing.accommodationUnit } : listing.accommodationUnit;
  if (accommodation && typeof accommodation === "object") delete accommodation.status;
  const address = listing.property?.address;
  const showExact = Boolean(address?.showExactAddressPublicly);
  return {
    id: listing.id,
    title: listing.title,
    slug: listing.slug,
    subtitle: listing.subtitle,
    description: listing.description,
    bookingMode: listing.bookingMode,
    instantBook: listing.instantBook,
    isFeatured: listing.isFeatured,
    currencyCode: listing.currencyCode,
    baseNightlyRateCents: listing.baseNightlyRateCents,
    securityDepositCents: listing.securityDepositCents,
    minimumStay: listing.minimumStay,
    maximumStay: listing.maximumStay,
    advanceNoticeHours: listing.advanceNoticeHours,
    bookingWindowDays: listing.bookingWindowDays,
    reviewAverageHundredths: listing.reviewAverageHundredths,
    reviewCount: listing.reviewCount,
    thumbnail: listing.thumbnail || mediaUrl(listing.media?.[0]),
    host: listing.hostOrganization ? {
      id: listing.hostOrganization.id,
      name: listing.hostOrganization.name,
      slug: listing.hostOrganization.slug,
      publicBio: listing.hostOrganization.publicBio
    } : null,
    property: listing.property ? {
      id: listing.property.id,
      name: listing.property.name,
      propertyType: listing.property.propertyType,
      timezone: listing.property.timezone,
      checkInFrom: listing.property.checkInFrom,
      checkInUntil: listing.property.checkInUntil,
      checkOutBy: listing.property.checkOutBy,
      location: address ? {
        publicLocationLabel: address.publicLocationLabel || [address.city, address.region].filter(Boolean).join(", "),
        city: address.city,
        region: address.region,
        countryCode: address.countryCode,
        latitude: coarseCoordinate(address.latitude),
        longitude: coarseCoordinate(address.longitude),
        addressLine1: showExact ? address.addressLine1 : null,
        addressLine2: showExact ? address.addressLine2 : null,
        postalCode: showExact ? address.postalCode : null
      } : null
    } : null,
    accommodation,
    media: (listing.media || []).map((item) => ({
      id: item.id,
      url: mediaUrl(item),
      altText: item.altText,
      caption: item.caption,
      order: item.order
    })),
    amenities: listing.amenities || [],
    collections: listing.collections || [],
    houseRules: listing.houseRules || [],
    ratePlans: publicRatePlans(listing),
    feeDefinitions: listing.feeDefinitions || [],
    taxRules: listing.taxRules || []
  };
}
function listingBookingSnapshot(listing) {
  const publicListing2 = toPublicListing(listing);
  const address = listing.property?.address;
  return {
    ...publicListing2,
    property: publicListing2.property ? {
      ...publicListing2.property,
      address: address ? {
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        region: address.region,
        postalCode: address.postalCode,
        countryCode: address.countryCode,
        publicLocationLabel: address.publicLocationLabel
      } : null
    } : null
  };
}

// features/keystone/utils/publicReputation.ts
var GENUINE_REVIEW = {
  status: "published",
  direction: "guest_to_host",
  publishedAt: { not: null },
  reservation: { fixtureOrigin: null, testMode: false }
};
var GENUINE_REVIEW_FILTER = {
  status: { equals: "published" },
  direction: { equals: "guest_to_host" },
  publishedAt: { not: null },
  reservation: { fixtureOrigin: { equals: null }, testMode: { equals: false } }
};
async function genuineReviewStats(prisma, listingIds) {
  const stats = /* @__PURE__ */ new Map();
  if (!listingIds.length) return stats;
  const groups = await prisma.review.groupBy({
    by: ["listingId"],
    where: { ...GENUINE_REVIEW, listingId: { in: listingIds } },
    _avg: { overallRating: true },
    _count: { _all: true }
  });
  for (const group of groups) {
    const average = Number(group._avg?.overallRating || 0);
    stats.set(group.listingId, { reviewCount: group._count?._all || 0, reviewAverageHundredths: Math.min(500, Math.max(0, Math.round(average * 100))) });
  }
  return stats;
}
function withGenuineReputation(listing, stats) {
  const genuine = stats.get(listing.id) || { reviewCount: 0, reviewAverageHundredths: 0 };
  return { ...listing, reviewCount: genuine.reviewCount, reviewAverageHundredths: genuine.reviewAverageHundredths };
}

// features/keystone/mutations/publicListing.ts
var PUBLIC_REVIEW_PAGE = 12;
function reviewCursor(value) {
  if (typeof value !== "string" || value.length > 120) return null;
  const [at, id2] = value.split("|");
  const date = new Date(at || "");
  return id2 && /^[A-Za-z0-9_-]{1,64}$/.test(id2) && !Number.isNaN(date.getTime()) ? { publishedAt: date.toISOString(), id: id2 } : null;
}
async function publicListing(_root, args, context) {
  const slug2 = args.slug?.trim();
  if (!slug2) throw new Error("Listing slug is required.");
  const listings = await context.sudo().query.Listing.findMany({
    // A suspended or private host, or a paused or archived property, takes its homes off sale.
    where: { ...sellableListingWhere(), slug: { equals: slug2 } },
    take: 1,
    query: STAY_LISTING_SELECTION
  });
  if (!listings[0]) return null;
  const before = reviewCursor(args.reviewsBefore);
  const published = { listing: { id: { equals: listings[0].id } }, ...GENUINE_REVIEW_FILTER };
  const reviews = await context.sudo().query.Review.findMany({
    where: before ? { AND: [published, { OR: [{ publishedAt: { lt: before.publishedAt } }, { AND: [{ publishedAt: { equals: before.publishedAt } }, { id: { lt: before.id } }] }] }] } : published,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: PUBLIC_REVIEW_PAGE + 1,
    query: "id overallRating body publishedAt guest { name }"
  });
  const page = reviews.slice(0, PUBLIC_REVIEW_PAGE);
  const oldest = page[page.length - 1];
  const stats = await genuineReviewStats(context.prisma, [listings[0].id]);
  return {
    ...withGenuineReputation(toPublicListing(listings[0]), stats),
    reviewsBefore: before ? `${before.publishedAt}|${before.id}` : null,
    olderReviewsBefore: reviews.length > PUBLIC_REVIEW_PAGE && oldest ? `${new Date(oldest.publishedAt).toISOString()}|${oldest.id}` : null,
    publishedReviews: page.map((review) => ({
      id: review.id,
      overallRating: review.overallRating,
      body: review.body || "",
      publishedAt: review.publishedAt,
      author: String(review.guest?.name || "").trim().split(/\s+/)[0] || "Guest"
    }))
  };
}

// features/keystone/mutations/publicMarketplaceSettings.ts
var PUBLIC_SETTINGS_PROJECTION = [
  "id",
  "name",
  "tagline",
  "homepageHeadline",
  "publicDescription",
  "supportEmail",
  "supportPhone",
  "supportHours",
  "officeAddress",
  "privacyPolicyUrl",
  "privacyPolicyVersion",
  "termsUrl",
  "termsVersion",
  "allowTestBookings",
  "currencyCode",
  "locale",
  "timezone",
  "defaultMapLatitude",
  "defaultMapLongitude",
  "accentHue",
  "logoIcon",
  "logoColor",
  "isPublished"
].join(" ");
async function publicMarketplaceSettings(_root, _args, context) {
  const settings = await context.sudo().query.MarketplaceSettings.findOne({
    where: { id: "1" },
    query: PUBLIC_SETTINGS_PROJECTION
  });
  if (!settings) return { status: "unconfigured" };
  if (!settings.isPublished) return { status: "unpublished" };
  const savedLogo = typeof settings.logoIcon === "string" ? sanitizeStoreLogoSvg(settings.logoIcon) : "";
  const logoColor = savedLogo ? normalizeStoreLogoColor(settings.logoColor) : DEFAULT_LIBRARY_LOGO_COLOR;
  return {
    status: "published",
    id: settings.id,
    name: settings.name,
    tagline: settings.tagline,
    homepageHeadline: settings.homepageHeadline,
    publicDescription: settings.publicDescription,
    supportEmail: settings.supportEmail,
    supportPhone: settings.supportPhone,
    supportHours: settings.supportHours || null,
    officeAddress: settings.officeAddress || null,
    // A document is published only with both its link and its version label.
    privacyPolicyUrl: settings.privacyPolicyUrl && settings.privacyPolicyVersion ? settings.privacyPolicyUrl : null,
    privacyPolicyVersion: settings.privacyPolicyUrl && settings.privacyPolicyVersion ? settings.privacyPolicyVersion : null,
    termsUrl: settings.termsUrl && settings.termsVersion ? settings.termsUrl : null,
    termsVersion: settings.termsUrl && settings.termsVersion ? settings.termsVersion : null,
    currencyCode: settings.currencyCode,
    locale: settings.locale,
    timezone: settings.timezone,
    defaultMapLatitude: settings.defaultMapLatitude,
    defaultMapLongitude: settings.defaultMapLongitude,
    // The logo colour is the storefront's brand colour, for built-in and external storefronts alike.
    accentHue: storefrontAccentHueFromLogoColor(logoColor),
    // Re-sanitized on read; an empty or unsafe stored value falls back to the library default.
    logoIcon: savedLogo || DEFAULT_STORE_LOGO_ICON,
    logoColor
  };
}

// features/keystone/mutations/publicStayAgreement.ts
var closedStayStatuses = ["cancelled", "no_show"];
async function publicStayAgreement(_root, args, context) {
  if (!/^[a-f0-9]{48}$/.test(args.token || "")) return null;
  const records = await context.sudo().query.StayAgreement.findMany({
    where: { signingTokenHash: { equals: hashPublicOwnershipToken(args.token) } },
    take: 1,
    query: "id agreementNumber status title signerEmail signatureName signedAt signingTokenExpiresAt signingTokenRevokedAt termsSnapshot signatureEvidence reservation { status fixtureOrigin testMode }"
  });
  const raw = records[0];
  if (!raw) return null;
  const sample = Boolean(raw.reservation?.fixtureOrigin) || raw.signatureEvidence?.provenance === "onboarding_sample";
  const signedBySetup = sample && raw.status === "signed" && raw.signatureEvidence?.via !== "signing_link";
  const { signatureEvidence: _evidence, ...rest } = raw;
  const agreement = {
    ...rest,
    sample,
    simulation: raw.reservation?.testMode === true,
    signedBySetup,
    ...signedBySetup ? { signatureName: null, signedAt: null } : {}
  };
  const stayClosed = closedStayStatuses.includes(agreement.reservation?.status);
  const revoked = Boolean(agreement.signingTokenRevokedAt) || agreement.status === "voided";
  const expired = !agreement.signingTokenExpiresAt || new Date(agreement.signingTokenExpiresAt).getTime() <= Date.now();
  if (expired) return null;
  if (revoked) return { signable: false, unavailableReason: agreement.status === "voided" ? "voided" : "replaced" };
  if (stayClosed) {
    return {
      id: agreement.id,
      agreementNumber: agreement.agreementNumber,
      title: agreement.title,
      status: agreement.status,
      signatureName: agreement.signatureName,
      signedAt: agreement.signedAt,
      sample: agreement.sample,
      signedBySetup: agreement.signedBySetup,
      signable: false,
      unavailableReason: "stay_closed"
    };
  }
  const { signingTokenExpiresAt: _expires, signingTokenRevokedAt: _revoked, reservation: _reservation, ...publicAgreement } = agreement;
  return { ...publicAgreement, signable: agreement.status !== "signed", unavailableReason: null };
}

// features/keystone/utils/publicStayProjections.ts
function asRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function publicBookingListingProjection(snapshot) {
  const listing = asRecord(snapshot);
  if (!listing) return null;
  const property = asRecord(listing.property);
  if (!property) return { ...listing };
  const publicProperty = { ...property };
  delete publicProperty.address;
  return { ...listing, property: publicProperty };
}
function publicStayQuoteProjection(quote) {
  const record5 = asRecord(quote);
  if (!record5) return null;
  const publicQuote = { ...record5 };
  delete publicQuote.tokenHash;
  delete publicQuote.quoteSnapshot;
  const snapshot = asRecord(record5.quoteSnapshot);
  const listingSnapshot = snapshot?.listing || record5.listing;
  return {
    ...publicQuote,
    breakdown: snapshot?.quote || null,
    cancellationPolicy: snapshot?.cancellationPolicy || null,
    // The checkout sends this back with the guest's acceptance of exactly these terms.
    termsVersion: snapshot ? stayTermsVersion(snapshot) : null,
    listing: publicBookingListingProjection(listingSnapshot)
  };
}

// features/keystone/mutations/publicStayQuote.ts
async function publicStayQuote(_root, args, context) {
  const quote = await resolveActiveStayQuote({
    token: args.token,
    findByHash: async (tokenHash) => {
      const quotes = await context.sudo().query.StayQuote.findMany({
        where: { tokenHash: { equals: tokenHash } },
        take: 1,
        query: `
          id quoteNumber status expiresAt consumedAt checkInDate checkOutDate adults children infants pets
          currencyCode lodgingSubtotalCents feeTotalCents taxTotalCents securityDepositCents totalAmountCents quoteSnapshot
          listing { id title slug subtitle thumbnail }
        `
      });
      return quotes[0] || null;
    }
  });
  if (!quote) return null;
  return publicStayQuoteProjection(quote);
}

// features/keystone/mutations/publicTrip.ts
var import_node_crypto20 = __toESM(require("node:crypto"));

// features/keystone/utils/cancellationEntitlement.ts
var import_node_crypto19 = __toESM(require("node:crypto"));
var HOUR_MS2 = 60 * 60 * 1e3;
function assessmentIdentity(parts) {
  return import_node_crypto19.default.createHash("sha256").update(JSON.stringify({ v: 1, ...parts })).digest("hex").slice(0, 32);
}
function validRules(rules2) {
  if (!Array.isArray(rules2) || !rules2.length || rules2.length > 20) return null;
  const parsed = rules2.map((rule) => ({ hoursBeforeCheckIn: rule?.hoursBeforeCheckIn, refundBasisPoints: rule?.refundBasisPoints }));
  const ok = parsed.every((rule) => Number.isSafeInteger(rule.hoursBeforeCheckIn) && rule.hoursBeforeCheckIn >= 0 && Number.isSafeInteger(rule.refundBasisPoints) && rule.refundBasisPoints >= 0 && rule.refundBasisPoints <= 1e4);
  return ok ? parsed.sort((a, b) => b.hoursBeforeCheckIn - a.hoursBeforeCheckIn) : null;
}
function cancellationEntitlement({ bookingSnapshot, checkInDate, checkOutDate = null, totalAmountCents = null, bookedAt, cancelledAt, netPaidCents }) {
  if (!Number.isSafeInteger(netPaidCents) || netPaidCents < 0) throw new Error("Reservation paid amount must use non-negative integer cents.");
  const policy = bookingSnapshot?.cancellationPolicy || {};
  const property = bookingSnapshot?.listing?.property || {};
  const checkInAt = zonedLocalTimestamp(checkInDate, property.checkInFrom, property.timezone);
  const hoursBeforeCheckIn = Math.floor((checkInAt - cancelledAt.getTime()) / HOUR_MS2);
  const base = { policyId: policy.id || null, policyVersion: policy.version || null, hoursBeforeCheckIn };
  const identity = (status, window3, refundBasisPoints2, refundCents2, reviewCents) => assessmentIdentity({
    status,
    policyId: base.policyId,
    policyVersion: base.policyVersion,
    window: window3,
    refundBasisPoints: refundBasisPoints2,
    refundCents: refundCents2,
    reviewCents,
    netPaidCents,
    itinerary: { checkInDate, checkOutDate, totalAmountCents }
  });
  const rules2 = validRules(policy.rules);
  if (!rules2) {
    return {
      ...base,
      status: "unassessed",
      refundCents: 0,
      reviewCents: netPaidCents,
      refundBasisPoints: null,
      refundBase: null,
      window: null,
      basis: "The captured cancellation policy has no refund-window rules, so your host reviews whether a refund is due.",
      assessmentId: identity("unassessed", null, null, 0, netPaidCents)
    };
  }
  const booked = bookedAt ? new Date(bookedAt).getTime() : NaN;
  const freeHours = policy.freeCancellationHours;
  if (Number.isSafeInteger(freeHours) && freeHours > 0 && Number.isFinite(booked) && cancelledAt.getTime() - booked <= freeHours * HOUR_MS2 && hoursBeforeCheckIn > 0) {
    return {
      ...base,
      status: "assessed",
      refundCents: netPaidCents,
      reviewCents: 0,
      refundBasisPoints: 1e4,
      refundBase: "amount_paid",
      window: "free",
      basis: `Cancelled within ${freeHours} hours of booking: everything you\u2019ve paid is refunded.`,
      assessmentId: identity("assessed", "free", 1e4, netPaidCents, 0)
    };
  }
  const rule = rules2.find((candidate) => hoursBeforeCheckIn >= candidate.hoursBeforeCheckIn);
  const refundBasisPoints = rule?.refundBasisPoints ?? 0;
  const refundCents = Math.floor(netPaidCents * refundBasisPoints / 1e4);
  const window2 = rule ? rule.hoursBeforeCheckIn : null;
  return {
    ...base,
    status: "assessed",
    refundCents,
    reviewCents: 0,
    refundBasisPoints,
    refundBase: "amount_paid",
    window: window2,
    basis: rule ? `Cancelled at least ${rule.hoursBeforeCheckIn} hours before check-in: ${refundBasisPoints / 100}% of what you\u2019ve paid is refunded.` : "Cancelled after the last refund window: no refund under the policy.",
    assessmentId: identity("assessed", window2, refundBasisPoints, refundCents, 0)
  };
}

// features/keystone/utils/guestThread.ts
var GUEST_MESSAGE_MAX_LENGTH = 4e3;
var GUEST_THREAD_MESSAGE_QUERY = "id direction senderType body status sentAt receivedAt createdAt";
var VISIBLE_HOST_STATUSES = /* @__PURE__ */ new Set(["sent", "delivered"]);
var GUEST_THREAD_PAGE_SIZE = 100;
function guestVisibleMessageWhere(before) {
  const visible = '{ OR: [{ AND: [{ direction: { equals: "inbound" } }, { senderType: { equals: "guest" } }] }, { AND: [{ direction: { equals: "outbound" } }, { status: { in: ["sent", "delivered"] } }] }] }';
  if (!before) return visible;
  const at = JSON.stringify(before.createdAt);
  const earlier = `{ OR: [{ createdAt: { lt: ${at} } }, { AND: [{ createdAt: { equals: ${at} } }, { id: { lt: ${JSON.stringify(before.id)} } }] }] }`;
  return `{ AND: [${visible}, ${earlier}] }`;
}
function guestVisibleMessagePrismaWhere(before) {
  const visible = {
    OR: [
      { direction: "inbound", senderType: "guest" },
      { direction: "outbound", status: { in: ["sent", "delivered"] } }
    ]
  };
  if (!before) return visible;
  const at = new Date(before.createdAt);
  return { AND: [visible, { OR: [{ createdAt: { lt: at } }, { createdAt: at, id: { lt: before.id } }] }] };
}
function guestThreadCursor(value) {
  if (typeof value !== "string" || value.length > 120) return null;
  const [at, id2] = value.split("|");
  if (!at || !id2 || !/^[A-Za-z0-9_-]{1,64}$/.test(id2)) return null;
  const date = new Date(at);
  return Number.isNaN(date.getTime()) ? null : { createdAt: date.toISOString(), id: id2 };
}
function guestThreadPage(messagesNewestFirst) {
  const rows = Array.isArray(messagesNewestFirst) ? messagesNewestFirst : [];
  const page = rows.slice(0, GUEST_THREAD_PAGE_SIZE).reverse();
  const oldest = page[0];
  return {
    messages: guestVisibleMessages(page),
    earlierMessagesBefore: rows.length > GUEST_THREAD_PAGE_SIZE && oldest?.createdAt && oldest?.id ? `${new Date(oldest.createdAt).toISOString()}|${oldest.id}` : null
  };
}
function cleanGuestMessage(value, label = "Message") {
  const text50 = typeof value === "string" ? value.replace(/\r\n/g, "\n").trim() : "";
  if (!text50) throw new Error(`${label} is required.`);
  if (text50.length > GUEST_MESSAGE_MAX_LENGTH) throw new Error(`${label} must be ${GUEST_MESSAGE_MAX_LENGTH} characters or fewer.`);
  return text50;
}
function guestVisibleMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.filter((message) => message && (message.direction === "inbound" && message.senderType === "guest" || message.direction === "outbound" && VISIBLE_HOST_STATUSES.has(message.status))).map((message) => ({
    id: String(message.id),
    from: message.direction === "inbound" ? "guest" : "host",
    body: String(message.body || ""),
    at: message.sentAt || message.receivedAt || message.createdAt || null
  }));
}
async function appendGuestMessage(tx, { conversationId, hostOrganizationId, body, now = /* @__PURE__ */ new Date() }) {
  const message = await tx.message.create({
    data: {
      hostOrganizationId,
      conversationId,
      direction: "inbound",
      senderType: "guest",
      body,
      status: "received",
      receivedAt: now
    }
  });
  await tx.conversation.update({ where: { id: conversationId }, data: { status: "open", lastMessageAt: now } });
  return message;
}

// features/keystone/utils/publicTripGuestContact.ts
function asRecord2(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function publicTripGuestContact(guestPartySnapshot) {
  const primaryGuest = asRecord2(asRecord2(guestPartySnapshot)?.primaryGuest);
  if (!primaryGuest) return null;
  return {
    name: typeof primaryGuest.name === "string" ? primaryGuest.name : null,
    email: typeof primaryGuest.email === "string" ? primaryGuest.email : null,
    phone: typeof primaryGuest.phone === "string" ? primaryGuest.phone : null
  };
}

// features/keystone/utils/publicTripRecordProjection.ts
var GUEST_PARTY_COUNTS = ["adults", "children", "infants", "pets"];
var PUBLIC_TRIP_AGREEMENT_FIELDS = ["agreementNumber", "status", "title", "signatureName", "signedAt", "signedBySetup"];
function publicTripGuestPartyProjection(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const record5 = value;
  const projection = {};
  for (const key of GUEST_PARTY_COUNTS) {
    const count = record5[key];
    if (typeof count === "number" && Number.isSafeInteger(count) && count >= 0) projection[key] = count;
  }
  return Object.keys(projection).length ? projection : null;
}
function publicTripAgreementProjection(value) {
  if (value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const record5 = value;
  return Object.fromEntries(
    PUBLIC_TRIP_AGREEMENT_FIELDS.filter((key) => Object.prototype.hasOwnProperty.call(record5, key)).map((key) => [key, record5[key]])
  );
}
function publicTripRecordProjection(record5) {
  if (record5 === null || typeof record5 !== "object" || Array.isArray(record5)) return {};
  const projection = { ...record5 };
  delete projection.conversation;
  delete projection.reviews;
  delete projection.guestNotes;
  delete projection.cancellationReason;
  if (Object.prototype.hasOwnProperty.call(projection, "agreement")) {
    projection.agreement = publicTripAgreementProjection(projection.agreement);
  }
  return projection;
}

// features/keystone/mutations/publicTrip.ts
var PROPERTY_ARRIVAL_QUERY = `
  checkInFrom checkInUntil checkOutBy timezone arrivalInstructions
  address { addressLine1 addressLine2 city region postalCode countryCode }
`;
function partyVersion(party) {
  const counts = publicTripGuestPartyProjection(party);
  return counts ? import_node_crypto20.default.createHash("sha256").update(JSON.stringify([counts, party?.updatedAt || null])).digest("hex").slice(0, 16) : null;
}
async function publicTrip(_root, args, context) {
  if (!/^[a-f0-9]{48}$/.test(args.token || "")) throw new Error("Trip link is invalid.");
  const messagesBefore = guestThreadCursor(args.messagesBefore);
  const reservation = await resolvePublicTokenRecord({
    token: args.token,
    invalidMessage: "Trip link is invalid.",
    findRecordByHash: async (tokenHash) => {
      const reservations = await context.sudo().query.Reservation.findMany({
        where: { tripTokenHash: { equals: tokenHash } },
        take: 1,
        query: `
          id confirmationCode status paymentStatus source checkInDate checkOutDate
          scheduledCheckInTime scheduledCheckOutTime checkedInAt checkedOutAt cancelledAt
          currencyCode lodgingSubtotalCents feeTotalCents taxTotalCents discountTotalCents securityDepositCents totalAmountCents amountPaidCents
          tripTokenExpiresAt tripTokenRevokedAt bookingSnapshot testMode fixtureOrigin createdAt
          listing {
            id title slug thumbnail
            property { ${PROPERTY_ARRIVAL_QUERY} }
          }
          accommodationUnit { property { ${PROPERTY_ARRIVAL_QUERY} } }
          bookedBy { id }
          conversation { id messages(where: ${guestVisibleMessageWhere(messagesBefore)}, orderBy: [{ createdAt: desc }, { id: desc }], take: ${GUEST_THREAD_PAGE_SIZE + 1}) { ${GUEST_THREAD_MESSAGE_QUERY} } }
          reviews(where: { direction: { equals: "guest_to_host" } }, take: 1) { status overallRating submittedAt }
          damageClaims(orderBy: [{ createdAt: asc }], take: 20) { claimNumber status description claimedAmountCents approvedAmountCents currencyCode submittedAt resolvedAt }
          guestParty { adults children infants pets updatedAt }
          lineItems(orderBy: [{ createdAt: asc }]) { id lineType description serviceDate quantity unitAmountCents totalAmountCents currencyCode metadataSnapshot }
          payments(orderBy: [{ createdAt: desc }]) { id amountCents refundedAmountCents currencyCode status paymentMethod provider processedAt data }
          refunds(orderBy: [{ createdAt: desc }]) { id refundNumber status reason amountCents currencyCode processedAt }
          amendments(orderBy: [{ createdAt: asc }]) { id previousCheckInDate previousCheckOutDate checkInDate checkOutDate currencyCode reason delta createdAt beforeSnapshot afterSnapshot }
          agreement { agreementNumber status title signatureName signedAt signatureEvidence }
          securityDeposit { id depositNumber status amountCents capturedAmountCents currencyCode heldAt releasedAt }
        `
      });
      const record5 = reservations[0];
      return record5 ? {
        ...record5,
        tokenExpiresAt: record5.tripTokenExpiresAt,
        tokenRevokedAt: record5.tripTokenRevokedAt
      } : null;
    }
  });
  if (!reservation) return null;
  const snapshot = reservation.bookingSnapshot;
  const listingSnapshot = snapshot?.listing;
  const publicListingSnapshot = publicBookingListingProjection(listingSnapshot);
  const guestPartySnapshot = snapshot?.guestParty;
  const refundDueCents = (reservation.refunds || []).filter((refund) => ["pending", "processing", "failed"].includes(refund.status)).reduce((sum, refund) => sum + refund.amountCents, 0);
  const refundReviewCents = (reservation.refunds || []).filter((refund) => refund.status === "review").reduce((sum, refund) => sum + refund.amountCents, 0);
  const publicTripRecord = publicTripRecordProjection(reservation);
  const {
    tripTokenExpiresAt: _expiresAt,
    tripTokenRevokedAt: _revokedAt,
    bookingSnapshot: _snapshot,
    tokenExpiresAt: _tokenExpiresAt,
    tokenRevokedAt: _tokenRevokedAt,
    bookedBy: _bookedBy,
    damageClaims: _damageClaims,
    fixtureOrigin: _fixtureOrigin,
    listing: _liveListing,
    accommodationUnit: _unit,
    createdAt: _createdAt,
    payments: rawPayments,
    ...publicReservation
  } = publicTripRecord;
  const liveProperty = reservation.accommodationUnit?.property || reservation.listing?.property || null;
  const arrival = ["confirmed", "in_stay"].includes(reservation.status) && liveProperty ? {
    address: liveProperty.address ? {
      addressLine1: liveProperty.address.addressLine1 || null,
      addressLine2: liveProperty.address.addressLine2 || null,
      city: liveProperty.address.city || null,
      region: liveProperty.address.region || null,
      postalCode: liveProperty.address.postalCode || null,
      countryCode: liveProperty.address.countryCode || null
    } : null,
    instructions: liveProperty.arrivalInstructions?.trim() || null,
    checkInFrom: liveProperty.checkInFrom || null,
    checkInUntil: liveProperty.checkInUntil || null,
    checkOutBy: liveProperty.checkOutBy || null,
    timezone: liveProperty.timezone || null
  } : null;
  const guestReview = reservation.reviews?.[0] || null;
  const sessionUserId = context.session?.data?.isActive === true ? context.session?.itemId : null;
  const fallbackListing = reservation.listing ? {
    id: reservation.listing.id,
    title: reservation.listing.title,
    slug: reservation.listing.slug,
    thumbnail: reservation.listing.thumbnail,
    property: liveProperty ? { checkInFrom: liveProperty.checkInFrom, checkInUntil: liveProperty.checkInUntil, checkOutBy: liveProperty.checkOutBy, timezone: liveProperty.timezone } : null
  } : null;
  return {
    ...publicReservation,
    checkInDate: reservation.checkInDate,
    checkOutDate: reservation.checkOutDate,
    currencyCode: reservation.currencyCode,
    lodgingSubtotalCents: reservation.lodgingSubtotalCents,
    feeTotalCents: reservation.feeTotalCents,
    taxTotalCents: reservation.taxTotalCents,
    securityDepositCents: reservation.securityDepositCents,
    totalAmountCents: reservation.totalAmountCents,
    balanceDueCents: reservation.status === "cancelled" ? 0 : Math.max((reservation.totalAmountCents || 0) - (reservation.amountPaidCents || 0), 0),
    refundDueCents,
    refundReviewCents,
    listing: listingSnapshot ? {
      id: listingSnapshot.id,
      title: listingSnapshot.title,
      slug: listingSnapshot.slug,
      thumbnail: listingSnapshot.thumbnail || listingSnapshot.media?.[0]?.url,
      host: listingSnapshot.host,
      property: publicListingSnapshot?.property || null,
      accommodation: listingSnapshot.accommodation,
      houseRules: listingSnapshot.houseRules || []
    } : fallbackListing,
    arrival,
    ...(() => {
      const page = guestThreadPage(reservation.conversation?.messages);
      return { messages: page.messages, earlierMessagesBefore: page.earlierMessagesBefore };
    })(),
    testMode: reservation.testMode === true,
    // A setup sample stay: its money, deposit and any "signature" were recorded by setup.
    sample: Boolean(reservation.fixtureOrigin),
    // Each dated change with its total before and after and the addendum's real acceptance
    // state: the guest's acceptance of a change is never assumed from the original signature.
    amendments: (reservation.amendments || []).map((amendment) => ({
      id: amendment.id,
      previousCheckInDate: amendment.previousCheckInDate,
      previousCheckOutDate: amendment.previousCheckOutDate,
      checkInDate: amendment.checkInDate,
      checkOutDate: amendment.checkOutDate,
      createdAt: amendment.createdAt,
      currencyCode: amendment.currencyCode,
      totalBeforeCents: Number.isSafeInteger(amendment.beforeSnapshot?.amounts?.totalAmountCents) ? amendment.beforeSnapshot.amounts.totalAmountCents : null,
      totalAfterCents: Number.isSafeInteger(amendment.afterSnapshot?.amounts?.totalAmountCents) ? amendment.afterSnapshot.amounts.totalAmountCents : null,
      guestAcceptance: amendment.afterSnapshot?.agreementAddendum?.guestAcceptance || "not_recorded"
    })),
    agreement: publicReservation.agreement ? (() => {
      const { signatureEvidence, ...agreement } = reservation.agreement || {};
      const signedBySetup = Boolean(reservation.fixtureOrigin) && agreement.status === "signed" && signatureEvidence?.via !== "signing_link";
      return signedBySetup ? { ...publicReservation.agreement, signatureName: null, signedAt: null, signedBySetup } : { ...publicReservation.agreement, signedBySetup: false };
    })() : null,
    payments: (rawPayments || []).map(({ data, ...payment }) => ({ ...payment, isTest: isTestTender({ provider: payment.provider, data }) })),
    cancellationPreview: ["pending", "confirmed"].includes(reservation.status) ? cancellationEntitlement({
      bookingSnapshot: snapshot,
      checkInDate: reservation.checkInDate,
      checkOutDate: reservation.checkOutDate,
      totalAmountCents: reservation.totalAmountCents,
      bookedAt: reservation.createdAt,
      cancelledAt: /* @__PURE__ */ new Date(),
      netPaidCents: reservation.amountPaidCents || 0
    }) : null,
    review: guestReview ? { status: guestReview.status, overallRating: guestReview.overallRating, submittedAt: guestReview.submittedAt } : null,
    canReview: reservation.status === "completed" && !guestReview,
    damageClaims: (reservation.damageClaims || []).filter((claim) => claim.status !== "draft").map((claim) => ({
      claimNumber: claim.claimNumber,
      status: claim.status,
      description: claim.description,
      claimedAmountCents: claim.claimedAmountCents,
      approvedAmountCents: claim.approvedAmountCents,
      currencyCode: claim.currencyCode,
      submittedAt: claim.submittedAt,
      resolvedAt: claim.resolvedAt
    })),
    account: {
      linked: Boolean(reservation.bookedBy?.id),
      linkedToYou: Boolean(sessionUserId && reservation.bookedBy?.id === sessionUserId),
      signedIn: Boolean(sessionUserId)
    },
    guest: publicTripGuestContact(guestPartySnapshot),
    // The party now on record (after any host change) and, separately, the party as booked.
    guestParty: publicTripGuestPartyProjection(reservation.guestParty || guestPartySnapshot),
    bookedGuestParty: publicTripGuestPartyProjection(guestPartySnapshot),
    partyVersion: partyVersion(reservation.guestParty || guestPartySnapshot),
    partyChanges: [],
    cancellationPolicy: snapshot?.cancellationPolicy || null
  };
}

// features/keystone/mutations/redirectToInit.ts
async function redirectToInit(root, args, context) {
  const userCount = await context.sudo().query.User.count({});
  if (userCount === 0) {
    return true;
  }
  return false;
}
var redirectToInit_default = redirectToInit;

// features/keystone/mutations/requestStayCancellation.ts
var import_node_crypto22 = __toESM(require("node:crypto"));

// features/keystone/utils/stayCancellationRefund.ts
var import_node_crypto21 = __toESM(require("node:crypto"));
function allocatePendingCancellationRefunds({
  reservationId,
  netAmountPaidCents,
  refundCents = netAmountPaidCents,
  payments
}) {
  if (!Number.isSafeInteger(netAmountPaidCents) || netAmountPaidCents < 0) {
    throw new Error("Reservation paid amount must use non-negative integer cents.");
  }
  if (!Number.isSafeInteger(refundCents) || refundCents < 0 || refundCents > netAmountPaidCents) {
    throw new Error("The cancellation refund must be within the amount paid.");
  }
  const available = payments.reduce((sum, payment) => sum + payment.amountCents - payment.refundedAmountCents, 0);
  if (available !== netAmountPaidCents) throw new Error("Reservation payment evidence does not reconcile to the refundable balance.");
  let remaining = refundCents;
  const allocations = [];
  for (const payment of payments) {
    const available2 = payment.amountCents - payment.refundedAmountCents;
    if (!Number.isSafeInteger(available2) || available2 < 0) throw new Error("Payment refund evidence is invalid.");
    const amountCents = Math.min(available2, remaining);
    if (amountCents > 0) {
      const digest3 = import_node_crypto21.default.createHash("sha256").update(`${reservationId}|${payment.id}|${amountCents}|guest_cancellation`).digest("hex");
      allocations.push({ paymentId: payment.id, amountCents, idempotencyKey: `cancellation-refund:${digest3}` });
      remaining -= amountCents;
    }
    if (remaining === 0) break;
  }
  if (remaining !== 0) throw new Error("Reservation payment evidence does not reconcile to the refundable balance.");
  return allocations;
}

// features/platform/operations/lib/currency-units.ts
function currencyMinorUnitDigits(currencyCode = "USD") {
  const code = currencyCode.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) throw new Error(`Invalid currency code: ${currencyCode}`);
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    throw new Error(`Unsupported currency code: ${currencyCode}`);
  }
}
function currencyMinorUnitScale(currencyCode = "USD") {
  return 10 ** currencyMinorUnitDigits(currencyCode);
}
function minorToMajorUnits(value, currencyCode = "USD") {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(parsed)) return 0;
  return parsed / currencyMinorUnitScale(currencyCode);
}

// features/keystone/utils/moneyMessage.ts
function formatCentsForMessage(minorUnits, currencyCode) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode || "USD" }).format(minorToMajorUnits(minorUnits, currencyCode || "USD"));
  } catch {
    return `${minorUnits} ${currencyCode} (minor units)`;
  }
}

// features/keystone/utils/stayClosure.ts
async function closeStayObligations(tx, {
  reservation,
  now,
  operationKey
}) {
  let agreementVoided = false;
  let depositReleased = false;
  if (reservation.agreementId) {
    const voided = await tx.stayAgreement.updateMany({
      where: { id: reservation.agreementId, status: { in: ["draft", "sent"] } },
      data: { status: "voided", signingTokenRevokedAt: now }
    });
    await tx.stayAgreement.updateMany({
      where: { id: reservation.agreementId, signingTokenRevokedAt: null },
      data: { signingTokenRevokedAt: now }
    });
    agreementVoided = voided.count > 0;
    if (agreementVoided) {
    }
  }
  if (reservation.securityDepositId) {
    const released = await tx.securityDeposit.updateMany({
      where: { id: reservation.securityDepositId, status: "required" },
      data: { status: "released", releasedAt: now }
    });
    depositReleased = released.count > 0;
    if (depositReleased) {
    }
  }
  const tasksCancelled = await cancelUnstartedStayTasks(tx, reservation, now, operationKey);
  const paymentAttemptsClosing = await requestAttemptClosure(tx, reservation.id, "stay_closed");
  return { agreementVoided, depositReleased, paymentAttemptsClosing, tasksCancelled };
}
async function cancelUnstartedStayTasks(tx, reservation, now, operationKey) {
  const open = await tx.propertyTask.findMany({
    where: {
      reservationId: reservation.id,
      source: "task_rule",
      status: { in: ["queued", "assigned", "blocked"] },
      NOT: { taskRule: { is: { trigger: "reservation_cancelled" } } }
    },
    select: { id: true }
  });
  if (!open.length) return 0;
  const ids = open.map((task) => task.id);
  await tx.propertyTask.updateMany({
    where: { id: { in: ids }, status: { in: ["queued", "assigned", "blocked"] } },
    data: { status: "cancelled", cancelledAt: now, completionNotes: "Cancelled automatically: the stay was cancelled or marked no-show." }
  });
  for (const id2 of ids) {
  }
  return ids.length;
}
function propertyLocalDate(timezone, now = /* @__PURE__ */ new Date()) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone || "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

// features/keystone/mutations/requestStayCancellation.ts
async function requestStayCancellation(_root, args, context) {
  if (!/^[a-f0-9]{48}$/.test(args.tripToken || "")) throw new Error("Trip link is invalid.");
  if (args.confirmCancellation !== true) throw new Error("Confirm that you want to cancel this stay.");
  if (!Number.isSafeInteger(args.expectedRefundCents) || args.expectedRefundCents < 0 || typeof args.expectedAssessmentId !== "string" || !/^[a-f0-9]{32}$/.test(args.expectedAssessmentId)) {
    throw new Error("Review the cancellation refund before confirming.");
  }
  const cancellationReason = args.reason?.trim() || "Guest requested cancellation.";
  if (cancellationReason.length > 2e3) throw new Error("Cancellation reason is too long.");
  const sudo = context.sudo();
  const reservation = await resolvePublicTokenRecord({
    token: args.tripToken,
    invalidMessage: "Trip link is invalid.",
    findRecordByHash: async (tokenHash) => {
      const reservations = await sudo.query.Reservation.findMany({
        where: { tripTokenHash: { equals: tokenHash } },
        take: 1,
        query: `
          id confirmationCode status amountPaidCents currencyCode tripTokenExpiresAt tripTokenRevokedAt
          hostOrganization { id }
          calendarBlocks { id status }
          payments(where: { status: { in: ["succeeded", "partially_refunded"] } }, orderBy: [{ createdAt: desc }]) { id amountCents refundedAmountCents }
        `
      });
      const record5 = reservations[0];
      return record5 ? { ...record5, tokenExpiresAt: record5.tripTokenExpiresAt, tokenRevokedAt: record5.tripTokenRevokedAt } : null;
    }
  });
  if (!reservation) throw new Error("Trip link is invalid or expired.");
  let closingAttempts = [];
  const cancelled = await context.prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `reservation:${reservation.id}`);
    await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', reservation.id);
    const initial = await tx.reservation.findUnique({ where: { id: reservation.id }, select: { id: true, status: true } });
    if (!initial || !["pending", "confirmed"].includes(initial.status)) throw new Error("This stay can no longer be cancelled online.");
    const paymentIds = await tx.payment.findMany({ where: { reservationId: initial.id }, orderBy: [{ id: "asc" }], select: { id: true } });
    for (const payment of paymentIds) {
      await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `payment-refund:${payment.id}`);
    }
    const pendingRefund = await tx.refund.findFirst({
      where: {
        reservationId: initial.id,
        OR: [
          { status: { in: ["pending", "processing"] } },
          { reservationAmendmentId: { not: null }, status: "failed" }
        ]
      },
      select: { id: true }
    });
    if (pendingRefund) throw new Error("Resolve pending refund obligations before cancelling this stay.");
    const locked = await tx.reservation.findUnique({ where: { id: reservation.id } });
    if (!locked || locked.tripTokenHash !== hashPublicOwnershipToken(args.tripToken) || !isPublicOwnershipTokenActive({
      tokenExpiresAt: locked.tripTokenExpiresAt,
      tokenRevokedAt: locked.tripTokenRevokedAt
    })) {
      throw new Error("Trip link is invalid or expired.");
    }
    if (!["pending", "confirmed"].includes(locked.status)) throw new Error("This stay can no longer be cancelled online.");
    const [payments, refunds] = await Promise.all([
      tx.payment.findMany({
        where: { reservationId: locked.id },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, status: true, amountCents: true, refundedAmountCents: true, currencyCode: true, provider: true, data: true }
      }),
      tx.refund.findMany({
        where: { reservationId: locked.id },
        select: { id: true, paymentId: true, status: true, amountCents: true, currencyCode: true }
      })
    ]);
    const reconciliation = reconcileReservationPaymentEvidence({ payments, refunds, currencyCode: locked.currencyCode, testMode: locked.testMode === true });
    if (reconciliation.netPaidCents !== (locked.amountPaidCents || 0)) {
      throw new Error("Reservation paid amount does not reconcile to settled payment evidence.");
    }
    const now = /* @__PURE__ */ new Date();
    const entitlement = cancellationEntitlement({
      bookingSnapshot: locked.bookingSnapshot,
      checkInDate: locked.checkInDate,
      checkOutDate: locked.checkOutDate,
      totalAmountCents: locked.totalAmountCents,
      bookedAt: locked.createdAt,
      cancelledAt: now,
      netPaidCents: reconciliation.netPaidCents
    });
    if (args.expectedAssessmentId !== entitlement.assessmentId || args.expectedRefundCents !== entitlement.refundCents) {
      const shown = entitlement.status === "unassessed" ? `Your host now reviews whether a refund is due (you\u2019ve paid ${formatCentsForMessage(entitlement.reviewCents, locked.currencyCode)})` : `The refund for cancelling now is ${formatCentsForMessage(entitlement.refundCents, locked.currencyCode)}`;
      throw new Error(`${shown}. Review it again before cancelling.`);
    }
    const consentNote = `[${now.toISOString()}] Guest confirmed cancellation from the trip link. Assessment ${entitlement.assessmentId}: ${entitlement.status === "unassessed" ? `host review of up to ${entitlement.reviewCents}` : `refund ${entitlement.refundCents}`} ${locked.currencyCode} (policy ${entitlement.policyVersion || "none"}).`;
    await tx.reservation.update({
      where: { id: locked.id },
      data: {
        status: "cancelled",
        cancelledAt: now,
        cancelledBy: "guest",
        cancellationReason,
        internalNotes: [locked.internalNotes, consentNote].filter(Boolean).join("\n")
      }
    });
    await tx.calendarBlock.updateMany({
      where: { reservationId: locked.id, status: "active" },
      data: { status: "released" }
    });
    closingAttempts = (await closeStayObligations(tx, { reservation: locked, now, operationKey: `guest-cancel:${now.toISOString()}` })).paymentAttemptsClosing;
    let refundPendingCents = 0;
    let refundReviewCents = 0;
    const review = entitlement.status === "unassessed";
    const candidateCents = review ? entitlement.reviewCents : entitlement.refundCents;
    if (candidateCents > 0) {
      const refundablePayments = payments.filter((payment) => ["succeeded", "partially_refunded", "refunded"].includes(payment.status || ""));
      const allocations = allocatePendingCancellationRefunds({
        reservationId: locked.id,
        netAmountPaidCents: reconciliation.netPaidCents,
        refundCents: candidateCents,
        payments: refundablePayments
      });
      for (const allocation of allocations) {
        await tx.refund.create({
          data: {
            hostOrganizationId: locked.hostOrganizationId,
            reservationId: locked.id,
            paymentId: allocation.paymentId,
            refundNumber: `REF-${locked.confirmationCode}-${import_node_crypto22.default.randomUUID().slice(0, 8).toUpperCase()}`,
            idempotencyKey: allocation.idempotencyKey,
            status: review ? "review" : "pending",
            reason: "guest_cancellation",
            amountCents: allocation.amountCents,
            currencyCode: locked.currencyCode,
            data: { policyReviewRequired: review, ...review ? { candidate: true } : {}, entitlement }
          }
        });
        if (review) refundReviewCents += allocation.amountCents;
        else refundPendingCents += allocation.amountCents;
      }
    }
    const paymentState = reservationPaymentStatus({
      ...reconciliation,
      totalAmountCents: locked.totalAmountCents || 0,
      openRefundCents: refundPendingCents > 0 ? reconciliation.openRefundCents + refundPendingCents : reconciliation.openRefundCents
    });
    await tx.reservation.update({ where: { id: locked.id }, data: { amountPaidCents: reconciliation.netPaidCents, paymentStatus: paymentState } });
    return { id: locked.id, confirmationCode: locked.confirmationCode, status: "cancelled", refundPendingCents, refundReviewCents, refundAssessment: entitlement.status };
  }, { maxWait: 5e3, timeout: 1e4, isolationLevel: "ReadCommitted" });
  if (closingAttempts.length) await reconcileClosingAttempts(context.prisma, closingAttempts);
  return cancelled;
}

// features/keystone/mutations/reassignStayReservation.ts
function sameAllocation(left, right) {
  return left.listingId === right.listingId && left.accommodationUnitId === right.accommodationUnitId && left.checkInDate === right.checkInDate && left.checkOutDate === right.checkOutDate;
}
async function reassignStayReservation(_root, args, context) {
  const reservationId = args.reservationId?.trim();
  const targetAccommodationUnitId = args.targetAccommodationUnitId?.trim();
  const reason = args.reason?.trim() || "";
  if (!reservationId || !targetAccommodationUnitId) throw new Error("A reservation and target accommodation unit are required.");
  if (reason.length < 3 || reason.length > 1e3) throw new Error("Provide a reassignment reason of 3 to 1000 characters.");
  const current2 = await context.prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      hostOrganizationId: true,
      listingId: true,
      accommodationUnitId: true,
      checkInDate: true,
      checkOutDate: true
    }
  });
  if (!current2?.hostOrganizationId) throw new Error("Reservation not found.");
  await assertHostOrganizationAccess({
    context,
    hostOrganizationId: current2.hostOrganizationId,
    permission: "canManageReservations"
  });
  return context.prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `reservation:${reservationId}`);
    const beforeLock = await tx.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        hostOrganizationId: true,
        listingId: true,
        accommodationUnitId: true,
        confirmationCode: true,
        status: true,
        checkInDate: true,
        checkOutDate: true,
        internalNotes: true,
        testMode: true
      }
    });
    if (beforeLock?.testMode) throw new Error("This is a test booking: it holds no unit, so it can\u2019t be reassigned.");
    if (!beforeLock?.hostOrganizationId || beforeLock.hostOrganizationId !== current2.hostOrganizationId) {
      throw new Error("Reservation not found.");
    }
    if (!sameAllocation(current2, beforeLock)) throw new Error("Reservation allocation changed; reload and retry.");
    if (!["pending", "confirmed", "in_stay"].includes(beforeLock.status || "")) {
      throw new Error("Only pending, confirmed, or in-stay reservations can be re-accommodated.");
    }
    if (beforeLock.accommodationUnitId === targetAccommodationUnitId) {
      throw new Error("The reservation is already assigned to that accommodation unit.");
    }
    const targetUnit = await tx.accommodationUnit.findUnique({
      where: { id: targetAccommodationUnitId },
      select: { id: true, hostOrganizationId: true, status: true, maxGuests: true }
    });
    if (!targetUnit || targetUnit.hostOrganizationId !== beforeLock.hostOrganizationId) {
      throw new Error("The target accommodation unit must belong to the same host organization.");
    }
    if (targetUnit.status !== "available") throw new Error("The target accommodation unit is not available for stays.");
    const party = await tx.guestParty.findFirst({ where: { reservationId }, select: { adults: true, children: true } });
    const partySize = (party?.adults ?? 0) + (party?.children ?? 0);
    if (!party || !Number.isSafeInteger(targetUnit.maxGuests) || partySize > targetUnit.maxGuests) {
      throw new Error(`The target home sleeps ${targetUnit.maxGuests ?? "an unknown number of"} guests; this stay has ${partySize}.`);
    }
    const targetListing = await tx.listing.findFirst({
      where: {
        hostOrganizationId: beforeLock.hostOrganizationId,
        accommodationUnitId: targetAccommodationUnitId,
        status: "published"
      },
      orderBy: [{ id: "asc" }],
      select: { id: true }
    });
    if (!targetListing) throw new Error("The target accommodation unit needs a published listing before reassignment.");
    await lockListingCapacity(tx, [beforeLock.listingId, targetListing.id]);
    await lockAccommodationUnitCapacity(tx, [beforeLock.accommodationUnitId, targetAccommodationUnitId]);
    const locked = await tx.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        hostOrganizationId: true,
        listingId: true,
        accommodationUnitId: true,
        confirmationCode: true,
        status: true,
        checkInDate: true,
        checkOutDate: true,
        internalNotes: true
      }
    });
    if (!locked?.hostOrganizationId || locked.hostOrganizationId !== current2.hostOrganizationId) {
      throw new Error("Reservation not found.");
    }
    if (!sameAllocation(current2, locked)) throw new Error("Reservation allocation changed; reload and retry.");
    if (!["pending", "confirmed", "in_stay"].includes(locked.status || "")) {
      throw new Error("Only pending, confirmed, or in-stay reservations can be re-accommodated.");
    }
    if (locked.accommodationUnitId === targetAccommodationUnitId) {
      throw new Error("The reservation is already assigned to that accommodation unit.");
    }
    const confirmedTargetListing = await tx.listing.findFirst({
      where: {
        id: targetListing.id,
        hostOrganizationId: locked.hostOrganizationId,
        accommodationUnitId: targetAccommodationUnitId,
        status: "published"
      },
      select: { id: true }
    });
    if (!confirmedTargetListing) throw new Error("The target accommodation unit needs a published listing before reassignment.");
    await assertAccommodationUnitAvailable(tx, {
      accommodationUnitId: targetAccommodationUnitId,
      hostOrganizationId: locked.hostOrganizationId,
      checkInDate: locked.checkInDate,
      checkOutDate: locked.checkOutDate,
      excludeReservationId: locked.id
    });
    const capacityBlocks = await tx.calendarBlock.findMany({
      where: { reservationId: locked.id, status: "active", reason: "reservation" },
      orderBy: [{ id: "asc" }],
      select: { id: true }
    });
    if (!capacityBlocks.length) throw new Error("The reservation has no active capacity block and cannot be reassigned safely.");
    const now = /* @__PURE__ */ new Date();
    const auditNote = `[${now.toISOString()}] Re-accommodated by ${context.session.itemId}: ${reason}`;
    const updated = await tx.reservation.update({
      where: { id: locked.id },
      data: {
        accommodationUnitId: targetAccommodationUnitId,
        internalNotes: [locked.internalNotes, auditNote].filter(Boolean).join("\n")
      },
      select: { id: true, confirmationCode: true, status: true, accommodationUnitId: true }
    });
    await tx.calendarBlock.updateMany({
      where: { id: { in: capacityBlocks.map((block) => block.id) } },
      data: {
        listingId: confirmedTargetListing.id,
        notes: `Re-accommodated reservation ${locked.confirmationCode}: ${reason}`
      }
    });
    return {
      id: updated.id,
      confirmationCode: updated.confirmationCode,
      status: updated.status,
      previousAccommodationUnitId: locked.accommodationUnitId,
      accommodationUnitId: updated.accommodationUnitId
    };
  }, { maxWait: 5e3, timeout: 15e3, isolationLevel: "Serializable" });
}

// features/keystone/utils/staySellability.ts
function isAccommodationUnitBookable(status) {
  return status === "available";
}
function assertAccommodationUnitBookable(status) {
  if (!isAccommodationUnitBookable(status)) {
    throw new Error("This stay is not available for booking.");
  }
}

// features/keystone/mutations/searchStays.ts
function quoteInput(listing, args) {
  const ratePlan = effectiveStayRatePlan(listing);
  const unit = listing.accommodationUnit;
  if (!ratePlan || !unit || !args.checkIn || !args.checkOut) return null;
  return calculateStayQuote(stayCalculationInput(listing, ratePlan, {
    checkIn: args.checkIn,
    checkOut: args.checkOut,
    guestCount: (args.adults ?? 1) + (args.children ?? 0),
    pets: args.pets ?? 0
  }));
}
var SEARCH_PAGE_SIZE = 250;
var MAX_SEARCH_EVIDENCE = 5e3;
function buildListingSearchWhere(args, guestCount) {
  const accommodationUnit = {
    status: { equals: "available" },
    maxGuests: { gte: guestCount }
  };
  if (args.propertyTypes?.length) accommodationUnit.accommodationType = { in: args.propertyTypes };
  if (args.bedrooms) accommodationUnit.bedroomCount = { gte: args.bedrooms };
  if (args.beds) accommodationUnit.bedCount = { gte: args.beds };
  if (args.bathroomsHalfUnits) accommodationUnit.bathroomCountHalfUnits = { gte: args.bathroomsHalfUnits };
  const where = {
    ...sellableListingWhere(),
    accommodationUnit
  };
  if (args.listingIds?.length) where.id = { in: args.listingIds };
  const collection = args.collectionSlug?.trim();
  if (collection) where.collections = { some: { slug: { equals: collection } } };
  if (args.instantBook != null) where.instantBook = { equals: args.instantBook };
  if (args.amenitySlugs?.length) {
    where.AND = args.amenitySlugs.map((slug2) => ({ amenities: { some: { slug: { equals: slug2 } } } }));
  }
  const destination = args.destination?.trim();
  if (destination) {
    where.OR = [
      { title: { contains: destination, mode: "insensitive" } },
      { subtitle: { contains: destination, mode: "insensitive" } },
      { description: { contains: destination, mode: "insensitive" } },
      { property: { address: { city: { contains: destination, mode: "insensitive" } } } },
      { property: { address: { region: { contains: destination, mode: "insensitive" } } } },
      { property: { address: { countryCode: { contains: destination, mode: "insensitive" } } } },
      { property: { address: { publicLocationLabel: { contains: destination, mode: "insensitive" } } } }
    ];
  }
  return where;
}
async function searchStays(_root, args, context) {
  const limit = Math.min(Math.max(args.limit ?? 24, 1), 100);
  const offset = Math.max(args.offset ?? 0, 0);
  const guestCount = (args.adults ?? 1) + (args.children ?? 0);
  if (guestCount < 1) throw new Error("Search requires at least one guest.");
  if (args.listingIds && (args.listingIds.length > 20 || args.listingIds.some((id2) => typeof id2 !== "string" || !id2 || id2.length > 100))) {
    throw new Error("Check up to 20 homes at a time.");
  }
  const party = { adults: args.adults ?? 1, children: args.children ?? 0, infants: args.infants ?? 0, pets: args.pets ?? 0 };
  if (Boolean(args.checkIn) !== Boolean(args.checkOut)) throw new Error("Choose both check-in and check-out dates.");
  if (args.checkIn && args.checkOut) assertStayWithinMaximum(args.checkIn, args.checkOut, null);
  if (args.checkIn) assertStayNotInPast(args.checkIn);
  const sudo = context.sudo();
  const sales = await readStorefrontSales(context.prisma);
  const listings = await readBoundedPages(
    (skip, take) => sudo.query.Listing.findMany({
      where: buildListingSearchWhere(args, guestCount),
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }, { id: "asc" }],
      take,
      skip,
      query: STAY_LISTING_SELECTION
    }),
    { pageSize: SEARCH_PAGE_SIZE, maxItems: MAX_SEARCH_EVIDENCE, label: "Stay search candidate set" }
  );
  const conflictingUnitIds = /* @__PURE__ */ new Set();
  if (args.checkIn && args.checkOut) {
    const unitIds = [...new Set(listings.map((listing) => listing.accommodationUnit?.id).filter(Boolean))];
    let blockCount = 0;
    for (let start = 0; start < unitIds.length; start += SEARCH_PAGE_SIZE) {
      const unitBatch = unitIds.slice(start, start + SEARCH_PAGE_SIZE);
      const blocks = await readBoundedPages(
        (skip, take) => sudo.query.CalendarBlock.findMany({
          where: {
            status: { equals: "active" },
            ...REAL_CAPACITY_BLOCK_FILTER,
            startDate: { lt: args.checkOut },
            endDate: { gt: args.checkIn },
            listing: { accommodationUnit: { id: { in: unitBatch } } }
          },
          orderBy: [{ startDate: "asc" }, { id: "asc" }],
          take,
          skip,
          query: "id startDate endDate listing { id accommodationUnit { id } }"
        }),
        { pageSize: SEARCH_PAGE_SIZE, maxItems: MAX_SEARCH_EVIDENCE, label: "Stay availability evidence" }
      );
      blockCount += blocks.length;
      if (blockCount > MAX_SEARCH_EVIDENCE) {
        throw new Error(`Stay availability evidence is incomplete because more than ${MAX_SEARCH_EVIDENCE} active blocks overlap. Narrow the request and retry.`);
      }
      for (const block of blocks) {
        const unitId = block.listing?.accommodationUnit?.id;
        if (unitId) conflictingUnitIds.add(unitId);
      }
    }
  }
  const matches = listings.flatMap((listing) => {
    const unit = listing.accommodationUnit;
    if (!unit || !isAccommodationUnitBookable(unit.status) || unit.maxGuests < guestCount) return [];
    if (listingSellabilityProblem(listing) || partyEligibilityProblem(listing, party)) return [];
    if (args.propertyTypes?.length && !args.propertyTypes.includes(unit.accommodationType)) return [];
    if (args.bedrooms && unit.bedroomCount < args.bedrooms) return [];
    if (args.beds && unit.bedCount < args.beds) return [];
    if (args.bathroomsHalfUnits && unit.bathroomCountHalfUnits < args.bathroomsHalfUnits) return [];
    if (args.instantBook != null && Boolean(listing.instantBook) !== args.instantBook) return [];
    const amenitySlugs = new Set((listing.amenities || []).map((amenity) => amenity.slug));
    if (args.amenitySlugs?.some((slug2) => !amenitySlugs.has(slug2))) return [];
    if (args.checkIn && args.checkOut && conflictingUnitIds.has(unit.id)) return [];
    if (args.checkIn && stayArrivalProblem(args.checkIn, listingArrivalContext(listing))) return [];
    let quote = null;
    try {
      quote = quoteInput(listing, args);
    } catch {
      return [];
    }
    if (quote && args.minTotalCents != null && quote.totalAmountCents < args.minTotalCents) return [];
    if (quote && args.maxTotalCents != null && quote.totalAmountCents > args.maxTotalCents) return [];
    const notReady = sales.open ? onlineQuoteReadinessProblem(effectiveStayRatePlan(listing), listing) : STOREFRONT_PAUSED_MESSAGE;
    return [{ ...toPublicListing(listing), quote, onlineBooking: { ready: !notReady, reason: notReady } }];
  });
  const collections = /* @__PURE__ */ new Map();
  for (const match of matches) {
    for (const item of match.collections || []) {
      if (!item?.slug) continue;
      const entry = collections.get(item.slug) || { slug: item.slug, name: item.name, count: 0 };
      entry.count += 1;
      collections.set(item.slug, entry);
    }
  }
  const page = matches.slice(offset, offset + limit);
  const stats = await genuineReviewStats(context.prisma, page.map((match) => match.id));
  return {
    totalCount: matches.length,
    offset,
    limit,
    results: page.map((match) => withGenuineReputation(match, stats)),
    collections: [...collections.values()]
  };
}

// features/keystone/mutations/signStayAgreement.ts
var import_node_crypto23 = __toESM(require("node:crypto"));
async function signStayAgreement(_root, args, context) {
  if (!/^[a-f0-9]{48}$/.test(args.token || "")) throw new Error("Agreement link is invalid.");
  if (args.acceptTerms !== true) throw new Error("Confirm that you have read and accept the stay terms before signing.");
  const signatureName = args.signatureName?.trim();
  if (!signatureName) throw new Error("Signature name is required.");
  if (signatureName.length > 200) throw new Error("Signature name is too long.");
  const agreement = await resolvePublicTokenRecord({
    token: args.token,
    invalidMessage: "Agreement link is invalid.",
    findRecordByHash: async (tokenHash) => {
      const agreements = await context.sudo().query.StayAgreement.findMany({
        where: { signingTokenHash: { equals: tokenHash } },
        take: 1,
        query: "id agreementNumber status signatureName signedAt signingTokenExpiresAt signingTokenRevokedAt"
      });
      const record5 = agreements[0];
      return record5 ? { ...record5, tokenExpiresAt: record5.signingTokenExpiresAt, tokenRevokedAt: record5.signingTokenRevokedAt } : null;
    },
    isUnavailable: (record5) => record5.status === "voided"
  });
  if (!agreement) throw new Error("Agreement link is invalid or expired.");
  return context.prisma.$transaction(async (tx) => {
    const stay = await tx.reservation.findFirst({ where: { agreementId: agreement.id }, select: { id: true } });
    if (stay) {
      await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `reservation:${stay.id}`);
      await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', stay.id);
    }
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `agreement:${agreement.id}`);
    await tx.$queryRawUnsafe('SELECT "id" FROM "StayAgreement" WHERE "id" = $1 FOR UPDATE', agreement.id);
    const locked = await tx.stayAgreement.findUnique({ where: { id: agreement.id } });
    if (!locked || locked.signingTokenHash !== hashPublicOwnershipToken(args.token) || !isPublicOwnershipTokenActive({
      tokenExpiresAt: locked.signingTokenExpiresAt,
      tokenRevokedAt: locked.signingTokenRevokedAt
    }) || locked.status === "voided") {
      throw new Error("Agreement link is invalid or expired.");
    }
    if (locked.status === "signed") return locked;
    const reservation = await tx.reservation.findFirst({ where: { agreementId: locked.id }, select: { status: true, testMode: true } });
    if (!reservation || ["cancelled", "no_show"].includes(reservation.status || "")) {
      throw new Error("This stay is no longer active, so its agreement can\u2019t be signed.");
    }
    const signedAt = /* @__PURE__ */ new Date();
    return tx.stayAgreement.update({
      where: { id: locked.id },
      data: {
        status: "signed",
        signatureName,
        signedAt,
        signatureEvidence: {
          acceptedAt: signedAt.toISOString(),
          statement: "Read the captured terms and house rules and agreed to sign with the typed name.",
          termsSnapshotSha256: import_node_crypto23.default.createHash("sha256").update(JSON.stringify(locked.termsSnapshot ?? null)).digest("hex"),
          via: "signing_link",
          // A test booking's agreement is signed as part of a simulation, not a real stay.
          ...reservation.testMode ? { simulation: true } : {}
        }
      }
    });
  }, { maxWait: 5e3, timeout: 1e4, isolationLevel: "ReadCommitted" });
}

// features/keystone/mutations/stayFinancialOperations.ts
var import_node_crypto24 = __toESM(require("node:crypto"));
function digest2(value) {
  return import_node_crypto24.default.createHash("sha256").update(value).digest("hex");
}
async function refundStayPaymentOperation(_root, args, context, testHooks = {}) {
  const payment = await context.query.Payment.findOne({ where: { id: args.paymentId }, query: "id provider hostOrganization { id } reservation { id }" });
  if (!payment?.hostOrganization?.id) throw new Error("Payment not found.");
  await assertHostOrganizationAccess({ context, hostOrganizationId: payment.hostOrganization.id, permission: "canManagePayments" });
  if (args.confirmFundsReturned !== true) throw new Error("Confirm that the external or cash refund has already been completed before reconciliation.");
  const manualEvidenceReference = args.manualEvidenceReference?.trim();
  if (!manualEvidenceReference || manualEvidenceReference.length < 3 || manualEvidenceReference.length > 250) {
    throw new Error("Provide a completion reference for the already-returned manual refund (3 to 250 characters).");
  }
  const actorUserId = context.session?.itemId;
  if (!actorUserId) throw new Error("An authenticated operator is required to attest manual refund completion.");
  if (!Number.isSafeInteger(args.amountCents) || args.amountCents <= 0) throw new Error("Refund amount must use positive integer cents.");
  const operationKey = args.operationKey?.trim();
  if (!operationKey || operationKey.length < 3 || operationKey.length > 200 || Array.from(operationKey).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) {
    throw new Error("Provide a stable refund operation key (3 to 200 characters, without control characters).");
  }
  const reason = args.reason?.trim() || "other";
  if (!["guest_cancellation", "host_cancellation", "stay_issue", "stay_amendment", "overpayment", "goodwill", "other"].includes(reason)) throw new Error("Refund reason is invalid.");
  const operationKeyHash = digest2(`${payment.id}|${operationKey}`);
  const idempotencyKey = `refund-operation:${operationKeyHash}`;
  const requestFingerprint2 = digest2(JSON.stringify({
    paymentId: payment.id,
    refundId: args.refundId || null,
    amountCents: args.amountCents,
    reason,
    manualEvidenceReference,
    actorUserId
  }));
  if (payment.provider !== "pp_system_default") throw new Error("Manual refund reconciliation is enabled only for the installed manual payment adapter.");
  return context.prisma.$transaction(async (tx) => {
    if (payment.reservation?.id) {
      await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `reservation:${payment.reservation.id}`);
      await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', payment.reservation.id);
    }
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `payment-refund:${payment.id}`);
    const locked = await tx.payment.findUnique({ where: { id: payment.id } });
    if (!locked || locked.reservationId !== (payment.reservation?.id || null)) throw new Error("Payment reservation changed during refund reconciliation.");
    const priorRefunds = await tx.refund.findMany({
      where: { paymentId: payment.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, idempotencyKey: true, status: true, data: true }
    });
    const existing = priorRefunds.find((refund2) => {
      const data = refund2.data && typeof refund2.data === "object" ? refund2.data : {};
      return refund2.idempotencyKey === idempotencyKey || data.manualReconciliation?.operationKeyHash === operationKeyHash;
    });
    if (existing) {
      const data = existing.data && typeof existing.data === "object" ? existing.data : {};
      const reconciliation = data.manualReconciliation;
      if (existing.status !== "succeeded" || reconciliation?.requestFingerprint !== requestFingerprint2) {
        throw new Error("This refund operation key was already used with different evidence or request parameters.");
      }
      return existing;
    }
    if (!["succeeded", "partially_refunded"].includes(locked.status)) {
      throw new Error("Manual refund reconciliation requires a payment recorded as succeeded or partially refunded.");
    }
    const openRefunds = await tx.refund.findMany({
      where: { paymentId: payment.id, status: { in: ["pending", "processing", "failed"] } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, amountCents: true, reason: true, status: true, idempotencyKey: true, data: true, reservationAmendmentId: true }
    });
    let liability = null;
    if (args.refundId) {
      liability = openRefunds.find((refund2) => refund2.id === args.refundId);
      if (!liability) throw new Error("The specified refund liability is not open for manual reconciliation.");
      if (liability.amountCents !== args.amountCents || liability.reason !== reason) {
        throw new Error("The specified refund liability does not match the attested amount and reason.");
      }
    } else if (openRefunds.length) {
      throw new Error("Specify the refundId of the exact open liability being reconciled.");
    }
    const otherOpenLiabilitiesCents = openRefunds.filter((refund2) => refund2.id !== liability?.id).reduce((sum, refund2) => sum + refund2.amountCents, 0);
    const remaining = locked.amountCents - locked.refundedAmountCents - otherOpenLiabilitiesCents;
    if (args.amountCents > remaining) throw new Error("Refund amount exceeds the unrefunded payment balance after other open liabilities.");
    const id2 = liability?.id || import_node_crypto24.default.randomUUID();
    const processedAt = /* @__PURE__ */ new Date();
    const priorData = liability?.data && typeof liability.data === "object" ? liability.data : {};
    const refundData = {
      status: "succeeded",
      reason,
      amountCents: args.amountCents,
      currencyCode: locked.currencyCode,
      providerRefundId: null,
      processedAt,
      data: {
        ...priorData,
        manualReconciliation: {
          kind: "operator_attestation",
          operationKeyHash,
          requestFingerprint: requestFingerprint2,
          evidenceReference: manualEvidenceReference,
          attestedByUserId: actorUserId,
          attestedAt: processedAt.toISOString(),
          ...liability ? { reconciledRefundId: liability.id, originalIdempotencyKey: liability.idempotencyKey } : {}
        },
        policyReviewRequired: false
      }
    };
    const refund = liability ? await tx.refund.update({ where: { id: id2 }, data: refundData }) : await tx.refund.create({
      data: {
        ...refundData,
        id: id2,
        idempotencyKey,
        hostOrganizationId: locked.hostOrganizationId,
        reservationId: locked.reservationId,
        paymentId: locked.id,
        refundNumber: `REF-${id2.slice(0, 8).toUpperCase()}`
      }
    });
    const refundedAmountCents = locked.refundedAmountCents + args.amountCents;
    const paymentStatus = refundedAmountCents === locked.amountCents ? "refunded" : "partially_refunded";
    await tx.payment.update({ where: { id: locked.id }, data: { refundedAmountCents, status: paymentStatus } });
    if (locked.reservationId) {
      const [reservation, payments, refunds, pendingAmendmentRefunds] = await Promise.all([
        tx.reservation.findUnique({ where: { id: locked.reservationId }, select: { totalAmountCents: true, currencyCode: true, testMode: true } }),
        tx.payment.findMany({
          where: { reservationId: locked.reservationId },
          select: { id: true, status: true, amountCents: true, refundedAmountCents: true, currencyCode: true, provider: true, data: true }
        }),
        tx.refund.findMany({
          where: { reservationId: locked.reservationId },
          select: { id: true, paymentId: true, status: true, amountCents: true, currencyCode: true }
        }),
        tx.refund.aggregate({
          where: { reservationId: locked.reservationId, reservationAmendmentId: { not: null }, status: { in: ["pending", "processing", "failed"] } },
          _sum: { amountCents: true }
        })
      ]);
      if (!reservation) throw new Error("Reservation not found while reconciling refund evidence.");
      const reconciliation = reconcileReservationPaymentEvidence({ payments, refunds, currencyCode: reservation.currencyCode, testMode: reservation.testMode === true });
      const totalAmountCents = reservation.totalAmountCents || 0;
      const refundDueCents = Math.max(reconciliation.netPaidCents - totalAmountCents, 0);
      const recordedRefundLiabilityCents = pendingAmendmentRefunds._sum.amountCents || 0;
      if (refundDueCents > recordedRefundLiabilityCents) throw new Error("Settled funds exceed the stay total without a matching amendment refund liability.");
      const paymentStatus2 = reservationPaymentStatus({ ...reconciliation, totalAmountCents });
      await tx.reservation.update({
        where: { id: locked.reservationId },
        data: { amountPaidCents: reconciliation.netPaidCents, paymentStatus: paymentStatus2 }
      });
    }
    await testHooks.afterWrites?.();
    return refund;
  }, { maxWait: 5e3, timeout: 15e3, isolationLevel: "Serializable" });
}
async function refundStayPayment(root, args, context) {
  return refundStayPaymentOperation(root, args, context);
}
var depositTransitions = {
  authorize: ["required"],
  hold: ["required", "authorized"],
  release: ["authorized", "held", "partially_captured"],
  capture: ["held", "partially_captured"],
  fail: ["required", "authorized", "held"]
};
function evidenceReference(value, label) {
  const reference = typeof value === "string" ? value.trim() : "";
  if (reference.length < 3 || reference.length > 500) throw new Error(`Enter the ${label} reference (3 to 500 characters).`);
  return reference;
}
async function transitionSecurityDeposit(_root, args, context) {
  const deposit = await context.query.SecurityDeposit.findOne({ where: { id: args.depositId }, query: "id hostOrganization { id } reservation { id }" });
  if (!deposit?.hostOrganization?.id) throw new Error("Security deposit not found.");
  await assertHostOrganizationAccess({ context, hostOrganizationId: deposit.hostOrganization.id, permission: "canManagePayments" });
  if (!depositTransitions[args.transition]) throw new Error("Unsupported security deposit transition.");
  if (args.confirmEvidence !== true) throw new Error("Confirm that this already happened with the guest or payment provider.");
  const reference = evidenceReference(args.reference, "receipt, hold or transfer");
  const actorUserId = context.session?.itemId;
  if (!actorUserId) throw new Error("Sign in to record deposit events.");
  const operationKey = typeof args.operationKey === "string" ? args.operationKey.trim() : "";
  if (operationKey.length < 8 || operationKey.length > 200) throw new Error("This deposit action is missing its submission key. Refresh and try again.");
  const amountCents = args.transition === "capture" ? args.amountCents ?? null : null;
  const fingerprint = digest2(JSON.stringify({ depositId: deposit.id, transition: args.transition, amountCents, reference }));
  return context.prisma.$transaction(async (tx) => {
    if (deposit.reservation?.id) await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `reservation:${deposit.reservation.id}`);
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `security-deposit:${deposit.id}`);
    const locked = await tx.securityDeposit.findUnique({ where: { id: deposit.id } });
    if (!locked) throw new Error("Security deposit not found.");
    const metadata = locked.metadata && typeof locked.metadata === "object" && !Array.isArray(locked.metadata) ? locked.metadata : {};
    const events = Array.isArray(metadata.events) ? metadata.events : [];
    const prior = events.find((event2) => event2?.operationKey === operationKey);
    if (prior) {
      if (prior.fingerprint !== fingerprint) throw new Error("This deposit action was already recorded with different details. Refresh to see the deposit.");
      return locked;
    }
    if (!depositTransitions[args.transition].includes(locked.status)) throw new Error(`Cannot ${args.transition} this security deposit.`);
    const now = /* @__PURE__ */ new Date();
    const data = {};
    if (args.transition === "authorize") data.status = "authorized";
    if (args.transition === "hold") {
      data.status = "held";
      data.heldAt = now;
    }
    if (args.transition === "release") {
      data.status = "released";
      data.releasedAt = now;
    }
    if (args.transition === "fail") data.status = "failed";
    if (args.transition === "capture") {
      const amount = amountCents || 0;
      if (!Number.isSafeInteger(amount) || amount <= 0 || amount > locked.amountCents - locked.capturedAmountCents) throw new Error("Deposit capture amount is invalid.");
      const capturedAmountCents = locked.capturedAmountCents + amount;
      data.capturedAmountCents = capturedAmountCents;
      data.status = capturedAmountCents === locked.amountCents ? "captured" : "partially_captured";
    }
    data.providerReference = reference;
    const event = { transition: args.transition, fromStatus: locked.status, toStatus: data.status, amountCents, reference, actorUserId, attestedAt: now.toISOString(), operationKey, fingerprint };
    data.metadata = { ...metadata, events: [...events, event] };
    const updated = await tx.securityDeposit.update({ where: { id: locked.id }, data });
    return updated;
  }, { maxWait: 5e3, timeout: 1e4, isolationLevel: "ReadCommitted" });
}
var damageClaimTransitions = {
  submit: { from: ["draft"], to: "submitted" },
  record_guest_response: { from: ["submitted"], to: "guest_response" },
  approve: { from: ["submitted", "guest_response"], to: "approved" },
  partially_approve: { from: ["submitted", "guest_response"], to: "partially_approved" },
  decline: { from: ["submitted", "guest_response"], to: "declined" },
  settle: { from: ["approved", "partially_approved"], to: "settled" }
};
async function transitionDamageClaim(_root, args, context) {
  const claim = await context.query.DamageClaim.findOne({ where: { id: args.claimId }, query: "id hostOrganization { id }" });
  if (!claim?.hostOrganization?.id) throw new Error("Damage claim not found.");
  await assertHostOrganizationAccess({ context, hostOrganizationId: claim.hostOrganization.id, permission: "canManageReservations" });
  const transition = damageClaimTransitions[args.transition];
  if (!transition) throw new Error("Unsupported damage claim transition.");
  return context.prisma.$transaction(async (tx) => {
    const initial = await tx.damageClaim.findUnique({ where: { id: claim.id }, select: { reservationId: true } });
    if (initial?.reservationId) {
      await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `reservation:${initial.reservationId}`);
      const depositIds = await tx.securityDeposit.findMany({ where: { reservation: { id: initial.reservationId } }, select: { id: true }, orderBy: [{ id: "asc" }] });
      for (const deposit of depositIds) await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `security-deposit:${deposit.id}`);
    }
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `damage-claim:${claim.id}`);
    const locked = await tx.damageClaim.findUnique({ where: { id: claim.id } });
    if (locked && locked.reservationId !== (initial?.reservationId ?? null)) throw new Error("This claim changed meanwhile. Refresh and try again.");
    if (!locked || !transition.from.includes(locked.status)) throw new Error(`Cannot ${args.transition.replaceAll("_", " ")} this damage claim.`);
    const data = { status: transition.to };
    if (args.transition === "submit") data.submittedAt = /* @__PURE__ */ new Date();
    if (["approve", "partially_approve"].includes(args.transition)) {
      const amount = args.approvedAmountCents ?? (args.transition === "approve" ? locked.claimedAmountCents : 0);
      if (!Number.isSafeInteger(amount) || amount < 0 || amount > locked.claimedAmountCents) throw new Error("Approved claim amount is invalid.");
      if (args.transition === "partially_approve" && (amount <= 0 || amount >= locked.claimedAmountCents)) throw new Error("A partial approval must be above zero and below the claimed amount.");
      data.approvedAmountCents = amount;
      data.resolvedAt = /* @__PURE__ */ new Date();
    }
    if (args.transition === "decline") {
      data.approvedAmountCents = 0;
      data.resolvedAt = /* @__PURE__ */ new Date();
    }
    if (args.transition === "settle") {
      if (args.confirmSettlement !== true) throw new Error("Confirm that the approved amount has actually been settled.");
      const method = args.settlementMethod;
      if (!["deposit_deduction", "guest_payment"].includes(method || "")) throw new Error("Choose how the claim was settled.");
      const reference = evidenceReference(args.settlementReference, "settlement");
      if (method === "deposit_deduction") {
        const deposit = await tx.securityDeposit.findFirst({ where: { reservation: { id: locked.reservationId } }, select: { id: true, capturedAmountCents: true } });
        const settledByOtherClaims = await tx.damageClaim.findMany({ where: { reservationId: locked.reservationId, status: "settled", id: { not: locked.id } }, select: { settlementEvidence: true } });
        const alreadyApplied = settledByOtherClaims.reduce((sum, other) => sum + (other.settlementEvidence?.method === "deposit_deduction" ? other.settlementEvidence.amountCents || 0 : 0), 0);
        if (!deposit || deposit.capturedAmountCents - alreadyApplied < locked.approvedAmountCents) {
          throw new Error("Record the deposit deduction for this amount before settling the claim from the deposit.");
        }
        data.settlementEvidence = { method, depositId: deposit.id, amountCents: locked.approvedAmountCents, reference, actorUserId: context.session?.itemId || null, settledAt: (/* @__PURE__ */ new Date()).toISOString() };
      } else {
        const receivedOn = typeof args.receivedOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(args.receivedOn) ? args.receivedOn : "";
        if (!receivedOn || receivedOn > (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)) throw new Error("Enter the date the guest\u2019s payment was received.");
        const custody = typeof args.custody === "string" ? args.custody.trim() : "";
        if (custody.length < 3 || custody.length > 300) throw new Error("Say where the proof of the guest\u2019s payment is kept.");
        const reused = await tx.damageClaim.findFirst({
          where: { hostOrganizationId: locked.hostOrganizationId, status: "settled", id: { not: locked.id }, settlementEvidence: { path: ["reference"], equals: reference } },
          select: { claimNumber: true }
        });
        if (reused) throw new Error(`Reference ${reference} already settles ${reused.claimNumber}. Each receipt settles one claim.`);
        data.settlementEvidence = { method, kind: "operator_attestation", amountCents: locked.approvedAmountCents, reference, receivedOn, custody, actorUserId: context.session?.itemId || null, settledAt: (/* @__PURE__ */ new Date()).toISOString(), providerVerified: false };
      }
      data.resolvedAt = /* @__PURE__ */ new Date();
    }
    const updated = await tx.damageClaim.update({ where: { id: locked.id }, data });
    return updated;
  }, { maxWait: 5e3, timeout: 1e4, isolationLevel: "ReadCommitted" });
}
async function createDamageClaim(_root, args, context) {
  const reservation = await context.query.Reservation.findOne({ where: { id: args.reservationId }, query: "id hostOrganization { id }" });
  if (!reservation?.hostOrganization?.id) throw new Error("Reservation not found.");
  await assertHostOrganizationAccess({ context, hostOrganizationId: reservation.hostOrganization.id, permission: "canManageReservations" });
  const description = args.description.trim();
  if (!description || description.length > 4e3) throw new Error("Damage description is required and must be at most 4000 characters.");
  if (!Number.isSafeInteger(args.claimedAmountCents) || args.claimedAmountCents < 0) throw new Error("Claim amount must use non-negative integer cents.");
  const id2 = import_node_crypto24.default.randomUUID();
  return context.prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `reservation:${args.reservationId}`);
    await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', args.reservationId);
    const locked = await tx.reservation.findUnique({
      where: { id: args.reservationId },
      select: { id: true, hostOrganizationId: true, status: true, listingId: true, guestId: true, currencyCode: true }
    });
    if (!locked || locked.hostOrganizationId !== reservation.hostOrganization.id) throw new Error("Reservation not found.");
    if (!["in_stay", "completed"].includes(locked.status || "")) throw new Error("Damage claims require an in-stay or completed reservation.");
    if (!locked.listingId || !locked.guestId) throw new Error("The reservation is missing its listing or guest record.");
    const currencyCode = locked.currencyCode?.trim().toUpperCase();
    if (!currencyCode || !/^[A-Z]{3}$/.test(currencyCode)) throw new Error("The reservation currency code is invalid.");
    const claim = await tx.damageClaim.create({ data: { id: id2, hostOrganizationId: locked.hostOrganizationId, reservationId: locked.id, listingId: locked.listingId, guestId: locked.guestId, claimNumber: `CLM-${id2.slice(0, 8).toUpperCase()}`, status: "draft", description, claimedAmountCents: args.claimedAmountCents, approvedAmountCents: 0, currencyCode, evidence: args.evidence || [] } });
    return claim;
  });
}

// features/keystone/mutations/quoteStay.ts
function quoteNumber() {
  return `Q-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}
async function quoteStay(_root, args, context) {
  const adults = args.adults ?? 1;
  const children = args.children ?? 0;
  const infants = args.infants ?? 0;
  const pets = args.pets ?? 0;
  for (const [label, value] of Object.entries({ adults, children, infants, pets })) {
    if (!Number.isSafeInteger(value) || value < (label === "adults" ? 1 : 0)) {
      throw new Error(`Choose a valid number of ${label}.`);
    }
  }
  assertStayWithinMaximum(args.checkIn, args.checkOut, null);
  assertStayNotInPast(args.checkIn);
  assertStorefrontSelling(await readStorefrontSales(context.prisma));
  const listing = await context.sudo().query.Listing.findOne({
    where: { id: args.listingId },
    query: STAY_LISTING_SELECTION
  });
  if (!listing || listing.status !== "published") throw new Error("This stay is not available for booking.");
  if (!listing.hostOrganization?.id || !listing.accommodationUnit?.id) throw new Error("This listing is not ready for booking.");
  assertAccommodationUnitBookable(listing.accommodationUnit.status);
  const sellability = listingSellabilityProblem(listing) || partyEligibilityProblem(listing, { adults, children, infants, pets });
  if (sellability) throw new Error(sellability);
  const overlappingBlocks = await context.sudo().query.CalendarBlock.findMany({
    where: {
      listing: { accommodationUnit: { id: { equals: listing.accommodationUnit.id } } },
      status: { equals: "active" },
      ...REAL_CAPACITY_BLOCK_FILTER,
      startDate: { lt: args.checkOut },
      endDate: { gt: args.checkIn }
    },
    orderBy: [{ startDate: "asc" }, { id: "asc" }],
    take: 1,
    query: "id"
  });
  if (overlappingBlocks.length > 0) throw new Error("This stay is unavailable for the selected dates.");
  const ratePlan = effectiveStayRatePlan(listing);
  const readiness = onlineQuoteReadinessProblem(ratePlan, listing);
  if (readiness || !ratePlan) throw new Error(readiness || "This stay does not have a published nightly rate.");
  assertStayArrivalAllowed(args.checkIn, listingArrivalContext(listing, ratePlan));
  const calculation = calculateStayQuote(stayCalculationInput(listing, ratePlan, {
    checkIn: args.checkIn,
    checkOut: args.checkOut,
    guestCount: adults + children,
    pets
  }));
  const number = quoteNumber();
  const token = createStayQuoteToken();
  const expiresAt = stayQuoteExpiry();
  const cancellationPolicy = ratePlan.cancellationPolicy;
  const quoteSnapshot = {
    listing: listingBookingSnapshot(listing),
    cancellationPolicy,
    quote: {
      ...calculation,
      quoteNumber: number,
      adults,
      children,
      infants,
      pets
    }
  };
  const publicQuoteWriteContext = context.sudo().withSession(void 0);
  const quote = await publicQuoteWriteContext.query.StayQuote.createOne({
    data: {
      hostOrganization: { connect: { id: listing.hostOrganization.id } },
      listing: { connect: { id: listing.id } },
      ...ratePlan.id ? { ratePlan: { connect: { id: ratePlan.id } } } : {},
      quoteNumber: number,
      tokenHash: hashStayQuoteToken(token),
      status: "active",
      checkInDate: args.checkIn,
      checkOutDate: args.checkOut,
      adults,
      children,
      infants,
      pets,
      currencyCode: calculation.currencyCode,
      lodgingSubtotalCents: calculation.lodgingSubtotalCents,
      feeTotalCents: calculation.feeTotalCents,
      taxTotalCents: calculation.taxTotalCents,
      securityDepositCents: calculation.securityDepositCents,
      totalAmountCents: calculation.totalAmountCents,
      quoteSnapshot,
      expiresAt: expiresAt.toISOString()
    },
    query: "id quoteNumber checkInDate checkOutDate currencyCode lodgingSubtotalCents feeTotalCents taxTotalCents securityDepositCents totalAmountCents expiresAt listing { id title slug thumbnail }"
  });
  return { ...quote, token, breakdown: calculation };
}

// features/keystone/mutations/transitionStayReservation.ts
var import_graphql3 = require("graphql");

// features/keystone/utils/hostCommandError.ts
var GENERIC_MESSAGE = "That action couldn\u2019t be completed. Refresh and try again.";
function safeHostCommandMessage(error) {
  if (!(error instanceof Error)) return GENERIC_MESSAGE;
  const record5 = error;
  if (typeof record5.type === "string" && record5.type.startsWith("Stripe")) {
    if (record5.type === "StripeConnectionError" || record5.type === "StripeAPIError") return "Stripe couldn\u2019t be reached. Try again in a moment.";
    if (record5.type === "StripeAuthenticationError" || record5.type === "StripePermissionError") return "Card refunds aren\u2019t configured for this store.";
    if (record5.code === "charge_already_refunded") return "Stripe reports this charge is already fully refunded.";
    return "Stripe declined the refund request. Check the payment in Stripe before trying again.";
  }
  if (error.constructor?.name?.startsWith("Prisma") || typeof record5.code === "string" && /^P\d{4}$/.test(record5.code)) return GENERIC_MESSAGE;
  const message = error.message?.trim();
  if (!message || message.length > 400 || /prisma|invalid `|SELECT |INSERT |UPDATE "/i.test(message)) return GENERIC_MESSAGE;
  return message;
}

// features/keystone/mutations/transitionStayReservation.ts
var transitions2 = {
  confirm: { from: ["inquiry", "quoted", "pending"], to: "confirmed" },
  check_in: { from: ["confirmed"], to: "in_stay" },
  complete: { from: ["in_stay"], to: "completed" },
  cancel: { from: ["inquiry", "quoted", "pending", "confirmed"], to: "cancelled" },
  no_show: { from: ["confirmed"], to: "no_show" },
  // Corrections for a transition recorded by mistake. Both require a reason.
  undo_check_in: { from: ["in_stay"], to: "confirmed" },
  reopen: { from: ["completed"], to: "in_stay" }
};
var corrections = ["undo_check_in", "reopen"];
async function operateStayReservation(context, args) {
  const transition = transitions2[args.transition];
  if (!transition) throw new Error(`Unsupported stay transition: ${args.transition}`);
  const transitionNote = args.note?.trim() || "";
  if (transitionNote.length > 2e3) throw new Error("Reservation note is too long.");
  if (corrections.includes(args.transition) && transitionNote.length < 3) throw new Error("Give a reason for the correction (at least 3 characters).");
  const reservation = await context.query.Reservation.findOne({
    where: { id: args.reservationId },
    query: "id confirmationCode status hostOrganization { id }"
  });
  if (!reservation?.hostOrganization?.id) throw new Error("Reservation not found.");
  await assertHostOrganizationAccess({ context, hostOrganizationId: reservation.hostOrganization.id, permission: "canManageReservations" });
  let closingAttempts = [];
  const operated = await context.prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `reservation:${reservation.id}`);
    await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', reservation.id);
    const locked = await tx.reservation.findUnique({ where: { id: reservation.id } });
    if (!locked) throw new Error("Reservation not found.");
    if (!transition.from.includes(locked.status)) {
      throw new Error(`This stay is ${String(locked.status).replace("_", " ")}, so it can\u2019t ${args.transition.replaceAll("_", " ")}. Refresh to see its current state.`);
    }
    const unit = locked.accommodationUnitId ? await tx.accommodationUnit.findUnique({ where: { id: locked.accommodationUnitId }, select: { property: { select: { timezone: true } } } }) : null;
    const listing = !unit?.property && locked.listingId ? await tx.listing.findUnique({ where: { id: locked.listingId }, select: { property: { select: { timezone: true } } } }) : null;
    const today = propertyLocalDate(unit?.property?.timezone || listing?.property?.timezone);
    const early = args.transition === "check_in" && today < locked.checkInDate || args.transition === "no_show" && today < locked.checkInDate || args.transition === "complete" && today < locked.checkOutDate;
    if (early) {
      if (!args.override || transitionNote.length < 3) {
        if (args.transition === "complete") throw new Error(`Checkout is scheduled for ${locked.checkOutDate}. To record an early departure, confirm the override and give a reason.`);
        throw new Error(`Arrival is scheduled for ${locked.checkInDate}. To record this before the arrival date, confirm the override and give a reason.`);
      }
    }
    let paymentReconciliation = null;
    let createdLiabilityCents = 0;
    if (["cancel", "no_show"].includes(args.transition)) {
      const paymentIds = await tx.payment.findMany({ where: { reservationId: locked.id }, orderBy: [{ id: "asc" }], select: { id: true } });
      for (const payment of paymentIds) {
        await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `payment-refund:${payment.id}`);
      }
      const [payments, refunds] = await Promise.all([
        tx.payment.findMany({
          where: { reservationId: locked.id },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: { id: true, status: true, amountCents: true, refundedAmountCents: true, currencyCode: true, provider: true, data: true }
        }),
        tx.refund.findMany({
          where: { reservationId: locked.id },
          select: { id: true, paymentId: true, status: true, amountCents: true, currencyCode: true }
        })
      ]);
      paymentReconciliation = reconcileReservationPaymentEvidence({ payments, refunds, currencyCode: locked.currencyCode, testMode: locked.testMode === true });
      const review = await createUncoveredRefundReviewLiabilities(tx, {
        reservation: locked,
        // Liabilities are allocated only to tender of the booking's own mode.
        payments: payments.filter((payment) => isTestTender(payment) === (locked.testMode === true)),
        refunds,
        netPaidCents: paymentReconciliation.netPaidCents,
        reason: args.transition === "cancel" ? "host_cancellation" : "stay_issue",
        liabilityType: args.transition === "cancel" ? "host_cancellation_review" : "no_show_review",
        operationPrefix: `${args.transition}-refund-review`,
        // A host cancellation owes the guest their money; a no-show depends on the policy.
        review: args.transition === "no_show"
      });
      createdLiabilityCents = review.createdCents;
    }
    if (args.transition === "reopen" && !locked.testMode) {
      const blocks = await tx.calendarBlock.findMany({
        where: { reservationId: locked.id, reason: "reservation" },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        select: { id: true, listingId: true, status: true, startDate: true, endDate: true }
      });
      const covered = blocks.some((block) => block.status === "active" && block.startDate === locked.checkInDate && block.endDate === locked.checkOutDate);
      if (!covered) {
        const block = blocks[0];
        if (!block || !locked.accommodationUnitId) throw new Error("This stay has no reservation calendar block to restore, so it can\u2019t be reopened.");
        await lockListingCapacity(tx, [block.listingId]);
        await lockAccommodationUnitCapacity(tx, [locked.accommodationUnitId]);
        const conflict = await findAccommodationUnitCapacityConflict(tx, {
          accommodationUnitId: locked.accommodationUnitId,
          hostOrganizationId: locked.hostOrganizationId,
          checkInDate: locked.checkInDate,
          checkOutDate: locked.checkOutDate,
          excludeReservationId: locked.id,
          excludeCalendarBlockId: block.id
        });
        if (conflict) throw new Error("Some of this stay\u2019s nights were booked or held after checkout, so it can\u2019t be reopened. Free those dates first.");
        await tx.calendarBlock.update({ where: { id: block.id }, data: { status: "active", startDate: locked.checkInDate, endDate: locked.checkOutDate } });
      }
    }
    const now = /* @__PURE__ */ new Date();
    const label = early ? `${args.transition} (override before scheduled date)` : args.transition;
    const note = `[${now.toISOString()}] ${label}${transitionNote ? `: ${transitionNote}` : ""}`;
    const data = {
      status: transition.to,
      internalNotes: [locked.internalNotes, note].filter(Boolean).join("\n")
    };
    if (args.transition === "check_in") data.checkedInAt = now;
    if (args.transition === "complete") data.checkedOutAt = now;
    if (args.transition === "undo_check_in") data.checkedInAt = null;
    if (args.transition === "reopen") data.checkedOutAt = null;
    if (args.transition === "cancel") {
      data.cancelledAt = now;
      data.cancelledBy = "host";
      data.cancellationReason = transitionNote || "Cancelled by host or property manager.";
    }
    if (paymentReconciliation) {
      data.amountPaidCents = paymentReconciliation.netPaidCents;
      data.paymentStatus = reservationPaymentStatus({
        ...paymentReconciliation,
        totalAmountCents: locked.totalAmountCents || 0,
        openRefundCents: paymentReconciliation.openRefundCents + createdLiabilityCents
      });
    }
    const updated = await tx.reservation.update({ where: { id: locked.id }, data });
    let releasedNights = false;
    if (["cancel", "no_show"].includes(args.transition)) {
      await tx.calendarBlock.updateMany({ where: { reservationId: locked.id, status: "active" }, data: { status: "released" } });
      closingAttempts = (await closeStayObligations(tx, { reservation: locked, now, operationKey: `${args.transition}:${now.toISOString()}` })).paymentAttemptsClosing;
    }
    if (args.transition === "complete" && early) {
      const active = await tx.calendarBlock.findMany({ where: { reservationId: locked.id, status: "active" }, select: { id: true, startDate: true, endDate: true } });
      for (const block of active) {
        if (block.endDate <= today) continue;
        if (block.startDate >= today) await tx.calendarBlock.update({ where: { id: block.id }, data: { status: "released" } });
        else await tx.calendarBlock.update({ where: { id: block.id }, data: { endDate: today } });
        releasedNights = true;
      }
    }
    if (!corrections.includes(args.transition)) {
      await createReservationTasksForTransition(tx, args.transition === "complete" && early ? { ...updated, checkOutDate: today } : updated, args.transition);
    }
    return updated;
  }, { maxWait: 5e3, timeout: 1e4, isolationLevel: "ReadCommitted" });
  if (closingAttempts.length) await reconcileClosingAttempts(context.prisma, closingAttempts);
  return operated;
}
async function transitionStayReservation(_root, args, context) {
  if (corrections.includes(args.transition)) throw new Error(`Unsupported stay transition: ${args.transition}`);
  try {
    return await operateStayReservation(context, { ...args, override: false });
  } catch (error) {
    if (error instanceof import_graphql3.GraphQLError) throw error;
    throw new import_graphql3.GraphQLError(safeHostCommandMessage(error), { extensions: { code: "STAY_TRANSITION_REFUSED" } });
  }
}

// features/keystone/mutations/guestJourneys.ts
var import_node_crypto26 = __toESM(require("node:crypto"));

// features/keystone/lib/guestMail.ts
var import_nodemailer = require("nodemailer");
var transport = (0, import_nodemailer.createTransport)({
  // @ts-ignore
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character);
}
async function sendGuestLinkEmail({ to, subject, heading, body, path, cta }) {
  const url = `${process.env.SMTP_STORE_LINK || ""}${path}`;
  const html = `
    <body style="background:#f9f9f9;">
      <table width="100%" border="0" cellspacing="20" cellpadding="0" style="background:#ffffff;max-width:600px;margin:auto;border-radius:10px;font-family:Helvetica,Arial,sans-serif;color:#444444;">
        <tr><td style="font-size:20px;font-weight:bold;">${escapeHtml(heading)}</td></tr>
        <tr><td style="font-size:16px;line-height:24px;">${escapeHtml(body)}</td></tr>
        <tr><td><a href="${escapeHtml(url)}" style="display:inline-block;padding:10px 20px;border-radius:5px;background:#2f6b4f;color:#ffffff;text-decoration:none;font-weight:bold;">${escapeHtml(cta)}</a></td></tr>
        <tr><td style="font-size:14px;line-height:20px;">Keep this link private. Anyone with it can open the page.</td></tr>
      </table>
    </body>`;
  await transport.sendMail({ to, from: process.env.SMTP_FROM, subject, html });
}

// features/keystone/lib/mailAvailability.ts
function passwordResetEmailConfigured(env = process.env) {
  return Boolean(env.SMTP_HOST?.trim() && env.SMTP_FROM?.trim() && env.SMTP_STORE_LINK?.trim());
}

// features/keystone/utils/recoveryRisk.ts
var import_node_crypto25 = __toESM(require("node:crypto"));
var WINDOW_MS = 15 * 60 * 1e3;
var NETWORK_MAX_FAILURES = 20;
var NETWORK_EMAIL_MAX_FAILURES = 5;
var MAX_TRACKED = 2e4;
var PROOF_MAX_AGE_MS = 2 * 60 * 1e3;
var UNVERIFIED_NETWORK = "unverified";
var counters = /* @__PURE__ */ new Map();
function mac(value) {
  return import_node_crypto25.default.createHmac("sha256", resolveSessionSecret()).update(value).digest("hex");
}
function verifiedRecoveryNetwork(proof, now = Date.now()) {
  if (typeof proof !== "string") return UNVERIFIED_NETWORK;
  const [network, issuedAt, signature] = proof.split(".");
  if (!/^[a-f0-9]{24}$/.test(network || "") || !/^[a-z0-9]{1,12}$/.test(issuedAt || "") || !/^[a-f0-9]{32}$/.test(signature || "")) return UNVERIFIED_NETWORK;
  const issued = parseInt(issuedAt, 36);
  if (!Number.isFinite(issued) || issued > now + 5e3 || now - issued > PROOF_MAX_AGE_MS) return UNVERIFIED_NETWORK;
  const expected = Buffer.from(mac(`recovery-network-proof:${network}:${issuedAt}`).slice(0, 32));
  const supplied = Buffer.from(signature);
  return expected.length === supplied.length && import_node_crypto25.default.timingSafeEqual(expected, supplied) ? network : UNVERIFIED_NETWORK;
}
function keyFor(kind, network, email = "") {
  return mac(`recovery-counter:${kind}:${network}:${email}`).slice(0, 32);
}
function current(key, now) {
  const entry = counters.get(key);
  return entry && entry.resetAt > now ? entry.count : 0;
}
function recoveryBraked(network, email, now = Date.now()) {
  return current(keyFor("network", network), now) >= NETWORK_MAX_FAILURES || current(keyFor("pair", network, email), now) >= NETWORK_EMAIL_MAX_FAILURES;
}
function recordRecoveryFailure(network, email, now = Date.now()) {
  if (counters.size > MAX_TRACKED) {
    for (const [key, entry] of counters) if (entry.resetAt <= now) counters.delete(key);
    if (counters.size > MAX_TRACKED) counters.clear();
  }
  for (const key of [keyFor("network", network), keyFor("pair", network, email)]) {
    const entry = counters.get(key);
    if (!entry || entry.resetAt <= now) counters.set(key, { count: 1, resetAt: now + WINDOW_MS });
    else entry.count += 1;
  }
}

// features/keystone/utils/linkDelivery.ts
var LINK_EMAIL_COOLDOWN_MS = 15 * 60 * 1e3;
var LINK_EMAIL_RETRY_AFTER_FAILURE_MS = 2 * 60 * 1e3;
function mailDefinitelyRejected(error) {
  const code = Number(error?.responseCode);
  return Number.isInteger(code) && code >= 500 && code < 600 || error?.code === "EENVELOPE";
}
function linkEmailCoolingDown(delivery, now) {
  const requestedAt = Date.parse(delivery?.requestedAt || "");
  if (!delivery || !Number.isFinite(requestedAt)) return false;
  const wait = delivery.status === "failed" ? LINK_EMAIL_RETRY_AFTER_FAILURE_MS : LINK_EMAIL_COOLDOWN_MS;
  return ["sending", "accepted", "unknown", "failed"].includes(delivery.status) && now - requestedAt < wait;
}

// features/keystone/mutations/guestJourneys.ts
var TOKEN_PATTERN2 = /^[a-f0-9]{48}$/;
var DAY_MS6 = 24 * 60 * 60 * 1e3;
var tripTopics = {
  general: "",
  arrival: "Arrival question",
  change_request: "Change request",
  deposit: "Security deposit question",
  damage_claim: "Response to damage claim",
  cancellation: "Cancellation or refund question"
};
function cleanText(value, label, max, required = true) {
  const text50 = typeof value === "string" ? value.trim() : "";
  if (required && !text50) throw new Error(`${label} is required.`);
  if (text50.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
  return text50;
}
function cleanEmail(value) {
  const email = cleanText(value, "Email", 320).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  return email;
}
function requireSessionUser(context) {
  const itemId = context.session?.itemId;
  if (!itemId || context.session?.data?.isActive !== true) throw new Error("Sign in to continue.");
  return String(itemId);
}
function tripTokenExpiry2(checkOutDate, current2) {
  const candidates = [publicTokenExpiry().getTime()];
  const checkout = (/* @__PURE__ */ new Date(`${checkOutDate}T00:00:00.000Z`)).getTime();
  if (Number.isFinite(checkout)) candidates.push(checkout + 30 * DAY_MS6);
  if (current2) {
    const existing = new Date(current2).getTime();
    if (Number.isFinite(existing)) candidates.push(existing);
  }
  return new Date(Math.max(...candidates));
}
async function resolveTrip(context, tripToken, query) {
  if (!TOKEN_PATTERN2.test(tripToken || "")) throw new Error("Trip link is invalid.");
  const reservation = await resolvePublicTokenRecord({
    token: tripToken,
    invalidMessage: "Trip link is invalid.",
    findRecordByHash: async (tokenHash) => {
      const records = await context.sudo().query.Reservation.findMany({
        where: { tripTokenHash: { equals: tokenHash } },
        take: 1,
        query: `id confirmationCode status checkInDate checkOutDate tripTokenExpiresAt tripTokenRevokedAt ${query}`
      });
      const record5 = records[0];
      return record5 ? { ...record5, tokenExpiresAt: record5.tripTokenExpiresAt, tokenRevokedAt: record5.tripTokenRevokedAt } : null;
    }
  });
  if (!reservation) throw new Error("Trip link is invalid or expired.");
  return reservation;
}
async function lockOwnedTrip(tx, reservationId, tripToken) {
  await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `reservation:${reservationId}`);
  await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', reservationId);
  const locked = await tx.reservation.findUnique({ where: { id: reservationId } });
  if (!locked || locked.tripTokenHash !== hashPublicOwnershipToken(tripToken) || !isPublicOwnershipTokenActive({ tokenExpiresAt: locked.tripTokenExpiresAt, tokenRevokedAt: locked.tripTokenRevokedAt })) {
    throw new Error("Trip link is invalid or expired.");
  }
  return locked;
}
async function rotateTripAccess(tx, reservationId) {
  const reservation = await tx.reservation.findUnique({
    where: { id: reservationId },
    select: { id: true, status: true, checkOutDate: true, tripTokenExpiresAt: true, tripTokenRevokedAt: true, agreementId: true }
  });
  if (!reservation || reservation.tripTokenRevokedAt) return null;
  const tripToken = createPublicOwnershipToken();
  await tx.reservation.update({
    where: { id: reservation.id },
    data: { tripTokenHash: hashPublicOwnershipToken(tripToken), tripTokenExpiresAt: tripTokenExpiry2(reservation.checkOutDate, reservation.tripTokenExpiresAt) }
  });
  let agreementToken = "";
  if (reservation.agreementId) {
    const agreement = await tx.stayAgreement.findUnique({ where: { id: reservation.agreementId }, select: { id: true, status: true, signingTokenRevokedAt: true } });
    const stopped = ["cancelled", "no_show"].includes(reservation.status || "");
    const readable = agreement?.status === "signed" || agreement?.status === "sent" && !stopped;
    if (agreement && readable && !agreement.signingTokenRevokedAt) {
      agreementToken = createPublicOwnershipToken();
      await tx.stayAgreement.update({
        where: { id: agreement.id },
        data: { signingTokenHash: hashPublicOwnershipToken(agreementToken), signingTokenExpiresAt: publicTokenExpiry() }
      });
    }
  }
  return { tripToken, agreementToken };
}
async function lockReservation(tx, reservationId) {
  await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `reservation:${reservationId}`);
  await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', reservationId);
}
async function reissueTripAccess(context, reservationId) {
  return context.prisma.$transaction(async (tx) => {
    await lockReservation(tx, reservationId);
    return rotateTripAccess(tx, reservationId);
  }, { maxWait: 5e3, timeout: 1e4 });
}
async function emailTripLink(context, reservationId, to, code) {
  const now = /* @__PURE__ */ new Date();
  const attemptId = import_node_crypto26.default.randomUUID();
  const access = await context.prisma.$transaction(async (tx) => {
    await lockReservation(tx, reservationId);
    const locked = await tx.reservation.findUnique({ where: { id: reservationId }, select: { tripLinkDelivery: true } });
    if (linkEmailCoolingDown(locked?.tripLinkDelivery, now.getTime())) return null;
    const rotated = await rotateTripAccess(tx, reservationId);
    if (!rotated) return null;
    await tx.reservation.update({
      where: { id: reservationId },
      data: { tripLinkDelivery: { attemptId, purpose: "trip_recovery", channel: "email", status: "sending", requestedAt: now.toISOString() } }
    });
    return rotated;
  }, { maxWait: 5e3, timeout: 1e4 });
  if (!access) return;
  let status = "accepted";
  try {
    await sendGuestLinkEmail({
      to,
      subject: `Your trip ${code}`,
      heading: "Here\u2019s your trip link",
      body: `Someone asked for the private link to trip ${code}. If it was you, open your trip below. Older links no longer work.`,
      path: `/trips/${access.tripToken}${access.agreementToken ? `?agreement=${access.agreementToken}` : ""}`,
      cta: "Open your trip"
    });
  } catch (error) {
    status = mailDefinitelyRejected(error) ? "failed" : "unknown";
  }
  await context.prisma.$transaction(async (tx) => {
    await lockReservation(tx, reservationId);
    const locked = await tx.reservation.findUnique({ where: { id: reservationId }, select: { tripLinkDelivery: true } });
    const delivery = locked?.tripLinkDelivery;
    if (!delivery || delivery.attemptId !== attemptId) return;
    await tx.reservation.update({ where: { id: reservationId }, data: { tripLinkDelivery: { ...delivery, status, settledAt: (/* @__PURE__ */ new Date()).toISOString() } } });
  }, { maxWait: 5e3, timeout: 1e4 }).catch(() => void 0);
}
async function submitGuestInquiry(_root, args, context) {
  const name = cleanText(args.name, "Your name", 200);
  const email = cleanEmail(args.email);
  const body = cleanGuestMessage(args.message);
  const slug2 = cleanText(args.listingSlug, "Home", 200, false);
  if (!slug2) return { ok: false, reason: "choose_listing" };
  const listing = (await context.sudo().query.Listing.findMany({
    where: { ...sellableListingWhere(), slug: { equals: slug2 } },
    take: 1,
    query: "id title hostOrganization { id } property { id }"
  }))[0];
  if (!listing?.hostOrganization?.id) return { ok: false, reason: "listing_unavailable" };
  const hostOrganizationId = listing.hostOrganization.id;
  const token = createPublicOwnershipToken();
  const now = /* @__PURE__ */ new Date();
  const written = await context.prisma.$transaction(async (tx) => {
    await tx.$queryRawUnsafe('SELECT "id" FROM "HostOrganization" WHERE "id" = $1 FOR SHARE', hostOrganizationId);
    await tx.$queryRawUnsafe('SELECT "id" FROM "Listing" WHERE "id" = $1 FOR SHARE', listing.id);
    if (listing.property?.id) await tx.$queryRawUnsafe('SELECT "id" FROM "Property" WHERE "id" = $1 FOR SHARE', listing.property.id);
    const [host, current2, property] = await Promise.all([
      tx.hostOrganization.findUnique({ where: { id: hostOrganizationId }, select: { id: true, isPublic: true, status: true } }),
      tx.listing.findUnique({ where: { id: listing.id }, select: { status: true, hostOrganizationId: true, propertyId: true } }),
      listing.property?.id ? tx.property.findUnique({ where: { id: listing.property.id }, select: { status: true } }) : null
    ]);
    if (!host || host.isPublic !== true || ["suspended", "archived"].includes(host.status || "") || current2?.status !== "published" || current2.hostOrganizationId !== hostOrganizationId || current2.propertyId !== (listing.property?.id || null) || property?.status !== "active") return false;
    const guest = await createIsolatedUnverifiedBookingGuest(tx, { hostOrganizationId, name, email, phone: "" });
    const conversation = await tx.conversation.create({
      data: {
        hostOrganizationId,
        listingId: listing.id,
        guestId: guest.id,
        subject: `Question about ${listing.title}`.slice(0, 200),
        status: "open",
        guestEmail: email,
        guestAccessTokenHash: hashPublicOwnershipToken(token),
        guestAccessTokenExpiresAt: publicTokenExpiry(now),
        lastMessageAt: now
      }
    });
    await appendGuestMessage(tx, { conversationId: conversation.id, hostOrganizationId, body, now });
    return true;
  });
  if (!written) return { ok: false, reason: "listing_unavailable" };
  return { ok: true, threadToken: token };
}
async function findGuestThread(context, token, messagesBefore) {
  if (!TOKEN_PATTERN2.test(token || "")) throw new Error("Message link is invalid.");
  return context.prisma.$transaction(async (tx) => {
    const thread = await tx.conversation.findUnique({
      where: { guestAccessTokenHash: hashPublicOwnershipToken(token) },
      select: {
        id: true,
        subject: true,
        status: true,
        createdAt: true,
        guestAccessTokenExpiresAt: true,
        guestAccessTokenRevokedAt: true,
        hostOrganization: { select: { id: true, name: true } },
        listing: { select: { title: true, slug: true, status: true } },
        messages: {
          where: guestVisibleMessagePrismaWhere(messagesBefore),
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: GUEST_THREAD_PAGE_SIZE + 1,
          select: { id: true, direction: true, senderType: true, body: true, status: true, sentAt: true, receivedAt: true, createdAt: true }
        }
      }
    });
    if (!thread || !isPublicOwnershipTokenActive({ tokenExpiresAt: thread.guestAccessTokenExpiresAt, tokenRevokedAt: thread.guestAccessTokenRevokedAt })) return null;
    return thread;
  }, { isolationLevel: "RepeatableRead", maxWait: 5e3, timeout: 1e4 });
}
async function publicGuestThread(_root, args, context) {
  const thread = await findGuestThread(context, args.token, guestThreadCursor(args.messagesBefore));
  if (!thread) return null;
  const page = guestThreadPage(thread.messages);
  return {
    subject: thread.subject,
    status: thread.status,
    startedAt: thread.createdAt,
    hostName: thread.hostOrganization?.name || null,
    listing: thread.listing?.status === "published" ? { title: thread.listing.title, slug: thread.listing.slug } : null,
    messages: page.messages,
    earlierMessagesBefore: page.earlierMessagesBefore
  };
}
async function replyToGuestThread(_root, args, context) {
  const body = cleanGuestMessage(args.message);
  const thread = await findGuestThread(context, args.token);
  if (!thread?.hostOrganization?.id) throw new Error("Message link is invalid.");
  await context.prisma.$transaction(async (tx) => {
    await tx.$queryRawUnsafe('SELECT "id" FROM "Conversation" WHERE "id" = $1 FOR UPDATE', thread.id);
    const locked = await tx.conversation.findUnique({ where: { id: thread.id }, select: { guestAccessTokenHash: true, guestAccessTokenExpiresAt: true, guestAccessTokenRevokedAt: true } });
    if (!locked || locked.guestAccessTokenHash !== hashPublicOwnershipToken(args.token) || !isPublicOwnershipTokenActive({ tokenExpiresAt: locked.guestAccessTokenExpiresAt, tokenRevokedAt: locked.guestAccessTokenRevokedAt })) {
      throw new Error("Message link is invalid or expired.");
    }
    const now = /* @__PURE__ */ new Date();
    await appendGuestMessage(tx, { conversationId: thread.id, hostOrganizationId: thread.hostOrganization.id, body, now });
    await tx.conversation.update({ where: { id: thread.id }, data: { guestAccessTokenExpiresAt: publicTokenExpiry(now) } });
  });
  return { ok: true };
}
async function sendTripMessage(_root, args, context) {
  const topic = args.topic || "general";
  if (!(topic in tripTopics)) throw new Error("Choose a message topic.");
  const message = cleanGuestMessage(args.message);
  const body = tripTopics[topic] ? `${tripTopics[topic]}

${message}` : message;
  const reservation = await resolveTrip(context, args.tripToken, "hostOrganization { id } listing { id } guest { id email } bookingSnapshot");
  if (!reservation.hostOrganization?.id) throw new Error("Trip link is invalid.");
  const guestEmail = String(reservation.bookingSnapshot?.guestParty?.primaryGuest?.email || reservation.guest?.email || "").slice(0, 320);
  await context.prisma.$transaction(async (tx) => {
    await lockOwnedTrip(tx, reservation.id, args.tripToken);
    const conversation = await tx.conversation.upsert({
      where: { reservationId: reservation.id },
      create: {
        hostOrganizationId: reservation.hostOrganization.id,
        reservationId: reservation.id,
        listingId: reservation.listing?.id || null,
        guestId: reservation.guest?.id || null,
        subject: `Trip ${reservation.confirmationCode}`,
        status: "open",
        guestEmail
      },
      update: {}
    });
    await appendGuestMessage(tx, { conversationId: conversation.id, hostOrganizationId: reservation.hostOrganization.id, body });
  });
  return { ok: true };
}
function rating(value, label, required = false) {
  if (value === null || value === void 0) {
    if (required) throw new Error(`${label} rating is required.`);
    return null;
  }
  if (!Number.isSafeInteger(value) || value < 1 || value > 5) throw new Error(`${label} rating must be between 1 and 5.`);
  return value;
}
async function submitStayReview(_root, args, context) {
  const ratings = {
    overallRating: rating(args.overallRating, "Overall", true),
    cleanlinessRating: rating(args.cleanlinessRating, "Cleanliness"),
    accuracyRating: rating(args.accuracyRating, "Accuracy"),
    communicationRating: rating(args.communicationRating, "Communication"),
    locationRating: rating(args.locationRating, "Location"),
    valueRating: rating(args.valueRating, "Value")
  };
  const body = cleanText(args.body, "Review", 4e3, false);
  const privateFeedback = cleanText(args.privateFeedback, "Private note", 2e3, false);
  const reservation = await resolveTrip(context, args.tripToken, "hostOrganization { id } listing { id } guest { id } bookedBy { id }");
  if (reservation.status !== "completed" || !reservation.hostOrganization?.id || !reservation.listing?.id) return { ok: false, reason: "not_eligible" };
  return context.prisma.$transaction(async (tx) => {
    const locked = await lockOwnedTrip(tx, reservation.id, args.tripToken);
    if (locked.status !== "completed") return { ok: false, reason: "not_eligible" };
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `review:${reservation.id}`);
    const existing = await tx.review.findFirst({ where: { reservationId: reservation.id, direction: "guest_to_host" }, select: { id: true } });
    if (existing) return { ok: false, reason: "exists" };
    const review = await tx.review.create({
      data: {
        hostOrganizationId: reservation.hostOrganization.id,
        reservationId: reservation.id,
        listingId: reservation.listing.id,
        guestId: reservation.guest?.id || null,
        authorUserId: reservation.bookedBy?.id || null,
        direction: "guest_to_host",
        status: "submitted",
        ...ratings,
        body,
        privateFeedback,
        submittedAt: /* @__PURE__ */ new Date()
      }
    });
    return { ok: true, status: review.status, submittedAt: review.submittedAt };
  });
}
async function registerGuestAccount(_root, args, context) {
  const name = cleanText(args.name, "Name", 200);
  const email = cleanEmail(args.email);
  const password2 = typeof args.password === "string" ? args.password : "";
  if (password2.length < 10 || password2.length > 200) throw new Error("Use a password of 10 to 200 characters.");
  const sales = await readStorefrontSales(context.prisma);
  const accepted = typeof args.acceptedTermsOfUseVersion === "string" ? args.acceptedTermsOfUseVersion.trim() : "";
  const shown = typeof args.privacyNoticeVersion === "string" ? args.privacyNoticeVersion.trim() : "";
  if (sales.termsOfUse && accepted !== sales.termsOfUse.version) return { ok: false, reason: "terms_changed" };
  if (sales.privacyPolicy && shown !== sales.privacyPolicy.version) return { ok: false, reason: "terms_changed" };
  const existing = await context.prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { ok: false, reason: "exists" };
  const registrationEvidence = {
    recordedAt: (/* @__PURE__ */ new Date()).toISOString(),
    termsOfUse: sales.termsOfUse ? { status: "accepted", url: sales.termsOfUse.url, version: sales.termsOfUse.version } : { status: "not_published" },
    privacyNotice: sales.privacyPolicy ? { status: "shown", url: sales.privacyPolicy.url, version: sales.privacyPolicy.version } : { status: "not_published" },
    // Registration never asks for marketing consent, so none is recorded as given.
    marketing: { optedIn: false, asked: false }
  };
  await context.sudo().query.User.createOne({ data: { name, email, password: password2, registrationEvidence }, query: "id" });
  return { ok: true };
}
var ACCOUNT_TRIPS_PAGE_SIZE = 20;
async function myGuestAccount(_root, args, context) {
  const itemId = context.session?.itemId;
  if (!itemId || context.session?.data?.isActive !== true) return null;
  const sudo = context.sudo();
  const user = await sudo.query.User.findOne({ where: { id: String(itemId) }, query: "id name email phone isActive role { id canAccessDashboard }" });
  if (!user || user.isActive !== true) return null;
  const staffLinks = await context.prisma.user.findUnique({
    where: { id: user.id },
    select: { hostMemberships: { select: { id: true }, take: 1 }, from_PropertyOwner_user: { select: { id: true }, take: 1 } }
  });
  const staffCredential = Boolean(user.role?.id || staffLinks?.hostMemberships?.length || staffLinks?.from_PropertyOwner_user?.length);
  const offset = Number.isSafeInteger(args?.tripsOffset) && args.tripsOffset > 0 ? args.tripsOffset : 0;
  const where = { bookedBy: { id: { equals: user.id } } };
  const [trips, tripsTotal] = await Promise.all([
    sudo.query.Reservation.findMany({
      where,
      orderBy: [{ checkInDate: "desc" }, { id: "desc" }],
      skip: offset,
      take: ACCOUNT_TRIPS_PAGE_SIZE,
      query: "confirmationCode status paymentStatus checkInDate checkOutDate totalAmountCents amountPaidCents currencyCode testMode bookingSnapshot listing { slug status } accommodationUnit { property { timezone checkOutBy } }"
    }),
    sudo.query.Reservation.count({ where })
  ]);
  return {
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    hasHostAccess: Boolean(user.role?.canAccessDashboard),
    staffCredential,
    tripsOffset: offset,
    tripsPageSize: ACCOUNT_TRIPS_PAGE_SIZE,
    tripsTotal,
    trips: trips.map((trip) => {
      const booked = trip.bookingSnapshot?.listing || {};
      const property = trip.accommodationUnit?.property || booked.property || {};
      const timeZoneKnown = Boolean(property.timezone);
      const checkoutAt = timeZoneKnown && property.checkOutBy ? zonedLocalTimestamp(trip.checkOutDate, property.checkOutBy, property.timezone) : null;
      const localToday = timeZoneKnown ? zonedTodayIso(property.timezone) : null;
      const checkoutPassed = checkoutAt !== null ? Date.now() >= checkoutAt : localToday ? trip.checkOutDate < localToday : trip.checkOutDate < new Date(Date.now() - 12 * 60 * 60 * 1e3).toISOString().slice(0, 10);
      return {
        checkoutPassed,
        checkoutTimeKnown: checkoutAt !== null,
        timeZone: property.timezone || null,
        checkOutBy: property.checkOutBy || null,
        confirmationCode: trip.confirmationCode,
        status: trip.status,
        paymentStatus: trip.paymentStatus,
        checkInDate: trip.checkInDate,
        checkOutDate: trip.checkOutDate,
        totalAmountCents: trip.totalAmountCents,
        amountPaidCents: trip.amountPaidCents,
        currencyCode: trip.currencyCode,
        testMode: trip.testMode === true,
        listing: {
          title: booked.title || "Your stay",
          thumbnail: booked.thumbnail || booked.media?.[0]?.url || null,
          bookAgainSlug: trip.listing?.status === "published" ? trip.listing.slug : null
        }
      };
    })
  };
}
async function updateMyGuestProfile(_root, args, context) {
  const itemId = requireSessionUser(context);
  const name = cleanText(args.name, "Name", 200);
  const phone = cleanText(args.phone, "Phone", 64, false);
  await context.sudo().db.User.updateOne({ where: { id: itemId }, data: { name, phone } });
  return { ok: true };
}
function passwordSecretField(context) {
  const impl = context.graphql.schema.getType("User")?.getFields?.()?.password?.extensions?.keystoneSecretField;
  if (typeof impl?.compare !== "function" || typeof impl?.generateHash !== "function") throw new Error("Password change is unavailable right now.");
  return impl;
}
async function changeGuestEmail(_root, _args, context) {
  requireSessionUser(context);
  return { ok: false, reason: "held" };
}
async function changeGuestPassword(_root, args, context) {
  const itemId = requireSessionUser(context);
  const newPassword = typeof args.newPassword === "string" ? args.newPassword : "";
  if (newPassword.length < 10 || newPassword.length > 200) throw new Error("Use a password of 10 to 200 characters.");
  if (newPassword !== args.confirmPassword) return { ok: false, reason: "mismatch" };
  const currentPassword = typeof args.currentPassword === "string" ? args.currentPassword : "";
  if (!currentPassword) return { ok: false, reason: "wrong_password" };
  const secret = passwordSecretField(context);
  const newHash = await secret.generateHash(newPassword);
  return context.prisma.$transaction(async (tx) => {
    await tx.$queryRawUnsafe('SELECT "id" FROM "User" WHERE "id" = $1 FOR UPDATE', itemId);
    const user = await tx.user.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        password: true,
        isActive: true,
        roleId: true,
        hostMemberships: { select: { id: true }, take: 1 },
        from_PropertyOwner_user: { select: { id: true }, take: 1 }
      }
    });
    if (!user || user.id !== itemId || user.isActive !== true) throw new Error("Sign in to continue.");
    if (user.roleId || user.hostMemberships.length || user.from_PropertyOwner_user.length) return { ok: false, reason: "staff_account" };
    if (!user.password || !await secret.compare(currentPassword, user.password)) return { ok: false, reason: "wrong_password" };
    await tx.user.update({ where: { id: itemId }, data: { password: newHash } });
    return { ok: true };
  }, { maxWait: 5e3, timeout: 1e4 });
}
async function openAccountTrip(_root, args, context) {
  const itemId = requireSessionUser(context);
  const code = cleanText(args.confirmationCode, "Confirmation code", 64).toUpperCase();
  const matches = await context.sudo().query.Reservation.findMany({
    where: { confirmationCode: { equals: code }, bookedBy: { id: { equals: itemId } } },
    take: 1,
    query: "id"
  });
  if (!matches[0]) return { ok: false, reason: "not_found" };
  const access = await reissueTripAccess(context, matches[0].id);
  return access ? { ok: true, ...access } : { ok: false, reason: "revoked" };
}
async function recoverStayTrip(_root, args, context) {
  const code = cleanText(args.confirmationCode, "Confirmation code", 64).toUpperCase();
  const email = cleanEmail(args.email);
  const network = verifiedRecoveryNetwork(args.networkProof);
  const braked = recoveryBraked(network, email);
  if (braked && !passwordResetEmailConfigured()) return { ok: false, reason: "rate_limited" };
  const matches = await context.sudo().query.Reservation.findMany({
    where: { confirmationCode: { equals: code } },
    take: 1,
    query: "id bookingSnapshot guest { email } bookedBy { id }"
  });
  const reservation = matches[0];
  const bookingEmail = String(reservation?.bookingSnapshot?.guestParty?.primaryGuest?.email || reservation?.guest?.email || "").trim().toLowerCase();
  const expected = Buffer.from(bookingEmail);
  const supplied = Buffer.from(email);
  const matched = Boolean(reservation && bookingEmail && expected.length === supplied.length && import_node_crypto26.default.timingSafeEqual(expected, supplied));
  if (!matched) {
    recordRecoveryFailure(network, email);
    return braked ? { ok: false, reason: "emailed_if_match" } : { ok: false, reason: "no_match" };
  }
  if (braked) {
    await emailTripLink(context, reservation.id, bookingEmail, code);
    return { ok: false, reason: "emailed_if_match" };
  }
  const access = await reissueTripAccess(context, reservation.id);
  if (!access) return { ok: false, reason: "revoked" };
  let addedToAccount = false;
  const itemId = context.session?.itemId;
  if (args.addToAccount && itemId && context.session?.data?.isActive === true) {
    const linked = await context.prisma.reservation.updateMany({ where: { id: reservation.id, bookedById: null }, data: { bookedById: String(itemId) } });
    addedToAccount = linked.count === 1 || reservation.bookedBy?.id === String(itemId);
  }
  return { ok: true, ...access, addedToAccount };
}
async function claimStayTrip(_root, args, context) {
  const itemId = requireSessionUser(context);
  const reservation = await resolveTrip(context, args.tripToken, "bookedBy { id }");
  if (reservation.bookedBy?.id === itemId) return { ok: true };
  if (reservation.bookedBy?.id) return { ok: false, reason: "other_account" };
  return context.prisma.$transaction(async (tx) => {
    const locked = await lockOwnedTrip(tx, reservation.id, args.tripToken);
    if (locked.bookedById === itemId) return { ok: true };
    if (locked.bookedById) return { ok: false, reason: "other_account" };
    await tx.reservation.update({ where: { id: locked.id }, data: { bookedById: itemId } });
    return { ok: true };
  });
}
var guestJourneyTypeDefs = String.raw`
  type Query {
    publicGuestThread(token: String!, messagesBefore: String): JSON
    myGuestAccount(tripsOffset: Int): JSON
    guestPasswordResetAvailable: Boolean!
  }

  type Mutation {
    submitGuestInquiry(name: String!, email: String!, message: String!, listingSlug: String): JSON!
    replyToGuestThread(token: String!, message: String!): JSON!
    sendTripMessage(tripToken: String!, topic: String, message: String!): JSON!
    submitStayReview(
      tripToken: String!
      overallRating: Int!
      cleanlinessRating: Int
      accuracyRating: Int
      communicationRating: Int
      locationRating: Int
      valueRating: Int
      body: String
      privateFeedback: String
    ): JSON!
    registerGuestAccount(name: String!, email: String!, password: String!, acceptedTermsOfUseVersion: String, privacyNoticeVersion: String): JSON!
    openAccountTrip(confirmationCode: String!): JSON!
    recoverStayTrip(confirmationCode: String!, email: String!, addToAccount: Boolean, networkProof: String): JSON!
    claimStayTrip(tripToken: String!): JSON!
    updateMyGuestProfile(name: String!, phone: String): JSON!
    changeGuestEmail(email: String!, currentPassword: String!): JSON!
    changeGuestPassword(currentPassword: String!, newPassword: String!, confirmPassword: String!): JSON!
  }
`;
var guestJourneyResolvers = {
  Query: {
    publicGuestThread,
    myGuestAccount,
    guestPasswordResetAvailable: () => passwordResetEmailConfigured()
  },
  Mutation: {
    submitGuestInquiry,
    replyToGuestThread,
    sendTripMessage,
    submitStayReview,
    registerGuestAccount,
    openAccountTrip,
    recoverStayTrip,
    claimStayTrip,
    updateMyGuestProfile,
    changeGuestEmail,
    changeGuestPassword
  }
};

// features/keystone/mutations/hostLifecycle.ts
var import_node_crypto28 = __toESM(require("node:crypto"));

// features/keystone/mutations/stayRefundOperations.ts
var import_node_crypto27 = __toESM(require("node:crypto"));

// features/keystone/utils/refundGuards.ts
function uncoveredExcessCents({ netPaidCents, totalAmountCents, openRefundCents, currentOpenCents, newAmountCents, restoredCreditCents }) {
  const openAfter = openRefundCents - currentOpenCents + newAmountCents;
  const excess = netPaidCents - (totalAmountCents + restoredCreditCents);
  return excess > 0 && openAfter < excess ? excess - openAfter : 0;
}

// features/keystone/mutations/stayRefundOperations.ts
var transactionOptions3 = { maxWait: 5e3, timeout: 15e3, isolationLevel: "ReadCommitted" };
var openRefundStatuses2 = ["pending", "processing", "failed"];
var hostRefundReasons = ["goodwill", "stay_issue", "overpayment"];
function record4(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
async function lockPaymentScope(tx, payment) {
  if (payment.reservationId) {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `reservation:${payment.reservationId}`);
    await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', payment.reservationId);
  }
  await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `payment-refund:${payment.id}`);
}
async function reconcileReservationLedger(tx, reservationId) {
  if (!reservationId) return;
  const [reservation, payments, refunds] = await Promise.all([
    tx.reservation.findUnique({ where: { id: reservationId }, select: { id: true, totalAmountCents: true, currencyCode: true, testMode: true } }),
    tx.payment.findMany({ where: { reservationId }, select: { id: true, status: true, amountCents: true, refundedAmountCents: true, currencyCode: true, provider: true, data: true } }),
    tx.refund.findMany({ where: { reservationId }, select: { id: true, paymentId: true, status: true, amountCents: true, currencyCode: true } })
  ]);
  if (!reservation) return;
  const reconciliation = reconcileReservationPaymentEvidence({ payments, refunds, currencyCode: reservation.currencyCode, testMode: reservation.testMode === true });
  await tx.reservation.update({
    where: { id: reservationId },
    data: {
      amountPaidCents: reconciliation.netPaidCents,
      paymentStatus: reservationPaymentStatus({ ...reconciliation, totalAmountCents: reservation.totalAmountCents || 0 })
    }
  });
}
async function loadRefundForHost(context, refundId) {
  const refund = await context.prisma.refund.findUnique({ where: { id: refundId }, select: { id: true, hostOrganizationId: true, paymentId: true, reservationId: true } });
  if (!refund?.hostOrganizationId || !refund.paymentId) throw new Error("Refund not found.");
  await assertHostOrganizationAccess({ context, hostOrganizationId: refund.hostOrganizationId, permission: "canManagePayments" });
  const payment = await context.prisma.payment.findUnique({ where: { id: refund.paymentId } });
  if (!payment || payment.hostOrganizationId !== refund.hostOrganizationId) throw new Error("The refund\u2019s payment could not be found.");
  return { refund, payment };
}
function assertRefundAmount(locked, payment, otherOpenCents, amountCents) {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error("Refund amount must be more than zero.");
  if (amountCents > locked.amountCents) throw new Error("A refund can be reduced under the cancellation policy, not increased. Issue a separate refund for more.");
  const remaining = payment.amountCents - payment.refundedAmountCents - otherOpenCents;
  if (amountCents > remaining) throw new Error("That amount is more than remains refundable on this payment.");
}
function concessionRestoreCents(refund, newAmountCents) {
  return record4(refund?.data).totalAdjustment ? Math.max((refund.amountCents || 0) - newAmountCents, 0) : 0;
}
var ORIGIN_OWED_REASONS = ["stay_amendment", "overpayment"];
var ORIGIN_OWED_LIABILITIES = ["reservation_amendment", "overpayment_review"];
async function assertExcessFundsCovered(tx, reservationId, refundId, newAmountCents) {
  if (!reservationId) return;
  const reservation = await tx.reservation.findUnique({ where: { id: reservationId }, select: { status: true, totalAmountCents: true, currencyCode: true, testMode: true } });
  if (!reservation) return;
  if (["cancelled", "no_show"].includes(reservation.status || "")) {
    const current3 = await tx.refund.findUnique({ where: { id: refundId }, select: { amountCents: true, reason: true, data: true } });
    const owedByOrigin = current3 && (ORIGIN_OWED_REASONS.includes(current3.reason || "") || ORIGIN_OWED_LIABILITIES.includes(record4(current3.data).liabilityType));
    if (owedByOrigin && newAmountCents < current3.amountCents) {
      throw new Error("This refund returns money an amendment or overpayment made owed; closing the stay doesn\u2019t cancel it. Issue it, or record a separate, justified adjustment.");
    }
    return;
  }
  const [payments, refunds] = await Promise.all([
    tx.payment.findMany({ where: { reservationId }, select: { id: true, status: true, amountCents: true, refundedAmountCents: true, currencyCode: true, provider: true, data: true } }),
    tx.refund.findMany({ where: { reservationId }, select: { id: true, paymentId: true, status: true, amountCents: true, currencyCode: true } })
  ]);
  const evidence = reconcileReservationPaymentEvidence({ payments, refunds, currencyCode: reservation.currencyCode, testMode: reservation.testMode === true });
  const current2 = refunds.find((item) => item.id === refundId);
  const currentRefund = await tx.refund.findUnique({ where: { id: refundId }, select: { amountCents: true, data: true } });
  const uncovered = uncoveredExcessCents({
    netPaidCents: evidence.netPaidCents,
    totalAmountCents: reservation.totalAmountCents || 0,
    openRefundCents: evidence.openRefundCents,
    currentOpenCents: current2 && openRefundStatuses2.includes(current2.status) ? current2.amountCents : 0,
    newAmountCents,
    restoredCreditCents: concessionRestoreCents(currentRefund, newAmountCents)
  });
  if (uncovered > 0) {
    throw new Error("This refund covers money held above the stay\u2019s total, so it can\u2019t be declined or reduced. Change the stay total first, or issue the refund.");
  }
}
async function reverseConcessionCredit(tx, locked, newAmountCents, actorUserId) {
  const data = record4(locked.data);
  if (!data.totalAdjustment || !locked.reservationId) return data;
  const reversedCents = locked.amountCents - newAmountCents;
  if (reversedCents <= 0) return data;
  const reservation = await tx.reservation.findUnique({ where: { id: locked.reservationId }, select: { totalAmountCents: true, discountTotalCents: true } });
  if (!reservation) return data;
  await tx.reservation.update({
    where: { id: locked.reservationId },
    data: {
      totalAmountCents: (reservation.totalAmountCents || 0) + reversedCents,
      discountTotalCents: Math.max((reservation.discountTotalCents || 0) - reversedCents, 0)
    }
  });
  return {
    ...data,
    creditReversals: [...Array.isArray(data.creditReversals) ? data.creditReversals : [], {
      reversedCents,
      previousTotalCents: reservation.totalAmountCents,
      adjustedTotalCents: (reservation.totalAmountCents || 0) + reversedCents,
      byUserId: actorUserId,
      at: (/* @__PURE__ */ new Date()).toISOString()
    }]
  };
}
async function applyPolicyAdjustment(tx, locked, payment, amountCents, note, actorUserId) {
  if (amountCents === locked.amountCents) return locked;
  if (note.length < 3) throw new Error("Explain why less than the full amount is refunded (at least 3 characters).");
  const otherOpen = await tx.refund.aggregate({ where: { paymentId: payment.id, id: { not: locked.id }, status: { in: openRefundStatuses2 } }, _sum: { amountCents: true } });
  assertRefundAmount(locked, payment, otherOpen._sum.amountCents || 0, amountCents);
  await assertExcessFundsCovered(tx, locked.reservationId, locked.id, amountCents);
  const data = await reverseConcessionCredit(tx, locked, amountCents, actorUserId);
  return tx.refund.update({
    where: { id: locked.id },
    data: {
      amountCents,
      data: {
        ...data,
        policyAdjustment: {
          originalAmountCents: data.policyAdjustment?.originalAmountCents ?? locked.amountCents,
          retainedCents: (data.policyAdjustment?.originalAmountCents ?? locked.amountCents) - amountCents,
          note: note.slice(0, 1e3),
          adjustedByUserId: actorUserId,
          adjustedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      }
    }
  });
}
async function settleProviderRefund(context, { refundId, payment, idempotencyKey, result }) {
  return context.prisma.$transaction(async (tx) => {
    await lockPaymentScope(tx, payment);
    const locked = await tx.refund.findUnique({ where: { id: refundId } });
    if (!locked) throw new Error("Refund not found.");
    if (locked.status === "succeeded") return { status: "succeeded", refundId, amountCents: locked.amountCents };
    const data = record4(locked.data);
    if (locked.status !== "processing" || data.stripe?.idempotencyKey !== idempotencyKey) throw new Error("This refund changed while it was being processed. Refresh to see its status.");
    if (result.rentalRefundId !== locked.id || result.amountCents !== locked.amountCents || result.currencyCode !== String(locked.currencyCode || "").toUpperCase()) {
      throw new Error("Stripe\u2019s refund doesn\u2019t match this refund record. Check the payment in Stripe before trying again.");
    }
    const now = /* @__PURE__ */ new Date();
    const stripe = { ...data.stripe, providerRefundId: result.providerRefundId, providerStatus: result.providerStatus, checkedAt: now.toISOString() };
    if (result.status === "pending") {
      await tx.refund.update({ where: { id: locked.id }, data: { providerRefundId: result.providerRefundId, data: { ...data, stripe } } });
      return { status: "processing", refundId, amountCents: locked.amountCents };
    }
    if (result.status === "failed") {
      await tx.refund.update({
        where: { id: locked.id },
        data: { status: "failed", providerRefundId: null, data: { ...data, stripe: { ...stripe, lastError: result.failureReason || "Stripe could not complete the refund.", failedAt: now.toISOString() } } }
      });
      await reconcileReservationLedger(tx, locked.reservationId);
      return { status: "failed", refundId, amountCents: locked.amountCents };
    }
    const lockedPayment = await tx.payment.findUnique({ where: { id: payment.id } });
    const refundedAmountCents = lockedPayment.refundedAmountCents + locked.amountCents;
    if (refundedAmountCents > lockedPayment.amountCents) throw new Error("Refunds would exceed the payment amount. Check the payment in Stripe.");
    await tx.refund.update({
      where: { id: locked.id },
      data: { status: "succeeded", providerRefundId: result.providerRefundId, processedAt: now, data: { ...data, stripe: { ...stripe, settledAt: now.toISOString() }, policyReviewRequired: false } }
    });
    await tx.payment.update({
      where: { id: lockedPayment.id },
      data: { refundedAmountCents, status: refundedAmountCents === lockedPayment.amountCents ? "refunded" : "partially_refunded" }
    });
    await reconcileReservationLedger(tx, locked.reservationId);
    return { status: "succeeded", refundId, amountCents: locked.amountCents };
  }, transactionOptions3);
}
async function processStayRefund(context, args) {
  const { refund, payment } = await loadRefundForHost(context, args.refundId);
  if (payment.provider !== STRIPE_PROVIDER_CODE) throw new Error("This payment wasn\u2019t taken by card. Record the refund once you\u2019ve returned the money.");
  if (!String(payment.providerPaymentId || "").startsWith("pi_")) throw new Error("This card payment has no Stripe reference, so it can\u2019t be refunded here.");
  const actorUserId = context.session?.itemId;
  const note = args.note?.trim() || "";
  const claim = await context.prisma.$transaction(async (tx) => {
    await lockPaymentScope(tx, payment);
    let locked = await tx.refund.findUnique({ where: { id: refund.id } });
    if (!locked || locked.paymentId !== payment.id) throw new Error("Refund not found.");
    const data = record4(locked.data);
    if (locked.status === "review") throw new Error("Assess this refund before issuing it: decide the amount, or decline it.");
    if (locked.status === "succeeded") return { done: true };
    if (locked.status === "cancelled") throw new Error("This refund was declined and is closed.");
    if (locked.status === "processing") {
      if (!data.stripe?.idempotencyKey) throw new Error("This refund is being recorded another way. Refresh to see its status.");
      return { idempotencyKey: data.stripe.idempotencyKey, providerRefundId: data.stripe.providerRefundId, amountCents: locked.amountCents, firstSubmittedAt: String(data.stripe.startedAt || locked.updatedAt?.toISOString?.() || "") };
    }
    const lockedPayment = await tx.payment.findUnique({ where: { id: payment.id } });
    if (!["succeeded", "partially_refunded"].includes(lockedPayment?.status)) throw new Error("Only a settled card payment can be refunded.");
    const amountCents = args.amountCents == null ? locked.amountCents : args.amountCents;
    locked = await applyPolicyAdjustment(tx, locked, lockedPayment, amountCents, note, actorUserId);
    const otherOpen = await tx.refund.aggregate({ where: { paymentId: payment.id, id: { not: locked.id }, status: { in: openRefundStatuses2 } }, _sum: { amountCents: true } });
    assertRefundAmount(locked, lockedPayment, otherOpen._sum.amountCents || 0, locked.amountCents);
    const attempt = Number(record4(locked.data).stripe?.attempt || 0) + 1;
    const idempotencyKey = `rental-refund:${locked.id}:${attempt}`;
    const startedAt = (/* @__PURE__ */ new Date()).toISOString();
    await tx.refund.update({
      where: { id: locked.id },
      data: { status: "processing", data: { ...record4(locked.data), stripe: { attempt, idempotencyKey, startedAt, startedByUserId: actorUserId } } }
    });
    return { idempotencyKey, providerRefundId: void 0, amountCents: locked.amountCents, firstSubmittedAt: startedAt };
  }, transactionOptions3);
  if ("done" in claim) return { status: "succeeded", refundId: refund.id };
  let result;
  try {
    result = claim.providerRefundId ? await getProviderRefund({ provider: STRIPE_PROVIDER_CODE, providerRefundId: claim.providerRefundId, providerPaymentId: payment.providerPaymentId }) : await createProviderRefund({
      provider: STRIPE_PROVIDER_CODE,
      providerPaymentId: payment.providerPaymentId,
      amount: claim.amountCents,
      idempotencyKey: claim.idempotencyKey,
      metadata: { rentalRefundId: refund.id, rentalPaymentId: payment.id, reservationId: payment.reservationId || "" },
      expected: { rentalPaymentId: payment.id, reservationId: payment.reservationId || null },
      firstSubmittedAt: claim.firstSubmittedAt
    });
  } catch (error) {
    const definite = error instanceof ProviderDefiniteRejection && !claim.providerRefundId;
    if (error instanceof ProviderOutcomeUnknown) {
      await context.prisma.$transaction(async (tx) => {
        await lockPaymentScope(tx, payment);
        const locked = await tx.refund.findUnique({ where: { id: refund.id } });
        const data = record4(locked?.data);
        if (locked?.status !== "processing" || data.stripe?.idempotencyKey !== claim.idempotencyKey) return;
        await tx.refund.update({ where: { id: locked.id }, data: { data: { ...data, stripe: { ...data.stripe, reconciliation: { state: "unknown", checkedAt: (/* @__PURE__ */ new Date()).toISOString(), note: error.message } } } } });
      }, transactionOptions3);
    }
    if (definite) {
      await context.prisma.$transaction(async (tx) => {
        await lockPaymentScope(tx, payment);
        const locked = await tx.refund.findUnique({ where: { id: refund.id } });
        const data = record4(locked?.data);
        if (locked?.status !== "processing" || data.stripe?.idempotencyKey !== claim.idempotencyKey) return;
        await tx.refund.update({ where: { id: locked.id }, data: { status: "failed", data: { ...data, stripe: { ...data.stripe, lastError: safeHostCommandMessage(error), failedAt: (/* @__PURE__ */ new Date()).toISOString() } } } });
        await reconcileReservationLedger(tx, locked.reservationId);
      }, transactionOptions3);
    }
    throw error;
  }
  return settleProviderRefund(context, { refundId: refund.id, payment, idempotencyKey: claim.idempotencyKey, result });
}
async function declineStayRefund(context, args) {
  const note = args.note?.trim() || "";
  if (note.length < 3) throw new Error("Explain why this refund is declined (at least 3 characters).");
  const { refund, payment } = await loadRefundForHost(context, args.refundId);
  return context.prisma.$transaction(async (tx) => {
    await lockPaymentScope(tx, payment);
    const locked = await tx.refund.findUnique({ where: { id: refund.id } });
    if (!locked || !["review", "pending", "failed"].includes(locked.status)) throw new Error("Only a refund under review, pending or failed can be declined.");
    await assertExcessFundsCovered(tx, locked.reservationId, locked.id, 0);
    const data = await reverseConcessionCredit(tx, locked, 0, context.session?.itemId);
    await tx.refund.update({
      where: { id: locked.id },
      data: { status: "cancelled", data: { ...data, declined: { note: note.slice(0, 1e3), byUserId: context.session?.itemId, at: (/* @__PURE__ */ new Date()).toISOString() } } }
    });
    await reconcileReservationLedger(tx, locked.reservationId);
    return { status: "cancelled", refundId: locked.id };
  }, transactionOptions3);
}
async function adjustStayRefund(context, args) {
  const { refund, payment } = await loadRefundForHost(context, args.refundId);
  return context.prisma.$transaction(async (tx) => {
    await lockPaymentScope(tx, payment);
    const locked = await tx.refund.findUnique({ where: { id: refund.id } });
    if (locked?.status === "review") {
      const note = args.note?.trim() || "";
      if (note.length < 3) throw new Error("Explain how you assessed this refund (at least 3 characters).");
      if (!Number.isSafeInteger(args.amountCents) || args.amountCents <= 0 || args.amountCents > locked.amountCents) {
        throw new Error("Choose an amount between 1 and the amount under review, or decline the refund.");
      }
      const lockedPayment2 = await tx.payment.findUnique({ where: { id: payment.id } });
      const otherOpen = await tx.refund.aggregate({ where: { paymentId: payment.id, id: { not: locked.id }, status: { in: openRefundStatuses2 } }, _sum: { amountCents: true } });
      assertRefundAmount(locked, lockedPayment2, otherOpen._sum.amountCents || 0, args.amountCents);
      const data = record4(locked.data);
      const updated2 = await tx.refund.update({
        where: { id: locked.id },
        data: {
          status: "pending",
          amountCents: args.amountCents,
          data: {
            ...data,
            policyReviewRequired: false,
            assessment: { candidateCents: locked.amountCents, assessedCents: args.amountCents, note: note.slice(0, 1e3), assessedByUserId: context.session?.itemId, assessedAt: (/* @__PURE__ */ new Date()).toISOString() }
          }
        }
      });
      await reconcileReservationLedger(tx, locked.reservationId);
      return updated2;
    }
    if (!locked || !["pending", "failed"].includes(locked.status)) throw new Error("Only a pending or failed refund can be changed.");
    const lockedPayment = await tx.payment.findUnique({ where: { id: payment.id } });
    const updated = await applyPolicyAdjustment(tx, locked, lockedPayment, args.amountCents, args.note?.trim() || "", context.session?.itemId);
    await reconcileReservationLedger(tx, locked.reservationId);
    return updated;
  }, transactionOptions3);
}
async function createStayRefund(context, args) {
  const note = args.note?.trim() || "";
  if (!hostRefundReasons.includes(args.reason)) throw new Error("Choose a refund reason.");
  if (note.length < 3 || note.length > 1e3) throw new Error("Describe the refund (3 to 1000 characters).");
  const operationKey = args.operationKey?.trim() || "";
  if (operationKey.length < 8 || operationKey.length > 200) throw new Error("Refund request is missing its submission key. Refresh and try again.");
  const payment = await context.prisma.payment.findUnique({ where: { id: args.paymentId } });
  if (!payment?.hostOrganizationId) throw new Error("Payment not found.");
  await assertHostOrganizationAccess({ context, hostOrganizationId: payment.hostOrganizationId, permission: "canManagePayments" });
  const idempotencyKey = `host-refund:${import_node_crypto27.default.createHash("sha256").update(`${payment.id}|${operationKey}`).digest("hex")}`;
  const requestFingerprint2 = import_node_crypto27.default.createHash("sha256").update(JSON.stringify({ paymentId: payment.id, amountCents: args.amountCents, reason: args.reason, note })).digest("hex");
  return context.prisma.$transaction(async (tx) => {
    await lockPaymentScope(tx, payment);
    const existing = await tx.refund.findUnique({ where: { idempotencyKey } });
    if (existing) {
      const fingerprint = record4(existing.data).requestFingerprint;
      if (fingerprint ? fingerprint !== requestFingerprint2 : existing.amountCents !== args.amountCents || existing.reason !== args.reason) {
        throw new Error("This refund request was already submitted with different details. Refresh and start a new refund.");
      }
      return existing;
    }
    const lockedPayment = await tx.payment.findUnique({ where: { id: payment.id } });
    if (!["succeeded", "partially_refunded"].includes(lockedPayment.status)) throw new Error("Only a settled payment can be refunded.");
    const otherOpen = await tx.refund.aggregate({ where: { paymentId: payment.id, status: { in: openRefundStatuses2 } }, _sum: { amountCents: true } });
    const remaining = lockedPayment.amountCents - lockedPayment.refundedAmountCents - (otherOpen._sum.amountCents || 0);
    if (!Number.isSafeInteger(args.amountCents) || args.amountCents <= 0 || args.amountCents > remaining) throw new Error("That amount is more than remains refundable on this payment.");
    const reservation = lockedPayment.reservationId ? await tx.reservation.findUnique({ where: { id: lockedPayment.reservationId }, select: { id: true, status: true, confirmationCode: true, totalAmountCents: true, discountTotalCents: true } }) : null;
    let totalAdjustment = null;
    if (reservation && args.reason !== "overpayment" && !["cancelled", "no_show"].includes(reservation.status || "")) {
      if (args.amountCents > (reservation.totalAmountCents || 0)) throw new Error("That amount is more than the stay total.");
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { totalAmountCents: (reservation.totalAmountCents || 0) - args.amountCents, discountTotalCents: (reservation.discountTotalCents || 0) + args.amountCents }
      });
      totalAdjustment = { previousTotalCents: reservation.totalAmountCents, adjustedTotalCents: (reservation.totalAmountCents || 0) - args.amountCents };
    }
    const id2 = import_node_crypto27.default.randomUUID();
    const created = await tx.refund.create({
      data: {
        id: id2,
        hostOrganizationId: lockedPayment.hostOrganizationId,
        reservationId: lockedPayment.reservationId,
        paymentId: lockedPayment.id,
        refundNumber: `REF-${reservation?.confirmationCode || "PAY"}-${id2.slice(0, 8).toUpperCase()}`,
        idempotencyKey,
        status: "pending",
        reason: args.reason,
        amountCents: args.amountCents,
        currencyCode: lockedPayment.currencyCode,
        data: { hostInitiated: { note, byUserId: context.session?.itemId, at: (/* @__PURE__ */ new Date()).toISOString() }, totalAdjustment, policyReviewRequired: false, requestFingerprint: requestFingerprint2 }
      }
    });
    await reconcileReservationLedger(tx, lockedPayment.reservationId);
    return created;
  }, transactionOptions3);
}

// features/keystone/mutations/hostLifecycle.ts
var hostLifecycleTypeDefs = String.raw`
  type Mutation {
    """Merchant stay, payment, agreement, message and review actions. Returns { ok, message?, data? }."""
    hostStayCommand(command: String!, input: JSON!): JSON!
  }
`;
function text48(value) {
  return typeof value === "string" ? value.trim() : "";
}
function cents2(value) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) ? parsed : NaN;
}
async function appendReservationNote(tx, reservationId, note) {
  if (!reservationId) return;
  const reservation = await tx.reservation.findUnique({ where: { id: reservationId }, select: { internalNotes: true } });
  if (!reservation) return;
  const line = `[${(/* @__PURE__ */ new Date()).toISOString()}] ${note}`;
  await tx.reservation.update({ where: { id: reservationId }, data: { internalNotes: [reservation.internalNotes, line].filter(Boolean).join("\n") } });
}
async function stayConversation(tx, reservation) {
  const existing = await tx.conversation.findUnique({ where: { reservationId: reservation.id } });
  if (existing) return existing;
  return tx.conversation.create({
    data: {
      hostOrganizationId: reservation.hostOrganizationId,
      reservationId: reservation.id,
      listingId: reservation.listingId,
      guestId: reservation.guestId,
      subject: `Stay ${reservation.confirmationCode}`,
      status: "open",
      lastMessageAt: /* @__PURE__ */ new Date()
    }
  });
}
async function postHostMessage(tx, conversation, body, senderUserId) {
  const now = /* @__PURE__ */ new Date();
  const message = await tx.message.create({
    data: {
      hostOrganizationId: conversation.hostOrganizationId,
      conversationId: conversation.id,
      senderUserId,
      direction: "outbound",
      senderType: "host",
      body,
      // "Sent" here means visible on the guest's private trip or inquiry page; no email is sent.
      status: "sent",
      sentAt: now
    }
  });
  await tx.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: now, status: "open" } });
  return message;
}
async function agreementForHost(context, agreementId) {
  const agreement = await context.prisma.stayAgreement.findUnique({
    where: { id: agreementId },
    include: { reservation: { select: { id: true, status: true, confirmationCode: true, hostOrganizationId: true, listingId: true, guestId: true } } }
  });
  if (!agreement?.hostOrganizationId) throw new Error("Agreement not found.");
  await assertHostOrganizationAccess({ context, hostOrganizationId: agreement.hostOrganizationId, permission: "canManageReservations" });
  return agreement;
}
async function voidAgreement(context, input) {
  const reason = text48(input.reason);
  if (reason.length < 3 || reason.length > 1e3) throw new Error("Give a reason for voiding the agreement (3 to 1000 characters).");
  const agreement = await agreementForHost(context, text48(input.agreementId));
  return context.prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `agreement:${agreement.id}`);
    const locked = await tx.stayAgreement.findUnique({ where: { id: agreement.id } });
    if (!locked) throw new Error("Agreement not found.");
    if (locked.status === "voided") return { status: "voided" };
    const stayClosed = ["cancelled", "no_show"].includes(agreement.reservation?.status || "");
    if (locked.status === "signed" && !stayClosed) throw new Error("A signed agreement for an active stay stays in force. Cancel the stay first if the agreement no longer applies.");
    const now = /* @__PURE__ */ new Date();
    await tx.stayAgreement.update({ where: { id: locked.id }, data: { status: "voided", signingTokenRevokedAt: locked.signingTokenRevokedAt || now } });
    await appendReservationNote(tx, agreement.reservation?.id, `agreement ${locked.agreementNumber} voided: ${reason}`);
    return { status: "voided" };
  });
}
async function reissueAgreement(context, input) {
  const agreement = await agreementForHost(context, text48(input.agreementId));
  const reservation = agreement.reservation;
  if (!reservation || !["pending", "confirmed", "in_stay"].includes(reservation.status || "")) throw new Error("A new signing link can only be issued for an active stay.");
  const token = createPublicOwnershipToken();
  const postToThread = input.postToThread === true;
  await context.prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `reservation:${reservation.id}`);
    await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', reservation.id);
    const stay = await tx.reservation.findUnique({ where: { id: reservation.id }, select: { status: true, agreementId: true } });
    if (!stay || stay.agreementId !== agreement.id || !["pending", "confirmed", "in_stay"].includes(stay.status || "")) {
      throw new Error("A new signing link can only be issued for an active stay.");
    }
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `agreement:${agreement.id}`);
    await tx.$queryRawUnsafe('SELECT "id" FROM "StayAgreement" WHERE "id" = $1 FOR UPDATE', agreement.id);
    const locked = await tx.stayAgreement.findUnique({ where: { id: agreement.id } });
    if (!locked || locked.status === "signed" || locked.signedAt) throw new Error("This agreement is already signed, so it doesn\u2019t need a new link.");
    const now = /* @__PURE__ */ new Date();
    await tx.stayAgreement.update({
      where: { id: locked.id },
      data: { status: "sent", signingTokenHash: hashPublicOwnershipToken(token), signingTokenExpiresAt: publicTokenExpiry(now), signingTokenRevokedAt: null }
    });
    await appendReservationNote(tx, reservation.id, `agreement ${locked.agreementNumber} signing link reissued`);
    if (postToThread) {
      const conversation = await stayConversation(tx, { ...reservation, hostOrganizationId: locked.hostOrganizationId });
      await postHostMessage(tx, conversation, `Here is a new link to review and sign your stay agreement ${locked.agreementNumber}: /agreements/${token}`, context.session.itemId);
    }
  });
  return { link: `/agreements/${token}`, postedToThread: postToThread };
}
async function conversationForHost(context, conversationId) {
  const conversation = await context.prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation?.hostOrganizationId) throw new Error("Conversation not found.");
  await assertHostOrganizationAccess({ context, hostOrganizationId: conversation.hostOrganizationId, permission: "canManageMessages" });
  return conversation;
}
async function lockConversation(tx, conversationId) {
  await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `conversation:${conversationId}`);
  await tx.$queryRawUnsafe('SELECT "id" FROM "Conversation" WHERE "id" = $1 FOR UPDATE', conversationId);
  return tx.conversation.findUnique({ where: { id: conversationId } });
}
function guestLinkUsable(conversation) {
  return Boolean(conversation?.guestAccessTokenHash) && isPublicOwnershipTokenActive({
    tokenExpiresAt: conversation.guestAccessTokenExpiresAt,
    tokenRevokedAt: conversation.guestAccessTokenRevokedAt
  });
}
async function replyToConversation(context, input) {
  const body = text48(input.body);
  if (body.length < 1 || body.length > 4e3) throw new Error("Write a reply of up to 4000 characters.");
  const conversation = await conversationForHost(context, text48(input.conversationId));
  if (conversation.channelConnectionId) throw new Error("This thread belongs to a channel. Reply in that channel so the guest receives it.");
  if (!conversation.reservationId && !conversation.guestAccessTokenHash) throw new Error("This guest has no private page to receive replies. Contact them using the details on their profile.");
  return context.prisma.$transaction(async (tx) => {
    const locked = await lockConversation(tx, conversation.id);
    if (!locked || locked.hostOrganizationId !== conversation.hostOrganizationId) throw new Error("Conversation not found.");
    const message = await postHostMessage(tx, locked, body, context.session.itemId);
    const inquiryLink = !locked.reservationId;
    const guestCanRead = inquiryLink ? guestLinkUsable(locked) : true;
    if (inquiryLink && guestCanRead) {
      await tx.conversation.update({ where: { id: locked.id }, data: { guestAccessTokenExpiresAt: publicTokenExpiry(/* @__PURE__ */ new Date()) } });
    }
    return { id: message.id, status: message.status, guestCanRead };
  });
}
async function revokeConversationLink(context, input) {
  const conversation = await conversationForHost(context, text48(input.conversationId));
  return context.prisma.$transaction(async (tx) => {
    const locked = await lockConversation(tx, conversation.id);
    if (!locked?.guestAccessTokenHash) throw new Error("This conversation has no guest link.");
    const delivery = locked.guestLinkDelivery && typeof locked.guestLinkDelivery === "object" ? locked.guestLinkDelivery : null;
    await tx.conversation.update({
      where: { id: locked.id },
      // A link being emailed when the host turns access off never activates afterwards.
      data: {
        guestAccessTokenRevokedAt: /* @__PURE__ */ new Date(),
        ...delivery?.pendingTokenHash ? { guestLinkDelivery: { ...delivery, pendingTokenHash: null, supersededBy: "revoke" } } : {}
      }
    });
    return { revoked: true };
  });
}
async function reissueConversationLink(context, input) {
  const conversation = await conversationForHost(context, text48(input.conversationId));
  if (conversation.reservationId) throw new Error("Stay conversations are reached from the guest\u2019s trip page.");
  if (!conversation.guestEmail) throw new Error("This conversation has no guest email to send a new link to.");
  if (!passwordResetEmailConfigured()) throw new Error("Email isn\u2019t set up for this store, so a new link can\u2019t be sent.");
  const token = createPublicOwnershipToken();
  const attemptId = import_node_crypto28.default.randomUUID();
  const now = /* @__PURE__ */ new Date();
  await context.prisma.$transaction(async (tx) => {
    const locked = await lockConversation(tx, conversation.id);
    if (!locked) throw new Error("Conversation not found.");
    if (linkEmailCoolingDown(locked.guestLinkDelivery, now.getTime()) && locked.guestLinkDelivery?.status === "sending") {
      throw new Error("A new link is being sent right now. Refresh in a moment to see whether it went out.");
    }
    await tx.conversation.update({
      where: { id: locked.id },
      data: { guestLinkDelivery: { attemptId, purpose: "conversation_link", channel: "email", status: "sending", requestedAt: now.toISOString(), pendingTokenHash: hashPublicOwnershipToken(token), requestedByUserId: context.session?.itemId || null } }
    });
  });
  let status = "accepted";
  try {
    await sendGuestLinkEmail({
      to: conversation.guestEmail,
      subject: conversation.subject || "Your conversation with the host",
      heading: "A new link to your conversation",
      body: "Your host sent a fresh private link to your conversation. Older links no longer work.",
      path: `/messages/${token}`,
      cta: "Open the conversation"
    });
  } catch (error) {
    status = mailDefinitelyRejected(error) ? "failed" : "unknown";
  }
  const activated = await context.prisma.$transaction(async (tx) => {
    const locked = await lockConversation(tx, conversation.id);
    const delivery = locked?.guestLinkDelivery && typeof locked.guestLinkDelivery === "object" ? locked.guestLinkDelivery : null;
    if (!delivery || delivery.attemptId !== attemptId || !delivery.pendingTokenHash) return false;
    const settled = { ...delivery, status, settledAt: (/* @__PURE__ */ new Date()).toISOString(), pendingTokenHash: null };
    if (status !== "accepted") {
      await tx.conversation.update({ where: { id: locked.id }, data: { guestLinkDelivery: settled } });
      return false;
    }
    await tx.conversation.update({
      where: { id: locked.id },
      data: { guestAccessTokenHash: delivery.pendingTokenHash, guestAccessTokenExpiresAt: publicTokenExpiry(), guestAccessTokenRevokedAt: null, guestLinkDelivery: settled }
    });
    return true;
  });
  if (!activated) {
    throw new Error(status === "failed" ? "The mail server refused the email, so the new link wasn\u2019t sent. The guest\u2019s current link is unchanged." : status === "unknown" ? "We couldn\u2019t confirm the email was accepted, so the new link isn\u2019t active. The guest\u2019s current link is unchanged; try again." : "Another link change happened meanwhile. Refresh to see the current link state.");
  }
  return { emailed: true, status: "accepted" };
}
async function setConversationStatus(context, input) {
  const status = text48(input.status);
  if (!["open", "snoozed", "archived"].includes(status)) throw new Error("Choose open, snoozed or archived.");
  const conversation = await conversationForHost(context, text48(input.conversationId));
  await context.prisma.conversation.update({ where: { id: conversation.id }, data: { status } });
  return { status };
}
var reviewActions = {
  publish: { status: "published" },
  hold: { status: "submitted" },
  remove: { status: "removed" }
};
async function moderateReview(context, input) {
  const action = reviewActions[text48(input.action)];
  if (!action) throw new Error("Choose publish, hold or remove.");
  const review = await context.prisma.review.findUnique({ where: { id: text48(input.reviewId) } });
  if (!review?.hostOrganizationId) throw new Error("Review not found.");
  await assertHostOrganizationAccess({ context, hostOrganizationId: review.hostOrganizationId, permission: "canManageReviews" });
  return context.prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `review:${review.id}`);
    const locked = await tx.review.findUnique({ where: { id: review.id } });
    if (!locked) throw new Error("Review not found.");
    if (locked.status === action.status) return { status: locked.status };
    const now = /* @__PURE__ */ new Date();
    await tx.review.update({ where: { id: locked.id }, data: { status: action.status, publishedAt: action.status === "published" ? now : null } });
    const counts = locked.direction === "guest_to_host" && locked.listingId && locked.overallRating;
    const wasPublished = locked.status === "published";
    const isPublished = action.status === "published";
    if (counts && wasPublished !== isPublished) {
      await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `listing-reviews:${locked.listingId}`);
      const listing = await tx.listing.findUnique({ where: { id: locked.listingId }, select: { reviewAverageHundredths: true, reviewCount: true } });
      const count = listing?.reviewCount || 0;
      const total = (listing?.reviewAverageHundredths || 0) * count;
      const nextCount = Math.max(count + (isPublished ? 1 : -1), 0);
      const nextTotal = total + (isPublished ? 1 : -1) * locked.overallRating * 100;
      await tx.listing.update({
        where: { id: locked.listingId },
        data: { reviewCount: nextCount, reviewAverageHundredths: nextCount ? Math.min(500, Math.max(0, Math.round(nextTotal / nextCount))) : 0 }
      });
    }
    return { status: action.status };
  });
}
async function recordManualRefund(context, input) {
  const refundId = text48(input.refundId) || null;
  const amountCents = cents2(input.amountCents);
  if (refundId) {
    const refund2 = await context.prisma.refund.findUnique({ where: { id: refundId }, select: { amountCents: true, status: true } });
    if (refund2?.status === "review") throw new Error("Assess this refund before recording it: decide the amount, or decline it.");
    if (refund2 && Number.isSafeInteger(amountCents) && amountCents !== refund2.amountCents) {
      await adjustStayRefund(context, { refundId, amountCents, note: text48(input.note) });
    }
  }
  const refund = refundId ? await context.prisma.refund.findUnique({ where: { id: refundId }, select: { reason: true, paymentId: true } }) : null;
  return refundStayPaymentOperation(null, {
    paymentId: refund?.paymentId || text48(input.paymentId),
    refundId,
    operationKey: text48(input.operationKey),
    amountCents,
    reason: refund?.reason || text48(input.reason) || "other",
    confirmFundsReturned: input.confirmFundsReturned === true,
    manualEvidenceReference: text48(input.evidenceReference)
  }, context);
}
async function createRefund(context, input) {
  const refund = await createStayRefund(context, {
    paymentId: text48(input.paymentId),
    amountCents: cents2(input.amountCents),
    reason: text48(input.reason),
    note: text48(input.note),
    operationKey: text48(input.operationKey)
  });
  const payment = await context.prisma.payment.findUnique({ where: { id: refund.paymentId }, select: { provider: true } });
  if (payment?.provider === STRIPE_PROVIDER_CODE && refund.status === "pending") {
    return { refundId: refund.id, ...await processStayRefund(context, { refundId: refund.id }) };
  }
  return { refundId: refund.id, status: refund.status };
}
async function cancelPaymentAttempt(context, input) {
  const reason = text48(input.reason);
  if (reason.length < 3 || reason.length > 1e3) throw new Error("Give a reason for closing this payment attempt.");
  const payment = await context.prisma.payment.findUnique({ where: { id: text48(input.paymentId) } });
  if (!payment?.hostOrganizationId) throw new Error("Payment not found.");
  await assertHostOrganizationAccess({ context, hostOrganizationId: payment.hostOrganizationId, permission: "canManagePayments" });
  if (!["pending", "processing"].includes(payment.status)) throw new Error("Only a pending payment attempt can be closed.");
  const actorUserId = context.session.itemId;
  if (payment.provider === STRIPE_PROVIDER_CODE) {
    const outcome = await reconcileProviderAttempt(context.prisma, payment.id, { reason, actorUserId, closing: false });
    if (outcome.status === "unknown" || outcome.status === "processing") throw new Error(outcome.message || "Stripe hasn\u2019t reported this payment\u2019s outcome yet.");
    return { status: outcome.status };
  }
  return context.prisma.$transaction(async (tx) => {
    if (payment.reservationId) {
      await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `reservation:${payment.reservationId}`);
      await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', payment.reservationId);
    }
    const current2 = await tx.payment.findUnique({ where: { id: payment.id } });
    if (!current2 || !["pending", "processing"].includes(current2.status)) throw new Error("This payment attempt already changed. Refresh to see it.");
    const data = current2.data && typeof current2.data === "object" ? current2.data : {};
    await tx.payment.update({
      where: { id: current2.id },
      data: { status: "cancelled", errorMessage: reason, data: { ...data, closedAt: (/* @__PURE__ */ new Date()).toISOString(), closedReason: reason, closedByUserId: actorUserId, providerOutcome: "manual" } }
    });
    await appendReservationNote(tx, current2.reservationId, `payment attempt ${current2.id} closed (manual): ${reason}`);
    return { status: "cancelled" };
  }, { maxWait: 5e3, timeout: 1e4, isolationLevel: "ReadCommitted" });
}
async function recordManualPayment(context, input) {
  if (input.confirmReceived !== true) throw new Error("Confirm that you\u2019ve already received this money.");
  const amountCents = cents2(input.amountCents);
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error("Enter the amount you received.");
  const operationKey = text48(input.operationKey);
  if (operationKey.length < 8) throw new Error("This form is out of date. Reload the stay and record the payment again.");
  const payment = await initiateStayPayment(null, { reservationId: text48(input.reservationId), paymentProviderCode: "pp_system_default", amountCents, operationKey }, context);
  if (payment.status === "succeeded") return { paymentId: payment.id, status: "succeeded" };
  const captured = await captureStayPayment(null, { paymentId: payment.id }, context);
  return { paymentId: payment.id, status: captured.status };
}
async function allocateListing(context, input) {
  const listingId = text48(input.listingId);
  const unitId = text48(input.accommodationUnitId);
  if (!listingId || !unitId) throw new Error("Choose the listing and the accommodation unit.");
  const listing = await context.prisma.listing.findUnique({ where: { id: listingId }, select: { hostOrganizationId: true, accommodationUnitId: true } });
  if (!listing?.hostOrganizationId) throw new Error("Listing not found.");
  await assertHostOrganizationAccess({ context, hostOrganizationId: listing.hostOrganizationId, permission: "canManageListings" });
  await assertHostOrganizationAccess({ context, hostOrganizationId: listing.hostOrganizationId, permission: "canManageProperties" });
  return context.prisma.$transaction(async (tx) => {
    await lockListingCapacity(tx, [listingId]);
    await lockAccommodationUnitCapacity(tx, [listing.accommodationUnitId, unitId]);
    await tx.$queryRawUnsafe('SELECT "id" FROM "Listing" WHERE "id" = $1 FOR UPDATE', listingId);
    const current2 = await tx.listing.findUnique({ where: { id: listingId }, select: { id: true, status: true, hostOrganizationId: true, accommodationUnitId: true, propertyId: true } });
    if (!current2 || current2.hostOrganizationId !== listing.hostOrganizationId) throw new Error("Listing not found.");
    if (current2.status === "archived") throw new Error("Archived listings are read-only.");
    if (current2.accommodationUnitId !== listing.accommodationUnitId) throw new Error("The listing\u2019s unit changed meanwhile. Refresh and try again.");
    const unit = await tx.accommodationUnit.findUnique({ where: { id: unitId }, select: { hostOrganizationId: true, propertyId: true } });
    if (!unit || unit.hostOrganizationId !== current2.hostOrganizationId || !unit.propertyId) throw new Error("Choose an accommodation unit of this host that belongs to a property.");
    if (current2.accommodationUnitId === unitId && current2.propertyId === unit.propertyId) return { listingId, accommodationUnitId: unitId, changed: false };
    const [liveStay, activeHold] = await Promise.all([
      tx.reservation.findFirst({ where: { listingId, status: { in: ["pending", "confirmed", "in_stay"] } }, select: { id: true } }),
      tx.calendarBlock.findFirst({ where: { listingId, status: "active" }, select: { id: true } })
    ]);
    if (liveStay || activeHold) throw new Error("This listing has upcoming stays or calendar holds on its current unit. Re-accommodate or release them before moving the listing.");
    await tx.listing.update({ where: { id: listingId }, data: { accommodationUnitId: unitId, propertyId: unit.propertyId } });
    const now = /* @__PURE__ */ new Date();
    return { listingId, accommodationUnitId: unitId, changed: true };
  }, { maxWait: 5e3, timeout: 1e4, isolationLevel: "Serializable" });
}
async function amendPartyInvitations(context, input) {
  const reservationId = text48(input.reservationId);
  const reason = text48(input.reason);
  if (reason.length < 3 || reason.length > 1e3) throw new Error("Give a short reason for the invitation change.");
  const raw = Array.isArray(input.invitedGuests) ? input.invitedGuests : null;
  if (!raw || raw.length > 15) throw new Error("List up to 15 invited guests.");
  const invitedGuests = raw.map((guest) => {
    const name = text48(guest?.name);
    const email = text48(guest?.email).toLowerCase();
    if (!name || name.length > 200) throw new Error("Each invited guest needs a name of up to 200 characters.");
    if (email && (email.length > 320 || !/^\S+@\S+\.\S+$/.test(email))) throw new Error("Enter a valid email for each invited guest, or leave it blank.");
    return { name, email: email || null };
  });
  const reservation = await context.prisma.reservation.findUnique({ where: { id: reservationId }, select: { hostOrganizationId: true } });
  if (!reservation?.hostOrganizationId) throw new Error("Reservation not found.");
  await assertHostOrganizationAccess({ context, hostOrganizationId: reservation.hostOrganizationId, permission: "canManageReservations" });
  return context.prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `reservation:${reservationId}`);
    await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', reservationId);
    const locked = await tx.reservation.findUnique({ where: { id: reservationId }, include: { guestParty: true } });
    if (!locked || !["pending", "confirmed", "in_stay"].includes(locked.status)) throw new Error("Only an upcoming or current stay\u2019s invitations can be changed.");
    if (!locked.guestParty) throw new Error("This stay has no party record to change.");
    const previous = Array.isArray(locked.guestParty.invitedGuests) ? locked.guestParty.invitedGuests : [];
    await tx.guestParty.update({ where: { id: locked.guestParty.id }, data: { invitedGuests } });
    await appendReservationNote(tx, reservationId, `Invited guests changed from ${previous.length} to ${invitedGuests.length}: ${reason}`);
    const now = /* @__PURE__ */ new Date();
    return { reservationId, invitedGuests: invitedGuests.length };
  });
}
async function amendParty(context, input) {
  const reservationId = text48(input.reservationId);
  const reason = text48(input.reason);
  if (reason.length < 3 || reason.length > 1e3) throw new Error("Give a short reason for the party change.");
  const next = { adults: cents2(input.adults), children: cents2(input.children), infants: cents2(input.infants), pets: cents2(input.pets) };
  if (!Number.isSafeInteger(next.adults) || next.adults < 1 || [next.children, next.infants, next.pets].some((value) => !Number.isSafeInteger(value) || value < 0 || value > 50)) {
    throw new Error("Enter valid guest and pet counts.");
  }
  const reservation = await context.prisma.reservation.findUnique({ where: { id: reservationId }, select: { hostOrganizationId: true } });
  if (!reservation?.hostOrganizationId) throw new Error("Reservation not found.");
  await assertHostOrganizationAccess({ context, hostOrganizationId: reservation.hostOrganizationId, permission: "canManageReservations" });
  return context.prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `reservation:${reservationId}`);
    await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', reservationId);
    const locked = await tx.reservation.findUnique({
      where: { id: reservationId },
      include: { guestParty: true, accommodationUnit: { select: { maxGuests: true } } }
    });
    if (!locked || !["pending", "confirmed", "in_stay"].includes(locked.status)) throw new Error("Only an upcoming or current stay\u2019s party can be changed.");
    const party = locked.guestParty;
    if (!party) throw new Error("This stay has no party record to change.");
    const maxGuests = locked.accommodationUnit?.maxGuests;
    if (Number.isSafeInteger(maxGuests) && next.adults + next.children > maxGuests) throw new Error(`This home sleeps up to ${maxGuests} guests.`);
    const petRule = (locked.bookingSnapshot?.listing?.houseRules || []).find((rule) => rule.ruleType === "pets");
    if (next.pets > 0 && petRule?.isAllowed === false) throw new Error("This stay\u2019s house rules don\u2019t allow pets.");
    const capturedFees = locked.bookingSnapshot?.listing?.feeDefinitions;
    const guestsChanged = next.adults + next.children !== party.adults + party.children;
    const petsChanged = next.pets !== party.pets;
    if ((guestsChanged || petsChanged) && !Array.isArray(capturedFees)) {
      throw new Error("This booking didn\u2019t capture its fee terms, so a change in guests or pets can\u2019t be priced. Rebook the stay to change them.");
    }
    const priced = (capturedFees || []).filter((fee) => fee?.required !== false);
    const petFee = priced.some((fee) => fee.feeType === "pet");
    const perGuestFee = priced.some((fee) => fee.feeType !== "pet" && fee.calculation === "per_guest");
    if (petFee && petsChanged || perGuestFee && guestsChanged) {
      throw new Error("This change would alter the stay\u2019s price (pet or per-guest fees). Rebook or amend the price before changing the party.");
    }
    const previous = { adults: party.adults, children: party.children, infants: party.infants, pets: party.pets };
    await tx.guestParty.update({ where: { id: party.id }, data: next });
    await appendReservationNote(tx, reservationId, `Party changed from ${JSON.stringify(previous)} to ${JSON.stringify(next)}: ${reason}`);
    const now = /* @__PURE__ */ new Date();
    return { reservationId, ...next };
  });
}
var commands = {
  party_amend: amendParty,
  party_invites_amend: amendPartyInvitations,
  listing_allocate: allocateListing,
  payment_record_manual: recordManualPayment,
  payment_cancel_attempt: cancelPaymentAttempt,
  transition: (context, input) => operateStayReservation(context, {
    reservationId: text48(input.reservationId),
    transition: text48(input.transition),
    note: text48(input.note) || null,
    override: input.override === true
  }).then((reservation) => ({ id: reservation.id, status: reservation.status, confirmationCode: reservation.confirmationCode })),
  amend: (context, input) => amendConfirmedStayOperation(null, {
    reservationId: text48(input.reservationId),
    expectedCheckInDate: text48(input.expectedCheckInDate),
    expectedCheckOutDate: text48(input.expectedCheckOutDate),
    checkInDate: text48(input.checkInDate),
    checkOutDate: text48(input.checkOutDate),
    reason: text48(input.reason),
    idempotencyKey: text48(input.idempotencyKey)
  }, context),
  reassign: (context, input) => reassignStayReservation(null, {
    reservationId: text48(input.reservationId),
    targetAccommodationUnitId: text48(input.targetAccommodationUnitId),
    reason: text48(input.reason)
  }, context),
  deposit: (context, input) => transitionSecurityDeposit(null, {
    depositId: text48(input.depositId),
    transition: text48(input.transition),
    amountCents: input.amountCents == null || input.amountCents === "" ? null : cents2(input.amountCents),
    reference: text48(input.reference) || null,
    confirmEvidence: input.confirmEvidence === true,
    operationKey: text48(input.operationKey) || null
  }, context),
  claim_create: (context, input) => createDamageClaim(null, {
    reservationId: text48(input.reservationId),
    description: text48(input.description),
    claimedAmountCents: cents2(input.claimedAmountCents),
    evidence: Array.isArray(input.evidence) ? input.evidence.slice(0, 20) : []
  }, context),
  claim_transition: (context, input) => transitionDamageClaim(null, {
    claimId: text48(input.claimId),
    transition: text48(input.transition),
    approvedAmountCents: input.approvedAmountCents == null || input.approvedAmountCents === "" ? null : cents2(input.approvedAmountCents),
    settlementMethod: text48(input.settlementMethod) || null,
    settlementReference: text48(input.settlementReference) || null,
    confirmSettlement: input.confirmSettlement === true,
    receivedOn: text48(input.receivedOn) || null,
    custody: text48(input.custody) || null
  }, context),
  refund_process: (context, input) => processStayRefund(context, {
    refundId: text48(input.refundId),
    amountCents: input.amountCents == null || input.amountCents === "" ? null : cents2(input.amountCents),
    note: text48(input.note)
  }),
  refund_decline: (context, input) => declineStayRefund(context, { refundId: text48(input.refundId), note: text48(input.note) }),
  refund_assess: (context, input) => adjustStayRefund(context, { refundId: text48(input.refundId), amountCents: cents2(input.amountCents), note: text48(input.note) }),
  refund_create: createRefund,
  refund_record_manual: recordManualRefund,
  agreement_void: voidAgreement,
  agreement_reissue: reissueAgreement,
  conversation_reply: replyToConversation,
  conversation_status: setConversationStatus,
  conversation_link_revoke: revokeConversationLink,
  conversation_link_reissue: reissueConversationLink,
  review_moderate: moderateReview,
  catalog_transition: transitionCatalogRecord
};
async function hostStayCommand(_root, args, context) {
  const run = commands[args.command];
  if (!run) return { ok: false, message: "Unsupported action." };
  if (!context.session?.itemId) return { ok: false, message: "Please sign in to continue." };
  const input = args.input && typeof args.input === "object" && !Array.isArray(args.input) ? args.input : {};
  try {
    return { ok: true, data: await run(context, input) };
  } catch (error) {
    return { ok: false, message: safeHostCommandMessage(error) };
  }
}
var hostLifecycleResolvers = {
  Mutation: {
    hostStayCommand
  }
};

// features/keystone/mutations/bookingRules.ts
var AVAILABILITY_PAGE_DAYS = 400;
var OPEN_WINDOW_ARRIVAL_DAYS = 730;
var DAY_MS7 = 24 * 60 * 60 * 1e3;
var DATE_ONLY4 = /^\d{4}-\d{2}-\d{2}$/;
function addDays3(dateIso, days) {
  const [year, month, day] = dateIso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * DAY_MS7).toISOString().slice(0, 10);
}
async function publicStayAvailability(_root, args, context) {
  const slug2 = args.slug?.trim();
  if (!slug2 || slug2.length > 200) throw new Error("Listing slug is required.");
  const sudo = context.sudo();
  const [listing] = await sudo.query.Listing.findMany({
    where: { ...sellableListingWhere(), slug: { equals: slug2 } },
    take: 1,
    query: STAY_LISTING_SELECTION
  });
  if (!listing?.accommodationUnit?.id) return null;
  const plan = effectiveStayRatePlan(listing);
  const bounds = stayArrivalBounds(listingArrivalContext(listing, plan));
  const maximumStay = Number.isSafeInteger(plan?.maximumStay) && plan.maximumStay > 0 ? Math.min(plan.maximumStay, MAX_SUPPORTED_STAY_NIGHTS) : MAX_SUPPORTED_STAY_NIGHTS;
  const lastArrival = bounds.latestCheckIn || addDays3(bounds.earliestCheckIn, OPEN_WINDOW_ARRIVAL_DAYS);
  const lastNight = addDays3(lastArrival, maximumStay);
  const today = zonedTodayIso(listing.property?.timezone);
  const floor = addDays3(today, -1);
  const requested = typeof args.from === "string" && DATE_ONLY4.test(args.from) ? args.from : floor;
  const from = requested < floor ? floor : requested;
  if (from >= lastNight) return { from, to: from, unavailable: [], bounds: { ...bounds, lastArrival, maximumStay, lastNight } };
  const days = Number.isSafeInteger(args.days) && args.days > 0 ? Math.min(args.days, AVAILABILITY_PAGE_DAYS) : AVAILABILITY_PAGE_DAYS;
  const pageEnd = addDays3(from, days);
  const to = pageEnd > lastNight ? lastNight : pageEnd;
  const blocks = await readBoundedPages(
    (skip, take) => sudo.query.CalendarBlock.findMany({
      where: {
        listing: { accommodationUnit: { id: { equals: listing.accommodationUnit.id } } },
        status: { equals: "active" },
        ...REAL_CAPACITY_BLOCK_FILTER,
        startDate: { lt: to },
        endDate: { gt: from }
      },
      orderBy: [{ startDate: "asc" }, { id: "asc" }],
      take,
      skip,
      query: "startDate endDate"
    }),
    { pageSize: 250, maxItems: 5e3, label: "Stay availability" }
  );
  const unavailable = [];
  for (const block of blocks) {
    const start = block.startDate < from ? from : block.startDate;
    const end = block.endDate > to ? to : block.endDate;
    if (!(end > start)) continue;
    const last = unavailable[unavailable.length - 1];
    if (last && start <= last.end) {
      if (end > last.end) last.end = end;
    } else {
      unavailable.push({ start, end });
    }
  }
  return { from, to, unavailable, bounds: { ...bounds, lastArrival, maximumStay, lastNight } };
}
var bookingRuleTypeDefs = String.raw`
  type Query {
    publicStayAvailability(slug: String!, from: String, days: Int): JSON
  }
`;
var bookingRuleResolvers = {
  Query: {
    publicStayAvailability
  }
};

// features/keystone/mutations/listingReadinessIndex.ts
var MAX_RECORDS = 5e3;
async function listingReadinessIndex(_root, _args, context) {
  if (!context.session?.itemId) throw new Error("Sign in to continue.");
  let listingIds;
  let propertyIds;
  try {
    const [listings, properties] = await Promise.all([
      readBoundedPages(
        (skip, take) => context.query.Listing.findMany({ orderBy: [{ id: "asc" }], skip, take, query: "id" }),
        { pageSize: 500, maxItems: MAX_RECORDS, label: "Listing readiness" }
      ),
      readBoundedPages(
        (skip, take) => context.query.Property.findMany({ orderBy: [{ id: "asc" }], skip, take, query: "id" }),
        { pageSize: 500, maxItems: MAX_RECORDS, label: "Property readiness" }
      )
    ]);
    listingIds = listings.map((listing) => String(listing.id));
    propertyIds = properties.map((property) => String(property.id));
  } catch {
    return { complete: false, pricedIds: [], bookableIds: [], sellablePropertyIds: [], limit: MAX_RECORDS };
  }
  const [readiness, sellable] = await Promise.all([
    listingReadinessFor(context.prisma, listingIds),
    sellablePropertyIdsFor(context.prisma, propertyIds, MAX_RECORDS)
  ]);
  if (!sellable.complete) return { complete: false, pricedIds: [], bookableIds: [], sellablePropertyIds: [], limit: MAX_RECORDS };
  const pricedIds = [];
  const bookableIds = [];
  for (const [id2, entry] of readiness) {
    if (entry.priced) pricedIds.push(id2);
    if (entry.bookable) bookableIds.push(id2);
  }
  return { complete: true, pricedIds, bookableIds, sellablePropertyIds: sellable.propertyIds, limit: MAX_RECORDS };
}
var listingReadinessTypeDefs = String.raw`
  type Query {
    """IDs of the listings you can read that are priced and bookable online now, and of your readable properties with a bookable listing (no prices or terms)."""
    listingReadinessIndex: JSON!
  }
`;
var listingReadinessResolvers = {
  Query: { listingReadinessIndex }
};

// features/keystone/mutations/updateOnboardingStatus.ts
var allowedStatuses = /* @__PURE__ */ new Set(["not_started", "in_progress", "dismissed"]);
async function updateOnboardingStatus(_root, args, context) {
  const userId = context.session?.itemId;
  if (!userId || context.session?.data?.isActive !== true || !context.session?.data?.role?.canManageOnboarding) {
    throw new Error("You do not have permission to update onboarding.");
  }
  const currentUser = await context.prisma.user.findUnique({ where: { id: userId }, select: { isActive: true } });
  if (currentUser?.isActive !== true) throw new Error("You do not have permission to update onboarding.");
  if (!allowedStatuses.has(args.status)) throw new Error("Onboarding status is invalid.");
  return context.sudo().query.User.updateOne({
    where: { id: userId },
    data: { onboardingStatus: args.status },
    query: "id onboardingStatus"
  });
}

// features/keystone/onboarding/rentalOnboarding.ts
var import_node_crypto30 = __toESM(require("node:crypto"));

// features/platform/onboarding/utils/dataUtils.ts
var import_zod = require("zod");

// features/platform/onboarding/lib/seed.json
var seed_default = {
  settings: {
    name: "Housekind",
    tagline: "Remarkable homes, locally hosted",
    homepageHeadline: "Stay somewhere considered.",
    publicDescription: "Independent stays with thoughtful details, clear total pricing, and direct relationships with the people who care for each home.",
    supportEmail: "hello@housekind.example",
    supportPhone: "+1 (518) 555-0142",
    supportHours: "Replace with your support hours, for example: Messages answered daily, 8am\u20138pm Eastern.",
    officeAddress: "Replace with your business mailing address.",
    currencyCode: "USD",
    locale: "en-US",
    timezone: "America/New_York",
    defaultMapLatitude: 41.6,
    defaultMapLongitude: -78.4,
    accentHue: 155,
    logoColor: "266",
    isPublished: true
  },
  hostOrganization: {
    id: "host_housekind_collective",
    name: "Housekind Collective",
    slug: "housekind-collective",
    organizationType: "property_manager",
    status: "active",
    publicBio: "A small team partnering with independent owners to host design-led homes across the Northeast and California.",
    publicEmail: "hello@housekind.example",
    publicPhone: "+1 (518) 555-0142",
    website: "https://housekind.example",
    canonicalUrl: "https://housekind.example",
    federationId: "urn:openfront:host:housekind-collective",
    dataCustody: "self_hosted",
    isPublic: true
  },
  cancellationPolicy: {
    id: "policy_housekind_moderate_2026",
    name: "Moderate",
    version: "moderate-2026-01",
    policyType: "moderate",
    summary: "Cancel within 24 hours of booking for a full refund. After that, receive a full refund until five days before check-in and 50% until 24 hours before check-in.",
    fullTerms: "Refund calculations use the policy version captured with the reservation. Cleaning fees are refundable when the stay has not begun.",
    freeCancellationHours: 24,
    rules: [
      { hoursBeforeCheckIn: 120, refundBasisPoints: 1e4 },
      { hoursBeforeCheckIn: 24, refundBasisPoints: 5e3 },
      { hoursBeforeCheckIn: 0, refundBasisPoints: 0 }
    ]
  },
  paymentProvider: {
    id: "provider_housekind_manual",
    name: "Manual direct-booking payments",
    code: "pp_system_default",
    isInstalled: true,
    metadata: {
      mode: "manual",
      capabilities: ["record_payment", "record_refund"],
      secrets: "none"
    }
  },
  cardPaymentProvider: {
    id: "provider_housekind_card",
    name: "Card payments (Stripe)",
    code: "pp_stripe_stripe",
    isInstalled: true,
    metadata: {
      credentials: "environment",
      capabilities: ["card_checkout", "card_refunds", "webhook_settlement"],
      secrets: "none"
    }
  },
  amenities: [
    { id: "amenity_wifi", name: "Fast Wi-Fi", slug: "wifi", category: "essentials", iconKey: "wifi" },
    { id: "amenity_kitchen", name: "Full kitchen", slug: "full-kitchen", category: "kitchen", iconKey: "cooking-pot" },
    { id: "amenity_parking", name: "Free parking", slug: "free-parking", category: "parking", iconKey: "car" },
    { id: "amenity_hot_tub", name: "Private hot tub", slug: "hot-tub", category: "outdoor", iconKey: "waves" },
    { id: "amenity_fireplace", name: "Indoor fireplace", slug: "fireplace", category: "essentials", iconKey: "flame" },
    { id: "amenity_lake", name: "Lake access", slug: "lake-access", category: "outdoor", iconKey: "sailboat" },
    { id: "amenity_ocean", name: "Ocean view", slug: "ocean-view", category: "outdoor", iconKey: "sunset" },
    { id: "amenity_workspace", name: "Dedicated workspace", slug: "workspace", category: "workspace", iconKey: "laptop" },
    { id: "amenity_ac", name: "Air conditioning", slug: "air-conditioning", category: "essentials", iconKey: "snowflake" },
    { id: "amenity_washer", name: "Washer and dryer", slug: "washer-dryer", category: "essentials", iconKey: "washing-machine" },
    { id: "amenity_pets", name: "Pets welcome", slug: "pets-welcome", category: "family", iconKey: "paw-print" },
    { id: "amenity_ski", name: "Near ski lifts", slug: "ski-access", category: "outdoor", iconKey: "mountain-snow" }
  ],
  collections: [
    {
      id: "collection_cabins",
      name: "Cabin escapes",
      slug: "cabin-escapes",
      description: "Quiet homes near water and woods.",
      isActive: true
    },
    {
      id: "collection_coast",
      name: "Coastal stays",
      slug: "coastal-stays",
      description: "Homes shaped by the Pacific edge.",
      isActive: true
    },
    {
      id: "collection_city",
      name: "City weekends",
      slug: "city-weekends",
      description: "Walkable apartments with character.",
      isActive: true
    },
    {
      id: "collection_desert",
      name: "Desert design",
      slug: "desert-design",
      description: "Low-slung homes under wide skies.",
      isActive: true
    },
    {
      id: "collection_mountain",
      name: "Mountain houses",
      slug: "mountain-houses",
      description: "Generous homes for snow days and trail weekends.",
      isActive: true
    }
  ],
  properties: [
    {
      id: "property_pineglass",
      name: "Pineglass Lake House",
      internalCode: "CS-PINEGLASS",
      propertyType: "cabin",
      timezone: "America/New_York",
      checkInFrom: "16:00",
      checkInUntil: "22:00",
      checkOutBy: "11:00",
      arrivalInstructions: "Replace with your entry, parking and Wi-Fi details for guests. Only guests with a confirmed stay see this.",
      address: {
        id: "address_pineglass",
        addressLine1: "88 Lake Flower Avenue",
        city: "Saranac Lake",
        region: "New York",
        postalCode: "12983",
        countryCode: "US",
        latitude: 44.3295,
        longitude: -74.1313,
        publicLocationLabel: "Saranac Lake, New York"
      },
      unit: {
        id: "unit_pineglass",
        name: "Entire lake cabin",
        accommodationType: "cabin",
        maxGuests: 6,
        bedroomCount: 3,
        bedCount: 4,
        bathroomCountHalfUnits: 4,
        squareFeet: 1800,
        bedrooms: [
          {
            name: "Lake room",
            beds: [
              { bedType: "king", quantity: 1 }
            ]
          },
          {
            name: "Pine room",
            beds: [
              { bedType: "queen", quantity: 1 }
            ]
          },
          {
            name: "Bunk room",
            beds: [
              { bedType: "single", quantity: 2 }
            ]
          }
        ]
      },
      listing: {
        id: "listing_pineglass",
        title: "Pineglass Cabin",
        slug: "pineglass-cabin",
        subtitle: "A glass-fronted lake cabin among the white pines",
        description: "Wake to mist lifting from Lake Flower, make breakfast in the cedar kitchen, and step from the deck to a quiet private shoreline. Pineglass is an all-season Adirondack base for paddling, long dinners, and snow-covered weekends.",
        bookingMode: "instant",
        instantBook: true,
        isFeatured: true,
        baseNightlyRateCents: 32500,
        securityDepositCents: 5e4,
        minimumStay: 2,
        maximumStay: 14,
        amenities: ["wifi", "full-kitchen", "free-parking", "fireplace", "lake-access", "washer-dryer", "pets-welcome"],
        collections: ["cabin-escapes"],
        media: [
          {
            imagePath: "/images/stays/pineglass-cabin-01.jpg",
            altText: "Timber cabin beside a calm Adirondack lake",
            caption: "Private shoreline at first light"
          },
          { imagePath: "/images/stays/pineglass-cabin-02.jpg", altText: "Warm cabin living room with broad windows", caption: "The lake room" }
        ],
        houseRules: [
          {
            ruleType: "pets",
            title: "Pets are welcome",
            description: "Up to two house-trained dogs; add them to the guest party.",
            isAllowed: true
          },
          {
            ruleType: "quiet_hours",
            title: "Quiet shoreline after 10pm",
            description: "Keep outdoor sound low from 10pm to 8am.",
            isRequired: true
          },
          { ruleType: "events", title: "No parties or events", description: "Registered guests only.", isAllowed: false }
        ],
        cleaningFeeCents: 14500,
        serviceFeeBasisPoints: 800,
        taxBasisPoints: 800
      }
    },
    {
      id: "property_tidehouse",
      name: "Tidehouse Mendocino",
      internalCode: "CS-TIDEHOUSE",
      propertyType: "villa",
      timezone: "America/Los_Angeles",
      checkInFrom: "15:00",
      checkInUntil: "21:00",
      checkOutBy: "10:00",
      arrivalInstructions: "Replace with your entry, parking and Wi-Fi details for guests. Only guests with a confirmed stay see this.",
      address: {
        id: "address_tidehouse",
        addressLine1: "12 Headlands Lane",
        city: "Mendocino",
        region: "California",
        postalCode: "95460",
        countryCode: "US",
        latitude: 39.3077,
        longitude: -123.7995,
        publicLocationLabel: "Mendocino, California"
      },
      unit: {
        id: "unit_tidehouse",
        name: "Entire coastal villa",
        accommodationType: "villa",
        maxGuests: 8,
        bedroomCount: 4,
        bedCount: 5,
        bathroomCountHalfUnits: 7,
        squareFeet: 3200,
        bedrooms: [
          {
            name: "Ocean suite",
            beds: [
              { bedType: "king", quantity: 1 }
            ]
          },
          {
            name: "Garden suite",
            beds: [
              { bedType: "queen", quantity: 1 }
            ]
          },
          {
            name: "Cypress room",
            beds: [
              { bedType: "queen", quantity: 1 }
            ]
          },
          {
            name: "Kids room",
            beds: [
              { bedType: "single", quantity: 2 }
            ]
          }
        ]
      },
      listing: {
        id: "listing_tidehouse",
        title: "Tidehouse Villa",
        slug: "tidehouse-villa",
        subtitle: "Cliff-edge calm above the Mendocino headlands",
        description: "An oak-and-stone home with Pacific views from nearly every room. Gather around the long table, soak in the sheltered hot tub, then follow the headlands path into the village.",
        bookingMode: "request",
        instantBook: false,
        isFeatured: true,
        baseNightlyRateCents: 62e3,
        securityDepositCents: 1e5,
        minimumStay: 3,
        maximumStay: 21,
        amenities: ["wifi", "full-kitchen", "free-parking", "hot-tub", "ocean-view", "fireplace", "washer-dryer", "workspace"],
        collections: ["coastal-stays"],
        media: [
          {
            imagePath: "/images/stays/tidehouse-villa-01.jpg",
            altText: "Coastal villa looking across the Pacific",
            caption: "The headlands terrace"
          },
          { imagePath: "/images/stays/tidehouse-villa-02.jpg", altText: "Airy villa interior with ocean-facing windows", caption: "Pacific room" }
        ],
        houseRules: [
          { ruleType: "pets", title: "No pets", description: "The home is kept allergy-aware.", isAllowed: false },
          { ruleType: "quiet_hours", title: "Quiet hours from 9pm", description: "Sound carries across the headlands.", isRequired: true },
          {
            ruleType: "events",
            title: "No commercial events",
            description: "Small family gatherings within occupancy are welcome.",
            isAllowed: false
          }
        ],
        cleaningFeeCents: 24e3,
        serviceFeeBasisPoints: 700,
        taxBasisPoints: 1200
      }
    },
    {
      id: "property_foundry",
      name: "Foundry Row",
      internalCode: "CS-FOUNDRY",
      propertyType: "apartment_building",
      timezone: "America/New_York",
      checkInFrom: "15:00",
      checkInUntil: "23:00",
      checkOutBy: "11:00",
      arrivalInstructions: "Replace with your entry, parking and Wi-Fi details for guests. Only guests with a confirmed stay see this.",
      address: {
        id: "address_foundry",
        addressLine1: "214 West Broughton Street",
        city: "Savannah",
        region: "Georgia",
        postalCode: "31401",
        countryCode: "US",
        latitude: 32.0809,
        longitude: -81.0952,
        publicLocationLabel: "Historic District, Savannah"
      },
      unit: {
        id: "unit_foundry",
        name: "Second-floor loft",
        accommodationType: "apartment",
        maxGuests: 4,
        bedroomCount: 2,
        bedCount: 2,
        bathroomCountHalfUnits: 3,
        squareFeet: 1250,
        floorLabel: "2",
        bedrooms: [
          {
            name: "Brick room",
            beds: [
              { bedType: "king", quantity: 1 }
            ]
          },
          {
            name: "Courtyard room",
            beds: [
              { bedType: "queen", quantity: 1 }
            ]
          }
        ]
      },
      listing: {
        id: "listing_foundry",
        title: "Foundry Loft",
        slug: "foundry-loft",
        subtitle: "Brick, linen, and tall windows in Savannah's Historic District",
        description: "A restored warehouse loft two blocks from City Market. Original beams frame a quiet, contemporary apartment with a chef's kitchen and a shaded balcony above the lane.",
        bookingMode: "instant",
        instantBook: true,
        isFeatured: true,
        baseNightlyRateCents: 24500,
        securityDepositCents: 3e4,
        minimumStay: 2,
        maximumStay: 10,
        amenities: ["wifi", "full-kitchen", "workspace", "air-conditioning", "washer-dryer"],
        collections: ["city-weekends"],
        media: [
          {
            imagePath: "/images/stays/foundry-loft-01.jpg",
            altText: "Brick loft living room with tall windows",
            caption: "Original foundry windows"
          },
          { imagePath: "/images/stays/foundry-loft-02.jpg", altText: "Calm loft bedroom with linen bedding", caption: "The brick room" }
        ],
        houseRules: [
          { ruleType: "pets", title: "No pets", description: "Service animals are accommodated as required.", isAllowed: false },
          {
            ruleType: "quiet_hours",
            title: "Quiet common hall",
            description: "Please keep the shared stair quiet after 10pm.",
            isRequired: true
          },
          {
            ruleType: "smoking",
            title: "No smoking",
            description: "Smoking and vaping are not permitted indoors or on the balcony.",
            isAllowed: false
          }
        ],
        cleaningFeeCents: 9500,
        serviceFeeBasisPoints: 800,
        taxBasisPoints: 1300
      }
    },
    {
      id: "property_juniper",
      name: "Juniper House",
      internalCode: "CS-JUNIPER",
      propertyType: "house",
      timezone: "America/Los_Angeles",
      checkInFrom: "16:00",
      checkInUntil: "22:00",
      checkOutBy: "11:00",
      arrivalInstructions: "Replace with your entry, parking and Wi-Fi details for guests. Only guests with a confirmed stay see this.",
      address: {
        id: "address_juniper",
        addressLine1: "6040 Sunset Road",
        city: "Joshua Tree",
        region: "California",
        postalCode: "92252",
        countryCode: "US",
        latitude: 34.1347,
        longitude: -116.319,
        publicLocationLabel: "Joshua Tree, California"
      },
      unit: {
        id: "unit_juniper",
        name: "Entire desert home",
        accommodationType: "entire_home",
        maxGuests: 6,
        bedroomCount: 3,
        bedCount: 3,
        bathroomCountHalfUnits: 4,
        squareFeet: 1700,
        bedrooms: [
          {
            name: "Sunrise room",
            beds: [
              { bedType: "king", quantity: 1 }
            ]
          },
          {
            name: "Juniper room",
            beds: [
              { bedType: "queen", quantity: 1 }
            ]
          },
          {
            name: "Studio room",
            beds: [
              { bedType: "queen", quantity: 1 }
            ]
          }
        ]
      },
      listing: {
        id: "listing_juniper",
        title: "Juniper Desert House",
        slug: "juniper-desert-house",
        subtitle: "Low desert architecture, stargazing court, and room to exhale",
        description: "A quiet modern home at the edge of town with a shaded courtyard, outdoor shower, and uninterrupted views toward the national park. Designed for slow mornings and long evenings under the stars.",
        bookingMode: "instant",
        instantBook: true,
        isFeatured: true,
        baseNightlyRateCents: 41e3,
        securityDepositCents: 75e3,
        minimumStay: 2,
        maximumStay: 14,
        amenities: ["wifi", "full-kitchen", "free-parking", "hot-tub", "air-conditioning", "workspace", "pets-welcome"],
        collections: ["desert-design"],
        media: [
          { imagePath: "/images/stays/juniper-house-01.jpg", altText: "Low modern house in the Joshua Tree desert", caption: "Sunset court" },
          {
            imagePath: "/images/stays/juniper-house-02.jpg",
            altText: "Minimal desert living room in warm natural tones",
            caption: "The great room"
          }
        ],
        houseRules: [
          {
            ruleType: "pets",
            title: "Dogs are welcome",
            description: "Up to two dogs with the pet fee included in your quote.",
            isAllowed: true
          },
          { ruleType: "quiet_hours", title: "Desert quiet after 9pm", description: "No amplified outdoor music.", isRequired: true },
          { ruleType: "events", title: "No events", description: "The house is for registered overnight guests only.", isAllowed: false }
        ],
        cleaningFeeCents: 18e3,
        serviceFeeBasisPoints: 750,
        taxBasisPoints: 1250
      }
    },
    {
      id: "property_alder",
      name: "Alder Ridge",
      internalCode: "CS-ALDER",
      propertyType: "chalet",
      timezone: "America/New_York",
      checkInFrom: "16:00",
      checkInUntil: "21:00",
      checkOutBy: "10:00",
      arrivalInstructions: "Replace with your entry, parking and Wi-Fi details for guests. Only guests with a confirmed stay see this.",
      address: {
        id: "address_alder",
        addressLine1: "41 Ridge Run",
        city: "Stowe",
        region: "Vermont",
        postalCode: "05672",
        countryCode: "US",
        latitude: 44.4654,
        longitude: -72.6874,
        publicLocationLabel: "Stowe, Vermont"
      },
      unit: {
        id: "unit_alder",
        name: "Entire mountain chalet",
        accommodationType: "chalet",
        maxGuests: 10,
        bedroomCount: 5,
        bedCount: 7,
        bathroomCountHalfUnits: 8,
        squareFeet: 4100,
        bedrooms: [
          {
            name: "Ridge suite",
            beds: [
              { bedType: "king", quantity: 1 }
            ]
          },
          {
            name: "Alder suite",
            beds: [
              { bedType: "king", quantity: 1 }
            ]
          },
          {
            name: "South room",
            beds: [
              { bedType: "queen", quantity: 1 }
            ]
          },
          {
            name: "North room",
            beds: [
              { bedType: "queen", quantity: 1 }
            ]
          },
          {
            name: "Bunk room",
            beds: [
              { bedType: "single", quantity: 3 }
            ]
          }
        ]
      },
      listing: {
        id: "listing_alder",
        title: "Alder Ridge Chalet",
        slug: "alder-ridge-chalet",
        subtitle: "A generous mountain house ten minutes from the lifts",
        description: "Gather a full house without giving up quiet corners. Alder Ridge pairs a stone hearth and long dining table with a sauna, boot room, and broad mountain views from the covered terrace.",
        bookingMode: "request",
        instantBook: false,
        isFeatured: true,
        baseNightlyRateCents: 78e3,
        securityDepositCents: 125e3,
        minimumStay: 3,
        maximumStay: 21,
        amenities: ["wifi", "full-kitchen", "free-parking", "hot-tub", "fireplace", "washer-dryer", "ski-access", "workspace"],
        collections: ["mountain-houses"],
        media: [
          { imagePath: "/images/stays/alder-ridge-01.jpg", altText: "Timber chalet on a snowy Vermont ridge", caption: "Alder Ridge in winter" },
          { imagePath: "/images/stays/alder-ridge-02.jpg", altText: "Chalet great room with stone fireplace", caption: "The hearth room" }
        ],
        houseRules: [
          { ruleType: "pets", title: "No pets", description: "The owner maintains an allergy-aware home.", isAllowed: false },
          { ruleType: "quiet_hours", title: "Outdoor quiet after 10pm", description: "Move conversation indoors after 10pm.", isRequired: true },
          {
            ruleType: "maximum_guests",
            title: "Ten overnight guests maximum",
            description: "All guests must be included in the reservation.",
            isRequired: true
          }
        ],
        cleaningFeeCents: 3e4,
        serviceFeeBasisPoints: 700,
        taxBasisPoints: 1e3
      }
    }
  ],
  guests: [
    {
      id: "guest_amara",
      name: "Amara Chen",
      email: "amara.chen@example.test",
      phone: "+1 (416) 555-0108",
      verificationStatus: "verified"
    },
    {
      id: "guest_mateo",
      name: "Mateo Rivera",
      email: "mateo.rivera@example.test",
      phone: "+1 (917) 555-0147",
      verificationStatus: "verified"
    },
    {
      id: "guest_ines",
      name: "Ines Laurent",
      email: "ines.laurent@example.test",
      phone: "+1 (514) 555-0164",
      verificationStatus: "pending"
    },
    {
      id: "guest_sana",
      name: "Sana Okafor",
      email: "sana.okafor@example.test",
      phone: "+1 (510) 555-0182",
      verificationStatus: "verified"
    }
  ],
  reservations: [
    {
      id: "reservation_pineglass_future",
      confirmationCode: "CS-2401",
      listingSlug: "pineglass-cabin",
      guestId: "guest_amara",
      status: "confirmed",
      source: "direct",
      checkInOffsetDays: 12,
      nights: 4,
      adults: 2,
      children: 1,
      infants: 0,
      pets: 1,
      conversation: [
        { direction: "inbound", senderType: "guest", body: "We are bringing one calm retriever. Is the lower trail clear after rain?" },
        { direction: "outbound", senderType: "host", body: "Absolutely. We checked it this morning and left two dog towels by the mudroom." }
      ]
    },
    {
      id: "reservation_foundry_current",
      confirmationCode: "CS-2402",
      listingSlug: "foundry-loft",
      guestId: "guest_ines",
      status: "in_stay",
      source: "direct",
      checkInOffsetDays: -1,
      nights: 3,
      adults: 2,
      children: 0,
      infants: 0,
      pets: 0,
      conversation: [
        {
          direction: "outbound",
          senderType: "host",
          body: "Your door code is active from 3pm. The loft is on the second floor above the blue awning."
        },
        { direction: "inbound", senderType: "guest", body: "We are in\u2014beautiful light in the living room. Thank you." }
      ]
    },
    {
      id: "reservation_tidehouse_completed",
      confirmationCode: "CS-2398",
      listingSlug: "tidehouse-villa",
      guestId: "guest_mateo",
      status: "completed",
      source: "direct",
      checkInOffsetDays: -32,
      nights: 4,
      adults: 4,
      children: 2,
      infants: 0,
      pets: 0,
      conversation: [
        { direction: "inbound", senderType: "guest", body: "Could you recommend a fish market for dinner at the house?" },
        { direction: "outbound", senderType: "host", body: "Princess Seafood in Fort Bragg is the best stop. I sent the route in your guide." }
      ]
    },
    {
      id: "reservation_juniper_channel",
      confirmationCode: "CS-2404",
      listingSlug: "juniper-desert-house",
      guestId: "guest_sana",
      status: "confirmed",
      source: "operator",
      checkInOffsetDays: 24,
      nights: 3,
      adults: 3,
      children: 0,
      infants: 0,
      pets: 1,
      conversation: [
        { direction: "inbound", senderType: "guest", body: "We will arrive after sunset. Is the road easy to find?" },
        {
          direction: "outbound",
          senderType: "host",
          body: "Yes. The final turn has a small amber reflector; your arrival guide includes a night photo."
        }
      ]
    }
  ],
  calendarBlocks: [
    {
      id: "block_alder_owner",
      listingSlug: "alder-ridge-chalet",
      startOffsetDays: 6,
      nights: 4,
      reason: "owner_block",
      source: "operator",
      notes: "Owner family weekend."
    },
    {
      id: "block_pineglass_preparation",
      listingSlug: "pineglass-cabin",
      startOffsetDays: 11,
      nights: 1,
      reason: "preparation",
      source: "operator",
      notes: "Arrival preparation before CS-2401."
    }
  ],
  tasks: [
    {
      id: "task_foundry_turnover",
      listingSlug: "foundry-loft",
      reservationId: "reservation_foundry_current",
      title: "Foundry Loft departure turnover",
      taskType: "turnover_cleaning",
      status: "assigned",
      priority: "normal",
      dueOffsetDays: 2
    },
    {
      id: "task_tidehouse_windows",
      listingSlug: "tidehouse-villa",
      title: "Inspect ocean-room window seals",
      taskType: "property_maintenance",
      status: "queued",
      priority: "normal",
      dueOffsetDays: 5
    }
  ],
  channel: {
    connection: {
      id: "channel_housekind_ical",
      name: "Juniper external calendar",
      provider: "ical",
      connectionType: "ical",
      status: "active",
      settings: { contract: "availability-only", eventLimit: 500 },
      syncAvailability: true,
      syncRates: false,
      syncReservations: false,
      syncMessages: false
    },
    listingSlug: "juniper-desert-house",
    externalListingId: "juniper-external-calendar",
    externalUid: "housekind-juniper-owner-hold-1",
    startOffsetDays: 38,
    nights: 2
  }
};

// features/platform/onboarding/lib/rentalOnboardingPlan.ts
function validateRentalOnboardingSeed(seed) {
  for (const reservation of seed.reservations) {
    const property = seed.properties.find((p) => p.listing.slug === reservation.listingSlug);
    if (!property) throw new Error("A stay references an unknown listing.");
    if (reservation.nights < property.listing.minimumStay || reservation.nights > property.listing.maximumStay) throw new Error(`${property.listing.title}: sample stay length must fit the configured minimum and maximum stay.`);
    if (reservation.adults + reservation.children > property.unit.maxGuests) throw new Error(`${property.listing.title}: sample guests exceed the configured capacity.`);
  }
}
var RENTAL_LIFECYCLE_READINESS = [
  { id: "lifecycle:stay-quotes", model: "StayQuote", label: "Guest quotes \xB7 from a bookable listing with rates and terms" },
  { id: "lifecycle:amendments", model: "ReservationAmendment", label: "Stay changes \xB7 made by the host on confirmed stays" },
  { id: "lifecycle:damage-claims", model: "DamageClaim", label: "Damage claims \xB7 opened by the host after a stay" },
  { id: "lifecycle:refunds", model: "Refund", label: "Refunds \xB7 need an installed payment method" },
  { id: "lifecycle:payment-webhooks", model: "PaymentWebhookEvent", label: "Payment confirmations \xB7 arrive from the card provider" },
  { id: "lifecycle:channel-reservations", model: "ChannelReservation", label: "Channel bookings \xB7 not used by availability-only calendars" }
];
function rentalOnboardingPlan(seed) {
  const item = (section, id2, label) => ({ section, id: id2, label, message: `Creating ${label}\u2026` });
  return [
    item("business", "settings", seed.settings.name),
    item("business", seed.hostOrganization.id, seed.hostOrganization.name),
    ...seed.amenities.map((a) => item("amenities", a.id, a.name)),
    ...seed.properties.map((p) => item("properties", p.id, p.name)),
    ...seed.properties.map((p) => item("accommodations", p.unit.id, `${p.unit.name} \xB7 ${p.listing.title}`)),
    item("policies", seed.cancellationPolicy.id, seed.cancellationPolicy.name),
    ...seed.properties.map((p) => item("policies", `${p.listing.id}:rules`, `${p.listing.title} house rules`)),
    ...seed.properties.map((p) => item("rates", `${p.listing.id}:rates`, `${p.listing.title} \xB7 ${new Intl.NumberFormat("en-US", { style: "currency", currency: seed.settings.currencyCode }).format(p.listing.baseNightlyRateCents / 100)}/night`)),
    ...seed.properties.map((p) => item("availability", `${p.listing.id}:calendar`, `${p.listing.title} calendar`)),
    ...seed.calendarBlocks.map((b) => item("availability", b.id, b.notes)),
    ...seed.guests.map((g) => item("workflows", g.id, g.name)),
    item("workflows", seed.paymentProvider.id, seed.paymentProvider.name),
    item("workflows", seed.cardPaymentProvider.id, seed.cardPaymentProvider.name),
    ...seed.reservations.map((r) => item("workflows", r.id, `${r.confirmationCode} stay workflow`)),
    ...seed.tasks.map((t) => item("workflows", t.id, t.title)),
    ...seed.reservations.some((r) => r.id === "reservation_tidehouse_completed") ? [item("workflows", "owner-accounting", "Owner statement & payout records")] : [],
    ...seed.channel ? [item("workflows", seed.channel.connection.id, "Availability-only calendar connection")] : [],
    ...RENTAL_LIFECYCLE_READINESS.map((entry) => ({ ...item("readiness", entry.id, entry.label), message: `Checking ${entry.label}\u2026` }))
  ];
}

// features/platform/onboarding/utils/dataUtils.ts
var text49 = (max = 500) => import_zod.z.string().trim().min(1).max(max);
var optionalText = (max = 500) => import_zod.z.string().trim().max(max).optional();
var id = import_zod.z.string().regex(/^[a-z0-9_]+$/).max(100);
var slug = import_zod.z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100);
var money = import_zod.z.number().int().min(0).max(1e7);
var bedSchema = import_zod.z.object({
  // Same vocabulary as the Bed model; the older `bunk_bed` spelling is accepted as `bunk`.
  bedType: import_zod.z.preprocess((value) => value === "bunk_bed" ? "bunk" : value, import_zod.z.enum(["king", "queen", "double", "single", "sofa_bed", "bunk", "crib", "floor_mattress"])),
  quantity: import_zod.z.number().int().min(1).max(10)
}).strict();
var bedroomSchema = import_zod.z.object({
  name: text49(100),
  beds: import_zod.z.array(bedSchema).min(1).max(10)
}).strict();
var addressSchema = import_zod.z.object({
  id,
  addressLine1: text49(200),
  city: text49(100),
  region: text49(100),
  postalCode: text49(30),
  countryCode: import_zod.z.string().regex(/^[A-Z]{2}$/),
  latitude: import_zod.z.number().min(-90).max(90),
  longitude: import_zod.z.number().min(-180).max(180),
  publicLocationLabel: text49(150)
}).strict();
var unitSchema = import_zod.z.object({
  id,
  name: text49(150),
  accommodationType: import_zod.z.enum(["entire_home", "apartment", "cabin", "villa", "cottage", "chalet", "condo", "townhouse", "guesthouse", "unique_stay"]),
  maxGuests: import_zod.z.number().int().min(1).max(50),
  bedroomCount: import_zod.z.number().int().min(0).max(30),
  bedCount: import_zod.z.number().int().min(1).max(50),
  bathroomCountHalfUnits: import_zod.z.number().int().min(1).max(40),
  squareFeet: import_zod.z.number().int().min(0).max(1e5),
  floorLabel: optionalText(50),
  bedrooms: import_zod.z.array(bedroomSchema).max(30)
}).strict();
var mediaSchema = import_zod.z.object({
  imagePath: import_zod.z.string().startsWith("/images/stays/").max(300),
  altText: text49(200),
  caption: optionalText(200)
}).strict();
var houseRuleSchema = import_zod.z.object({
  ruleType: import_zod.z.enum(["pets", "quiet_hours", "events", "smoking", "maximum_guests"]),
  title: text49(150),
  description: text49(500),
  isAllowed: import_zod.z.boolean().optional(),
  isRequired: import_zod.z.boolean().optional()
}).strict();
var listingSchema = import_zod.z.object({
  id,
  title: text49(150),
  slug,
  subtitle: optionalText(200),
  description: text49(2e3),
  bookingMode: import_zod.z.enum(["instant", "request"]),
  instantBook: import_zod.z.boolean(),
  isFeatured: import_zod.z.boolean(),
  baseNightlyRateCents: money,
  securityDepositCents: money,
  minimumStay: import_zod.z.number().int().min(1).max(365),
  maximumStay: import_zod.z.number().int().min(1).max(365),
  // Accepted for older custom configurations but never saved: ratings come from real reviews.
  reviewAverageHundredths: import_zod.z.number().int().min(0).max(500).optional(),
  reviewCount: import_zod.z.number().int().min(0).max(1e6).optional(),
  amenities: import_zod.z.array(slug).max(50),
  collections: import_zod.z.array(slug).max(30),
  media: import_zod.z.array(mediaSchema).min(1).max(20),
  houseRules: import_zod.z.array(houseRuleSchema).max(20),
  cleaningFeeCents: money,
  serviceFeeBasisPoints: import_zod.z.number().int().min(0).max(1e4),
  taxBasisPoints: import_zod.z.number().int().min(0).max(1e4)
}).strict().refine((value) => value.maximumStay >= value.minimumStay, {
  message: "Maximum stay must be at least the minimum stay.",
  path: ["maximumStay"]
});
var propertySchema = import_zod.z.object({
  id,
  name: text49(150),
  internalCode: import_zod.z.string().regex(/^[A-Z0-9-]+$/).max(50),
  propertyType: import_zod.z.enum(["house", "apartment_building", "cabin", "villa", "cottage", "chalet", "condo", "townhouse", "unique_stay"]),
  timezone: text49(100),
  checkInFrom: import_zod.z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  checkInUntil: import_zod.z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  checkOutBy: import_zod.z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  arrivalInstructions: optionalText(4e3),
  address: addressSchema,
  unit: unitSchema,
  listing: listingSchema
}).strict();
var customConfigurationSchema = import_zod.z.object({
  settings: import_zod.z.object({
    name: text49(100),
    tagline: text49(200),
    homepageHeadline: text49(200),
    publicDescription: text49(2e3),
    supportEmail: import_zod.z.string().email().max(200),
    supportPhone: text49(50),
    supportHours: optionalText(300),
    officeAddress: optionalText(300),
    currencyCode: import_zod.z.string().regex(/^[A-Z]{3}$/),
    locale: text49(30),
    timezone: text49(100),
    defaultMapLatitude: import_zod.z.number().min(-90).max(90),
    defaultMapLongitude: import_zod.z.number().min(-180).max(180),
    accentHue: import_zod.z.number().int().min(0).max(360),
    logoColor: import_zod.z.string().regex(/^\d{1,3}$/).optional(),
    isPublished: import_zod.z.boolean()
  }).strict(),
  hostOrganization: import_zod.z.object({
    id,
    name: text49(150),
    slug,
    organizationType: import_zod.z.enum(["individual_host", "property_manager", "cooperative"]),
    status: import_zod.z.literal("active"),
    publicBio: text49(2e3),
    publicEmail: import_zod.z.string().email().max(200),
    publicPhone: text49(50),
    website: import_zod.z.string().url().max(300),
    canonicalUrl: import_zod.z.string().url().max(300),
    federationId: text49(300),
    dataCustody: import_zod.z.enum(["self_hosted", "managed"]),
    isPublic: import_zod.z.boolean()
  }).strict(),
  cancellationPolicy: import_zod.z.object({
    id,
    name: text49(100),
    version: text49(100),
    policyType: import_zod.z.enum(["flexible", "moderate", "firm", "strict", "non_refundable", "custom"]),
    summary: text49(1e3),
    fullTerms: text49(3e3),
    freeCancellationHours: import_zod.z.number().int().min(0).max(8760),
    rules: import_zod.z.array(import_zod.z.object({ hoursBeforeCheckIn: import_zod.z.number().int().min(0).max(8760), refundBasisPoints: import_zod.z.number().int().min(0).max(1e4) }).strict()).min(1).max(20)
  }).strict(),
  amenities: import_zod.z.array(import_zod.z.object({ id, name: text49(100), slug, category: import_zod.z.enum(["essentials", "kitchen", "outdoor", "parking", "family", "accessibility", "safety", "entertainment", "workspace"]), iconKey: text49(100) }).strict()).min(1).max(50),
  collections: import_zod.z.array(import_zod.z.object({ id, name: text49(100), slug, description: text49(500), isActive: import_zod.z.boolean() }).strict()).min(1).max(30),
  properties: import_zod.z.array(propertySchema).min(1).max(10)
}).strict();
var clone = (value) => JSON.parse(JSON.stringify(value));
function assertUniqueIds(config2) {
  const identities = [
    config2.hostOrganization.id,
    config2.cancellationPolicy.id,
    ...config2.amenities.map((item) => item.id),
    ...config2.collections.map((item) => item.id),
    ...config2.properties.flatMap((item) => [item.id, item.address.id, item.unit.id, item.listing.id])
  ];
  const reserved = /* @__PURE__ */ new Set([
    "settings",
    seed_default.paymentProvider.id,
    seed_default.cardPaymentProvider.id,
    ...seed_default.guests.map((item) => item.id),
    ...seed_default.reservations.map((item) => item.id),
    ...seed_default.calendarBlocks.map((item) => item.id),
    ...seed_default.tasks.map((item) => item.id)
  ]);
  if (new Set(identities).size !== identities.length || identities.some((identity) => reserved.has(identity))) {
    throw new Error("Configuration identities must be unique and must not use reserved workflow identities.");
  }
}
function parseCustomSetupConfiguration(value) {
  const parsed = customConfigurationSchema.parse(value);
  assertUniqueIds(parsed);
  const amenitySlugs = new Set(parsed.amenities.map((item) => item.slug));
  const collectionSlugs = new Set(parsed.collections.map((item) => item.slug));
  const listingSlugs = new Set(parsed.properties.map((item) => item.listing.slug));
  const internalCodes = new Set(parsed.properties.map((item) => item.internalCode));
  if (amenitySlugs.size !== parsed.amenities.length) throw new Error("Amenity slugs must be unique.");
  if (collectionSlugs.size !== parsed.collections.length) throw new Error("Collection slugs must be unique.");
  if (listingSlugs.size !== parsed.properties.length) throw new Error("Listing slugs must be unique.");
  if (internalCodes.size !== parsed.properties.length) throw new Error("Property internal codes must be unique.");
  for (const property of parsed.properties) {
    if (property.listing.amenities.some((item) => !amenitySlugs.has(item))) throw new Error(`${property.listing.title} references an unknown amenity.`);
    if (property.listing.collections.some((item) => !collectionSlugs.has(item))) throw new Error(`${property.listing.title} references an unknown collection.`);
  }
  return parsed;
}
function getSeedForTemplate(template, custom) {
  const full = clone(seed_default);
  if (template === "full") return { ...full, onboardingTemplate: "full" };
  if (template === "custom") {
    const parsed = parseCustomSetupConfiguration(custom);
    const retained = new Map(seed_default.properties.flatMap((property2) => {
      const replacement = parsed.properties.find((item) => item.id === property2.id);
      return replacement ? [[property2.listing.slug, replacement]] : [];
    }));
    const mapListing = (item) => ({ ...item, listingSlug: retained.get(item.listingSlug).listing.slug });
    full.reservations = full.reservations.filter((item) => {
      const property2 = retained.get(item.listingSlug);
      return property2 && item.nights >= property2.listing.minimumStay && item.nights <= property2.listing.maximumStay && item.adults + item.children <= property2.unit.maxGuests;
    }).map(mapListing);
    const guestIds = new Set(full.reservations.map((item) => item.guestId));
    const reservationIds = new Set(full.reservations.map((item) => item.id));
    full.guests = full.guests.filter((item) => guestIds.has(item.id));
    full.calendarBlocks = full.calendarBlocks.filter((item) => retained.has(item.listingSlug)).map(mapListing);
    full.tasks = full.tasks.filter((item) => retained.has(item.listingSlug) && (!item.reservationId || reservationIds.has(item.reservationId))).map(mapListing);
    full.channel = full.channel && retained.has(full.channel.listingSlug) ? mapListing(full.channel) : null;
    if (parsed.hostOrganization.id !== seed_default.hostOrganization.id) {
      full.paymentProvider.id = `${parsed.hostOrganization.id}_manual_provider`;
      full.cardPaymentProvider.id = `${parsed.hostOrganization.id}_card_provider`;
    }
    return { ...full, ...parsed, onboardingTemplate: "custom" };
  }
  const property = full.properties.find((item) => item.listing.slug === "pineglass-cabin");
  const reservation = full.reservations.find((item) => item.listingSlug === "pineglass-cabin");
  const amenitySlugs = new Set(property.listing.amenities);
  const collectionSlugs = new Set(property.listing.collections);
  return {
    ...full,
    onboardingTemplate: "minimal",
    amenities: full.amenities.filter((item) => amenitySlugs.has(item.slug)),
    collections: full.collections.filter((item) => collectionSlugs.has(item.slug)),
    properties: [property],
    guests: full.guests.filter((item) => item.id === reservation.guestId),
    reservations: [reservation],
    calendarBlocks: full.calendarBlocks.filter((item) => item.listingSlug === property.listing.slug),
    tasks: [],
    channel: null
  };
}

// features/keystone/onboarding/createOrReuse.ts
var HOST_SCOPED_PARENTS = {
  addressId: "propertyAddress",
  propertyId: "property",
  accommodationUnitId: "accommodationUnit",
  bedroomId: "bedroom",
  listingId: "listing",
  ratePlanId: "ratePlan",
  cancellationPolicyId: "cancellationPolicy",
  guestId: "guestProfile",
  primaryGuestId: "guestProfile",
  reservationId: "reservation",
  agreementId: "stayAgreement",
  securityDepositId: "securityDeposit",
  paymentProviderId: "paymentProvider",
  paymentId: "payment",
  conversationId: "conversation",
  ownerId: "propertyOwner",
  statementId: "ownerStatement",
  taskRuleId: "taskRule",
  connectionId: "channelConnection",
  channelConnectionId: "channelConnection",
  channelListingId: "channelListing"
};
async function assertSameHostParents(prisma, model, data) {
  const hostOrganizationId = data?.hostOrganizationId;
  if (!hostOrganizationId) return;
  for (const [field, parentModel] of Object.entries(HOST_SCOPED_PARENTS)) {
    const id2 = data[field];
    if (typeof id2 !== "string" || !id2) continue;
    const parent = await prisma[parentModel]?.findUnique({ where: { id: id2 }, select: { hostOrganizationId: true } });
    if (!parent) throw new Error(`Missing ${parentModel} dependency for ${model}. Complete the earlier setup step first.`);
    if (parent.hostOrganizationId !== hostOrganizationId) throw new Error(`The ${parentModel} for this ${model} belongs to a different host organization.`);
  }
}
function createOrReuseDatabase(prisma) {
  const created = /* @__PURE__ */ new Map();
  return new Proxy(prisma, {
    get(target, model) {
      const delegate = target[model];
      if (!delegate || typeof delegate !== "object") return delegate;
      return new Proxy(delegate, {
        get(record5, method) {
          if (method === "deleteMany" || method === "delete") throw new Error("Onboarding may not delete merchant records.");
          if (method === "upsert") return async ({ where, create }) => {
            const existing = await record5.findUnique({ where });
            if (existing) {
              if (create?.hostOrganizationId && existing.hostOrganizationId && existing.hostOrganizationId !== create.hostOrganizationId) {
                throw new Error(`This ${model} belongs to a different host organization.`);
              }
              return existing;
            }
            await assertSameHostParents(target, model, create);
            const saved = await record5.upsert({ where, create, update: {} });
            const ids = created.get(model) || /* @__PURE__ */ new Set();
            ids.add(String(saved.id));
            created.set(model, ids);
            return saved;
          };
          if (method === "update") return async ({ where, data }) => {
            const existing = await record5.findUnique({ where });
            if (!existing) throw new Error(`Missing ${model} dependency.`);
            if (!created.get(model)?.has(String(existing.id))) return existing;
            await assertSameHostParents(target, model, { ...data, hostOrganizationId: data?.hostOrganizationId || existing.hostOrganizationId });
            return record5.update({ where, data });
          };
          const value = record5[method];
          return typeof value === "function" ? value.bind(record5) : value;
        }
      });
    }
  });
}

// features/keystone/security/internalIdentity.ts
var import_node_crypto29 = require("node:crypto");

// features/keystone/lib/internal-origin.ts
function normalizeBackendOrigin(value) {
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("The Keystone backend URL must be an absolute HTTP(S) origin.");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" && url.pathname !== "" || url.search || url.hash) {
    throw new Error("The Keystone backend URL must be an HTTP(S) origin without credentials or a path.");
  }
  return url.origin;
}

// features/keystone/onboarding/rentalSeedOperations.ts
var DAY_MS8 = 24 * 60 * 60 * 1e3;
function dateOnly3(anchor, offsetDays) {
  const base = anchor && /^\d{4}-\d{2}-\d{2}$/.test(anchor) ? /* @__PURE__ */ new Date(`${anchor}T00:00:00.000Z`) : /* @__PURE__ */ new Date();
  const utc = Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + offsetDays);
  return new Date(utc).toISOString().slice(0, 10);
}
function timestamp21(anchor, offsetDays, hour = 12) {
  return /* @__PURE__ */ new Date(`${dateOnly3(anchor, offsetDays)}T${String(hour).padStart(2, "0")}:00:00.000Z`);
}
var SAMPLE_STAY_NOTE = "Sample stay created by setup. No payment, signature or deposit has been recorded for it.";
function getListingSeed(seed, slug2) {
  for (const property of seed.properties || []) {
    if (property.listing.slug === slug2) return { property, listing: property.listing, unit: property.unit };
  }
  throw new Error(`Seed listing ${slug2} not found.`);
}
async function assertSeedCapacityAvailable(db, {
  hostOrganizationId,
  listingId,
  startDate,
  endDate,
  excludeReservationId,
  excludeCalendarBlockId,
  reason
}) {
  if (reason === "reservation" && !excludeReservationId) {
    throw new Error("Seed reservation capacity blocks require a reservation lifecycle identity.");
  }
  await lockListingCapacity(db, [listingId]);
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { id: true, hostOrganizationId: true, accommodationUnitId: true }
  });
  if (!listing || listing.hostOrganizationId !== hostOrganizationId) {
    throw new Error("Seed calendar allocation must belong to the selected host organization.");
  }
  await lockAccommodationUnitCapacity(db, [listing.accommodationUnitId]);
  let safeExcludeCalendarBlockId;
  if (excludeCalendarBlockId) {
    const existing = await db.calendarBlock.findUnique({
      where: { id: excludeCalendarBlockId },
      select: { hostOrganizationId: true, listingId: true, startDate: true, endDate: true, reason: true, status: true, reservationId: true }
    });
    if (!existing || existing.hostOrganizationId === hostOrganizationId && existing.listingId === listingId && existing.startDate === startDate && existing.endDate === endDate && existing.reason === reason && existing.status === "active" && existing.reservationId === (excludeReservationId || null) && (reason !== "reservation" || Boolean(excludeReservationId))) safeExcludeCalendarBlockId = excludeCalendarBlockId;
  }
  const conflict = listing.accommodationUnitId ? await findAccommodationUnitCapacityConflict(db, {
    accommodationUnitId: listing.accommodationUnitId,
    hostOrganizationId,
    checkInDate: startDate,
    checkOutDate: endDate,
    excludeReservationId,
    excludeCalendarBlockId: safeExcludeCalendarBlockId
  }) : await findListingCapacityConflict(db, {
    listingId,
    checkInDate: startDate,
    checkOutDate: endDate,
    excludeReservationId,
    excludeCalendarBlockId: safeExcludeCalendarBlockId
  });
  if (conflict) throw new Error("Seed calendar availability overlaps an existing reservation or active block.");
}
async function seedProperties(db, seed, phase) {
  const hostId = seed.hostOrganization.id;
  const listingIds = /* @__PURE__ */ new Map();
  const seedPropertyIds = (seed.properties || []).map((item) => item.id);
  const seedListingIds = (seed.properties || []).map((item) => item.listing?.id).filter(Boolean);
  const [archivedProperty, archivedListing] = await Promise.all([
    db.property.findFirst({ where: { id: { in: seedPropertyIds }, status: "archived" }, select: { name: true } }),
    db.listing.findFirst({ where: { id: { in: seedListingIds }, status: "archived" }, select: { title: true } })
  ]);
  if (archivedProperty || archivedListing) {
    throw new Error(`Sample ${archivedProperty ? `property \u201C${archivedProperty.name}\u201D` : `listing \u201C${archivedListing.title}\u201D`} was archived. Setup can\u2019t re-create archived records.`);
  }
  for (const propertySeed of seed.properties || []) {
    const { address, unit, listing, ...property } = propertySeed;
    if (phase === "properties") {
      await db.propertyAddress.upsert({
        where: { id: address.id },
        update: { ...address, hostOrganizationId: hostId, showExactAddressPublicly: false },
        create: { ...address, hostOrganizationId: hostId, showExactAddressPublicly: false }
      });
      await db.property.upsert({
        where: { id: property.id },
        update: { ...property, hostOrganizationId: hostId, addressId: address.id, status: "active" },
        create: { ...property, hostOrganizationId: hostId, addressId: address.id, status: "active" }
      });
    }
    if (phase === "accommodations") {
      const { bedrooms, ...unitData } = unit;
      await db.accommodationUnit.upsert({
        where: { id: unit.id },
        update: { ...unitData, hostOrganizationId: hostId, propertyId: property.id, status: "available" },
        create: { ...unitData, hostOrganizationId: hostId, propertyId: property.id, status: "available" }
      });
      for (const [bedroomIndex, bedroomSeed] of (bedrooms || []).entries()) {
        const bedroomId = `${unit.id}_bedroom_${bedroomIndex + 1}`;
        await db.bedroom.upsert({
          where: { id: bedroomId },
          update: { name: bedroomSeed.name, order: bedroomIndex, hostOrganizationId: hostId, accommodationUnitId: unit.id },
          create: { id: bedroomId, name: bedroomSeed.name, order: bedroomIndex, hostOrganizationId: hostId, accommodationUnitId: unit.id }
        });
        for (const [bedIndex, bed] of (bedroomSeed.beds || []).entries()) {
          const bedId = `${bedroomId}_bed_${bedIndex + 1}`;
          await db.bed.upsert({
            where: { id: bedId },
            update: { ...bed, hostOrganizationId: hostId, bedroomId },
            create: { id: bedId, ...bed, hostOrganizationId: hostId, bedroomId }
          });
        }
      }
      const { amenities, collections, media, houseRules, cleaningFeeCents, serviceFeeBasisPoints, taxBasisPoints, reviewAverageHundredths: _average, reviewCount: _count, ...listingData } = listing;
      const amenityIds = amenities.map((slug2) => seed.amenities.find((item) => item.slug === slug2)?.id).filter(Boolean);
      const collectionIds = collections.map((slug2) => seed.collections.find((item) => item.slug === slug2)?.id).filter(Boolean);
      const updateListingRelations = {
        amenities: { set: amenityIds.map((id2) => ({ id: id2 })) },
        collections: { set: collectionIds.map((id2) => ({ id: id2 })) }
      };
      const createListingRelations = {
        amenities: { connect: amenityIds.map((id2) => ({ id: id2 })) },
        collections: { connect: collectionIds.map((id2) => ({ id: id2 })) }
      };
      const listingRecord = await db.listing.upsert({
        where: { id: listing.id },
        update: { ...listingData, hostOrganizationId: hostId, propertyId: property.id, accommodationUnitId: unit.id, status: "published", currencyCode: seed.settings.currencyCode, ...updateListingRelations },
        create: { ...listingData, hostOrganizationId: hostId, propertyId: property.id, accommodationUnitId: unit.id, status: "published", currencyCode: seed.settings.currencyCode, ...createListingRelations }
      });
      listingIds.set(listing.slug, listingRecord.id);
      for (const [index, item] of (media || []).entries()) {
        const mediaId = `${listing.id}_media_${index + 1}`;
        await db.listingMedia.upsert({
          where: { id: mediaId },
          update: { ...item, order: index, metadata: { source: "unsplash", localSeedAsset: true }, hostOrganizationId: hostId, listingId: listing.id },
          create: { id: mediaId, ...item, order: index, metadata: { source: "unsplash", localSeedAsset: true }, hostOrganizationId: hostId, listingId: listing.id }
        });
      }
    }
    if (phase === "policies") {
      for (const [index, rule] of (listing.houseRules || []).entries()) {
        const ruleId = `${listing.id}_rule_${index + 1}`;
        await db.houseRule.upsert({
          where: { id: ruleId },
          update: { ...rule, hostOrganizationId: hostId, listingId: listing.id },
          create: { id: ruleId, ...rule, hostOrganizationId: hostId, listingId: listing.id }
        });
      }
    }
    if (phase === "rates") {
      const { cleaningFeeCents, serviceFeeBasisPoints, taxBasisPoints } = listing;
      const ratePlanId = `${listing.id}_rate_default`;
      await db.ratePlan.upsert({
        where: { id: ratePlanId },
        update: {
          hostOrganizationId: hostId,
          listingId: listing.id,
          cancellationPolicyId: seed.cancellationPolicy.id,
          name: "Flexible direct rate",
          description: "Public nightly rate with a versioned moderate cancellation policy.",
          status: "active",
          currencyCode: seed.settings.currencyCode,
          baseNightlyRateCents: listing.baseNightlyRateCents,
          minimumStay: listing.minimumStay,
          maximumStay: listing.maximumStay,
          advanceNoticeHours: 24,
          bookingWindowDays: 365,
          isDefault: true
        },
        create: {
          id: ratePlanId,
          hostOrganizationId: hostId,
          listingId: listing.id,
          cancellationPolicyId: seed.cancellationPolicy.id,
          name: "Flexible direct rate",
          description: "Public nightly rate with a versioned moderate cancellation policy.",
          status: "active",
          currencyCode: seed.settings.currencyCode,
          baseNightlyRateCents: listing.baseNightlyRateCents,
          minimumStay: listing.minimumStay,
          maximumStay: listing.maximumStay,
          advanceNoticeHours: 24,
          bookingWindowDays: 365,
          isDefault: true
        }
      });
      await db.seasonalRate.upsert({
        where: { id: `${ratePlanId}_peak` },
        update: { hostOrganizationId: hostId, ratePlanId, name: "Peak season", startDate: dateOnly3(seed.anchorDate, 45), endDate: dateOnly3(seed.anchorDate, 105), adjustmentBasisPoints: 1500, minimumStay: Math.max(listing.minimumStay, 3), priority: 10, isActive: true },
        create: { id: `${ratePlanId}_peak`, hostOrganizationId: hostId, ratePlanId, name: "Peak season", startDate: dateOnly3(seed.anchorDate, 45), endDate: dateOnly3(seed.anchorDate, 105), adjustmentBasisPoints: 1500, minimumStay: Math.max(listing.minimumStay, 3), priority: 10, isActive: true }
      });
      await db.feeDefinition.upsert({
        where: { id: `${listing.id}_fee_cleaning` },
        update: { hostOrganizationId: hostId, listingId: listing.id, name: "Cleaning fee", feeType: "cleaning", calculation: "fixed", amountCents: cleaningFeeCents, percentageBasisPoints: 0, taxable: true, required: true, isActive: true },
        create: { id: `${listing.id}_fee_cleaning`, hostOrganizationId: hostId, listingId: listing.id, name: "Cleaning fee", feeType: "cleaning", calculation: "fixed", amountCents: cleaningFeeCents, percentageBasisPoints: 0, taxable: true, required: true, isActive: true }
      });
      await db.feeDefinition.upsert({
        where: { id: `${listing.id}_fee_service` },
        update: { hostOrganizationId: hostId, listingId: listing.id, name: "Direct booking service", feeType: "service", calculation: "percentage", amountCents: 0, percentageBasisPoints: serviceFeeBasisPoints, taxable: true, required: true, isActive: true },
        create: { id: `${listing.id}_fee_service`, hostOrganizationId: hostId, listingId: listing.id, name: "Direct booking service", feeType: "service", calculation: "percentage", amountCents: 0, percentageBasisPoints: serviceFeeBasisPoints, taxable: true, required: true, isActive: true }
      });
      await db.taxRule.upsert({
        where: { id: `${listing.id}_tax_lodging` },
        update: { hostOrganizationId: hostId, listingId: listing.id, name: "Lodging tax", jurisdiction: address.city, rateBasisPoints: taxBasisPoints, isInclusive: false, isActive: true },
        create: { id: `${listing.id}_tax_lodging`, hostOrganizationId: hostId, listingId: listing.id, name: "Lodging tax", jurisdiction: address.city, rateBasisPoints: taxBasisPoints, isInclusive: false, isActive: true }
      });
    }
  }
  return listingIds;
}
async function seedGuests(db, seed) {
  for (const guest of seed.guests || []) {
    await db.guestProfile.upsert({
      where: { id: guest.id },
      update: { ...guest, hostOrganizationId: seed.hostOrganization.id },
      create: { ...guest, hostOrganizationId: seed.hostOrganization.id }
    });
  }
}
async function calculateSeedQuote(seed, reservationSeed) {
  const { property, listing, unit } = getListingSeed(seed, reservationSeed.listingSlug);
  const checkIn = dateOnly3(seed.anchorDate, reservationSeed.checkInOffsetDays);
  const checkOut = dateOnly3(seed.anchorDate, reservationSeed.checkInOffsetDays + reservationSeed.nights);
  if (typeof seed.loadListing !== "function") throw new Error("Sample stays need the saved listing to be read.");
  const saved = await seed.loadListing(listing.id);
  if (!saved?.accommodationUnit?.id) throw new Error("Set up the listing, its accommodation and rates before its sample stay.");
  const plan = effectiveStayRatePlan(saved);
  const readiness = onlineQuoteReadinessProblem(plan, saved);
  if (readiness || !plan) throw new Error(`${listing.title}: ${readiness || "no published nightly rate"}`);
  const quote = calculateStayQuote(stayCalculationInput(saved, plan, {
    checkIn,
    checkOut,
    guestCount: reservationSeed.adults + reservationSeed.children,
    pets: reservationSeed.pets || 0
  }));
  return { property, listing, unit, checkIn, checkOut, quote, listingSnapshot: listingBookingSnapshot(saved), cancellationPolicy: plan.cancellationPolicy };
}
async function seedReservations(db, seed) {
  const hostId = seed.hostOrganization.id;
  for (const reservationSeed of seed.reservations || []) {
    if (await db.reservation.findUnique({ where: { id: reservationSeed.id } })) continue;
    const { property, listing, unit, checkIn, checkOut, quote, listingSnapshot, cancellationPolicy } = await calculateSeedQuote(seed, reservationSeed);
    const guest = seed.guests.find((item) => item.id === reservationSeed.guestId);
    const party = {
      primaryGuest: { id: guest.id, name: guest.name, email: guest.email, phone: guest.phone },
      adults: reservationSeed.adults,
      children: reservationSeed.children,
      infants: reservationSeed.infants,
      pets: reservationSeed.pets,
      invitedGuests: []
    };
    const quoteSnapshot = { ...quote, quoteNumber: `Q-${reservationSeed.confirmationCode}` };
    const bookingSnapshot = {
      ...createStayBookingSnapshot({
        listing: listingSnapshot,
        guestParty: party,
        cancellationPolicy,
        quote: quoteSnapshot
      }),
      provenance: "onboarding_sample"
    };
    const amountPaidCents = 0;
    const active = ["pending", "confirmed", "in_stay"].includes(reservationSeed.status);
    const now = /* @__PURE__ */ new Date();
    const checkedInAt = ["in_stay", "completed"].includes(reservationSeed.status) ? timestamp21(seed.anchorDate, reservationSeed.checkInOffsetDays, 16) : null;
    const checkedOutAt = reservationSeed.status === "completed" ? timestamp21(seed.anchorDate, reservationSeed.checkInOffsetDays + reservationSeed.nights, 10) : null;
    const reservationData = {
      hostOrganizationId: hostId,
      listingId: listing.id,
      accommodationUnitId: unit.id,
      guestId: guest.id,
      confirmationCode: reservationSeed.confirmationCode,
      // Per-installation random link; the host reissues it to a real guest when needed.
      tripTokenHash: hashPublicOwnershipToken(createPublicOwnershipToken()),
      tripTokenExpiresAt: new Date((/* @__PURE__ */ new Date(`${checkOut}T00:00:00.000Z`)).getTime() + 30 * DAY_MS8),
      status: reservationSeed.status,
      paymentStatus: "unpaid",
      source: reservationSeed.source,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      scheduledCheckInTime: property.checkInFrom,
      scheduledCheckOutTime: property.checkOutBy,
      checkedInAt,
      checkedOutAt,
      currencyCode: quote.currencyCode,
      lodgingSubtotalCents: quote.lodgingSubtotalCents,
      feeTotalCents: quote.feeTotalCents,
      taxTotalCents: quote.taxTotalCents,
      discountTotalCents: 0,
      securityDepositCents: quote.securityDepositCents,
      totalAmountCents: quote.totalAmountCents,
      amountPaidCents,
      bookingSnapshot,
      guestNotes: "",
      internalNotes: SAMPLE_STAY_NOTE,
      // Authoritative origin, written by this setup run: never real capacity, money or assent.
      fixtureOrigin: FIXTURE_ORIGIN,
      fixtureEvidence: fixtureEvidence("setup_run", { anchorDate: seed.anchorDate, setupRecordId: reservationSeed.id })
    };
    const reservationBlockId = `${reservationSeed.id}_block`;
    await assertSeedCapacityAvailable(db, {
      hostOrganizationId: hostId,
      listingId: listing.id,
      startDate: checkIn,
      endDate: checkOut,
      excludeReservationId: reservationSeed.id,
      excludeCalendarBlockId: reservationBlockId,
      reason: "reservation"
    });
    await db.reservation.upsert({ where: { id: reservationSeed.id }, update: reservationData, create: { id: reservationSeed.id, ...reservationData } });
    await db.guestParty.upsert({
      where: { id: `${reservationSeed.id}_party` },
      update: { hostOrganizationId: hostId, reservationId: reservationSeed.id, primaryGuestId: guest.id, adults: reservationSeed.adults, children: reservationSeed.children, infants: reservationSeed.infants, pets: reservationSeed.pets, invitedGuests: [] },
      create: { id: `${reservationSeed.id}_party`, hostOrganizationId: hostId, reservationId: reservationSeed.id, primaryGuestId: guest.id, adults: reservationSeed.adults, children: reservationSeed.children, infants: reservationSeed.infants, pets: reservationSeed.pets, invitedGuests: [] }
    });
    for (const line of createReservationLineItemsFromQuote(reservationSeed.id, quoteSnapshot)) {
      await db.reservationLineItem.upsert({
        where: { snapshotKey: line.snapshotKey },
        update: { ...line, hostOrganizationId: hostId, reservationId: reservationSeed.id },
        create: { id: `line_${line.snapshotKey.replace(/[^a-zA-Z0-9]/g, "_")}`, ...line, hostOrganizationId: hostId, reservationId: reservationSeed.id }
      });
    }
    await db.calendarBlock.upsert({
      where: { id: reservationBlockId },
      update: { hostOrganizationId: hostId, listingId: listing.id, reservationId: reservationSeed.id, startDate: checkIn, endDate: checkOut, reason: "reservation", status: "active", source: reservationSeed.source === "direct" ? "direct" : "channel_api", notes: reservationSeed.confirmationCode, fixtureOrigin: FIXTURE_ORIGIN },
      create: { id: reservationBlockId, hostOrganizationId: hostId, listingId: listing.id, reservationId: reservationSeed.id, startDate: checkIn, endDate: checkOut, reason: "reservation", status: "active", source: reservationSeed.source === "direct" ? "direct" : "channel_api", notes: reservationSeed.confirmationCode, fixtureOrigin: FIXTURE_ORIGIN }
    });
    const agreementId = `${reservationSeed.id}_agreement`;
    const agreementData = {
      hostOrganizationId: hostId,
      guestId: guest.id,
      cancellationPolicyId: cancellationPolicy?.id || null,
      agreementNumber: `AGR-${reservationSeed.confirmationCode}`,
      signingTokenHash: hashPublicOwnershipToken(createPublicOwnershipToken()),
      signingTokenExpiresAt: timestamp21(seed.anchorDate, 30),
      // Only a guest signing through their link records a signature.
      status: active ? "sent" : "draft",
      title: `Stay terms for ${listing.title}`,
      signerEmail: guest.email,
      signatureName: "",
      signedAt: null,
      termsSnapshot: { listing: bookingSnapshot.listing, cancellationPolicy: bookingSnapshot.cancellationPolicy, houseRules: bookingSnapshot.listing.houseRules || [], checkInDate: checkIn, checkOutDate: checkOut }
    };
    await db.stayAgreement.upsert({ where: { id: agreementId }, update: agreementData, create: { id: agreementId, ...agreementData } });
    const depositId = `${reservationSeed.id}_deposit`;
    await db.securityDeposit.upsert({
      where: { id: depositId },
      // Required and uncollected: holding or releasing a deposit is a real event the host records.
      update: { hostOrganizationId: hostId, depositNumber: `DEP-${reservationSeed.confirmationCode}`, status: "required", amountCents: quote.securityDepositCents, capturedAmountCents: 0, currencyCode: quote.currencyCode, heldAt: null, releasedAt: null },
      create: { id: depositId, hostOrganizationId: hostId, depositNumber: `DEP-${reservationSeed.confirmationCode}`, status: "required", amountCents: quote.securityDepositCents, capturedAmountCents: 0, currencyCode: quote.currencyCode, heldAt: null, releasedAt: null }
    });
    await db.reservation.update({ where: { id: reservationSeed.id }, data: { agreementId, securityDepositId: depositId } });
    const conversationId = `${reservationSeed.id}_conversation`;
    await db.conversation.upsert({
      where: { id: conversationId },
      update: { hostOrganizationId: hostId, reservationId: reservationSeed.id, listingId: listing.id, guestId: guest.id, subject: `${guest.name} \xB7 ${listing.title}`, status: "open", lastMessageAt: now },
      create: { id: conversationId, hostOrganizationId: hostId, reservationId: reservationSeed.id, listingId: listing.id, guestId: guest.id, subject: `${guest.name} \xB7 ${listing.title}`, status: "open", lastMessageAt: now }
    });
    for (const [index, message] of (reservationSeed.conversation || []).entries()) {
      const messageId = `${conversationId}_message_${index + 1}`;
      await db.message.upsert({
        where: { id: messageId },
        update: { hostOrganizationId: hostId, conversationId, ...message, status: message.direction === "inbound" ? "received" : "delivered", sentAt: timestamp21(seed.anchorDate, reservationSeed.checkInOffsetDays - 2 + index, 14 + index) },
        create: { id: messageId, hostOrganizationId: hostId, conversationId, ...message, status: message.direction === "inbound" ? "received" : "delivered", sentAt: timestamp21(seed.anchorDate, reservationSeed.checkInOffsetDays - 2 + index, 14 + index) }
      });
    }
  }
}
async function seedOperations(db, seed) {
  const hostId = seed.hostOrganization.id;
  for (const block of seed.calendarBlocks || []) {
    const listingId = getListingSeed(seed, block.listingSlug).listing.id;
    const startDate = dateOnly3(seed.anchorDate, block.startOffsetDays);
    const endDate = dateOnly3(seed.anchorDate, block.startOffsetDays + block.nights);
    await assertSeedCapacityAvailable(db, {
      hostOrganizationId: hostId,
      listingId,
      startDate,
      endDate,
      excludeCalendarBlockId: block.id,
      reason: block.reason
    });
    await db.calendarBlock.upsert({
      where: { id: block.id },
      update: { hostOrganizationId: hostId, listingId, startDate, endDate, reason: block.reason, status: "active", source: block.source, notes: block.notes, fixtureOrigin: FIXTURE_ORIGIN },
      create: { id: block.id, hostOrganizationId: hostId, listingId, startDate, endDate, reason: block.reason, status: "active", source: block.source, notes: block.notes, fixtureOrigin: FIXTURE_ORIGIN }
    });
  }
  const turnoverRuleId = "task_rule_departure_turnover";
  const foundryProperty = (seed.properties || []).find((item) => item.id === "property_foundry");
  const operationsAdmin = { id: seed.onboardingUserId };
  if (foundryProperty && !seed.skipTaskRules) {
    await db.taskRule.upsert({
      where: { id: turnoverRuleId },
      update: { hostOrganizationId: hostId, propertyId: foundryProperty.id, listingId: foundryProperty.listing.id, code: "departure-turnover", name: "Departure turnover", trigger: "after_check_out", offsetMinutes: 60, taskType: "turnover_cleaning", titleTemplate: "Turn over {{listing.title}} after {{reservation.confirmationCode}}", priority: "normal", checklistTemplate: ["linens", "bathrooms", "kitchen", "locks", "supplies"], isActive: true },
      create: { id: turnoverRuleId, hostOrganizationId: hostId, propertyId: foundryProperty.id, listingId: foundryProperty.listing.id, code: "departure-turnover", name: "Departure turnover", trigger: "after_check_out", offsetMinutes: 60, taskType: "turnover_cleaning", titleTemplate: "Turn over {{listing.title}} after {{reservation.confirmationCode}}", priority: "normal", checklistTemplate: ["linens", "bathrooms", "kitchen", "locks", "supplies"], isActive: true }
    });
  }
  for (const task of seed.tasks || []) {
    const listingSeed = getListingSeed(seed, task.listingSlug);
    const automated = task.id === "task_foundry_turnover";
    const data = {
      hostOrganizationId: hostId,
      propertyId: listingSeed.property.id,
      listingId: listingSeed.listing.id,
      reservationId: task.reservationId || null,
      taskRuleId: automated ? turnoverRuleId : null,
      idempotencyKey: automated ? propertyTaskRuleKey(turnoverRuleId, task.reservationId) : `manual-task:${task.id}`,
      source: automated ? "task_rule" : "manual",
      title: task.title,
      taskType: task.taskType,
      status: task.status,
      priority: task.priority,
      dueAt: timestamp21(seed.anchorDate, task.dueOffsetDays),
      assigneeId: task.status === "assigned" ? operationsAdmin?.id || null : null,
      claimedAt: task.status === "assigned" ? /* @__PURE__ */ new Date() : null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      checklist: automated ? ["linens", "bathrooms", "kitchen", "locks", "supplies"] : [],
      completionEvidence: null,
      completionNotes: ""
    };
    await db.propertyTask.upsert({ where: { id: task.id }, update: data, create: { id: task.id, ...data } });
  }
}
async function seedOwnerAccounting(db, seed) {
  if (await db.ownerStatement.findUnique({ where: { id: "owner_statement_tidehouse_current" } })) return;
  const hostId = seed.hostOrganization.id;
  const ownerId = "owner_tidehouse";
  const assignmentId = "owner_assignment_tidehouse";
  const reservationSeed = seed.reservations.find((item) => item.id === "reservation_tidehouse_completed");
  if (!reservationSeed) return;
  const { property } = getListingSeed(seed, reservationSeed.listingSlug);
  const reservation = await db.reservation.findUnique({ where: { id: reservationSeed.id } });
  if (!reservation || reservation.hostOrganizationId !== hostId) throw new Error("Create the sample stay before its owner statement.");
  const periodStart = dateOnly3(seed.anchorDate, -60);
  const periodEnd = dateOnly3(seed.anchorDate, 1);
  await db.propertyOwner.upsert({
    where: { id: ownerId },
    update: { hostOrganizationId: hostId, ownerNumber: "OWN-1001", displayName: "Mara Bell", companyName: "Tidehouse Mendocino LLC", email: "mara.bell@housekind.local", phone: "+1 (707) 555-0184", status: "active", payoutSchedule: "monthly", defaultManagerCommissionBasisPoints: 1500, payoutMethod: "manual", payoutReference: "Owner ledger 1001", taxProfile: { classification: "business", countryCode: "US" } },
    create: { id: ownerId, hostOrganizationId: hostId, ownerNumber: "OWN-1001", displayName: "Mara Bell", companyName: "Tidehouse Mendocino LLC", email: "mara.bell@housekind.local", phone: "+1 (707) 555-0184", status: "active", payoutSchedule: "monthly", defaultManagerCommissionBasisPoints: 1500, payoutMethod: "manual", payoutReference: "Owner ledger 1001", taxProfile: { classification: "business", countryCode: "US" } }
  });
  await db.propertyOwnerAssignment.upsert({
    where: { id: assignmentId },
    update: { hostOrganizationId: hostId, ownerId, propertyId: property.id, status: "active", isPrimary: true, ownershipBasisPoints: 1e4, managerCommissionBasisPoints: 1500, effectiveFrom: "2025-01-01", effectiveTo: "", notes: "Primary owner assignment for Tidehouse Mendocino." },
    create: { id: assignmentId, hostOrganizationId: hostId, ownerId, propertyId: property.id, status: "active", isPrimary: true, ownershipBasisPoints: 1e4, managerCommissionBasisPoints: 1500, effectiveFrom: "2025-01-01", effectiveTo: "", notes: "Primary owner assignment for Tidehouse Mendocino." }
  });
  const statement = buildOwnerStatement({
    ownerId,
    propertyAssignments: [{ propertyId: property.id, ownershipBasisPoints: 1e4, managerCommissionBasisPoints: 1500 }],
    periodStart,
    periodEnd,
    currencyCode: reservation.currencyCode,
    reservations: [{
      id: reservation.id,
      confirmationCode: reservation.confirmationCode,
      propertyId: property.id,
      status: reservation.status,
      source: reservation.source,
      checkOutDate: reservation.checkOutDate,
      currencyCode: reservation.currencyCode,
      lodgingSubtotalCents: reservation.lodgingSubtotalCents,
      feeTotalCents: reservation.feeTotalCents,
      taxTotalCents: reservation.taxTotalCents,
      discountTotalCents: reservation.discountTotalCents || 0,
      totalAmountCents: reservation.totalAmountCents
    }],
    refunds: [],
    // No payout is invented: paying an owner is a real, attested event.
    payouts: [],
    adjustments: []
  });
  const statementId = "owner_statement_tidehouse_current";
  const statementNumber2 = `OST-${periodEnd.replaceAll("-", "")}-1001`;
  const snapshot = { version: 1, generatedFrom: "immutable_reservation_and_payout_evidence", provenance: "onboarding_sample", ...statement };
  await db.ownerStatement.upsert({
    where: { id: statementId },
    update: { hostOrganizationId: hostId, ownerId, statementNumber: statementNumber2, idempotencyKey: ownerStatementIdempotencyKey({ ownerId, periodStart, periodEnd, currencyCode: reservation.currencyCode }), status: "draft", periodStart, periodEnd, currencyCode: reservation.currencyCode, grossRevenueCents: statement.grossRevenueCents, taxAmountCents: statement.taxAmountCents, refundAmountCents: statement.refundAmountCents, expenseAmountCents: statement.expenseAmountCents, adjustmentAmountCents: statement.adjustmentAmountCents, managerCommissionCents: statement.managerCommissionCents, ownerEarningsCents: statement.ownerEarningsCents, paidOutCents: statement.paidOutCents, balanceDueCents: statement.balanceDueCents, statementSnapshot: snapshot, approvedAt: null, sentAt: null, paidAt: null, paidReference: "" },
    create: { id: statementId, hostOrganizationId: hostId, ownerId, statementNumber: statementNumber2, idempotencyKey: ownerStatementIdempotencyKey({ ownerId, periodStart, periodEnd, currencyCode: reservation.currencyCode }), status: "draft", periodStart, periodEnd, currencyCode: reservation.currencyCode, grossRevenueCents: statement.grossRevenueCents, taxAmountCents: statement.taxAmountCents, refundAmountCents: statement.refundAmountCents, expenseAmountCents: statement.expenseAmountCents, adjustmentAmountCents: statement.adjustmentAmountCents, managerCommissionCents: statement.managerCommissionCents, ownerEarningsCents: statement.ownerEarningsCents, paidOutCents: statement.paidOutCents, balanceDueCents: statement.balanceDueCents, statementSnapshot: snapshot, approvedAt: null, sentAt: null, paidAt: null, paidReference: "" }
  });
  for (const line of statement.lines) {
    const lineId = `owner_line_${line.lineKey.replace(/[^a-zA-Z0-9]/g, "_")}`;
    const relationData = {
      hostOrganizationId: hostId,
      statementId,
      ownerId,
      reservationId: line.reservationId || null,
      payoutId: line.lineType === "payout" ? line.sourceId : null,
      lineKey: `${statementId}:${line.lineKey}`,
      lineType: line.lineType,
      description: line.description,
      serviceDate: line.serviceDate || "",
      amountCents: line.amountCents,
      sourceId: line.sourceId || "",
      metadata: line.metadata || {}
    };
    await db.ownerStatementLine.upsert({ where: { id: lineId }, update: relationData, create: { id: lineId, ...relationData } });
  }
}
async function seedChannel(db, seed) {
  const hostId = seed.hostOrganization.id;
  const channel = seed.channel;
  if (!channel) return;
  const listing = getListingSeed(seed, channel.listingSlug).listing;
  const connection = { ...channel.connection, status: "pending", hostOrganizationId: hostId, lastSyncedAt: null };
  await db.channelConnection.upsert({ where: { id: channel.connection.id }, update: connection, create: connection });
  const channelListingId = `${channel.connection.id}_listing`;
  const mapping = { hostOrganizationId: hostId, listingId: listing.id, channelConnectionId: channel.connection.id, externalListingId: channel.externalListingId, status: "mapped", mapping: { availability: true, rates: false, reservations: false, messages: false }, lastSyncedAt: null };
  await db.channelListing.upsert({ where: { id: channelListingId }, update: mapping, create: { id: channelListingId, ...mapping } });
}

// features/keystone/onboarding/rentalOnboarding.ts
function resolveRentalOnboardingSeed(input) {
  if (!input || !["minimal", "full", "custom"].includes(input.template)) throw new Error("Select a valid setup type.");
  const seed = getSeedForTemplate(input.template, input.customConfiguration);
  validateRentalOnboardingSeed(seed);
  return seed;
}
async function authorize(context) {
  const id2 = context.session?.itemId;
  if (!id2 || context.session?.data?.isActive !== true || !context.session?.data?.role?.canManageOnboarding) throw new Error("Onboarding permission required.");
  const user = await context.prisma.user.findUnique({ where: { id: id2 }, select: { id: true, isActive: true, role: { select: { canManageOnboarding: true, canManagePeople: true, canManageRoles: true, canManageSettings: true } } } });
  if (!user?.isActive || !user.role?.canManageOnboarding) throw new Error("Onboarding permission required.");
  return user;
}
function configuredStorefrontOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured) return null;
  try {
    return normalizeBackendOrigin(configured);
  } catch {
    return null;
  }
}
function onboardingMarketplaceSettings(seed) {
  const { logoColor, ...settings } = seed.settings;
  return {
    id: 1,
    ...settings,
    logoIcon: sanitizeStoreLogoSvg(DEFAULT_STORE_LOGO_ICON),
    logoColor: normalizeStoreLogoColor(logoColor ?? DEFAULT_LIBRARY_LOGO_COLOR)
  };
}
function onboardingHostOrganization(seed, run) {
  const origin = configuredStorefrontOrigin();
  const host = { ...seed.hostOrganization, onboardingAnchorDate: run.anchorDate, onboardingFingerprint: run.fingerprint };
  return origin ? { ...host, website: origin, canonicalUrl: origin } : host;
}
async function setupRun(prisma, seed) {
  const fingerprint = import_node_crypto30.default.createHash("sha256").update(JSON.stringify(seed)).digest("hex");
  const host = await prisma.hostOrganization.findUnique({ where: { id: seed.hostOrganization.id }, select: { id: true, onboardingAnchorDate: true, onboardingFingerprint: true } });
  if (host?.onboardingAnchorDate) {
    if (host.onboardingFingerprint && host.onboardingFingerprint !== fingerprint) {
      throw new Error("This setup was started with a different configuration. Finish it with the original choices, or review the records it already created.");
    }
    return { anchorDate: host.onboardingAnchorDate, fingerprint };
  }
  const run = { anchorDate: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), fingerprint };
  if (host) await prisma.hostOrganization.update({ where: { id: host.id }, data: { onboardingAnchorDate: run.anchorDate, onboardingFingerprint: fingerprint } });
  return run;
}
async function assertSavedRun(prisma, seed) {
  const fingerprint = import_node_crypto30.default.createHash("sha256").update(JSON.stringify(seed)).digest("hex");
  const host = await prisma.hostOrganization.findUnique({ where: { id: seed.hostOrganization.id }, select: { onboardingFingerprint: true } });
  if (!host?.onboardingFingerprint) throw new Error("No saved setup run was found for this configuration. Run setup to save it first.");
  if (host.onboardingFingerprint !== fingerprint) throw new Error("This configuration differs from the setup that was saved. Finish with the original choices, or review the saved records.");
}
function assertSaved(model, record5, expected) {
  for (const [key, value] of Object.entries(expected)) {
    if (value === void 0) continue;
    if (record5?.[key] !== value) throw new Error(`The saved ${model} no longer matches this setup (${key}). Review it before finishing setup.`);
  }
}
async function requireRecord(db, model, id2, relations = {}) {
  const record5 = await db[model].findUnique({ where: { id: id2 } });
  if (!record5) throw new Error(`Missing ${model} record. Retry setup to resume.`);
  for (const [key, value] of Object.entries(relations)) if (record5[key] !== value) throw new Error(`Existing ${model} has conflicting ${key}. Review the record before resuming.`);
  return record5;
}
async function verifyLifecycleReadiness(db, seed, operationId) {
  const hostOrganizationId = seed.hostOrganization.id;
  const result = (state, detail) => ({ id: operationId, state, detail });
  if (operationId === "lifecycle:stay-quotes") {
    const listings = await db.listing.findMany({
      where: {
        hostOrganizationId,
        status: "published",
        hostOrganization: { isPublic: true, status: { notIn: ["suspended", "archived"] } },
        property: { status: "active" },
        accommodationUnit: { status: "available" }
      },
      select: { id: true, ratePlans: { where: { status: "active" }, select: { cancellationPolicy: { select: { id: true, version: true, summary: true, fullTerms: true } } } } },
      take: 50
    });
    const quotable = listings.some((listing) => listing.ratePlans.some((plan) => !onlineQuoteReadinessProblem(plan)));
    if (!quotable) throw new Error("No listing can take an online quote yet: publish a listing under an active property with a rate and versioned cancellation terms.");
    const settings = await db.marketplaceSettings.findUnique({ where: { id: 1 }, select: { isPublished: true } });
    return settings?.isPublished ? result("ready", "A listing can take online quotes.") : result("disabled", "Listings are quotable, but the storefront is unpublished, so new quotes and bookings are paused.");
  }
  if (operationId === "lifecycle:refunds") {
    const provider = await db.paymentProvider.findFirst({ where: { hostOrganizationId, isInstalled: true }, select: { id: true } });
    if (!provider) throw new Error("Install a payment method so refunds can be recorded.");
    return result("ready", "Refunds can be recorded against payments.");
  }
  if (operationId === "lifecycle:payment-webhooks") {
    if (!stripeCheckoutEnabled()) return result("disabled", "Card checkout is off, so no card confirmations are expected.");
    const provider = await db.paymentProvider.findFirst({ where: { hostOrganizationId, code: "pp_stripe_stripe", isInstalled: true }, select: { id: true } });
    if (!provider) throw new Error("Card checkout is configured, but this host has no installed card payment provider.");
    return result("pending_owner", "The card provider is installed; confirmations arrive only once the Stripe account sends webhooks to this app.");
  }
  if (operationId === "lifecycle:channel-reservations") return result("unsupported", "Calendar connections here are availability-only; channel bookings aren\u2019t imported.");
  return result("ready", "Created by host actions on real stays.");
}
async function verifyRentalItem(db, seed, operationId) {
  const operation = rentalOnboardingPlan(seed).find((item) => item.id === operationId);
  if (!operation) throw new Error("Unknown onboarding item.");
  const hostOrganizationId = seed.hostOrganization.id;
  const owned = (model, id2, extra = {}) => requireRecord(db, model, id2, { hostOrganizationId, ...extra });
  const property = seed.properties.find((p) => [p.id, p.unit.id, `${p.listing.id}:rules`, `${p.listing.id}:rates`, `${p.listing.id}:calendar`].includes(operationId));
  if (operationId === "settings") {
    const settings = await requireRecord(db, "marketplaceSettings", 1, { currencyCode: seed.settings.currencyCode });
    if (!settings.name?.trim() || !sanitizeStoreLogoSvg(settings.logoIcon || "")) throw new Error("Store settings need a name and a logo before setup can finish.");
    return settings;
  }
  if (operationId === hostOrganizationId) {
    await requireRecord(db, "hostOrganization", hostOrganizationId);
    for (const collection of seed.collections) await requireRecord(db, "stayCollection", collection.id);
    return;
  }
  if (operation.section === "amenities") return requireRecord(db, "amenity", operationId);
  if (property) {
    const { listing, unit, address } = property;
    if (operation.section === "properties") {
      await owned("propertyAddress", address.id);
      return owned("property", property.id, { addressId: address.id });
    }
    if (operation.section === "accommodations") {
      await owned("property", property.id);
      const savedUnit = await owned("accommodationUnit", unit.id, { propertyId: property.id });
      assertSaved("accommodation", savedUnit, { maxGuests: unit.maxGuests });
      const savedListing = await owned("listing", listing.id, { propertyId: property.id, accommodationUnitId: unit.id });
      assertSaved("listing", savedListing, { title: listing.title, slug: listing.slug, currencyCode: seed.settings.currencyCode });
      for (let i = 0; i < unit.bedrooms.length; i++) {
        const bedroomId = `${unit.id}_bedroom_${i + 1}`;
        await owned("bedroom", bedroomId, { accommodationUnitId: unit.id });
        for (let j = 0; j < unit.bedrooms[i].beds.length; j++) await owned("bed", `${bedroomId}_bed_${j + 1}`, { bedroomId });
      }
      for (let i = 0; i < listing.media.length; i++) await owned("listingMedia", `${listing.id}_media_${i + 1}`, { listingId: listing.id });
      return;
    }
    if (operation.section === "policies") {
      for (let i = 0; i < listing.houseRules.length; i++) await owned("houseRule", `${listing.id}_rule_${i + 1}`, { listingId: listing.id });
      return;
    }
    if (operation.section === "rates" || operation.section === "availability") {
      const savedListing = await owned("listing", listing.id);
      const rate = await owned("ratePlan", `${listing.id}_rate_default`, { listingId: listing.id, status: "active" });
      if (savedListing.currencyCode !== rate.currencyCode) throw new Error("Listing and rate currencies conflict.");
      if (!rate.cancellationPolicyId) throw new Error("The rate needs a cancellation policy before it can be booked.");
      assertSaved("rate", rate, { currencyCode: seed.settings.currencyCode, baseNightlyRateCents: listing.baseNightlyRateCents, minimumStay: listing.minimumStay, maximumStay: listing.maximumStay });
      const policy = await owned("cancellationPolicy", rate.cancellationPolicyId);
      if (!String(policy.version || "").trim() || !(String(policy.summary || "").trim() || String(policy.fullTerms || "").trim())) {
        throw new Error("The rate\u2019s cancellation policy has no published version and terms, so the home can\u2019t be booked online yet.");
      }
      await owned("seasonalRate", `${listing.id}_rate_default_peak`);
      assertSaved("cleaning fee", await owned("feeDefinition", `${listing.id}_fee_cleaning`), { amountCents: listing.cleaningFeeCents, calculation: "fixed" });
      assertSaved("service fee", await owned("feeDefinition", `${listing.id}_fee_service`), { percentageBasisPoints: listing.serviceFeeBasisPoints, calculation: "percentage" });
      assertSaved("lodging tax", await owned("taxRule", `${listing.id}_tax_lodging`), { rateBasisPoints: listing.taxBasisPoints, isInclusive: false });
      return;
    }
  }
  if (operationId === seed.cancellationPolicy.id) return owned("cancellationPolicy", operationId);
  if (seed.calendarBlocks.some((b) => b.id === operationId)) return owned("calendarBlock", operationId);
  if (seed.guests.some((g) => g.id === operationId)) return owned("guestProfile", operationId);
  if (operationId === seed.paymentProvider.id) return owned("paymentProvider", operationId, { isInstalled: true });
  if (operationId === seed.cardPaymentProvider.id) {
    const provider = await db.paymentProvider.findFirst({ where: { hostOrganizationId, code: seed.cardPaymentProvider.code } });
    if (!stripeCheckoutEnabled()) return provider;
    if (!provider) throw new Error("Missing card payment provider record. Retry setup to resume.");
    if (provider.isInstalled !== true) throw new Error("The card payment provider is turned off for this host. Turn it on or remove it before finishing setup.");
    return provider;
  }
  const expectedReservation = seed.reservations.find((r) => r.id === operationId);
  if (expectedReservation) {
    const reservation = await owned("reservation", operationId);
    await owned("guestParty", `${operationId}_party`, { reservationId: operationId, primaryGuestId: reservation.guestId });
    await owned("calendarBlock", `${operationId}_block`, { reservationId: operationId });
    await owned("stayAgreement", `${operationId}_agreement`, { guestId: reservation.guestId });
    await owned("securityDeposit", `${operationId}_deposit`);
    await owned("conversation", `${operationId}_conversation`, { reservationId: operationId });
    if (!reservation.bookingSnapshot?.quote || reservation.agreementId !== `${operationId}_agreement` || reservation.securityDepositId !== `${operationId}_deposit`) throw new Error("Stay workflow is incomplete.");
    for (const line of createReservationLineItemsFromQuote(operationId, reservation.bookingSnapshot.quote)) {
      const actual = await db.reservationLineItem.findUnique({ where: { snapshotKey: line.snapshotKey } });
      if (!actual || actual.reservationId !== operationId || actual.hostOrganizationId !== hostOrganizationId || actual.totalAmountCents !== line.totalAmountCents || actual.currencyCode !== line.currencyCode) throw new Error("Stay workflow has incomplete snapshot line items.");
    }
    if (reservation.amountPaidCents > 0) await owned("payment", `${operationId}_payment`, { reservationId: operationId });
    for (let i = 0; i < expectedReservation.conversation.length; i++) await owned("message", `${operationId}_conversation_message_${i + 1}`, { conversationId: `${operationId}_conversation` });
    return;
  }
  if (seed.tasks.some((t) => t.id === operationId)) return owned("propertyTask", operationId);
  if (operationId === "owner-accounting") {
    await owned("propertyOwner", "owner_tidehouse");
    await owned("propertyOwnerAssignment", "owner_assignment_tidehouse");
    const statement = await owned("ownerStatement", "owner_statement_tidehouse_current");
    if (!statement.statementSnapshot?.lines?.length) throw new Error("Owner statement evidence is incomplete.");
    for (const line of statement.statementSnapshot.lines) await owned("ownerStatementLine", `owner_line_${line.lineKey.replace(/[^a-zA-Z0-9]/g, "_")}`, { statementId: statement.id });
    return;
  }
  if (operation.section === "readiness") return verifyLifecycleReadiness(db, seed, operationId);
  if (operationId === seed.channel?.connection.id) {
    await owned("channelConnection", operationId);
    return owned("channelListing", `${operationId}_listing`, { channelConnectionId: operationId });
  }
  throw new Error("Onboarding item has no verification rule.");
}
async function createItem(db, seed, run, userId, operationId, canManageGlobalSettings) {
  const operation = rentalOnboardingPlan(seed).find((item) => item.id === operationId);
  if (!operation) throw new Error("Unknown onboarding item.");
  const hostOrganizationId = seed.hostOrganization.id;
  const ensure = (model, data) => db[model].upsert({ where: { id: data.id }, create: data, update: {} });
  if (operationId === "settings") {
    const existing = await db.marketplaceSettings.findUnique({ where: { id: 1 }, select: { id: true } });
    if (!existing && !canManageGlobalSettings) throw new Error("Store settings permission is required to create the storefront identity.");
    return ensure("marketplaceSettings", onboardingMarketplaceSettings(seed));
  }
  if (operationId === hostOrganizationId) {
    await ensure("hostOrganization", onboardingHostOrganization(seed, run));
    await ensure("hostMembership", { id: `membership_${hostOrganizationId}_${userId}`, hostOrganizationId, userId, membershipRole: "owner", status: "active" });
    for (const collection of seed.collections) await ensure("stayCollection", collection);
    return;
  }
  if (operation.section === "amenities") return ensure("amenity", seed.amenities.find((a) => a.id === operationId));
  if (operationId === seed.cancellationPolicy.id) return ensure("cancellationPolicy", { ...seed.cancellationPolicy, hostOrganizationId });
  const property = seed.properties.find((p) => [p.id, p.unit.id, `${p.listing.id}:rules`, `${p.listing.id}:rates`].includes(operationId));
  if (property) return seedProperties(db, { ...seed, properties: [property] }, operation.section);
  if (operation.section === "availability") {
    if (operationId.endsWith(":calendar")) return;
    return seedOperations(db, { ...seed, onboardingUserId: userId, skipTaskRules: true, calendarBlocks: seed.calendarBlocks.filter((b) => b.id === operationId), tasks: [] });
  }
  if (seed.guests.some((g) => g.id === operationId)) return seedGuests(db, { ...seed, guests: seed.guests.filter((g) => g.id === operationId) });
  if (operationId === seed.paymentProvider.id) return ensure("paymentProvider", { ...seed.paymentProvider, hostOrganizationId });
  if (operationId === seed.cardPaymentProvider.id) {
    const existing = await db.paymentProvider.findFirst({ where: { hostOrganizationId, code: seed.cardPaymentProvider.code } });
    return existing || ensure("paymentProvider", { ...seed.cardPaymentProvider, hostOrganizationId, isInstalled: stripeCheckoutEnabled() ? seed.cardPaymentProvider.isInstalled : false });
  }
  if (seed.reservations.some((r) => r.id === operationId)) return seedReservations(db, { ...seed, reservations: seed.reservations.filter((r) => r.id === operationId) });
  if (seed.tasks.some((t) => t.id === operationId)) return seedOperations(db, { ...seed, onboardingUserId: userId, calendarBlocks: [], tasks: seed.tasks.filter((t) => t.id === operationId) });
  if (operationId === "owner-accounting") return seedOwnerAccounting(db, seed);
  if (operationId === seed.channel?.connection.id) return seedChannel(db, seed);
  if (operation.section === "readiness") return;
  throw new Error("Unknown onboarding item.");
}
async function rentalOnboarding(_root, args, context) {
  await authorize(context);
  const seed = resolveRentalOnboardingSeed(args.input);
  if (!["create", "verify", "complete"].includes(args.mode)) throw new Error("Unknown onboarding command.");
  for (let attempt = 0; ; attempt++) {
    try {
      return await context.transaction(async (tx) => {
        const user = await authorize(tx);
        const userId = user.id;
        const existingHost = await tx.prisma.hostOrganization.findUnique({ where: { id: seed.hostOrganization.id }, select: { id: true } });
        if (existingHost && !user.role.canManagePeople && !user.role.canManageRoles) {
          const membership = await tx.prisma.hostMembership.findFirst({ where: { hostOrganizationId: existingHost.id, userId, status: "active", membershipRole: { in: ["owner", "admin"] } }, select: { id: true } });
          if (!membership) throw new Error("You do not have permission to configure this host organization.");
        }
        if (args.mode === "create") {
          if (!args.operationId) throw new Error("An onboarding item is required.");
          const run = await setupRun(tx.prisma, seed);
          const loadListing = (id2) => tx.sudo().query.Listing.findOne({ where: { id: id2 }, query: STAY_LISTING_SELECTION });
          await createItem(createOrReuseDatabase(tx.prisma), { ...seed, anchorDate: run.anchorDate, loadListing }, run, userId, args.operationId, Boolean(user.role.canManageSettings));
          await verifyRentalItem(tx.prisma, seed, args.operationId);
        } else {
          await assertSavedRun(tx.prisma, seed);
          const readiness = [];
          for (const operation of rentalOnboardingPlan(seed)) {
            const checked = await verifyRentalItem(tx.prisma, seed, operation.id);
            if (operation.section === "readiness") readiness.push(checked);
          }
          if (args.mode === "complete") await tx.sudo().query.User.updateOne({ where: { id: userId }, data: { onboardingStatus: "completed" }, query: "id" });
          return { success: true, readiness };
        }
        return { success: true };
      }, { isolationLevel: "Serializable", maxWait: 1e4, timeout: 12e4 });
    } catch (error) {
      if (error?.code !== "P2034" || attempt >= 2) throw error;
    }
  }
}

// features/keystone/utils/calendarBlockCapacity.ts
var reservationBlockMutationError2 = "Reservation-backed capacity blocks can only be changed by reservation lifecycle operations.";
var capacityConflictError = "The calendar block overlaps an active reservation or calendar block.";
function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}
function listingSelector(value) {
  if (!value || typeof value !== "object") return null;
  const relation = value;
  if (relation.create) {
    throw new Error("Calendar blocks must connect to an existing listing. Create the listing before its availability block.");
  }
  if (relation.disconnect === true) return null;
  if (relation.connect && typeof relation.connect === "object") return relation.connect;
  throw new Error("A calendar block listing must connect to an existing listing.");
}
function snapshotChanged(before, after) {
  return before.hostOrganizationId !== after.hostOrganizationId || before.listingId !== after.listingId || before.reservationId !== after.reservationId || before.startDate !== after.startDate || before.endDate !== after.endDate || before.status !== after.status || before.reason !== after.reason;
}
async function readListing(tx, where) {
  return tx.listing.findUnique({
    where,
    select: { id: true, hostOrganizationId: true, accommodationUnitId: true }
  });
}
async function lockListingRows(tx, listingIds) {
  for (const listingId of [...new Set(listingIds)].sort()) {
    await tx.$queryRawUnsafe('SELECT "id" FROM "Listing" WHERE "id" = $1 FOR UPDATE', listingId);
  }
}
async function lockUnitRows(tx, unitIds) {
  for (const unitId of [...new Set(unitIds)].sort()) {
    await tx.$queryRawUnsafe('SELECT "id" FROM "AccommodationUnit" WHERE "id" = $1 FOR UPDATE', unitId);
  }
}
async function assertCalendarBlockWriteWithinCapacity(operation, args, context) {
  const tx = context.prisma;
  const data = args.data || {};
  let current2 = null;
  if (operation === "update") {
    current2 = await tx.calendarBlock.findUnique({
      where: args.where,
      select: {
        id: true,
        hostOrganizationId: true,
        listingId: true,
        reservationId: true,
        startDate: true,
        endDate: true,
        reason: true,
        status: true
      }
    });
    if (!current2) throw new Error("Calendar block not found.");
  }
  const currentHostId = current2?.hostOrganizationId || null;
  if (hasOwn(data, "hostOrganization") && data.hostOrganization == null) {
    throw new Error("A calendar block must remain assigned to a host organization.");
  }
  const submittedHostId = hasOwn(data, "hostOrganization") ? extractRelationshipId(data.hostOrganization) : null;
  const hostOrganizationId = currentHostId || submittedHostId;
  if (!hostOrganizationId) throw new Error("A host organization relationship is required.");
  try {
    await assertHostOrganizationAccess({ context, hostOrganizationId, permission: "canManageCalendar" });
  } catch (error) {
    if (operation === "update") throw new Error("Calendar block not found.");
    throw error;
  }
  if (currentHostId && submittedHostId && currentHostId !== submittedHostId) {
    throw new Error("Records cannot be moved between host organizations.");
  }
  if (current2?.reservationId || hasOwn(data, "reservation")) throw new Error(reservationBlockMutationError2);
  const selector = hasOwn(data, "listing") ? listingSelector(data.listing) : current2?.listingId ? { id: current2.listingId } : null;
  let oldListing = null;
  if (current2?.listingId) {
    oldListing = await readListing(tx, { id: current2.listingId });
    if (!oldListing) throw new Error("The calendar block listing changed; reload and retry.");
    if (oldListing.hostOrganizationId !== hostOrganizationId) {
      throw new Error("The calendar block listing must belong to the same host organization.");
    }
  }
  let targetListing = null;
  if (selector) {
    targetListing = await readListing(tx, selector);
    if (!targetListing) throw new Error("Calendar listing not found.");
    if (targetListing.hostOrganizationId !== hostOrganizationId) {
      throw new Error("The calendar block listing must belong to the same host organization.");
    }
  }
  const startDate = hasOwn(data, "startDate") ? data.startDate : current2?.startDate;
  const endDate = hasOwn(data, "endDate") ? data.endDate : current2?.endDate;
  if (typeof startDate !== "string" || typeof endDate !== "string") {
    throw new Error("Calendar block start and end dates are required.");
  }
  assertCapacityDateRange(startDate, endDate);
  const reason = hasOwn(data, "reason") ? data.reason : current2 ? current2.reason : "owner_block";
  if (reason === "reservation") throw new Error(reservationBlockMutationError2);
  const status = hasOwn(data, "status") ? data.status : current2 ? current2.status : "active";
  const capacityFields = ["listing", "startDate", "endDate", "status"];
  const capacityInputChanged = operation === "create" || capacityFields.some((field) => hasOwn(data, field));
  const needsCapacityLock = Boolean(
    (operation === "create" ? status === "active" : capacityInputChanged && (current2?.status === "active" || status === "active")) && (oldListing || targetListing)
  );
  if (!needsCapacityLock) return;
  const listingIds = [oldListing?.id, targetListing?.id].filter((id2) => Boolean(id2));
  await lockListingCapacity(tx, listingIds);
  const listingRowsBeforeUnitLocks = await Promise.all(listingIds.map((id2) => readListing(tx, { id: id2 })));
  if (listingRowsBeforeUnitLocks.some((listing) => !listing || listing.hostOrganizationId !== hostOrganizationId)) {
    throw new Error("Calendar listing allocation changed; reload and retry.");
  }
  const unitsByListing = new Map(listingRowsBeforeUnitLocks.map((listing) => [listing.id, listing.accommodationUnitId]));
  const unitIds = [...new Set([...unitsByListing.values()].filter((id2) => Boolean(id2)))].sort();
  await lockAccommodationUnitCapacity(tx, unitIds);
  await lockListingRows(tx, listingIds);
  const lockedListings = await Promise.all(listingIds.map((id2) => readListing(tx, { id: id2 })));
  if (lockedListings.some((listing) => !listing || listing.hostOrganizationId !== hostOrganizationId || listing.accommodationUnitId !== unitsByListing.get(listing.id))) {
    throw new Error("Calendar listing allocation changed; reload and retry.");
  }
  await lockUnitRows(tx, unitIds);
  if (current2) {
    const latest = await tx.calendarBlock.findUnique({
      where: { id: current2.id },
      select: {
        id: true,
        hostOrganizationId: true,
        listingId: true,
        reservationId: true,
        startDate: true,
        endDate: true,
        reason: true,
        status: true
      }
    });
    if (!latest || snapshotChanged(current2, latest)) {
      throw new Error("Calendar block changed; reload and retry.");
    }
  }
  if (status !== "active" || !targetListing) return;
  const targetUnitId = unitsByListing.get(targetListing.id);
  const conflict = targetUnitId ? await findAccommodationUnitCapacityConflict(tx, {
    accommodationUnitId: targetUnitId,
    hostOrganizationId,
    checkInDate: startDate,
    checkOutDate: endDate,
    excludeCalendarBlockId: current2?.id
  }) : await findListingCapacityConflict(tx, {
    listingId: targetListing.id,
    checkInDate: startDate,
    checkOutDate: endDate,
    excludeCalendarBlockId: current2?.id
  });
  if (conflict) throw new Error(capacityConflictError);
}

// features/keystone/utils/calendarBlockGraphqlBoundary.ts
function requiredResolver(fields2, fieldName) {
  const resolve = fields2[fieldName]?.resolve;
  if (typeof resolve !== "function") {
    throw new Error(`Keystone generated mutation resolver ${fieldName} is missing; CalendarBlock capacity protection cannot be installed.`);
  }
  return resolve;
}
function runInTransaction(operation, resolver, root, args, context, info, guard) {
  if (typeof context?.transaction !== "function") {
    throw new Error("CalendarBlock writes require a Keystone transaction Context.");
  }
  return context.transaction(async (transactionContext) => {
    await guard(operation, args, transactionContext);
    return resolver(root, args, transactionContext, info);
  });
}
function sequentialPromises(items, run) {
  let previous = Promise.resolve();
  return items.map((item) => {
    const result = previous.then(() => run(item));
    previous = result.then(() => void 0, () => void 0);
    return result;
  });
}
function installCalendarBlockGraphqlBoundary(baseSchema, guard = assertCalendarBlockWriteWithinCapacity) {
  const mutation = baseSchema.getMutationType();
  if (!mutation) throw new Error("Keystone mutation root is missing; CalendarBlock capacity protection cannot be installed.");
  const fields2 = mutation.getFields();
  const createOne = requiredResolver(fields2, "createCalendarBlock");
  const updateOne = requiredResolver(fields2, "updateCalendarBlock");
  const createOneField = fields2.createCalendarBlock;
  const updateOneField = fields2.updateCalendarBlock;
  const createManyField = fields2.createCalendarBlocks;
  const updateManyField = fields2.updateCalendarBlocks;
  if (!createManyField || !updateManyField) {
    throw new Error("Keystone generated CalendarBlock bulk mutations are missing; capacity protection cannot be installed.");
  }
  createOneField.resolve = (root, args, context, info) => runInTransaction("create", createOne, root, args, context, info, guard);
  updateOneField.resolve = (root, args, context, info) => runInTransaction("update", updateOne, root, args, context, info, guard);
  createManyField.resolve = (_root, { data }, context, info) => sequentialPromises(
    data,
    (item) => runInTransaction("create", createOne, _root, { data: item }, context, info, guard)
  );
  updateManyField.resolve = (_root, { data }, context, info) => sequentialPromises(
    data,
    (item) => runInTransaction("update", updateOne, _root, { where: item.where, data: item.data }, context, info, guard)
  );
  return baseSchema;
}

// features/keystone/utils/passwordResetGraphqlBoundary.ts
function installPasswordResetGraphqlBoundary(baseSchema) {
  const field = baseSchema.getMutationType()?.getFields().sendUserPasswordResetLink;
  const resolve = field?.resolve;
  if (!field || typeof resolve !== "function") return;
  field.resolve = (root, args, context, info) => {
    if (!passwordResetEmailConfigured()) throw new Error("Password reset email isn\u2019t available for this store.");
    return resolve(root, args, context, info);
  };
}

// features/keystone/mutations/index.ts
var graphql4 = String.raw;
function extendGraphqlSchema(baseSchema) {
  installCalendarBlockGraphqlBoundary(baseSchema);
  installPasswordResetGraphqlBoundary(baseSchema);
  return (0, import_schema.mergeSchemas)({
    schemas: [baseSchema],
    typeDefs: [graphql4`
      type PublicMarketplaceSettingsResult {
        status: String!
        id: ID
        name: String
        tagline: String
        homepageHeadline: String
        publicDescription: String
        supportEmail: String
        supportPhone: String
        supportHours: String
        officeAddress: String
        privacyPolicyUrl: String
        privacyPolicyVersion: String
        termsUrl: String
        termsVersion: String
        currencyCode: String
        locale: String
        timezone: String
        defaultMapLatitude: Float
        defaultMapLongitude: Float
        accentHue: Int
        logoIcon: String
        logoColor: String
      }

      type SearchStaysResult {
        totalCount: Int!
        offset: Int!
        limit: Int!
        results: [JSON!]!
        collections: JSON
      }

      type QuoteStayResult {
        id: ID!
        quoteNumber: String!
        token: String!
        checkInDate: String!
        checkOutDate: String!
        currencyCode: String!
        lodgingSubtotalCents: Int!
        feeTotalCents: Int!
        taxTotalCents: Int!
        securityDepositCents: Int!
        totalAmountCents: Int!
        expiresAt: String!
        listing: JSON
        breakdown: JSON!
      }

      type CreateStayReservationResult {
        id: ID!
        confirmationCode: String!
        status: String!
        paymentStatus: String!
        checkInDate: String!
        checkOutDate: String!
        currencyCode: String!
        totalAmountCents: Int!
        listing: JSON
        tripToken: String!
        "Null when a recovered receipt's agreement link was reissued, revoked or expired since booking."
        agreementToken: String
        recovered: Boolean
        testMode: Boolean
      }

      type CancelStayQuoteResult {
        id: ID!
        quoteNumber: String!
        status: String!
      }

      type StayReservationMutationResult {
        id: ID!
        confirmationCode: String!
        status: String!
        paymentStatus: String
        checkInDate: String
        checkOutDate: String
        totalAmountCents: Int
        amountPaidCents: Int
      }

      type StayCancellationResult {
        id: ID!
        confirmationCode: String!
        status: String!
        refundPendingCents: Int!
        "Refunds opened for the host's review (not owed until assessed)."
        refundReviewCents: Int
        refundAssessment: String
      }

      type StayAgreementMutationResult {
        id: ID!
        agreementNumber: String!
        status: String!
        signatureName: String
        signedAt: String
      }

      type StayPaymentResult {
        id: ID!
        amountCents: Int!
        status: String!
        provider: String
        providerPaymentId: String
        idempotencyKey: String
        currencyCode: String!
        processedAt: String
        data: JSON
      }

      type OnboardingStatusResult {
        id: ID!
        onboardingStatus: String
      }

      type Query {
        redirectToInit: Boolean
        publicMarketplaceSettings: PublicMarketplaceSettingsResult!
        searchStays(
          destination: String
          checkIn: String
          checkOut: String
          adults: Int
          children: Int
          infants: Int
          pets: Int
          propertyTypes: [String!]
          amenitySlugs: [String!]
          bedrooms: Int
          beds: Int
          bathroomsHalfUnits: Int
          minTotalCents: Int
          maxTotalCents: Int
          instantBook: Boolean
          listingIds: [ID!]
          collectionSlug: String
          offset: Int
          limit: Int
        ): SearchStaysResult!
        publicListing(slug: String!, reviewsBefore: String): JSON
        publicStayAgreement(token: String!): JSON
        publicStayQuote(token: String!): JSON
        publicTrip(token: String!, messagesBefore: String): JSON
        hostOperationsReport(hostOrganizationId: ID!, startDate: String!, endDate: String!): JSON!
      }

      type Mutation {
        quoteStay(
          listingId: ID!
          checkIn: String!
          checkOut: String!
          adults: Int!
          children: Int
          infants: Int
          pets: Int
        ): QuoteStayResult!

        createStayReservation(
          quoteToken: String!
          guestName: String!
          guestEmail: String!
          guestPhone: String
          invitedGuests: JSON
          guestNotes: String
          acceptedTermsVersion: String
          acceptedStoreTermsVersion: String
          privacyNoticeVersion: String
          receiptKey: String
        ): CreateStayReservationResult!
        "Returns the receipt of a checkout this same browser already completed (24 hours, same key and session)."
        recoverStayCheckout(quoteToken: String!, receiptKey: String!): CreateStayReservationResult
        cancelStayQuote(quoteId: ID!): CancelStayQuoteResult!

        requestStayCancellation(tripToken: String!, reason: String, confirmCancellation: Boolean, expectedRefundCents: Int, expectedAssessmentId: String): StayCancellationResult!
        signStayAgreement(token: String!, signatureName: String!, acceptTerms: Boolean): StayAgreementMutationResult!

        transitionStayReservation(
          reservationId: ID!
          transition: String!
          note: String
        ): StayReservationMutationResult!

        reassignStayReservation(
          reservationId: ID!
          targetAccommodationUnitId: ID!
          reason: String!
        ): JSON!

        amendConfirmedStay(
          reservationId: ID!
          expectedCheckInDate: String!
          expectedCheckOutDate: String!
          checkInDate: String!
          checkOutDate: String!
          reason: String!
          idempotencyKey: String!
        ): JSON!

        """Opens one manual receipt. \`operationKey\` identifies this submission: the same key returns the same receipt."""
        initiateStayPayment(
          reservationId: ID!
          paymentProviderCode: String
          amountCents: Int
          operationKey: String!
        ): StayPaymentResult!

        captureStayPayment(paymentId: ID!): StayPaymentResult!
        startGuestStayPayment(tripToken: String!): JSON!
        completeGuestStayPayment(tripToken: String!, paymentId: ID!): JSON!

        generateOwnerStatement(ownerId: ID!, periodStart: String!, periodEnd: String!, currencyCode: String): JSON!
        "Approve, send, pay or void an owner statement. Paying needs structured transfer evidence (amount, currency, date, payee, method, reference, custody, attestation)."
        transitionOwnerStatement(statementId: ID!, transition: String!, reference: String, transfer: JSON, operationKey: String): JSON!
        createOperationsTask(
          propertyId: ID!
          listingId: ID
          reservationId: ID
          assigneeId: ID
          title: String!
          taskType: String!
          priority: String
          dueAt: String
          notes: String
        ): JSON!
        transitionPropertyTask(
          taskId: ID!
          action: String!
          assigneeId: ID
          completionNotes: String
          completionEvidence: JSON
        ): JSON!
        importListingCalendar(channelConnectionId: ID!, listingId: ID!, calendarText: String!, sourceLabel: String): JSON!
        exportListingCalendar(listingId: ID!): JSON!
        exportHostArchive(hostOrganizationId: ID!): JSON!
        refundStayPayment(paymentId: ID!, refundId: ID, operationKey: String!, amountCents: Int!, reason: String, confirmFundsReturned: Boolean!, manualEvidenceReference: String!): JSON!
        transitionSecurityDeposit(depositId: ID!, transition: String!, amountCents: Int, reference: String, confirmEvidence: Boolean, operationKey: String): JSON!
        createStayDamageClaim(reservationId: ID!, description: String!, claimedAmountCents: Int!, evidence: JSON): JSON!
        transitionDamageClaim(claimId: ID!, transition: String!, approvedAmountCents: Int, settlementMethod: String, settlementReference: String, confirmSettlement: Boolean, receivedOn: String, custody: String): JSON!

        updateOnboardingStatus(status: String!): OnboardingStatusResult!
        rentalOnboarding(input: JSON!, operationId: String, mode: String!): JSON!
      }
    `, guestJourneyTypeDefs, hostLifecycleTypeDefs, bookingRuleTypeDefs, propertyTaskRuleTypeDefs, hostReportingTypeDefs, ownerFinanceTypeDefs, listingReadinessTypeDefs],
    resolvers: [{
      Query: {
        redirectToInit: redirectToInit_default,
        publicMarketplaceSettings,
        searchStays,
        publicListing,
        publicStayAgreement,
        publicStayQuote,
        publicTrip,
        hostOperationsReport
      },
      Mutation: {
        quoteStay,
        createStayReservation,
        recoverStayCheckout,
        cancelStayQuote,
        requestStayCancellation,
        signStayAgreement,
        transitionStayReservation,
        reassignStayReservation,
        amendConfirmedStay,
        initiateStayPayment,
        captureStayPayment,
        startGuestStayPayment,
        completeGuestStayPayment,
        generateOwnerStatement,
        transitionOwnerStatement,
        createOperationsTask: createPropertyTask,
        transitionPropertyTask,
        importListingCalendar,
        exportListingCalendar,
        exportHostArchive,
        refundStayPayment,
        transitionSecurityDeposit,
        createStayDamageClaim: createDamageClaim,
        transitionDamageClaim,
        updateOnboardingStatus,
        rentalOnboarding
      }
    }, guestJourneyResolvers, hostLifecycleResolvers, bookingRuleResolvers, propertyTaskRuleResolvers, hostReportingResolvers, ownerFinanceResolvers, listingReadinessResolvers]
  });
}

// features/keystone/lib/mail.ts
var import_nodemailer2 = require("nodemailer");
function getBaseUrlForEmails() {
  if (process.env.SMTP_STORE_LINK) {
    return process.env.SMTP_STORE_LINK;
  }
  console.warn("SMTP_STORE_LINK not set. Please add SMTP_STORE_LINK to your environment variables for email links to work properly.");
  return "";
}
var transport2 = (0, import_nodemailer2.createTransport)({
  // @ts-ignore
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});
function passwordResetEmail({ url }) {
  const backgroundColor = "#f9f9f9";
  const textColor = "#444444";
  const mainBackgroundColor = "#ffffff";
  const buttonBackgroundColor = "#346df1";
  const buttonBorderColor = "#346df1";
  const buttonTextColor = "#ffffff";
  return `
    <body style="background: ${backgroundColor};">
      <table width="100%" border="0" cellspacing="20" cellpadding="0" style="background: ${mainBackgroundColor}; max-width: 600px; margin: auto; border-radius: 10px;">
        <tr>
          <td align="center" style="padding: 10px 0px 0px 0px; font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${textColor};">
            Please click below to reset your password
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 20px 0;">
            <table border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="border-radius: 5px;" bgcolor="${buttonBackgroundColor}"><a href="${url}" target="_blank" style="font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${buttonTextColor}; text-decoration: none; border-radius: 5px; padding: 10px 20px; border: 1px solid ${buttonBorderColor}; display: inline-block; font-weight: bold;">Reset Password</a></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 0px 0px 10px 0px; font-size: 16px; line-height: 22px; font-family: Helvetica, Arial, sans-serif; color: ${textColor};">
            If you did not request this email you can safely ignore it.
          </td>
        </tr>
      </table>
    </body>
  `;
}
async function sendPasswordResetEmail(resetToken, to, baseUrl, audience = "dashboard") {
  const frontendUrl = baseUrl || getBaseUrlForEmails();
  const url = audience === "guest" ? `${frontendUrl}/account/reset?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(to)}` : `${frontendUrl}/dashboard/reset?token=${resetToken}`;
  const info = await transport2.sendMail({
    to,
    from: process.env.SMTP_FROM,
    subject: "Reset your password",
    html: passwordResetEmail({ url })
  });
  if (process.env.MAIL_USER?.includes("ethereal.email")) {
    console.log(`\u{1F4E7} Message Sent!  Preview it at ${(0, import_nodemailer2.getTestMessageUrl)(info)}`);
  }
}

// features/keystone/sessionPolicy.ts
var AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;
function createKeystoneSessionConfig(secret) {
  return { maxAge: AUTH_SESSION_MAX_AGE_SECONDS, secret };
}

// features/keystone/security/graphql-limits.ts
var import_node_crypto31 = require("node:crypto");
var import_graphql4 = require("graphql");
var MAX_GRAPHQL_LIST_TAKE = 5001;
var GRAPHQL_LIST_MAX_TAKE_OVERRIDES = {
  ListingMedia: 100,
  HouseRule: 100,
  Bedroom: 100,
  Bed: 100,
  SeasonalRate: 100,
  FeeDefinition: 100,
  TaxRule: 100,
  Amenity: 100,
  StayCollection: 100
};
function graphqlListMaxTake(listKey) {
  return GRAPHQL_LIST_MAX_TAKE_OVERRIDES[listKey] ?? MAX_GRAPHQL_LIST_TAKE;
}
function withGraphqlListMaxTake(models2) {
  return Object.fromEntries(Object.entries(models2).map(([key, value]) => [key, {
    ...value,
    graphql: { ...value.graphql, maxTake: graphqlListMaxTake(key) }
  }]));
}

// features/keystone/lib/storage-endpoint.ts
function parseStorageEndpoint(value) {
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("S3_ENDPOINT must be an http(s) origin, such as https://sfo3.digitaloceanspaces.com");
  }
  if (!["http:", "https:"].includes(url.protocol) || !url.hostname) throw new Error("S3_ENDPOINT must be an http(s) origin with a hostname");
  if (url.username || url.password) throw new Error("S3_ENDPOINT must not contain credentials");
  if (url.pathname && url.pathname !== "/" || url.search || url.hash) throw new Error("S3_ENDPOINT must be an origin only (no path, query or fragment)");
  return { origin: url.origin, protocol: url.protocol.slice(0, -1), hostname: url.hostname, port: url.port };
}

// features/keystone/database-url.ts
var POOL_SIZES = { web: 15, worker: 5 };
var OVERRIDE_ENV = {
  web: "DATABASE_CONNECTION_LIMIT",
  worker: "DATABASE_CONNECTION_LIMIT_WORKER"
};
function pooledDatabaseUrl(url, role = "web") {
  if (!url || !/^postgres(ql)?:\/\//.test(url)) return url;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.searchParams.has("connection_limit")) return url;
  const override = Number(process.env[OVERRIDE_ENV[role]]);
  parsed.searchParams.set("connection_limit", String(Number.isInteger(override) && override > 0 ? override : POOL_SIZES[role]));
  return parsed.toString();
}

// features/keystone/lib/keystonePrismaErrors.ts
var RAW_METHOD = /^\$(queryRaw|executeRaw|queryRawUnsafe|executeRawUnsafe|queryRawTyped|runCommandRaw)$/;
var clients = /* @__PURE__ */ new WeakMap();
var delegates = /* @__PURE__ */ new WeakMap();
function isKeystonePrismaError(value) {
  return value instanceof Error && value.extensions?.code === "KS_PRISMA_ERROR";
}
function rethrowKeystonePrismaError(value) {
  if (!isKeystonePrismaError(value)) return value;
  const prisma = value.extensions.prisma ?? {};
  throw Object.assign(value, { code: prisma.code, meta: prisma.meta, clientVersion: prisma.clientVersion });
}
function throwing(result) {
  if (!result || typeof result.then !== "function") return rethrowKeystonePrismaError(result);
  const settled = () => result.then(rethrowKeystonePrismaError);
  return new Proxy(result, {
    get(target, key) {
      if (key === "then") return (ok, fail) => settled().then(ok, fail);
      if (key === "catch") return (fail) => settled().catch(fail);
      if (key === "finally") return (done) => settled().finally(done);
      const value = Reflect.get(target, key, target);
      return typeof value === "function" ? value.bind(target) : value;
    }
  });
}
function throwingDelegate(delegate) {
  const cached = delegates.get(delegate);
  if (cached) return cached;
  const wrapped = new Proxy(delegate, {
    get(target, key) {
      const value = Reflect.get(target, key, target);
      return typeof value === "function" ? (...args) => throwing(value.apply(target, args)) : value;
    }
  });
  delegates.set(delegate, wrapped);
  return wrapped;
}
function throwKeystonePrismaErrors(client2) {
  const cached = clients.get(client2);
  if (cached) return cached;
  const wrapped = new Proxy(client2, {
    get(target, key) {
      const value = Reflect.get(target, key, target);
      if (key === "$transaction" && typeof value === "function") {
        return (work, ...options) => {
          if (typeof work === "function") return value.call(target, (tx) => work(throwKeystonePrismaErrors(tx)), ...options);
          return Promise.resolve(value.call(target, work, ...options)).then((results) => Array.isArray(results) ? results.map(rethrowKeystonePrismaError) : results);
        };
      }
      if (key === "$extends" && typeof value === "function") return (...args) => throwKeystonePrismaErrors(value.apply(target, args));
      if (typeof key === "string" && RAW_METHOD.test(key) && typeof value === "function") return (...args) => throwing(value.apply(target, args));
      if (typeof value === "function") return value.bind(target);
      if (typeof key === "string" && !key.startsWith("$") && value && typeof value === "object" && typeof value.findFirst === "function") return throwingDelegate(value);
      return value;
    }
  });
  clients.set(client2, wrapped);
  return wrapped;
}

// features/keystone/index.ts
var databaseURL = resolvePostgresDatabaseUrl();
var boundedModels = withGraphqlListMaxTake(models);
var sessionConfig = createKeystoneSessionConfig(resolveSessionSecret());
function storageEnv(name, developmentFallback) {
  return process.env[name]?.trim() || developmentFallback;
}
var bucketName = storageEnv("S3_BUCKET_NAME", "keystone-test");
var region = storageEnv("S3_REGION", "ap-southeast-2");
var accessKeyId = storageEnv("S3_ACCESS_KEY_ID", "keystone");
var secretAccessKey = storageEnv("S3_SECRET_ACCESS_KEY", "keystone");
var endpoint = parseStorageEndpoint(storageEnv("S3_ENDPOINT", "https://sfo3.digitaloceanspaces.com")).origin;
var { withAuth } = (0, import_auth.createAuth)({
  listKey: "User",
  identityField: "email",
  secretField: "password",
  initFirstItem: {
    fields: ["name", "email", "password"],
    itemData: {
      role: {
        create: {
          name: "Admin",
          canAccessDashboard: true,
          canReadProperties: true,
          canManageProperties: true,
          canReadListings: true,
          canManageListings: true,
          canReadCalendar: true,
          canManageCalendar: true,
          canReadPricing: true,
          canManagePricing: true,
          canReadReservations: true,
          canManageReservations: true,
          canReadGuests: true,
          canManageGuests: true,
          canReadMessages: true,
          canManageMessages: true,
          canReadChannels: true,
          canManageChannels: true,
          canReadPayouts: true,
          canManagePayouts: true,
          canReadReviews: true,
          canManageReviews: true,
          canReadPayments: true,
          canManagePayments: true,
          canReadReports: true,
          canManageReports: true,
          canSeeOtherPeople: true,
          canEditOtherPeople: true,
          canManagePeople: true,
          canManageRoles: true,
          canManageOnboarding: true,
          canManageSettings: true
        }
      }
    }
  },
  passwordResetLink: {
    async sendToken(args) {
      const user = await args.context.sudo().query.User.findOne({ where: { id: String(args.itemId) }, query: "role { canAccessDashboard }" });
      const audience = user?.role?.canAccessDashboard ? "dashboard" : "guest";
      try {
        await sendPasswordResetEmail(args.token, args.identity, void 0, audience);
      } catch {
        console.error("Password reset email could not be sent.");
      }
    }
  },
  sessionData: `
    name
    email
    isActive
    role {
      id
      name
      canAccessDashboard
      canReadProperties
      canManageProperties
      canReadListings
      canManageListings
      canReadCalendar
      canManageCalendar
      canReadPricing
      canManagePricing
      canReadReservations
      canManageReservations
      canReadGuests
      canManageGuests
      canReadMessages
      canManageMessages
      canReadChannels
      canManageChannels
      canReadPayouts
      canManagePayouts
      canReadReviews
      canManageReviews
      canReadPayments
      canManagePayments
      canReadReports
      canManageReports
      canSeeOtherPeople
      canEditOtherPeople
      canManagePeople
      canManageRoles
      canManageOnboarding
      canManageSettings
    }
  `
});
var keystone_default = withAuth(
  (0, import_core50.config)({
    db: {
      provider: "postgresql",
      url: pooledDatabaseUrl(databaseURL),
      // Keystone returns failed queries as values; this makes them throw so transactions roll back.
      extendPrismaClient: throwKeystonePrismaErrors
    },
    lists: boundedModels,
    storage: {
      my_images: {
        kind: "s3",
        type: "image",
        bucketName,
        region,
        accessKeyId,
        secretAccessKey,
        endpoint,
        signed: { expiry: 5e3 },
        forcePathStyle: s3ForcePathStyle(endpoint)
      }
    },
    ui: {
      isAccessAllowed: ({ session }) => session?.data.role?.canAccessDashboard ?? false
    },
    session: (0, import_session.statelessSessions)(sessionConfig),
    graphql: {
      extendGraphqlSchema,
      bodyParser: { limit: "64kb" }
    },
    server: {
      maxFileSize: 5 * 1024 * 1024,
      extendHttpServer(server) {
        server.headersTimeout = 1e4;
        server.requestTimeout = 15e3;
      }
    }
  })
);

// keystone.ts
var keystone_default2 = keystone_default;
//# sourceMappingURL=config.js.map
