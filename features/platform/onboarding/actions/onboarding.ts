'use server';

import { revalidatePath } from 'next/cache';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import type { RentalOnboardingInput } from '@/features/keystone/onboarding/rentalOnboarding';

function revalidateOnboarding() {
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/(admin)');
  revalidatePath('/', 'layout');
}

async function updateStatus(status: 'in_progress' | 'dismissed') {
  try {
    const response = await keystoneClient(`mutation UpdateOnboardingStatus($status: String!) { updateOnboardingStatus(status: $status) { id onboardingStatus } }`, { status });
    if (!response.success) return { success: false, error: response.error || 'Could not update onboarding status.' };
    revalidateOnboarding();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not update onboarding status.' };
  }
}

export async function startOnboarding() { return updateStatus('in_progress'); }
export async function dismissOnboarding() { return updateStatus('dismissed'); }

export async function completeOnboarding(input: RentalOnboardingInput) {
  const response = await keystoneClient(`mutation CompleteRentalOnboarding($input: JSON!) { rentalOnboarding(input: $input, mode: "complete") }`, { input });
  if (!response.success) return { success: false, error: response.error || 'Could not complete onboarding.' };
  revalidateOnboarding();
  return { success: true };
}
