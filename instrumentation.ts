export async function register() {
  // Background calendar subscriptions run in the Node server only (not edge, tests or build).
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NODE_ENV === 'test' || process.env.NEXT_PHASE === 'phase-production-build') return;
  const [{ keystoneContext }, { startCalendarSubscriptionJobs }] = await Promise.all([
    import('./features/keystone/context'),
    import('./features/keystone/jobs/calendarSubscriptionJobs'),
  ]);
  startCalendarSubscriptionJobs((keystoneContext as any).sudo().prisma);
}
