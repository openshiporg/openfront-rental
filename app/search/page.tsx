import { buildStorefrontMetadata } from '@/features/storefront/lib/metadata';
import { StaySearchPage } from '@/features/storefront/screens/search/StaySearchPage';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return buildStorefrontMetadata({ title: 'Find a stay', description: 'Search independent short-term homes by destination, dates, and guest party.', path: '/search' });
}

export default StaySearchPage;
