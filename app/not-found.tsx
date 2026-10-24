import { UnavailableStay } from '@/features/storefront/components/Journey';
import { StorefrontShell } from '@/features/storefront/components/StorefrontShell';
import { buildStorefrontMetadata } from '@/features/storefront/lib/metadata';

export async function generateMetadata() {
  return buildStorefrontMetadata({ title: 'Page not found', path: '/404', index: false });
}

export default function NotFound() {
  return <StorefrontShell><UnavailableStay title="Page not found">This page doesn’t exist or is no longer published.</UnavailableStay></StorefrontShell>;
}
