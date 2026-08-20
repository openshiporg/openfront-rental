import { buildStorefrontMetadata } from '@/features/storefront/lib/metadata';
import { StayDetailPage } from '@/features/storefront/screens/stays/StayDetailPage';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return buildStorefrontMetadata({ title: slug.split('-').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' '), path: `/stays/${slug}` });
}

export default StayDetailPage;
