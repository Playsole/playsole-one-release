import { promises as fs } from 'node:fs';
import path from 'node:path';
import { exportJWK, exportPKCS8, exportSPKI, generateKeyPair, importPKCS8, importSPKI, SignJWT } from 'jose';
import { config } from './config';
import type { JWK, KeyLike } from 'jose';

export interface KeySet {
  privateKey: KeyLike;
  publicKey: KeyLike;
  jwk: JWK;
  kid: string;
}

const KID = 'playsole-one-1';
let keySet: KeySet | null = null;
let loadPromise: Promise<KeySet> | null = null;


async function generateKeyMaterial(): Promise<{ privatePem: string; publicPem: string }> {
  const { publicKey, privateKey } = await generateKeyPair('RS256', { modulusLength: 2048 });
  const privatePem = await exportPKCS8(privateKey);
  const publicPem = await exportSPKI(publicKey);
  return { privatePem, publicPem };
}

async function keyPaths(): Promise<{ privatePath: string; publicPath: string }> {
  const dir = process.env.JWT_KEY_DIR ?? path.join(process.cwd(), '.data');
  await fs.mkdir(dir, { recursive: true });
  return { privatePath: path.join(dir, 'jwt-private.pem'), publicPath: path.join(dir, 'jwt-public.pem') };
}

async function obtainPems(): Promise<{ privatePem: string; publicPem: string }> {
  // Prefer explicit env-configured keys so multi-instance deployments share them.
  const envPriv = process.env.JWT_PRIVATE_KEY;
  const envPub = process.env.JWT_PUBLIC_KEY;
  if (envPriv && envPub) {
    return {
      privatePem: envPriv.replace(/\\n/g, '\n').trim(),
      publicPem: envPub.replace(/\\n/g, '\n').trim(),
    };
  }

  // Next try local filesystem key material if available
  try {
    const { privatePath, publicPath } = await keyPaths();
    const [priv, pub] = await Promise.all([fs.readFile(privatePath, 'utf8'), fs.readFile(publicPath, 'utf8')]);
    if (priv && pub) return { privatePem: priv, publicPem: pub };
  } catch {
    // Filesystem not writable or not available (e.g. edge worker/serverless)
  }

  // Never fall back to an ephemeral or shared key in production: tokens would be
  // unverifiable across instances/restarts. Fail closed instead.
  if (process.env.NODE_ENV === 'production' || process.env.CLOUDFLARE_WORKER === 'true') {
    throw new Error('JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be set in production.');
  }

  // Development only: generate a fresh keypair and persist it locally when possible.
  const material = await generateKeyMaterial();
  try {
    const { privatePath, publicPath } = await keyPaths();
    await Promise.all([
      fs.writeFile(privatePath, material.privatePem, { mode: 0o600 }),
      fs.writeFile(publicPath, material.publicPem),
    ]);
  } catch {
    // Not writable: keep the key in memory for this process only.
  }
  return material;
}

async function buildKeySet(): Promise<KeySet> {
  const { privatePem, publicPem } = await obtainPems();
  const privateKey = await importPKCS8(privatePem, 'RS256');
  const publicKey = await importSPKI(publicPem, 'RS256', { extractable: true });
  const jwk = await exportJWK(publicKey);
  jwk.alg = 'RS256';
  jwk.use = 'sig';
  jwk.kid = KID;
  return { privateKey, publicKey, jwk, kid: KID };
}

export function getKeySet(): Promise<KeySet> {
  if (keySet) return Promise.resolve(keySet);
  loadPromise ??= buildKeySet().then((ks) => { keySet = ks; return ks; });
  return loadPromise;
}

export async function getJwks(): Promise<{ keys: JWK[] }> {
  const ks = await getKeySet();
  return { keys: [ks.jwk] };
}

export async function signJwt(payload: Record<string, unknown>, ttlSec: number): Promise<string> {
  const ks = await getKeySet();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: ks.kid })
    .setIssuedAt()
    .setExpirationTime(`${ttlSec}s`)
    .setIssuer(config.issuer)
    .sign(ks.privateKey);
}