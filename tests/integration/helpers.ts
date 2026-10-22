import request from 'supertest';
import type { Express } from 'express';
import crypto from 'node:crypto';
import { getInternalSecret } from '../../packages/shared/src/middleware';

/**
 * Integration tests talk to Postgres-backed stores, so they only run when a
 * database is provisioned. CI without a DB skips them instead of failing.
 */
export const hasDb = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Direct calls to backend services must carry the internal shared secret,
 * mirroring what the gateway injects on every proxied request.
 */
export function withSecret(headers: Record<string, string> = {}): Record<string, string> {
  return { 'x-internal-shared-secret': getInternalSecret(), ...headers };
}

/**
 * Register a fresh user and return its id + tenant id so tests exercise
 * real records instead of a hardcoded stub id.
 */
export async function registerUser(
  app: Express,
  prefix = 'user',
): Promise<{ userId: string; tenantId: string; email: string }> {
  const email = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@playsole.xyz`;
  const res = await request(app)
    .post('/api/register')
    .set(withSecret())
    .send({ name: 'Test User', email, password: 'password-123' });
  return { userId: res.body.userId, tenantId: res.body.tenantId, email };
}

/**
 * Create a server-side session for a user through the session service and
 * return the session id plus the HTTP Cookie header the gateway expects.
 * Tests run without TLS, so the gateway uses the non-__Host cookie name.
 */
export async function createSession(
  app: Express,
  userId: string,
  tenantId: string,
): Promise<{ id: string; cookie: string }> {
  const res = await request(app)
    .post('/sessions')
    .set(withSecret())
    .send({ userId, tenantId });
  if (!res.ok) throw new Error(`createSession failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { id: res.body.id, cookie: `playsole_session=${res.body.id}` };
}

/**
 * Run a full authorization_code + PKCE exchange against the auth service and
 * return the auth code / tokens for a given user.
 */
export async function obtainCode(
  app: Express,
  userId: string,
  tenantId: string,
  clientId = 'playsole-dev',
  redirectUri = 'http://localhost:5173/callback',
): Promise<{ code: string; codeVerifier: string }> {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const res = await request(app)
    .get('/authorize')
    .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }))
    .query({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      scope: 'openid profile email',
    });
  const location = res.headers.location as string;
  const code = new URL(location).searchParams.get('code')!;
  return { code, codeVerifier };
}
