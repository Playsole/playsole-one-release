import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { config } from './config';
import { sessionsRouter } from './routes/sessions';
import { authCodesRouter } from './routes/authCodes';
import { refreshTokensRouter } from './routes/refreshTokens';
import { requireInternalSecret, runMigrations, createLogger, httpLogger, setupGracefulShutdown } from '@playsole-one/shared';

const logger = createLogger('session');

const app = express();

app.use(httpLogger('session'));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'session' });
});

app.use(requireInternalSecret);
app.use(sessionsRouter);
app.use(authCodesRouter);
app.use(refreshTokensRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'unhandled error');
  if (!res.headersSent) {
    res.status(500).json({ error: 'server_error', error_description: 'Internal server error.' });
  }
});

if (require.main === module) {
  const migrationsDir = process.env.MIGRATIONS_DIR ?? path.join(process.cwd(), 'scripts', 'db', 'migrations');
  runMigrations(migrationsDir).then(() => {
    const server = http.createServer(app);
    server.listen(config.port, () => {
      logger.info({ port: config.port }, 'session service listening');
    });
    setupGracefulShutdown({ logger, servers: [server] });
  });
}

export default app;