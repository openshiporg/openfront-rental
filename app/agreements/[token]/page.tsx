import { buildStorefrontMetadata } from '@/features/storefront/lib/metadata';
import { StayAgreementPage } from '@/features/storefront/screens/agreements/StayAgreementPage';

export async function generateMetadata() {
  return buildStorefrontMetadata({ title: 'Stay agreement', description: 'Review and sign the terms captured for a private stay.', path: '/agreements', index: false });
}

export default StayAgreementPage;
