import { buildStorefrontMetadata } from '@/features/storefront/lib/metadata';
import { CollectionsPage } from '@/features/storefront/screens/collections/CollectionsPage';
export const dynamic = 'force-dynamic';
export async function generateMetadata() { return buildStorefrontMetadata({ title: 'Collections', path: '/collections' }); }
export default CollectionsPage;
