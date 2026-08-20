'use client';

import { useActionState } from 'react';
import { CheckCircle2, HousePlus, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  runAccommodationOnboarding,
  type AccommodationOnboardingResult,
} from '../actions/onboarding';

const initialState: AccommodationOnboardingResult = { ok: false, message: '' };

export function OnboardingDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(runAccommodationOnboarding, initialState);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
            <HousePlus className="h-5 w-5" />
          </div>
          <DialogTitle>Set up Commonstay</DialogTitle>
          <DialogDescription>
            Create a representative short-term-stay portfolio for a host and property-management team. Setup is idempotent and updates the same accommodation records on every run.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground sm:grid-cols-2">
          <span>5 distinct hosted properties</span>
          <span>10 local listing photographs</span>
          <span>Nightly, seasonal, fee, and tax rules</span>
          <span>4 direct/channel stay workflows</span>
          <span>Guest messages, review, and payout</span>
          <span>Channel mapping and sync evidence</span>
        </div>

        {state.message ? (
          <div className={`rounded-md border p-3 text-sm ${state.ok ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200' : 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200'}`} role="status">
            {state.ok ? <CheckCircle2 className="mr-2 inline h-4 w-4" /> : null}
            {state.message}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            {state.ok ? 'Close' : 'Not now'}
          </Button>
          {!state.ok ? (
            <form action={formAction}>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {pending ? 'Setting up…' : 'Create accommodation data'}
              </Button>
            </form>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default OnboardingDialog;
