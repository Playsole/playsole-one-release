import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Server } from 'node:http';
import type { Express } from 'express';
import { hasDb, withSecret, registerUser } from './helpers';

let sessionServer: Server;
let authApp: Express;
let profileApp: Express;

beforeAll(async () => {
  const sessionApp = (await import('../../services/session/src/index')).default;
  sessionServer = sessionApp.listen(0);
  const sessionAddr = sessionServer.address();
  const sessionPort = sessionAddr && typeof sessionAddr === 'object' ? sessionAddr.port : 3004;
  process.env.SERVICE_SESSION_URL = `http://localhost:${sessionPort}`;

  authApp = (await import('../../services/auth/src/index')).default;
  profileApp = (await import('../../services/profile/src/index')).default;
});

afterAll(() => {
  sessionServer?.close();
});

describe.skipIf(!hasDb)('Profile Service', () => {
  let userId: string;
  let tenantId: string;
  let email: string;
  const displayName = 'Test User';

  beforeAll(async () => {
    const user = await registerUser(authApp, 'profile');
    userId = user.userId;
    tenantId = user.tenantId;
    email = user.email;
  });

  it('GET /profile should return the authenticated user profile', async () => {
    const res = await request(profileApp)
      .get('/profile')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }));

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(userId);
    expect(res.body.email).toBe(email);
    expect(res.body.displayName).toBe(displayName);
    expect(res.body.locale).toBe('en');
    expect(res.body.createdAt).toBeDefined();
    expect(res.body.updatedAt).toBeDefined();
  });

  it('GET /profile should reject requests without the internal secret', async () => {
    const res = await request(profileApp)
      .get('/profile')
      .set('x-authenticated-user-id', userId);

    expect(res.status).toBe(401);
  });

  it('GET /profile should reject missing identity headers', async () => {
    const res = await request(profileApp).get('/profile').set(withSecret());

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_token');
  });

  it('PUT /profile should update displayName', async () => {
    const res = await request(profileApp)
      .put('/profile')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }))
      .send({ displayName: 'Updated User' });

    expect(res.status).toBe(200);
    expect(res.body.displayName).toBe('Updated User');

    const getRes = await request(profileApp)
      .get('/profile')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }));
    expect(getRes.body.displayName).toBe('Updated User');
  });

  it('PUT /profile should update locale', async () => {
    const res = await request(profileApp)
      .put('/profile')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }))
      .send({ displayName: 'Test User', locale: 'de' });

    expect(res.status).toBe(200);
    expect(res.body.locale).toBe('de');
  });

  it('PUT /profile should update avatarUrl', async () => {
    const res = await request(profileApp)
      .put('/profile')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }))
      .send({ displayName: 'Test User', avatarUrl: 'https://example.com/avatar.png' });

    expect(res.status).toBe(200);
    expect(res.body.avatarUrl).toBe('https://example.com/avatar.png');
  });

  it('PUT /profile should reject requests without the internal secret', async () => {
    const res = await request(profileApp)
      .put('/profile')
      .set('x-authenticated-user-id', userId)
      .send({ displayName: 'Hacker' });

    expect(res.status).toBe(401);
  });

  it('PUT /profile should reject invalid displayName', async () => {
    const res = await request(profileApp)
      .put('/profile')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }))
      .send({ displayName: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_request');
  });

  it('PUT /profile should reject invalid locale', async () => {
    const res = await request(profileApp)
      .put('/profile')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }))
      .send({ displayName: 'Test User', locale: 'en-US' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_request');
  });

  it('PUT /profile should reject invalid avatarUrl', async () => {
    const res = await request(profileApp)
      .put('/profile')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }))
      .send({ displayName: 'Test User', avatarUrl: 'not-a-url' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_request');
  });

  it('GET /profile should return 404 for an unknown user', async () => {
    const res = await request(profileApp)
      .get('/profile')
      .set(withSecret({ 'x-authenticated-user-id': '00000000-0000-0000-0000-00000000ffff', 'x-tenant-id': tenantId }));

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not_found');
  });

  it('should return health status', async () => {
    const res = await request(profileApp).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('profile');
  });
});