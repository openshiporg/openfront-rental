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
    ...seed.reservations.map(r => item('workflows', r.id, `${r.confirmationCode} stay workflow`)),
    ...seed.tasks.map(t => item('workflows', t.id, t.title)),
    ...(seed.reservations.some(r => r.id === 'reservation_tidehouse_completed') ? [item('workflows', 'owner-accounting', 'Owner statement & payout records')] : []),
    ...(seed.channel ? [item('workflows', seed.channel.connection.id, 'Availability-only calendar connection')] : []),
  ];
}

export const rentalSectionLabels = [
  ['business', 'Business & Host'], ['amenities', 'Amenities'], ['properties', 'Properties'],
  ['accommodations', 'Accommodations & Listings'], ['policies', 'Policies & House Rules'],
  ['rates', 'Rates, Fees & Taxes'], ['availability', 'Availability & Calendar'], ['workflows', 'Host & Guest Workflows'],
] as const;
