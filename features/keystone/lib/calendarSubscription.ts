import { lookup } from 'node:dns/promises';
import net from 'node:net';

/**
 * Fetching a host-supplied calendar URL (Airbnb/Vrbo "Export calendar" links). The URL is
 * untrusted input, so: https only, public addresses only (checked after DNS), no redirects to
 * elsewhere, a short timeout and a size cap.
 */
export const CALENDAR_FETCH_TIMEOUT_MS = 10_000;
export const MAX_CALENDAR_BYTES = 1_000_000;
export const CALENDAR_SUBSCRIPTION_INTERVAL_MS = 60 * 60 * 1000;

function privateIPv4(address: string) {
  const [a, b] = address.split('.').map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
}

export function isPublicAddress(address: string) {
  const family = net.isIP(address);
  if (family === 4) return !privateIPv4(address);
  if (family === 6) {
    const lower = address.toLowerCase();
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return !privateIPv4(mapped[1]);
    return !(lower === '::' || lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb') || lower.startsWith('ff'));
  }
  return false;
}

/** A problem with the URL itself, or null. Checked when saved and again before every fetch. */
export function calendarUrlProblem(value: string): string | null {
  let url: URL;
  try { url = new URL(value); } catch { return 'Enter the full calendar link, starting with https://.'; }
  if (url.protocol !== 'https:') return 'Calendar links must start with https://.';
  if (url.username || url.password) return 'Calendar links can’t contain a username or password.';
  if (url.port && url.port !== '443') return 'Calendar links must use the standard https port.';
  if (net.isIP(url.hostname.replace(/^\[|\]$/g, '')) || !url.hostname.includes('.') || /\.(local|internal|localhost)$/i.test(url.hostname)) return 'Calendar links must use a public host name.';
  if (value.length > 2000) return 'That calendar link is too long.';
  return null;
}

export async function fetchSubscribedCalendar(value: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const problem = calendarUrlProblem(value);
  if (problem) throw new Error(`Calendar link rejected: ${problem}`);
  const url = new URL(value);
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) throw new Error('Calendar link rejected: the host does not resolve to a public address.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALENDAR_FETCH_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, { redirect: 'manual', signal: controller.signal, headers: { Accept: 'text/calendar, text/plain;q=0.8' } });
    if (response.status >= 300 && response.status < 400) throw new Error('Calendar link redirected; paste the final calendar link instead.');
    if (!response.ok) throw new Error(`Calendar link answered ${response.status}.`);
    const declared = Number(response.headers.get('content-length') || '0');
    if (declared > MAX_CALENDAR_BYTES) throw new Error('Calendar is too large to import.');
    const reader = response.body?.getReader();
    if (!reader) return '';
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      total += chunk.byteLength;
      if (total > MAX_CALENDAR_BYTES) { await reader.cancel(); throw new Error('Calendar is too large to import.'); }
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw new Error('Calendar link timed out.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
