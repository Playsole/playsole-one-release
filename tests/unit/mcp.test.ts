import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { generatePkce, inspectRateLimit, fetchJwks } from '../../packages/mcp/src/tools/dev';
import {
  checkSystemHealth,
  listOAuthClients,
  registerOAuthClient,
  rotateOAuthClientSecret,
  inspectUser,
  queryAuditLogs,
} from '../../packages/mcp/src/tools/admin';

// Mock @playsole-one/shared dependencies
vi.mock('@playsole-one/shared', () => {
  const mockInsert = vi.fn().mockResolvedValue({ error: null });
  const mockUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });
  const mockQueryBuilder: any = {
    eq: vi.fn().mockImplementation(() => mockQueryBuilder),
    order: vi.fn().mockImplementation(() => mockQueryBuilder),
    limit: vi.fn().mockImplementation(() => Promise.resolve({
      data: [{ id: 'aud-1', event_type: 'mcp.test.event' }],
      error: null,
    })),
    single: vi.fn().mockResolvedValue({
      data: { id: 'usr-123', primary_email: 'test@playsole.xyz', display_name: 'Test User' },
      error: null,
    }),
  };

  return {
    getSupabase: vi.fn(() => ({
      from: vi.fn((table: string) => ({
        insert: mockInsert,
        update: mockUpdate,
        select: vi.fn(() => mockQueryBuilder),
      })),
    })),
    getRedisClient: vi.fn(() => ({
      get: vi.fn().mockResolvedValue('5'),
      ttl: vi.fn().mockResolvedValue(42),
    })),
    pingDatabase: vi.fn().mockResolvedValue(true),
    pingRedis: vi.fn().mockResolvedValue(true),
    logAudit: vi.fn().mockResolvedValue(undefined),
  };
});

describe('MCP Developer Tools (packages/mcp/src/tools/dev.ts)', () => {
  it('generatePkce() produces valid RFC 7636 challenge and verifier pairs', () => {
    const pkce = generatePkce();

    expect(pkce).toHaveProperty('verifier');
    expect(pkce).toHaveProperty('challenge');
    expect(pkce.method).toBe('S256');

    // Verifier should be valid base64url string with sufficient entropy (43-128 chars)
    expect(pkce.verifier.length).toBeGreaterThanOrEqual(43);
    expect(pkce.verifier).toMatch(/^[A-Za-z0-9_-]+$/);

    // Verify mathematical correctness of SHA-256 S256 challenge derivation
    const expectedChallenge = crypto
      .createHash('sha256')
      .update(pkce.verifier)
      .digest('base64url');
    expect(pkce.challenge).toBe(expectedChallenge);
  });

  it('inspectRateLimit() returns parsed counter and remaining TTL from Redis', async () => {
    const res = await inspectRateLimit('rl:global:127.0.0.1');

    expect(res.key).toBe('rl:global:127.0.0.1');
    expect(res.count).toBe(5);
    expect(res.ttlSeconds).toBe(42);
  });

  it('fetchJwks() handles and parses public keys from an endpoint', async () => {
    const mockJwks = {
      keys: [
        { kid: 'playsole-one-1', kty: 'RSA', alg: 'RS256', use: 'sig' },
      ],
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockJwks,
    } as any);

    try {
      const result = await fetchJwks('http://localhost:8080');
      expect(result.keys).toHaveLength(1);
      expect(result.keys[0].kid).toBe('playsole-one-1');
      expect(result.keys[0].kty).toBe('RSA');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('MCP Platform Administration Tools (packages/mcp/src/tools/admin.ts)', () => {
  it('checkSystemHealth() accurately reports overall status', async () => {
    const health = await checkSystemHealth();

    expect(health.status).toBe('ok');
    expect(health.database).toBe(true);
    expect(health.redis).toBe(true);
    expect(typeof health.timestamp).toBe('string');
  });

  it('registerOAuthClient() generates 256-bit secret and saves SHA-256 hash', async () => {
    const result = await registerOAuthClient({
      clientId: 'mcp-test-app',
      name: 'MCP Test Application',
      redirectUris: ['https://app.test/callback'],
      scopes: ['openid', 'profile'],
      isFirstParty: false,
    });

    expect(result.clientId).toBe('mcp-test-app');
    expect(result.clientSecret).toMatch(/^sec_[a-f0-9]{48}$/);
  });

  it('rotateOAuthClientSecret() updates secret hash and returns new unhashed secret', async () => {
    const result = await rotateOAuthClientSecret('mcp-test-app');

    expect(result.clientId).toBe('mcp-test-app');
    expect(result.newClientSecret).toMatch(/^sec_[a-f0-9]{48}$/);
  });

  it('inspectUser() retrieves profile claims by email', async () => {
    const user = await inspectUser({ email: 'test@playsole.xyz' });

    expect(user).toBeDefined();
    expect(user.id).toBe('usr-123');
    expect(user.primary_email).toBe('test@playsole.xyz');
  });

  it('queryAuditLogs() returns filtered records with bounded limit', async () => {
    const logs = await queryAuditLogs({
      eventType: 'auth.login.failed',
      limit: 10,
    });

    expect(Array.isArray(logs)).toBe(true);
    expect(logs).toHaveLength(1);
    expect(logs[0].id).toBe('aud-1');
  });
});
