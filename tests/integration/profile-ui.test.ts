import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Server } from 'node:http';
import type { Express } from 'express';
import { hasDb, registerUser, createSession } from './helpers';

let sessionApp: Express;
let sessionServer: Server;
let authApp: Express;
let profileServer: Server;
let gatewayApp: Express;

beforeAll(async () => {
  sessionApp = (await import('../../services/session/src/index')).default;
  sessionServer = sessionApp.listen(0);
  const sessionAddr = sessionServer.address();
  const sessionPort = sessionAddr && typeof sessionAddr === 'object' ? sessionAddr.port : 3004;
  process.env.SERVICE_SESSION_URL = `http://localhost:${sessionPort}`;

  authApp = (await import('../../services/auth/src/index')).default;

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
  profileServer?.close();
});

describe.skipIf(!hasDb)('Profile Page UI', () => {
  let cookie: string;
  const displayName = 'Test User';

  beforeAll(async () => {
    const user = await registerUser(authApp, 'profile-ui');
    const { cookie: c } = await createSession(sessionApp, user.userId, user.tenantId);
    cookie = c;
  });

  it('GET /profile should render the profile page', async () => {
    const res = await request(gatewayApp)
      .get('/profile')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain(displayName);
    expect(res.text).toContain('Save changes');
    expect(res.text).toContain('Sign out');
  });

  it('GET /profile should redirect to login when unauthenticated', async () => {
    const res = await request(gatewayApp).get('/profile');

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/login');
  });

  it('POST /profile should update display name', async () => {
    const res = await request(gatewayApp)
      .post('/profile')
      .set('Cookie', cookie)
      .type('form')
      .send({ displayName: 'Updated Name' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/profile');

    const profileRes = await request(gatewayApp)
      .get('/profile')
      .set('Cookie', cookie);
    expect(profileRes.text).toContain('Updated Name');
  });

  it('POST /profile should show error for empty display name', async () => {
    const res = await request(gatewayApp)
      .post('/profile')
      .set('Cookie', cookie)
      .type('form')
      .send({ displayName: '' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('Display name is required');
  });

  it('POST /profile should update locale', async () => {
    const res = await request(gatewayApp)
      .post('/profile')
      .set('Cookie', cookie)
      .type('form')
      .send({ displayName: 'Test User', locale: 'de' });

    expect(res.status).toBe(302);

    const profileRes = await request(gatewayApp)
      .get('/profile')
      .set('Cookie', cookie);
    expect(profileRes.text).toContain('Deutsch');
  });

  it('POST /profile should update avatar URL', async () => {
    const res = await request(gatewayApp)
      .post('/profile')
      .set('Cookie', cookie)
      .type('form')
      .send({ displayName: 'Test User', avatarUrl: 'https://example.com/avatar.png' });

    expect(res.status).toBe(302);

    const profileRes = await request(gatewayApp)
      .get('/profile')
      .set('Cookie', cookie);
    expect(profileRes.text).toContain('example.com/avatar.png');
  });

  it('POST /profile should reject unauthenticated requests', async () => {
    const res = await request(gatewayApp)
      .post('/profile')
      .type('form')
      .send({ displayName: 'Hacker' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthenticated');
  });
});