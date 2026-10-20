import type { NextConfig } from 'next';

import { parseStorageEndpoint } from './features/keystone/lib/storage-endpoint';

// Image host from the same parsed endpoint the storage config uses; none when it isn't set or valid
// (the server itself refuses an invalid endpoint at startup).
function storageImagePattern() {
  try {
    const endpoint = process.env.S3_ENDPOINT ? parseStorageEndpoint(process.env.S3_ENDPOINT) : null;
    return endpoint ? [{ protocol: endpoint.protocol, hostname: endpoint.hostname, port: endpoint.port, pathname: '/**' }] : [];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ['graphql'],
  // Workaround since we diverged from Keystone reltionship and document views
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
  images: {
    remotePatterns: storageImagePattern(),
  },
};

export default nextConfig;