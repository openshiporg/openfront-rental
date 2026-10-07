import { buildStorefrontMetadata } from '@/features/storefront/lib/metadata';
import { ComparePage } from '@/features/storefront/screens/compare/ComparePage';
export const dynamic = 'force-dynamic';
export async function generateMetadata() { return buildStorefrontMetadata({ title: 'Compare homes', path: '/compare', index: false }); }
export default ComparePage;
