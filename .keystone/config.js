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

// features/keystone/index.ts
var import_auth = require("@keystone-6/auth");
var import_core50 = require("@keystone-6/core");
var import_config3 = require("dotenv/config");

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
  messages: "message"
};
function relationshipWriteIds(value) {
  if (!value || typeof value !== "object") return [];
  const values = [value.connect, value.set].flatMap((entry) => Array.isArray(entry) ? entry : entry ? [entry] : []);
  return values.map((entry) => entry?.id).filter((id) => typeof id === "string" && id.length > 0);
}
async function assertSubmittedRelationshipsBelongToHost(context, resolvedData, hostOrganizationId) {
  for (const [field, delegateName] of Object.entries(hostScopedRelationshipDelegates)) {
    const ids = relationshipWriteIds(resolvedData?.[field]);
    if (!ids.length) continue;
    const delegate = context.prisma?.[delegateName];
    if (!delegate?.findMany) throw new Error(`Cannot validate the ${field} relationship.`);
    const related = await delegate.findMany({ where: { id: { in: ids } }, select: { id: true, hostOrganizationId: true } });
    if (related.length !== ids.length || related.some((record) => record.hostOrganizationId !== hostOrganizationId)) {
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
    if (userIds.some((id) => !memberIds.has(id))) {
      throw new Error(`The ${field} must be an active member of the same host organization.`);
    }
  }
}
function hostScopedHooks(permission) {
  return {
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
    } catch (error) {
      addValidationError(error instanceof Error ? error.message : "Host membership validation failed.");
    }
  }
};
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

// features/keystone/models/AccommodationUnit.ts
var AccommodationUnit = (0, import_core.list)({
  access: hostScopedListAccess("canReadProperties", "canManageProperties"),
  hooks: hostScopedHooks("canManageProperties"),
  ui: { listView: { initialColumns: ["name", "property", "accommodationType", "maxGuests", "bedroomCount", "bathroomCountHalfUnits"] } },
  fields: {
    hostOrganization: (0, import_fields2.relationship)({ ref: "HostOrganization" }),
    property: (0, import_fields2.relationship)({ ref: "Property.units" }),
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
    listings: (0, import_fields2.relationship)({ ref: "Listing.accommodationUnit", many: true }),
    bedrooms: (0, import_fields2.relationship)({ ref: "Bedroom.accommodationUnit", many: true }),
    reservations: (0, import_fields2.relationship)({ ref: "Reservation.accommodationUnit", many: true }),
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
  ui: { listView: { initialColumns: ["name", "category", "iconKey", "listings"] } },
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
    listings: (0, import_fields3.relationship)({ ref: "Listing.amenities", many: true }),
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
  ui: { listView: { initialColumns: ["name", "accommodationUnit", "order", "beds"] } },
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
var CalendarBlock = (0, import_core5.list)({
  access: hostScopedListAccess("canReadCalendar", "canManageCalendar"),
  hooks: hostScopedHooks("canManageCalendar"),
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
    notes: (0, import_fields6.text)({ ui: { displayMode: "textarea" } }),
    ...trackingFields
  }
});

// features/keystone/models/CancellationPolicy.ts
var import_core6 = require("@keystone-6/core");
var import_fields7 = require("@keystone-6/core/fields");
var CancellationPolicy = (0, import_core6.list)({
  access: hostScopedListAccess("canReadPricing", "canManagePricing"),
  hooks: hostScopedHooks("canManagePricing"),
  ui: { listView: { initialColumns: ["name", "hostOrganization", "policyType", "version", "ratePlans"] } },
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
    ratePlans: (0, import_fields7.relationship)({ ref: "RatePlan.cancellationPolicy", many: true }),
    agreements: (0, import_fields7.relationship)({ ref: "StayAgreement.cancellationPolicy", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/ChannelConnection.ts
var import_core7 = require("@keystone-6/core");
var import_fields8 = require("@keystone-6/core/fields");
var ChannelConnection = (0, import_core7.list)({
  access: hostScopedListAccess("canReadChannels", "canManageChannels"),
  hooks: hostScopedHooks("canManageChannels"),
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
    channelListings: (0, import_fields8.relationship)({ ref: "ChannelListing.channelConnection", many: true }),
    channelReservations: (0, import_fields8.relationship)({ ref: "ChannelReservation.channelConnection", many: true }),
    syncEvents: (0, import_fields8.relationship)({ ref: "ChannelSyncEvent.channelConnection", many: true }),
    dataExchangeJobs: (0, import_fields8.relationship)({ ref: "DataExchangeJob.channelConnection", many: true }),
    conversations: (0, import_fields8.relationship)({ ref: "Conversation.channelConnection", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/ChannelListing.ts
var import_core8 = require("@keystone-6/core");
var import_fields9 = require("@keystone-6/core/fields");
var ChannelListing = (0, import_core8.list)({
  access: hostScopedListAccess("canReadChannels", "canManageChannels"),
  hooks: hostScopedHooks("canManageChannels"),
  ui: { listView: { initialColumns: ["listing", "channelConnection", "externalListingId", "status", "lastSyncedAt"] } },
  fields: {
    hostOrganization: (0, import_fields9.relationship)({ ref: "HostOrganization" }),
    listing: (0, import_fields9.relationship)({ ref: "Listing.channelListings" }),
    channelConnection: (0, import_fields9.relationship)({ ref: "ChannelConnection.channelListings" }),
    externalListingId: (0, import_fields9.text)({ validation: { isRequired: true }, isIndexed: true }),
    externalUrl: (0, import_fields9.text)(),
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
    channelReservations: (0, import_fields9.relationship)({ ref: "ChannelReservation.channelListing", many: true }),
    syncEvents: (0, import_fields9.relationship)({ ref: "ChannelSyncEvent.channelListing", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/ChannelReservation.ts
var import_core9 = require("@keystone-6/core");
var import_fields10 = require("@keystone-6/core/fields");
var ChannelReservation = (0, import_core9.list)({
  access: hostScopedListAccess("canReadChannels", "canManageChannels"),
  hooks: hostScopedHooks("canManageChannels"),
  ui: { listView: { initialColumns: ["externalReservationId", "channelConnection", "channelListing", "reservation", "status", "checkInDate", "checkOutDate"] } },
  fields: {
    hostOrganization: (0, import_fields10.relationship)({ ref: "HostOrganization" }),
    channelConnection: (0, import_fields10.relationship)({ ref: "ChannelConnection.channelReservations" }),
    channelListing: (0, import_fields10.relationship)({ ref: "ChannelListing.channelReservations" }),
    reservation: (0, import_fields10.relationship)({ ref: "Reservation.channelReservation" }),
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
    calendarBlocks: (0, import_fields10.relationship)({ ref: "CalendarBlock.channelReservation", many: true }),
    syncEvents: (0, import_fields10.relationship)({ ref: "ChannelSyncEvent.channelReservation", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/ChannelSyncEvent.ts
var import_core10 = require("@keystone-6/core");
var import_fields11 = require("@keystone-6/core/fields");
var ChannelSyncEvent = (0, import_core10.list)({
  access: hostScopedListAccess("canReadChannels", "canManageChannels"),
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
  hooks: hostScopedHooks("canManageMessages"),
  ui: { listView: { initialColumns: ["subject", "guest", "listing", "reservation", "status", "lastMessageAt"] } },
  fields: {
    hostOrganization: (0, import_fields12.relationship)({ ref: "HostOrganization.conversations" }),
    reservation: (0, import_fields12.relationship)({ ref: "Reservation.conversation" }),
    listing: (0, import_fields12.relationship)({ ref: "Listing.conversations" }),
    guest: (0, import_fields12.relationship)({ ref: "GuestProfile.conversations" }),
    channelConnection: (0, import_fields12.relationship)({ ref: "ChannelConnection.conversations" }),
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
    lastMessageAt: (0, import_fields12.timestamp)(),
    messages: (0, import_fields12.relationship)({ ref: "Message.conversation", many: true }),
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
  hooks: hostScopedHooks("canManagePricing"),
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
var GuestParty = (0, import_core15.list)({
  access: hostScopedListAccess("canReadGuests", "canManageGuests"),
  hooks: hostScopedHooks("canManageGuests"),
  ui: { listView: { initialColumns: ["reservation", "primaryGuest", "adults", "children", "infants", "pets"] } },
  fields: {
    hostOrganization: (0, import_fields16.relationship)({ ref: "HostOrganization" }),
    reservation: (0, import_fields16.relationship)({ ref: "Reservation.guestParty" }),
    primaryGuest: (0, import_fields16.relationship)({ ref: "GuestProfile" }),
    adults: (0, import_fields16.integer)({ defaultValue: 1, validation: { min: 1 } }),
    children: (0, import_fields16.integer)({ defaultValue: 0, validation: { min: 0 } }),
    infants: (0, import_fields16.integer)({ defaultValue: 0, validation: { min: 0 } }),
    pets: (0, import_fields16.integer)({ defaultValue: 0, validation: { min: 0 } }),
    invitedGuests: (0, import_fields16.json)({ ui: { description: "Snapshotted invited guest names and acceptance state; no sensitive identity documents." } }),
    ...trackingFields
  }
});

// features/keystone/models/GuestProfile.ts
var import_core16 = require("@keystone-6/core");
var import_fields17 = require("@keystone-6/core/fields");
var GuestProfile = (0, import_core16.list)({
  access: hostScopedListAccess("canReadGuests", "canManageGuests"),
  hooks: hostScopedHooks("canManageGuests"),
  ui: { listView: { initialColumns: ["name", "email", "phone", "verificationStatus", "reservations"] } },
  fields: {
    hostOrganization: (0, import_fields17.relationship)({ ref: "HostOrganization.guests" }),
    user: (0, import_fields17.relationship)({ ref: "User.guestProfile" }),
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
    reservations: (0, import_fields17.relationship)({ ref: "Reservation.guest", many: true }),
    conversations: (0, import_fields17.relationship)({ ref: "Conversation.guest", many: true }),
    reviews: (0, import_fields17.relationship)({ ref: "Review.guest", many: true }),
    payments: (0, import_fields17.relationship)({ ref: "Payment.guest", many: true }),
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
var import_fields19 = require("@keystone-6/core/fields");
var HostOrganization = (0, import_core18.list)({
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
    memberships: (0, import_fields19.relationship)({ ref: "HostMembership.hostOrganization", many: true }),
    properties: (0, import_fields19.relationship)({ ref: "Property.hostOrganization", many: true }),
    listings: (0, import_fields19.relationship)({ ref: "Listing.hostOrganization", many: true }),
    guests: (0, import_fields19.relationship)({ ref: "GuestProfile.hostOrganization", many: true }),
    reservations: (0, import_fields19.relationship)({ ref: "Reservation.hostOrganization", many: true }),
    payments: (0, import_fields19.relationship)({ ref: "Payment.hostOrganization", many: true }),
    paymentProviders: (0, import_fields19.relationship)({ ref: "PaymentProvider.hostOrganization", many: true }),
    paymentWebhookEvents: (0, import_fields19.relationship)({ ref: "PaymentWebhookEvent.hostOrganization", many: true }),
    payouts: (0, import_fields19.relationship)({ ref: "Payout.hostOrganization", many: true }),
    propertyOwners: (0, import_fields19.relationship)({ ref: "PropertyOwner.hostOrganization", many: true }),
    propertyOwnerAssignments: (0, import_fields19.relationship)({ ref: "PropertyOwnerAssignment.hostOrganization", many: true }),
    ownerStatements: (0, import_fields19.relationship)({ ref: "OwnerStatement.hostOrganization", many: true }),
    ownerStatementLines: (0, import_fields19.relationship)({ ref: "OwnerStatementLine.hostOrganization", many: true }),
    cancellationPolicies: (0, import_fields19.relationship)({ ref: "CancellationPolicy.hostOrganization", many: true }),
    conversations: (0, import_fields19.relationship)({ ref: "Conversation.hostOrganization", many: true }),
    reviews: (0, import_fields19.relationship)({ ref: "Review.hostOrganization", many: true }),
    tasks: (0, import_fields19.relationship)({ ref: "PropertyTask.hostOrganization", many: true }),
    taskRules: (0, import_fields19.relationship)({ ref: "TaskRule.hostOrganization", many: true }),
    channelConnections: (0, import_fields19.relationship)({ ref: "ChannelConnection.hostOrganization", many: true }),
    dataExchangeJobs: (0, import_fields19.relationship)({ ref: "DataExchangeJob.hostOrganization", many: true }),
    outboxEvents: (0, import_fields19.relationship)({ ref: "OutboxEvent.hostOrganization", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/HouseRule.ts
var import_core19 = require("@keystone-6/core");
var import_fields20 = require("@keystone-6/core/fields");
var HouseRule = (0, import_core19.list)({
  access: hostScopedListAccess("canReadListings", "canManageListings"),
  hooks: hostScopedHooks("canManageListings"),
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
var import_fields21 = require("@keystone-6/core/fields");
var Listing = (0, import_core20.list)({
  access: hostScopedListAccess("canReadListings", "canManageListings"),
  hooks: hostScopedHooks("canManageListings"),
  ui: {
    labelField: "title",
    listView: { initialColumns: ["title", "status", "property", "accommodationUnit", "baseNightlyRateCents", "instantBook"] }
  },
  fields: {
    hostOrganization: (0, import_fields21.relationship)({ ref: "HostOrganization.listings" }),
    property: (0, import_fields21.relationship)({ ref: "Property.listings" }),
    accommodationUnit: (0, import_fields21.relationship)({ ref: "AccommodationUnit.listings" }),
    title: (0, import_fields21.text)({ validation: { isRequired: true } }),
    slug: (0, import_fields21.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    subtitle: (0, import_fields21.text)(),
    description: (0, import_fields21.text)({ ui: { displayMode: "textarea" } }),
    status: (0, import_fields21.select)({
      type: "string",
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
    advanceNoticeHours: (0, import_fields21.integer)({ defaultValue: 24, validation: { min: 0 } }),
    bookingWindowDays: (0, import_fields21.integer)({ defaultValue: 365, validation: { min: 1 } }),
    reviewAverageHundredths: (0, import_fields21.integer)({ defaultValue: 0, validation: { min: 0, max: 500 } }),
    reviewCount: (0, import_fields21.integer)({ defaultValue: 0, validation: { min: 0 } }),
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
    calendarBlocks: (0, import_fields21.relationship)({ ref: "CalendarBlock.listing", many: true }),
    ratePlans: (0, import_fields21.relationship)({ ref: "RatePlan.listing", many: true }),
    feeDefinitions: (0, import_fields21.relationship)({ ref: "FeeDefinition.listing", many: true }),
    taxRules: (0, import_fields21.relationship)({ ref: "TaxRule.listing", many: true }),
    quotes: (0, import_fields21.relationship)({ ref: "StayQuote.listing", many: true }),
    reservations: (0, import_fields21.relationship)({ ref: "Reservation.listing", many: true }),
    conversations: (0, import_fields21.relationship)({ ref: "Conversation.listing", many: true }),
    reviews: (0, import_fields21.relationship)({ ref: "Review.listing", many: true }),
    tasks: (0, import_fields21.relationship)({ ref: "PropertyTask.listing", many: true }),
    channelListings: (0, import_fields21.relationship)({ ref: "ChannelListing.listing", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/ListingMedia.ts
var import_core21 = require("@keystone-6/core");
var import_fields22 = require("@keystone-6/core/fields");
var ListingMedia = (0, import_core21.list)({
  access: hostScopedListAccess("canReadListings", "canManageListings"),
  hooks: hostScopedHooks("canManageListings"),
  ui: { listView: { initialColumns: ["listing", "image", "imagePath", "altText", "order"] } },
  fields: {
    hostOrganization: (0, import_fields22.relationship)({ ref: "HostOrganization" }),
    listing: (0, import_fields22.relationship)({ ref: "Listing.media" }),
    image: (0, import_fields22.image)({ storage: "my_images" }),
    imagePath: (0, import_fields22.text)({ isIndexed: "unique" }),
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

// features/platform/store-settings/lib/theme.ts
var DEFAULT_STOREFRONT_ACCENT_HUE = 155;
function normalizeStorefrontAccentHue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_STOREFRONT_ACCENT_HUE;
  const rounded = Math.round(numeric);
  return (rounded % 360 + 360) % 360;
}

// features/keystone/models/MarketplaceSettings.ts
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
  ui: {
    isHidden: (args) => !permissions.canManageSettings(args),
    label: "Marketplace Settings",
    singular: "Marketplace Settings",
    plural: "Marketplace Settings Items",
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
    currencyCode: (0, import_fields23.text)({ defaultValue: "USD", validation: { isRequired: true } }),
    locale: (0, import_fields23.text)({ defaultValue: "en-US", validation: { isRequired: true } }),
    timezone: (0, import_fields23.text)({ defaultValue: "America/New_York", validation: { isRequired: true } }),
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
      ui: { description: "Storefront accent hue in degrees (0\u2013359)." }
    }),
    isPublished: (0, import_fields23.checkbox)({
      defaultValue: true,
      ui: { description: "Publishes only the storefront identity and theme. Listing availability and payment state remain evidence-driven." }
    }),
    ...trackingFields
  }
});

// features/keystone/models/Message.ts
var import_core23 = require("@keystone-6/core");
var import_fields24 = require("@keystone-6/core/fields");
var Message = (0, import_core23.list)({
  access: hostScopedListAccess("canReadMessages", "canManageMessages"),
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
    processedAt: (0, import_fields25.timestamp)(),
    errorMessage: (0, import_fields25.text)({ ui: { displayMode: "textarea" } }),
    processedBy: (0, import_fields25.relationship)({ ref: "User" }),
    refunds: (0, import_fields25.relationship)({ ref: "Refund.payment", many: true }),
    securityDeposits: (0, import_fields25.relationship)({ ref: "SecurityDeposit.payment", many: true }),
    webhookEvents: (0, import_fields25.relationship)({ ref: "PaymentWebhookEvent.payment", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/PaymentProvider.ts
var import_core25 = require("@keystone-6/core");
var import_fields26 = require("@keystone-6/core/fields");
var PaymentProvider = (0, import_core25.list)({
  db: {
    extendPrismaSchema(schema) {
      return schema.replace(/\n}\s*$/, "\n\n  @@unique([hostOrganizationId, code])\n}");
    }
  },
  access: hostScopedListAccess("canReadPayments", "canManagePayments"),
  hooks: hostScopedHooks("canManagePayments"),
  ui: { listView: { initialColumns: ["name", "code", "hostOrganization", "isInstalled"] } },
  fields: {
    hostOrganization: (0, import_fields26.relationship)({ ref: "HostOrganization.paymentProviders" }),
    name: (0, import_fields26.text)({ validation: { isRequired: true } }),
    code: (0, import_fields26.text)({
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
    payments: (0, import_fields26.relationship)({ ref: "Payment.paymentProvider", many: true }),
    webhookEvents: (0, import_fields26.relationship)({ ref: "PaymentWebhookEvent.paymentProvider", many: true }),
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
    providerPayoutId: (0, import_fields28.text)({ isIndexed: "unique" }),
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
    lines: (0, import_fields29.relationship)({ ref: "OwnerStatementLine.statement", many: true }),
    payouts: (0, import_fields29.relationship)({ ref: "Payout.ownerStatement", many: true }),
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

// features/keystone/models/OutboxEvent.ts
var import_core30 = require("@keystone-6/core");
var import_fields31 = require("@keystone-6/core/fields");
var OutboxEvent = (0, import_core30.list)({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords("canReadReports") }
  },
  ui: {
    listView: { initialColumns: ["eventType", "aggregateType", "aggregateId", "status", "attempts", "availableAt", "processedAt"] }
  },
  fields: {
    hostOrganization: (0, import_fields31.relationship)({ ref: "HostOrganization.outboxEvents" }),
    eventType: (0, import_fields31.text)({ validation: { isRequired: true } }),
    aggregateType: (0, import_fields31.text)({ validation: { isRequired: true } }),
    aggregateId: (0, import_fields31.text)({ validation: { isRequired: true } }),
    idempotencyKey: (0, import_fields31.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    payload: (0, import_fields31.json)({
      ui: { description: "Versioned non-secret event payload. Public credentials and provider secrets are prohibited." }
    }),
    status: (0, import_fields31.select)({
      type: "string",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Processing", value: "processing" },
        { label: "Delivered", value: "delivered" },
        { label: "Failed", value: "failed" }
      ],
      defaultValue: "pending"
    }),
    attempts: (0, import_fields31.integer)({ defaultValue: 0, validation: { min: 0 } }),
    availableAt: (0, import_fields31.timestamp)({ defaultValue: { kind: "now" } }),
    processedAt: (0, import_fields31.timestamp)(),
    lastError: (0, import_fields31.text)({ ui: { displayMode: "textarea" } }),
    ...trackingFields
  }
});

// features/keystone/models/Property.ts
var import_core31 = require("@keystone-6/core");
var import_fields32 = require("@keystone-6/core/fields");
var Property = (0, import_core31.list)({
  access: hostScopedListAccess("canReadProperties", "canManageProperties"),
  hooks: hostScopedHooks("canManageProperties"),
  ui: { listView: { initialColumns: ["name", "hostOrganization", "propertyType", "status", "timezone"] } },
  fields: {
    hostOrganization: (0, import_fields32.relationship)({ ref: "HostOrganization.properties" }),
    name: (0, import_fields32.text)({ validation: { isRequired: true } }),
    internalCode: (0, import_fields32.text)({ isIndexed: "unique" }),
    propertyType: (0, import_fields32.select)({
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
    status: (0, import_fields32.select)({
      type: "string",
      options: [
        { label: "Onboarding", value: "onboarding" },
        { label: "Active", value: "active" },
        { label: "Paused", value: "paused" },
        { label: "Archived", value: "archived" }
      ],
      defaultValue: "onboarding"
    }),
    timezone: (0, import_fields32.text)({ defaultValue: "America/New_York", validation: { isRequired: true } }),
    checkInFrom: (0, import_fields32.text)({ defaultValue: "16:00" }),
    checkInUntil: (0, import_fields32.text)({ defaultValue: "22:00" }),
    checkOutBy: (0, import_fields32.text)({ defaultValue: "11:00" }),
    registrationNumber: (0, import_fields32.text)(),
    internalNotes: (0, import_fields32.text)({ ui: { displayMode: "textarea" } }),
    address: (0, import_fields32.relationship)({ ref: "PropertyAddress.property" }),
    units: (0, import_fields32.relationship)({ ref: "AccommodationUnit.property", many: true }),
    listings: (0, import_fields32.relationship)({ ref: "Listing.property", many: true }),
    ownerAssignments: (0, import_fields32.relationship)({ ref: "PropertyOwnerAssignment.property", many: true }),
    tasks: (0, import_fields32.relationship)({ ref: "PropertyTask.property", many: true }),
    taskRules: (0, import_fields32.relationship)({ ref: "TaskRule.property", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/PropertyAddress.ts
var import_core32 = require("@keystone-6/core");
var import_fields33 = require("@keystone-6/core/fields");
var PropertyAddress = (0, import_core32.list)({
  access: hostScopedListAccess("canReadProperties", "canManageProperties"),
  hooks: hostScopedHooks("canManageProperties"),
  ui: { listView: { initialColumns: ["property", "city", "region", "countryCode", "showExactAddressPublicly"] } },
  fields: {
    hostOrganization: (0, import_fields33.relationship)({ ref: "HostOrganization" }),
    property: (0, import_fields33.relationship)({ ref: "Property.address" }),
    addressLine1: (0, import_fields33.text)(),
    addressLine2: (0, import_fields33.text)(),
    city: (0, import_fields33.text)({ validation: { isRequired: true } }),
    region: (0, import_fields33.text)(),
    postalCode: (0, import_fields33.text)(),
    countryCode: (0, import_fields33.text)({ validation: { isRequired: true }, defaultValue: "US" }),
    latitude: (0, import_fields33.float)(),
    longitude: (0, import_fields33.float)(),
    publicLocationLabel: (0, import_fields33.text)(),
    showExactAddressPublicly: (0, import_fields33.checkbox)({ defaultValue: false }),
    ...trackingFields
  }
});

// features/keystone/models/PropertyOwner.ts
var import_core33 = require("@keystone-6/core");
var import_fields34 = require("@keystone-6/core/fields");
var PropertyOwner = (0, import_core33.list)({
  access: hostScopedListAccess("canReadPayouts", "canManagePayouts"),
  hooks: hostScopedHooks("canManagePayouts"),
  ui: { listView: { initialColumns: ["ownerNumber", "displayName", "companyName", "status", "payoutSchedule"] } },
  fields: {
    hostOrganization: (0, import_fields34.relationship)({ ref: "HostOrganization.propertyOwners" }),
    user: (0, import_fields34.relationship)({ ref: "User" }),
    ownerNumber: (0, import_fields34.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    displayName: (0, import_fields34.text)({ validation: { isRequired: true } }),
    companyName: (0, import_fields34.text)(),
    email: (0, import_fields34.text)({ validation: { isRequired: true } }),
    phone: (0, import_fields34.text)(),
    status: (0, import_fields34.select)({
      type: "string",
      options: [
        { label: "Invited", value: "invited" },
        { label: "Active", value: "active" },
        { label: "Suspended", value: "suspended" },
        { label: "Archived", value: "archived" }
      ],
      defaultValue: "invited"
    }),
    payoutSchedule: (0, import_fields34.select)({
      type: "string",
      options: [
        { label: "Monthly", value: "monthly" },
        { label: "Quarterly", value: "quarterly" },
        { label: "Manual", value: "manual" }
      ],
      defaultValue: "monthly"
    }),
    defaultManagerCommissionBasisPoints: (0, import_fields34.integer)({ defaultValue: 1500, validation: { min: 0, max: 1e4 } }),
    payoutMethod: (0, import_fields34.select)({
      type: "string",
      options: [
        { label: "Manual", value: "manual" },
        { label: "External bank transfer", value: "external_bank" },
        { label: "External payment provider", value: "external_provider" }
      ],
      defaultValue: "manual"
    }),
    payoutReference: (0, import_fields34.text)({ ui: { description: "Non-secret external payee or accounting reference." } }),
    taxProfile: (0, import_fields34.json)({
      defaultValue: {},
      ui: { description: "Non-secret tax classification and reporting metadata. Never store tax IDs or bank credentials here." }
    }),
    assignments: (0, import_fields34.relationship)({ ref: "PropertyOwnerAssignment.owner", many: true }),
    statements: (0, import_fields34.relationship)({ ref: "OwnerStatement.owner", many: true }),
    payouts: (0, import_fields34.relationship)({ ref: "Payout.propertyOwner", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/PropertyOwnerAssignment.ts
var import_core34 = require("@keystone-6/core");
var import_fields35 = require("@keystone-6/core/fields");
var PropertyOwnerAssignment = (0, import_core34.list)({
  db: {
    extendPrismaSchema(schema) {
      return schema.replace(/\n}\s*$/, "\n\n  @@unique([propertyId, ownerId, effectiveFrom])\n}");
    }
  },
  access: hostScopedListAccess("canReadPayouts", "canManagePayouts"),
  hooks: hostScopedHooks("canManagePayouts"),
  ui: { listView: { initialColumns: ["owner", "property", "status", "ownershipBasisPoints", "managerCommissionBasisPoints", "effectiveFrom"] } },
  fields: {
    hostOrganization: (0, import_fields35.relationship)({ ref: "HostOrganization.propertyOwnerAssignments" }),
    owner: (0, import_fields35.relationship)({ ref: "PropertyOwner.assignments" }),
    property: (0, import_fields35.relationship)({ ref: "Property.ownerAssignments" }),
    status: (0, import_fields35.select)({
      type: "string",
      options: [
        { label: "Active", value: "active" },
        { label: "Ended", value: "ended" }
      ],
      defaultValue: "active"
    }),
    isPrimary: (0, import_fields35.checkbox)({ defaultValue: true }),
    ownershipBasisPoints: (0, import_fields35.integer)({ defaultValue: 1e4, validation: { min: 1, max: 1e4 } }),
    managerCommissionBasisPoints: (0, import_fields35.integer)({ defaultValue: 1500, validation: { min: 0, max: 1e4 } }),
    effectiveFrom: (0, import_fields35.text)({ validation: { isRequired: true }, ui: { description: "Inclusive date in YYYY-MM-DD format." } }),
    effectiveTo: (0, import_fields35.text)({ ui: { description: "Exclusive date in YYYY-MM-DD format." } }),
    notes: (0, import_fields35.text)({ ui: { displayMode: "textarea" } }),
    ...trackingFields
  }
});

// features/keystone/models/PropertyTask.ts
var import_core35 = require("@keystone-6/core");
var import_fields36 = require("@keystone-6/core/fields");
var PropertyTask = (0, import_core35.list)({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords("canReadProperties") }
  },
  hooks: hostScopedHooks("canManageProperties"),
  ui: { listView: { initialColumns: ["title", "taskType", "property", "reservation", "assignee", "status", "dueAt"] } },
  fields: {
    hostOrganization: (0, import_fields36.relationship)({ ref: "HostOrganization.tasks" }),
    property: (0, import_fields36.relationship)({ ref: "Property.tasks" }),
    listing: (0, import_fields36.relationship)({ ref: "Listing.tasks" }),
    reservation: (0, import_fields36.relationship)({ ref: "Reservation.tasks" }),
    taskRule: (0, import_fields36.relationship)({ ref: "TaskRule.tasks" }),
    assignee: (0, import_fields36.relationship)({ ref: "User.assignedPropertyTasks" }),
    idempotencyKey: (0, import_fields36.text)({ isIndexed: "unique" }),
    source: (0, import_fields36.select)({
      type: "string",
      options: [
        { label: "Manual", value: "manual" },
        { label: "Task rule", value: "task_rule" },
        { label: "System", value: "system" },
        { label: "Channel", value: "channel" }
      ],
      defaultValue: "manual"
    }),
    title: (0, import_fields36.text)({ validation: { isRequired: true } }),
    taskType: (0, import_fields36.select)({
      type: "string",
      options: [
        { label: "Turnover Cleaning", value: "turnover_cleaning" },
        { label: "Readiness Inspection", value: "readiness_inspection" },
        { label: "Property Maintenance", value: "property_maintenance" },
        { label: "Guest Request", value: "guest_request" },
        { label: "Restocking", value: "restocking" },
        { label: "Check-in Support", value: "check_in_support" }
      ],
      defaultValue: "turnover_cleaning"
    }),
    status: (0, import_fields36.select)({
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
    priority: (0, import_fields36.select)({
      type: "string",
      options: [
        { label: "Low", value: "low" },
        { label: "Normal", value: "normal" },
        { label: "High", value: "high" },
        { label: "Urgent", value: "urgent" }
      ],
      defaultValue: "normal"
    }),
    dueAt: (0, import_fields36.timestamp)(),
    claimedAt: (0, import_fields36.timestamp)(),
    startedAt: (0, import_fields36.timestamp)(),
    completedAt: (0, import_fields36.timestamp)(),
    cancelledAt: (0, import_fields36.timestamp)(),
    checklist: (0, import_fields36.json)(),
    completionEvidence: (0, import_fields36.json)({ access: { update: () => false }, ui: { itemView: { fieldMode: "read" } } }),
    completionNotes: (0, import_fields36.text)({ ui: { displayMode: "textarea" } }),
    notes: (0, import_fields36.text)({ ui: { displayMode: "textarea" } }),
    ...trackingFields
  }
});

// features/keystone/models/RatePlan.ts
var import_core36 = require("@keystone-6/core");
var import_fields37 = require("@keystone-6/core/fields");
var RatePlan = (0, import_core36.list)({
  access: hostScopedListAccess("canReadPricing", "canManagePricing"),
  hooks: hostScopedHooks("canManagePricing"),
  ui: { listView: { initialColumns: ["name", "listing", "baseNightlyRateCents", "minimumStay", "status"] } },
  fields: {
    hostOrganization: (0, import_fields37.relationship)({ ref: "HostOrganization" }),
    listing: (0, import_fields37.relationship)({ ref: "Listing.ratePlans" }),
    cancellationPolicy: (0, import_fields37.relationship)({ ref: "CancellationPolicy.ratePlans" }),
    name: (0, import_fields37.text)({ validation: { isRequired: true } }),
    description: (0, import_fields37.text)({ ui: { displayMode: "textarea" } }),
    status: (0, import_fields37.select)({
      type: "string",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Active", value: "active" },
        { label: "Archived", value: "archived" }
      ],
      defaultValue: "draft"
    }),
    currencyCode: (0, import_fields37.text)({ defaultValue: "USD", validation: { isRequired: true } }),
    baseNightlyRateCents: (0, import_fields37.integer)({ defaultValue: 0, validation: { min: 0 } }),
    minimumStay: (0, import_fields37.integer)({ defaultValue: 1, validation: { min: 1 } }),
    maximumStay: (0, import_fields37.integer)({ validation: { min: 1 } }),
    advanceNoticeHours: (0, import_fields37.integer)({ defaultValue: 24, validation: { min: 0 } }),
    bookingWindowDays: (0, import_fields37.integer)({ defaultValue: 365, validation: { min: 1 } }),
    isDefault: (0, import_fields37.checkbox)({ defaultValue: false }),
    seasonalRates: (0, import_fields37.relationship)({ ref: "SeasonalRate.ratePlan", many: true }),
    quotes: (0, import_fields37.relationship)({ ref: "StayQuote.ratePlan", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/Refund.ts
var import_core37 = require("@keystone-6/core");
var import_fields38 = require("@keystone-6/core/fields");
var Refund = (0, import_core37.list)({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords("canReadPayments") }
  },
  ui: { listView: { initialColumns: ["refundNumber", "reservation", "payment", "status", "amountCents", "processedAt"] } },
  fields: {
    hostOrganization: (0, import_fields38.relationship)({ ref: "HostOrganization" }),
    reservation: (0, import_fields38.relationship)({ ref: "Reservation.refunds" }),
    payment: (0, import_fields38.relationship)({ ref: "Payment.refunds" }),
    refundNumber: (0, import_fields38.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    idempotencyKey: (0, import_fields38.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    status: (0, import_fields38.select)({
      type: "string",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Processing", value: "processing" },
        { label: "Succeeded", value: "succeeded" },
        { label: "Failed", value: "failed" },
        { label: "Cancelled", value: "cancelled" }
      ],
      defaultValue: "pending"
    }),
    reason: (0, import_fields38.select)({
      type: "string",
      options: [
        { label: "Guest cancellation", value: "guest_cancellation" },
        { label: "Host cancellation", value: "host_cancellation" },
        { label: "Stay issue", value: "stay_issue" },
        { label: "Overpayment", value: "overpayment" },
        { label: "Goodwill", value: "goodwill" },
        { label: "Other", value: "other" }
      ],
      defaultValue: "other"
    }),
    amountCents: (0, import_fields38.integer)({ validation: { isRequired: true, min: 1 } }),
    currencyCode: (0, import_fields38.text)({ defaultValue: "USD" }),
    providerRefundId: (0, import_fields38.text)({ isIndexed: "unique" }),
    processedAt: (0, import_fields38.timestamp)(),
    data: (0, import_fields38.json)(),
    ...trackingFields
  }
});

// features/keystone/models/Reservation.ts
var import_core38 = require("@keystone-6/core");
var import_fields39 = require("@keystone-6/core/fields");
var Reservation = (0, import_core38.list)({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords("canReadReservations") }
  },
  ui: {
    listView: { initialColumns: ["confirmationCode", "status", "listing", "guest", "checkInDate", "checkOutDate", "totalAmountCents"] }
  },
  fields: {
    hostOrganization: (0, import_fields39.relationship)({ ref: "HostOrganization.reservations" }),
    listing: (0, import_fields39.relationship)({ ref: "Listing.reservations" }),
    accommodationUnit: (0, import_fields39.relationship)({ ref: "AccommodationUnit.reservations" }),
    guest: (0, import_fields39.relationship)({ ref: "GuestProfile.reservations" }),
    guestParty: (0, import_fields39.relationship)({ ref: "GuestParty.reservation" }),
    quote: (0, import_fields39.relationship)({ ref: "StayQuote.reservation" }),
    confirmationCode: (0, import_fields39.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    tripTokenHash: (0, import_fields39.text)({
      validation: { isRequired: true },
      isIndexed: "unique",
      access: { read: permissions.canManageReservations, update: () => false },
      ui: { itemView: { fieldMode: "hidden" }, createView: { fieldMode: "hidden" }, listView: { fieldMode: "hidden" } }
    }),
    tripTokenExpiresAt: (0, import_fields39.timestamp)({ validation: { isRequired: true } }),
    tripTokenRevokedAt: (0, import_fields39.timestamp)(),
    status: (0, import_fields39.select)({
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
    paymentStatus: (0, import_fields39.select)({
      type: "string",
      options: [
        { label: "Unpaid", value: "unpaid" },
        { label: "Partial", value: "partial" },
        { label: "Paid", value: "paid" },
        { label: "Partially Refunded", value: "partially_refunded" },
        { label: "Refunded", value: "refunded" }
      ],
      defaultValue: "unpaid"
    }),
    source: (0, import_fields39.select)({
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
    checkInDate: (0, import_fields39.text)({ validation: { isRequired: true } }),
    checkOutDate: (0, import_fields39.text)({ validation: { isRequired: true } }),
    scheduledCheckInTime: (0, import_fields39.text)(),
    scheduledCheckOutTime: (0, import_fields39.text)(),
    checkedInAt: (0, import_fields39.timestamp)(),
    checkedOutAt: (0, import_fields39.timestamp)(),
    cancelledAt: (0, import_fields39.timestamp)(),
    cancellationReason: (0, import_fields39.text)({ ui: { displayMode: "textarea" } }),
    cancelledBy: (0, import_fields39.select)({
      type: "string",
      options: [
        { label: "Guest", value: "guest" },
        { label: "Host", value: "host" },
        { label: "System", value: "system" },
        { label: "Channel", value: "channel" }
      ]
    }),
    currencyCode: (0, import_fields39.text)({ defaultValue: "USD", validation: { isRequired: true } }),
    lodgingSubtotalCents: (0, import_fields39.integer)({ defaultValue: 0, validation: { min: 0 } }),
    feeTotalCents: (0, import_fields39.integer)({ defaultValue: 0, validation: { min: 0 } }),
    taxTotalCents: (0, import_fields39.integer)({ defaultValue: 0, validation: { min: 0 } }),
    discountTotalCents: (0, import_fields39.integer)({ defaultValue: 0, validation: { min: 0 } }),
    securityDepositCents: (0, import_fields39.integer)({ defaultValue: 0, validation: { min: 0 } }),
    totalAmountCents: (0, import_fields39.integer)({ defaultValue: 0, validation: { min: 0 } }),
    amountPaidCents: (0, import_fields39.integer)({ defaultValue: 0, validation: { min: 0 } }),
    bookingSnapshot: (0, import_fields39.json)({ access: { update: () => false }, ui: { itemView: { fieldMode: "read" } } }),
    guestNotes: (0, import_fields39.text)({ ui: { displayMode: "textarea" } }),
    internalNotes: (0, import_fields39.text)({ ui: { displayMode: "textarea" } }),
    lineItems: (0, import_fields39.relationship)({ ref: "ReservationLineItem.reservation", many: true }),
    calendarBlocks: (0, import_fields39.relationship)({ ref: "CalendarBlock.reservation", many: true }),
    agreement: (0, import_fields39.relationship)({ ref: "StayAgreement.reservation" }),
    securityDeposit: (0, import_fields39.relationship)({ ref: "SecurityDeposit.reservation" }),
    damageClaims: (0, import_fields39.relationship)({ ref: "DamageClaim.reservation", many: true }),
    payments: (0, import_fields39.relationship)({ ref: "Payment.reservation", many: true }),
    refunds: (0, import_fields39.relationship)({ ref: "Refund.reservation", many: true }),
    payout: (0, import_fields39.relationship)({ ref: "Payout.reservation" }),
    conversation: (0, import_fields39.relationship)({ ref: "Conversation.reservation" }),
    reviews: (0, import_fields39.relationship)({ ref: "Review.reservation", many: true }),
    channelReservation: (0, import_fields39.relationship)({ ref: "ChannelReservation.reservation" }),
    tasks: (0, import_fields39.relationship)({ ref: "PropertyTask.reservation", many: true }),
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
  access: hostScopedListAccess("canReadReviews", "canManageReviews"),
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
var import_access41 = require("@keystone-6/core/access");
var import_fields42 = require("@keystone-6/core/fields");
var Role = (0, import_core41.list)({
  access: {
    operation: {
      ...(0, import_access41.allOperations)(permissions.canManageRoles),
      query: isSignedIn
    }
  },
  ui: {
    hideCreate: (args) => !permissions.canManageRoles(args),
    hideDelete: (args) => !permissions.canManageRoles(args),
    listView: { initialColumns: ["name", "assignedTo"] },
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
    assignedTo: (0, import_fields42.relationship)({ ref: "User.role", many: true, ui: { itemView: { fieldMode: "read" } } }),
    ...trackingFields
  }
});

// features/keystone/models/SeasonalRate.ts
var import_core42 = require("@keystone-6/core");
var import_fields43 = require("@keystone-6/core/fields");
var SeasonalRate = (0, import_core42.list)({
  access: hostScopedListAccess("canReadPricing", "canManagePricing"),
  hooks: hostScopedHooks("canManagePricing"),
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
  ui: { listView: { initialColumns: ["name", "slug", "isActive", "listings"] } },
  fields: {
    name: (0, import_fields46.text)({ validation: { isRequired: true } }),
    slug: (0, import_fields46.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    description: (0, import_fields46.text)({ ui: { displayMode: "textarea" } }),
    isActive: (0, import_fields46.checkbox)({ defaultValue: true }),
    listings: (0, import_fields46.relationship)({ ref: "Listing.collections", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/StayQuote.ts
var import_core46 = require("@keystone-6/core");
var import_fields47 = require("@keystone-6/core/fields");
var StayQuote = (0, import_core46.list)({
  access: hostScopedListAccess("canReadReservations", "canManageReservations"),
  hooks: hostScopedHooks("canManageReservations"),
  ui: { listView: { initialColumns: ["quoteNumber", "listing", "checkInDate", "checkOutDate", "totalAmountCents", "status", "expiresAt"] } },
  fields: {
    hostOrganization: (0, import_fields47.relationship)({ ref: "HostOrganization" }),
    listing: (0, import_fields47.relationship)({ ref: "Listing.quotes" }),
    ratePlan: (0, import_fields47.relationship)({ ref: "RatePlan.quotes" }),
    reservation: (0, import_fields47.relationship)({ ref: "Reservation.quote" }),
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
var TaskRule = (0, import_core47.list)({
  access: hostScopedListAccess("canReadProperties", "canManageProperties"),
  hooks: hostScopedHooks("canManageProperties"),
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
      options: [
        { label: "Reservation confirmed", value: "reservation_confirmed" },
        { label: "Before check-in", value: "before_check_in" },
        { label: "After check-out", value: "after_check_out" },
        { label: "Reservation cancelled", value: "reservation_cancelled" },
        { label: "Calendar schedule", value: "calendar_schedule" }
      ],
      defaultValue: "after_check_out"
    }),
    offsetMinutes: (0, import_fields48.integer)({ defaultValue: 0 }),
    taskType: (0, import_fields48.select)({
      type: "string",
      options: [
        { label: "Turnover Cleaning", value: "turnover_cleaning" },
        { label: "Readiness Inspection", value: "readiness_inspection" },
        { label: "Property Maintenance", value: "property_maintenance" },
        { label: "Guest Request", value: "guest_request" },
        { label: "Restocking", value: "restocking" },
        { label: "Check-in Support", value: "check_in_support" }
      ],
      defaultValue: "turnover_cleaning"
    }),
    titleTemplate: (0, import_fields48.text)({ validation: { isRequired: true } }),
    priority: (0, import_fields48.select)({
      type: "string",
      options: [
        { label: "Low", value: "low" },
        { label: "Normal", value: "normal" },
        { label: "High", value: "high" },
        { label: "Urgent", value: "urgent" }
      ],
      defaultValue: "normal"
    }),
    checklistTemplate: (0, import_fields48.json)({ defaultValue: [] }),
    isActive: (0, import_fields48.checkbox)({ defaultValue: true }),
    tasks: (0, import_fields48.relationship)({ ref: "PropertyTask.taskRule", many: true }),
    ...trackingFields
  }
});

// features/keystone/models/TaxRule.ts
var import_core48 = require("@keystone-6/core");
var import_fields49 = require("@keystone-6/core/fields");
var TaxRule = (0, import_core48.list)({
  access: hostScopedListAccess("canReadPricing", "canManagePricing"),
  hooks: hostScopedHooks("canManagePricing"),
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
var import_access50 = require("@keystone-6/core/access");
var import_fields50 = require("@keystone-6/core/fields");
var User = (0, import_core49.list)({
  access: {
    operation: {
      ...(0, import_access50.allOperations)(isSignedIn),
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
      validation: { isRequired: true }
    }),
    password: (0, import_fields50.password)({
      access: {
        read: import_access50.denyAll,
        update: ({ session, item }) => permissions.canManagePeople({ session }) || session?.itemId === item.id
      },
      validation: { isRequired: true }
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
      access: { update: () => false }
    }),
    hostMemberships: (0, import_fields50.relationship)({ ref: "HostMembership.user", many: true }),
    guestProfile: (0, import_fields50.relationship)({ ref: "GuestProfile.user", ui: { itemView: { fieldMode: "read" } } }),
    sentMessages: (0, import_fields50.relationship)({ ref: "Message.senderUser", many: true }),
    authoredReviews: (0, import_fields50.relationship)({ ref: "Review.authorUser", many: true }),
    assignedPropertyTasks: (0, import_fields50.relationship)({ ref: "PropertyTask.assignee", many: true }),
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
  DataExchangeJob,
  OutboxEvent
};

// features/keystone/index.ts
var import_session = require("@keystone-6/core/session");

// features/keystone/mutations/index.ts
var import_schema = require("@graphql-tools/schema");

// features/keystone/utils/manualPaymentLifecycle.ts
var import_node_crypto = __toESM(require("node:crypto"));
function createManualPaymentIdempotencyKey({
  reservationId,
  amount,
  currencyCode
}) {
  return import_node_crypto.default.createHash("sha256").update(`${reservationId}:${amount}:${currencyCode.toUpperCase()}`).digest("hex");
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
  return { status: "refunded", amount, data: { paymentId, status: "refunded", amount, refundedAt: (/* @__PURE__ */ new Date()).toISOString() } };
}
async function getPaymentStatusFunction({ paymentId }) {
  return { status: "pending", data: { paymentId, status: "pending" } };
}
async function generatePaymentLinkFunction() {
  return null;
}

// features/integrations/payment/index.ts
function verifySignedWebhook({ rawBody, signature: signature2, secret }) {
  if (!secret || !signature2) throw new Error("Payment webhook signature is required.");
  const expected = import_node_crypto2.default.createHmac("sha256", secret).update(rawBody).digest("hex");
  const providedBuffer = Buffer.from(signature2, "utf8");
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
  if (!event?.id || !event?.type) throw new Error("Payment webhook event id and type are required.");
  return event;
}
var manualAdapter = {
  code: "pp_system_default",
  createPayment: createPaymentFunction,
  capturePayment: capturePaymentFunction,
  refundPayment: refundPaymentFunction,
  getPaymentStatus: getPaymentStatusFunction,
  generatePaymentLink: generatePaymentLinkFunction
};
var signedTestAdapter = {
  code: "pp_signed_test",
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
    const signature2 = headers.get("x-openfront-signature") || "";
    return verifySignedWebhook({ rawBody, signature: signature2, secret });
  }
};
var paymentProviderAdapters = {
  pp_system_default: manualAdapter,
  pp_signed_test: signedTestAdapter
};
function getPaymentAdapter(providerCode) {
  const adapter = paymentProviderAdapters[providerCode];
  if (!adapter) throw new Error(`Unsupported payment provider: ${providerCode}`);
  return adapter;
}

// features/keystone/utils/paymentProviderAdapter.ts
function adapterFor(provider) {
  const code = provider?.code || provider?.provider || provider;
  return getPaymentAdapter(code);
}
async function createPayment({ provider, reservation, amount, currency }) {
  return adapterFor(provider).createPayment({ reservation, amount, currency });
}
async function capturePayment({ provider, paymentId, amount }) {
  return adapterFor(provider).capturePayment({ paymentId, amount });
}

// features/keystone/utils/paymentSettlement.ts
async function settleSucceededPayment(tx, {
  paymentId,
  expectedAmountCents,
  expectedCurrencyCode,
  evidence,
  processedAt
}) {
  await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `payment:${paymentId}`);
  const payment = await tx.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new Error("Payment not found.");
  if (payment.amountCents !== expectedAmountCents) throw new Error("Webhook payment amount does not match immutable payment evidence.");
  if ((payment.currencyCode || "").toUpperCase() !== expectedCurrencyCode.toUpperCase()) {
    throw new Error("Webhook payment currency does not match immutable payment evidence.");
  }
  if (payment.status === "succeeded") return { payment, alreadySettled: true };
  if (!["pending", "processing"].includes(payment.status)) throw new Error(`Cannot settle a ${payment.status} payment.`);
  const updated = await tx.payment.update({
    where: { id: payment.id },
    data: {
      status: "succeeded",
      processedAt,
      data: { ...payment.data && typeof payment.data === "object" ? payment.data : {}, settlement: evidence }
    }
  });
  if (payment.reservationId) {
    const [reservation, paid] = await Promise.all([
      tx.reservation.findUnique({ where: { id: payment.reservationId } }),
      tx.payment.aggregate({
        where: { reservationId: payment.reservationId, status: "succeeded" },
        _sum: { amountCents: true }
      })
    ]);
    if (reservation) {
      const amountPaidCents = Math.min(paid._sum.amountCents || 0, reservation.totalAmountCents || 0);
      const isPaid = amountPaidCents >= (reservation.totalAmountCents || 0);
      await tx.reservation.update({
        where: { id: reservation.id },
        data: {
          amountPaidCents,
          paymentStatus: isPaid ? "paid" : amountPaidCents > 0 ? "partial" : "unpaid",
          status: isPaid && reservation.status === "pending" ? "confirmed" : reservation.status
        }
      });
    }
  }
  return { payment: updated, alreadySettled: false };
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
      evidence: { kind: "operator_manual_capture", capture: captureResult?.data || captureResult },
      processedAt
    }),
    { maxWait: 5e3, timeout: 1e4, isolationLevel: "ReadCommitted" }
  );
  return context.sudo().query.Payment.findOne({
    where: { id: payment.id },
    query: "id amountCents status provider providerPaymentId currencyCode processedAt data"
  });
}

// features/keystone/mutations/calendarExchange.ts
var import_node_crypto5 = __toESM(require("node:crypto"));

// features/integrations/channels/ical.ts
var import_node_crypto3 = __toESM(require("node:crypto"));
var MAX_BYTES = 1e6;
var MAX_EVENTS = 500;
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
  let current = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      if (current) throw new Error("Nested iCalendar events are invalid.");
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (!current) throw new Error("Malformed iCalendar event.");
      const uid = current.UID?.trim();
      if (!uid || uid.length > 255) throw new Error("Every iCalendar event requires a bounded UID.");
      const startDate = dateOnly(current.DTSTART || "", "DTSTART");
      const endDate = dateOnly(current.DTEND || "", "DTEND");
      if (startDate >= endDate) throw new Error("iCalendar event end must be after its start.");
      events.push({ uid, startDate, endDate, summary: unescapeText(current.SUMMARY || "External calendar hold"), status: current.STATUS?.toUpperCase() === "CANCELLED" ? "cancelled" : "confirmed" });
      if (events.length > MAX_EVENTS) throw new Error("iCalendar event limit exceeded.");
      current = null;
      continue;
    }
    if (!current) continue;
    const separator = line.indexOf(":");
    if (separator < 1) continue;
    const name = line.slice(0, separator).split(";")[0].toUpperCase();
    if (["UID", "DTSTART", "DTEND", "SUMMARY", "STATUS"].includes(name)) current[name] = line.slice(separator + 1);
  }
  if (current) throw new Error("Unclosed iCalendar event.");
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
  return import_node_crypto3.default.createHash("sha256").update(input, "utf8").digest("hex");
}

// features/keystone/utils/outbox.ts
var import_node_crypto4 = __toESM(require("node:crypto"));
var SECRET_KEY = /(password|secret|credential|token|authorization|cookie|rawpayload|webhooksignature)/i;
function assertSafeOutboxPayload(payload, path = "payload") {
  if (payload == null || ["string", "number", "boolean"].includes(typeof payload)) return;
  if (Array.isArray(payload)) {
    payload.forEach((value, index) => assertSafeOutboxPayload(value, `${path}[${index}]`));
    return;
  }
  if (typeof payload !== "object") throw new Error("Outbox payload must be JSON-compatible.");
  for (const [key, value] of Object.entries(payload)) {
    if (SECRET_KEY.test(key)) throw new Error(`Outbox payload cannot include secret field ${path}.${key}.`);
    assertSafeOutboxPayload(value, `${path}.${key}`);
  }
}
function outboxIdempotencyKey(eventType, aggregateType, aggregateId, operationKey) {
  const canonical = [eventType, aggregateType, aggregateId, operationKey].map((value) => value.trim()).join("|");
  return `outbox:${import_node_crypto4.default.createHash("sha256").update(canonical).digest("hex")}`;
}
async function enqueueOutboxEvent(tx, input) {
  assertSafeOutboxPayload(input.payload);
  const idempotencyKey = outboxIdempotencyKey(input.eventType, input.aggregateType, input.aggregateId, input.operationKey);
  return tx.outboxEvent.upsert({
    where: { idempotencyKey },
    update: {},
    create: {
      hostOrganizationId: input.hostOrganizationId,
      eventType: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      idempotencyKey,
      payload: { version: 1, ...structuredClone(input.payload) },
      status: "pending",
      attempts: 0,
      availableAt: input.availableAt || /* @__PURE__ */ new Date()
    }
  });
}

// features/keystone/mutations/calendarExchange.ts
function importKey(hostId, connectionId, listingId, checksum) {
  return `ical-import:${hostId}:${connectionId}:${listingId}:${checksum}`;
}
function blockId(connectionId, listingId, uid) {
  return `ical_${import_node_crypto5.default.createHash("sha256").update(`${connectionId}|${listingId}|${uid}`).digest("hex")}`;
}
async function importListingCalendar(_root, args, context) {
  const connection = await context.query.ChannelConnection.findOne({
    where: { id: args.channelConnectionId },
    query: "id provider connectionType status hostOrganization { id }"
  });
  if (!connection?.hostOrganization?.id) throw new Error("Calendar connection not found.");
  if (connection.provider !== "ical" || connection.connectionType !== "ical" || connection.status !== "active") {
    throw new Error("Only an active installed iCalendar connection can import availability.");
  }
  await assertHostOrganizationAccess({ context, hostOrganizationId: connection.hostOrganization.id, permission: "canManageChannels" });
  const listing = await context.query.Listing.findOne({
    where: { id: args.listingId },
    query: "id title hostOrganization { id }"
  });
  if (!listing || listing.hostOrganization?.id !== connection.hostOrganization.id) throw new Error("Calendar listing must belong to the same host organization.");
  const events = parseICalendar(args.calendarText);
  const checksum = iCalendarChecksum(args.calendarText);
  const idempotencyKey = importKey(connection.hostOrganization.id, connection.id, listing.id, checksum);
  const sourceLabel = args.sourceLabel?.trim() || "Operator-provided iCalendar text";
  if (sourceLabel.length > 240) throw new Error("Calendar source label is too long.");
  return context.prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `stay-listing:${listing.id}`);
    const existing = await tx.dataExchangeJob.findUnique({ where: { idempotencyKey } });
    if (existing?.status === "succeeded" || existing?.status === "partially_succeeded") return existing;
    const job = existing || await tx.dataExchangeJob.create({
      data: {
        id: import_node_crypto5.default.randomUUID(),
        hostOrganizationId: connection.hostOrganization.id,
        channelConnectionId: connection.id,
        listingId: listing.id,
        direction: "import",
        domain: "availability",
        format: "ical",
        status: "processing",
        idempotencyKey,
        payloadSha256: checksum,
        sourceLabel,
        startedAt: /* @__PURE__ */ new Date()
      }
    });
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let conflictCount = 0;
    const conflicts = [];
    for (const event of events) {
      const id = blockId(connection.id, listing.id, event.uid);
      const current = await tx.calendarBlock.findUnique({ where: { id } });
      if (event.status === "cancelled") {
        if (current?.status === "active") {
          await tx.calendarBlock.update({ where: { id }, data: { status: "released", notes: `${event.summary} (cancelled in source calendar)` } });
          updatedCount += 1;
        } else skippedCount += 1;
        continue;
      }
      const conflict = await tx.calendarBlock.findFirst({
        where: { listingId: listing.id, status: "active", id: { not: id }, startDate: { lt: event.endDate }, endDate: { gt: event.startDate } },
        select: { id: true }
      });
      if (conflict) {
        conflictCount += 1;
        conflicts.push({ uid: event.uid, startDate: event.startDate, endDate: event.endDate });
        continue;
      }
      const data = {
        hostOrganizationId: connection.hostOrganization.id,
        listingId: listing.id,
        startDate: event.startDate,
        endDate: event.endDate,
        reason: "channel_import",
        status: "active",
        source: "ical",
        externalUid: event.uid,
        notes: event.summary
      };
      if (current) {
        await tx.calendarBlock.update({ where: { id }, data });
        updatedCount += 1;
      } else {
        await tx.calendarBlock.create({ data: { id, ...data } });
        createdCount += 1;
      }
    }
    const status = conflictCount ? createdCount || updatedCount ? "partially_succeeded" : "failed" : "succeeded";
    const completed = await tx.dataExchangeJob.update({
      where: { id: job.id },
      data: {
        status,
        processedCount: events.length,
        createdCount,
        updatedCount,
        skippedCount,
        conflictCount,
        resultSummary: { availabilityOnly: true, conflicts },
        errorMessage: conflictCount ? `${conflictCount} event(s) conflicted with active local availability evidence.` : "",
        completedAt: /* @__PURE__ */ new Date()
      }
    });
    await tx.channelSyncEvent.create({
      data: {
        id: import_node_crypto5.default.randomUUID(),
        hostOrganizationId: connection.hostOrganization.id,
        channelConnectionId: connection.id,
        action: "availability_import",
        status: status === "failed" ? "failed" : "succeeded",
        message: `iCalendar availability import ${status.replaceAll("_", " ")}.`,
        payload: { jobId: job.id, checksum, processedCount: events.length, createdCount, updatedCount, skippedCount, conflictCount },
        attempts: 1,
        occurredAt: /* @__PURE__ */ new Date()
      }
    });
    await enqueueOutboxEvent(tx, {
      hostOrganizationId: connection.hostOrganization.id,
      eventType: "calendar.imported",
      aggregateType: "DataExchangeJob",
      aggregateId: job.id,
      operationKey: idempotencyKey,
      payload: { jobId: job.id, listingId: listing.id, status, processedCount: events.length, createdCount, updatedCount, conflictCount }
    });
    return completed;
  }, { maxWait: 5e3, timeout: 2e4, isolationLevel: "Serializable" });
}
async function exportListingCalendar(_root, args, context) {
  const listing = await context.query.Listing.findOne({ where: { id: args.listingId }, query: "id title hostOrganization { id }" });
  if (!listing?.hostOrganization?.id) throw new Error("Listing not found.");
  await assertHostOrganizationAccess({ context, hostOrganizationId: listing.hostOrganization.id, permission: "canReadChannels" });
  const blocks = await context.prisma.calendarBlock.findMany({
    where: { listingId: listing.id, status: "active" },
    orderBy: [{ startDate: "asc" }, { id: "asc" }],
    select: { id: true, externalUid: true, startDate: true, endDate: true, reason: true },
    take: 1e3
  });
  const calendarText = exportICalendar(blocks.map((block) => ({
    uid: block.externalUid || `commonstay-${listing.id}-${block.id}`,
    startDate: block.startDate,
    endDate: block.endDate,
    summary: block.reason === "property_maintenance" ? "Unavailable - property maintenance" : "Unavailable",
    status: "confirmed"
  })), `${listing.title} availability`);
  return { listingId: listing.id, checksum: iCalendarChecksum(calendarText), eventCount: blocks.length, calendarText };
}

// features/keystone/utils/publicTokenAccess.ts
var import_node_crypto6 = __toESM(require("node:crypto"));
var TOKEN_BYTES = 24;
var TOKEN_LIFETIME_DAYS = 30;
function createPublicOwnershipToken() {
  return import_node_crypto6.default.randomBytes(TOKEN_BYTES).toString("hex");
}
function hashPublicOwnershipToken(token) {
  return import_node_crypto6.default.createHash("sha256").update(token).digest("hex");
}
function publicTokenExpiry(issuedAt = /* @__PURE__ */ new Date()) {
  return new Date(issuedAt.getTime() + TOKEN_LIFETIME_DAYS * 24 * 60 * 60 * 1e3);
}
function isExpired(value, now) {
  if (!value) return true;
  const expiresAt = value instanceof Date ? value : new Date(value);
  return Number.isNaN(expiresAt.getTime()) || expiresAt <= now;
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
  const record = await findRecordByHash(hashPublicOwnershipToken(token));
  const tokenRecord = record;
  if (!record || tokenRecord?.tokenRevokedAt || isExpired(tokenRecord?.tokenExpiresAt, now) || isUnavailable(record)) {
    return null;
  }
  return record;
}

// features/keystone/utils/stayBookingSnapshot.ts
function createStayBookingSnapshot(input) {
  return {
    version: 1,
    capturedAt: (input.capturedAt ?? /* @__PURE__ */ new Date()).toISOString(),
    listing: structuredClone(input.listing),
    guestParty: structuredClone(input.guestParty),
    cancellationPolicy: structuredClone(input.cancellationPolicy),
    quote: structuredClone(input.quote)
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

// features/keystone/utils/stayQuoteAccess.ts
var import_node_crypto7 = __toESM(require("node:crypto"));
var TOKEN_BYTES2 = 24;
var QUOTE_LIFETIME_MINUTES = 30;
var TOKEN_PATTERN = /^[a-f0-9]{48}$/;
function createStayQuoteToken() {
  return import_node_crypto7.default.randomBytes(TOKEN_BYTES2).toString("hex");
}
function hashStayQuoteToken(token) {
  return import_node_crypto7.default.createHash("sha256").update(token).digest("hex");
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

// features/keystone/mutations/createStayReservation.ts
function confirmationCode() {
  return `STAY-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
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
  if (args.invitedGuests != null && !Array.isArray(args.invitedGuests)) throw new Error("Invited guests must be a list.");
  if ((args.invitedGuests?.length || 0) > 15) throw new Error("A stay can include at most 15 invited guests.");
  const invitedGuests = (args.invitedGuests || []).map((guest) => {
    const record = guest && typeof guest === "object" ? guest : null;
    const name = cleanRequired(record?.name, "Invited guest name");
    const email = typeof record?.email === "string" ? record.email.trim().toLowerCase() : "";
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
          listing { id title slug status instantBook accommodationUnit { id maxGuests } }
        `
      });
      return quotes[0] || null;
    }
  });
  if (!quote || quote.listing?.status !== "published" || !quote.hostOrganization?.id || !quote.listing?.id) throw activeQuoteError();
  const tripToken = createPublicOwnershipToken();
  const agreementToken = createPublicOwnershipToken();
  const code = confirmationCode();
  const reservationId = crypto.randomUUID();
  const agreementId = crypto.randomUUID();
  const depositId = quote.securityDepositCents > 0 ? crypto.randomUUID() : null;
  const quoteSnapshot = quote.quoteSnapshot || {};
  const party = {
    primaryGuest: { name: guestName, email: guestEmail, phone: guestPhone },
    adults: quote.adults,
    children: quote.children,
    infants: quote.infants,
    pets: quote.pets,
    invitedGuests: structuredClone(invitedGuests)
  };
  const bookingSnapshot = createStayBookingSnapshot({
    listing: quoteSnapshot.listing || { id: quote.listing.id, title: quote.listing.title, slug: quote.listing.slug },
    guestParty: party,
    cancellationPolicy: quoteSnapshot.cancellationPolicy || {},
    quote: quoteSnapshot.quote || {
      quoteNumber: quote.quoteNumber,
      checkIn: quote.checkInDate,
      checkOut: quote.checkOutDate,
      numberOfNights: 0,
      lodgingSubtotalCents: quote.lodgingSubtotalCents,
      feeTotalCents: quote.feeTotalCents,
      taxTotalCents: quote.taxTotalCents,
      securityDepositCents: quote.securityDepositCents,
      totalAmountCents: quote.totalAmountCents,
      currencyCode: quote.currencyCode,
      nights: [],
      fees: [],
      taxes: []
    }
  });
  const lineInputs = createReservationLineItemsFromQuote(reservationId, bookingSnapshot.quote);
  const now = /* @__PURE__ */ new Date();
  const tokenHash = hashPublicOwnershipToken(args.quoteToken);
  const reservation = await withSerializableRetry(() => context.prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `stay-listing:${quote.listing.id}`);
    const lockedQuote = await tx.stayQuote.findUnique({ where: { id: quote.id } });
    if (!lockedQuote || lockedQuote.tokenHash !== tokenHash || lockedQuote.status !== "active" || lockedQuote.consumedAt || lockedQuote.expiresAt.getTime() <= now.getTime() || lockedQuote.listingId !== quote.listing.id || lockedQuote.hostOrganizationId !== quote.hostOrganization.id) throw activeQuoteError();
    const overlap = await tx.calendarBlock.findFirst({
      where: {
        listingId: quote.listing.id,
        status: "active",
        startDate: { lt: quote.checkOutDate },
        endDate: { gt: quote.checkInDate }
      },
      select: { id: true }
    });
    if (overlap) throw new Error("This stay became unavailable. Request a new quote for different dates.");
    const consumed = await tx.stayQuote.updateMany({
      where: { id: quote.id, tokenHash, status: "active", consumedAt: null },
      data: { status: "consumed", consumedAt: now }
    });
    if (consumed.count !== 1) throw activeQuoteError();
    let guest = await tx.guestProfile.findFirst({
      where: { hostOrganizationId: quote.hostOrganization.id, email: guestEmail }
    });
    if (!guest) {
      guest = await tx.guestProfile.create({
        data: {
          hostOrganizationId: quote.hostOrganization.id,
          name: guestName,
          email: guestEmail,
          phone: guestPhone,
          verificationStatus: "unverified"
        }
      });
    }
    const created = await tx.reservation.create({
      data: {
        id: reservationId,
        hostOrganizationId: quote.hostOrganization.id,
        listingId: quote.listing.id,
        accommodationUnitId: quote.listing.accommodationUnit?.id || null,
        guestId: guest.id,
        quoteId: quote.id,
        confirmationCode: code,
        tripTokenHash: hashPublicOwnershipToken(tripToken),
        tripTokenExpiresAt: tripTokenExpiry(quote.checkOutDate),
        status: quote.listing.instantBook ? "confirmed" : "pending",
        paymentStatus: "unpaid",
        source: "direct",
        checkInDate: quote.checkInDate,
        checkOutDate: quote.checkOutDate,
        currencyCode: quote.currencyCode,
        lodgingSubtotalCents: quote.lodgingSubtotalCents,
        feeTotalCents: quote.feeTotalCents,
        taxTotalCents: quote.taxTotalCents,
        securityDepositCents: quote.securityDepositCents,
        totalAmountCents: quote.totalAmountCents,
        amountPaidCents: 0,
        bookingSnapshot,
        guestNotes
      },
      include: { listing: { select: { id: true, title: true, slug: true } } }
    });
    if (!created?.id) throw retryableTransactionError("Reservation transaction did not commit.");
    const createdParty = await tx.guestParty.create({
      data: {
        hostOrganizationId: quote.hostOrganization.id,
        reservationId,
        primaryGuestId: guest.id,
        adults: quote.adults,
        children: quote.children,
        infants: quote.infants,
        pets: quote.pets,
        invitedGuests
      }
    });
    if (!createdParty?.id) throw retryableTransactionError("Guest party transaction did not commit.");
    if (lineInputs.length) {
      const createdLines = await tx.reservationLineItem.createMany({
        data: lineInputs.map((line) => ({ ...line, hostOrganizationId: quote.hostOrganization.id, reservationId }))
      });
      if (createdLines?.count !== lineInputs.length) throw retryableTransactionError("Reservation line transaction did not commit.");
    }
    const createdBlock = await tx.calendarBlock.create({
      data: {
        hostOrganizationId: quote.hostOrganization.id,
        listingId: quote.listing.id,
        reservationId,
        startDate: quote.checkInDate,
        endDate: quote.checkOutDate,
        reason: "reservation",
        status: "active",
        source: "direct",
        notes: `Direct booking ${code}`
      }
    });
    if (!createdBlock?.id) throw retryableTransactionError("Calendar capacity transaction did not commit.");
    const createdAgreement = await tx.stayAgreement.create({
      data: {
        id: agreementId,
        hostOrganizationId: quote.hostOrganization.id,
        guestId: guest.id,
        cancellationPolicyId: quoteSnapshot.cancellationPolicy?.id || null,
        agreementNumber: `AGR-${code}`,
        signingTokenHash: hashPublicOwnershipToken(agreementToken),
        signingTokenExpiresAt: publicTokenExpiry(),
        status: "sent",
        title: `Stay terms for ${quote.listing.title}`,
        signerEmail: guestEmail,
        termsSnapshot: {
          listing: bookingSnapshot.listing,
          houseRules: bookingSnapshot.listing.houseRules || [],
          cancellationPolicy: bookingSnapshot.cancellationPolicy,
          checkInDate: quote.checkInDate,
          checkOutDate: quote.checkOutDate
        }
      }
    });
    if (!createdAgreement?.id) throw retryableTransactionError("Stay agreement transaction did not commit.");
    if (depositId) {
      const createdDeposit = await tx.securityDeposit.create({
        data: {
          id: depositId,
          hostOrganizationId: quote.hostOrganization.id,
          depositNumber: `DEP-${code}`,
          status: "required",
          amountCents: quote.securityDepositCents,
          currencyCode: quote.currencyCode
        }
      });
      if (!createdDeposit?.id) throw retryableTransactionError("Security deposit transaction did not commit.");
    }
    const linkedReservation = await tx.reservation.update({
      where: { id: reservationId },
      data: { agreementId, securityDepositId: depositId }
    });
    if (!linkedReservation?.id) throw retryableTransactionError("Reservation relationship transaction did not commit.");
    return created;
  }, { maxWait: 5e3, timeout: 15e3, isolationLevel: "Serializable" }));
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
    agreementToken
  };
}

// features/keystone/mutations/initiateStayPayment.ts
async function initiateStayPayment(_root, args, context) {
  const reservation = await context.query.Reservation.findOne({
    where: { id: args.reservationId },
    query: `
      id confirmationCode status totalAmountCents amountPaidCents currencyCode
      hostOrganization { id }
      guest { id name email }
      payments { id amountCents status provider idempotencyKey }
    `
  });
  if (!reservation?.hostOrganization?.id) throw new Error("Reservation not found.");
  await assertHostOrganizationAccess({ context, hostOrganizationId: reservation.hostOrganization.id, permission: "canManagePayments" });
  const outstanding = Math.max((reservation.totalAmountCents || 0) - (reservation.amountPaidCents || 0), 0);
  const amountCents = args.amountCents ?? outstanding;
  if (outstanding <= 0) throw new Error("Reservation does not have an outstanding balance.");
  validateManualPaymentSession({ amount: amountCents, outstanding });
  const providerCode = args.paymentProviderCode || "pp_system_default";
  if (providerCode !== "pp_system_default") {
    throw new Error("Only the manual payment provider is enabled.");
  }
  const idempotencyKey = createManualPaymentIdempotencyKey({
    reservationId: reservation.id,
    amount: amountCents,
    currencyCode: reservation.currencyCode || "USD"
  });
  const existing = reservation.payments?.find((payment) => payment.idempotencyKey === idempotencyKey && ["pending", "processing", "succeeded"].includes(payment.status));
  if (existing) {
    return context.sudo().query.Payment.findOne({
      where: { id: existing.id },
      query: "id amountCents status provider providerPaymentId idempotencyKey data currencyCode"
    });
  }
  const providers = await context.sudo().query.PaymentProvider.findMany({
    where: {
      code: { equals: providerCode },
      hostOrganization: { id: { equals: reservation.hostOrganization.id } }
    },
    take: 1,
    query: "id name code isInstalled"
  });
  const provider = providers[0] || await context.sudo().query.PaymentProvider.createOne({
    data: {
      hostOrganization: { connect: { id: reservation.hostOrganization.id } },
      name: "Manual payment",
      code: providerCode,
      isInstalled: true,
      metadata: { mode: "operator_only", secrets: "environment-only" }
    },
    query: "id name code isInstalled"
  });
  const sessionData = await createPayment({
    provider,
    reservation,
    amount: amountCents,
    currency: (reservation.currencyCode || "USD").toLowerCase()
  });
  return context.prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `payment-init:${idempotencyKey}`);
    const existingPayment = await tx.payment.findUnique({ where: { idempotencyKey } });
    if (existingPayment) return existingPayment;
    return tx.payment.create({
      data: {
        hostOrganizationId: reservation.hostOrganization.id,
        reservationId: reservation.id,
        guestId: reservation.guest?.id || null,
        paymentProviderId: provider.id,
        amountCents,
        currencyCode: reservation.currencyCode || "USD",
        status: "pending",
        paymentMethod: "manual",
        provider: providerCode,
        providerPaymentId: idempotencyKey,
        idempotencyKey,
        data: { ...sessionData.data || sessionData, idempotencyKey, scope: "manual-only" }
      }
    });
  }, { maxWait: 5e3, timeout: 1e4, isolationLevel: "ReadCommitted" });
}

// features/keystone/mutations/hostReporting.ts
var import_node_crypto8 = __toESM(require("node:crypto"));

// features/keystone/utils/stayPricing.ts
var DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
var DAY_MS = 24 * 60 * 60 * 1e3;
function parseDateOnly(value, label) {
  if (!DATE_ONLY.test(value)) {
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
function enumerateStayNights(checkIn, checkOut) {
  const start = parseDateOnly(checkIn, "Check-in");
  const end = parseDateOnly(checkOut, "Check-out");
  if (end.getTime() <= start.getTime()) {
    throw new Error("Check-out must be after check-in.");
  }
  const nights = [];
  for (let timestamp22 = start.getTime(); timestamp22 < end.getTime(); timestamp22 += DAY_MS) {
    nights.push(new Date(timestamp22).toISOString().slice(0, 10));
  }
  return nights;
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
function dateRangesOverlap(startA, endA, startB, endB) {
  const aStart = parseDateOnly(startA, "Range A start").getTime();
  const aEnd = parseDateOnly(endA, "Range A end").getTime();
  const bStart = parseDateOnly(startB, "Range B start").getTime();
  const bEnd = parseDateOnly(endB, "Range B end").getTime();
  if (aEnd <= aStart || bEnd <= bStart) throw new Error("Date ranges must have an end after their start.");
  return aStart < bEnd && bStart < aEnd;
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
  const amountCents = selected.nightlyRateCents == null ? baseNightlyRateCents + basisPointAmount(baseNightlyRateCents, selected.adjustmentBasisPoints ?? 0) : selected.nightlyRateCents;
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
  const nightDates = enumerateStayNights(input.checkIn, input.checkOut);
  const seasonalRates = input.seasonalRates ?? [];
  const nights = nightDates.map((date) => ({ date, ...rateForNight(date, input.baseNightlyRateCents, seasonalRates) }));
  const minimumStay = Math.max(
    input.baseMinimumStay ?? 1,
    ...nights.map((night) => night.minimumStay)
  );
  if (nightDates.length < minimumStay) {
    throw new Error(`This listing requires a minimum stay of ${minimumStay} nights for the selected dates.`);
  }
  const lodgingSubtotalCents = nights.reduce((sum, night) => sum + night.amountCents, 0);
  const fees = (input.fees ?? []).map((fee) => {
    const amountCents = (() => {
      switch (fee.kind) {
        case "fixed":
          return fee.amountCents ?? 0;
        case "per_night":
          return (fee.amountCents ?? 0) * nightDates.length;
        case "per_guest":
          return (fee.amountCents ?? 0) * input.guestCount;
        case "percentage":
          return basisPointAmount(lodgingSubtotalCents, fee.percentageBasisPoints ?? 0);
      }
    })();
    assertNonNegativeInteger(amountCents, `${fee.name} fee`);
    return { name: fee.name, feeType: fee.feeType, kind: fee.kind, amountCents, taxable: fee.taxable ?? true };
  });
  const feeTotalCents = fees.reduce((sum, fee) => sum + fee.amountCents, 0);
  const taxableSubtotalCents = lodgingSubtotalCents + fees.filter((fee) => fee.taxable).reduce((sum, fee) => sum + fee.amountCents, 0);
  const taxes = (input.taxes ?? []).map((tax) => ({
    name: tax.name,
    rateBasisPoints: tax.rateBasisPoints,
    amountCents: basisPointAmount(taxableSubtotalCents, tax.rateBasisPoints)
  }));
  const taxTotalCents = taxes.reduce((sum, tax) => sum + tax.amountCents, 0);
  return {
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    currencyCode: input.currencyCode ?? "USD",
    numberOfNights: nightDates.length,
    minimumStay,
    guestCount: input.guestCount,
    nights,
    lodgingSubtotalCents,
    fees,
    feeTotalCents,
    taxableSubtotalCents,
    taxes,
    taxTotalCents,
    securityDepositCents: input.securityDepositCents ?? 0,
    totalAmountCents: lodgingSubtotalCents + feeTotalCents + taxTotalCents
  };
}

// features/keystone/mutations/hostReporting.ts
function validateRange(start, end) {
  const nights = enumerateStayNights(start, end);
  if (nights.length > 366) throw new Error("Report ranges are limited to 366 nights.");
  return nights;
}
function clippedNights(start, end, rangeStart, rangeEnd) {
  const clippedStart = start > rangeStart ? start : rangeStart;
  const clippedEnd = end < rangeEnd ? end : rangeEnd;
  return clippedStart < clippedEnd ? enumerateStayNights(clippedStart, clippedEnd).length : 0;
}
async function hostOperationsReport(_root, args, context) {
  const nights = validateRange(args.startDate, args.endDate);
  await assertHostOrganizationAccess({ context, hostOrganizationId: args.hostOrganizationId, permission: "canReadReports" });
  const prisma = context.prisma;
  const [listings, reservations, blocks, payments, refunds, payouts, statements, tasks, syncEvents] = await Promise.all([
    prisma.listing.findMany({ where: { hostOrganizationId: args.hostOrganizationId, status: "published" }, select: { id: true } }),
    prisma.reservation.findMany({
      where: { hostOrganizationId: args.hostOrganizationId, checkInDate: { lt: args.endDate }, checkOutDate: { gt: args.startDate } },
      select: { id: true, status: true, source: true, checkInDate: true, checkOutDate: true, lodgingSubtotalCents: true, feeTotalCents: true, taxTotalCents: true, totalAmountCents: true, amountPaidCents: true },
      take: 5e3
    }),
    prisma.calendarBlock.findMany({ where: { hostOrganizationId: args.hostOrganizationId, status: "active", startDate: { lt: args.endDate }, endDate: { gt: args.startDate } }, select: { listingId: true, startDate: true, endDate: true }, take: 1e4 }),
    prisma.payment.findMany({ where: { hostOrganizationId: args.hostOrganizationId, reservation: { checkInDate: { lt: args.endDate }, checkOutDate: { gt: args.startDate } }, status: "succeeded" }, select: { amountCents: true, refundedAmountCents: true }, take: 1e4 }),
    prisma.refund.findMany({ where: { hostOrganizationId: args.hostOrganizationId, reservation: { checkInDate: { lt: args.endDate }, checkOutDate: { gt: args.startDate } }, status: "succeeded" }, select: { amountCents: true }, take: 1e4 }),
    prisma.payout.findMany({ where: { hostOrganizationId: args.hostOrganizationId, status: "paid", paidAt: { gte: /* @__PURE__ */ new Date(`${args.startDate}T00:00:00.000Z`), lt: /* @__PURE__ */ new Date(`${args.endDate}T00:00:00.000Z`) } }, select: { netAmountCents: true }, take: 1e4 }),
    prisma.ownerStatement.findMany({ where: { hostOrganizationId: args.hostOrganizationId, status: { in: ["approved", "sent", "paid"] }, periodStart: { lt: args.endDate }, periodEnd: { gt: args.startDate } }, select: { ownerEarningsCents: true }, take: 1e4 }),
    prisma.propertyTask.findMany({ where: { hostOrganizationId: args.hostOrganizationId, dueAt: { lt: /* @__PURE__ */ new Date(`${args.endDate}T00:00:00.000Z`) } }, select: { status: true, dueAt: true }, take: 1e4 }),
    prisma.channelSyncEvent.findMany({ where: { hostOrganizationId: args.hostOrganizationId, occurredAt: { gte: /* @__PURE__ */ new Date(`${args.startDate}T00:00:00.000Z`), lt: /* @__PURE__ */ new Date(`${args.endDate}T00:00:00.000Z`) } }, select: { status: true, occurredAt: true }, orderBy: { occurredAt: "desc" }, take: 1e3 })
  ]);
  const activeReservations = reservations.filter((reservation) => !["cancelled", "no_show", "inquiry", "quoted"].includes(reservation.status));
  const bookedNights = activeReservations.reduce((sum, reservation) => sum + clippedNights(reservation.checkInDate, reservation.checkOutDate, args.startDate, args.endDate), 0);
  const blockedNights = blocks.reduce((sum, block) => sum + clippedNights(block.startDate, block.endDate, args.startDate, args.endDate), 0);
  const capacityNights = listings.length * nights.length;
  const availableNights = Math.max(capacityNights - blockedNights, 0);
  const lodgingRevenueCents = activeReservations.reduce((sum, item) => sum + item.lodgingSubtotalCents, 0);
  const collectedCents = payments.reduce((sum, item) => sum + item.amountCents - item.refundedAmountCents, 0);
  const refundCents = refunds.reduce((sum, item) => sum + item.amountCents, 0);
  const now = /* @__PURE__ */ new Date();
  const countsBy = (field) => Object.fromEntries([...new Set(reservations.map((item) => item[field]))].sort().map((value) => [value, reservations.filter((item) => item[field] === value).length]));
  return {
    hostOrganizationId: args.hostOrganizationId,
    startDate: args.startDate,
    endDate: args.endDate,
    publishedListingCount: listings.length,
    capacityNights,
    bookedNights,
    availableNights,
    occupancyBasisPoints: capacityNights ? Math.round(bookedNights * 1e4 / capacityNights) : 0,
    adrCents: bookedNights ? Math.round(lodgingRevenueCents / bookedNights) : 0,
    lodgingRevenueCents,
    feeRevenueCents: activeReservations.reduce((sum, item) => sum + item.feeTotalCents, 0),
    taxCents: activeReservations.reduce((sum, item) => sum + item.taxTotalCents, 0),
    refundCents,
    collectedCents,
    outstandingCents: activeReservations.reduce((sum, item) => sum + Math.max(item.totalAmountCents - item.amountPaidCents, 0), 0),
    payoutCents: payouts.reduce((sum, item) => sum + item.netAmountCents, 0),
    ownerNetCents: statements.reduce((sum, item) => sum + item.ownerEarningsCents, 0),
    reservationsByStatus: countsBy("status"),
    reservationsBySource: countsBy("source"),
    openTaskCount: tasks.filter((task) => !["completed", "cancelled"].includes(task.status)).length,
    overdueTaskCount: tasks.filter((task) => !["completed", "cancelled"].includes(task.status) && task.dueAt && task.dueAt < now).length,
    channelSyncFailureCount: syncEvents.filter((event) => event.status === "failed").length,
    lastSuccessfulSyncAt: syncEvents.find((event) => event.status === "succeeded")?.occurredAt?.toISOString() || null
  };
}
async function exportHostArchive(_root, args, context) {
  await assertHostOrganizationAccess({ context, hostOrganizationId: args.hostOrganizationId, permission: "canManageReports" });
  const prisma = context.prisma;
  const [host, properties, listings, guests, reservations, owners, statements, tasks] = await Promise.all([
    prisma.hostOrganization.findUnique({ where: { id: args.hostOrganizationId }, select: { id: true, name: true, slug: true, organizationType: true, canonicalUrl: true, federationId: true, dataCustody: true } }),
    prisma.property.findMany({ where: { hostOrganizationId: args.hostOrganizationId }, select: { id: true, name: true, propertyType: true, status: true, timezone: true, checkInFrom: true, checkOutBy: true }, orderBy: { id: "asc" }, take: 5e3 }),
    prisma.listing.findMany({ where: { hostOrganizationId: args.hostOrganizationId }, select: { id: true, propertyId: true, title: true, slug: true, status: true, currencyCode: true, baseNightlyRateCents: true, minimumStay: true, maximumStay: true }, orderBy: { id: "asc" }, take: 5e3 }),
    prisma.guestProfile.findMany({ where: { hostOrganizationId: args.hostOrganizationId }, select: { id: true, name: true, email: true, phone: true, verificationStatus: true }, orderBy: { id: "asc" }, take: 1e4 }),
    prisma.reservation.findMany({ where: { hostOrganizationId: args.hostOrganizationId }, select: { id: true, listingId: true, guestId: true, confirmationCode: true, status: true, paymentStatus: true, source: true, checkInDate: true, checkOutDate: true, currencyCode: true, totalAmountCents: true, amountPaidCents: true, bookingSnapshot: true }, orderBy: { id: "asc" }, take: 1e4 }),
    prisma.propertyOwner.findMany({ where: { hostOrganizationId: args.hostOrganizationId }, select: { id: true, ownerNumber: true, displayName: true, companyName: true, email: true, status: true, payoutSchedule: true }, orderBy: { id: "asc" }, take: 5e3 }),
    prisma.ownerStatement.findMany({ where: { hostOrganizationId: args.hostOrganizationId }, select: { id: true, ownerId: true, statementNumber: true, status: true, periodStart: true, periodEnd: true, currencyCode: true, ownerEarningsCents: true, paidOutCents: true, balanceDueCents: true, statementSnapshot: true }, orderBy: { id: "asc" }, take: 1e4 }),
    prisma.propertyTask.findMany({ where: { hostOrganizationId: args.hostOrganizationId }, select: { id: true, propertyId: true, listingId: true, reservationId: true, title: true, taskType: true, status: true, priority: true, dueAt: true, completionEvidence: true }, orderBy: { id: "asc" }, take: 1e4 })
  ]);
  if (!host) throw new Error("Host organization not found.");
  const archive = { version: 1, exportedAt: (/* @__PURE__ */ new Date()).toISOString(), host, properties, listings, guests, reservations, owners, statements, tasks };
  const serialized = JSON.stringify(archive);
  const checksum = import_node_crypto8.default.createHash("sha256").update(serialized).digest("hex");
  const idempotencyKey = `host-archive:${args.hostOrganizationId}:${checksum}`;
  const job = await context.prisma.$transaction(async (tx) => {
    const record = await tx.dataExchangeJob.upsert({
      where: { idempotencyKey },
      update: {},
      create: { id: import_node_crypto8.default.randomUUID(), hostOrganizationId: args.hostOrganizationId, direction: "export", domain: "host_archive", format: "json", status: "succeeded", idempotencyKey, payloadSha256: checksum, sourceLabel: "Versioned host-owned JSON archive", processedCount: properties.length + listings.length + guests.length + reservations.length + owners.length + statements.length + tasks.length, resultSummary: { version: 1, includesExactPrivateAddresses: false, includesCredentials: false }, startedAt: /* @__PURE__ */ new Date(), completedAt: /* @__PURE__ */ new Date() }
    });
    await enqueueOutboxEvent(tx, { hostOrganizationId: args.hostOrganizationId, eventType: "host_archive.exported", aggregateType: "DataExchangeJob", aggregateId: record.id, operationKey: idempotencyKey, payload: { jobId: record.id, checksum, version: 1 } });
    return record;
  });
  return { jobId: job.id, checksum, archive };
}

// features/keystone/mutations/ownerStatements.ts
var import_node_crypto10 = __toESM(require("node:crypto"));

// features/keystone/utils/ownerStatementAccounting.ts
var import_node_crypto9 = __toESM(require("node:crypto"));
function dateOnly2(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} must be a date-only value.`);
  return value;
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
  currencyCode
}) {
  const canonical = [ownerId.trim(), dateOnly2(periodStart, "Period start"), dateOnly2(periodEnd, "Period end"), currencyCode.trim().toUpperCase()].join("|");
  return `owner-statement:${import_node_crypto9.default.createHash("sha256").update(canonical).digest("hex")}`;
}
function buildOwnerStatement({
  ownerId,
  propertyAssignments,
  periodStart,
  periodEnd,
  currencyCode,
  reservations,
  refunds,
  payouts,
  adjustments
}) {
  const start = dateOnly2(periodStart, "Period start");
  const end = dateOnly2(periodEnd, "Period end");
  if (start >= end) throw new Error("Statement period end must be after its start.");
  if (!ownerId?.trim()) throw new Error("Property owner is required.");
  if (!propertyAssignments.length) throw new Error("At least one active owner property assignment is required.");
  const assignments = /* @__PURE__ */ new Map();
  for (const assignment of propertyAssignments) {
    if (!assignment.propertyId?.trim()) throw new Error("Owner assignment property is required.");
    if (assignments.has(assignment.propertyId)) throw new Error("Only one active assignment per owner property is allowed for a statement period.");
    basisPoints(assignment.ownershipBasisPoints, "Ownership", 1);
    basisPoints(assignment.managerCommissionBasisPoints, "Manager commission");
    assignments.set(assignment.propertyId, assignment);
  }
  const currency = currencyCode.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Statement currency is invalid.");
  const includedReservations = reservations.filter((reservation) => assignments.has(reservation.propertyId)).filter((reservation) => reservation.checkOutDate >= start && reservation.checkOutDate < end).filter((reservation) => !["cancelled", "no_show", "inquiry", "quoted"].includes(reservation.status)).sort((a, b) => a.checkOutDate.localeCompare(b.checkOutDate) || a.id.localeCompare(b.id));
  for (const reservation of includedReservations) {
    if (reservation.currencyCode.toUpperCase() !== currency) throw new Error("Reservation currency does not match the owner statement currency.");
  }
  const reservationById = new Map(includedReservations.map((reservation) => [reservation.id, reservation]));
  const successfulRefunds = refunds.filter((refund) => refund.status === "succeeded" && reservationById.has(refund.reservationId)).sort((a, b) => a.id.localeCompare(b.id));
  const paidPayouts = payouts.filter((payout) => payout.ownerId === ownerId && payout.status === "paid" && Boolean(payout.paidAt)).filter((payout) => payout.paidAt.slice(0, 10) >= start && payout.paidAt.slice(0, 10) < end).sort((a, b) => (a.paidAt || "").localeCompare(b.paidAt || "") || a.id.localeCompare(b.id));
  const orderedAdjustments = adjustments.filter((adjustment) => adjustment.ownerId === ownerId).filter((adjustment) => !adjustment.propertyId || assignments.has(adjustment.propertyId)).sort((a, b) => a.id.localeCompare(b.id));
  const reservationAmounts = new Map(includedReservations.map((reservation) => {
    const assignment = assignments.get(reservation.propertyId);
    const gross = reservation.lodgingSubtotalCents + reservation.feeTotalCents - reservation.discountTotalCents;
    return [reservation.id, {
      grossCents: prorate(gross, assignment.ownershipBasisPoints),
      taxCents: prorate(reservation.taxTotalCents, assignment.ownershipBasisPoints),
      ownershipBasisPoints: assignment.ownershipBasisPoints,
      managerCommissionBasisPoints: assignment.managerCommissionBasisPoints
    }];
  }));
  const refundAmounts = /* @__PURE__ */ new Map();
  const refundsByReservation = /* @__PURE__ */ new Map();
  for (const refund of successfulRefunds) {
    const reservation = reservationById.get(refund.reservationId);
    const assignment = assignments.get(reservation.propertyId);
    const ownerRefundCents = prorate(refund.amountCents, assignment.ownershipBasisPoints);
    refundAmounts.set(refund.id, ownerRefundCents);
    refundsByReservation.set(refund.reservationId, (refundsByReservation.get(refund.reservationId) || 0) + ownerRefundCents);
  }
  const grossRevenueCents = [...reservationAmounts.values()].reduce((sum, value) => sum + value.grossCents, 0);
  const taxAmountCents = [...reservationAmounts.values()].reduce((sum, value) => sum + value.taxCents, 0);
  const refundAmountCents = [...refundsByReservation.values()].reduce((sum, value) => sum + value, 0);
  const expenseAmountCents = orderedAdjustments.filter((item) => item.type === "expense").reduce((sum, item) => sum + cents(item.amountCents, "Expense amount"), 0);
  const adjustmentAmountCents = orderedAdjustments.filter((item) => item.type === "adjustment").reduce((sum, item) => sum + cents(item.amountCents, "Adjustment amount"), 0);
  const managerCommissionCents = includedReservations.reduce((sum, reservation) => {
    const amounts = reservationAmounts.get(reservation.id);
    const commissionable = Math.max(amounts.grossCents - (refundsByReservation.get(reservation.id) || 0), 0);
    return sum + prorate(commissionable, amounts.managerCommissionBasisPoints);
  }, 0);
  const ownerEarningsCents = grossRevenueCents - refundAmountCents - expenseAmountCents + adjustmentAmountCents - managerCommissionCents;
  const paidOutCents = paidPayouts.reduce((sum, payout) => sum + cents(payout.amountCents, "Payout amount"), 0);
  const balanceDueCents = ownerEarningsCents - paidOutCents;
  const lines = [
    ...includedReservations.map((reservation) => {
      const amounts = reservationAmounts.get(reservation.id);
      return {
        lineKey: `reservation:${reservation.id}`,
        lineType: "reservation_revenue",
        description: `${reservation.confirmationCode} accommodation revenue`,
        amountCents: amounts.grossCents,
        reservationId: reservation.id,
        sourceId: reservation.id,
        serviceDate: reservation.checkOutDate,
        metadata: { source: reservation.source, taxAmountCents: amounts.taxCents, ownershipBasisPoints: amounts.ownershipBasisPoints, totalAmountCents: reservation.totalAmountCents }
      };
    }),
    ...successfulRefunds.map((refund) => ({
      lineKey: `refund:${refund.id}`,
      lineType: "refund",
      description: `Refund for ${refund.reservationId}`,
      amountCents: -(refundAmounts.get(refund.id) || 0),
      reservationId: refund.reservationId,
      sourceId: refund.id
    })),
    ...orderedAdjustments.map((adjustment) => ({
      lineKey: `${adjustment.type}:${adjustment.id}`,
      lineType: adjustment.type,
      description: adjustment.description,
      amountCents: adjustment.type === "expense" ? -adjustment.amountCents : adjustment.amountCents,
      sourceId: adjustment.id
    })),
    ...managerCommissionCents ? [{
      lineKey: `manager-commission:${start}:${end}`,
      lineType: "manager_commission",
      description: "Property-management commission",
      amountCents: -managerCommissionCents
    }] : [],
    ...paidPayouts.map((payout) => ({
      lineKey: `payout:${payout.id}`,
      lineType: "payout",
      description: `Owner payout ${payout.id}`,
      amountCents: -payout.amountCents,
      sourceId: payout.id,
      serviceDate: payout.paidAt?.slice(0, 10)
    }))
  ];
  return {
    ownerId,
    propertyIds: [...assignments.keys()].sort(),
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
    reservationIds: includedReservations.map((reservation) => reservation.id),
    lines
  };
}

// features/keystone/mutations/ownerStatements.ts
function statementNumber(ownerNumber, periodEnd, key) {
  return `OST-${periodEnd.replaceAll("-", "")}-${ownerNumber.replace(/[^A-Z0-9]/gi, "").toUpperCase()}-${key.slice(-6).toUpperCase()}`;
}
async function generateOwnerStatement(_root, args, context) {
  const owner = await context.query.PropertyOwner.findOne({
    where: { id: args.ownerId },
    query: "id ownerNumber hostOrganization { id }"
  });
  if (!owner?.hostOrganization?.id) throw new Error("Property owner not found.");
  await assertHostOrganizationAccess({ context, hostOrganizationId: owner.hostOrganization.id, permission: "canManagePayouts" });
  const currencyCode = (args.currencyCode || "USD").trim().toUpperCase();
  const idempotencyKey = ownerStatementIdempotencyKey({ ownerId: owner.id, periodStart: args.periodStart, periodEnd: args.periodEnd, currencyCode });
  return context.prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", idempotencyKey);
    const existing = await tx.ownerStatement.findUnique({ where: { idempotencyKey } });
    if (existing) return existing;
    const assignments = await tx.propertyOwnerAssignment.findMany({
      where: {
        ownerId: owner.id,
        hostOrganizationId: owner.hostOrganization.id,
        status: "active",
        effectiveFrom: { lt: args.periodEnd },
        OR: [{ effectiveTo: "" }, { effectiveTo: { gte: args.periodStart } }]
      },
      select: { propertyId: true, ownershipBasisPoints: true, managerCommissionBasisPoints: true }
    });
    if (!assignments.length) throw new Error("No active owner assignments overlap this statement period.");
    const propertyIds = assignments.map((assignment) => assignment.propertyId).filter(Boolean);
    const reservations = await tx.reservation.findMany({
      where: {
        hostOrganizationId: owner.hostOrganization.id,
        listing: { propertyId: { in: propertyIds } },
        checkOutDate: { gte: args.periodStart, lt: args.periodEnd }
      },
      select: {
        id: true,
        confirmationCode: true,
        status: true,
        source: true,
        checkOutDate: true,
        currencyCode: true,
        lodgingSubtotalCents: true,
        feeTotalCents: true,
        taxTotalCents: true,
        discountTotalCents: true,
        totalAmountCents: true,
        listing: { select: { propertyId: true } }
      }
    });
    const reservationIds = reservations.map((reservation) => reservation.id);
    const [refunds, payouts] = await Promise.all([
      tx.refund.findMany({
        where: { hostOrganizationId: owner.hostOrganization.id, reservationId: { in: reservationIds } },
        select: { id: true, reservationId: true, status: true, amountCents: true }
      }),
      tx.payout.findMany({
        where: { hostOrganizationId: owner.hostOrganization.id, propertyOwnerId: owner.id },
        select: { id: true, status: true, netAmountCents: true, paidAt: true }
      })
    ]);
    const calculation = buildOwnerStatement({
      ownerId: owner.id,
      propertyAssignments: assignments.map((assignment) => ({
        propertyId: assignment.propertyId,
        ownershipBasisPoints: assignment.ownershipBasisPoints,
        managerCommissionBasisPoints: assignment.managerCommissionBasisPoints
      })),
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      currencyCode,
      reservations: reservations.map((reservation) => ({ ...reservation, propertyId: reservation.listing.propertyId })),
      refunds,
      payouts: payouts.map((payout) => ({ id: payout.id, ownerId: owner.id, status: payout.status, amountCents: payout.netAmountCents, paidAt: payout.paidAt?.toISOString() })),
      adjustments: []
    });
    const id = import_node_crypto10.default.randomUUID();
    const number = statementNumber(owner.ownerNumber, args.periodEnd, idempotencyKey);
    const created = await tx.ownerStatement.create({
      data: {
        id,
        hostOrganizationId: owner.hostOrganization.id,
        ownerId: owner.id,
        statementNumber: number,
        idempotencyKey,
        status: "draft",
        periodStart: args.periodStart,
        periodEnd: args.periodEnd,
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
        statementSnapshot: { version: 1, generatedAt: (/* @__PURE__ */ new Date()).toISOString(), calculation }
      }
    });
    if (calculation.lines.length) {
      await tx.ownerStatementLine.createMany({
        data: calculation.lines.map((line) => ({
          id: import_node_crypto10.default.randomUUID(),
          hostOrganizationId: owner.hostOrganization.id,
          statementId: id,
          ownerId: owner.id,
          reservationId: line.reservationId || null,
          refundId: line.lineType === "refund" ? line.sourceId || null : null,
          payoutId: line.lineType === "payout" ? line.sourceId || null : null,
          lineKey: `${id}:${line.lineKey}`,
          lineType: line.lineType,
          description: line.description,
          serviceDate: line.serviceDate || "",
          amountCents: line.amountCents,
          sourceId: line.sourceId || "",
          metadata: line.metadata || {}
        }))
      });
    }
    await enqueueOutboxEvent(tx, {
      hostOrganizationId: owner.hostOrganization.id,
      eventType: "owner_statement.generated",
      aggregateType: "OwnerStatement",
      aggregateId: id,
      operationKey: idempotencyKey,
      payload: { statementId: id, ownerId: owner.id, periodStart: args.periodStart, periodEnd: args.periodEnd, currencyCode }
    });
    return created;
  }, { maxWait: 5e3, timeout: 15e3, isolationLevel: "Serializable" });
}
var statementTransitions = {
  approve: { from: ["draft"], to: "approved" },
  send: { from: ["approved"], to: "sent" },
  pay: { from: ["sent"], to: "paid" },
  void: { from: ["draft", "approved"], to: "voided" }
};
async function transitionOwnerStatement(_root, args, context) {
  const statement = await context.query.OwnerStatement.findOne({
    where: { id: args.statementId },
    query: "id status hostOrganization { id }"
  });
  if (!statement?.hostOrganization?.id) throw new Error("Owner statement not found.");
  await assertHostOrganizationAccess({ context, hostOrganizationId: statement.hostOrganization.id, permission: "canManagePayouts" });
  const transition = statementTransitions[args.transition];
  if (!transition) throw new Error("Unsupported owner statement transition.");
  const reference = args.reference?.trim() || "";
  if (args.transition === "pay" && !reference) throw new Error("A payment reference is required.");
  if (reference.length > 500) throw new Error("Statement reference is too long.");
  return context.prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `owner-statement:${statement.id}`);
    const locked = await tx.ownerStatement.findUnique({ where: { id: statement.id } });
    if (!locked) throw new Error("Owner statement not found.");
    if (!transition.from.includes(locked.status)) throw new Error(`Cannot ${args.transition} a ${locked.status} statement.`);
    const now = /* @__PURE__ */ new Date();
    const data = { status: transition.to };
    if (args.transition === "approve") {
      data.approvedAt = now;
      data.statementSnapshot = { ...locked.statementSnapshot, approvedAt: now.toISOString() };
    }
    if (args.transition === "send") data.sentAt = now;
    if (args.transition === "pay") {
      data.paidAt = now;
      data.paidReference = reference;
    }
    const updated = await tx.ownerStatement.update({ where: { id: locked.id }, data });
    await enqueueOutboxEvent(tx, {
      hostOrganizationId: statement.hostOrganization.id,
      eventType: `owner_statement.${transition.to}`,
      aggregateType: "OwnerStatement",
      aggregateId: locked.id,
      operationKey: `${args.transition}:${now.toISOString()}`,
      payload: { statementId: locked.id, status: transition.to, ...reference ? { reference } : {} }
    });
    return updated;
  }, { maxWait: 5e3, timeout: 1e4, isolationLevel: "ReadCommitted" });
}

// features/keystone/mutations/propertyTasks.ts
var import_node_crypto12 = __toESM(require("node:crypto"));

// features/keystone/utils/propertyTaskLifecycle.ts
var import_node_crypto11 = __toESM(require("node:crypto"));
function propertyTaskRuleKey(ruleId, reservationId) {
  const digest = import_node_crypto11.default.createHash("sha256").update(`${ruleId.trim()}|${reservationId.trim()}`).digest("hex");
  return `property-task:${digest}`;
}
function boundedNotes(notes) {
  const value = notes?.trim() || "";
  if (value.length > 4e3) throw new Error("Task completion notes are too long.");
  return value;
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
      const completionEvidence = transition.completionEvidence ? structuredClone(transition.completionEvidence) : void 0;
      if (!completionNotes && (!completionEvidence || Object.keys(completionEvidence).length === 0)) {
        throw new Error("Task completion requires notes or checklist evidence.");
      }
      if (completionEvidence && JSON.stringify(completionEvidence).length > 16e3) {
        throw new Error("Task completion evidence is too large.");
      }
      return {
        status: "completed",
        completedAt: now,
        ...completionNotes ? { completionNotes } : {},
        ...completionEvidence ? { completionEvidence } : {}
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

// features/keystone/mutations/propertyTasks.ts
async function createPropertyTask(_root, args, context) {
  const property = await context.query.Property.findOne({ where: { id: args.propertyId }, query: "id hostOrganization { id }" });
  if (!property?.hostOrganization?.id) throw new Error("Property not found.");
  await assertHostOrganizationAccess({ context, hostOrganizationId: property.hostOrganization.id, permission: "canManageProperties" });
  const title = args.title.trim();
  if (!title || title.length > 240) throw new Error("Task title is required and must be at most 240 characters.");
  const notes = args.notes?.trim() || "";
  if (notes.length > 4e3) throw new Error("Task notes are too long.");
  const dueAt = args.dueAt ? new Date(args.dueAt) : null;
  if (dueAt && Number.isNaN(dueAt.getTime())) throw new Error("Task due date is invalid.");
  const id = import_node_crypto12.default.randomUUID();
  return context.prisma.$transaction(async (tx) => {
    if (args.listingId) {
      const listing = await tx.listing.findFirst({ where: { id: args.listingId, propertyId: property.id, hostOrganizationId: property.hostOrganization.id }, select: { id: true } });
      if (!listing) throw new Error("Task listing must belong to the selected property and host organization.");
    }
    if (args.reservationId) {
      const reservation = await tx.reservation.findFirst({ where: { id: args.reservationId, hostOrganizationId: property.hostOrganization.id }, select: { id: true, listing: { select: { propertyId: true } } } });
      if (!reservation || reservation.listing?.propertyId !== property.id) throw new Error("Task reservation must belong to the selected property and host organization.");
    }
    if (args.assigneeId) {
      const membership = await tx.hostMembership.findFirst({ where: { hostOrganizationId: property.hostOrganization.id, userId: args.assigneeId, status: "active" }, select: { id: true } });
      if (!membership) throw new Error("Task assignee must be an active member of the host organization.");
    }
    const created = await tx.propertyTask.create({
      data: {
        id,
        hostOrganizationId: property.hostOrganization.id,
        propertyId: property.id,
        listingId: args.listingId || null,
        reservationId: args.reservationId || null,
        assigneeId: args.assigneeId || null,
        idempotencyKey: `manual-property-task:${id}`,
        source: "manual",
        title,
        taskType: args.taskType,
        status: args.assigneeId ? "assigned" : "queued",
        priority: args.priority || "normal",
        dueAt,
        claimedAt: args.assigneeId ? /* @__PURE__ */ new Date() : null,
        checklist: [],
        notes
      }
    });
    await enqueueOutboxEvent(tx, {
      hostOrganizationId: property.hostOrganization.id,
      eventType: "property_task.created",
      aggregateType: "PropertyTask",
      aggregateId: id,
      operationKey: `create:${id}`,
      payload: { taskId: id, propertyId: property.id, status: created.status, taskType: created.taskType }
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
    if (args.action === "assign") {
      const assigneeId = args.assigneeId?.trim() || "";
      const membership = await tx.hostMembership.findFirst({ where: { hostOrganizationId: task.hostOrganization.id, userId: assigneeId, status: "active" }, select: { id: true } });
      if (!membership) throw new Error("Task assignee must be an active member of the host organization.");
    }
    const transition = args.action === "assign" ? { action: "assign", assigneeId: args.assigneeId || "" } : args.action === "complete" ? { action: "complete", completionNotes: args.completionNotes || void 0, completionEvidence: args.completionEvidence || void 0 } : args.action === "block" ? { action: "block", completionNotes: args.completionNotes || "" } : args.action === "cancel" ? { action: "cancel", completionNotes: args.completionNotes || void 0 } : args.action === "start" ? { action: "start" } : args.action === "reopen" ? { action: "reopen" } : null;
    if (!transition) throw new Error("Unsupported property task transition.");
    const now = /* @__PURE__ */ new Date();
    const data = applyPropertyTaskTransition({ status: locked.status, assigneeId: locked.assigneeId }, transition, now);
    const updated = await tx.propertyTask.update({ where: { id: locked.id }, data });
    await enqueueOutboxEvent(tx, {
      hostOrganizationId: task.hostOrganization.id,
      eventType: `property_task.${updated.status}`,
      aggregateType: "PropertyTask",
      aggregateId: locked.id,
      operationKey: `${args.action}:${now.toISOString()}`,
      payload: { taskId: locked.id, status: updated.status, propertyId: locked.propertyId, reservationId: locked.reservationId }
    });
    return updated;
  }, { maxWait: 5e3, timeout: 1e4, isolationLevel: "ReadCommitted" });
}

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
  hostOrganization { id name slug publicBio }
  property {
    id
    name
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
function coarseCoordinate(value) {
  return typeof value === "number" ? Math.round(value * 1e3) / 1e3 : null;
}
function mediaUrl(media) {
  return media?.image?.url || media?.imagePath || null;
}
function toPublicListing(listing) {
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
    accommodation: listing.accommodationUnit,
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
    ratePlans: listing.ratePlans || [],
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

// features/keystone/mutations/publicListing.ts
async function publicListing(_root, args, context) {
  const slug = args.slug?.trim();
  if (!slug) throw new Error("Listing slug is required.");
  const listings = await context.sudo().query.Listing.findMany({
    where: {
      slug: { equals: slug },
      status: { equals: "published" }
    },
    take: 1,
    query: STAY_LISTING_SELECTION
  });
  return listings[0] ? toPublicListing(listings[0]) : null;
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
  "currencyCode",
  "locale",
  "timezone",
  "defaultMapLatitude",
  "defaultMapLongitude",
  "accentHue",
  "isPublished"
].join(" ");
async function publicMarketplaceSettings(_root, _args, context) {
  const settings = await context.sudo().query.MarketplaceSettings.findOne({
    where: { id: "1" },
    query: PUBLIC_SETTINGS_PROJECTION
  });
  if (!settings) return { status: "unconfigured" };
  if (!settings.isPublished) return { status: "unpublished" };
  return {
    status: "published",
    id: settings.id,
    name: settings.name,
    tagline: settings.tagline,
    homepageHeadline: settings.homepageHeadline,
    publicDescription: settings.publicDescription,
    supportEmail: settings.supportEmail,
    supportPhone: settings.supportPhone,
    currencyCode: settings.currencyCode,
    locale: settings.locale,
    timezone: settings.timezone,
    defaultMapLatitude: settings.defaultMapLatitude,
    defaultMapLongitude: settings.defaultMapLongitude,
    accentHue: normalizeStorefrontAccentHue(settings.accentHue)
  };
}

// features/keystone/mutations/publicStayAgreement.ts
async function publicStayAgreement(_root, args, context) {
  if (!/^[a-f0-9]{48}$/.test(args.token || "")) return null;
  const agreement = await resolvePublicTokenRecord({
    token: args.token,
    invalidMessage: "Agreement link is invalid.",
    findRecordByHash: async (tokenHash) => {
      const records = await context.sudo().query.StayAgreement.findMany({
        where: { signingTokenHash: { equals: tokenHash } },
        take: 1,
        query: "id agreementNumber status title signerEmail signatureName signedAt signingTokenExpiresAt signingTokenRevokedAt termsSnapshot"
      });
      const record = records[0];
      return record ? { ...record, tokenExpiresAt: record.signingTokenExpiresAt, tokenRevokedAt: record.signingTokenRevokedAt } : null;
    },
    isUnavailable: (record) => record.status === "voided"
  });
  if (!agreement) return null;
  const { signingTokenExpiresAt: _expires, signingTokenRevokedAt: _revoked, tokenExpiresAt: _tokenExpires, tokenRevokedAt: _tokenRevoked, ...publicAgreement } = agreement;
  return publicAgreement;
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
  const { tokenHash: _tokenHash, ...publicQuote } = quote;
  return {
    ...publicQuote,
    breakdown: quote.quoteSnapshot?.quote || null,
    cancellationPolicy: quote.quoteSnapshot?.cancellationPolicy || null,
    listing: quote.quoteSnapshot?.listing || quote.listing
  };
}

// features/keystone/mutations/publicTrip.ts
async function publicTrip(_root, args, context) {
  if (!/^[a-f0-9]{48}$/.test(args.token || "")) throw new Error("Trip link is invalid.");
  const reservation = await resolvePublicTokenRecord({
    token: args.token,
    invalidMessage: "Trip link is invalid.",
    findRecordByHash: async (tokenHash) => {
      const reservations = await context.sudo().query.Reservation.findMany({
        where: { tripTokenHash: { equals: tokenHash } },
        take: 1,
        query: `
          id confirmationCode status paymentStatus source checkInDate checkOutDate
          scheduledCheckInTime scheduledCheckOutTime checkedInAt checkedOutAt cancelledAt cancellationReason
          currencyCode lodgingSubtotalCents feeTotalCents taxTotalCents discountTotalCents securityDepositCents totalAmountCents amountPaidCents
          tripTokenExpiresAt tripTokenRevokedAt bookingSnapshot guestNotes
          listing {
            id title slug thumbnail
            property { checkInFrom checkInUntil checkOutBy address { addressLine1 addressLine2 city region postalCode countryCode publicLocationLabel } }
          }
          guest { id name email phone verificationStatus }
          guestParty { adults children infants pets invitedGuests }
          lineItems(orderBy: [{ createdAt: asc }]) { id lineType description serviceDate quantity unitAmountCents totalAmountCents currencyCode metadataSnapshot }
          payments(orderBy: [{ createdAt: desc }]) { id amountCents refundedAmountCents currencyCode status paymentMethod provider processedAt }
          refunds(orderBy: [{ createdAt: desc }]) { id refundNumber status reason amountCents currencyCode processedAt }
          agreement { id agreementNumber status title signerEmail signatureName signedAt }
          securityDeposit { id depositNumber status amountCents capturedAmountCents currencyCode heldAt releasedAt }
          conversation {
            id status
            messages(orderBy: [{ createdAt: asc }]) { id direction senderType body status sentAt receivedAt }
          }
          reviews(orderBy: [{ createdAt: asc }]) { id direction status overallRating body submittedAt publishedAt }
        `
      });
      const record = reservations[0];
      return record ? {
        ...record,
        tokenExpiresAt: record.tripTokenExpiresAt,
        tokenRevokedAt: record.tripTokenRevokedAt
      } : null;
    }
  });
  if (!reservation) return null;
  const snapshot = reservation.bookingSnapshot;
  const listingSnapshot = snapshot?.listing;
  const guestPartySnapshot = snapshot?.guestParty;
  const quoteSnapshot = snapshot?.quote;
  const { tripTokenExpiresAt: _expiresAt, tripTokenRevokedAt: _revokedAt, bookingSnapshot: _snapshot, tokenExpiresAt: _tokenExpiresAt, tokenRevokedAt: _tokenRevokedAt, ...publicReservation } = reservation;
  return {
    ...publicReservation,
    checkInDate: quoteSnapshot?.checkIn || reservation.checkInDate,
    checkOutDate: quoteSnapshot?.checkOut || reservation.checkOutDate,
    currencyCode: quoteSnapshot?.currencyCode || reservation.currencyCode,
    lodgingSubtotalCents: quoteSnapshot?.lodgingSubtotalCents ?? reservation.lodgingSubtotalCents,
    feeTotalCents: quoteSnapshot?.feeTotalCents ?? reservation.feeTotalCents,
    taxTotalCents: quoteSnapshot?.taxTotalCents ?? reservation.taxTotalCents,
    securityDepositCents: quoteSnapshot?.securityDepositCents ?? reservation.securityDepositCents,
    totalAmountCents: quoteSnapshot?.totalAmountCents ?? reservation.totalAmountCents,
    listing: listingSnapshot ? {
      id: listingSnapshot.id,
      title: listingSnapshot.title,
      slug: listingSnapshot.slug,
      thumbnail: listingSnapshot.thumbnail || listingSnapshot.media?.[0]?.url,
      host: listingSnapshot.host,
      property: listingSnapshot.property,
      accommodation: listingSnapshot.accommodation,
      houseRules: listingSnapshot.houseRules || []
    } : reservation.listing,
    guestParty: guestPartySnapshot || reservation.guestParty,
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
var import_node_crypto14 = __toESM(require("node:crypto"));

// features/keystone/utils/stayCancellationRefund.ts
var import_node_crypto13 = __toESM(require("node:crypto"));
function allocatePendingCancellationRefunds({
  reservationId,
  netAmountPaidCents,
  payments
}) {
  if (!Number.isSafeInteger(netAmountPaidCents) || netAmountPaidCents < 0) {
    throw new Error("Reservation paid amount must use non-negative integer cents.");
  }
  let remaining = netAmountPaidCents;
  const allocations = [];
  for (const payment of payments) {
    const available = payment.amountCents - payment.refundedAmountCents;
    if (!Number.isSafeInteger(available) || available < 0) throw new Error("Payment refund evidence is invalid.");
    const amountCents = Math.min(available, remaining);
    if (amountCents > 0) {
      const digest = import_node_crypto13.default.createHash("sha256").update(`${reservationId}|${payment.id}|${amountCents}|guest_cancellation`).digest("hex");
      allocations.push({ paymentId: payment.id, amountCents, idempotencyKey: `cancellation-refund:${digest}` });
      remaining -= amountCents;
    }
    if (remaining === 0) break;
  }
  if (remaining !== 0) throw new Error("Reservation payment evidence does not reconcile to the refundable balance.");
  return allocations;
}

// features/keystone/mutations/requestStayCancellation.ts
async function requestStayCancellation(_root, args, context) {
  if (!/^[a-f0-9]{48}$/.test(args.tripToken || "")) throw new Error("Trip link is invalid.");
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
      const record = reservations[0];
      return record ? { ...record, tokenExpiresAt: record.tripTokenExpiresAt, tokenRevokedAt: record.tripTokenRevokedAt } : null;
    }
  });
  if (!reservation) throw new Error("Trip link is invalid or expired.");
  return context.prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `reservation:${reservation.id}`);
    const locked = await tx.reservation.findUnique({ where: { id: reservation.id } });
    if (!locked || !["pending", "confirmed"].includes(locked.status)) throw new Error("This stay can no longer be cancelled online.");
    const now = /* @__PURE__ */ new Date();
    await tx.reservation.update({
      where: { id: locked.id },
      data: {
        status: "cancelled",
        cancelledAt: now,
        cancelledBy: "guest",
        cancellationReason
      }
    });
    await tx.calendarBlock.updateMany({
      where: { reservationId: locked.id, status: "active" },
      data: { status: "released" }
    });
    let refundPendingCents = 0;
    if (locked.amountPaidCents > 0) {
      const payments = await tx.payment.findMany({
        where: { reservationId: locked.id, status: { in: ["succeeded", "partially_refunded"] } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, amountCents: true, refundedAmountCents: true }
      });
      const allocations = allocatePendingCancellationRefunds({
        reservationId: locked.id,
        netAmountPaidCents: locked.amountPaidCents,
        payments
      });
      for (const allocation of allocations) {
        await tx.refund.create({
          data: {
            hostOrganizationId: locked.hostOrganizationId,
            reservationId: locked.id,
            paymentId: allocation.paymentId,
            refundNumber: `REF-${locked.confirmationCode}-${import_node_crypto14.default.randomUUID().slice(0, 8).toUpperCase()}`,
            idempotencyKey: allocation.idempotencyKey,
            providerRefundId: `pending-${import_node_crypto14.default.randomUUID()}`,
            status: "pending",
            reason: "guest_cancellation",
            amountCents: allocation.amountCents,
            currencyCode: locked.currencyCode,
            data: { policyReviewRequired: true }
          }
        });
        refundPendingCents += allocation.amountCents;
      }
    }
    return { id: locked.id, confirmationCode: locked.confirmationCode, status: "cancelled", refundPendingCents };
  }, { maxWait: 5e3, timeout: 1e4, isolationLevel: "ReadCommitted" });
}

// features/keystone/mutations/searchStays.ts
function searchText(listing) {
  const address = listing.property?.address;
  return [listing.title, listing.subtitle, listing.description, address?.city, address?.region, address?.countryCode, address?.publicLocationLabel].filter(Boolean).join(" ").toLowerCase();
}
function quoteInput(listing, args) {
  const ratePlan = listing.ratePlans?.[0];
  const unit = listing.accommodationUnit;
  if (!ratePlan || !unit || !args.checkIn || !args.checkOut) return null;
  return calculateStayQuote({
    checkIn: args.checkIn,
    checkOut: args.checkOut,
    baseNightlyRateCents: ratePlan.baseNightlyRateCents ?? listing.baseNightlyRateCents ?? 0,
    currencyCode: ratePlan.currencyCode || listing.currencyCode || "USD",
    baseMinimumStay: ratePlan.minimumStay ?? listing.minimumStay ?? 1,
    guestCount: (args.adults ?? 1) + (args.children ?? 0),
    maxGuests: unit.maxGuests,
    securityDepositCents: listing.securityDepositCents ?? 0,
    seasonalRates: ratePlan.seasonalRates || [],
    fees: (listing.feeDefinitions || []).map((fee) => ({
      name: fee.name,
      feeType: fee.feeType,
      kind: fee.calculation,
      amountCents: fee.amountCents,
      percentageBasisPoints: fee.percentageBasisPoints,
      taxable: fee.taxable
    })),
    taxes: (listing.taxRules || []).filter((tax) => !tax.isInclusive).map((tax) => ({
      name: tax.name,
      rateBasisPoints: tax.rateBasisPoints
    }))
  });
}
async function searchStays(_root, args, context) {
  const limit = Math.min(Math.max(args.limit ?? 24, 1), 100);
  const offset = Math.max(args.offset ?? 0, 0);
  const guestCount = (args.adults ?? 1) + (args.children ?? 0);
  if (guestCount < 1) throw new Error("Search requires at least one guest.");
  if (Boolean(args.checkIn) !== Boolean(args.checkOut)) throw new Error("Choose both check-in and check-out dates.");
  const listings = await context.sudo().query.Listing.findMany({
    where: { status: { equals: "published" } },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: 250,
    query: STAY_LISTING_SELECTION
  });
  const listingIds = listings.map((listing) => listing.id);
  const blocks = args.checkIn && args.checkOut && listingIds.length ? await context.sudo().query.CalendarBlock.findMany({
    where: {
      listing: { id: { in: listingIds } },
      status: { equals: "active" }
    },
    take: 2e3,
    query: "id startDate endDate listing { id }"
  }) : [];
  const destination = args.destination?.trim().toLowerCase();
  const matches = listings.flatMap((listing) => {
    const unit = listing.accommodationUnit;
    if (!unit || unit.maxGuests < guestCount) return [];
    if (destination && !searchText(listing).includes(destination)) return [];
    if (args.propertyTypes?.length && !args.propertyTypes.includes(unit.accommodationType)) return [];
    if (args.bedrooms && unit.bedroomCount < args.bedrooms) return [];
    if (args.beds && unit.bedCount < args.beds) return [];
    if (args.bathroomsHalfUnits && unit.bathroomCountHalfUnits < args.bathroomsHalfUnits) return [];
    if (args.instantBook != null && Boolean(listing.instantBook) !== args.instantBook) return [];
    const amenitySlugs = new Set((listing.amenities || []).map((amenity) => amenity.slug));
    if (args.amenitySlugs?.some((slug) => !amenitySlugs.has(slug))) return [];
    if (args.checkIn && args.checkOut) {
      const conflict = blocks.some((block) => block.listing?.id === listing.id && dateRangesOverlap(args.checkIn, args.checkOut, block.startDate, block.endDate));
      if (conflict) return [];
    }
    let quote = null;
    try {
      quote = quoteInput(listing, args);
    } catch {
      return [];
    }
    if (quote && args.minTotalCents != null && quote.totalAmountCents < args.minTotalCents) return [];
    if (quote && args.maxTotalCents != null && quote.totalAmountCents > args.maxTotalCents) return [];
    return [{ ...toPublicListing(listing), quote }];
  });
  return {
    totalCount: matches.length,
    offset,
    limit,
    results: matches.slice(offset, offset + limit)
  };
}

// features/keystone/mutations/signStayAgreement.ts
async function signStayAgreement(_root, args, context) {
  if (!/^[a-f0-9]{48}$/.test(args.token || "")) throw new Error("Agreement link is invalid.");
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
      const record = agreements[0];
      return record ? { ...record, tokenExpiresAt: record.signingTokenExpiresAt, tokenRevokedAt: record.signingTokenRevokedAt } : null;
    },
    isUnavailable: (record) => record.status === "voided"
  });
  if (!agreement) throw new Error("Agreement link is invalid or expired.");
  return context.prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `agreement:${agreement.id}`);
    const locked = await tx.stayAgreement.findUnique({ where: { id: agreement.id } });
    if (!locked || locked.status === "voided") throw new Error("Agreement link is invalid or expired.");
    if (locked.status === "signed") return locked;
    return tx.stayAgreement.update({
      where: { id: locked.id },
      data: { status: "signed", signatureName, signedAt: /* @__PURE__ */ new Date() }
    });
  }, { maxWait: 5e3, timeout: 1e4, isolationLevel: "ReadCommitted" });
}

// features/keystone/mutations/stayFinancialOperations.ts
var import_node_crypto15 = __toESM(require("node:crypto"));
function refundKey(paymentId, amountCents, reason) {
  return `refund:${import_node_crypto15.default.createHash("sha256").update(`${paymentId}|${amountCents}|${reason}`).digest("hex")}`;
}
async function refundStayPayment(_root, args, context) {
  const payment = await context.query.Payment.findOne({ where: { id: args.paymentId }, query: "id provider hostOrganization { id }" });
  if (!payment?.hostOrganization?.id) throw new Error("Payment not found.");
  await assertHostOrganizationAccess({ context, hostOrganizationId: payment.hostOrganization.id, permission: "canManagePayments" });
  if (!Number.isSafeInteger(args.amountCents) || args.amountCents <= 0) throw new Error("Refund amount must use positive integer cents.");
  const reason = args.reason?.trim() || "other";
  if (!["guest_cancellation", "host_cancellation", "stay_issue", "overpayment", "goodwill", "other"].includes(reason)) throw new Error("Refund reason is invalid.");
  const idempotencyKey = refundKey(payment.id, args.amountCents, reason);
  const adapter = getPaymentAdapter(payment.provider);
  if (adapter.code !== "pp_system_default") throw new Error("Refunds are enabled only for the installed manual payment adapter.");
  return context.prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `payment-refund:${payment.id}`);
    const existing = await tx.refund.findUnique({ where: { idempotencyKey } });
    if (existing) return existing;
    const locked = await tx.payment.findUnique({ where: { id: payment.id } });
    if (!locked || !["succeeded", "partially_refunded"].includes(locked.status)) throw new Error("Only a settled payment can be refunded.");
    const remaining = locked.amountCents - locked.refundedAmountCents;
    if (args.amountCents > remaining) throw new Error("Refund amount exceeds the unrefunded payment balance.");
    const result = await adapter.refundPayment({ paymentId: locked.providerPaymentId || locked.id, amount: args.amountCents });
    if (result.status !== "refunded") throw new Error("Manual refund evidence was not accepted.");
    const id = import_node_crypto15.default.randomUUID();
    const refund = await tx.refund.create({
      data: {
        id,
        hostOrganizationId: locked.hostOrganizationId,
        reservationId: locked.reservationId,
        paymentId: locked.id,
        refundNumber: `REF-${id.slice(0, 8).toUpperCase()}`,
        idempotencyKey,
        status: "succeeded",
        reason,
        amountCents: args.amountCents,
        currencyCode: locked.currencyCode,
        providerRefundId: `manual-refund-${id}`,
        processedAt: /* @__PURE__ */ new Date(),
        data: { adapter: adapter.code, evidence: result.data }
      }
    });
    const refundedAmountCents = locked.refundedAmountCents + args.amountCents;
    const paymentStatus = refundedAmountCents === locked.amountCents ? "refunded" : "partially_refunded";
    await tx.payment.update({ where: { id: locked.id }, data: { refundedAmountCents, status: paymentStatus } });
    if (locked.reservationId) {
      const successful = await tx.payment.aggregate({ where: { reservationId: locked.reservationId, status: { in: ["succeeded", "partially_refunded", "refunded"] } }, _sum: { amountCents: true, refundedAmountCents: true } });
      const netPaid = (successful._sum.amountCents || 0) - (successful._sum.refundedAmountCents || 0);
      const reservation = await tx.reservation.findUnique({ where: { id: locked.reservationId }, select: { totalAmountCents: true } });
      await tx.reservation.update({ where: { id: locked.reservationId }, data: { amountPaidCents: netPaid, paymentStatus: netPaid <= 0 ? "refunded" : netPaid < (reservation?.totalAmountCents || 0) ? "partially_refunded" : "paid" } });
    }
    await enqueueOutboxEvent(tx, { hostOrganizationId: locked.hostOrganizationId, eventType: "payment.refunded", aggregateType: "Refund", aggregateId: id, operationKey: idempotencyKey, payload: { refundId: id, paymentId: locked.id, reservationId: locked.reservationId, amountCents: args.amountCents, currencyCode: locked.currencyCode } });
    return refund;
  }, { maxWait: 5e3, timeout: 15e3, isolationLevel: "Serializable" });
}
var depositTransitions = {
  authorize: ["required"],
  hold: ["required", "authorized"],
  release: ["authorized", "held", "partially_captured"],
  capture: ["held", "partially_captured"],
  fail: ["required", "authorized", "held"]
};
async function transitionSecurityDeposit(_root, args, context) {
  const deposit = await context.query.SecurityDeposit.findOne({ where: { id: args.depositId }, query: "id hostOrganization { id }" });
  if (!deposit?.hostOrganization?.id) throw new Error("Security deposit not found.");
  await assertHostOrganizationAccess({ context, hostOrganizationId: deposit.hostOrganization.id, permission: "canManagePayments" });
  if (!depositTransitions[args.transition]) throw new Error("Unsupported security deposit transition.");
  return context.prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `security-deposit:${deposit.id}`);
    const locked = await tx.securityDeposit.findUnique({ where: { id: deposit.id } });
    if (!locked || !depositTransitions[args.transition].includes(locked.status)) throw new Error(`Cannot ${args.transition} this security deposit.`);
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
      const amount = args.amountCents || 0;
      if (!Number.isSafeInteger(amount) || amount <= 0 || amount > locked.amountCents - locked.capturedAmountCents) throw new Error("Deposit capture amount is invalid.");
      const capturedAmountCents = locked.capturedAmountCents + amount;
      data.capturedAmountCents = capturedAmountCents;
      data.status = capturedAmountCents === locked.amountCents ? "captured" : "partially_captured";
    }
    const reference = args.reference?.trim();
    if (reference) data.providerReference = reference.slice(0, 500);
    const updated = await tx.securityDeposit.update({ where: { id: locked.id }, data });
    await enqueueOutboxEvent(tx, { hostOrganizationId: locked.hostOrganizationId, eventType: `security_deposit.${updated.status}`, aggregateType: "SecurityDeposit", aggregateId: locked.id, operationKey: `${args.transition}:${updated.capturedAmountCents}:${now.toISOString()}`, payload: { depositId: locked.id, reservationId: locked.reservationId, status: updated.status, amountCents: updated.amountCents, capturedAmountCents: updated.capturedAmountCents } });
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
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `damage-claim:${claim.id}`);
    const locked = await tx.damageClaim.findUnique({ where: { id: claim.id } });
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
    if (args.transition === "settle") data.resolvedAt = /* @__PURE__ */ new Date();
    const updated = await tx.damageClaim.update({ where: { id: locked.id }, data });
    await enqueueOutboxEvent(tx, { hostOrganizationId: locked.hostOrganizationId, eventType: `damage_claim.${updated.status}`, aggregateType: "DamageClaim", aggregateId: locked.id, operationKey: `${args.transition}:${updated.approvedAmountCents}`, payload: { claimId: locked.id, reservationId: locked.reservationId, status: updated.status, approvedAmountCents: updated.approvedAmountCents } });
    return updated;
  }, { maxWait: 5e3, timeout: 1e4, isolationLevel: "ReadCommitted" });
}
async function createDamageClaim(_root, args, context) {
  const reservation = await context.query.Reservation.findOne({ where: { id: args.reservationId }, query: "id status hostOrganization { id } listing { id } guest { id }" });
  if (!reservation?.hostOrganization?.id) throw new Error("Reservation not found.");
  await assertHostOrganizationAccess({ context, hostOrganizationId: reservation.hostOrganization.id, permission: "canManageReservations" });
  const description = args.description.trim();
  if (!description || description.length > 4e3) throw new Error("Damage description is required and must be at most 4000 characters.");
  if (!Number.isSafeInteger(args.claimedAmountCents) || args.claimedAmountCents < 0) throw new Error("Claim amount must use non-negative integer cents.");
  if (!["in_stay", "completed"].includes(reservation.status)) throw new Error("Damage claims require an in-stay or completed reservation.");
  const id = import_node_crypto15.default.randomUUID();
  return context.prisma.$transaction(async (tx) => {
    const claim = await tx.damageClaim.create({ data: { id, hostOrganizationId: reservation.hostOrganization.id, reservationId: reservation.id, listingId: reservation.listing.id, guestId: reservation.guest.id, claimNumber: `CLM-${id.slice(0, 8).toUpperCase()}`, status: "draft", description, claimedAmountCents: args.claimedAmountCents, approvedAmountCents: 0, currencyCode: "USD", evidence: args.evidence || [] } });
    await enqueueOutboxEvent(tx, { hostOrganizationId: reservation.hostOrganization.id, eventType: "damage_claim.created", aggregateType: "DamageClaim", aggregateId: id, operationKey: `create:${id}`, payload: { claimId: id, reservationId: reservation.id, listingId: reservation.listing.id, claimedAmountCents: args.claimedAmountCents } });
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
  const listing = await context.sudo().query.Listing.findOne({
    where: { id: args.listingId },
    query: STAY_LISTING_SELECTION
  });
  if (!listing || listing.status !== "published") throw new Error("This stay is not available for booking.");
  if (!listing.hostOrganization?.id || !listing.accommodationUnit?.id) throw new Error("This listing is not ready for booking.");
  if (pets > 0) {
    const petRule = listing.houseRules?.find((rule) => rule.ruleType === "pets");
    if (petRule && petRule.isAllowed === false) throw new Error("This stay does not allow pets.");
  }
  const blocks = await context.sudo().query.CalendarBlock.findMany({
    where: { listing: { id: { equals: listing.id } }, status: { equals: "active" } },
    take: 500,
    query: "id startDate endDate"
  });
  if (blocks.some((block) => dateRangesOverlap(args.checkIn, args.checkOut, block.startDate, block.endDate))) {
    throw new Error("This stay is unavailable for the selected dates.");
  }
  const ratePlan = listing.ratePlans?.[0];
  if (!ratePlan) throw new Error("This stay does not have an active rate plan.");
  const calculation = calculateStayQuote({
    checkIn: args.checkIn,
    checkOut: args.checkOut,
    baseNightlyRateCents: ratePlan.baseNightlyRateCents ?? listing.baseNightlyRateCents ?? 0,
    currencyCode: ratePlan.currencyCode || listing.currencyCode || "USD",
    baseMinimumStay: ratePlan.minimumStay ?? listing.minimumStay ?? 1,
    guestCount: adults + children,
    maxGuests: listing.accommodationUnit.maxGuests,
    securityDepositCents: listing.securityDepositCents ?? 0,
    seasonalRates: ratePlan.seasonalRates || [],
    fees: (listing.feeDefinitions || []).map((fee) => ({
      name: fee.name,
      feeType: fee.feeType,
      kind: fee.calculation,
      amountCents: fee.amountCents,
      percentageBasisPoints: fee.percentageBasisPoints,
      taxable: fee.taxable
    })),
    taxes: (listing.taxRules || []).filter((tax) => !tax.isInclusive).map((tax) => ({
      name: tax.name,
      rateBasisPoints: tax.rateBasisPoints
    }))
  });
  const number = quoteNumber();
  const token = createStayQuoteToken();
  const expiresAt = stayQuoteExpiry();
  const cancellationPolicy = ratePlan.cancellationPolicy || {
    id: null,
    name: "Custom host policy",
    version: "listing-current",
    summary: "Cancellation terms are shown before booking.",
    rules: []
  };
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
  const quote = await context.sudo().query.StayQuote.createOne({
    data: {
      hostOrganization: { connect: { id: listing.hostOrganization.id } },
      listing: { connect: { id: listing.id } },
      ratePlan: { connect: { id: ratePlan.id } },
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

// features/keystone/utils/reservationTaskAutomation.ts
var import_node_crypto16 = __toESM(require("node:crypto"));
var triggerForTransition = {
  confirm: "reservation_confirmed",
  complete: "after_check_out",
  cancel: "reservation_cancelled"
};
function renderTitle(template, listingTitle, confirmationCode2) {
  return template.replaceAll("{{listing.title}}", listingTitle).replaceAll("{{reservation.confirmationCode}}", confirmationCode2).slice(0, 240);
}
async function createReservationTasksForTransition(tx, reservation, transition) {
  const trigger = triggerForTransition[transition];
  if (!trigger) return [];
  const listing = await tx.listing.findUnique({ where: { id: reservation.listingId }, select: { id: true, title: true, propertyId: true } });
  if (!listing?.propertyId) return [];
  const rules2 = await tx.taskRule.findMany({
    where: {
      hostOrganizationId: reservation.hostOrganizationId,
      isActive: true,
      trigger,
      OR: [{ listingId: listing.id }, { listingId: null, propertyId: listing.propertyId }]
    }
  });
  const tasks = [];
  for (const rule of rules2) {
    const idempotencyKey = propertyTaskRuleKey(rule.id, reservation.id);
    const baseDate = trigger === "reservation_confirmed" ? /* @__PURE__ */ new Date() : /* @__PURE__ */ new Date(`${transition === "complete" ? reservation.checkOutDate : reservation.checkInDate}T12:00:00.000Z`);
    const dueAt = new Date(baseDate.getTime() + rule.offsetMinutes * 6e4);
    const task = await tx.propertyTask.upsert({
      where: { idempotencyKey },
      update: {},
      create: {
        id: import_node_crypto16.default.randomUUID(),
        hostOrganizationId: reservation.hostOrganizationId,
        propertyId: listing.propertyId,
        listingId: listing.id,
        reservationId: reservation.id,
        taskRuleId: rule.id,
        assigneeId: rule.defaultAssigneeId,
        idempotencyKey,
        source: "task_rule",
        title: renderTitle(rule.titleTemplate, listing.title, reservation.confirmationCode),
        taskType: rule.taskType,
        status: rule.defaultAssigneeId ? "assigned" : "queued",
        priority: rule.priority,
        dueAt,
        claimedAt: rule.defaultAssigneeId ? /* @__PURE__ */ new Date() : null,
        checklist: rule.checklistTemplate
      }
    });
    await enqueueOutboxEvent(tx, {
      hostOrganizationId: reservation.hostOrganizationId,
      eventType: "property_task.created",
      aggregateType: "PropertyTask",
      aggregateId: task.id,
      operationKey: idempotencyKey,
      payload: { taskId: task.id, reservationId: reservation.id, propertyId: listing.propertyId, trigger }
    });
    tasks.push(task);
  }
  return tasks;
}

// features/keystone/mutations/transitionStayReservation.ts
var transitions = {
  confirm: { from: ["inquiry", "quoted", "pending"], to: "confirmed" },
  check_in: { from: ["confirmed"], to: "in_stay" },
  complete: { from: ["in_stay"], to: "completed" },
  cancel: { from: ["inquiry", "quoted", "pending", "confirmed"], to: "cancelled" },
  no_show: { from: ["confirmed"], to: "no_show" }
};
async function transitionStayReservation(_root, args, context) {
  const transition = transitions[args.transition];
  if (!transition) throw new Error(`Unsupported stay transition: ${args.transition}`);
  const transitionNote = args.note?.trim() || "";
  if (transitionNote.length > 2e3) throw new Error("Reservation note is too long.");
  const reservation = await context.query.Reservation.findOne({
    where: { id: args.reservationId },
    query: "id confirmationCode status internalNotes hostOrganization { id } calendarBlocks { id status }"
  });
  if (!reservation?.hostOrganization?.id) throw new Error("Reservation not found.");
  await assertHostOrganizationAccess({ context, hostOrganizationId: reservation.hostOrganization.id, permission: "canManageReservations" });
  return context.prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `reservation:${reservation.id}`);
    const locked = await tx.reservation.findUnique({ where: { id: reservation.id } });
    if (!locked) throw new Error("Reservation not found.");
    if (!transition.from.includes(locked.status)) {
      throw new Error(`Cannot ${args.transition.replace("_", " ")} a ${locked.status} reservation.`);
    }
    const now = /* @__PURE__ */ new Date();
    const note = `[${now.toISOString()}] ${args.transition}${transitionNote ? `: ${transitionNote}` : ""}`;
    const data = {
      status: transition.to,
      internalNotes: [locked.internalNotes, note].filter(Boolean).join("\n")
    };
    if (args.transition === "check_in") data.checkedInAt = now;
    if (args.transition === "complete") data.checkedOutAt = now;
    if (args.transition === "cancel") {
      data.cancelledAt = now;
      data.cancelledBy = "host";
      data.cancellationReason = transitionNote || "Cancelled by host or property manager.";
    }
    const updated = await tx.reservation.update({ where: { id: locked.id }, data });
    if (["cancel", "no_show"].includes(args.transition)) {
      await tx.calendarBlock.updateMany({ where: { reservationId: locked.id, status: "active" }, data: { status: "released" } });
    }
    await createReservationTasksForTransition(tx, updated, args.transition);
    await enqueueOutboxEvent(tx, {
      hostOrganizationId: locked.hostOrganizationId,
      eventType: `reservation.${transition.to}`,
      aggregateType: "Reservation",
      aggregateId: locked.id,
      operationKey: `${args.transition}:${now.toISOString()}`,
      payload: { reservationId: locked.id, confirmationCode: locked.confirmationCode, status: transition.to }
    });
    return updated;
  }, { maxWait: 5e3, timeout: 1e4, isolationLevel: "ReadCommitted" });
}

// features/keystone/mutations/updateOnboardingStatus.ts
var allowedStatuses = /* @__PURE__ */ new Set(["not_started", "in_progress", "completed", "dismissed"]);
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

// features/keystone/mutations/index.ts
var graphql2 = String.raw;
function extendGraphqlSchema(baseSchema) {
  return (0, import_schema.mergeSchemas)({
    schemas: [baseSchema],
    typeDefs: graphql2`
      type PublicMarketplaceSettingsResult {
        status: String!
        id: ID
        name: String
        tagline: String
        homepageHeadline: String
        publicDescription: String
        supportEmail: String
        supportPhone: String
        currencyCode: String
        locale: String
        timezone: String
        defaultMapLatitude: Float
        defaultMapLongitude: Float
        accentHue: Int
      }

      type SearchStaysResult {
        totalCount: Int!
        offset: Int!
        limit: Int!
        results: [JSON!]!
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
        agreementToken: String!
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
          offset: Int
          limit: Int
        ): SearchStaysResult!
        publicListing(slug: String!): JSON
        publicStayAgreement(token: String!): JSON
        publicStayQuote(token: String!): JSON
        publicTrip(token: String!): JSON
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
        ): CreateStayReservationResult!

        requestStayCancellation(tripToken: String!, reason: String): StayCancellationResult!
        signStayAgreement(token: String!, signatureName: String!): StayAgreementMutationResult!

        transitionStayReservation(
          reservationId: ID!
          transition: String!
          note: String
        ): StayReservationMutationResult!

        initiateStayPayment(
          reservationId: ID!
          paymentProviderCode: String
          amountCents: Int
        ): StayPaymentResult!

        captureStayPayment(paymentId: ID!): StayPaymentResult!

        generateOwnerStatement(ownerId: ID!, periodStart: String!, periodEnd: String!, currencyCode: String): JSON!
        transitionOwnerStatement(statementId: ID!, transition: String!, reference: String): JSON!
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
        refundStayPayment(paymentId: ID!, amountCents: Int!, reason: String): JSON!
        transitionSecurityDeposit(depositId: ID!, transition: String!, amountCents: Int, reference: String): JSON!
        createStayDamageClaim(reservationId: ID!, description: String!, claimedAmountCents: Int!, evidence: JSON): JSON!
        transitionDamageClaim(claimId: ID!, transition: String!, approvedAmountCents: Int): JSON!

        updateOnboardingStatus(status: String!): OnboardingStatusResult!
      }
    `,
    resolvers: {
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
        requestStayCancellation,
        signStayAgreement,
        transitionStayReservation,
        initiateStayPayment,
        captureStayPayment,
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
        updateOnboardingStatus
      }
    }
  });
}

// features/keystone/lib/mail.ts
var import_nodemailer = require("nodemailer");
function getBaseUrlForEmails() {
  if (process.env.SMTP_STORE_LINK) {
    return process.env.SMTP_STORE_LINK;
  }
  console.warn("SMTP_STORE_LINK not set. Please add SMTP_STORE_LINK to your environment variables for email links to work properly.");
  return "";
}
var transport = (0, import_nodemailer.createTransport)({
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
async function sendPasswordResetEmail(resetToken, to, baseUrl) {
  const frontendUrl = baseUrl || getBaseUrlForEmails();
  const info = await transport.sendMail({
    to,
    from: process.env.SMTP_FROM,
    subject: "Your password reset token!",
    html: passwordResetEmail({
      url: `${frontendUrl}/dashboard/reset?token=${resetToken}`
    })
  });
  if (process.env.MAIL_USER?.includes("ethereal.email")) {
    console.log(`\u{1F4E7} Message Sent!  Preview it at ${(0, import_nodemailer.getTestMessageUrl)(info)}`);
  }
}

// features/integrations/abuse-control/graphqlPlugin.ts
var import_graphql = require("graphql");

// features/integrations/abuse-control/identity.ts
var import_node_crypto17 = __toESM(require("node:crypto"));
var TRUSTED_VALUE = /^[\x21-\x7e]{1,256}$/;
var REQUEST_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{15,127}$/;
function readHeader(headers, name) {
  if (!headers) return void 0;
  if (headers instanceof Headers) return headers.get(name) || void 0;
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}
function secureEqual(actual, expected) {
  if (!actual) return false;
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && import_node_crypto17.default.timingSafeEqual(actualBuffer, expectedBuffer);
}
function keyedHash(secret, namespace, values) {
  const canonical = values.map((value) => `${Buffer.byteLength(value, "utf8")}:${value}`).join("|");
  return import_node_crypto17.default.createHmac("sha256", secret).update(`${namespace}|${canonical}`).digest("hex");
}
function resolveTrustedAttribution(config2, headers) {
  if (config2.mode !== "remote") throw new Error("Trusted attribution requires remote abuse control.");
  const attestation = readHeader(headers, config2.proxyAttestationHeaderName);
  if (!secureEqual(attestation, config2.proxyAttestationSecret)) {
    throw new AbuseControlUnavailableError("Trusted proxy attribution is absent or invalid.");
  }
  const client = readHeader(headers, config2.clientHeaderName)?.trim();
  const requestId = readHeader(headers, config2.requestIdHeaderName)?.trim();
  if (!client || !TRUSTED_VALUE.test(client)) throw new AbuseControlUnavailableError("Trusted client attribution is absent or invalid.");
  if (!requestId || !REQUEST_ID.test(requestId)) throw new AbuseControlUnavailableError("Trusted request attribution is absent or invalid.");
  return {
    clientHash: keyedHash(config2.subjectSecret, "client", [client]),
    requestHash: keyedHash(config2.subjectSecret, "request", [requestId])
  };
}
function hashAbuseControlSubject(config2, subjectParts) {
  if (config2.mode !== "remote") throw new Error("Subject hashing requires remote abuse control.");
  const normalized = subjectParts.map((value) => String(value ?? "").trim().toLowerCase()).filter(Boolean);
  return keyedHash(config2.subjectSecret, "subject", normalized.length ? normalized : ["anonymous"]);
}
function abuseControlIdempotencyKey(config2, routeKey, subjectHash, clientHash, requestHash, operationScope) {
  return `ac_${keyedHash(config2.subjectSecret, "consume", [config2.tenantKey, routeKey, subjectHash, clientHash, requestHash, operationScope])}`;
}
var AbuseControlUnavailableError = class extends Error {
  constructor(message = "Required abuse control is unavailable.") {
    super(message);
    this.code = "ABUSE_CONTROL_UNAVAILABLE";
    this.name = "AbuseControlUnavailableError";
  }
};
var AbuseControlDeniedError = class extends Error {
  constructor(retryAfterMs, decisionId) {
    super("Too many requests. Please try again later.");
    this.code = "ABUSE_CONTROL_DENIED";
    this.name = "AbuseControlDeniedError";
    this.retryAfterMs = retryAfterMs;
    this.decisionId = decisionId;
  }
};

// features/integrations/abuse-control/bounds.ts
function serializedInputBytes(value) {
  let json27;
  try {
    json27 = JSON.stringify(value) ?? "";
  } catch {
    throw new Error("Request input must be JSON-serializable.");
  }
  return Buffer.byteLength(json27, "utf8");
}
function assertBoundedInput(value, maxBytes) {
  const bytes = serializedInputBytes(value);
  if (bytes > maxBytes) throw new Error(`Request input exceeds the ${maxBytes}-byte limit.`);
  return bytes;
}
async function readBoundedStream(stream, maxBytes, timeoutMs, unavailable) {
  if (!stream) return "";
  const reader = stream.getReader();
  const chunks = [];
  let total = 0;
  let timer;
  const deadline = Date.now() + timeoutMs;
  try {
    while (true) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) throw new Error("Request body timed out.");
      const next = reader.read();
      const result = await Promise.race([
        next,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error("Request body timed out.")), remainingMs);
        })
      ]);
      if (timer) clearTimeout(timer);
      if (result.done) break;
      total += result.value.byteLength;
      if (total > maxBytes) throw new Error(`Request body exceeds the ${maxBytes}-byte limit.`);
      chunks.push(result.value);
    }
  } catch (error) {
    await reader.cancel().catch(() => void 0);
    if (unavailable) throw new AbuseControlUnavailableError(error instanceof Error ? error.message : void 0);
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
}
async function readBoundedProviderBody(response, maxBytes = 16384, timeoutMs = 1e3) {
  const contentLength = Number(response.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new AbuseControlUnavailableError("Abuse-control response exceeds its contract limit.");
  }
  return readBoundedStream(response.body, maxBytes, timeoutMs, true);
}

// features/integrations/abuse-control/config.ts
var HEADER_NAME = /^[a-z0-9][a-z0-9-]{0,62}$/;
var SAFE_KEY = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
function requireValue(environment, name, minimumLength = 1) {
  const value = environment[name]?.trim();
  if (!value || value.length < minimumLength) throw new Error(`${name} must be configured for durable abuse control.`);
  return value;
}
function headerName(environment, name) {
  const value = requireValue(environment, name).toLowerCase();
  if (!HEADER_NAME.test(value)) throw new Error(`${name} must be a valid lowercase HTTP header name.`);
  return value;
}
function resolveAbuseControlConfig(environment = process.env) {
  const production = environment.NODE_ENV === "production";
  const mode = environment.ABUSE_CONTROL_MODE?.trim() || (production ? "" : "disabled");
  if (production && mode !== "remote") throw new Error("Production requires ABUSE_CONTROL_MODE=remote.");
  if (mode !== "remote" && mode !== "disabled") throw new Error("ABUSE_CONTROL_MODE must be remote or disabled.");
  const tenantKey = environment.ABUSE_CONTROL_TENANT_KEY?.trim() || (production ? "" : "local-rental");
  if (!SAFE_KEY.test(tenantKey)) throw new Error("ABUSE_CONTROL_TENANT_KEY must be a stable, non-secret tenant key.");
  if (mode === "disabled") return { mode, tenantKey };
  const endpointValue = requireValue(environment, "ABUSE_CONTROL_ENDPOINT");
  let endpoint2;
  try {
    endpoint2 = new URL(endpointValue);
  } catch {
    throw new Error("ABUSE_CONTROL_ENDPOINT must be an absolute URL.");
  }
  const localHttp = !production && endpoint2.protocol === "http:" && ["127.0.0.1", "::1", "localhost"].includes(endpoint2.hostname);
  if (endpoint2.protocol !== "https:" && !localHttp) throw new Error("ABUSE_CONTROL_ENDPOINT must use HTTPS outside local development.");
  if (endpoint2.username || endpoint2.password || endpoint2.search || endpoint2.hash) {
    throw new Error("ABUSE_CONTROL_ENDPOINT cannot contain credentials, query parameters, or a fragment.");
  }
  const keyId = requireValue(environment, "ABUSE_CONTROL_KEY_ID");
  if (!SAFE_KEY.test(keyId)) throw new Error("ABUSE_CONTROL_KEY_ID is invalid.");
  const signingSecret = requireValue(environment, "ABUSE_CONTROL_SIGNING_SECRET", 32);
  const subjectSecret = requireValue(environment, "ABUSE_CONTROL_SUBJECT_SECRET", 32);
  const proxyAttestationSecret = requireValue(environment, "ABUSE_CONTROL_PROXY_ATTESTATION_SECRET", 32);
  const readinessProbeSecret = requireValue(environment, "ABUSE_CONTROL_READINESS_PROBE_SECRET", 32);
  if ((/* @__PURE__ */ new Set([signingSecret, subjectSecret, proxyAttestationSecret, readinessProbeSecret])).size !== 4) {
    throw new Error("Abuse-control signing, subject, proxy-attestation, and readiness secrets must be distinct.");
  }
  return {
    mode,
    tenantKey,
    endpoint: endpoint2.toString().replace(/\/$/, ""),
    keyId,
    signingSecret,
    subjectSecret,
    clientHeaderName: headerName(environment, "ABUSE_CONTROL_CLIENT_HEADER"),
    requestIdHeaderName: headerName(environment, "ABUSE_CONTROL_REQUEST_ID_HEADER"),
    proxyAttestationHeaderName: headerName(environment, "ABUSE_CONTROL_PROXY_ATTESTATION_HEADER"),
    proxyAttestationSecret,
    readinessProbeSecret
  };
}
var NEXT_PRODUCTION_BUILD_PHASE = "phase-production-build";
function isAbuseControlBuildPhase(environment = process.env) {
  return environment.NEXT_PHASE === NEXT_PRODUCTION_BUILD_PHASE;
}
function assertAbuseControlRuntimeReady(environment = process.env) {
  if (isAbuseControlBuildPhase(environment)) {
    return { deferredForBuild: true, configured: false };
  }
  if (environment.NODE_ENV === "production") {
    try {
      resolveRequiredRemoteAbuseControlConfig(environment);
      return { deferredForBuild: false, configured: true };
    } catch {
      return { deferredForBuild: false, configured: false };
    }
  }
  const config2 = resolveAbuseControlConfig(environment);
  return { deferredForBuild: false, configured: config2.mode === "remote" };
}
function resolveRequiredRemoteAbuseControlConfig(environment = process.env) {
  const config2 = resolveAbuseControlConfig(environment);
  if (config2.mode !== "remote") throw new Error("Durable abuse control is disabled.");
  return config2;
}

// features/integrations/abuse-control/policies.ts
var policy = (routeKey, limit, windowSeconds, maxInputBytes, maxProviderLatencyMs = 800) => ({ routeKey, limit, windowSeconds, maxInputBytes, maxProviderLatencyMs, alertOnDeny: true });
var ABUSE_CONTROL_POLICIES = {
  "auth.sign-in": policy("auth.sign-in", 8, 300, 8192),
  "auth.sign-up": policy("auth.sign-up", 4, 3600, 16384),
  "auth.password-reset-request": policy("auth.password-reset-request", 4, 3600, 4096),
  "auth.password-reset-redeem": policy("auth.password-reset-redeem", 6, 3600, 8192),
  "auth.password-reset-validate": policy("auth.password-reset-validate", 12, 3600, 4096),
  "auth.initial-user": policy("auth.initial-user", 3, 3600, 16384),
  "storefront.search": policy("storefront.search", 60, 60, 16384),
  "storefront.listing-read": policy("storefront.listing-read", 120, 60, 4096),
  "storefront.quote-read": policy("storefront.quote-read", 30, 60, 4096),
  "storefront.trip-read": policy("storefront.trip-read", 30, 60, 4096),
  "storefront.agreement-read": policy("storefront.agreement-read", 30, 60, 4096),
  "storefront.quote-create": policy("storefront.quote-create", 20, 300, 8192),
  "storefront.reservation-create": policy("storefront.reservation-create", 6, 900, 32768),
  "storefront.cancellation-request": policy("storefront.cancellation-request", 6, 900, 8192),
  "storefront.agreement-sign": policy("storefront.agreement-sign", 8, 900, 8192),
  "webhook.payment": policy("webhook.payment", 120, 60, 65536, 1e3)
};

// features/integrations/abuse-control/remote.ts
var import_node_crypto18 = __toESM(require("node:crypto"));

// features/integrations/abuse-control/types.ts
var ABUSE_CONTROL_CONTRACT_VERSION = 1;

// features/integrations/abuse-control/remote.ts
var OPAQUE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,255}$/;
var REQUIRED_GUARANTEES = ["atomicQuota", "idempotentReplay", "durableEvidence", "durableAlertOutbox"];
function signature(secret, timestamp22, body) {
  return import_node_crypto18.default.createHmac("sha256", secret).update(`${timestamp22}.${body}`).digest("hex");
}
function secureEqual2(actual, expected) {
  if (!actual) return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && import_node_crypto18.default.timingSafeEqual(left, right);
}
function assertGuarantees(value) {
  if (!value || REQUIRED_GUARANTEES.some((key) => value[key] !== true)) {
    throw new AbuseControlUnavailableError("Abuse-control durability guarantees are absent.");
  }
}
function parseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    throw new AbuseControlUnavailableError("Abuse-control response is not valid JSON.");
  }
}
async function signedRequest(config2, path, body, timeoutMs, fetchImpl) {
  if (config2.mode !== "remote") throw new Error("Remote abuse control is not configured.");
  const timestamp22 = Date.now().toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${config2.endpoint}${path}`, {
      method: "POST",
      redirect: "error",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-openfront-abuse-key-id": config2.keyId,
        "x-openfront-abuse-timestamp": timestamp22,
        "x-openfront-abuse-signature": signature(config2.signingSecret, timestamp22, body)
      },
      body
    });
    const raw = await readBoundedProviderBody(response, 16384, timeoutMs);
    const responseTimestamp = response.headers.get("x-openfront-abuse-timestamp");
    const responseSignature = response.headers.get("x-openfront-abuse-signature");
    if (!responseTimestamp || !/^\d{13}$/.test(responseTimestamp) || Math.abs(Date.now() - Number(responseTimestamp)) > 3e4) {
      throw new AbuseControlUnavailableError("Abuse-control response timestamp is invalid.");
    }
    if (!secureEqual2(responseSignature, signature(config2.signingSecret, responseTimestamp, raw))) {
      throw new AbuseControlUnavailableError("Abuse-control response signature is invalid.");
    }
    if (!response.ok) throw new AbuseControlUnavailableError(`Abuse-control provider returned HTTP ${response.status}.`);
    return raw;
  } catch (error) {
    if (error instanceof AbuseControlUnavailableError) throw error;
    throw new AbuseControlUnavailableError(error instanceof Error ? error.message : void 0);
  } finally {
    clearTimeout(timer);
  }
}
async function consumeRemoteAbuseControl(config2, request, timeoutMs, fetchImpl = fetch) {
  const raw = await signedRequest(config2, "/v1/consume", JSON.stringify(request), timeoutMs, fetchImpl);
  const response = parseJson(raw);
  if (response.contractVersion !== ABUSE_CONTROL_CONTRACT_VERSION || response.idempotencyKey !== request.idempotencyKey) {
    throw new AbuseControlUnavailableError("Abuse-control response does not match the request contract.");
  }
  if (typeof response.allowed !== "boolean") throw new AbuseControlUnavailableError("Abuse-control decision is invalid.");
  if (!OPAQUE_ID.test(response.decisionId || "") || !OPAQUE_ID.test(response.evidenceId || "")) {
    throw new AbuseControlUnavailableError("Abuse-control durable evidence identifiers are invalid.");
  }
  if (!Number.isSafeInteger(response.remaining) || response.remaining < 0 || !Number.isSafeInteger(response.retryAfterMs) || response.retryAfterMs < 0) {
    throw new AbuseControlUnavailableError("Abuse-control quota metadata is invalid.");
  }
  assertGuarantees(response.guarantees);
  if (!response.allowed && !OPAQUE_ID.test(response.alertOutboxId || "")) {
    throw new AbuseControlUnavailableError("Denied requests require durable alert-outbox evidence.");
  }
  return response;
}

// features/integrations/abuse-control/index.ts
async function enforceAbuseControl(input) {
  const policy2 = ABUSE_CONTROL_POLICIES[input.routeKey];
  assertBoundedInput(input.requestInput, policy2.maxInputBytes);
  const config2 = input.config || resolveAbuseControlConfig(input.environment);
  if (config2.mode === "disabled") return { enforced: false };
  const attribution = resolveTrustedAttribution(config2, input.headers);
  const subjectHash = hashAbuseControlSubject(config2, input.subjectParts);
  const idempotencyKey = abuseControlIdempotencyKey(
    config2,
    policy2.routeKey,
    subjectHash,
    attribution.clientHash,
    attribution.requestHash,
    input.operationScope || "root"
  );
  const response = await consumeRemoteAbuseControl(config2, {
    contractVersion: ABUSE_CONTROL_CONTRACT_VERSION,
    tenantKey: config2.tenantKey,
    routeKey: policy2.routeKey,
    subjectHash,
    clientHash: attribution.clientHash,
    idempotencyKey,
    occurredAt: (input.now || /* @__PURE__ */ new Date()).toISOString(),
    quota: { limit: policy2.limit, windowSeconds: policy2.windowSeconds },
    evidence: { persist: true, privacyClass: "pseudonymous-security", alertOnDeny: true }
  }, policy2.maxProviderLatencyMs, input.fetchImpl);
  if (!response.allowed) throw new AbuseControlDeniedError(response.retryAfterMs, response.decisionId);
  return {
    enforced: true,
    allowed: true,
    decisionId: response.decisionId,
    evidenceId: response.evidenceId,
    remaining: response.remaining
  };
}

// features/integrations/abuse-control/graphqlPlugin.ts
var OPERATIONS = {
  authenticateUserWithPassword: { routeKey: "auth.sign-in", subject: (args) => [args.email] },
  createUser: { routeKey: "auth.sign-up", subject: (args) => [args.data?.email] },
  createUsers: { routeKey: "auth.sign-up", subject: (args) => (args.data || []).map((item) => item?.email) },
  sendUserPasswordResetLink: { routeKey: "auth.password-reset-request", subject: (args) => [args.email] },
  redeemUserPasswordResetToken: { routeKey: "auth.password-reset-redeem", subject: (args) => [args.email] },
  validateUserPasswordResetToken: { routeKey: "auth.password-reset-validate", subject: (args) => [args.email] },
  createInitialUser: { routeKey: "auth.initial-user", subject: (args) => [args.data?.email] },
  searchStays: { routeKey: "storefront.search", subject: (args) => [args.destination, args.checkIn, args.checkOut] },
  publicListing: { routeKey: "storefront.listing-read", subject: (args) => [args.slug] },
  publicStayQuote: { routeKey: "storefront.quote-read", subject: (args) => [args.token] },
  publicTrip: { routeKey: "storefront.trip-read", subject: (args) => [args.token] },
  publicStayAgreement: { routeKey: "storefront.agreement-read", subject: (args) => [args.token] },
  quoteStay: { routeKey: "storefront.quote-create", subject: (args) => [args.listingId, args.checkIn, args.checkOut] },
  createStayReservation: { routeKey: "storefront.reservation-create", subject: (args) => [args.quoteToken, args.guestEmail] },
  requestStayCancellation: { routeKey: "storefront.cancellation-request", subject: (args) => [args.tripToken] },
  signStayAgreement: { routeKey: "storefront.agreement-sign", subject: (args) => [args.token] }
};
function collectRootFields(selectionSet, fragments, seenFragments = /* @__PURE__ */ new Set()) {
  const fields = [];
  for (const selection of selectionSet.selections) {
    if (selection.kind === import_graphql.Kind.FIELD) fields.push(selection);
    if (selection.kind === import_graphql.Kind.INLINE_FRAGMENT) fields.push(...collectRootFields(selection.selectionSet, fragments, seenFragments));
    if (selection.kind === import_graphql.Kind.FRAGMENT_SPREAD && !seenFragments.has(selection.name.value)) {
      seenFragments.add(selection.name.value);
      const fragment = fragments[selection.name.value];
      if (fragment) fields.push(...collectRootFields(fragment.selectionSet, fragments, seenFragments));
    }
  }
  return fields;
}
function createAbuseControlGraphqlPlugin() {
  return {
    async requestDidStart() {
      return {
        async didResolveOperation(requestContext) {
          const operation = requestContext.operation;
          if (!operation) return;
          const schema = requestContext.schema;
          const rootType = operation.operation === "mutation" ? schema.getMutationType() : schema.getQueryType();
          if (!rootType) return;
          const fragments = requestContext.document.definitions.reduce((result, definition) => {
            if (definition.kind === import_graphql.Kind.FRAGMENT_DEFINITION) result[definition.name.value] = definition;
            return result;
          }, {});
          const fields = collectRootFields(operation.selectionSet, fragments);
          const occurrences = /* @__PURE__ */ new Map();
          for (const node of fields) {
            const fieldName = node.name.value;
            const protectedOperation = OPERATIONS[fieldName];
            if (!protectedOperation) continue;
            const field = rootType.getFields()[fieldName];
            if (!field) continue;
            const args = (0, import_graphql.getArgumentValues)(field, node, requestContext.request.variables || {});
            const occurrence = occurrences.get(fieldName) || 0;
            occurrences.set(fieldName, occurrence + 1);
            await enforceAbuseControl({
              routeKey: protectedOperation.routeKey,
              requestInput: args,
              subjectParts: protectedOperation.subject(args),
              headers: requestContext.contextValue?.req?.headers,
              operationScope: `${node.alias?.value || fieldName}:${occurrence}`
            });
          }
        }
      };
    }
  };
}
var PROTECTED_GRAPHQL_OPERATIONS = Object.freeze({ ...OPERATIONS });

// features/keystone/lib/runtimeSecrets.ts
var DEVELOPMENT_SESSION_SECRET = "openfront-local-development-session-secret-only";
function resolveSessionSecret(environment = process.env) {
  const configured = environment.SESSION_SECRET?.trim();
  if (configured) {
    if (configured.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
    return configured;
  }
  if (environment.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production.");
  }
  return DEVELOPMENT_SESSION_SECRET;
}

// features/keystone/index.ts
var databaseURL = process.env.DATABASE_URL || "file:./keystone.db";
assertAbuseControlRuntimeReady();
var sessionConfig = {
  maxAge: 60 * 60 * 24,
  secret: resolveSessionSecret()
};
var {
  S3_BUCKET_NAME: bucketName = "keystone-test",
  S3_REGION: region = "ap-southeast-2",
  S3_ACCESS_KEY_ID: accessKeyId = "keystone",
  S3_SECRET_ACCESS_KEY: secretAccessKey = "keystone",
  S3_ENDPOINT: endpoint = "https://sfo3.digitaloceanspaces.com"
} = process.env;
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
      await sendPasswordResetEmail(args.token, args.identity);
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
      url: databaseURL
    },
    lists: models,
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
        forcePathStyle: true
      }
    },
    ui: {
      isAccessAllowed: ({ session }) => session?.data.role?.canAccessDashboard ?? false
    },
    session: (0, import_session.statelessSessions)(sessionConfig),
    graphql: {
      extendGraphqlSchema,
      bodyParser: { limit: "64kb" },
      apolloConfig: { plugins: [createAbuseControlGraphqlPlugin()] }
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
