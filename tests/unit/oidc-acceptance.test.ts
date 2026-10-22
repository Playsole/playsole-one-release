import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import crypto from 'node:crypto';
import { withSecret } from '../integration/helpers';

describe('OAuth 2.0 & OIDC Acceptance Conformance Suite (12 Gates)', () => {
  let authApp: Express;
  let gatewayApp: Express;

  beforeAll(async () => {
    process.env.OIDC_ISSUER = 'https://one.playsole.xyz';
    process.env.SERVICES_IN_PROCESS = 'true';
    const { registerInternalService } = await import('@playsole-one/shared');
    const sessionApp = (await import('../../services/session/src/index')).default;
    authApp = (await import('../../services/auth/src/index')).default;
    gatewayApp = (await import('../../gateway/src/index')).default;

    registerInternalService('session', sessionApp);
    registerInternalService('auth', authApp);
  });

  describe('P0 Gate 1: Discovery & Signing Keys', () => {
    it('TC-DISC-001: Discovery issuer matches canonical configured issuer exactly', async () => {
      const res = await request(authApp).get('/.well-known/openid-configuration');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
      expect(res.body.issuer).toBe('https://one.playsole.xyz');
      expect(res.body.authorization_endpoint).toBe('https://one.playsole.xyz/authorize');
      expect(res.body.token_endpoint).toBe('https://one.playsole.xyz/token');
      expect(res.body.jwks_uri).toBe('https://one.playsole.xyz/.well-known/jwks.json');
      expect(res.body.userinfo_endpoint).toBe('https://one.playsole.xyz/userinfo');
      expect(res.body.revocation_endpoint).toBe('https://one.playsole.xyz/revoke');
    });

    it('TC-DISC-002: JWKS contains only public keys with valid kid, never private exponents', async () => {
      const res = await request(authApp).get('/.well-known/jwks.json');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.keys)).toBe(true);
      expect(res.body.keys.length).toBeGreaterThan(0);

      for (const key of res.body.keys) {
        expect(key.kty).toBe('RSA');
        expect(key.use).toBe('sig');
        expect(key.kid).toBeDefined();
        expect(typeof key.kid).toBe('string');
        expect(key.n).toBeDefined();
        expect(key.e).toBeDefined();

        // Strict assertion: Private key parameters must NEVER be leaked
        expect(key.d).toBeUndefined();
        expect(key.p).toBeUndefined();
        expect(key.q).toBeUndefined();
        expect(key.dp).toBeUndefined();
        expect(key.dq).toBeUndefined();
        expect(key.qi).toBeUndefined();
      }
    });
  });

  describe('P0 Gate 2: Authorization Endpoint & Request Validation', () => {
    it('TC-AUTH-001: Unknown client ID is rejected without issuing codes', async () => {
      const res = await request(authApp)
        .get('/authorize')
        .set(withSecret())
        .query({
          client_id: 'unknown_client_xyz_99',
          redirect_uri: 'https://example.com/callback',
          response_type: 'code',
          code_challenge: 'E9Melhoa2OwvFrGMTJguCH5rtG6j30q_z78b',
          code_challenge_method: 'S256',
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('unauthorized_client');
    });

    it('TC-AUTH-002: Missing required authorization parameters fails closed', async () => {
      const res = await request(authApp).get('/authorize').set(withSecret()).query({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_request');
    });

    it('TC-AUTH-003: Unsupported response_type is rejected', async () => {
      const res = await request(authApp)
        .get('/authorize')
        .set(withSecret())
        .query({
          client_id: 'playsole-dev',
          redirect_uri: 'https://one.playsole.xyz/callback',
          response_type: 'token', // Implicit token grant not supported
          code_challenge: 'E9Melhoa2OwvFrGMTJguCH5rtG6j30q_z78b',
          code_challenge_method: 'S256',
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_request');
    });
  });

  describe('P0 Gate 3: PKCE Enforcement', () => {
    it('TC-PKCE-001: Discovery advertises S256 code challenge method', async () => {
      const res = await request(authApp).get('/.well-known/openid-configuration');
      expect(res.body.code_challenge_methods_supported).toContain('S256');
    });

    it('TC-PKCE-002: Missing code_verifier on token exchange fails closed', async () => {
      const res = await request(authApp)
        .post('/token')
        .type('form')
        .send({
          grant_type: 'authorization_code',
          code: 'nonexistent-code',
          redirect_uri: 'https://one.playsole.xyz/callback',
          client_id: 'playsole-dev',
          client_secret: 'some-secret',
        });
      expect(res.status).toBe(400);
    });

    it('TC-PKCE-004: Plain code challenge method is strictly rejected (S256 mandatory)', async () => {
      const res = await request(authApp)
        .get('/authorize')
        .set(withSecret())
        .query({
          client_id: 'playsole-dev',
          redirect_uri: 'https://one.playsole.xyz/callback',
          response_type: 'code',
          code_challenge: 'plain-challenge-string',
          code_challenge_method: 'plain',
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_request');
    });
  });

  describe('P0 Gate 5: Confidential Client Authentication & Secret Enforcement', () => {
    it('TC-CLIENT-001: Discovery advertises only client_secret_basic and client_secret_post (no none)', async () => {
      const res = await request(authApp).get('/.well-known/openid-configuration');
      expect(res.body.token_endpoint_auth_methods_supported).toEqual(['client_secret_basic', 'client_secret_post']);
      expect(res.body.token_endpoint_auth_methods_supported).not.toContain('none');
    });

    it('TC-CLIENT-002: Token exchange without client authentication fails closed', async () => {
      const res = await request(authApp)
        .post('/token')
        .type('form')
        .send({
          grant_type: 'authorization_code',
          code: 'dummy-code-123',
          redirect_uri: 'https://one.playsole.xyz/callback',
          client_id: 'playsole-dev',
          // No client_secret provided
        });
      expect([400, 401]).toContain(res.status);
    });
  });

  describe('P0 Gate 7: Revocation Endpoint Compliance (RFC 7009)', () => {
    it('TC-REFRESH-004: Revocation endpoint returns 200 even for invalid/revoked token', async () => {
      const res = await request(authApp)
        .post('/revoke')
        .send({ token: 'dummy-revocation-token-123' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
    });

    it('TC-REFRESH-004-REQ: Revocation endpoint rejects missing token payload with 400', async () => {
      const res = await request(authApp)
        .post('/revoke')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_request');
    });
  });

  describe('P0 Gate 8: UserInfo Endpoint Isolation', () => {
    it('TC-USER-001: Unauthenticated request to /userinfo is rejected with 401', async () => {
      const res = await request(authApp).get('/userinfo');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('invalid_token');
    });

    it('TC-USER-002: Malformed or forged Bearer token is rejected with 401', async () => {
      const res = await request(authApp)
        .get('/userinfo')
        .set('Authorization', 'Bearer forged.jwt.token');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('invalid_token');
    });
  });

  describe('P1 Gate 9: Error Handling & Zero Secret Disclosure', () => {
    it('TC-ERR-001: OAuth errors return structured JSON with RFC 6749 fields', async () => {
      const res = await request(authApp)
        .post('/token')
        .type('form')
        .send({ grant_type: 'invalid_grant_type' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('TC-ERR-002: Error responses do not leak private keys or stack traces', async () => {
      const res = await request(authApp)
        .post('/token')
        .type('json')
        .send({ malformed: true });

      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain('BEGIN RSA PRIVATE KEY');
      expect(bodyStr).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
      expect(bodyStr).not.toContain('node_modules');
    });
  });

  describe('P1 Gate 10: Web & Browser Security (CORS & Host Redirects)', () => {
    it('TC-WEB-001: Canonical host redirect redirects auth.playsole.xyz to one.playsole.xyz', async () => {
      const res = await request(gatewayApp)
        .get('/developers')
        .set('Host', 'auth.playsole.xyz');

      expect(res.status).toBe(301);
      expect(res.headers.location).toBe('https://one.playsole.xyz/developers');
    });

    it('TC-WEB-002: Canonical host redirect redirects playsole.xyz to one.playsole.xyz', async () => {
      const res = await request(gatewayApp)
        .get('/')
        .set('Host', 'playsole.xyz');

      expect(res.status).toBe(301);
      expect(res.headers.location).toBe('https://one.playsole.xyz/');
    });

    it('TC-WEB-003: Session cookies enforce HttpOnly and SameSite policy', async () => {
      const { sessionCookieOptions } = await import('../../gateway/src/cookies');
      const opts = sessionCookieOptions();
      expect(opts.httpOnly).toBe(true);
      expect(['lax', 'strict']).toContain(opts.sameSite);
      expect(opts.path).toBe('/');
    });
  });

  describe('P1 Gate 11: Operational Readiness & Health Probes', () => {
    it('TC-OPS-001: /health responds with 200 OK', async () => {
      const res = await request(gatewayApp).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('TC-OPS-002: /ready responds with 200 or 503 structured checks', async () => {
      const res = await request(gatewayApp).get('/ready');
      expect([200, 503]).toContain(res.status);
      expect(res.body.checks).toBeDefined();
    });

    it('TC-OPS-003: /status responds quickly and provides service metrics without timing out', async () => {
      const start = Date.now();
      const res = await request(gatewayApp)
        .get('/status')
        .set('Accept', 'application/json');

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(3000);
      expect([200, 503]).toContain(res.status);
      expect(res.body.checks).toBeDefined();
      expect(Array.isArray(res.body.checks)).toBe(true);
    });
  });
});
