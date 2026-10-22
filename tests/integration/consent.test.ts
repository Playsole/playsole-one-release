import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { hasDb, withSecret, registerUser } from './helpers';

let authApp: Express;
let consentApp: Express;
let userId: string;
let tenantId: string;
const clientId = 'playsole-dev';

beforeAll(async () => {
  authApp = (await import('../../services/auth/src/index')).default;
  consentApp = (await import('../../services/consent/src/index')).default;
});

describe.skipIf(!hasDb)('Consent Service', () => {
  beforeAll(async () => {
    const user = await registerUser(authApp, 'consent');
    userId = user.userId;
    tenantId = user.tenantId;

    const existing = await request(consentApp)
      .get('/consent')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }));
    for (const grant of existing.body) {
      await request(consentApp)
        .delete(`/consent/${grant.id}`)
        .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }));
    }
  });

  it('GET /consent should return empty list initially', async () => {
    const res = await request(consentApp)
      .get('/consent')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST /consent should require tenant context', async () => {
    const res = await request(consentApp)
      .post('/consent')
      .set(withSecret({ 'x-authenticated-user-id': userId }))
      .send({ clientId, scopes: ['openid', 'profile', 'email'] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_request');
  });

  it('POST /consent should create a consent grant', async () => {
    const res = await request(consentApp)
      .post('/consent')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }))
      .send({ clientId, scopes: ['openid', 'profile', 'email'] });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.userId).toBe(userId);
    expect(res.body.clientId).toBe(clientId);
    expect(res.body.scopes).toEqual(['openid', 'profile', 'email']);
    expect(res.body.grantedAt).toBeDefined();
    expect(res.body.revokedAt).toBeUndefined();
  });

  it('POST /consent should reject duplicate grants', async () => {
    const res = await request(consentApp)
      .post('/consent')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }))
      .send({ clientId, scopes: ['openid'] });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('duplicate_grant');
  });

  it('GET /consent should list user grants', async () => {
    const res = await request(consentApp)
      .get('/consent')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].clientId).toBe(clientId);
  });

  it('GET /consent/check should return granted=true for matching scopes', async () => {
    const res = await request(consentApp)
      .get('/consent/check')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }))
      .query({ client_id: clientId, scope: 'openid profile' });

    expect(res.status).toBe(200);
    expect(res.body.granted).toBe(true);
  });

  it('GET /consent/check should return granted=false for unknown client', async () => {
    const res = await request(consentApp)
      .get('/consent/check')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }))
      .query({ client_id: 'unknown-client', scope: 'openid' });

    expect(res.status).toBe(200);
    expect(res.body.granted).toBe(false);
  });

  it('GET /consent/check should detect missing scopes', async () => {
    const res = await request(consentApp)
      .get('/consent/check')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }))
      .query({ client_id: clientId, scope: 'openid admin' });

    expect(res.status).toBe(200);
    expect(res.body.granted).toBe(false);
    expect(res.body.missingScopes).toContain('admin');
  });

  it('GET /consent/check should require client_id', async () => {
    const res = await request(consentApp)
      .get('/consent/check')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_request');
  });

  it('GET /consent/:id should return a grant by id', async () => {
    const listRes = await request(consentApp)
      .get('/consent')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }));
    const grantId = listRes.body[0].id;

    const res = await request(consentApp)
      .get(`/consent/${grantId}`)
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(grantId);
  });

  it('GET /consent/:id should 404 for unknown id', async () => {
    const res = await request(consentApp)
      .get('/consent/unknown-id')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }));

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not_found');
  });

  it('DELETE /consent/:id should revoke a grant', async () => {
    const listRes = await request(consentApp)
      .get('/consent')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }));
    const grantId = listRes.body[0].id;

    const delRes = await request(consentApp)
      .delete(`/consent/${grantId}`)
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }));

    expect(delRes.status).toBe(204);

    const checkRes = await request(consentApp)
      .get('/consent')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }));
    expect(checkRes.body).toHaveLength(0);
  });

  it('DELETE /consent/:id should 404 for unknown id', async () => {
    const res = await request(consentApp)
      .delete('/consent/unknown-id')
      .set(withSecret({ 'x-authenticated-user-id': userId, 'x-tenant-id': tenantId }));

    expect(res.status).toBe(404);
  });

  it('should reject unauthenticated requests', async () => {
    const res = await request(consentApp).get('/consent');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorized');
  });

  it('should return health status', async () => {
    const res = await request(consentApp).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('consent');
  });
});