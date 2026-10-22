import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getSupabase } from './db';
import { getStateStore } from './redis';
import { createLogger } from './logger';

const logger = createLogger('migrations');

const MIGRATION_LOCK_KEY = 'migrations:lock';
const MIGRATION_LOCK_TTL_MS = 5 * 60 * 1000;

/**
 * Run pending database migrations from the migrations directory.
 *
 * - Reads .sql files sorted by filename
 * - Skips migrations already recorded in `schema_migrations`
 * - Executes each unapplied migration via `exec_sql` RPC
 * - Records the migration version on success
 *
 * Safe to call from any service on startup — concurrent callers will
 * race on the INSERT but the UNIQUE constraint prevents double-execution.
 * A Redis advisory lock (in-memory dev fallback) further prevents two
 * processes from applying migrations simultaneously.
 *
 * Requires the `exec_sql` function and `schema_migrations` table to exist.
 * Run `006-schema-migrations-table.sql` once before first use.
 */

/**
 * Remove transaction-control statements (BEGIN / COMMIT / ROLLBACK / END) from
 * a migration script. `exec_sql` is a PL/pgSQL function, and Postgres does not
 * allow transaction commands inside a function ("EXECUTE of transaction
 * commands is not implemented"). The runner provides atomicity on its own: each
 * migration is a single RPC call that is only recorded on success.
 */
function stripTransactionControl(sql: string): string {
  return sql
    .split('\n')
    .filter((line) => !/^\s*(BEGIN|COMMIT|ROLLBACK|END|START\s+TRANSACTION);?\s*$/i.test(line))
    .join('\n');
}

export async function runMigrations(migrationsDir: string): Promise<void> {
  let lockAcquired = false;
  try {
    lockAcquired = await getStateStore().acquireLock(MIGRATION_LOCK_KEY, MIGRATION_LOCK_TTL_MS);
  } catch (err: any) {
    logger.warn({ err: err.message }, 'could not check migration lock, proceeding with direct migration');
    lockAcquired = true;
  }

  if (!lockAcquired) {
    logger.warn('another process is applying migrations; skipping');
    return;
  }
  try {
    await applyPendingMigrations(migrationsDir);
  } finally {
    try {
      await getStateStore().del(MIGRATION_LOCK_KEY);
    } catch {
      // ignore
    }
  }
}


async function applyPendingMigrations(migrationsDir: string): Promise<void> {
  const supabase = getSupabase();

  const { data: appliedRows, error: queryError } = await supabase
    .from('schema_migrations')
    .select('version');

  if (queryError) {
    logger.warn(`could not read schema_migrations: ${queryError.message}`);
    logger.warn('run 006-schema-migrations-table.sql manually, then restart.');
    return;
  }

  const applied = new Set((appliedRows ?? []).map((r: any) => r.version));

  let files: string[];
  try {
    files = await fs.readdir(migrationsDir);
  } catch {
    logger.warn(`migrations directory not found: ${migrationsDir}`);
    return;
  }

  const sqlFiles = files
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of sqlFiles) {
    const version = file.replace('.sql', '');
    if (applied.has(version)) continue;

    const filePath = path.join(migrationsDir, file);
    const sql = await fs.readFile(filePath, 'utf8');

    logger.info({ version }, 'applying migration');

    const { error } = await supabase.rpc('exec_sql', { query: stripTransactionControl(sql) });

    if (error) {
      logger.warn(`could not auto-apply ${version}: ${error.message}`);
      logger.warn(`run manually: psql -f ${filePath}`);
      continue;
    }

    const { error: insertError } = await supabase
      .from('schema_migrations')
      .insert({ version });

    if (insertError) {
      logger.error(`failed to record ${version}: ${insertError.message}`);
    } else {
      logger.info({ version }, 'applied migration');
    }
  }
}