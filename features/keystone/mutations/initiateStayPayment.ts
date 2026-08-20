import { createManualPaymentIdempotencyKey, validateManualPaymentSession } from '../utils/manualPaymentLifecycle';
import { assertHostOrganizationAccess } from '../utils/hostOrganizationAccess';
import { createPayment } from '../utils/paymentProviderAdapter';

export async function initiateStayPayment(
  _root: unknown,
  args: { reservationId: string; paymentProviderCode?: string | null; amountCents?: number | null },
  context: any,
) {
  const reservation = await context.query.Reservation.findOne({
    where: { id: args.reservationId },
    query: `
      id confirmationCode status totalAmountCents amountPaidCents currencyCode
      hostOrganization { id }
      guest { id name email }
      payments { id amountCents status provider idempotencyKey }
    `,
  });
  if (!reservation?.hostOrganization?.id) throw new Error('Reservation not found.');
  await assertHostOrganizationAccess({ context, hostOrganizationId: reservation.hostOrganization.id, permission: 'canManagePayments' });

  const outstanding = Math.max((reservation.totalAmountCents || 0) - (reservation.amountPaidCents || 0), 0);
  const amountCents = args.amountCents ?? outstanding;
  if (outstanding <= 0) throw new Error('Reservation does not have an outstanding balance.');
  validateManualPaymentSession({ amount: amountCents, outstanding });

  const providerCode = args.paymentProviderCode || 'pp_system_default';
  if (providerCode !== 'pp_system_default') {
    throw new Error('Only the manual payment provider is enabled.');
  }
  const idempotencyKey = createManualPaymentIdempotencyKey({
    reservationId: reservation.id,
    amount: amountCents,
    currencyCode: reservation.currencyCode || 'USD',
  });
  const existing = reservation.payments?.find((payment: any) => payment.idempotencyKey === idempotencyKey
    && ['pending', 'processing', 'succeeded'].includes(payment.status));
  if (existing) {
    return context.sudo().query.Payment.findOne({
      where: { id: existing.id },
      query: 'id amountCents status provider providerPaymentId idempotencyKey data currencyCode',
    });
  }

  const providers = await context.sudo().query.PaymentProvider.findMany({
    where: {
      code: { equals: providerCode },
      hostOrganization: { id: { equals: reservation.hostOrganization.id } },
    },
    take: 1,
    query: 'id name code isInstalled',
  });
  const provider = providers[0] || await context.sudo().query.PaymentProvider.createOne({
    data: {
      hostOrganization: { connect: { id: reservation.hostOrganization.id } },
      name: 'Manual payment',
      code: providerCode,
      isInstalled: true,
      metadata: { mode: 'operator_only', secrets: 'environment-only' },
    },
    query: 'id name code isInstalled',
  });
  const sessionData = await createPayment({
    provider,
    reservation,
    amount: amountCents,
    currency: (reservation.currencyCode || 'USD').toLowerCase(),
  });

  return context.prisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `payment-init:${idempotencyKey}`);
    const existingPayment = await tx.payment.findUnique({ where: { idempotencyKey } });
    if (existingPayment) return existingPayment;
    return tx.payment.create({
      data: {
        hostOrganizationId: reservation.hostOrganization.id,
        reservationId: reservation.id,
        guestId: reservation.guest?.id || null,
        paymentProviderId: provider.id,
        amountCents,
        currencyCode: reservation.currencyCode || 'USD',
        status: 'pending',
        paymentMethod: 'manual',
        provider: providerCode,
        providerPaymentId: idempotencyKey,
        idempotencyKey,
        data: { ...(sessionData.data || sessionData), idempotencyKey, scope: 'manual-only' },
      },
    });
  }, { maxWait: 5000, timeout: 10000, isolationLevel: 'ReadCommitted' });
}
