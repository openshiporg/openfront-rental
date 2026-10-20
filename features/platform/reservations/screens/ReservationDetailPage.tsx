import { randomUUID } from 'node:crypto';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AlertTriangle, Banknote, BedDouble, CalendarDays, CircleDollarSign, ClipboardCheck, FileSignature,
  Lock, Mail, MapPin, MessageSquare, Phone, ReceiptText, RotateCcw, ShieldCheck, UserRound, Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/features/platform/operations/components/DataTable';
import { Checkbox, Disclosure, Field, FormActions, Select, TextArea, TextInput } from '@/features/platform/operations/components/FormControls';
import { Pager } from '@/features/platform/operations/components/ListSection';
import { MoneyInput } from '@/features/platform/operations/components/MoneyInput';
import {
  Avatar, Callout, DescriptionList, DetailGrid, EmptyRow, EmptyState, FactGrid, LinkRows, MetaItem, Muted,
  PageBody, PageHeader, Pill, PlatformPage, Section, StatTiles, StatusBadge, SubLine, Timeline, TwoColumn, toneText,
} from '@/features/platform/operations/components/PlatformUI';
import { ConfirmSubmitButton, SubmitButton } from '@/features/platform/operations/components/SubmitButton';
import { pageWindow, readSearchParams, type PlatformSearchParams } from '@/features/platform/operations/lib/listParams';
import { operationalProperty } from '@/features/platform/operations/lib/operationalProperty';
import { formatCurrencyTotals, formatDay, formatTimestamp, isPast, nightsBetween, operationalTone, plural, sentence, sumByCurrency } from '@/features/platform/operations/lib/operations';
import { propertyToday } from '@/features/platform/operations/lib/propertyDates';
import { platformDetailPath } from '@/features/platform/operations/lib/routes';
import { getPlatformCapabilities } from '@/features/platform/lib/capabilities';
import {
  amendPartyAction, amendReservationAction, createDamageClaimAction, createRefundAction, damageClaimTransitionAction, declineRefundAction, assessRefundAction,
  cancelPaymentAttemptAction, getReservationDetail, processRefundAction, reassignReservationAction, recordManualPaymentAction, recordManualRefundAction, securityDepositAction, transitionReservation,
} from '../actions/reservations';
import { stayHistories, stayHistoryPages, type StayHistory } from '../lib/history';
import {
  availableReservationTransitions, correctionTransitions, formatMoney, formatStayRange, reservationLabel, reservationTransitionLabel, stayBalanceCents,
  type ReservationTransition,
} from '../lib/presentation';

const CARD_PROVIDER = 'pp_stripe_stripe';
const MANUAL_PROVIDER = 'pp_system_default';

function partyLabel(party: any) {
  if (!party) return null;
  const parts = [
    party.adults ? plural(party.adults, 'adult') : null,
    party.children ? plural(party.children, 'child', 'children') : null,
    party.infants ? plural(party.infants, 'infant') : null,
    party.pets ? plural(party.pets, 'pet') : null,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

const historyAnchors: Record<StayHistory, string> = { lines: 'stay-charges', changes: 'stay-charges', payments: 'stay-refunds', refunds: 'stay-refund-history', claims: 'stay-claims' };
const historyLabels: Record<StayHistory, string> = { lines: 'Charge pages', changes: 'Date change pages', payments: 'Payment pages', refunds: 'Refund history pages', claims: 'Damage claim pages' };

function historyHref(id: string, pages: Record<StayHistory, number>, history: StayHistory, page: number) {
  const params = new URLSearchParams();
  for (const key of stayHistories) {
    const value = key === history ? page : pages[key];
    if (value > 1) params.set(key, String(value));
  }
  const query = params.toString();
  return `/dashboard/platform/reservations/${encodeURIComponent(id)}${query ? `?${query}` : ''}#${historyAnchors[history]}`;
}

/** "Showing 21–40 of 57" with previous/next links; nothing when one page holds every record. */
function HistoryPager({ id, pages, history, total }: { id: string; pages: Record<StayHistory, number>; history: StayHistory; total: number }) {
  const range = pageWindow(total, pages[history], stayHistoryPages[history]);
  if (range.pageCount <= 1) return null;
  return <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
    <span>Showing <span className="font-medium tabular-nums text-foreground">{range.start}–{range.end}</span> of {total}</span>
    <Pager label={historyLabels[history]} page={range.page} pageCount={range.pageCount} hrefFor={(page) => historyHref(id, pages, history, page)} />
  </div>;
}

/** A bounded set shown whole up to its limit; past it, say how much is not shown. */
function OverflowNote({ shown, total, noun }: { shown: number; total: number; noun: string }) {
  if (total <= shown) return null;
  return <p className={`border-t px-4 py-2.5 text-xs leading-5 ${toneText.warning}`}>Showing the oldest {shown} of {total} {noun}.</p>;
}

function TransitionFields({ id, status, transition }: { id: string; status: string; transition: string }) {
  return <>
    <input type="hidden" name="reservationId" value={id} />
    <input type="hidden" name="status" value={status} />
    <input type="hidden" name="transition" value={transition} />
  </>;
}

const depositSteps: Record<string, Array<{ transition: string; label: string; needsAmount?: boolean }>> = {
  required: [{ transition: 'authorize', label: 'Record authorized' }, { transition: 'hold', label: 'Record held' }, { transition: 'fail', label: 'Record failed' }],
  authorized: [{ transition: 'hold', label: 'Record held' }, { transition: 'release', label: 'Record released' }, { transition: 'fail', label: 'Record failed' }],
  held: [{ transition: 'capture', label: 'Record deduction', needsAmount: true }, { transition: 'release', label: 'Record released' }, { transition: 'fail', label: 'Record failed' }],
  partially_captured: [{ transition: 'capture', label: 'Record further deduction', needsAmount: true }, { transition: 'release', label: 'Release the rest' }],
};

const claimSteps: Record<string, Array<{ transition: string; label: string; needsAmount?: boolean; destructive?: boolean }>> = {
  draft: [{ transition: 'submit', label: 'Submit to guest' }],
  submitted: [{ transition: 'record_guest_response', label: 'Record guest response' }, { transition: 'approve', label: 'Approve in full' }, { transition: 'partially_approve', label: 'Approve part', needsAmount: true }, { transition: 'decline', label: 'Decline', destructive: true }],
  guest_response: [{ transition: 'approve', label: 'Approve in full' }, { transition: 'partially_approve', label: 'Approve part', needsAmount: true }, { transition: 'decline', label: 'Decline', destructive: true }],
  approved: [{ transition: 'settle', label: 'Mark settled' }],
  partially_approved: [{ transition: 'settle', label: 'Mark settled' }],
};

function RefundSummary({ refund, timeZone }: { refund: any; timeZone: string | null }) {
  return <div className="flex flex-wrap items-start justify-between gap-2">
    <div className="min-w-0"><p className="text-sm font-medium">{formatMoney(refund.amountCents, refund.currencyCode)} · {sentence(refund.reason)}</p><SubLine>{refund.refundNumber}{refund.processedAt ? ` · ${formatTimestamp(refund.processedAt, timeZone)}` : ''}{refund.providerRefundId ? ` · ${refund.providerRefundId}` : ''}</SubLine></div>
    <StatusBadge status={refund.status} tone={refund.status === 'review' ? 'warning' : undefined} label={refund.status === 'succeeded' ? (refund.payment?.provider === CARD_PROVIDER ? 'Refunded' : 'Recorded') : refund.status === 'cancelled' ? 'Declined' : refund.status === 'review' ? 'To assess · up to this amount' : undefined} />
  </div>;
}

export async function ReservationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: PlatformSearchParams;
}) {
  const { id } = await params;
  const { get, error: actionError } = await readSearchParams(searchParams);
  const query = { error: actionError, notice: get('notice') };
  // A receipt that came back with an error keeps its operation key (see recordManualPaymentAction).
  const paymentOperationKey = /^[A-Za-z0-9-]{8,80}$/.test(get('paymentOp') || '') ? get('paymentOp') as string : randomUUID();
  const [{ reservation, pages, error }, capabilities] = await Promise.all([
    getReservationDetail(id, Object.fromEntries(stayHistories.map((history) => [history, Number(get(history)) || 1])) as Partial<Record<StayHistory, number>>),
    getPlatformCapabilities(),
  ]);
  if (!reservation && !error) notFound();
  if (!reservation) {
    return <PlatformPage section="Reservations" sectionHref="/platform/reservations" current="Unavailable">
      <PageBody className="pt-6">
        <Section><EmptyState icon={Lock} title="This reservation couldn’t be loaded" description={error || 'Try again in a moment.'} action={<Button asChild variant="outline" size="sm"><Link href="/dashboard/platform/reservations">Back to reservations</Link></Button>} /></Section>
      </PageBody>
    </PlatformPage>;
  }

  const transitions = availableReservationTransitions(reservation.status);
  const normalTransitions = transitions.filter((transition) => !['cancel', 'no_show', ...correctionTransitions].includes(transition));
  const exceptionTransitions = transitions.filter((transition) => ['cancel', 'no_show'].includes(transition));
  const corrections = transitions.filter((transition) => correctionTransitions.includes(transition));
  // Each action family needs its own permission; the server still checks every command.
  const canManage = capabilities.known && capabilities.canManageReservations;
  const canPay = capabilities.known && capabilities.canManagePayments;
  const currency = reservation.currencyCode;
  // Dates, clocks and location follow the unit the stay is allocated to; the purchased listing's
  // property is shown separately when the stay was moved.
  const where = operationalProperty(reservation);
  const stayProperty = where.property as any;
  const purchasedProperty = reservation.listing?.property || null;
  const moved = Boolean(where.allocated && purchasedProperty?.id && stayProperty?.id !== purchasedProperty.id);
  const timeZone = stayProperty?.timezone || null;
  const outstanding = stayBalanceCents(reservation);
  const openTasks = reservation.openTasks || [];
  const closedTasks = reservation.closedTasks || [];
  const nights = nightsBetween(reservation.checkInDate, reservation.checkOutDate);
  const party = partyLabel(reservation.guestParty);
  const guest = reservation.guest;
  const lineItems = reservation.lineItems || [];
  const payments = reservation.payments || [];
  const pendingPayments = reservation.pendingPayments || [];
  const refunds = reservation.refunds || [];
  const claims = reservation.damageClaims || [];
  const amendments = reservation.amendments || [];
  const deposit = reservation.securityDeposit;
  const today = propertyToday(timeZone);
  const openRefunds = reservation.openRefunds || [];
  const openRefundCount = Number(reservation.openRefundsCount ?? openRefunds.length);
  // Refunds under review are candidates, not money owed: they are counted apart from what's due.
  const reviewRefunds = openRefunds.filter((refund: any) => refund.status === 'review');
  const owedRefunds = openRefunds.filter((refund: any) => refund.status !== 'review');
  // Totals only from the complete open set; past the bound the figure is shown as unavailable.
  const openRefundTotals = openRefundCount <= openRefunds.length ? sumByCurrency(owedRefunds, (refund: any) => refund.amountCents, (refund: any) => refund.currencyCode) : null;
  const refundablePayments = (reservation.refundablePayments || []).filter((payment: any) => payment.amountCents > payment.refundedAmountCents);
  const refundCurrencies = [...new Set<string>(refundablePayments.map((payment: any) => payment.currencyCode))];
  const closed = ['cancelled', 'no_show'].includes(reservation.status);
  const request = ['inquiry', 'quoted', 'pending'].includes(reservation.status);

  const isEarly = (transition: ReservationTransition) => (transition === 'check_in' && today < reservation.checkInDate)
    || (transition === 'no_show' && today < reservation.checkInDate)
    || (transition === 'complete' && today < reservation.checkOutDate);
  const readinessWarnings = [
    outstanding ? `${formatMoney(outstanding, currency)} of the stay is unpaid.` : null,
    reservation.agreement?.status !== 'signed' ? (reservation.agreement ? `The stay agreement is ${sentence(reservation.agreement.status).toLowerCase()}, not signed.` : 'No stay agreement has been issued.') : null,
    guest?.verificationStatus !== 'verified' ? `The guest is ${sentence(guest?.verificationStatus || 'unverified').toLowerCase()}.` : null,
    reservation.paymentStatus === 'refund_pending' ? 'A refund is still open on this stay.' : null,
  ].filter(Boolean) as string[];
  const earlyTransitions = normalTransitions.filter(isEarly);
  const onTimeTransitions = normalTransitions.filter((transition) => !isEarly(transition));
  const otherUnits = (reservation.accommodationUnit?.property?.units || [])
    .filter((unit: any) => unit.id !== reservation.accommodationUnit?.id && unit.listings?.length);

  return <PlatformPage section="Reservations" sectionHref="/platform/reservations" current={reservation.confirmationCode}>
    <PageHeader
      back={{ href: '/dashboard/platform/reservations', label: 'Reservations' }}
      title={guest?.name || 'Guest details pending'}
      badges={<>
        <StatusBadge status={reservation.status} label={reservationLabel(reservation.status)} tone={operationalTone(reservation.status)} />
        <StatusBadge status={reservation.paymentStatus} label={`${reservationLabel(reservation.paymentStatus)} payment`} tone={outstanding ? 'warning' : reservation.paymentStatus === 'refund_pending' ? 'warning' : 'success'} />
        {reservation.testMode ? <StatusBadge status="test" label="Test booking · no dates held, test money only" tone="warning" /> : null}
        {reservation.fixtureOrigin ? <StatusBadge status="sample" label="Setup sample · not a real stay, money or signature" tone="warning" /> : null}
      </>}
      meta={<>
        <MetaItem icon={ReceiptText}>{reservation.confirmationCode}</MetaItem>
        <MetaItem icon={BedDouble}>{reservation.listing?.title || 'Listing unavailable'}{reservation.accommodationUnit?.name ? ` · ${reservation.accommodationUnit.name}` : ''}</MetaItem>
        <MetaItem icon={CalendarDays}>{formatStayRange(reservation.checkInDate, reservation.checkOutDate)} · {plural(nights, 'night')}</MetaItem>
      </>}
      actions={canManage ? <>
        {onTimeTransitions.map((transition) => <form key={transition} action={transitionReservation}>
          <TransitionFields id={reservation.id} status={reservation.status} transition={transition} />
          {['check_in', 'complete'].includes(transition) && readinessWarnings.length
            ? <ConfirmSubmitButton
                variant="default"
                destructive={false}
                title={`${reservationTransitionLabel(transition)}?`}
                description={<><p>Before you continue:</p><ul className="mt-2 list-disc space-y-1 pl-5">{readinessWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></>}
                confirmLabel={reservationTransitionLabel(transition)}
                pendingLabel="Saving…"
              >{reservationTransitionLabel(transition)}</ConfirmSubmitButton>
            : <SubmitButton size="sm" pendingLabel="Saving…">{reservationTransitionLabel(transition)}</SubmitButton>}
        </form>)}
        {earlyTransitions.map((transition) => <Button key={transition} asChild size="sm" variant="outline"><a href="#stay-lifecycle">{transition === 'complete' ? 'Record early departure…' : `${reservationTransitionLabel(transition)} early…`}</a></Button>)}
      </> : undefined}
    />
    <PageBody>
      {query.error ? <Callout live tone="warning" title="That action wasn’t applied">{query.error}</Callout> : null}
      {query.notice ? <Callout live tone="success" title="Saved">{query.notice}</Callout> : null}
      {!capabilities.known
        ? <Callout tone="warning" title="Actions are unavailable right now">Your permissions couldn’t be checked. Refresh to try again.</Callout>
        : !canManage && !canPay ? <Callout tone="neutral" icon={Lock} title="Read-only access">Reservation or payment management permission is required to change this stay.</Callout> : null}
      {reservation.status === 'cancelled' ? <Callout tone="danger" title={`Cancelled${reservation.cancelledAt ? ` ${formatTimestamp(reservation.cancelledAt, timeZone)}` : ''}`}>{reservation.cancellationReason || 'No cancellation reason recorded.'}{reservation.cancelledBy ? ` · by ${sentence(reservation.cancelledBy).toLowerCase()}` : ''}</Callout> : null}
      {reviewRefunds.length ? <Callout tone="warning" icon={RotateCcw} title={`${plural(reviewRefunds.length, 'refund')} to assess`}>The cancellation policy didn’t set these amounts. Nothing is owed until you assess an amount{canPay ? ' or decline under Refunds below' : ''}.</Callout> : null}
      {owedRefunds.length || openRefundCount > openRefunds.length ? <Callout tone="warning" icon={RotateCcw} title={openRefundTotals?.length ? `${formatCurrencyTotals(openRefundTotals)} refund still open` : `${plural(openRefundCount - reviewRefunds.length, 'refund')} still open`}>{canPay ? 'Process, record or decline it under Refunds below so the guest’s balance is settled.' : null}</Callout> : null}
      <StatTiles items={[
        { label: 'Stay total', value: formatMoney(reservation.totalAmountCents, currency), hint: reservation.discountTotalCents ? `after ${formatMoney(reservation.discountTotalCents, currency)} adjustment` : plural(nights, 'night'), icon: CircleDollarSign },
        // A closed stay's remaining balance isn't simply zero or the unpaid total: what the guest
        // still owes (a retained cancellation or no-show charge) depends on the cancellation policy,
        // which isn't assessed here. Refunds owed are shown separately.
        closed
          ? { label: 'Balance due', value: outstanding ? 'Not assessed' : formatMoney(0, currency), hint: outstanding ? `${formatMoney(outstanding, currency)} unpaid · cancellation charges not assessed` : `${formatMoney(reservation.amountPaidCents, currency)} paid`, tone: outstanding ? 'warning' : 'success', icon: Banknote }
          : { label: 'Balance due', value: formatMoney(outstanding, currency), hint: `${formatMoney(reservation.amountPaidCents, currency)} paid`, tone: outstanding ? 'warning' : 'success', icon: Banknote },
        { label: 'Refund due', value: !openRefundTotals ? '—' : openRefundTotals.length ? formatCurrencyTotals(openRefundTotals) : formatMoney(0, currency), hint: reviewRefunds.length ? `${plural(reviewRefunds.length, 'refund')} to assess` : owedRefunds.length ? plural(owedRefunds.length, 'open refund') : 'nothing open', tone: openRefundCount ? 'warning' : undefined, icon: RotateCcw },
        { label: 'Agreement', value: reservation.agreement ? reservationLabel(reservation.agreement.status) : 'Not issued', hint: reservation.agreement?.agreementNumber, tone: reservation.agreement?.status === 'signed' ? 'success' : 'warning', icon: FileSignature },
      ]} />
      <DetailGrid
        main={<>
          <Section title="Stay" icon={CalendarDays}>
            <FactGrid items={[
              { label: 'Check-in', value: formatDay(reservation.checkInDate, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }), hint: reservation.checkedInAt ? `Checked in ${formatTimestamp(reservation.checkedInAt, timeZone)}` : reservation.scheduledCheckInTime ? `From ${reservation.scheduledCheckInTime}` : undefined },
              { label: 'Checkout', value: formatDay(reservation.checkOutDate, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }), hint: reservation.checkedOutAt ? `Checked out ${formatTimestamp(reservation.checkedOutAt, timeZone)}` : reservation.scheduledCheckOutTime ? `By ${reservation.scheduledCheckOutTime}` : undefined },
              { label: 'Guests', value: party || '—' },
              { label: 'Property', value: stayProperty?.name || '—', hint: moved ? `Moved here · booked at ${purchasedProperty.name}` : stayProperty?.address?.publicLocationLabel },
              { label: 'Source', value: sentence(reservation.source) },
              { label: 'Open tasks', value: Number(reservation.openTasksCount ?? openTasks.length), hint: `${Number(reservation.tasksCount ?? 0)} total` },
            ]} />
            {reservation.guestNotes ? <div className="mt-5 rounded-lg border bg-muted/30 p-3"><p className="text-xs font-medium text-muted-foreground">Note from guest</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{reservation.guestNotes}</p></div> : null}
            {reservation.internalNotes ? <div className="mt-3 rounded-lg border border-dashed p-3"><p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Lock aria-hidden="true" className="size-3" />Internal notes</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{reservation.internalNotes}</p></div> : null}
          </Section>

          {canManage && reservation.status === 'confirmed' ? <Disclosure id="stay-change-dates" icon={CalendarDays} summary="Change dates" description="Reprices the stay from its booked rates and moves its calendar hold.">
            <form action={amendReservationAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="reservationId" value={reservation.id} />
              <input type="hidden" name="expectedCheckInDate" value={reservation.checkInDate} />
              <input type="hidden" name="expectedCheckOutDate" value={reservation.checkOutDate} />
              <input type="hidden" name="idempotencyKey" value={randomUUID()} />
              <Field label="New check-in"><TextInput required type="date" name="checkInDate" min={today} defaultValue={reservation.checkInDate} /></Field>
              <Field label="New checkout"><TextInput required type="date" name="checkOutDate" min={today} defaultValue={reservation.checkOutDate} /></Field>
              <Field label="Reason" hint="Saved with the change history." className="sm:col-span-2"><TextInput required minLength={3} maxLength={1000} name="reason" placeholder="Guest asked to extend by one night" /></Field>
              <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">A higher total leaves a balance for the guest to pay on their trip page. A lower total opens a refund for you to process under Refunds. Resolve open refunds first.</p>
              <div className="sm:col-span-2"><SubmitButton size="sm" pendingLabel="Changing dates…">Change dates</SubmitButton></div>
            </form>
          </Disclosure> : null}

          {canManage && ['pending', 'confirmed', 'in_stay'].includes(reservation.status) ? <Disclosure icon={BedDouble} summary="Move to another unit" description={otherUnits.length ? 'Same dates and price, another available unit at this property.' : 'No other available unit with a published listing at this property.'}>
            {otherUnits.length ? <form action={reassignReservationAction} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="reservationId" value={reservation.id} />
              <Field label="Unit"><Select required name="targetAccommodationUnitId" defaultValue=""><option value="" disabled>Choose a unit</option>{otherUnits.map((unit: any) => <option key={unit.id} value={unit.id}>{unit.name} · sleeps {unit.maxGuests}</option>)}</Select></Field>
              <Field label="Reason"><TextInput required minLength={3} maxLength={1000} name="reason" placeholder="Maintenance at the original unit" /></Field>
              <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">The move is refused if the unit is booked or held for any of these nights.</p>
              <div className="sm:col-span-2"><ConfirmSubmitButton destructive={false} title="Move this stay?" description="The guest keeps the same dates and price. The calendar hold moves to the new unit." confirmLabel="Move stay" pendingLabel="Moving…">Move stay</ConfirmSubmitButton></div>
            </form> : <p className="text-sm text-muted-foreground">Create and publish a listing for another unit at this property to move stays between units.</p>}
          </Disclosure> : null}

          {canManage && reservation.guestParty && ['pending', 'confirmed', 'in_stay'].includes(reservation.status) ? <Disclosure id="stay-change-party" icon={Users} summary="Change guests or pets" description={reservation.accommodationUnit?.maxGuests ? `Sleeps up to ${reservation.accommodationUnit.maxGuests}, not counting infants.` : undefined}>
            <form action={amendPartyAction} className="grid gap-4 grid-cols-2 sm:grid-cols-4">
              <input type="hidden" name="reservationId" value={reservation.id} />
              <Field label="Adults"><TextInput required type="number" inputMode="numeric" name="adults" min={1} max={reservation.accommodationUnit?.maxGuests || 50} step={1} defaultValue={reservation.guestParty.adults ?? 1} /></Field>
              <Field label="Children"><TextInput required type="number" inputMode="numeric" name="children" min={0} max={50} step={1} defaultValue={reservation.guestParty.children ?? 0} /></Field>
              <Field label="Infants"><TextInput required type="number" inputMode="numeric" name="infants" min={0} max={50} step={1} defaultValue={reservation.guestParty.infants ?? 0} /></Field>
              <Field label="Pets"><TextInput required type="number" inputMode="numeric" name="pets" min={0} max={50} step={1} defaultValue={reservation.guestParty.pets ?? 0} /></Field>
              <Field label="Reason" hint="Saved on the stay record." className="col-span-2 sm:col-span-4"><TextInput required minLength={3} maxLength={1000} name="reason" placeholder="Guest is bringing one more child" /></Field>
              <p className="col-span-2 text-xs leading-5 text-muted-foreground sm:col-span-4">A change that would alter the price, such as a pet or extra-guest fee, is refused.</p>
              <div className="col-span-2 sm:col-span-4"><SubmitButton size="sm" pendingLabel="Saving…">Update guests</SubmitButton></div>
            </form>
          </Disclosure> : null}

          <Section id="stay-charges" title="Charges" icon={ReceiptText} count={Number(reservation.lineItemsCount ?? lineItems.length)} description="Line items are fixed when the stay is booked or its dates change." flush>
            {lineItems.length ? <DataTable
              rows={lineItems}
              getKey={(item: any) => item.id}
              caption="Stay charges"
              footer={<tfoot className="text-sm">
                <tr><td colSpan={3} className="border-t px-4 pt-3 text-right text-muted-foreground">Stay total</td><td className="border-t px-4 pt-3 text-right font-semibold tabular-nums">{formatMoney(reservation.totalAmountCents, currency)}</td></tr>
                <tr><td colSpan={3} className="px-4 py-1 text-right text-muted-foreground">Paid</td><td className="px-4 py-1 text-right tabular-nums">−{formatMoney(reservation.amountPaidCents, currency)}</td></tr>
                <tr><td colSpan={3} className="px-4 pb-3 text-right font-medium">Balance due</td><td className={`px-4 pb-3 text-right font-semibold tabular-nums ${outstanding ? toneText.warning : ''}`}>{closed && outstanding ? 'Not assessed' : formatMoney(outstanding, currency)}</td></tr>
              </tfoot>}
              columns={[
                { id: 'charge', header: 'Charge', cell: (item: any) => <div className="min-w-0"><span className="font-medium">{item.description}</span><SubLine>{sentence(item.lineType)}<span className="md:hidden">{item.serviceDate ? ` · ${formatDay(item.serviceDate)}` : ''}</span></SubLine></div> },
                { id: 'date', header: 'Date', hideBelow: 'md', cell: (item: any) => <Muted className="whitespace-nowrap">{item.serviceDate ? formatDay(item.serviceDate, { weekday: 'short', month: 'short', day: 'numeric' }) : '—'}</Muted> },
                { id: 'qty', header: 'Qty', align: 'right', cell: (item: any) => item.quantity },
                { id: 'amount', header: 'Amount', align: 'right', cell: (item: any) => <span className="font-medium">{formatMoney(item.totalAmountCents, item.currencyCode)}</span> },
              ]}
            /> : <EmptyRow>No line items were returned for this stay.</EmptyRow>}
            <HistoryPager id={reservation.id} pages={pages} history="lines" total={Number(reservation.lineItemsCount ?? 0)} />
            {amendments.length ? <div className="border-t">
              <p className="px-4 pt-3 text-xs font-medium text-muted-foreground">Date changes</p>
              <ul className="space-y-1 px-4 pb-3 pt-1.5 text-xs leading-5 text-muted-foreground">{amendments.map((amendment: any) => <li key={amendment.id}>{formatTimestamp(amendment.createdAt, timeZone)}: {formatStayRange(amendment.previousCheckInDate, amendment.previousCheckOutDate)} → {formatStayRange(amendment.checkInDate, amendment.checkOutDate)}{amendment.delta?.totalAmountCents ? ` (${amendment.delta.totalAmountCents > 0 ? '+' : '−'}${formatMoney(Math.abs(amendment.delta.totalAmountCents), currency)})` : ''} · {amendment.reason}</li>)}</ul>
              <HistoryPager id={reservation.id} pages={pages} history="changes" total={Number(reservation.amendmentsCount ?? 0)} />
            </div> : null}
          </Section>

          <Section id="stay-refunds" title="Payments & refunds" icon={Banknote} count={Number(reservation.paymentsCount ?? payments.length)} description="Card refunds run in Stripe test mode. Manual payments are refunded outside the store, then recorded here." flush>
            {canPay ? pendingPayments.map((payment: any) => <div key={`close-${payment.id}`} className="border-b px-4 py-3">
              <Disclosure icon={Banknote} summary={`Close the pending ${formatMoney(payment.amountCents, payment.currencyCode)} attempt`} description={payment.data?.reconciliation?.state === 'unknown' ? 'Stripe’s outcome for this attempt is unknown. It closes only once Stripe reports it.' : payment.data?.closureRequested ? 'The stay was closed; this attempt is waiting for Stripe to cancel it.' : 'A card attempt closes only when Stripe confirms it was cancelled.'}>
                <form action={cancelPaymentAttemptAction} className="grid gap-3">
                  <input type="hidden" name="reservationId" value={reservation.id} />
                  <input type="hidden" name="paymentId" value={payment.id} />
                  <Field label="Reason"><TextInput required minLength={3} maxLength={1000} name="reason" placeholder="Guest will pay by bank transfer instead" /></Field>
                  <div><SubmitButton size="sm" variant="outline" pendingLabel="Checking…">Close attempt</SubmitButton></div>
                </form>
              </Disclosure>
            </div>) : null}
            {canPay ? <OverflowNote shown={pendingPayments.length} total={Number(reservation.pendingPaymentsCount ?? pendingPayments.length)} noun="pending payment attempts" /> : null}
            <LinkRows empty="No payments recorded." items={payments.map((payment: any) => ({ id: payment.id, href: platformDetailPath('payment', payment.id), title: formatMoney(payment.amountCents, payment.currencyCode), meta: `${sentence(payment.paymentMethod)} · ${payment.provider === CARD_PROVIDER ? 'Stripe (test)' : payment.provider === MANUAL_PROVIDER ? 'Manual' : payment.provider || 'Manual'}${payment.refundedAmountCents ? ` · ${formatMoney(payment.refundedAmountCents, payment.currencyCode)} refunded` : ''}${payment.processedAt ? ` · ${formatTimestamp(payment.processedAt, timeZone)}` : ''}`, trailing: <StatusBadge status={payment.status} /> }))} />
            <HistoryPager id={reservation.id} pages={pages} history="payments" total={Number(reservation.paymentsCount ?? 0)} />
            {openRefunds.length ? <ul className="divide-y border-t" aria-label="Open refunds">
              {openRefunds.map((refund: any) => <li key={refund.id} className="space-y-3 px-4 py-3.5">
                <RefundSummary refund={refund} timeZone={timeZone} />
                {canPay ? <RefundActions refund={refund} reservationId={reservation.id} /> : null}
              </li>)}
            </ul> : null}
            <OverflowNote shown={openRefunds.length} total={openRefundCount} noun="open refunds" />
            {refunds.length ? <div id="stay-refund-history" className="scroll-mt-20 border-t">
              <p className="px-4 pt-3 text-xs font-medium text-muted-foreground">Refund history</p>
              <ul className="divide-y">
                {refunds.map((refund: any) => <li key={refund.id} className="px-4 py-3.5"><RefundSummary refund={refund} timeZone={timeZone} /></li>)}
              </ul>
              <HistoryPager id={reservation.id} pages={pages} history="refunds" total={Number(reservation.refundHistoryCount ?? 0)} />
            </div> : null}
            {canPay && !closed && outstanding > 0 && !['inquiry', 'quoted'].includes(reservation.status) ? <div className="border-t px-4 py-3">
              <Disclosure icon={Banknote} summary="Record a payment received" description="Money taken by phone, bank transfer, check or cash. This doesn’t charge the guest.">
                <form action={recordManualPaymentAction} className="grid gap-4 sm:grid-cols-2">
                  {/* One key per receipt: resubmitting this form can't record it twice. */}
                  <input type="hidden" name="operationKey" value={paymentOperationKey} />
                  <input type="hidden" name="reservationId" value={reservation.id} />
                  <Field label="Amount received" hint={`${formatMoney(outstanding, currency)} is outstanding.`}><MoneyInput required name="amountCents" currencyCode={currency} defaultCents={outstanding > 0 ? outstanding : undefined} /></Field>
                  <div className="self-end"><Checkbox required name="confirmReceived" label="I’ve already received this money" /></div>
                  <div className="sm:col-span-2"><SubmitButton size="sm" pendingLabel="Recording…">Record payment</SubmitButton></div>
                </form>
              </Disclosure>
            </div> : null}
            {canPay ? refundCurrencies.map((refundCurrency) => {
              const options = refundablePayments.filter((payment: any) => payment.currencyCode === refundCurrency);
              return <div key={refundCurrency} className="border-t px-4 py-3">
                <Disclosure icon={RotateCcw} summary={refundCurrencies.length > 1 ? `Issue a ${refundCurrency} refund` : 'Issue a refund'} description="Goodwill, a stay issue, or an overpayment.">
                  <form action={createRefundAction} className="grid gap-4 sm:grid-cols-2">
                    <input type="hidden" name="reservationId" value={reservation.id} />
                    <input type="hidden" name="operationKey" value={randomUUID()} />
                    <Field label="Payment" className="sm:col-span-2"><Select required name="paymentId" defaultValue={options[0].id}>{options.map((payment: any) => <option key={payment.id} value={payment.id}>{formatMoney(payment.amountCents - payment.refundedAmountCents, payment.currencyCode)} refundable · {payment.provider === CARD_PROVIDER ? 'card (Stripe test)' : 'manual'}</option>)}</Select></Field>
                    <Field label="Amount"><MoneyInput required name="amountCents" currencyCode={refundCurrency} /></Field>
                    <Field label="Reason"><Select required name="reason" defaultValue="goodwill"><option value="goodwill">Goodwill</option><option value="stay_issue">Stay issue</option><option value="overpayment">Overpayment</option></Select></Field>
                    <Field label="Note" hint="Saved with the refund." className="sm:col-span-2"><TextInput required minLength={3} maxLength={1000} name="note" placeholder="Hot tub out of service for one night" /></Field>
                    <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">Goodwill and stay-issue refunds lower the stay total by the same amount. Card refunds go to Stripe straight away; manual ones are recorded once you’ve returned the money.</p>
                    <div className="sm:col-span-2"><ConfirmSubmitButton destructive={false} title="Issue this refund?" description="For card payments this sends the refund to Stripe in test mode. It can’t be undone from here." confirmLabel="Issue refund" pendingLabel="Refunding…">Issue refund</ConfirmSubmitButton></div>
                  </form>
                </Disclosure>
              </div>;
            }) : null}
            {canPay ? <OverflowNote shown={Number(reservation.refundablePayments?.length || 0)} total={Number(reservation.refundablePaymentsCount ?? 0)} noun="refundable payments" /> : null}
            {capabilities.known && !canPay ? <p className="border-t px-4 py-2.5 text-xs leading-5 text-muted-foreground">Payment management permission is required to record payments or refunds.</p> : null}
          </Section>

          <Section title="Security deposit" icon={ShieldCheck} description="Records the deposit’s state and any deduction. Nothing here places a card hold or charges the guest." flush>
            {deposit ? <>
              <DescriptionList items={[
                { label: 'Status', value: <StatusBadge status={deposit.status} /> },
                { label: 'Amount', value: formatMoney(deposit.amountCents, deposit.currencyCode), hint: deposit.depositNumber },
                { label: 'Deducted', value: formatMoney(deposit.capturedAmountCents, deposit.currencyCode) },
                { label: 'Held', value: deposit.heldAt ? formatTimestamp(deposit.heldAt, timeZone) : <Muted>—</Muted> },
                { label: 'Released', value: deposit.releasedAt ? formatTimestamp(deposit.releasedAt, timeZone) : <Muted>—</Muted> },
                deposit.providerReference ? { label: 'Reference', value: <span className="font-mono text-xs">{deposit.providerReference}</span> } : null,
              ]} />
              {canPay && (depositSteps[deposit.status] || []).length ? <div className="grid gap-3 border-t px-4 py-3 sm:grid-cols-2">
                {(depositSteps[deposit.status] || []).map((step) => <form key={step.transition} action={securityDepositAction} className="space-y-2 rounded-lg border p-3">
                  <input type="hidden" name="reservationId" value={reservation.id} />
                  <input type="hidden" name="depositId" value={deposit.id} />
                  <input type="hidden" name="transition" value={step.transition} />
                  {/* One key per rendered action: resubmitting it after a lost response records it once. */}
                  <input type="hidden" name="operationKey" value={`deposit-${randomUUID()}`} />
                  {step.needsAmount ? <Field label="Deduction"><MoneyInput required name="amountCents" currencyCode={deposit.currencyCode} /></Field> : null}
                  <Field label="Reference" hint="Receipt, hold, transfer or claim reference."><TextInput required minLength={3} name="reference" maxLength={500} /></Field>
                  <Checkbox required name="confirmEvidence" label="This already happened with the guest or payment provider" />
                  <SubmitButton size="sm" variant={step.transition === 'fail' ? 'outline' : 'default'} pendingLabel="Saving…">{step.label}</SubmitButton>
                </form>)}
              </div> : <p className="border-t px-4 py-2.5 text-xs leading-5 text-muted-foreground">{deposit.status === 'released' ? (closed ? 'Released because the stay didn’t go ahead.' : 'The deposit is released.') : !(depositSteps[deposit.status] || []).length ? 'No further deposit steps.' : capabilities.known ? 'Payment management permission is required to record deposit steps.' : 'Deposit steps are unavailable right now.'}</p>}
            </> : <EmptyRow>No security deposit on this stay.</EmptyRow>}
          </Section>

          <Section id="stay-claims" title="Damage claims" icon={AlertTriangle} count={Number(reservation.damageClaimsCount ?? claims.length)} description="Claims record a deduction request and its outcome. Settling a claim doesn’t move money." flush>
            {claims.length ? <ul className="divide-y">
              {claims.map((claim: any) => <li key={claim.id} className="space-y-3 px-4 py-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0"><p className="text-sm font-medium">{claim.claimNumber} · {formatMoney(claim.claimedAmountCents, claim.currencyCode)} claimed{['approved', 'partially_approved', 'settled', 'declined'].includes(claim.status) ? ` · ${formatMoney(claim.approvedAmountCents ?? 0, claim.currencyCode)} approved` : ''}</p><p className="mt-0.5 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{claim.description}</p></div>
                  <StatusBadge status={claim.status} />
                </div>
                {canManage && (claimSteps[claim.status] || []).length ? <div className="flex flex-wrap items-end gap-2">
                  {(claimSteps[claim.status] || []).map((step) => <form key={step.transition} action={damageClaimTransitionAction} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="reservationId" value={reservation.id} />
                    <input type="hidden" name="claimId" value={claim.id} />
                    <input type="hidden" name="transition" value={step.transition} />
                    {step.needsAmount ? <div className="w-36"><MoneyInput required name="approvedAmountCents" currencyCode={claim.currencyCode} aria-label="Approved amount" /></div> : null}
                    {step.transition === 'settle' ? <>
                      <select required name="settlementMethod" aria-label="How it was settled" className="h-9 rounded-md border bg-background px-2 text-sm" defaultValue="">
                        <option value="" disabled>How was it settled?</option>
                        <option value="deposit_deduction">Deducted from the deposit</option>
                        <option value="guest_payment">Paid by the guest</option>
                      </select>
                      <div className="w-44"><TextInput required minLength={3} maxLength={500} name="settlementReference" placeholder="Reference" aria-label="Settlement reference" /></div>
                      <div className="w-40"><TextInput name="receivedOn" type="date" aria-label="Date the guest’s payment was received (guest payments)" /></div>
                      <div className="w-56"><TextInput name="custody" maxLength={300} placeholder="Where the proof is kept (guest payments)" aria-label="Where the proof of the guest’s payment is kept" /></div>
                      <Checkbox required name="confirmSettlement" label="The approved amount is settled" />
                    </> : null}
                    {step.destructive
                      ? <ConfirmSubmitButton title="Decline this claim?" description="The claim closes with nothing approved." confirmLabel="Decline claim" pendingLabel="Saving…">{step.label}</ConfirmSubmitButton>
                      : <SubmitButton size="sm" variant="outline" pendingLabel="Saving…">{step.label}</SubmitButton>}
                  </form>)}
                </div> : null}
              </li>)}
            </ul> : <EmptyRow>No damage claims.</EmptyRow>}
            <HistoryPager id={reservation.id} pages={pages} history="claims" total={Number(reservation.damageClaimsCount ?? 0)} />
            {canManage && ['in_stay', 'completed'].includes(reservation.status) ? <div className="border-t px-4 py-3">
              <Disclosure icon={AlertTriangle} summary="Start a damage claim" description="Describe the damage and list evidence references.">
                <form action={createDamageClaimAction} className="grid gap-4 sm:grid-cols-2">
                  <input type="hidden" name="reservationId" value={reservation.id} />
                  <Field label="What was damaged" className="sm:col-span-2"><TextArea required maxLength={4000} name="description" placeholder="Broken lamp in the main bedroom" /></Field>
                  <Field label="Amount claimed"><MoneyInput required name="claimedAmountCents" currencyCode={currency} /></Field>
                  <Field label="Evidence" optional hint="One photo link, receipt or report reference per line."><TextArea name="evidence" rows={3} /></Field>
                  <div className="sm:col-span-2"><SubmitButton size="sm" pendingLabel="Saving…">Draft claim</SubmitButton></div>
                </form>
              </Disclosure>
            </div> : null}
          </Section>

          <Section
            title="Arrival, turnover & support"
            icon={ClipboardCheck}
            count={Number(reservation.openTasksCount ?? openTasks.length)}
            action={<Button asChild size="sm" variant="ghost"><Link href="/dashboard/platform/tasks">Task board</Link></Button>}
            footer={Number(reservation.tasksCount ?? 0) > openTasks.length + closedTasks.length ? `Showing ${openTasks.length + closedTasks.length} of ${reservation.tasksCount} tasks: open ones first, then the latest closed.` : undefined}
            flush
          >
            <Timeline
              empty="No turnover, inspection, maintenance, or guest-support tasks are attached to this stay."
              items={[...openTasks, ...closedTasks].map((task: any) => ({
                id: task.id,
                title: task.title,
                time: task.dueAt ? formatTimestamp(task.dueAt, timeZone) : 'Not scheduled',
                tone: !openTasks.includes(task) ? 'success' : isPast(task.dueAt) ? 'danger' : task.priority === 'urgent' ? 'warning' : 'info',
                meta: `${sentence(task.taskType)} · ${sentence(task.priority)} priority · ${task.assignee?.name || 'Unassigned'}`,
                badge: <StatusBadge status={task.status} className="h-5" />,
              }))}
            />
          </Section>
        </>}
        aside={<>
          <Section id="stay-lifecycle" title="Lifecycle" icon={CalendarDays}>
            <div className="space-y-3 text-sm leading-6">
              <p>Currently <span className="font-medium">{reservationLabel(reservation.status).toLowerCase()}</span>.{canManage && onTimeTransitions.length ? <> Next step: <span className="font-medium">{reservationTransitionLabel(onTimeTransitions[0])}</span>, at the top of the page.</> : null}</p>
              {capabilities.known && !canManage && transitions.length ? <p className="text-xs leading-5 text-muted-foreground">Reservation management permission is required to change this stay.</p> : null}
              {['confirmed', 'in_stay'].includes(reservation.status) && readinessWarnings.length ? <ul className={`list-disc space-y-0.5 pl-5 text-xs leading-5 ${toneText.warning}`}>{readinessWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : null}
              {canManage ? earlyTransitions.map((transition) => <form key={transition} action={transitionReservation} className="space-y-3 rounded-lg border border-amber-300/70 bg-amber-50/40 p-3 dark:border-amber-900/60 dark:bg-amber-950/20">
                <TransitionFields id={reservation.id} status={reservation.status} transition={transition} />
                <p className="text-xs leading-5">{transition === 'complete'
                  ? <>Checkout is scheduled for <span className="font-medium">{formatDay(reservation.checkOutDate, { month: 'short', day: 'numeric' })}</span>. Recording it now returns the remaining nights to sale.</>
                  : <>Arrival is scheduled for <span className="font-medium">{formatDay(reservation.checkInDate, { month: 'short', day: 'numeric' })}</span>. Recording this now is an override.</>}</p>
                <Field label="Reason" hint="Required. Saved on the stay record."><TextInput required minLength={3} name="note" placeholder={transition === 'complete' ? 'Guest left two days early' : 'Guest arrived a day early by arrangement'} /></Field>
                <Checkbox required name="override" label="I confirm this is happening before the scheduled date" />
                <ConfirmSubmitButton
                  className="w-full"
                  destructive={false}
                  title={transition === 'complete' ? 'Record an early departure?' : `${reservationTransitionLabel(transition)} before the arrival date?`}
                  description={readinessWarnings.length ? <ul className="list-disc space-y-1 pl-5">{readinessWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : 'This is recorded with your reason.'}
                  confirmLabel={reservationTransitionLabel(transition)}
                  pendingLabel="Saving…"
                >{transition === 'complete' ? 'Record early departure' : `${reservationTransitionLabel(transition)} early`}</ConfirmSubmitButton>
              </form>) : null}
              {!transitions.length ? <p className="text-muted-foreground">This stay is closed. Its charges, payments, and history stay available for review.</p> : null}
            </div>
          </Section>

          {canManage && corrections.length ? <Disclosure icon={RotateCcw} summary="Correct a mistaken step" description="Undo a check-in or checkout that was recorded by mistake.">
            <div className="space-y-5">
              {corrections.map((transition) => <form key={transition} action={transitionReservation} className="space-y-3">
                <TransitionFields id={reservation.id} status={reservation.status} transition={transition} />
                <Field label="Reason" hint="Required. Saved on the stay record."><TextInput required minLength={3} name="note" placeholder={transition === 'reopen' ? 'Checkout recorded by mistake' : 'Check-in recorded before the guest arrived'} /></Field>
                <ConfirmSubmitButton
                  className="w-full"
                  destructive={false}
                  title={`${reservationTransitionLabel(transition)}?`}
                  description={transition === 'reopen'
                    ? 'The stay returns to in stay and its full dates are held again. This fails if any of its nights were booked or held since checkout.'
                    : 'The stay returns to confirmed. You can then check the guest in on the right day, cancel, or mark a no-show.'}
                  confirmLabel={reservationTransitionLabel(transition)}
                  pendingLabel="Saving…"
                >{reservationTransitionLabel(transition)}</ConfirmSubmitButton>
              </form>)}
            </div>
          </Disclosure> : null}

          {canManage && exceptionTransitions.length ? <Disclosure icon={AlertTriangle} summary={request ? 'Decline request' : 'Cancel or mark no-show'} description="Releases the stay’s calendar dates, voids an unsigned agreement and records why.">
            <div className="space-y-5">
              {exceptionTransitions.map((transition) => <form key={transition} action={transitionReservation} className="space-y-3">
                <TransitionFields id={reservation.id} status={reservation.status} transition={transition} />
                {transition === 'cancel'
                  ? <Field label={request ? 'Reason for declining' : 'Cancellation reason'} hint="Required. Saved on the reservation record and shown to the guest as the cancellation reason."><TextInput required name="note" placeholder={request ? 'Those dates are no longer available' : 'Guest requested cancellation'} /></Field>
                  : <>
                    <Field label="No-show note" optional={!isEarly('no_show')}><TextInput required={isEarly('no_show')} minLength={isEarly('no_show') ? 3 : undefined} name="note" placeholder="Guest didn’t arrive by checkout" /></Field>
                    {isEarly('no_show') ? <Checkbox required name="override" label="Record before the arrival date" hint={`Arrival is ${formatDay(reservation.checkInDate, { month: 'short', day: 'numeric' })}.`} /> : null}
                  </>}
                <ConfirmSubmitButton
                  className="w-full"
                  title={transition === 'cancel' ? (request ? 'Decline this request?' : 'Cancel this reservation?') : 'Mark this stay as a no-show?'}
                  description={<>This releases the stay’s calendar dates and voids an unsigned agreement. Paid amounts open a refund for you to process or decline under Refunds.</>}
                  confirmLabel={transition === 'cancel' && request ? 'Decline request' : reservationTransitionLabel(transition)}
                  pendingLabel="Saving…"
                >{transition === 'cancel' && request ? 'Decline request' : reservationTransitionLabel(transition)}</ConfirmSubmitButton>
              </form>)}
            </div>
          </Disclosure> : null}

          <Section title="Guest" icon={UserRound} flush>
            {guest ? <>
              <LinkRows items={[{ id: guest.id, href: platformDetailPath('guest', guest.id), leading: <Avatar name={guest.name} />, title: guest.name, meta: party || 'Party not recorded', trailing: <StatusBadge status={guest.verificationStatus} /> }]} />
              <DescriptionList items={[
                { label: <span className="inline-flex items-center gap-1.5"><Mail aria-hidden="true" className="size-3.5" />Email</span>, value: guest.email ? <a href={`mailto:${guest.email}`} className="underline-offset-4 hover:underline">{guest.email}</a> : '—' },
                { label: <span className="inline-flex items-center gap-1.5"><Phone aria-hidden="true" className="size-3.5" />Phone</span>, value: guest.phone || '—' },
              ]} />
              {reservation.conversation ? <div className="border-t px-4 py-2.5"><Link href={platformDetailPath('conversation', reservation.conversation.id)} className="inline-flex items-center gap-1.5 text-xs font-medium underline-offset-4 hover:underline"><MessageSquare aria-hidden="true" className="size-3.5" />Open message thread</Link></div> : null}
            </> : <EmptyRow>Guest details pending.</EmptyRow>}
          </Section>

          <Section title="Agreement" icon={FileSignature} flush>
            <DescriptionList items={[
              { label: 'Agreement', value: reservation.agreement ? <StatusBadge status={reservation.agreement.status} /> : <span className={toneText.warning}>Not issued</span>, hint: reservation.agreement ? `${reservation.agreement.agreementNumber}${reservation.agreement.signedAt ? ` · signed ${formatTimestamp(reservation.agreement.signedAt, timeZone)}` : ''}` : undefined },
            ]} />
            {reservation.agreement ? <div className="border-t px-4 py-2.5"><Link href={platformDetailPath('agreement', reservation.agreement.id)} className="text-xs font-medium underline-offset-4 hover:underline">{canManage ? 'Open agreement · void or send a new link' : 'Open agreement'}</Link></div> : null}
          </Section>

          <Section title="Calendar" icon={ShieldCheck} count={Number(reservation.calendarBlocksCount ?? reservation.calendarBlocks?.length ?? 0)} footer={Number(reservation.calendarBlocksCount ?? 0) > (reservation.calendarBlocks?.length || 0) ? `Showing the first ${reservation.calendarBlocks?.length || 0} of ${reservation.calendarBlocksCount} blocks.` : undefined} flush>
            <LinkRows empty="No linked calendar blocks." items={(reservation.calendarBlocks || []).map((block: any) => ({ id: block.id, title: `${formatDay(block.startDate)} – ${formatDay(block.endDate)}`, meta: `${sentence(block.reason)} · ${block.source}`, trailing: <Pill tone={block.status === 'active' ? 'info' : undefined}>{sentence(block.status)}</Pill> }))} />
          </Section>

          {stayProperty?.id ? <Section title="Property" icon={MapPin} flush>
            <LinkRows items={[
              { id: stayProperty.id, href: platformDetailPath('property', stayProperty.id), title: stayProperty.name, meta: `${where.allocated ? 'Stay location' : 'Booked listing’s property'} · ${stayProperty.address?.publicLocationLabel || 'Location not set'}` },
              ...(moved ? [{ id: `booked-${purchasedProperty.id}`, href: platformDetailPath('property', purchasedProperty.id), title: purchasedProperty.name, meta: 'Where it was booked · price and terms come from this booking' }] : []),
            ]} />
          </Section> : null}
          {party ? null : <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground"><Users aria-hidden="true" className="size-3.5" />Party size wasn’t recorded for this stay.</p>}
        </>}
      />
    </PageBody>
  </PlatformPage>;
}

/** Open refund: card refunds go to Stripe (test); manual refunds are recorded after money is returned. */
export function RefundActions({ refund, reservationId, returnTo }: { refund: any; reservationId?: string | null; returnTo?: string }) {
  const card = refund.payment?.provider === CARD_PROVIDER;
  const common = <>
    <input type="hidden" name="reservationId" value={reservationId || ''} />
    <input type="hidden" name="refundId" value={refund.id} />
    {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
  </>;
  if (refund.status === 'review') {
    return <div className="grid gap-3 lg:grid-cols-2">
      <form action={assessRefundAction} className="space-y-2 rounded-lg border p-3">
        {common}
        <p className="text-xs leading-5 text-muted-foreground">The captured cancellation policy has no refund rules for this cancellation, so the amount is yours to assess. Nothing is owed until you do.</p>
        <Field label="Refund to give" hint={`Up to ${formatMoney(refund.amountCents, refund.currencyCode)}.`}><MoneyInput required name="amountCents" currencyCode={refund.currencyCode} defaultCents={refund.amountCents} /></Field>
        <Field label="How you assessed it"><TextInput required minLength={3} maxLength={1000} name="note" placeholder="Policy reviewed with the guest; full refund" /></Field>
        <SubmitButton size="sm" pendingLabel="Saving…">Assess refund</SubmitButton>
      </form>
      <form action={declineRefundAction} className="space-y-2 rounded-lg border p-3">
        {common}
        <Field label="Decline reason" hint="For example, no refund under the cancellation policy."><TextInput required minLength={3} maxLength={1000} name="note" /></Field>
        <FormActions className="border-t-0 pt-0">
          <ConfirmSubmitButton title="Decline this refund?" description="No money is returned. The guest sees the refund as declined." confirmLabel="Decline refund" pendingLabel="Saving…">Decline refund</ConfirmSubmitButton>
        </FormActions>
      </form>
    </div>;
  }
  if (refund.status === 'processing') {
    return <form action={processRefundAction} className="flex flex-wrap items-center gap-2">
      {common}
      <p className="text-xs leading-5 text-muted-foreground">{card ? 'Stripe is processing this refund.' : 'This refund is being recorded.'}</p>
      {card ? <SubmitButton size="sm" variant="outline" pendingLabel="Checking…">Check refund status</SubmitButton> : null}
    </form>;
  }
  return <div className="grid gap-3 lg:grid-cols-2">
    {card ? <form action={processRefundAction} className="space-y-2 rounded-lg border p-3">
      {common}
      {refund.status === 'failed' ? <p className={`text-xs leading-5 ${toneText.danger}`}>The last attempt didn’t go through. You can try again.</p> : null}
      <Field label="Refund amount" hint="Lower it to keep part under the cancellation policy."><MoneyInput required name="amountCents" currencyCode={refund.currencyCode} defaultCents={refund.amountCents} /></Field>
      <Field label="Reason for a lower amount" optional><TextInput name="note" maxLength={1000} placeholder="Non-refundable cleaning fee kept" /></Field>
      <ConfirmSubmitButton variant="default" destructive={false} title="Refund this payment in Stripe?" description="Stripe test mode returns the money to the guest’s test card. This can’t be undone from here." confirmLabel="Refund in Stripe" pendingLabel="Refunding…">Refund in Stripe (test)</ConfirmSubmitButton>
    </form> : <form action={recordManualRefundAction} className="space-y-2 rounded-lg border p-3">
      {common}
      <input type="hidden" name="operationKey" value={`manual-${refund.id}`} />
      <Field label="Amount returned"><MoneyInput required name="amountCents" currencyCode={refund.currencyCode} defaultCents={refund.amountCents} /></Field>
      <Field label="Reason for a lower amount" optional><TextInput name="note" maxLength={1000} /></Field>
      <Field label="Completion reference" hint="Bank transfer, check number or cash receipt."><TextInput required minLength={3} maxLength={250} name="evidenceReference" /></Field>
      <Checkbox required name="confirmFundsReturned" label="I’ve already returned this money to the guest" />
      <SubmitButton size="sm" pendingLabel="Recording…">Record refund</SubmitButton>
    </form>}
    <form action={declineRefundAction} className="space-y-2 rounded-lg border p-3">
      {common}
      <Field label="Decline reason" hint="For example, outside the cancellation policy."><TextInput required minLength={3} maxLength={1000} name="note" /></Field>
      <FormActions className="border-t-0 pt-0">
        <ConfirmSubmitButton title="Decline this refund?" description="The refund closes and no money is returned. The guest sees it as declined." confirmLabel="Decline refund" pendingLabel="Saving…">Decline refund</ConfirmSubmitButton>
      </FormActions>
    </form>
  </div>;
}

export default ReservationDetailPage;
