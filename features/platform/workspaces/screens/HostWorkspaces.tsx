import {
  AlertCircle, ArrowDownLeft, ArrowUpRight, BadgeCheck, Banknote, BedDouble, CalendarClock,
  CircleDollarSign, FileCheck2, FileSignature, Gauge, Home, Inbox, KeyRound, MessageSquare, Plus,
  RadioTower, ReceiptText, RefreshCcw, Settings2, ShieldCheck, Sparkles, Star, UserRoundCheck, UsersRound,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { mappingOperational } from '@/features/platform/channels/lib/mappingStatus';
import { getPlatformCapabilities } from '@/features/platform/lib/capabilities';
import { DataTable, type Column } from '@/features/platform/operations/components/DataTable';
import { ListSection } from '@/features/platform/operations/components/ListSection';
import {
  Avatar, Callout, EmptyState, Muted, PageBody, PageHeader, Pill, PlatformPage, ReadinessSegments, RowLink,
  Section, StatTiles, Stars, StatusBadge, SubLine, toneText,
} from '@/features/platform/operations/components/PlatformUI';
import { listHref, pickView, readSearchParams, type PlatformSearchParams } from '@/features/platform/operations/lib/listParams';
import {
  formatDayRange, formatMoney, formatTimestamp, humanize, operationalTone, plural, propertyReadiness, sentence,
} from '@/features/platform/operations/lib/operations';
import { isRealTender, tenderLabel } from '@/features/platform/operations/lib/provenance';
import { platformCreatePath, platformDetailPath } from '@/features/platform/operations/lib/routes';
import { cn } from '@/lib/utils';
import {
  getAgreementWorkspace, getGuestWorkspace, getInboxWorkspace, getListingReadinessWorkspace,
  getPaymentWorkspace, getPricingWorkspace, getPropertyReadinessWorkspace, getReviewWorkspace,
} from '../actions/hostWorkspaces';
import { effectiveArrivalRules } from '../lib/arrivalRules';
import { formatCurrencyTotals, moneyByCurrency } from '../lib/money';
import { serverPage } from '../lib/paging';
import { listingCreatePath, ratePlanCreatePath } from '../lib/routes';
import type { PropertyListingSummary } from '../lib/readinessIndex';
import { listingSetup } from '../lib/sellability';

type ListProps = { searchParams?: PlatformSearchParams };

function RecordsLink({ href, children = 'Records' }: { href: string; children?: ReactNode }) {
  return <Button asChild size="sm" variant="ghost"><Link href={href}><Settings2 aria-hidden="true" />{children}</Link></Button>;
}

/** Shown in place of figures and lists when a workspace read fails, so a failure never reads as an empty business. */
function WorkspaceUnavailable({ retryHref, error }: { retryHref: string; error?: string | null }) {
  return <Callout live tone="danger" title="This workspace couldn’t load" action={<Button asChild size="sm" variant="outline"><Link href={retryHref}><RefreshCcw aria-hidden="true" />Try again</Link></Button>}>
    {error || 'Try again in a moment.'}
  </Callout>;
}

/* ───────────────────────── Properties ───────────────────────── */

const PROPERTIES = '/dashboard/platform/properties';

function notSellingReason(property: any) {
  if (property.status === 'archived') return 'Archived';
  if (property.status !== 'active') return `Setup complete · ${sentence(property.status).toLowerCase()}`;
  return 'Setup complete · no bookable listing';
}

export async function PropertyReadinessWorkspace({ searchParams }: ListProps = {}) {
  const { q, view: requested, page } = await readSearchParams(searchParams);
  const view = pickView(requested, ['all', 'attention', 'ready', 'archived'] as const, 'all');
  const [result, capabilities] = await Promise.all([getPropertyReadinessWorkspace({ q, view, page }), getPlatformCapabilities()]);
  const data = result.data;
  // An unknown role keeps the link; the create page shows its own unavailable state.
  const mayCreate = capabilities.known ? capabilities.canManageProperties : true;
  const rows = (data?.properties || []).map((property: any) => {
    // Server counts (no listing details), so property-only readers see the real state too.
    const listings = (property.listingSummary as PropertyListingSummary)?.complete ? property.listingSummary as NonNullable<PropertyListingSummary> : null;
    return {
      property,
      listings,
      readiness: propertyReadiness({ timezone: property.timezone, registrationNumber: property.registrationNumber, addressReady: Boolean(property.address?.city && property.address?.countryCode), unitCount: property.unitsCount || 0, publishedListingCount: listings?.published || 0 }),
      sellable: property.status === 'active' && (listings?.bookable || 0) > 0,
    };
  });
  type Row = (typeof rows)[number];
  const paged = serverPage<Row>(rows, result.page, data?.matching || 0);

  const columns: Array<Column<Row>> = [
    { id: 'property', header: 'Property', cell: ({ property, listings, readiness, sellable }) => <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg border bg-muted/40"><Home aria-hidden="true" className="size-4 text-muted-foreground" /></span>
      <div className="min-w-0">
        <RowLink href={platformDetailPath('property', property.id)}>{property.name}</RowLink>
        <SubLine>{property.address?.publicLocationLabel || property.address?.city || 'Location not set'} · {humanize(property.propertyType)}{property.internalCode ? ` · ${property.internalCode}` : ''}</SubLine>
        <SubLine mobileOnly="md">{sellable ? 'Ready to sell' : readiness.percent === 100 ? notSellingReason(property) : `${readiness.readyCount}/${readiness.checks.length} setup steps done`}</SubLine>
        <SubLine mobileOnly="lg">{plural(property.unitsCount || 0, 'unit')} · {listings ? `${listings.published}/${listings.total} listings live` : 'Listings unavailable'}</SubLine>
        <SubLine className="xl:hidden">{plural(property.openTasksCount || 0, 'open task')} · check-in {property.checkInFrom || '—'} · out {property.checkOutBy || '—'}</SubLine>
      </div>
    </div> },
    { id: 'status', header: 'Status', cell: ({ property, sellable }) => <div><StatusBadge status={property.status} />{sellable ? <SubLine className={toneText.success}>Ready to sell</SubLine> : null}</div> },
    { id: 'readiness', header: 'Setup', hideBelow: 'md', cell: ({ property, readiness, sellable }) => <div><ReadinessSegments checks={readiness.checks} showMissing />{readiness.percent === 100 && !sellable ? <SubLine>{notSellingReason(property)}</SubLine> : null}</div> },
    { id: 'units', header: 'Units', align: 'right', hideBelow: 'lg', cell: ({ property }) => property.unitsCount || 0 },
    { id: 'listings', header: 'Listings', align: 'right', hideBelow: 'lg', cell: ({ listings }) => listings ? <span>{listings.published}<Muted> / {listings.total} live</Muted></span> : <Muted>Unavailable</Muted> },
    { id: 'tasks', header: 'Open tasks', align: 'right', hideBelow: 'xl', cell: ({ property }) => <span className={property.openTasksCount ? toneText.warning : 'text-muted-foreground'}>{property.openTasksCount || 0}</span> },
    { id: 'hours', header: 'Check-in · out', hideBelow: 'xl', cell: ({ property }) => <Muted className="whitespace-nowrap tabular-nums">{property.checkInFrom || '—'} · {property.checkOutBy || '—'}</Muted> },
  ];

  return <PlatformPage section="Properties" sectionHref="/platform/properties">
    <PageHeader
      title="Properties"
      description="Every home in your portfolio and what it still needs before guests can book it."
      actions={<>
        {mayCreate ? <RecordsLink href="/dashboard/properties" /> : null}
        {mayCreate ? <Button asChild size="sm"><Link href={platformCreatePath('property')}><Plus aria-hidden="true" />Add property</Link></Button> : null}
      </>}
    />
    <PageBody>
      {result.error || !data ? <WorkspaceUnavailable retryHref={PROPERTIES} error={result.error} /> : <>
      <StatTiles items={[
        { label: 'Properties', value: data.total, hint: `${data.active} active`, icon: Home, href: listHref(PROPERTIES, { q }), active: view === 'all' },
        { label: 'Ready to sell', value: data.ready, hint: `of ${plural(data.total, 'property', 'properties')}`, tone: data.total && data.ready === data.total ? 'success' : undefined, icon: BadgeCheck, href: listHref(PROPERTIES, { view: 'ready', q }), active: view === 'ready' },
        { label: 'Needs setup', value: data.attention, hint: 'missing a setup step', tone: data.attention ? 'warning' : 'success', icon: AlertCircle, href: listHref(PROPERTIES, { view: 'attention', q }), active: view === 'attention' },
        { label: 'Live listings', value: data.liveListings, hint: `${plural(data.openTasks, 'open task')} across homes`, icon: RadioTower },
      ]} />
      <ListSection
        basePath={PROPERTIES}
        view={view}
        q={q}
        placeholder="Search name, code, or city"
        noun={{ singular: 'property', plural: 'properties' }}
        total={data.total}
        visible={data.matching}
        pagination={paged}
        tabs={[
          { id: 'all', label: 'All', count: data.tabAll },
          { id: 'attention', label: 'Needs setup', count: data.tabAttention, tone: 'warning' },
          { id: 'ready', label: 'Ready to sell', count: data.tabReady },
          { id: 'archived', label: 'Archived', count: data.tabArchived },
        ]}
        empty={<EmptyState icon={Home} title="No properties yet" description="Add a home to start onboarding. You’ll record its address, units, and registration, then publish a listing." action={mayCreate ? <Button asChild size="sm"><Link href={platformCreatePath('property')}><Plus aria-hidden="true" />Add property</Link></Button> : undefined} />}
      >
        <DataTable rows={paged.rows} columns={columns} getKey={(row) => row.property.id} caption="Properties" />
      </ListSection>
      </>}
    </PageBody>
  </PlatformPage>;
}

/* ───────────────────────── Listings ───────────────────────── */

const LISTINGS = '/dashboard/platform/listings';

export async function ListingReadinessWorkspace({ searchParams }: ListProps = {}) {
  const { q, view: requested, page } = await readSearchParams(searchParams);
  const view = pickView(requested, ['all', 'attention', 'published', 'unpublished'] as const, 'all');
  const [result, capabilities] = await Promise.all([getListingReadinessWorkspace({ q, view, page }), getPlatformCapabilities()]);
  const data = result.data;
  const mayCreate = capabilities.known ? capabilities.canManageListings : true;
  const rows = (data?.listings || []).map((listing: any) => {
    // The server's readiness (quote rules); the visible plan only adds the rate where pricing is readable.
    const online = listing.onlineReadiness as { priced: boolean; bookable: boolean; problem: string | null } | null;
    const plan = listing.effectiveRatePlans?.[0] || null;
    const pricing = { priced: Boolean(online?.priced), plan, problem: online?.problem || null, known: Boolean(online) };
    return {
      listing,
      pricing,
      readiness: listingSetup({ title: listing.title, description: listing.description, mediaCount: listing.mediaCount || 0, amenityCount: listing.amenitiesCount || 0, propertyReady: listing.property?.status === 'active' && Boolean(listing.property?.registrationNumber), unitReady: listing.accommodationUnit?.status === 'available', bookable: Boolean(online?.bookable) }),
      notSyncing: (listing.channelListings || []).filter((mapping: any) => !mappingOperational(mapping)).length,
    };
  });
  type Row = (typeof rows)[number];
  const paged = serverPage<Row>(rows, result.page, data?.matching || 0);
  const nightly = ({ listing, pricing }: Row) => {
    const plan = pricing.plan;
    if (!pricing.known) return <Muted>Unavailable</Muted>;
    if (!pricing.priced) return <span className={toneText.warning}>Not priced</span>;
    if (plan) return formatMoney(plan.baseNightlyRateCents, plan.currencyCode || listing.currencyCode);
    // Rate plans hidden from this role may price it: say so rather than show a possibly wrong base rate.
    if (capabilities.known && !capabilities.canReadPricing) return <Muted>Priced · rate not visible to you</Muted>;
    return (listing.baseNightlyRateCents || 0) > 0 ? formatMoney(listing.baseNightlyRateCents, listing.currencyCode) : <Muted>Priced · rate not visible to you</Muted>;
  };
  const booking = (listing: any) => listing.instantBook ? 'Instant book' : sentence(listing.bookingMode);

  const columns: Array<Column<Row>> = [
    { id: 'listing', header: 'Listing', cell: (row) => <div className="min-w-0 max-w-sm">
      <RowLink href={platformDetailPath('listing', row.listing.id)}>{row.listing.title}</RowLink>
      <SubLine>{row.listing.property?.name || 'No property'} · {row.listing.accommodationUnit?.name || 'No unit'}</SubLine>
      <SubLine mobileOnly="md">{row.readiness.percent === 100 ? 'All readiness checks pass' : `${row.readiness.readyCount}/${row.readiness.checks.length} readiness checks`}</SubLine>
      <SubLine mobileOnly="sm">{nightly(row)} · {plural(row.listing.minimumStay || 1, 'night')} min</SubLine>
      <SubLine mobileOnly="lg">{booking(row.listing)}</SubLine>
      <SubLine className="xl:hidden">{plural(row.listing.mediaCount || 0, 'photo')} · {plural(row.listing.channelListingsCount || 0, 'channel')}{row.notSyncing ? ` · ${row.notSyncing} not syncing` : ''}</SubLine>
    </div> },
    { id: 'status', header: 'Status', cell: ({ listing, readiness }) => <div><StatusBadge status={listing.status} />{listing.status === 'published' && readiness.percent < 100 ? <SubLine className={toneText.warning}>Needs attention</SubLine> : null}</div> },
    { id: 'readiness', header: 'Readiness', hideBelow: 'md', cell: ({ readiness }) => <ReadinessSegments checks={readiness.checks} showMissing /> },
    { id: 'rate', header: 'Nightly', align: 'right', hideBelow: 'sm', cell: (row) => <div><span className="font-medium">{nightly(row)}</span><SubLine>{row.pricing.priced && row.pricing.plan ? 'Rate plan · ' : ''}{plural(row.listing.minimumStay || 1, 'night')} min</SubLine></div> },
    { id: 'booking', header: 'Booking', hideBelow: 'lg', cell: ({ listing }) => <Muted>{booking(listing)}</Muted> },
    { id: 'channels', header: 'Channels', align: 'right', hideBelow: 'xl', cell: ({ listing, notSyncing }) => <div>{listing.channelListingsCount || 0}{notSyncing ? <SubLine className={toneText.warning}>{notSyncing} not syncing</SubLine> : null}</div> },
    { id: 'media', header: 'Photos', align: 'right', hideBelow: 'xl', cell: ({ listing }) => <span className={listing.mediaCount ? undefined : toneText.warning}>{listing.mediaCount || 0}</span> },
  ];

  return <PlatformPage section="Listings" sectionHref="/platform/listings">
    <PageHeader
      title="Listings"
      description="Guest-facing pages for each unit. Resolve content, inventory, and rate gaps before a listing goes live."
      actions={mayCreate ? <>
        <RecordsLink href="/dashboard/listings" />
        <Button asChild size="sm"><Link href={listingCreatePath()}><Plus aria-hidden="true" />New listing</Link></Button>
      </> : undefined}
    />
    <PageBody>
      {result.error || !data ? <WorkspaceUnavailable retryHref={LISTINGS} error={result.error} /> : <>
      <StatTiles items={[
        { label: 'Listings', value: data.total, hint: `${data.published} live`, icon: BedDouble, href: listHref(LISTINGS, { q }), active: view === 'all' },
        { label: 'Live · needs attention', value: data.attention, hint: 'published with a readiness gap', tone: data.attention ? 'warning' : 'success', icon: AlertCircle, href: listHref(LISTINGS, { view: 'attention', q }), active: view === 'attention' },
        { label: 'Not live', value: data.unpublished, hint: 'draft or paused', icon: FileCheck2, href: listHref(LISTINGS, { view: 'unpublished', q }), active: view === 'unpublished' },
        { label: 'Channel mappings', value: data.mappings, hint: `${data.mappingsNotOperational} not syncing`, tone: data.mappingsNotOperational ? 'warning' : undefined, icon: RadioTower },
      ]} />
      <ListSection
        basePath={LISTINGS}
        view={view}
        q={q}
        placeholder="Search title, property, or unit"
        noun={{ singular: 'listing', plural: 'listings' }}
        total={data.total}
        visible={data.matching}
        pagination={paged}
        tabs={[
          { id: 'all', label: 'All', count: data.tabAll },
          { id: 'attention', label: 'Needs attention', count: data.tabAttention, tone: 'warning' },
          { id: 'published', label: 'Published', count: data.tabPublished },
          { id: 'unpublished', label: 'Not live', count: data.tabUnpublished },
        ]}
        empty={<EmptyState icon={BedDouble} title="No listings yet" description="Each listing sells one unit of a property." action={mayCreate ? <Button asChild size="sm"><Link href={listingCreatePath()}><Plus aria-hidden="true" />New listing</Link></Button> : <Button asChild size="sm" variant="outline"><Link href={PROPERTIES}>Go to properties</Link></Button>} />}
      >
        <DataTable rows={paged.rows} columns={columns} getKey={(row) => row.listing.id} caption="Listings" />
      </ListSection>
      </>}
    </PageBody>
  </PlatformPage>;
}

/* ───────────────────────── Guests ───────────────────────── */

const GUESTS = '/dashboard/platform/guests';

export async function GuestTimelineWorkspace({ searchParams }: ListProps = {}) {
  const { q, view: requested, page } = await readSearchParams(searchParams);
  const view = pickView(requested, ['all', 'upcoming', 'verify', 'verified'] as const, 'all');
  const result = await getGuestWorkspace({ q, view, page });
  const data = result.data;
  const guests = data?.guestProfiles || [];
  const paged = serverPage<any>(guests, result.page, data?.matching || 0);
  const needsVerification = (guest: any) => guest.verificationStatus !== 'verified' && (guest.upcomingStaysCount || 0) > 0;
  const latestStay = (guest: any) => {
    const latest = guest.latestStay?.[0];
    return latest ? `${latest.listing?.title || 'Listing unavailable'} · ${formatDayRange(latest.checkInDate, latest.checkOutDate)} · ${sentence(latest.status)}` : 'No stays yet';
  };

  const columns: Array<Column<any>> = [
    { id: 'guest', header: 'Guest', cell: (guest) => <div className="flex min-w-0 items-center gap-3">
      <Avatar name={guest.name} />
      <div className="min-w-0">
        <RowLink href={platformDetailPath('guest', guest.id)}>{guest.name}</RowLink>
        <SubLine>{guest.email}</SubLine>
        <SubLine mobileOnly="md">{latestStay(guest)}</SubLine>
        <SubLine mobileOnly="lg">{plural(guest.staysCount || 0, 'stay')} · {plural(guest.openThreadsCount || 0, 'open thread')}</SubLine>
      </div>
    </div> },
    { id: 'verification', header: 'Verification', cell: (guest) => <StatusBadge status={guest.verificationStatus} tone={needsVerification(guest) ? 'warning' : operationalTone(guest.verificationStatus)} /> },
    { id: 'latest', header: 'Latest stay', hideBelow: 'md', cell: (guest) => {
      const latest = guest.latestStay?.[0];
      if (!latest) return <Muted>No stays yet</Muted>;
      return <div className="min-w-0 max-w-xs"><span className="block truncate font-medium">{latest.listing?.title || 'Listing unavailable'}</span><SubLine>{latest.confirmationCode} · {formatDayRange(latest.checkInDate, latest.checkOutDate)} · {sentence(latest.status)}</SubLine></div>;
    } },
    { id: 'stays', header: 'Stays', align: 'right', hideBelow: 'lg', cell: (guest) => guest.staysCount || 0 },
    { id: 'threads', header: 'Open threads', align: 'right', hideBelow: 'lg', cell: (guest) => <span className={guest.openThreadsCount ? undefined : 'text-muted-foreground'}>{guest.openThreadsCount || 0}</span> },
    { id: 'language', header: 'Language', hideBelow: 'xl', cell: (guest) => <Muted>{guest.preferredLanguage || '—'}</Muted> },
  ];

  return <PlatformPage section="Guests" sectionHref="/platform/guests">
    <PageHeader title="Guests" description="Guest profiles with verification, stay history, and open conversations in one place." actions={<RecordsLink href="/dashboard/guest-profiles" />} />
    <PageBody>
      {result.error || !data ? <WorkspaceUnavailable retryHref={GUESTS} error={result.error} /> : <>
      <StatTiles items={[
        { label: 'Guests', value: data.total, hint: 'profiles in your scope', icon: UsersRound, href: listHref(GUESTS, { q }), active: view === 'all' },
        { label: 'Active stays', value: data.activeStays, hint: 'pending through in-house', icon: KeyRound, href: listHref(GUESTS, { view: 'upcoming', q }), active: view === 'upcoming' },
        { label: 'Verify before arrival', value: data.verify, hint: 'upcoming stay, not verified', tone: data.verify ? 'warning' : 'success', icon: UserRoundCheck, href: listHref(GUESTS, { view: 'verify', q }), active: view === 'verify' },
        { label: 'Open conversations', value: data.openConversations, hint: 'with a guest profile', icon: MessageSquare },
      ]} />
      <ListSection
        basePath={GUESTS}
        view={view}
        q={q}
        placeholder="Search name, email, phone, or code"
        noun={{ singular: 'guest', plural: 'guests' }}
        total={data.total}
        visible={data.matching}
        pagination={paged}
        tabs={[
          { id: 'all', label: 'All', count: data.tabAll },
          { id: 'upcoming', label: 'Active stay', count: data.tabUpcoming },
          { id: 'verify', label: 'Needs verification', count: data.tabVerify, tone: 'warning' },
          { id: 'verified', label: 'Verified', count: data.tabVerified },
        ]}
        empty={<EmptyState icon={UsersRound} title="No guests yet" description="Guest profiles appear here once someone books or sends an inquiry." />}
        footer="Verification records an identity result. It isn’t a safety guarantee."
      >
        <DataTable rows={paged.rows} columns={columns} getKey={(guest) => guest.id} caption="Guests" />
      </ListSection>
      </>}
    </PageBody>
  </PlatformPage>;
}

/* ───────────────────────── Agreements ───────────────────────── */

const AGREEMENTS = '/dashboard/platform/agreements';

function signingLink(agreement: any, now: number) {
  if (agreement.signingTokenRevokedAt) return { label: 'Revoked', tone: 'neutral' as const };
  if (!agreement.signingTokenExpiresAt) return { label: 'Not issued', tone: 'neutral' as const };
  if (new Date(agreement.signingTokenExpiresAt).getTime() < now) return { label: 'Expired', tone: 'danger' as const };
  return { label: `Expires ${formatTimestamp(agreement.signingTokenExpiresAt)}`, tone: 'info' as const };
}

export async function AgreementLifecycleWorkspace({ searchParams }: ListProps = {}) {
  const { q, view: requested, page } = await readSearchParams(searchParams);
  const view = pickView(requested, ['all', 'awaiting', 'expired', 'review', 'signed', 'voided'] as const, 'all');
  const result = await getAgreementWorkspace({ q, view, page });
  const data = result.data;
  const paged = serverPage<any>(data?.stayAgreements || [], result.page, data?.matching || 0);
  const now = Date.now();
  const closedStay = (agreement: any) => agreement.status === 'signed' && ['cancelled', 'no_show'].includes(agreement.reservation?.status);

  const columns: Array<Column<any>> = [
    { id: 'agreement', header: 'Agreement', cell: (agreement) => <div className="min-w-0 max-w-xs">
      <RowLink href={platformDetailPath('agreement', agreement.id)}>{agreement.agreementNumber}</RowLink>
      <SubLine>{agreement.title}</SubLine>
      <SubLine mobileOnly="md">{agreement.guest?.name || agreement.signerEmail}</SubLine>
      <SubLine mobileOnly="lg">{agreement.reservation ? `${agreement.reservation.confirmationCode} · ${formatDayRange(agreement.reservation.checkInDate, agreement.reservation.checkOutDate)}` : 'Not linked to a stay'}</SubLine>
    </div> },
    { id: 'guest', header: 'Signer', hideBelow: 'md', cell: (agreement) => <div className="min-w-0"><span className="block truncate">{agreement.guest?.name || '—'}</span><SubLine>{agreement.signerEmail}</SubLine></div> },
    { id: 'stay', header: 'Stay', hideBelow: 'lg', cell: (agreement) => agreement.reservation ? <div className="min-w-0 max-w-xs"><span className="block truncate">{agreement.reservation.listing?.title || 'Listing unavailable'}</span><SubLine>{agreement.reservation.confirmationCode} · {formatDayRange(agreement.reservation.checkInDate, agreement.reservation.checkOutDate)}</SubLine></div> : <Muted>Not linked</Muted> },
    { id: 'status', header: 'Status', cell: (agreement) => <div><StatusBadge status={agreement.status} />{closedStay(agreement) ? <SubLine className={toneText.warning}>Stay {sentence(agreement.reservation.status).toLowerCase()} — review</SubLine> : null}</div> },
    { id: 'link', header: 'Signing link', hideBelow: 'lg', cell: (agreement) => { const link = signingLink(agreement, now); return <span className={cn('whitespace-nowrap text-sm', link.tone === 'danger' ? toneText.danger : 'text-muted-foreground')}>{agreement.status === 'signed' ? 'Used' : link.label}</span>; } },
    { id: 'signed', header: 'Signed', hideBelow: 'xl', cell: (agreement) => <Muted className="whitespace-nowrap">{agreement.signedAt ? formatTimestamp(agreement.signedAt) : '—'}</Muted> },
  ];

  return <PlatformPage section="Agreements" sectionHref="/platform/agreements">
    <PageHeader title="Agreements" description="Stay terms issued to guests and the signature recorded against each one." actions={<RecordsLink href="/dashboard/stay-agreements" />} />
    <PageBody>
      {result.error || !data ? <WorkspaceUnavailable retryHref={AGREEMENTS} error={result.error} /> : <>
      <StatTiles items={[
        { label: 'Issued', value: data.total, hint: 'agreement snapshots', icon: ReceiptText, href: listHref(AGREEMENTS, { q }), active: view === 'all' },
        { label: 'Awaiting signature', value: data.awaiting, hint: 'draft or sent', tone: data.awaiting ? 'warning' : 'success', icon: FileCheck2, href: listHref(AGREEMENTS, { view: 'awaiting', q }), active: view === 'awaiting' },
        { label: 'Link expired', value: data.expired, hint: 'unsigned, link past expiry', tone: data.expired ? 'danger' : 'success', icon: AlertCircle, href: listHref(AGREEMENTS, { view: 'expired', q }), active: view === 'expired' },
        { label: 'Signed', value: data.signed, hint: `${data.voided} voided`, icon: ShieldCheck },
      ]} />
      {data.review ? <Callout tone="warning" title={`${plural(data.review, 'agreement')} signed for a stay that didn’t go ahead`} action={<Button asChild size="sm" variant="outline"><Link href={listHref(AGREEMENTS, { view: 'review', q })}>Review</Link></Button>}>
        Void these so the record matches the cancelled stay. Terms and signature are kept.
      </Callout> : null}
      <ListSection
        basePath={AGREEMENTS}
        view={view}
        q={q}
        placeholder="Search number, guest, or stay"
        noun={{ singular: 'agreement', plural: 'agreements' }}
        total={data.total}
        visible={data.matching}
        pagination={paged}
        tabs={[
          { id: 'all', label: 'All', count: data.tabAll },
          { id: 'awaiting', label: 'Awaiting signature', count: data.tabAwaiting, tone: 'warning' },
          { id: 'expired', label: 'Link expired', count: data.tabExpired, tone: 'danger' },
          { id: 'review', label: 'Stay cancelled', count: data.tabReview, tone: 'warning' },
          { id: 'signed', label: 'Signed', count: data.tabSigned },
          { id: 'voided', label: 'Voided', count: data.tabVoided },
        ]}
        empty={<EmptyState icon={FileSignature} title="No agreements issued" description="Agreements are created as part of a reservation and signed by the guest through their agreement link." />}
        footer="Terms snapshots and signatures can’t be edited. Open an agreement to reissue its signing link or void it."
      >
        <DataTable rows={paged.rows} columns={columns} getKey={(agreement) => agreement.id} caption="Stay agreements" />
      </ListSection>
      </>}
    </PageBody>
  </PlatformPage>;
}

/* ───────────────────────── Pricing ───────────────────────── */

const PRICING = '/dashboard/platform/pricing';

export async function PricingHealthWorkspace({ searchParams }: ListProps = {}) {
  const { q, view: requested, page } = await readSearchParams(searchParams);
  const view = pickView(requested, ['all', 'attention', 'active', 'inactive'] as const, 'all');
  const [result, capabilities] = await Promise.all([getPricingWorkspace({ q, view, page }), getPlatformCapabilities()]);
  const data = result.data;
  const mayCreate = capabilities.known ? capabilities.canManagePricing : true;
  const inUse = new Set(result.effectivePlanIds);
  const paged = serverPage<any>(data?.ratePlans || [], result.page, data?.matching || 0);
  const currencyMismatch = (plan: any) => Boolean(plan.listing && plan.currencyCode !== plan.listing.currencyCode);
  const unpriced = data?.unpricedLiveListings || 0;
  const createHref = ratePlanCreatePath();

  const columns: Array<Column<any>> = [
    { id: 'plan', header: 'Rate plan', cell: (plan) => {
      const rules = effectiveArrivalRules(plan, plan.listing);
      return <div className="min-w-0 max-w-xs">
        <div className="flex min-w-0 items-center gap-2"><RowLink href={platformDetailPath('ratePlan', plan.id)} className="truncate">{plan.name}</RowLink>{plan.isDefault ? <Pill tone="info">Default</Pill> : null}{inUse.has(plan.id) ? <Pill tone="success">In use</Pill> : null}</div>
        <SubLine>{plan.listing?.title || 'No listing attached'}</SubLine>
        <SubLine mobileOnly="md">{plan.cancellationPolicy?.name || 'No cancellation policy'}</SubLine>
        <SubLine mobileOnly="lg">{plan.minimumStay}{plan.maximumStay ? `–${plan.maximumStay}` : '+'} nights</SubLine>
        <SubLine className="xl:hidden">{rules.notice} · {rules.window}</SubLine>
      </div>;
    } },
    { id: 'status', header: 'Status', cell: (plan) => <StatusBadge status={plan.status} /> },
    { id: 'base', header: 'Base nightly', align: 'right', cell: (plan) => <div>{plan.baseNightlyRateCents > 0 ? <span className="font-medium">{formatMoney(plan.baseNightlyRateCents, plan.currencyCode)}</span> : <span className={toneText.danger}>Not sellable</span>}{currencyMismatch(plan) ? <SubLine className={toneText.danger}>Listing sells in {plan.listing.currencyCode}</SubLine> : null}</div> },
    { id: 'stay', header: 'Stay length', hideBelow: 'lg', cell: (plan) => <Muted className="whitespace-nowrap">{plan.minimumStay}{plan.maximumStay ? `–${plan.maximumStay}` : '+'} nights</Muted> },
    { id: 'policy', header: 'Cancellation', hideBelow: 'md', cell: (plan) => plan.cancellationPolicy ? <span className="block max-w-[12rem] truncate">{plan.cancellationPolicy.name}</span> : <span className={toneText.warning}>Missing</span> },
    { id: 'seasons', header: 'Seasonal', hideBelow: 'xl', cell: (plan) => {
      const next = plan.nextSeason?.[0];
      if (!plan.activeSeasonsCount || !next) return <Muted>None</Muted>;
      return <div className="min-w-0"><span>{plural(plan.activeSeasonsCount, 'window')}</span><SubLine>{next.name} · {formatDayRange(next.startDate, next.endDate)}</SubLine></div>;
    } },
    { id: 'notice', header: 'Notice · window', hideBelow: 'xl', cell: (plan) => {
      const rules = effectiveArrivalRules(plan, plan.listing);
      return <div className="whitespace-nowrap"><Muted>{rules.notice} · {rules.window}</Muted>{rules.noticeFromListing || rules.windowFromListing ? <SubLine>From listing</SubLine> : null}</div>;
    } },
  ];

  return <PlatformPage section="Pricing" sectionHref="/platform/pricing">
    <PageHeader
      title="Pricing"
      description="Rate plans, seasonal windows, and cancellation policies — and any listing that can’t be priced."
      actions={<>
        <RecordsLink href="/dashboard/rate-plans">Rate-plan records</RecordsLink>
        {mayCreate ? <Button asChild size="sm"><Link href={createHref}><Plus aria-hidden="true" />New rate plan</Link></Button> : null}
      </>}
    />
    <PageBody>
      {result.error || !data ? <WorkspaceUnavailable retryHref={PRICING} error={result.error} /> : <>
      {unpriced ? <Callout tone="danger" title={`${plural(unpriced, 'live listing')} can’t be priced`} action={<Button asChild size="sm" variant="outline"><Link href={listHref(LISTINGS, { view: 'attention' })}>Review</Link></Button>}>
        Published without a usable rate:{' '}
        {data.unpricedListings.map((listing: any, index: number) => <span key={listing.id}>{index ? ', ' : ''}<Link href={platformDetailPath('listing', listing.id)} className="font-medium underline underline-offset-2">{listing.title}</Link></span>)}
        {unpriced > data.unpricedListings.length ? ` and ${unpriced - data.unpricedListings.length} more` : ''}.
      </Callout> : null}
      <StatTiles items={[
        { label: 'Active plans', value: data.active, hint: `${data.total} total`, icon: Gauge, href: listHref(PRICING, { view: 'active', q }), active: view === 'active' },
        { label: 'Priced live listings', value: `${data.liveListings - unpriced}/${data.liveListings}`, hint: 'have a usable rate', tone: unpriced ? 'danger' : 'success', icon: CircleDollarSign },
        { label: 'Seasonal windows', value: data.activeSeasons, hint: 'active date overrides', icon: CalendarClock },
        { label: 'Needs attention', value: data.attention, hint: 'inactive, unpriced, or no policy', tone: data.attention ? 'warning' : 'success', icon: AlertCircle, href: listHref(PRICING, { view: 'attention', q }), active: view === 'attention' },
      ]} />
      <ListSection
        basePath={PRICING}
        view={view}
        q={q}
        placeholder="Search plan, listing, or policy"
        noun={{ singular: 'rate plan', plural: 'rate plans' }}
        total={data.total}
        visible={data.matching}
        pagination={paged}
        tabs={[
          { id: 'all', label: 'All', count: data.tabAll },
          { id: 'attention', label: 'Needs attention', count: data.tabAttention, tone: 'warning' },
          { id: 'active', label: 'Active', count: data.tabActive },
          { id: 'inactive', label: 'Inactive', count: data.tabInactive },
        ]}
        empty={<EmptyState icon={CircleDollarSign} title="No rate plans yet" description="Listings can sell on their base nightly rate. Add rate plans for stay rules, seasons, and cancellation terms." action={mayCreate ? <Button asChild size="sm" variant="outline"><Link href={createHref}>New rate plan</Link></Button> : undefined} />}
      >
        <DataTable rows={paged.rows} columns={columns} getKey={(plan) => plan.id} caption="Rate plans" />
      </ListSection>
      </>}
    </PageBody>
  </PlatformPage>;
}

/* ───────────────────────── Inbox ───────────────────────── */

const INBOX = '/dashboard/platform/inbox';

export async function InboxTriageWorkspace({ searchParams }: ListProps = {}) {
  const { q, view: requested, page } = await readSearchParams(searchParams);
  const view = pickView(requested, ['all', 'reply', 'failed', 'open', 'snoozed', 'archived'] as const, 'all');
  const result = await getInboxWorkspace({ q, view, page });
  const data = result.data;
  const needsReply = new Set(result.needsReplyIds || []);
  const paged = serverPage<any>(data?.conversations || [], result.page, data?.matching || 0);

  return <PlatformPage section="Inbox" sectionHref="/platform/inbox">
    <PageHeader title="Inbox" description="Guest and channel conversations, most recent activity first." actions={<RecordsLink href="/dashboard/conversations" />} />
    <PageBody>
      {result.error || !data ? <WorkspaceUnavailable retryHref={INBOX} error={result.error} /> : <>
      <StatTiles items={[
        { label: 'Open threads', value: data.open, hint: `${data.total} total`, icon: Inbox, href: listHref(INBOX, { view: 'open', q }), active: view === 'open' },
        { label: 'Needs reply', value: needsReply.size, hint: 'latest message is from the guest', tone: needsReply.size ? 'warning' : 'success', icon: MessageSquare, href: listHref(INBOX, { view: 'reply', q }), active: view === 'reply' },
        { label: 'Delivery failed', value: data.failed, hint: 'at least one message failed', tone: data.failed ? 'danger' : 'success', icon: AlertCircle, href: listHref(INBOX, { view: 'failed', q }), active: view === 'failed' },
        { label: 'Via channels', value: data.viaChannels, hint: 'routed through a connection', icon: RadioTower },
      ]} />
      <ListSection
        basePath={INBOX}
        view={view}
        q={q}
        placeholder="Search guest, listing, code, or messages"
        noun={{ singular: 'conversation', plural: 'conversations' }}
        total={data.total}
        visible={data.matching}
        pagination={paged}
        tabs={[
          { id: 'all', label: 'All', count: data.tabAll },
          { id: 'reply', label: 'Needs reply', count: data.tabReply, tone: 'warning' },
          { id: 'failed', label: 'Failed', count: data.tabFailed, tone: 'danger' },
          { id: 'open', label: 'Open', count: data.tabOpen },
          { id: 'snoozed', label: 'Snoozed', count: data.tabSnoozed },
          { id: 'archived', label: 'Archived', count: data.tabArchived },
        ]}
        empty={<EmptyState icon={Inbox} title="No conversations yet" description="Messages from guests and connected channels will appear here." />}
      >
        <ul className="divide-y">
          {paged.rows.map((conversation: any) => {
            const latest = conversation.latest?.[0];
            const reply = needsReply.has(conversation.id);
            const failure = (conversation.failedMessagesCount || 0) > 0;
            return <li key={conversation.id} className={cn('relative flex min-w-0 gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40', reply && 'bg-amber-50/40 dark:bg-amber-950/10')}>
              <Avatar name={conversation.guest?.name || conversation.subject} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-baseline justify-between gap-3">
                  <RowLink href={platformDetailPath('conversation', conversation.id)} className="truncate">{conversation.guest?.name || conversation.subject || 'Guest conversation'}</RowLink>
                  <time className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatTimestamp(conversation.lastMessageAt || latest?.createdAt)}</time>
                </div>
                <SubLine>{[conversation.listing?.title, conversation.reservation?.confirmationCode, conversation.channelConnection?.name || 'Direct'].filter(Boolean).join(' · ')}</SubLine>
                <p className="mt-1.5 flex min-w-0 items-start gap-1.5 text-sm text-foreground/80">
                  {latest ? latest.direction === 'inbound' ? <ArrowDownLeft aria-label="Inbound" className="mt-0.5 size-3.5 shrink-0 text-amber-600" /> : <ArrowUpRight aria-label="Outbound" className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /> : null}
                  <span className="line-clamp-1 min-w-0">{latest?.body || <Muted>No messages in this thread.</Muted>}</span>
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {reply ? <StatusBadge tone="warning" label="Needs reply" /> : null}
                  {failure ? <StatusBadge tone="danger" label="Delivery failed" /> : null}
                  {!reply && !failure ? <StatusBadge status={conversation.status} /> : null}
                  {latest?.direction === 'outbound' && latest.status === 'sent' && !conversation.channelConnection ? <Pill>Replied · on guest’s page</Pill> : null}
                  {conversation.reservation ? <Pill>Stay {sentence(conversation.reservation.status).toLowerCase()}</Pill> : null}
                </div>
              </div>
            </li>;
          })}
        </ul>
      </ListSection>
      </>}
    </PageBody>
  </PlatformPage>;
}

/* ───────────────────────── Payments ───────────────────────── */

const PAYMENTS = '/dashboard/platform/payments';

export async function PaymentLifecycleWorkspace({ searchParams }: ListProps = {}) {
  const { q, view: requested, page } = await readSearchParams(searchParams);
  const view = pickView(requested, ['all', 'exceptions', 'processing', 'succeeded'] as const, 'all');
  const result = await getPaymentWorkspace({ q, view, page });
  const data = result.data;
  const totals = result.totals;
  const providers = data?.paymentProviders || [];
  const paged = serverPage<any>(data?.payments || [], result.page, data?.matching || 0);
  const openRefundCents = (payment: any) => (payment.openRefunds || []).reduce((sum: number, refund: any) => sum + (refund.amountCents || 0), 0);
  const refundsOwed = totals?.refundsOwed ? moneyByCurrency(totals.refundsOwed) : [];
  const refundCell = (payment: any) => {
    const owed = openRefundCents(payment);
    if (!payment.refundedAmountCents && !owed) return null;
    return <>{payment.refundedAmountCents ? <span className={toneText.warning}>−{formatMoney(payment.refundedAmountCents, payment.currencyCode)} refunded</span> : null}{payment.refundedAmountCents && owed ? ' · ' : ''}{owed ? <span className={toneText.danger}>{formatMoney(owed, payment.currencyCode)} owed to guest</span> : null}</>;
  };

  const columns: Array<Column<any>> = [
    { id: 'payment', header: 'Payment', cell: (payment) => <div className="min-w-0 max-w-xs">
      <RowLink href={platformDetailPath('payment', payment.id)}>{payment.reservation?.confirmationCode || 'Unlinked payment'}</RowLink>
      <SubLine>{payment.reservation?.guest?.name || 'Guest unavailable'}{payment.reservation?.listing?.title ? ` · ${payment.reservation.listing.title}` : ''}</SubLine>
      {tenderLabel(payment.tenderKind, payment.reservation) && payment.tenderKind !== 'manual'
        ? <SubLine className={isRealTender(payment.tenderKind) ? undefined : toneText.warning}>{tenderLabel(payment.tenderKind, payment.reservation)}</SubLine> : null}
      {payment.errorMessage ? <SubLine className={toneText.danger}>{payment.errorMessage}</SubLine> : null}
      {refundCell(payment) ? <SubLine mobileOnly="md">{refundCell(payment)}</SubLine> : null}
      <SubLine mobileOnly="lg">{sentence(payment.paymentMethod)} · {payment.paymentProvider?.name || payment.provider || 'Manual'}{payment.processedAt ? ` · ${formatTimestamp(payment.processedAt)}` : ''}</SubLine>
    </div> },
    { id: 'amount', header: 'Amount', align: 'right', cell: (payment) => <span className="font-medium">{formatMoney(payment.amountCents, payment.currencyCode)}</span> },
    { id: 'refunded', header: 'Refunds', align: 'right', hideBelow: 'md', cell: (payment) => {
      const owed = openRefundCents(payment);
      if (!payment.refundedAmountCents && !owed) return <Muted>—</Muted>;
      return <div>{payment.refundedAmountCents ? <span className={toneText.warning}>−{formatMoney(payment.refundedAmountCents, payment.currencyCode)}</span> : null}{owed ? <SubLine className={toneText.danger}>{formatMoney(owed, payment.currencyCode)} owed to guest</SubLine> : null}</div>;
    } },
    { id: 'status', header: 'Status', cell: (payment) => <StatusBadge status={payment.status} /> },
    { id: 'method', header: 'Method', hideBelow: 'lg', cell: (payment) => <div><span>{sentence(payment.paymentMethod)}</span><SubLine>{payment.paymentProvider?.name || payment.provider || 'Manual'}</SubLine></div> },
    { id: 'reference', header: 'Provider ref.', hideBelow: 'xl', cell: (payment) => payment.providerPaymentId ? <span className="block max-w-[10rem] truncate font-mono text-xs text-muted-foreground" title={payment.providerPaymentId}>{payment.providerPaymentId}</span> : <Muted>Not recorded</Muted> },
    { id: 'processed', header: 'Processed', hideBelow: 'lg', cell: (payment) => <Muted className="whitespace-nowrap">{payment.processedAt ? formatTimestamp(payment.processedAt) : '—'}</Muted> },
  ];

  return <PlatformPage section="Payments" sectionHref="/platform/payments">
    <PageHeader title="Payments" description="Charges and refunds recorded against stays, with the provider reference behind each one." actions={<RecordsLink href="/dashboard/payment-providers">Provider settings</RecordsLink>} />
    <PageBody>
      {result.error || !data ? <WorkspaceUnavailable retryHref={PAYMENTS} error={result.error} /> : <>
      <StatTiles items={[
        { label: 'Recorded net', value: totals?.settledNet ? formatCurrencyTotals(moneyByCurrency(totals.settledNet), 'None') : 'Unavailable', hint: totals?.settledNet ? `${plural(data.settled, 'settled payment')}, less refunds · test bookings excluded` : totals?.error, icon: Banknote, href: listHref(PAYMENTS, { q }), active: view === 'all' },
        { label: 'Processing', value: data.processing, hint: 'provider outcome pending', icon: RefreshCcw, href: listHref(PAYMENTS, { view: 'processing', q }), active: view === 'processing' },
        { label: 'Exceptions', value: data.exceptions, hint: refundsOwed.length ? `${formatCurrencyTotals(refundsOwed, '')} in refunds owed` : 'failed, refunded, or refund owed', tone: data.exceptions ? 'warning' : 'success', icon: AlertCircle, href: listHref(PAYMENTS, { view: 'exceptions', q }), active: view === 'exceptions' },
        { label: 'Providers installed', value: data.providersInstalled, hint: `${data.providers} configured`, icon: ShieldCheck },
      ]} />
      <ListSection
        basePath={PAYMENTS}
        view={view}
        q={q}
        placeholder="Search code, guest, or reference"
        noun={{ singular: 'payment', plural: 'payments' }}
        total={data.total}
        visible={data.matching}
        pagination={paged}
        tabs={[
          { id: 'all', label: 'All', count: data.tabAll },
          { id: 'exceptions', label: 'Exceptions', count: data.tabExceptions, tone: 'warning' },
          { id: 'processing', label: 'Processing', count: data.tabProcessing },
          { id: 'succeeded', label: 'Succeeded', count: data.tabSucceeded },
        ]}
        empty={<EmptyState icon={CircleDollarSign} title="No payments recorded" description="Payments appear here when a guest pays for a stay or an operator records a manual payment." />}
      >
        <DataTable rows={paged.rows} columns={columns} getKey={(payment) => payment.id} caption="Payments" />
      </ListSection>
      <Section title="Payment providers" icon={ShieldCheck} description="Installed adapters. Configuration alone doesn’t confirm the provider is reachable." count={data.providers} flush>
        {providers.length ? <ul className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-3">
          {providers.map((provider: any) => <li key={provider.id} className="flex min-w-0 items-center justify-between gap-3 bg-card px-4 py-3">
            <div className="min-w-0"><p className="truncate text-sm font-medium">{provider.name}</p><p className="truncate font-mono text-xs text-muted-foreground">{provider.code}</p></div>
            <StatusBadge tone={provider.isInstalled ? 'success' : 'neutral'} label={provider.isInstalled ? 'Installed' : 'Not installed'} />
          </li>)}
        </ul> : <EmptyState compact icon={ShieldCheck} title="No providers configured" description="Add a payment provider to accept card payments." action={<Button asChild size="sm" variant="outline"><Link href="/dashboard/payment-providers">Provider settings</Link></Button>} />}
      </Section>
      </>}
    </PageBody>
  </PlatformPage>;
}

/* ───────────────────────── Reviews ───────────────────────── */

const REVIEWS = '/dashboard/platform/reviews';
const categoryRatings = (review: any): Array<[string, number]> => ([['Cleanliness', review.cleanlinessRating], ['Accuracy', review.accuracyRating], ['Communication', review.communicationRating], ['Location', review.locationRating], ['Value', review.valueRating]] as Array<[string, number]>).filter(([, value]) => Boolean(value));

export async function ReviewRecoveryWorkspace({ searchParams }: ListProps = {}) {
  const { q, view: requested, page } = await readSearchParams(searchParams);
  const view = pickView(requested, ['all', 'recovery', 'unpublished', 'published'] as const, 'all');
  const result = await getReviewWorkspace({ q, view, page });
  const data = result.data;
  const paged = serverPage<any>(data?.reviews || [], result.page, data?.matching || 0);
  const listings = data?.lowestRated || [];

  const columns: Array<Column<any>> = [
    { id: 'review', header: 'Review', cell: (review) => <div className="min-w-0 max-w-xs">
      <RowLink href={platformDetailPath('review', review.id)}>{review.listing?.title || 'Listing'}</RowLink>
      <SubLine>{review.guest?.name || sentence(review.direction)}{review.reservation?.confirmationCode ? ` · ${review.reservation.confirmationCode}` : ''}</SubLine>
      <SubLine mobileOnly="md">{formatTimestamp(review.publishedAt || review.submittedAt || review.createdAt)}</SubLine>
      <SubLine mobileOnly="lg">{review.body || review.privateFeedback || 'No written feedback.'}</SubLine>
    </div> },
    { id: 'rating', header: 'Rating', cell: (review) => review.overallRating ? <span className="inline-flex items-center gap-2 whitespace-nowrap"><Stars rating={review.overallRating} /><span className={cn('text-xs font-medium tabular-nums', review.overallRating <= 2 ? toneText.danger : review.overallRating <= 3 ? toneText.warning : 'text-muted-foreground')}>{review.overallRating}/5</span></span> : <Muted>Not rated</Muted> },
    { id: 'feedback', header: 'Feedback', hideBelow: 'lg', cell: (review) => <span className="line-clamp-2 max-w-md text-sm text-muted-foreground">{review.body || review.privateFeedback || 'No written feedback.'}</span> },
    { id: 'low', header: 'Low scores', hideBelow: 'xl', cell: (review) => { const low = categoryRatings(review).filter(([, value]) => value <= 3); return low.length ? <div className="flex flex-wrap gap-1">{low.map(([label, value]) => <Pill key={label} tone={value <= 2 ? 'danger' : 'warning'}>{label} {value}</Pill>)}</div> : <Muted>—</Muted>; } },
    { id: 'status', header: 'Status', cell: (review) => <StatusBadge status={review.status} /> },
    { id: 'date', header: 'Date', hideBelow: 'md', cell: (review) => <Muted className="whitespace-nowrap">{formatTimestamp(review.publishedAt || review.submittedAt || review.createdAt)}</Muted> },
  ];

  return <PlatformPage section="Reviews" sectionHref="/platform/reviews">
    <PageHeader title="Reviews" description="Guest feedback by stay. Low scores point to the cleaning, accuracy, or communication fix to make next." actions={<RecordsLink href="/dashboard/reviews" />} />
    <PageBody>
      {result.error || !data ? <WorkspaceUnavailable retryHref={REVIEWS} error={result.error} /> : <>
      <StatTiles items={[
        { label: 'Published', value: data.published, hint: `${data.total} total`, icon: Star, href: listHref(REVIEWS, { view: 'published', q }), active: view === 'published' },
        { label: 'Needs recovery', value: data.recovery, hint: 'guest rating 3 or below', tone: data.recovery ? 'warning' : 'success', icon: RefreshCcw, href: listHref(REVIEWS, { view: 'recovery', q }), active: view === 'recovery' },
        { label: 'Awaiting moderation', value: data.unpublished, hint: 'submitted by guests, not yet public', tone: data.submitted ? 'warning' : undefined, icon: CalendarClock, href: listHref(REVIEWS, { view: 'unpublished', q }), active: view === 'unpublished' },
        { label: 'Rated listings', value: data.ratedListings, hint: 'with an average score', icon: Sparkles },
      ]} />
      <ListSection
        basePath={REVIEWS}
        view={view}
        q={q}
        placeholder="Search listing, guest, or text"
        noun={{ singular: 'review', plural: 'reviews' }}
        total={data.total}
        visible={data.matching}
        pagination={paged}
        tabs={[
          { id: 'all', label: 'All', count: data.tabAll },
          { id: 'recovery', label: 'Needs recovery', count: data.tabRecovery, tone: 'warning' },
          { id: 'unpublished', label: 'Awaiting moderation', count: data.tabUnpublished, tone: 'warning' },
          { id: 'published', label: 'Published', count: data.tabPublished },
        ]}
        empty={<EmptyState icon={Star} title="No reviews yet" description="Reviews arrive after checkout, once a guest or host submits feedback for the stay." />}
        footer="Open a review to publish, hold, or remove it."
      >
        <DataTable rows={paged.rows} columns={columns} getKey={(review) => review.id} caption="Reviews" />
      </ListSection>
      {listings.length ? <Section title="Listing reputation" icon={Sparkles} description="Average guest rating per listing, lowest first." count={data.ratedListings} footer={data.ratedListings > listings.length ? `Lowest ${listings.length} of ${data.ratedListings} rated listings.` : undefined} flush>
        <DataTable
          dense
          rows={listings}
          getKey={(listing: any) => listing.id}
          caption="Listing reputation"
          columns={[
            { id: 'listing', header: 'Listing', cell: (listing: any) => <RowLink href={platformDetailPath('listing', listing.id)}>{listing.title}</RowLink> },
            { id: 'average', header: 'Average', cell: (listing: any) => { const average = (listing.reviewAverageHundredths || 0) / 100; return <span className="inline-flex items-center gap-2 whitespace-nowrap"><Stars rating={average} /><span className={cn('text-xs font-medium tabular-nums', average < 4 ? toneText.warning : 'text-muted-foreground')}>{average.toFixed(2)}</span></span>; } },
            { id: 'count', header: 'Reviews', align: 'right', cell: (listing: any) => listing.reviewCount },
          ]}
        />
      </Section> : null}
      </>}
    </PageBody>
  </PlatformPage>;
}
