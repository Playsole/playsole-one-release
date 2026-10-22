import { internalSecretHeaders, dispatchToExpress, getInternalService } from '@playsole-one/shared';

const AUTH_URL = process.env.SERVICE_AUTH_URL ?? 'http://localhost:3001';
const SESSION_URL = process.env.SERVICE_SESSION_URL ?? 'http://localhost:3004';
const CONSENT_URL = process.env.SERVICE_CONSENT_URL ?? 'http://localhost:3003';
const PROFILE_URL = process.env.SERVICE_PROFILE_URL ?? 'http://localhost:3002';
const SECURITY_URL = process.env.SERVICE_SECURITY_URL ?? 'http://localhost:3005';

function getServiceApp(serviceKey: 'auth' | 'session' | 'profile' | 'consent' | 'security') {
  return getInternalService(serviceKey);
}

function matchInternalService(url: string): 'auth' | 'session' | 'profile' | 'consent' | 'security' | null {
  if (url.startsWith(AUTH_URL) || url.includes(':3001/')) return 'auth';
  if (url.startsWith(SESSION_URL) || url.includes(':3004/')) return 'session';
  if (url.startsWith(PROFILE_URL) || url.includes(':3002/')) return 'profile';
  if (url.startsWith(CONSENT_URL) || url.includes(':3003/')) return 'consent';
  if (url.startsWith(SECURITY_URL) || url.includes(':3005/')) return 'security';
  return null;
}

function withSecret(headers: Record<string, string> = {}): Record<string, string> {
  return { ...headers, ...internalSecretHeaders() };
}

function withAuth(headers: Record<string, string>, supabaseAccessToken?: string): Record<string, string> {
  const h = withSecret(headers);
  if (supabaseAccessToken) h['x-supabase-access-token'] = supabaseAccessToken;
  return h;
}

const FETCH_TIMEOUT_MS = 15000;

/**
 * fetch() with timeout and automatic in-process dispatching for Cloudflare Workers
 * and unified execution environments where localhost TCP sockets are not used.
 */
export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = FETCH_TIMEOUT_MS): Promise<Response> {
  const matched = matchInternalService(url);
  const isInProcess = process.env.SERVICES_IN_PROCESS === 'true' || process.env.CLOUDFLARE_WORKER === 'true';

  if (matched && isInProcess) {
    const app = await getServiceApp(matched);
    if (app) {
      return dispatchToExpress(app, url, {
        method: options.method,
        headers: options.headers as any,
        body: typeof options.body === 'string' ? options.body : undefined,
      });
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await globalThis.fetch(url, { ...options, signal: controller.signal });
  } catch (err: any) {
    if (matched) {
      try {
        const app = await getServiceApp(matched);
        if (app) {
          return await dispatchToExpress(app, url, {
            method: options.method,
            headers: options.headers as any,
            body: typeof options.body === 'string' ? options.body : undefined,
          });
        }
      } catch (dispatchErr) {
        // Fall through to error throwing below
      }
    }
    if (err?.name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function loginUser(email: string, password: string, meta?: { ipAddress?: string; userAgent?: string }): Promise<{ userId: string; tenantId: string; email: string; displayName: string; supabaseAccessToken?: string; supabaseRefreshToken?: string } | { error: string; errorDescription: string }> {
  const res = await fetchWithTimeout(`${AUTH_URL}/api/login`, {
    method: 'POST',
    headers: withSecret({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email, password, ...(meta ?? {}) }),
  });
  const body = await res.json() as Record<string, string>;
  if (!res.ok) return { error: body.error ?? 'unknown', errorDescription: body.error_description ?? 'Login failed.' };
  return {
    userId: body.userId!, tenantId: body.tenantId!, email: body.email!, displayName: body.displayName!,
    supabaseAccessToken: body.supabaseAccessToken,
    supabaseRefreshToken: body.supabaseRefreshToken,
  };
}

export async function registerUser(name: string, email: string, password: string, locale?: string): Promise<{ userId: string; tenantId: string; email: string; displayName: string; emailVerified: boolean; supabaseAccessToken?: string; supabaseRefreshToken?: string } | { error: string; errorDescription: string }> {
  const res = await fetchWithTimeout(`${AUTH_URL}/api/register`, {
    method: 'POST',
    headers: withSecret({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name, email, password, locale }),
  });
  const body = await res.json() as Record<string, any>;
  if (!res.ok) return { error: body.error ?? 'unknown', errorDescription: body.error_description ?? 'Registration failed.' };
  return {
    userId: body.userId!, tenantId: body.tenantId!, email: body.email!, displayName: body.displayName!,
    emailVerified: body.emailVerified ?? false,
    supabaseAccessToken: body.supabaseAccessToken,
    supabaseRefreshToken: body.supabaseRefreshToken,
  };
}

export interface SessionCreateOptions {
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
export async function createSession(
  userId: string,
  tenantId: string,
  supabaseAccessToken?: string,
  supabaseRefreshToken?: string,
  options: SessionCreateOptions = {},
): Promise<{ id: string; userId: string; tenantId: string; createdAt: number }> {
  const res = await fetchWithTimeout(`${SESSION_URL}/sessions`, {
    method: 'POST',
    headers: withSecret({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      userId, tenantId,
      supabaseAccessToken: supabaseAccessToken ?? options.supabaseAccessToken,
      supabaseRefreshToken: supabaseRefreshToken ?? options.supabaseRefreshToken,
      clientId: options.clientId,
      tokenType: options.tokenType,
      deviceInfo: options.deviceInfo,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      mfaPassed: options.mfaPassed,
      expiresAt: options.expiresAt,
    }),
  });
  if (!res.ok) throw new Error('Failed to create session');
  return res.json() as unknown as { id: string; userId: string; tenantId: string; createdAt: number };
}

export async function revokeSession(id: string): Promise<void> {
  const res = await fetchWithTimeout(`${SESSION_URL}/sessions/${id}/revoke`, {
    method: 'POST',
    headers: withSecret(),
  });
  if (!res.ok && res.status !== 404) throw new Error(`revokeSession failed: ${res.status}`);
}

export async function markSessionMfaPassed(id: string): Promise<void> {
  const res = await fetchWithTimeout(`${SESSION_URL}/sessions/${id}/mfa`, {
    method: 'POST',
    headers: withSecret(),
  });
  if (!res.ok) throw new Error(`markSessionMfaPassed failed: ${res.status}`);
}

export async function getSessions(userId: string): Promise<Array<{ id: string; clientId?: string; tokenType: string; deviceInfo?: Record<string, unknown>; ipAddress?: string; userAgent?: string; mfaPassed: boolean; lastSeenAt?: string; createdAt: number }>> {
  const res = await fetchWithTimeout(`${SESSION_URL}/sessions?userId=${encodeURIComponent(userId)}`, { headers: withSecret() });
  if (!res.ok) return [];
  return res.json() as any;
}

export async function deleteSession(id: string): Promise<void> {
  const res = await fetchWithTimeout(`${SESSION_URL}/sessions/${id}`, {
    method: 'DELETE',
    headers: withSecret(),
  });
  if (!res.ok) throw new Error(`deleteSession failed: ${res.status}`);
}

/** Bulk-revoke all active sessions for a user (e.g. on account suspension). */
export async function revokeSessionsByUser(userId: string): Promise<void> {
  const res = await fetchWithTimeout(`${SESSION_URL}/sessions?userId=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: withSecret(),
  });
  // 204 = success, 404 = no sessions to revoke — both are acceptable
  if (!res.ok && res.status !== 404) {
    throw new Error(`revokeSessionsByUser failed: ${res.status}`);
  }
}


export async function updateSessionTokens(
  id: string,
  supabaseAccessToken?: string,
  supabaseRefreshToken?: string,
): Promise<{ id: string; userId: string; tenantId: string; createdAt: number }> {
  const res = await fetchWithTimeout(`${SESSION_URL}/sessions/${id}/tokens`, {
    method: 'PATCH',
    headers: withSecret({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ supabaseAccessToken, supabaseRefreshToken }),
  });
  if (!res.ok) throw new Error(`updateSessionTokens failed: ${res.status}`);
  return res.json() as unknown as { id: string; userId: string; tenantId: string; createdAt: number };
}

export async function checkConsent(userId: string, clientId: string, scope: string, tenantId?: string, supabaseAccessToken?: string): Promise<{ granted: boolean; missingScopes?: string[] }> {
  const params = new URLSearchParams({ client_id: clientId, scope });
  const tid = tenantId ?? '00000000-0000-0000-0000-000000000001';
  const headers: Record<string, string> = withAuth({ 'x-authenticated-user-id': userId, 'x-tenant-id': tid }, supabaseAccessToken);
  const res = await fetchWithTimeout(`${CONSENT_URL}/consent/check?${params}`, { headers });
  if (!res.ok) return { granted: false };
  return res.json() as Promise<{ granted: boolean; missingScopes?: string[] }>;
}

export async function createConsentGrant(userId: string, clientId: string, scopes: string[], tenantId?: string, supabaseAccessToken?: string): Promise<void> {
  const headers: Record<string, string> = withAuth({ 'Content-Type': 'application/json', 'x-authenticated-user-id': userId }, supabaseAccessToken);
  if (tenantId) headers['x-tenant-id'] = tenantId;
  await fetchWithTimeout(`${CONSENT_URL}/consent`, {
    method: 'POST', headers, body: JSON.stringify({ clientId, scopes }),
  });
}

// Fix #9: Upsert consent grant — creates if absent, updates scopes if already present.
// This prevents a 409 Conflict when a client re-requests consent with an expanded scope.
export async function upsertConsentGrant(userId: string, clientId: string, scopes: string[], tenantId?: string, supabaseAccessToken?: string): Promise<void> {
  const tid = tenantId ?? '00000000-0000-0000-0000-000000000001';
  const headers: Record<string, string> = withAuth({ 'Content-Type': 'application/json', 'x-authenticated-user-id': userId, 'x-tenant-id': tid }, supabaseAccessToken);
  await fetchWithTimeout(`${CONSENT_URL}/consent`, {
    method: 'PUT', headers, body: JSON.stringify({ clientId, scopes }),
  });
}

export async function getProfile(userId: string, tenantId?: string, supabaseAccessToken?: string): Promise<{ displayName: string; email: string; avatarUrl?: string; locale: string; emailVerified: boolean; createdAt: string; updatedAt: string } | null> {
  const headers: Record<string, string> = withAuth({ 'x-authenticated-user-id': userId }, supabaseAccessToken);
  if (tenantId) headers['x-tenant-id'] = tenantId;
  const res = await fetchWithTimeout(`${PROFILE_URL}/profile`, { headers });
  if (!res.ok) return null;
  return res.json() as any;
}

export async function updateProfile(userId: string, data: { displayName?: string; avatarUrl?: string | null; locale?: string }, tenantId?: string, supabaseAccessToken?: string): Promise<void> {
  const headers: Record<string, string> = withAuth({ 'Content-Type': 'application/json', 'x-authenticated-user-id': userId }, supabaseAccessToken);
  if (tenantId) headers['x-tenant-id'] = tenantId;
  const res = await fetchWithTimeout(`${PROFILE_URL}/profile`, {
    method: 'PUT', headers, body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorBody = (await res.json().catch(() => ({ error_description: res.statusText }))) as Record<string, any>;
    throw new Error(errorBody?.error_description || `Profile update failed (${res.status})`);
  }
}

export async function getGrants(userId: string, tenantId?: string, supabaseAccessToken?: string): Promise<Array<{ id: string; clientId: string; scopes: string[]; grantedAt: string }>> {
  const headers: Record<string, string> = withAuth({ 'x-authenticated-user-id': userId }, supabaseAccessToken);
  if (tenantId) headers['x-tenant-id'] = tenantId;
  const res = await fetchWithTimeout(`${CONSENT_URL}/consent`, { headers });
  if (!res.ok) return [];
  return res.json() as any;
}

export async function sendMagicLink(email: string, returnTo?: string): Promise<{ message: string; token?: string; expiresIn: number } | { error: string; errorDescription: string }> {
  const res = await fetchWithTimeout(`${AUTH_URL}/api/auth/magic-link`, {
    method: 'POST',
    headers: withSecret({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email, return_to: returnTo }),
  });
  const body = await res.json() as Record<string, any>;
  if (!res.ok) return { error: body.error ?? 'unknown', errorDescription: body.error_description ?? 'Failed to send magic link.' };
  return { message: body.message, token: body.token, expiresIn: body.expiresIn };
}

export async function verifyMagicLink(token: string): Promise<{ userId: string; email: string; tenantId: string; returnTo?: string; supabaseAccessToken?: string; supabaseRefreshToken?: string } | { error: string; errorDescription: string }> {
  const res = await fetchWithTimeout(`${AUTH_URL}/api/auth/magic-link/verify`, {
    method: 'POST',
    headers: withSecret({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ token }),
  });
  const body = await res.json() as Record<string, any>;
  if (!res.ok) return { error: body.error ?? 'unknown', errorDescription: body.error_description ?? 'Invalid magic link.' };
  return {
    userId: body.userId,
    email: body.email,
    tenantId: body.tenantId,
    returnTo: body.returnTo,
    supabaseAccessToken: body.supabaseAccessToken,
    supabaseRefreshToken: body.supabaseRefreshToken,
  };
}

export async function sendVerificationEmail(userId: string, email: string, tenantId?: string): Promise<{ message: string; token?: string; expiresIn: number } | { error: string; errorDescription: string }> {
  const headers: Record<string, string> = withSecret({ 'Content-Type': 'application/json', 'x-authenticated-user-id': userId });
  if (tenantId) headers['x-tenant-id'] = tenantId;
  const res = await fetchWithTimeout(`${AUTH_URL}/api/verify/email`, {
    method: 'POST', headers, body: JSON.stringify({ email }),
  });
  const body = await res.json() as Record<string, any>;
  if (!res.ok) return { error: body.error ?? 'unknown', errorDescription: body.error_description ?? 'Failed to send verification.' };
  return { message: body.message, token: body.token, expiresIn: body.expiresIn };
}

export async function sendPhoneVerification(userId: string, phone: string, tenantId?: string): Promise<{ message: string; token?: string; expiresIn: number } | { error: string; errorDescription: string }> {
  const headers: Record<string, string> = withSecret({ 'Content-Type': 'application/json', 'x-authenticated-user-id': userId });
  if (tenantId) headers['x-tenant-id'] = tenantId;
  const res = await fetchWithTimeout(`${AUTH_URL}/api/verify/phone`, {
    method: 'POST', headers, body: JSON.stringify({ phone }),
  });
  const body = await res.json() as Record<string, any>;
  if (!res.ok) return { error: body.error ?? 'unknown', errorDescription: body.error_description ?? 'Failed to send code.' };
  return { message: body.message, token: body.token, expiresIn: body.expiresIn };
}

export async function confirmPhone(userId: string, code: string, tenantId?: string): Promise<{ message: string } | { error: string; errorDescription: string }> {
  const headers: Record<string, string> = withSecret({ 'Content-Type': 'application/json', 'x-authenticated-user-id': userId });
  if (tenantId) headers['x-tenant-id'] = tenantId;
  const res = await fetchWithTimeout(`${AUTH_URL}/api/verify/phone/confirm`, {
    method: 'POST', headers, body: JSON.stringify({ token: code }),
  });
  const body = await res.json() as Record<string, any>;
  if (!res.ok) return { error: body.error ?? 'unknown', errorDescription: body.error_description ?? 'Failed to verify phone.' };
  return { message: body.message };
}

export async function confirmEmail(userId: string, token: string, tenantId?: string): Promise<{ message: string } | { error: string; errorDescription: string }> {
  const headers: Record<string, string> = withSecret({ 'Content-Type': 'application/json', 'x-authenticated-user-id': userId });
  if (tenantId) headers['x-tenant-id'] = tenantId;
  const res = await fetchWithTimeout(`${AUTH_URL}/api/verify/email/confirm`, {
    method: 'POST', headers, body: JSON.stringify({ token }),
  });
  const body = await res.json() as Record<string, any>;
  if (!res.ok) return { error: body.error ?? 'unknown', errorDescription: body.error_description ?? 'Failed to verify email.' };
  return { message: body.message };
}

export async function revokeGrant(userId: string, grantId: string, tenantId?: string, supabaseAccessToken?: string): Promise<void> {
  const headers: Record<string, string> = withAuth({ 'x-authenticated-user-id': userId }, supabaseAccessToken);
  if (tenantId) headers['x-tenant-id'] = tenantId;
  await fetchWithTimeout(`${CONSENT_URL}/consent/${grantId}`, {
    method: 'DELETE', headers,
  });
}

export async function verifyEmailOtp(email: string, token: string): Promise<{ message: string; supabaseAccessToken?: string; supabaseRefreshToken?: string } | { error: string; errorDescription: string }> {
  const res = await fetchWithTimeout(`${AUTH_URL}/api/verify/email/otp`, {
    method: 'POST',
    headers: withSecret({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email, token }),
  });
  const body = await res.json() as Record<string, any>;
  if (!res.ok) return { error: body.error ?? 'unknown', errorDescription: body.error_description ?? 'Verification failed.' };
  return {
    message: body.message,
    supabaseAccessToken: body.supabaseAccessToken,
    supabaseRefreshToken: body.supabaseRefreshToken,
  };
}

export async function resendEmailOtp(email: string): Promise<{ message: string } | { error: string; errorDescription: string }> {
  const res = await fetchWithTimeout(`${AUTH_URL}/api/verify/email/resend`, {
    method: 'POST',
    headers: withSecret({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email }),
  });
  const body = await res.json() as Record<string, any>;
  if (!res.ok) return { error: body.error ?? 'unknown', errorDescription: body.error_description ?? 'Failed to resend code.' };
  return { message: body.message };
}

// ── Security service (MFA, devices, recovery) ──

function securityHeaders(userId: string, tenantId?: string, supabaseAccessToken?: string): Record<string, string> {
  const headers: Record<string, string> = withAuth({ 'x-authenticated-user-id': userId }, supabaseAccessToken);
  if (tenantId) headers['x-tenant-id'] = tenantId;
  return headers;
}

export interface MfaStatus {
  mfaEnabled: boolean;
  mfaRequired: boolean;
  hasMfa: boolean;
  methods: Array<{ type: string; id: string; name: string; createdAt: string }>;
  backupCodes: { total: number; used: number };
}

export async function getMfaStatus(userId: string, tenantId?: string, supabaseAccessToken?: string, clientId?: string): Promise<MfaStatus> {
  const query = clientId ? `?client_id=${encodeURIComponent(clientId)}` : '';
  const res = await fetchWithTimeout(`${SECURITY_URL}/mfa/status${query}`, { headers: securityHeaders(userId, tenantId, supabaseAccessToken) });
  if (!res.ok) return { mfaEnabled: false, mfaRequired: false, hasMfa: false, methods: [], backupCodes: { total: 0, used: 0 } };
  return res.json() as any;
}

export async function verifyTotpChallenge(userId: string, code: string, tenantId?: string): Promise<{ ok: boolean; method: string } | { error: string; errorDescription: string }> {
  const res = await fetchWithTimeout(`${SECURITY_URL}/mfa/totp/challenge`, {
    method: 'POST',
    headers: withSecret({ 'Content-Type': 'application/json', 'x-authenticated-user-id': userId, ...(tenantId ? { 'x-tenant-id': tenantId } : {}) }),
    body: JSON.stringify({ code }),
  });
  const body = await res.json() as Record<string, any>;
  if (!res.ok) return { error: body.error ?? 'unknown', errorDescription: body.error_description ?? 'Verification failed.' };
  return { ok: true, method: body.method };
}

export async function verifyBackupCode(userId: string, code: string, tenantId?: string): Promise<{ ok: boolean; method: string } | { error: string; errorDescription: string }> {
  const res = await fetchWithTimeout(`${SECURITY_URL}/mfa/backup-codes/challenge`, {
    method: 'POST',
    headers: withSecret({ 'Content-Type': 'application/json', 'x-authenticated-user-id': userId, ...(tenantId ? { 'x-tenant-id': tenantId } : {}) }),
    body: JSON.stringify({ code }),
  });
  const body = await res.json() as Record<string, any>;
  if (!res.ok) return { error: body.error ?? 'unknown', errorDescription: body.error_description ?? 'That code is invalid.' };
  return { ok: true, method: body.method };
}

export async function webauthnAuthOptions(userId: string, tenantId?: string): Promise<any> {
  const res = await fetchWithTimeout(`${SECURITY_URL}/mfa/webauthn/authenticate/options`, {
    method: 'POST',
    headers: withSecret({ 'Content-Type': 'application/json', 'x-authenticated-user-id': userId, ...(tenantId ? { 'x-tenant-id': tenantId } : {}) }),
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error('Failed to generate passkey challenge');
  return res.json();
}

export async function webauthnAuthenticate(userId: string, response: unknown, tenantId?: string): Promise<{ ok: boolean; method: string } | { error: string; errorDescription: string }> {
  const res = await fetchWithTimeout(`${SECURITY_URL}/mfa/webauthn/authenticate`, {
    method: 'POST',
    headers: withSecret({ 'Content-Type': 'application/json', 'x-authenticated-user-id': userId, ...(tenantId ? { 'x-tenant-id': tenantId } : {}) }),
    body: JSON.stringify({ response }),
  });
  const body = await res.json() as Record<string, any>;
  if (!res.ok) return { error: body.error ?? 'unknown', errorDescription: body.error_description ?? 'Passkey verification failed.' };
  return { ok: true, method: body.method };
}

export async function beginTotpEnrollment(userId: string, tenantId?: string, name?: string): Promise<{ id: string; secret: string; otpauthUrl: string } | { error: string; errorDescription: string }> {
  const res = await fetchWithTimeout(`${SECURITY_URL}/mfa/totp`, {
    method: 'POST',
    headers: withSecret({ 'Content-Type': 'application/json', 'x-authenticated-user-id': userId, ...(tenantId ? { 'x-tenant-id': tenantId } : {}) }),
    body: JSON.stringify({ name }),
  });
  const body = await res.json() as Record<string, any>;
  if (!res.ok) return { error: body.error ?? 'unknown', errorDescription: body.error_description ?? 'Failed to start enrollment.' };
  return { id: body.id, secret: body.secret, otpauthUrl: body.otpauthUrl };
}

export async function confirmTotpEnrollment(userId: string, totpId: string, code: string, tenantId?: string): Promise<{ ok: boolean } | { error: string; errorDescription: string }> {
  const res = await fetchWithTimeout(`${SECURITY_URL}/mfa/totp/${totpId}/verify`, {
    method: 'POST',
    headers: withSecret({ 'Content-Type': 'application/json', 'x-authenticated-user-id': userId, ...(tenantId ? { 'x-tenant-id': tenantId } : {}) }),
    body: JSON.stringify({ code }),
  });
  const body = await res.json() as Record<string, any>;
  if (!res.ok) return { error: body.error ?? 'unknown', errorDescription: body.error_description ?? 'That code is invalid.' };
  return { ok: true };
}

export async function removeTotpMethod(userId: string, totpId: string, tenantId?: string): Promise<void> {
  await fetchWithTimeout(`${SECURITY_URL}/mfa/totp/${totpId}`, {
    method: 'DELETE',
    headers: withSecret({ 'x-authenticated-user-id': userId, ...(tenantId ? { 'x-tenant-id': tenantId } : {}) }),
  });
}

export async function webauthnRegisterOptions(userId: string, tenantId?: string, deviceLabel?: string): Promise<any> {
  const res = await fetchWithTimeout(`${SECURITY_URL}/mfa/webauthn/register/options`, {
    method: 'POST',
    headers: withSecret({ 'Content-Type': 'application/json', 'x-authenticated-user-id': userId, ...(tenantId ? { 'x-tenant-id': tenantId } : {}) }),
    body: JSON.stringify({ deviceLabel }),
  });
  if (!res.ok) throw new Error('Failed to generate passkey registration options');
  return res.json();
}

export async function webauthnRegister(userId: string, response: unknown, tenantId?: string, deviceLabel?: string): Promise<{ ok: boolean; id: string; name: string } | { error: string; errorDescription: string }> {
  const res = await fetchWithTimeout(`${SECURITY_URL}/mfa/webauthn/register`, {
    method: 'POST',
    headers: withSecret({ 'Content-Type': 'application/json', 'x-authenticated-user-id': userId, ...(tenantId ? { 'x-tenant-id': tenantId } : {}) }),
    body: JSON.stringify({ response, deviceLabel }),
  });
  const body = await res.json() as Record<string, any>;
  if (!res.ok) return { error: body.error ?? 'unknown', errorDescription: body.error_description ?? 'Passkey registration failed.' };
  return { ok: true, id: body.id, name: body.name };
}

export async function removeWebAuthnCredential(userId: string, credentialId: string, tenantId?: string): Promise<void> {
  await fetchWithTimeout(`${SECURITY_URL}/mfa/webauthn/${credentialId}`, {
    method: 'DELETE',
    headers: withSecret({ 'x-authenticated-user-id': userId, ...(tenantId ? { 'x-tenant-id': tenantId } : {}) }),
  });
}

export async function generateBackupCodes(userId: string, tenantId?: string): Promise<{ codes: string[] } | { error: string; errorDescription: string }> {
  const res = await fetchWithTimeout(`${SECURITY_URL}/mfa/backup-codes`, {
    method: 'POST',
    headers: withSecret({ 'Content-Type': 'application/json', 'x-authenticated-user-id': userId, ...(tenantId ? { 'x-tenant-id': tenantId } : {}) }),
    body: JSON.stringify({}),
  });
  const body = await res.json() as Record<string, any>;
  if (!res.ok) return { error: body.error ?? 'unknown', errorDescription: body.error_description ?? 'Failed to generate backup codes.' };
  return { codes: body.codes };
}

export async function getMfaMethods(userId: string, tenantId?: string, supabaseAccessToken?: string): Promise<{ totp: Array<{ id: string; name: string; verified: boolean; createdAt: string }>; webauthn: Array<{ id: string; name: string; createdAt: string; lastUsedAt?: string }>; backupCodes: { total: number; used: number } }> {
  const res = await fetchWithTimeout(`${SECURITY_URL}/mfa`, { headers: securityHeaders(userId, tenantId, supabaseAccessToken) });
  if (!res.ok) return { totp: [], webauthn: [], backupCodes: { total: 0, used: 0 } };
  return res.json() as any;
}

export async function getDevices(userId: string, tenantId?: string, supabaseAccessToken?: string): Promise<Array<{ id: string; label: string; userAgent?: string; ipAddress?: string; country?: string; city?: string; trusted: boolean; firstSeenAt: string; lastSeenAt: string }>> {
  const res = await fetchWithTimeout(`${SECURITY_URL}/devices`, { headers: securityHeaders(userId, tenantId, supabaseAccessToken) });
  if (!res.ok) return [];
  const body = await res.json() as any;
  return Array.isArray(body) ? body : (body.devices ?? []);
}

export async function reportDevice(userId: string, tenantId: string, info: { fingerprint: string; label: string; userAgent?: string; ipAddress?: string; country?: string; city?: string }, supabaseAccessToken?: string): Promise<{ device: any; riskSignals: string[] }> {
  const res = await fetchWithTimeout(`${SECURITY_URL}/devices`, {
    method: 'POST',
    headers: withSecret({ 'Content-Type': 'application/json', 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId, ...(supabaseAccessToken ? { 'x-supabase-access-token': supabaseAccessToken } : {}) }),
    body: JSON.stringify(info),
  });
  const body = await res.json() as Record<string, any>;
  if (!res.ok) return { device: null, riskSignals: [] };
  return { device: body.device, riskSignals: body.riskSignals ?? [] };
}

export async function setDeviceTrusted(userId: string, deviceId: string, trusted: boolean, tenantId?: string): Promise<void> {
  await fetchWithTimeout(`${SECURITY_URL}/devices/${deviceId}`, {
    method: 'PATCH',
    headers: withSecret({ 'Content-Type': 'application/json', 'x-authenticated-user-id': userId, ...(tenantId ? { 'x-tenant-id': tenantId } : {}) }),
    body: JSON.stringify({ trusted }),
  });
}

export async function removeDevice(userId: string, deviceId: string, tenantId?: string): Promise<void> {
  await fetchWithTimeout(`${SECURITY_URL}/devices/${deviceId}`, {
    method: 'DELETE',
    headers: withSecret({ 'x-authenticated-user-id': userId, ...(tenantId ? { 'x-tenant-id': tenantId } : {}) }),
  });
}

export async function requestEmailRecovery(email: string): Promise<{ message: string; token?: string; expiresAt?: string } | { error: string; errorDescription: string }> {
  const res = await fetchWithTimeout(`${SECURITY_URL}/recovery/email`, {
    method: 'POST',
    headers: withSecret({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email }),
  });
  const body = await res.json() as Record<string, any>;
  if (!res.ok) return { error: body.error ?? 'unknown', errorDescription: body.error_description ?? 'Failed to start recovery.' };
  return { message: body.message, token: body.token, expiresAt: body.expiresAt };
}

export async function consumeRecoveryToken(token: string): Promise<{ userId: string } | { error: string; errorDescription: string }> {
  const res = await fetchWithTimeout(`${SECURITY_URL}/recovery/verify`, {
    method: 'POST',
    headers: withSecret({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ token }),
  });
  const body = await res.json() as Record<string, any>;
  if (!res.ok) return { error: body.error ?? 'unknown', errorDescription: body.error_description ?? 'Recovery link is invalid or expired.' };
  return { userId: body.userId };
}

export async function resetMfaForRecovery(userId: string, tenantId?: string): Promise<{ codes: string[] } | { error: string; errorDescription: string }> {
  const res = await fetchWithTimeout(`${SECURITY_URL}/recovery/reset`, {
    method: 'POST',
    headers: withSecret({ 'Content-Type': 'application/json', 'x-authenticated-user-id': userId, ...(tenantId ? { 'x-tenant-id': tenantId } : {}) }),
    body: JSON.stringify({}),
  });
  const body = await res.json() as Record<string, any>;
  if (!res.ok) return { error: body.error ?? 'unknown', errorDescription: body.error_description ?? 'Recovery failed.' };
  return { codes: body.codes };
}