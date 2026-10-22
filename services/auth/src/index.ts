import { ensureDefaultTenant, runMigrations, createLogger, httpLogger, setupGracefulShutdown } from '@playsole-one/shared';

import express from 'express';
import http from 'node:http';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { discoveryRouter } from './routes/discovery';
import { jwksRouter } from './routes/jwks';
import { authorizeRouter } from './routes/authorize';
import { tokenRouter } from './routes/token';
import { revokeRouter } from './routes/revoke';
import { userinfoRouter } from './routes/userinfo';
import { pagesRouter } from './routes/pages';
import { verifyRouter } from './routes/verify';

const logger = createLogger('auth');

const app = express();

app.use(httpLogger('auth'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'auth' });
});

app.use(discoveryRouter);
app.use(jwksRouter);
app.use(authorizeRouter);
app.use(tokenRouter);
app.use(revokeRouter);
app.use(userinfoRouter);
app.use(pagesRouter);
app.use(verifyRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'unhandled error');
  if (!res.headersSent) {
    res.status(500).json({ error: 'server_error', error_description: 'Internal server error.' });
  }
});

if (require.main === module) {
  const migrationsDir = process.env.MIGRATIONS_DIR ?? path.join(process.cwd(), 'scripts', 'db', 'migrations');
  runMigrations(migrationsDir)
    .then(() => ensureDefaultTenant().catch((e) => logger.warn({ err: e }, 'tenant seed skipped')))
    .then(() => {
      const server = http.createServer(app);
      server.listen(config.port, () => {
        logger.info({ port: config.port }, 'auth service listening');
      });
      setupGracefulShutdown({ logger, servers: [server] });
    });
}

export default app;