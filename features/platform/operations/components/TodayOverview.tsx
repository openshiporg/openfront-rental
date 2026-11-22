import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Ban, CircleDollarSign, ClipboardCheck, Clock, Inbox, KeyRound, RefreshCcw, UserRoundCheck } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Callout, LinkRows, Section, StatTiles, StatusBadge } from './PlatformUI';
import type { getTodayOverview } from '../actions/today';
import { formatCurrencyTotals, formatDayRange, formatMoney, formatTimestamp, isMessageException, plural, sentence, sumByCurrency } from '../lib/operations';
import { platformDetailPath } from '../lib/routes';

const RESERVATIONS = '/dashboard/platform/reservations';
const stayPath = (id: string) => `${RESERVATIONS}/${encodeURIComponent(id)}`;
const queuePath = (view: string) => `${RESERVATIONS}?view=${view}`;
const DUE_TASKS = '/dashboard/platform/tasks?view=due_soon';

function stayRows(stays: any[]) {
  return stays.map((stay: any) => ({
    id: stay.id,
    href: stayPath(stay.id),
    title: `${stay.guest?.name || 'Guest'} · ${stay.listing?.title || 'Listing unavailable'}`,
    meta: `${stay.confirmationCode}${stay.testMode ? ' · Holds no dates' : stay.fixtureOrigin ? ' · Created by setup' : ''} · ${formatDayRange(stay.checkInDate, stay.checkOutDate)}`,
    trailing: <StatusBadge status={stay.status} />,
  }));
}

/** Footer for a bounded preview: says how much is shown and links to the full queue. */
function previewFooter(shown: number, total: number, href: string, noun: string): ReactNode {
  if (total <= shown) return undefined;
  return <span className="flex flex-wrap items-center gap-x-2">Showing {shown} of {plural(total, noun)}<Link href={href} className="font-medium text-foreground underline-offset-4 hover:underline">View all</Link></span>;
}

export const TODAY_PATH = '/dashboard/platform/today';

export function todayHeading(today: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${today}T12:00:00Z`));
}

/** Today’s arrivals and departures, who is in house, and work waiting on someone. */
export function TodayOverview({ overview }: { overview: Awaited<ReturnType<typeof getTodayOverview>> }) {
  if (overview.kind === 'tasks') return <TaskDay overview={overview} />;
  const { data, error } = overview;

  if (!data) {
    return <Callout live tone="danger" title={error || 'Today’s overview couldn’t be loaded.'} action={<Button asChild size="sm" variant="outline"><Link href={TODAY_PATH}><RefreshCcw aria-hidden="true" />Try again</Link></Button>}>
      Your records are unchanged. Reservations, tasks, and payments are still available from the menu.
    </Callout>;
  }

  // Totals stay per currency; a total is shown only when every open refund was read.
  const refundTotals = sumByCurrency(data.refundAmounts || [], (refund: any) => refund.amountCents || 0, (refund: any) => refund.currencyCode);
  const refundValue = !data.refundTotalsComplete ? plural(data.refundsCount, 'open refund') : refundTotals.length > 1 ? `${refundTotals.length} currencies` : formatCurrencyTotals(refundTotals, 'None');
  const refundHint = !data.refundTotalsComplete ? 'too many to total here' : refundTotals.length > 1 ? formatCurrencyTotals(refundTotals) : plural(data.refundsCount, 'open refund');
  const awaitingReply = (data.conversations || []).filter((conversation: any) => isMessageException(conversation.messages?.[0]));
  const attention = [
    ...(data.refunds || []).map((refund: any) => ({
      id: `refund-${refund.id}`,
      href: refund.payment?.id ? platformDetailPath('payment', refund.payment.id) : refund.reservation?.id ? stayPath(refund.reservation.id) : undefined,
      title: `Refund ${formatMoney(refund.amountCents, refund.currencyCode)} owed · ${refund.reservation?.guest?.name || refund.reservation?.confirmationCode || refund.refundNumber}`,
      meta: `${refund.refundNumber} · ${sentence(refund.status)}`,
    })),
    ...(data.unpaid || []).map((stay: any) => ({
      id: `unpaid-${stay.id}`,
      href: stayPath(stay.id),
      title: `${formatMoney(Math.max((stay.totalAmountCents || 0) - (stay.amountPaidCents || 0), 0), stay.currencyCode)} unpaid · ${stay.guest?.name || stay.confirmationCode}`,
      meta: `${stay.confirmationCode}${stay.testMode ? ' · Holds no dates' : stay.fixtureOrigin ? ' · Created by setup' : ''} · ${formatDayRange(stay.checkInDate, stay.checkOutDate)}`,
    })),
    ...(data.tasks || []).map((task: any) => ({
      id: `task-${task.id}`,
      href: DUE_TASKS,
      title: `${task.title} · ${task.property?.name || 'Property'}`,
      meta: <>{sentence(task.status)} · due {task.dueAt ? formatTimestamp(task.dueAt, task.property?.timezone) : 'soon'}{task.assignee?.name ? ` · ${task.assignee.name}` : ' · unassigned'}</>,
    })),
    ...awaitingReply.map((conversation: any) => ({
      id: `conversation-${conversation.id}`,
      href: platformDetailPath('conversation', conversation.id),
      title: `${conversation.guest?.name || 'Guest'} is waiting for a reply`,
      meta: conversation.subject || 'Conversation',
    })),
  ];
  const truncated = [
    data.refundsCount > (data.refunds || []).length ? { label: `${(data.refunds || []).length} of ${plural(data.refundsCount, 'open refund')}`, href: '/dashboard/platform/payments?view=exceptions' } : null,
    data.unpaidCount > (data.unpaid || []).length ? { label: `${(data.unpaid || []).length} of ${plural(data.unpaidCount, 'unpaid stay')}`, href: queuePath('exceptions') } : null,
    data.tasksCount > (data.tasks || []).length ? { label: `${(data.tasks || []).length} of ${plural(data.tasksCount, 'task')} due`, href: DUE_TASKS } : null,
    !data.conversationsComplete ? { label: `replies from the latest ${(data.conversations || []).length} of ${plural(data.conversationsCount, 'open thread')}`, href: '/dashboard/platform/inbox' } : null,
  ].filter(Boolean) as Array<{ label: string; href: string }>;
  const attentionCount = data.refundsCount + data.unpaidCount + data.tasksCount + awaitingReply.length;

  return <div className="space-y-4">
    <StatTiles label="Today" items={[
      { label: 'Arrivals', value: data.arrivalsCount, hint: 'confirmed, checking in today', icon: ArrowDownLeft, href: queuePath('arriving_today') },
      { label: 'Departures', value: data.departuresCount, hint: 'in house, checking out today', icon: ArrowUpRight, href: queuePath('departing_today') },
      { label: 'In house', value: data.inHouseCount, hint: 'guests mid-stay', icon: KeyRound, href: queuePath('in_stay') },
      { label: 'Requests', value: data.requestsCount, hint: 'awaiting your approval', tone: data.requestsCount ? 'warning' : 'success', icon: UserRoundCheck, href: queuePath('pending') },
      { label: 'Refunds owed', value: refundValue, hint: refundHint, tone: data.refundsCount ? 'danger' : 'success', icon: CircleDollarSign, href: '/dashboard/platform/payments?view=exceptions' },
      { label: 'Awaiting reply', value: data.conversationsComplete ? awaitingReply.length : `${awaitingReply.length}+`, hint: data.conversationsComplete ? 'guest messages' : `in the latest ${(data.conversations || []).length} threads`, tone: awaitingReply.length ? 'warning' : 'success', icon: Inbox, href: '/dashboard/platform/inbox' },
    ]} />
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Arriving today" icon={ArrowDownLeft} count={data.arrivalsCount} footer={previewFooter(data.arrivals.length, data.arrivalsCount, queuePath('arriving_today'), 'arrival')} flush><LinkRows items={stayRows(data.arrivals)} empty="No arrivals today." /></Section>
      <Section title="Departing today" icon={ArrowUpRight} count={data.departuresCount} footer={previewFooter(data.departures.length, data.departuresCount, queuePath('departing_today'), 'departure')} flush><LinkRows items={stayRows(data.departures)} empty="No departures today." /></Section>
      <Section title="Requests to approve" icon={UserRoundCheck} count={data.requestsCount} footer={previewFooter(data.requests.length, data.requestsCount, queuePath('pending'), 'request')} flush><LinkRows items={stayRows(data.requests)} empty="No requests waiting." /></Section>
      <Section title="Needs attention" icon={ClipboardCheck} count={attentionCount} description={truncated.length ? `Preview: showing ${attention.length} of ${attentionCount}${data.conversationsComplete ? '' : '+'}` : undefined} footer={truncated.length ? <span className="flex flex-wrap gap-x-3 gap-y-1">{truncated.map((entry) => <Link key={entry.label} href={entry.href} className="font-medium text-foreground underline-offset-4 hover:underline">Showing {entry.label}</Link>)}</span> : undefined} flush><LinkRows items={attention} empty="Nothing needs attention." /></Section>
    </div>
    {data.inHouse.length ? <Section title="In house" icon={KeyRound} count={data.inHouseCount} footer={previewFooter(data.inHouse.length, data.inHouseCount, queuePath('in_stay'), 'stay')} flush><LinkRows items={stayRows(data.inHouse)} /></Section> : null}
  </div>;
}

const TASKS = '/dashboard/platform/tasks';

function taskRows(tasks: any[], href: string) {
  return tasks.map((task: any) => ({
    id: task.id,
    href,
    title: `${task.title} · ${task.property?.name || 'Property'}`,
    meta: <>{task.dueAt ? `Due ${formatTimestamp(task.dueAt, task.property?.timezone)}` : 'No due time'}{task.assignee?.name ? ` · ${task.assignee.name}` : ' · Unassigned'}</>,
    trailing: <StatusBadge status={task.status} />,
  }));
}

/** Today for housekeeping and other roles that work the homes: what's late, due, underway and stuck. */
function TaskDay({ overview }: { overview: Extract<Awaited<ReturnType<typeof getTodayOverview>>, { kind: 'tasks' }> }) {
  const { data, error } = overview;
  if (!data) {
    return <Callout live tone="danger" title={error || 'Today’s work couldn’t be loaded.'} action={<Button asChild size="sm" variant="outline"><Link href={TODAY_PATH}><RefreshCcw aria-hidden="true" />Try again</Link></Button>}>
      Your tasks are unchanged and still open from Tasks in the menu.
    </Callout>;
  }
  return <div className="space-y-4">
    <StatTiles label="Today" items={[
      { label: 'Due in 24h', value: data.dueCount, hint: 'open tasks, including late ones', tone: data.dueCount ? 'warning' : 'success', icon: Clock, href: `${TASKS}?view=due_soon` },
      { label: 'Late', value: data.lateCount, hint: 'past their due time', tone: data.lateCount ? 'danger' : 'success', icon: AlertTriangle, href: `${TASKS}?view=overdue` },
      { label: 'In progress', value: data.inProgressCount, hint: 'started, not finished', icon: ClipboardCheck, href: TASKS },
      { label: 'Blocked', value: data.blockedCount, hint: 'waiting on something', tone: data.blockedCount ? 'warning' : 'success', icon: Ban, href: `${TASKS}?view=blocked` },
    ]} />
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Due in the next 24 hours" icon={Clock} count={data.dueCount} footer={previewFooter(data.due.length, data.dueCount, `${TASKS}?view=due_soon`, 'task')} flush><LinkRows items={taskRows(data.due, `${TASKS}?view=due_soon`)} empty="Nothing due in the next 24 hours." /></Section>
      <Section title="In progress" icon={ClipboardCheck} count={data.inProgressCount} footer={previewFooter(data.inProgress.length, data.inProgressCount, TASKS, 'task')} flush><LinkRows items={taskRows(data.inProgress, TASKS)} empty="Nothing is underway." /></Section>
    </div>
    {data.blocked.length ? <Section title="Blocked" icon={Ban} count={data.blockedCount} footer={previewFooter(data.blocked.length, data.blockedCount, `${TASKS}?view=blocked`, 'task')} flush><LinkRows items={taskRows(data.blocked, `${TASKS}?view=blocked`)} /></Section> : null}
  </div>;
}
