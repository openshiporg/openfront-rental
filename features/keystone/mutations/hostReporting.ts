import crypto from 'node:crypto';
import { GraphQLError } from 'graphql';

import { assertHostOrganizationAccess } from '../utils/hostOrganizationAccess';
import { isRealMoneyTender, tenderKind } from '../utils/tenderProvenance';
import { enqueueOutboxEvent } from '../utils/outbox';
import { REAL_CAPACITY_BLOCK, REAL_STAY, SAMPLE_STATEMENT } from '../utils/fixtureOrigin';

const DAY_MS = 86_400_000;
const PAGE_SIZE = 1000;
const MAX_REPORT_NIGHTS = 366;
const reportLimits = { units: 5000, listings: 5000, reservations: 20000, blocks: 50000, amendments: 5000 };
const ARCHIVE_VERSION = 3;
const ARCHIVE_MAX_RECORDS = 50000;
const excludedStayStatuses = ['cancelled', 'no_show', 'inquiry', 'quoted'];
const settledPaymentStatuses = ['succeeded', 'partially_refunded', 'refunded'];
const issuedStatementStatuses = ['approved', 'sent', 'paid'];

type ScopedPermission = 'canReadReports' | 'canManageReports' | 'canReadPayouts' | 'canManagePayouts';
const contextPermissions: ScopedPermission[] = ['canReadReports', 'canManageReports', 'canReadPayouts', 'canManagePayouts'];

function reportError(code: 'BAD_USER_INPUT' | 'FORBIDDEN', message: string) {
  return new GraphQLError(message, { extensions: { code } });
}

/**
 * Host organizations where the operator holds `permission`: every host for platform
 * administrators, otherwise hosts with an active membership. Mirrors host-scoped list access.
 */
export function hostOrganizationScope(context: any, permission: ScopedPermission): Record<string, unknown> | null {
  const session = context.session;
  const role = session?.data?.role;
  if (!session?.itemId || session.data?.isActive !== true || !role?.[permission]) return null;
  if (role.canManageRoles || role.canManagePeople) return {};
  return { memberships: { some: { userId: session.itemId, status: 'active' } } };
}

/** The same scope as a filter on host-owned records. */
export function hostChildScope(context: any, permission: ScopedPermission): Record<string, unknown> | null {
  const scope = hostOrganizationScope(context, permission);
  if (!scope) return null;
  return Object.keys(scope).length ? { hostOrganization: scope } : {};
}

/** Identity only (id and name), so a report or finance reader can pick a host without property access. */
export async function permittedHostOrganizations(_root: unknown, args: { permission: string; search?: string | null }, context: any) {
  const permission = contextPermissions.find((value) => value === args.permission);
  if (!permission) throw reportError('BAD_USER_INPUT', 'Unsupported host permission.');
  const scope = hostOrganizationScope(context, permission);
  if (!scope) return { hosts: [], hasMore: false };
  // A name search reaches any permitted host, including those past the first page.
  const search = typeof args.search === 'string' ? args.search.trim().slice(0, 120) : '';
  const where = search ? { AND: [scope, { name: { contains: search, mode: 'insensitive' } }] } : scope;
  const rows = await context.prisma.hostOrganization.findMany({ where, select: { id: true, name: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }], take: 201 });
  return { hosts: rows.slice(0, 200), hasMore: rows.length > 200 };
}

function dayNumber(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
  return parsed.getTime() / DAY_MS;
}

function reportRange(startDate: string, endDate: string) {
  const startDay = dayNumber(startDate);
  const endDay = dayNumber(endDate);
  if (startDay == null || endDay == null) throw reportError('BAD_USER_INPUT', 'Choose valid report dates in YYYY-MM-DD format.');
  if (endDay <= startDay) throw reportError('BAD_USER_INPUT', 'The report end date must be after its start date.');
  if (endDay - startDay > MAX_REPORT_NIGHTS) throw reportError('BAD_USER_INPUT', `Report ranges are limited to ${MAX_REPORT_NIGHTS} nights.`);
  return { start: startDate, end: endDate, startDay, endDay, nights: endDay - startDay };
}

/** Reads every page up to `max`; reports `complete: false` instead of silently truncating. */
async function readAll<T>(fetchPage: (skip: number, take: number) => Promise<T[]>, max: number) {
  const items: T[] = [];
  for (;;) {
    const take = Math.min(PAGE_SIZE, max + 1 - items.length);
    const page = await fetchPage(items.length, take);
    items.push(...page);
    if (items.length > max) return { items: items.slice(0, max), complete: false };
    if (page.length < take) return { items, complete: true };
  }
}

function addDays(map: Map<string, Set<number>>, key: string, from: number, to: number, skip?: Set<number>) {
  if (from >= to) return;
  const days = map.get(key) || new Set<number>();
  for (let day = from; day < to; day += 1) if (!skip?.has(day)) days.add(day);
  map.set(key, days);
}

type MoneyRow = {
  currencyCode: string;
  lodgingRevenueCents: number | null;
  lodgingNights: number | null;
  adrCents: number | null;
  feeRevenueCents: number | null;
  taxAssessedCents: number | null;
  discountCents: number | null;
  outstandingCents: number | null;
  collectedCents: number;
  refundedCents: number;
  netCollectedCents: number;
  payoutCents: number;
  ownerStatementEarningsCents: number;
  ownerStatementCount: number;
};

export async function hostOperationsReport(
  _root: unknown,
  args: { hostOrganizationId: string; startDate: string; endDate: string },
  context: any,
) {
  const range = reportRange(args.startDate, args.endDate);
  try {
    await assertHostOrganizationAccess({ context, hostOrganizationId: args.hostOrganizationId, permission: 'canReadReports' });
  } catch (error) {
    throw reportError('FORBIDDEN', error instanceof Error ? error.message : 'You do not have access to reports for this host.');
  }
  const hostOrganizationId = args.hostOrganizationId;
  const startAt = new Date(`${range.start}T00:00:00.000Z`);
  const endAt = new Date(`${range.end}T00:00:00.000Z`);

  // Every figure is read from one database snapshot.
  return context.prisma.$transaction(async (tx: any) => {
    const [{ capturedAt }] = await tx.$queryRaw`SELECT now() AS "capturedAt"`;
    const incomplete: string[] = [];

    const units = await readAll<any>((skip, take) => tx.accommodationUnit.findMany({ where: { hostOrganizationId }, select: { id: true, status: true }, orderBy: { id: 'asc' }, skip, take }), reportLimits.units);
    const listings = await readAll<any>((skip, take) => tx.listing.findMany({ where: { hostOrganizationId }, select: { id: true, status: true, accommodationUnitId: true }, orderBy: { id: 'asc' }, skip, take }), reportLimits.listings);
    if (!units.complete || !listings.complete) incomplete.push('supply');
    // Capacity counts physical units once, however many listings sell them.
    const unitKeyOfListing = new Map<string, string>(listings.items.map((listing: any) => [listing.id, listing.accommodationUnitId ? `unit:${listing.accommodationUnitId}` : `listing:${listing.id}`]));
    const availableUnits = new Set(units.items.filter((unit: any) => unit.status === 'available').map((unit: any) => `unit:${unit.id}`));
    const publishedListings = listings.items.filter((listing: any) => listing.status === 'published');
    const sellable = new Set<string>();
    for (const listing of publishedListings) {
      const key = unitKeyOfListing.get(listing.id)!;
      if (key.startsWith('listing:') || availableUnits.has(key)) sellable.add(key);
    }

    const overlap = { hostOrganizationId, checkInDate: { lt: range.end }, checkOutDate: { gt: range.start } };
    const reservations = await readAll<any>((skip, take) => tx.reservation.findMany({
      where: overlap,
      select: {
        id: true, status: true, testMode: true, fixtureOrigin: true, currencyCode: true, checkInDate: true, checkOutDate: true, listingId: true, accommodationUnitId: true,
        lodgingSubtotalCents: true, feeTotalCents: true, taxTotalCents: true, discountTotalCents: true, totalAmountCents: true, amountPaidCents: true,
      },
      orderBy: { id: 'asc' },
      skip,
      take,
    }), reportLimits.reservations);
    if (!reservations.complete) incomplete.push('reservations');
    // Test bookings and onboarding samples are neither real occupancy nor real money.
    const real = (reservation: any) => reservation.testMode !== true && !reservation.fixtureOrigin;
    const active = reservations.items.filter((reservation: any) => !excludedStayStatuses.includes(reservation.status) && real(reservation));
    const moneyStays = active;
    const sampleReservationCount = reservations.items.filter((reservation: any) => reservation.fixtureOrigin).length;

    const occupied = new Map<string, Set<number>>();
    const nightsByCurrency = new Map<string, number>();
    let invalidDates = 0;
    for (const reservation of active) {
      const checkIn = dayNumber(reservation.checkInDate);
      const checkOut = dayNumber(reservation.checkOutDate);
      if (checkIn == null || checkOut == null) { invalidDates += 1; continue; }
      const key = reservation.accommodationUnitId ? `unit:${reservation.accommodationUnitId}` : unitKeyOfListing.get(reservation.listingId) || `reservation:${reservation.id}`;
      const from = Math.max(checkIn, range.startDay);
      const to = Math.min(checkOut, range.endDay);
      addDays(occupied, key, from, to);
      if (to > from) {
        const currency = (reservation.currencyCode || '').toUpperCase();
        nightsByCurrency.set(currency, (nightsByCurrency.get(currency) || 0) + (to - from));
      }
    }
    if (invalidDates) incomplete.push('reservation_dates');

    const blocks = await readAll<any>((skip, take) => tx.calendarBlock.findMany({
      where: { hostOrganizationId, status: 'active', ...REAL_CAPACITY_BLOCK, OR: [{ reason: null }, { reason: { not: 'reservation' } }], startDate: { lt: range.end }, endDate: { gt: range.start } },
      select: { id: true, listingId: true, startDate: true, endDate: true },
      orderBy: { id: 'asc' },
      skip,
      take,
    }), reportLimits.blocks);
    if (!blocks.complete) incomplete.push('calendar_blocks');
    const blocked = new Map<string, Set<number>>();
    for (const block of blocks.items) {
      const key = unitKeyOfListing.get(block.listingId);
      const from = dayNumber(block.startDate);
      const to = dayNumber(block.endDate);
      if (!key || !sellable.has(key) || from == null || to == null) continue;
      // A night is blocked once per unit, and never when it is already booked.
      addDays(blocked, key, Math.max(from, range.startDay), Math.min(to, range.endDay), occupied.get(key));
    }
    const sumDays = (map: Map<string, Set<number>>, keys?: Set<string>) => [...map.entries()].reduce((sum, [key, days]) => sum + (!keys || keys.has(key) ? days.size : 0), 0);
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
      occupancyBasisPoints: capacityNights ? Math.round((occupiedSellableNights * 10_000) / capacityNights) : 0,
    } : null;

    // Lodging is recognized per night from the dated nightly rates, never as the whole stay.
    const moneyStayFilter = { ...overlap, status: { notIn: excludedStayStatuses }, ...REAL_STAY };
    const nightLineGroups = await tx.reservationLineItem.groupBy({
      by: ['currencyCode'],
      where: { lineType: 'night', serviceDate: { gte: range.start, lt: range.end }, reservation: { ...moneyStayFilter, amendments: { none: {} } } },
      _sum: { totalAmountCents: true },
    });
    const pricedStays = await tx.reservationLineItem.groupBy({
      by: ['reservationId'],
      where: { lineType: 'night', reservation: { ...moneyStayFilter, amendments: { none: {} } } },
      _count: { _all: true },
    });
    const amendments = await readAll<any>((skip, take) => tx.reservationAmendment.findMany({
      where: { reservation: moneyStayFilter },
      select: { id: true, reservationId: true, afterSnapshot: true, createdAt: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take,
    }), reportLimits.amendments);
    if (!amendments.complete) incomplete.push('amendments');
    const latestAmendment = new Map<string, any>();
    for (const amendment of amendments.items) if (!latestAmendment.has(amendment.reservationId)) latestAmendment.set(amendment.reservationId, amendment);
    const withNightLines = new Set(pricedStays.map((group: any) => group.reservationId));
    const lodgingByCurrency = new Map<string, number>(nightLineGroups.map((group: any) => [(group.currencyCode || '').toUpperCase(), group._sum?.totalAmountCents || 0]));
    let lodgingEstimatedReservationCount = 0;
    for (const stay of moneyStays) {
      const amendment = latestAmendment.get(stay.id);
      if (!amendment && withNightLines.has(stay.id)) continue;
      const currency = (stay.currencyCode || '').toUpperCase();
      const nights = amendment?.afterSnapshot?.pricingQuote?.nights;
      let cents = 0;
      if (Array.isArray(nights)) {
        cents = nights.filter((night: any) => typeof night?.date === 'string' && night.date >= range.start && night.date < range.end)
          .reduce((sum: number, night: any) => sum + (Number.isSafeInteger(night.amountCents) ? night.amountCents : 0), 0);
      } else {
        // No dated nightly evidence: an estimate that spreads the stay's lodging over its nights
        // in whole cents, the remainder going one cent each to its earliest nights. Each night's
        // share is fixed, so adjacent periods always add up to the stay's lodging.
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
        cents = base * (to - from) + Math.max(Math.min(to, extra) - Math.min(from, extra), 0);
        lodgingEstimatedReservationCount += 1;
      }
      lodgingByCurrency.set(currency, (lodgingByCurrency.get(currency) || 0) + cents);
    }

    const stayCharges = new Map<string, { fee: number; tax: number; discount: number; outstanding: number }>();
    const chargeEntry = (currencyCode: string | null | undefined) => {
      const currency = (currencyCode || '').toUpperCase();
      const entry = stayCharges.get(currency) || { fee: 0, tax: 0, discount: 0, outstanding: 0 };
      stayCharges.set(currency, entry);
      return entry;
    };
    for (const stay of moneyStays) chargeEntry(stay.currencyCode).outstanding += Math.max((stay.totalAmountCents ?? 0) - (stay.amountPaidCents ?? 0), 0);
    // Fees, tax and discounts count once, on the same basis as owner statements: the stay's
    // checkout date falls in the period (start inclusive, end exclusive).
    const checkedOut = await readAll<any>((skip, take) => tx.reservation.findMany({
      where: { hostOrganizationId, checkOutDate: { gte: range.start, lt: range.end }, status: { notIn: excludedStayStatuses }, ...REAL_STAY },
      select: { id: true, currencyCode: true, feeTotalCents: true, taxTotalCents: true, discountTotalCents: true },
      orderBy: { id: 'asc' },
      skip,
      take,
    }), reportLimits.reservations);
    if (!checkedOut.complete) incomplete.push('stay_charges');
    for (const stay of checkedOut.items) {
      const entry = chargeEntry(stay.currencyCode);
      entry.fee += stay.feeTotalCents ?? 0;
      entry.tax += stay.taxTotalCents ?? 0;
      entry.discount += stay.discountTotalCents ?? 0;
    }

    const datedInRange = { OR: [{ processedAt: { gte: startAt, lt: endAt } }, { processedAt: null, createdAt: { gte: startAt, lt: endAt } }] };
    // Real money only, judged per payment, never per booking, from each payment's own evidence
    // (tenderKind): test tender (Stripe test-mode card payments or tender marked test, on any stay)
    // and setup-sample tender are left out; any other recorded money counts, on any stay. Rows are
    // classified here rather than with JSON filters, which would drop payments missing a key.
    const REPORT_ROW_PAGE = 2000;
    const REPORT_ROW_LIMIT = 100_000;
    const readAll = async (delegate: any, args: any) => {
      const rows: any[] = [];
      for (let skip = 0; ; skip += REPORT_ROW_PAGE) {
        const page = await delegate.findMany({ ...args, orderBy: [{ id: 'asc' }], skip, take: REPORT_ROW_PAGE });
        rows.push(...page);
        if (rows.length > REPORT_ROW_LIMIT) throw new Error('This range has too many payments to total. Choose a shorter range.');
        if (page.length < REPORT_ROW_PAGE) return rows;
      }
    };
    const settledPayments = await readAll(tx.payment, {
      where: { hostOrganizationId, status: { in: settledPaymentStatuses }, AND: [datedInRange] },
      select: { amountCents: true, currencyCode: true, provider: true, data: true },
    });
    const succeededRefunds = await readAll(tx.refund, {
      where: { hostOrganizationId, status: 'succeeded', AND: [datedInRange] },
      select: { amountCents: true, currencyCode: true, paymentId: true, payment: { select: { provider: true, data: true } }, reservation: { select: { testMode: true } } },
    });
    const groupSum = (rows: any[]) => {
      const sums = new Map<string, number>();
      for (const row of rows) sums.set(row.currencyCode, (sums.get(row.currencyCode) || 0) + (row.amountCents || 0));
      return [...sums.entries()].map(([currencyCode, amountCents]) => ({ currencyCode, _sum: { amountCents } }));
    };
    const paymentGroups = groupSum(settledPayments.filter((payment: any) => isRealMoneyTender(tenderKind(payment))));
    // A refund returns the kind of money its payment was; one without a payment follows its stay.
    const refundGroups = groupSum(succeededRefunds.filter((refund: any) => (refund.payment ? isRealMoneyTender(tenderKind(refund.payment)) : refund.reservation?.testMode !== true)));
    // Recorded test tender stays as evidence; it is counted, never added to real money.
    const testTenderPaymentCount = settledPayments.filter((payment: any) => tenderKind(payment) === 'test').length;
    // Statements built from setup sample stays, and payouts recorded against them or a sample
    // stay, are setup evidence: kept as recorded, counted, never real owner money.
    const notSamplePayout = { NOT: [{ reservation: { fixtureOrigin: { not: null } } }, { ownerStatement: SAMPLE_STATEMENT }] };
    const payoutGroups = await tx.payout.groupBy({
      by: ['currencyCode'],
      where: { hostOrganizationId, status: 'paid', paidAt: { gte: startAt, lt: endAt }, ...notSamplePayout },
      _sum: { netAmountCents: true },
    });
    const statementGroups = await tx.ownerStatement.groupBy({
      by: ['currencyCode'],
      where: { hostOrganizationId, status: { in: issuedStatementStatuses }, periodStart: { lt: range.end }, periodEnd: { gt: range.start }, NOT: SAMPLE_STATEMENT },
      _sum: { ownerEarningsCents: true },
      _count: { _all: true },
    });
    const sampleStatementCount = await tx.ownerStatement.count({
      where: { hostOrganizationId, status: { in: issuedStatementStatuses }, periodStart: { lt: range.end }, periodEnd: { gt: range.start }, ...SAMPLE_STATEMENT },
    });
    const sumBy = (groups: any[], field: string) => new Map<string, number>(groups.map((group: any) => [(group.currencyCode || '').toUpperCase(), group._sum?.[field] || 0]));
    const collected = sumBy(paymentGroups, 'amountCents');
    const refunded = sumBy(refundGroups, 'amountCents');
    const paidOut = sumBy(payoutGroups, 'netAmountCents');
    const statementEarnings = sumBy(statementGroups, 'ownerEarningsCents');
    const statementCounts = new Map<string, number>(statementGroups.map((group: any) => [(group.currencyCode || '').toUpperCase(), group._count?._all || 0]));

    const stayAmountsComplete = reservations.complete && amendments.complete && checkedOut.complete && !invalidDates;
    if (!stayAmountsComplete) incomplete.push('stay_amounts');
    const currencies = [...new Set([...lodgingByCurrency.keys(), ...stayCharges.keys(), ...collected.keys(), ...refunded.keys(), ...paidOut.keys(), ...statementEarnings.keys()])].filter(Boolean).sort();
    // Different currencies are never added together.
    const money: MoneyRow[] = currencies.map((currencyCode) => {
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
        ownerStatementCount: statementCounts.get(currencyCode) || 0,
      };
    });

    const statusGroups = await tx.reservation.groupBy({ by: ['status'], where: overlap, _count: { _all: true } });
    const sourceGroups = await tx.reservation.groupBy({ by: ['source'], where: overlap, _count: { _all: true } });
    const countsOf = (groups: any[], field: string) => Object.fromEntries(groups.map((group: any) => [group[field] || 'unknown', group._count?._all || 0]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
    const testModeReservationCount = await tx.reservation.count({ where: { ...overlap, testMode: true } });

    const now = capturedAt instanceof Date ? capturedAt : new Date(capturedAt);
    const openTasks = { hostOrganizationId, status: { notIn: ['completed', 'cancelled'] }, dueAt: { lt: endAt } };
    const openTaskCount = await tx.propertyTask.count({ where: openTasks });
    const overdueTaskCount = await tx.propertyTask.count({ where: { ...openTasks, dueAt: { lt: now.getTime() < endAt.getTime() ? now : endAt } } });
    const syncWindow = { hostOrganizationId, occurredAt: { gte: startAt, lt: endAt } };
    const channelSyncFailureCount = await tx.channelSyncEvent.count({ where: { ...syncWindow, status: 'failed' } });
    const lastSuccess = await tx.channelSyncEvent.findFirst({ where: { ...syncWindow, status: 'succeeded' }, orderBy: [{ occurredAt: 'desc' }], select: { occurredAt: true } });

    return {
      version: 2,
      hostOrganizationId,
      startDate: range.start,
      endDate: range.end,
      generatedAt: now.toISOString(),
      complete: incomplete.length === 0,
      incomplete,
      bases: {
        lodging: 'nightly_rates_for_nights_in_range',
        stayCharges: 'fees_tax_and_discounts_of_stays_whose_checkout_date_is_in_range (same as owner statements)',
        lodgingEstimate: 'stays without dated nightly rates: lodging split evenly per night in whole cents, remainder to the earliest nights (an estimate, not captured nightly evidence)',
        outstanding: 'open_balance_of_stays_overlapping_range',
        collections: 'settled_payments_and_completed_refunds_dated_in_range_utc',
        payouts: 'owner_payouts_paid_in_range_utc',
        ownerStatements: 'issued_statements_whose_period_overlaps_range',
        capacity: 'units_available_today_with_a_published_listing',
        pendingOwnerPolicy: ['fee_and_tax_recognition_period'],
      },
      supply,
      money,
      lodgingEstimatedReservationCount: stayAmountsComplete ? lodgingEstimatedReservationCount : null,
      testModeReservationCount,
      testTenderPaymentCount,
      sampleReservationCount,
      sampleStatementCount,
      reservationsByStatus: countsOf(statusGroups, 'status'),
      reservationsBySource: countsOf(sourceGroups, 'source'),
      openTaskCount,
      overdueTaskCount,
      channelSyncFailureCount,
      lastSuccessfulSyncAt: lastSuccess?.occurredAt ? new Date(lastSuccess.occurredAt).toISOString() : null,
    };
  }, { maxWait: 5000, timeout: 30000, isolationLevel: 'RepeatableRead' });
}

function fields(names: string): Record<string, true> {
  return Object.fromEntries(names.split(/\s+/).filter(Boolean).map((name) => [name, true as const]));
}

/** Removes exact address details from captured listing snapshots; public location labels stay. */
function withoutPrivateAddress(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutPrivateAddress);
  if (!value || typeof value !== 'object' || value instanceof Date) return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !['address', 'addressLine1', 'addressLine2', 'postalCode'].includes(key))
    .map(([key, child]) => [key, withoutPrivateAddress(child)]));
}

const refundEvidenceKeys = ['totalAdjustment', 'creditReversals', 'manualReconciliation', 'liabilityType', 'amendmentId', 'policyReviewRequired', 'entitlement', 'declined', 'hostInitiated'];

type ArchiveCollection = { key: string; delegate: string; select: Record<string, true>; where?: (hostOrganizationId: string) => Record<string, unknown>; sanitize?: (row: any) => any };

const archiveCollections: ArchiveCollection[] = [
  { key: 'properties', delegate: 'property', select: fields('id name internalCode propertyType status timezone checkInFrom checkInUntil checkOutBy registrationNumber createdAt updatedAt') },
  { key: 'accommodationUnits', delegate: 'accommodationUnit', select: fields('id propertyId name accommodationType status maxGuests bedroomCount bedCount bathroomCountHalfUnits squareFeet floorLabel createdAt updatedAt') },
  { key: 'listings', delegate: 'listing', select: fields('id propertyId accommodationUnitId title slug subtitle description status bookingMode instantBook isFeatured currencyCode baseNightlyRateCents securityDepositCents minimumStay maximumStay advanceNoticeHours bookingWindowDays createdAt updatedAt') },
  { key: 'ratePlans', delegate: 'ratePlan', select: fields('id listingId cancellationPolicyId name description status currencyCode baseNightlyRateCents minimumStay maximumStay advanceNoticeHours bookingWindowDays isDefault createdAt updatedAt') },
  { key: 'seasonalRates', delegate: 'seasonalRate', select: fields('id ratePlanId name startDate endDate nightlyRateCents adjustmentBasisPoints minimumStay priority isActive createdAt updatedAt') },
  { key: 'feeDefinitions', delegate: 'feeDefinition', select: fields('id listingId name feeType calculation amountCents percentageBasisPoints taxable required isActive createdAt updatedAt') },
  { key: 'taxRules', delegate: 'taxRule', select: fields('id listingId name jurisdiction registrationNumber rateBasisPoints isInclusive isActive createdAt updatedAt') },
  { key: 'cancellationPolicies', delegate: 'cancellationPolicy', select: fields('id name version policyType summary fullTerms freeCancellationHours rules createdAt updatedAt') },
  { key: 'houseRules', delegate: 'houseRule', select: fields('id listingId ruleType title description isAllowed isRequired createdAt updatedAt') },
  { key: 'calendarBlocks', delegate: 'calendarBlock', select: fields('id listingId reservationId startDate endDate reason status source externalUid fixtureOrigin createdAt updatedAt') },
  { key: 'guests', delegate: 'guestProfile', select: fields('id name email phone verificationStatus preferredLanguage marketingConsent createdAt updatedAt') },
  {
    key: 'reservations',
    delegate: 'reservation',
    select: fields('id listingId accommodationUnitId guestId agreementId securityDepositId confirmationCode status paymentStatus source testMode fixtureOrigin fixtureEvidence checkInDate checkOutDate scheduledCheckInTime scheduledCheckOutTime checkedInAt checkedOutAt cancelledAt cancellationReason cancelledBy currencyCode lodgingSubtotalCents feeTotalCents taxTotalCents discountTotalCents securityDepositCents totalAmountCents amountPaidCents bookingSnapshot guestNotes createdAt updatedAt'),
    sanitize: (row) => ({ ...row, bookingSnapshot: withoutPrivateAddress(row.bookingSnapshot) }),
  },
  {
    key: 'reservationLineItems',
    delegate: 'reservationLineItem',
    select: fields('id reservationId snapshotKey lineType description serviceDate quantity unitAmountCents totalAmountCents currencyCode metadataSnapshot createdAt'),
    where: (hostOrganizationId) => ({ OR: [{ hostOrganizationId }, { hostOrganizationId: null, reservation: { hostOrganizationId } }] }),
  },
  { key: 'reservationAmendments', delegate: 'reservationAmendment', select: fields('id reservationId actorUserId reason previousCheckInDate previousCheckOutDate checkInDate checkOutDate currencyCode originalBookingSnapshotHash beforeSnapshot afterSnapshot delta createdAt') },
  {
    key: 'stayAgreements',
    delegate: 'stayAgreement',
    select: fields('id guestId cancellationPolicyId agreementNumber status title signerEmail signatureName signedAt signatureEvidence termsSnapshot createdAt updatedAt'),
    sanitize: (row) => ({ ...row, termsSnapshot: withoutPrivateAddress(row.termsSnapshot) }),
  },
  {
    key: 'payments',
    delegate: 'payment',
    select: fields('id reservationId guestId amountCents refundedAmountCents currencyCode status paymentMethod provider providerPaymentId processedAt data createdAt updatedAt'),
    // Manual attestation, setup-sample and test-mode evidence is kept; provider payloads aren't.
    sanitize: (row) => ({ ...row, data: pickKeys(row.data, paymentEvidenceKeys) }),
  },
  {
    key: 'refunds',
    delegate: 'refund',
    select: fields('id reservationId paymentId reservationAmendmentId refundNumber status reason amountCents currencyCode providerRefundId processedAt data createdAt updatedAt'),
    sanitize: (row) => {
      const data = row.data && typeof row.data === 'object' ? row.data as Record<string, unknown> : {};
      return { ...row, data: Object.fromEntries(refundEvidenceKeys.filter((key) => key in data).map((key) => [key, data[key]])) };
    },
  },
  {
    key: 'securityDeposits',
    delegate: 'securityDeposit',
    select: fields('id paymentId depositNumber status amountCents capturedAmountCents currencyCode heldAt releasedAt providerReference metadata createdAt updatedAt'),
    // The appended event history (each attested hold, capture and release) is part of the record.
    sanitize: (row) => ({ ...row, metadata: pickKeys(row.metadata, ['events']) }),
  },
  // The party on record now (after any host change) and its invitations; the booked party stays in each booking snapshot.
  { key: 'guestParties', delegate: 'guestParty', select: fields('id reservationId primaryGuestId adults children infants pets invitedGuests createdAt updatedAt') },
  { key: 'conversations', delegate: 'conversation', select: fields('id reservationId listingId guestId channelConnectionId subject status guestEmail guestAccessTokenExpiresAt guestAccessTokenRevokedAt lastMessageAt createdAt updatedAt') },
  {
    key: 'messages',
    delegate: 'message',
    select: fields('id conversationId direction senderType status sentAt receivedAt createdAt body'),
    // Message records are kept with their length; free-text bodies are left out (counted in omissions).
    sanitize: ({ body, ...row }) => ({ ...row, bodyLength: typeof body === 'string' ? body.length : 0 }),
  },
  { key: 'listingMedia', delegate: 'listingMedia', select: fields('id listingId imagePath altText caption order createdAt updatedAt') },
  { key: 'bedrooms', delegate: 'bedroom', select: fields('id accommodationUnitId name order createdAt updatedAt') },
  {
    key: 'beds',
    delegate: 'bed',
    select: fields('id bedroomId bedType quantity createdAt updatedAt'),
    where: (hostOrganizationId) => ({ OR: [{ hostOrganizationId }, { hostOrganizationId: null, bedroom: { hostOrganizationId } }] }),
  },
  { key: 'damageClaims', delegate: 'damageClaim', select: fields('id reservationId listingId guestId claimNumber status description claimedAmountCents approvedAmountCents currencyCode evidence settlementEvidence submittedAt resolvedAt createdAt updatedAt') },
  { key: 'owners', delegate: 'propertyOwner', select: fields('id ownerNumber displayName companyName email phone status payoutSchedule defaultManagerCommissionBasisPoints payoutMethod payoutReference taxProfile createdAt updatedAt') },
  { key: 'ownerAssignments', delegate: 'propertyOwnerAssignment', select: fields('id ownerId propertyId status isPrimary ownershipBasisPoints managerCommissionBasisPoints effectiveFrom effectiveTo createdAt updatedAt') },
  { key: 'ownerStatements', delegate: 'ownerStatement', select: fields('id ownerId statementNumber status periodStart periodEnd currencyCode grossRevenueCents taxAmountCents refundAmountCents expenseAmountCents adjustmentAmountCents managerCommissionCents ownerEarningsCents paidOutCents balanceDueCents statementSnapshot generatedAt approvedAt sentAt paidAt paidReference createdAt updatedAt') },
  { key: 'ownerStatementLines', delegate: 'ownerStatementLine', select: fields('id statementId ownerId reservationId refundId payoutId lineKey lineType description serviceDate amountCents sourceId metadata createdAt') },
  { key: 'payouts', delegate: 'payout', select: fields('id reservationId propertyOwnerId ownerStatementId payoutNumber status currencyCode grossAmountCents platformFeeCents managerFeeCents refundAmountCents netAmountCents providerPayoutId scheduledAt paidAt data createdAt updatedAt') },
  { key: 'tasks', delegate: 'propertyTask', select: fields('id propertyId listingId reservationId title taskType status priority dueAt claimedAt startedAt completedAt cancelledAt checklist completionEvidence completionNotes createdAt updatedAt') },
  { key: 'channelConnections', delegate: 'channelConnection', select: fields('id name provider connectionType status syncAvailability syncRates syncReservations syncMessages lastSyncedAt createdAt updatedAt') },
  { key: 'channelListings', delegate: 'channelListing', select: fields('id listingId channelConnectionId externalListingId externalUrl status mapping lastSyncedAt createdAt updatedAt') },
  { key: 'channelSyncEvents', delegate: 'channelSyncEvent', select: fields('id channelConnectionId channelListingId action status attempts occurredAt createdAt') },
  { key: 'reviews', delegate: 'review', select: fields('id reservationId listingId guestId direction status overallRating cleanlinessRating accuracyRating communicationRating locationRating valueRating body submittedAt publishAfter publishedAt createdAt updatedAt') },
];

/**
 * What this archive leaves out, each with the exact number of records omitted at the same
 * database snapshot. This is an operational, financial and legal record export, not a full
 * restorable backup.
 */
const archiveOmissionDefinitions: Array<{ collection: string; reason: string; count: (tx: any, hostOrganizationId: string) => Promise<number> }> = [
  { collection: 'propertyAddresses', reason: 'Exact private addresses are excluded. Address fields are also removed from booking and agreement snapshots, so archived agreement terms no longer match their signed terms hash.', count: (tx, hostOrganizationId) => tx.propertyAddress.count({ where: { hostOrganizationId } }) },
  { collection: 'arrivalInstructions', reason: 'Property arrival instructions are excluded; they can contain access codes.', count: (tx, hostOrganizationId) => tx.property.count({ where: { hostOrganizationId, NOT: { arrivalInstructions: '' } } }) },
  {
    collection: 'internalNotes',
    reason: 'Internal notes on properties, guests, reservations, tasks, calendar blocks and owner assignments are excluded.',
    count: async (tx, hostOrganizationId) => (await Promise.all([
      tx.property.count({ where: { hostOrganizationId, NOT: { internalNotes: '' } } }),
      tx.guestProfile.count({ where: { hostOrganizationId, NOT: { internalNotes: '' } } }),
      tx.reservation.count({ where: { hostOrganizationId, NOT: { internalNotes: '' } } }),
      tx.propertyTask.count({ where: { hostOrganizationId, NOT: { notes: '' } } }),
      tx.calendarBlock.count({ where: { hostOrganizationId, NOT: { notes: '' } } }),
      tx.propertyOwnerAssignment.count({ where: { hostOrganizationId, NOT: { notes: '' } } }),
    ])).reduce((sum: number, count: number) => sum + count, 0),
  },
  { collection: 'messageBodies', reason: 'Message text is excluded (it is free text that can hold personal data); each message record and its length are included.', count: (tx, hostOrganizationId) => tx.message.count({ where: { hostOrganizationId } }) },
  {
    collection: 'messageAttachments',
    reason: 'Message attachments are excluded.',
    count: async (tx, hostOrganizationId) => {
      const [row] = await tx.$queryRaw`SELECT count(*)::int AS "count" FROM "Message" WHERE "hostOrganization" = ${hostOrganizationId} AND "attachments" IS NOT NULL AND "attachments"::text NOT IN ('null', '[]', '{}')`;
      return Number(row?.count || 0);
    },
  },
  { collection: 'reviewPrivateFeedback', reason: 'Private review feedback is excluded.', count: (tx, hostOrganizationId) => tx.review.count({ where: { hostOrganizationId, NOT: { privateFeedback: '' } } }) },
  { collection: 'paymentProviders', reason: 'Provider configuration and credentials are excluded.', count: (tx, hostOrganizationId) => tx.paymentProvider.count({ where: { hostOrganizationId } }) },
  { collection: 'paymentProviderPayloads', reason: 'Payment provider payloads and webhook events are excluded; payment and refund evidence kept by this app is included.', count: (tx, hostOrganizationId) => tx.paymentWebhookEvent.count({ where: { hostOrganizationId } }) },
  { collection: 'channelConnectionSettings', reason: 'Channel settings, feed URLs and sync errors are excluded; they can contain access tokens.', count: (tx, hostOrganizationId) => tx.channelConnection.count({ where: { hostOrganizationId } }) },
  { collection: 'stayQuotes', reason: 'Issued quotes are not included; converted ones are captured in each booking snapshot.', count: (tx, hostOrganizationId) => tx.stayQuote.count({ where: { hostOrganizationId } }) },
  { collection: 'mediaFiles', reason: 'Photo and media files are not included; their references are, under listingMedia.', count: (tx, hostOrganizationId) => tx.listingMedia.count({ where: { hostOrganizationId } }) },
  { collection: 'teamAccess', reason: 'Users, memberships and roles are excluded.', count: (tx, hostOrganizationId) => tx.hostMembership.count({ where: { hostOrganizationId } }) },
];

const paymentEvidenceKeys = ['kind', 'provenance', 'attestation', 'scope', 'mode', 'idempotencyKey', 'closedAt', 'closedReason'];

function pickKeys(value: unknown, keys: string[]) {
  const data = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return Object.fromEntries(keys.filter((key) => key in data).map((key) => [key, data[key]]));
}

const archiveContract = {
  scope: 'Operational, financial and legal records of one host, for its own records and review.',
  restorable: false,
  statement: 'This is not a full restorable backup: the omissions listed (with exact counts) are left out, and free text is not checked for personal data.',
  signedTerms: 'Agreement terms here have private address fields removed, so they will not match the signature evidence hash recorded at signing.',
  samples: 'Reservations with fixtureOrigin are onboarding samples created by setup; their money, signatures and reviews are not real activity.',
};

const archivePrivacy = {
  exactPrivateAddresses: false,
  guestContactDetails: true,
  signerNamesAndEmails: true,
  internalNotes: false,
  credentials: false,
  paymentProviderPayloads: false,
  messageContent: false,
  messageMetadata: true,
  privateReviewFeedback: false,
};

export async function exportHostArchive(
  _root: unknown,
  args: { hostOrganizationId: string },
  context: any,
) {
  try {
    await assertHostOrganizationAccess({ context, hostOrganizationId: args.hostOrganizationId, permission: 'canManageReports' });
  } catch (error) {
    throw reportError('FORBIDDEN', error instanceof Error ? error.message : 'You do not have access to export this host.');
  }
  const hostOrganizationId = args.hostOrganizationId;
  // All collections come from one database snapshot; the checksum covers exactly what was read.
  const { archive, counts, capturedAt, omissions } = await context.prisma.$transaction(async (tx: any) => {
    const [{ capturedAt: snapshotAt }] = await tx.$queryRaw`SELECT now() AS "capturedAt"`;
    const capturedIso = (snapshotAt instanceof Date ? snapshotAt : new Date(snapshotAt)).toISOString();
    const host = await tx.hostOrganization.findUnique({
      where: { id: hostOrganizationId },
      select: fields('id name slug organizationType status publicBio publicEmail publicPhone website canonicalUrl federationId dataCustody isPublic createdAt'),
    });
    if (!host) throw reportError('BAD_USER_INPUT', 'Host organization not found.');
    const collections: Record<string, unknown[]> = {};
    const collectionCounts: Record<string, number> = {};
    for (const collection of archiveCollections) {
      const read = await readAll<any>((skip, take) => tx[collection.delegate].findMany({
        where: collection.where ? collection.where(hostOrganizationId) : { hostOrganizationId },
        select: collection.select,
        orderBy: { id: 'asc' },
        skip,
        take,
      }), ARCHIVE_MAX_RECORDS);
      if (!read.complete) {
        throw reportError('BAD_USER_INPUT', `This host has more than ${ARCHIVE_MAX_RECORDS} ${collection.key} records, so a complete archive can't be produced in one export.`);
      }
      collections[collection.key] = collection.sanitize ? read.items.map(collection.sanitize) : read.items;
      collectionCounts[collection.key] = read.items.length;
    }
    // Exact counts of what was left out, from the same snapshot.
    const archiveOmissions: Array<{ collection: string; reason: string; omittedCount: number }> = [];
    for (const omission of archiveOmissionDefinitions) archiveOmissions.push({ collection: omission.collection, reason: omission.reason, omittedCount: await omission.count(tx, hostOrganizationId) });
    return {
      capturedAt: capturedIso,
      counts: collectionCounts,
      omissions: archiveOmissions,
      archive: {
        format: 'openfront-rental.host-archive',
        version: ARCHIVE_VERSION,
        exportedAt: capturedIso,
        snapshot: { isolation: 'repeatable_read', capturedAt: capturedIso, note: 'capturedAt is the database time when this export read its snapshot; it is not a PostgreSQL snapshot identifier.' },
        manifest: { contract: archiveContract, collections: collectionCounts, omissions: archiveOmissions, privacy: archivePrivacy },
        host,
        ...collections,
      },
    };
  }, { maxWait: 5000, timeout: 60000, isolationLevel: 'RepeatableRead' });
  const serialized = JSON.stringify(archive);
  const checksum = crypto.createHash('sha256').update(serialized).digest('hex');
  const idempotencyKey = `host-archive:${hostOrganizationId}:${checksum}`;
  const processedCount = Object.values(counts as Record<string, number>).reduce((sum, count) => sum + count, 0);
  const job = await context.prisma.$transaction(async (tx: any) => {
    const record = await tx.dataExchangeJob.upsert({
      where: { idempotencyKey },
      update: {},
      create: {
        id: crypto.randomUUID(),
        hostOrganizationId,
        direction: 'export',
        domain: 'host_archive',
        format: 'json',
        status: 'succeeded',
        idempotencyKey,
        payloadSha256: checksum,
        sourceLabel: `Host archive v${ARCHIVE_VERSION}`,
        processedCount,
        resultSummary: { version: ARCHIVE_VERSION, snapshotCapturedAt: capturedAt, collections: counts, omissions: omissions.map((omission: any) => ({ collection: omission.collection, omittedCount: omission.omittedCount })), privacy: archivePrivacy },
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });
    await enqueueOutboxEvent(tx, { hostOrganizationId, eventType: 'host_archive.exported', aggregateType: 'DataExchangeJob', aggregateId: record.id, operationKey: idempotencyKey, payload: { jobId: record.id, checksum, version: ARCHIVE_VERSION, snapshotCapturedAt: capturedAt } });
    return record;
  });
  return { jobId: job.id, checksum, archive };
}

export const hostReportingTypeDefs = String.raw`
  type Query {
    """Id and name of the host organizations where the operator holds the given reports or payouts permission."""
    permittedHostOrganizations(permission: String!, search: String): JSON!
  }
`;

export const hostReportingResolvers = {
  Query: {
    permittedHostOrganizations,
  },
};
