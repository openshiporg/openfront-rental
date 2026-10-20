import type { LucideIcon } from 'lucide-react';
import {
  BadgeDollarSign,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  FileSignature,
  Home,
  LayoutDashboard,
  MessageSquare,
  RadioTower,
  Settings2,
  Star,
  Users,
  WalletCards,
} from 'lucide-react';

export const platformNavPermissions = [
  'canReadProperties',
  'canReadListings',
  'canReadCalendar',
  'canReadReservations',
  'canReadGuests',
  'canReadMessages',
  'canReadPricing',
  'canReadPayments',
  'canReadPayouts',
  'canReadReports',
  'canReadChannels',
  'canReadReviews',
  'canManageSettings',
] as const;

export type PlatformPermission = (typeof platformNavPermissions)[number];

export interface PlatformNavItem {
  title: string;
  href: string;
  color: string;
  description: string;
  icon: LucideIcon;
  group?: string;
  permission: PlatformPermission;
}

export interface PlatformNavGroup {
  id: string;
  title: string;
  icon: LucideIcon;
  items: PlatformNavItem[];
}

export const platformNavItems: PlatformNavItem[] = [
  { title: 'Today', href: '/platform/today', color: 'emerald', description: 'Arrivals, departures, in-house guests, and work waiting on you', icon: LayoutDashboard, group: 'standalone', permission: 'canReadReservations' },
  { title: 'Properties', href: '/platform/properties', color: 'teal', description: 'Homes, addresses, units, bedrooms, and beds', icon: Home, group: 'host-operations', permission: 'canReadProperties' },
  { title: 'Listings', href: '/platform/listings', color: 'cyan', description: 'Public pages, media, amenities, and house rules', icon: Home, group: 'host-operations', permission: 'canReadListings' },
  { title: 'Calendar', href: '/platform/calendar', color: 'blue', description: 'Reservation, owner, preparation, and channel blocks', icon: CalendarDays, group: 'host-operations', permission: 'canReadCalendar' },
  { title: 'Tasks', href: '/platform/tasks', color: 'slate', description: 'Housekeeping, inspections, maintenance, and readiness evidence', icon: ClipboardCheck, group: 'host-operations', permission: 'canReadProperties' },
  { title: 'Reservations', href: '/platform/reservations', color: 'indigo', description: 'Upcoming, in-stay, completed, and cancelled stays', icon: CalendarDays, group: 'guest-operations', permission: 'canReadReservations' },
  { title: 'Agreements', href: '/platform/agreements', color: 'violet', description: 'Versioned terms and signature evidence', icon: FileSignature, group: 'guest-operations', permission: 'canReadReservations' },
  { title: 'Guests', href: '/platform/guests', color: 'purple', description: 'Guest profiles, parties, verification, and stay history', icon: Users, group: 'guest-operations', permission: 'canReadGuests' },
  { title: 'Inbox', href: '/platform/inbox', color: 'cyan', description: 'Guest and channel conversations', icon: MessageSquare, group: 'guest-operations', permission: 'canReadMessages' },
  { title: 'Pricing', href: '/platform/pricing', color: 'emerald', description: 'Nightly rates, seasons, fees, taxes, and policies', icon: BadgeDollarSign, group: 'commercial', permission: 'canReadPricing' },
  { title: 'Payments', href: '/platform/payments', color: 'blue', description: 'Immutable settlement evidence and refunds', icon: CreditCard, group: 'commercial', permission: 'canReadPayments' },
  { title: 'Payouts', href: '/platform/payouts', color: 'teal', description: 'Owner assignments, statements, and payout evidence', icon: WalletCards, group: 'commercial', permission: 'canReadPayouts' },
  { title: 'Reports', href: '/platform/reports', color: 'indigo', description: 'Occupancy, revenue, owner net, task health, and channel evidence', icon: BarChart3, group: 'commercial', permission: 'canReadReports' },
  { title: 'Channels', href: '/platform/channels', color: 'sky', description: 'Listing mappings, imports, and sync evidence', icon: RadioTower, group: 'configuration', permission: 'canReadChannels' },
  { title: 'Reviews', href: '/platform/reviews', color: 'amber', description: 'Guest and host review workflow', icon: Star, group: 'configuration', permission: 'canReadReviews' },
  { title: 'Store Settings', href: '/platform/store-settings', color: 'slate', description: 'Public identity, contact, localization, and accent theme', icon: Settings2, group: 'configuration', permission: 'canManageSettings' },
];

export const platformStandaloneItems = platformNavItems.filter((item) => item.group === 'standalone');

export const platformNavGroups: PlatformNavGroup[] = [
  { id: 'host-operations', title: 'Host operations', icon: Home, items: platformNavItems.filter((item) => item.group === 'host-operations') },
  { id: 'guest-operations', title: 'Guest operations', icon: Users, items: platformNavItems.filter((item) => item.group === 'guest-operations') },
  { id: 'commercial', title: 'Commercial', icon: BadgeDollarSign, items: platformNavItems.filter((item) => item.group === 'commercial') },
  { id: 'configuration', title: 'Configuration', icon: Settings2, items: platformNavItems.filter((item) => item.group === 'configuration') },
];

/**
 * Platform entries for the shared Sidebar. Given a role, only its permitted pages are
 * listed. The canonical Sidebar calls this without a user (as in E-commerce), so every
 * entry is listed and each platform page and command enforces the operator's access.
 */
export function getPlatformNavItemsWithBasePath(
  basePath: string,
  user?: { role?: Partial<Record<PlatformPermission, boolean>> | null } | null,
) {
  const role = user?.role;
  return platformNavItems
    .filter((item) => !role || role[item.permission] === true)
    .map((item) => ({ ...item, href: `${basePath}${item.href}` }));
}

// Compatibility export for Rental platform consumers outside the shared dashboard slice.
export const platformNavigation = platformNavItems.map((item) => ({ ...item, href: `/dashboard${item.href}` }));
