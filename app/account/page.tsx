import { buildStorefrontMetadata } from '@/features/storefront/lib/metadata';
import { AccountPage } from '@/features/storefront/screens/account/AccountPage';
export const dynamic = 'force-dynamic';
export async function generateMetadata() { return buildStorefrontMetadata({ title: 'Your account', path: '/account', index: false }); }
export default AccountPage;
