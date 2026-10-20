import crypto from 'node:crypto';

import { resolveSessionSecret } from '../lib/runtimeSecrets';

/**
 * Find-my-trip risk controls. Failures are counted per requesting network and per network
 * plus email, never per email alone and never globally: someone guessing against a guest's
 * email, or flooding from many networks, brakes only their own networks, so a guest proving
 * their code and email from their own network is never locked out (with or without email).
 *
 * The storefront server signs the network label for each request (`signRecoveryNetwork`).
 * Requests without a valid label share one unverified bucket. Counters are bounded and
 * process-local: they reset on restart and aren't shared between processes, which is a
 * stated limit of this brake, not a guarantee.
 */
const WINDOW_MS = 15 * 60 * 1000;
const NETWORK_MAX_FAILURES = 20;
const NETWORK_EMAIL_MAX_FAILURES = 5;
const MAX_TRACKED = 20_000;
const PROOF_MAX_AGE_MS = 2 * 60 * 1000;
export const UNVERIFIED_NETWORK = 'unverified';

type Counter = { count: number; resetAt: number };
const counters = new Map<string, Counter>();

function mac(value: string) {
  return crypto.createHmac('sha256', resolveSessionSecret()).update(value).digest('hex');
}

/** A short-lived label for a client address, signed by this deployment. The address never leaves the server. */
export function signRecoveryNetwork(address: string, now = Date.now()) {
  const network = mac(`recovery-network:${address || 'unknown'}`).slice(0, 24);
  const issuedAt = now.toString(36);
  return `${network}.${issuedAt}.${mac(`recovery-network-proof:${network}:${issuedAt}`).slice(0, 32)}`;
}

/** The verified network label, or the shared unverified bucket. */
export function verifiedRecoveryNetwork(proof: unknown, now = Date.now()) {
  if (typeof proof !== 'string') return UNVERIFIED_NETWORK;
  const [network, issuedAt, signature] = proof.split('.');
  if (!/^[a-f0-9]{24}$/.test(network || '') || !/^[a-z0-9]{1,12}$/.test(issuedAt || '') || !/^[a-f0-9]{32}$/.test(signature || '')) return UNVERIFIED_NETWORK;
  const issued = parseInt(issuedAt, 36);
  if (!Number.isFinite(issued) || issued > now + 5000 || now - issued > PROOF_MAX_AGE_MS) return UNVERIFIED_NETWORK;
  const expected = Buffer.from(mac(`recovery-network-proof:${network}:${issuedAt}`).slice(0, 32));
  const supplied = Buffer.from(signature);
  return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied) ? network : UNVERIFIED_NETWORK;
}

function keyFor(kind: 'network' | 'pair', network: string, email = '') {
  return mac(`recovery-counter:${kind}:${network}:${email}`).slice(0, 32);
}

function current(key: string, now: number) {
  const entry = counters.get(key);
  return entry && entry.resetAt > now ? entry.count : 0;
}

export function recoveryBraked(network: string, email: string, now = Date.now()) {
  return current(keyFor('network', network), now) >= NETWORK_MAX_FAILURES
    || current(keyFor('pair', network, email), now) >= NETWORK_EMAIL_MAX_FAILURES;
}

export function recordRecoveryFailure(network: string, email: string, now = Date.now()) {
  if (counters.size > MAX_TRACKED) {
    for (const [key, entry] of counters) if (entry.resetAt <= now) counters.delete(key);
    if (counters.size > MAX_TRACKED) counters.clear();
  }
  for (const key of [keyFor('network', network), keyFor('pair', network, email)]) {
    const entry = counters.get(key);
    if (!entry || entry.resetAt <= now) counters.set(key, { count: 1, resetAt: now + WINDOW_MS });
    else entry.count += 1;
  }
}
