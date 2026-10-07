import { assertHostOrganizationAccess } from '../utils/hostOrganizationAccess';

export async function cancelStayQuote(
  _root: unknown,
  args: { quoteId: string },
  context: any,
) {
  const quote = await context.query.StayQuote.findOne({
    where: { id: args.quoteId },
    query: 'id quoteNumber status consumedAt hostOrganization { id }',
  });
  if (!quote?.hostOrganization?.id) throw new Error('Stay quote not found.');
  await assertHostOrganizationAccess({
    context,
    hostOrganizationId: quote.hostOrganization.id,
    permission: 'canManageReservations',
  });

  return context.prisma.$transaction(async (tx: any) => {
    await tx.$queryRawUnsafe('SELECT "id" FROM "StayQuote" WHERE "id" = $1 FOR UPDATE', quote.id);
    const locked = await tx.stayQuote.findUnique({ where: { id: quote.id } });
    if (!locked || locked.status !== 'active' || locked.consumedAt) {
      throw new Error('Only an active, unused stay quote can be cancelled.');
    }
    const cancelled = await tx.stayQuote.updateMany({
      where: { id: locked.id, status: 'active', consumedAt: null },
      data: { status: 'cancelled' },
    });
    if (cancelled.count !== 1) throw new Error('Stay quote changed before it could be cancelled.');
    return { id: locked.id, quoteNumber: locked.quoteNumber, status: 'cancelled' };
  }, { isolationLevel: 'Serializable' });
}
