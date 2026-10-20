import type { OnboardingOperation } from '@/features/onboarding/types';
import type { AccommodationSeed } from '../utils/dataUtils';

export function validateRentalOnboardingSeed(seed: AccommodationSeed) {
  for (const reservation of seed.reservations) {
    const property = seed.properties.find(p => p.listing.slug === reservation.listingSlug);
    if (!property) throw new Error('A stay references an unknown listing.');
    if (reservation.nights < property.listing.minimumStay || reservation.nights > property.listing.maximumStay) throw new Error(`${property.listing.title}: sample stay length must fit the configured minimum and maximum stay.`);
    if (reservation.adults + reservation.children > property.unit.maxGuests) throw new Error(`${property.listing.title}: sample guests exceed the configured capacity.`);
  }
}

/**
 * Models that setup never fills, because only real activity creates them. Each gets a
 * readiness check of its real prerequisite instead of a fabricated record.
 */
export const RENTAL_LIFECYCLE_READINESS = [
  { id: 'lifecycle:stay-quotes', model: 'StayQuote', label: 'Guest quotes · from a bookable listing with rates and terms' },
  { id: 'lifecycle:amendments', model: 'ReservationAmendment', label: 'Stay changes · made by the host on confirmed stays' },
  { id: 'lifecycle:damage-claims', model: 'DamageClaim', label: 'Damage claims · opened by the host after a stay' },
  { id: 'lifecycle:refunds', model: 'Refund', label: 'Refunds · need an installed payment method' },
  { id: 'lifecycle:payment-webhooks', model: 'PaymentWebhookEvent', label: 'Payment confirmations · arrive from the card provider' },
  { id: 'lifecycle:channel-reservations', model: 'ChannelReservation', label: 'Channel bookings · not used by availability-only calendars' },
  { id: 'lifecycle:outbox', model: 'OutboxEvent', label: 'Notification events · recorded; delivery isn’t set up in this app' },
] as const;

/** Stable record identities, never display copy, address chips and server commands. */
export function rentalOnboardingPlan(seed: AccommodationSeed): OnboardingOperation[] {
  const item = (section: string, id: string, label: string): OnboardingOperation => ({ section, id, label, message: `Creating ${label}…` });
  return [
    item('business', 'settings', seed.settings.name),
    item('business', seed.hostOrganization.id, seed.hostOrganization.name),
    ...seed.amenities.map(a => item('amenities', a.id, a.name)),
    ...seed.properties.map(p => item('properties', p.id, p.name)),
    ...seed.properties.map(p => item('accommodations', p.unit.id, `${p.unit.name} · ${p.listing.title}`)),
    item('policies', seed.cancellationPolicy.id, seed.cancellationPolicy.name),
    ...seed.properties.map(p => item('policies', `${p.listing.id}:rules`, `${p.listing.title} house rules`)),
    ...seed.properties.map(p => item('rates', `${p.listing.id}:rates`, `${p.listing.title} · ${new Intl.NumberFormat('en-US', { style: 'currency', currency: seed.settings.currencyCode }).format(p.listing.baseNightlyRateCents / 100)}/night`)),
    ...seed.properties.map(p => item('availability', `${p.listing.id}:calendar`, `${p.listing.title} calendar`)),
    ...seed.calendarBlocks.map(b => item('availability', b.id, b.notes)),
    ...seed.guests.map(g => item('workflows', g.id, g.name)),
    item('workflows', seed.paymentProvider.id, seed.paymentProvider.name),
    item('workflows', seed.cardPaymentProvider.id, seed.cardPaymentProvider.name),
    ...seed.reservations.map(r => item('workflows', r.id, `${r.confirmationCode} stay workflow`)),
    ...seed.tasks.map(t => item('workflows', t.id, t.title)),
    ...(seed.reservations.some(r => r.id === 'reservation_tidehouse_completed') ? [item('workflows', 'owner-accounting', 'Owner statement & payout records')] : []),
    ...(seed.channel ? [item('workflows', seed.channel.connection.id, 'Availability-only calendar connection')] : []),
    ...RENTAL_LIFECYCLE_READINESS.map(entry => ({ ...item('readiness', entry.id, entry.label), message: `Checking ${entry.label}…` })),
  ];
}

export const rentalSectionLabels = [
  ['business', 'Business & Host'], ['amenities', 'Amenities'], ['properties', 'Properties'],
  ['accommodations', 'Accommodations & Listings'], ['policies', 'Policies & House Rules'],
  ['rates', 'Rates, Fees & Taxes'], ['availability', 'Availability & Calendar'], ['workflows', 'Host & Guest Workflows'],
  ['readiness', 'Ready for real activity'],
] as const;
