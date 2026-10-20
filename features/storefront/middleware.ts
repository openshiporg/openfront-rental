import { NextResponse, type NextRequest } from 'next/server';

// The vertical's storefront hook for the shared proxy (as in Openfront Restaurant). Rental needs no
// region, cart-cookie or redirect handling; the shared proxy already sends a fresh install to setup.
export async function handleStorefrontRoutes(_request: NextRequest, _user: unknown) {
  return NextResponse.next();
}
