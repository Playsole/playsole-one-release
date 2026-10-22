import { createHmac, randomBytes } from 'node:crypto';

// RFC 6238 TOTP with SHA-1, 30-second periods and 6-digit codes, implemented
// against Node's built-in crypto so the same logic can run in the Cloudflare
// Workers port. No external dependency.

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const DEFAULT_PERIOD_SEC = 30;
const DEFAULT_DIGITS = 6;

export function generateSecret(bytes = 20): string {
  return encodeBase32(randomBytes(bytes));
}

export function encodeBase32(input: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function decodeBase32(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/[\s=\-]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** RFC 4226 HOTP for a given moving factor. */
export function hotp(secret: Buffer, counter: number, digits = DEFAULT_DIGITS): string {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac('sha1', secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return (code % 10 ** digits).toString().padStart(digits, '0');
}

/** RFC 6238 TOTP code for a base32 secret at a given time (ms). */
export function totp(
  secretBase32: string,
  periodSec = DEFAULT_PERIOD_SEC,
  digits = DEFAULT_DIGITS,
  timeMs = Date.now(),
): string {
  const counter = Math.floor(timeMs / (periodSec * 1000));
  return hotp(decodeBase32(secretBase32), counter, digits);
}

/**
 * Verify a submitted code against a base32 secret with a configurable window
 * of accepted time steps in each direction (default ±1 = tolerance for clock
 * skew / near-boundary codes).
 */
export function verifyTotp(
  secretBase32: string,
  code: string,
  window = 1,
  periodSec = DEFAULT_PERIOD_SEC,
  timeMs = Date.now(),
): boolean {
  if (typeof code !== 'string' || !new RegExp(`^\\d{${DEFAULT_DIGITS}}$`).test(code)) return false;
  const counter = Math.floor(timeMs / (periodSec * 1000));
  for (let i = -window; i <= window; i++) {
    if (hotp(decodeBase32(secretBase32), counter + i, DEFAULT_DIGITS) === code) return true;
  }
  return false;
}

/** otpauth:// URL for scanner apps / QR codes. */
export function otpauthUrl(
  secretBase32: string,
  account: string,
  issuer = 'Playsole One',
  periodSec = DEFAULT_PERIOD_SEC,
  digits = DEFAULT_DIGITS,
): string {
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: 'SHA1',
    digits: String(digits),
    period: String(periodSec),
  });
  return `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?${params.toString()}`;
}