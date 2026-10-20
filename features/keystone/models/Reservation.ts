import { list } from '@keystone-6/core';
import { denyAll } from '@keystone-6/core/access';
import { checkbox, integer, json, relationship, select, text, timestamp } from '@keystone-6/core/fields';

import { isSignedIn, permissions, rules } from '../access';
import { trackingFields } from './trackingFields';

export const Reservation = list({
  access: {
    operation: { query: isSignedIn, create: () => false, update: () => false, delete: () => false },
    filter: { query: rules.canReadHostScopedRecords('canReadReservations') },
  },
  ui: {
    listView: { initialColumns: ['confirmationCode', 'status', 'listing', 'guest', 'checkInDate', 'checkOutDate', 'totalAmountCents'] },
  },
  fields: {
    hostOrganization: relationship({ ref: 'HostOrganization.reservations' }),
    listing: relationship({ ref: 'Listing.reservations' }),
    accommodationUnit: relationship({ ref: 'AccommodationUnit.reservations' }),
    guest: relationship({ ref: 'GuestProfile.reservations' }),
    guestParty: relationship({ ref: 'GuestParty.reservation' }),
    bookedBy: relationship({
      ref: 'User.customerReservations',
      access: { read: permissions.canReadReservations, create: denyAll, update: denyAll },
      ui: { itemView: { fieldMode: 'read' }, createView: { fieldMode: 'hidden' } },
    }),
    quote: relationship({ ref: 'StayQuote.reservation' }),
    confirmationCode: text({ validation: { isRequired: true }, isIndexed: 'unique' }),
    tripTokenHash: text({
      validation: { isRequired: true },
      isIndexed: 'unique',
      access: { read: permissions.canManageReservations, update: () => false },
      ui: { itemView: { fieldMode: 'hidden' }, createView: { fieldMode: 'hidden' }, listView: { fieldMode: 'hidden' } },
    }),
    tripTokenExpiresAt: timestamp({ validation: { isRequired: true } }),
    tripTokenRevokedAt: timestamp(),
    status: select({
      type: 'string',
      options: [
        { label: 'Inquiry', value: 'inquiry' },
        { label: 'Quoted', value: 'quoted' },
        { label: 'Pending', value: 'pending' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'In Stay', value: 'in_stay' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'No-show', value: 'no_show' },
      ],
      defaultValue: 'pending',
    }),
    testMode: checkbox({
      defaultValue: false,
      access: { create: denyAll, update: denyAll },
      ui: {
        description: 'A test booking the guest explicitly chose at checkout (store permission and Stripe test mode required). It holds no dates, takes only test-card payments, and is kept out of real money, statements and reports.',
        itemView: { fieldMode: 'read' }, createView: { fieldMode: 'hidden' },
      },
    }),
    paymentStatus: select({
      type: 'string',
      options: [
        { label: 'Unpaid', value: 'unpaid' },
        { label: 'Partial', value: 'partial' },
        { label: 'Paid', value: 'paid' },
        { label: 'Partially Refunded', value: 'partially_refunded' },
        { label: 'Refund Pending', value: 'refund_pending' },
        { label: 'Refunded', value: 'refunded' },
      ],
      defaultValue: 'unpaid',
    }),
    source: select({
      type: 'string',
      options: [
        { label: 'Direct', value: 'direct' },
        { label: 'Operator', value: 'operator' },
        { label: 'Airbnb', value: 'airbnb' },
        { label: 'Vrbo', value: 'vrbo' },
        { label: 'Booking.com', value: 'booking_com' },
        { label: 'PMS', value: 'pms' },
        { label: 'iCal', value: 'ical' },
      ],
      defaultValue: 'direct',
    }),
    checkInDate: text({ validation: { isRequired: true } }),
    checkOutDate: text({ validation: { isRequired: true } }),
    scheduledCheckInTime: text(),
    scheduledCheckOutTime: text(),
    checkedInAt: timestamp(),
    checkedOutAt: timestamp(),
    cancelledAt: timestamp(),
    cancellationReason: text({ ui: { displayMode: 'textarea' } }),
    cancelledBy: select({
      type: 'string',
      options: [
        { label: 'Guest', value: 'guest' },
        { label: 'Host', value: 'host' },
        { label: 'System', value: 'system' },
        { label: 'Channel', value: 'channel' },
      ],
    }),
    currencyCode: text({ defaultValue: 'USD', validation: { isRequired: true } }),
    lodgingSubtotalCents: integer({ defaultValue: 0, validation: { min: 0 } }),
    feeTotalCents: integer({ defaultValue: 0, validation: { min: 0 } }),
    taxTotalCents: integer({ defaultValue: 0, validation: { min: 0 } }),
    discountTotalCents: integer({ defaultValue: 0, validation: { min: 0 } }),
    securityDepositCents: integer({ defaultValue: 0, validation: { min: 0 } }),
    totalAmountCents: integer({ defaultValue: 0, validation: { min: 0 } }),
    amountPaidCents: integer({ defaultValue: 0, validation: { min: 0 } }),
    bookingSnapshot: json({ access: { update: () => false }, ui: { itemView: { fieldMode: 'read' } } }),
    fixtureOrigin: text({
      db: { isNullable: true },
      access: { create: denyAll, update: denyAll },
      ui: {
        description: 'Set only for onboarding sample stays, from setup lineage. A sample holds no real capacity, money, earnings or guest assent.',
        itemView: { fieldMode: 'read' }, createView: { fieldMode: 'hidden' },
      },
    }),
    fixtureEvidence: json({
      access: { create: denyAll, update: denyAll },
      ui: { description: 'How this stay was identified as a setup sample (setup run, or an exact setup identity).', itemView: { fieldMode: 'read' }, createView: { fieldMode: 'hidden' }, listView: { fieldMode: 'hidden' } },
    }),
    tripLinkDelivery: json({
      access: { create: denyAll, update: denyAll },
      ui: {
        description: 'Last emailed trip-link delivery from Find my trip: attempt id, status (sending, sent, failed, unknown) and times. Never holds a link.',
        itemView: { fieldMode: 'read' }, createView: { fieldMode: 'hidden' }, listView: { fieldMode: 'hidden' },
      },
    }),
    guestNotes: text({ ui: { displayMode: 'textarea' } }),
    internalNotes: text({ ui: { displayMode: 'textarea' } }),
    lineItems: relationship({ ref: 'ReservationLineItem.reservation', many: true, ui: { displayMode: 'count' } }),
    amendments: relationship({ ref: 'ReservationAmendment.reservation', many: true, access: { create: () => false, update: () => false }, ui: { displayMode: 'count' } }),
    calendarBlocks: relationship({
      ref: 'CalendarBlock.reservation',
      many: true,
      access: { create: denyAll, update: denyAll }, ui: { displayMode: 'count' } }),
    agreement: relationship({ ref: 'StayAgreement.reservation' }),
    securityDeposit: relationship({ ref: 'SecurityDeposit.reservation' }),
    damageClaims: relationship({ ref: 'DamageClaim.reservation', many: true, ui: { displayMode: 'count' } }),
    payments: relationship({ ref: 'Payment.reservation', many: true, ui: { displayMode: 'count' } }),
    refunds: relationship({ ref: 'Refund.reservation', many: true, ui: { displayMode: 'count' } }),
    payout: relationship({ ref: 'Payout.reservation' }),
    conversation: relationship({ ref: 'Conversation.reservation' }),
    reviews: relationship({ ref: 'Review.reservation', many: true, ui: { displayMode: 'count' } }),
    channelReservation: relationship({ ref: 'ChannelReservation.reservation' }),
    tasks: relationship({ ref: 'PropertyTask.reservation', many: true, ui: { displayMode: 'count' } }),
    ...trackingFields,
  },
});
