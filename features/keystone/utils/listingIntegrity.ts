import { extractRelationshipId } from './hostOrganizationAccess';

const LIVE_RESERVATION_STATUSES = ['pending', 'confirmed', 'in_stay'];

/**
 * One booking mode: `bookingMode` and `instantBook` are kept in agreement on every write,
 * so a request-to-book listing can never confirm instantly through the other flag.
 */
export function coherentBookingMode(resolvedData: any, item: any) {
  if (!resolvedData) return resolvedData;
  if (resolvedData.bookingMode !== undefined) return { ...resolvedData, instantBook: resolvedData.bookingMode === 'instant' };
  if (resolvedData.instantBook !== undefined) return { ...resolvedData, bookingMode: resolvedData.instantBook ? 'instant' : 'request' };
  if (!item) return { ...resolvedData, instantBook: false, bookingMode: 'request' };
  return resolvedData;
}

/**
 * A listing describes one property's accommodation: its unit must belong to its property,
 * and its unit can't change while stays or holds depend on the current one.
 */
export async function assertListingAllocation({ operation, resolvedData, item, context }: any) {
  const unitChange = resolvedData?.accommodationUnit !== undefined;
  const propertyChange = resolvedData?.property !== undefined;
  if (!unitChange && !propertyChange && operation !== 'create') return;
  const unitId = unitChange ? extractRelationshipId(resolvedData.accommodationUnit) : item?.accommodationUnitId || null;
  const propertyId = propertyChange ? extractRelationshipId(resolvedData.property) : item?.propertyId || null;
  if (unitId && propertyId) {
    const unit = await context.prisma.accommodationUnit.findUnique({ where: { id: unitId }, select: { propertyId: true } });
    if (!unit || unit.propertyId !== propertyId) throw new Error('The accommodation unit must belong to the listing’s property.');
  }
  if (operation === 'update' && unitChange && unitId !== (item?.accommodationUnitId || null)) {
    const [liveStay, activeHold] = await Promise.all([
      context.prisma.reservation.findFirst({ where: { listingId: item.id, status: { in: LIVE_RESERVATION_STATUSES } }, select: { id: true } }),
      context.prisma.calendarBlock.findFirst({ where: { listingId: item.id, status: 'active' }, select: { id: true } }),
    ]);
    if (liveStay || activeHold) {
      throw new Error('This listing has upcoming stays or calendar holds on its current unit. Re-accommodate or release them before moving the listing to another unit.');
    }
  }
}
