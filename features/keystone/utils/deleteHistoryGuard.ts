/**
 * Deleting a record that history points at sets those links to null (every relation here is
 * ON DELETE SET NULL): reservations lose their listing or guest, payments their guest, owner
 * statements their owner, and a whole host organization's records lose their tenant. Records
 * with history are retired (archived, paused, deactivated) instead. A record nothing points at
 * can still be deleted.
 *
 * Each entry names the Prisma model and foreign-key field on the child that points at the
 * parent. `tests/invariants.test.ts` checks every entry against the Prisma schema.
 */
export type HistoryReference = { model: string; field: string; label: string };

const SINGULAR: Record<string, string> = { people: 'person', properties: 'property', 'damage claims': 'damage claim', 'channel listings': 'channel listing' };
function countLabel(count: number, plural: string) {
  if (count !== 1) return `${count} ${plural}`;
  return `1 ${SINGULAR[plural] ?? plural.replace(/s$/, '')}`;
}

export const DELETE_HISTORY: Record<string, { references: HistoryReference[]; instead: string }> = {
  HostOrganization: {
    instead: 'Archive the host organization instead of deleting it.',
    references: [
      { model: 'reservation', field: 'hostOrganizationId', label: 'reservations' },
      { model: 'payment', field: 'hostOrganizationId', label: 'payments' },
      { model: 'payout', field: 'hostOrganizationId', label: 'payouts' },
      { model: 'ownerStatement', field: 'hostOrganizationId', label: 'owner statements' },
      { model: 'property', field: 'hostOrganizationId', label: 'properties' },
      { model: 'listing', field: 'hostOrganizationId', label: 'listings' },
      { model: 'guestProfile', field: 'hostOrganizationId', label: 'guests' },
      { model: 'hostMembership', field: 'hostOrganizationId', label: 'team memberships' },
    ],
  },
  Property: {
    instead: 'Archive the property instead of deleting it.',
    references: [
      { model: 'listing', field: 'propertyId', label: 'listings' },
      { model: 'accommodationUnit', field: 'propertyId', label: 'units' },
      { model: 'propertyTask', field: 'propertyId', label: 'tasks' },
      { model: 'propertyOwnerAssignment', field: 'propertyId', label: 'owner assignments' },
    ],
  },
  Listing: {
    instead: 'Archive the listing instead of deleting it.',
    references: [
      { model: 'reservation', field: 'listingId', label: 'reservations' },
      { model: 'stayQuote', field: 'listingId', label: 'quotes' },
      { model: 'calendarBlock', field: 'listingId', label: 'calendar blocks' },
      { model: 'review', field: 'listingId', label: 'reviews' },
      { model: 'damageClaim', field: 'listingId', label: 'damage claims' },
      { model: 'conversation', field: 'listingId', label: 'conversations' },
      { model: 'propertyTask', field: 'listingId', label: 'tasks' },
      { model: 'channelListing', field: 'listingId', label: 'channel listings' },
    ],
  },
  AccommodationUnit: {
    instead: 'Keep the unit; remove it from the listing instead.',
    references: [
      { model: 'reservation', field: 'accommodationUnitId', label: 'reservations' },
      { model: 'listing', field: 'accommodationUnitId', label: 'listings' },
    ],
  },
  GuestProfile: {
    instead: 'Guest records with stays are kept for the host’s records.',
    references: [
      { model: 'reservation', field: 'guestId', label: 'reservations' },
      { model: 'payment', field: 'guestId', label: 'payments' },
      { model: 'stayAgreement', field: 'guestId', label: 'agreements' },
      { model: 'damageClaim', field: 'guestId', label: 'damage claims' },
      { model: 'review', field: 'guestId', label: 'reviews' },
      { model: 'conversation', field: 'guestId', label: 'conversations' },
    ],
  },
  RatePlan: {
    instead: 'Set the rate plan to inactive instead of deleting it.',
    references: [{ model: 'stayQuote', field: 'ratePlanId', label: 'quotes' }],
  },
  CancellationPolicy: {
    instead: 'Create a new policy version instead of deleting this one.',
    references: [
      { model: 'stayAgreement', field: 'cancellationPolicyId', label: 'signed agreements' },
      { model: 'ratePlan', field: 'cancellationPolicyId', label: 'rate plans' },
    ],
  },
  PropertyOwner: {
    instead: 'Mark the owner inactive instead of deleting them.',
    references: [
      { model: 'ownerStatement', field: 'ownerId', label: 'owner statements' },
      { model: 'payout', field: 'propertyOwnerId', label: 'payouts' },
      { model: 'propertyOwnerAssignment', field: 'ownerId', label: 'property assignments' },
    ],
  },
  ChannelConnection: {
    instead: 'Disconnect the channel instead of deleting it.',
    references: [
      { model: 'channelReservation', field: 'channelConnectionId', label: 'channel reservations' },
      { model: 'channelListing', field: 'channelConnectionId', label: 'channel listings' },
      { model: 'conversation', field: 'channelConnectionId', label: 'conversations' },
    ],
  },
  ChannelListing: {
    instead: 'Pause the channel listing instead of deleting it.',
    references: [{ model: 'channelReservation', field: 'channelListingId', label: 'channel reservations' }],
  },
  ChannelReservation: {
    instead: 'Channel reservations are kept as sync history.',
    references: [{ model: 'calendarBlock', field: 'channelReservationId', label: 'calendar blocks' }],
  },
  Conversation: {
    instead: 'Close the conversation instead of deleting it.',
    references: [{ model: 'message', field: 'conversationId', label: 'messages' }],
  },
  User: {
    instead: 'Turn off Active instead of deleting the account.',
    references: [
      { model: 'reservation', field: 'bookedById', label: 'reservations' },
      { model: 'payment', field: 'processedById', label: 'payments' },
      { model: 'hostMembership', field: 'userId', label: 'team memberships' },
      { model: 'guestProfile', field: 'userId', label: 'guest profiles' },
      { model: 'propertyOwner', field: 'userId', label: 'owner records' },
      { model: 'message', field: 'senderUserId', label: 'messages' },
    ],
  },
  Role: {
    instead: 'Give those people another role first.',
    references: [{ model: 'user', field: 'roleId', label: 'people' }],
  },
};

export async function deleteHistoryProblem(prisma: any, listKey: string, id: string) {
  const rule = DELETE_HISTORY[listKey];
  if (!rule) return null;
  const counts = await Promise.all(rule.references.map(ref => prisma[ref.model].count({ where: { [ref.field]: id } })));
  const found = rule.references.map((ref, i) => counts[i] ? countLabel(counts[i], ref.label) : '').filter(Boolean);
  return found.length ? `This record has ${found.join(', ')}. ${rule.instead}` : null;
}

/** A `validateDelete` hook for the list. */
export function historyDeleteGuard(listKey: string) {
  return async ({ item, context, addValidationError }: any) => {
    if (listKey === 'User' && String(item.id) === String(context.session?.itemId || '')) {
      addValidationError('You can’t delete your own account.');
      return;
    }
    const problem = await deleteHistoryProblem(context.prisma, listKey, String(item.id));
    if (problem) addValidationError(problem);
  };
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
function validDateOnly(value: unknown) {
  if (typeof value !== 'string' || !DATE_ONLY.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * Calendar blocks and seasons are [startDate, endDate): both YYYY-MM-DD, end after start.
 * Returns the readable problem, or null.
 */
export function dateRangeProblem(start: unknown, end: unknown, label: string) {
  if (start == null && end == null) return null;
  if (!validDateOnly(start) || !validDateOnly(end)) return `${label} dates must be real dates in YYYY-MM-DD format.`;
  if (String(end) <= String(start)) return `${label} must end after it starts (the end date is the first day it no longer applies).`;
  return null;
}

/**
 * Keystone refuses `validate` alongside `validateInput`/`validateDelete`, and the host-scoped
 * hooks use `validate`. This composes extra input and delete checks into one `validate`.
 */
export function withChecks(hooks: any, extra: { input?: (args: any) => unknown; delete?: (args: any) => unknown }) {
  const base = hooks?.validate;
  return {
    ...hooks,
    validate: async (args: any) => {
      if (base) await base(args);
      if (args.operation === 'delete') { if (extra.delete) await extra.delete(args); }
      else if (extra.input) await extra.input(args);
    },
  };
}
