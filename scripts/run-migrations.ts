import path from 'node:path';
import { runMigrations, ensureDefaultTenant, createLogger } from '@playsole-one/shared';

const logger = createLogger('migrations');

const migrationsDir = process.env.MIGRATIONS_DIR ?? path.join(process.cwd(), 'scripts', 'db', 'migrations');

async function main() {
  logger.info({ dir: migrationsDir }, 'running migrations');
  await runMigrations(migrationsDir);
  await ensureDefaultTenant();
  logger.info('migrations done');
}

main().catch((err) => {
  logger.error({ err }, 'migrations failed');
  process.exit(1);
});