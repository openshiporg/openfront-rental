import { buildStorefrontMetadata } from '@/features/storefront/lib/metadata';
import { ResetPage } from '@/features/storefront/screens/account/AccountAuthPages';
export const dynamic = 'force-dynamic';
export async function generateMetadata() { return buildStorefrontMetadata({ title: 'Reset your password', path: '/account/reset', index: false }); }
export default ResetPage;
