import assert from 'node:assert/strict';
import test from 'node:test';
import { GraphQLError } from 'graphql';

import { guestFacing, GUEST_REQUEST_REFUSED } from './guestRequestError';
import { guestQuoteRefusal } from '../../storefront/lib/public-token-copy';

test('a refusal written for guests reaches them with its reason', async () => {
  const quote = guestFacing(async () => { throw new Error('This listing requires a minimum stay of 3 nights for the selected dates.'); });
  await assert.rejects(quote(), (error: unknown) => error instanceof GraphQLError
    && error.message === 'This listing requires a minimum stay of 3 nights for the selected dates.'
    && error.extensions.code === GUEST_REQUEST_REFUSED);
});

test('database internals stay masked', async () => {
  const internal = new Error('Invalid `prisma.reservation.create()` invocation');
  const book = guestFacing(async () => { throw internal; });
  await assert.rejects(book(), (error: unknown) => error === internal);
});

test('the booking panel shows only known quote refusals from the URL', () => {
  assert.equal(guestQuoteRefusal('This home sleeps up to 8 guests.'), 'This home sleeps up to 8 guests.');
  assert.equal(guestQuoteRefusal('Call 555-0100 for a discount'), null);
  assert.equal(guestQuoteRefusal(undefined), null);
});
