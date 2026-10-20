import { graphql, list } from '@keystone-6/core';
import { denyAll } from '@keystone-6/core/access';
import { checkbox, integer, relationship, select, text, virtual } from '@keystone-6/core/fields';

import { hostScopedListAccess, permissions } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { assertListingAllocation, coherentBookingMode } from '../utils/listingIntegrity';
import { trackingFields } from './trackingFields';
import { listingReadinessFor } from '../utils/listingReadiness';
import { archivedRecordGuard } from '../mutations/catalogLifecycle';

const listingHostHooks = hostScopedHooks('canManageListings');
const archivedListingGuard = archivedRecordGuard('listing');

export const Listing = list({
  access: hostScopedListAccess('canReadListings', 'canManageListings'),
  hooks: {
    resolveInput: async (args: any) => coherentBookingMode(await listingHostHooks.resolveInput(args), args.item),
    validate: async (args: any) => {
      await listingHostHooks.validate(args);
      archivedListingGuard(args);
      try {
        await assertListingAllocation(args);
      } catch (error) {
        args.addValidationError(error instanceof Error ? error.message : 'Listing allocation is invalid.');
      }
    },
  },
  ui: {
    labelField: 'title',
    listView: { initialColumns: ['title', 'status', 'property', 'accommodationUnit', 'baseNightlyRateCents', 'instantBook'] },
  },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization.listings' }),
    // Set when the listing is created; moved later only by the locked allocation command, which
    // serializes with bookings, amendments and re-accommodation on the same listing and units.
    property: relationship({
      ref: 'Property.listings',
      access: { read: permissions.canReadProperties, update: () => false },
    }),
    accommodationUnit: relationship({ ref: 'AccommodationUnit.listings', access: { update: () => false } }),
    title: text({ validation: { isRequired: true } }),
    slug: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    subtitle: text(),
    description: text({ ui: { displayMode: 'textarea' } }),
    // Lifecycle moves only through the locked catalog transition command.
    status: select({
      type: 'string',
      access: { update: () => false },
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
        { label: 'Paused', value: 'paused' },
        { label: 'Archived', value: 'archived' },
      ],
      defaultValue: 'draft',
    }),
    bookingMode: select({
      type: 'string',
      options: [
        { label: 'Instant Book', value: 'instant' },
        { label: 'Request to Book', value: 'request' },
      ],
      defaultValue: 'request',
    }),
    instantBook: checkbox({ defaultValue: false }),
    isFeatured: checkbox({ defaultValue: false }),
    currencyCode: text({ defaultValue: 'USD', validation: { isRequired: true } }),
    baseNightlyRateCents: integer({ defaultValue: 0, validation: { min: 0 } }),
    securityDepositCents: integer({ defaultValue: 0, validation: { min: 0 } }),
    minimumStay: integer({ defaultValue: 1, validation: { min: 1 } }),
    maximumStay: integer({ validation: { min: 1 } }),
    advanceNoticeHours: integer({ defaultValue: 24, validation: { min: 0 }, ui: { description: 'Minimum hours between booking and check-in (at the property’s check-in time). Enforced in search, quotes and booking; an active rate plan’s value takes precedence.' } }),
    bookingWindowDays: integer({ defaultValue: 365, validation: { min: 1 }, ui: { description: 'How many days ahead a check-in can be booked. Enforced in search, quotes and booking; an active rate plan’s value takes precedence.' } }),
    reviewAverageHundredths: integer({ defaultValue: 0, validation: { min: 0, max: 500 } }),
    reviewCount: integer({ defaultValue: 0, validation: { min: 0 } }),
    // Bookable-online readiness from the quote rules, readable with the listing itself; it
    // carries no prices or terms, so hidden pricing is never misread as missing pricing.
    onlineReadiness: virtual({
      field: graphql.field({
        type: graphql.JSON,
        resolve: async (item, _args, context) => (await listingReadinessFor(context.prisma, [String(item.id)])).get(String(item.id)) || null,
      }),
      ui: { itemView: { fieldMode: 'hidden' }, listView: { fieldMode: 'hidden' }, createView: { fieldMode: 'hidden' } },
    }),
    thumbnail: virtual({
      field: graphql.field({
        type: graphql.String,
        resolve: async (item, _args, context) => {
          const listing = await context.query.Listing.findOne({
            where: { id: String(item.id) },
            query: 'media(orderBy: [{ order: asc }], take: 1) { image { url } imagePath }',
          });
          const media = listing?.media?.[0];
          return media?.image?.url || media?.imagePath || null;
        },
      }),
    }),
    media: relationship({
      ref: 'ListingMedia.listing',
      many: true,
      ui: {
        displayMode: 'cards',
        cardFields: ['image', 'imagePath', 'altText', 'caption', 'order'],
        inlineCreate: { fields: ['image', 'imagePath', 'altText', 'caption', 'order'] },
        inlineEdit: { fields: ['image', 'imagePath', 'altText', 'caption', 'order'] },
      },
    }),
    amenities: relationship({ ref: 'Amenity.listings', many: true }),
    collections: relationship({ ref: 'StayCollection.listings', many: true }),
    houseRules: relationship({ ref: 'HouseRule.listing', many: true }),
    calendarBlocks: relationship({
      ref: 'CalendarBlock.listing',
      many: true,
      access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    // Pricing links need pricing authority, not only listing authority; read-only pricing can't repoint them.
    ratePlans: relationship({ ref: 'RatePlan.listing', many: true, access: { create: permissions.canManagePricing, update: permissions.canManagePricing }, ui: { displayMode: 'count' } }),
    feeDefinitions: relationship({ ref: 'FeeDefinition.listing', many: true, access: { create: permissions.canManagePricing, update: permissions.canManagePricing } }),
    taxRules: relationship({ ref: 'TaxRule.listing', many: true, access: { create: permissions.canManagePricing, update: permissions.canManagePricing } }),
    // History (issued quotes, conversations, reviews, tasks) is never moved or detached from a parent's form.
    quotes: relationship({ ref: 'StayQuote.listing', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count', createView: { fieldMode: 'hidden' } } }),
    reservations: relationship({
      ref: 'Reservation.listing',
      many: true,
      // Reservations move only through allocation and lifecycle commands, never from a parent's form.
      access: { read: permissions.canReadReservations, create: () => false, update: () => false }, ui: { displayMode: 'count' } }),
    conversations: relationship({ ref: 'Conversation.listing', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count', createView: { fieldMode: 'hidden' } } }),
    reviews: relationship({ ref: 'Review.listing', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count', createView: { fieldMode: 'hidden' } } }),
    tasks: relationship({ ref: 'PropertyTask.listing', many: true, access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count', createView: { fieldMode: 'hidden' } } }),
    channelListings: relationship({ ref: 'ChannelListing.listing', many: true, access: { create: permissions.canManageChannels, update: permissions.canManageChannels }, ui: { displayMode: 'count' } }),
    ...trackingFields,
  },
});
