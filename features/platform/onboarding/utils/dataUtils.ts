import { z } from 'zod';

import seedData from '../lib/seed.json';
import { rentalOnboardingPlan } from '../lib/rentalOnboardingPlan';
import type { AccommodationSectionType, AccommodationTemplateType } from '../config/templates';

const text = (max = 500) => z.string().trim().min(1).max(max);
const optionalText = (max = 500) => z.string().trim().max(max).optional();
const id = z.string().regex(/^[a-z0-9_]+$/).max(100);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100);
const money = z.number().int().min(0).max(10_000_000);

const bedSchema = z.object({
  bedType: z.enum(['king', 'queen', 'double', 'single', 'sofa_bed', 'bunk_bed', 'crib']),
  quantity: z.number().int().min(1).max(10),
}).strict();

const bedroomSchema = z.object({
  name: text(100),
  beds: z.array(bedSchema).min(1).max(10),
}).strict();

const addressSchema = z.object({
  id,
  addressLine1: text(200),
  city: text(100),
  region: text(100),
  postalCode: text(30),
  countryCode: z.string().regex(/^[A-Z]{2}$/),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  publicLocationLabel: text(150),
}).strict();

const unitSchema = z.object({
  id,
  name: text(150),
  accommodationType: z.enum(['entire_home', 'apartment', 'cabin', 'villa', 'cottage', 'chalet', 'condo', 'townhouse', 'guesthouse', 'unique_stay']),
  maxGuests: z.number().int().min(1).max(50),
  bedroomCount: z.number().int().min(0).max(30),
  bedCount: z.number().int().min(1).max(50),
  bathroomCountHalfUnits: z.number().int().min(1).max(40),
  squareFeet: z.number().int().min(0).max(100_000),
  floorLabel: optionalText(50),
  bedrooms: z.array(bedroomSchema).max(30),
}).strict();

const mediaSchema = z.object({
  imagePath: z.string().startsWith('/images/stays/').max(300),
  altText: text(200),
  caption: optionalText(200),
}).strict();

const houseRuleSchema = z.object({
  ruleType: z.enum(['pets', 'quiet_hours', 'events', 'smoking', 'maximum_guests']),
  title: text(150),
  description: text(500),
  isAllowed: z.boolean().optional(),
  isRequired: z.boolean().optional(),
}).strict();

const listingSchema = z.object({
  id,
  title: text(150),
  slug,
  subtitle: optionalText(200),
  description: text(2000),
  bookingMode: z.enum(['instant', 'request']),
  instantBook: z.boolean(),
  isFeatured: z.boolean(),
  baseNightlyRateCents: money,
  securityDepositCents: money,
  minimumStay: z.number().int().min(1).max(365),
  maximumStay: z.number().int().min(1).max(365),
  reviewAverageHundredths: z.number().int().min(0).max(500),
  reviewCount: z.number().int().min(0).max(1_000_000),
  amenities: z.array(slug).max(50),
  collections: z.array(slug).max(30),
  media: z.array(mediaSchema).min(1).max(20),
  houseRules: z.array(houseRuleSchema).max(20),
  cleaningFeeCents: money,
  serviceFeeBasisPoints: z.number().int().min(0).max(10_000),
  taxBasisPoints: z.number().int().min(0).max(10_000),
}).strict().refine((value) => value.maximumStay >= value.minimumStay, {
  message: 'Maximum stay must be at least the minimum stay.',
  path: ['maximumStay'],
});

const propertySchema = z.object({
  id,
  name: text(150),
  internalCode: z.string().regex(/^[A-Z0-9-]+$/).max(50),
  propertyType: z.enum(['house', 'apartment_building', 'cabin', 'villa', 'cottage', 'chalet', 'condo', 'townhouse', 'unique_stay']),
  timezone: text(100),
  checkInFrom: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  checkInUntil: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  checkOutBy: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  address: addressSchema,
  unit: unitSchema,
  listing: listingSchema,
}).strict();

const customConfigurationSchema = z.object({
  settings: z.object({
    name: text(100), tagline: text(200), homepageHeadline: text(200), publicDescription: text(2000),
    supportEmail: z.string().email().max(200), supportPhone: text(50), currencyCode: z.string().regex(/^[A-Z]{3}$/),
    locale: text(30), timezone: text(100), defaultMapLatitude: z.number().min(-90).max(90),
    defaultMapLongitude: z.number().min(-180).max(180), accentHue: z.number().int().min(0).max(360), isPublished: z.boolean(),
  }).strict(),
  hostOrganization: z.object({
    id, name: text(150), slug, organizationType: z.enum(['individual_host', 'property_manager', 'cooperative']),
    status: z.literal('active'), publicBio: text(2000), publicEmail: z.string().email().max(200), publicPhone: text(50),
    website: z.string().url().max(300), canonicalUrl: z.string().url().max(300), federationId: text(300),
    dataCustody: z.enum(['self_hosted', 'managed']), isPublic: z.boolean(),
  }).strict(),
  cancellationPolicy: z.object({
    id, name: text(100), version: text(100), policyType: z.enum(['flexible', 'moderate', 'firm', 'strict', 'non_refundable', 'custom']),
    summary: text(1000), fullTerms: text(3000), freeCancellationHours: z.number().int().min(0).max(8760),
    rules: z.array(z.object({ hoursBeforeCheckIn: z.number().int().min(0).max(8760), refundBasisPoints: z.number().int().min(0).max(10_000) }).strict()).min(1).max(20),
  }).strict(),
  amenities: z.array(z.object({ id, name: text(100), slug, category: z.enum(['essentials', 'kitchen', 'outdoor', 'parking', 'family', 'accessibility', 'safety', 'entertainment', 'workspace']), iconKey: text(100) }).strict()).min(1).max(50),
  collections: z.array(z.object({ id, name: text(100), slug, description: text(500), isActive: z.boolean() }).strict()).min(1).max(30),
  properties: z.array(propertySchema).min(1).max(10),
}).strict();

export type AccommodationSeed = Omit<typeof seedData, 'channel'> & {
  channel: typeof seedData.channel | null;
  onboardingTemplate?: AccommodationTemplateType;
};
export type AccommodationCustomConfiguration = z.infer<typeof customConfigurationSchema>;

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export function getCustomSetupConfiguration(data: AccommodationSeed = seedData): AccommodationCustomConfiguration {
  const { settings, hostOrganization, cancellationPolicy, amenities, collections, properties } = data;
  return clone({ settings, hostOrganization, cancellationPolicy, amenities, collections, properties }) as AccommodationCustomConfiguration;
}

function assertUniqueIds(config: AccommodationCustomConfiguration) {
  const identities = [config.hostOrganization.id, config.cancellationPolicy.id,
    ...config.amenities.map(item => item.id), ...config.collections.map(item => item.id),
    ...config.properties.flatMap(item => [item.id, item.address.id, item.unit.id, item.listing.id])];
  const reserved = new Set(['settings', seedData.paymentProvider.id,
    ...seedData.guests.map(item => item.id), ...seedData.reservations.map(item => item.id),
    ...seedData.calendarBlocks.map(item => item.id), ...seedData.tasks.map(item => item.id)]);
  if (new Set(identities).size !== identities.length || identities.some(identity => reserved.has(identity))) {
    throw new Error('Configuration identities must be unique and must not use reserved workflow identities.');
  }
}

export function parseCustomSetupConfiguration(value: unknown): AccommodationCustomConfiguration {
  const parsed = customConfigurationSchema.parse(value);
  assertUniqueIds(parsed);
  const amenitySlugs = new Set(parsed.amenities.map((item) => item.slug));
  const collectionSlugs = new Set(parsed.collections.map((item) => item.slug));
  const listingSlugs = new Set(parsed.properties.map((item) => item.listing.slug));
  const internalCodes = new Set(parsed.properties.map((item) => item.internalCode));
  if (amenitySlugs.size !== parsed.amenities.length) throw new Error('Amenity slugs must be unique.');
  if (collectionSlugs.size !== parsed.collections.length) throw new Error('Collection slugs must be unique.');
  if (listingSlugs.size !== parsed.properties.length) throw new Error('Listing slugs must be unique.');
  if (internalCodes.size !== parsed.properties.length) throw new Error('Property internal codes must be unique.');
  for (const property of parsed.properties) {
    if (property.listing.amenities.some((item) => !amenitySlugs.has(item))) throw new Error(`${property.listing.title} references an unknown amenity.`);
    if (property.listing.collections.some((item) => !collectionSlugs.has(item))) throw new Error(`${property.listing.title} references an unknown collection.`);
  }
  return parsed;
}

export function getSeedForTemplate(template: AccommodationTemplateType, custom?: unknown): AccommodationSeed {
  const full = clone(seedData) as any;
  if (template === 'full') return { ...full, onboardingTemplate: 'full' };
  if (template === 'custom') {
    const parsed = parseCustomSetupConfiguration(custom);
    // Custom, like e-commerce, can add/remove/reorder records. Retain only sample
    // workflows belonging to retained homes; never invent stays for a new home.
    const retained = new Map(seedData.properties.flatMap(property => {
      const replacement = parsed.properties.find(item => item.id === property.id);
      return replacement ? [[property.listing.slug, replacement] as const] : [];
    }));
    const mapListing = (item: any) => ({ ...item, listingSlug: retained.get(item.listingSlug)!.listing.slug });
    full.reservations = full.reservations.filter((item: any) => {
      const property = retained.get(item.listingSlug);
      return property && item.nights >= property.listing.minimumStay && item.nights <= property.listing.maximumStay && item.adults + item.children <= property.unit.maxGuests;
    }).map(mapListing);
    const guestIds = new Set(full.reservations.map((item: any) => item.guestId));
    const reservationIds = new Set(full.reservations.map((item: any) => item.id));
    full.guests = full.guests.filter((item: any) => guestIds.has(item.id));
    full.calendarBlocks = full.calendarBlocks.filter((item: any) => retained.has(item.listingSlug)).map(mapListing);
    full.tasks = full.tasks.filter((item: any) => retained.has(item.listingSlug) && (!item.reservationId || reservationIds.has(item.reservationId))).map(mapListing);
    full.channel = full.channel && retained.has(full.channel.listingSlug) ? mapListing(full.channel) : null;
    if (parsed.hostOrganization.id !== seedData.hostOrganization.id) full.paymentProvider.id = `${parsed.hostOrganization.id}_manual_provider`;
    return { ...full, ...parsed, onboardingTemplate: 'custom' } as AccommodationSeed;
  }

  const property = full.properties.find((item: any) => item.listing.slug === 'pineglass-cabin');
  const reservation = full.reservations.find((item: any) => item.listingSlug === 'pineglass-cabin');
  const amenitySlugs = new Set(property.listing.amenities);
  const collectionSlugs = new Set(property.listing.collections);
  return {
    ...full,
    onboardingTemplate: 'minimal',
    amenities: full.amenities.filter((item: any) => amenitySlugs.has(item.slug)),
    collections: full.collections.filter((item: any) => collectionSlugs.has(item.slug)),
    properties: [property],
    guests: full.guests.filter((item: any) => item.id === reservation.guestId),
    reservations: [reservation],
    calendarBlocks: full.calendarBlocks.filter((item: any) => item.listingSlug === property.listing.slug),
    tasks: [],
    channel: null,
  } as AccommodationSeed;
}

export function getItemsFromJsonData(data: AccommodationSeed, section: AccommodationSectionType): string[] {
  return rentalOnboardingPlan(data).filter(item => item.section === section).map(item => item.label);
}
