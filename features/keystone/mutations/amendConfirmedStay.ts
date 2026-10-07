import crypto from 'node:crypto';

import { assertHostOrganizationAccess } from '../utils/hostOrganizationAccess';
import { enqueueOutboxEvent } from '../utils/outbox';
import { reconcileReservationPaymentEvidence, reservationPaymentStatus } from '../utils/paymentReconciliation';
import { findAccommodationUnitCapacityConflict, lockAccommodationUnitCapacity, lockListingCapacity } from '../utils/reservationAllocation';
import { assertStayNotInPast, calculateStayQuote } from '../utils/stayPricing';

const settledPaymentStatuses = ['succeeded', 'partially_refunded', 'refunded'];
const pendingMoneyStatuses = ['pending', 'processing'];

type AmendConfirmedStayArgs = {
  reservationId: string;
  expectedCheckInDate: string;
  expectedCheckOutDate: string;
  checkInDate: string;
  checkOutDate: string;
  reason: string;
  idempotencyKey: string;
};

type AmendmentTestHooks = { afterWrites?: () => Promise<void> | void };

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function digest(value: unknown) {
  return crypto.createHash('sha256').update(stableJson(value)).digest('hex');
}

function assertSafeCents(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`${label} must be a non-negative integer number of cents.`);
  }
}

function reservationAmounts(reservation: any) {
  const amounts = {
    lodgingSubtotalCents: reservation.lodgingSubtotalCents ?? 0,
    feeTotalCents: reservation.feeTotalCents ?? 0,
    taxTotalCents: reservation.taxTotalCents ?? 0,
    discountTotalCents: reservation.discountTotalCents ?? 0,
    securityDepositCents: reservation.securityDepositCents ?? 0,
    totalAmountCents: reservation.totalAmountCents ?? 0,
    amountPaidCents: reservation.amountPaidCents ?? 0,
    balanceDueCents: Math.max((reservation.totalAmountCents ?? 0) - (reservation.amountPaidCents ?? 0), 0),
  };
  for (const [key, value] of Object.entries(amounts)) assertSafeCents(value, key);
  return amounts;
}

function validateDateRange(checkInDate: string, checkOutDate: string) {
  const parseDate = (value: string, label: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} must use YYYY-MM-DD format.`);
    const [year, month, day] = value.split('-').map(Number);
    const timestamp = Date.UTC(year, month - 1, day);
    const parsed = new Date(timestamp);
    if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
      throw new Error(`${label} must be a valid calendar date in YYYY-MM-DD format.`);
    }
    return timestamp;
  };
  const start = parseDate(checkInDate, 'Check-in');
  const end = parseDate(checkOutDate, 'Check-out');
  const nights = (end - start) / (24 * 60 * 60 * 1000);
  if (nights <= 0) throw new Error('Check-out must be after check-in.');
  if (nights > 730) throw new Error('An amended stay cannot exceed 730 nights.');
  return nights;
}

function buildAmendedQuote({
  bookingSnapshot,
  checkInDate,
  checkOutDate,
  currencyCode,
  securityDepositCents,
}: {
  bookingSnapshot: any;
  checkInDate: string;
  checkOutDate: string;
  currencyCode: string;
  securityDepositCents: number;
}) {
  const listing = bookingSnapshot?.listing;
  const guestParty = bookingSnapshot?.guestParty;
  const ratePlan = listing?.ratePlans?.[0];
  if (!listing?.accommodationUnit || !ratePlan || !guestParty) {
    throw new Error('The original booking snapshot does not contain enough pricing evidence to amend this stay safely.');
  }
  if ((ratePlan.currencyCode || listing.currencyCode || currencyCode).toUpperCase() !== currencyCode.toUpperCase()) {
    throw new Error('The original booking currency does not match the reservation currency.');
  }

  const guestCount = (guestParty.adults || 0) + (guestParty.children || 0);
  const calculation = calculateStayQuote({
    checkIn: checkInDate,
    checkOut: checkOutDate,
    baseNightlyRateCents: ratePlan.baseNightlyRateCents ?? listing.baseNightlyRateCents ?? 0,
    currencyCode,
    baseMinimumStay: ratePlan.minimumStay ?? listing.minimumStay ?? 1,
    guestCount,
    maxGuests: listing.accommodationUnit.maxGuests,
    securityDepositCents,
    seasonalRates: ratePlan.seasonalRates || [],
    fees: (listing.feeDefinitions || []).map((fee: any) => ({
      name: fee.name,
      feeType: fee.feeType,
      kind: fee.calculation,
      amountCents: fee.amountCents,
      percentageBasisPoints: fee.percentageBasisPoints,
      taxable: fee.taxable,
    })),
    taxes: (listing.taxRules || [])
      .filter((tax: any) => !tax.isInclusive)
      .map((tax: any) => ({ name: tax.name, rateBasisPoints: tax.rateBasisPoints })),
  });
  const maximumStay = ratePlan.maximumStay ?? listing.maximumStay;
  if (maximumStay != null && calculation.numberOfNights > maximumStay) {
    throw new Error(`This listing allows a maximum stay of ${maximumStay} nights.`);
  }
  for (const [key, value] of Object.entries({
    lodgingSubtotalCents: calculation.lodgingSubtotalCents,
    feeTotalCents: calculation.feeTotalCents,
    taxTotalCents: calculation.taxTotalCents,
    securityDepositCents: calculation.securityDepositCents,
    totalAmountCents: calculation.totalAmountCents,
  })) assertSafeCents(value, key);
  return calculation;
}

function amendmentRefundAllocations(refundDueCents: number, payments: any[]) {
  let remaining = refundDueCents;
  const allocations: Array<{ paymentId: string; amountCents: number }> = [];
  for (const payment of payments) {
    if (!settledPaymentStatuses.includes(payment.status || '')) continue;
    const available = payment.amountCents - (payment.refundedAmountCents || 0);
    const amountCents = Math.min(available, remaining);
    if (amountCents <= 0) continue;
    if (payment.provider !== 'pp_system_default') {
      throw new Error('The amended total is below a payment from an unsupported provider; no refund transfer is available in this workflow, so the amendment cannot be applied.');
    }
    allocations.push({ paymentId: payment.id, amountCents });
    remaining -= amountCents;
    if (remaining === 0) break;
  }
  if (remaining !== 0) throw new Error('The settled payment ledger cannot cover the amendment refund liability.');
  return allocations;
}

function resultFromRecord(record: any, replayed: boolean) {
  const after = record.afterSnapshot || {};
  return {
    id: record.id,
    reservationId: record.reservationId,
    status: 'applied',
    checkInDate: record.checkInDate,
    checkOutDate: record.checkOutDate,
    currencyCode: record.currencyCode,
    delta: record.delta,
    totalAmountCents: after.amounts?.totalAmountCents,
    amountPaidCents: after.amounts?.amountPaidCents,
    paymentStatus: after.amounts?.paymentStatus,
    balanceDueCents: after.amounts?.balanceDueCents,
    refundLiabilityCents: after.amounts?.refundDueCents,
    replayed,
  };
}

async function runWithRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const retryable = error?.code === 'P2034' || error?.meta?.code === '40001' || /write conflict|deadlock|serializ|could not serialize/i.test(error?.message || '');
      if (!retryable || attempt === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function lockReservationRow(tx: any, reservationId: string) {
  await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `reservation:${reservationId}`);
  await tx.$queryRawUnsafe('SELECT "id" FROM "Reservation" WHERE "id" = $1 FOR UPDATE', reservationId);
}

function requestHash(args: AmendConfirmedStayArgs) {
  return digest({
    reservationId: args.reservationId,
    expectedCheckInDate: args.expectedCheckInDate,
    expectedCheckOutDate: args.expectedCheckOutDate,
    checkInDate: args.checkInDate,
    checkOutDate: args.checkOutDate,
    reason: args.reason,
  });
}

export async function amendConfirmedStayOperation(
  _root: unknown,
  input: AmendConfirmedStayArgs,
  context: any,
  testHooks: AmendmentTestHooks = {},
) {
  const args = {
    ...input,
    reservationId: input.reservationId?.trim() || '',
    expectedCheckInDate: input.expectedCheckInDate?.trim() || '',
    expectedCheckOutDate: input.expectedCheckOutDate?.trim() || '',
    checkInDate: input.checkInDate?.trim() || '',
    checkOutDate: input.checkOutDate?.trim() || '',
    reason: input.reason?.trim() || '',
    idempotencyKey: input.idempotencyKey?.trim() || '',
  };
  if (!args.reservationId) throw new Error('A reservation is required.');
  if (args.reason.length < 3 || args.reason.length > 1000) throw new Error('Provide an amendment reason of 3 to 1000 characters.');
  if (args.idempotencyKey.length < 8 || args.idempotencyKey.length > 200) throw new Error('The amendment idempotency key must contain 8 to 200 characters.');
  const requestDigest = requestHash(args);
  const initial = await context.prisma.reservation.findUnique({
    where: { id: args.reservationId },
    select: { id: true, hostOrganizationId: true },
  });
  if (!initial?.hostOrganizationId) throw new Error('Reservation not found.');
  await assertHostOrganizationAccess({
    context,
    hostOrganizationId: initial.hostOrganizationId,
    permission: 'canManageReservations',
  });

  return runWithRetry(() => context.prisma.$transaction(async (tx: any) => {
    await lockReservationRow(tx, args.reservationId);
    const locked = await tx.reservation.findUnique({
      where: { id: args.reservationId },
      select: {
        id: true,
        hostOrganizationId: true,
        listingId: true,
        accommodationUnitId: true,
        confirmationCode: true,
        status: true,
        checkInDate: true,
        checkOutDate: true,
        currencyCode: true,
        lodgingSubtotalCents: true,
        feeTotalCents: true,
        taxTotalCents: true,
        discountTotalCents: true,
        securityDepositCents: true,
        totalAmountCents: true,
        amountPaidCents: true,
        bookingSnapshot: true,
        tripTokenExpiresAt: true,
        tripTokenRevokedAt: true,
      },
    });
    if (!locked?.hostOrganizationId || locked.hostOrganizationId !== initial.hostOrganizationId) throw new Error('Reservation not found.');

    const existing = await tx.reservationAmendment.findUnique({ where: { idempotencyKey: args.idempotencyKey } });
    if (existing) {
      if (existing.reservationId !== locked.id || existing.hostOrganizationId !== locked.hostOrganizationId || existing.requestHash !== requestDigest) {
        throw new Error('This idempotency key was already used for a different amendment request.');
      }
      return resultFromRecord(existing, true);
    }

    if (!['confirmed'].includes(locked.status || '')) throw new Error('Only confirmed reservations can be amended.');
    if (locked.checkInDate !== args.expectedCheckInDate || locked.checkOutDate !== args.expectedCheckOutDate) {
      throw new Error('Reservation dates changed; reload the stay before submitting an amendment.');
    }
    if (locked.checkInDate === args.checkInDate && locked.checkOutDate === args.checkOutDate) {
      throw new Error('The amended dates must differ from the current reservation dates.');
    }
    assertStayNotInPast(args.checkInDate);
    validateDateRange(args.expectedCheckInDate, args.expectedCheckOutDate);
    validateDateRange(args.checkInDate, args.checkOutDate);

    const hostOrganizationId = locked.hostOrganizationId;
    const listingId = locked.listingId;
    const accommodationUnitId = locked.accommodationUnitId;
    if (!listingId || !accommodationUnitId) throw new Error('This reservation has no complete listing and unit allocation to amend safely.');
    await lockListingCapacity(tx, [listingId]);
    await lockAccommodationUnitCapacity(tx, [accommodationUnitId]);
    await tx.$queryRawUnsafe('SELECT "id" FROM "Listing" WHERE "id" = $1 FOR UPDATE', listingId);
    await tx.$queryRawUnsafe('SELECT "id" FROM "AccommodationUnit" WHERE "id" = $1 FOR UPDATE', accommodationUnitId);

    const [current, listing, unit] = await Promise.all([
      tx.reservation.findUnique({
        where: { id: locked.id },
        select: {
          id: true,
          hostOrganizationId: true,
          listingId: true,
          accommodationUnitId: true,
          confirmationCode: true,
          status: true,
          checkInDate: true,
          checkOutDate: true,
          currencyCode: true,
          lodgingSubtotalCents: true,
          feeTotalCents: true,
          taxTotalCents: true,
          discountTotalCents: true,
          securityDepositCents: true,
          totalAmountCents: true,
          amountPaidCents: true,
          bookingSnapshot: true,
          tripTokenExpiresAt: true,
          tripTokenRevokedAt: true,
        },
      }),
      tx.listing.findUnique({ where: { id: listingId }, select: { id: true, hostOrganizationId: true, accommodationUnitId: true } }),
      tx.accommodationUnit.findUnique({ where: { id: accommodationUnitId }, select: { id: true, hostOrganizationId: true, status: true } }),
    ]);
    if (!current || current.hostOrganizationId !== hostOrganizationId
      || current.listingId !== listingId || current.accommodationUnitId !== accommodationUnitId
      || current.checkInDate !== args.expectedCheckInDate || current.checkOutDate !== args.expectedCheckOutDate
      || current.status !== 'confirmed') {
      throw new Error('Reservation allocation or dates changed; reload the stay before submitting an amendment.');
    }
    if (!listing || listing.hostOrganizationId !== hostOrganizationId || listing.accommodationUnitId !== accommodationUnitId
      || !unit || unit.hostOrganizationId !== hostOrganizationId || unit.status !== 'available') {
      throw new Error('The reservation listing and accommodation unit are no longer a valid available allocation.');
    }

    const capacityBlocks = await tx.calendarBlock.findMany({
      where: { reservationId: current.id, hostOrganizationId, reason: 'reservation', status: 'active' },
      orderBy: [{ id: 'asc' }],
      select: { id: true, listingId: true, startDate: true, endDate: true },
    });
    if (capacityBlocks.length !== 1 || capacityBlocks[0].listingId !== listingId
      || capacityBlocks[0].startDate !== current.checkInDate || capacityBlocks[0].endDate !== current.checkOutDate) {
      throw new Error('The reservation does not have exactly one matching active capacity block.');
    }
    const conflict = await findAccommodationUnitCapacityConflict(tx, {
      accommodationUnitId,
      hostOrganizationId,
      checkInDate: args.checkInDate,
      checkOutDate: args.checkOutDate,
      excludeReservationId: current.id,
      excludeCalendarBlockId: capacityBlocks[0].id,
    });
    if (conflict) throw new Error('The accommodation unit is not available for the amended dates.');

    const amountsBefore = reservationAmounts(current);
    if (amountsBefore.amountPaidCents > amountsBefore.totalAmountCents) {
      throw new Error('The current settled amount exceeds the reservation total; reconcile the payment evidence before amending.');
    }
    if (amountsBefore.discountTotalCents !== 0) {
      throw new Error('This reservation has a discount that cannot be safely repriced by the amendment workflow.');
    }
    const bookingSnapshot = current.bookingSnapshot;
    if (!bookingSnapshot || typeof bookingSnapshot !== 'object') {
      throw new Error('The original booking snapshot is missing; this reservation cannot be amended safely.');
    }
    const originalQuote = bookingSnapshot.quote;
    if (!originalQuote || !bookingSnapshot.listing || originalQuote.currencyCode?.toUpperCase() !== current.currencyCode.toUpperCase()) {
      throw new Error('The original booking pricing evidence is incomplete or inconsistent.');
    }

    const originalBookingSnapshotHash = digest(bookingSnapshot);
    const latestAmendment = await tx.reservationAmendment.findFirst({
      where: { reservationId: current.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    const pricingBefore = latestAmendment?.afterSnapshot?.pricingQuote || originalQuote;
    const priorAmounts = latestAmendment?.afterSnapshot?.amounts;
    if (latestAmendment) {
      if (latestAmendment.checkInDate !== current.checkInDate || latestAmendment.checkOutDate !== current.checkOutDate
        || latestAmendment.currencyCode !== current.currencyCode
        || latestAmendment.originalBookingSnapshotHash !== originalBookingSnapshotHash
        || !pricingBefore || pricingBefore.checkIn !== current.checkInDate || pricingBefore.checkOut !== current.checkOutDate
        || pricingBefore.totalAmountCents !== amountsBefore.totalAmountCents
        || !priorAmounts || priorAmounts.totalAmountCents !== amountsBefore.totalAmountCents
        || priorAmounts.lodgingSubtotalCents !== amountsBefore.lodgingSubtotalCents
        || priorAmounts.feeTotalCents !== amountsBefore.feeTotalCents
        || priorAmounts.taxTotalCents !== amountsBefore.taxTotalCents
        || priorAmounts.securityDepositCents !== amountsBefore.securityDepositCents) {
        throw new Error('The latest amendment evidence does not match the current reservation amounts.');
      }
    } else if (originalQuote.checkIn !== current.checkInDate || originalQuote.checkOut !== current.checkOutDate
      || originalQuote.totalAmountCents !== amountsBefore.totalAmountCents
      || originalQuote.lodgingSubtotalCents !== amountsBefore.lodgingSubtotalCents
      || originalQuote.feeTotalCents !== amountsBefore.feeTotalCents
      || originalQuote.taxTotalCents !== amountsBefore.taxTotalCents
      || originalQuote.securityDepositCents !== amountsBefore.securityDepositCents) {
      throw new Error('The original booking snapshot does not match the current reservation amounts.');
    }

    const payments = await tx.payment.findMany({
      where: { reservationId: current.id },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, status: true, amountCents: true, refundedAmountCents: true, currencyCode: true, provider: true },
    });
    const unsettledRefund = await tx.refund.findFirst({
      where: { reservationId: current.id, status: { in: pendingMoneyStatuses } },
      select: { id: true },
    });
    if (unsettledRefund) throw new Error('Resolve pending refunds before amending this stay.');
    const unresolvedAmendmentRefund = await tx.refund.findFirst({
      where: { reservationId: current.id, reservationAmendmentId: { not: null }, status: 'failed' },
      select: { id: true },
    });
    if (unresolvedAmendmentRefund) throw new Error('Resolve the failed amendment refund liability before amending this stay.');
    if (payments.some((payment: any) => pendingMoneyStatuses.includes(payment.status || ''))) {
      throw new Error('Settle or resolve pending payments before amending this stay.');
    }
    const refundEvidence = await tx.refund.findMany({
      where: { reservationId: current.id },
      select: { id: true, paymentId: true, status: true, amountCents: true, currencyCode: true },
    });
    const reconciliation = reconcileReservationPaymentEvidence({
      payments,
      refunds: refundEvidence,
      currencyCode: current.currencyCode,
    });
    const { netPaidCents, hasRefunds } = reconciliation;
    if (netPaidCents !== amountsBefore.amountPaidCents) {
      throw new Error('Reservation paid amount does not reconcile to settled payment evidence.');
    }

    const quote = buildAmendedQuote({
      bookingSnapshot,
      checkInDate: args.checkInDate,
      checkOutDate: args.checkOutDate,
      currencyCode: current.currencyCode,
      securityDepositCents: amountsBefore.securityDepositCents,
    });
    const refundDueCents = Math.max(netPaidCents - quote.totalAmountCents, 0);
    const refundAllocations = refundDueCents > 0 ? amendmentRefundAllocations(refundDueCents, payments) : [];
    const paymentStatus = reservationPaymentStatus({
      ...reconciliation,
      totalAmountCents: quote.totalAmountCents,
      openRefundCents: Math.max(reconciliation.openRefundCents, refundDueCents),
    });
    const amountsAfter = {
      lodgingSubtotalCents: quote.lodgingSubtotalCents,
      feeTotalCents: quote.feeTotalCents,
      taxTotalCents: quote.taxTotalCents,
      discountTotalCents: amountsBefore.discountTotalCents,
      securityDepositCents: amountsBefore.securityDepositCents,
      totalAmountCents: quote.totalAmountCents,
      amountPaidCents: netPaidCents,
      balanceDueCents: Math.max(quote.totalAmountCents - netPaidCents, 0),
      refundDueCents,
      paymentStatus,
    };
    const pricingQuote = {
      ...quote,
      quoteNumber: `AMEND-${digest(args.idempotencyKey).slice(0, 20).toUpperCase()}`,
    };
    const beforeSnapshot = {
      checkInDate: current.checkInDate,
      checkOutDate: current.checkOutDate,
      amounts: amountsBefore,
      pricingQuote: pricingBefore,
    };
    const afterSnapshot = {
      checkInDate: args.checkInDate,
      checkOutDate: args.checkOutDate,
      amounts: amountsAfter,
      pricingQuote,
    };
    const delta = {
      lodgingSubtotalCents: amountsAfter.lodgingSubtotalCents - amountsBefore.lodgingSubtotalCents,
      feeTotalCents: amountsAfter.feeTotalCents - amountsBefore.feeTotalCents,
      taxTotalCents: amountsAfter.taxTotalCents - amountsBefore.taxTotalCents,
      discountTotalCents: amountsAfter.discountTotalCents - amountsBefore.discountTotalCents,
      securityDepositCents: amountsAfter.securityDepositCents - amountsBefore.securityDepositCents,
      totalAmountCents: amountsAfter.totalAmountCents - amountsBefore.totalAmountCents,
      amountPaidCents: amountsAfter.amountPaidCents - amountsBefore.amountPaidCents,
      balanceDueCents: amountsAfter.balanceDueCents - amountsBefore.balanceDueCents,
      refundDueCents: amountsAfter.refundDueCents,
    };
    const id = crypto.randomUUID();
    const now = new Date();
    const tokenExpiryFromCheckout = new Date(new Date(`${args.checkOutDate}T00:00:00.000Z`).getTime() + 30 * 24 * 60 * 60 * 1000);
    const tokenExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const tripTokenExpiresAt = tokenExpiryFromCheckout > tokenExpiry ? tokenExpiryFromCheckout : tokenExpiry;
    const amendment = await tx.reservationAmendment.create({
      data: {
        id,
        hostOrganizationId,
        reservationId: current.id,
        idempotencyKey: args.idempotencyKey,
        requestHash: requestDigest,
        actorUserId: context.session.itemId,
        reason: args.reason,
        previousCheckInDate: current.checkInDate,
        previousCheckOutDate: current.checkOutDate,
        checkInDate: args.checkInDate,
        checkOutDate: args.checkOutDate,
        currencyCode: current.currencyCode,
        originalBookingSnapshotHash,
        beforeSnapshot,
        afterSnapshot,
        delta,
      },
    });
    for (const allocation of refundAllocations) {
      const liabilityKey = `amendment-refund:${digest({ amendmentId: amendment.id, paymentId: allocation.paymentId, amountCents: allocation.amountCents })}`;
      const refundId = crypto.randomUUID();
      await tx.refund.create({
        data: {
          id: refundId,
          hostOrganizationId,
          reservationId: current.id,
          paymentId: allocation.paymentId,
          reservationAmendmentId: amendment.id,
          refundNumber: `REF-AMD-${amendment.id.slice(0, 8)}-${refundId.slice(0, 8)}`,
          idempotencyKey: liabilityKey,
          status: 'pending',
          reason: 'stay_amendment',
          amountCents: allocation.amountCents,
          currencyCode: current.currencyCode,
          data: { liabilityType: 'reservation_amendment', amendmentId: amendment.id, policyReviewRequired: false },
        },
      });
    }
    await tx.reservation.update({
      where: { id: current.id },
      data: {
        checkInDate: args.checkInDate,
        checkOutDate: args.checkOutDate,
        lodgingSubtotalCents: amountsAfter.lodgingSubtotalCents,
        feeTotalCents: amountsAfter.feeTotalCents,
        taxTotalCents: amountsAfter.taxTotalCents,
        securityDepositCents: amountsAfter.securityDepositCents,
        totalAmountCents: amountsAfter.totalAmountCents,
        amountPaidCents: amountsAfter.amountPaidCents,
        paymentStatus,
        tripTokenExpiresAt,
      },
    });
    const movedBlock = await tx.calendarBlock.updateMany({
      where: {
        id: capacityBlocks[0].id,
        reservationId: current.id,
        hostOrganizationId,
        listingId,
        status: 'active',
        startDate: current.checkInDate,
        endDate: current.checkOutDate,
      },
      data: { startDate: args.checkInDate, endDate: args.checkOutDate },
    });
    if (movedBlock.count !== 1) throw new Error('Reservation capacity changed while applying the amendment.');
    await enqueueOutboxEvent(tx, {
      hostOrganizationId,
      eventType: 'reservation.amended',
      aggregateType: 'Reservation',
      aggregateId: current.id,
      operationKey: args.idempotencyKey,
      payload: {
        amendmentId: amendment.id,
        reservationId: current.id,
        confirmationCode: current.confirmationCode,
        previousCheckInDate: current.checkInDate,
        previousCheckOutDate: current.checkOutDate,
        checkInDate: args.checkInDate,
        checkOutDate: args.checkOutDate,
        currencyCode: current.currencyCode,
        delta,
        refundDueCents,
        actorUserId: context.session.itemId,
        reason: args.reason,
        changedAt: now.toISOString(),
      },
    });
    await testHooks.afterWrites?.();
    return resultFromRecord(amendment, false);
  }, { maxWait: 5000, timeout: 20000, isolationLevel: 'ReadCommitted' }));
}

export async function amendConfirmedStay(root: unknown, args: AmendConfirmedStayArgs, context: any) {
  return amendConfirmedStayOperation(root, args, context);
}
