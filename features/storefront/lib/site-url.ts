import { headers } from 'next/headers';

/** Absolute storefront origin for robots and sitemap entries (they aren't resolved against metadataBase). */
export async function storefrontOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return new URL(configured).origin;
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || 'localhost:3000';
  const protocol = requestHeaders.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
}
