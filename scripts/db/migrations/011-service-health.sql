-- Migration: Service health checks and incident history for the status page
-- Stores periodic probe results and derived incidents so the status page can
-- show historical uptime and an incident log instead of only a point-in-time
-- snapshot.

BEGIN;

-- 1. Health checks (one row per probe per run)
CREATE TABLE IF NOT EXISTS service_health_checks (
    id          BIGSERIAL PRIMARY KEY,
    service     VARCHAR(64) NOT NULL,
    status      VARCHAR(16) NOT NULL CHECK (status IN ('operational', 'degraded', 'down')),
    latency_ms  INTEGER,
    detail      TEXT,
    checked_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_health_checks_service_time ON service_health_checks (service, checked_at DESC);

-- 2. Incidents (derived from consecutive non-operational checks)
CREATE TABLE IF NOT EXISTS service_incidents (
    id          BIGSERIAL PRIMARY KEY,
    service     VARCHAR(64) NOT NULL,
    status      VARCHAR(16) NOT NULL CHECK (status IN ('degraded', 'down')),
    started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    summary     TEXT
);
CREATE INDEX IF NOT EXISTS idx_incidents_service_time ON service_incidents (service, started_at DESC);

ALTER TABLE service_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_incidents ENABLE ROW LEVEL SECURITY;

-- The status page is public, so anonymous users may read it.
DROP POLICY IF EXISTS public_read_health_checks ON service_health_checks;
CREATE POLICY public_read_health_checks ON service_health_checks FOR SELECT USING (true);

DROP POLICY IF EXISTS public_read_incidents ON service_incidents;
CREATE POLICY public_read_incidents ON service_incidents FOR SELECT USING (true);

COMMIT;
