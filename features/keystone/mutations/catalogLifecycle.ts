import { assertHostOrganizationAccess } from '../utils/hostOrganizationAccess';
import { listingReadinessFor } from '../utils/listingReadiness';
import { enqueueOutboxEvent } from '../utils/outbox';

type Input = Record<string, any>;

// Archived is terminal: restoring archived inventory is an owner policy decision, not a transition.
const transitions = {
  property: {
    onboarding: { activate: 'active', archive: 'archived' },
    active: { pause: 'paused', archive: 'archived' },
    paused: { activate: 'active', archive: 'archived' },
    archived: {},
  },
  listing: {
    draft: { publish: 'published', archive: 'archived' },
    published: { pause: 'paused', archive: 'archived' },
    paused: { publish: 'published', archive: 'archived' },
    archived: {},
  },
} as const satisfies Record<string, Record<string, Record<string, string>>>;

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Moves a property or listing through its lifecycle. The row is locked, the status the operator
 * saw is compared with the current one, and publish prerequisites are re-read under the same
 * lock, so a pause, publish or edit that raced an archive can't revive archived inventory.
 * Raw record updates can't set status (field access), so every status writer goes through here.
 */
export async function transitionCatalogRecord(context: any, input: Input) {
  const kind = text(input.kind);
  if (kind !== 'property' && kind !== 'listing') throw new Error('Choose a property or a listing.');
  const id = text(input.id);
  const expectedStatus = text(input.expectedStatus);
  const transition = text(input.transition);
  const table = kind === 'property' ? 'Property' : 'Listing';
  const delegate = kind === 'property' ? 'property' : 'listing';
  const record = id ? await context.prisma[delegate].findUnique({ where: { id }, select: { hostOrganizationId: true } }) : null;
  if (!record?.hostOrganizationId) throw new Error(`${table} not found.`);
  await assertHostOrganizationAccess({ context, hostOrganizationId: record.hostOrganizationId, permission: kind === 'property' ? 'canManageProperties' : 'canManageListings' });
  return context.prisma.$transaction(async (tx: any) => {
    await tx.$queryRawUnsafe(`SELECT "id" FROM "${table}" WHERE "id" = $1 FOR UPDATE`, id);
    const current = await tx[delegate].findUnique({ where: { id }, select: { id: true, status: true, hostOrganizationId: true } });
    if (!current || current.hostOrganizationId !== record.hostOrganizationId) throw new Error(`${table} not found.`);
    if (current.status !== expectedStatus) throw new Error(`This ${kind} changed before the action was applied. Refresh and try again.`);
    const allowed = transitions[kind] as Record<string, Record<string, string>>;
    const nextStatus = allowed[current.status || '']?.[transition];
    if (!nextStatus) throw new Error(current.status === 'archived' ? `Archived ${kind === 'property' ? 'properties' : 'listings'} are read-only.` : `This ${kind} can no longer take that action. Refresh and try again.`);
    if (kind === 'listing' && nextStatus === 'published') {
      const listing = await tx.listing.findUnique({ where: { id }, select: { accommodationUnit: { select: { id: true, status: true } }, property: { select: { status: true } } } });
      if (!listing?.accommodationUnit?.id || listing.accommodationUnit.status !== 'available') throw new Error('Attach this listing to an available unit before publishing.');
      if (listing.property?.status === 'archived') throw new Error('This listing’s property is archived.');
      // Same price rule as quotes: the effective plan sells, not merely any active plan.
      const readiness = (await listingReadinessFor(tx, [id])).get(id);
      if (!readiness?.priced) throw new Error(`${readiness?.problem || 'No positive nightly rate.'} Guests can’t book a listing without a usable price.`);
    }
    await tx[delegate].update({ where: { id }, data: { status: nextStatus } });
    const now = new Date();
    await enqueueOutboxEvent(tx, {
      hostOrganizationId: current.hostOrganizationId,
      eventType: `${kind}.status_changed`,
      aggregateType: table,
      aggregateId: id,
      operationKey: `status:${current.status}:${nextStatus}:${now.toISOString()}`,
      payload: { [`${kind}Id`]: id, previousStatus: current.status, status: nextStatus, actorUserId: context.session?.itemId || null },
    });
    return { id, status: nextStatus };
  }, { maxWait: 5000, timeout: 10000, isolationLevel: 'ReadCommitted' });
}

/** Archived properties and listings are history: ordinary edits are refused (the database refuses racing ones too). */
export function archivedRecordGuard(label: 'property' | 'listing') {
  return ({ operation, item, addValidationError }: any) => {
    if (operation === 'update' && item?.status === 'archived') {
      addValidationError(`Archived ${label === 'property' ? 'properties' : 'listings'} are read-only.`);
    }
  };
}
