export async function createPaymentFunction({ reservation, amount, currency }: { reservation: { id: string; confirmationCode?: string | null }; amount: number; currency: string }) {
  const providerPaymentId = `manual_${reservation?.confirmationCode || reservation?.id || Date.now()}`;
  return {
    status: 'pending' as const,
    providerPaymentId,
    data: {
      providerPaymentId,
      status: 'pending',
      amount,
      currency: currency.toLowerCase(),
      reservationId: reservation?.id,
      confirmationCode: reservation?.confirmationCode,
      instructions: 'Record the offline payment. External card providers remain disabled until signed webhook and secret-storage work is complete.',
    },
  };
}

export async function capturePaymentFunction({ paymentId, amount }: { paymentId: string; amount: number }) {
  return { status: 'captured' as const, amount, data: { paymentId, status: 'captured', amount, capturedAt: new Date().toISOString() } };
}

export async function refundPaymentFunction({ paymentId, amount }: { paymentId: string; amount: number }) {
  return {
    status: 'pending' as const,
    amount,
    data: {
      paymentId,
      status: 'pending',
      amount,
      mode: 'manual',
      instructions: 'This adapter does not transfer funds. Record a refund liability, then reconcile only after an operator confirms the external or cash refund has already been completed.',
    },
  };
}

export async function getPaymentStatusFunction({ paymentId }: { paymentId: string }) {
  return { status: 'pending' as const, data: { paymentId, status: 'pending' } };
}

export async function generatePaymentLinkFunction() {
  return null;
}
