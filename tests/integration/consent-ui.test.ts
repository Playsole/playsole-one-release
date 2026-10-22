import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Server } from 'node:http';
import type { Express } from 'express';
import { hasDb, withSecret, registerUser, createSession } from './helpers';

let authApp: Express;
let sessionApp: Express;
let sessionServer: Server;
let consentApp: Express;
let consentServer: Server;
let gatewayApp: Express;

beforeAll(async () => {
  authApp = (await import('../../services/auth/src/index')).default;

  sessionApp = (await import('../../services/session/src/index')).default;
  sessionServer = sessionApp.listen(0);
  const sessionAddr = sessionServer.address();
  const sessionPort = sessionAddr && typeof sessionAddr === 'object' ? sessionAddr.port : 3004;
  process.env.SERVICE_SESSION_URL = `http://localhost:${sessionPort}`;

  consentApp = (await import('../../services/consent/src/index')).default;
  consentServer = consentApp.listen(0);
  const consentAddr = consentServer.address();
  const consentPort = consentAddr && typeof consentAddr === 'object' ? consentAddr.port : 3003;
  process.env.SERVICE_CONSENT_URL = `http://localhost:${consentPort}`;

  gatewayApp = (await import('../../gateway/src/index')).default;
  gatewayApp.listen(0);
});

afterAll(() => {
  sessionServer?.close();
  consentServer?.close();
});

describe.skipIf(!hasDb)('Consent Screen UI', () => {
  const clientId = 'playsole-dev';
  let userId: string;
  let tenantId: string;
  let cookie: string;

  beforeAll(async () => {
    const user = await registerUser(authApp, 'consent-ui');
    userId = user.userId;
    tenantId = user.tenantId;
    const c = await createSession(sessionApp, userId, tenantId);
    cookie = c.cookie;

    const existing = await request(consentApp)
      .get('/consent')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }));
    for (const g of existing.body) {
      await request(consentApp)
        .delete(`/consent/${g.id}`)
        .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }));
    }
  });

  it('GET /consent should render the consent page', async () => {
    const res = await request(gatewayApp)
      .get(`/consent?client_id=${clientId}&scope=openid%20profile%20email`)
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('Authorize');
    expect(res.text).toContain(clientId);
    expect(res.text).toContain('display name');
    expect(res.text).toContain('email address');
  });

  it('GET /consent should redirect to login when unauthenticated', async () => {
    const res = await request(gatewayApp)
      .get(`/consent?client_id=${clientId}&scope=openid`);

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/login');
  });

  it('POST /consent with allow should create a grant and redirect to authorize', async () => {
    const res = await request(gatewayApp)
      .post('/consent')
      .set('Cookie', cookie)
      .type('form')
      .send({
        decision: 'allow',
        authorize_params: 'client_id=playsole-dev&scope=openid%20profile&response_type=code&redirect_uri=http://localhost:5173/callback&code_challenge=abc&code_challenge_method=S256',
      });

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/authorize');
  });

  it('POST /consent with deny should redirect to login', async () => {
    const res = await request(gatewayApp)
      .post('/consent')
      .set('Cookie', cookie)
      .type('form')
      .send({
        decision: 'deny',
        authorize_params: 'client_id=playsole-dev&scope=openid',
      });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  it('POST /consent should reject unauthenticated requests', async () => {
    const res = await request(gatewayApp)
      .post('/consent')
      .type('form')
      .send({
        decision: 'allow',
        authorize_params: 'client_id=playsole-dev&scope=openid',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthenticated');
  });

  it('consent grant should be created after allow', async () => {
    const grantsRes = await request(consentApp)
      .get('/consent')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }));

    expect(Array.isArray(grantsRes.body)).toBe(true);
    expect(grantsRes.body.some((g: any) => g.clientId === clientId)).toBe(true);
  });
});