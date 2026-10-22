import { describe, it, expect } from 'vitest';
import { metrics, parseTraceparent, generateTraceparent, traceHeaders } from '@playsole-one/shared';

describe('Phase 5 Operations — Metrics & Tracing', () => {
  it('records requests and computes latency percentiles and error rates (Item 44)', () => {
    metrics.recordRequest('GET', '/test', 200, 20);
    metrics.recordRequest('GET', '/test', 200, 40);
    metrics.recordRequest('GET', '/test', 200, 60);
    metrics.recordRequest('POST', '/login', 200, 100);
    metrics.recordRequest('GET', '/error', 500, 150);

    metrics.recordLoginSuccess();
    metrics.recordLoginFailure();

    const summary = metrics.getSummary();
    expect(summary.totalRequestsWindow).toBeGreaterThanOrEqual(5);
    expect(summary.p50DurationMs).toBeGreaterThan(0);
    expect(summary.p95DurationMs).toBeGreaterThan(0);
    expect(summary.loginSuccessTotal).toBeGreaterThanOrEqual(1);
    expect(summary.loginFailureTotal).toBeGreaterThanOrEqual(1);
    expect(summary.loginFailureRate).toBeGreaterThan(0);

    const prom = metrics.toPrometheusFormat();
    expect(prom).toContain('playsole_requests_total');
    expect(prom).toContain('playsole_http_duration_p50_ms');
    expect(prom).toContain('playsole_login_attempts_total{status="success"}');
  });

  it('parses and generates valid W3C traceparent headers (Item 45)', () => {
    const { header, context } = generateTraceparent();
    expect(header).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    expect(context.sampled).toBe(true);

    const parsed = parseTraceparent(header);
    expect(parsed).not.toBeNull();
    expect(parsed!.traceId).toBe(context.traceId);
    expect(parsed!.spanId).toBe(context.spanId);
  });

  it('propagates tracing headers across internal service requests (Item 45)', () => {
    const mockReq: any = {
      traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      headers: {
        'x-request-id': 'req-test-12345',
      },
    };

    const forwarded = traceHeaders(mockReq, { 'Content-Type': 'application/json' });
    expect(forwarded['traceparent']).toBe('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');
    expect(forwarded['x-request-id']).toBe('req-test-12345');
    expect(forwarded['Content-Type']).toBe('application/json');
  });
});
