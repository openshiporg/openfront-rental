'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { calendarErrorPath, validateCalendarBlockRange } from '../lib/calendarRange';

function monthRange(month?: string) {
  const now = new Date();
  const start = /^\d{4}-\d{2}$/.test(month || '') ? `${month}-01` : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const endDate = new Date(`${start}T00:00:00.000Z`);
  endDate.setUTCMonth(endDate.getUTCMonth() + 1);
  return { start, end: endDate.toISOString().slice(0, 10), month: start.slice(0, 7) };
}

export async function getHostCalendar({ month }: { month?: string } = {}) {
  const range = monthRange(month);
  const response = await keystoneClient<any>(`
    query HostCalendar($blockWhere: CalendarBlockWhereInput!) {
      listings(where: { status: { equals: "published" } }, orderBy: [{ title: asc }], take: 100) {
        id title slug status hostOrganization { id name } property { id name address { publicLocationLabel } }
      }
      calendarBlocks(where: $blockWhere, orderBy: [{ startDate: asc }], take: 500) {
        id startDate endDate reason status source notes
        listing { id title }
        reservation { id confirmationCode status checkInDate checkOutDate guest { name } }
      }
      propertyTasks(orderBy: [{ dueAt: asc }], take: 500) {
        id title taskType status priority dueAt
        property { id name }
        listing { id title }
        reservation { id confirmationCode guest { name } }
        assignee { id name }
      }
    }
  `, { blockWhere: { AND: [{ startDate: { lt: range.end } }, { endDate: { gt: range.start } }] } });
  if (!response.success) return { listings: [], blocks: [], tasks: [], ...range, error: 'Calendar data is temporarily unavailable.' };
  const tasks = (response.data.propertyTasks || []).filter((task: any) => task.dueAt && task.dueAt.slice(0, 10) >= range.start && task.dueAt.slice(0, 10) < range.end);
  return { listings: response.data.listings || [], blocks: response.data.calendarBlocks || [], tasks, ...range, error: null };
}

export async function createHostCalendarBlock(formData: FormData) {
  const [listingId, hostOrganizationId] = String(formData.get('listingKey') || '').split(':');
  const startDate = String(formData.get('startDate') || '');
  const endDate = String(formData.get('endDate') || '');
  const rangeError = validateCalendarBlockRange(startDate, endDate);
  if (!listingId || !hostOrganizationId || rangeError) {
    redirect(calendarErrorPath(rangeError || 'Choose a listing and a valid date range.'));
  }
  const response = await keystoneClient<any>(`
    mutation CreateCalendarBlock($data: CalendarBlockCreateInput!) { createCalendarBlock(data: $data) { id } }
  `, { data: {
    hostOrganization: { connect: { id: hostOrganizationId } },
    listing: { connect: { id: listingId } },
    startDate,
    endDate,
    reason: String(formData.get('reason') || 'owner_block'),
    status: 'active',
    source: 'operator',
    notes: String(formData.get('notes') || '').trim(),
  } });
  if (!response.success) redirect(calendarErrorPath('Calendar availability changed or a stay now conflicts. Refresh and try again.'));
  revalidatePath('/dashboard/platform/calendar');
}

export async function releaseHostCalendarBlock(formData: FormData) {
  const id = String(formData.get('blockId') || '');
  const response = await keystoneClient<any>(`
    mutation ReleaseCalendarBlock($id: ID!) { updateCalendarBlock(where: { id: $id }, data: { status: "released" }) { id status } }
  `, { id });
  if (!response.success) redirect(calendarErrorPath('The calendar block changed before it could be released. Refresh and try again.'));
  revalidatePath('/dashboard/platform/calendar');
}
