'use server';

import { revalidatePath } from 'next/cache';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';

export async function getChannelWorkspace() {
  const response = await keystoneClient<any>(`
    query ChannelWorkspace {
      channelConnections(orderBy: [{ name: asc }], take: 100) { id name provider connectionType status settings syncAvailability syncRates syncReservations syncMessages lastSyncedAt lastError hostOrganization { id name } channelListings(take: 100) { id externalListingId status listing { id title } } }
      dataExchangeJobs(orderBy: [{ createdAt: desc }], take: 100) { id direction domain format status sourceLabel processedCount createdCount updatedCount skippedCount conflictCount payloadSha256 errorMessage completedAt listing { title } channelConnection { name } }
      channelSyncEvents(orderBy: [{ occurredAt: desc }], take: 100) { id action status message attempts occurredAt channelConnection { name } }
    }
  `);
  if (!response.success) return { connections: [], jobs: [], events: [], error: response.error };
  return { connections: response.data.channelConnections || [], jobs: response.data.dataExchangeJobs || [], events: response.data.channelSyncEvents || [], error: null };
}

export async function importCalendarAction(formData: FormData): Promise<void> {
  const [channelConnectionId, listingId] = String(formData.get('mappingKey') || '').split(':');
  const response = await keystoneClient<any>(`
    mutation ImportCalendar($channelConnectionId: ID!, $listingId: ID!, $calendarText: String!, $sourceLabel: String) {
      importListingCalendar(channelConnectionId: $channelConnectionId, listingId: $listingId, calendarText: $calendarText, sourceLabel: $sourceLabel)
    }
  `, { channelConnectionId, listingId, calendarText: String(formData.get('calendarText') || ''), sourceLabel: String(formData.get('sourceLabel') || '') || null });
  if (!response.success) throw new Error(response.error);
  revalidatePath('/dashboard/platform/channels');
  revalidatePath('/dashboard/platform/calendar');
}
