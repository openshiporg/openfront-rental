'use client';

import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { prepareStayCardPayment, verifyStayCardPayment } from '../lib/data/payment-actions';
import { storefrontAccentHex, storefrontInkHex } from '../lib/brand-color';
import { formatMoney } from '../lib/format';
import { useStorefrontLocale } from './StorefrontLocale';

/** Card entry follows the saved logo colour, read from the storefront's --stay-brand-hue. */
function brandAppearance(element: HTMLElement | null) {
  const root = element?.closest('.stay-root') as HTMLElement | null;
  const hue = Number(root ? getComputedStyle(root).getPropertyValue('--stay-brand-hue') : NaN);
  const brandHue = Number.isFinite(hue) ? hue : 155;
  return {
    theme: 'stripe' as const,
    variables: { colorPrimary: storefrontAccentHex(brandHue), colorText: storefrontInkHex(brandHue), colorBackground: '#ffffff', colorDanger: '#a3352c', borderRadius: '8px', fontFamily: 'system-ui, sans-serif' },
  };
}

function CardForm({ amountCents, currencyCode, tripPath, paymentId, onVerify }: {
  amountCents: number; currencyCode: string; tripPath: string; paymentId: string; onVerify: (id: string) => Promise<void>;
}) {
  const locale = useStorefrontLocale();
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  return <form className="stay-form" aria-busy={busy} onSubmit={async event => {
    event.preventDefault();
    if (!stripe || !elements || busy) return;
    setBusy(true); setError('');
    try {
      const returnUrl = new URL(tripPath, window.location.origin);
      returnUrl.searchParams.set('payment_return', paymentId);
      returnUrl.hash = 'payment';
      const result = await stripe.confirmPayment({ elements, confirmParams: { return_url: returnUrl.toString() }, redirect: 'if_required' });
      if (result.error) setError(result.error.message || 'Your card payment could not be completed. Check your card details and try again.');
      else await onVerify(paymentId);
    } catch { setError('We couldn’t confirm the payment. Check your trip before paying again.'); }
    finally { setBusy(false); }
  }}>
    <PaymentElement options={{ layout: 'tabs' }} onReady={() => setReady(true)} onLoadError={() => setError('Card entry could not load. Refresh this page to try again.')} />
    {error ? <p className="stay-alert stay-alert-danger" role="alert">{error}</p> : null}
    <button className="stay-button stay-button-block" disabled={!stripe || !elements || !ready || busy} type="submit">{busy ? 'Paying…' : `Pay ${formatMoney(locale, amountCents, currencyCode)} (test)`}</button>
    <p className="stay-form-note" role="status">{busy ? 'Keep this page open while we confirm your payment.' : 'Test mode: use a Stripe test card. No real money is charged. Any security deposit is arranged separately with your host.'}</p>
  </form>;
}

export function StayCardPayment({ token, tripPath, amountCents, currencyCode, autoStart, returnPaymentId }: {
  token: string; tripPath: string; amountCents: number; currencyCode: string; autoStart: boolean; returnPaymentId: string;
}) {
  const locale = useStorefrontLocale();
  const [session, setSession] = useState<any>(null);
  const [phase, setPhase] = useState<'idle' | 'loading' | 'ready' | 'verifying' | 'attention' | 'paid'>('idle');
  const [error, setError] = useState('');
  const lastPayment = useRef(returnPaymentId);
  const initiated = useRef(false);
  const container = useRef<HTMLDivElement>(null);
  const stripe = useMemo(() => session?.publishableKey ? loadStripe(session.publishableKey) : null, [session?.publishableKey]);
  const verify = useCallback(async (paymentId: string) => {
    lastPayment.current = paymentId;
    setPhase('verifying'); setError('');
    try {
      const result = await verifyStayCardPayment(token, paymentId);
      if (result.status === 'paid' || result.status === 'received') {
        setPhase('paid');
        // A fresh document guarantees the receipt and balance reflect server settlement.
        window.location.replace(`${tripPath}${tripPath.includes('?') ? '&' : '?'}paid=1#payment`);
      } else {
        setPhase('attention');
        setError(result.error || (result.status === 'processing' ? 'Your payment is processing. Check again shortly; please don’t pay again.' : 'Your payment has not completed. You can check again or retry with the same card payment.'));
      }
    } catch { setPhase('attention'); setError('We couldn’t confirm your payment yet. Check again before paying again.'); }
  }, [token, tripPath]);
  const prepare = useCallback(async () => {
    setPhase('loading'); setError('');
    try {
      const result = await prepareStayCardPayment(token);
      if (result.error) { setError(result.error); setPhase('attention'); return; }
      if (result.status === 'paid') { setPhase('paid'); window.location.replace(`${tripPath}#payment`); return; }
      if (result.status === 'verifying') { await verify(result.paymentId); return; }
      if (!result.clientSecret || !result.publishableKey || !Number.isSafeInteger(result.amountCents) || !result.currencyCode) throw new Error('Card payment unavailable');
      setSession(result); lastPayment.current = result.paymentId; setPhase('ready');
    } catch { setError('Card payment is unavailable right now. Your booking is saved; try again shortly.'); setPhase('attention'); }
  }, [token, tripPath, verify]);
  useEffect(() => {
    // Never keep Stripe client secrets in the address bar or saved trip link.
    if (window.location.search.includes('payment_intent')) {
      const clean = new URL(window.location.href);
      ['payment_intent', 'payment_intent_client_secret', 'redirect_status'].forEach(key => clean.searchParams.delete(key));
      window.history.replaceState(null, '', clean);
    }
    if (initiated.current) return;
    initiated.current = true;
    if (returnPaymentId) void verify(returnPaymentId);
    else if (autoStart) void prepare();
  }, [autoStart, returnPaymentId, prepare, verify]);

  const tenderChanged = session && (session.amountCents !== amountCents || session.currencyCode !== currencyCode);
  return <div className="stay-card-payment" ref={container}>
    <h3>Pay by card (test mode)</h3>
    {phase === 'paid' ? <p className="stay-alert stay-alert-ok" role="status">Test payment recorded. No real money was charged.</p> : null}
    {phase === 'loading' || phase === 'verifying' ? <p role="status" className="stay-form-note">{phase === 'loading' ? 'Preparing secure card entry…' : 'Confirming your payment…'}</p> : null}
    {error ? <p className="stay-alert stay-alert-danger" role="alert">{error}</p> : null}
    {phase === 'ready' && session && tenderChanged ? <p className="stay-alert" role="status">The amount due changed to {formatMoney(locale, session.amountCents, session.currencyCode)} since this page loaded. Check it before you pay.</p> : null}
    {phase === 'ready' && session && stripe ? <Elements stripe={stripe} options={{ clientSecret: session.clientSecret, appearance: brandAppearance(container.current) }}><CardForm amountCents={session.amountCents} currencyCode={session.currencyCode} tripPath={tripPath} paymentId={session.paymentId} onVerify={verify} /></Elements> : null}
    {phase === 'idle' ? <button type="button" className="stay-button" onClick={prepare}>Continue to test card payment</button> : null}
    {phase === 'attention' ? <div className="stay-form-grid">
      {lastPayment.current ? <button type="button" className="stay-button" onClick={() => verify(lastPayment.current)}>Check payment again</button> : null}
      <button type="button" className="stay-button stay-button-quiet" onClick={prepare}>{lastPayment.current ? 'Return to card entry' : 'Try card payment again'}</button>
    </div> : null}
  </div>;
}
