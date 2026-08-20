'use server';

import { revalidatePath } from 'next/cache';

import { getAuthenticatedUser } from '@/features/dashboard/actions/auth';
import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';
import {
  disconnectAccommodationSeedClient,
  seedAccommodationPlatform,
} from '../lib/seedAccommodationPlatform';
import {
  runAccommodationOnboardingWorkflow,
  type AccommodationOnboardingResult,
  type AccommodationOnboardingStatus,
} from '../lib/runAccommodationOnboardingWorkflow';

export type { AccommodationOnboardingResult } from '../lib/runAccommodationOnboardingWorkflow';

const statusMutation = `
  mutation UpdateOnboardingStatus($status: String!) {
    updateOnboardingStatus(status: $status) {
      id
      onboardingStatus
    }
  }
`;

export async function runAccommodationOnboarding(
  _previousState: AccommodationOnboardingResult,
  _formData: FormData,
): Promise<AccommodationOnboardingResult> {
  return runAccommodationOnboardingWorkflow({
    getAuthenticatedUser: async () => {
      const auth = await getAuthenticatedUser();
      return auth.success ? auth.data?.authenticatedItem ?? null : null;
    },
    updateStatus: async (status: AccommodationOnboardingStatus) => {
      const response = await keystoneClient(statusMutation, { status });
      return response.success ? { ok: true } : { ok: false, error: response.error };
    },
    seedPlatform: seedAccommodationPlatform,
    disconnectSeedClient: disconnectAccommodationSeedClient,
    revalidate: () => {
      revalidatePath('/dashboard');
      revalidatePath('/search');
      revalidatePath('/stays');
      revalidatePath('/', 'layout');
    },
  });
}
