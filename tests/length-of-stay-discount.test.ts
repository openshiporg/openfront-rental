// Weekly/monthly length-of-stay discounts on the stay quote. Offline.
import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateStayQuote, lengthOfStayDiscountFor } from '../features/keystone/utils/stayPricing';

const base = {
  baseNightlyRateCents: 10_000,
  guestCount: 2,
  maxGuests: 4,
  fees: [{ name: 'Cleaning', feeType: 'cleaning', kind: 'fixed' as const, amountCents: 5_000, taxable: true }],
  taxes: [{ name: 'Lodging tax', rateBasisPoints: 1_000 }],
  weeklyDiscountBasisPoints: 1_000,
  monthlyDiscountBasisPoints: 2_500,
};

test('rule: weekly from 7 nights, monthly from 28 replaces weekly, none below 7', () => {
  assert.equal(lengthOfStayDiscountFor(6, 1000, 2500), null);
  assert.deepEqual(lengthOfStayDiscountFor(7, 1000, 2500), { name: 'Weekly stay discount', basisPoints: 1000 });
  assert.deepEqual(lengthOfStayDiscountFor(28, 1000, 2500), { name: 'Monthly stay discount', basisPoints: 2500 });
  assert.deepEqual(lengthOfStayDiscountFor(30, 1000, 0), { name: 'Weekly stay discount', basisPoints: 1000 });
  assert.equal(lengthOfStayDiscountFor(30, 0, 0), null);
  assert.equal(lengthOfStayDiscountFor(30, 9500, null), null, 'over 90% is ignored');
});

test('a 6-night stay is priced exactly as before, with no discount field', () => {
  const quote = calculateStayQuote({ ...base, checkIn: '2027-03-01', checkOut: '2027-03-07' });
  assert.equal(quote.lodgingSubtotalCents, 60_000);
  assert.equal('lengthOfStayDiscount' in quote, false);
  assert.ok(quote.nights.every((night: any) => !('listAmountCents' in night)));
});

test('a week gets 10% off lodging; nights, tax and total follow the discounted price', () => {
  const quote: any = calculateStayQuote({ ...base, checkIn: '2027-03-01', checkOut: '2027-03-08' });
  assert.equal(quote.lengthOfStayDiscount.amountCents, 7_000);
  assert.equal(quote.lengthOfStayDiscount.listLodgingCents, 70_000);
  assert.equal(quote.lodgingSubtotalCents, 63_000);
  assert.equal(quote.nights.reduce((sum: number, night: any) => sum + night.amountCents, 0), 63_000);
  assert.equal(quote.taxTotalCents, 6_800); // 10% of 63,000 + 5,000 cleaning
  assert.equal(quote.totalAmountCents, 63_000 + 5_000 + 6_800);
});

test('a month gets the monthly rate; uneven nights still sum exactly', () => {
  const quote: any = calculateStayQuote({ ...base, baseNightlyRateCents: 9_999, checkIn: '2027-03-01', checkOut: '2027-03-31' });
  const list = 9_999 * 30;
  assert.equal(quote.lengthOfStayDiscount.name, 'Monthly stay discount');
  assert.equal(quote.lengthOfStayDiscount.amountCents, Math.round(list * 0.25));
  assert.equal(quote.nights.reduce((sum: number, night: any) => sum + night.amountCents, 0), list - quote.lengthOfStayDiscount.amountCents);
  assert.ok(quote.nights.every((night: any) => night.amountCents >= 0));
});
