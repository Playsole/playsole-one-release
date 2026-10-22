import express from 'express';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { createLogger, httpLogger, setupGracefulShutdown, tracingMiddleware, metricsMiddleware, metrics } from '@playsole-one/shared';
import { globalRateLimit } from './middleware/rateLimit';
import { sessionMiddleware } from './middleware/session';
import { router } from './routes';
import { bffRouter } from './routes/bff';
import { adminRouter } from './routes/admin';
import { adminApiRouter } from './routes/adminApi';
import { ssoRouter } from './routes/sso';
import { generateCsrfToken } from './middleware/csrf';

const logger = createLogger('gateway');

const app = express();

// Reflect the client IP behind Cloudflare proxies (rate limits, device
// reporting, lockout). Dev defaults to off so req.ip is the direct peer.
app.set('trust proxy', config.trustProxy);

// Canonical Host Redirect: Redirect legacy domains (auth.playsole.xyz, playsole.xyz) to canonical https://one.playsole.xyz
app.use((req, res, next) => {
  const host = (req.get('x-forwarded-host') || req.get('host') || '').toLowerCase().split(':')[0];
  if (host === 'auth.playsole.xyz' || host === 'playsole.xyz') {
    return res.redirect(301, `https://one.playsole.xyz${req.originalUrl}`);
  }
  next();
});

// Distributed tracing and metrics collection across service requests
app.use(tracingMiddleware);
app.use(metricsMiddleware);
app.use(httpLogger('gateway'));

// Prometheus & JSON Metrics Endpoint (Item 44)
app.get('/metrics', (req, res) => {
  if (req.query.format === 'json') {
    res.json(metrics.getSummary());
  } else {
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics.toPrometheusFormat());
  }
});

// Self-hosted static assets (fonts, logo, etc.) — no third-party CDN at runtime.
// In the Cloudflare Worker runtime all static assets are served via the ASSETS binding
// before the request ever reaches Express, so __dirname is not available and not needed.
if (typeof __dirname !== 'undefined') {
  const path = require('node:path') as typeof import('node:path');
  app.use('/fonts', express.static(path.join(__dirname, '..', 'static', 'fonts'), {
    maxAge: '30d',
    immutable: true,
  }));

  // Direct Public CDN / Brand Asset Endpoints (CORS-enabled for third-party buttons & embeds)
  const setPublicCdnHeaders = (res: express.Response) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  };

  app.options(['/logo.png', '/logo.svg', '/brand', '/brand/*'], (_req, res) => {
    setPublicCdnHeaders(res);
    res.setHeader('Access-Control-Max-Age', '86400');
    res.sendStatus(204);
  });

  const sendPublicFile = (fileName: string, contentType: string) => (_req: express.Request, res: express.Response) => {
    setPublicCdnHeaders(res);
    res.setHeader('Content-Type', contentType);
    res.sendFile(path.join(__dirname, '..', 'static', fileName));
  };

  app.get('/logo.png', sendPublicFile('logo.png', 'image/png'));
  app.get('/logo.svg', sendPublicFile('logo.svg', 'image/svg+xml'));

  // /brand static directory (SVG badges, CSS stylesheets, icons)
  app.use('/brand', (req, res, next) => {
    setPublicCdnHeaders(res);
    next();
  }, express.static(path.join(__dirname, '..', 'static', 'brand'), {
    maxAge: '1d',
    setHeaders: (res) => {
      setPublicCdnHeaders(res);
    },
  }));

  app.get('/sso.png', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'static', 'sso.png'));
  });
  app.get('/oidc-pkce.png', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'static', 'oidc-pkce.png'));
  });
  app.get('/consent.png', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'static', 'consent.png'));
  });
  app.get('/session-security.png', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'static', 'session-security.png'));
  });
  app.get('/verification.png', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'static', 'verification.png'));
  });
  app.get('/magic-links.png', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'static', 'magic-links.png'));
  });
}

app.use(globalRateLimit);
app.use(cookieParser());
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.cookies?.playsole_csrf) {
    try { generateCsrfToken(req, res); } catch { /* ignore */ }
  }
  next();
});
app.use(sessionMiddleware);
app.use('/sso', ssoRouter);
app.use('/account-chooser', ssoRouter);
app.use('/api/v1/admin', adminApiRouter);
app.use(bffRouter);
app.use('/admin', adminRouter);
app.use(router);

// Terminal error middleware so unhandled route errors return a clean 500 response
// instead of terminating the process or dropping the connection.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Gateway Unhandled Error]', err?.stack || err?.message || err);
  logger.error({ err }, 'unhandled gateway error');
  if (!res.headersSent) {
    res.setHeader('x-debug-error', encodeURIComponent(String(err?.message || err).slice(0, 150)));
    res.status(500).send('An unexpected error occurred. Please try again.');
  }
});

// Process-level safety net — only applicable in Node.js, not Cloudflare Workers.
if (typeof process?.on === 'function' && !process.env.CLOUDFLARE_WORKER) {
  process.on('unhandledRejection', (reason: any) => {
    logger.error({ err: reason }, 'unhandled rejection in gateway');
  });

  process.on('uncaughtException', (err: any) => {
    logger.error({ err }, 'uncaught exception in gateway');
  });
}

// Server startup — Node.js runtime only. In Cloudflare Workers the worker entrypoint
// calls dispatchToExpress(gatewayApp, ...) directly; this block is never reached.
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  const fs = require('node:fs') as typeof import('node:fs');
  const http = require('node:http') as typeof import('node:http');
  const https = require('node:https') as typeof import('node:https');
  const tlsEnabled = config.tls.enabled && config.tls.certPath && config.tls.keyPath;
  const server = tlsEnabled
    ? https.createServer(
        { cert: fs.readFileSync(config.tls.certPath!), key: fs.readFileSync(config.tls.keyPath!) },
        app,
      )
    : http.createServer(app);

  // Prevent keep-alive socket drops during remote Supabase/Upstash roundtrips.
  // Standard Node.js default is 5000ms, which causes socket resets during browser redirects.
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  server.requestTimeout = 120000;

  server.listen(config.port, () => {
    logger.info({ port: config.port }, tlsEnabled ? 'gateway listening (TLS)' : 'gateway listening');
  });
  setupGracefulShutdown({ logger, servers: [server] });
}

export default app;