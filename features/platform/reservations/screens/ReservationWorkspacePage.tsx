import { AlertTriangle, CalendarCheck2, CircleDollarSign, DoorOpen } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { ExceptionRail, MetricStrip, OpsRow, Panel, StatusPill, Workspace, WorkspaceBody, WorkspaceHeader } from '@/features/platform/operations/components/OperationsWorkspace';
import { operationalTone } from '@/features/platform/operations/lib/operations';
import { getReservationWorkspace, transitionReservation } from '../actions/reservations';
import { formatMoney, formatStayRange, recommendedReservationTransition, reservationLabel, reservationPriority, reservationTransitionLabel } from '../lib/presentation';

const queues = [{ id: 'all', label: 'All stays' }, { id: 'pending', label: 'Needs decision' }, { id: 'confirmed', label: 'Arrivals' }, { id: 'in_stay', label: 'In house' }, { id: 'exceptions', label: 'Exceptions' }] as const;
function filterFor(value: unknown) { return queues.some((queue) => queue.id === value) ? String(value) : 'all'; }
function matches(reservation: any, queue: string) {
  if (queue === 'pending') return ['inquiry', 'quoted', 'pending'].includes(reservation.status);
  if (queue === 'confirmed') return reservation.status === 'confirmed';
  if (queue === 'in_stay') return reservation.status === 'in_stay';
  if (queue === 'exceptions') return ['cancelled', 'no_show'].includes(reservation.status) || reservation.paymentStatus === 'unpaid' || reservation.guest?.verificationStatus === 'rejected';
  return true;
}

export async function ReservationWorkspacePage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) || {}; const activeQueue = filterFor(params.queue);
  const { reservations, error } = await getReservationWorkspace(); const visible = reservations.filter((reservation: any) => matches(reservation, activeQueue));
  const needsDecision = reservations.filter((reservation: any) => ['inquiry', 'quoted', 'pending'].includes(reservation.status));
  const arrivals = reservations.filter((reservation: any) => reservation.status === 'confirmed');
  const inStay = reservations.filter((reservation: any) => reservation.status === 'in_stay');
  const outstanding = reservations.reduce((total: number, reservation: any) => total + Math.max((reservation.totalAmountCents || 0) - (reservation.amountPaidCents || 0), 0), 0);
  const exceptionItems = reservations.flatMap((reservation: any) => {
    const items = []; const due = Math.max((reservation.totalAmountCents || 0) - (reservation.amountPaidCents || 0), 0);
    if (reservation.paymentStatus === 'unpaid' || due > 0) items.push({ id: `payment-${reservation.id}`, title: `${reservation.confirmationCode} · payment`, detail: `${formatMoney(due, reservation.currencyCode)} outstanding. Review recorded charge/refund evidence before collection action.`, href: `/dashboard/platform/reservations/${reservation.id}`, actionLabel: 'Open collection evidence', resolution: 'action' as const, tone: 'danger' as const });
    if (!reservation.agreement || reservation.agreement.status !== 'signed') items.push({ id: `agreement-${reservation.id}`, title: `${reservation.confirmationCode} · agreement`, detail: reservation.agreement ? `${reservationLabel(reservation.agreement.status)} before arrival; signing remains in the guest agreement flow.` : 'Not issued; this bounded host workspace has no issue/resend command.', href: `/dashboard/platform/reservations/${reservation.id}`, actionLabel: 'Review agreement boundary', resolution: 'action' as const });
    if (reservation.guest?.verificationStatus !== 'verified') items.push({ id: `guest-${reservation.id}`, title: `${reservation.confirmationCode} · guest`, detail: `${reservation.guest?.name || 'Guest'} is ${reservation.guest?.verificationStatus || 'unverified'}; verification is external/manual evidence, not an in-app promise.`, href: `/dashboard/platform/reservations/${reservation.id}`, actionLabel: 'Review verification boundary', resolution: 'action' as const });
    return items;
  });

  return <Workspace><WorkspaceHeader sectionLabel="Reservations" sectionHref="/platform/reservations" eyebrow="Stay desk" title="Reservations" description="A lifecycle queue combining guest, agreement, collections, tasks, and arrival timing. State changes use the protected stay-transition command." actions={<Button asChild size="sm" variant="outline"><Link href="/dashboard/platform/calendar">Occupancy calendar</Link></Button>} />
    {error ? <div role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Reservations could not be loaded: {error}</div> : null}
    <MetricStrip items={[{ label: 'Needs decision', value: needsDecision.length, detail: 'inquiry through pending', tone: needsDecision.length ? 'warning' : 'success', icon: AlertTriangle }, { label: 'Arrivals', value: arrivals.length, detail: 'confirmed stay queue', icon: CalendarCheck2 }, { label: 'In house', value: inStay.length, detail: 'active occupancy', icon: DoorOpen }, { label: 'Outstanding', value: formatMoney(outstanding), detail: 'recorded reservation balance', tone: outstanding ? 'warning' : 'success', icon: CircleDollarSign }]} />
    <WorkspaceBody aside={<ExceptionRail title="Stay exceptions" items={exceptionItems} empty="No payment, agreement, or verification exceptions." />}>
      <nav aria-label="Reservation queues" className="flex flex-wrap gap-1 border-b border-border pb-3">{queues.map((queue) => <Button key={queue.id} asChild size="sm" variant={activeQueue === queue.id ? 'default' : 'ghost'}><Link href={queue.id === 'all' ? '/dashboard/platform/reservations' : `/dashboard/platform/reservations?queue=${queue.id}`}>{queue.label}</Link></Button>)}</nav>
      <Panel title={`${queues.find((queue) => queue.id === activeQueue)?.label} queue`} description="Check-in date order; open a stay for evidence, cancellation notes, finance, and task timeline.">
        {visible.map((reservation: any) => { const recommended = recommendedReservationTransition(reservation.status); const priority = reservationPriority(reservation.status, reservation.checkInDate); const due = Math.max((reservation.totalAmountCents || 0) - (reservation.amountPaidCents || 0), 0); return <OpsRow key={reservation.id} title={`${reservation.guest?.name || 'Guest pending'} · ${reservation.confirmationCode}`} status={reservationLabel(reservation.status)} tone={operationalTone(reservation.status)} meta={`${reservation.listing?.title || 'Listing unavailable'} · ${formatStayRange(reservation.checkInDate, reservation.checkOutDate)} · ${reservation.source}`} actions={<Button asChild size="sm" variant="outline"><Link href={`/dashboard/platform/reservations/${reservation.id}`}>Open stay</Link></Button>} details={<div className="space-y-2"><div className="flex flex-wrap gap-2"><StatusPill status={`${reservationLabel(reservation.paymentStatus)} payment`} tone={due ? 'warning' : 'success'} /><StatusPill status={reservation.agreement ? `${reservationLabel(reservation.agreement.status)} agreement` : 'agreement not issued'} tone={reservation.agreement?.status === 'signed' ? 'success' : 'warning'} /><StatusPill status={`${reservation.guest?.verificationStatus || 'unverified'} guest`} tone={reservation.guest?.verificationStatus === 'verified' ? 'success' : 'warning'} />{reservation.tasks?.some((task: any) => !['completed', 'cancelled'].includes(task.status)) ? <StatusPill status={`${reservation.tasks.filter((task: any) => !['completed', 'cancelled'].includes(task.status)).length} open tasks`} tone="info" /> : null}</div><div className="flex flex-wrap items-center justify-between gap-3 text-xs"><span className={priority ? 'font-medium text-amber-700' : 'text-muted-foreground'}>{priority?.label || `${formatMoney(reservation.totalAmountCents, reservation.currencyCode)} total · ${formatMoney(due, reservation.currencyCode)} due`}</span>{recommended ? <form action={transitionReservation}><input type="hidden" name="reservationId" value={reservation.id} /><input type="hidden" name="status" value={reservation.status} /><input type="hidden" name="transition" value={recommended} /><Button size="sm" type="submit">{reservationTransitionLabel(recommended)}</Button></form> : <span className="text-muted-foreground">Lifecycle closed</span>}</div></div>} />; })}
        {!visible.length ? <div className="px-4 py-10 text-center text-sm text-muted-foreground">No stays in this operational queue.</div> : null}
      </Panel>
    </WorkspaceBody>
  </Workspace>;
}
export default ReservationWorkspacePage;
