'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import { PAGE_SIZE, pageWindow, requestedPage } from '@/features/platform/operations/lib/listParams';
import { calendarImportOperatorMessage, installedChannelConnection, supportedChannelConnections } from '@/features/integrations/channels/support';

const CHANNELS_PATH = '/dashboard/platform/channels';
const CONNECTION_STATUSES = ['active', 'paused', 'disconnected'];
const MAPPING_STATUSES = ['mapped', 'published', 'paused'];

type ChannelForm = 'import' | 'connection' | 'mapping';

function channelPath(params: Record<string, string>, hash = '') {
  const query = new URLSearchParams(params).toString();
  return `${CHANNELS_PATH}${query ? `?${query}` : ''}${hash}`;
}

function fail(form: ChannelForm, message: string): never {
  redirect(channelPath({ form, error: message }));
}

function field(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

function refreshChannels() {
  revalidatePath(CHANNELS_PATH);
  revalidatePath('/dashboard/platform/calendar');
}

const JOB_FIELDS = 'id direction domain format status sourceLabel processedCount createdCount updatedCount skippedCount conflictCount payloadSha256 errorMessage completedAt listing { id title } channelConnection { id name }';
const EVENT_FIELDS = 'id action status message errorMessage attempts occurredAt channelConnection { id name } channelListing { id listing { title } }';
const insensitive = (q: string) => ({ contains: q, mode: 'insensitive' });

/**
 * Connections (searched on the server), one searched page of import jobs or sync log, and the
 * most recent jobs and events behind the attention list. Every job and event is reachable
 * through search and paging; counts are the full matching counts.
 */
export async function getChannelWorkspace(input: { view: 'all' | 'jobs' | 'events'; q: string; page?: string; jobId?: string | null } = { view: 'all', q: '' }) {
  const q = String(input.q || '').trim().slice(0, 120);
  const connectionWhere = q ? { OR: [{ name: insensitive(q) }, { provider: insensitive(q) }, { connectionType: insensitive(q) }, { channelListings: { some: { listing: { title: insensitive(q) } } } }] } : {};
  const jobWhere = q ? { OR: [{ channelConnection: { name: insensitive(q) } }, { domain: insensitive(q) }, { sourceLabel: insensitive(q) }, { listing: { title: insensitive(q) } }, { status: { equals: q.toLowerCase().replace(/\s+/g, '_') } }] } : {};
  const eventWhere = q ? { OR: [{ channelConnection: { name: insensitive(q) } }, { channelListing: { listing: { title: insensitive(q) } } }, { action: insensitive(q) }, { message: insensitive(q) }, { status: { equals: q.toLowerCase().replace(/\s+/g, '_') } }] } : {};
  const jobId = input.jobId && /^[A-Za-z0-9_-]{1,64}$/.test(input.jobId) ? input.jobId : '';
  const read = (skip: number) => keystoneClient<any>(`
    query ChannelWorkspace($connectionWhere: ChannelConnectionWhereInput!, $jobWhere: DataExchangeJobWhereInput!, $eventWhere: ChannelSyncEventWhereInput!${input.view !== 'all' ? ', $skip: Int!, $take: Int!' : ''}${jobId ? ', $jobId: ID!' : ''}) {
      channelConnectionsCount
      connectionsMatching: channelConnectionsCount(where: $connectionWhere)
      channelConnections(where: $connectionWhere, orderBy: [{ name: asc }, { id: asc }], take: 100) {
        id name provider connectionType status syncAvailability syncRates syncReservations syncMessages lastSyncedAt lastError
        hostOrganization { id name }
        channelListingsCount
        channelListings(orderBy: [{ createdAt: asc }, { id: asc }], take: 50) { id externalListingId status lastSyncedAt lastImportIssue listing { id title } }
      }
      dataExchangeJobsCount
      jobsMatching: dataExchangeJobsCount(where: $jobWhere)
      ${input.view === 'jobs' ? `jobPage: dataExchangeJobs(where: $jobWhere, orderBy: [{ createdAt: desc }, { id: desc }], skip: $skip, take: $take) { ${JOB_FIELDS} }` : ''}
      recentJobs: dataExchangeJobs(orderBy: [{ createdAt: desc }, { id: desc }], take: 100) { ${JOB_FIELDS} }
      ${jobId ? `resultJob: dataExchangeJob(where: { id: $jobId }) { ${JOB_FIELDS} }` : ''}
      channelSyncEventsCount
      eventsMatching: channelSyncEventsCount(where: $eventWhere)
      ${input.view === 'events' ? `eventPage: channelSyncEvents(where: $eventWhere, orderBy: [{ occurredAt: desc }, { id: desc }], skip: $skip, take: $take) { ${EVENT_FIELDS} }` : ''}
      recentEvents: channelSyncEvents(orderBy: [{ occurredAt: desc }, { id: desc }], take: 100) { ${EVENT_FIELDS} }
    }
  `, { connectionWhere, jobWhere, eventWhere, ...(input.view !== 'all' ? { skip, take: PAGE_SIZE } : {}), ...(jobId ? { jobId } : {}) });
  const unavailable = { connections: [], connectionCount: 0, connectionsMatching: 0, rows: [], pagination: pageWindow(0, 1), jobCount: 0, jobsMatching: 0, recentJobs: [], resultJob: null, eventCount: 0, eventsMatching: 0, recentEvents: [], error: 'Channel evidence is temporarily unavailable.' };
  const requested = Math.min(requestedPage(input.page), 100_000);
  let response = await read((requested - 1) * PAGE_SIZE);
  if (!response.success) return unavailable;
  let data = response.data;
  const matching = input.view === 'jobs' ? data.jobsMatching : input.view === 'events' ? data.eventsMatching : 0;
  const pagination = pageWindow(Number(matching || 0), requested);
  if (input.view !== 'all' && pagination.page !== requested) {
    response = await read(pagination.skip);
    if (!response.success) return unavailable;
    data = response.data;
  }
  return {
    connections: data.channelConnections || [],
    connectionCount: data.channelConnectionsCount ?? 0,
    connectionsMatching: data.connectionsMatching ?? 0,
    rows: (input.view === 'jobs' ? data.jobPage : input.view === 'events' ? data.eventPage : []) || [],
    pagination,
    jobCount: data.dataExchangeJobsCount ?? 0,
    jobsMatching: data.jobsMatching ?? 0,
    recentJobs: data.recentJobs || [],
    resultJob: jobId ? data.resultJob || null : null,
    eventCount: data.channelSyncEventsCount ?? 0,
    eventsMatching: data.eventsMatching ?? 0,
    recentEvents: data.recentEvents || [],
    error: null,
  };
}

/** Host and listing choices for setup forms; `search` narrows both, so any record can be chosen. */
export async function getChannelSetupOptions(search = '') {
  const q = search.trim().slice(0, 120);
  const response = await keystoneClient<any>(`
    query ChannelSetupOptions($hostWhere: HostOrganizationWhereInput!, $listingWhere: ListingWhereInput!) {
      hostOrganizationsCount(where: $hostWhere)
      hostOrganizations(where: $hostWhere, orderBy: [{ name: asc }, { id: asc }], take: 50) { id name }
      listingsCount(where: $listingWhere)
      listings(where: $listingWhere, orderBy: [{ title: asc }, { id: asc }], take: 200) { id title hostOrganization { id } }
    }
  `, {
    // A host matches by its name or one of its listing titles, so a listing found by title keeps its host.
    hostWhere: q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { listings: { some: { title: { contains: q, mode: 'insensitive' } } } }] } : {},
    listingWhere: q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { hostOrganization: { name: { contains: q, mode: 'insensitive' } } }] } : {},
  });
  if (!response.success) return { hosts: [], hostCount: 0, listings: [], listingCount: 0, error: 'Setup options are temporarily unavailable.' };
  const data = response.data;
  return {
    hosts: data.hostOrganizations || [],
    hostCount: data.hostOrganizationsCount ?? 0,
    listings: data.listings || [],
    listingCount: data.listingsCount ?? 0,
    error: null,
  };
}

export async function importCalendarAction(formData: FormData): Promise<void> {
  const [channelConnectionId, listingId] = field(formData, 'mappingKey').split(':');
  if (!channelConnectionId || !listingId) fail('import', 'Choose an iCalendar mapping that can import.');
  const response = await keystoneClient<any>(`
    mutation ImportCalendar($channelConnectionId: ID!, $listingId: ID!, $calendarText: String!, $sourceLabel: String) {
      importListingCalendar(channelConnectionId: $channelConnectionId, listingId: $listingId, calendarText: $calendarText, sourceLabel: $sourceLabel)
    }
  `, { channelConnectionId, listingId, calendarText: String(formData.get('calendarText') || ''), sourceLabel: field(formData, 'sourceLabel') || null });
  if (!response.success) {
    const message = (response.errors || []).map((error: any) => calendarImportOperatorMessage(error?.message)).find(Boolean);
    fail('import', message || 'The availability import could not be applied. Review the mapping and iCalendar text.');
  }
  refreshChannels();
  const jobId = response.data.importListingCalendar?.id;
  redirect(jobId ? channelPath({ view: 'jobs', job: String(jobId) }) : channelPath({ view: 'jobs' }));
}

export async function createChannelConnectionAction(formData: FormData): Promise<void> {
  const hostOrganizationId = field(formData, 'hostOrganizationId');
  const name = field(formData, 'name');
  const status = field(formData, 'status') === 'paused' ? 'paused' : 'active';
  if (!hostOrganizationId || !name) fail('connection', 'Choose a host and name the connection.');
  if (name.length > 120) fail('connection', 'Connection name is too long.');
  // Only setups with an installed adapter are offered; everything else stays unsupported.
  const [setup] = supportedChannelConnections;
  const response = await keystoneClient<any>(`
    mutation CreateChannelConnection($data: ChannelConnectionCreateInput!) { createChannelConnection(data: $data) { id } }
  `, { data: {
    hostOrganization: { connect: { id: hostOrganizationId } },
    name,
    provider: setup.provider,
    connectionType: setup.connectionType,
    status,
    syncAvailability: true,
    syncRates: false,
    syncReservations: false,
    syncMessages: false,
  } });
  if (!response.success) fail('connection', 'The connection wasn’t added. Check that you can manage channels for this host.');
  refreshChannels();
  redirect(channelPath({ notice: 'connection-added' }, `#connection-${response.data.createChannelConnection.id}`));
}

export async function updateChannelConnectionAction(formData: FormData): Promise<void> {
  const id = field(formData, 'connectionId');
  const name = field(formData, 'name');
  const status = field(formData, 'status');
  if (!id || !name || !CONNECTION_STATUSES.includes(status)) fail('connection', 'Name the connection and choose a status.');
  if (name.length > 120) fail('connection', 'Connection name is too long.');
  const current = await keystoneClient<any>(`
    query ChannelConnectionSetup($id: ID!) { channelConnection(where: { id: $id }) { id provider connectionType } }
  `, { id });
  if (!current.success || !current.data.channelConnection) fail('connection', 'That connection is no longer available.');
  if (!installedChannelConnection(current.data.channelConnection)) fail('connection', 'This connection type has no installed adapter.');
  const response = await keystoneClient<any>(`
    mutation UpdateChannelConnection($id: ID!, $data: ChannelConnectionUpdateInput!) { updateChannelConnection(where: { id: $id }, data: $data) { id } }
  `, { id, data: { name, status, syncAvailability: formData.get('syncAvailability') === 'on' } });
  if (!response.success) fail('connection', 'The connection wasn’t updated. Refresh and try again.');
  refreshChannels();
  redirect(channelPath({ notice: 'connection-saved' }, `#connection-${id}`));
}

export async function createChannelMappingAction(formData: FormData): Promise<void> {
  const connectionId = field(formData, 'connectionId');
  const listingId = field(formData, 'listingId');
  const externalListingId = field(formData, 'externalListingId');
  const status = field(formData, 'status') === 'paused' ? 'paused' : 'mapped';
  if (!connectionId || !listingId || !externalListingId) fail('mapping', 'Choose a connection and listing, and enter the channel listing ID.');
  if (externalListingId.length > 200) fail('mapping', 'Channel listing ID is too long.');
  const lookup = await keystoneClient<any>(`
    query ChannelMappingSetup($connectionId: ID!, $listingId: ID!) {
      channelConnection(where: { id: $connectionId }) { id provider connectionType hostOrganization { id } channelListingsCount(where: { listing: { id: { equals: $listingId } } }) }
      listing(where: { id: $listingId }) { id hostOrganization { id } }
    }
  `, { connectionId, listingId });
  if (!lookup.success || !lookup.data.channelConnection || !lookup.data.listing) fail('mapping', 'That connection or listing is no longer available.');
  const { channelConnection: connection, listing } = lookup.data;
  if (!installedChannelConnection(connection)) fail('mapping', 'This connection type has no installed adapter.');
  const hostOrganizationId = connection.hostOrganization?.id;
  if (!hostOrganizationId || listing.hostOrganization?.id !== hostOrganizationId) fail('mapping', 'The listing and connection must belong to the same host.');
  if (connection.channelListingsCount > 0) fail('mapping', 'That listing is already mapped to this connection.');
  const response = await keystoneClient<any>(`
    mutation CreateChannelMapping($data: ChannelListingCreateInput!) { createChannelListing(data: $data) { id } }
  `, { data: {
    hostOrganization: { connect: { id: hostOrganizationId } },
    channelConnection: { connect: { id: connectionId } },
    listing: { connect: { id: listingId } },
    externalListingId,
    status,
    mapping: { availability: true, rates: false, reservations: false, messages: false },
  } });
  if (!response.success) fail('mapping', 'The mapping wasn’t added. Check that you can manage channels for this host.');
  refreshChannels();
  redirect(channelPath({ notice: 'mapping-added' }, `#connection-${connectionId}`));
}

export async function updateChannelMappingAction(formData: FormData): Promise<void> {
  const id = field(formData, 'mappingId');
  const connectionId = field(formData, 'connectionId');
  const externalListingId = field(formData, 'externalListingId');
  const status = field(formData, 'status');
  if (!id || !externalListingId || !MAPPING_STATUSES.includes(status)) fail('mapping', 'Enter the channel listing ID and choose a status.');
  if (externalListingId.length > 200) fail('mapping', 'Channel listing ID is too long.');
  const response = await keystoneClient<any>(`
    mutation UpdateChannelMapping($id: ID!, $data: ChannelListingUpdateInput!) { updateChannelListing(where: { id: $id }, data: $data) { id } }
  `, { id, data: { externalListingId, status } });
  if (!response.success) fail('mapping', 'The mapping wasn’t updated. Refresh and try again.');
  refreshChannels();
  redirect(channelPath({ notice: 'mapping-saved' }, connectionId ? `#connection-${connectionId}` : ''));
}
