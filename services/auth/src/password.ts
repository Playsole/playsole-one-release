import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SALT_LEN = 16;
const KEY_LEN = 64;

const LEGACY_SHA256_LEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LEN).toString('hex');
  const key = scryptSync(password, salt, KEY_LEN).toString('hex');
  return `${salt}:${key}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (typeof stored !== 'string') return false;

  // Legacy rows created before scrypt migration used unsalted SHA-256.
  // Accept them for verification so existing dev users can still log in,
  // but never store new hashes with this scheme.
  if (!stored.includes(':')) {
    if (stored.length !== LEGACY_SHA256_LEN) return false;
    const legacy = createHash('sha256').update(password).digest('hex');
    return timingSafeEqual(Buffer.from(legacy, 'hex'), Buffer.from(stored, 'hex'));
  }

  const [salt, hash] = stored.split(':');
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}