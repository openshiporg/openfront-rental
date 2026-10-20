import { buildStorefrontMetadata } from '@/features/storefront/lib/metadata';
import { GuestThreadPage } from '@/features/storefront/screens/messages/GuestThreadPage';
export const dynamic = 'force-dynamic';
export async function generateMetadata() { return buildStorefrontMetadata({ title: 'Your conversation', path: '/messages', index: false }); }
export default GuestThreadPage;
