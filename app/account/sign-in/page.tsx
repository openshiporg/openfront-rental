import { buildStorefrontMetadata } from '@/features/storefront/lib/metadata';
import { SignInPage } from '@/features/storefront/screens/account/AccountAuthPages';
export const dynamic = 'force-dynamic';
export async function generateMetadata() { return buildStorefrontMetadata({ title: 'Sign in', path: '/account/sign-in', index: false }); }
export default SignInPage;
