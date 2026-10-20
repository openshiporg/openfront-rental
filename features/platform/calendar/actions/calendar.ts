'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { calendarErrorPath, nextCalendarMonth, parseCalendarMonth, validateCalendarBlockRange } from '../lib/calendarRange';
import { propertyLocalRangeBranches } from '../lib/propertyZones';

const ROW_PAGE_SIZE = 100;
const ROW_BLOCK_PAGE = 1500;
// Blocks for one page of rows are read in full up to this bound; beyond it the grid is masked as incomplete.
const ROW_BLOCK_PAGES = 4;
const OPEN_TASK_STATUSES = ['queued', 'assigned', 'in_progress', 'blocked'];
const TURNOVER_TYPES = ['turnover_cleaning', 'readiness_inspection'];

const HOLD_PAGE_SIZE = 200;

export async function getHostCalendar({ month, page = 1, holdPage = 1, listingSearch = '' }: { month?: string; page?: number; holdPage?: number; listingSearch?: string } = {}) {
  const holdSkip = (Math.min(Math.max(1, Math.trunc(holdPage) || 1), 10_000) - 1) * HOLD_PAGE_SIZE;
  const search = listingSearch.trim().slice(0, 120);
  const { month: activeMonth, invalid } = parseCalendarMonth(month, new Date().toISOString().slice(0, 7));
  const start = `${activeMonth}-01`;
  const end = `${nextCalendarMonth(activeMonth)}-01`;
  const range = { month: activeMonth, start, end, invalidMonth: invalid };
  const overlap = { startDate: { lt: end }, endDate: { gt: start } };
  const response = await keystoneClient<any>(`
    query HostCalendar(
      $rowWhere: ListingWhereInput!, $rowTake: Int!, $rowSkip: Int!, $blockableWhere: ListingWhereInput!, $holdWhere: CalendarBlockWhereInput!, $holdSkip: Int!,
      $inMonth: PropertyTaskWhereInput!, $turnoverTypes: [String!]!, $openStatuses: [String!]!, $now: DateTime!
    ) {
      listings(where: $rowWhere, orderBy: [{ title: asc }, { id: asc }], take: $rowTake, skip: $rowSkip) {
        id title slug status hostOrganization { id name } accommodationUnit { id }
        property { id name timezone address { publicLocationLabel } }
      }
      listingsCount(where: $rowWhere)
      blockable: listings(where: $blockableWhere, orderBy: [{ title: asc }, { id: asc }], take: 300) {
        id title status hostOrganization { id } property { name timezone }
      }
      blockableCount: listingsCount(where: $blockableWhere)
      holds: calendarBlocks(where: $holdWhere, orderBy: [{ startDate: asc }, { id: asc }], skip: $holdSkip, take: ${HOLD_PAGE_SIZE}) {
        id startDate endDate reason status source notes listing { id title }
      }
      holdsCount: calendarBlocksCount(where: $holdWhere)
      turnovers: propertyTasks(where: { AND: [$inMonth, { taskType: { in: $turnoverTypes } }] }, orderBy: [{ dueAt: asc }, { id: asc }], take: 100) {
        id title taskType status priority dueAt
        property { id name timezone }
        listing { id title }
        reservation { id confirmationCode guest { name } }
        assignee { id name }
      }
      turnoverCount: propertyTasksCount(where: { AND: [$inMonth, { taskType: { in: $turnoverTypes } }] })
      openTurnoverCount: propertyTasksCount(where: { AND: [$inMonth, { taskType: { in: $turnoverTypes } }, { status: { in: $openStatuses } }] })
      overdueTurnoverCount: propertyTasksCount(where: { AND: [$inMonth, { taskType: { in: $turnoverTypes } }, { status: { in: $openStatuses } }, { dueAt: { lt: $now } }] })
      openRepairCount: propertyTasksCount(where: { AND: [$inMonth, { taskType: { equals: "property_maintenance" } }, { status: { in: $openStatuses } }] })
    }
  `, {
    rowWhere: { status: { equals: 'published' } },
    rowTake: ROW_PAGE_SIZE,
    rowSkip: (Math.max(page, 1) - 1) * ROW_PAGE_SIZE,
    // Holds can be placed before a listing goes live or while it is paused; archived inventory is read-only.
    // A title search reaches any holdable listing past the first page of choices.
    blockableWhere: { status: { in: ['draft', 'published', 'paused'] }, property: { status: { notIn: ['archived'] } }, ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}) },
    holdSkip,
    holdWhere: { AND: [overlap, { status: { equals: 'active' } }, { reservation: null }, { reason: { notIn: ['reservation'] } }] },
    // Each property's own month: the dueAt bounds are applied in the query, before take.
    inMonth: { OR: propertyLocalRangeBranches(start, end) },
    turnoverTypes: TURNOVER_TYPES,
    openStatuses: OPEN_TASK_STATUSES,
    now: new Date().toISOString(),
  });
  if (!response.success) return { ...range, data: null, error: 'Calendar data is temporarily unavailable.' };
  const data = response.data;
  const listings = data.listings || [];
  const listingIds = listings.map((listing: any) => listing.id);
  const unitIds = [...new Set<string>(listings.map((listing: any) => listing.accommodationUnit?.id).filter(Boolean))];

  // Row blocks cover the listings shown plus any alias listing of the same physical unit.
  let blocks: any[] = [];
  let blocksError: string | null = null;
  let blocksComplete = true;
  if (listingIds.length) {
    const where = { AND: [overlap, { status: { equals: 'active' } }, { OR: [{ listing: { id: { in: listingIds } } }, { listing: { accommodationUnit: { id: { in: unitIds } } } }] }] };
    for (let page = 0; page < ROW_BLOCK_PAGES; page += 1) {
      const blockResponse = await keystoneClient<any>(`
        query HostCalendarBlocks($where: CalendarBlockWhereInput!, $skip: Int!) {
          calendarBlocks(where: $where, orderBy: [{ startDate: asc }, { id: asc }], skip: $skip, take: ${ROW_BLOCK_PAGE}) {
            id startDate endDate reason status source notes
            listing { id title accommodationUnit { id } }
            reservation { id confirmationCode status checkInDate checkOutDate guest { name } }
          }
          calendarBlocksCount(where: $where)
        }
      `, { where, skip: page * ROW_BLOCK_PAGE });
      if (!blockResponse.success) { blocksError = 'Stays and holds for these listings couldn’t be loaded.'; break; }
      blocks = [...blocks, ...(blockResponse.data.calendarBlocks || [])];
      const total = blockResponse.data.calendarBlocksCount || 0;
      blocksComplete = total <= blocks.length;
      if (blocksComplete || !(blockResponse.data.calendarBlocks || []).length) break;
    }
  }

  return {
    ...range,
    data: {
      listings,
      listingsCount: data.listingsCount || 0,
      pageSize: ROW_PAGE_SIZE,
      blocks,
      blocksComplete,
      blocksError,
      blockable: data.blockable || [],
      blockableCount: data.blockableCount || 0,
      holds: data.holds || [],
      holdsCount: data.holdsCount || 0,
      turnovers: data.turnovers || [],
      turnoverCount: data.turnoverCount || 0,
      openTurnoverCount: data.openTurnoverCount || 0,
      overdueTurnoverCount: data.overdueTurnoverCount || 0,
      openRepairCount: data.openRepairCount || 0,
    },
    error: null,
  };
}

export type CalendarBlockState = { ok: boolean; message: string; values: Record<string, string>; attempt: number };

const BLOCK_FIELDS = ['listingKey', 'startDate', 'endDate', 'reason', 'notes'];
const BLOCK_REASONS = ['owner_block', 'property_maintenance', 'preparation'];

export async function createHostCalendarBlock(previous: CalendarBlockState, formData: FormData): Promise<CalendarBlockState> {
  const values = Object.fromEntries(BLOCK_FIELDS.map((key) => [key, String(formData.get(key) || '').slice(0, 2000)]));
  const attempt = (previous?.attempt || 0) + 1;
  const fail = (message: string): CalendarBlockState => ({ ok: false, message, values, attempt });
  const [listingId, hostOrganizationId] = values.listingKey.split(':');
  const rangeError = validateCalendarBlockRange(values.startDate, values.endDate);
  if (!listingId || !hostOrganizationId || rangeError) return fail(rangeError || 'Choose a listing and a valid date range.');
  if (!BLOCK_REASONS.includes(values.reason)) return fail('Choose a reason for the hold.');
  const response = await keystoneClient<any>(`
    mutation CreateCalendarBlock($data: CalendarBlockCreateInput!) { createCalendarBlock(data: $data) { id } }
  `, { data: {
    hostOrganization: { connect: { id: hostOrganizationId } },
    listing: { connect: { id: listingId } },
    startDate: values.startDate,
    endDate: values.endDate,
    reason: values.reason,
    status: 'active',
    source: 'operator',
    notes: values.notes.trim(),
  } });
  if (!response.success) {
    const conflict = String(response.errors?.[0]?.message || '').includes('overlaps an active reservation or calendar block');
    return fail(conflict ? 'Those nights overlap a stay or another hold. Choose different dates.' : 'The nights couldn’t be blocked. Refresh and try again.');
  }
  revalidatePath('/dashboard/platform/calendar');
  return { ok: true, message: 'Nights blocked.', values: {}, attempt };
}

export async function releaseHostCalendarBlock(formData: FormData) {
  const id = String(formData.get('blockId') || '');
  const month = String(formData.get('month') || '');
  const page = String(formData.get('page') || '');
  const response = await keystoneClient<any>(`
    mutation ReleaseCalendarBlock($id: ID!) { updateCalendarBlock(where: { id: $id }, data: { status: "released" }) { id status } }
  `, { id });
  if (!response.success) redirect(calendarErrorPath('The calendar block changed before it could be released. Refresh and try again.', month, page));
  revalidatePath('/dashboard/platform/calendar');
}
