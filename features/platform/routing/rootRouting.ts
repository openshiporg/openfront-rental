export const DASHBOARD_ROOT = '/dashboard';
export const DASHBOARD_INIT = '/dashboard/init';

export function getFreshInstallRootRedirect(pathname: string, redirectToInit: boolean) {
  return redirectToInit && pathname === '/' ? DASHBOARD_ROOT : null;
}

export function getFreshInstallPublicRedirect(pathname: string, redirectToInit: boolean) {
  return redirectToInit && pathname !== '/' && !pathname.startsWith(DASHBOARD_ROOT)
    ? DASHBOARD_INIT
    : null;
}
