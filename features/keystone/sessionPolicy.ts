export const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

export function createKeystoneSessionConfig(secret: string) {
  return { maxAge: AUTH_SESSION_MAX_AGE_SECONDS, secret };
}

export function createDashboardSessionCookieOptions(isProduction: boolean) {
  return {
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    httpOnly: true,
    maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
  };
}
