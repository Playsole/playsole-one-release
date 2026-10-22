import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Server } from 'node:http';
import type { Express } from 'express';
import { hasDb, withSecret, registerUser } from './helpers';

let sessionServer: Server;
let sessionPort: number;
let authApp: Express;

beforeAll(async () => {
  const sessionApp = (await import('../../services/session/src/index')).default;
  sessionServer = sessionApp.listen(0);
  const addr = sessionServer.address();
  sessionPort = addr && typeof addr === 'object' ? addr.port : 3004;
  process.env.SERVICE_SESSION_URL = `http://localhost:${sessionPort}`;

  authApp = (await import('../../services/auth/src/index')).default;
});

afterAll(() => {
  sessionServer?.close();
});

describe.skipIf(!hasDb)('Email Verification', () => {
  let userId: string;
  let email: string;
  let token: string;

  beforeAll(async () => {
    const user = await registerUser(authApp, 'verify');
    userId = user.userId;
    email = user.email;
  });

  it('POST /api/verify/email should reject requests without the internal secret', async () => {
    const res = await request(authApp)
      .post('/api/verify/email')
      .send({ email });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorized');
  });

  it('POST /api/verify/email should generate a verification token', async () => {
    const res = await request(authApp)
      .post('/api/verify/email')
      .set(withSecret({ 'x-authenticated-user-id': userId }))
      .send({ email });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Verification email sent');
    expect(res.body.token).toBeDefined();
    expect(res.body.expiresIn).toBe(600);
    token = res.body.token;
  });

  it('POST /api/verify/email should reject wrong email', async () => {
    const res = await request(authApp)
      .post('/api/verify/email')
      .set(withSecret({ 'x-authenticated-user-id': userId }))
      .send({ email: 'wrong@test.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_request');
  });

  it('POST /api/verify/email/confirm should verify with valid token', async () => {
    const res = await request(authApp)
      .post('/api/verify/email/confirm')
      .set(withSecret({ 'x-authenticated-user-id': userId }))
      .send({ token });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Email verified');
  });

  it('POST /api/verify/email should reject already verified email', async () => {
    const res = await request(authApp)
      .post('/api/verify/email')
      .set(withSecret({ 'x-authenticated-user-id': userId }))
      .send({ email });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('already_verified');
  });

  it('POST /api/verify/email/confirm should reject invalid token', async () => {
    const res = await request(authApp)
      .post('/api/verify/email/confirm')
      .set(withSecret({ 'x-authenticated-user-id': userId }))
      .send({ token: 'bogus-token' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_grant');
  });

  it('POST /api/verify/email/confirm should reject reused token', async () => {
    const res = await request(authApp)
      .post('/api/verify/email/confirm')
      .set(withSecret({ 'x-authenticated-user-id': userId }))
      .send({ token });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_grant');
  });
});

describe.skipIf(!hasDb)('Phone Verification', () => {
  let phoneUserId: string;
  let phoneToken: string;
  const phone = '+1234567890';

  beforeAll(async () => {
    const user = await registerUser(authApp, 'phone');
    phoneUserId = user.userId;
  });

  it('POST /api/verify/phone should reject requests without the internal secret', async () => {
    const res = await request(authApp)
      .post('/api/verify/phone')
      .send({ phone });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorized');
  });

  it('POST /api/verify/phone should generate a verification token', async () => {
    const res = await request(authApp)
      .post('/api/verify/phone')
      .set(withSecret({ 'x-authenticated-user-id': phoneUserId }))
      .send({ phone });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    phoneToken = res.body.token;
  });

  it('POST /api/verify/phone/confirm should verify phone with valid token', async () => {
    const res = await request(authApp)
      .post('/api/verify/phone/confirm')
      .set(withSecret({ 'x-authenticated-user-id': phoneUserId }))
      .send({ token: phoneToken });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Phone verified');
  });

  it('POST /api/verify/phone/confirm should reject invalid token', async () => {
    const res = await request(authApp)
      .post('/api/verify/phone/confirm')
      .set(withSecret({ 'x-authenticated-user-id': phoneUserId }))
      .send({ token: 'bogus' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_grant');
  });
});