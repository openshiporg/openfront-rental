import { CalendarDays, FileText, History, Landmark, ListTree, Lock, ReceiptText, Scale, WalletCards } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { getPlatformCapabilities } from '@/features/platform/lib/capabilities';
import { DataTable, type Column } from '@/features/platform/operations/components/DataTable';
import { Pager } from '@/features/platform/operations/components/ListSection';
import { Callout, DescriptionList, DetailGrid, EmptyRow, EmptyState, LinkRows, MetaItem, Muted, PageBody, PageHeader, Pill, PlatformPage, Section, StatTiles, StatusBadge, SubLine } from '@/features/platform/operations/components/PlatformUI';
import { readSearchParams, type PlatformSearchParams } from '@/features/platform/operations/lib/listParams';
import { formatDay, formatDayRange, formatMoney, formatTimestamp, sentence } from '@/features/platform/operations/lib/operations';
import { platformDetailPath } from '@/features/platform/operations/lib/routes';
import { getOwnerStatementDetail } from '../actions/owners';
import { StatementActions } from '../components/OwnerFinanceForms';
import { statementPath } from '../lib/financeForm';

const STATEMENTS = '/dashboard/platform/payouts?view=statements';

const exceptionLabels: Record<string, string> = {
  stay_spans_assignment_start: 'Stay began before this owner’s assignment',
  reaccommodated_to_other_property: 'Stay was moved to a unit at another property',
  no_booking_snapshot_property: 'No booked property captured; allocated by the current listing',
};

const allocationLabels: Record<string, string> = {
  concession: 'Price concession',
  amendment_settlement: 'Settles a stay change',
  overpayment: 'Overpayment',
  stay_refund: 'Split across revenue and tax',
};

function record(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

function percent(basisPoints: unknown) {
  return typeof basisPoints === 'number' ? `${basisPoints / 100}%` : null;
}

export async function OwnerStatementDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: PlatformSearchParams }) {
  const { id } = await params;
  const { page } = await readSearchParams(searchParams);
  const pageNumber = Math.max(1, Number.parseInt(page || '1', 10) || 1);
  const [detail, capabilities] = await Promise.all([getOwnerStatementDetail(id, pageNumber), getPlatformCapabilities()]);
  const statement = detail.statement;
  if (!statement) {
    if (!detail.error) notFound();
    return <PlatformPage section="Payouts" sectionHref="/platform/payouts" current="Unavailable">
      <PageBody className="pt-6">
        <Section>
          <EmptyState icon={Lock} title="This statement couldn’t load" description="Try again in a moment." action={<Button asChild variant="outline" size="sm"><Link href={STATEMENTS}>Back to statements</Link></Button>} />
        </Section>
      </PageBody>
    </PlatformPage>;
  }

  const money = (cents?: number | null) => formatMoney(cents ?? 0, statement.currencyCode);
  const signed = (cents: number) => `${cents < 0 ? '−' : ''}${money(Math.abs(cents))}`;
  const canManage = capabilities.known && capabilities.canManagePayouts;
  const snapshot = record(statement.statementSnapshot);
  const calculation = record(snapshot.calculation);
  const excluded = record(snapshot.excluded);
  const exceptions: any[] = Array.isArray(calculation.exceptions) ? calculation.exceptions : [];
  const assignments: any[] = Array.isArray(snapshot.assignments) ? snapshot.assignments : [];
  const propertyNames = new Map<string, string>(assignments.filter((item) => item.propertyName).map((item) => [item.propertyId, item.propertyName]));
  const revisionNumber = typeof snapshot.revision === 'number' ? snapshot.revision : 1;
  const supersedes = record(snapshot.supersedes);
  // The latest revision and the count of later ones come from the server, not from the bounded list.
  const latest = detail.latestRevision && detail.latestRevision.id !== statement.id ? detail.latestRevision : null;
  const laterCount = detail.laterRevisionsCount || 0;
  const pageCount = Math.max(1, Math.ceil((statement.linesCount || 0) / detail.pageSize));
  const lines: any[] = statement.lines || [];

  // How each line was computed (ownership share, commission base, tax, allocation): shown in its
  // own column on wide screens and under the line on phones, so it can be checked before approval.
  const basisText = (line: any) => {
    const metadata = record(line.metadata);
    const allocation = record(metadata.allocation);
    return [
      percent(metadata.ownershipBasisPoints) ? `${percent(metadata.ownershipBasisPoints)} owned` : null,
      line.lineType === 'manager_commission' && percent(metadata.basisPoints) ? `${percent(metadata.basisPoints)} of ${money(metadata.baseCents)}` : null,
      line.lineType === 'reservation_revenue' && typeof metadata.taxAmountCents === 'number' ? `${money(metadata.taxAmountCents)} tax excluded` : null,
      allocation.kind ? allocationLabels[allocation.kind] || sentence(allocation.kind) : null,
      allocation.kind ? `${money(allocation.revenueCents)} revenue · ${money(allocation.taxCents)} tax · ${money(allocation.otherCents)} other` : null,
    ].filter(Boolean).join(' · ');
  };

  const lineColumns: Array<Column<any>> = [
    { id: 'date', header: 'Date', className: 'whitespace-nowrap', cell: (line) => line.serviceDate ? formatDay(line.serviceDate, { month: 'short', day: 'numeric', year: 'numeric' }) : <Muted>—</Muted> },
    {
      id: 'line',
      header: 'Line',
      cell: (line) => {
        const metadata = record(line.metadata);
        const source = line.refund?.refundNumber || line.payout?.payoutNumber || line.reservation?.confirmationCode;
        return <div className="min-w-0">
          <span className="font-medium">{line.description}</span>
          <SubLine>{[sentence(line.lineType), source, metadata.propertyId ? propertyNames.get(metadata.propertyId) : null].filter(Boolean).join(' · ')}</SubLine>
          {basisText(line) ? <span className="mt-0.5 block text-xs leading-5 text-muted-foreground md:hidden">{basisText(line)}</span> : null}
        </div>;
      },
    },
    {
      id: 'basis',
      header: 'Basis',
      hideBelow: 'md',
      cell: (line) => basisText(line) ? <span className="text-xs leading-5 text-muted-foreground">{basisText(line)}</span> : <Muted>—</Muted>,
    },
    { id: 'amount', header: 'Amount', align: 'right', className: 'whitespace-nowrap', cell: (line) => <span className="font-medium tabular-nums">{signed(line.amountCents)}</span> },
  ];

  const excludedItems = [
    excluded.alreadyRecognizedStays ? `${excluded.alreadyRecognizedStays} stays already on another statement` : null,
    excluded.alreadyRecognizedRefunds ? `${excluded.alreadyRecognizedRefunds} refunds already on another statement` : null,
    excluded.alreadyRecognizedPayouts ? `${excluded.alreadyRecognizedPayouts} payouts already on another statement` : null,
    excluded.otherCurrencyStays || excluded.otherCurrencyRefunds || excluded.otherCurrencyPayouts ? `${(excluded.otherCurrencyStays || 0) + (excluded.otherCurrencyRefunds || 0) + (excluded.otherCurrencyPayouts || 0)} items in other currencies` : null,
    excluded.testModeStays ? `${excluded.testModeStays} test bookings` : null,
    excluded.testTenderRefunds ? `${excluded.testTenderRefunds} refunds of Stripe test-mode payments` : null,
    Array.isArray(excluded.unrecognizedStatusStays) && excluded.unrecognizedStatusStays.length ? `Unconfirmed stays: ${excluded.unrecognizedStatusStays.join(', ')}` : null,
    excluded.refundsOnUnrecognizedStays ? `${excluded.refundsOnUnrecognizedStays} refunds on cancelled or unconfirmed stays` : null,
  ].filter(Boolean) as string[];

  return <PlatformPage section="Payouts" sectionHref="/platform/payouts" current={statement.statementNumber}>
    <PageHeader
      back={{ href: STATEMENTS, label: 'Statements' }}
      title={statement.statementNumber}
      badges={<><StatusBadge status={statement.status} />{revisionNumber > 1 ? <Pill>Revision {revisionNumber}</Pill> : null}</>}
      meta={<>
        <MetaItem icon={Landmark}>{statement.owner?.displayName || 'Owner unavailable'}</MetaItem>
        <MetaItem icon={CalendarDays}>{formatDayRange(statement.periodStart, statement.periodEnd)}</MetaItem>
        <MetaItem icon={ReceiptText}>{statement.currencyCode}</MetaItem>
      </>}
      actions={<StatementActions statement={statement} canManage={canManage} />}
    />
    <PageBody>
      {!capabilities.known ? <Callout live tone="warning" title="Actions are unavailable right now" action={<Button asChild size="sm" variant="outline"><Link href={statementPath(statement.id)}>Try again</Link></Button>}>Your permissions couldn’t be checked.</Callout> : null}
      {latest ? <Callout tone="info" title={laterCount > 1 ? `${laterCount} newer revisions exist` : 'A newer revision exists'}><Link href={statementPath(latest.id)} className="font-medium underline-offset-4 hover:underline">{latest.statementNumber}</Link></Callout> : null}
      {exceptions.length ? <Callout tone="warning" title="Review before approving">
        <ul className="list-disc space-y-0.5 pl-4">{exceptions.slice(0, 20).map((item, index) => <li key={index}>{item.confirmationCode ? `${item.confirmationCode}: ` : ''}{exceptionLabels[item.type] || sentence(item.type)}</li>)}</ul>
      </Callout> : null}
      <StatTiles items={[
        { label: 'Gross revenue', value: money(statement.grossRevenueCents), hint: 'owner share, before commission', icon: ReceiptText },
        { label: 'Commission', value: signed(-(statement.managerCommissionCents ?? 0)), icon: Scale },
        { label: 'Owner earnings', value: money(statement.ownerEarningsCents), icon: FileText },
        { label: 'Balance due', value: money(statement.balanceDueCents), hint: statement.paidAt ? `paid ${formatTimestamp(statement.paidAt)}` : 'not proof of transfer', tone: statement.balanceDueCents > 0 ? 'warning' : 'success', icon: WalletCards },
      ]} />
      <DetailGrid
        main={<Section title="Lines" icon={ListTree} count={statement.linesCount ?? lines.length} flush
          footer={pageCount > 1 ? <div className="flex items-center justify-between gap-4"><span>Lines {(pageNumber - 1) * detail.pageSize + 1}–{(pageNumber - 1) * detail.pageSize + lines.length} of {statement.linesCount}</span><Pager page={Math.min(pageNumber, pageCount)} pageCount={pageCount} hrefFor={(next) => `${statementPath(statement.id)}?page=${next}`} /></div> : null}>
          {lines.length ? <DataTable rows={lines} columns={lineColumns} getKey={(line) => line.id} caption="Statement lines" /> : <EmptyRow>No lines on this statement.</EmptyRow>}
        </Section>}
        aside={<>
          <Section title="Totals" icon={Scale} flush>
            <DescriptionList items={[
              { label: 'Gross revenue', value: money(statement.grossRevenueCents) },
              { label: 'Refunds', value: signed(-(statement.refundAmountCents ?? 0)) },
              statement.expenseAmountCents ? { label: 'Expenses', value: signed(-statement.expenseAmountCents) } : null,
              statement.adjustmentAmountCents ? { label: 'Adjustments', value: signed(statement.adjustmentAmountCents) } : null,
              { label: 'Commission', value: signed(-(statement.managerCommissionCents ?? 0)) },
              { label: 'Owner earnings', value: money(statement.ownerEarningsCents) },
              { label: 'Paid out', value: signed(-(statement.paidOutCents ?? 0)) },
              { label: 'Balance due', value: money(statement.balanceDueCents) },
              { label: 'Tax on these stays', value: money(statement.taxAmountCents), hint: 'Not owner earnings' },
            ]} />
          </Section>
          <Section title="Ownership" icon={Landmark} flush>
            {assignments.length ? <DescriptionList items={assignments.map((assignment) => ({
              label: assignment.propertyName || 'Property',
              value: `${percent(assignment.ownershipBasisPoints)} · ${percent(assignment.managerCommissionBasisPoints)} commission`,
              hint: assignment.effectiveFrom ? `${formatDay(assignment.effectiveFrom, { month: 'short', day: 'numeric', year: 'numeric' })}${assignment.effectiveTo ? ` – ${formatDay(assignment.effectiveTo, { month: 'short', day: 'numeric', year: 'numeric' })}` : ' onward'}` : undefined,
            }))} /> : <EmptyRow>Recorded before ownership terms were captured.</EmptyRow>}
          </Section>
          {excludedItems.length ? <Section title="Not on this statement" icon={FileText}>
            <ul className="space-y-1 text-sm text-muted-foreground">{excludedItems.map((item) => <li key={item}>{item}</li>)}</ul>
          </Section> : null}
          <Section title="Payouts" icon={WalletCards} count={(statement.payouts || []).length} flush>
            <LinkRows empty="No payout recorded for this statement." items={(statement.payouts || []).map((payout: any) => ({
              id: payout.id,
              href: platformDetailPath('payout', payout.id),
              title: `${payout.payoutNumber} · ${formatMoney(payout.netAmountCents, payout.currencyCode)}`,
              meta: [payout.paidAt ? `Paid ${formatTimestamp(payout.paidAt)}` : sentence(payout.status), payout.providerPayoutId ? payout.providerPayoutId : record(payout.data).kind === 'operator_attestation' ? `Recorded by operator${record(payout.data).reference ? ` · ${record(payout.data).reference}` : ''}` : null].filter(Boolean).join(' · '),
            }))} />
          </Section>
          {detail.revisionsCount > 1 || supersedes.id ? <Section title="Revisions" icon={History} count={detail.revisionsCount} description={detail.revisionsCount > detail.revisions.length ? `Newest ${detail.revisions.length} of ${detail.revisionsCount}.` : undefined} flush>
            <LinkRows items={detail.revisions.map((item: any) => ({
              id: item.id,
              href: item.id === statement.id ? undefined : statementPath(item.id),
              title: item.statementNumber,
              meta: `Generated ${formatTimestamp(item.generatedAt)}`,
              trailing: <StatusBadge status={item.status} />,
            }))} />
          </Section> : null}
          <Section title="Timeline" icon={CalendarDays} flush>
            <DescriptionList items={[
              { label: 'Generated', value: formatTimestamp(statement.generatedAt) },
              statement.approvedAt ? { label: 'Approved', value: formatTimestamp(statement.approvedAt) } : null,
              statement.sentAt ? { label: 'Sent', value: formatTimestamp(statement.sentAt) } : null,
              statement.paidAt ? { label: 'Paid', value: formatTimestamp(statement.paidAt), hint: statement.paidReference || undefined } : null,
            ]} />
          </Section>
        </>}
      />
    </PageBody>
  </PlatformPage>;
}
export default OwnerStatementDetailPage;
