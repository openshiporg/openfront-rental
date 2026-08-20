import { buildStorefrontMetadata } from '@/features/storefront/lib/metadata';
import { StayCheckoutPage } from '@/features/storefront/screens/checkout/StayCheckoutPage';

export async function generateMetadata() {
  return buildStorefrontMetadata({ title: 'Complete your reservation', description: 'Review a private stay quote and provide guest details.', path: '/checkout', index: false });
}

export default StayCheckoutPage;
