import crypto from 'node:crypto';

const TOKEN_BYTES = 24;
const TOKEN_LIFETIME_DAYS = 30;

export type PublicOwnershipTokenRecord = {
  tokenExpiresAt?: string | Date | null;
  tokenRevokedAt?: string | Date | null;
};

export function createPublicOwnershipToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex');
}

export function hashPublicOwnershipToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function publicTokenExpiry(issuedAt = new Date()) {
  return new Date(issuedAt.getTime() + TOKEN_LIFETIME_DAYS * 24 * 60 * 60 * 1000);
}

function isExpired(value: string | Date | null | undefined, now: Date) {
  if (!value) return true;
  const expiresAt = value instanceof Date ? value : new Date(value);
  return Number.isNaN(expiresAt.getTime()) || expiresAt <= now;
}

export function isPublicOwnershipTokenActive(
  record: PublicOwnershipTokenRecord | null | undefined,
  now = new Date(),
) {
  return Boolean(record && !record.tokenRevokedAt && !isExpired(record.tokenExpiresAt, now));
}

export async function resolvePublicTokenRecord<T extends object>({
  token,
  invalidMessage,
  findRecordByHash,
  isUnavailable = () => false,
  now = new Date(),
}: {
  token: string;
  invalidMessage: string;
  findRecordByHash: (tokenHash: string) => Promise<T | null | undefined>;
  isUnavailable?: (record: T) => boolean;
  now?: Date;
}): Promise<T | null> {
  if (!token || token.length < 16) {
    throw new Error(invalidMessage);
  }

  const record = await findRecordByHash(hashPublicOwnershipToken(token));
  const tokenRecord = record as PublicOwnershipTokenRecord | null | undefined;
  if (!record || !isPublicOwnershipTokenActive(tokenRecord, now) || isUnavailable(record)) {
    return null;
  }

  return record;
}
