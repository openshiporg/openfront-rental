import { resolveInternalBaseUrl } from "@/features/keystone/lib/internal-origin";

/**
 * Get the base URL for the application dynamically
 * Works both server-side and client-side without requiring environment variables
 */

export async function getBaseUrl(): Promise<string> {
  // Client-side: use window.location
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Server-side self-calls use deployment-owned configuration, never request headers.
  return resolveInternalBaseUrl();
}

/**
 * Get the GraphQL endpoint URL
 */
export async function getGraphQLEndpoint(): Promise<string> {
  const baseUrl = await getBaseUrl();
  return `${baseUrl}/api/graphql`;
}