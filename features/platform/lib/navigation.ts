import { BadgeDollarSign, BarChart3, CalendarDays, ClipboardCheck, CreditCard, FileSignature, Home, LayoutDashboard, MessageSquare, RadioTower, Settings2, Star, Users, WalletCards } from 'lucide-react';

export const platformStandaloneItems = [
  { title: 'Overview', href: '/dashboard', description: 'Host operations overview', icon: LayoutDashboard },
] as const;

export const platformNavGroups = [
  {
    id: 'host-operations',
    title: 'Host operations',
    icon: Home,
    items: [
      { title: 'Properties', href: '/platform/properties', description: 'Homes, addresses, units, bedrooms, and beds', icon: Home },
      { title: 'Listings', href: '/platform/listings', description: 'Public pages, media, amenities, and house rules', icon: Home },
      { title: 'Calendar', href: '/platform/calendar', description: 'Reservation, owner, preparation, and channel blocks', icon: CalendarDays },
      { title: 'Tasks', href: '/platform/tasks', description: 'Housekeeping, inspections, maintenance, and readiness evidence', icon: ClipboardCheck },
      { title: 'Reservations', href: '/platform/reservations', description: 'Upcoming, in-stay, completed, and cancelled stays', icon: CalendarDays },
      { title: 'Agreements', href: '/platform/agreements', description: 'Versioned terms and signature evidence', icon: FileSignature },
      { title: 'Guests', href: '/platform/guests', description: 'Guest profiles, parties, verification, and stay history', icon: Users },
      { title: 'Pricing', href: '/platform/pricing', description: 'Nightly rates, seasons, fees, taxes, and policies', icon: BadgeDollarSign },
      { title: 'Inbox', href: '/platform/inbox', description: 'Guest and channel conversations', icon: MessageSquare },
      { title: 'Channels', href: '/platform/channels', description: 'Listing mappings, imports, and sync evidence', icon: RadioTower },
      { title: 'Payments', href: '/platform/payments', description: 'Immutable settlement evidence and refunds', icon: CreditCard },
      { title: 'Payouts', href: '/platform/payouts', description: 'Owner assignments, statements, and payout evidence', icon: WalletCards },
      { title: 'Reports', href: '/platform/reports', description: 'Occupancy, revenue, owner net, task health, and channel evidence', icon: BarChart3 },
      { title: 'Reviews', href: '/platform/reviews', description: 'Guest and host review workflow', icon: Star },
      { title: 'Storefront settings', href: '/platform/store-settings', description: 'Public identity, contact, localization, and accent theme', icon: Settings2 },
    ],
  },
] as const;

export const platformNavigation = [
  ...platformStandaloneItems,
  ...platformNavGroups[0].items.map((item) => ({ ...item, href: `/dashboard${item.href}` })),
] as const;
