import crypto from 'node:crypto';

const TOKEN_BYTES = 24;
const QUOTE_LIFETIME_MINUTES = 30;
const TOKEN_PATTERN = /^[a-f0-9]{48}$/;

export type ActiveStayQuoteRecord = {
  expiresAt?: string | Date | null;
  consumedAt?: string | Date | null;
  status?: string | null;
};

export function createStayQuoteToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex');
}

export function hashStayQuoteToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function stayQuoteExpiry(issuedAt = new Date()) {
  return new Date(issuedAt.getTime() + QUOTE_LIFETIME_MINUTES * 60 * 1000);
}

function isExpired(value: string | Date | null | undefined, now: Date) {
  if (!value) return true;
  const expiresAt = value instanceof Date ? value : new Date(value);
  return Number.isNaN(expiresAt.getTime()) || expiresAt <= now;
}

export async function resolveActiveStayQuote<T extends ActiveStayQuoteRecord>({
  token,
  findByHash,
  now = new Date(),
}: {
  token: string;
  findByHash: (hash: string) => Promise<T | null | undefined>;
  now?: Date;
}): Promise<T | null> {
  if (!TOKEN_PATTERN.test(token)) {
    throw new Error('Stay quote token is invalid.');
  }

  const quote = await findByHash(hashStayQuoteToken(token));
  if (
    !quote
    || quote.status !== 'active'
    || quote.consumedAt
    || isExpired(quote.expiresAt, now)
  ) {
    return null;
  }

  return quote;
}
