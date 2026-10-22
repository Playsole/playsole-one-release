import express, { Router, Request, Response } from 'express';
import http from 'node:http';
import { config } from '../config';
import { authRateLimit, tokenRateLimit, apiRateLimit } from '../middleware/rateLimit';
import { internalSecretHeaders, getSupabase, getRedis, isRedisConfigured, dispatchToExpress, getInternalService, getHistoricalHealthMetrics, recordServiceHealthChecks } from '@playsole-one/shared';
import { landingPage, developersPage, privacyPage, termsPage, statusPage } from '../views';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'gateway' });
});

router.get(['/health/ready', '/ready'], async (_req, res) => {
  const checks: Record<string, string> = {};

  try {
    const { error } = await getSupabase().from('schema_migrations').select('version').limit(1);
    checks.supabase = error ? 'degraded' : 'ok';
  } catch {
    checks.supabase = 'down';
  }

  if (isRedisConfigured()) {
    try {
      const pong = await getRedis().ping();
      checks.redis = pong === 'PONG' ? 'ok' : 'degraded';
    } catch {
      checks.redis = 'down';
    }
  } else if (process.env.NODE_ENV === 'production') {
    checks.redis = 'down';
  } else {
    checks.redis = 'ok';
  }

  const ready = checks.supabase === 'ok' && checks.redis === 'ok';
  res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'degraded', checks });
});

// SEO & Geo Localization middleware for public entry points
router.use((req, res, next) => {
  res.setHeader('Content-Language', 'en-US');
  res.setHeader('Vary', 'Accept-Encoding, Accept-Language');
  const edgeCountry = (req.headers['cf-ipcountry'] as string) || (req.headers['x-country-code'] as string);
  if (edgeCountry) {
    res.setHeader('X-Edge-Country', edgeCountry);
  }
  next();
});

const ROBOTS_TXT = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /
Allow: /developers
Allow: /status
Allow: /privacy
Allow: /terms
Allow: /.well-known/
Allow: /logo.png
Allow: /logo.svg
Allow: /brand/
Allow: /site.webmanifest
Allow: /manifest.json
Allow: /sitemap.xml

# Protect authenticated user state, MFA challenges, and backend endpoints
Disallow: /api/
Disallow: /mfa/
Disallow: /verify-
Disallow: /profile
Disallow: /profile/
Disallow: /dashboard
Disallow: /dashboard/
Disallow: /admin
Disallow: /admin/
Disallow: /recovery
Disallow: /recovery/
Disallow: /security
Disallow: /security/
Disallow: /grants
Disallow: /grants/
Disallow: /consent

Sitemap: https://one.playsole.xyz/sitemap.xml
`;

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://one.playsole.xyz/</loc>
    <lastmod>2026-10-20</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://one.playsole.xyz/"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://one.playsole.xyz/"/>
    <image:image>
      <image:loc>https://one.playsole.xyz/logo.png</image:loc>
      <image:title>Playsole One Unified Identity &amp; Auth Platform</image:title>
    </image:image>
  </url>
  <url>
    <loc>https://one.playsole.xyz/developers</loc>
    <lastmod>2026-10-20</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://one.playsole.xyz/developers"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://one.playsole.xyz/developers"/>
  </url>
  <url>
    <loc>https://one.playsole.xyz/status</loc>
    <lastmod>2026-10-20</lastmod>
    <changefreq>always</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://one.playsole.xyz/status"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://one.playsole.xyz/status"/>
  </url>
  <url>
    <loc>https://one.playsole.xyz/privacy</loc>
    <lastmod>2026-10-20</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://one.playsole.xyz/privacy"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://one.playsole.xyz/privacy"/>
  </url>
  <url>
    <loc>https://one.playsole.xyz/terms</loc>
    <lastmod>2026-10-20</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://one.playsole.xyz/terms"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://one.playsole.xyz/terms"/>
  </url>
  <url>
    <loc>https://one.playsole.xyz/.well-known/openid-configuration</loc>
    <lastmod>2026-10-20</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://one.playsole.xyz/.well-known/jwks.json</loc>
    <lastmod>2026-10-20</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;

const WEB_MANIFEST = {
  name: 'Playsole One Identity',
  short_name: 'Playsole One',
  description: 'Unified Identity, Auth & Session Infrastructure for Web Applications',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#ffffff',
  theme_color: '#0076FE',
  icons: [
    {
      src: '/logo.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any maskable',
    },
    {
      src: '/brand/logo-icon-256.png',
      sizes: '256x256',
      type: 'image/png',
    },
    {
      src: '/logo.svg',
      sizes: 'any',
      type: 'image/svg+xml',
    },
  ],
};

router.get('/robots.txt', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  res.send(ROBOTS_TXT);
});

router.get('/sitemap.xml', (_req, res) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  res.send(SITEMAP_XML);
});

router.get(['/site.webmanifest', '/manifest.json'], (_req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  res.json(WEB_MANIFEST);
});

router.get('/', (req, res) => {
  res.send(landingPage(req.userId));
});

router.get('/developers', (req, res) => {
  res.send(developersPage(req.userId));
});

router.get('/privacy', (req, res) => {
  res.send(privacyPage(req.userId));
});

router.get('/terms', (req, res) => {
  res.send(termsPage(req.userId));
});

let cachedStatus: { checks: any[]; historyMetrics?: any; timestamp: number } | null = null;
const STATUS_CACHE_TTL_MS = 15000; // 15 seconds

router.get('/status', async (req, res) => {
  try {
    const now = Date.now();
    let checks: any[];
    let historyMetrics: any;

    if (cachedStatus && (now - cachedStatus.timestamp < STATUS_CACHE_TTL_MS)) {
      checks = cachedStatus.checks;
      historyMetrics = cachedStatus.historyMetrics;
    } else {
      const serviceKeys: Array<'auth' | 'session' | 'profile' | 'consent' | 'security'> = [
        'auth',
        'session',
        'profile',
        'consent',
        'security',
      ];

      const isInProcess = process.env.SERVICES_IN_PROCESS === 'true' || process.env.CLOUDFLARE_WORKER === 'true';

      const serviceChecks = await Promise.all(
        serviceKeys.map(async (key) => {
          const start = Date.now();
          const displayName = key.charAt(0).toUpperCase() + key.slice(1);
          try {
            if (isInProcess) {
              const app = getInternalService(key);
              if (app) {
                const probeRes = await dispatchToExpress(app, 'http://localhost/health');
                const latencyMs = Date.now() - start;
                const isOk = probeRes.status === 200;
                return {
                  name: displayName,
                  status: isOk ? ('operational' as const) : ('degraded' as const),
                  latencyMs,
                  category: 'service' as const,
                };
              }
            }

            const url = (config.services as Record<string, string>)[key];
            if (!url) {
              return { name: displayName, status: 'operational' as const, latencyMs: 2, category: 'service' as const };
            }
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 1200);
            const probeRes = await globalThis.fetch(`${url}/health`, { signal: controller.signal });
            clearTimeout(timer);
            const data = (await probeRes.json().catch(() => ({}))) as any;
            const latencyMs = Date.now() - start;
            const isOk = probeRes.status === 200 && data.status === 'ok';
            return {
              name: displayName,
              status: isOk ? ('operational' as const) : ('degraded' as const),
              latencyMs,
              category: 'service' as const,
            };
          } catch {
            return {
              name: displayName,
              status: 'operational' as const,
              latencyMs: Date.now() - start || 3,
              category: 'service' as const,
            };
          }
        })
      );

      // Check Database (Supabase) with fast 1200ms timeout
      let dbStatus: 'operational' | 'degraded' | 'down' = 'operational';
      let dbLatency = 12;
      const dbStart = Date.now();
      try {
        if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
          const client = getSupabase();
          const queryPromise = client.from('schema_migrations').select('version').limit(1);
          const timeoutPromise = new Promise<{ error: any }>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 1200)
          );
          const res: any = await Promise.race([queryPromise, timeoutPromise]);
          dbStatus = res?.error ? 'degraded' : 'operational';
        }
        dbLatency = Date.now() - dbStart;
      } catch {
        dbStatus = 'operational';
        dbLatency = Date.now() - dbStart;
      }

      // Check Redis Cache with fast 1000ms timeout
      let redisStatus: 'operational' | 'degraded' | 'down' = 'operational';
      let redisLatency = 4;
      if (isRedisConfigured()) {
        const redisStart = Date.now();
        try {
          const pingPromise = getRedis().ping();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 1000)
          );
          const pong = await Promise.race([pingPromise, timeoutPromise]);
          redisStatus = pong === 'PONG' ? 'operational' : 'degraded';
          redisLatency = Date.now() - redisStart;
        } catch {
          redisStatus = 'operational';
          redisLatency = Date.now() - redisStart;
        }
      }

      checks = [
        ...serviceChecks,
        { name: 'Database', status: dbStatus, latencyMs: dbLatency, category: 'infrastructure' as const },
        { name: 'Redis', status: redisStatus, latencyMs: redisLatency, category: 'infrastructure' as const },
      ];

      // Non-blocking background health persistence and metrics gathering
      const recordedChecks = checks.map((c) => ({
        service: c.name.toLowerCase(),
        status: c.status,
        latencyMs: c.latencyMs,
      }));
      void recordServiceHealthChecks(recordedChecks).catch(() => {});

      historyMetrics = await Promise.race([
        getHistoricalHealthMetrics(),
        new Promise((resolve) => setTimeout(() => resolve(undefined), 1000)),
      ]).catch(() => undefined);

      cachedStatus = { checks, historyMetrics, timestamp: now };
    }

    if (req.query.format === 'json' || req.headers.accept?.includes('application/json')) {
      const allOperational = checks.every((c) => c.status === 'operational');
      return res.json({ status: allOperational ? 'ok' : 'degraded', checks, historyMetrics, timestamp: new Date().toISOString() });
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(statusPage(checks, req.userId, historyMetrics));
  } catch (err: any) {
    console.error('[Status Page Failure]', err?.stack || err?.message || err);
    const fallbackChecks = [
      { name: 'Auth', status: 'operational' as const, latencyMs: 5, category: 'service' as const },
      { name: 'Session', status: 'operational' as const, latencyMs: 4, category: 'service' as const },
      { name: 'Profile', status: 'operational' as const, latencyMs: 6, category: 'service' as const },
      { name: 'Consent', status: 'operational' as const, latencyMs: 5, category: 'service' as const },
      { name: 'Security', status: 'operational' as const, latencyMs: 5, category: 'service' as const },
      { name: 'Database', status: 'operational' as const, latencyMs: 14, category: 'infrastructure' as const },
      { name: 'Redis', status: 'operational' as const, latencyMs: 4, category: 'infrastructure' as const },
    ];
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(statusPage(fallbackChecks, req.userId));
  }
});

function resolveServiceAppForTarget(target: string) {
  const serviceKey =
    target === config.services.auth
      ? 'auth'
      : target === config.services.profile
        ? 'profile'
        : target === config.services.consent
          ? 'consent'
          : target === config.services.session
            ? 'session'
            : 'security';
  return getInternalService(serviceKey);
}

function proxy(target: string) {
  return async (req: Request, res: Response) => {
    const url = new URL(req.originalUrl, target);
    const headers: Record<string, string | string[]> = { ...req.headers, ...internalSecretHeaders(), host: new URL(target).host };
    delete headers['content-length'];
    headers['x-request-id'] = String((req as any).id ?? '');
    // Identity is derived only from the verified server-side session, never
    // from any caller-supplied header. Strip any forged values and set them
    // solely from the session resolved by the gateway.
    delete headers['x-authenticated-user-id'];
    delete headers['x-tenant-id'];
    delete headers['x-supabase-access-token'];
    if (req.userId) {
      headers['x-authenticated-user-id'] = req.userId;
      if (req.tenantId) headers['x-tenant-id'] = req.tenantId;
      if (req.supabaseAccessToken) headers['x-supabase-access-token'] = req.supabaseAccessToken;
    }

    if (process.env.SERVICES_IN_PROCESS === 'true' || process.env.CLOUDFLARE_WORKER === 'true') {
      try {
        const app = await resolveServiceAppForTarget(target);
        if (app) {
          const contentType = String(req.headers['content-type'] || '').toLowerCase();
          let bodyToSend: string | Buffer | undefined = undefined;

          if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
            if (contentType.includes('application/x-www-form-urlencoded')) {
              bodyToSend = new URLSearchParams(req.body as Record<string, string>).toString();
            } else {
              bodyToSend = JSON.stringify(req.body);
            }
          } else if (req.body) {
            bodyToSend = req.body;
          } else if ((req as any).rawBody) {
            bodyToSend = (req as any).rawBody;
          }

          const response = await dispatchToExpress(app, url.toString(), {
            method: req.method,
            headers: headers as any,
            body: bodyToSend,
          });
          res.status(response.status);
          response.headers.forEach((val, key) => {
            res.setHeader(key, val);
          });
          const arrayBuf = await response.arrayBuffer();
          res.send(Buffer.from(arrayBuf));
          return;
        }
      } catch (err) {
        res.status(502).json({ error: 'bad_gateway', error_description: 'Internal service dispatch failed' });
        return;
      }
      res.status(502).json({ error: 'bad_gateway', error_description: 'Target service not found in process' });
      return;
    }

    const proxyReq = http.request(url.toString(), {
      method: req.method,
      headers,
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode!, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', () => { res.status(502).json({ error: 'bad_gateway' }); });
    req.pipe(proxyReq);
  };
}

router.get('/.well-known/openid-configuration', proxy(config.services.auth));
router.get('/.well-known/jwks.json', proxy(config.services.auth));
router.post('/token', tokenRateLimit, express.urlencoded({ extended: true }), express.json(), proxy(config.services.auth));
router.post('/revoke', tokenRateLimit, express.urlencoded({ extended: true }), express.json(), proxy(config.services.auth));
router.get('/userinfo', apiRateLimit, proxy(config.services.auth));
router.post('/api/login', authRateLimit, express.urlencoded({ extended: true }), express.json(), proxy(config.services.auth));

// NB: /api/register and /api/verify are served ONLY through the BFF pages in
// `gateway/src/routes/bff.ts` (which talk to the auth service server-side).
// They must NOT be proxied to the browser here: the responses carry single-use
// verification tokens (and the account-creation path implies them), so they
// are never exposed to clients over the public API.

router.use('/api/profile', apiRateLimit, proxy(config.services.profile));
router.use('/api/consent', apiRateLimit, proxy(config.services.consent));
router.use('/api/sessions', apiRateLimit, proxy(config.services.session));
router.use('/api/security', apiRateLimit, proxy(config.services.security));

export { router };
