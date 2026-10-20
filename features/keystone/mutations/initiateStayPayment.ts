import crypto from 'node:crypto';

import { manualPaymentOperationKey, validateManualPaymentSession } from '../utils/manualPaymentLifecycle';
import { assertHostOrganizationAccess } from '../utils/hostOrganizationAccess';
import { createPayment } from '../utils/paymentProviderAdapter';
import { reconcileReservationPaymentEvidence, reservationPaymentStatus, unreservedReservationBalance } from '../utils/paymentReconciliation';

export async function initiateStayPayment(
  _root: unknown,
  args: { reservationId: string; paymentProviderCode?: string | null; amountCents?: number | null; operationKey?: string | null },
  context: any,
) {
  const reservation = await context.query.Reservation.findOne({
    where: { id: args.reservationId },
    query: 'id hostOrganization { id }',
  });
  if (!reservation?.hostOrganization?.id) throw new Error('Reservation not found.');
  await assertHostOrganizationAccess({ context, hostOrganizationId: reservation.hostOrganization.id, permission: 'canManagePayments' });

  const providerCode = args.paymentProviderCode || 'pp_system_default';
  if (providerCode !== 'pp_system_default') {
    throw new Error('Only the manual payment provider is enabled.');
  }

  return context.prisma.$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `reservation:${args.reservationId}`);
    await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', args.reservationId);
    const locked = await tx.reservation.findUnique({
      where: { id: args.reservationId },
      select: {
        id: true,
        hostOrganizationId: true,
        confirmationCode: true,
        status: true,
        totalAmountCents: true,
        amountPaidCents: true,
        currencyCode: true,
        guestId: true,
        testMode: true,
        fixtureOrigin: true,
      },
    });
    if (!locked?.hostOrganizationId || locked.hostOrganizationId !== reservation.hostOrganization.id) throw new Error('Reservation not found.');
    // Exact replay first: a lost response for a receipt this submission already created returns
    // that receipt, even if the stay was cancelled or refunded since. Idempotency is per submitted
    // operation, not per amount, and the submission's identity is required (never invented here).
    const idempotencyKey = manualPaymentOperationKey({ reservationId: locked.id, operationKey: String(args.operationKey || '') });
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify({ reservationId: locked.id, providerCode, amountCents: args.amountCents ?? null })).digest('hex');
    const replay = await tx.payment.findUnique({ where: { idempotencyKey } });
    if (replay) {
      const recorded = replay.data && typeof replay.data === 'object' ? (replay.data as any).requestFingerprint : undefined;
      if (replay.reservationId !== locked.id || (recorded ? recorded !== fingerprint : args.amountCents != null && replay.amountCents !== args.amountCents)) {
        throw new Error('This payment operation was already used for a different payment.');
      }
      return replay;
    }
    // A test booking is simulated: real money is never recorded against it.
    if (locked.testMode) throw new Error('This is a test booking. Real payments can’t be recorded against it.');
    // A setup sample isn't a real stay either: real money for a real guest belongs on a real booking.
    if (locked.fixtureOrigin) throw new Error('This is a setup sample stay. Real payments can’t be recorded against it; book the guest as a real stay.');
    if (!['pending', 'confirmed', 'in_stay', 'completed'].includes(locked.status || '')) {
      throw new Error('Manual payment cannot be initiated for a cancelled or no-show reservation.');
    }

    const [payments, refunds] = await Promise.all([
      tx.payment.findMany({
        where: { reservationId: locked.id },
        select: { id: true, status: true, amountCents: true, refundedAmountCents: true, currencyCode: true, provider: true, data: true },
      }),
      tx.refund.findMany({
        where: { reservationId: locked.id },
        select: { id: true, paymentId: true, status: true, amountCents: true, currencyCode: true },
      }),
    ]);
    const reconciliation = reconcileReservationPaymentEvidence({ payments, refunds, currencyCode: locked.currencyCode || 'USD', testMode: locked.testMode === true });
    if (reconciliation.openRefundCents > 0) throw new Error('Resolve open refund liabilities before initiating another payment.');
    const outstanding = unreservedReservationBalance({
      totalAmountCents: locked.totalAmountCents || 0,
      netPaidCents: reconciliation.netPaidCents,
      pendingTenderCents: reconciliation.pendingTenderCents,
    });
    const amountCents = args.amountCents ?? outstanding;
    if (outstanding <= 0) throw new Error('Reservation has no unreserved outstanding balance.');
    validateManualPaymentSession({ amount: amountCents, outstanding });
    if ((locked.amountPaidCents || 0) !== reconciliation.netPaidCents) {
      await tx.reservation.update({
        where: { id: locked.id },
        data: {
          amountPaidCents: reconciliation.netPaidCents,
          paymentStatus: reservationPaymentStatus({ ...reconciliation, totalAmountCents: locked.totalAmountCents || 0 }),
        },
      });
    }
    const provider = await tx.paymentProvider.findFirst({
      where: { code: providerCode, hostOrganizationId: locked.hostOrganizationId },
      select: { id: true, name: true, code: true, isInstalled: true },
    }) || await tx.paymentProvider.create({
      data: {
        hostOrganizationId: locked.hostOrganizationId,
        name: 'Manual payment',
        code: providerCode,
        isInstalled: true,
        metadata: { mode: 'operator_only', secrets: 'environment-only' },
      },
      select: { id: true, name: true, code: true, isInstalled: true },
    });
    if (!provider.isInstalled) throw new Error('Payment provider is not available.');
    // The manual registry entry only creates local payment instructions. Real
    // provider calls stay unavailable until they have an external saga boundary.
    const sessionData = await createPayment({
      provider,
      reservation: { id: locked.id, confirmationCode: locked.confirmationCode },
      amount: amountCents,
      currency: (locked.currencyCode || 'USD').toLowerCase(),
    });
    return tx.payment.create({
      data: {
        hostOrganizationId: locked.hostOrganizationId,
        reservationId: locked.id,
        guestId: locked.guestId,
        paymentProviderId: provider.id,
        amountCents,
        currencyCode: locked.currencyCode || 'USD',
        status: 'pending',
        paymentMethod: 'manual',
        provider: providerCode,
        providerPaymentId: idempotencyKey,
        idempotencyKey,
        data: { ...(sessionData.data || sessionData), idempotencyKey, requestFingerprint: fingerprint, scope: 'manual-only' },
      },
    });
  }, { maxWait: 5000, timeout: 10000, isolationLevel: 'ReadCommitted' });
}
