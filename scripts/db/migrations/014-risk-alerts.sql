-- Migration 014: Risk alerts persisted in Postgres (Phase 4 / M1)
-- Suspicious-activity alerts were previously kept in gateway memory; they are
-- now durable rows owned by the user, read on the security page.

BEGIN;

CREATE TABLE IF NOT EXISTS risk_alerts (
    id           UUID PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    tenant_id    UUID REFERENCES tenants (id),
    signals      TEXT[] NOT NULL DEFAULT '{}',
    device_label VARCHAR(128) NOT NULL DEFAULT 'Web browser',
    at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    seen         BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_risk_alerts_user_id_at ON risk_alerts (user_id, at DESC);

ALTER TABLE risk_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON risk_alerts;
CREATE POLICY tenant_isolation ON risk_alerts
    USING (user_id = (auth.jwt()->>'sub')::UUID);

INSERT INTO schema_migrations (version) VALUES ('014-risk-alerts')
ON CONFLICT (version) DO NOTHING;

COMMIT;