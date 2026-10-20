'use client';

import type { CSSProperties, ReactNode } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/** A hold on the grid: a real button whose dates and note open on click, Enter or Space, not only on hover. */
export function CalendarHoldBar({ id, label, heading, dates, notes, className, style, children }: {
  id: string;
  label: string;
  heading: string;
  dates: string;
  notes?: string | null;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return <Popover>
    <PopoverTrigger asChild>
      <button type="button" aria-label={label} className={cn(className, 'cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1')} style={style}>{children}</button>
    </PopoverTrigger>
    <PopoverContent align="start" collisionPadding={16} className="w-72 max-w-[calc(100vw-2rem)] space-y-1.5 p-3 text-xs leading-5">
      <p className="text-sm font-medium">{heading}</p>
      <p className="tabular-nums text-muted-foreground">{dates}</p>
      {notes ? <p className="[overflow-wrap:anywhere]">{notes}</p> : null}
      <a href={`#hold-${id}`} className="inline-block font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Show in Active holds</a>
    </PopoverContent>
  </Popover>;
}
