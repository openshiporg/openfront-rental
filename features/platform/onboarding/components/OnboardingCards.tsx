'use client';

import { HousePlus } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function OnboardingCards({
  onboardingStatus,
  canManageOnboarding,
  onOpenDialog,
}: {
  onboardingStatus?: string | null;
  canManageOnboarding?: boolean;
  onOpenDialog: () => void;
}) {
  if (!canManageOnboarding || onboardingStatus === 'completed' || onboardingStatus === 'dismissed') return null;

  return (
    <div className="group-has-[[data-collapsible=icon]]/sidebar-wrapper:hidden rounded-md border bg-muted/40 p-3">
      <div className="flex items-start gap-2">
        <HousePlus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-xs font-medium">Set up Commonstay</p>
          <p className="mt-1 text-xs leading-4 text-muted-foreground">
            Add five hosted homes with pricing, calendars, guest stays, messages, channels, reviews, and payouts.
          </p>
        </div>
      </div>
      <Button size="sm" className="mt-3 h-7 w-full text-xs" onClick={onOpenDialog}>
        Get started
      </Button>
    </div>
  );
}
