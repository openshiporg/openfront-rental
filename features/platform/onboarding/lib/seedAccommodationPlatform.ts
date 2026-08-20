import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { PrismaClient } from '@prisma/client';

import { buildOwnerStatement, ownerStatementIdempotencyKey } from '../../../keystone/utils/ownerStatementAccounting';
import { propertyTaskRuleKey } from '../../../keystone/utils/propertyTaskLifecycle';
import { createReservationLineItemsFromQuote, createStayBookingSnapshot } from '../../../keystone/utils/stayBookingSnapshot';
import { hashPublicOwnershipToken } from '../../../keystone/utils/publicTokenAccess';
import { calculateStayQuote } from '../../../keystone/utils/stayPricing';

const prisma = new PrismaClient();
let db = prisma as any;
const DAY_MS = 24 * 60 * 60 * 1000;

function loadSeed() {
  const seedPath = path.join(process.cwd(), 'features/platform/onboarding/lib/seed.json');
  return JSON.parse(fs.readFileSync(seedPath, 'utf8'));
}

function dateOnly(offsetDays: number) {
  const now = new Date();
  const utc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays);
  return new Date(utc).toISOString().slice(0, 10);
}

function timestamp(offsetDays: number, hour = 12) {
  return new Date(`${dateOnly(offsetDays)}T${String(hour).padStart(2, '0')}:00:00.000Z`);
}

function getListingSeed(seed: any, slug: string) {
  for (const property of seed.properties || []) {
    if (property.listing.slug === slug) return { property, listing: property.listing, unit: property.unit };
  }
  throw new Error(`Seed listing ${slug} not found.`);
}

async function seedFoundation(seed: any) {
  await db.marketplaceSettings.upsert({ where: { id: 1 }, update: seed.settings, create: { id: 1, ...seed.settings } });
  const host = seed.hostOrganization;
  await db.hostOrganization.upsert({ where: { id: host.id }, update: host, create: host });
  await db.cancellationPolicy.upsert({
    where: { id: seed.cancellationPolicy.id },
    update: { ...seed.cancellationPolicy, hostOrganizationId: host.id },
    create: { ...seed.cancellationPolicy, hostOrganizationId: host.id },
  });
  await db.paymentProvider.upsert({
    where: { id: seed.paymentProvider.id },
    update: { ...seed.paymentProvider, hostOrganizationId: host.id },
    create: { ...seed.paymentProvider, hostOrganizationId: host.id },
  });

  const admin = await db.user.findFirst({ orderBy: { createdAt: 'asc' } });
  if (admin?.roleId) {
    await db.role.update({
      where: { id: admin.roleId },
      data: {
        canAccessDashboard: true,
        canReadProperties: true,
        canManageProperties: true,
        canReadListings: true,
        canManageListings: true,
        canReadCalendar: true,
        canManageCalendar: true,
        canReadPricing: true,
        canManagePricing: true,
        canReadReservations: true,
        canManageReservations: true,
        canReadGuests: true,
        canManageGuests: true,
        canReadMessages: true,
        canManageMessages: true,
        canReadChannels: true,
        canManageChannels: true,
        canReadPayouts: true,
        canManagePayouts: true,
        canReadReviews: true,
        canManageReviews: true,
        canReadPayments: true,
        canManagePayments: true,
        canReadReports: true,
        canManageReports: true,
        canManageOnboarding: true,
        canManageSettings: true,
      },
    });
  }
  if (admin) {
    await db.hostMembership.upsert({
      where: { id: `membership_${host.id}_${admin.id}` },
      update: { hostOrganizationId: host.id, userId: admin.id, membershipRole: 'owner', status: 'active' },
      create: { id: `membership_${host.id}_${admin.id}`, hostOrganizationId: host.id, userId: admin.id, membershipRole: 'owner', status: 'active' },
    });
  }

  for (const amenity of seed.amenities || []) {
    await db.amenity.upsert({ where: { id: amenity.id }, update: amenity, create: amenity });
  }
  for (const collection of seed.collections || []) {
    await db.stayCollection.upsert({ where: { id: collection.id }, update: collection, create: collection });
  }
}

async function seedProperties(seed: any) {
  const hostId = seed.hostOrganization.id;
  const listingIds = new Map<string, string>();

  for (const propertySeed of seed.properties || []) {
    const { address, unit, listing, ...property } = propertySeed;
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

    const { amenities, collections, media, houseRules, cleaningFeeCents, serviceFeeBasisPoints, taxBasisPoints, ...listingData } = listing;
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
      update: { ...listingData, hostOrganizationId: hostId, propertyId: property.id, accommodationUnitId: unit.id, status: 'published', currencyCode: 'USD', ...updateListingRelations },
      create: { ...listingData, hostOrganizationId: hostId, propertyId: property.id, accommodationUnitId: unit.id, status: 'published', currencyCode: 'USD', ...createListingRelations },
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
    for (const [index, rule] of (houseRules || []).entries()) {
      const ruleId = `${listing.id}_rule_${index + 1}`;
      await db.houseRule.upsert({
        where: { id: ruleId },
        update: { ...rule, hostOrganizationId: hostId, listingId: listing.id },
        create: { id: ruleId, ...rule, hostOrganizationId: hostId, listingId: listing.id },
      });
    }

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
        currencyCode: 'USD',
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
        currencyCode: 'USD',
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
      update: { hostOrganizationId: hostId, ratePlanId, name: 'Peak season', startDate: dateOnly(45), endDate: dateOnly(105), adjustmentBasisPoints: 1500, minimumStay: Math.max(listing.minimumStay, 3), priority: 10, isActive: true },
      create: { id: `${ratePlanId}_peak`, hostOrganizationId: hostId, ratePlanId, name: 'Peak season', startDate: dateOnly(45), endDate: dateOnly(105), adjustmentBasisPoints: 1500, minimumStay: Math.max(listing.minimumStay, 3), priority: 10, isActive: true },
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
  return listingIds;
}

async function seedGuests(seed: any) {
  for (const guest of seed.guests || []) {
    await db.guestProfile.upsert({
      where: { id: guest.id },
      update: { ...guest, hostOrganizationId: seed.hostOrganization.id },
      create: { ...guest, hostOrganizationId: seed.hostOrganization.id },
    });
  }
}

function listingSnapshot(seed: any, property: any, listing: any, unit: any) {
  return {
    id: listing.id,
    title: listing.title,
    slug: listing.slug,
    subtitle: listing.subtitle,
    description: listing.description,
    currencyCode: 'USD',
    thumbnail: listing.media[0]?.imagePath || null,
    host: { id: seed.hostOrganization.id, name: seed.hostOrganization.name, slug: seed.hostOrganization.slug, publicBio: seed.hostOrganization.publicBio },
    property: {
      id: property.id,
      name: property.name,
      timezone: property.timezone,
      checkInFrom: property.checkInFrom,
      checkInUntil: property.checkInUntil,
      checkOutBy: property.checkOutBy,
      address: property.address,
    },
    accommodation: unit,
    media: listing.media.map((item: any, order: number) => ({ ...item, order, url: item.imagePath })),
    amenities: listing.amenities.map((slug: string) => seed.amenities.find((item: any) => item.slug === slug)).filter(Boolean),
    houseRules: listing.houseRules,
  };
}

function calculateSeedQuote(seed: any, reservationSeed: any) {
  const { property, listing, unit } = getListingSeed(seed, reservationSeed.listingSlug);
  const checkIn = dateOnly(reservationSeed.checkInOffsetDays);
  const checkOut = dateOnly(reservationSeed.checkInOffsetDays + reservationSeed.nights);
  const quote = calculateStayQuote({
    checkIn,
    checkOut,
    baseNightlyRateCents: listing.baseNightlyRateCents,
    currencyCode: 'USD',
    baseMinimumStay: listing.minimumStay,
    guestCount: reservationSeed.adults + reservationSeed.children,
    maxGuests: unit.maxGuests,
    securityDepositCents: listing.securityDepositCents,
    fees: [
      { name: 'Cleaning fee', feeType: 'cleaning', kind: 'fixed', amountCents: listing.cleaningFeeCents, taxable: true },
      { name: 'Direct booking service', feeType: 'service', kind: 'percentage', percentageBasisPoints: listing.serviceFeeBasisPoints, taxable: true },
    ],
    taxes: [{ name: 'Lodging tax', rateBasisPoints: listing.taxBasisPoints }],
  });
  return { property, listing, unit, checkIn, checkOut, quote };
}

async function seedReservations(seed: any) {
  const hostId = seed.hostOrganization.id;
  for (const reservationSeed of seed.reservations || []) {
    const { property, listing, unit, checkIn, checkOut, quote } = calculateSeedQuote(seed, reservationSeed);
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
    const bookingSnapshot = createStayBookingSnapshot({
      listing: listingSnapshot(seed, property, listing, unit),
      guestParty: party,
      cancellationPolicy: seed.cancellationPolicy,
      quote: quoteSnapshot,
    });
    const amountPaidCents = reservationSeed.amountPaid === 'full' ? quote.totalAmountCents : 0;
    const now = new Date();
    const checkedInAt = ['in_stay', 'completed'].includes(reservationSeed.status) ? timestamp(reservationSeed.checkInOffsetDays, 16) : null;
    const checkedOutAt = reservationSeed.status === 'completed' ? timestamp(reservationSeed.checkInOffsetDays + reservationSeed.nights, 10) : null;
    const reservationData = {
      hostOrganizationId: hostId,
      listingId: listing.id,
      accommodationUnitId: unit.id,
      guestId: guest.id,
      confirmationCode: reservationSeed.confirmationCode,
      tripTokenHash: hashPublicOwnershipToken(reservationSeed.tripToken),
      tripTokenExpiresAt: new Date(new Date(`${checkOut}T00:00:00.000Z`).getTime() + 30 * DAY_MS),
      status: reservationSeed.status,
      paymentStatus: reservationSeed.paymentStatus,
      source: reservationSeed.source,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      scheduledCheckInTime: property.checkInFrom,
      scheduledCheckOutTime: property.checkOutBy,
      checkedInAt,
      checkedOutAt,
      currencyCode: 'USD',
      lodgingSubtotalCents: quote.lodgingSubtotalCents,
      feeTotalCents: quote.feeTotalCents,
      taxTotalCents: quote.taxTotalCents,
      discountTotalCents: 0,
      securityDepositCents: quote.securityDepositCents,
      totalAmountCents: quote.totalAmountCents,
      amountPaidCents,
      bookingSnapshot,
      guestNotes: '',
      internalNotes: `Seeded ${reservationSeed.source} stay workflow.`,
    };
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
      where: { id: `${reservationSeed.id}_block` },
      update: { hostOrganizationId: hostId, listingId: listing.id, reservationId: reservationSeed.id, startDate: checkIn, endDate: checkOut, reason: 'reservation', status: 'active', source: reservationSeed.source === 'direct' ? 'direct' : 'channel_api', notes: reservationSeed.confirmationCode },
      create: { id: `${reservationSeed.id}_block`, hostOrganizationId: hostId, listingId: listing.id, reservationId: reservationSeed.id, startDate: checkIn, endDate: checkOut, reason: 'reservation', status: 'active', source: reservationSeed.source === 'direct' ? 'direct' : 'channel_api', notes: reservationSeed.confirmationCode },
    });

    const agreementId = `${reservationSeed.id}_agreement`;
    await db.stayAgreement.upsert({
      where: { id: agreementId },
      update: { hostOrganizationId: hostId, guestId: guest.id, cancellationPolicyId: seed.cancellationPolicy.id, agreementNumber: `AGR-${reservationSeed.confirmationCode}`, signingTokenHash: hashPublicOwnershipToken(reservationSeed.agreementToken), signingTokenExpiresAt: timestamp(30), status: reservationSeed.agreementStatus, title: `Stay terms for ${listing.title}`, signerEmail: guest.email, signatureName: reservationSeed.agreementStatus === 'signed' ? guest.name : '', signedAt: reservationSeed.agreementStatus === 'signed' ? now : null, termsSnapshot: { listing: bookingSnapshot.listing, cancellationPolicy: seed.cancellationPolicy, houseRules: listing.houseRules } },
      create: { id: agreementId, hostOrganizationId: hostId, guestId: guest.id, cancellationPolicyId: seed.cancellationPolicy.id, agreementNumber: `AGR-${reservationSeed.confirmationCode}`, signingTokenHash: hashPublicOwnershipToken(reservationSeed.agreementToken), signingTokenExpiresAt: timestamp(30), status: reservationSeed.agreementStatus, title: `Stay terms for ${listing.title}`, signerEmail: guest.email, signatureName: reservationSeed.agreementStatus === 'signed' ? guest.name : '', signedAt: reservationSeed.agreementStatus === 'signed' ? now : null, termsSnapshot: { listing: bookingSnapshot.listing, cancellationPolicy: seed.cancellationPolicy, houseRules: listing.houseRules } },
    });
    const depositId = `${reservationSeed.id}_deposit`;
    await db.securityDeposit.upsert({
      where: { id: depositId },
      update: { hostOrganizationId: hostId, depositNumber: `DEP-${reservationSeed.confirmationCode}`, status: reservationSeed.status === 'completed' ? 'released' : 'held', amountCents: quote.securityDepositCents, capturedAmountCents: 0, currencyCode: 'USD', heldAt: now, releasedAt: reservationSeed.status === 'completed' ? now : null },
      create: { id: depositId, hostOrganizationId: hostId, depositNumber: `DEP-${reservationSeed.confirmationCode}`, status: reservationSeed.status === 'completed' ? 'released' : 'held', amountCents: quote.securityDepositCents, capturedAmountCents: 0, currencyCode: 'USD', heldAt: now, releasedAt: reservationSeed.status === 'completed' ? now : null },
    });
    await db.reservation.update({ where: { id: reservationSeed.id }, data: { agreementId, securityDepositId: depositId } });

    if (amountPaidCents > 0) {
      const paymentId = `${reservationSeed.id}_payment`;
      await db.payment.upsert({
        where: { id: paymentId },
        update: { hostOrganizationId: hostId, reservationId: reservationSeed.id, guestId: guest.id, paymentProviderId: seed.paymentProvider.id, amountCents: amountPaidCents, refundedAmountCents: 0, currencyCode: 'USD', status: 'succeeded', paymentMethod: 'manual', provider: 'pp_system_default', providerPaymentId: `manual-${reservationSeed.confirmationCode}`, idempotencyKey: `seed-${reservationSeed.confirmationCode}`, data: { kind: 'seeded_manual_capture' }, processedAt: now },
        create: { id: paymentId, hostOrganizationId: hostId, reservationId: reservationSeed.id, guestId: guest.id, paymentProviderId: seed.paymentProvider.id, amountCents: amountPaidCents, refundedAmountCents: 0, currencyCode: 'USD', status: 'succeeded', paymentMethod: 'manual', provider: 'pp_system_default', providerPaymentId: `manual-${reservationSeed.confirmationCode}`, idempotencyKey: `seed-${reservationSeed.confirmationCode}`, data: { kind: 'seeded_manual_capture' }, processedAt: now },
      });
    }

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
        update: { hostOrganizationId: hostId, conversationId, ...message, status: message.direction === 'inbound' ? 'received' : 'delivered', sentAt: timestamp(reservationSeed.checkInOffsetDays - 2 + index, 14 + index) },
        create: { id: messageId, hostOrganizationId: hostId, conversationId, ...message, status: message.direction === 'inbound' ? 'received' : 'delivered', sentAt: timestamp(reservationSeed.checkInOffsetDays - 2 + index, 14 + index) },
      });
    }

    if (reservationSeed.review) {
      await db.review.upsert({
        where: { id: `${reservationSeed.id}_review_guest` },
        update: { hostOrganizationId: hostId, reservationId: reservationSeed.id, listingId: listing.id, guestId: guest.id, direction: 'guest_to_host', status: 'published', ...reservationSeed.review, submittedAt: timestamp(reservationSeed.checkInOffsetDays + reservationSeed.nights + 1), publishAfter: timestamp(reservationSeed.checkInOffsetDays + reservationSeed.nights + 14), publishedAt: timestamp(reservationSeed.checkInOffsetDays + reservationSeed.nights + 2) },
        create: { id: `${reservationSeed.id}_review_guest`, hostOrganizationId: hostId, reservationId: reservationSeed.id, listingId: listing.id, guestId: guest.id, direction: 'guest_to_host', status: 'published', ...reservationSeed.review, submittedAt: timestamp(reservationSeed.checkInOffsetDays + reservationSeed.nights + 1), publishAfter: timestamp(reservationSeed.checkInOffsetDays + reservationSeed.nights + 14), publishedAt: timestamp(reservationSeed.checkInOffsetDays + reservationSeed.nights + 2) },
      });
    }
    if (reservationSeed.payout) {
      const gross = quote.totalAmountCents;
      const net = gross - reservationSeed.payout.platformFeeCents - reservationSeed.payout.managerFeeCents;
      await db.payout.upsert({
        where: { id: `${reservationSeed.id}_payout` },
        update: { hostOrganizationId: hostId, reservationId: reservationSeed.id, payoutNumber: `PAY-${reservationSeed.confirmationCode}`, status: reservationSeed.payout.status, currencyCode: 'USD', grossAmountCents: gross, platformFeeCents: reservationSeed.payout.platformFeeCents, managerFeeCents: reservationSeed.payout.managerFeeCents, refundAmountCents: 0, netAmountCents: net, providerPayoutId: `manual-payout-${reservationSeed.confirmationCode}`, scheduledAt: timestamp(reservationSeed.checkInOffsetDays + reservationSeed.nights + 1), paidAt: timestamp(reservationSeed.checkInOffsetDays + reservationSeed.nights + 2), data: { kind: 'manual_owner_payout' } },
        create: { id: `${reservationSeed.id}_payout`, hostOrganizationId: hostId, reservationId: reservationSeed.id, payoutNumber: `PAY-${reservationSeed.confirmationCode}`, status: reservationSeed.payout.status, currencyCode: 'USD', grossAmountCents: gross, platformFeeCents: reservationSeed.payout.platformFeeCents, managerFeeCents: reservationSeed.payout.managerFeeCents, refundAmountCents: 0, netAmountCents: net, providerPayoutId: `manual-payout-${reservationSeed.confirmationCode}`, scheduledAt: timestamp(reservationSeed.checkInOffsetDays + reservationSeed.nights + 1), paidAt: timestamp(reservationSeed.checkInOffsetDays + reservationSeed.nights + 2), data: { kind: 'manual_owner_payout' } },
      });
    }
  }
}

async function seedOperations(seed: any) {
  const hostId = seed.hostOrganization.id;
  for (const block of seed.calendarBlocks || []) {
    const listingId = getListingSeed(seed, block.listingSlug).listing.id;
    await db.calendarBlock.upsert({
      where: { id: block.id },
      update: { hostOrganizationId: hostId, listingId, startDate: dateOnly(block.startOffsetDays), endDate: dateOnly(block.startOffsetDays + block.nights), reason: block.reason, status: 'active', source: block.source, notes: block.notes },
      create: { id: block.id, hostOrganizationId: hostId, listingId, startDate: dateOnly(block.startOffsetDays), endDate: dateOnly(block.startOffsetDays + block.nights), reason: block.reason, status: 'active', source: block.source, notes: block.notes },
    });
  }
  const turnoverRuleId = 'task_rule_departure_turnover';
  const foundry = getListingSeed(seed, 'foundry-loft');
  const operationsAdmin = await db.user.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } });
  await db.taskRule.upsert({
    where: { id: turnoverRuleId },
    update: { hostOrganizationId: hostId, propertyId: foundry.property.id, listingId: foundry.listing.id, code: 'departure-turnover', name: 'Departure turnover', trigger: 'after_check_out', offsetMinutes: 60, taskType: 'turnover_cleaning', titleTemplate: 'Turn over {{listing.title}} after {{reservation.confirmationCode}}', priority: 'normal', checklistTemplate: ['linens', 'bathrooms', 'kitchen', 'locks', 'supplies'], isActive: true },
    create: { id: turnoverRuleId, hostOrganizationId: hostId, propertyId: foundry.property.id, listingId: foundry.listing.id, code: 'departure-turnover', name: 'Departure turnover', trigger: 'after_check_out', offsetMinutes: 60, taskType: 'turnover_cleaning', titleTemplate: 'Turn over {{listing.title}} after {{reservation.confirmationCode}}', priority: 'normal', checklistTemplate: ['linens', 'bathrooms', 'kitchen', 'locks', 'supplies'], isActive: true },
  });
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
      dueAt: timestamp(task.dueOffsetDays),
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

async function seedOwnerAccounting(seed: any) {
  const hostId = seed.hostOrganization.id;
  const ownerId = 'owner_tidehouse';
  const assignmentId = 'owner_assignment_tidehouse';
  const reservationSeed = seed.reservations.find((item: any) => item.id === 'reservation_tidehouse_completed');
  const { property, listing, quote, checkOut } = calculateSeedQuote(seed, reservationSeed);
  const periodStart = dateOnly(-60);
  const periodEnd = dateOnly(1);
  const payoutId = `${reservationSeed.id}_payout`;
  const payout = await db.payout.findUnique({ where: { id: payoutId } });

  await db.propertyOwner.upsert({
    where: { id: ownerId },
    update: { hostOrganizationId: hostId, ownerNumber: 'OWN-1001', displayName: 'Mara Bell', companyName: 'Tidehouse Mendocino LLC', email: 'mara.bell@commonstay.local', phone: '+1 (707) 555-0184', status: 'active', payoutSchedule: 'monthly', defaultManagerCommissionBasisPoints: 1500, payoutMethod: 'manual', payoutReference: 'Owner ledger 1001', taxProfile: { classification: 'business', countryCode: 'US' } },
    create: { id: ownerId, hostOrganizationId: hostId, ownerNumber: 'OWN-1001', displayName: 'Mara Bell', companyName: 'Tidehouse Mendocino LLC', email: 'mara.bell@commonstay.local', phone: '+1 (707) 555-0184', status: 'active', payoutSchedule: 'monthly', defaultManagerCommissionBasisPoints: 1500, payoutMethod: 'manual', payoutReference: 'Owner ledger 1001', taxProfile: { classification: 'business', countryCode: 'US' } },
  });
  await db.propertyOwnerAssignment.upsert({
    where: { id: assignmentId },
    update: { hostOrganizationId: hostId, ownerId, propertyId: property.id, status: 'active', isPrimary: true, ownershipBasisPoints: 10000, managerCommissionBasisPoints: 1500, effectiveFrom: '2025-01-01', effectiveTo: '', notes: 'Primary owner assignment for Tidehouse Mendocino.' },
    create: { id: assignmentId, hostOrganizationId: hostId, ownerId, propertyId: property.id, status: 'active', isPrimary: true, ownershipBasisPoints: 10000, managerCommissionBasisPoints: 1500, effectiveFrom: '2025-01-01', effectiveTo: '', notes: 'Primary owner assignment for Tidehouse Mendocino.' },
  });
  if (payout) await db.payout.update({ where: { id: payoutId }, data: { propertyOwnerId: ownerId } });

  const statement = buildOwnerStatement({
    ownerId,
    propertyAssignments: [{ propertyId: property.id, ownershipBasisPoints: 10000, managerCommissionBasisPoints: 1500 }],
    periodStart,
    periodEnd,
    currencyCode: 'USD',
    reservations: [{
      id: reservationSeed.id,
      confirmationCode: reservationSeed.confirmationCode,
      propertyId: property.id,
      status: reservationSeed.status,
      source: reservationSeed.source,
      checkOutDate: checkOut,
      currencyCode: 'USD',
      lodgingSubtotalCents: quote.lodgingSubtotalCents,
      feeTotalCents: quote.feeTotalCents,
      taxTotalCents: quote.taxTotalCents,
      discountTotalCents: 0,
      totalAmountCents: quote.totalAmountCents,
    }],
    refunds: [],
    payouts: payout ? [{ id: payout.id, ownerId, status: payout.status, amountCents: payout.netAmountCents, paidAt: payout.paidAt?.toISOString() }] : [],
    adjustments: [],
  });
  const statementId = 'owner_statement_tidehouse_current';
  const statementNumber = `OST-${periodEnd.replaceAll('-', '')}-1001`;
  const snapshot = { version: 1, generatedFrom: 'immutable_reservation_and_payout_evidence', ...statement };
  await db.ownerStatement.upsert({
    where: { id: statementId },
    update: { hostOrganizationId: hostId, ownerId, statementNumber, idempotencyKey: ownerStatementIdempotencyKey({ ownerId, periodStart, periodEnd, currencyCode: 'USD' }), status: 'approved', periodStart, periodEnd, currencyCode: 'USD', grossRevenueCents: statement.grossRevenueCents, taxAmountCents: statement.taxAmountCents, refundAmountCents: statement.refundAmountCents, expenseAmountCents: statement.expenseAmountCents, adjustmentAmountCents: statement.adjustmentAmountCents, managerCommissionCents: statement.managerCommissionCents, ownerEarningsCents: statement.ownerEarningsCents, paidOutCents: statement.paidOutCents, balanceDueCents: statement.balanceDueCents, statementSnapshot: snapshot, approvedAt: new Date(), sentAt: null, paidAt: null, paidReference: '' },
    create: { id: statementId, hostOrganizationId: hostId, ownerId, statementNumber, idempotencyKey: ownerStatementIdempotencyKey({ ownerId, periodStart, periodEnd, currencyCode: 'USD' }), status: 'approved', periodStart, periodEnd, currencyCode: 'USD', grossRevenueCents: statement.grossRevenueCents, taxAmountCents: statement.taxAmountCents, refundAmountCents: statement.refundAmountCents, expenseAmountCents: statement.expenseAmountCents, adjustmentAmountCents: statement.adjustmentAmountCents, managerCommissionCents: statement.managerCommissionCents, ownerEarningsCents: statement.ownerEarningsCents, paidOutCents: statement.paidOutCents, balanceDueCents: statement.balanceDueCents, statementSnapshot: snapshot, approvedAt: new Date(), sentAt: null, paidAt: null, paidReference: '' },
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
  if (payout) await db.payout.update({ where: { id: payoutId }, data: { ownerStatementId: statementId } });
}

async function seedChannel(seed: any) {
  const hostId = seed.hostOrganization.id;
  const channel = seed.channel;
  const listing = getListingSeed(seed, channel.listingSlug).listing;
  const now = new Date();

  // Retire only the known onboarding-owned unsupported API fixture. No operator data is touched.
  const legacyConnectionId = 'channel_commonstay_airbnb';
  await db.channelSyncEvent.deleteMany({ where: { channelConnectionId: legacyConnectionId } });
  await db.channelReservation.deleteMany({ where: { channelConnectionId: legacyConnectionId } });
  await db.channelListing.deleteMany({ where: { channelConnectionId: legacyConnectionId } });
  await db.channelConnection.deleteMany({ where: { id: legacyConnectionId } });

  await db.channelConnection.upsert({
    where: { id: channel.connection.id },
    update: { ...channel.connection, hostOrganizationId: hostId, lastSyncedAt: now },
    create: { ...channel.connection, hostOrganizationId: hostId, lastSyncedAt: now },
  });
  const channelListingId = `${channel.connection.id}_listing`;
  await db.channelListing.upsert({
    where: { id: channelListingId },
    update: { hostOrganizationId: hostId, listingId: listing.id, channelConnectionId: channel.connection.id, externalListingId: channel.externalListingId, status: 'mapped', mapping: { availability: true, rates: false, reservations: false, messages: false }, lastSyncedAt: now },
    create: { id: channelListingId, hostOrganizationId: hostId, listingId: listing.id, channelConnectionId: channel.connection.id, externalListingId: channel.externalListingId, status: 'mapped', mapping: { availability: true, rates: false, reservations: false, messages: false }, lastSyncedAt: now },
  });
  const startDate = dateOnly(channel.startOffsetDays);
  const endDate = dateOnly(channel.startOffsetDays + channel.nights);
  const blockId = `${channel.connection.id}_${channel.externalUid}`;
  await db.calendarBlock.upsert({
    where: { id: blockId },
    update: { hostOrganizationId: hostId, listingId: listing.id, startDate, endDate, reason: 'channel_import', status: 'active', source: 'ical', externalUid: channel.externalUid, notes: 'Availability imported from an external calendar.' },
    create: { id: blockId, hostOrganizationId: hostId, listingId: listing.id, startDate, endDate, reason: 'channel_import', status: 'active', source: 'ical', externalUid: channel.externalUid, notes: 'Availability imported from an external calendar.' },
  });
  const syncEventId = `${channel.connection.id}_sync_event`;
  await db.channelSyncEvent.upsert({
    where: { id: syncEventId },
    update: { hostOrganizationId: hostId, channelConnectionId: channel.connection.id, channelListingId, channelReservationId: null, action: 'availability_import', status: 'succeeded', message: 'Imported one availability-only iCalendar event.', payload: { eventCount: 1, externalUid: channel.externalUid }, attempts: 1, occurredAt: now },
    create: { id: syncEventId, hostOrganizationId: hostId, channelConnectionId: channel.connection.id, channelListingId, action: 'availability_import', status: 'succeeded', message: 'Imported one availability-only iCalendar event.', payload: { eventCount: 1, externalUid: channel.externalUid }, attempts: 1, occurredAt: now },
  });
  const checksum = crypto.createHash('sha256').update(`${channel.externalUid}|${startDate}|${endDate}`).digest('hex');
  await db.dataExchangeJob.upsert({
    where: { id: `${channel.connection.id}_exchange` },
    update: { hostOrganizationId: hostId, channelConnectionId: channel.connection.id, listingId: listing.id, direction: 'import', domain: 'availability', format: 'ical', status: 'succeeded', idempotencyKey: `ical:${channel.connection.id}:${checksum}`, payloadSha256: checksum, sourceLabel: 'Operator-provided iCalendar text', processedCount: 1, createdCount: 1, updatedCount: 0, skippedCount: 0, conflictCount: 0, resultSummary: { availabilityOnly: true }, startedAt: now, completedAt: now },
    create: { id: `${channel.connection.id}_exchange`, hostOrganizationId: hostId, channelConnectionId: channel.connection.id, listingId: listing.id, direction: 'import', domain: 'availability', format: 'ical', status: 'succeeded', idempotencyKey: `ical:${channel.connection.id}:${checksum}`, payloadSha256: checksum, sourceLabel: 'Operator-provided iCalendar text', processedCount: 1, createdCount: 1, updatedCount: 0, skippedCount: 0, conflictCount: 0, resultSummary: { availabilityOnly: true }, startedAt: now, completedAt: now },
  });
}

async function summarize() {
  return {
    hostOrganizations: await db.hostOrganization.count(),
    properties: await db.property.count(),
    listings: await db.listing.count(),
    listingMedia: await db.listingMedia.count(),
    amenities: await db.amenity.count(),
    guests: await db.guestProfile.count(),
    reservations: await db.reservation.count(),
    reservationLines: await db.reservationLineItem.count(),
    calendarBlocks: await db.calendarBlock.count(),
    conversations: await db.conversation.count(),
    messages: await db.message.count(),
    reviews: await db.review.count(),
    payouts: await db.payout.count(),
    propertyOwners: await db.propertyOwner.count(),
    ownerStatements: await db.ownerStatement.count(),
    taskRules: await db.taskRule.count(),
    propertyTasks: await db.propertyTask.count(),
    channelConnections: await db.channelConnection.count(),
    dataExchangeJobs: await db.dataExchangeJob.count(),
  };
}

export async function seedAccommodationPlatform() {
  const seed = loadSeed();
  return prisma.$transaction(async (transaction) => {
    const previousClient = db;
    db = transaction as any;
    try {
      await seedFoundation(seed);
      await seedProperties(seed);
      await seedGuests(seed);
      await seedReservations(seed);
      await seedOperations(seed);
      await seedOwnerAccounting(seed);
      await seedChannel(seed);
      return await summarize();
    } finally {
      db = previousClient;
    }
  }, { maxWait: 10000, timeout: 120000, isolationLevel: 'Serializable' });
}

export async function disconnectAccommodationSeedClient() {
  await prisma.$disconnect();
}
