export async function createPaymentFunction({ reservation, amount, currency }: { reservation: any; amount: number; currency: string }) {
  const providerPaymentId = `manual_${reservation?.confirmationCode || reservation?.id || Date.now()}`;
  return {
    status: 'pending',
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
  return { status: 'captured', amount, data: { paymentId, status: 'captured', amount, capturedAt: new Date().toISOString() } };
}

export async function refundPaymentFunction({ paymentId, amount }: { paymentId: string; amount: number }) {
  return { status: 'refunded', amount, data: { paymentId, status: 'refunded', amount, refundedAt: new Date().toISOString() } };
}

export async function getPaymentStatusFunction({ paymentId }: { paymentId: string }) {
  return { status: 'pending', data: { paymentId, status: 'pending' } };
}

export async function generatePaymentLinkFunction() {
  return null;
}
