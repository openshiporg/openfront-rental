import { buildStorefrontMetadata } from '@/features/storefront/lib/metadata';
import { PoliciesPage } from '@/features/storefront/screens/help/PoliciesPage';
export const dynamic = 'force-dynamic';
export async function generateMetadata() { return buildStorefrontMetadata({ title: 'Booking & policies', path: '/policies' }); }
export default PoliciesPage;
