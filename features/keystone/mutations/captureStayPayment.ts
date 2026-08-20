import { assertCaptureTransition } from '../utils/manualPaymentLifecycle';
import { assertHostOrganizationAccess } from '../utils/hostOrganizationAccess';
import { capturePayment } from '../utils/paymentProviderAdapter';
import { settleSucceededPayment } from '../utils/paymentSettlement';

export async function captureStayPayment(_root: unknown, args: { paymentId: string }, context: any) {
  const payment = await context.query.Payment.findOne({
    where: { id: args.paymentId },
    query: `
      id amountCents status provider providerPaymentId currencyCode data
      hostOrganization { id }
      paymentProvider { id code isInstalled }
      reservation { id status paymentStatus totalAmountCents amountPaidCents }
    `,
  });
  if (!payment?.hostOrganization?.id) throw new Error('Payment not found.');
  await assertHostOrganizationAccess({ context, hostOrganizationId: payment.hostOrganization.id, permission: 'canManagePayments' });
  const transition = assertCaptureTransition(payment.status);
  if (transition === 'already_succeeded') return payment;
  if (payment.provider !== 'pp_system_default' || payment.paymentProvider?.code !== 'pp_system_default') {
    throw new Error('Only manual payment capture is enabled.');
  }
  if (!payment.paymentProvider?.isInstalled) throw new Error('Payment provider is not available for capture.');

  const captureResult = await capturePayment({
    provider: payment.paymentProvider,
    paymentId: payment.providerPaymentId || payment.id,
    amount: payment.amountCents,
  });
  const processedAt = new Date();
  await context.prisma.$transaction(
    (tx: any) => settleSucceededPayment(tx, {
      paymentId: payment.id,
      expectedAmountCents: payment.amountCents,
      expectedCurrencyCode: payment.currencyCode,
      evidence: { kind: 'operator_manual_capture', capture: captureResult?.data || captureResult },
      processedAt,
    }),
    { maxWait: 5000, timeout: 10000, isolationLevel: 'ReadCommitted' },
  );
  return context.sudo().query.Payment.findOne({
    where: { id: payment.id },
    query: 'id amountCents status provider providerPaymentId currencyCode processedAt data',
  });
}
