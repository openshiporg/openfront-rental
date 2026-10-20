import type { OperationalTone } from '@/features/platform/operations/lib/operations';
import { cn } from '@/lib/utils';

const fill: Record<OperationalTone, string> = { neutral: 'bg-foreground/70', success: 'bg-emerald-500', warning: 'bg-amber-500', danger: 'bg-rose-500', info: 'bg-sky-500' };

/** A score on its own scale (1–5 stars) with an accessible name; the shared ProgressBar only reports percentages. */
export function ScoreMeter({ label, score, max = 5, tone = 'neutral' }: { label: string; score: number; max?: number; tone?: OperationalTone }) {
  const value = Math.max(0, Math.min(score, max));
  return <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-valuetext={`${value} out of ${max}`} className="h-1.5 w-full min-w-0 overflow-hidden rounded-full bg-muted">
    <div className={cn('h-full rounded-full', fill[tone])} style={{ width: `${(value / max) * 100}%` }} />
  </div>;
}
