import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { config } from './config';
import { consentRouter } from './routes/consent';
import { requireInternalSecret, runMigrations, createLogger, httpLogger, setupGracefulShutdown } from '@playsole-one/shared';

const logger = createLogger('consent');

const app = express();

app.use(httpLogger('consent'));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'consent' });
});

app.use(requireInternalSecret);
app.use(consentRouter);

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
      logger.info({ port: config.port }, 'consent service listening');
    });
    setupGracefulShutdown({ logger, servers: [server] });
  });
}

export default app;