process.setMaxListeners(40);

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { runMigrations, ensureDefaultTenant, createLogger, setupGracefulShutdown, validateProductionEnv } from '@playsole-one/shared';
import gatewayApp from '@playsole-one/gateway';
import authApp from '@playsole-one/auth';
import sessionApp from '@playsole-one/session';
import profileApp from '@playsole-one/profile';
import consentApp from '@playsole-one/consent';
import securityApp from '@playsole-one/security';
import { config } from './config';

const logger = createLogger('server');

async function boot(): Promise<void> {
  validateProductionEnv();

  const migrationsDir = process.env.MIGRATIONS_DIR ?? path.join(process.cwd(), 'scripts', 'db', 'migrations');
  await runMigrations(migrationsDir);
  await ensureDefaultTenant().catch((err) => logger.warn({ err }, 'tenant seed skipped'));

  const servers: http.Server[] = [];

  function listen(name: string, app: unknown, port: number, tls = false): void {
    const server = tls
      ? http.createServer(
          { cert: fs.readFileSync(config.tls.certPath!), key: fs.readFileSync(config.tls.keyPath!) } as http.ServerOptions,
          app as http.RequestListener,
        )
      : http.createServer(app as http.RequestListener);
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
    server.requestTimeout = 120000;
    server.listen(port, () => {
      logger.info({ service: name, port }, 'service listening');
    });
    servers.push(server);
  }

  listen('gateway', gatewayApp, config.gatewayPort, config.tls.enabled);
  listen('auth', authApp, config.ports.auth);
  listen('profile', profileApp, config.ports.profile);
  listen('consent', consentApp, config.ports.consent);
  listen('session', sessionApp, config.ports.session);
  listen('security', securityApp, config.ports.security);

  setupGracefulShutdown({ logger, servers });
}

boot().catch((err) => {
  logger.error({ err }, 'server failed to boot');
  process.exit(1);
});