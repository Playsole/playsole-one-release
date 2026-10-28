import { promises as fs } from 'node:fs';
import path from 'node:path';
import { exportJWK, exportPKCS8, exportSPKI, generateKeyPair, importPKCS8, importSPKI, SignJWT } from 'jose';
import { getSupabase, DEFAULT_TENANT_ID } from '@playsole-one/shared';
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
  const { publicKey, privateKey } = await generateKeyPair('RS256', { modulusLength: 2048, extractable: true });
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
  // 1. Prefer explicit env-configured keys so multi-instance deployments share them.
  const envPriv = process.env.JWT_PRIVATE_KEY;
  const envPub = process.env.JWT_PUBLIC_KEY;
  if (envPriv && envPub) {
    return {
      privatePem: envPriv.replace(/\\n/g, '\n').trim(),
      publicPem: envPub.replace(/\\n/g, '\n').trim(),
    };
  }

  // 2. Try shared database key material (tenants.config.jwt_keys) so edge workers and serverless instances share the keypair
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('tenants')
        .select('config')
        .eq('id', DEFAULT_TENANT_ID)
        .maybeSingle();
      const dbKeys = data?.config?.jwt_keys;
      if (dbKeys?.privatePem && dbKeys?.publicPem) {
        return { privatePem: dbKeys.privatePem, publicPem: dbKeys.publicPem };
      }
    } catch {
      // Fall through if database is unreachable
    }
  }

  // 3. Try local filesystem key material if available
  try {
    const { privatePath, publicPath } = await keyPaths();
    const [priv, pub] = await Promise.all([fs.readFile(privatePath, 'utf8'), fs.readFile(publicPath, 'utf8')]);
    if (priv && pub) {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const supabase = getSupabase();
          const { data } = await supabase.from('tenants').select('config').eq('id', DEFAULT_TENANT_ID).maybeSingle();
          const existingConfig = data?.config && typeof data.config === 'object' ? data.config : {};
          await supabase
            .from('tenants')
            .update({ config: { ...existingConfig, jwt_keys: { privatePem: priv, publicPem: pub } } })
            .eq('id', DEFAULT_TENANT_ID);
        } catch {
          // Non-blocking
        }
      }
      return { privatePem: priv, publicPem: pub };
    }
  } catch {
    // Filesystem not writable or not available (e.g. edge worker/serverless)
  }

  // 4. Generate a fresh keypair and persist it to Supabase (and local filesystem when possible).
  const material = await generateKeyMaterial();
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = getSupabase();
      const { data } = await supabase.from('tenants').select('config').eq('id', DEFAULT_TENANT_ID).maybeSingle();
      const existingConfig = data?.config && typeof data.config === 'object' ? data.config : {};
      await supabase
        .from('tenants')
        .update({ config: { ...existingConfig, jwt_keys: material } })
        .eq('id', DEFAULT_TENANT_ID);
    } catch {
      // Non-blocking
    }
  }
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
  loadPromise ??= buildKeySet()
    .then((ks) => { keySet = ks; return ks; })
    .catch((err) => { loadPromise = null; throw err; });
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
