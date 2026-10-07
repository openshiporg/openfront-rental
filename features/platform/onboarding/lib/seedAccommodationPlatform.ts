import { getCustomSetupConfiguration, type AccommodationSeed } from '../utils/dataUtils';
import { rentalOnboardingPlan } from './rentalOnboardingPlan';
import { rentalOnboarding, resolveRentalOnboardingSeed, type RentalOnboardingInput } from '@/features/keystone/onboarding/rentalOnboarding';

// CLI compatibility entrypoint. The dashboard and CLI now use the same authorized,
// per-item create/reuse backend; the previous bulk-upsert implementation is archived.
let contextPromise: Promise<any> | undefined;
async function runtimeContext() {
  if (!contextPromise) contextPromise = (async () => {
    const [{ getContext }, PrismaModule, { default: config }] = await Promise.all([
      import('@keystone-6/core/context'), import('@prisma/client'), import('../../../../keystone'),
    ]);
    return getContext(config, PrismaModule);
  })();
  return contextPromise;
}

export async function resolveRuntimeOnboardingUserId() {
  const context = await runtimeContext();
  const user = await context.prisma.user.findFirst({ where: { isActive: true, role: { canManageOnboarding: true } }, orderBy: { createdAt: 'asc' }, select: { id: true } });
  if (!user) throw new Error('Create an active onboarding administrator through the dashboard first.');
  return user.id as string;
}

export async function seedAccommodationPlatform(seedInput: unknown, onboardingUserId: string) {
  const base = await runtimeContext();
  const user = await base.prisma.user.findUnique({ where: { id: onboardingUserId }, include: { role: true } });
  if (!user?.isActive || !user.role?.canManageOnboarding) throw new Error('Onboarding permission required.');
  const context = base.withSession({ itemId: user.id, listKey: 'User', data: { name: user.name, isActive: user.isActive, role: user.role } });
  const template = (seedInput as AccommodationSeed | undefined)?.onboardingTemplate;
  const input: RentalOnboardingInput = !seedInput ? { template: 'full' } : template === 'minimal' || template === 'full' ? { template } : { template: 'custom', customConfiguration: getCustomSetupConfiguration(seedInput as AccommodationSeed) };
  const seed = resolveRentalOnboardingSeed(input);
  for (const operation of rentalOnboardingPlan(seed)) await rentalOnboarding(null, { input, operationId: operation.id, mode: 'create' }, context);
  await rentalOnboarding(null, { input, mode: 'complete' }, context);
  return { properties: seed.properties.length, listings: seed.properties.length, amenities: seed.amenities.length, reservations: seed.reservations.length };
}

export async function disconnectAccommodationSeedClient() {
  if (contextPromise) { const context = await contextPromise; await context.prisma.$disconnect(); contextPromise = undefined; }
}
