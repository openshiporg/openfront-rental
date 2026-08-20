import { AbuseControlUnavailableError } from './identity';

export function serializedInputBytes(value: unknown) {
  let json: string;
  try {
    json = JSON.stringify(value) ?? '';
  } catch {
    throw new Error('Request input must be JSON-serializable.');
  }
  return Buffer.byteLength(json, 'utf8');
}

export function assertBoundedInput(value: unknown, maxBytes: number) {
  const bytes = serializedInputBytes(value);
  if (bytes > maxBytes) throw new Error(`Request input exceeds the ${maxBytes}-byte limit.`);
  return bytes;
}

async function readBoundedStream(
  stream: ReadableStream<Uint8Array> | null,
  maxBytes: number,
  timeoutMs: number,
  unavailable: boolean,
) {
  if (!stream) return '';
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let timer: NodeJS.Timeout | undefined;
  const deadline = Date.now() + timeoutMs;
  try {
    while (true) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) throw new Error('Request body timed out.');
      const next = reader.read();
      const result = await Promise.race([
        next,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Request body timed out.')), remainingMs);
        }),
      ]);
      if (timer) clearTimeout(timer);
      if (result.done) break;
      total += result.value.byteLength;
      if (total > maxBytes) throw new Error(`Request body exceeds the ${maxBytes}-byte limit.`);
      chunks.push(result.value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    if (unavailable) throw new AbuseControlUnavailableError(error instanceof Error ? error.message : undefined);
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf8');
}

export async function readBoundedRequestBody(request: Request, maxBytes: number, timeoutMs: number) {
  const contentLength = Number(request.headers.get('content-length') || '0');
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error(`Request body exceeds the ${maxBytes}-byte limit.`);
  }
  return readBoundedStream(request.body, maxBytes, timeoutMs, false);
}

export async function readBoundedProviderBody(response: Response, maxBytes = 16_384, timeoutMs = 1_000) {
  const contentLength = Number(response.headers.get('content-length') || '0');
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new AbuseControlUnavailableError('Abuse-control response exceeds its contract limit.');
  }
  return readBoundedStream(response.body, maxBytes, timeoutMs, true);
}
