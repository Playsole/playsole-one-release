import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Server } from 'node:http';
import type { Express } from 'express';
import { hasDb, withSecret, registerUser } from './helpers';

let sessionApp: Express;
let sessionServer: Server;
let authApp: Express;
let authServer: Server;
let profileServer: Server;
let gatewayApp: Express;

beforeAll(async () => {
  sessionApp = (await import('../../services/session/src/index')).default;
  sessionServer = sessionApp.listen(0);
  const sessionAddr = sessionServer.address();
  const sessionPort = sessionAddr && typeof sessionAddr === 'object' ? sessionAddr.port : 3004;
  process.env.SERVICE_SESSION_URL = `http://localhost:${sessionPort}`;

  authApp = (await import('../../services/auth/src/index')).default;
  authServer = authApp.listen(0);
  const authAddr = authServer.address();
  const authPort = authAddr && typeof authAddr === 'object' ? authAddr.port : 3001;
  process.env.SERVICE_AUTH_URL = `http://localhost:${authPort}`;

  const profileApp = (await import('../../services/profile/src/index')).default;
  profileServer = profileApp.listen(0);
  const profileAddr = profileServer.address();
  const profilePort = profileAddr && typeof profileAddr === 'object' ? profileAddr.port : 3002;
  process.env.SERVICE_PROFILE_URL = `http://localhost:${profilePort}`;

  gatewayApp = (await import('../../gateway/src/index')).default;
  gatewayApp.listen(0);
});

afterAll(() => {
  sessionServer?.close();
  authServer?.close();
  profileServer?.close();
});

describe.skipIf(!hasDb)('Magic Link Authentication', () => {
  let email: string;
  let displayName: string;
  let sessionCookie: string;

  beforeAll(async () => {
    const user = await registerUser(authApp, 'magiclink');
    email = user.email;
    displayName = 'Test User';
  });

  it('POST /api/auth/magic-link should generate a token for existing user', async () => {
    const res = await request(authApp)
      .post('/api/auth/magic-link')
      .set(withSecret())
      .send({ email });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.expiresIn).toBe(600);

    (globalThis as any).__magicToken = res.body.token;
  });

  it('POST /api/auth/magic-link should reject unknown email', async () => {
    const res = await request(authApp)
      .post('/api/auth/magic-link')
      .set(withSecret())
      .send({ email: 'unknown@test.com' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not_found');
  });

  it('POST /api/auth/magic-link should reject missing email', async () => {
    const res = await request(authApp)
      .post('/api/auth/magic-link')
      .set(withSecret())
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_request');
  });

  it('POST /api/auth/magic-link/verify should return userId for a valid token', async () => {
    const token = (globalThis as any).__magicToken;
    const res = await request(authApp)
      .post('/api/auth/magic-link/verify')
      .set(withSecret())
      .send({ token });

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(email);
    expect(res.body.userId).toBeTruthy();
  });

  it('POST /api/auth/magic-link/verify should reject reused token', async () => {
    const token = (globalThis as any).__magicToken;
    const res = await request(authApp)
      .post('/api/auth/magic-link/verify')
      .set(withSecret())
      .send({ token });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_grant');
  });

  it('POST /api/auth/magic-link/verify should reject bogus token', async () => {
    const res = await request(authApp)
      .post('/api/auth/magic-link/verify')
      .set(withSecret())
      .send({ token: 'bogus' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_grant');
  });

  it('POST /login/magic-link in BFF should show sent page', async () => {
    const res = await request(gatewayApp)
      .post('/login/magic-link')
      .type('form')
      .send({ email });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('Check your email');
    expect(res.text).toContain(email);
  });

  it('POST /login/magic-link should render login page error for unknown email', async () => {
    const res = await request(gatewayApp)
      .post('/login/magic-link')
      .type('form')
      .send({ email: 'unknown@test.com' });

    expect(res.status).toBe(400);
    expect(res.text).toContain('Sign in');
  });

  it('GET /magic-link/verify should create a session and redirect with a valid token', async () => {
    const tokenRes = await request(authApp)
      .post('/api/auth/magic-link')
      .set(withSecret())
      .send({ email });
    const token = tokenRes.body.token;

    const res = await request(gatewayApp)
      .get(`/magic-link/verify?token=${token}`);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/profile');
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toContain('playsole_session=');

    sessionCookie = res.headers['set-cookie'][0].split(';')[0];
  });

  it('profile page should be accessible after magic link login', async () => {
    const res = await request(gatewayApp)
      .get('/profile')
      .set('Cookie', sessionCookie);

    expect(res.status).toBe(200);
    expect(res.text).toContain(displayName);
  });
});