import crypto from 'node:crypto';
import { getRedisClient } from '@playsole-one/shared';

export interface PkcePair {
  verifier: string;
  challenge: string;
  method: 'S256';
}

export function generatePkce(): PkcePair {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return {
    verifier,
    challenge,
    method: 'S256',
  };
}

export async function inspectRateLimit(key: string): Promise<{
  key: string;
  count: number | null;
  ttlSeconds: number | null;
}> {
  const redis = getRedisClient();
  const [val, ttl] = await Promise.all([
    redis.get<string | number>(key).catch(() => null),
    redis.ttl(key).catch(() => null),
  ]);

  return {
    key,
    count: val !== null ? Number(val) : null,
    ttlSeconds: ttl !== null ? Number(ttl) : null,
  };
}

export async function fetchJwks(issuerUrl: string = 'http://localhost:8080'): Promise<{
  keys: Array<{ kid: string; kty: string; alg?: string; use?: string }>;
}> {
  const normalized = issuerUrl.replace(/\/+$/, '');
  const res = await fetch(`${normalized}/.well-known/jwks.json`);
  if (!res.ok) {
    throw new Error(`Failed to fetch JWKS from ${normalized}: HTTP ${res.status}`);
  }
  return res.json() as Promise<{ keys: Array<{ kid: string; kty: string; alg?: string; use?: string }> }>;
}
