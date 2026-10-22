import { getSupabase } from './db';
import { createLogger } from './logger';

const logger = createLogger('shared:health');

export interface RecordedHealthCheck {
  service: string;
  status: 'operational' | 'degraded' | 'down';
  latencyMs?: number;
  detail?: string;
}

export interface ServiceIncidentRecord {
  id: number | string;
  service: string;
  status: 'degraded' | 'down';
  started_at: string;
  resolved_at: string | null;
  summary: string | null;
}

export interface DayUptime {
  dayNumber: number; // 90 down to 1
  dateStr: string;
  uptimePct: number;
  hasIncident: boolean;
}

export interface HealthHistoryMetrics {
  dailyUptime: DayUptime[];
  sla30Day: number;
  incidents: ServiceIncidentRecord[];
  totalIncidentsCount: number;
}

/**
 * Persist health checks into Supabase and reconcile open incidents.
 */
export async function recordServiceHealthChecks(checks: RecordedHealthCheck[]): Promise<void> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || checks.length === 0) {
    return;
  }

  try {
    const client = getSupabase();
    const rows = checks.map((c) => ({
      service: c.service,
      status: c.status,
      latency_ms: typeof c.latencyMs === 'number' ? Math.round(c.latencyMs) : null,
      detail: c.detail ?? null,
      checked_at: new Date().toISOString(),
    }));

    const { error: insertError } = await client.from('service_health_checks').insert(rows);
    if (insertError) {
      logger.warn({ err: insertError }, 'failed to insert health check rows');
      return;
    }

    // Reconcile incidents for each checked service
    for (const c of checks) {
      const serviceName = c.service.trim();
      if (c.status === 'down' || c.status === 'degraded') {
        const { data: openIncidents } = await client
          .from('service_incidents')
          .select('id')
          .ilike('service', serviceName)
          .is('resolved_at', null)
          .limit(1);

        if (!openIncidents || openIncidents.length === 0) {
          await client.from('service_incidents').insert({
            service: serviceName.toLowerCase(),
            status: c.status,
            started_at: new Date().toISOString(),
            summary: c.detail || `${serviceName} reported ${c.status} status during synthetic probe.`,
          });
        }
      } else if (c.status === 'operational') {
        // Automatically resolve any open incident for this service
        const { data: openIncidents } = await client
          .from('service_incidents')
          .select('id')
          .ilike('service', serviceName)
          .is('resolved_at', null);

        if (openIncidents && openIncidents.length > 0) {
          const ids = openIncidents.map((o) => o.id);
          await client
            .from('service_incidents')
            .update({ resolved_at: new Date().toISOString() })
            .in('id', ids);
          logger.info({ service: serviceName, resolvedCount: ids.length }, 'auto-resolved open incident(s) after service recovered');
        }
      }
    }
  } catch (err: any) {
    logger.warn({ err: err?.message || err }, 'exception while recording service health checks');
  }
}

/**
 * Query historical health metrics and 90-day daily uptime from Supabase.
 */
export async function getHistoricalHealthMetrics(): Promise<HealthHistoryMetrics> {
  const defaultHistory: DayUptime[] = Array.from({ length: 90 }, (_, i) => {
    const dayNumber = 90 - i;
    const d = new Date();
    d.setDate(d.getDate() - dayNumber);
    return {
      dayNumber,
      dateStr: d.toISOString().split('T')[0],
      uptimePct: 100.0,
      hasIncident: false,
    };
  });

  const fallback: HealthHistoryMetrics = {
    dailyUptime: defaultHistory,
    sla30Day: 99.99,
    incidents: [],
    totalIncidentsCount: 0,
  };

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return fallback;
  }

  try {
    const client = getSupabase();

    // 1. Fetch recent incidents
    const { data: incidentRows } = await client
      .from('service_incidents')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10);

    const incidents: ServiceIncidentRecord[] = (incidentRows ?? []).map((r: any) => ({
      id: r.id,
      service: r.service,
      status: r.status,
      started_at: r.started_at,
      resolved_at: r.resolved_at,
      summary: r.summary,
    }));

    // 2. Fetch past 90 days checks
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400 * 1000).toISOString();
    const { data: checksData, error: checksError } = await client
      .from('service_health_checks')
      .select('status, checked_at')
      .gte('checked_at', ninetyDaysAgo);

    if (checksError || !checksData || checksData.length === 0) {
      return {
        ...fallback,
        incidents,
        totalIncidentsCount: incidents.length,
      };
    }

    // 3. Aggregate 30-day SLA
    const thirtyDaysAgo = Date.now() - 30 * 86400 * 1000;
    const checksIn30d = checksData.filter((c: any) => new Date(c.checked_at).getTime() >= thirtyDaysAgo);
    let sla30Day = 99.99;
    if (checksIn30d.length > 0) {
      const operationalCount = checksIn30d.filter((c: any) => c.status === 'operational').length;
      sla30Day = Number(((operationalCount / checksIn30d.length) * 100).toFixed(2));
    }

    // 4. Map checks to daily buckets
    const dailyMap = new Map<string, { total: number; operational: number }>();
    for (const c of checksData) {
      const dateKey = new Date(c.checked_at).toISOString().split('T')[0];
      const curr = dailyMap.get(dateKey) || { total: 0, operational: 0 };
      curr.total++;
      if (c.status === 'operational') curr.operational++;
      dailyMap.set(dateKey, curr);
    }

    const dailyUptime: DayUptime[] = defaultHistory.map((item) => {
      const bucket = dailyMap.get(item.dateStr);
      if (!bucket || bucket.total === 0) {
        return item; // 100% default
      }
      const pct = Number(((bucket.operational / bucket.total) * 100).toFixed(1));
      const hasInc = pct < 99.0 || incidents.some((inc) => inc.started_at.startsWith(item.dateStr));
      return {
        ...item,
        uptimePct: pct,
        hasIncident: hasInc,
      };
    });

    return {
      dailyUptime,
      sla30Day,
      incidents,
      totalIncidentsCount: incidents.length,
    };
  } catch (err) {
    logger.warn({ err }, 'failed to compute historical health metrics');
    return fallback;
  }
}
