import { CreditCard, FileSignature, UserRoundCheck } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatMoney, sentence } from '../lib/operations';

/** Compact payment / agreement / guest-verification indicators for a stay. */
export function StayChecks({ reservation, className }: { reservation: any; className?: string }) {
  const due = Math.max((reservation.totalAmountCents || 0) - (reservation.amountPaidCents || 0), 0);
  const verification = reservation.guest?.verificationStatus || 'unverified';
  const checks = [
    {
      key: 'payment',
      icon: CreditCard,
      ok: !due && reservation.paymentStatus !== 'refund_pending',
      label: due ? `${formatMoney(due, reservation.currencyCode)} outstanding` : reservation.paymentStatus === 'refund_pending' ? 'Refund pending' : 'Paid in full',
    },
    {
      key: 'agreement',
      icon: FileSignature,
      ok: reservation.agreement?.status === 'signed',
      label: reservation.agreement ? `Agreement ${sentence(reservation.agreement.status).toLowerCase()}` : 'Agreement not issued',
    },
    {
      key: 'guest',
      icon: UserRoundCheck,
      ok: verification === 'verified',
      label: `Guest ${sentence(verification).toLowerCase()}`,
    },
  ];
  return <span className={cn('inline-flex items-center gap-1', className)}>
    {checks.map(({ key, icon: Icon, ok, label }) => <span
      key={key}
      role="img"
      title={label}
      aria-label={label}
      className={cn('grid size-6 place-items-center rounded-md border', ok
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
        : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300')}
    ><Icon aria-hidden="true" className="size-3.5" /></span>)}
  </span>;
}
