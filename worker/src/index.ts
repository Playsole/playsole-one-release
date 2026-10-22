/// <reference types="@cloudflare/workers-types" />
import gatewayApp from '@playsole-one/gateway';
import authApp from '@playsole-one/auth';
import sessionApp from '@playsole-one/session';
import profileApp from '@playsole-one/profile';
import consentApp from '@playsole-one/consent';
import securityApp from '@playsole-one/security';
import {
  dispatchToExpress,
  registerInternalService,
  recordServiceHealthChecks,
  getInternalService,
  getSupabase,
  getRedis,
  isRedisConfigured,
} from '@playsole-one/shared';

// Register all internal services for in-process edge dispatching
registerInternalService('auth', authApp);
registerInternalService('session', sessionApp);
registerInternalService('profile', profileApp);
registerInternalService('consent', consentApp);
registerInternalService('security', securityApp);

export interface Env {
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
  [key: string]: any;
}

export default {
  async fetch(request: Request, env: Env = {}, ctx?: ExecutionContext): Promise<Response> {
    try {
      // 1. Mark in-process and worker execution environment
      process.env.SERVICES_IN_PROCESS = 'true';
      process.env.CLOUDFLARE_WORKER = 'true';

      // 2. Synchronize Cloudflare Worker environment variables and secrets to process.env
      if (env && typeof env === 'object') {
        for (const [key, value] of Object.entries(env)) {
          if (typeof value === 'string') {
            process.env[key] = value;
          }
        }
      }

      const url = new URL(request.url);

      // 3. Serve static assets directly if matched and ASSETS binding exists
      if (
        env.ASSETS &&
        (url.pathname.startsWith('/fonts/') ||
          url.pathname.endsWith('.png') ||
          url.pathname.endsWith('.svg') ||
          url.pathname.endsWith('.ico') ||
          url.pathname.endsWith('.css') ||
          url.pathname.endsWith('.js') ||
          url.pathname === '/robots.txt' ||
          url.pathname === '/sitemap.xml' ||
          url.pathname === '/site.webmanifest' ||
          url.pathname === '/manifest.json')
      ) {
        try {
          const assetRes = await env.ASSETS.fetch(request);
          if (assetRes.status !== 404) {
            return assetRes;
          }
        } catch {
          // Fall through to Express handler
        }
      }

      // 4. Extract body buffer if present
      const method = request.method.toUpperCase();
      let body: Buffer | null = null;
      if (method !== 'GET' && method !== 'HEAD') {
        try {
          const arrayBuf = await request.arrayBuffer();
          if (arrayBuf.byteLength > 0) {
            body = Buffer.from(arrayBuf);
          }
        } catch (bodyErr) {
          console.warn('[Cloudflare Worker] Could not read request body buffer:', bodyErr);
        }
      }

      // 5. Build headers record and forward client IP & edge Geo coordinates
      const headers: Record<string, string> = {};
      request.headers.forEach((val, key) => {
        headers[key] = val;
      });

      const cf = (request as any).cf;
      if (cf && typeof cf === 'object') {
        if (cf.country) headers['cf-ipcountry'] = cf.country;
        if (cf.city) headers['cf-ipcity'] = cf.city;
        if (cf.latitude) headers['cf-iplatitude'] = String(cf.latitude);
        if (cf.longitude) headers['cf-iplongitude'] = String(cf.longitude);
        if (cf.timezone) headers['cf-timezone'] = cf.timezone;
        if (cf.colo) headers['cf-ray-colo'] = cf.colo;
      }

      const clientIp =
        request.headers.get('cf-connecting-ip') ||
        request.headers.get('x-forwarded-for') ||
        '127.0.0.1';
      headers['x-forwarded-for'] = clientIp;

      // 6. Dispatch to the up-to-date Express gateway application
      return await dispatchToExpress(gatewayApp, request.url, {
        method,
        headers,
        body,
      });
    } catch (err: any) {
      console.error('[Cloudflare Worker Dispatch Error]', err?.stack || err?.message || err);
      return new Response(
        JSON.stringify({ error: 'internal_server_error', message: err?.message || 'An unexpected error occurred.' }),
        {
          status: 500,
          headers: {
            'content-type': 'application/json; charset=utf-8',
          },
        }
      );
    }
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('[Cloudflare Worker Cron] Scheduled event triggered:', event.cron);

    // 1. Sync Cloudflare Worker environment variables and secrets to process.env
    if (env && typeof env === 'object') {
      for (const [key, value] of Object.entries(env)) {
        if (typeof value === 'string') {
          process.env[key] = value;
        }
      }
    }

    try {
      const serviceKeys: Array<'auth' | 'session' | 'profile' | 'consent' | 'security'> = [
        'auth',
        'session',
        'profile',
        'consent',
        'security',
      ];

      const checks: Array<{ service: string; status: 'operational' | 'degraded' | 'down'; latencyMs?: number; detail?: string }> = [];

      // Probe in-process microservices
      for (const key of serviceKeys) {
        const start = Date.now();
        try {
          const app = getInternalService(key);
          if (app) {
            const res = await dispatchToExpress(app, 'http://localhost/health');
            const latencyMs = Date.now() - start;
            checks.push({
              service: key,
              status: res.status === 200 ? 'operational' : 'degraded',
              latencyMs,
            });
          }
        } catch (err: any) {
          checks.push({
            service: key,
            status: 'degraded',
            detail: err?.message || String(err),
          });
        }
      }

      // Probe Supabase Database
      const dbStart = Date.now();
      try {
        if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
          const { error } = await getSupabase().from('schema_migrations').select('version').limit(1);
          checks.push({
            service: 'database',
            status: error ? 'degraded' : 'operational',
            latencyMs: Date.now() - dbStart,
            detail: error ? error.message : undefined,
          });
        }
      } catch (err: any) {
        checks.push({
          service: 'database',
          status: 'down',
          latencyMs: Date.now() - dbStart,
          detail: err?.message || String(err),
        });
      }

      // Probe Redis Cache
      if (isRedisConfigured()) {
        const redisStart = Date.now();
        try {
          const pong = await getRedis().ping();
          checks.push({
            service: 'redis',
            status: pong === 'PONG' ? 'operational' : 'degraded',
            latencyMs: Date.now() - redisStart,
          });
        } catch (err: any) {
          checks.push({
            service: 'redis',
            status: 'down',
            latencyMs: Date.now() - redisStart,
            detail: err?.message || String(err),
          });
        }
      }

      // Persist checks and reconcile active incidents in Supabase
      await recordServiceHealthChecks(checks);
      console.log(`[Cloudflare Worker Cron] Successfully recorded health checks for ${checks.length} services.`);
    } catch (cronErr: any) {
      console.error('[Cloudflare Worker Cron] Error during scheduled health execution:', cronErr);
    }
  },
};
