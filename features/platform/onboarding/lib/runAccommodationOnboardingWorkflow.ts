export type AccommodationOnboardingResult = {
  ok: boolean;
  message: string;
  summary?: Record<string, number>;
};

export type AccommodationOnboardingStatus = 'not_started' | 'in_progress' | 'completed';

type AuthenticatedOnboardingUser = {
  id: string;
  role?: { canManageOnboarding?: boolean | null } | null;
} | null;

type StatusUpdateResult = { ok: true } | { ok: false; error: string };

export type AccommodationOnboardingDependencies = {
  getAuthenticatedUser: () => Promise<AuthenticatedOnboardingUser>;
  updateStatus: (status: AccommodationOnboardingStatus) => Promise<StatusUpdateResult>;
  seedPlatform: () => Promise<Record<string, number>>;
  disconnectSeedClient: () => Promise<void>;
  revalidate: () => void;
};

const PERMISSION_MESSAGE = 'You do not have permission to configure this accommodation platform.';
const SUCCESS_MESSAGE = 'Setup complete. Properties, listings, calendars, stays, guests, messages, channels, reviews, and payouts are ready.';

export async function runAccommodationOnboardingWorkflow(
  dependencies: AccommodationOnboardingDependencies,
): Promise<AccommodationOnboardingResult> {
  const user = await dependencies.getAuthenticatedUser();
  if (!user?.id || !user.role?.canManageOnboarding) return { ok: false, message: PERMISSION_MESSAGE };

  const started = await dependencies.updateStatus('in_progress');
  if (!started.ok) return { ok: false, message: started.error };

  try {
    const summary = await dependencies.seedPlatform();
    const completed = await dependencies.updateStatus('completed');
    if (!completed.ok) throw new Error(completed.error);
    dependencies.revalidate();
    return { ok: true, message: SUCCESS_MESSAGE, summary };
  } catch (error) {
    await dependencies.updateStatus('not_started');
    return { ok: false, message: error instanceof Error ? error.message : 'Accommodation setup failed.' };
  } finally {
    await dependencies.disconnectSeedClient();
  }
}
