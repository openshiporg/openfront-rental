import { buildStorefrontMetadata } from '@/features/storefront/lib/metadata';
import { StorefrontLandingPage } from '@/features/storefront/screens/landing/StorefrontLandingPage';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return buildStorefrontMetadata({ path: '/' });
}

export default StorefrontLandingPage;
