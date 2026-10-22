import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import type { Server } from 'node:http';
import type { Express } from 'express';
import { hasDb, withSecret, registerUser, obtainCode } from './helpers';

let sessionServer: Server;
let authApp: Express;

beforeAll(async () => {
  const sessionApp = (await import('../../services/session/src/index')).default;
  sessionServer = sessionApp.listen(0);
  const address = sessionServer.address();
  const sessionPort = address && typeof address === 'object' ? address.port : 3004;

  process.env.SERVICE_SESSION_URL = `http://localhost:${sessionPort}`;
  process.env.OIDC_ISSUER = 'http://localhost:8080';
  process.env.ACCESS_TOKEN_TTL_SEC = '3600';

  authApp = (await import('../../services/auth/src/index')).default;
});

afterAll(() => {
  sessionServer?.close();
});

describe('OIDC Discovery', () => {
  it('should return the OpenID Connect discovery document', async () => {
    const res = await request(authApp).get('/.well-known/openid-configuration');

    expect(res.status).toBe(200);
    expect(res.body.issuer).toBe('http://localhost:8080');
    expect(res.body.authorization_endpoint).toBe('http://localhost:8080/authorize');
    expect(res.body.token_endpoint).toBe('http://localhost:8080/token');
    expect(res.body.revocation_endpoint).toBe('http://localhost:8080/revoke');
    expect(res.body.userinfo_endpoint).toBe('http://localhost:8080/userinfo');
    expect(res.body.jwks_uri).toBe('http://localhost:8080/.well-known/jwks.json');
    expect(res.body.response_types_supported).toContain('code');
    expect(res.body.grant_types_supported).toContain('authorization_code');
    expect(res.body.grant_types_supported).toContain('refresh_token');
    expect(res.body.code_challenge_methods_supported).toContain('S256');
    expect(res.body.subject_types_supported).toContain('public');
    expect(res.body.id_token_signing_alg_values_supported).toContain('RS256');
    expect(res.body.token_endpoint_auth_methods_supported).toEqual(['client_secret_basic', 'client_secret_post']);
    expect(res.body.token_endpoint_auth_methods_supported).not.toContain('none');
  });
});

describe('JWKS', () => {
  it('should return a valid JWKS with an RSA public key', async () => {
    const res = await request(authApp).get('/.well-known/jwks.json');

    expect(res.status).toBe(200);
    expect(res.body.keys).toHaveLength(1);
    expect(res.body.keys[0].kty).toBe('RSA');
    expect(res.body.keys[0].alg).toBe('RS256');
    expect(res.body.keys[0].kid).toBe('playsole-one-1');
    expect(res.body.keys[0].use).toBe('sig');
    expect(res.body.keys[0].n).toBeDefined();
    expect(res.body.keys[0].e).toBeDefined();
  });
});

describe.skipIf(!hasDb)('User Registration API', () => {
  const testUser = {
    name: 'Test User',
    email: `test-${Date.now()}@playsole.xyz`,
    password: 'test-password-123',
  };

  it('should register a new user', async () => {
    const res = await request(authApp).post('/api/register').set(withSecret()).send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.userId).toBeDefined();
    expect(res.body.email).toBe(testUser.email);
    expect(res.body.displayName).toBe(testUser.name);
  });

  it('should reject duplicate email registration', async () => {
    const res = await request(authApp).post('/api/register').set(withSecret()).send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('duplicate_email');
  });

  it('should reject registration with empty fields', async () => {
    const res = await request(authApp).post('/api/register').set(withSecret()).send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_request');
  });

  it('should reject registration with short password', async () => {
    const res = await request(authApp)
      .post('/api/register')
      .set(withSecret())
      .send({ name: 'Short', email: 'short@test.com', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_request');
    expect(res.body.error_description).toContain('8 characters');
  });
});

describe.skipIf(!hasDb)('User Login API', () => {
  const email = `login-${Date.now()}@playsole.xyz`;
  const password = 'password';

  beforeAll(async () => {
    await request(authApp)
      .post('/api/register')
      .set(withSecret())
      .send({ name: 'Test User', email, password });
  });

  it('should login with valid credentials', async () => {
    const res = await request(authApp)
      .post('/api/login').set(withSecret()).send({ email, password });

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(email);
    expect(res.body.displayName).toBe('Test User');
  });

  it('should reject login with wrong password', async () => {
    const res = await request(authApp)
      .post('/api/login').set(withSecret()).send({ email, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_credentials');
  });

  it('should reject login with unknown email', async () => {
    const res = await request(authApp)
      .post('/api/login').set(withSecret()).send({ email: 'unknown@test.com', password: 'password' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_credentials');
  });

  it('should reject login with empty fields', async () => {
    const res = await request(authApp).post('/api/login').set(withSecret()).send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_request');
  });
});

describe.skipIf(!hasDb)('Full OIDC Authorization Code Flow with PKCE', () => {
  const clientId = 'playsole-dev';
  const redirectUri = 'http://localhost:5173/callback';
  const state = crypto.randomUUID();
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  let userId: string;
  let tenantId: string;
  let authCode: string;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const regRes = await request(authApp)
      .post('/api/register')
      .set(withSecret())
      .send({ name: 'PKCE User', email: `pkce-${Date.now()}@playsole.xyz`, password: 'password-123' });
    userId = regRes.body.userId;
    tenantId = regRes.body.tenantId;
  });

  it('should reject authorize without authentication', async () => {
    const res = await request(authApp)
      .get('/authorize').set(withSecret())
      .query({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        scope: 'openid profile email',
        state,
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthenticated');
  });

  it('should authorize with valid PKCE params and return an auth code', async () => {
    const res = await request(authApp)
      .get('/authorize').set(withSecret())
      .query({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        scope: 'openid profile email',
        state,
      })
      .set('x-authenticated-user-id', userId)
      .set('x-tenant-id', tenantId);

    expect(res.status).toBe(302);
    const location = res.headers.location as string;
    expect(location).toContain(redirectUri);
    expect(location).toContain('code=');
    expect(location).toContain(`state=${state}`);

    authCode = new URL(location).searchParams.get('code')!;
    expect(authCode).toBeTruthy();
  });

  it('should exchange auth code for tokens', async () => {
    const res = await request(authApp)
      .post('/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code: authCode,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
        client_id: clientId,
      });

    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeTruthy();
    expect(res.body.token_type).toBe('Bearer');
    expect(res.body.expires_in).toBe(3600);
    expect(res.body.refresh_token).toBeTruthy();
    expect(res.body.id_token).toBeTruthy();
    expect(res.body.scope).toBe('openid profile email');

    accessToken = res.body.access_token;
    refreshToken = res.body.refresh_token;
  });

  it('should reject reusing the same auth code', async () => {
    const res = await request(authApp)
      .post('/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code: authCode,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
        client_id: clientId,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_grant');
    expect(res.body.error_description).toContain('expired or invalid');
  });

  it('should return user info with a valid access token', async () => {
    const res = await request(authApp)
      .get('/userinfo')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.sub).toBe(userId);
  });

  it('should reject userinfo without authorization', async () => {
    const res = await request(authApp).get('/userinfo');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_token');
  });

  it('should reject userinfo with a bogus token', async () => {
    const res = await request(authApp)
      .get('/userinfo')
      .set('Authorization', 'Bearer bogus-token');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_token');
  });
});

describe.skipIf(!hasDb)('Token Refresh with Rotation', () => {
  const clientId = 'playsole-dev';
  let firstRefreshToken: string;
  let secondRefreshToken: string;

  beforeAll(async () => {
    const { userId, tenantId } = await registerUser(authApp, 'refresh');
    const { code, codeVerifier } = await obtainCode(authApp, userId, tenantId);

    const tokenRes = await request(authApp)
      .post('/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        code_verifier: codeVerifier,
        redirect_uri: 'http://localhost:5173/callback',
        client_id: clientId,
      });

    firstRefreshToken = tokenRes.body.refresh_token;
  });

  it('should rotate refresh token on use', async () => {
    const res = await request(authApp)
      .post('/token')
      .type('form')
      .send({
        grant_type: 'refresh_token',
        refresh_token: firstRefreshToken,
        client_id: clientId,
      });

    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeTruthy();
    expect(res.body.refresh_token).toBeTruthy();
    expect(res.body.refresh_token).not.toBe(firstRefreshToken);

    secondRefreshToken = res.body.refresh_token;
  });

  it('should reject the old refresh token after rotation', async () => {
    const res = await request(authApp)
      .post('/token')
      .type('form')
      .send({
        grant_type: 'refresh_token',
        refresh_token: firstRefreshToken,
        client_id: clientId,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_grant');
  });

  it('should accept the new refresh token', async () => {
    const res = await request(authApp)
      .post('/token')
      .type('form')
      .send({
        grant_type: 'refresh_token',
        refresh_token: secondRefreshToken,
        client_id: clientId,
      });

    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeTruthy();
    expect(res.body.refresh_token).not.toBe(secondRefreshToken);
  });
});

describe.skipIf(!hasDb)('Token Revocation', () => {
  const clientId = 'playsole-dev';
  let refreshToken: string;

  beforeAll(async () => {
    const { userId, tenantId } = await registerUser(authApp, 'revoke');
    const { code, codeVerifier } = await obtainCode(authApp, userId, tenantId);

    const tokenRes = await request(authApp)
      .post('/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        code_verifier: codeVerifier,
        redirect_uri: 'http://localhost:5173/callback',
        client_id: clientId,
      });

    refreshToken = tokenRes.body.refresh_token;
  });

  it('should revoke a refresh token', async () => {
    const res = await request(authApp)
      .post('/revoke')
      .send({ token: refreshToken });

    expect(res.status).toBe(200);
  });

  it('should reject using a revoked refresh token', async () => {
    const res = await request(authApp)
      .post('/token')
      .type('form')
      .send({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_grant');
  });
});

describe.skipIf(!hasDb)('Validation and Error Cases', () => {
  let userId: string;
  let tenantId: string;

  beforeAll(async () => {
    const user = await registerUser(authApp, 'validate');
    userId = user.userId;
    tenantId = user.tenantId;
  });

  it('should reject authorize with missing response_type', async () => {
    const res = await request(authApp)
      .get('/authorize').set(withSecret())
      .query({ client_id: 'playsole-dev' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_request');
  });

  it('should reject authorize with wrong response_type', async () => {
    const res = await request(authApp)
      .get('/authorize').set(withSecret())
      .query({
        response_type: 'token',
        client_id: 'playsole-dev',
        redirect_uri: 'http://localhost:5173/callback',
        code_challenge: 'abc123',
        code_challenge_method: 'S256',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_request');
  });

  it('should reject authorize with unknown client_id', async () => {
    const res = await request(authApp)
      .get('/authorize').set(withSecret())
      .query({
        response_type: 'code',
        client_id: 'unknown-client',
        redirect_uri: 'http://localhost:5173/callback',
        code_challenge: 'abc123',
        code_challenge_method: 'S256',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('unauthorized_client');
  });

  it('should reject authorize with invalid redirect_uri', async () => {
    const res = await request(authApp)
      .get('/authorize').set(withSecret())
      .query({
        response_type: 'code',
        client_id: 'playsole-dev',
        redirect_uri: 'http://evil.com/callback',
        code_challenge: 'abc123',
        code_challenge_method: 'S256',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_request');
    expect(res.body.error_description).toContain('redirect_uri');
  });

  it('should reject token exchange with wrong client_id', async () => {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');

    const authRes = await request(authApp)
      .get('/authorize').set(withSecret())
      .query({
        response_type: 'code',
        client_id: 'playsole-dev',
        redirect_uri: 'http://localhost:5173/callback',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        scope: 'openid',
      })
      .set('x-authenticated-user-id', userId)
      .set('x-tenant-id', tenantId);

    const code = new URL(authRes.headers.location as string).searchParams.get('code')!;

    const res = await request(authApp)
      .post('/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        code_verifier: verifier,
        redirect_uri: 'http://localhost:5173/callback',
        client_id: 'wrong-client',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('unauthorized_client');
  });

  it('should reject token exchange with wrong PKCE verifier', async () => {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');

    const authRes = await request(authApp)
      .get('/authorize').set(withSecret())
      .query({
        response_type: 'code',
        client_id: 'playsole-dev',
        redirect_uri: 'http://localhost:5173/callback',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        scope: 'openid',
      })
      .set('x-authenticated-user-id', userId)
      .set('x-tenant-id', tenantId);

    const code = new URL(authRes.headers.location as string).searchParams.get('code')!;

    const res = await request(authApp)
      .post('/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        code_verifier: 'wrong-verifier',
        redirect_uri: 'http://localhost:5173/callback',
        client_id: 'playsole-dev',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_grant');
    expect(res.body.error_description).toContain('PKCE');
  });

  it('should reject unsupported grant_type', async () => {
    const res = await request(authApp)
      .post('/token')
      .type('form')
      .send({ grant_type: 'client_credentials' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('unsupported_grant_type');
  });

  it('should reject token refresh with missing refresh_token', async () => {
    const res = await request(authApp)
      .post('/token')
      .type('form')
      .send({
        grant_type: 'refresh_token',
        client_id: 'playsole-dev',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_request');
  });
});
