// Accommodation record payloads retained from the archived Rental seeder.
// Called only by the authorized, per-item create-or-reuse GraphQL command.
// The injected database adapter forbids updates to pre-existing merchant records.
import { buildOwnerStatement, ownerStatementIdempotencyKey } from '../utils/ownerStatementAccounting';
import { propertyTaskRuleKey } from '../utils/propertyTaskLifecycle';
import { createReservationLineItemsFromQuote, createStayBookingSnapshot } from '../utils/stayBookingSnapshot';
import { createPublicOwnershipToken, hashPublicOwnershipToken } from '../utils/publicTokenAccess';
import { calculateStayQuote } from '../utils/stayPricing';
import { listingBookingSnapshot } from '../utils/stayListing';
import { effectiveStayRatePlan, stayCalculationInput } from '../utils/stayBookingRules';
import { onlineQuoteReadinessProblem } from '../utils/stayEligibility';
import { findAccommodationUnitCapacityConflict, findListingCapacityConflict, lockAccommodationUnitCapacity, lockListingCapacity } from '../utils/reservationAllocation';
import { FIXTURE_ORIGIN, fixtureEvidence } from '../utils/fixtureOrigin';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Sample dates are relative to the setup run's persisted anchor date, so resuming setup
 * on another day keeps every reservation, block, rate and task consistent with one run.
 */
function dateOnly(anchor: string | undefined, offsetDays: number) {
  const base = anchor && /^\d{4}-\d{2}-\d{2}$/.test(anchor) ? new Date(`${anchor}T00:00:00.000Z`) : new Date();
  const utc = Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + offsetDays);
  return new Date(utc).toISOString().slice(0, 10);
}

function timestamp(anchor: string | undefined, offsetDays: number, hour = 12) {
  return new Date(`${dateOnly(anchor, offsetDays)}T${String(hour).padStart(2, '0')}:00:00.000Z`);
}

/** Setup never records real-world facts: these notes mark what a sample record is not. */
const SAMPLE_STAY_NOTE = 'Sample stay created by setup. No payment, signature or deposit has been recorded for it.';

function getListingSeed(seed: any, slug: string) {
  for (const property of seed.properties || []) {
    if (property.listing.slug === slug) return { property, listing: property.listing, unit: property.unit };
  }
  throw new Error(`Seed listing ${slug} not found.`);
}

async function assertSeedCapacityAvailable(db: any, {
  hostOrganizationId,
  listingId,
  startDate,
  endDate,
  excludeReservationId,
  excludeCalendarBlockId,
  reason,
}: {
  hostOrganizationId: string;
  listingId: string;
  startDate: string;
  endDate: string;
  excludeReservationId?: string;
  excludeCalendarBlockId?: string;
  reason: string;
}) {
  if (reason === 'reservation' && !excludeReservationId) {
    throw new Error('Seed reservation capacity blocks require a reservation lifecycle identity.');
  }
  await lockListingCapacity(db, [listingId]);
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { id: true, hostOrganizationId: true, accommodationUnitId: true },
  });
  if (!listing || listing.hostOrganizationId !== hostOrganizationId) {
    throw new Error('Seed calendar allocation must belong to the selected host organization.');
  }
  await lockAccommodationUnitCapacity(db, [listing.accommodationUnitId]);
  let safeExcludeCalendarBlockId: string | undefined;
  if (excludeCalendarBlockId) {
    const existing = await db.calendarBlock.findUnique({
      where: { id: excludeCalendarBlockId },
      select: { hostOrganizationId: true, listingId: true, startDate: true, endDate: true, reason: true, status: true, reservationId: true },
    });
    if (!existing || (
      existing.hostOrganizationId === hostOrganizationId
      && existing.listingId === listingId
      && existing.startDate === startDate
      && existing.endDate === endDate
      && existing.reason === reason
      && existing.status === 'active'
      && existing.reservationId === (excludeReservationId || null)
      && (reason !== 'reservation' || Boolean(excludeReservationId))
    )) safeExcludeCalendarBlockId = excludeCalendarBlockId;
  }
  const conflict = listing.accommodationUnitId
    ? await findAccommodationUnitCapacityConflict(db, {
      accommodationUnitId: listing.accommodationUnitId,
      hostOrganizationId,
      checkInDate: startDate,
      checkOutDate: endDate,
      excludeReservationId,
      excludeCalendarBlockId: safeExcludeCalendarBlockId,
    })
    : await findListingCapacityConflict(db, {
      listingId,
      checkInDate: startDate,
      checkOutDate: endDate,
      excludeReservationId,
      excludeCalendarBlockId: safeExcludeCalendarBlockId,
    });
  if (conflict) throw new Error('Seed calendar availability overlaps an existing reservation or active block.');
}

export async function seedProperties(db: any, seed: any, phase: 'properties' | 'accommodations' | 'policies' | 'rates') {
  const hostId = seed.hostOrganization.id;
  const listingIds = new Map<string, string>();
  // Setup never overwrites archived history (the database refuses it too): stop with a clear reason.
  const seedPropertyIds = (seed.properties || []).map((item: any) => item.id);
  const seedListingIds = (seed.properties || []).map((item: any) => item.listing?.id).filter(Boolean);
  const [archivedProperty, archivedListing] = await Promise.all([
    db.property.findFirst({ where: { id: { in: seedPropertyIds }, status: 'archived' }, select: { name: true } }),
    db.listing.findFirst({ where: { id: { in: seedListingIds }, status: 'archived' }, select: { title: true } }),
  ]);
  if (archivedProperty || archivedListing) {
    throw new Error(`Sample ${archivedProperty ? `property “${archivedProperty.name}”` : `listing “${archivedListing.title}”`} was archived. Setup can’t re-create archived records.`);
  }

  for (const propertySeed of seed.properties || []) {
    const { address, unit, listing, ...property } = propertySeed;
    if (phase === 'properties') {
    await db.propertyAddress.upsert({
      where: { id: address.id },
      update: { ...address, hostOrganizationId: hostId, showExactAddressPublicly: false },
      create: { ...address, hostOrganizationId: hostId, showExactAddressPublicly: false },
    });
    await db.property.upsert({
      where: { id: property.id },
      update: { ...property, hostOrganizationId: hostId, addressId: address.id, status: 'active' },
      create: { ...property, hostOrganizationId: hostId, addressId: address.id, status: 'active' },
    });

    }
    if (phase === 'accommodations') {
    const { bedrooms, ...unitData } = unit;
    await db.accommodationUnit.upsert({
      where: { id: unit.id },
      update: { ...unitData, hostOrganizationId: hostId, propertyId: property.id, status: 'available' },
      create: { ...unitData, hostOrganizationId: hostId, propertyId: property.id, status: 'available' },
    });
    for (const [bedroomIndex, bedroomSeed] of (bedrooms || []).entries()) {
      const bedroomId = `${unit.id}_bedroom_${bedroomIndex + 1}`;
      await db.bedroom.upsert({
        where: { id: bedroomId },
        update: { name: bedroomSeed.name, order: bedroomIndex, hostOrganizationId: hostId, accommodationUnitId: unit.id },
        create: { id: bedroomId, name: bedroomSeed.name, order: bedroomIndex, hostOrganizationId: hostId, accommodationUnitId: unit.id },
      });
      for (const [bedIndex, bed] of (bedroomSeed.beds || []).entries()) {
        const bedId = `${bedroomId}_bed_${bedIndex + 1}`;
        await db.bed.upsert({
          where: { id: bedId },
          update: { ...bed, hostOrganizationId: hostId, bedroomId },
          create: { id: bedId, ...bed, hostOrganizationId: hostId, bedroomId },
        });
      }
    }

    // Ratings are earned from published reviews only, so setup never writes review aggregates.
    const { amenities, collections, media, houseRules, cleaningFeeCents, serviceFeeBasisPoints, taxBasisPoints, reviewAverageHundredths: _average, reviewCount: _count, ...listingData } = listing;
    const amenityIds = amenities.map((slug: string) => seed.amenities.find((item: any) => item.slug === slug)?.id).filter(Boolean);
    const collectionIds = collections.map((slug: string) => seed.collections.find((item: any) => item.slug === slug)?.id).filter(Boolean);
    const updateListingRelations = {
      amenities: { set: amenityIds.map((id: string) => ({ id })) },
      collections: { set: collectionIds.map((id: string) => ({ id })) },
    };
    const createListingRelations = {
      amenities: { connect: amenityIds.map((id: string) => ({ id })) },
      collections: { connect: collectionIds.map((id: string) => ({ id })) },
    };
    const listingRecord = await db.listing.upsert({
      where: { id: listing.id },
      update: { ...listingData, hostOrganizationId: hostId, propertyId: property.id, accommodationUnitId: unit.id, status: 'published', currencyCode: seed.settings.currencyCode, ...updateListingRelations },
      create: { ...listingData, hostOrganizationId: hostId, propertyId: property.id, accommodationUnitId: unit.id, status: 'published', currencyCode: seed.settings.currencyCode, ...createListingRelations },
    });
    listingIds.set(listing.slug, listingRecord.id);

    for (const [index, item] of (media || []).entries()) {
      const mediaId = `${listing.id}_media_${index + 1}`;
      await db.listingMedia.upsert({
        where: { id: mediaId },
        update: { ...item, order: index, metadata: { source: 'unsplash', localSeedAsset: true }, hostOrganizationId: hostId, listingId: listing.id },
        create: { id: mediaId, ...item, order: index, metadata: { source: 'unsplash', localSeedAsset: true }, hostOrganizationId: hostId, listingId: listing.id },
      });
    }
    }
    if (phase === 'policies') {
    for (const [index, rule] of (listing.houseRules || []).entries()) {
      const ruleId = `${listing.id}_rule_${index + 1}`;
      await db.houseRule.upsert({
        where: { id: ruleId },
        update: { ...rule, hostOrganizationId: hostId, listingId: listing.id },
        create: { id: ruleId, ...rule, hostOrganizationId: hostId, listingId: listing.id },
      });
    }

    }
    if (phase === 'rates') {
    const { cleaningFeeCents, serviceFeeBasisPoints, taxBasisPoints } = listing;
    const ratePlanId = `${listing.id}_rate_default`;
    await db.ratePlan.upsert({
      where: { id: ratePlanId },
      update: {
        hostOrganizationId: hostId,
        listingId: listing.id,
        cancellationPolicyId: seed.cancellationPolicy.id,
        name: 'Flexible direct rate',
        description: 'Public nightly rate with a versioned moderate cancellation policy.',
        status: 'active',
        currencyCode: seed.settings.currencyCode,
        baseNightlyRateCents: listing.baseNightlyRateCents,
        minimumStay: listing.minimumStay,
        maximumStay: listing.maximumStay,
        advanceNoticeHours: 24,
        bookingWindowDays: 365,
        isDefault: true,
      },
      create: {
        id: ratePlanId,
        hostOrganizationId: hostId,
        listingId: listing.id,
        cancellationPolicyId: seed.cancellationPolicy.id,
        name: 'Flexible direct rate',
        description: 'Public nightly rate with a versioned moderate cancellation policy.',
        status: 'active',
        currencyCode: seed.settings.currencyCode,
        baseNightlyRateCents: listing.baseNightlyRateCents,
        minimumStay: listing.minimumStay,
        maximumStay: listing.maximumStay,
        advanceNoticeHours: 24,
        bookingWindowDays: 365,
        isDefault: true,
      },
    });
    await db.seasonalRate.upsert({
      where: { id: `${ratePlanId}_peak` },
      update: { hostOrganizationId: hostId, ratePlanId, name: 'Peak season', startDate: dateOnly(seed.anchorDate, 45), endDate: dateOnly(seed.anchorDate, 105), adjustmentBasisPoints: 1500, minimumStay: Math.max(listing.minimumStay, 3), priority: 10, isActive: true },
      create: { id: `${ratePlanId}_peak`, hostOrganizationId: hostId, ratePlanId, name: 'Peak season', startDate: dateOnly(seed.anchorDate, 45), endDate: dateOnly(seed.anchorDate, 105), adjustmentBasisPoints: 1500, minimumStay: Math.max(listing.minimumStay, 3), priority: 10, isActive: true },
    });
    await db.feeDefinition.upsert({
      where: { id: `${listing.id}_fee_cleaning` },
      update: { hostOrganizationId: hostId, listingId: listing.id, name: 'Cleaning fee', feeType: 'cleaning', calculation: 'fixed', amountCents: cleaningFeeCents, percentageBasisPoints: 0, taxable: true, required: true, isActive: true },
      create: { id: `${listing.id}_fee_cleaning`, hostOrganizationId: hostId, listingId: listing.id, name: 'Cleaning fee', feeType: 'cleaning', calculation: 'fixed', amountCents: cleaningFeeCents, percentageBasisPoints: 0, taxable: true, required: true, isActive: true },
    });
    await db.feeDefinition.upsert({
      where: { id: `${listing.id}_fee_service` },
      update: { hostOrganizationId: hostId, listingId: listing.id, name: 'Direct booking service', feeType: 'service', calculation: 'percentage', amountCents: 0, percentageBasisPoints: serviceFeeBasisPoints, taxable: true, required: true, isActive: true },
      create: { id: `${listing.id}_fee_service`, hostOrganizationId: hostId, listingId: listing.id, name: 'Direct booking service', feeType: 'service', calculation: 'percentage', amountCents: 0, percentageBasisPoints: serviceFeeBasisPoints, taxable: true, required: true, isActive: true },
    });
    await db.taxRule.upsert({
      where: { id: `${listing.id}_tax_lodging` },
      update: { hostOrganizationId: hostId, listingId: listing.id, name: 'Lodging tax', jurisdiction: address.city, rateBasisPoints: taxBasisPoints, isInclusive: false, isActive: true },
      create: { id: `${listing.id}_tax_lodging`, hostOrganizationId: hostId, listingId: listing.id, name: 'Lodging tax', jurisdiction: address.city, rateBasisPoints: taxBasisPoints, isInclusive: false, isActive: true },
    });
  }
  }
  return listingIds;
}

export async function seedGuests(db: any, seed: any) {
  for (const guest of seed.guests || []) {
    await db.guestProfile.upsert({
      where: { id: guest.id },
      update: { ...guest, hostOrganizationId: seed.hostOrganization.id },
      create: { ...guest, hostOrganizationId: seed.hostOrganization.id },
    });
  }
}

/**
 * Sample stays are quoted exactly as a guest's quote is: the listing graph actually saved
 * (which may be a reused merchant record) is read with the same selection, priced by its
 * effective rate plan through the same calculator input (full party, pets and inclusive
 * taxes included), and snapshotted with the same projection. No template values are used.
 */
async function calculateSeedQuote(seed: any, reservationSeed: any) {
  const { property, listing, unit } = getListingSeed(seed, reservationSeed.listingSlug);
  const checkIn = dateOnly(seed.anchorDate, reservationSeed.checkInOffsetDays);
  const checkOut = dateOnly(seed.anchorDate, reservationSeed.checkInOffsetDays + reservationSeed.nights);
  if (typeof seed.loadListing !== 'function') throw new Error('Sample stays need the saved listing to be read.');
  const saved = await seed.loadListing(listing.id);
  if (!saved?.accommodationUnit?.id) throw new Error('Set up the listing, its accommodation and rates before its sample stay.');
  const plan = effectiveStayRatePlan(saved);
  const readiness = onlineQuoteReadinessProblem(plan, saved);
  if (readiness || !plan) throw new Error(`${listing.title}: ${readiness || 'no published nightly rate'}`);
  const quote = calculateStayQuote(stayCalculationInput(saved, plan, {
    checkIn,
    checkOut,
    guestCount: reservationSeed.adults + reservationSeed.children,
    pets: reservationSeed.pets || 0,
  }));
  return { property, listing, unit, checkIn, checkOut, quote, listingSnapshot: listingBookingSnapshot(saved), cancellationPolicy: plan.cancellationPolicy };
}

export async function seedReservations(db: any, seed: any) {
  const hostId = seed.hostOrganization.id;
  for (const reservationSeed of seed.reservations || []) {
    if (await db.reservation.findUnique({ where: { id: reservationSeed.id } })) continue;
    const { property, listing, unit, checkIn, checkOut, quote, listingSnapshot, cancellationPolicy } = await calculateSeedQuote(seed, reservationSeed);
    const guest = seed.guests.find((item: any) => item.id === reservationSeed.guestId);
    const party = {
      primaryGuest: { id: guest.id, name: guest.name, email: guest.email, phone: guest.phone },
      adults: reservationSeed.adults,
      children: reservationSeed.children,
      infants: reservationSeed.infants,
      pets: reservationSeed.pets,
      invitedGuests: [],
    };
    const quoteSnapshot = { ...quote, quoteNumber: `Q-${reservationSeed.confirmationCode}` };
    const bookingSnapshot = {
      ...createStayBookingSnapshot({
        listing: listingSnapshot,
        guestParty: party,
        cancellationPolicy,
        quote: quoteSnapshot,
      }),
      provenance: 'onboarding_sample',
    };
    // Sample stays carry no collected money, signature or deposit: only real activity records those.
    const amountPaidCents = 0;
    const active = ['pending', 'confirmed', 'in_stay'].includes(reservationSeed.status);
    const now = new Date();
    const checkedInAt = ['in_stay', 'completed'].includes(reservationSeed.status) ? timestamp(seed.anchorDate, reservationSeed.checkInOffsetDays, 16) : null;
    const checkedOutAt = reservationSeed.status === 'completed' ? timestamp(seed.anchorDate, reservationSeed.checkInOffsetDays + reservationSeed.nights, 10) : null;
    const reservationData = {
      hostOrganizationId: hostId,
      listingId: listing.id,
      accommodationUnitId: unit.id,
      guestId: guest.id,
      confirmationCode: reservationSeed.confirmationCode,
      // Per-installation random link; the host reissues it to a real guest when needed.
      tripTokenHash: hashPublicOwnershipToken(createPublicOwnershipToken()),
      tripTokenExpiresAt: new Date(new Date(`${checkOut}T00:00:00.000Z`).getTime() + 30 * DAY_MS),
      status: reservationSeed.status,
      paymentStatus: 'unpaid',
      source: reservationSeed.source,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      scheduledCheckInTime: property.checkInFrom,
      scheduledCheckOutTime: property.checkOutBy,
      checkedInAt,
      checkedOutAt,
      currencyCode: quote.currencyCode,
      lodgingSubtotalCents: quote.lodgingSubtotalCents,
      feeTotalCents: quote.feeTotalCents,
      taxTotalCents: quote.taxTotalCents,
      discountTotalCents: 0,
      securityDepositCents: quote.securityDepositCents,
      totalAmountCents: quote.totalAmountCents,
      amountPaidCents,
      bookingSnapshot,
      guestNotes: '',
      internalNotes: SAMPLE_STAY_NOTE,
      // Authoritative origin, written by this setup run: never real capacity, money or assent.
      fixtureOrigin: FIXTURE_ORIGIN,
      fixtureEvidence: fixtureEvidence('setup_run', { anchorDate: seed.anchorDate, setupRecordId: reservationSeed.id }),
    };
    const reservationBlockId = `${reservationSeed.id}_block`;
    await assertSeedCapacityAvailable(db, {
      hostOrganizationId: hostId,
      listingId: listing.id,
      startDate: checkIn,
      endDate: checkOut,
      excludeReservationId: reservationSeed.id,
      excludeCalendarBlockId: reservationBlockId,
      reason: 'reservation',
    });
    await db.reservation.upsert({ where: { id: reservationSeed.id }, update: reservationData, create: { id: reservationSeed.id, ...reservationData } });

    await db.guestParty.upsert({
      where: { id: `${reservationSeed.id}_party` },
      update: { hostOrganizationId: hostId, reservationId: reservationSeed.id, primaryGuestId: guest.id, adults: reservationSeed.adults, children: reservationSeed.children, infants: reservationSeed.infants, pets: reservationSeed.pets, invitedGuests: [] },
      create: { id: `${reservationSeed.id}_party`, hostOrganizationId: hostId, reservationId: reservationSeed.id, primaryGuestId: guest.id, adults: reservationSeed.adults, children: reservationSeed.children, infants: reservationSeed.infants, pets: reservationSeed.pets, invitedGuests: [] },
    });
    for (const line of createReservationLineItemsFromQuote(reservationSeed.id, quoteSnapshot)) {
      await db.reservationLineItem.upsert({
        where: { snapshotKey: line.snapshotKey },
        update: { ...line, hostOrganizationId: hostId, reservationId: reservationSeed.id },
        create: { id: `line_${line.snapshotKey.replace(/[^a-zA-Z0-9]/g, '_')}`, ...line, hostOrganizationId: hostId, reservationId: reservationSeed.id },
      });
    }
    await db.calendarBlock.upsert({
      where: { id: reservationBlockId },
      update: { hostOrganizationId: hostId, listingId: listing.id, reservationId: reservationSeed.id, startDate: checkIn, endDate: checkOut, reason: 'reservation', status: 'active', source: reservationSeed.source === 'direct' ? 'direct' : 'channel_api', notes: reservationSeed.confirmationCode, fixtureOrigin: FIXTURE_ORIGIN },
      create: { id: reservationBlockId, hostOrganizationId: hostId, listingId: listing.id, reservationId: reservationSeed.id, startDate: checkIn, endDate: checkOut, reason: 'reservation', status: 'active', source: reservationSeed.source === 'direct' ? 'direct' : 'channel_api', notes: reservationSeed.confirmationCode, fixtureOrigin: FIXTURE_ORIGIN },
    });

    const agreementId = `${reservationSeed.id}_agreement`;
    const agreementData = {
      hostOrganizationId: hostId, guestId: guest.id, cancellationPolicyId: cancellationPolicy?.id || null,
      agreementNumber: `AGR-${reservationSeed.confirmationCode}`,
      signingTokenHash: hashPublicOwnershipToken(createPublicOwnershipToken()),
      signingTokenExpiresAt: timestamp(seed.anchorDate, 30),
      // Only a guest signing through their link records a signature.
      status: active ? 'sent' : 'draft',
      title: `Stay terms for ${listing.title}`, signerEmail: guest.email, signatureName: '', signedAt: null,
      termsSnapshot: { listing: bookingSnapshot.listing, cancellationPolicy: bookingSnapshot.cancellationPolicy, houseRules: bookingSnapshot.listing.houseRules || [], checkInDate: checkIn, checkOutDate: checkOut },
    };
    await db.stayAgreement.upsert({ where: { id: agreementId }, update: agreementData, create: { id: agreementId, ...agreementData } });
    const depositId = `${reservationSeed.id}_deposit`;
    await db.securityDeposit.upsert({
      where: { id: depositId },
      // Required and uncollected: holding or releasing a deposit is a real event the host records.
      update: { hostOrganizationId: hostId, depositNumber: `DEP-${reservationSeed.confirmationCode}`, status: 'required', amountCents: quote.securityDepositCents, capturedAmountCents: 0, currencyCode: quote.currencyCode, heldAt: null, releasedAt: null },
      create: { id: depositId, hostOrganizationId: hostId, depositNumber: `DEP-${reservationSeed.confirmationCode}`, status: 'required', amountCents: quote.securityDepositCents, capturedAmountCents: 0, currencyCode: quote.currencyCode, heldAt: null, releasedAt: null },
    });
    await db.reservation.update({ where: { id: reservationSeed.id }, data: { agreementId, securityDepositId: depositId } });

    const conversationId = `${reservationSeed.id}_conversation`;
    await db.conversation.upsert({
      where: { id: conversationId },
      update: { hostOrganizationId: hostId, reservationId: reservationSeed.id, listingId: listing.id, guestId: guest.id, subject: `${guest.name} · ${listing.title}`, status: 'open', lastMessageAt: now },
      create: { id: conversationId, hostOrganizationId: hostId, reservationId: reservationSeed.id, listingId: listing.id, guestId: guest.id, subject: `${guest.name} · ${listing.title}`, status: 'open', lastMessageAt: now },
    });
    for (const [index, message] of (reservationSeed.conversation || []).entries()) {
      const messageId = `${conversationId}_message_${index + 1}`;
      await db.message.upsert({
        where: { id: messageId },
        update: { hostOrganizationId: hostId, conversationId, ...message, status: message.direction === 'inbound' ? 'received' : 'delivered', sentAt: timestamp(seed.anchorDate, reservationSeed.checkInOffsetDays - 2 + index, 14 + index) },
        create: { id: messageId, hostOrganizationId: hostId, conversationId, ...message, status: message.direction === 'inbound' ? 'received' : 'delivered', sentAt: timestamp(seed.anchorDate, reservationSeed.checkInOffsetDays - 2 + index, 14 + index) },
      });
    }

  }
}

export async function seedOperations(db: any, seed: any) {
  const hostId = seed.hostOrganization.id;
  for (const block of seed.calendarBlocks || []) {
    const listingId = getListingSeed(seed, block.listingSlug).listing.id;
    const startDate = dateOnly(seed.anchorDate, block.startOffsetDays);
    const endDate = dateOnly(seed.anchorDate, block.startOffsetDays + block.nights);
    await assertSeedCapacityAvailable(db, {
      hostOrganizationId: hostId,
      listingId,
      startDate,
      endDate,
      excludeCalendarBlockId: block.id,
      reason: block.reason,
    });
    await db.calendarBlock.upsert({
      where: { id: block.id },
      update: { hostOrganizationId: hostId, listingId, startDate, endDate, reason: block.reason, status: 'active', source: block.source, notes: block.notes, fixtureOrigin: FIXTURE_ORIGIN },
      create: { id: block.id, hostOrganizationId: hostId, listingId, startDate, endDate, reason: block.reason, status: 'active', source: block.source, notes: block.notes, fixtureOrigin: FIXTURE_ORIGIN },
    });
  }
  const turnoverRuleId = 'task_rule_departure_turnover';
  const foundryProperty = (seed.properties || []).find((item: any) => item.id === 'property_foundry');
  const operationsAdmin = { id: seed.onboardingUserId };
  if (foundryProperty && !seed.skipTaskRules) {
    await db.taskRule.upsert({
      where: { id: turnoverRuleId },
      update: { hostOrganizationId: hostId, propertyId: foundryProperty.id, listingId: foundryProperty.listing.id, code: 'departure-turnover', name: 'Departure turnover', trigger: 'after_check_out', offsetMinutes: 60, taskType: 'turnover_cleaning', titleTemplate: 'Turn over {{listing.title}} after {{reservation.confirmationCode}}', priority: 'normal', checklistTemplate: ['linens', 'bathrooms', 'kitchen', 'locks', 'supplies'], isActive: true },
      create: { id: turnoverRuleId, hostOrganizationId: hostId, propertyId: foundryProperty.id, listingId: foundryProperty.listing.id, code: 'departure-turnover', name: 'Departure turnover', trigger: 'after_check_out', offsetMinutes: 60, taskType: 'turnover_cleaning', titleTemplate: 'Turn over {{listing.title}} after {{reservation.confirmationCode}}', priority: 'normal', checklistTemplate: ['linens', 'bathrooms', 'kitchen', 'locks', 'supplies'], isActive: true },
    });
  }
  for (const task of seed.tasks || []) {
    const listingSeed = getListingSeed(seed, task.listingSlug);
    const automated = task.id === 'task_foundry_turnover';
    const data = {
      hostOrganizationId: hostId,
      propertyId: listingSeed.property.id,
      listingId: listingSeed.listing.id,
      reservationId: task.reservationId || null,
      taskRuleId: automated ? turnoverRuleId : null,
      idempotencyKey: automated ? propertyTaskRuleKey(turnoverRuleId, task.reservationId) : `manual-task:${task.id}`,
      source: automated ? 'task_rule' : 'manual',
      title: task.title,
      taskType: task.taskType,
      status: task.status,
      priority: task.priority,
      dueAt: timestamp(seed.anchorDate, task.dueOffsetDays),
      assigneeId: task.status === 'assigned' ? operationsAdmin?.id || null : null,
      claimedAt: task.status === 'assigned' ? new Date() : null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      checklist: automated ? ['linens', 'bathrooms', 'kitchen', 'locks', 'supplies'] : [],
      completionEvidence: null,
      completionNotes: '',
    };
    await db.propertyTask.upsert({ where: { id: task.id }, update: data, create: { id: task.id, ...data } });
  }
}

export async function seedOwnerAccounting(db: any, seed: any) {
  // A committed statement is evidence, not a template to regenerate on another day.
  if (await db.ownerStatement.findUnique({ where: { id: 'owner_statement_tidehouse_current' } })) return;
  const hostId = seed.hostOrganization.id;
  const ownerId = 'owner_tidehouse';
  const assignmentId = 'owner_assignment_tidehouse';
  const reservationSeed = seed.reservations.find((item: any) => item.id === 'reservation_tidehouse_completed');
  if (!reservationSeed) return;
  const { property } = getListingSeed(seed, reservationSeed.listingSlug);
  // The draft statement is built from the reservation actually saved, not the template.
  const reservation = await db.reservation.findUnique({ where: { id: reservationSeed.id } });
  if (!reservation || reservation.hostOrganizationId !== hostId) throw new Error('Create the sample stay before its owner statement.');
  const periodStart = dateOnly(seed.anchorDate, -60);
  const periodEnd = dateOnly(seed.anchorDate, 1);

  await db.propertyOwner.upsert({
    where: { id: ownerId },
    update: { hostOrganizationId: hostId, ownerNumber: 'OWN-1001', displayName: 'Mara Bell', companyName: 'Tidehouse Mendocino LLC', email: 'mara.bell@housekind.local', phone: '+1 (707) 555-0184', status: 'active', payoutSchedule: 'monthly', defaultManagerCommissionBasisPoints: 1500, payoutMethod: 'manual', payoutReference: 'Owner ledger 1001', taxProfile: { classification: 'business', countryCode: 'US' } },
    create: { id: ownerId, hostOrganizationId: hostId, ownerNumber: 'OWN-1001', displayName: 'Mara Bell', companyName: 'Tidehouse Mendocino LLC', email: 'mara.bell@housekind.local', phone: '+1 (707) 555-0184', status: 'active', payoutSchedule: 'monthly', defaultManagerCommissionBasisPoints: 1500, payoutMethod: 'manual', payoutReference: 'Owner ledger 1001', taxProfile: { classification: 'business', countryCode: 'US' } },
  });
  await db.propertyOwnerAssignment.upsert({
    where: { id: assignmentId },
    update: { hostOrganizationId: hostId, ownerId, propertyId: property.id, status: 'active', isPrimary: true, ownershipBasisPoints: 10000, managerCommissionBasisPoints: 1500, effectiveFrom: '2025-01-01', effectiveTo: '', notes: 'Primary owner assignment for Tidehouse Mendocino.' },
    create: { id: assignmentId, hostOrganizationId: hostId, ownerId, propertyId: property.id, status: 'active', isPrimary: true, ownershipBasisPoints: 10000, managerCommissionBasisPoints: 1500, effectiveFrom: '2025-01-01', effectiveTo: '', notes: 'Primary owner assignment for Tidehouse Mendocino.' },
  });
  const statement = buildOwnerStatement({
    ownerId,
    propertyAssignments: [{ propertyId: property.id, ownershipBasisPoints: 10000, managerCommissionBasisPoints: 1500 }],
    periodStart,
    periodEnd,
    currencyCode: reservation.currencyCode,
    reservations: [{
      id: reservation.id,
      confirmationCode: reservation.confirmationCode,
      propertyId: property.id,
      status: reservation.status,
      source: reservation.source,
      checkOutDate: reservation.checkOutDate,
      currencyCode: reservation.currencyCode,
      lodgingSubtotalCents: reservation.lodgingSubtotalCents,
      feeTotalCents: reservation.feeTotalCents,
      taxTotalCents: reservation.taxTotalCents,
      discountTotalCents: reservation.discountTotalCents || 0,
      totalAmountCents: reservation.totalAmountCents,
    }],
    refunds: [],
    // No payout is invented: paying an owner is a real, attested event.
    payouts: [],
    adjustments: [],
  });
  const statementId = 'owner_statement_tidehouse_current';
  const statementNumber = `OST-${periodEnd.replaceAll('-', '')}-1001`;
  const snapshot = { version: 1, generatedFrom: 'immutable_reservation_and_payout_evidence', provenance: 'onboarding_sample', ...statement };
  await db.ownerStatement.upsert({
    where: { id: statementId },
    update: { hostOrganizationId: hostId, ownerId, statementNumber, idempotencyKey: ownerStatementIdempotencyKey({ ownerId, periodStart, periodEnd, currencyCode: reservation.currencyCode }), status: 'draft', periodStart, periodEnd, currencyCode: reservation.currencyCode, grossRevenueCents: statement.grossRevenueCents, taxAmountCents: statement.taxAmountCents, refundAmountCents: statement.refundAmountCents, expenseAmountCents: statement.expenseAmountCents, adjustmentAmountCents: statement.adjustmentAmountCents, managerCommissionCents: statement.managerCommissionCents, ownerEarningsCents: statement.ownerEarningsCents, paidOutCents: statement.paidOutCents, balanceDueCents: statement.balanceDueCents, statementSnapshot: snapshot, approvedAt: null, sentAt: null, paidAt: null, paidReference: '' },
    create: { id: statementId, hostOrganizationId: hostId, ownerId, statementNumber, idempotencyKey: ownerStatementIdempotencyKey({ ownerId, periodStart, periodEnd, currencyCode: reservation.currencyCode }), status: 'draft', periodStart, periodEnd, currencyCode: reservation.currencyCode, grossRevenueCents: statement.grossRevenueCents, taxAmountCents: statement.taxAmountCents, refundAmountCents: statement.refundAmountCents, expenseAmountCents: statement.expenseAmountCents, adjustmentAmountCents: statement.adjustmentAmountCents, managerCommissionCents: statement.managerCommissionCents, ownerEarningsCents: statement.ownerEarningsCents, paidOutCents: statement.paidOutCents, balanceDueCents: statement.balanceDueCents, statementSnapshot: snapshot, approvedAt: null, sentAt: null, paidAt: null, paidReference: '' },
  });
  for (const line of statement.lines) {
    const lineId = `owner_line_${line.lineKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const relationData = {
      hostOrganizationId: hostId,
      statementId,
      ownerId,
      reservationId: line.reservationId || null,
      payoutId: line.lineType === 'payout' ? line.sourceId : null,
      lineKey: `${statementId}:${line.lineKey}`,
      lineType: line.lineType,
      description: line.description,
      serviceDate: line.serviceDate || '',
      amountCents: line.amountCents,
      sourceId: line.sourceId || '',
      metadata: line.metadata || {},
    };
    await db.ownerStatementLine.upsert({ where: { id: lineId }, update: relationData, create: { id: lineId, ...relationData } });
  }
}

export async function seedChannel(db: any, seed: any) {
  const hostId = seed.hostOrganization.id;
  const channel = seed.channel;
  if (!channel) return;
  const listing = getListingSeed(seed, channel.listingSlug).listing;
  // Configuration only: no sync, import job or imported block is recorded until a real
  // calendar is imported through the validated import command.
  const connection = { ...channel.connection, status: 'pending', hostOrganizationId: hostId, lastSyncedAt: null };
  await db.channelConnection.upsert({ where: { id: channel.connection.id }, update: connection, create: connection });
  const channelListingId = `${channel.connection.id}_listing`;
  const mapping = { hostOrganizationId: hostId, listingId: listing.id, channelConnectionId: channel.connection.id, externalListingId: channel.externalListingId, status: 'mapped', mapping: { availability: true, rates: false, reservations: false, messages: false }, lastSyncedAt: null };
  await db.channelListing.upsert({ where: { id: channelListingId }, update: mapping, create: { id: channelListingId, ...mapping } });
}
