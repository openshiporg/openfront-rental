import crypto from 'node:crypto';

import { getSeedForTemplate, type AccommodationSeed } from '../../platform/onboarding/utils/dataUtils';
import { rentalOnboardingPlan, validateRentalOnboardingSeed } from '../../platform/onboarding/lib/rentalOnboardingPlan';
import { createOrReuseDatabase } from './createOrReuse';
import { createReservationLineItemsFromQuote } from '../utils/stayBookingSnapshot';
import { sanitizeStoreLogoSvg } from '../utils/storeLogo';
import { normalizeBackendOrigin } from '../lib/internal-origin';
import { DEFAULT_LIBRARY_LOGO_COLOR, DEFAULT_STORE_LOGO_ICON, normalizeStoreLogoColor } from '../../platform/store-settings/lib/store-logo';
import { seedProperties, seedGuests, seedReservations, seedOperations, seedOwnerAccounting, seedChannel } from './rentalSeedOperations';
import { stripeCheckoutEnabled } from '../../integrations/payment/stripe';
import { onlineQuoteReadinessProblem } from '../utils/stayEligibility';
import { STAY_LISTING_SELECTION } from '../utils/stayListing';

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
  const user = await context.prisma.user.findUnique({ where: { id }, select: { id: true, isActive: true, role: { select: { canManageOnboarding: true, canManagePeople: true, canManageRoles: true, canManageSettings: true } } } });
  if (!user?.isActive || !user.role?.canManageOnboarding) throw new Error('Onboarding permission required.');
  return user;
}

/** The deployed storefront origin, when configured, is the host's website and canonical URL. */
function configuredStorefrontOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured) return null;
  try {
    return normalizeBackendOrigin(configured);
  } catch {
    return null;
  }
}

/** Store identity saved through the same SVG sanitizer and colour normalizer as Store Settings. */
function onboardingMarketplaceSettings(seed: AccommodationSeed) {
  const { logoColor, ...settings } = seed.settings as AccommodationSeed['settings'] & { logoColor?: string };
  return {
    id: 1,
    ...settings,
    logoIcon: sanitizeStoreLogoSvg(DEFAULT_STORE_LOGO_ICON),
    logoColor: normalizeStoreLogoColor(logoColor ?? DEFAULT_LIBRARY_LOGO_COLOR),
  };
}

function onboardingHostOrganization(seed: AccommodationSeed, run: SetupRun) {
  const origin = configuredStorefrontOrigin();
  const host = { ...seed.hostOrganization, onboardingAnchorDate: run.anchorDate, onboardingFingerprint: run.fingerprint };
  return origin ? { ...host, website: origin, canonicalUrl: origin } : host;
}

type SetupRun = { anchorDate: string; fingerprint: string };

/**
 * One setup run per host: its start date anchors every sample date and its fingerprint
 * pins the configuration, so a resumed setup can't mix days or templates.
 */
async function setupRun(prisma: any, seed: AccommodationSeed): Promise<SetupRun> {
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify(seed)).digest('hex');
  const host = await prisma.hostOrganization.findUnique({ where: { id: seed.hostOrganization.id }, select: { id: true, onboardingAnchorDate: true, onboardingFingerprint: true } });
  if (host?.onboardingAnchorDate) {
    if (host.onboardingFingerprint && host.onboardingFingerprint !== fingerprint) {
      throw new Error('This setup was started with a different configuration. Finish it with the original choices, or review the records it already created.');
    }
    return { anchorDate: host.onboardingAnchorDate, fingerprint };
  }
  const run = { anchorDate: new Date().toISOString().slice(0, 10), fingerprint };
  // A host created before setup runs were recorded gets its anchor now (bookkeeping only).
  if (host) await prisma.hostOrganization.update({ where: { id: host.id }, data: { onboardingAnchorDate: run.anchorDate, onboardingFingerprint: fingerprint } });
  return run;
}

/**
 * Verify and complete apply only to the setup run that was actually saved: the submitted
 * configuration must have the same fingerprint as the run recorded on the host, so a
 * changed configuration with the same record IDs can't complete.
 */
async function assertSavedRun(prisma: any, seed: AccommodationSeed) {
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify(seed)).digest('hex');
  const host = await prisma.hostOrganization.findUnique({ where: { id: seed.hostOrganization.id }, select: { onboardingFingerprint: true } });
  if (!host?.onboardingFingerprint) throw new Error('No saved setup run was found for this configuration. Run setup to save it first.');
  if (host.onboardingFingerprint !== fingerprint) throw new Error('This configuration differs from the setup that was saved. Finish with the original choices, or review the saved records.');
}

/** A saved record must still carry the configuration this setup saved, not just its ID. */
function assertSaved(model: string, record: any, expected: Record<string, unknown>) {
  for (const [key, value] of Object.entries(expected)) {
    if (value === undefined) continue;
    if (record?.[key] !== value) throw new Error(`The saved ${model} no longer matches this setup (${key}). Review it before finishing setup.`);
  }
}

async function requireRecord(db: any, model: string, id: string | number, relations: Record<string, unknown> = {}) {
  const record = await db[model].findUnique({ where: { id } });
  if (!record) throw new Error(`Missing ${model} record. Retry setup to resume.`);
  for (const [key, value] of Object.entries(relations)) if (record[key] !== value) throw new Error(`Existing ${model} has conflicting ${key}. Review the record before resuming.`);
  return record;
}

export type LifecycleReadiness = { id: string; state: 'ready' | 'disabled' | 'unsupported' | 'pending_owner'; detail: string };

/**
 * Readiness of a model only real activity creates: its actual prerequisite, never a fabricated
 * record or an activated provider. Setup can't finish while a prerequisite it creates is
 * missing; anything switched off, unsupported in this app, or waiting on the owner is reported
 * as exactly that rather than as ready.
 */
async function verifyLifecycleReadiness(db: any, seed: AccommodationSeed, operationId: string): Promise<LifecycleReadiness> {
  const hostOrganizationId = seed.hostOrganization.id;
  const result = (state: LifecycleReadiness['state'], detail: string) => ({ id: operationId, state, detail });
  if (operationId === 'lifecycle:stay-quotes') {
    // The same online-quote rule as search and quoteStay: a sellable listing (public, operating
    // host; active property; available unit) with a rate and real, versioned cancellation terms.
    const listings = await db.listing.findMany({
      where: {
        hostOrganizationId, status: 'published',
        hostOrganization: { isPublic: true, status: { notIn: ['suspended', 'archived'] } },
        property: { status: 'active' },
        accommodationUnit: { status: 'available' },
      },
      select: { id: true, ratePlans: { where: { status: 'active' }, select: { cancellationPolicy: { select: { id: true, version: true, summary: true, fullTerms: true } } } } },
      take: 50,
    });
    const quotable = listings.some((listing: any) => listing.ratePlans.some((plan: any) => !onlineQuoteReadinessProblem(plan)));
    if (!quotable) throw new Error('No listing can take an online quote yet: publish a listing under an active property with a rate and versioned cancellation terms.');
    const settings = await db.marketplaceSettings.findUnique({ where: { id: 1 }, select: { isPublished: true } });
    return settings?.isPublished ? result('ready', 'A listing can take online quotes.') : result('disabled', 'Listings are quotable, but the storefront is unpublished, so new quotes and bookings are paused.');
  }
  if (operationId === 'lifecycle:refunds') {
    const provider = await db.paymentProvider.findFirst({ where: { hostOrganizationId, isInstalled: true }, select: { id: true } });
    if (!provider) throw new Error('Install a payment method so refunds can be recorded.');
    return result('ready', 'Refunds can be recorded against payments.');
  }
  if (operationId === 'lifecycle:payment-webhooks') {
    if (!stripeCheckoutEnabled()) return result('disabled', 'Card checkout is off, so no card confirmations are expected.');
    const provider = await db.paymentProvider.findFirst({ where: { hostOrganizationId, code: 'pp_stripe_stripe', isInstalled: true }, select: { id: true } });
    if (!provider) throw new Error('Card checkout is configured, but this host has no installed card payment provider.');
    return result('pending_owner', 'The card provider is installed; confirmations arrive only once the Stripe account sends webhooks to this app.');
  }
  if (operationId === 'lifecycle:outbox') return result('unsupported', 'Events are recorded, but no delivery target is installed in this app.');
  if (operationId === 'lifecycle:channel-reservations') return result('unsupported', 'Calendar connections here are availability-only; channel bookings aren’t imported.');
  // Amendments and damage claims are host commands with no setup prerequisite.
  return result('ready', 'Created by host actions on real stays.');
}

export async function verifyRentalItem(db: any, seed: AccommodationSeed, operationId: string) {
  const operation = rentalOnboardingPlan(seed).find(item => item.id === operationId);
  if (!operation) throw new Error('Unknown onboarding item.');
  const hostOrganizationId = seed.hostOrganization.id;
  const owned = (model: string, id: string, extra = {}) => requireRecord(db, model, id, { hostOrganizationId, ...extra });
  const property = seed.properties.find(p => [p.id, p.unit.id, `${p.listing.id}:rules`, `${p.listing.id}:rates`, `${p.listing.id}:calendar`].includes(operationId));
  if (operationId === 'settings') {
    // Reused settings must still be a usable storefront identity, not just a matching currency.
    const settings = await requireRecord(db, 'marketplaceSettings', 1, { currencyCode: seed.settings.currencyCode });
    if (!settings.name?.trim() || !sanitizeStoreLogoSvg(settings.logoIcon || '')) throw new Error('Store settings need a name and a logo before setup can finish.');
    return settings;
  }
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
      await owned('property', property.id);
      const savedUnit = await owned('accommodationUnit', unit.id, { propertyId: property.id });
      assertSaved('accommodation', savedUnit, { maxGuests: unit.maxGuests });
      const savedListing = await owned('listing', listing.id, { propertyId: property.id, accommodationUnitId: unit.id });
      assertSaved('listing', savedListing, { title: listing.title, slug: listing.slug, currencyCode: seed.settings.currencyCode });
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
      const rate = await owned('ratePlan', `${listing.id}_rate_default`, { listingId: listing.id, status: 'active' });
      if (savedListing.currencyCode !== rate.currencyCode) throw new Error('Listing and rate currencies conflict.');
      if (!rate.cancellationPolicyId) throw new Error('The rate needs a cancellation policy before it can be booked.');
      // The persisted pricing must still be the configuration this setup saved.
      assertSaved('rate', rate, { currencyCode: seed.settings.currencyCode, baseNightlyRateCents: listing.baseNightlyRateCents, minimumStay: listing.minimumStay, maximumStay: listing.maximumStay });
      const policy = await owned('cancellationPolicy', rate.cancellationPolicyId);
      if (!String(policy.version || '').trim() || !(String(policy.summary || '').trim() || String(policy.fullTerms || '').trim())) {
        throw new Error('The rate’s cancellation policy has no published version and terms, so the home can’t be booked online yet.');
      }
      await owned('seasonalRate', `${listing.id}_rate_default_peak`);
      assertSaved('cleaning fee', await owned('feeDefinition', `${listing.id}_fee_cleaning`), { amountCents: listing.cleaningFeeCents, calculation: 'fixed' });
      assertSaved('service fee', await owned('feeDefinition', `${listing.id}_fee_service`), { percentageBasisPoints: listing.serviceFeeBasisPoints, calculation: 'percentage' });
      assertSaved('lodging tax', await owned('taxRule', `${listing.id}_tax_lodging`), { rateBasisPoints: listing.taxBasisPoints, isInclusive: false });
      return;
    }
  }
  if (operationId === seed.cancellationPolicy.id) return owned('cancellationPolicy', operationId);
  if (seed.calendarBlocks.some(b => b.id === operationId)) return owned('calendarBlock', operationId);
  if (seed.guests.some(g => g.id === operationId)) return owned('guestProfile', operationId);
  if (operationId === seed.paymentProvider.id) return owned('paymentProvider', operationId, { isInstalled: true });
  if (operationId === seed.cardPaymentProvider.id) {
    // Card checkout may already have registered this host's provider record; either identity is the same configuration.
    const provider = await db.paymentProvider.findFirst({ where: { hostOrganizationId, code: seed.cardPaymentProvider.code } });
    // With card checkout off, the provider is configuration only: it is never switched on to pass setup.
    if (!stripeCheckoutEnabled()) return provider;
    if (!provider) throw new Error('Missing card payment provider record. Retry setup to resume.');
    if (provider.isInstalled !== true) throw new Error('The card payment provider is turned off for this host. Turn it on or remove it before finishing setup.');
    return provider;
  }
  const expectedReservation = seed.reservations.find(r => r.id === operationId);
  if (expectedReservation) {
    const reservation = await owned('reservation', operationId);
    await owned('guestParty', `${operationId}_party`, { reservationId: operationId, primaryGuestId: reservation.guestId });
    await owned('calendarBlock', `${operationId}_block`, { reservationId: operationId });
    await owned('stayAgreement', `${operationId}_agreement`, { guestId: reservation.guestId });
    await owned('securityDeposit', `${operationId}_deposit`);
    await owned('conversation', `${operationId}_conversation`, { reservationId: operationId });
    if (!reservation.bookingSnapshot?.quote || reservation.agreementId !== `${operationId}_agreement` || reservation.securityDepositId !== `${operationId}_deposit`) throw new Error('Stay workflow is incomplete.');
    for (const line of createReservationLineItemsFromQuote(operationId, reservation.bookingSnapshot.quote)) {
      const actual = await db.reservationLineItem.findUnique({ where: { snapshotKey: line.snapshotKey } });
      if (!actual || actual.reservationId !== operationId || actual.hostOrganizationId !== hostOrganizationId || actual.totalAmountCents !== line.totalAmountCents || actual.currencyCode !== line.currencyCode) throw new Error('Stay workflow has incomplete snapshot line items.');
    }
    if (reservation.amountPaidCents > 0) await owned('payment', `${operationId}_payment`, { reservationId: operationId });
    for (let i = 0; i < expectedReservation.conversation.length; i++) await owned('message', `${operationId}_conversation_message_${i + 1}`, { conversationId: `${operationId}_conversation` });
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
  if (operation.section === 'readiness') return verifyLifecycleReadiness(db, seed, operationId);
  if (operationId === seed.channel?.connection.id) {
    // Setup configures the connection only; imports are verified when they actually run.
    await owned('channelConnection', operationId);
    return owned('channelListing', `${operationId}_listing`, { channelConnectionId: operationId });
  }
  throw new Error('Onboarding item has no verification rule.');
}

async function createItem(db: any, seed: AccommodationSeed & { anchorDate?: string }, run: SetupRun, userId: string, operationId: string, canManageGlobalSettings: boolean) {
  const operation = rentalOnboardingPlan(seed).find(item => item.id === operationId);
  if (!operation) throw new Error('Unknown onboarding item.');
  const hostOrganizationId = seed.hostOrganization.id;
  const ensure = (model: string, data: any) => db[model].upsert({ where: { id: data.id }, create: data, update: {} });
  if (operationId === 'settings') {
    // The storefront identity is global: configuring a host never grants authority over it.
    const existing = await db.marketplaceSettings.findUnique({ where: { id: 1 }, select: { id: true } });
    if (!existing && !canManageGlobalSettings) throw new Error('Store settings permission is required to create the storefront identity.');
    return ensure('marketplaceSettings', onboardingMarketplaceSettings(seed));
  }
  if (operationId === hostOrganizationId) {
    await ensure('hostOrganization', onboardingHostOrganization(seed, run));
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
  if (operationId === seed.cardPaymentProvider.id) {
    // Credentials stay in the server environment; the record only names the provider and its
    // capabilities. With card checkout off it is saved switched off, never activated by setup.
    const existing = await db.paymentProvider.findFirst({ where: { hostOrganizationId, code: seed.cardPaymentProvider.code } });
    return existing || ensure('paymentProvider', { ...seed.cardPaymentProvider, hostOrganizationId, isInstalled: stripeCheckoutEnabled() ? seed.cardPaymentProvider.isInstalled : false });
  }
  if (seed.reservations.some(r => r.id === operationId)) return seedReservations(db, { ...seed, reservations: seed.reservations.filter(r => r.id === operationId) });
  if (seed.tasks.some(t => t.id === operationId)) return seedOperations(db, { ...seed, onboardingUserId: userId, calendarBlocks: [], tasks: seed.tasks.filter(t => t.id === operationId) });
  if (operationId === 'owner-accounting') return seedOwnerAccounting(db, seed);
  if (operationId === seed.channel?.connection.id) return seedChannel(db, seed);
  if (operation.section === 'readiness') return; // Checked, never created.
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
          const run = await setupRun(tx.prisma, seed);
          // Sample stays read the saved listing through the same selection as a guest quote.
          const loadListing = (id: string) => tx.sudo().query.Listing.findOne({ where: { id }, query: STAY_LISTING_SELECTION });
          await createItem(createOrReuseDatabase(tx.prisma), { ...seed, anchorDate: run.anchorDate, loadListing } as any, run, userId, args.operationId, Boolean(user.role.canManageSettings));
          await verifyRentalItem(tx.prisma, seed, args.operationId);
        } else {
          // Only the run actually saved, with its configuration intact, can be verified or completed.
          await assertSavedRun(tx.prisma, seed);
          const readiness: LifecycleReadiness[] = [];
          for (const operation of rentalOnboardingPlan(seed)) {
            const checked = await verifyRentalItem(tx.prisma, seed, operation.id);
            if (operation.section === 'readiness') readiness.push(checked as LifecycleReadiness);
          }
          if (args.mode === 'complete') await tx.sudo().query.User.updateOne({ where: { id: userId }, data: { onboardingStatus: 'completed' }, query: 'id' });
          return { success: true, readiness };
        }
        return { success: true };
      }, { isolationLevel: 'Serializable', maxWait: 10000, timeout: 120000 });
    } catch (error: any) {
      if (error?.code !== 'P2034' || attempt >= 2) throw error;
    }
  }
}
