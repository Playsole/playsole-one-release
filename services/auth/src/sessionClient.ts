import { internalSecretHeaders, dispatchToExpress, getInternalService } from '@playsole-one/shared';

const BASE_URL = process.env.SERVICE_SESSION_URL ?? process.env.SESSION_SERVICE_URL ?? 'http://localhost:3004';

async function request(path: string, options: RequestInit = {}): Promise<Response> {
  const isInProcess = process.env.SERVICES_IN_PROCESS === 'true' || process.env.CLOUDFLARE_WORKER === 'true';
  if (isInProcess) {
    const sessionApp = getInternalService('session');
    if (sessionApp) {
      return dispatchToExpress(sessionApp, `http://localhost:3004${path}`, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...internalSecretHeaders(),
          ...(options.headers as Record<string, string> || {}),
        },
        body: typeof options.body === 'string' ? options.body : undefined,
      });
    }
  }

  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    signal: options.signal || AbortSignal.timeout(1200),
    headers: { 'Content-Type': 'application/json', ...internalSecretHeaders(), ...(options.headers as Record<string, string> || {}) },
  });
  return res;
}

export async function createSession(userId: string, tenantId: string): Promise<{ id: string; userId: string; tenantId: string; createdAt: number }> {
  const res = await request('/sessions', { method: 'POST', body: JSON.stringify({ userId, tenantId }) });
  if (!res.ok) throw new Error(`createSession failed: ${res.status}`);
  return res.json() as unknown as { id: string; userId: string; tenantId: string; createdAt: number };
}

export async function getSession(id: string): Promise<{ id: string; userId: string; tenantId?: string; createdAt: number; revokedAt?: string } | null> {
  const res = await request(`/sessions/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getSession failed: ${res.status}`);
  return res.json() as unknown as { id: string; userId: string; tenantId?: string; createdAt: number; revokedAt?: string };
}

export async function deleteSession(id: string): Promise<void> {
  await request(`/sessions/${id}`, { method: 'DELETE' });
}

export async function createAuthCode(
  clientId: string, userId: string, tenantId: string, redirectUri: string,
  codeChallenge: string, codeChallengeMethod: string,
  scope: string, ttlSec: number, state?: string,
): Promise<string> {
  const res = await request('/auth-codes', {
    method: 'POST',
    body: JSON.stringify({ clientId, userId, tenantId, redirectUri, codeChallenge, codeChallengeMethod, scope, ttlSec, state }),
  });
  if (!res.ok) throw new Error(`createAuthCode failed: ${res.status}`);
  const { code } = await res.json() as { code: string };
  return code;
}

export async function consumeAuthCode(code: string): Promise<Record<string, unknown> | null> {
  const res = await request('/auth-codes/consume', { method: 'POST', body: JSON.stringify({ code }) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`consumeAuthCode failed: ${res.status}`);
  return res.json() as unknown as Record<string, unknown>;
}

export async function createRefreshToken(sessionId: string, tenantId: string, family: string, sequence: number, ttlSec: number): Promise<string> {
  const res = await request('/refresh-tokens', {
    method: 'POST',
    body: JSON.stringify({ sessionId, tenantId, family, sequence, ttlSec }),
  });
  if (!res.ok) throw new Error(`createRefreshToken failed: ${res.status}`);
  const { token } = await res.json() as { token: string };
  return token;
}

export async function consumeRefreshToken(token: string): Promise<Record<string, unknown> | null> {
  const res = await request('/refresh-tokens/consume', { method: 'POST', body: JSON.stringify({ token }) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`consumeRefreshToken failed: ${res.status}`);
  return res.json() as unknown as Record<string, unknown>;
}

export async function revokeRefreshTokensByFamily(family: string): Promise<void> {
  await request('/refresh-tokens/revoke-family', { method: 'POST', body: JSON.stringify({ family }) });
}
