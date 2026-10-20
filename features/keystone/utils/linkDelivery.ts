/**
 * Delivery state for an emailed private link (trip recovery, a reissued conversation link).
 * The state is written before sending and settled after, against its own attempt id, so a
 * crash, a failed send or an unknown outcome is recorded and recoverable. No link is stored.
 */

// A link is emailed at most once per cooldown; a repeated request neither rotates the link
// just emailed nor sends another. A definite mail-server rejection can be retried sooner.
// "accepted" means the mail server took the message, never that it was delivered.
const LINK_EMAIL_COOLDOWN_MS = 15 * 60 * 1000;
const LINK_EMAIL_RETRY_AFTER_FAILURE_MS = 2 * 60 * 1000;

export type LinkDelivery = {
  attemptId: string;
  purpose: string;
  channel: 'email';
  status: 'sending' | 'accepted' | 'failed' | 'unknown';
  requestedAt: string;
  settledAt?: string;
};

/** A definite rejection by the mail server (as opposed to a timeout or an unknown outcome). */
export function mailDefinitelyRejected(error: any) {
  const code = Number(error?.responseCode);
  return (Number.isInteger(code) && code >= 500 && code < 600) || error?.code === 'EENVELOPE';
}

export function linkEmailCoolingDown(delivery: any, now: number) {
  const requestedAt = Date.parse(delivery?.requestedAt || '');
  if (!delivery || !Number.isFinite(requestedAt)) return false;
  const wait = delivery.status === 'failed' ? LINK_EMAIL_RETRY_AFTER_FAILURE_MS : LINK_EMAIL_COOLDOWN_MS;
  return ['sending', 'accepted', 'unknown', 'failed'].includes(delivery.status) && now - requestedAt < wait;
}
