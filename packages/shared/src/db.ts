import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from './logger';

const logger = createLogger('shared');

let adminClient: SupabaseClient | null = null;

export const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Admin client — service-role key. Used ONLY for:
 * - Bootstrap / migrations / seeding
 * - Supabase Auth admin operations (create user, set app_metadata)
 * - Operations that legitimately need to bypass RLS
 *
 * Never use this for tenant-scoped user data queries.
 */
export function getSupabase(): SupabaseClient {
  if (!adminClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }
    adminClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: 'public' },
    });
  }
  return adminClient;
}

let readOnlyClient: SupabaseClient | null = null;

/**
 * Read-only client routing to PostgreSQL read replica if configured (Item 48).
 * Falls back to primary SUPABASE_URL if SUPABASE_READ_REPLICA_URL is unset.
 */
export function getSupabaseReadOnly(): SupabaseClient {
  if (!readOnlyClient) {
    const url = process.env.SUPABASE_READ_REPLICA_URL || process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }
    readOnlyClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: 'public' },
    });
  }
  return readOnlyClient;
}

const userClientCache = new Map<string, { client: SupabaseClient; createdAt: number }>();
const USER_CLIENT_TTL_MS = 30_000;
const MAX_USER_CLIENTS = 1000;

/**
 * Tenant-scoped client — anon key + user's Supabase Auth JWT.
 * RLS enforces tenant isolation via `auth.jwt()->'app_metadata'->>'tenant_id'`.
 * Use this for ALL tenant-scoped data access in request handlers.
 */
export function getSupabaseForUser(accessToken: string): SupabaseClient {
  const now = Date.now();
  const cached = userClientCache.get(accessToken);
  if (cached && now - cached.createdAt < USER_CLIENT_TTL_MS) {
    return cached.client;
  }

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set for user-scoped access');
  }
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  if (userClientCache.size >= MAX_USER_CLIENTS) {
    const oldestKey = userClientCache.keys().next().value;
    if (oldestKey) userClientCache.delete(oldestKey);
  }
  userClientCache.set(accessToken, { client, createdAt: now });

  return client;
}

export async function ensureDefaultTenant(): Promise<void> {
  const supabase = getSupabase();
  const { data } = await supabase.from('tenants').select('id').eq('id', DEFAULT_TENANT_ID).maybeSingle();
  if (!data) {
    const { error } = await supabase.from('tenants').insert({
      id: DEFAULT_TENANT_ID, slug: 'default', name: 'Default Tenant',
    });
    if (error && error.code !== '23505') {
      throw new Error(`Failed to seed default tenant: ${error.message}`);
    }
  }
}

let anonClient: SupabaseClient | null = null;

function getAnonClient(): SupabaseClient {
  if (!anonClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set for Supabase Auth');
    }
    anonClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return anonClient;
}

function jwtExpiryMs(token: string): number | undefined {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}

/**
 * True when the token is missing, malformed, or expires within the next 5
 * minutes. Used to decide whether to proactively refresh before user-scoped
 * (RLS) queries run, since Supabase access tokens last ~1h.
 */
export function isSupabaseTokenExpiring(token: string | undefined): boolean {
  if (!token) return true;
  const expMs = jwtExpiryMs(token);
  if (expMs === undefined) return true;
  return expMs - Date.now() < 5 * 60 * 1000;
}

/**
 * Exchange a refresh token for a fresh access token (and rotated refresh
 * token) via Supabase Auth. Returns null if the refresh fails.
 */
export async function refreshSupabaseSession(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const auth = getAnonClient();
  const { data, error } = await (auth.auth as any).refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) {
    logger.warn(`Supabase token refresh failed: ${error?.message ?? 'no session'}`);
    return null;
  }
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
}
