import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Server } from 'node:http';
import type { Express } from 'express';
import { hasDb, withSecret } from './helpers';

// Fix #16: If the required database environment variables are not configured,
// skip the entire integration suite immediately rather than hanging for 30s.
const hasIntegrationEnv = Boolean(process.env.SUPABASE_URL || process.env.DATABASE_URL);

let server: Server;
let app: Express;
let authApp: Express;

beforeAll(async () => {
  if (!hasIntegrationEnv) return;
  app = (await import('../../services/security/src/index')).default;
  server = app.listen(0);
  authApp = (await import('../../services/auth/src/index')).default;
}, 5000 /* Fix #16: short timeout — fail fast instead of hanging 30s */);

afterAll(() => {
  server?.close();
});

describe.skipIf(!hasIntegrationEnv)('Security service health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'security' });
  });
});

describe.skipIf(!hasDb)('MFA endpoints (DB-backed)', () => {
  let userId: string;
  let tenantId: string;

  beforeAll(async () => {
    const user = await request(authApp)
      .post('/api/register')
      .set(withSecret())
      .send({ name: 'MFA Test', email: `mfa-${Date.now()}@playsole.xyz`, password: 'password-123' });
    userId = user.body.userId;
    tenantId = user.body.tenantId;
  });

  it('rejects calls without the internal secret', async () => {
    const res = await request(app).get('/mfa').set({ 'x-authenticated-user-id': userId });
    expect(res.status).toBe(401);
  });

  it('starts with no MFA methods', async () => {
    const res = await request(app)
      .get('/mfa')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }));
    expect(res.status).toBe(200);
    expect(res.body.totp).toEqual([]);
    expect(res.body.webauthn).toEqual([]);
    expect(res.body.backupCodes).toEqual({ total: 0, used: 0 });
  });

  it('reports mfaRequired=false by default and no MFA', async () => {
    const res = await request(app)
      .get('/mfa/status')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }));
    expect(res.status).toBe(200);
    expect(res.body.mfaEnabled).toBe(false);
    expect(res.body.mfaRequired).toBe(false);
    expect(res.body.hasMfa).toBe(false);
  });

  it('enrolls TOTP and returns a base32 secret', async () => {
    const res = await request(app)
      .post('/mfa/totp')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }))
      .send({ name: 'Test authenticator' });
    expect(res.status).toBe(201);
    expect(res.body.secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(res.body.otpauthUrl.startsWith('otpauth://')).toBe(true);
  });

  it('rejects enrolling a second TOTP while one exists', async () => {
    const res = await request(app)
      .post('/mfa/totp')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }))
      .send({});
    expect(res.status).toBe(409);
  });

  it('rejects a wrong TOTP verification code', async () => {
    const res = await request(app)
      .post('/mfa/totp/challenge')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }))
      .send({ code: '000000' });
    expect(res.status).toBe(400);
  });

  it('returns WebAuthn registration options with a challenge', async () => {
    const res = await request(app)
      .post('/mfa/webauthn/register/options')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }))
      .send({ deviceLabel: 'Test key' });
    expect(res.status).toBe(200);
    expect(res.body.challenge).toBeDefined();
    expect(res.body.rp).toEqual({ name: expect.any(String), id: 'localhost' });
    expect(res.body.pubKeyCredParams.length).toBeGreaterThan(0);
    expect(res.body.user.id).toBe(Buffer.from(userId).toString('base64url'));
  });

  it('returns WebAuthn authentication options scoped to registered credentials', async () => {
    const res = await request(app)
      .post('/mfa/webauthn/authenticate/options')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }))
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.challenge).toBeDefined();
    expect(Array.isArray(res.body.allowCredentials)).toBe(true);
  });

  it('rejects a malformed WebAuthn registration response', async () => {
    const res = await request(app)
      .post('/mfa/webauthn/register')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }))
      .send({ response: { id: 'x', response: {} } });
    expect(res.status).toBe(400);
  });

  it('rejects an assertion for an unknown credential', async () => {
    const res = await request(app)
      .post('/mfa/webauthn/authenticate')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }))
      .send({
        response: {
          id: 'unknown-credential-id',
          response: {
            clientDataJSON: Buffer.from(JSON.stringify({ challenge: 'abc', type: 'webauthn.get' })).toString('base64url'),
            authenticatorData: 'a',
            signature: 'b',
          },
        },
      });
    expect(res.status).toBe(404);
  });
});