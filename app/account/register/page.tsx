import { buildStorefrontMetadata } from '@/features/storefront/lib/metadata';
import { RegisterPage } from '@/features/storefront/screens/account/AccountAuthPages';
export const dynamic = 'force-dynamic';
export async function generateMetadata() { return buildStorefrontMetadata({ title: 'Create an account', path: '/account/register', index: false }); }
export default RegisterPage;
