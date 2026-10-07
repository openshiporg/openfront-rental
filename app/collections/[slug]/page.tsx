import { buildStorefrontMetadata } from '@/features/storefront/lib/metadata';
import { CollectionsPage } from '@/features/storefront/screens/collections/CollectionsPage';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return buildStorefrontMetadata({ title: 'Stay collection', path: `/collections/${encodeURIComponent(slug)}` });
}
export default CollectionsPage;
