type InternalOriginOptions = {
  configuredBackendUrl?: string;
  configuredAppUrl?: string;
  environment?: string;
  port?: string;
};

// Adapted from Openfront E-commerce's deployment-owned self-call origin.
export function normalizeBackendOrigin(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('The Keystone backend URL must be an absolute HTTP(S) origin.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
    || (url.pathname !== '/' && url.pathname !== '') || url.search || url.hash) {
    throw new Error('The Keystone backend URL must be an HTTP(S) origin without credentials or a path.');
  }
  return url.origin;
}

/** Request Host and forwarding headers never choose a destination for credentials. */
export function resolveInternalBaseUrl(options: InternalOriginOptions = {}): string {
  const backend = options.configuredBackendUrl ?? process.env.NEXT_PUBLIC_BACKEND_URL;
  const app = options.configuredAppUrl ?? process.env.NEXT_PUBLIC_APP_URL;
  const configured = backend?.trim() || app?.trim();
  if (configured) return normalizeBackendOrigin(configured);
  if ((options.environment ?? process.env.NODE_ENV) === 'production') {
    throw new Error('NEXT_PUBLIC_BACKEND_URL or NEXT_PUBLIC_APP_URL is required for server-side Keystone requests in production.');
  }
  const value = options.port ?? process.env.PORT ?? '3000';
  const port = /^\d+$/.test(value) && Number(value) > 0 && Number(value) <= 65535 ? value : '3000';
  return `http://127.0.0.1:${port}`;
}
