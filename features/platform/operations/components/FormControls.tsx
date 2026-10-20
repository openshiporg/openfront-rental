import type { LucideIcon } from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const controlClass = 'h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50';

export function Field({ label, hint, optional, children, className }: { label: ReactNode; hint?: ReactNode; optional?: boolean; children: ReactNode; className?: string }) {
  return <label className={cn('grid min-w-0 content-start gap-1.5 text-sm', className)}>
    <span className="text-xs font-medium text-foreground">{label}{optional ? <span className="font-normal text-muted-foreground"> · optional</span> : null}</span>
    {children}
    {hint ? <span className="text-xs leading-5 text-muted-foreground">{hint}</span> : null}
  </label>;
}

export function TextInput({ className, ...props }: ComponentProps<'input'>) {
  return <Input className={cn('h-9 px-3 text-sm', className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return <select className={cn(controlClass, 'pr-8', className)} {...props}>{children}</select>;
}

export function TextArea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(controlClass, 'h-auto min-h-20 py-2 leading-6', className)} {...props} />;
}

export function Checkbox({ label, hint, className, ...props }: Omit<ComponentProps<'input'>, 'type'> & { label: ReactNode; hint?: ReactNode }) {
  return <label className={cn('flex items-start gap-2.5 text-sm', className)}>
    <input type="checkbox" className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary" {...props} />
    <span className="min-w-0"><span className="block font-medium">{label}</span>{hint ? <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{hint}</span> : null}</span>
  </label>;
}

export function FormActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-2 border-t pt-4', className)}>{children}</div>;
}

/**
 * Native <details> disclosure — no client JS, keeps its open state across server re-renders.
 * Used for secondary forms so the page leads with information, not inputs.
 */
export function Disclosure({ summary, description, icon: Icon, children, defaultOpen, id, className, trailing }: {
  summary: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  children: ReactNode;
  defaultOpen?: boolean;
  id?: string;
  className?: string;
  trailing?: ReactNode;
}) {
  return <details id={id} open={defaultOpen || undefined} className={cn('group min-w-0 scroll-mt-20 overflow-hidden rounded-xl border bg-card shadow-xs', className)}>
    <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
      {Icon ? <span className="grid size-8 shrink-0 place-items-center rounded-lg border bg-background"><Icon aria-hidden="true" className="size-4 text-muted-foreground" /></span> : null}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{summary}</span>
        {description ? <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{description}</span> : null}
      </span>
      {trailing}
      <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
    </summary>
    <div className="border-t px-4 py-4">{children}</div>
  </details>;
}

/** Compact disclosure for table cells and cards. */
export function InlineDisclosure({ summary, children, className, align = 'left' }: { summary: ReactNode; children: ReactNode; className?: string; align?: 'left' | 'right' }) {
  return <details className={cn('group/inline relative z-10 min-w-0', className)}>
    <summary className={cn('inline-flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium shadow-xs transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden', align === 'right' && 'ml-auto')}>
      {summary}
      <ChevronDown aria-hidden="true" className="size-3.5 text-muted-foreground transition-transform group-open/inline:rotate-180" />
    </summary>
    <div className="mt-2 rounded-lg border bg-background p-3 text-left shadow-sm">{children}</div>
  </details>;
}

/** Common stay-market timezones; free text still accepts any IANA name. */
const commonTimezones = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu',
  'America/Toronto', 'America/Vancouver', 'America/Halifax', 'America/Mexico_City', 'America/Cancun', 'America/Puerto_Rico', 'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires', 'America/Bogota', 'America/Lima', 'Europe/London', 'Europe/Dublin', 'Europe/Lisbon', 'Europe/Paris', 'Europe/Madrid',
  'Europe/Berlin', 'Europe/Rome', 'Europe/Amsterdam', 'Europe/Zurich', 'Europe/Vienna', 'Europe/Athens', 'Europe/Istanbul', 'Africa/Cairo',
  'Africa/Johannesburg', 'Africa/Nairobi', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Makassar', 'Asia/Tokyo', 'Asia/Seoul',
  'Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Perth', 'Pacific/Auckland', 'UTC',
];

export function TimezoneInput({ listId = 'platform-timezones', className, ...props }: Omit<ComponentProps<'input'>, 'list'> & { listId?: string }) {
  return <>
    <Input list={listId} autoComplete="off" spellCheck={false} pattern="UTC|[A-Za-z_]+(?:/[A-Za-z0-9_+\-]+)+" title="Use an IANA timezone such as America/New_York." className={cn('h-9 px-3 text-sm', className)} {...props} />
    <datalist id={listId}>{commonTimezones.map((zone) => <option key={zone} value={zone} />)}</datalist>
  </>;
}
