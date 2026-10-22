import { describe, expect, it } from 'vitest';
import { exportJWK, generateKeyPair, importJWK, SignJWT, JWK, type KeyLike } from 'jose';
import { verifyDpopProof } from '../../services/auth/src/dpop';
import { getStateStore } from '../../packages/shared/src/redis';

const NOW = Date.parse('2025-01-01T12:00:00Z');
const HTU = 'https://issuer.example/token';
const HTM = 'POST';

async function makeProof(pubJwk: JWK, privateKey: KeyLike, alg: 'ES256' | 'RS256', overrides: Record<string, any> = {}): Promise<string> {
  return new SignJWT({
    htu: HTU,
    htm: HTM,
    jti: `jti-${Math.random().toString(36).slice(2)}`,
    iat: Math.floor(NOW / 1000),
    ...overrides,
  })
    .setProtectedHeader({ typ: 'dpop+jwt', alg, jwk: pubJwk })
    .sign(privateKey);
}

async function esKey(): Promise<{ pubJwk: JWK; privateKey: KeyLike; alg: 'ES256' }> {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const pubJwk = await exportJWK(publicKey);
  return { pubJwk, privateKey, alg: 'ES256' };
}

describe('DPoP proof verification', () => {
  it('accepts a valid proof and returns the key thumbprint', async () => {
    const { pubJwk, privateKey, alg } = await esKey();
    const proof = await makeProof(pubJwk, privateKey, alg);
    const result = await verifyDpopProof(proof, { htu: HTU, htm: HTM, nowMs: NOW });
    expect(result.ok).toBe(true);
    expect(result.jkt).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(result.jti).toBeTruthy();
  });

  it('rejects a proof with the wrong typ header', async () => {
    const { pubJwk, privateKey, alg } = await esKey();
    const proof = await makeProof(pubJwk, privateKey, alg);
    const [header, payload, sig] = proof.split('.');
    const hdr = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    hdr.typ = 'JWT';
    const tampered = `${Buffer.from(JSON.stringify(hdr)).toString('base64url')}.${payload}.${sig}`;
    const result = await verifyDpopProof(tampered, { htu: HTU, htm: HTM, nowMs: NOW });
    expect(result.ok).toBe(false);
  });

  it('rejects a proof with a mismatched htu', async () => {
    const { pubJwk, privateKey, alg } = await esKey();
    const proof = await makeProof(pubJwk, privateKey, alg, { htu: 'https://evil.example/token' });
    const result = await verifyDpopProof(proof, { htu: HTU, htm: HTM, nowMs: NOW });
    expect(result.ok).toBe(false);
  });

  it('rejects a proof with a mismatched htm', async () => {
    const { pubJwk, privateKey, alg } = await esKey();
    const proof = await makeProof(pubJwk, privateKey, alg, { htm: 'GET' });
    const result = await verifyDpopProof(proof, { htu: HTU, htm: HTM, nowMs: NOW });
    expect(result.ok).toBe(false);
  });

  it('rejects a stale proof outside the max age window', async () => {
    const { pubJwk, privateKey, alg } = await esKey();
    const proof = await makeProof(pubJwk, privateKey, alg, { iat: Math.floor((NOW - 10 * 60 * 1000) / 1000) });
    const result = await verifyDpopProof(proof, { htu: HTU, htm: HTM, nowMs: NOW });
    expect(result.ok).toBe(false);
  });

  it('rejects a replayed jti within the window', async () => {
    const { pubJwk, privateKey, alg } = await esKey();
    const proof = await makeProof(pubJwk, privateKey, alg, { jti: `fixed-jti-${Math.random().toString(36).slice(2)}` });
    const seen = getStateStore();
    const first = await verifyDpopProof(proof, { htu: HTU, htm: HTM, nowMs: NOW, seenJti: seen });
    expect(first.ok).toBe(true);
    const second = await verifyDpopProof(proof, { htu: HTU, htm: HTM, nowMs: NOW + 1000, seenJti: seen });
    expect(second.ok).toBe(false);
  });

  it('rejects a malformed proof', async () => {
    const result = await verifyDpopProof('not-a-jwt', { htu: HTU, htm: HTM, nowMs: NOW });
    expect(result.ok).toBe(false);
  });
});