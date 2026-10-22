import path from 'node:path';
import { getSupabase, runMigrations, createLogger } from '@playsole-one/shared';
import { getKeySet, signJwt } from '../services/auth/src/keys';

const logger = createLogger('health-cron');

interface HealthCheckResult {
  service: string;
  status: 'operational' | 'degraded' | 'down';
  latencyMs?: number;
  detail?: string;
}

const HEALTH_SERVICES = ['database', 'keys', 'email'];

async function probeDatabase(): Promise<HealthCheckResult> {
  const started = Date.now();
  try {
    const { error } = await getSupabase().from('tenants').select('id').limit(1);
    const latencyMs = Date.now() - started;
    if (error) {
      return { service: 'database', status: 'down', latencyMs, detail: `Query failed: ${error.message}` };
    }
    return { service: 'database', status: 'operational', latencyMs };
  } catch (err) {
    return {
      service: 'database',
      status: 'down',
      latencyMs: Date.now() - started,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

async function probeKeys(): Promise<HealthCheckResult> {
  const started = Date.now();
  try {
    await getKeySet();
    await signJwt({ sub: 'status', client_id: 'status', scope: 'openid' }, 60);
    const latencyMs = Date.now() - started;
    return { service: 'keys', status: 'operational', latencyMs };
  } catch (err) {
    return {
      service: 'keys',
      status: 'down',
      latencyMs: Date.now() - started,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

async function probeEmail(): Promise<HealthCheckResult> {
  if (!process.env.RESEND_API_KEY) {
    return { service: 'email', status: 'degraded', detail: 'Email provider not configured (RESEND_API_KEY missing).' };
  }
  const started = Date.now();
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'GET',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    const latencyMs = Date.now() - started;
    if (res.status === 200 || res.status === 404) {
      return {
        service: 'email',
        status: 'operational',
        latencyMs,
        detail: process.env.RESEND_FROM_EMAIL ? `From: ${process.env.RESEND_FROM_EMAIL}` : undefined,
      };
    }
    return { service: 'email', status: 'degraded', latencyMs, detail: `Provider responded ${res.status}.` };
  } catch (err) {
    return {
      service: 'email',
      status: 'down',
      latencyMs: Date.now() - started,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

async function runHealthChecks(): Promise<HealthCheckResult[]> {
  return [await probeDatabase(), await probeKeys(), await probeEmail()];
}

async function recordHealthChecks(checks: HealthCheckResult[]): Promise<void> {
  const rows = checks.map((c) => ({
    service: c.service,
    status: c.status,
    latency_ms: c.latencyMs ?? null,
    detail: c.detail ?? null,
  }));
  const { error } = await getSupabase().from('service_health_checks').insert(rows);
  if (error) {
    throw new Error(`Failed to record health checks: ${error.message}`);
  }
}

async function getLatestStatuses(): Promise<Map<string, 'operational' | 'degraded' | 'down'>> {
  const map = new Map<string, 'operational' | 'degraded' | 'down'>();
  for (const service of HEALTH_SERVICES) {
    const { data } = await getSupabase()
      .from('service_health_checks')
      .select('status')
      .eq('service', service)
      .order('checked_at', { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      map.set(service, data[0].status);
    }
  }
  return map;
}

async function openIncident(service: string, status: 'degraded' | 'down', summary: string): Promise<void> {
  const { error } = await getSupabase().from('service_incidents').insert({
    service,
    status,
    started_at: new Date().toISOString(),
    summary,
  });
  if (error) {
    throw new Error(`Failed to open incident for ${service}: ${error.message}`);
  }
}

async function closeOpenIncident(service: string): Promise<void> {
  const { data, error } = await getSupabase()
    .from('service_incidents')
    .select('id')
    .ilike('service', service)
    .is('resolved_at', null);
  if (error) {
    throw new Error(`Failed to find open incident for ${service}: ${error.message}`);
  }
  if (!data || data.length === 0) return;
  const ids = data.map((d) => d.id);
  const { error: updateError } = await getSupabase()
    .from('service_incidents')
    .update({ resolved_at: new Date().toISOString() })
    .in('id', ids);
  if (updateError) {
    throw new Error(`Failed to close incident for ${service}: ${updateError.message}`);
  }
}

async function main(): Promise<void> {
  const migrationsDir = process.env.MIGRATIONS_DIR ?? path.join(process.cwd(), 'scripts', 'db', 'migrations');
  await runMigrations(migrationsDir);

  const previous = await getLatestStatuses();
  const checks = await runHealthChecks();
  await recordHealthChecks(checks);

  for (const check of checks) {
    const prior = previous.get(check.service);
    if (check.status === 'operational') {
      await closeOpenIncident(check.service);
    } else if (prior !== check.status) {
      await openIncident(check.service, check.status, check.detail ?? 'Automated probe reported a problem.');
    }
  }

  logger.info(
    { checks: checks.map((c) => ({ service: c.service, status: c.status, latencyMs: c.latencyMs })) },
    'health check cron complete',
  );
}

main().catch((err) => {
  logger.error({ err }, 'health check cron failed');
  process.exit(1);
});