const allowedStatuses = new Set(['not_started', 'in_progress', 'completed', 'dismissed']);

export async function updateOnboardingStatus(
  _root: unknown,
  args: { status: string },
  context: any,
) {
  const userId = context.session?.itemId;
  if (!userId || context.session?.data?.isActive !== true || !context.session?.data?.role?.canManageOnboarding) {
    throw new Error('You do not have permission to update onboarding.');
  }
  const currentUser = await context.prisma.user.findUnique({ where: { id: userId }, select: { isActive: true } });
  if (currentUser?.isActive !== true) throw new Error('You do not have permission to update onboarding.');
  if (!allowedStatuses.has(args.status)) throw new Error('Onboarding status is invalid.');

  return context.sudo().query.User.updateOne({
    where: { id: userId },
    data: { onboardingStatus: args.status },
    query: 'id onboardingStatus',
  });
}
