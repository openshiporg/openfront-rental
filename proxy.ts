import { handleDashboardRoutes, getAuthenticatedUser } from '@/features/dashboard/middleware';
import { NextRequest, NextResponse } from 'next/server';
import {
  getFreshInstallPublicRedirect,
  getFreshInstallRootRedirect,
} from '@/features/platform/routing/rootRouting';

export async function proxy(request: NextRequest) {
  // Get authenticated user once
  const { user, redirectToInit } = await getAuthenticatedUser(request);
  
  const rootRedirect = getFreshInstallRootRedirect(request.nextUrl.pathname, redirectToInit);
  if (rootRedirect) return NextResponse.redirect(new URL(rootRedirect, request.url));

  const publicRedirect = getFreshInstallPublicRedirect(request.nextUrl.pathname, redirectToInit);
  if (publicRedirect) return NextResponse.redirect(new URL(publicRedirect, request.url));

  // Let the shared dashboard handler own /dashboard → /dashboard/init.
  const dashboardResponse = await handleDashboardRoutes(request, user, redirectToInit);
  if (dashboardResponse) return dashboardResponse;
  
  // Continue with existing middleware logic {
  // Add any middleware logic here if needed
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.svg (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.svg).*)',
  ],
};