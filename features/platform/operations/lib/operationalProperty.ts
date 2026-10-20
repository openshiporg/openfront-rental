import { zonedTodayIso } from '@/features/keystone/utils/stayBookingRules';
import { propertyZoneBranches, type ZoneFilter } from '@/features/platform/calendar/lib/propertyZones';

/**
 * Where a stay actually happens: the property of its allocated unit. The purchased listing's
 * property is used only for a stay with no allocated unit. Purchase evidence (listing, price,
 * terms) stays with the booking; dates, clocks and location follow the current allocation.
 */
export const OPERATIONAL_PROPERTY_SELECTION = 'accommodationUnit { id name property { id name timezone } }';

type StayLike = {
  accommodationUnit?: { property?: { id?: string | null; name?: string | null; timezone?: string | null } | null } | null;
  listing?: { property?: { id?: string | null; name?: string | null; timezone?: string | null } | null } | null;
};

export function operationalProperty(stay: StayLike | null | undefined) {
  const allocated = stay?.accommodationUnit?.property || null;
  return { property: allocated || stay?.listing?.property || null, allocated: Boolean(allocated) };
}

export function operationalTimeZone(stay: StayLike | null | undefined) {
  return operationalProperty(stay).property?.timezone || null;
}

/** The stay's operational property has a timezone matching `timezone`. */
export function operationalTimeZoneWhere(timezone: ZoneFilter) {
  return { OR: [{ accommodationUnit: { property: { timezone } } }, { accommodationUnit: null, listing: { property: { timezone } } }] };
}

/** Stays whose `field` is today on their operational property's own clock. */
export function operationalLocalToday(field: 'checkInDate' | 'checkOutDate', now = new Date()) {
  return { OR: propertyZoneBranches((zone) => zonedTodayIso(zone, now), (day, timezone) => ({ AND: [{ [field]: { equals: day } }, operationalTimeZoneWhere(timezone)] })) };
}

/** Stays at a property, allocated there or (when unallocated) booked through its listing. */
export function operationalPropertyIdWhere(propertyId: string) {
  return { OR: [{ accommodationUnit: { property: { id: { equals: propertyId } } } }, { accommodationUnit: null, listing: { property: { id: { equals: propertyId } } } }] };
}
