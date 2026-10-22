/**
 * Playsole One — Load Testing & Capacity Planning Script (Item 57)
 *
 * Simulates concurrent traffic across key endpoints (health, discovery,
 * developer portal, metrics, and API) to evaluate throughput, error rates,
 * and P50/P95/P99 latency distribution.
 *
 * Usage:
 *   npx tsx scripts/load-test.ts [target_url] [concurrency] [duration_sec]
 * Example:
 *   npx tsx scripts/load-test.ts http://localhost:8080 20 10
 */

import http from 'node:http';
import https from 'node:https';

const TARGET_URL = process.argv[2] || process.env.TARGET_URL || 'http://localhost:8080';
const CONCURRENCY = parseInt(process.argv[3] || '10', 10);
const DURATION_SECONDS = parseInt(process.argv[4] || '5', 10);

const ENDPOINTS = [
  '/.well-known/openid-configuration',
  '/.well-known/jwks.json',
  '/developers',
  '/health/ready',
  '/metrics',
];

interface LoadTestStats {
  totalRequests: number;
  successCount: number;
  failCount: number;
  latencies: number[];
}

const stats: LoadTestStats = {
  totalRequests: 0,
  successCount: 0,
  failCount: 0,
  latencies: [],
};

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1);
  return sorted[index];
}

async function makeRequest(url: string): Promise<{ success: boolean; durationMs: number; status: number }> {
  const start = performance.now();
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const isHttps = parsed.protocol === 'https:';
      const client = isHttps ? https : http;

      const req = client.get(url, { timeout: 5000 }, (res) => {
        res.on('data', () => {});
        res.on('end', () => {
          const duration = performance.now() - start;
          resolve({
            success: (res.statusCode ?? 500) < 400,
            durationMs: duration,
            status: res.statusCode ?? 500,
          });
        });
      });

      req.on('error', () => {
        resolve({
          success: false,
          durationMs: performance.now() - start,
          status: 0,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          durationMs: performance.now() - start,
          status: 504,
        });
      });
    } catch {
      resolve({
        success: false,
        durationMs: performance.now() - start,
        status: 0,
      });
    }
  });
}

async function runWorker(stopTime: number): Promise<void> {
  let endpointIdx = 0;
  while (Date.now() < stopTime) {
    const endpoint = ENDPOINTS[endpointIdx % ENDPOINTS.length];
    endpointIdx++;
    const fullUrl = `${TARGET_URL}${endpoint}`;

    const res = await makeRequest(fullUrl);
    stats.totalRequests++;
    stats.latencies.push(res.durationMs);

    if (res.success) {
      stats.successCount++;
    } else {
      stats.failCount++;
    }
  }
}

export async function runLoadTest(): Promise<void> {
  console.log('================================================================');
  console.log('  Playsole One — Load & Capacity Testing Engine');
  console.log('================================================================');
  console.log(`Target:      ${TARGET_URL}`);
  console.log(`Concurrency: ${CONCURRENCY} workers`);
  console.log(`Duration:    ${DURATION_SECONDS} seconds`);
  console.log(`Endpoints:   ${ENDPOINTS.join(', ')}`);
  console.log('----------------------------------------------------------------');
  console.log('Starting benchmark...');

  const startTime = Date.now();
  const stopTime = startTime + DURATION_SECONDS * 1000;

  const workers: Promise<void>[] = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(runWorker(stopTime));
  }

  await Promise.all(workers);
  const totalDurationSec = (Date.now() - startTime) / 1000;
  const rps = stats.totalRequests / totalDurationSec;

  const latencies = stats.latencies;
  const avgLatency = latencies.length > 0
    ? latencies.reduce((a, b) => a + b, 0) / latencies.length
    : 0;

  console.log('\n================== Benchmark Results ==================');
  console.log(`Total Completed: ${stats.totalRequests} requests in ${totalDurationSec.toFixed(2)}s`);
  console.log(`Throughput:      ${rps.toFixed(1)} req/sec`);
  console.log(`Success Rate:    ${((stats.successCount / (stats.totalRequests || 1)) * 100).toFixed(2)}% (${stats.successCount} ok, ${stats.failCount} failed)`);
  console.log('------------------ Latency Distribution -----------------');
  console.log(`Avg:             ${avgLatency.toFixed(2)} ms`);
  console.log(`P50 (Median):    ${percentile(latencies, 50).toFixed(2)} ms`);
  console.log(`P90:             ${percentile(latencies, 90).toFixed(2)} ms`);
  console.log(`P95:             ${percentile(latencies, 95).toFixed(2)} ms`);
  console.log(`P99:             ${percentile(latencies, 99).toFixed(2)} ms`);
  console.log('========================================================\n');
}

if (require.main === module) {
  runLoadTest().catch((err) => {
    console.error('Load test encountered an error:', err);
    process.exit(1);
  });
}
