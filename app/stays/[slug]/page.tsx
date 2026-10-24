import { notFound } from 'next/navigation';

import { buildStorefrontMetadata } from '@/features/storefront/lib/metadata';
import { getPublicStay } from '@/features/storefront/lib/data/stays';
import { StayDetailPage } from '@/features/storefront/screens/stays/StayDetailPage';

function shareDescription(text?: string) {
  const plain = (text || '').replace(/\s+/g, ' ').trim();
  return plain.length > 160 ? `${plain.slice(0, 157).trimEnd()}…` : plain || undefined;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { stay, error } = await getPublicStay(slug);
  // An unpublished or unknown home is a real 404, not an indexable "unavailable" page.
  if (!stay && !error) notFound();
  if (!stay) return buildStorefrontMetadata({ title: 'Home unavailable', path: `/stays/${slug}`, index: false });
  const image = stay.media?.find((photo) => photo?.url)?.url || stay.thumbnail;
  return buildStorefrontMetadata({ title: stay.title, description: shareDescription(stay.subtitle || stay.description), path: `/stays/${stay.slug}`, image });
}

export default StayDetailPage;
