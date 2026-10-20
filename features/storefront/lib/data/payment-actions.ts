'use server';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';

export async function prepareStayCardPayment(tripToken: string) {
  const response = await keystoneClient<any>(`mutation StartGuestStayPayment($tripToken: String!) {
    startGuestStayPayment(tripToken: $tripToken)
  }`, { tripToken });
  if (!response.success) return { error: 'We couldn’t prepare your card payment. Your booking is saved. Try again or contact your host before choosing another payment method.' };
  return response.data.startGuestStayPayment;
}

export async function verifyStayCardPayment(tripToken: string, paymentId: string) {
  const response = await keystoneClient<any>(`mutation CompleteGuestStayPayment($tripToken: String!, $paymentId: ID!) {
    completeGuestStayPayment(tripToken: $tripToken, paymentId: $paymentId)
  }`, { tripToken, paymentId });
  if (!response.success) return { error: 'We couldn’t confirm your payment yet. Check again before making another payment.' };
  return response.data.completeGuestStayPayment;
}
