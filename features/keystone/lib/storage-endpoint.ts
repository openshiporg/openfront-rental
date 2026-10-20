/**
 * The S3-compatible storage endpoint contract: an http(s) origin with a hostname, no
 * credentials, path, query or fragment. Parsed once; callers (storage config, image hosts)
 * derive everything from the same parsed URL.
 */
export function parseStorageEndpoint(value: string) {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('S3_ENDPOINT must be an http(s) origin, such as https://sfo3.digitaloceanspaces.com');
  }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new Error('S3_ENDPOINT must be an http(s) origin with a hostname');
  if (url.username || url.password) throw new Error('S3_ENDPOINT must not contain credentials');
  if ((url.pathname && url.pathname !== '/') || url.search || url.hash) throw new Error('S3_ENDPOINT must be an origin only (no path, query or fragment)');
  return { origin: url.origin, protocol: url.protocol.slice(0, -1) as 'http' | 'https', hostname: url.hostname, port: url.port };
}
