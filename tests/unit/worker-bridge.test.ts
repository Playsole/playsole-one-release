import { describe, it, expect } from 'vitest';
import gatewayApp from '@playsole-one/gateway';
import { dispatchToExpress } from '@playsole-one/shared';
import worker from '../../worker/src/index';

describe('Cloudflare Worker & Express Bridge', () => {
  it('dispatches GET /health to gatewayApp and receives 200 JSON', async () => {
    const res = await dispatchToExpress(gatewayApp, 'http://localhost/health');
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.status).toBe('ok');
    expect(data.service).toBe('gateway');
  });

  it('dispatches GET / to gatewayApp and receives HTML landing page', async () => {
    const res = await dispatchToExpress(gatewayApp, 'http://localhost/');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Playsole');
  });

  it('dispatches GET /metrics to gatewayApp and receives Prometheus metrics', async () => {
    const res = await dispatchToExpress(gatewayApp, 'http://localhost/metrics');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('# HELP');
  });

  it('dispatches requests through worker.fetch entrypoint', async () => {
    const req = new Request('http://localhost/health', { method: 'GET' });
    const mockCtx = { waitUntil: () => {}, passThroughOnException: () => {} } as any;
    const res = await worker.fetch(req, {}, mockCtx);
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.status).toBe('ok');
  });

  it('handles 404 for unknown routes through worker.fetch', async () => {
    const req = new Request('http://localhost/non-existent-route-xyz', { method: 'GET' });
    const mockCtx = { waitUntil: () => {}, passThroughOnException: () => {} } as any;
    const res = await worker.fetch(req, {}, mockCtx);
    expect(res.status).toBe(404);
  });
});
