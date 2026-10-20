import {
  AlertTriangle, ArrowDownLeft, ArrowUpRight, BadgeCheck, Banknote, BedDouble, CalendarDays, CheckCircle2,
  CircleDashed, CircleDollarSign, ClipboardList, FileCheck2, FileSignature, Home, Inbox, KeyRound, Landmark,
  ListChecks, Lock, Mail, MapPin, MessageSquare, Pencil, Phone, Plus, RadioTower, ReceiptText, RefreshCcw, Settings2,
  ShieldCheck, Star, UserRound, Users, WalletCards, Webhook,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { mappingHealth, mappingOperational } from '@/features/platform/channels/lib/mappingStatus';
import { getPlatformCapabilities, type PlatformCapabilities } from '@/features/platform/lib/capabilities';
import { DataTable } from '@/features/platform/operations/components/DataTable';
import { Disclosure, Field, Select, TextArea, TextInput, TimezoneInput } from '@/features/platform/operations/components/FormControls';
import { MoneyInput } from '@/features/platform/operations/components/MoneyInput';
import {
  AttentionList, Avatar, Callout, DescriptionList, DetailGrid, EmptyRow, EmptyState, FactGrid, LinkRows,
  MetaItem, Muted, PageBody, PageHeader, Pill, PlatformPage, ProgressBar, RowLink,
  Section, StatTiles, Stars, StatusBadge, SubLine, Timeline, TwoColumn, toneText, type AttentionItem,
} from '@/features/platform/operations/components/PlatformUI';
import { StayChecks } from '@/features/platform/operations/components/StayChecks';
import { ConfirmSubmitButton, SubmitButton } from '@/features/platform/operations/components/SubmitButton';
import {
  formatDayRange, formatMoney, formatTimestamp, humanize, isPast, nightsBetween,
  operationalTone, plural, propertyReadiness, sentence, type OperationalTone,
} from '@/features/platform/operations/lib/operations';
import { isRealTender, tenderLabel } from '@/features/platform/operations/lib/provenance';
import { platformDetailPath, rawRecordPath } from '@/features/platform/operations/lib/routes';
import { cn } from '@/lib/utils';
import { RefundActions } from '@/features/platform/reservations/screens/ReservationDetailPage';
import { createRefundAction } from '@/features/platform/reservations/actions/reservations';
import { AgreementLinkReissue } from '../components/AgreementLinkReissue';
import { ScoreMeter } from '../components/ScoreMeter';
import { effectiveArrivalRules } from '../lib/arrivalRules';
import { unavailableWorkspaceRecordMessage } from '../lib/detailFeedback';
import { formatCurrencyTotals, moneyByCurrency } from '../lib/money';
import { listingCreatePath, listingEditPath, ratePlanCreatePath, ratePlanEditPath } from '../lib/routes';
import type { OnlineReadiness, PropertyListingSummary } from '../lib/readinessIndex';
import { listingSetup } from '../lib/sellability';
import {
  getAgreementDetailWorkspace, getConversationDetailWorkspace, getGuestDetailWorkspace,
  getListingDetailWorkspace, getPaymentDetailWorkspace, getPayoutDetailWorkspace,
  getPropertyDetailWorkspace, getRatePlanDetailWorkspace, getReviewDetailWorkspace,
  createPropertyUnitAction, recordPropertyAddressAction,
  recordPropertyRegistrationAction, transitionListingAction, transitionPropertyAction,
  conversationLinkAction, conversationStatusAction, moderateReviewAction, recordArrivalInstructionsAction, reissueAgreementLinkAction,
  voidAgreementAction,
} from '../actions/detailWorkspaces';
import { ConversationReplyForm } from '../components/ConversationReplyForm';

type DetailQuery = { error?: string; notice?: string; before?: string };
type DetailProps = { params: Promise<{ id: string }>; searchParams?: Promise<DetailQuery> };

/** Result of the last action on this page, carried in the URL after a redirect. */
function ActionOutcome({ query }: { query: DetailQuery }) {
  return <>
    {query.error ? <Callout live tone="warning" title="That change wasn’t saved">{query.error}</Callout> : null}
    {query.notice ? <Callout live tone="success" title="Saved">{query.notice}</Callout> : null}
  </>;
}

const reservationPath = (id: string) => `/dashboard/platform/reservations/${encodeURIComponent(id)}`;
const searchPath = (path: string, q?: string | null) => q ? `${path}?q=${encodeURIComponent(q)}` : path;
const closedTask = ['completed', 'cancelled'];
const settledPaymentStatuses = ['succeeded', 'partially_refunded', 'refunded'];

function RecordLink({ href, children = 'Edit record' }: { href: string; children?: ReactNode }) {
  return <Button asChild size="sm" variant="outline"><Link href={href}><Settings2 aria-hidden="true" />{children}</Link></Button>;
}

function DetailUnavailable({ section, sectionHref, error }: { section: string; sectionHref: string; error?: string | null }) {
  return <PlatformPage section={section} sectionHref={sectionHref} current="Unavailable">
    <PageBody className="pt-6">
      <Section>
        <EmptyState
          icon={Lock}
          title="This record isn’t available"
          description={error ? 'The record couldn’t be loaded right now. Try again in a moment.' : unavailableWorkspaceRecordMessage}
          action={<Button asChild variant="outline" size="sm"><Link href={`/dashboard${sectionHref}`}>Back to {section.toLowerCase()}</Link></Button>}
        />
      </Section>
    </PageBody>
  </PlatformPage>;
}

function PartialLoad({ error }: { error?: string | null }) {
  return error ? <Callout live tone="warning" title="Some details couldn’t be loaded">{error}</Callout> : null;
}

/** Why mutation controls are hidden: an unknown role offers a retry, a known one without the permission is read-only. */
function AccessNotice({ capabilities, allowed, retryHref, children }: { capabilities: PlatformCapabilities; allowed: boolean; retryHref: string; children: ReactNode }) {
  if (!capabilities.known) {
    return <Callout tone="warning" title="Actions are unavailable" action={<Button asChild size="sm" variant="outline"><Link href={retryHref}><RefreshCcw aria-hidden="true" />Try again</Link></Button>}>Your permissions couldn’t be checked.</Callout>;
  }
  return allowed ? null : <Callout tone="neutral" icon={Lock} title="Read-only access">{children}</Callout>;
}

/** "Latest 25 of 140" when a section shows a preview of a longer history. */
function previewLabel(shown: number, total: number, fallback?: string) {
  return total > shown ? `Latest ${shown} of ${total}.` : fallback;
}

/* ───────────────────────── lifecycle ───────────────────────── */

const lifecycle: Record<'property' | 'listing', Record<string, string[]>> = {
  property: { onboarding: ['activate', 'archive'], active: ['pause', 'archive'], paused: ['activate', 'archive'], archived: [] },
  listing: { draft: ['publish', 'archive'], published: ['pause', 'archive'], paused: ['publish', 'archive'], archived: [] },
};

function LifecycleActions({ id, status, kind, publishWarnings = [] }: { id: string; status: string; kind: 'property' | 'listing'; publishWarnings?: string[] }) {
  const transitions = lifecycle[kind][status] || [];
  const action = kind === 'property' ? transitionPropertyAction : transitionListingAction;
  return <>{transitions.map((transition) => <form key={transition} action={action}>
    <input type="hidden" name="id" value={id} />
    <input type="hidden" name="status" value={status} />
    <input type="hidden" name="transition" value={transition} />
    {transition === 'archive'
      ? <ConfirmSubmitButton
          title={`Archive this ${kind}?`}
          description={kind === 'property'
            ? 'Archived properties leave active supply and have no further lifecycle actions in this workspace.'
            : 'Archived listings are removed from sale and have no further lifecycle actions in this workspace.'}
          confirmLabel={`Archive ${kind}`}
          pendingLabel="Archiving…"
        >Archive</ConfirmSubmitButton>
      : transition === 'publish' && publishWarnings.length
        ? <ConfirmSubmitButton
            variant="default"
            destructive={false}
            title="Publish with gaps?"
            description={<><p>Guests will see this listing, but:</p><ul className="mt-2 list-disc space-y-1 pl-5">{publishWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></>}
            confirmLabel="Publish anyway"
            pendingLabel="Publishing…"
          >Publish</ConfirmSubmitButton>
      : <SubmitButton size="sm" variant={transition === 'pause' ? 'outline' : 'default'} pendingLabel={`${humanize(transition).replace(/e$/, '')}ing…`}>{humanize(transition)}</SubmitButton>}
  </form>)}</>;
}

/* ───────────────────────── Property ───────────────────────── */

const accommodationTypes = [
  ['entire_home', 'Entire home'], ['apartment', 'Apartment'], ['cabin', 'Cabin'], ['villa', 'Villa'], ['cottage', 'Cottage'],
  ['chalet', 'Chalet'], ['condo', 'Condo'], ['townhouse', 'Townhouse'], ['guesthouse', 'Guesthouse'], ['unique_stay', 'Unique stay'],
] as const;

const baths = (halfUnits?: number | null) => `${(halfUnits || 0) / 2} bath`;

export async function PropertyDetailPage({ params, searchParams }: DetailProps) {
  const { id } = await params;
  const query = (await searchParams) || {};
  const [result, capabilities] = await Promise.all([getPropertyDetailWorkspace(id), getPlatformCapabilities()]);
  const property = result.data?.property;
  if (!property) return <DetailUnavailable section="Properties" sectionHref="/platform/properties" error={result.error} />;
  const reservations = result.data?.reservations || [];
  const blocks = result.data?.calendarBlocks || [];
  const archived = property.status === 'archived';
  // Archived properties are history: every setup command rejects them, so no form is offered.
  const mayManage = capabilities.canManageProperties && !archived;
  const mayCreateListing = capabilities.canManageListings && !archived;
  // Counts over every listing of the property, from the server's quote rules: not a preview, and
  // readable without listing or pricing access.
  const summary = (property.listingSummary as PropertyListingSummary)?.complete ? property.listingSummary as NonNullable<PropertyListingSummary> : null;
  const listingsHidden = capabilities.known && !capabilities.canReadListings;
  const readiness = propertyReadiness({ timezone: property.timezone, registrationNumber: property.registrationNumber, addressReady: Boolean(property.address?.city && property.address?.countryCode), unitCount: property.unitsCount || 0, publishedListingCount: summary?.published || 0 });
  const sellable = (summary?.bookable || 0) > 0;
  const sellState = !summary ? 'Sellability unavailable' : sellable ? 'Ready to sell' : readiness.percent < 100 ? `${readiness.readyCount}/${readiness.checks.length} setup` : property.status === 'active' ? 'Setup complete · no bookable listing' : 'Setup complete · activate to sell';
  const firstIncomplete = readiness.checks.find((check) => !check.ready)?.id;
  const propertyPath = platformDetailPath('property', property.id);

  const registrationForm = <form action={recordPropertyRegistrationAction} className="grid gap-4 sm:grid-cols-2">
    <input type="hidden" name="propertyId" value={property.id} />
    <Field label="Registration number" hint="As issued by your jurisdiction. Recorded as entered; permits aren’t obtained or validated here."><TextInput required name="registrationNumber" defaultValue={property.registrationNumber || ''} placeholder="STR-2024-00123" /></Field>
    <Field label="Stay timezone" hint="IANA name. Check-in dates and turnovers use this timezone."><TimezoneInput required name="timezone" defaultValue={property.timezone || ''} placeholder="America/New_York" /></Field>
    <div className="sm:col-span-2"><SubmitButton size="sm" pendingLabel="Saving…">Save registration</SubmitButton></div>
  </form>;
  const addressForm = <form action={recordPropertyAddressAction} className="grid gap-4 sm:grid-cols-6">
    <input type="hidden" name="propertyId" value={property.id} />
    <Field label="Street address" optional className="sm:col-span-6"><TextInput name="addressLine1" defaultValue={property.address?.addressLine1 || ''} autoComplete="address-line1" /></Field>
    <Field label="City" className="sm:col-span-3"><TextInput required name="city" defaultValue={property.address?.city || ''} autoComplete="address-level2" /></Field>
    <Field label="Region" optional className="sm:col-span-3"><TextInput name="region" defaultValue={property.address?.region || ''} autoComplete="address-level1" /></Field>
    <Field label="Postal code" optional className="sm:col-span-3"><TextInput name="postalCode" defaultValue={property.address?.postalCode || ''} autoComplete="postal-code" /></Field>
    <Field label="Country code" hint="Two letters, e.g. US" className="sm:col-span-3"><TextInput required name="countryCode" minLength={2} maxLength={2} defaultValue={property.address?.countryCode || 'US'} className="uppercase" /></Field>
    <Field label="Public location label" optional hint="What guests see before booking. Defaults to “City, Region”." className="sm:col-span-6"><TextInput name="publicLocationLabel" defaultValue={property.address?.publicLocationLabel || ''} placeholder="Hudson Valley, NY" /></Field>
    <div className="sm:col-span-6"><SubmitButton size="sm" pendingLabel="Saving…">Save address</SubmitButton></div>
  </form>;
  const unitForm = <form action={createPropertyUnitAction} className="grid gap-4 sm:grid-cols-6">
    <input type="hidden" name="propertyId" value={property.id} />
    <Field label="Unit name" className="sm:col-span-3"><TextInput required name="name" minLength={2} maxLength={120} placeholder="Entire home, or Unit 2A" /></Field>
    <Field label="Accommodation type" className="sm:col-span-3"><Select required name="accommodationType" defaultValue=""><option value="" disabled>Choose a type</option>{accommodationTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
    <Field label="Sleeps" className="sm:col-span-2"><TextInput required name="maxGuests" type="number" min={1} max={50} step={1} inputMode="numeric" /></Field>
    <Field label="Bedrooms" hint="0 for a studio." className="sm:col-span-2"><TextInput required name="bedroomCount" type="number" min={0} max={30} step={1} inputMode="numeric" /></Field>
    <Field label="Beds" className="sm:col-span-2"><TextInput required name="bedCount" type="number" min={1} max={100} step={1} inputMode="numeric" /></Field>
    <Field label="Bathrooms" hint="Use .5 for a half bath." className="sm:col-span-2"><TextInput required name="bathrooms" type="number" min={0.5} max={50} step={0.5} inputMode="decimal" /></Field>
    <div className="sm:col-span-6"><SubmitButton size="sm" pendingLabel="Creating…">Create unit</SubmitButton></div>
  </form>;

  const gates: Record<string, { anchor: string; done: ReactNode; todo: ReactNode; cta: string; form?: ReactNode; href?: string; allowed: boolean }> = {
    address: { anchor: 'property-address-action', done: [property.address?.addressLine1, property.address?.city, property.address?.countryCode].filter(Boolean).join(', '), todo: 'Record where the home is. The exact address stays private; guests see the public location label.', cta: 'Add address', form: addressForm, allowed: mayManage },
    unit: { anchor: 'property-unit-action', done: `${plural(property.unitsCount || 0, 'unit')} · ${property.availableUnitsCount || 0} available`, todo: 'Create at least one independently bookable unit.', cta: 'Create unit', form: unitForm, allowed: mayManage },
    timezone: { anchor: 'property-timezone', done: property.timezone, todo: 'Set the stay timezone together with registration below.', cta: 'Set timezone', allowed: mayManage },
    registration: { anchor: 'property-registration-action', done: property.registrationNumber, todo: 'Record the registration number issued by your jurisdiction.', cta: 'Add registration', form: registrationForm, allowed: mayManage },
    listing: { anchor: 'property-listing-action', done: `${plural(summary?.published || 0, 'live listing')}`, todo: !summary ? 'Listing counts are unavailable right now.' : summary.total ? `${plural(summary.total, 'listing')} not published yet — publish one from its listing page.` : property.unitsCount ? 'Create a draft listing for a unit, then publish it.' : 'Create a rentable unit first — every listing belongs to a unit.', cta: 'Create listing', href: property.unitsCount ? listingCreatePath({ propertyId: property.id }) : undefined, allowed: mayCreateListing },
  };

  const attention: AttentionItem[] = [
    ...(property.maintenanceTasks || []).map((task: any) => ({ id: `task-${task.id}`, title: task.title, detail: `${sentence(task.status)} · due ${formatTimestamp(task.dueAt)}`, href: '/dashboard/platform/tasks', actionLabel: 'Tasks', tone: task.priority === 'urgent' ? 'danger' as const : 'warning' as const })),
    { id: 'safety', title: 'Safety evidence', detail: 'There’s no safety-attestation record here. Tasks can schedule inspections, but completing one isn’t regulatory proof.', external: true },
    ...(property.ownerAssignmentsCount ? [] : [{ id: 'owner', title: 'No owner assigned', detail: 'No owner assignment is recorded for this property.', href: `/dashboard/platform/payouts?assignProperty=${encodeURIComponent(property.id)}#add-assignment`, actionLabel: 'Add assignment', tone: 'warning' as const }]),
  ];
  const tasks = [...(property.openTasks || []), ...(property.closedTasks || [])].slice(0, 10);

  return <PlatformPage section="Properties" sectionHref="/platform/properties" current={property.name}>
    <PageHeader
      back={{ href: '/dashboard/platform/properties', label: 'Properties' }}
      title={property.name}
      badges={<><StatusBadge status={property.status} />{archived ? null : <StatusBadge tone={sellable ? 'success' : 'warning'} label={sellState} />}</>}
      meta={<>
        <MetaItem icon={MapPin}>{property.address?.publicLocationLabel || property.address?.city || 'Location not set'}</MetaItem>
        <MetaItem icon={Home}>{humanize(property.propertyType)}</MetaItem>
        {property.internalCode ? <MetaItem>{property.internalCode}</MetaItem> : null}
      </>}
      actions={<>
        {mayManage ? <LifecycleActions id={id} status={property.status} kind="property" /> : null}
        {capabilities.canManageProperties ? <RecordLink href={rawRecordPath('properties', id)}>{archived ? 'Property record' : 'Edit record'}</RecordLink> : null}
      </>}
    />
    <PageBody>
      <ActionOutcome query={query} />
      <PartialLoad error={result.error} />
      {archived
        ? <Callout tone="neutral" icon={Lock} title="Archived property">Its stays, tasks and records are kept as history. Setup can’t be changed.</Callout>
        : <AccessNotice capabilities={capabilities} allowed={capabilities.canManageProperties} retryHref={propertyPath}>Property management permission is required to change setup or status.</AccessNotice>}
      <StatTiles items={[
        { label: 'Readiness', value: `${readiness.readyCount}/${readiness.checks.length}`, hint: sellable ? 'ready to sell' : readiness.percent === 100 ? (property.status === 'active' ? 'no bookable listing yet' : 'activate the property to sell') : 'setup steps done', tone: sellable ? 'success' : 'warning', icon: BadgeCheck },
        { label: 'Units', value: property.unitsCount || 0, hint: `${property.availableUnitsCount || 0} available`, icon: BedDouble },
        { label: 'Upcoming stays', value: result.data?.upcomingStaysCount || 0, hint: `${result.data?.staysCount || 0} in history`, icon: CalendarDays },
        { label: 'Open tasks', value: property.openTasksCount || 0, hint: `${property.maintenanceTasksCount || 0} maintenance`, tone: property.maintenanceTasksCount ? 'danger' : undefined, icon: ListChecks },
      ]} />
      <DetailGrid
        main={<>
          <Section title="Setup checklist" icon={ClipboardList} action={<div className="w-40"><ProgressBar value={readiness.percent} label="Setup progress" showValue /></div>} flush>
            <ol className="divide-y">
              {readiness.checks.map((check) => {
                const gate = gates[check.id];
                return <li key={check.id} id={gate.anchor} className="scroll-mt-20 px-4 py-3.5">
                  <div className="flex items-start gap-3">
                    {check.ready ? <CheckCircle2 aria-label="Complete" className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <CircleDashed aria-label="Incomplete" className="mt-0.5 size-4 shrink-0 text-amber-600" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{check.label}</p>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground [overflow-wrap:anywhere]">{check.ready ? gate.done : gate.todo}</p>
                    </div>
                  </div>
                  {gate.allowed && gate.form ? <details open={!check.ready && firstIncomplete === check.id ? true : undefined} className="group/gate ml-7 mt-3">
                    <summary className="inline-flex h-8 cursor-pointer list-none items-center rounded-md border bg-background px-3 text-xs font-medium shadow-xs transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-open/gate:bg-muted/60 [&::-webkit-details-marker]:hidden">{check.ready ? 'Update' : gate.cta}</summary>
                    <div className="mt-3 rounded-lg border bg-muted/20 p-4">{gate.form}</div>
                  </details> : null}
                  {gate.allowed && gate.href ? <Button asChild size="sm" variant="outline" className="ml-7 mt-3"><Link href={gate.href}><Plus aria-hidden="true" />{gate.cta}</Link></Button> : null}
                </li>;
              })}
            </ol>
          </Section>

          <Section title="Units" icon={BedDouble} count={property.unitsCount || 0} description={previewLabel(property.units.length, property.unitsCount || 0, 'Each independently bookable space and its listings.')} flush>
            {property.units.length ? <DataTable
              rows={property.units}
              getKey={(unit: any) => unit.id}
              caption="Units"
              columns={[
                { id: 'unit', header: 'Unit', cell: (unit: any) => <div className="min-w-0"><span className="font-medium">{unit.name}</span><SubLine>{humanize(unit.accommodationType)}{unit.floorLabel ? ` · ${unit.floorLabel}` : ''}</SubLine>
                  <SubLine mobileOnly="md">{plural(unit.bedroomCount || 0, 'bedroom')} · {plural(unit.bedCount || 0, 'bed')} · {baths(unit.bathroomCountHalfUnits)}</SubLine>
                  {/* Phones hide the Listings column; keep each listing one tap away. */}
                  <div className="mt-1.5 flex flex-wrap gap-1.5 sm:hidden">{listingsHidden ? <Muted className="text-xs">Listings not visible to your role</Muted> : unit.listings?.length ? unit.listings.map((listing: any) => <Link key={listing.id} href={platformDetailPath('listing', listing.id)} className="inline-flex h-7 max-w-[14rem] items-center gap-1.5 rounded-md border bg-background px-2 text-xs transition-colors hover:bg-muted"><span className={cn('size-1.5 shrink-0 rounded-full', listing.status === 'published' ? 'bg-emerald-500' : 'bg-zinc-400')} /><span className="truncate">{listing.title}</span><span className="sr-only"> · {sentence(listing.status)}</span></Link>) : mayCreateListing ? <Link href={listingCreatePath({ propertyId: property.id, unitId: unit.id })} className="text-xs underline-offset-4 hover:underline">Create a listing</Link> : <Muted className="text-xs">No listing</Muted>}</div>
                </div> },
                { id: 'sleeps', header: 'Sleeps', align: 'right', cell: (unit: any) => unit.maxGuests },
                { id: 'rooms', header: 'Beds · baths', hideBelow: 'md', cell: (unit: any) => <Muted className="whitespace-nowrap">{plural(unit.bedroomCount || 0, 'bedroom')} · {plural(unit.bedCount || 0, 'bed')} · {baths(unit.bathroomCountHalfUnits)}</Muted> },
                { id: 'status', header: 'Status', cell: (unit: any) => <StatusBadge status={unit.status} /> },
                { id: 'listings', header: 'Listings', hideBelow: 'sm', cell: (unit: any) => listingsHidden ? <Muted>Not visible to your role</Muted> : unit.listings?.length ? <div className="flex flex-wrap gap-1.5">{unit.listings.map((listing: any) => <Link key={listing.id} href={platformDetailPath('listing', listing.id)} className="inline-flex h-6 max-w-[14rem] items-center gap-1.5 rounded-md border bg-background px-2 text-xs transition-colors hover:bg-muted"><span className={cn('size-1.5 shrink-0 rounded-full', listing.status === 'published' ? 'bg-emerald-500' : 'bg-zinc-400')} /><span className="truncate">{listing.title}</span></Link>)}</div> : mayCreateListing ? <Link href={listingCreatePath({ propertyId: property.id, unitId: unit.id })} className="text-xs underline-offset-4 hover:underline">Create a listing</Link> : <Muted>No listing</Muted> },
              ]}
            /> : <EmptyState compact icon={BedDouble} title="No units yet" description={mayManage ? 'Add a unit from the setup checklist above.' : undefined} />}
          </Section>

          <Section title="Stays" icon={CalendarDays} count={result.data?.staysCount || 0} description={previewLabel(reservations.length, result.data?.staysCount || 0, 'Newest check-in first.')} action={(result.data?.staysCount || 0) > reservations.length ? <Button asChild size="sm" variant="ghost"><Link href={`/dashboard/platform/reservations?property=${encodeURIComponent(property.id)}`}>Search reservations</Link></Button> : undefined} flush>
            {reservations.length ? <DataTable
              rows={reservations}
              getKey={(reservation: any) => reservation.id}
              caption="Stays at this property"
              columns={[
                { id: 'stay', header: 'Guest', cell: (reservation: any) => <div className="min-w-0"><RowLink href={reservationPath(reservation.id)}>{reservation.guest?.name || 'Guest pending'}</RowLink><SubLine>{reservation.confirmationCode}<span className="md:hidden"> · {formatDayRange(reservation.checkInDate, reservation.checkOutDate)}</span></SubLine></div> },
                { id: 'dates', header: 'Dates', hideBelow: 'md', cell: (reservation: any) => <div className="whitespace-nowrap"><span>{formatDayRange(reservation.checkInDate, reservation.checkOutDate)}</span><SubLine>{reservation.listing?.title}</SubLine></div> },
                { id: 'status', header: 'Status', cell: (reservation: any) => <div><StatusBadge status={reservation.status} /><StayChecks reservation={reservation} className="mt-1.5 lg:hidden" /></div> },
                { id: 'checks', header: 'Checks', hideBelow: 'lg', cell: (reservation: any) => <StayChecks reservation={reservation} /> },
              ]}
            /> : <EmptyRow>No stays booked at this property yet.</EmptyRow>}
          </Section>

          <TwoColumn>
            <Section title="Tasks" icon={ListChecks} count={property.openTasksCount || 0} description={(property.openTasksCount || 0) > (property.openTasks || []).length ? `Next ${(property.openTasks || []).length} of ${property.openTasksCount} open.` : 'Open work first.'} action={<Button asChild size="sm" variant="ghost"><Link href="/dashboard/platform/tasks">Task board</Link></Button>} flush>
              <Timeline
                empty="No tasks recorded for this property."
                items={tasks.map((task: any) => ({
                  id: task.id,
                  title: task.title,
                  time: task.dueAt ? formatTimestamp(task.dueAt) : undefined,
                  tone: task.taskType === 'property_maintenance' && !closedTask.includes(task.status) ? 'danger' : !closedTask.includes(task.status) && isPast(task.dueAt) ? 'warning' : operationalTone(task.status),
                  meta: `${sentence(task.taskType)} · ${task.assignee?.name || 'Unassigned'}`,
                  badge: <StatusBadge status={task.status} className="h-5" />,
                }))}
              />
            </Section>
            <Section title="Calendar blocks" icon={CalendarDays} count={result.data?.calendarBlocksCount || 0} description={previewLabel(blocks.length, result.data?.calendarBlocksCount || 0, 'Reservations, owner holds, preparation, and maintenance.')} action={<Button asChild size="sm" variant="ghost"><Link href="/dashboard/platform/calendar">Calendar</Link></Button>} flush>
              <Timeline
                empty="No calendar blocks recorded."
                items={blocks.map((block: any) => ({
                  id: block.id,
                  title: formatDayRange(block.startDate, block.endDate),
                  tone: block.reason === 'property_maintenance' ? 'danger' : block.reason === 'reservation' ? 'info' : 'warning',
                  meta: `${block.listing?.title || 'Listing'} · ${block.reservation?.confirmationCode || block.notes || sentence(block.source)}`,
                  badge: <Pill>{sentence(block.reason)}</Pill>,
                  href: block.reservation?.id ? reservationPath(block.reservation.id) : undefined,
                }))}
              />
            </Section>
          </TwoColumn>
        </>}
        aside={<>
          <Section title="Needs attention" icon={AlertTriangle} flush>
            <AttentionList items={attention} empty="No open maintenance." />
          </Section>
          <Section title="Property details" icon={Home} flush>
            <DescriptionList items={[
              { label: 'Status', value: <StatusBadge status={property.status} /> },
              { label: 'Timezone', value: property.timezone || <span className={toneText.warning}>Not set</span> },
              { label: 'Registration', value: property.registrationNumber || <span className={toneText.warning}>Not recorded</span> },
              { label: 'Arrival window', value: `${property.checkInFrom || '—'} – ${property.checkInUntil || '—'}` },
              { label: 'Checkout by', value: property.checkOutBy || '—' },
              { label: 'Exact address', value: property.address?.showExactAddressPublicly ? 'Shown publicly' : 'Private' },
              property.hostOrganization ? { label: 'Host', value: property.hostOrganization.name } : null,
            ]} />
          </Section>
          <Section title="Arrival details for guests" icon={KeyRound} description="Entry, parking and access notes. Shown with the exact address only to guests with a confirmed stay." flush>
            {property.arrivalInstructions ? <p className="whitespace-pre-wrap px-4 py-3 text-sm leading-6">{property.arrivalInstructions}</p> : <EmptyRow>No arrival details yet. Confirmed guests see the address and arrival window only.</EmptyRow>}
            {mayManage ? <div className="border-t px-4 py-3"><Disclosure summary={property.arrivalInstructions ? 'Edit arrival details' : 'Add arrival details'}>
              <form action={recordArrivalInstructionsAction} className="space-y-3">
                <input type="hidden" name="propertyId" value={property.id} />
                <Field label="Arrival details" hint="Up to 4000 characters. Leave empty to remove."><TextArea name="arrivalInstructions" rows={6} maxLength={4000} defaultValue={property.arrivalInstructions || ''} placeholder="Lockbox by the side door — the code is sent the morning of arrival. Park in the gravel bay on the left." /></Field>
                <SubmitButton size="sm" pendingLabel="Saving…">Save arrival details</SubmitButton>
              </form>
            </Disclosure></div> : null}
          </Section>
          <Section title="Owners" icon={Landmark} count={property.ownerAssignmentsCount || 0} flush>
            <LinkRows
              empty="No owner assignment recorded."
              items={property.ownerAssignments.map((assignment: any) => ({
                id: assignment.id,
                title: assignment.owner?.displayName || 'Owner unavailable',
                meta: `${assignment.ownershipBasisPoints / 100}% ownership · ${assignment.managerCommissionBasisPoints / 100}% commission`,
                trailing: <StatusBadge status={assignment.status} />,
              }))}
            />
          </Section>
        </>}
      />
    </PageBody>
  </PlatformPage>;
}

/* ───────────────────────── Listing ───────────────────────── */

export async function ListingDetailPage({ params, searchParams }: DetailProps) {
  const { id } = await params;
  const query = (await searchParams) || {};
  const [result, capabilities] = await Promise.all([getListingDetailWorkspace(id), getPlatformCapabilities()]);
  const listing = result.data?.listing;
  if (!listing) return <DetailUnavailable section="Listings" sectionHref="/platform/listings" error={result.error} />;
  const archived = listing.status === 'archived';
  const mayManage = capabilities.canManageListings && !archived;
  const mayPrice = capabilities.canManagePricing && !archived;
  // Rate plans are hidden from roles without pricing access: hidden is "not visible", never "no plan".
  const pricingHidden = capabilities.known && !capabilities.canReadPricing;
  const effectivePlan = pricingHidden ? null : listing.effectiveRatePlans?.[0] || null;
  // The server's quote-rule answer (no prices or terms), so readiness never depends on what this role can see.
  const online = listing.onlineReadiness as OnlineReadiness;
  const pricing = { priced: Boolean(online?.priced), plan: effectivePlan, problem: online ? online.quoteProblem : 'Readiness is unavailable right now.' };
  const readiness = listingSetup({ title: listing.title, description: listing.description, mediaCount: listing.mediaCount || 0, amenityCount: listing.amenitiesCount || 0, propertyReady: listing.property?.status === 'active' && Boolean(listing.property?.registrationNumber), unitReady: listing.accommodationUnit?.status === 'available', bookable: Boolean(online?.bookable) });
  const channelExceptions = listing.channelListings.filter((mapping: any) => !mappingOperational(mapping) || mapping.channelConnection?.lastError);
  const openTasks = listing.openTasks || [];
  const recordHref = rawRecordPath('listings', id);
  const resolution: Record<string, { detail: string; href?: string; label: string }> = {
    content: { detail: 'Add a title and description.', href: mayManage ? listingEditPath(id, 'content') : undefined, label: 'Edit content' },
    media: { detail: 'Add ordered photos with alt text.', href: mayManage ? listingEditPath(id, 'media') : undefined, label: 'Add photos' },
    amenities: { detail: 'Attach the amenities guests can expect.', href: mayManage ? listingEditPath(id, 'amenities') : undefined, label: 'Add amenities' },
    inventory: { detail: listing.property?.id ? 'The property must be active with registration, and the unit available.' : 'Attach this listing to a property and unit.', href: listing.property?.id ? platformDetailPath('property', listing.property.id) : mayManage ? recordHref : undefined, label: listing.property?.id ? 'Open property' : 'Attach unit' },
    rate: pricingHidden
      ? { detail: online?.problem || 'Pricing and terms aren’t visible to your role.', label: 'Pricing not visible' }
      : pricing.plan?.id
        ? { detail: online?.problem || pricing.problem || '', href: platformDetailPath('ratePlan', pricing.plan.id), label: 'Open rate plan' }
        : { detail: pricing.priced ? online?.problem || 'Add an active rate plan with cancellation terms.' : 'Set a base nightly rate or add an active rate plan.', href: !pricing.priced && mayManage ? listingEditPath(id, 'rules') : mayPrice ? ratePlanCreatePath({ listingId: id }) : undefined, label: !pricing.priced && mayManage ? 'Set base rate' : 'Add rate plan' },
  };
  const unit = listing.accommodationUnit;
  const rules = effectiveArrivalRules(effectivePlan, listing);
  const ruleSource = (fromListing: boolean) => effectivePlan && !fromListing ? `From rate plan “${effectivePlan.name}”` : pricingHidden ? 'Listing default · a rate plan may apply' : 'Listing default';
  const minimumStay = effectivePlan?.minimumStay ?? listing.minimumStay;
  const maximumStay = effectivePlan ? effectivePlan.maximumStay ?? listing.maximumStay : listing.maximumStay;
  const nightly = !pricing.priced ? '—' : effectivePlan ? formatMoney(effectivePlan.baseNightlyRateCents, effectivePlan.currencyCode) : pricingHidden ? 'Priced · rate not visible to you' : formatMoney(listing.baseNightlyRateCents, listing.currencyCode);
  const publishWarnings = [
    pricing.problem ? `${pricing.problem} Guests can’t book it online.` : null,
    listing.mediaCount === 0 ? 'It has no photos.' : null,
    !listing.description ? 'It has no description.' : null,
    listing.property && listing.property.status !== 'active' ? `Its property is ${sentence(listing.property.status).toLowerCase()}, not active.` : null,
    listing.property && !(listing.property.address?.city && listing.property.address?.countryCode) ? 'Its property has no address.' : null,
    !unit || unit.status !== 'available' ? 'Its unit isn’t available for stays.' : null,
  ].filter(Boolean) as string[];
  const staysCount = listing.staysCount || 0;

  return <PlatformPage section="Listings" sectionHref="/platform/listings" current={listing.title}>
    <PageHeader
      back={{ href: '/dashboard/platform/listings', label: 'Listings' }}
      title={listing.title}
      badges={<><StatusBadge status={listing.status} /><StatusBadge tone={readiness.percent === 100 ? 'success' : 'warning'} label={readiness.percent === 100 ? 'Ready' : `${readiness.readyCount}/${readiness.checks.length} ready`} /></>}
      description={listing.subtitle || undefined}
      meta={<>
        <MetaItem icon={Home}>{listing.property?.name || 'No property'}</MetaItem>
        <MetaItem icon={BedDouble}>{unit?.name || 'No unit'}</MetaItem>
        <MetaItem icon={KeyRound}>{listing.instantBook ? 'Instant book' : sentence(listing.bookingMode)}</MetaItem>
      </>}
      actions={<>
        {mayManage ? <LifecycleActions id={id} status={listing.status} kind="listing" publishWarnings={publishWarnings} /> : null}
        {mayManage ? <Button asChild size="sm" variant="outline"><Link href={listingEditPath(id)}><Pencil aria-hidden="true" />Edit listing</Link></Button> : null}
        {capabilities.canManageListings ? <RecordLink href={recordHref}>Listing record</RecordLink> : null}
      </>}
    />
    <PageBody>
      <ActionOutcome query={query} />
      <PartialLoad error={result.error} />
      {archived
        ? <Callout tone="neutral" icon={Lock} title="Archived listing">Its stays, reviews and records are kept as history. It can’t be edited or sold.</Callout>
        : <AccessNotice capabilities={capabilities} allowed={capabilities.canManageListings} retryHref={platformDetailPath('listing', id)}>Listing management permission is required to edit or publish this listing.</AccessNotice>}
      {publishWarnings.length && !archived ? <Callout tone={!pricing.priced ? 'danger' : 'warning'} icon={AlertTriangle} title={listing.status === 'published' ? 'Guests see this listing with gaps' : 'Before you publish'}>
        <ul className="list-disc space-y-0.5 pl-5">{publishWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
      </Callout> : null}
      <StatTiles items={[
        { label: 'Readiness', value: `${readiness.readyCount}/${readiness.checks.length}`, hint: readiness.percent === 100 ? 'every check passes' : 'checks passing', tone: readiness.percent === 100 ? 'success' : 'warning', icon: BadgeCheck },
        { label: 'Nightly rate', value: nightly, hint: pricing.priced ? (effectivePlan ? `rate plan “${effectivePlan.name}”` : pricingHidden ? 'pricing not visible' : 'base rate') : 'not priced', tone: pricing.priced ? undefined : 'danger', icon: CircleDollarSign },
        { label: 'Upcoming stays', value: listing.upcomingStaysCount || 0, hint: `${staysCount} in history`, icon: CalendarDays },
        { label: 'Channels', value: listing.channelListings.length, hint: `${channelExceptions.length} need attention`, tone: channelExceptions.length ? 'warning' : undefined, icon: RadioTower },
      ]} />
      <DetailGrid
        main={<>
          <Section title="Readiness" icon={ClipboardList} flush>
            <ul className="divide-y">
              {readiness.checks.map((check) => {
                const fix = resolution[check.id];
                return <li key={check.id} className="flex items-start gap-3 px-4 py-3.5">
                  {check.ready ? <CheckCircle2 aria-label="Complete" className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <CircleDashed aria-label="Incomplete" className="mt-0.5 size-4 shrink-0 text-amber-600" />}
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium">{check.label}</p>{!check.ready && fix.detail ? <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{fix.detail}</p> : null}</div>
                  {!check.ready && fix.href ? <Button asChild size="sm" variant="outline"><Link href={fix.href}>{fix.label}</Link></Button> : null}
                </li>;
              })}
            </ul>
          </Section>

          <Section title="Booking rules" icon={KeyRound} action={mayManage ? <Button asChild size="sm" variant="ghost"><Link href={listingEditPath(id, 'rules')}>Edit</Link></Button> : undefined}>
            <FactGrid items={[
              { label: 'Sleeps', value: unit ? plural(unit.maxGuests, 'guest') : '—', hint: unit ? `${plural(unit.bedroomCount || 0, 'bedroom')} · ${plural(unit.bedCount || 0, 'bed')} · ${baths(unit.bathroomCountHalfUnits)}` : undefined },
              { label: 'Booking', value: listing.instantBook ? 'Instant book' : sentence(listing.bookingMode) },
              { label: 'Stay length', value: `${minimumStay}${maximumStay ? `–${maximumStay}` : '+'} nights`, hint: ruleSource(effectivePlan?.minimumStay == null) },
              { label: 'Security deposit', value: listing.securityDepositCents ? formatMoney(listing.securityDepositCents, listing.currencyCode) : 'None' },
              { label: 'Advance notice', value: rules.notice, hint: ruleSource(rules.noticeFromListing) },
              { label: 'Booking window', value: rules.window, hint: ruleSource(rules.windowFromListing) },
              { label: 'Photos · amenities', value: `${listing.mediaCount || 0} · ${listing.amenitiesCount || 0}` },
              { label: 'Guest rating', value: listing.reviewCount ? <span className="inline-flex items-center gap-2"><Stars rating={listing.reviewAverageHundredths / 100} />{(listing.reviewAverageHundredths / 100).toFixed(2)}</span> : 'No reviews yet', hint: listing.reviewCount ? plural(listing.reviewCount, 'review') : undefined },
            ]} />
            {listing.amenities.length ? <div className="mt-5 border-t pt-4"><p className="text-xs text-muted-foreground">Amenities</p><div className="mt-2 flex flex-wrap gap-1.5">{listing.amenities.map((amenity: any) => <Pill key={amenity.id}>{amenity.name}</Pill>)}</div></div> : null}
          </Section>

          <TwoColumn>
            <Section title="Rate plans" icon={CircleDollarSign} count={listing.ratePlansCount || 0} action={mayPrice ? <Button asChild size="sm" variant="ghost"><Link href={ratePlanCreatePath({ listingId: id })}><Plus aria-hidden="true" />New</Link></Button> : undefined} flush>
              <LinkRows
                empty={pricingHidden ? 'Rate plans aren’t visible to your role.' : listing.baseNightlyRateCents > 0 ? 'No rate plan attached — the base rate applies.' : 'No rate plan and no base rate — this listing can’t be booked.'}
                items={(listing.ratePlans || []).map((plan: any) => ({ id: plan.id, href: platformDetailPath('ratePlan', plan.id), title: <span className="inline-flex items-center gap-2">{plan.name}{plan.isDefault ? <Pill tone="info">Default</Pill> : null}{effectivePlan?.id === plan.id ? <Pill tone="success">In use</Pill> : null}</span>, meta: `${formatMoney(plan.baseNightlyRateCents, plan.currencyCode)} · ${plural(plan.minimumStay, 'night')} min`, trailing: <StatusBadge status={plan.status} /> }))}
              />
            </Section>
            <Section title="Channels" icon={RadioTower} count={listing.channelListings.length} action={<Button asChild size="sm" variant="ghost"><Link href="/dashboard/platform/channels">Sync health</Link></Button>} flush>
              <LinkRows
                empty="Not mapped to any channel."
                items={listing.channelListings.map((mapping: any) => ({
                  id: mapping.id,
                  title: mapping.channelConnection?.name || 'Channel',
                  meta: mapping.channelConnection?.lastError ? <span className={toneText.danger}>{mapping.channelConnection.lastError}</span> : `${mapping.channelConnection?.provider || 'provider'} · ${mapping.externalListingId || 'no external id'} · connection ${sentence(mapping.channelConnection?.status).toLowerCase()} · synced ${formatTimestamp(mapping.channelConnection?.lastSyncedAt)}`,
                  trailing: <StatusBadge status={mapping.status} tone={mapping.channelConnection?.lastError ? 'danger' : mappingOperational(mapping) ? 'success' : mappingHealth(mapping.status) === 'pending' ? 'warning' : 'danger'} />,
                }))}
              />
            </Section>
          </TwoColumn>

          <Section title="Stays" icon={CalendarDays} count={staysCount} description={previewLabel(listing.reservations.length, staysCount)} action={staysCount > listing.reservations.length ? <Button asChild size="sm" variant="ghost"><Link href={`/dashboard/platform/reservations?listing=${encodeURIComponent(listing.id)}`}>Search reservations</Link></Button> : undefined} flush>
            {listing.reservations.length ? <DataTable
              rows={listing.reservations}
              getKey={(reservation: any) => reservation.id}
              caption="Stays for this listing"
              columns={[
                { id: 'guest', header: 'Guest', cell: (reservation: any) => <div className="min-w-0"><RowLink href={reservationPath(reservation.id)}>{reservation.guest?.name || 'Guest pending'}</RowLink><SubLine>{reservation.confirmationCode}</SubLine></div> },
                { id: 'dates', header: 'Dates', cell: (reservation: any) => <span className="whitespace-nowrap">{formatDayRange(reservation.checkInDate, reservation.checkOutDate)}</span> },
                { id: 'status', header: 'Status', cell: (reservation: any) => <div><StatusBadge status={reservation.status} /><StayChecks reservation={reservation} className="mt-1.5 md:hidden" /></div> },
                { id: 'checks', header: 'Checks', hideBelow: 'md', cell: (reservation: any) => <StayChecks reservation={reservation} /> },
              ]}
            /> : <EmptyRow>No stays booked for this listing yet.</EmptyRow>}
          </Section>
        </>}
        aside={<>
          <Section title="Needs attention" icon={AlertTriangle} flush>
            <AttentionList
              empty="Channels are healthy and no work is open."
              items={[
                ...channelExceptions.map((mapping: any) => ({ id: mapping.id, title: mapping.channelConnection?.name || 'Channel mapping', detail: mapping.channelConnection?.lastError || (mappingHealth(mapping.status) === 'healthy' ? `Connection ${sentence(mapping.channelConnection?.status).toLowerCase()}` : `${sentence(mapping.status)} mapping`), href: '/dashboard/platform/channels', actionLabel: 'Channels', tone: !mapping.channelConnection?.lastError && mappingHealth(mapping.status) === 'pending' ? 'warning' as const : 'danger' as const })),
                ...openTasks.map((task: any) => ({ id: task.id, title: task.title, detail: `${sentence(task.taskType)} · due ${formatTimestamp(task.dueAt)}`, href: '/dashboard/platform/tasks', actionLabel: 'Tasks', tone: isPast(task.dueAt) ? 'danger' as const : 'warning' as const })),
              ]}
            />
          </Section>
          <Section title="Guest-facing copy" icon={FileCheck2} action={mayManage ? <Button asChild size="sm" variant="ghost"><Link href={listingEditPath(id, 'content')}>Edit</Link></Button> : undefined}>
            {listing.description ? <p className="line-clamp-[8] whitespace-pre-line text-sm leading-6 text-muted-foreground">{listing.description}</p> : <p className="text-sm text-muted-foreground">No description yet.</p>}
            <p className="mt-3 font-mono text-xs text-muted-foreground">/{listing.slug}</p>
          </Section>
          {listing.property ? <Section title="Property" icon={Home} flush>
            <LinkRows items={[{ id: listing.property.id, href: platformDetailPath('property', listing.property.id), title: listing.property.name, meta: `${listing.property.address?.publicLocationLabel || 'Location not set'} · ${listing.property.registrationNumber ? 'registered' : 'registration missing'}`, trailing: <StatusBadge status={listing.property.status} /> }]} />
          </Section> : null}
        </>}
      />
    </PageBody>
  </PlatformPage>;
}

/* ───────────────────────── Guest ───────────────────────── */

export async function GuestDetailPage({ params }: DetailProps) {
  const { id } = await params;
  const result = await getGuestDetailWorkspace(id);
  const guest = result.data?.guestProfile;
  if (!guest) return <DetailUnavailable section="Guests" sectionHref="/platform/guests" error={result.error} />;
  const collectible = result.data?.collectibleStays || [];
  const openRefunds = result.data?.openRefunds || [];
  // Totals are shown only when every matching record was read; a partial sum would understate what's owed.
  const outstanding = (result.data?.collectibleStaysCount || 0) > collectible.length ? null : moneyByCurrency(collectible.map((reservation: any) => ({ currencyCode: reservation.currencyCode, cents: Math.max((reservation.totalAmountCents || 0) - (reservation.amountPaidCents || 0), 0) })));
  const refundsOwed = (result.data?.openRefundsCount || 0) > openRefunds.length ? null : moneyByCurrency(openRefunds.map((refund: any) => ({ currencyCode: refund.currencyCode, cents: refund.amountCents || 0 })));
  const closedStays = result.data?.closedStaysCount || 0;
  const staysCount = guest.staysCount || 0;

  return <PlatformPage section="Guests" sectionHref="/platform/guests" current={guest.name}>
    <PageHeader
      back={{ href: '/dashboard/platform/guests', label: 'Guests' }}
      title={<span className="inline-flex items-center gap-3"><Avatar name={guest.name} className="size-9 text-xs" />{guest.name}</span>}
      badges={<StatusBadge status={guest.verificationStatus} />}
      meta={<>
        <MetaItem icon={Mail}><a href={`mailto:${guest.email}`} className="underline-offset-4 hover:text-foreground hover:underline">{guest.email}</a></MetaItem>
        <MetaItem icon={Phone}>{guest.phone || 'No phone'}</MetaItem>
        {guest.preferredLanguage ? <MetaItem>{guest.preferredLanguage}</MetaItem> : null}
      </>}
      actions={<RecordLink href={rawRecordPath('guest-profiles', id)} />}
    />
    <PageBody>
      <PartialLoad error={result.error} />
      <StatTiles items={[
        { label: 'Stays', value: staysCount, hint: `${guest.activeStaysCount || 0} active`, icon: KeyRound },
        { label: 'Outstanding', value: outstanding ? formatCurrencyTotals(outstanding, 'None') : 'Unavailable', hint: outstanding ? (closedStays ? `on booked stays · ${plural(closedStays, 'cancelled or no-show stay')} not assessed` : 'across booked stays') : 'too many stays to total here', tone: outstanding?.length ? 'warning' : outstanding ? 'success' : undefined, icon: CircleDollarSign },
        { label: 'Refunds owed', value: refundsOwed ? formatCurrencyTotals(refundsOwed, 'None') : 'Unavailable', hint: refundsOwed ? 'open refunds to the guest' : 'too many refunds to total here', tone: refundsOwed?.length ? 'warning' : undefined, icon: ReceiptText },
        { label: 'Open threads', value: guest.openConversationsCount || 0, hint: `${guest.conversationsCount || 0} total`, icon: MessageSquare },
        { label: 'Reviews', value: guest.reviewsCount || 0, hint: guest.reviewsCount ? 'submitted for stays' : 'none yet', icon: Star },
      ]} />
      <DetailGrid
        main={<>
          <Section title="Stays" icon={CalendarDays} count={staysCount} description={previewLabel(guest.reservations.length, staysCount, 'Newest first.')} action={staysCount > guest.reservations.length ? <Button asChild size="sm" variant="ghost"><Link href={`/dashboard/platform/reservations?guest=${encodeURIComponent(guest.id)}`}>Search reservations</Link></Button> : undefined} flush>
            {guest.reservations.length ? <DataTable
              rows={guest.reservations}
              getKey={(reservation: any) => reservation.id}
              caption="Guest stays"
              columns={[
                { id: 'stay', header: 'Stay', cell: (reservation: any) => <div className="min-w-0 max-w-xs"><RowLink href={reservationPath(reservation.id)}>{reservation.listing?.title || 'Listing'}</RowLink><SubLine>{reservation.confirmationCode}<span className="md:hidden"> · {formatDayRange(reservation.checkInDate, reservation.checkOutDate)}</span></SubLine><SubLine mobileOnly="sm">{formatMoney(reservation.totalAmountCents, reservation.currencyCode)} total</SubLine></div> },
                { id: 'dates', header: 'Dates', hideBelow: 'md', cell: (reservation: any) => <span className="whitespace-nowrap">{formatDayRange(reservation.checkInDate, reservation.checkOutDate)}</span> },
                { id: 'total', header: 'Total', align: 'right', hideBelow: 'sm', cell: (reservation: any) => formatMoney(reservation.totalAmountCents, reservation.currencyCode) },
                { id: 'status', header: 'Status', cell: (reservation: any) => <div><StatusBadge status={reservation.status} /><SubLine className="sm:hidden">{formatMoney(reservation.totalAmountCents, reservation.currencyCode)}</SubLine><StayChecks reservation={{ ...reservation, guest }} className="mt-1.5 lg:hidden" /></div> },
                { id: 'checks', header: 'Checks', hideBelow: 'lg', cell: (reservation: any) => <StayChecks reservation={{ ...reservation, guest }} /> },
              ]}
            /> : <EmptyRow>This guest hasn’t booked a stay yet.</EmptyRow>}
          </Section>
          <TwoColumn>
            <Section title="Conversations" icon={MessageSquare} count={guest.conversationsCount || 0} description={previewLabel(guest.conversations.length, guest.conversationsCount || 0)} action={(guest.conversationsCount || 0) > guest.conversations.length ? <Button asChild size="sm" variant="ghost"><Link href={searchPath('/dashboard/platform/inbox', guest.name)}>Search inbox</Link></Button> : undefined} flush>
              <LinkRows
                empty="No conversations."
                items={guest.conversations.map((conversation: any) => ({ id: conversation.id, href: platformDetailPath('conversation', conversation.id), title: conversation.subject || conversation.listing?.title || 'Guest thread', meta: conversation.messages[0]?.body || 'No messages', trailing: <StatusBadge status={conversation.status} /> }))}
              />
            </Section>
            <Section title="Payments" icon={Banknote} count={guest.paymentsCount || 0} description={previewLabel(guest.payments.length, guest.paymentsCount || 0)} action={(guest.paymentsCount || 0) > guest.payments.length ? <Button asChild size="sm" variant="ghost"><Link href={searchPath('/dashboard/platform/payments', guest.name)}>Search payments</Link></Button> : undefined} flush>
              <LinkRows
                empty="No payments recorded."
                items={guest.payments.map((payment: any) => ({ id: payment.id, href: platformDetailPath('payment', payment.id), title: formatMoney(payment.amountCents, payment.currencyCode), meta: `${payment.reservation?.confirmationCode || 'Unlinked'} · ${payment.provider || 'manual'} · ${formatTimestamp(payment.processedAt)}`, trailing: <StatusBadge status={payment.status} /> }))}
              />
            </Section>
          </TwoColumn>
          {guest.reviews.length ? <Section title="Reviews" icon={Star} count={guest.reviewsCount || 0} description={previewLabel(guest.reviews.length, guest.reviewsCount || 0)} action={(guest.reviewsCount || 0) > guest.reviews.length ? <Button asChild size="sm" variant="ghost"><Link href={searchPath('/dashboard/platform/reviews', guest.name)}>Search reviews</Link></Button> : undefined} flush>
            <LinkRows items={guest.reviews.map((review: any) => ({ id: review.id, href: platformDetailPath('review', review.id), title: review.listing?.title || 'Review', meta: review.body || 'No written feedback', leading: <Stars rating={review.overallRating} />, trailing: <StatusBadge status={review.status} /> }))} />
          </Section> : null}
        </>}
        aside={<>
          <Section title="Profile" icon={UserRound} flush>
            <DescriptionList items={[
              { label: 'Verification', value: <StatusBadge status={guest.verificationStatus} /> },
              { label: 'Marketing consent', value: guest.marketingConsent ? 'Given' : 'Not given' },
              { label: 'Language', value: guest.preferredLanguage || '—' },
              { label: 'Created', value: formatTimestamp(guest.createdAt) },
              { label: 'Updated', value: formatTimestamp(guest.updatedAt) },
            ]} />
          </Section>
          <Callout tone="info" icon={ShieldCheck} title="About verification">Set verification on the guest record only from external evidence. It records an identity result, not a safety guarantee — there’s no identity-provider check here.</Callout>
          {guest.internalNotes ? <Section title="Internal notes" icon={Lock}><p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">{guest.internalNotes}</p></Section> : null}
        </>}
      />
    </PageBody>
  </PlatformPage>;
}

/* ───────────────────────── Agreement ───────────────────────── */

function snapshotText(snapshot: unknown) {
  if (snapshot == null) return null;
  if (typeof snapshot === 'string') return snapshot;
  try { return JSON.stringify(snapshot, null, 2); } catch { return null; }
}

/**
 * Who actually signed, from the recorded evidence only: a guest through the signing link, setup
 * on a sample stay, a test booking's simulation, or unknown for older records without evidence.
 */
function signatureProvenance(agreement: any) {
  const evidence = agreement.signatureEvidence || null;
  const reservation = agreement.reservation || {};
  if (evidence?.via === 'signing_link') {
    return evidence.simulation || reservation.testMode
      ? { kind: 'test' as const, label: 'Guest, via signing link · test booking', title: 'Signed during a test booking', detail: 'The signature was given through the signing link of a test booking. It isn’t a signed agreement for a real stay.' }
      : { kind: 'guest' as const, label: 'Guest, via signing link', title: '', detail: '' };
  }
  if (evidence?.provenance === 'onboarding_sample' || reservation.fixtureOrigin) {
    return { kind: 'sample' as const, label: 'Recorded by setup, not by a guest', title: 'Sample agreement', detail: 'Setup created this signature for a sample stay. No guest agreed to these terms.' };
  }
  return { kind: 'unknown' as const, label: 'Not recorded (older agreement)', title: 'How this was signed isn’t recorded', detail: 'This agreement predates signature evidence. Its name and time are kept as recorded.' };
}

export async function AgreementDetailPage({ params, searchParams }: DetailProps) {
  const { id } = await params;
  const query = (await searchParams) || {};
  const [result, capabilities] = await Promise.all([getAgreementDetailWorkspace(id), getPlatformCapabilities()]);
  const agreement = result.data?.stayAgreement;
  if (!agreement) return <DetailUnavailable section="Agreements" sectionHref="/platform/agreements" error={result.error} />;
  const expired = isPast(agreement.signingTokenExpiresAt);
  const linkState = agreement.signingTokenRevokedAt ? 'Revoked' : agreement.status === 'signed' ? 'Used' : expired ? 'Expired' : agreement.signingTokenExpiresAt ? 'Active' : 'Not issued';
  const linkTone: OperationalTone = linkState === 'Expired' ? 'danger' : linkState === 'Active' ? 'info' : linkState === 'Used' ? 'success' : 'neutral';
  const terms = snapshotText(agreement.termsSnapshot);
  const reservation = agreement.reservation;
  const stayClosed = ['cancelled', 'no_show'].includes(reservation?.status);
  const stayActive = ['pending', 'confirmed', 'in_stay'].includes(reservation?.status);
  // Agreement commands are authorized as reservation management on the server.
  const mayManage = capabilities.canManageReservations;
  const mayVoid = mayManage && agreement.status !== 'voided' && (agreement.status !== 'signed' || stayClosed);
  const mayReissue = mayManage && stayActive && agreement.status !== 'signed' && !agreement.signedAt;
  const signature = signatureProvenance(agreement);

  return <PlatformPage section="Agreements" sectionHref="/platform/agreements" current={agreement.agreementNumber}>
    <PageHeader
      back={{ href: '/dashboard/platform/agreements', label: 'Agreements' }}
      title={agreement.agreementNumber}
      badges={<StatusBadge status={agreement.status} />}
      description={agreement.title}
      meta={<>
        <MetaItem icon={Mail}>{agreement.signerEmail}</MetaItem>
        {reservation ? <MetaItem icon={CalendarDays}>{reservation.confirmationCode} · {formatDayRange(reservation.checkInDate, reservation.checkOutDate)}</MetaItem> : null}
      </>}
      actions={<RecordLink href={rawRecordPath('stay-agreements', id)}>View record</RecordLink>}
    />
    <PageBody>
      <ActionOutcome query={query} />
      <PartialLoad error={result.error} />
      {agreement.status === 'signed' && stayClosed ? <Callout tone="warning" icon={AlertTriangle} title="Signed for a stay that didn’t go ahead">The stay is {sentence(reservation.status).toLowerCase()}. Review whether this agreement should stay in force; the signature stays on record either way.</Callout> : null}
      {signature.kind !== 'guest' && agreement.status === 'signed' ? <Callout tone={signature.kind === 'unknown' ? 'warning' : 'info'} icon={AlertTriangle} title={signature.title}>{signature.detail}</Callout> : null}
      <StatTiles items={[
        { label: 'Agreement', value: sentence(agreement.status), hint: agreement.signedAt ? `signed ${formatTimestamp(agreement.signedAt)}` : 'not signed yet', tone: operationalTone(agreement.status), icon: FileCheck2 },
        { label: 'Signing link', value: linkState, hint: agreement.signingTokenExpiresAt ? `expiry ${formatTimestamp(agreement.signingTokenExpiresAt)}` : 'no link issued', tone: linkTone, icon: KeyRound },
        { label: 'Stay', value: reservation ? sentence(reservation.status) : 'Not linked', hint: reservation ? formatDayRange(reservation.checkInDate, reservation.checkOutDate) : undefined, icon: CalendarDays },
        { label: 'Guest verification', value: sentence(agreement.guest?.verificationStatus), hint: agreement.guest?.name || agreement.signerEmail, tone: operationalTone(agreement.guest?.verificationStatus), icon: ShieldCheck },
      ]} />
      <DetailGrid
        main={<>
          <Section title="Agreement" icon={FileSignature} flush>
            <DescriptionList items={[
              { label: 'Status', value: <StatusBadge status={agreement.status} /> },
              { label: 'Signer email', value: agreement.signerEmail },
              { label: 'Signature name', value: agreement.signatureName || <Muted>Not signed</Muted> },
              ...(agreement.status === 'signed' ? [{ label: 'Signed by', value: <span className={signature.kind === 'guest' ? undefined : toneText.warning}>{signature.label}</span> }] : []),
              { label: 'Signed', value: agreement.signedAt ? formatTimestamp(agreement.signedAt) : <Muted>—</Muted> },
              { label: 'Cancellation policy', value: agreement.cancellationPolicy?.name || <span className={toneText.warning}>Not attached</span> },
              { label: 'Link expires', value: formatTimestamp(agreement.signingTokenExpiresAt) },
              { label: 'Link revoked', value: agreement.signingTokenRevokedAt ? formatTimestamp(agreement.signingTokenRevokedAt) : <Muted>No</Muted> },
              { label: 'Issued', value: formatTimestamp(agreement.createdAt) },
            ]} />
          </Section>
          {terms ? <Section title="Terms snapshot" icon={ReceiptText} description="The exact terms frozen when this agreement was issued.">
            <details className="group">
              <summary className="cursor-pointer list-none text-sm font-medium underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden"><span className="group-open:hidden">Show terms</span><span className="hidden group-open:inline">Hide terms</span></summary>
              <pre className="mt-3 max-h-[28rem] overflow-auto rounded-lg border bg-muted/30 p-3 font-mono text-xs leading-5 whitespace-pre-wrap [overflow-wrap:anywhere]">{terms}</pre>
            </details>
          </Section> : null}
          {reservation ? <Section title="Stay" icon={CalendarDays} flush>
            <LinkRows items={[{ id: reservation.id, href: reservationPath(reservation.id), title: `${reservation.confirmationCode} · ${reservation.listing?.title || 'Listing'}`, meta: `${formatDayRange(reservation.checkInDate, reservation.checkOutDate)} · ${formatMoney(reservation.totalAmountCents, reservation.currencyCode)} total · ${formatMoney(reservation.amountPaidCents, reservation.currencyCode)} paid`, trailing: <StatusBadge status={reservation.status} /> }]} />
          </Section> : null}
        </>}
        aside={<>
          {agreement.guest ? <Section title="Guest" icon={UserRound} flush>
            <LinkRows items={[{ id: agreement.guest.id, href: platformDetailPath('guest', agreement.guest.id), leading: <Avatar name={agreement.guest.name} />, title: agreement.guest.name, meta: agreement.guest.email, trailing: <StatusBadge status={agreement.guest.verificationStatus} /> }]} />
          </Section> : null}
          <Section title="Recovery" icon={KeyRound}>
            <div className="space-y-5 text-sm">
              <AccessNotice capabilities={capabilities} allowed={mayManage} retryHref={platformDetailPath('agreement', agreement.id)}>Reservation management permission is required to reissue or void agreements.</AccessNotice>
              {mayReissue ? <div className="space-y-2">
                <p className="text-xs leading-5 text-muted-foreground">Lost, expired or sent to the wrong person? A new link replaces every earlier one.</p>
                <AgreementLinkReissue agreementId={agreement.id} action={reissueAgreementLinkAction} />
              </div> : null}
              {mayVoid ? <form action={voidAgreementAction} className="space-y-3 border-t pt-4 first:border-t-0 first:pt-0">
                <input type="hidden" name="agreementId" value={agreement.id} />
                <Field label="Void reason" hint="Saved on the stay record."><TextInput required minLength={3} maxLength={1000} name="reason" placeholder={stayClosed ? 'Stay cancelled before arrival' : 'Sent to the wrong guest'} /></Field>
                <ConfirmSubmitButton title="Void this agreement?" description="The guest can no longer sign it. Its terms and any signature stay on record." confirmLabel="Void agreement" pendingLabel="Voiding…">Void agreement</ConfirmSubmitButton>
              </form> : null}
              {mayManage && !mayReissue && !mayVoid ? <p className="text-xs leading-5 text-muted-foreground">{agreement.status === 'voided' ? 'This agreement is void. Its terms and any signature stay on record.' : 'This agreement is signed for an active stay and stays in force.'}</p> : null}
            </div>
          </Section>
          <Callout tone="neutral" icon={Lock} title="Terms can’t be edited">The terms and signature are fixed when issued and signed. Voiding or sending a new link doesn’t change them.</Callout>
        </>}
      />
    </PageBody>
  </PlatformPage>;
}

/* ───────────────────────── Rate plan ───────────────────────── */

export async function RatePlanDetailPage({ params, searchParams }: DetailProps) {
  const { id } = await params;
  const query = (await searchParams) || {};
  const [result, capabilities] = await Promise.all([getRatePlanDetailWorkspace(id), getPlatformCapabilities()]);
  const plan = result.data?.ratePlan;
  if (!plan) return <DetailUnavailable section="Pricing" sectionHref="/platform/pricing" error={result.error} />;
  const mayPrice = capabilities.canManagePricing;
  const editHref = mayPrice ? ratePlanEditPath(id) : undefined;
  const listing = plan.listing;
  const inUse = listing?.effectiveRatePlans?.[0];
  const rules = effectiveArrivalRules(plan, listing);
  const gaps: AttentionItem[] = [
    !listing && { id: 'listing', title: 'No listing attached', detail: 'A plan prices one listing. Attach it in the rate-plan record.', href: mayPrice ? rawRecordPath('rate-plans', id) : undefined, actionLabel: 'Record' },
    !plan.cancellationPolicy && { id: 'policy', title: 'No cancellation policy', detail: 'Stays can’t be booked under a plan without published cancellation terms.', href: editHref, actionLabel: 'Edit plan' },
    plan.baseNightlyRateCents <= 0 && { id: 'rate', title: 'Base rate isn’t sellable', detail: 'Set a base nightly rate above zero.', href: editHref, actionLabel: 'Edit plan', tone: 'danger' as const },
    listing && plan.currencyCode !== listing.currencyCode && { id: 'currency', title: `Priced in ${plan.currencyCode}`, detail: `The listing sells in ${listing.currencyCode}, so this plan can’t price its stays.`, href: editHref, actionLabel: 'Edit plan', tone: 'danger' as const },
    plan.status !== 'active' && { id: 'status', title: `Plan is ${sentence(plan.status).toLowerCase()}`, detail: 'Only active plans price stays.', href: editHref, actionLabel: 'Edit plan' },
    plan.status === 'active' && inUse && inUse.id !== plan.id && { id: 'in-use', title: 'Another plan is in use', detail: `Quotes for this listing use “${inUse.name}”.`, href: platformDetailPath('ratePlan', inUse.id), actionLabel: 'Open', tone: 'info' as const },
  ].filter(Boolean) as AttentionItem[];
  const activeSeasons = plan.seasonalRates.filter((rate: any) => rate.isActive);
  const ruleHint = (fromListing: boolean) => fromListing ? (listing ? 'Listing default' : 'No listing attached') : 'Set on this plan';

  return <PlatformPage section="Pricing" sectionHref="/platform/pricing" current={plan.name}>
    <PageHeader
      back={{ href: '/dashboard/platform/pricing', label: 'Pricing' }}
      title={plan.name}
      badges={<><StatusBadge status={plan.status} />{plan.isDefault ? <Pill tone="info">Default plan</Pill> : null}{inUse?.id === plan.id ? <Pill tone="success">In use</Pill> : null}</>}
      description={plan.description || undefined}
      meta={<>
        <MetaItem icon={BedDouble}>{listing?.title || 'No listing attached'}</MetaItem>
        <MetaItem icon={FileCheck2}>{plan.cancellationPolicy?.name || 'No cancellation policy'}</MetaItem>
      </>}
      actions={<>
        {editHref ? <Button asChild size="sm" variant="outline"><Link href={editHref}><Pencil aria-hidden="true" />Edit rate plan</Link></Button> : null}
        {mayPrice ? <RecordLink href={rawRecordPath('rate-plans', id)}>Rate-plan record</RecordLink> : null}
      </>}
    />
    <PageBody>
      <ActionOutcome query={query} />
      <PartialLoad error={result.error} />
      <AccessNotice capabilities={capabilities} allowed={mayPrice} retryHref={platformDetailPath('ratePlan', id)}>Pricing management permission is required to change rate plans.</AccessNotice>
      <StatTiles items={[
        { label: 'Base nightly', value: plan.baseNightlyRateCents > 0 ? formatMoney(plan.baseNightlyRateCents, plan.currencyCode) : 'Not set', tone: plan.baseNightlyRateCents > 0 ? undefined : 'danger', icon: CircleDollarSign },
        { label: 'Stay length', value: `${plan.minimumStay}${plan.maximumStay ? `–${plan.maximumStay}` : '+'}`, hint: 'nights', icon: CalendarDays },
        { label: 'Seasonal windows', value: activeSeasons.length, hint: `${plan.seasonalRatesCount || 0} defined`, icon: CalendarDays },
        { label: 'Health', value: gaps.filter((gap) => gap.tone !== 'info').length ? plural(gaps.filter((gap) => gap.tone !== 'info').length, 'issue') : 'Healthy', tone: gaps.some((gap) => gap.tone !== 'info') ? 'warning' : 'success', icon: BadgeCheck },
      ]} />
      <DetailGrid
        main={<>
          {gaps.length ? <Section title="Needs attention" icon={AlertTriangle} flush><AttentionList items={gaps} /></Section> : null}
          <Section title="Pricing rules" icon={CircleDollarSign} flush>
            <DescriptionList items={[
              { label: 'Status', value: <StatusBadge status={plan.status} /> },
              { label: 'Base nightly rate', value: formatMoney(plan.baseNightlyRateCents, plan.currencyCode) },
              { label: 'Minimum stay', value: plural(plan.minimumStay, 'night') },
              { label: 'Maximum stay', value: plan.maximumStay ? plural(plan.maximumStay, 'night') : 'No maximum' },
              { label: 'Advance notice', value: rules.notice, hint: ruleHint(rules.noticeFromListing) },
              { label: 'Booking window', value: rules.window, hint: ruleHint(rules.windowFromListing) },
              { label: 'Updated', value: formatTimestamp(plan.updatedAt) },
            ]} />
          </Section>
          <Section title="Seasonal overrides" icon={CalendarDays} count={plan.seasonalRatesCount || 0} description={previewLabel(plan.seasonalRates.length, plan.seasonalRatesCount || 0, 'Date-bounded rates. Higher priority wins when windows overlap.')} action={mayPrice ? <Button asChild size="sm" variant="ghost"><Link href={rawRecordPath('seasonal-rates')}>Seasonal-rate records</Link></Button> : undefined} flush>
            {plan.seasonalRates.length ? <DataTable
              rows={plan.seasonalRates}
              getKey={(rate: any) => rate.id}
              caption="Seasonal overrides"
              columns={[
                { id: 'name', header: 'Season', cell: (rate: any) => <div><span className="font-medium">{rate.name}</span><SubLine mobileOnly="md">{formatDayRange(rate.startDate, rate.endDate)}</SubLine><SubLine mobileOnly="lg">{rate.minimumStay ? `${plural(rate.minimumStay, 'night')} min` : 'Plan minimum'} · priority {rate.priority}</SubLine></div> },
                { id: 'dates', header: 'Dates', hideBelow: 'md', cell: (rate: any) => <span className="whitespace-nowrap">{formatDayRange(rate.startDate, rate.endDate)}</span> },
                { id: 'rate', header: 'Nightly', align: 'right', cell: (rate: any) => rate.nightlyRateCents ? formatMoney(rate.nightlyRateCents, plan.currencyCode) : <span>{(rate.adjustmentBasisPoints || 0) > 0 ? '+' : ''}{(rate.adjustmentBasisPoints || 0) / 100}%</span> },
                { id: 'min', header: 'Min stay', align: 'right', hideBelow: 'lg', cell: (rate: any) => rate.minimumStay ? plural(rate.minimumStay, 'night') : <Muted>Plan default</Muted> },
                { id: 'priority', header: 'Priority', align: 'right', hideBelow: 'lg', cell: (rate: any) => rate.priority },
                { id: 'active', header: 'Status', cell: (rate: any) => <StatusBadge tone={rate.isActive ? 'success' : 'neutral'} label={rate.isActive ? 'Active' : 'Inactive'} /> },
              ]}
            /> : <EmptyRow>No seasonal overrides — the base rate applies every night.</EmptyRow>}
          </Section>
        </>}
        aside={<>
          {listing ? <Section title="Listing" icon={BedDouble} flush>
            <LinkRows items={[{ id: listing.id, href: platformDetailPath('listing', listing.id), title: listing.title, meta: `${listing.property?.name || 'Property'} · listing base ${formatMoney(listing.baseNightlyRateCents, listing.currencyCode)}`, trailing: <StatusBadge status={listing.status} /> }]} />
          </Section> : null}
          <Section title="Cancellation policy" icon={FileCheck2}>
            {plan.cancellationPolicy ? <><p className="text-sm font-medium">{plan.cancellationPolicy.name}</p>{plan.cancellationPolicy.summary ? <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{plan.cancellationPolicy.summary}</p> : null}</> : <p className={cn('text-sm', toneText.warning)}>No policy attached.</p>}
          </Section>
        </>}
      />
    </PageBody>
  </PlatformPage>;
}

/* ───────────────────────── Conversation ───────────────────────── */

export async function ConversationDetailPage({ params, searchParams }: DetailProps) {
  const { id } = await params;
  const query = (await searchParams) || {};
  const [result, capabilities] = await Promise.all([getConversationDetailWorkspace(id, query.before), getPlatformCapabilities()]);
  const conversation = result.data?.conversation;
  if (!conversation) return <DetailUnavailable section="Inbox" sectionHref="/platform/inbox" error={result.error} />;
  const name = conversation.guest?.name || conversation.subject || 'Guest conversation';
  const channel = conversation.channelConnection;
  const mayMessage = capabilities.canManageMessages;
  const conversationPath = platformDetailPath('conversation', conversation.id);
  const total = conversation.messagesCount || 0;
  const earlierCursor: string | null = result.data?.earlierCursor || null;
  const isLatestPage = result.data?.isLatestPage !== false;
  // Replies are delivered to the guest's private trip page, or the private inquiry page they were given.
  const replyDestination = channel ? null : conversation.reservation ? 'trip' : conversation.guestAccessTokenHash ? 'inquiry' : null;

  return <PlatformPage section="Inbox" sectionHref="/platform/inbox" current={name}>
    <PageHeader
      back={{ href: '/dashboard/platform/inbox', label: 'Inbox' }}
      title={name}
      badges={<><StatusBadge status={conversation.status} />{conversation.failedMessagesCount ? <StatusBadge tone="danger" label={`${conversation.failedMessagesCount} failed`} /> : null}</>}
      description={conversation.subject && conversation.guest?.name ? conversation.subject : undefined}
      meta={<>
        <MetaItem icon={BedDouble}>{conversation.listing?.title || 'No listing'}</MetaItem>
        <MetaItem icon={RadioTower}>{channel?.name || 'Direct'}</MetaItem>
        <MetaItem icon={Inbox}>{plural(total, 'message')}</MetaItem>
      </>}
      actions={<>
        {mayMessage ? (conversation.status === 'open' ? ['snoozed', 'archived'] : ['open']).map((status) => <form key={status} action={conversationStatusAction}>
          <input type="hidden" name="conversationId" value={conversation.id} />
          <input type="hidden" name="status" value={status} />
          <SubmitButton size="sm" variant="outline" pendingLabel="Saving…">{status === 'open' ? 'Reopen' : status === 'archived' ? 'Archive' : 'Snooze'}</SubmitButton>
        </form>) : null}
        {mayMessage && replyDestination === 'inquiry' && !conversation.guestAccessTokenRevokedAt ? <form action={conversationLinkAction}>
          <input type="hidden" name="conversationId" value={conversation.id} />
          <input type="hidden" name="operation" value="revoke" />
          <SubmitButton size="sm" variant="outline" pendingLabel="Saving…">Turn off guest link</SubmitButton>
        </form> : null}
        {mayMessage && replyDestination === 'inquiry' && conversation.guestEmail ? <form action={conversationLinkAction}>
          <input type="hidden" name="conversationId" value={conversation.id} />
          <input type="hidden" name="operation" value="reissue" />
          <SubmitButton size="sm" variant="outline" pendingLabel="Sending…">Email guest a new link</SubmitButton>
        </form> : null}
        <RecordLink href={rawRecordPath('conversations', id)}>Conversation record</RecordLink>
      </>}
    />
    <PageBody>
      <ActionOutcome query={query} />
      <PartialLoad error={result.error} />
      <AccessNotice capabilities={capabilities} allowed={mayMessage} retryHref={conversationPath}>Message management permission is required to reply or change this conversation.</AccessNotice>
      <DetailGrid
        main={<>
          <Section title="Messages" icon={MessageSquare} count={total} description={isLatestPage ? (earlierCursor ? `Latest ${conversation.messages.length} of ${total}, oldest first.` : 'Oldest first.') : 'Earlier messages, oldest first.'} action={!isLatestPage ? <Button asChild size="sm" variant="ghost"><Link href={conversationPath}>Newest messages</Link></Button> : undefined} flush>
            {earlierCursor ? <div className="border-b px-4 py-2.5 text-center"><Button asChild size="sm" variant="outline"><Link href={`${conversationPath}?before=${encodeURIComponent(earlierCursor)}`} scroll={false}>Load earlier messages</Link></Button></div> : null}
            {conversation.messages.length ? <ol className="space-y-4 px-4 py-5">
              {conversation.messages.map((message: any) => {
                const inbound = message.direction === 'inbound';
                return <li key={message.id} className={cn('flex', inbound ? 'justify-start' : 'justify-end')}>
                  <div className={cn('max-w-[min(36rem,85%)]', inbound ? 'items-start' : 'items-end')}>
                    <div className={cn('rounded-2xl border px-4 py-2.5 text-sm leading-6 shadow-xs', inbound ? 'rounded-bl-md bg-muted/50' : 'rounded-br-md bg-background', message.status === 'failed' && 'border-rose-300 dark:border-rose-900')}>
                      <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{message.body}</p>
                    </div>
                    <p className={cn('mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 px-1 text-[11px] text-muted-foreground', !inbound && 'justify-end')}>
                      {inbound ? <ArrowDownLeft aria-hidden="true" className="size-3" /> : <ArrowUpRight aria-hidden="true" className="size-3" />}
                      <span>{sentence(message.senderType)}</span>
                      <span>·</span>
                      <time>{formatTimestamp(message.receivedAt || message.sentAt || message.createdAt)}</time>
                      <span>·</span>
                      <span className={message.status === 'failed' ? cn('font-medium', toneText.danger) : undefined}>{!inbound && message.status === 'sent' && !channel ? 'On guest’s page' : sentence(message.status)}</span>
                      {message.externalMessageId ? <span className="font-mono" title="Provider message id">#{message.externalMessageId.slice(-8)}</span> : null}
                    </p>
                  </div>
                </li>;
              })}
            </ol> : <EmptyState compact icon={MessageSquare} title="No messages yet" description="Messages in this thread will appear here." />}
          </Section>
          <Section title="Reply" icon={MessageSquare} description={mayMessage ? replyDestination === 'trip'
            ? 'Your reply appears on the guest’s private trip page. No email is sent.'
            : replyDestination === 'inquiry' ? 'Your reply appears on the private inquiry page the guest was given. No email is sent.' : undefined : undefined}>
            {!mayMessage ? <p className="text-sm leading-6 text-muted-foreground">{capabilities.known ? 'Replying needs message management permission.' : 'Replies are unavailable until your permissions can be checked.'}</p> : replyDestination ? <ConversationReplyForm conversationId={conversation.id} /> : <p className="text-sm leading-6 text-muted-foreground">{channel
              ? `This thread belongs to ${channel.name}. Reply in that channel so the guest receives it.`
              : <>This guest has no private page to receive replies.{conversation.guest?.email || conversation.guestEmail ? <> Reach them at <a className="underline-offset-4 hover:underline" href={`mailto:${conversation.guest?.email || conversation.guestEmail}`}>{conversation.guest?.email || conversation.guestEmail}</a>.</> : null}</>}</p>}
          </Section>
        </>}
        aside={<>
          {conversation.reservation ? <Section title="Stay" icon={CalendarDays} flush>
            <LinkRows items={[{ id: conversation.reservation.id, href: reservationPath(conversation.reservation.id), title: conversation.reservation.confirmationCode, meta: formatDayRange(conversation.reservation.checkInDate, conversation.reservation.checkOutDate), trailing: <StatusBadge status={conversation.reservation.status} /> }]} />
          </Section> : null}
          {conversation.guest ? <Section title="Guest" icon={UserRound} flush>
            <LinkRows items={[{ id: conversation.guest.id, href: platformDetailPath('guest', conversation.guest.id), leading: <Avatar name={conversation.guest.name} />, title: conversation.guest.name, meta: conversation.guest.email, trailing: <StatusBadge status={conversation.guest.verificationStatus} /> }]} />
          </Section> : null}
          {conversation.guestEmail ? <Section title="Reply-to" icon={Mail} flush>
            <DescriptionList items={[{ label: 'Guest email', value: <a className="underline-offset-4 hover:underline [overflow-wrap:anywhere]" href={`mailto:${conversation.guestEmail}`}>{conversation.guestEmail}</a>, hint: 'Given with the inquiry. Replies sent here don’t go to this address.' }]} />
          </Section> : null}
          <Section title="Channel" icon={RadioTower} flush>
            {channel ? <DescriptionList items={[
              { label: 'Connection', value: channel.name },
              { label: 'Provider', value: channel.provider },
              { label: 'Status', value: <StatusBadge status={channel.status} /> },
              { label: 'Message sync', value: channel.syncMessages ? 'On' : 'Off' },
              { label: 'Last sync', value: formatTimestamp(channel.lastSyncedAt) },
              channel.lastError ? { label: 'Last error', value: <span className={toneText.danger}>{channel.lastError}</span> } : null,
            ]} /> : <EmptyRow>Direct conversation — no channel attached.</EmptyRow>}
          </Section>
        </>}
      />
    </PageBody>
  </PlatformPage>;
}

/* ───────────────────────── Payment ───────────────────────── */

function refundEvidenceCopy(refund: any, card = false) {
  if (refund.status === 'succeeded') {
    return card && refund.providerRefundId
      ? `Refunded through Stripe (test mode), reference ${refund.providerRefundId}.`
      : 'Recorded by an operator as returned outside the store, with a completion reference.';
  }
  if (refund.status === 'cancelled') return 'Declined by the host. No money was returned.';
  if (refund.status === 'processing') return card ? 'Sent to Stripe and still processing.' : 'Being recorded.';
  if (['pending', 'failed'].includes(refund.status)) {
    if (refund.status === 'failed') return card ? 'The last Stripe attempt didn’t go through. No money has been returned yet.' : 'Not yet returned.';
    return refund.reason === 'stay_amendment'
      ? 'Owed after the stay’s dates changed. No money has been returned yet.'
      : 'Owed to the guest. No money has been returned yet.';
  }
  if (refund.providerRefundId?.startsWith('manual-refund-') || refund.providerRefundId?.startsWith('pending-')) {
    return 'Legacy local placeholder; not an external provider refund reference.';
  }
  return refund.providerRefundId
    ? `Provider refund reference: ${refund.providerRefundId}. Verify the provider outcome.`
    : 'No provider refund reference recorded.';
}

export async function PaymentDetailPage({ params, searchParams }: DetailProps) {
  const { id } = await params;
  const query = (await searchParams) || {};
  const [result, capabilities] = await Promise.all([getPaymentDetailWorkspace(id), getPlatformCapabilities()]);
  const payment = result.data?.payment;
  if (!payment) return <DetailUnavailable section="Payments" sectionHref="/platform/payments" error={result.error} />;
  // Only settled statuses moved money; a pending, failed or cancelled attempt collected nothing.
  const settled = settledPaymentStatuses.includes(payment.status);
  const pendingOutcome = ['pending', 'processing'].includes(payment.status);
  const net = payment.amountCents - payment.refundedAmountCents;
  const failedEvents = payment.failedWebhookEventsCount || 0;
  const guest = payment.reservation?.guest || payment.guest;
  const code = payment.reservation?.confirmationCode || 'Payment';
  const card = payment.provider === 'pp_stripe_stripe';
  const mayRefund = capabilities.canManagePayments;
  // Complete refund facts from the server (every refund of this payment), not the loaded preview.
  const availability = payment.refundAvailability || null;
  const openRefunds = payment.openRefunds || [];
  const openRefundCount = availability ? availability.openRefundCount : openRefunds.length;
  const openRefundCents = availability ? availability.openRefundCents : openRefunds.reduce((sum: number, refund: any) => sum + refund.amountCents, 0);
  const refundable = availability ? availability.refundableCents : 0;
  const refundRows = [...openRefunds, ...(payment.refunds || [])];
  const provenance = tenderLabel(payment.tenderKind, payment.reservation);
  const realMoney = isRealTender(payment.tenderKind);
  const paymentPath = platformDetailPath('payment', payment.id);

  return <PlatformPage section="Payments" sectionHref="/platform/payments" current={code}>
    <PageHeader
      back={{ href: '/dashboard/platform/payments', label: 'Payments' }}
      title={formatMoney(payment.amountCents, payment.currencyCode)}
      badges={<StatusBadge status={payment.status} />}
      meta={<>
        <MetaItem icon={CalendarDays}>{payment.reservation?.confirmationCode || 'Not linked to a stay'}</MetaItem>
        <MetaItem icon={UserRound}>{guest?.name || 'Guest unavailable'}</MetaItem>
        <MetaItem icon={Banknote}>{sentence(payment.paymentMethod)} · {payment.paymentProvider?.name || payment.provider || 'Manual'}</MetaItem>
      </>}
      actions={<RecordLink href={rawRecordPath('payments', id)}>View record</RecordLink>}
    />
    <PageBody>
      <ActionOutcome query={query} />
      <PartialLoad error={result.error} />
      {payment.errorMessage ? <Callout tone="danger" title="Provider reported an error">{payment.errorMessage}</Callout> : null}
      {provenance ? <Callout tone={realMoney ? 'info' : 'warning'} icon={AlertTriangle} title={realMoney ? 'Payment evidence' : 'Not real money'}>{provenance}.</Callout> : null}
      {openRefundCount > openRefunds.length ? <Callout tone="warning" icon={AlertTriangle} title="More open refunds than shown">{openRefunds.length} of {openRefundCount} open refunds are listed, oldest first. Totals include all of them.</Callout> : null}
      {openRefundCount ? <Callout tone="warning" icon={AlertTriangle} title={`${formatMoney(openRefundCents, payment.currencyCode)} refund owed to the guest`}>{mayRefund ? (card ? 'Refund it in Stripe (test mode) or decline it below.' : 'Return the money outside the store, then record it below — or decline it.') : undefined}</Callout> : null}
      {openRefundCount || refundable > 0 ? <AccessNotice capabilities={capabilities} allowed={mayRefund} retryHref={paymentPath}>Payment management permission is required to issue or process refunds.</AccessNotice> : null}
      <StatTiles items={[
        settled
          ? { label: realMoney ? 'Charged' : 'Charged · not real money', value: formatMoney(payment.amountCents, payment.currencyCode), hint: payment.processedAt ? formatTimestamp(payment.processedAt) : 'processing time not recorded', tone: realMoney ? undefined : 'warning' as const, icon: CircleDollarSign }
          : { label: 'Attempted', value: formatMoney(payment.amountCents, payment.currencyCode), hint: `${sentence(payment.status).toLowerCase()} · not collected`, tone: pendingOutcome ? 'warning' : 'danger', icon: CircleDollarSign },
        { label: 'Refunded', value: formatMoney(payment.refundedAmountCents, payment.currencyCode), hint: plural(payment.refundsCount ?? refundRows.length, 'refund'), tone: payment.refundedAmountCents ? 'warning' : undefined, icon: ReceiptText },
        { label: 'Refund pending', value: formatMoney(openRefundCents, payment.currencyCode), hint: openRefundCount ? plural(openRefundCount, 'open refund') : 'nothing open', tone: openRefundCents ? 'warning' : undefined, icon: AlertTriangle },
        settled
          ? { label: realMoney ? 'Recorded net' : 'Recorded net · not real money', value: formatMoney(net, payment.currencyCode), hint: failedEvents ? `${failedEvents} webhook events failed` : 'after completed refunds', tone: failedEvents ? 'danger' : undefined, icon: Banknote }
          : { label: 'Recorded net', value: pendingOutcome ? '—' : formatMoney(0, payment.currencyCode), hint: pendingOutcome ? 'awaiting the provider outcome' : 'nothing settled', tone: failedEvents ? 'danger' : undefined, icon: Banknote },
      ]} />
      <DetailGrid
        main={<>
          <Section title="Charge" icon={CircleDollarSign} flush>
            <DescriptionList items={[
              { label: 'Status', value: <StatusBadge status={payment.status} /> },
              { label: settled ? 'Amount charged' : 'Amount attempted', value: formatMoney(payment.amountCents, payment.currencyCode) },
              { label: 'Method', value: sentence(payment.paymentMethod) },
              { label: 'Provider', value: payment.paymentProvider?.name || payment.provider || 'Manual' },
              { label: 'Provider payment id', value: payment.providerPaymentId ? <span className="font-mono text-xs">{payment.providerPaymentId}</span> : <Muted>Not recorded</Muted> },
              { label: 'Idempotency key', value: payment.idempotencyKey ? <span className="font-mono text-xs">{payment.idempotencyKey}</span> : <Muted>Not recorded</Muted> },
              { label: 'Processed by', value: payment.processedBy?.name || <Muted>Not recorded</Muted> },
              { label: 'Processed', value: formatTimestamp(payment.processedAt) },
              { label: 'Created', value: formatTimestamp(payment.createdAt) },
            ]} />
          </Section>
          <Section title="Refunds" icon={ReceiptText} count={payment.refundsCount ?? refundRows.length} description={(payment.refundsCount || 0) > refundRows.length ? `${openRefunds.length} open and the ${payment.refunds.length} latest closed of ${payment.refundsCount} refunds.` : card ? 'Card refunds run in Stripe test mode and record Stripe’s refund reference.' : 'Manual refunds are returned outside the store, then recorded here with a reference.'} flush>
            {refundRows.length ? <ul className="divide-y">
              {refundRows.map((refund: any) => <li key={refund.id} className="space-y-3 px-4 py-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 max-w-xl"><p className="text-sm font-medium">{refund.refundNumber} · {formatMoney(refund.amountCents, refund.currencyCode)}</p><SubLine>{sentence(refund.reason)} · {formatTimestamp(refund.processedAt || refund.createdAt)}</SubLine><p className="mt-1 text-xs leading-5 text-muted-foreground">{refundEvidenceCopy(refund, card)}</p></div>
                  <StatusBadge status={refund.status} label={refund.status === 'succeeded' ? (card ? 'Refunded' : 'Recorded') : refund.status === 'cancelled' ? 'Declined' : undefined} />
                </div>
                {mayRefund && ['pending', 'processing', 'failed'].includes(refund.status) ? <RefundActions refund={{ ...refund, payment: { provider: payment.provider } }} reservationId={payment.reservation?.id} returnTo={paymentPath} /> : null}
              </li>)}
            </ul> : <EmptyRow>No refunds recorded.</EmptyRow>}
            {mayRefund && refundable > 0 ? <div className="border-t px-4 py-3"><Disclosure summary="Issue a refund" description={`${formatMoney(refundable, payment.currencyCode)} can still be refunded.`}>
              <form action={createRefundAction} className="grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="reservationId" value={payment.reservation?.id || ''} />
                <input type="hidden" name="paymentId" value={payment.id} />
                <input type="hidden" name="returnTo" value={paymentPath} />
                <input type="hidden" name="operationKey" value={crypto.randomUUID()} />
                <Field label="Amount"><MoneyInput required name="amountCents" currencyCode={payment.currencyCode} /></Field>
                <Field label="Reason"><Select required name="reason" defaultValue="goodwill"><option value="goodwill">Goodwill</option><option value="stay_issue">Stay issue</option><option value="overpayment">Overpayment</option></Select></Field>
                <Field label="Note" hint="Saved with the refund." className="sm:col-span-2"><TextInput required minLength={3} maxLength={1000} name="note" /></Field>
                <div className="sm:col-span-2"><ConfirmSubmitButton destructive={false} title="Issue this refund?" description={card ? 'This sends the refund to Stripe in test mode. Goodwill and stay-issue refunds lower the stay total by the same amount.' : 'This opens a refund to record once you’ve returned the money. Goodwill and stay-issue refunds lower the stay total by the same amount.'} confirmLabel="Issue refund" pendingLabel="Refunding…">Issue refund</ConfirmSubmitButton></div>
              </form>
            </Disclosure></div> : null}
          </Section>
          <TwoColumn>
            <Section title="Security deposits" icon={ShieldCheck} count={payment.securityDeposits.length} flush>
              <LinkRows empty="No deposit on this payment." items={payment.securityDeposits.map((deposit: any) => ({ id: deposit.id, title: deposit.depositNumber, meta: `${formatMoney(deposit.capturedAmountCents, deposit.currencyCode)} captured of ${formatMoney(deposit.amountCents, deposit.currencyCode)}`, trailing: <StatusBadge status={deposit.status} /> }))} />
            </Section>
            <Section title="Webhook events" icon={Webhook} count={payment.webhookEventsCount || 0} description={previewLabel(payment.webhookEvents.length, payment.webhookEventsCount || 0)} flush>
              <LinkRows empty="No provider events received." items={payment.webhookEvents.map((event: any) => ({ id: event.id, title: <span className="font-mono text-xs">{event.eventType}</span>, meta: event.errorMessage ? <span className={toneText.danger}>{event.errorMessage}</span> : `${formatTimestamp(event.receivedAt)} · ${event.providerEventId}`, trailing: <StatusBadge status={event.status} /> }))} />
            </Section>
          </TwoColumn>
        </>}
        aside={<>
          {payment.reservation ? <Section title="Stay" icon={CalendarDays} flush>
            <LinkRows items={[{ id: payment.reservation.id, href: reservationPath(payment.reservation.id), title: `${payment.reservation.confirmationCode} · ${payment.reservation.listing?.title || 'Listing'}`, meta: `${formatMoney(payment.reservation.amountPaidCents, payment.reservation.currencyCode)} paid of ${formatMoney(payment.reservation.totalAmountCents, payment.reservation.currencyCode)}`, trailing: <StatusBadge status={payment.reservation.status} /> }]} />
          </Section> : null}
          {payment.guest ? <Section title="Guest" icon={UserRound} flush>
            <LinkRows items={[{ id: payment.guest.id, href: platformDetailPath('guest', payment.guest.id), leading: <Avatar name={payment.guest.name} />, title: payment.guest.name, meta: payment.guest.email }]} />
          </Section> : null}
          <Section title="Provider" icon={ShieldCheck} flush>
            <DescriptionList items={[
              { label: 'Adapter', value: payment.paymentProvider?.name || payment.provider || 'Manual' },
              { label: 'Installed', value: payment.paymentProvider?.isInstalled ? 'Yes' : 'No' },
              { label: 'Reference', value: payment.providerPaymentId ? 'Recorded' : <span className={toneText.warning}>Not recorded</span> },
            ]} />
          </Section>
          <p className="px-1 text-xs leading-5 text-muted-foreground">{payment.providerPaymentId ? 'A provider reference is recorded. It doesn’t independently prove bank settlement.' : 'No provider reference is recorded — don’t assume this was submitted to a provider.'}</p>
        </>}
      />
    </PageBody>
  </PlatformPage>;
}

/* ───────────────────────── Payout ───────────────────────── */

export async function PayoutDetailPage({ params }: DetailProps) {
  const { id } = await params;
  const result = await getPayoutDetailWorkspace(id);
  const payout = result.data?.payout;
  if (!payout) return <DetailUnavailable section="Payouts" sectionHref="/platform/payouts" error={result.error} />;
  const money = (cents: number) => formatMoney(cents, payout.currencyCode);
  const owner = payout.propertyOwner;
  const statement = payout.ownerStatement;
  // Statement amounts keep the statement's own currency: minor units are never relabeled.
  const statementMoney = (cents: number) => formatMoney(cents, statement?.currencyCode || payout.currencyCode);
  const evidence = payout.data && typeof payout.data === 'object' ? payout.data : {};
  const transfer = evidence.kind === 'manual_transfer_attestation' && evidence.transfer && typeof evidence.transfer === 'object' ? evidence.transfer : null;
  const sample = Boolean(payout.reservation?.fixtureOrigin) || (statement?.sampleLinesCount || 0) > 0;
  const waterfall: Array<{ label: string; value: number; kind: 'base' | 'less' | 'total' }> = [
    { label: 'Gross stay revenue', value: payout.grossAmountCents, kind: 'base' },
    { label: 'Platform fee', value: payout.platformFeeCents, kind: 'less' },
    { label: 'Manager fee', value: payout.managerFeeCents, kind: 'less' },
    { label: 'Refund allocation', value: payout.refundAmountCents, kind: 'less' },
    { label: 'Net payout', value: payout.netAmountCents, kind: 'total' },
  ];

  return <PlatformPage section="Payouts" sectionHref="/platform/payouts" current={payout.payoutNumber}>
    <PageHeader
      back={{ href: '/dashboard/platform/payouts', label: 'Payouts' }}
      title={payout.payoutNumber}
      badges={<StatusBadge status={payout.status} />}
      meta={<>
        <MetaItem icon={Landmark}>{owner?.displayName || 'Owner unavailable'}</MetaItem>
        <MetaItem icon={ReceiptText}>{statement?.statementNumber || 'No statement'}</MetaItem>
        <MetaItem icon={CalendarDays}>Scheduled {formatTimestamp(payout.scheduledAt)}</MetaItem>
      </>}
      actions={<RecordLink href={rawRecordPath('payouts', id)}>View record</RecordLink>}
    />
    <PageBody>
      <PartialLoad error={result.error} />
      {sample ? <Callout tone="warning" icon={AlertTriangle} title="Setup sample payout">Recorded against setup sample stays. It isn’t money paid to a real owner.</Callout> : null}
      {statement?.currencyCode && statement.currencyCode !== payout.currencyCode ? <Callout tone="warning" icon={AlertTriangle} title="Two currencies">This payout is in {payout.currencyCode}; its statement is in {statement.currencyCode}. Amounts are shown in their own currency, unconverted.</Callout> : null}
      <StatTiles items={[
        { label: 'Gross', value: money(payout.grossAmountCents), hint: 'stay revenue allocated', icon: CircleDollarSign },
        { label: 'Fees', value: money(payout.platformFeeCents + payout.managerFeeCents), hint: 'platform + manager', icon: ReceiptText },
        { label: 'Refunds', value: money(payout.refundAmountCents), hint: 'allocated to this payout', icon: ReceiptText },
        { label: 'Net payout', value: money(payout.netAmountCents), hint: payout.paidAt ? `paid ${formatTimestamp(payout.paidAt)}` : 'not paid yet', tone: operationalTone(payout.status), icon: WalletCards },
      ]} />
      <DetailGrid
        main={<>
          <Section title="Payout breakdown" icon={WalletCards} description="From gross stay revenue to the owner’s net." flush>
            <dl className="divide-y">
              {waterfall.map((line) => <div key={line.label} className={cn('flex items-baseline justify-between gap-4 px-4 py-3 text-sm', line.kind === 'total' && 'bg-muted/30')}>
                <dt className={line.kind === 'total' ? 'font-semibold' : line.kind === 'less' ? 'pl-4 text-muted-foreground' : 'font-medium'}>{line.kind === 'less' ? `Less ${line.label.toLowerCase()}` : line.label}</dt>
                <dd className={cn('tabular-nums', line.kind === 'total' ? 'text-base font-semibold' : line.kind === 'less' ? 'text-muted-foreground' : 'font-medium')}>{line.kind === 'less' && line.value ? '−' : ''}{money(line.value)}</dd>
              </div>)}
            </dl>
          </Section>
          {statement ? <Section title="Owner statement" icon={ReceiptText} description="Statement status is separate from the transfer status." flush>
            <DescriptionList items={[
              { label: 'Statement', value: <Link href={`/dashboard/platform/payouts/statements/${statement.id}`} className="underline-offset-4 hover:underline">{statement.statementNumber}</Link> },
              { label: 'Status', value: <StatusBadge status={statement.status} /> },
              { label: 'Period', value: formatDayRange(statement.periodStart, statement.periodEnd) },
              { label: 'Currency', value: statement.currencyCode || <Muted>Not recorded</Muted> },
              { label: 'Gross revenue', value: statementMoney(statement.grossRevenueCents) },
              { label: 'Owner earnings', value: statementMoney(statement.ownerEarningsCents) },
              { label: 'Balance due', value: statementMoney(statement.balanceDueCents) },
              { label: 'Paid reference', value: statement.paidReference ? <span className="font-mono text-xs">{statement.paidReference}</span> : <Muted>Not recorded</Muted> },
            ]} />
          </Section> : null}
          {payout.reservation ? <Section title="Funding stay" icon={CalendarDays} flush>
            <LinkRows items={[{ id: payout.reservation.id, href: reservationPath(payout.reservation.id), title: `${payout.reservation.confirmationCode} · ${payout.reservation.guest?.name || 'Guest'}`, meta: `${payout.reservation.listing?.title || 'Listing'} · ${formatDayRange(payout.reservation.checkInDate, payout.reservation.checkOutDate)}`, trailing: <StatusBadge status={payout.reservation.status} /> }]} />
          </Section> : null}
        </>}
        aside={<>
          {owner ? <Section title="Owner" icon={Landmark} flush>
            <DescriptionList items={[
              { label: 'Name', value: owner.displayName },
              owner.companyName ? { label: 'Company', value: owner.companyName } : null,
              { label: 'Email', value: owner.email || '—' },
              { label: 'Owner no.', value: owner.ownerNumber },
              { label: 'Schedule', value: sentence(owner.payoutSchedule) },
              { label: 'Status', value: <StatusBadge status={owner.status} /> },
            ]} />
          </Section> : null}
          <Section title="Transfer" icon={Banknote} flush>
            <DescriptionList items={[
              { label: 'Provider payout id', value: payout.providerPayoutId ? <span className="font-mono text-xs">{payout.providerPayoutId}</span> : <span className={toneText.warning}>Not recorded</span> },
              { label: 'Scheduled', value: formatTimestamp(payout.scheduledAt) },
              { label: 'Paid', value: payout.paidAt ? formatTimestamp(payout.paidAt) : <Muted>—</Muted> },
            ]} />
          </Section>
          {transfer ? <Section title="Transfer evidence" icon={ShieldCheck} description="Attested by an operator; not verified with a provider." flush>
            <DescriptionList items={[
              { label: 'Amount', value: formatMoney(Number(transfer.amountCents) || 0, String(transfer.currencyCode || payout.currencyCode)) },
              { label: 'Transfer date', value: String(transfer.paidOn || '—') },
              { label: 'Payee', value: String(transfer.payee || '—') },
              { label: 'Method', value: sentence(String(transfer.method || '')) },
              { label: 'Reference', value: <span className="font-mono text-xs">{String(transfer.reference || '—')}</span> },
              { label: 'Proof kept at', value: String(transfer.custody || '—') },
              { label: 'Attested', value: evidence.attestedAt ? formatTimestamp(String(evidence.attestedAt)) : <Muted>Not recorded</Muted> },
              { label: 'Provider verified', value: evidence.providerVerified === true ? 'Yes' : <span className={toneText.warning}>No</span> },
            ]} />
          </Section> : payout.status === 'paid' && !payout.providerPayoutId ? <Callout tone="warning" icon={AlertTriangle} title="No transfer evidence">This payout is marked paid without a provider id or recorded transfer attestation.</Callout> : null}
          <p className="px-1 text-xs leading-5 text-muted-foreground">{payout.providerPayoutId ? 'A provider reference is recorded. Reconcile it against the bank and owner statement before treating funds as settled.' : 'No provider payout id is recorded, so funds shouldn’t be treated as submitted from this record alone.'}</p>
        </>}
      />
    </PageBody>
  </PlatformPage>;
}

/* ───────────────────────── Review ───────────────────────── */

export async function ReviewDetailPage({ params, searchParams }: DetailProps) {
  const { id } = await params;
  const query = (await searchParams) || {};
  const [result, capabilities] = await Promise.all([getReviewDetailWorkspace(id), getPlatformCapabilities()]);
  const review = result.data?.review;
  if (!review) return <DetailUnavailable section="Reviews" sectionHref="/platform/reviews" error={result.error} />;
  const categories: Array<[string, number | null]> = [['Cleanliness', review.cleanlinessRating], ['Accuracy', review.accuracyRating], ['Communication', review.communicationRating], ['Location', review.locationRating], ['Value', review.valueRating]];
  const recovery = categories.filter(([, value]) => value && Number(value) <= 3) as Array<[string, number]>;
  const listing = review.listing;
  const rating = review.overallRating;
  const mayModerate = capabilities.canManageReviews;

  return <PlatformPage section="Reviews" sectionHref="/platform/reviews" current={listing?.title || 'Review'}>
    <PageHeader
      back={{ href: '/dashboard/platform/reviews', label: 'Reviews' }}
      title={listing?.title || 'Review'}
      badges={<><StatusBadge status={review.status} />{rating ? <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-0.5 shadow-xs"><Stars rating={rating} /><span className="text-xs font-medium tabular-nums">{rating}/5</span></span> : null}</>}
      meta={<>
        <MetaItem icon={UserRound}>{review.guest?.name || sentence(review.direction)}</MetaItem>
        <MetaItem icon={CalendarDays}>{review.reservation?.confirmationCode || 'No stay linked'}</MetaItem>
        <MetaItem icon={Users}>{sentence(review.direction)}</MetaItem>
      </>}
      actions={<>
        {mayModerate ? [
          review.status !== 'published' && review.status !== 'draft' ? { action: 'publish', label: 'Publish' } : null,
          review.status === 'published' ? { action: 'hold', label: 'Hold from listing' } : null,
          review.status !== 'removed' ? { action: 'remove', label: 'Remove' } : null,
        ].filter(Boolean).map((option: any) => <form key={option.action} action={moderateReviewAction}>
          <input type="hidden" name="reviewId" value={review.id} />
          <input type="hidden" name="action" value={option.action} />
          {option.action === 'remove'
            ? <ConfirmSubmitButton title="Remove this review?" description="It’s taken off the listing and kept for your records. Use this for reviews that break the content policy." confirmLabel="Remove review" pendingLabel="Removing…">Remove</ConfirmSubmitButton>
            : <SubmitButton size="sm" variant={option.action === 'publish' ? 'default' : 'outline'} pendingLabel="Saving…">{option.label}</SubmitButton>}
        </form>) : null}
        <RecordLink href={rawRecordPath('reviews', id)}>Review record</RecordLink>
      </>}
    />
    <PageBody>
      <ActionOutcome query={query} />
      <PartialLoad error={result.error} />
      <AccessNotice capabilities={capabilities} allowed={mayModerate} retryHref={platformDetailPath('review', review.id)}>Review management permission is required to publish, hold or remove reviews.</AccessNotice>
      {review.status === 'submitted' ? <Callout tone="info" title="Waiting for moderation">This review isn’t on the listing yet.{mayModerate ? ' Publish it, or remove it if it breaks the content policy.' : ''}</Callout> : null}
      <DetailGrid
        main={<>
          <Section title="Review" icon={Star}>
            {review.body ? <blockquote className="border-l-2 border-foreground/15 pl-4 text-[15px] leading-7 whitespace-pre-wrap [overflow-wrap:anywhere]">{review.body}</blockquote> : <p className="text-sm text-muted-foreground">No public review text.</p>}
          </Section>
          {review.privateFeedback ? <Callout tone="neutral" icon={Lock} title="Private feedback — not shown publicly"><p className="whitespace-pre-wrap">{review.privateFeedback}</p></Callout> : null}
          <Section title="Category scores" icon={ListChecks} description="Scores of 3 or below point to the operational fix." flush>
            <ul className="divide-y">
              {categories.map(([label, value]) => {
                const score = Number(value || 0);
                const tone: OperationalTone = !value ? 'neutral' : score <= 2 ? 'danger' : score <= 3 ? 'warning' : 'success';
                return <li key={label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-4 py-3 text-sm sm:grid-cols-[8rem_minmax(0,1fr)_3rem] sm:gap-x-4">
                  <span className="min-w-0 font-medium [overflow-wrap:anywhere]">{label}</span>
                  <span className={cn('text-right tabular-nums sm:order-3', value ? toneText[tone] : 'text-muted-foreground')}>{value ? `${value}/5` : '—'}</span>
                  <div className="col-span-2 min-w-0 sm:order-2 sm:col-span-1">{value ? <ScoreMeter label={`${label} score`} score={score} tone={tone} /> : <Muted className="text-xs">Not rated</Muted>}</div>
                </li>;
              })}
            </ul>
          </Section>
        </>}
        aside={<>
          <Section title="Recovery" icon={AlertTriangle} flush>
            <AttentionList
              empty="No category at three or below."
              items={recovery.map(([label, value]) => ({ id: label, title: `${label} · ${value}/5`, detail: `Check ${label.toLowerCase()} before the next stay.`, href: listing?.property?.id ? platformDetailPath('property', listing.property.id) : undefined, actionLabel: 'Property', tone: value <= 2 ? 'danger' as const : 'warning' as const }))}
            />
          </Section>
          <Section title="Publication" icon={FileCheck2} flush>
            <DescriptionList items={[
              { label: 'Status', value: <StatusBadge status={review.status} /> },
              { label: 'Submitted', value: formatTimestamp(review.submittedAt) },
              { label: 'Publish after', value: formatTimestamp(review.publishAfter) },
              { label: 'Published', value: review.publishedAt ? formatTimestamp(review.publishedAt) : <Muted>Not yet</Muted> },
            ]} />
          </Section>
          {review.reservation ? <Section title="Stay" icon={CalendarDays} flush>
            <LinkRows items={[{ id: review.reservation.id, href: reservationPath(review.reservation.id), title: review.reservation.confirmationCode, meta: `${formatDayRange(review.reservation.checkInDate, review.reservation.checkOutDate)} · ${plural(nightsBetween(review.reservation.checkInDate, review.reservation.checkOutDate), 'night')}`, trailing: <StatusBadge status={review.reservation.status} /> }]} />
          </Section> : null}
          {listing ? <Section title="Listing" icon={BedDouble} flush>
            <LinkRows items={[{ id: listing.id, href: platformDetailPath('listing', listing.id), title: listing.title, meta: listing.reviewCount ? `${(listing.reviewAverageHundredths / 100).toFixed(2)} average · ${plural(listing.reviewCount, 'review')}` : 'No aggregate yet', trailing: <StatusBadge status={listing.status} /> }]} />
          </Section> : null}
        </>}
      />
    </PageBody>
  </PlatformPage>;
}
