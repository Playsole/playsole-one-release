import { Request, Response, NextFunction } from 'express';

interface RequestMetric {
  path: string;
  method: string;
  status: number;
  durationMs: number;
  timestamp: number;
}

class MetricsCollector {
  private requests: RequestMetric[] = [];
  private maxStoredRequests = 5000;

  // Counters
  private loginSuccessCount = 0;
  private loginFailureCount = 0;

  public recordRequest(method: string, path: string, status: number, durationMs: number): void {
    const metric: RequestMetric = {
      method,
      path: this.normalizePath(path),
      status,
      durationMs,
      timestamp: Date.now(),
    };

    this.requests.push(metric);
    if (this.requests.length > this.maxStoredRequests) {
      this.requests.shift();
    }
  }

  public recordLoginSuccess(): void {
    this.loginSuccessCount++;
  }

  public recordLoginFailure(): void {
    this.loginFailureCount++;
  }

  private normalizePath(path: string): string {
    // Group parameterized IDs into placeholder to avoid cardinality explosion
    return path
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      .replace(/\/sessions\/[a-zA-Z0-9_-]+/g, '/sessions/:id')
      .split('?')[0];
  }

  public getSummary() {
    const now = Date.now();
    const windowMs = 5 * 60 * 1000; // 5 min window
    const recent = this.requests.filter((r) => now - r.timestamp <= windowMs);

    const durations = recent.map((r) => r.durationMs).sort((a, b) => a - b);
    const count = durations.length;

    const p50 = count > 0 ? durations[Math.floor(count * 0.5)] : 0;
    const p95 = count > 0 ? durations[Math.floor(count * 0.95)] : 0;
    const p99 = count > 0 ? durations[Math.floor(count * 0.99)] : 0;

    const errorCount = recent.filter((r) => r.status >= 500).length;
    const errorRate = count > 0 ? Number((errorCount / count).toFixed(4)) : 0;

    const totalLogins = this.loginSuccessCount + this.loginFailureCount;
    const loginFailureRate = totalLogins > 0 ? Number((this.loginFailureCount / totalLogins).toFixed(4)) : 0;

    return {
      windowSeconds: 300,
      totalRequestsWindow: count,
      p50DurationMs: p50,
      p95DurationMs: p95,
      p99DurationMs: p99,
      errorRate,
      loginSuccessTotal: this.loginSuccessCount,
      loginFailureTotal: this.loginFailureCount,
      loginFailureRate,
      alerts: {
        highErrorRate: errorRate > 0.05,
        highLoginFailureRate: loginFailureRate > 0.2,
        highP99Latency: p99 > 1000,
      },
    };
  }

  public toPrometheusFormat(): string {
    const summary = this.getSummary();
    const lines = [
      '# HELP playsole_requests_total Total HTTP requests recorded in window',
      '# TYPE playsole_requests_total counter',
      `playsole_requests_total ${summary.totalRequestsWindow}`,
      '',
      '# HELP playsole_http_duration_p50_ms 50th percentile latency in milliseconds',
      '# TYPE playsole_http_duration_p50_ms gauge',
      `playsole_http_duration_p50_ms ${summary.p50DurationMs}`,
      '',
      '# HELP playsole_http_duration_p95_ms 95th percentile latency in milliseconds',
      '# TYPE playsole_http_duration_p95_ms gauge',
      `playsole_http_duration_p95_ms ${summary.p95DurationMs}`,
      '',
      '# HELP playsole_http_duration_p99_ms 99th percentile latency in milliseconds',
      '# TYPE playsole_http_duration_p99_ms gauge',
      `playsole_http_duration_p99_ms ${summary.p99DurationMs}`,
      '',
      '# HELP playsole_login_attempts_total Total logins by outcome',
      '# TYPE playsole_login_attempts_total counter',
      `playsole_login_attempts_total{status="success"} ${summary.loginSuccessTotal}`,
      `playsole_login_attempts_total{status="failure"} ${summary.loginFailureTotal}`,
      '',
      '# HELP playsole_error_rate Ratio of 5xx responses in window',
      '# TYPE playsole_error_rate gauge',
      `playsole_error_rate ${summary.errorRate}`,
      '',
    ];
    return lines.join('\n');
  }
}

export const metrics = new MetricsCollector();

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.recordRequest(req.method, req.path, res.statusCode, duration);
  });
  next();
}
