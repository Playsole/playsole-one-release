import { describe, expect, it } from 'vitest';
import { generateSecret, encodeBase32, decodeBase32, hotp, totp, verifyTotp, otpauthUrl } from '../../services/security/src/totp';

// RFC 6238 test vector: ASCII secret "12345678901234567890"
const RFC_SECRET_BASE32 = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('TOTP engine', () => {
  it('generates a 32-char (160-bit) base32 secret', () => {
    const secret = generateSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(generateSecret()).not.toBe(secret);
  });

  it('round-trips base32 encoding/decoding', () => {
    const buf = Buffer.from('playsole-one');
    expect(encodeBase32(decodeBase32(encodeBase32(buf)))).toBe(encodeBase32(buf));
  });

  it('matches RFC 6238 test vectors (6 digits, 30s period)', () => {
    const vectors: Array<[number, string]> = [
      [59, '287082'],
      [1111111109, '081804'],
      [1111111111, '050471'],
      [1234567890, '005924'],
      [2000000000, '279037'],
      [20000000000, '353130'],
    ];
    for (const [timeSec, expected] of vectors) {
      expect(totp(RFC_SECRET_BASE32, 30, 6, timeSec * 1000)).toBe(expected);
    }
  });

  it('verifies the current and near-boundary codes (window tolerance)', () => {
    const timeMs = Date.now();
    const code = totp(RFC_SECRET_BASE32, 30, 6, timeMs);
    expect(verifyTotp(RFC_SECRET_BASE32, code, 1, 30, timeMs)).toBe(true);
    // A code from one period ago still validates within window=1
    const prevCode = totp(RFC_SECRET_BASE32, 30, 6, timeMs - 30_000);
    expect(verifyTotp(RFC_SECRET_BASE32, prevCode, 1, 30, timeMs)).toBe(true);
    // A code from two periods ago does not
    const oldCode = totp(RFC_SECRET_BASE32, 30, 6, timeMs - 60_000);
    expect(verifyTotp(RFC_SECRET_BASE32, oldCode, 1, 30, timeMs)).toBe(false);
  });

  it('rejects malformed or wrong codes', () => {
    expect(verifyTotp(RFC_SECRET_BASE32, '000000', 1)).toBe(false);
    expect(verifyTotp(RFC_SECRET_BASE32, 'abc', 1)).toBe(false);
    expect(verifyTotp(RFC_SECRET_BASE32, '', 1)).toBe(false);
  });

  it('is deterministic given the same time step', () => {
    const a = totp(RFC_SECRET_BASE32, 30, 6, 1_000_000_000);
    const b = totp(RFC_SECRET_BASE32, 30, 6, 1_000_000_000);
    expect(a).toBe(b);
  });

  it('produces a standard otpauth URL', () => {
    const url = otpauthUrl('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', 'user@playsole.xyz', 'Playsole One');
    expect(url.startsWith('otpauth://totp/')).toBe(true);
    expect(url).toContain('secret=ABCDEFGHIJKLMNOPQRSTUVWXYZ234567');
    expect(url).toContain('issuer=Playsole+One');
    expect(url).toContain('period=30');
    expect(url).toContain('digits=6');
  });

  it('HOTP works for counter 0..n', () => {
    const secret = decodeBase32(RFC_SECRET_BASE32);
    // Recompute the first RFC 4226 vector (counter 0 => 755224)
    expect(hotp(secret, 0, 6)).toBe('755224');
  });
});