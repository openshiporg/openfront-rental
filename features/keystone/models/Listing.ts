import { graphql, list } from '@keystone-6/core';
import { denyAll } from '@keystone-6/core/access';
import { checkbox, integer, relationship, select, text, virtual } from '@keystone-6/core/fields';

import { hostScopedListAccess, permissions } from '../access';
import { hostScopedHooks } from '../utils/hostOrganizationAccess';
import { trackingFields } from './trackingFields';

export const Listing = list({
  access: hostScopedListAccess('canReadListings', 'canManageListings'),
  hooks: hostScopedHooks('canManageListings'),
  ui: {
    labelField: 'title',
    listView: { initialColumns: ['title', 'status', 'property', 'accommodationUnit', 'baseNightlyRateCents', 'instantBook'] },
  },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization.listings' }),
    property: relationship({
      ref: 'Property.listings',
      access: { read: permissions.canReadProperties, update: permissions.canManageProperties },
    }),
    accommodationUnit: relationship({ ref: 'AccommodationUnit.listings' }),
    title: text({ validation: { isRequired: true } }),
    slug: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    subtitle: text(),
    description: text({ ui: { displayMode: 'textarea' } }),
    status: select({
      type: 'string',
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
    advanceNoticeHours: integer({ defaultValue: 24, validation: { min: 0 }, ui: { description: 'Informational configuration only: stay search, quote, and reservation conversion do not currently enforce this notice.' } }),
    bookingWindowDays: integer({ defaultValue: 365, validation: { min: 1 }, ui: { description: 'Informational configuration only: stay search, quote, and reservation conversion do not currently enforce this window.' } }),
    reviewAverageHundredths: integer({ defaultValue: 0, validation: { min: 0, max: 500 } }),
    reviewCount: integer({ defaultValue: 0, validation: { min: 0 } }),
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
      access: { create: denyAll, update: denyAll },
    }),
    ratePlans: relationship({ ref: 'RatePlan.listing', many: true }),
    feeDefinitions: relationship({ ref: 'FeeDefinition.listing', many: true }),
    taxRules: relationship({ ref: 'TaxRule.listing', many: true }),
    quotes: relationship({ ref: 'StayQuote.listing', many: true }),
    reservations: relationship({
      ref: 'Reservation.listing',
      many: true,
      access: { read: permissions.canReadReservations, update: () => false },
    }),
    conversations: relationship({ ref: 'Conversation.listing', many: true }),
    reviews: relationship({ ref: 'Review.listing', many: true }),
    tasks: relationship({ ref: 'PropertyTask.listing', many: true }),
    channelListings: relationship({ ref: 'ChannelListing.listing', many: true }),
    ...trackingFields,
  },
});
