// DPoP (RFC 9449) proof-of-possession verification for sender-constrained
// access tokens. Pure functions so they are unit-testable without a DB.

import { calculateJwkThumbprint, importJWK, jwtVerify, JWK } from 'jose';

export interface DpopProofHeader {
  alg: string;
  jwk: JWK;
  typ?: string;
  kid?: string;
}

export interface DpopVerificationOptions {
  htu: string;
  htm: string;
  nowMs?: number;
  maxAgeMs?: number;
  /** Optional store for replay protection; keyed by proof jti. */
  seenJti?: ReplayStore;
}

export interface ReplayStore {
  /** Returns true when the jti was already seen within the window. */
  isReplay(key: string, ttlSec: number): Promise<boolean> | boolean;
}

export interface DpopResult {
  ok: boolean;
  /** JWK thumbprint (RFC 7638, sha-256, base64url) of the client public key. */
  jkt?: string;
  jti?: string;
  error?: string;
}

const ALLOWED_ALGS = ['ES256', 'RS256'];
const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000;

function base64urlDecode(input: string): Buffer {
  return Buffer.from(input, 'base64url');
}

/**
 * Verify a DPoP proof JWT against the HTTP target URI/method. Returns the
 * client key thumbprint (jkt) when valid. Rejects wrong typ, missing or
 * mismatched htu/htm, stale iat, and replayed jti values.
 */
export async function verifyDpopProof(proof: string, opts: DpopVerificationOptions): Promise<DpopResult> {
  const nowMs = opts.nowMs ?? Date.now();
  const maxAgeMs = opts.maxAgeMs ?? DEFAULT_MAX_AGE_MS;

  const parts = proof.split('.');
  if (parts.length !== 3) return { ok: false, error: 'malformed proof' };

  let header: DpopProofHeader;
  try {
    header = JSON.parse(base64urlDecode(parts[0]).toString('utf8')) as DpopProofHeader;
  } catch {
    return { ok: false, error: 'malformed header' };
  }

  if (header.typ !== 'dpop+jwt') return { ok: false, error: 'wrong typ' };
  if (!header.jwk) return { ok: false, error: 'missing jwk' };
  if (!ALLOWED_ALGS.includes(header.alg)) return { ok: false, error: `unsupported alg ${header.alg}` };

  let key: unknown;
  try {
    key = await importJWK({ ...header.jwk, alg: header.alg }, header.alg);
  } catch {
    return { ok: false, error: 'invalid jwk' };
  }

  let payload: { htu?: string; htm?: string; jti?: string; iat?: number };
  try {
    const { payload: p } = await jwtVerify(proof, key as any, { algorithms: [header.alg] });
    payload = p as typeof payload;
  } catch {
    return { ok: false, error: 'signature invalid' };
  }

  const htu = new URL(opts.htu);
  htu.hash = '';
  htu.search = '';
  if (!payload.htu || payload.htu !== htu.toString()) {
    return { ok: false, error: 'htu mismatch' };
  }
  if (!payload.htm || payload.htm.toLowerCase() !== opts.htm.toLowerCase()) {
    return { ok: false, error: 'htm mismatch' };
  }
  if (typeof payload.jti !== 'string' || payload.jti.length === 0) {
    return { ok: false, error: 'missing jti' };
  }
  if (typeof payload.iat !== 'number') {
    return { ok: false, error: 'missing iat' };
  }
  const iatMs = payload.iat * 1000;
  if (Math.abs(nowMs - iatMs) > maxAgeMs) {
    return { ok: false, error: 'iat out of range' };
  }
  if (opts.seenJti) {
    const replayed = await opts.seenJti.isReplay(`dpop:jti:${payload.jti}`, Math.ceil(maxAgeMs / 1000));
    if (replayed) {
      return { ok: false, error: 'replayed jti' };
    }
  }

  const jkt = await calculateJwkThumbprint(header.jwk, 'sha256');
  return { ok: true, jkt, jti: payload.jti };
}