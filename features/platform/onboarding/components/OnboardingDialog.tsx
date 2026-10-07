'use client';

import { useMemo } from 'react';
import { OnboardingDialog as SharedOnboardingDialog } from '@/features/onboarding/components/OnboardingDialog';
import { rentalDefinition } from '../config/rentalDefinition';

export function OnboardingDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const definition = useMemo(() => rentalDefinition(), []);
  return <SharedOnboardingDialog isOpen={isOpen} onClose={onClose} definition={definition} />;
}

export default OnboardingDialog;
