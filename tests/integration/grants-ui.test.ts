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

describe.skipIf(!hasDb)('Consent Management UI', () => {
  const clientId = 'playsole-dev';
  let userId: string;
  let tenantId: string;
  let cookie: string;
  let grantId: string;

  beforeAll(async () => {
    const user = await registerUser(authApp, 'grants-ui');
    userId = user.userId;
    tenantId = user.tenantId;
    const c = await createSession(sessionApp, userId, tenantId);
    cookie = c.cookie;

    const grantRes = await request(consentApp)
      .post('/consent')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }))
      .send({ clientId, scopes: ['openid', 'profile', 'email'] });
    grantId = grantRes.body.id;
  });

  it('GET /grants should show the grants list', async () => {
    const res = await request(gatewayApp)
      .get('/grants')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('Authorized Applications');
    expect(res.text).toContain(clientId);
    expect(res.text).toContain('Profile');
  });

  it('GET /grants should redirect to login when unauthenticated', async () => {
    const res = await request(gatewayApp).get('/grants');

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/login');
  });

  it('POST /grants/revoke/:id should revoke and redirect', async () => {
    const res = await request(gatewayApp)
      .post(`/grants/revoke/${grantId}`)
      .set('Cookie', cookie);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/grants');

    const listRes = await request(gatewayApp)
      .get('/grants')
      .set('Cookie', cookie);
    expect(listRes.text).not.toContain(clientId);
  });

  it('POST /grants/revoke/:id should reject unauthenticated', async () => {
    const res = await request(gatewayApp)
      .post('/grants/revoke/unknown')
      .type('form');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthenticated');
  });
});