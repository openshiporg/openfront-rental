'use client';

import { PlatformRouteError } from '@/features/platform/operations/components/PlatformRouteState';

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <PlatformRouteError reset={reset} />;
}
