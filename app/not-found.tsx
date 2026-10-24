import { UnavailableStay } from '@/features/storefront/components/Journey';
import { StorefrontShell } from '@/features/storefront/components/StorefrontShell';

export default function NotFound() {
  return <StorefrontShell><UnavailableStay title="Page not found">This page doesn’t exist or is no longer published.</UnavailableStay></StorefrontShell>;
}
