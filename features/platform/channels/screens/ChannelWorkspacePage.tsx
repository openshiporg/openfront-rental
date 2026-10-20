import { AlertTriangle, CalendarSync, Check, ChevronDown, CircleAlert, FileClock, Link2, Minus, Plus, RadioTower, ScrollText } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { channelSyncTypeSupported, installedChannelConnection, unsupportedChannelIntegrations } from '@/features/integrations/channels/support';
import { getPlatformCapabilities } from '@/features/platform/lib/capabilities';
import { DataTable, type Column } from '@/features/platform/operations/components/DataTable';
import { GuardedForm } from '@/features/platform/operations/components/GuardedForm';
import { Checkbox, Disclosure, Field, InlineDisclosure, Select, TextArea, TextInput } from '@/features/platform/operations/components/FormControls';
import { ListSection } from '@/features/platform/operations/components/ListSection';
import { AttentionList, Callout, EmptyState, Muted, PageBody, PageHeader, Pill, PlatformPage, Section, StatTiles, StatusBadge, SubLine, toneText, type AttentionItem } from '@/features/platform/operations/components/PlatformUI';
import { SubmitButton } from '@/features/platform/operations/components/SubmitButton';
import { listHref, pickView, readSearchParams, type PlatformSearchParams } from '@/features/platform/operations/lib/listParams';
import { formatTimestamp, plural, sentence } from '@/features/platform/operations/lib/operations';
import { cn } from '@/lib/utils';
import { createChannelConnectionAction, createChannelMappingAction, getChannelSetupOptions, getChannelWorkspace, importCalendarAction, updateChannelConnectionAction, updateChannelMappingAction } from '../actions/channels';
import { calendarImportOptions, mappingHealthTone, unresolvedJobs, unresolvedSyncEvents } from '../lib/channelHealth';
import { mappingHealth, mappingOperational } from '../lib/mappingStatus';

const CHANNELS = '/dashboard/platform/channels';
const SETUP_HREF = `${listHref(CHANNELS, { setup: '1' })}#channel-setup`;
const ATTENTION_LIMIT = 6;
const syncTypes = [['syncAvailability', 'Availability'], ['syncRates', 'Rates'], ['syncReservations', 'Reservations'], ['syncMessages', 'Messages']] as const;
const providerLabels: Record<string, string> = { direct: 'Direct', airbnb: 'Airbnb', vrbo: 'Vrbo', booking_com: 'Booking.com', ical: 'iCalendar', pms: 'PMS' };
const connectionStatuses = [['active', 'Active'], ['paused', 'Paused'], ['disconnected', 'Disconnected']] as const;
const mappingStatuses = [['mapped', 'Mapped'], ['published', 'Published'], ['paused', 'Paused']] as const;
const notices: Record<string, string> = {
  'connection-added': 'Connection added.',
  'connection-saved': 'Connection saved.',
  'mapping-added': 'Listing mapped.',
  'mapping-saved': 'Mapping saved.',
};
const failureTitles: Record<string, string> = {
  import: 'The import wasn’t applied',
  connection: 'The connection wasn’t saved',
  mapping: 'The mapping wasn’t saved',
};

function ImportResult({ job }: { job: any }) {
  const counts = `${job.createdCount ?? 0} new · ${job.updatedCount ?? 0} updated · ${job.skippedCount ?? 0} unchanged or skipped`;
  if (job.status === 'succeeded') return <Callout live tone="success" title="Availability imported">{counts}</Callout>;
  if (job.status === 'partially_succeeded') return <Callout live tone="warning" title="Imported with conflicts">{counts} · {plural(job.conflictCount ?? 0, 'conflicting event')} not applied</Callout>;
  return <Callout live tone="danger" title="Nothing was imported">{plural(job.conflictCount ?? 0, 'conflicting event')} not applied</Callout>;
}

export async function ChannelWorkspacePage({ searchParams }: { searchParams?: PlatformSearchParams } = {}) {
  const { get, q, view: requested, page, error: actionError } = await readSearchParams(searchParams);
  const view = pickView(requested, ['all', 'jobs', 'events'] as const, 'all');
  const [workspace, access] = await Promise.all([getChannelWorkspace({ view, q, page, jobId: get('job') || null }), getPlatformCapabilities()]);
  // Connections are searched on the server; jobs and the sync log are searched and paged there too.
  // `recentJobs`/`recentEvents` are the newest 100 of each, behind the attention list only.
  const { connections, connectionCount, connectionsMatching, rows, pagination, jobCount, jobsMatching, recentJobs, resultJob, eventCount, eventsMatching, recentEvents, error } = workspace;
  const jobs = recentJobs;
  const events = recentEvents;
  const canManage = access.known && access.canManageChannels;
  const setupSearch = get('setupQ').trim().slice(0, 120);
  const setup = canManage ? await getChannelSetupOptions(setupSearch) : null;
  const failedForm = get('form');
  const notice = notices[get('notice')] || null;
  const requestedImport = get('import');

  const mappings = connections.flatMap((connection: any) => (connection.channelListings || []).map((mapping: any) => ({ ...mapping, connection })));
  const mappingTotal = connections.reduce((sum: number, connection: any) => sum + (connection.channelListingsCount ?? connection.channelListings?.length ?? 0), 0);
  const installed = (connection: any) => Boolean(installedChannelConnection(connection));
  const operationalMappings = mappings.filter((mapping: any) => installed(mapping.connection) && mappingOperational({ status: mapping.status, channelConnection: mapping.connection }));
  const activeConnections = connections.filter((connection: any) => installed(connection) && connection.status === 'active');
  const installedConnections = connections.filter(installed);
  const importOptions = calendarImportOptions(connections);
  const eligibleImports = importOptions.filter((option) => !option.blocker);
  const openJobs = unresolvedJobs(jobs);
  const openEvents = unresolvedSyncEvents(events);
  const hostCount = new Set(connections.map((connection: any) => connection.hostOrganization?.id).filter(Boolean)).size;
  const editHref = (connectionId: string) => canManage ? `${CHANNELS}#connection-${connectionId}` : undefined;

  const connectionRows = connections;
  const paged = { rows, page: pagination.page, pageCount: pagination.pageCount, start: pagination.start, end: pagination.end, total: pagination.total };

  const attention: AttentionItem[] = [
    ...connections.flatMap((connection: any): AttentionItem[] => {
      if (!installed(connection)) {
        return connection.status === 'active' ? [{ id: `adapter-${connection.id}`, title: connection.name, detail: 'Marked active, but this connection type has no installed adapter.' }] : [];
      }
      if (connection.status !== 'active') return [{ id: `connection-${connection.id}`, title: connection.name, detail: `${sentence(connection.status)} connection`, href: editHref(connection.id), actionLabel: 'Edit', tone: connection.status === 'error' ? 'danger' : 'warning' }];
      return connection.lastError ? [{ id: `connection-error-${connection.id}`, title: connection.name, detail: connection.lastError, href: listHref(CHANNELS, { view: 'jobs' }), actionLabel: 'Review', tone: 'danger' }] : [];
    }),
    ...mappings.filter((mapping: any) => installed(mapping.connection) && (mappingHealth(mapping.status) !== 'healthy' || mapping.lastImportIssue?.open === true)).map((mapping: any): AttentionItem => ({
      id: `mapping-${mapping.id}`,
      title: `${mapping.listing?.title || 'Listing unavailable'} · ${mapping.connection.name}`,
      // This mapping's own import issue, by mapping id (not a title shared with another listing).
      detail: mapping.lastImportIssue?.open === true ? `Last availability import ${sentence(String(mapping.lastImportIssue.status || 'failed')).toLowerCase()} · ${Number(mapping.lastImportIssue.conflictCount || 0)} conflicting event(s)` : `${sentence(mapping.status)} mapping`,
      href: editHref(mapping.connection.id),
      actionLabel: 'Edit',
      tone: mappingHealthTone[mappingHealth(mapping.status)],
    })),
    ...openJobs.map((job: any): AttentionItem => {
      const key = `${job.channelConnection?.id}:${job.listing?.id}`;
      const retry = canManage && job.direction === 'import' && eligibleImports.some((option) => option.key === key);
      return {
        id: `job-${job.id}`,
        title: `${job.channelConnection?.name || 'Import'} · ${job.listing?.title || sentence(job.domain)}`,
        detail: job.errorMessage || plural(job.conflictCount ?? 0, 'conflict'),
        href: retry ? `${listHref(CHANNELS, { import: key })}#channel-import` : listHref(CHANNELS, { view: 'jobs' }),
        actionLabel: retry ? 'Retry import' : 'Review',
        tone: job.status === 'failed' ? 'danger' : 'warning',
      };
    }),
  ];

  const tabs = [
    { id: 'all', label: 'Connections', count: connectionsMatching },
    { id: 'jobs', label: 'Import jobs', count: jobsMatching },
    { id: 'events', label: 'Sync log', count: eventsMatching },
  ];

  const jobColumns: Array<Column<any>> = [
    { id: 'job', header: 'Job', cell: (job) => <div className="min-w-0 max-w-xs">
      <span className="font-medium">{job.channelConnection?.name || 'Host archive'} · {sentence(job.domain)}</span>
      <SubLine>{job.sourceLabel || sentence(job.direction)}{job.listing?.title ? ` · ${job.listing.title}` : ''}</SubLine>
      <SubLine mobileOnly="md">{job.processedCount ?? 0} processed · {job.createdCount ?? 0} new · {job.updatedCount ?? 0} updated · {job.skippedCount ?? 0} skipped</SubLine>
      <SubLine mobileOnly="lg">Completed {formatTimestamp(job.completedAt)}</SubLine>
      {job.payloadSha256 ? <SubLine className="font-mono xl:hidden">{job.payloadSha256.slice(0, 12)}…</SubLine> : null}
      {job.errorMessage ? <SubLine className={toneText.danger}>{job.errorMessage}</SubLine> : null}
    </div> },
    { id: 'status', header: 'Status', cell: (job) => <StatusBadge status={job.status} /> },
    { id: 'counts', header: 'Processed', align: 'right', hideBelow: 'md', cell: (job) => <div className="tabular-nums">{job.processedCount}<SubLine>{job.createdCount ?? 0} new · {job.updatedCount ?? 0} updated · {job.skippedCount ?? 0} skipped</SubLine></div> },
    { id: 'conflicts', header: 'Conflicts', align: 'right', cell: (job) => <span className={job.conflictCount ? toneText.warning : 'text-muted-foreground'}>{job.conflictCount}</span> },
    { id: 'checksum', header: 'Checksum', hideBelow: 'xl', cell: (job) => <span className="font-mono text-xs text-muted-foreground" title={job.payloadSha256 || undefined}>{job.payloadSha256 ? `${job.payloadSha256.slice(0, 12)}…` : '—'}</span> },
    { id: 'completed', header: 'Completed', hideBelow: 'lg', cell: (job) => <Muted className="whitespace-nowrap">{formatTimestamp(job.completedAt)}</Muted> },
  ];

  const eventColumns: Array<Column<any>> = [
    { id: 'event', header: 'Event', cell: (event) => <div className="min-w-0 max-w-md">
      <span className="font-medium">{sentence(event.action)}</span>
      <SubLine>{event.channelConnection?.name || 'Connection unavailable'}{event.channelListing?.listing?.title ? ` · ${event.channelListing.listing.title}` : ''}</SubLine>
      <SubLine mobileOnly="lg">{event.message}</SubLine>
      <SubLine mobileOnly="md">{plural(event.attempts ?? 0, 'attempt')}</SubLine>
      <SubLine mobileOnly="sm">{formatTimestamp(event.occurredAt)}</SubLine>
      {event.errorMessage ? <SubLine className={toneText.danger}>{event.errorMessage}</SubLine> : null}
    </div> },
    { id: 'message', header: 'Message', hideBelow: 'lg', cell: (event) => <span className="line-clamp-2 max-w-lg text-sm text-muted-foreground">{event.message}</span> },
    { id: 'status', header: 'Status', cell: (event) => <StatusBadge status={event.status} /> },
    { id: 'attempts', header: 'Attempts', align: 'right', hideBelow: 'md', cell: (event) => event.attempts },
    { id: 'time', header: 'When', hideBelow: 'sm', cell: (event) => <Muted className="whitespace-nowrap">{formatTimestamp(event.occurredAt)}</Muted> },
  ];

  const hosts = setup?.hosts || [];
  const hostNames = new Map<string, string>(hosts.map((host: any) => [host.id, host.name]));
  const setupListings = setup?.listings || [];

  return <PlatformPage section="Channels" sectionHref="/platform/channels">
    <PageHeader
      title="Channels"
      description="Booking channel connections, listing mappings, and sync health. iCalendar connections exchange availability only."
      badges={access.known && !access.canManageChannels ? <StatusBadge label="View only" tone="neutral" /> : null}
      actions={canManage ? <Button asChild size="sm"><Link href={SETUP_HREF}><Plus aria-hidden="true" />Add connection</Link></Button> : null}
    />
    <PageBody>
      {actionError ? <Callout live tone="warning" title={failureTitles[failedForm] || 'That change wasn’t applied'}>{actionError}</Callout> : null}
      {notice ? <Callout live tone="success" title={notice} /> : null}
      {resultJob ? <ImportResult job={resultJob} /> : null}
      {!access.known ? <Callout tone="warning" title="Channel controls are unavailable" action={<Button asChild size="sm" variant="outline"><Link href={CHANNELS}>Try again</Link></Button>}>Your access couldn’t be checked. Try again in a moment.</Callout> : null}
      {error ? <Callout live tone="danger" title="Channels couldn’t load" action={<Button asChild size="sm" variant="outline"><Link href={CHANNELS}>Try again</Link></Button>}>Your records are unchanged. Try again in a moment.</Callout> : <>
      <StatTiles items={[
        { label: 'Connections', value: connectionCount, hint: connectionCount > connections.length ? `${connections.length} loaded` : `${activeConnections.length} active`, icon: RadioTower, href: listHref(CHANNELS, { q }), active: view === 'all' },
        { label: 'Mapped listings', value: mappingTotal, hint: mappingTotal > mappings.length ? `${operationalMappings.length} of ${mappings.length} loaded operational` : `${operationalMappings.length} operational`, tone: operationalMappings.length < mappings.length ? 'warning' : undefined, icon: CalendarSync },
        { label: 'Jobs to review', value: openJobs.length, hint: `of ${plural(jobs.length, 'recent job')}`, tone: openJobs.length ? 'warning' : 'success', icon: FileClock, href: listHref(CHANNELS, { view: 'jobs', q }), active: view === 'jobs' },
        { label: 'Sync issues', value: openEvents.length, hint: 'Failed or partial, recent log', tone: openEvents.length ? 'danger' : 'success', icon: CircleAlert, href: listHref(CHANNELS, { view: 'events', q }), active: view === 'events' },
      ]} />

      {attention.length ? <Section title="Needs attention" icon={CircleAlert} count={attention.length} flush>
        <AttentionList items={attention.slice(0, ATTENTION_LIMIT)} limit={ATTENTION_LIMIT} />
        {attention.length > ATTENTION_LIMIT ? <details className="group border-t">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <ChevronDown aria-hidden="true" className="size-3.5 transition-transform group-open:rotate-180" />
            <span className="group-open:hidden">Show {attention.length - ATTENTION_LIMIT} more</span>
            <span className="hidden group-open:inline">Show fewer</span>
          </summary>
          <div className="border-t"><AttentionList items={attention.slice(ATTENTION_LIMIT)} limit={attention.length} /></div>
        </details> : null}
      </Section> : null}

      {canManage ? <Disclosure id="channel-import" icon={CalendarSync} summary="Import availability" description="Availability only — no rates, reservations, or messages." defaultOpen={failedForm === 'import' || Boolean(requestedImport)}>
        {eligibleImports.length ? <GuardedForm draftKey="channel-import" keepDraft={false} action={importCalendarAction} className="grid gap-4 lg:grid-cols-2">
          <Field label="iCalendar mapping"><Select required name="mappingKey" defaultValue={eligibleImports.some((option) => option.key === requestedImport) ? requestedImport : ''}>
            <option value="" disabled>Choose a mapping</option>
            {importOptions.map((option) => <option key={option.key} value={option.key} disabled={Boolean(option.blocker)}>{option.label}{option.blocker ? ` — ${option.blocker}` : ''}</option>)}
          </Select></Field>
          <Field label="Source label" optional hint="Not a private calendar URL."><TextInput name="sourceLabel" maxLength={240} placeholder="Airbnb export, March" /></Field>
          <Field label="Calendar text" className="lg:col-span-2" hint="Paste .ics contents, not a URL. Recurring events aren’t supported."><TextArea required name="calendarText" rows={8} className="font-mono text-xs" placeholder={'BEGIN:VCALENDAR\nVERSION:2.0\n…'} /></Field>
          <div className="lg:col-span-2"><SubmitButton size="sm" pendingLabel="Importing…"><CalendarSync aria-hidden="true" />Import availability</SubmitButton></div>
        </GuardedForm> : <div className="space-y-3 text-sm">
          <p className="font-medium">No mapping can import availability</p>
          {importOptions.length ? <ul className="space-y-1 text-xs text-muted-foreground">{importOptions.map((option) => <li key={option.key}>{option.label} — {option.blocker}</li>)}</ul> : <p className="text-xs text-muted-foreground">No listings are mapped to an iCalendar connection.</p>}
          <Button asChild size="sm" variant="outline"><Link href={SETUP_HREF}><Link2 aria-hidden="true" />Set up connections</Link></Button>
        </div>}
      </Disclosure> : null}

      {canManage ? <Disclosure id="channel-setup" icon={Link2} summary="Connections and mappings" description="Add an iCalendar connection or map a listing to one." defaultOpen={get('setup') === '1' || failedForm === 'connection' || failedForm === 'mapping'}>
        {setup?.error ? <Callout tone="warning" title="Setup options are unavailable" action={<Button asChild size="sm" variant="outline"><Link href={SETUP_HREF}>Try again</Link></Button>}>Try again in a moment.</Callout> : <div className="grid gap-6 lg:grid-cols-2">
          <GuardedForm draftKey="channel-connection-new" keepDraft={false} action={createChannelConnectionAction} className="grid content-start gap-4">
            <h3 className="text-sm font-semibold">Add iCalendar connection</h3>
            {hosts.length === 1 ? <input type="hidden" name="hostOrganizationId" value={hosts[0].id} /> : <Field label="Host" hint={(setup?.hostCount ?? 0) > hosts.length ? `First ${hosts.length} of ${setup?.hostCount} hosts by name.` : undefined}><Select required name="hostOrganizationId" defaultValue="" disabled={!hosts.length}>
              <option value="" disabled>{hosts.length ? 'Choose a host' : 'No host available'}</option>
              {hosts.map((host: any) => <option key={host.id} value={host.id}>{host.name}</option>)}
            </Select></Field>}
            <Field label="Name"><TextInput required name="name" maxLength={120} placeholder="Airbnb calendar" /></Field>
            <Field label="Status"><Select name="status" defaultValue="active"><option value="active">Active</option><option value="paused">Paused</option></Select></Field>
            <div><SubmitButton size="sm" pendingLabel="Adding…" disabled={!hosts.length}><Plus aria-hidden="true" />Add connection</SubmitButton></div>
            <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Not installed:</span> {unsupportedChannelIntegrations.join(', ')}</p>
          </GuardedForm>
          {(setup && (setup.listingCount > setupListings.length || (setup.hostCount ?? 0) > hosts.length)) || setupSearch ? <form action={CHANNELS} className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="channel-setup-search">Find a host or listing</label>
            <input id="channel-setup-search" name="setupQ" defaultValue={setupSearch} placeholder="Find a host or listing" className="h-8 w-56 rounded-md border bg-background px-3 text-sm" />
            <Button size="sm" variant="ghost" type="submit">Find</Button>
          </form> : null}
          <GuardedForm draftKey="channel-mapping-new" restoreDraft={failedForm === 'mapping'} action={createChannelMappingAction} className="grid content-start gap-4">
            <h3 className="text-sm font-semibold">Map a listing</h3>
            <Field label="Connection"><Select required name="connectionId" defaultValue="" disabled={!installedConnections.length}>
              <option value="" disabled>{installedConnections.length ? 'Choose a connection' : 'Add an iCalendar connection first'}</option>
              {installedConnections.map((connection: any) => <option key={connection.id} value={connection.id}>{connection.name}{hostCount > 1 ? ` · ${connection.hostOrganization?.name || 'Host unavailable'}` : ''}</option>)}
            </Select></Field>
            <Field label="Listing" hint={setup && setup.listingCount > setupListings.length ? `First ${setupListings.length} of ${setup.listingCount} listings by title.` : undefined}><Select required name="listingId" defaultValue="" disabled={!setupListings.length}>
              <option value="" disabled>{setupListings.length ? 'Choose a listing' : 'No listing available'}</option>
              {setupListings.map((listing: any) => <option key={listing.id} value={listing.id}>{listing.title}{hosts.length > 1 ? ` · ${hostNames.get(listing.hostOrganization?.id) || 'Host unavailable'}` : ''}</option>)}
            </Select></Field>
            <Field label="Channel listing ID" hint="The listing’s ID or name on the channel."><TextInput required name="externalListingId" maxLength={200} /></Field>
            <Field label="Status"><Select name="status" defaultValue="mapped"><option value="mapped">Mapped</option><option value="paused">Paused</option></Select></Field>
            <div><SubmitButton size="sm" pendingLabel="Mapping…" disabled={!installedConnections.length || !setupListings.length}><Link2 aria-hidden="true" />Map listing</SubmitButton></div>
          </GuardedForm>
        </div>}
      </Disclosure> : null}

      {view === 'all' ? <ListSection basePath={CHANNELS} tabs={tabs} view={view} q={q} filtered={Boolean(q)} placeholder="Search connection or listing" noun={{ singular: 'connection', plural: 'connections' }} total={connectionCount} visible={connectionsMatching}
        empty={<EmptyState icon={RadioTower} title="No channel connections" action={canManage ? <Button asChild size="sm"><Link href={SETUP_HREF}><Plus aria-hidden="true" />Add iCalendar connection</Link></Button> : undefined} />}
        footer={connectionsMatching > connections.length ? `Showing the first ${connections.length} of ${connectionsMatching} connections by name. Search to find others.` : undefined}>
        <ul className="grid gap-px bg-border md:grid-cols-2">
          {connectionRows.map((connection: any) => {
            const adapter = installedChannelConnection(connection);
            const editable = canManage && Boolean(adapter);
            const listings = connection.channelListings || [];
            const listingTotal = connection.channelListingsCount ?? listings.length;
            return <li key={connection.id} id={`connection-${connection.id}`} className="min-w-0 scroll-mt-20 bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{connection.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{providerLabels[connection.provider] || sentence(connection.provider)} · {sentence(connection.connectionType)} · {connection.lastSyncedAt ? `synced ${formatTimestamp(connection.lastSyncedAt)}` : 'not synced yet'}{hostCount > 1 && connection.hostOrganization?.name ? ` · ${connection.hostOrganization.name}` : ''}</p>
                </div>
                <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  {adapter ? null : <Pill tone="warning">Adapter not installed</Pill>}
                  <StatusBadge status={connection.status} tone={connection.lastError ? 'danger' : undefined} />
                </span>
              </div>
              <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Sync types">
                {syncTypes.map(([key, label]) => {
                  const supported = channelSyncTypeSupported(connection, key);
                  const enabled = Boolean(connection[key]);
                  return <li key={key} title={enabled && !supported ? 'Not supported by an installed adapter' : undefined} className={cn('inline-flex h-6 items-center gap-1 rounded-md border px-2 text-xs', enabled && supported && 'bg-background text-foreground', enabled && !supported && 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100', !enabled && 'bg-muted/40 text-muted-foreground line-through decoration-muted-foreground/40')}>
                    {enabled ? supported ? <Check aria-hidden="true" className="size-3 text-emerald-600" /> : <AlertTriangle aria-hidden="true" className="size-3" /> : <Minus aria-hidden="true" className="size-3" />}
                    {label}{enabled && !supported ? <span className="sr-only"> (not supported)</span> : null}
                  </li>;
                })}
              </ul>
              {connection.lastError ? <p className={cn('mt-3 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs dark:border-rose-900/60 dark:bg-rose-950/30', toneText.danger)}>{connection.lastError}</p> : null}
              <div className="mt-3 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground">{listingTotal ? plural(listingTotal, 'mapped listing') : 'No listings mapped'}{listingTotal > listings.length ? ` · first ${listings.length} shown` : ''}</p>
                {listings.length ? <ul className="mt-2 space-y-1.5">{listings.map((mapping: any) => <li key={mapping.id} className="flex min-w-0 items-center justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate">{mapping.listing?.title || 'Listing unavailable'}</span>
                  <span className="flex shrink-0 items-center gap-2"><span className="font-mono text-muted-foreground">{mapping.externalListingId || 'no external id'}</span><StatusBadge status={mapping.status} tone={mappingHealthTone[mappingHealth(mapping.status)]} className="h-5" /></span>
                </li>)}</ul> : null}
              </div>
              {editable ? <div className="mt-3 space-y-2 border-t pt-3">
                <InlineDisclosure summary="Edit connection">
                  <GuardedForm draftKey={`channel-connection-${connection.id}`} keepDraft={false} action={updateChannelConnectionAction} className="grid gap-3">
                    <input type="hidden" name="connectionId" value={connection.id} />
                    <Field label="Name"><TextInput required name="name" maxLength={120} defaultValue={connection.name} /></Field>
                    <Field label="Status"><Select required name="status" defaultValue={connectionStatuses.some(([value]) => value === connection.status) ? connection.status : ''}>
                      <option value="" disabled>Choose a status</option>
                      {connectionStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </Select></Field>
                    <Checkbox name="syncAvailability" defaultChecked={connection.syncAvailability === true} label="Sync availability" />
                    <div><SubmitButton size="sm" pendingLabel="Saving…">Save connection</SubmitButton></div>
                  </GuardedForm>
                </InlineDisclosure>
                {listings.length ? <InlineDisclosure summary="Edit mappings">
                  <div className="grid gap-3">
                    {listings.map((mapping: any) => <GuardedForm key={mapping.id} draftKey={`channel-mapping-${mapping.id}`} restoreDraft={failedForm === 'mapping'} action={updateChannelMappingAction} className="grid gap-2 border-b pb-3 last:border-b-0 last:pb-0">
                      <input type="hidden" name="mappingId" value={mapping.id} />
                      <input type="hidden" name="connectionId" value={connection.id} />
                      <p className="truncate text-xs font-medium">{mapping.listing?.title || 'Listing unavailable'}</p>
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem]">
                        <Field label="Channel listing ID"><TextInput required name="externalListingId" maxLength={200} defaultValue={mapping.externalListingId} /></Field>
                        <Field label="Status"><Select required name="status" defaultValue={mappingStatuses.some(([value]) => value === mapping.status) ? mapping.status : ''}>
                          <option value="" disabled>Choose a status</option>
                          {mappingStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </Select></Field>
                      </div>
                      <div><SubmitButton size="sm" variant="outline" pendingLabel="Saving…">Save mapping</SubmitButton></div>
                    </GuardedForm>)}
                  </div>
                </InlineDisclosure> : null}
                <Link href={SETUP_HREF} className="inline-flex items-center gap-1.5 rounded-sm text-xs font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Link2 aria-hidden="true" className="size-3.5" />Map a listing</Link>
              </div> : null}
            </li>;
          })}
        </ul>
      </ListSection> : null}

      {view === 'jobs' ? <ListSection basePath={CHANNELS} tabs={tabs} view={view} q={q} filtered={Boolean(q)} clearHref={`${CHANNELS}?view=jobs`} placeholder="Search connection, domain, or listing" noun={{ singular: 'job', plural: 'jobs' }} total={jobCount} visible={jobsMatching} pagination={paged}
        empty={<EmptyState icon={FileClock} title="No import jobs" />}
        >
        <DataTable rows={rows} columns={jobColumns} getKey={(job) => job.id} caption="Import jobs" />
      </ListSection> : null}

      {view === 'events' ? <ListSection basePath={CHANNELS} tabs={tabs} view={view} q={q} filtered={Boolean(q)} clearHref={`${CHANNELS}?view=events`} placeholder="Search connection or message" noun={{ singular: 'event', plural: 'events' }} total={eventCount} visible={eventsMatching} pagination={paged}
        empty={<EmptyState icon={ScrollText} title="No sync events" />}
        >
        <DataTable rows={rows} columns={eventColumns} getKey={(event) => event.id} caption="Sync log" />
      </ListSection> : null}
      </>}
    </PageBody>
  </PlatformPage>;
}
export default ChannelWorkspacePage;
