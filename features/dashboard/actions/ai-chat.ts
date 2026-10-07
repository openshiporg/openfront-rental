'use server';

export type SharedKeysResult =
  | { success: true; keys: { apiKey: string; model: string; maxTokens: number } }
  | { success: false; error: string };

// Shared server credentials must never be returned to a browser action caller.
// Until chat requests are proxied and authorized server-side, env-key mode stays disabled.
export async function getSharedKeys(): Promise<SharedKeysResult> {
  return {
    success: false,
    error: 'Shared provider-key mode is disabled. Configure a personal API key.',
  };
}
