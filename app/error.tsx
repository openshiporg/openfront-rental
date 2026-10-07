'use client';

import { StorefrontRouteError } from '@/features/storefront/components/StorefrontRouteState';

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <StorefrontRouteError reset={reset} />;
}
