import { operationalLocalToday } from '@/features/platform/operations/lib/operationalProperty';
import { propertyTodayBoundary, shiftDay } from '@/features/platform/operations/lib/propertyDates';
import { reservationSourceLabel, reservationSources } from './presentation';

// `arriving_today`/`departing_today` are exactly Today's cohorts: the same per-property local day.
export const reservationQueues = ['all', 'pending', 'confirmed', 'arriving_today', 'in_stay', 'departing_today', 'due_out', 'exceptions'] as const;
export type ReservationQueue = (typeof reservationQueues)[number];

export type ReservationWhere = Record<string, unknown>;

const OPEN_STATUSES = ['inquiry', 'quoted', 'pending', 'confirmed', 'in_stay'];

export function allOf(...parts: Array<ReservationWhere | null | undefined>): ReservationWhere {
  const present = parts.filter(Boolean) as ReservationWhere[];
  return present.length === 1 ? present[0] : { AND: present };
}

/** The workspace's window: every open stay, plus stays that ended in the last 90 days. */
export function reservationScope(now = new Date()): ReservationWhere {
  return { OR: [{ status: { in: OPEN_STATUSES } }, { checkOutDate: { gte: shiftDay(now.toISOString().slice(0, 10), -90) } }] };
}

/** Exact history of one guest, listing or property (by id, never by a name), across all dates. */
export function reservationRelationWhere(relation: { guest?: string | null; listing?: string | null; property?: string | null }): ReservationWhere | null {
  const safe = (value?: string | null) => (value && /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : null);
  const parts: ReservationWhere[] = [];
  if (safe(relation.guest)) parts.push({ guest: { id: { equals: safe(relation.guest) } } });
  if (safe(relation.listing)) parts.push({ listing: { id: { equals: safe(relation.listing) } } });
  if (safe(relation.property)) {
    const id = safe(relation.property) as string;
    parts.push({ OR: [{ accommodationUnit: { property: { id: { equals: id } } } }, { accommodationUnit: null, listing: { property: { id: { equals: id } } } }] });
  }
  return parts.length ? allOf(...parts) : null;
}

export function reservationSearchWhere(q: string): ReservationWhere | null {
  if (!q) return null;
  const contains = { contains: q, mode: 'insensitive' };
  const needle = q.toLowerCase();
  const sources = reservationSources.filter((source) => reservationSourceLabel(source).toLowerCase().includes(needle));
  return {
    OR: [
      { confirmationCode: contains },
      { guest: { name: contains } },
      { guest: { email: contains } },
      { listing: { title: contains } },
      { listing: { property: { name: contains } } },
      ...(sources.length ? [{ source: { in: sources } }] : []),
      ...(sources.includes('direct') ? [{ source: { equals: null } }] : []),
    ],
  };
}

export function reservationSourceWhere(source: string): ReservationWhere | null {
  if (source === 'all') return null;
  return source === 'direct' ? { OR: [{ source: { equals: 'direct' } }, { source: { equals: null } }] } : { source: { equals: source } };
}

/**
 * "On or before the property's today" for a date field. Dates up to UTC yesterday qualify in every
 * zone; `localIds` are the stays on the two zone-dependent days that qualify at their own property.
 */
export function onOrBeforePropertyToday(field: 'checkInDate' | 'checkOutDate', localIds: string[], now = new Date()): ReservationWhere {
  const { reachedEverywhere } = propertyTodayBoundary(now);
  return { OR: [{ [field]: { lte: reachedEverywhere } }, ...(localIds.length ? [{ id: { in: localIds } }] : [])] };
}

export interface PropertyDayClauses {
  /** In-house stays whose checkout date has arrived at their property. */
  dueOut: ReservationWhere;
  /** Confirmed stays whose arrival date has arrived at their property. */
  arrivalDue: ReservationWhere;
}

export function reservationQueueWhere(queue: ReservationQueue, day: PropertyDayClauses, now = new Date()): ReservationWhere | null {
  if (queue === 'pending') return { status: { in: ['inquiry', 'quoted', 'pending'] } };
  if (queue === 'confirmed') return { status: { equals: 'confirmed' } };
  if (queue === 'arriving_today') return allOf({ status: { equals: 'confirmed' } }, operationalLocalToday('checkInDate', now));
  if (queue === 'departing_today') return allOf({ status: { equals: 'in_stay' } }, operationalLocalToday('checkOutDate', now));
  if (queue === 'in_stay') return { status: { equals: 'in_stay' } };
  if (queue === 'due_out') return allOf({ status: { equals: 'in_stay' } }, day.dueOut);
  if (queue === 'exceptions') {
    return {
      OR: [
        { status: { in: ['cancelled', 'no_show'] } },
        { paymentStatus: { in: ['unpaid', 'refund_pending'] } },
        { guest: { verificationStatus: { equals: 'rejected' } } },
      ],
    };
  }
  return null;
}
