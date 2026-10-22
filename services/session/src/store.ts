import { randomUUID } from 'node:crypto';
import { getSupabase, createLogger } from '@playsole-one/shared';

const logger = createLogger('session');

// ── Sessions ──

export interface StoredSession {
  id: string;
  userId: string;
  tenantId: string;
  clientId?: string;
  tokenType: 'bearer' | 'dpop';
  deviceInfo?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  mfaPassed: boolean;
  lastSeenAt?: string;
  expiresAt?: string;
  revokedAt?: string;
  supabaseAccessToken?: string;
  supabaseRefreshToken?: string;
  createdAt: number;
}

export interface SessionCreateInput {
  userId: string;
  tenantId: string;
  supabaseAccessToken?: string;
  supabaseRefreshToken?: string;
  clientId?: string;
  tokenType?: 'bearer' | 'dpop';
  deviceInfo?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  mfaPassed?: boolean;
  expiresAt?: string;
}

function toSession(row: any): StoredSession {
  return {
    id: row.id, userId: row.user_id, tenantId: row.tenant_id,
    clientId: row.client_id ?? undefined,
    tokenType: row.token_type ?? 'bearer',
    deviceInfo: row.device_info ?? undefined,
    ipAddress: row.ip_address ?? undefined,
    userAgent: row.user_agent ?? undefined,
    mfaPassed: row.mfa_passed ?? false,
    lastSeenAt: row.last_seen_at ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    revokedAt: row.revoked_at ?? undefined,
    supabaseAccessToken: row.supabase_access_token ?? undefined,
    supabaseRefreshToken: row.supabase_refresh_token ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
  };
}

const MAX_CONCURRENT_SESSIONS = parseInt(process.env.MAX_CONCURRENT_SESSIONS || '5', 10);

export async function createSession(input: SessionCreateInput): Promise<StoredSession> {
  const supabase = getSupabase();

  // Deduplicate and enforce concurrent session limit per user (Item 50)
  try {
    const active = await listSessionsByUser(input.userId);

    // 1. Deduplicate: if an active session with identical user-agent exists for this user,
    // revoke the old session to keep the session list clean and prevent zombie sessions.
    const duplicate = active.find(
      (s) => (s.userAgent && input.userAgent && s.userAgent === input.userAgent) ||
             (s.ipAddress && input.ipAddress && s.ipAddress === input.ipAddress && s.userAgent === input.userAgent)
    );
    if (duplicate) {
      await revokeSession(duplicate.id);
    }

    // 2. Concurrent session limit: evict oldest sessions when limit reached
    const remaining = active.filter((s) => s.id !== duplicate?.id);
    if (remaining.length >= MAX_CONCURRENT_SESSIONS) {
      const sorted = [...remaining].sort((a, b) => a.createdAt - b.createdAt);
      const toEvict = sorted.slice(0, remaining.length - MAX_CONCURRENT_SESSIONS + 1);
      for (const s of toEvict) {
        await revokeSession(s.id);
      }
    }
  } catch (err) {
    logger.warn({ err }, 'failed to enforce session limits');
  }

  const id = randomUUID();
  const expiresAt = input.expiresAt ?? new Date(Date.now() + 30 * 86400 * 1000).toISOString();
  const { error } = await supabase.from('sessions').insert({
    id, user_id: input.userId, tenant_id: input.tenantId,
    client_id: input.clientId ?? null,
    token_type: input.tokenType ?? 'bearer',
    device_info: input.deviceInfo ?? {},
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
    mfa_passed: input.mfaPassed ?? false,
    expires_at: expiresAt,
    supabase_access_token: input.supabaseAccessToken ?? null,
    supabase_refresh_token: input.supabaseRefreshToken ?? null,
  });
  if (error) throw new Error(`Failed to create session: ${error.message}`);
  return {
    id, userId: input.userId, tenantId: input.tenantId, clientId: input.clientId,
    tokenType: input.tokenType ?? 'bearer', deviceInfo: input.deviceInfo ?? {},
    ipAddress: input.ipAddress, userAgent: input.userAgent,
    mfaPassed: input.mfaPassed ?? false, expiresAt,
    supabaseAccessToken: input.supabaseAccessToken, supabaseRefreshToken: input.supabaseRefreshToken,
    createdAt: Date.now(),
  };
}

export async function getSession(id: string): Promise<StoredSession | undefined> {
  const supabase = getSupabase();
  const { data } = await supabase.from('sessions').select('*').eq('id', id).maybeSingle();
  if (!data) return undefined;
  const session = toSession(data);
  if (session.revokedAt) return undefined;
  const nowMs = Date.now();
  if (session.expiresAt && new Date(session.expiresAt).getTime() <= nowMs) {
    await revokeSession(session.id).catch(() => {});
    return undefined;
  }
  const lastActive = session.lastSeenAt ? new Date(session.lastSeenAt).getTime() : session.createdAt;
  if (nowMs - lastActive > 30 * 86400 * 1000) {
    await revokeSession(session.id).catch(() => {});
    return undefined;
  }
  return session;
}

export async function listSessionsByUser(userId: string): Promise<StoredSession[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('sessions').select('*')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .order('last_seen_at', { ascending: false });

  const nowMs = Date.now();
  const maxSessionAgeMs = 30 * 86400 * 1000; // 30 days maximum active session lifetime

  return (data ?? [])
    .map(toSession)
    .filter((s) => {
      if (s.revokedAt) return false;
      if (s.expiresAt && new Date(s.expiresAt).getTime() <= nowMs) return false;
      const lastActive = s.lastSeenAt ? new Date(s.lastSeenAt).getTime() : s.createdAt;
      if (nowMs - lastActive > maxSessionAgeMs) return false;
      return true;
    });
}

export async function deleteSession(id: string): Promise<boolean> {
  const { data } = await getSupabase().from('sessions').delete().eq('id', id).select().maybeSingle();
  return !!data;
}

/** Soft-revoke a session (keeps the row for device history). */
export async function revokeSession(id: string): Promise<boolean> {
  const { data } = await getSupabase()
    .from('sessions').update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .select().maybeSingle();
  return !!data;
}

export async function markSessionMfaPassed(id: string): Promise<StoredSession | undefined> {
  const { data, error } = await getSupabase()
    .from('sessions').update({ mfa_passed: true })
    .eq('id', id)
    .select().maybeSingle();
  if (error) throw new Error(`Failed to mark session MFA passed: ${error.message}`);
  return data ? toSession(data) : undefined;
}

export async function touchSession(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('sessions').update({ last_seen_at: new Date().toISOString() })
    .eq('id', id);
  if (error) logger.warn({ err: error.message }, 'failed to touch session');
}

export async function updateSessionTokens(
  id: string,
  supabaseAccessToken?: string,
  supabaseRefreshToken?: string,
): Promise<StoredSession | undefined> {
  const { data, error } = await getSupabase()
    .from('sessions')
    .update({
      supabase_access_token: supabaseAccessToken ?? null,
      supabase_refresh_token: supabaseRefreshToken ?? null,
    })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw new Error(`Failed to update session: ${error.message}`);
  return data ? toSession(data) : undefined;
}

// ── Auth Codes ──

export interface StoredAuthCode {
  code: string;
  clientId: string;
  userId: string;
  tenantId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
  state?: string;
  expiresAt: number;
}

export async function createAuthCode(
  clientId: string, userId: string, tenantId: string, redirectUri: string,
  codeChallenge: string, codeChallengeMethod: string,
  scope: string, ttlSec: number, state?: string,
): Promise<string> {
  const code = randomUUID();
  const expiresAt = new Date(Date.now() + ttlSec * 1000).toISOString();
  const { error } = await getSupabase().from('authorization_codes').insert({
    code, client_id: clientId, user_id: userId, tenant_id: tenantId,
    redirect_uri: redirectUri, code_challenge: codeChallenge,
    code_method: codeChallengeMethod, scopes: [scope], state: state ?? null,
    expires_at: expiresAt,
  });
  if (error) throw new Error(`Failed to create auth code: ${error.message}`);
  return code;
}

export async function consumeAuthCode(code: string): Promise<StoredAuthCode | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('authorization_codes')
    .delete()
    .eq('code', code)
    .gt('expires_at', new Date().toISOString())
    .select()
    .maybeSingle();
  if (!data) return null;
  return {
    code: data.code, clientId: data.client_id, userId: data.user_id, tenantId: data.tenant_id,
    redirectUri: data.redirect_uri, codeChallenge: data.code_challenge,
    codeChallengeMethod: data.code_method, scope: (data.scopes ?? []).join(' '),
    state: data.state ?? undefined,
    expiresAt: new Date(data.expires_at).getTime(),
  };
}

// ── Refresh Tokens ──

export interface StoredRefreshToken {
  token: string;
  sessionId: string;
  tenantId: string;
  family: string;
  sequence: number;
  expiresAt: number;
}

export async function createRefreshToken(sessionId: string, tenantId: string, family: string, sequence: number, ttlSec: number): Promise<string> {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + ttlSec * 1000).toISOString();
  const { error } = await getSupabase().from('refresh_tokens').insert({
    token, session_id: sessionId, tenant_id: tenantId,
    family, sequence, expires_at: expiresAt,
  });
  if (error) throw new Error(`Failed to create refresh token: ${error.message}`);
  return token;
}

export async function consumeRefreshToken(token: string): Promise<StoredRefreshToken | null> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('refresh_tokens')
      .delete()
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .select()
      .maybeSingle();
    if (!data) return null;
    return {
      token: data.token, sessionId: data.session_id, tenantId: data.tenant_id,
      family: data.family, sequence: data.sequence,
      expiresAt: new Date(data.expires_at).getTime(),
    };
  } catch (err) {
    logger.warn({ err }, 'Failed to consume refresh token from database');
    return null;
  }
}

export async function revokeRefreshTokensByFamily(family: string): Promise<void> {
  const { error } = await getSupabase().from('refresh_tokens').delete().eq('family', family);
  if (error) throw new Error(`Failed to revoke refresh tokens: ${error.message}`);
}

export async function revokeRefreshTokensBySession(sessionId: string): Promise<void> {
  const { error } = await getSupabase().from('refresh_tokens').delete().eq('session_id', sessionId);
  if (error) throw new Error(`Failed to revoke refresh tokens for session: ${error.message}`);
}