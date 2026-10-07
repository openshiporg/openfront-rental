import { buildStorefrontMetadata } from '@/features/storefront/lib/metadata';
import { HelpPage } from '@/features/storefront/screens/help/HelpPage';
export const dynamic = 'force-dynamic';
export async function generateMetadata() { return buildStorefrontMetadata({ title: 'Contact & help', path: '/help' }); }
export default HelpPage;
