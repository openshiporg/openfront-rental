const DEFAULT_DASHBOARD_PATH = '/dashboard';
const REDIRECT_ORIGIN = 'https://housekind.invalid';
const NESTED_REDIRECT_PARAMETERS = new Set(['from', 'next', 'returnto', 'redirect', 'redirectto', 'callbackurl', 'continue']);
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f-\u009f]/;
const ENCODED_PATH_DELIMITER_OR_CONTROL = /%(?:2f|5c|25|0[0-9a-f]|1[0-9a-f]|7f)/i;

function isDashboardPath(pathname: string) {
  return pathname === '/dashboard' || pathname.startsWith('/dashboard/');
}

export function safeDashboardRedirect(value: unknown) {
  if (typeof value !== 'string') return DEFAULT_DASHBOARD_PATH;
  const candidate = value.trim();
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\') || CONTROL_CHARACTER.test(candidate)) {
    return DEFAULT_DASHBOARD_PATH;
  }

  let target: URL;
  try {
    target = new URL(candidate, REDIRECT_ORIGIN);
  } catch {
    return DEFAULT_DASHBOARD_PATH;
  }
  if (target.origin !== REDIRECT_ORIGIN || !isDashboardPath(target.pathname)) return DEFAULT_DASHBOARD_PATH;
  if (ENCODED_PATH_DELIMITER_OR_CONTROL.test(target.pathname)) return DEFAULT_DASHBOARD_PATH;

  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(target.pathname);
  } catch {
    return DEFAULT_DASHBOARD_PATH;
  }
  if (decodedPath.includes('\\') || CONTROL_CHARACTER.test(decodedPath) || !isDashboardPath(decodedPath)) {
    return DEFAULT_DASHBOARD_PATH;
  }

  for (const key of [...target.searchParams.keys()]) {
    if (NESTED_REDIRECT_PARAMETERS.has(key.toLowerCase())) target.searchParams.delete(key);
  }
  return `${target.pathname}${target.search}${target.hash}`;
}
