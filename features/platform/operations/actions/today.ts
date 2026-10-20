'use server';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { OPERATIONAL_PROPERTY_SELECTION, operationalLocalToday } from '@/features/platform/operations/lib/operationalProperty';

const STAY = `id confirmationCode status paymentStatus testMode fixtureOrigin checkInDate checkOutDate totalAmountCents amountPaidCents currencyCode guest { name } listing { title property { name timezone } } ${OPERATIONAL_PROPERTY_SELECTION}`;
const PREVIEW = 25;
const REFUND_TOTAL_LIMIT = 500;
const CONVERSATION_PREVIEW = 50;
const OPEN_TASK_STATUSES = ['queued', 'assigned', 'in_progress', 'blocked'];
const LIVE_PROPERTY = '{ status: { in: ["onboarding", "active", "paused"] } }';

/** Stays whose date field is today at the property they're allocated to (the reservation queue uses the same predicate). */
const localToday = operationalLocalToday;

/**
 * One read for the merchant home. Lists are bounded previews; every count is the full
 * matching count, and refund totals are kept per currency.
 */
export async function getTodayOverview() {
  const now = new Date();
  const response = await keystoneClient<any>(`
    query TodayOverview($arrivalDay: ReservationWhereInput!, $departureDay: ReservationWhereInput!, $dueBy: DateTime!, $openTasks: [String!]!) {
      firstZone: properties(where: ${LIVE_PROPERTY}, orderBy: [{ timezone: asc }], take: 1) { timezone }
      lastZone: properties(where: ${LIVE_PROPERTY}, orderBy: [{ timezone: desc }], take: 1) { timezone }
      arrivals: reservations(where: { AND: [$arrivalDay, { status: { equals: "confirmed" } }] }, orderBy: [{ confirmationCode: asc }], take: ${PREVIEW}) { ${STAY} }
      arrivalsCount: reservationsCount(where: { AND: [$arrivalDay, { status: { equals: "confirmed" } }] })
      departures: reservations(where: { AND: [$departureDay, { status: { equals: "in_stay" } }] }, orderBy: [{ confirmationCode: asc }], take: ${PREVIEW}) { ${STAY} }
      departuresCount: reservationsCount(where: { AND: [$departureDay, { status: { equals: "in_stay" } }] })
      inHouse: reservations(where: { status: { equals: "in_stay" } }, orderBy: [{ checkOutDate: asc }, { id: asc }], take: ${PREVIEW}) { ${STAY} }
      inHouseCount: reservationsCount(where: { status: { equals: "in_stay" } })
      requests: reservations(where: { status: { equals: "pending" } }, orderBy: [{ checkInDate: asc }, { id: asc }], take: ${PREVIEW}) { ${STAY} }
      requestsCount: reservationsCount(where: { status: { equals: "pending" } })
      unpaid: reservations(where: { status: { in: ["confirmed", "in_stay"] }, paymentStatus: { in: ["unpaid", "partial"] } }, orderBy: [{ checkInDate: asc }, { id: asc }], take: ${PREVIEW}) { ${STAY} }
      unpaidCount: reservationsCount(where: { status: { in: ["confirmed", "in_stay"] }, paymentStatus: { in: ["unpaid", "partial"] } })
      refunds(where: { status: { in: ["pending", "processing", "failed"] } }, orderBy: [{ createdAt: asc }, { id: asc }], take: ${PREVIEW}) {
        id refundNumber status amountCents currencyCode payment { id } reservation { id confirmationCode guest { name } }
      }
      refundsCount(where: { status: { in: ["pending", "processing", "failed"] } })
      refundAmounts: refunds(where: { status: { in: ["pending", "processing", "failed"] } }, orderBy: [{ id: asc }], take: ${REFUND_TOTAL_LIMIT}) { amountCents currencyCode }
      tasks: propertyTasks(where: { status: { in: $openTasks }, dueAt: { lte: $dueBy } }, orderBy: [{ dueAt: asc }, { id: asc }], take: ${PREVIEW}) {
        id title status dueAt property { name timezone } assignee { name }
      }
      tasksCount: propertyTasksCount(where: { status: { in: $openTasks }, dueAt: { lte: $dueBy } })
      conversations(where: { status: { equals: "open" } }, orderBy: [{ lastMessageAt: desc }, { id: asc }], take: ${CONVERSATION_PREVIEW}) {
        id subject lastMessageAt guest { name } messages(orderBy: [{ createdAt: desc }], take: 1) { direction status }
      }
      conversationsCount(where: { status: { equals: "open" } })
    }
  `, {
    arrivalDay: localToday('checkInDate', now),
    departureDay: localToday('checkOutDate', now),
    dueBy: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    openTasks: OPEN_TASK_STATUSES,
  });
  if (!response.success) return { today: null, timeZone: null, data: null, error: 'Today’s overview couldn’t be loaded.' };
  const data = response.data;
  // One shared zone (first and last by name agree) gives the page a single date to show.
  const first = data.firstZone?.[0]?.timezone;
  const timeZone = first && first === data.lastZone?.[0]?.timezone ? String(first) : null;
  return {
    today: timeZone ? zonedTodayIso(timeZone, now) : null,
    timeZone,
    data: {
      ...data,
      refundTotalsComplete: (data.refundAmounts || []).length >= (data.refundsCount || 0),
      conversationsComplete: (data.conversations || []).length >= (data.conversationsCount || 0),
    },
    error: null,
  };
}
