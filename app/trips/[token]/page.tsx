import { buildStorefrontMetadata } from '@/features/storefront/lib/metadata';
import { TripPage } from '@/features/storefront/screens/trips/TripPage';

export async function generateMetadata() {
  return buildStorefrontMetadata({ title: 'Your trip', description: 'Private stay details, payments, agreement, messages, and cancellation.', path: '/trips', index: false });
}

export default TripPage;
