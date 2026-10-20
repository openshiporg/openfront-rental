import { headers } from 'next/headers';

import { signRecoveryNetwork } from '@/features/keystone/utils/recoveryRisk';

/**
 * The requesting network as this deployment's proxy saw it (its own `x-real-ip`, or the
 * address it appended last to `x-forwarded-for`), signed for recovery throttling. Assumes
 * one trusted proxy in front of the app; the raw address is never sent onward.
 */
export async function signedClientNetwork() {
  const list = await headers();
  const forwarded = (list.get('x-forwarded-for') || '').split(',').map((part) => part.trim()).filter(Boolean);
  const address = list.get('x-real-ip')?.trim() || forwarded.at(-1) || 'unknown';
  return signRecoveryNetwork(address.slice(0, 100));
}
