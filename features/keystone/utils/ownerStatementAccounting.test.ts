import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOwnerStatement } from './ownerStatementAccounting';

const stay = (id: string, status: string, amountPaidCents: number) => ({
  id, confirmationCode: `STAY-${id}`, propertyId: 'p1', status, source: 'direct', checkInDate: '2026-10-05', checkOutDate: '2026-10-08', currencyCode: 'USD',
  lodgingSubtotalCents: 30000, feeTotalCents: 5000, taxTotalCents: 3000, discountTotalCents: 0, totalAmountCents: 38000, amountPaidCents,
});

test('a confirmed stay counts on the owner statement only once fully paid; unpaid ones are listed with their balance', () => {
  const statement = buildOwnerStatement({
    ownerId: 'o1', propertyAssignments: [{ propertyId: 'p1', ownershipBasisPoints: 10000, managerCommissionBasisPoints: 1000 }],
    periodStart: '2026-10-01', periodEnd: '2026-11-01', currencyCode: 'USD',
    reservations: [stay('paid', 'confirmed', 38000), stay('part', 'confirmed', 10000), stay('done', 'completed', 0)],
    refunds: [], payouts: [], adjustments: [],
  });
  assert.deepEqual(statement.reservationIds.sort(), ['done', 'paid']);
  assert.equal(statement.grossRevenueCents, 70000);
  assert.equal(statement.managerCommissionCents, 7000);
  assert.deepEqual(statement.exceptions, [{ type: 'unpaid_stay', reservationId: 'part', confirmationCode: 'STAY-part', balanceCents: 28000 }]);
});
