import crypto from 'node:crypto';

import { resolveSessionSecret } from './runtimeSecrets';

/**
 * Subscribable availability feed (Airbnb/Vrbo/Google "import calendar by URL"): one secret URL
 * per listing. The key is an HMAC of the listing id under the server secret, so it needs no
 * stored state, can't be guessed, and the feed only reveals busy/free nights (no guest data).
 */
const FEED_PURPOSE = 'listing-ical-feed:v1';

export function calendarFeedKey(listingId: string, secret = resolveSessionSecret()) {
  return crypto.createHmac('sha256', secret).update(`${FEED_PURPOSE}:${listingId}`).digest('base64url').slice(0, 32);
}

export function calendarFeedKeyMatches(listingId: string, key: string, secret = resolveSessionSecret()) {
  if (!/^[A-Za-z0-9_-]{32}$/.test(key)) return false;
  const expected = Buffer.from(calendarFeedKey(listingId, secret));
  const given = Buffer.from(key);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

export function calendarFeedPath(listingId: string, secret?: string) {
  return `/api/calendar/${encodeURIComponent(listingId)}/${calendarFeedKey(listingId, secret)}.ics`;
}
