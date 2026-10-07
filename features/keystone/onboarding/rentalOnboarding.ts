import { getSeedForTemplate, type AccommodationSeed } from '../../platform/onboarding/utils/dataUtils';
import { rentalOnboardingPlan, validateRentalOnboardingSeed } from '../../platform/onboarding/lib/rentalOnboardingPlan';
import { createOrReuseDatabase } from './createOrReuse';
import { createReservationLineItemsFromQuote } from '../utils/stayBookingSnapshot';
import { seedProperties, seedGuests, seedReservations, seedOperations, seedOwnerAccounting, seedChannel } from './rentalSeedOperations';

export type RentalOnboardingInput = { template: 'minimal' | 'full' | 'custom'; customConfiguration?: unknown };

export function resolveRentalOnboardingSeed(input: RentalOnboardingInput) {
  if (!input || !['minimal', 'full', 'custom'].includes(input.template)) throw new Error('Select a valid setup type.');
  const seed = getSeedForTemplate(input.template, input.customConfiguration);
  validateRentalOnboardingSeed(seed);
  return seed;
}

async function authorize(context: any) {
  const id = context.session?.itemId;
  if (!id || context.session?.data?.isActive !== true || !context.session?.data?.role?.canManageOnboarding) throw new Error('Onboarding permission required.');
  const user = await context.prisma.user.findUnique({ where: { id }, select: { id: true, isActive: true, role: { select: { canManageOnboarding: true, canManagePeople: true, canManageRoles: true } } } });
  if (!user?.isActive || !user.role?.canManageOnboarding) throw new Error('Onboarding permission required.');
  return user;
}

async function requireRecord(db: any, model: string, id: string | number, relations: Record<string, unknown> = {}) {
  const record = await db[model].findUnique({ where: { id } });
  if (!record) throw new Error(`Missing ${model} record. Retry setup to resume.`);
  for (const [key, value] of Object.entries(relations)) if (record[key] !== value) throw new Error(`Existing ${model} has conflicting ${key}. Review the record before resuming.`);
  return record;
}

export async function verifyRentalItem(db: any, seed: AccommodationSeed, operationId: string) {
  const operation = rentalOnboardingPlan(seed).find(item => item.id === operationId);
  if (!operation) throw new Error('Unknown onboarding item.');
  const hostOrganizationId = seed.hostOrganization.id;
  const owned = (model: string, id: string, extra = {}) => requireRecord(db, model, id, { hostOrganizationId, ...extra });
  const property = seed.properties.find(p => [p.id, p.unit.id, `${p.listing.id}:rules`, `${p.listing.id}:rates`, `${p.listing.id}:calendar`].includes(operationId));
  if (operationId === 'settings') return requireRecord(db, 'marketplaceSettings', 1, { currencyCode: seed.settings.currencyCode });
  if (operationId === hostOrganizationId) {
    await requireRecord(db, 'hostOrganization', hostOrganizationId);
    for (const collection of seed.collections) await requireRecord(db, 'stayCollection', collection.id);
    return;
  }
  if (operation.section === 'amenities') return requireRecord(db, 'amenity', operationId);
  if (property) {
    const { listing, unit, address } = property;
    if (operation.section === 'properties') {
      await owned('propertyAddress', address.id);
      return owned('property', property.id, { addressId: address.id });
    }
    if (operation.section === 'accommodations') {
      await owned('accommodationUnit', unit.id, { propertyId: property.id });
      await owned('listing', listing.id, { propertyId: property.id, accommodationUnitId: unit.id });
      for (let i = 0; i < unit.bedrooms.length; i++) {
        const bedroomId = `${unit.id}_bedroom_${i + 1}`;
        await owned('bedroom', bedroomId, { accommodationUnitId: unit.id });
        for (let j = 0; j < unit.bedrooms[i].beds.length; j++) await owned('bed', `${bedroomId}_bed_${j + 1}`, { bedroomId });
      }
      for (let i = 0; i < listing.media.length; i++) await owned('listingMedia', `${listing.id}_media_${i + 1}`, { listingId: listing.id });
      return;
    }
    if (operation.section === 'policies') {
      for (let i = 0; i < listing.houseRules.length; i++) await owned('houseRule', `${listing.id}_rule_${i + 1}`, { listingId: listing.id });
      return;
    }
    if (operation.section === 'rates' || operation.section === 'availability') {
      const savedListing = await owned('listing', listing.id);
      const rate = await owned('ratePlan', `${listing.id}_rate_default`, { listingId: listing.id });
      if (savedListing.currencyCode !== rate.currencyCode) throw new Error('Listing and rate currencies conflict.');
      await owned('seasonalRate', `${listing.id}_rate_default_peak`);
      await owned('feeDefinition', `${listing.id}_fee_cleaning`);
      await owned('feeDefinition', `${listing.id}_fee_service`);
      await owned('taxRule', `${listing.id}_tax_lodging`);
      return;
    }
  }
  if (operationId === seed.cancellationPolicy.id) return owned('cancellationPolicy', operationId);
  if (seed.calendarBlocks.some(b => b.id === operationId)) return owned('calendarBlock', operationId);
  if (seed.guests.some(g => g.id === operationId)) return owned('guestProfile', operationId);
  if (operationId === seed.paymentProvider.id) return owned('paymentProvider', operationId);
  const expectedReservation = seed.reservations.find(r => r.id === operationId);
  if (expectedReservation) {
    const reservation = await owned('reservation', operationId);
    await owned('guestParty', `${operationId}_party`, { reservationId: operationId });
    await owned('calendarBlock', `${operationId}_block`, { reservationId: operationId });
    await owned('stayAgreement', `${operationId}_agreement`);
    await owned('securityDeposit', `${operationId}_deposit`);
    await owned('conversation', `${operationId}_conversation`, { reservationId: operationId });
    if (!reservation.bookingSnapshot?.quote || reservation.agreementId !== `${operationId}_agreement` || reservation.securityDepositId !== `${operationId}_deposit`) throw new Error('Stay workflow is incomplete.');
    for (const line of createReservationLineItemsFromQuote(operationId, reservation.bookingSnapshot.quote)) {
      const actual = await db.reservationLineItem.findUnique({ where: { snapshotKey: line.snapshotKey } });
      if (!actual || actual.reservationId !== operationId || actual.hostOrganizationId !== hostOrganizationId || actual.totalAmountCents !== line.totalAmountCents || actual.currencyCode !== line.currencyCode) throw new Error('Stay workflow has incomplete snapshot line items.');
    }
    if (reservation.amountPaidCents > 0) await owned('payment', `${operationId}_payment`, { reservationId: operationId });
    for (let i = 0; i < expectedReservation.conversation.length; i++) await owned('message', `${operationId}_conversation_message_${i + 1}`, { conversationId: `${operationId}_conversation` });
    if (expectedReservation.review) await owned('review', `${operationId}_review_guest`, { reservationId: operationId });
    if (expectedReservation.payout) await owned('payout', `${operationId}_payout`, { reservationId: operationId });
    return;
  }
  if (seed.tasks.some(t => t.id === operationId)) return owned('propertyTask', operationId);
  if (operationId === 'owner-accounting') {
    await owned('propertyOwner', 'owner_tidehouse');
    await owned('propertyOwnerAssignment', 'owner_assignment_tidehouse');
    const statement = await owned('ownerStatement', 'owner_statement_tidehouse_current');
    if (!statement.statementSnapshot?.lines?.length) throw new Error('Owner statement evidence is incomplete.');
    for (const line of statement.statementSnapshot.lines) await owned('ownerStatementLine', `owner_line_${line.lineKey.replace(/[^a-zA-Z0-9]/g, '_')}`, { statementId: statement.id });
    return;
  }
  if (operationId === seed.channel?.connection.id) {
    await owned('channelConnection', operationId);
    await owned('channelListing', `${operationId}_listing`);
    await owned('calendarBlock', `${operationId}_${seed.channel.externalUid}`);
    await owned('channelSyncEvent', `${operationId}_sync_event`);
    return owned('dataExchangeJob', `${operationId}_exchange`);
  }
  throw new Error('Onboarding item has no verification rule.');
}

async function createItem(db: any, seed: AccommodationSeed, userId: string, operationId: string) {
  const operation = rentalOnboardingPlan(seed).find(item => item.id === operationId);
  if (!operation) throw new Error('Unknown onboarding item.');
  const hostOrganizationId = seed.hostOrganization.id;
  const ensure = (model: string, data: any) => db[model].upsert({ where: { id: data.id }, create: data, update: {} });
  if (operationId === 'settings') return ensure('marketplaceSettings', { id: 1, ...seed.settings });
  if (operationId === hostOrganizationId) {
    await ensure('hostOrganization', seed.hostOrganization);
    await ensure('hostMembership', { id: `membership_${hostOrganizationId}_${userId}`, hostOrganizationId, userId, membershipRole: 'owner', status: 'active' });
    for (const collection of seed.collections) await ensure('stayCollection', collection);
    return;
  }
  if (operation.section === 'amenities') return ensure('amenity', seed.amenities.find(a => a.id === operationId));
  if (operationId === seed.cancellationPolicy.id) return ensure('cancellationPolicy', { ...seed.cancellationPolicy, hostOrganizationId });
  const property = seed.properties.find(p => [p.id, p.unit.id, `${p.listing.id}:rules`, `${p.listing.id}:rates`].includes(operationId));
  if (property) return seedProperties(db, { ...seed, properties: [property] }, operation.section as 'properties' | 'accommodations' | 'policies' | 'rates');
  if (operation.section === 'availability') {
    // An unblocked listing calendar is available by default; verify its persisted rate.
    if (operationId.endsWith(':calendar')) return;
    return seedOperations(db, { ...seed, onboardingUserId: userId, skipTaskRules: true, calendarBlocks: seed.calendarBlocks.filter(b => b.id === operationId), tasks: [] });
  }
  if (seed.guests.some(g => g.id === operationId)) return seedGuests(db, { ...seed, guests: seed.guests.filter(g => g.id === operationId) });
  if (operationId === seed.paymentProvider.id) return ensure('paymentProvider', { ...seed.paymentProvider, hostOrganizationId });
  if (seed.reservations.some(r => r.id === operationId)) return seedReservations(db, { ...seed, reservations: seed.reservations.filter(r => r.id === operationId) });
  if (seed.tasks.some(t => t.id === operationId)) return seedOperations(db, { ...seed, onboardingUserId: userId, calendarBlocks: [], tasks: seed.tasks.filter(t => t.id === operationId) });
  if (operationId === 'owner-accounting') return seedOwnerAccounting(db, seed);
  if (operationId === seed.channel?.connection.id) return seedChannel(db, seed);
  throw new Error('Unknown onboarding item.');
}

/** Like canonical e-commerce: one authorized create/reuse command per item,
 * committed before its chip is completed. No client-provided model/data passthrough.
 */
export async function rentalOnboarding(_root: unknown, args: { input: RentalOnboardingInput; operationId?: string; mode: string }, context: any) {
  await authorize(context);
  const seed = resolveRentalOnboardingSeed(args.input);
  if (!['create', 'verify', 'complete'].includes(args.mode)) throw new Error('Unknown onboarding command.');
  for (let attempt = 0; ; attempt++) {
    try {
      return await context.transaction(async (tx: any) => {
        const user = await authorize(tx);
        const userId = user.id as string;
        const existingHost = await tx.prisma.hostOrganization.findUnique({ where: { id: seed.hostOrganization.id }, select: { id: true } });
        if (existingHost && !user.role.canManagePeople && !user.role.canManageRoles) {
          const membership = await tx.prisma.hostMembership.findFirst({ where: { hostOrganizationId: existingHost.id, userId, status: 'active', membershipRole: { in: ['owner', 'admin'] } }, select: { id: true } });
          if (!membership) throw new Error('You do not have permission to configure this host organization.');
        }
        if (args.mode === 'create') {
          if (!args.operationId) throw new Error('An onboarding item is required.');
          await createItem(createOrReuseDatabase(tx.prisma), seed, userId, args.operationId);
          await verifyRentalItem(tx.prisma, seed, args.operationId);
        } else {
          for (const operation of rentalOnboardingPlan(seed)) await verifyRentalItem(tx.prisma, seed, operation.id);
          if (args.mode === 'complete') await tx.sudo().query.User.updateOne({ where: { id: userId }, data: { onboardingStatus: 'completed' }, query: 'id' });
        }
        return { success: true };
      }, { isolationLevel: 'Serializable', maxWait: 10000, timeout: 120000 });
    } catch (error: any) {
      if (error?.code !== 'P2034' || attempt >= 2) throw error;
    }
  }
}
