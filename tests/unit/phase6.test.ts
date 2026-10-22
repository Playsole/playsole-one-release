import { describe, it, expect, vi } from 'vitest';
import { apiVersioningMiddleware, registerWebhook, listWebhooks, removeWebhook, dispatchWebhook } from '../../packages/shared/src';
import { renderDevelopersView } from '../../gateway/src/developersView';

describe('Phase 6 — Scale & Polish Tests', () => {
  describe('API Versioning & Deprecation Middleware (Item 54)', () => {
    it('should set X-API-Version header on responses', () => {
      const middleware = apiVersioningMiddleware({ version: '1.0' });
      const headers: Record<string, string> = {};
      const req: any = {};
      const res: any = {
        setHeader: (name: string, value: string) => {
          headers[name] = value;
        },
      };
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      middleware(req, res, next);
      expect(nextCalled).toBe(true);
      expect(headers['X-API-Version']).toBe('1.0');
      expect(headers['Deprecation']).toBeUndefined();
    });

    it('should attach RFC 8594 Sunset and Deprecation headers when configured', () => {
      const sunsetDate = '2027-01-01T00:00:00Z';
      const deprecationLink = 'https://docs.playsole.xyz/migration';
      const middleware = apiVersioningMiddleware({
        version: '1.0',
        deprecated: true,
        sunsetDate,
        deprecationLink,
      });

      const headers: Record<string, string> = {};
      const req: any = {};
      const res: any = {
        setHeader: (name: string, value: string) => {
          headers[name] = value;
        },
      };

      middleware(req, res, () => {});

      expect(headers['X-API-Version']).toBe('1.0');
      expect(headers['Deprecation']).toBeDefined();
      expect(headers['Sunset']).toContain('2027');
      expect(headers['Link']).toBe('<https://docs.playsole.xyz/migration>; rel="deprecation"');
    });
  });

  describe('Webhook System (Item 52)', () => {
    it('should register, list, and remove webhook subscriptions', () => {
      const sub = registerWebhook({
        endpointUrl: 'https://example.com/webhook',
        secret: 'super-secret-key',
        events: ['user.created', 'user.deleted'],
        active: true,
      });

      expect(sub.id).toBeDefined();
      expect(sub.endpointUrl).toBe('https://example.com/webhook');

      const all = listWebhooks();
      expect(all.some((s) => s.id === sub.id)).toBe(true);

      const removed = removeWebhook(sub.id);
      expect(removed).toBe(true);

      const after = listWebhooks();
      expect(after.some((s) => s.id === sub.id)).toBe(false);
    });

    it('should dispatch webhooks with HMAC-SHA256 signature', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({ status: 200 });
      global.fetch = fetchSpy as any;

      const sub = registerWebhook({
        endpointUrl: 'https://api.test/webhook',
        secret: 'webhook-signing-secret',
        events: ['user.created'],
        active: true,
      });

      await dispatchWebhook('user.created', { userId: 'usr-123', email: 'test@playsole.xyz' });

      expect(fetchSpy).toHaveBeenCalled();
      const call = fetchSpy.mock.calls[0];
      expect(call[0]).toBe('https://api.test/webhook');
      expect(call[1].headers['x-playsole-event']).toBe('user.created');
      expect(call[1].headers['x-playsole-signature']).toMatch(/^sha256=[a-f0-9]{64}$/);

      removeWebhook(sub.id);
    });
  });

  describe('Developer Documentation Portal (Item 55)', () => {
    it('should render the developer portal HTML with essential integration sections', () => {
      const html = renderDevelopersView();

      expect(html).toContain('Developer Integration Portal');
      expect(html).toContain('Authorization Code Flow with PKCE');
      expect(html).toContain('DPoP Token Binding');
      expect(html).toContain('Claims & User Identity');
      expect(html).toContain('Live Webhook Subscriptions');
      expect(html).toContain('API Versioning & Deprecation');
      expect(html).toContain('/.well-known/openid-configuration');
      expect(html).toContain('/.well-known/jwks.json');
    });
  });
});
