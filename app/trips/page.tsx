import { buildStorefrontMetadata } from '@/features/storefront/lib/metadata';
import { TripEntryPage } from '@/features/storefront/screens/trips/TripEntryPage';
export const dynamic = 'force-dynamic';
export async function generateMetadata() { return buildStorefrontMetadata({ title: 'Open your trip', path: '/trips', index: false }); }
export default TripEntryPage;
