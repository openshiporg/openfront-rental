import assert from 'node:assert/strict';
import { test } from 'node:test';

import { calendarFeedKey, calendarFeedKeyMatches, calendarFeedPath } from '../features/keystone/lib/calendarFeed';
import { calendarUrlProblem, fetchSubscribedCalendar, isPublicAddress } from '../features/keystone/lib/calendarSubscription';

const SECRET = 'x'.repeat(40);

test('feed keys are per listing, stable, and verified in constant time', () => {
  const key = calendarFeedKey('listing_a', SECRET);
  assert.equal(key.length, 32);
  assert.equal(calendarFeedKey('listing_a', SECRET), key);
  assert.notEqual(calendarFeedKey('listing_b', SECRET), key);
  assert.equal(calendarFeedKeyMatches('listing_a', key, SECRET), true);
  assert.equal(calendarFeedKeyMatches('listing_b', key, SECRET), false);
  assert.equal(calendarFeedKeyMatches('listing_a', key.slice(0, 31), SECRET), false);
  assert.equal(calendarFeedKeyMatches('listing_a', calendarFeedKey('listing_a', 'y'.repeat(40)), SECRET), false);
  assert.match(calendarFeedPath('listing_a', SECRET), /^\/api\/calendar\/listing_a\/[A-Za-z0-9_-]{32}\.ics$/);
});

test('calendar links must be public https URLs', () => {
  assert.equal(calendarUrlProblem('https://www.airbnb.com/calendar/ical/123.ics?s=abc'), null);
  assert.match(String(calendarUrlProblem('http://www.airbnb.com/x.ics')), /https/);
  assert.match(String(calendarUrlProblem('https://127.0.0.1/x.ics')), /public host/);
  assert.match(String(calendarUrlProblem('https://[::1]/x.ics')), /public host/);
  assert.match(String(calendarUrlProblem('https://localhost/x.ics')), /public host/);
  assert.match(String(calendarUrlProblem('https://db.railway.internal/x.ics')), /public host/);
  assert.match(String(calendarUrlProblem('https://user:pw@example.com/x.ics')), /username/);
  assert.match(String(calendarUrlProblem('https://example.com:8443/x.ics')), /port/);
  assert.match(String(calendarUrlProblem('not a url')), /full calendar link/);
});

test('private and loopback addresses are never fetched', () => {
  for (const address of ['10.0.0.1', '127.0.0.1', '169.254.169.254', '172.16.5.4', '192.168.1.1', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1']) {
    assert.equal(isPublicAddress(address), false, address);
  }
  for (const address of ['8.8.8.8', '54.230.1.1', '2606:4700::1111']) assert.equal(isPublicAddress(address), true, address);
});

test('fetch refuses redirects and oversize bodies', async () => {
  const redirecting = (async () => new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/' } })) as unknown as typeof fetch;
  await assert.rejects(fetchSubscribedCalendar('https://example.com/cal.ics', redirecting), /redirected/);
  const huge = (async () => new Response('x'.repeat(1_000_001))) as unknown as typeof fetch;
  await assert.rejects(fetchSubscribedCalendar('https://example.com/cal.ics', huge), /too large/);
  const ok = (async () => new Response('BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n')) as unknown as typeof fetch;
  assert.match(await fetchSubscribedCalendar('https://example.com/cal.ics', ok), /BEGIN:VCALENDAR/);
});
