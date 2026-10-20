'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { PAGE_SIZE, pageWindow, requestedPage } from '@/features/platform/operations/lib/listParams';
import { sumByCurrency, type CurrencyTotal } from '@/features/platform/operations/lib/operations';
import { propertyToday, propertyTodayBoundary } from '@/features/platform/operations/lib/propertyDates';
import {
  OPEN_REFUND_WORK_STATUSES, PENDING_PAYMENT_STATUSES, REFUNDABLE_PAYMENT_STATUSES, STAY_OPEN_ITEM_LIMIT,
  stayHistories, stayHistoryCountField, stayHistoryPages, type StayHistory,
} from '../lib/history';
import { availableReservationTransitions, reservationSources, stayBalanceCents, type ReservationTransition } from '../lib/presentation';
import {
  allOf, onOrBeforePropertyToday, reservationQueues, reservationQueueWhere, reservationRelationWhere, reservationScope, reservationSearchWhere, reservationSourceWhere,
  type PropertyDayClauses, type ReservationQueue, type ReservationWhere,
} from '../lib/queues';
import { reservationTransitionErrorPath, reservationTransitionMessages } from '../lib/transitionFeedback';
import { OPERATIONAL_PROPERTY_SELECTION, operationalTimeZone } from '@/features/platform/operations/lib/operationalProperty';

// Queue rows carry no nested lists, so the list stays well inside the GraphQL
// list-path budget; the detail page loads one stay's lines, payments and blocks.
const queueSelection = `
  id confirmationCode status paymentStatus source testMode fixtureOrigin checkInDate checkOutDate
  currencyCode totalAmountCents amountPaidCents
  listing { id title property { id name timezone } }
  ${OPERATIONAL_PROPERTY_SELECTION}
  guest { id name email verificationStatus }
  agreement { id status }
`;

const quoted = (values: string[]) => values.map((value) => JSON.stringify(value)).join(', ');
const refundFields = 'id refundNumber amountCents currencyCode status reason processedAt providerRefundId payment { id provider }';

const detailSelection = `
  id confirmationCode status paymentStatus source testMode fixtureOrigin checkInDate checkOutDate
  scheduledCheckInTime scheduledCheckOutTime checkedInAt checkedOutAt
  currencyCode lodgingSubtotalCents feeTotalCents taxTotalCents discountTotalCents securityDepositCents totalAmountCents amountPaidCents guestNotes internalNotes
  cancelledAt cancellationReason cancelledBy
  listing { id title slug property { id name timezone address { publicLocationLabel } } }
  accommodationUnit { id name maxGuests property { id name timezone address { publicLocationLabel } units(where: { status: { equals: "available" } }, orderBy: [{ name: asc }], take: 25) { id name maxGuests listings(where: { status: { equals: "published" } }, take: 5) { id title } } } }
  guest { id name email phone verificationStatus }
  guestParty { id adults children infants pets }
  agreement { id agreementNumber status signerEmail signedAt signingTokenRevokedAt }
  securityDeposit { id depositNumber status amountCents capturedAmountCents currencyCode heldAt releasedAt providerReference }
  conversation { id status }
  lineItems(orderBy: [{ serviceDate: asc }, { id: asc }], skip: $linesSkip, take: ${stayHistoryPages.lines}) { id lineType description serviceDate quantity unitAmountCents totalAmountCents currencyCode }
  lineItemsCount
  calendarBlocks(orderBy: [{ startDate: asc }, { id: asc }], take: 20) { id startDate endDate reason status source notes }
  calendarBlocksCount
  payments(orderBy: [{ createdAt: desc }, { id: desc }], skip: $paymentsSkip, take: ${stayHistoryPages.payments}) { id amountCents refundedAmountCents currencyCode status paymentMethod provider providerPaymentId processedAt }
  paymentsCount
  pendingPayments: payments(where: { status: { in: [${quoted(PENDING_PAYMENT_STATUSES)}] } }, orderBy: [{ createdAt: asc }, { id: asc }], take: ${STAY_OPEN_ITEM_LIMIT}) { id amountCents currencyCode status provider providerPaymentId data }
  pendingPaymentsCount: paymentsCount(where: { status: { in: [${quoted(PENDING_PAYMENT_STATUSES)}] } })
  refundablePayments: payments(where: { status: { in: [${quoted(REFUNDABLE_PAYMENT_STATUSES)}] } }, orderBy: [{ createdAt: asc }, { id: asc }], take: ${STAY_OPEN_ITEM_LIMIT}) { id amountCents refundedAmountCents currencyCode provider }
  refundablePaymentsCount: paymentsCount(where: { status: { in: [${quoted(REFUNDABLE_PAYMENT_STATUSES)}] } })
  openRefunds: refunds(where: { status: { in: [${quoted(OPEN_REFUND_WORK_STATUSES)}] } }, orderBy: [{ createdAt: asc }, { id: asc }], take: ${STAY_OPEN_ITEM_LIMIT}) { ${refundFields} }
  openRefundsCount: refundsCount(where: { status: { in: [${quoted(OPEN_REFUND_WORK_STATUSES)}] } })
  refunds(where: { status: { notIn: [${quoted(OPEN_REFUND_WORK_STATUSES)}] } }, orderBy: [{ createdAt: desc }, { id: desc }], skip: $refundsSkip, take: ${stayHistoryPages.refunds}) { ${refundFields} }
  refundHistoryCount: refundsCount(where: { status: { notIn: [${quoted(OPEN_REFUND_WORK_STATUSES)}] } })
  amendments(orderBy: [{ createdAt: desc }, { id: desc }], skip: $changesSkip, take: ${stayHistoryPages.changes}) { id previousCheckInDate previousCheckOutDate checkInDate checkOutDate reason delta createdAt }
  amendmentsCount
  openTasks: tasks(where: { status: { notIn: ["completed", "cancelled"] } }, orderBy: [{ dueAt: asc }, { id: asc }], take: 50) { id title taskType status priority dueAt assignee { id name } }
  openTasksCount: tasksCount(where: { status: { notIn: ["completed", "cancelled"] } })
  closedTasks: tasks(where: { status: { in: ["completed", "cancelled"] } }, orderBy: [{ dueAt: desc }, { id: desc }], take: 10) { id title taskType status priority dueAt assignee { id name } }
  tasksCount
  damageClaims(orderBy: [{ createdAt: desc }, { id: desc }], skip: $claimsSkip, take: ${stayHistoryPages.claims}) { id claimNumber status description claimedAmountCents approvedAmountCents currencyCode submittedAt resolvedAt }
  damageClaimsCount
`;

// Bounds for the two whole-set reads behind the queue: stays on the zone-dependent days, and
// balances on open stays. Past either bound the page reports the figure as unavailable.
const ZONE_DEPENDENT_LIMIT = 2000;
const BALANCE_BATCH = 1000;
const BALANCE_BATCHES = 10;

/** Arrival and checkout "today" per stay, decided at each stay's own property. */
async function propertyDayClauses(now: Date): Promise<PropertyDayClauses | null> {
  const { zoneDependent } = propertyTodayBoundary(now);
  const response = await keystoneClient<any>(`
    query ReservationPropertyDay($departing: ReservationWhereInput!, $arriving: ReservationWhereInput!) {
      departing: reservations(where: $departing, orderBy: [{ id: asc }], take: ${ZONE_DEPENDENT_LIMIT}) { id checkOutDate listing { property { timezone } } accommodationUnit { property { timezone } } }
      departingCount: reservationsCount(where: $departing)
      arriving: reservations(where: $arriving, orderBy: [{ id: asc }], take: ${ZONE_DEPENDENT_LIMIT}) { id checkInDate listing { property { timezone } } accommodationUnit { property { timezone } } }
      arrivingCount: reservationsCount(where: $arriving)
    }
  `, {
    departing: { status: { equals: 'in_stay' }, checkOutDate: { in: zoneDependent } },
    arriving: { status: { equals: 'confirmed' }, checkInDate: { in: zoneDependent } },
  });
  if (!response.success) return null;
  const { departing = [], departingCount = 0, arriving = [], arrivingCount = 0 } = response.data;
  if (departingCount > departing.length || arrivingCount > arriving.length) return null;
  const reached = (rows: any[], field: 'checkInDate' | 'checkOutDate') => rows
    .filter((row) => row[field] <= propertyToday(operationalTimeZone(row), now))
    .map((row) => String(row.id));
  return {
    dueOut: onOrBeforePropertyToday('checkOutDate', reached(departing, 'checkOutDate'), now),
    arrivalDue: onOrBeforePropertyToday('checkInDate', reached(arriving, 'checkInDate'), now),
  };
}

/** Balance still owed on open stays in the window, per currency; null when it can't be totalled completely. */
async function outstandingByCurrency(scope: ReservationWhere): Promise<CurrencyTotal[] | null> {
  const where = allOf(scope, { status: { notIn: ['cancelled', 'no_show'] } });
  const rows: any[] = [];
  for (let batch = 0; batch < BALANCE_BATCHES; batch += 1) {
    const response = await keystoneClient<any>(`
      query ReservationBalances($where: ReservationWhereInput!, $skip: Int!) {
        reservations(where: $where, orderBy: [{ id: asc }], skip: $skip, take: ${BALANCE_BATCH}) { currencyCode totalAmountCents amountPaidCents }
      }
    `, { where, skip: batch * BALANCE_BATCH });
    if (!response.success) return null;
    const page = response.data.reservations || [];
    rows.push(...page);
    if (page.length < BALANCE_BATCH) return sumByCurrency(rows, (row: any) => stayBalanceCents(row), (row: any) => row.currencyCode);
  }
  return null;
}

/** One page of the reservation queue, with every tab, tile and filter count taken on the server. */
export async function getReservationWorkspace(input: { view: ReservationQueue; source: string; q: string; page?: string; guest?: string | null; listing?: string | null; property?: string | null; range?: string | null }) {
  const view: ReservationQueue = reservationQueues.includes(input.view) ? input.view : 'all';
  const source = ['all', ...reservationSources].includes(input.source) ? input.source : 'all';
  const q = String(input.q || '').trim().slice(0, 120);
  const unavailable = { reservations: [] as any[], pagination: pageWindow(0, 1), counts: null, sources: [] as Array<{ id: string; count: number }>, outstanding: null, error: 'Reservation data is temporarily unavailable.' };
  const now = new Date();
  const day = await propertyDayClauses(now);
  if (!day) return unavailable;
  // A relation filter (one guest, listing or property, by id) or `range=history` covers the whole
  // history; otherwise the window is open stays plus the last 90 days.
  const relation = reservationRelationWhere(input);
  const scope = relation || input.range === 'history' ? allOf(relation || {}) : reservationScope(now);
  const searched = allOf(scope, reservationSearchWhere(q));
  const filtered = allOf(searched, reservationSourceWhere(source));
  const counts: Record<string, ReservationWhere> = {
    total: scope,
    queried: searched,
    ...Object.fromEntries(reservationQueues.map((queue) => [`tab_${queue}`, allOf(filtered, reservationQueueWhere(queue, day, now))])),
    tile_pending: allOf(scope, reservationQueueWhere('pending', day)),
    tile_confirmed: allOf(scope, reservationQueueWhere('confirmed', day)),
    tile_in_stay: allOf(scope, reservationQueueWhere('in_stay', day)),
    tile_due_out: allOf(scope, reservationQueueWhere('due_out', day)),
    tile_arrival_due: allOf(scope, { status: { equals: 'confirmed' } }, day.arrivalDue),
    ...Object.fromEntries(reservationSources.map((id) => [`source_${id}`, allOf(searched, reservationSourceWhere(id))])),
  };
  const rowsWhere = allOf(filtered, reservationQueueWhere(view, day, now));
  const read = (skip: number, withCounts: boolean) => keystoneClient<any>(`
    query ReservationWorkspace($rows: ReservationWhereInput!, $skip: Int!${withCounts ? Object.keys(counts).map((key) => `, $${key}: ReservationWhereInput!`).join('') : ''}) {
      reservations(where: $rows, orderBy: [{ checkInDate: asc }, { confirmationCode: asc }], skip: $skip, take: ${PAGE_SIZE}) {
        ${queueSelection}
      }
      ${withCounts ? Object.keys(counts).map((key) => `${key}: reservationsCount(where: $${key})`).join('\n      ') : ''}
    }
  `, { rows: rowsWhere, skip, ...(withCounts ? counts : {}) });

  const requested = Math.min(requestedPage(input.page), 100_000);
  const [response, outstanding] = await Promise.all([read((requested - 1) * PAGE_SIZE, true), outstandingByCurrency(scope)]);
  if (!response.success) return unavailable;
  const data = response.data;
  const pagination = pageWindow(data[`tab_${view}`] || 0, requested);
  let reservations = data.reservations || [];
  if (pagination.page !== requested) {
    const retry = await read(pagination.skip, false);
    if (!retry.success) return unavailable;
    reservations = retry.data.reservations || [];
  }
  return {
    reservations,
    pagination,
    counts: {
      total: Number(data.total || 0),
      queried: Number(data.queried || 0),
      tabs: Object.fromEntries(reservationQueues.map((queue) => [queue, Number(data[`tab_${queue}`] || 0)])) as Record<ReservationQueue, number>,
      pending: Number(data.tile_pending || 0),
      confirmed: Number(data.tile_confirmed || 0),
      inStay: Number(data.tile_in_stay || 0),
      dueOut: Number(data.tile_due_out || 0),
      arrivalDue: Number(data.tile_arrival_due || 0),
    },
    sources: reservationSources.map((id) => ({ id, count: Number(data[`source_${id}`] || 0) })),
    outstanding,
    error: null,
  };
}

/** One stay with each history paged (`pages` is 1-based per history); open work is loaded whole. */
export async function getReservationDetail(id: string, requested: Partial<Record<StayHistory, number>> = {}) {
  const read = (pages: Record<StayHistory, number>) => keystoneClient<any>(`
    query ReservationDetail($id: ID!, $linesSkip: Int!, $paymentsSkip: Int!, $refundsSkip: Int!, $claimsSkip: Int!, $changesSkip: Int!) {
      reservation(where: { id: $id }) { ${detailSelection} }
    }
  `, {
    id,
    ...Object.fromEntries(stayHistories.map((history) => [`${history}Skip`, (pages[history] - 1) * stayHistoryPages[history]])),
  });
  let pages = Object.fromEntries(stayHistories.map((history) => [history, Math.min(Math.max(1, Math.trunc(Number(requested[history])) || 1), 100_000)])) as Record<StayHistory, number>;
  let response = await read(pages);
  const first = response.success ? response.data.reservation : null;
  if (first) {
    // A page past the end (records removed, or a stale link) shows the last real page instead.
    const clamped = Object.fromEntries(stayHistories.map((history) => [history, pageWindow(Number(first[stayHistoryCountField[history]] || 0), pages[history], stayHistoryPages[history]).page])) as Record<StayHistory, number>;
    if (stayHistories.some((history) => clamped[history] !== pages[history])) {
      pages = clamped;
      response = await read(pages);
    }
  }
  if (!response.success) return { reservation: null, pages, error: 'Reservation detail is temporarily unavailable.' };
  return { reservation: response.data.reservation || null, pages, error: null };
}

/** Runs one merchant stay command; failures come back as operator-readable messages. */
export async function runHostStayCommand(command: string, input: Record<string, unknown>) {
  const response = await keystoneClient<any>(`
    mutation HostStayCommand($command: String!, $input: JSON!) { hostStayCommand(command: $command, input: $input) }
  `, { command, input });
  // No answer from the server: the command may or may not have been applied.
  if (!response.success) return { ok: false as const, message: reservationTransitionMessages.staleState, data: null, unknown: true as const };
  const result = response.data.hostStayCommand || {};
  return result.ok
    ? { ok: true as const, message: null, data: result.data }
    : { ok: false as const, message: String(result.message || reservationTransitionMessages.staleState), data: null };
}

function value(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

function centsValue(formData: FormData, key: string) {
  const raw = value(formData, key);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) ? parsed : NaN;
}

function stayPath(reservationId: string, params: Record<string, string> = {}) {
  const base = reservationTransitionErrorPath(reservationId, '').replace(/\?error=$/, '');
  const query = new URLSearchParams(params).toString();
  return query ? `${base}?${query}` : base;
}

function refreshStay(reservationId: string, extra: string[] = []) {
  revalidatePath('/dashboard/platform/reservations');
  revalidatePath(`/dashboard/platform/reservations/${reservationId}`);
  revalidatePath('/dashboard/platform/calendar');
  revalidatePath('/dashboard/platform/tasks');
  revalidatePath('/dashboard/platform/payments');
  revalidatePath('/dashboard/platform/agreements');
  for (const path of extra) revalidatePath(path);
}

async function finish(reservationId: string, result: { ok: boolean; message: string | null }, notice: string, returnTo?: string) {
  refreshStay(reservationId);
  const target = returnTo && returnTo.startsWith('/dashboard/platform/') && !returnTo.includes('..') ? returnTo : null;
  if (!result.ok) {
    const message = result.message || reservationTransitionMessages.staleState;
    redirect(target ? `${target}${target.includes('?') ? '&' : '?'}error=${encodeURIComponent(message)}` : reservationTransitionErrorPath(reservationId, message));
  }
  redirect(target ? `${target}${target.includes('?') ? '&' : '?'}notice=${encodeURIComponent(notice)}` : stayPath(reservationId, { notice }));
}

const transitionNotices: Record<string, string> = {
  confirm: 'Stay confirmed.',
  check_in: 'Guest checked in.',
  complete: 'Checkout recorded.',
  cancel: 'Reservation cancelled. Its calendar dates are released.',
  no_show: 'Marked as a no-show. Its calendar dates are released.',
  undo_check_in: 'Check-in undone. The stay is confirmed again.',
  reopen: 'Stay reopened as in stay.',
};

export async function transitionReservation(formData: FormData): Promise<void> {
  const reservationId = value(formData, 'reservationId');
  const transition = value(formData, 'transition') as ReservationTransition;
  const note = value(formData, 'note');
  const status = value(formData, 'status');
  const override = value(formData, 'override') === 'on';
  const returnTo = value(formData, 'returnTo');

  if (!reservationId || !availableReservationTransitions(status).includes(transition)) {
    redirect(reservationTransitionErrorPath(reservationId, reservationTransitionMessages.invalidAction));
  }
  if (transition === 'cancel' && !note) {
    redirect(reservationTransitionErrorPath(reservationId, reservationTransitionMessages.cancellationReason));
  }
  if (note.length > 2000) {
    redirect(reservationTransitionErrorPath(reservationId, reservationTransitionMessages.noteTooLong));
  }
  const result = await runHostStayCommand('transition', { reservationId, transition, note: note || null, override });
  await finish(reservationId, result, transitionNotices[transition] || 'Saved.', returnTo);
}

export async function amendReservationAction(formData: FormData) {
  const reservationId = value(formData, 'reservationId');
  const result = await runHostStayCommand('amend', {
    reservationId,
    expectedCheckInDate: value(formData, 'expectedCheckInDate'),
    expectedCheckOutDate: value(formData, 'expectedCheckOutDate'),
    checkInDate: value(formData, 'checkInDate'),
    checkOutDate: value(formData, 'checkOutDate'),
    reason: value(formData, 'reason'),
    idempotencyKey: value(formData, 'idempotencyKey') || randomUUID(),
  });
  const delta = Number((result.data as any)?.delta?.totalAmountCents || 0);
  const refund = Number((result.data as any)?.refundLiabilityCents || 0);
  await finish(reservationId, result, refund > 0
    ? 'Dates changed. The lower total left a refund to process under Refunds.'
    : delta > 0 ? 'Dates changed. The guest has a new balance to pay.' : 'Dates changed.');
}

export async function reassignReservationAction(formData: FormData) {
  const reservationId = value(formData, 'reservationId');
  const result = await runHostStayCommand('reassign', {
    reservationId,
    targetAccommodationUnitId: value(formData, 'targetAccommodationUnitId'),
    reason: value(formData, 'reason'),
  });
  await finish(reservationId, result, 'Stay moved to the new unit.');
}

function countValue(formData: FormData, key: string) {
  const raw = value(formData, key);
  return /^\d{1,2}$/.test(raw) ? Number(raw) : NaN;
}

export async function amendPartyAction(formData: FormData) {
  const reservationId = value(formData, 'reservationId');
  const counts = { adults: countValue(formData, 'adults'), children: countValue(formData, 'children'), infants: countValue(formData, 'infants'), pets: countValue(formData, 'pets') };
  // A blank or non-numeric count would reach the command as 0, so it's refused here.
  if (Object.values(counts).some((count) => !Number.isSafeInteger(count))) {
    redirect(reservationTransitionErrorPath(reservationId, 'Enter valid guest and pet counts.'));
  }
  const result = await runHostStayCommand('party_amend', { reservationId, ...counts, reason: value(formData, 'reason') });
  await finish(reservationId, result, 'Guests and pets updated.');
}

const depositNotices: Record<string, string> = {
  authorize: 'Deposit recorded as authorized.',
  hold: 'Deposit recorded as held.',
  release: 'Deposit recorded as released.',
  capture: 'Deposit deduction recorded.',
  fail: 'Deposit recorded as failed.',
};

export async function securityDepositAction(formData: FormData) {
  const reservationId = value(formData, 'reservationId');
  const transition = value(formData, 'transition');
  const result = await runHostStayCommand('deposit', {
    depositId: value(formData, 'depositId'),
    transition,
    amountCents: centsValue(formData, 'amountCents'),
    reference: value(formData, 'reference') || null,
    confirmEvidence: value(formData, 'confirmEvidence') === 'on',
    // Rendered once with the form: a resubmission after a lost response is the same action.
    operationKey: value(formData, 'operationKey') || randomUUID(),
  });
  await finish(reservationId, result, depositNotices[transition] || 'Deposit updated.');
}

export async function createDamageClaimAction(formData: FormData) {
  const reservationId = value(formData, 'reservationId');
  const evidence = value(formData, 'evidence').split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 20).map((reference) => ({ reference: reference.slice(0, 500) }));
  const result = await runHostStayCommand('claim_create', {
    reservationId,
    description: value(formData, 'description'),
    claimedAmountCents: centsValue(formData, 'claimedAmountCents') ?? NaN,
    evidence,
  });
  await finish(reservationId, result, 'Damage claim drafted. Submit it when the evidence is complete.');
}

export async function damageClaimTransitionAction(formData: FormData) {
  const reservationId = value(formData, 'reservationId');
  const transition = value(formData, 'transition');
  const result = await runHostStayCommand('claim_transition', {
    claimId: value(formData, 'claimId'),
    transition,
    approvedAmountCents: centsValue(formData, 'approvedAmountCents'),
    settlementMethod: value(formData, 'settlementMethod') || null,
    settlementReference: value(formData, 'settlementReference') || null,
    confirmSettlement: value(formData, 'confirmSettlement') === 'on',
    receivedOn: value(formData, 'receivedOn') || null,
    custody: value(formData, 'custody') || null,
  });
  await finish(reservationId, result, `Claim ${transition.replaceAll('_', ' ')} recorded.`);
}

export async function processRefundAction(formData: FormData) {
  const reservationId = value(formData, 'reservationId');
  const result = await runHostStayCommand('refund_process', {
    refundId: value(formData, 'refundId'),
    amountCents: centsValue(formData, 'amountCents'),
    note: value(formData, 'note'),
  });
  const status = (result.data as any)?.status;
  await finish(reservationId, result, status === 'succeeded'
    ? 'Refund completed in Stripe (test mode).'
    : status === 'processing' ? 'Stripe is still processing the refund. Check its status again shortly.'
      : status === 'failed' ? 'Stripe couldn’t complete the refund. You can try again.' : 'Refund updated.', value(formData, 'returnTo'));
}

export async function assessRefundAction(formData: FormData) {
  const reservationId = value(formData, 'reservationId');
  const result = await runHostStayCommand('refund_assess', {
    refundId: value(formData, 'refundId'),
    amountCents: centsValue(formData, 'amountCents') ?? NaN,
    note: value(formData, 'note'),
  });
  await finish(reservationId, result, 'Refund assessed. It’s now owed to the guest and ready to issue.', value(formData, 'returnTo'));
}

export async function declineRefundAction(formData: FormData) {
  const reservationId = value(formData, 'reservationId');
  const result = await runHostStayCommand('refund_decline', { refundId: value(formData, 'refundId'), note: value(formData, 'note') });
  await finish(reservationId, result, 'Refund declined and closed. No money was returned.', value(formData, 'returnTo'));
}

export async function recordManualRefundAction(formData: FormData) {
  const reservationId = value(formData, 'reservationId');
  const result = await runHostStayCommand('refund_record_manual', {
    refundId: value(formData, 'refundId') || null,
    paymentId: value(formData, 'paymentId'),
    amountCents: centsValue(formData, 'amountCents') ?? NaN,
    reason: value(formData, 'reason') || null,
    note: value(formData, 'note'),
    evidenceReference: value(formData, 'evidenceReference'),
    confirmFundsReturned: value(formData, 'confirmFundsReturned') === 'on',
    operationKey: value(formData, 'operationKey') || randomUUID(),
  });
  await finish(reservationId, result, 'Manual refund recorded.', value(formData, 'returnTo'));
}

export async function createRefundAction(formData: FormData) {
  const reservationId = value(formData, 'reservationId');
  const result = await runHostStayCommand('refund_create', {
    paymentId: value(formData, 'paymentId'),
    amountCents: centsValue(formData, 'amountCents') ?? NaN,
    reason: value(formData, 'reason'),
    note: value(formData, 'note'),
    operationKey: value(formData, 'operationKey') || randomUUID(),
  });
  const status = (result.data as any)?.status;
  await finish(reservationId, result, status === 'succeeded'
    ? 'Refund completed in Stripe (test mode).'
    : status === 'processing' ? 'Refund sent to Stripe and still processing.'
      : status === 'failed' ? 'Stripe couldn’t complete the refund. You can try again from Refunds.'
        : 'Refund opened. Record it once you’ve returned the money.', value(formData, 'returnTo'));
}

export async function cancelPaymentAttemptAction(formData: FormData) {
  const reservationId = value(formData, 'reservationId');
  const result = await runHostStayCommand('payment_cancel_attempt', {
    paymentId: value(formData, 'paymentId'),
    reason: value(formData, 'reason'),
  });
  const status = (result.data as any)?.status;
  await finish(reservationId, result, status === 'succeeded' ? 'Stripe reports this payment as paid, so it was recorded instead of closed.' : 'Payment attempt closed. Its reserved balance is released.');
}

export async function recordManualPaymentAction(formData: FormData) {
  const reservationId = value(formData, 'reservationId');
  const result = await runHostStayCommand('payment_record_manual', {
    reservationId,
    amountCents: centsValue(formData, 'amountCents') ?? NaN,
    confirmReceived: value(formData, 'confirmReceived') === 'on',
    operationKey: value(formData, 'operationKey'),
  });
  if (!result.ok) {
    // The same receipt keeps its operation key when the form comes back, so retrying it can
    // only ever return the receipt already recorded, never add a second one.
    refreshStay(reservationId);
    const key = value(formData, 'operationKey');
    redirect(`${reservationTransitionErrorPath(reservationId, result.message || reservationTransitionMessages.staleState)}${/^[A-Za-z0-9-]{8,80}$/.test(key) ? `&paymentOp=${encodeURIComponent(key)}` : ''}`);
  }
  await finish(reservationId, result, 'Payment recorded against the stay.');
}
