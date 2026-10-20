import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';

import { keystoneClient } from '@/features/dashboard/lib/keystoneClient';

/**
 * The checkout's receipt key, kept in an HttpOnly cookie for this one quote before the
 * booking is submitted. It holds only a random key (no guest details), so after a lost
 * response or a refresh this browser can recover the same booking for 24 hours.
 */
const RECEIPT_KEY = /^[a-f0-9]{48}$/;
const MAX_AGE_SECONDS = 24 * 60 * 60;

function cookieName(quoteToken: string) {
  return `stay-receipt-${createHash('sha256').update(`stay-receipt-cookie:${quoteToken}`).digest('hex').slice(0, 20)}`;
}

export async function readCheckoutReceiptKey(quoteToken: string) {
  if (!quoteToken) return null;
  const value = (await cookies()).get(cookieName(quoteToken))?.value || '';
  return RECEIPT_KEY.test(value) ? value : null;
}

/** The key the checkout page renders: this browser's saved key for the quote, or a new one. */
export async function checkoutReceiptKeyFor(quoteToken: string) {
  return (await readCheckoutReceiptKey(quoteToken)) || randomBytes(24).toString('hex');
}

/** Saves the key before the booking is submitted. An existing key for the quote wins. */
export async function rememberCheckoutReceiptKey(quoteToken: string, submittedKey: string) {
  const saved = await readCheckoutReceiptKey(quoteToken);
  if (saved) return saved;
  if (!RECEIPT_KEY.test(submittedKey)) return null;
  (await cookies()).set(cookieName(quoteToken), submittedKey, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/checkout', maxAge: MAX_AGE_SECONDS,
  });
  return submittedKey;
}

export function receiptPath(receipt: { tripToken: string; agreementToken?: string | null }, extra = '') {
  return `/trips/${receipt.tripToken}?booked=1${receipt.agreementToken ? `&agreement=${receipt.agreementToken}` : ''}${extra}`;
}

/**
 * Receipt of a checkout this browser already completed (lost response, refresh, or an
 * expired quote page within 24 hours). Same key and session only; never a new booking.
 */
export async function recoverCheckoutReceipt(quoteToken: string) {
  const receiptKey = await readCheckoutReceiptKey(quoteToken);
  if (!receiptKey) return null;
  const response = await keystoneClient<any>(`
    mutation RecoverStayCheckout($quoteToken: String!, $receiptKey: String!) {
      recoverStayCheckout(quoteToken: $quoteToken, receiptKey: $receiptKey) { tripToken agreementToken }
    }
  `, { quoteToken, receiptKey });
  const receipt = response.success ? response.data.recoverStayCheckout : null;
  return receipt?.tripToken ? receiptPath(receipt, '&receipt=1') : null;
}
