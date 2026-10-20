import { AlertTriangle, BadgeDollarSign, Building2, FilePlus2, FileText, Link2, UserPlus, WalletCards } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { getPlatformCapabilities } from '@/features/platform/lib/capabilities';
import { DataTable, type Column } from '@/features/platform/operations/components/DataTable';
import { Disclosure } from '@/features/platform/operations/components/FormControls';
import { ListSection } from '@/features/platform/operations/components/ListSection';
import { AttentionList, Callout, EmptyState, Muted, PageBody, PageHeader, Pill, PlatformPage, RowAction, RowLink, Section, StatTiles, StatusBadge, SubLine, toneText } from '@/features/platform/operations/components/PlatformUI';
import { pickView, readSearchParams, type PlatformSearchParams } from '@/features/platform/operations/lib/listParams';
import { formatDay, formatDayRange, formatMoney, formatTimestamp, plural, sentence } from '@/features/platform/operations/lib/operations';
import { platformDetailPath, rawRecordPath } from '@/features/platform/operations/lib/routes';
import { getOwnerSetupContext, getOwnerWorkspace } from '../actions/owners';
import { AssignmentCreateForm, GenerateStatementForm, OwnerCreateForm, StatementActions } from '../components/OwnerFinanceForms';
import { statementPath } from '../lib/financeForm';

const PAYOUTS = '/dashboard/platform/payouts';

function currencyTile(rows: Array<{ currencyCode: string; cents: number }>) {
  if (!rows.length) return { value: '—' as string, hint: undefined as string | undefined };
  if (rows.length === 1) return { value: formatMoney(rows[0].cents, rows[0].currencyCode), hint: undefined };
  return { value: plural(rows.length, 'currency', 'currencies'), hint: rows.map((row) => formatMoney(row.cents, row.currencyCode)).join(' · ') };
}

function attestation(payout: any) {
  const data = payout.data && typeof payout.data === 'object' ? payout.data : {};
  // Statement payouts record the operator's transfer attestation under `transfer`.
  if (data.kind === 'manual_transfer_attestation') return { reference: typeof data.transfer?.reference === 'string' ? data.transfer.reference : '' };
  return data.kind === 'operator_attestation' ? { reference: typeof data.reference === 'string' ? data.reference : '' } : null;
}

/** Failed or reversed, or marked paid with neither a provider reference nor a statement attestation. */
function payoutException(payout: any) {
  return ['failed', 'reversed'].includes(payout.status) || (payout.status === 'paid' && !payout.providerPayoutId && !payout.ownerStatement);
}

function assignmentWindow(assignment: any) {
  if (!assignment.effectiveFrom) return '';
  return assignment.effectiveTo ? `${formatDay(assignment.effectiveFrom)} – ${formatDay(assignment.effectiveTo)}` : `from ${formatDay(assignment.effectiveFrom)}`;
}


export async function OwnerFinancePage({ searchParams }: { searchParams?: PlatformSearchParams } = {}) {
  const { q, view: requested, page, get } = await readSearchParams(searchParams);
  const view = pickView(requested, ['all', 'statements', 'owners'] as const, 'all');
  const [workspace, capabilities] = await Promise.all([getOwnerWorkspace({ view, q, page }), getPlatformCapabilities()]);
  // Every list is searched, counted and paged on the server; the forms' owner choices follow the same search.
  const { rows, pagination, counts, summary, exceptions, exceptionsCount, statementsDue, statementsDueCount, ownerOptions, ownerOptionsTotal, error } = workspace;
  const canManage = capabilities.known && capabilities.canManagePayouts;
  // From a property page: open the assignment form with that property chosen.
  const assignPropertyId = /^[A-Za-z0-9_-]{1,64}$/.test(get('assignProperty') || '') ? get('assignProperty') as string : '';
  const setup = canManage && view === 'owners' ? await getOwnerSetupContext(q, assignPropertyId) : null;
  const assignOwnerId = /^[A-Za-z0-9_-]{1,64}$/.test(get('owner') || '') && ownerOptions.some((owner: any) => owner.id === get('owner')) ? get('owner') : '';

  const byCurrency: any[] = summary?.byCurrency || [];
  const earnings = currencyTile(byCurrency.filter((row) => row.issuedCount).map((row) => ({ currencyCode: row.currencyCode, cents: row.issuedEarningsCents })));
  const dueRows = byCurrency.filter((row) => row.balanceDueCents).map((row) => ({ currencyCode: row.currencyCode, cents: row.balanceDueCents }));
  const due = currencyTile(dueRows);


  const payoutColumns: Array<Column<any>> = [
    { id: 'payout', header: 'Payout', cell: (payout) => <div className="min-w-0 max-w-xs"><RowLink href={platformDetailPath('payout', payout.id)}>{payout.payoutNumber}</RowLink><SubLine>{payout.propertyOwner?.displayName || 'Owner unavailable'}</SubLine>
      {/* Phones hide Source, Gross, Fees and dates: keep them here. */}
      <SubLine mobileOnly="lg">{payout.reservation?.listing?.title || 'Portfolio payout'}{payout.ownerStatement?.statementNumber ? ` · ${payout.ownerStatement.statementNumber}` : ''}</SubLine>
      <SubLine className="xl:hidden">Gross {formatMoney(payout.grossAmountCents, payout.currencyCode)} · fees −{formatMoney(payout.platformFeeCents + payout.managerFeeCents, payout.currencyCode)}{payout.paidAt ? ` · paid ${formatTimestamp(payout.paidAt)}` : ` · scheduled ${formatTimestamp(payout.scheduledAt)}`}</SubLine>
    </div> },
    { id: 'source', header: 'Source', hideBelow: 'lg', cell: (payout) => <div className="min-w-0 max-w-xs"><span className="block truncate">{payout.reservation?.listing?.title || 'Portfolio payout'}</span><SubLine>{payout.ownerStatement ? <Link href={statementPath(payout.ownerStatement.id)} className="relative z-10 underline-offset-4 hover:underline">{payout.ownerStatement.statementNumber}</Link> : payout.reservation?.confirmationCode || 'No statement or stay'}</SubLine></div> },
    { id: 'gross', header: 'Gross', align: 'right', hideBelow: 'md', cell: (payout) => formatMoney(payout.grossAmountCents, payout.currencyCode) },
    { id: 'fees', header: 'Fees', align: 'right', hideBelow: 'xl', cell: (payout) => <Muted>−{formatMoney(payout.platformFeeCents + payout.managerFeeCents, payout.currencyCode)}</Muted> },
    { id: 'net', header: 'Net', align: 'right', cell: (payout) => <span className="font-medium">{formatMoney(payout.netAmountCents, payout.currencyCode)}</span> },
    {
      id: 'status',
      header: 'Status',
      cell: (payout) => {
        const attested = attestation(payout);
        return <div><StatusBadge status={payout.status} tone={payoutException(payout) ? 'danger' : undefined} />
          {payout.status === 'paid' && !payout.providerPayoutId ? attested
            ? <SubLine>Recorded by operator{attested.reference ? ` · ${attested.reference}` : ''}</SubLine>
            : <SubLine className={toneText.danger}>No provider reference</SubLine> : null}
        </div>;
      },
    },
    { id: 'date', header: 'Scheduled', hideBelow: 'lg', cell: (payout) => <div className="whitespace-nowrap"><Muted>{formatTimestamp(payout.scheduledAt)}</Muted>{payout.paidAt ? <SubLine>Paid {formatTimestamp(payout.paidAt)}</SubLine> : null}</div> },
  ];

  const statementColumns: Array<Column<any>> = [
    { id: 'statement', header: 'Statement', cell: (statement) => <div className="min-w-0"><RowLink href={statementPath(statement.id)}>{statement.statementNumber}</RowLink><SubLine>{statement.owner?.displayName} · {formatDayRange(statement.periodStart, statement.periodEnd)}</SubLine><SubLine className="xl:hidden">Gross {formatMoney(statement.grossRevenueCents, statement.currencyCode)} · commission −{formatMoney(statement.managerCommissionCents, statement.currencyCode)} · owner earnings {formatMoney(statement.ownerEarningsCents, statement.currencyCode)}</SubLine></div> },
    { id: 'gross', header: 'Gross', align: 'right', hideBelow: 'lg', cell: (statement) => formatMoney(statement.grossRevenueCents, statement.currencyCode) },
    { id: 'commission', header: 'Commission', align: 'right', hideBelow: 'xl', cell: (statement) => <Muted>−{formatMoney(statement.managerCommissionCents, statement.currencyCode)}</Muted> },
    { id: 'earnings', header: 'Owner earnings', align: 'right', hideBelow: 'md', cell: (statement) => formatMoney(statement.ownerEarningsCents, statement.currencyCode) },
    { id: 'due', header: 'Balance due', align: 'right', cell: (statement) => <span className={statement.balanceDueCents > 0 && ['approved', 'sent'].includes(statement.status) ? `font-medium ${toneText.warning}` : 'font-medium'}>{formatMoney(statement.balanceDueCents, statement.currencyCode)}</span> },
    { id: 'status', header: 'Status', cell: (statement) => <StatusBadge status={statement.status} /> },
    { id: 'action', header: <span className="sr-only">Next step</span>, align: 'right', className: 'w-0 whitespace-nowrap', cell: (statement) => <RowAction><StatementActions statement={statement} canManage={canManage} /></RowAction> },
  ];

  const ownerColumns: Array<Column<any>> = [
    { id: 'owner', header: 'Owner', cell: (owner) => <div className="min-w-0"><RowLink href={rawRecordPath('property-owners', owner.id)}>{owner.displayName}</RowLink><SubLine>{owner.companyName || owner.email || owner.ownerNumber}</SubLine></div> },
    { id: 'status', header: 'Status', cell: (owner) => <StatusBadge status={owner.status} /> },
    { id: 'schedule', header: 'Payout schedule', hideBelow: 'md', cell: (owner) => <Muted>{sentence(owner.payoutSchedule)}</Muted> },
    { id: 'commission', header: 'Default commission', align: 'right', hideBelow: 'lg', cell: (owner) => owner.defaultManagerCommissionBasisPoints != null ? `${owner.defaultManagerCommissionBasisPoints / 100}%` : <Muted>—</Muted> },
    {
      id: 'properties',
      header: 'Assignments',
      hideBelow: 'sm',
      cell: (owner) => owner.assignments.length
        ? <div className="flex flex-wrap gap-1.5">{owner.assignments.map((assignment: any) => <Pill key={assignment.id} tone={assignment.status === 'ended' ? 'neutral' : undefined} title={`${assignment.managerCommissionBasisPoints / 100}% manager commission`}>{assignment.property?.name || 'Property'} · {assignment.ownershipBasisPoints / 100}%{assignmentWindow(assignment) ? ` · ${assignmentWindow(assignment)}` : ''}</Pill>)}</div>
        : <Muted>No assignment</Muted>,
    },
    ...(canManage ? [{ id: 'assign', header: <span className="sr-only">Assign</span>, align: 'right' as const, className: 'w-0 whitespace-nowrap', cell: (owner: any) => <RowAction><Button asChild size="sm" variant="outline"><Link href={`${PAYOUTS}?view=owners&owner=${encodeURIComponent(owner.id)}#add-assignment`}>Add assignment</Link></Button></RowAction> }] : []),
  ];

  const paged = { rows, page: pagination.page, pageCount: pagination.pageCount, start: pagination.start, end: pagination.end, total: pagination.total };

  const tabs = [
    { id: 'all', label: 'Payouts', count: counts?.tabs.all ?? 0 },
    { id: 'statements', label: 'Statements', count: counts?.tabs.statements ?? 0 },
    { id: 'owners', label: 'Owners', count: counts?.tabs.owners ?? 0 },
  ];
  const attention = [
    ...exceptions.map((payout: any) => ({ id: payout.id, title: `${payout.payoutNumber} · ${sentence(payout.status)}`, detail: `${formatMoney(payout.netAmountCents, payout.currencyCode)} to ${payout.propertyOwner?.displayName || 'owner'}. ${payout.status === 'paid' ? 'Marked paid without a provider reference.' : 'Review the provider and statement — no automatic retry.'}`, href: platformDetailPath('payout', payout.id), actionLabel: 'Review', tone: 'danger' as const })),
    ...statementsDue.map((statement: any) => ({ id: statement.id, title: `${statement.statementNumber} · ${formatMoney(statement.balanceDueCents, statement.currencyCode)} due`, detail: `Owed to ${statement.owner?.displayName}.`, href: statementPath(statement.id), actionLabel: 'Open' })),
  ];

  return <PlatformPage section="Payouts" sectionHref="/platform/payouts">
    <PageHeader title="Owner payouts" badges={capabilities.known && !canManage ? <Pill>View only</Pill> : null} />
    <PageBody>
      {error ? <Callout live tone="danger" title="Owner finance couldn’t load" action={<Button asChild size="sm" variant="outline"><Link href={PAYOUTS}>Try again</Link></Button>}>Try again in a moment.</Callout> : <>
      {!capabilities.known ? <Callout live tone="warning" title="Actions are unavailable right now" action={<Button asChild size="sm" variant="outline"><Link href={PAYOUTS}>Try again</Link></Button>}>Your permissions couldn’t be checked.</Callout> : null}
      <StatTiles items={[
        { label: 'Owners', value: counts?.owners ?? '—', hint: counts ? `${counts.activeOwners} active` : undefined, icon: Building2 },
        { label: 'Approved earnings', value: earnings.value, hint: earnings.hint || 'on issued statements', icon: BadgeDollarSign },
        { label: 'Balance due', value: due.value, hint: due.hint || 'not proof of transfer', tone: dueRows.some((row) => row.cents > 0) ? 'warning' : 'success', icon: WalletCards },
        { label: 'Payout exceptions', value: summary?.payoutExceptionCount ?? exceptionsCount, hint: plural(counts?.payouts ?? 0, 'payout'), tone: (summary?.payoutExceptionCount ?? 0) > 0 ? 'danger' : 'success', icon: AlertTriangle },
      ]} />
      {attention.length ? <Section title="Needs attention" icon={AlertTriangle} count={exceptionsCount + statementsDueCount} flush><AttentionList items={attention} limit={5} /></Section> : null}

      {view === 'statements' && canManage ? <Disclosure icon={FilePlus2} summary="Generate statement" defaultOpen={!(counts?.statements)}>
        {ownerOptions.length ? <><GenerateStatementForm owners={ownerOptions} />{ownerOptionsTotal > ownerOptions.length ? <p className="mt-3 text-xs text-muted-foreground">Showing {ownerOptions.length} of {ownerOptionsTotal} owners. Search above to find another owner.</p> : null}</> : <p className="text-sm text-muted-foreground">Add a property owner before generating statements. <Link href={`${PAYOUTS}?view=owners`} className="font-medium text-foreground underline-offset-4 hover:underline">Owners</Link></p>}
      </Disclosure> : null}

      {view === 'owners' && canManage ? <>
        {setup?.error ? <Callout live tone="warning" title="Owner setup is unavailable" action={<Button asChild size="sm" variant="outline"><Link href={`${PAYOUTS}?view=owners`}>Try again</Link></Button>}>{setup.error}</Callout> : null}
        <Disclosure id="add-owner" icon={UserPlus} summary="Add owner" defaultOpen={!(counts?.owners)}>
          <OwnerCreateForm hosts={setup?.hosts || []} />
        </Disclosure>
        <Disclosure id="add-assignment" icon={Link2} summary="Add assignment" defaultOpen={Boolean(assignOwnerId || assignPropertyId)}>
          <AssignmentCreateForm key={`${assignOwnerId}:${assignPropertyId}`} owners={ownerOptions} properties={setup?.properties || []} defaultOwnerId={assignOwnerId} defaultPropertyId={assignPropertyId} />
          {ownerOptionsTotal > ownerOptions.length || (setup?.propertiesTotal || 0) > (setup?.properties.length || 0) ? <p className="mt-3 text-xs text-muted-foreground">Some owners or properties aren’t listed. Search above to narrow the choices.</p> : null}
          <p className="mt-4 border-t pt-3 text-xs text-muted-foreground"><Link href={rawRecordPath('property-owner-assignments')} className="font-medium text-foreground underline-offset-4 hover:underline">Assignment records</Link></p>
        </Disclosure>
      </> : null}

      {view === 'all' ? <ListSection basePath={PAYOUTS} tabs={tabs} view={view} q={q} filtered={Boolean(q)} clearHref={PAYOUTS} placeholder="Search payout, owner, or stay" noun={{ singular: 'payout', plural: 'payouts' }} total={counts?.payouts ?? 0} visible={pagination.total} pagination={paged}
        empty={<EmptyState icon={WalletCards} title="No payouts yet" description="Payouts appear when a statement is recorded as paid." />}
        footer="A paid status and provider reference aren’t bank reconciliation.">
        <DataTable rows={rows} columns={payoutColumns} getKey={(payout) => payout.id} caption="Payouts" />
      </ListSection> : null}

      {view === 'statements' ? <ListSection basePath={PAYOUTS} tabs={tabs} view={view} q={q} filtered={Boolean(q)} clearHref={`${PAYOUTS}?view=statements`} placeholder="Search statement or owner" noun={{ singular: 'statement', plural: 'statements' }} total={counts?.statements ?? 0} visible={pagination.total} pagination={paged}
        empty={<EmptyState icon={FileText} title="No statements yet" />}
        >
        <DataTable rows={rows} columns={statementColumns} getKey={(statement) => statement.id} caption="Owner statements" />
      </ListSection> : null}

      {view === 'owners' ? <ListSection basePath={PAYOUTS} tabs={tabs} view={view} q={q} filtered={Boolean(q)} clearHref={`${PAYOUTS}?view=owners`} placeholder="Search owner or property" noun={{ singular: 'owner', plural: 'owners' }} total={counts?.owners ?? 0} visible={pagination.total} pagination={paged}
        empty={<EmptyState icon={Building2} title="No owners yet" action={canManage ? <Button asChild size="sm" variant="outline"><Link href={`${PAYOUTS}?view=owners#add-owner`}>Add owner</Link></Button> : undefined} />}
        >
        <DataTable rows={rows} columns={ownerColumns} getKey={(owner) => owner.id} caption="Property owners" />
      </ListSection> : null}
      </>}
    </PageBody>
  </PlatformPage>;
}
export default OwnerFinancePage;
