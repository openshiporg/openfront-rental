import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarDays, CircleDollarSign, ClipboardCheck, FileSignature, ShieldCheck, TriangleAlert, UserRound } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PlatformBreadcrumbs } from '@/features/platform/operations/components/OperationsWorkspace';
import { getReservationDetail, transitionReservation } from '../actions/reservations';
import { availableReservationTransitions, formatMoney, formatStayRange, reservationLabel, reservationTransitionLabel } from '../lib/presentation';

function statusVariant(status: string) {
  if (['confirmed', 'in_stay', 'completed', 'signed', 'paid', 'succeeded'].includes(status)) return 'secondary' as const;
  if (['cancelled', 'no_show', 'failed', 'rejected'].includes(status)) return 'destructive' as const;
  return 'outline' as const;
}

function Meta({ label, value }: { label: string; value: string | number | null | undefined }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value || '—'}</p></div>;
}

export async function ReservationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = (await searchParams) || {};
  const { reservation, error } = await getReservationDetail(id);
  if (!reservation && !error) notFound();
  if (!reservation) return <><PlatformBreadcrumbs sectionLabel="Reservations" sectionHref="/platform/reservations" currentLabel="Unavailable reservation" /><main className="p-6"><div role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Reservation could not be loaded: {error}</div></main></>;

  const transitions = availableReservationTransitions(reservation.status);
  const normalTransitions = transitions.filter((transition) => !['cancel', 'no_show'].includes(transition));
  const exceptionTransitions = transitions.filter((transition) => ['cancel', 'no_show'].includes(transition));
  const outstanding = Math.max((reservation.totalAmountCents || 0) - (reservation.amountPaidCents || 0), 0);
  const openTasks = (reservation.tasks || []).filter((task: any) => !['completed', 'cancelled'].includes(task.status));

  return (
    <>
    <PlatformBreadcrumbs sectionLabel="Reservations" sectionHref="/platform/reservations" currentLabel={reservation.confirmationCode} />
    <main className="space-y-6 p-4 sm:p-6">
      <header className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2"><Link href="/dashboard/platform/reservations"><ArrowLeft className="mr-2 h-4 w-4" />Back to reservations</Link></Button>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm font-medium text-muted-foreground">Stay record · {reservation.confirmationCode}</p><h1 className="text-3xl font-semibold tracking-tight">{reservation.guest?.name || 'Guest details pending'}</h1><p className="mt-2 text-sm text-muted-foreground">{reservation.listing?.title || 'Listing unavailable'} · {formatStayRange(reservation.checkInDate, reservation.checkOutDate)}</p></div><div className="flex flex-wrap gap-2"><Badge variant={statusVariant(reservation.status)}>{reservationLabel(reservation.status)}</Badge><Badge variant={statusVariant(reservation.paymentStatus)}>{reservationLabel(reservation.paymentStatus)} payment</Badge><Badge variant="outline">{reservation.source}</Badge></div></div>
      </header>

      {query.error ? <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">{query.error}</div> : null}

      <section aria-label="Stay lifecycle" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Stay total</p><p className="mt-1 text-xl font-semibold">{formatMoney(reservation.totalAmountCents, reservation.currencyCode)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Outstanding</p><p className={outstanding > 0 ? 'mt-1 text-xl font-semibold text-amber-700' : 'mt-1 text-xl font-semibold'}>{formatMoney(outstanding, reservation.currencyCode)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Agreement</p><p className="mt-1 text-xl font-semibold">{reservation.agreement ? reservationLabel(reservation.agreement.status) : 'Not issued'}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Operations</p><p className="mt-1 text-xl font-semibold">{openTasks.length} open task{openTasks.length === 1 ? '' : 's'}</p></CardContent></Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.8fr)]">
        <div className="min-w-0 space-y-6">
          <Card className="min-w-0"><CardHeader><div className="flex items-center gap-2"><UserRound className="h-5 w-5 text-muted-foreground" /><CardTitle>Guest & stay brief</CardTitle></div></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><Meta label="Guest" value={reservation.guest?.name} /><Meta label="Email" value={reservation.guest?.email} /><Meta label="Phone" value={reservation.guest?.phone} /><Meta label="Verification" value={reservationLabel(reservation.guest?.verificationStatus)} /><Meta label="Arrival" value={reservation.scheduledCheckInTime || reservation.checkInDate} /><Meta label="Departure" value={reservation.scheduledCheckOutTime || reservation.checkOutDate} />{reservation.guestNotes ? <div className="sm:col-span-2 lg:col-span-3"><p className="text-xs text-muted-foreground">Guest note</p><p className="mt-1 whitespace-pre-wrap text-sm">{reservation.guestNotes}</p></div> : null}</CardContent></Card>

          <Card className="min-w-0"><CardHeader><div className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5 text-muted-foreground" /><CardTitle>Immutable stay charges</CardTitle></div></CardHeader><CardContent className="min-w-0 space-y-3"><div className="min-w-0 overflow-x-auto"><table className="w-full min-w-[36rem] text-left text-sm"><thead className="border-b text-xs text-muted-foreground"><tr><th className="pb-2 font-medium">Date</th><th className="pb-2 font-medium">Charge</th><th className="pb-2 text-right font-medium">Qty</th><th className="pb-2 text-right font-medium">Amount</th></tr></thead><tbody>{reservation.lineItems?.map((item: any) => <tr key={item.id} className="border-b last:border-0"><td className="py-3 text-muted-foreground">{item.serviceDate || '—'}</td><td className="py-3"><p className="font-medium">{item.description}</p><p className="text-xs text-muted-foreground">{reservationLabel(item.lineType)}</p></td><td className="py-3 text-right">{item.quantity}</td><td className="py-3 text-right font-medium">{formatMoney(item.totalAmountCents, item.currencyCode)}</td></tr>)}</tbody></table></div>{!reservation.lineItems?.length ? <p className="text-sm text-muted-foreground">No line items were returned for this stay.</p> : null}</CardContent></Card>

          <Card className="min-w-0"><CardHeader><div className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-muted-foreground" /><CardTitle>Arrival, turnover & exceptions</CardTitle></div></CardHeader><CardContent className="space-y-3">{openTasks.map((task: any) => <div key={task.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{task.title}</p><p className="mt-1 text-xs text-muted-foreground">{reservationLabel(task.taskType)} · {reservationLabel(task.priority)} priority · due {task.dueAt ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(task.dueAt)) : 'not scheduled'}</p></div><Badge variant={statusVariant(task.status)}>{reservationLabel(task.status)}</Badge></div>)}{!openTasks.length ? <p className="text-sm text-muted-foreground">No open turnover, readiness, maintenance, or guest-support tasks are attached to this stay.</p> : null}</CardContent></Card>
        </div>

        <aside className="min-w-0 space-y-6">
          <Card className="min-w-0"><CardHeader><div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-muted-foreground" /><CardTitle>Lifecycle actions</CardTitle></div></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Only actions valid for the current state are available. Each action is applied through the controlled stay-transition mutation.</p>{normalTransitions.map((transition) => <form key={transition} action={transitionReservation}><input type="hidden" name="reservationId" value={reservation.id} /><input type="hidden" name="status" value={reservation.status} /><input type="hidden" name="transition" value={transition} /><Button className="w-full" type="submit">{reservationTransitionLabel(transition)}</Button></form>)}{!transitions.length ? <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">This reservation is closed. Its operational and financial evidence remains available for review.</p> : null}</CardContent></Card>

          {exceptionTransitions.length ? <Card className="border-amber-200"><CardHeader><div className="flex items-center gap-2"><TriangleAlert className="h-5 w-5 text-amber-600" /><CardTitle>Exception actions</CardTitle></div></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">Exceptions release active reservation blocks and create workflow evidence. Cancellation requires a reason.</p>{exceptionTransitions.map((transition) => <form key={transition} action={transitionReservation} className="space-y-2"><input type="hidden" name="reservationId" value={reservation.id} /><input type="hidden" name="status" value={reservation.status} /><input type="hidden" name="transition" value={transition} />{transition === 'cancel' ? <Input required name="note" aria-label="Cancellation reason" placeholder="Cancellation reason" /> : <Input name="note" aria-label="No-show note" placeholder="Optional no-show note" />}<Button className="w-full" type="submit" variant="outline">{reservationTransitionLabel(transition)}</Button></form>)}</CardContent></Card> : null}

          <Card><CardHeader><div className="flex items-center gap-2"><FileSignature className="h-5 w-5 text-muted-foreground" /><CardTitle>Agreement & deposit</CardTitle></div></CardHeader><CardContent className="space-y-4">{reservation.agreement ? <div><p className="text-sm font-medium">{reservation.agreement.agreementNumber}</p><p className="mt-1 text-xs text-muted-foreground">{reservationLabel(reservation.agreement.status)}{reservation.agreement.signedAt ? ` · signed ${new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(reservation.agreement.signedAt))}` : ''}</p></div> : <p className="text-sm text-muted-foreground">No agreement has been issued. This bounded reservation workspace has no issue or resend command; signing evidence appears only after the authorized guest agreement flow creates it.</p>}{reservation.securityDeposit ? <div className="border-t pt-4"><p className="text-sm font-medium">{reservation.securityDeposit.depositNumber}</p><p className="mt-1 text-xs text-muted-foreground">{reservationLabel(reservation.securityDeposit.status)} · {formatMoney(reservation.securityDeposit.amountCents, reservation.securityDeposit.currencyCode)}</p></div> : <p className="border-t pt-4 text-sm text-muted-foreground">No security deposit is attached. This is an evidence state, not an available capture action.</p>}</CardContent></Card>

          <Card><CardHeader><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-muted-foreground" /><CardTitle>Calendar evidence</CardTitle></div></CardHeader><CardContent className="space-y-3">{reservation.calendarBlocks?.map((block: any) => <div key={block.id} className="rounded-md border p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{block.startDate} – {block.endDate}</p><Badge variant={block.status === 'active' ? 'secondary' : 'outline'}>{reservationLabel(block.status)}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{reservationLabel(block.reason)} · {block.source}</p></div>)}{!reservation.calendarBlocks?.length ? <p className="text-sm text-muted-foreground">No linked calendar blocks were returned.</p> : null}</CardContent></Card>
        </aside>
      </section>
    </main>
    </>
  );
}

export default ReservationDetailPage;
