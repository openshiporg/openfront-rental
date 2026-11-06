'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

/** The listing's secret iCal export URL, to paste into Airbnb, Vrbo or Google Calendar. */
export function CalendarFeedLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); }
  }
  return <div className="space-y-2 px-4 py-3">
    <p className="text-sm font-medium">Export calendar (iCal URL)</p>
    <p className="text-xs leading-5 text-muted-foreground">Paste this link into Airbnb, Vrbo or Google Calendar so they block the nights booked here. It shows only busy dates. Keep it private.</p>
    <div className="flex min-w-0 items-center gap-2">
      <input readOnly value={url} aria-label="iCal export URL" onFocus={(event) => event.currentTarget.select()} className="h-9 min-w-0 flex-1 truncate rounded-md border bg-muted/30 px-3 font-mono text-xs" />
      <Button type="button" size="sm" variant="outline" onClick={copy}>{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{copied ? 'Copied' : 'Copy'}</Button>
    </div>
  </div>;
}
