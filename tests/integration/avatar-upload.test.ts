import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { hasDb, registerUser, createSession } from './helpers';
import { getSupabase, registerInternalService } from '@playsole-one/shared';

let sessionApp: Express;
let authApp: Express;
let profileApp: Express;
let consentApp: Express;
let securityApp: Express;
let gatewayApp: Express;

beforeAll(async () => {
  sessionApp = (await import('../../services/session/src/index')).default;
  authApp = (await import('../../services/auth/src/index')).default;
  profileApp = (await import('../../services/profile/src/index')).default;
  consentApp = (await import('../../services/consent/src/index')).default;
  securityApp = (await import('../../services/security/src/index')).default;

  registerInternalService('auth', authApp);
  registerInternalService('session', sessionApp);
  registerInternalService('profile', profileApp);
  registerInternalService('consent', consentApp);
  registerInternalService('security', securityApp);
  process.env.SERVICES_IN_PROCESS = 'true';

  gatewayApp = (await import('../../gateway/src/index')).default;
});

describe.skipIf(!hasDb)('Avatar Upload & CDN Flow', () => {
  let cookie: string;
  let userId: string;
  let tenantId: string;

  beforeAll(async () => {
    const user = await registerUser(authApp, 'avatar-test');
    userId = user.userId;
    tenantId = user.tenantId;
    const { cookie: c } = await createSession(sessionApp, user.userId, user.tenantId);
    cookie = c;
  });

  it('POST /profile/avatar should reject unauthenticated requests', async () => {
    const res = await request(gatewayApp)
      .post('/profile/avatar')
      .attach('avatar', Buffer.from('test'), 'test.png');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthenticated');
  });

  it('POST /profile/avatar should reject missing file', async () => {
    const res = await request(gatewayApp)
      .post('/profile/avatar')
      .set('Cookie', cookie);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('no_file');
  });

  it('POST /profile/avatar should reject non-image files', async () => {
    const res = await request(gatewayApp)
      .post('/profile/avatar')
      .set('Cookie', cookie)
      .attach('avatar', Buffer.from('console.log("hello");'), { filename: 'script.js', contentType: 'application/javascript' });

    expect(res.status).toBe(400);
    expect(res.body.error_description).toContain('Only image files');
  });

  it('POST /profile/avatar should upload avatar image, update profile & user record', async () => {
    const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

    const res = await request(gatewayApp)
      .post('/profile/avatar')
      .set('Cookie', cookie)
      .attach('avatar', imageBuffer, 'avatar.png');

    expect(res.status).toBe(200);
    expect(res.body.avatarUrl).toBeDefined();
    expect(res.body.avatarUrl).toMatch(/^https:\/\/res\.cloudinary\.com\//);

    // Verify GET /avatar/:userId redirects to uploaded avatar URL
    const avatarEndpointRes = await request(gatewayApp)
      .get(`/avatar/${userId}`);
    expect(avatarEndpointRes.status).toBe(302);
    expect(avatarEndpointRes.headers.location).toBe(res.body.avatarUrl);

    // Verify users table also has avatar_url updated
    const { data: userRow } = await getSupabase()
      .from('users')
      .select('avatar_url')
      .eq('id', userId)
      .single();
    expect(userRow?.avatar_url).toBe(res.body.avatarUrl);

    // Verify profiles table has avatar_url updated
    const { data: profileRow } = await getSupabase()
      .from('profiles')
      .select('avatar_url')
      .eq('user_id', userId)
      .single();
    expect(profileRow?.avatar_url).toBe(res.body.avatarUrl);
  }, 35000);
});
