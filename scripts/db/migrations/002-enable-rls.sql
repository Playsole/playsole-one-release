-- Migration: Enable Row-Level Security for multi-tenant data isolation
-- Run this against existing databases created from the original 01-init.sql.
-- New databases created from the updated 01-init.sql will already include these changes.

BEGIN;

-- 1. Helper functions for setting and reading tenant context in RLS policies
CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.set_tenant_id(tenant_id UUID) RETURNS VOID AS $$
  SELECT set_config('app.current_tenant_id', tenant_id::text, true);
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION app.current_tenant_id() RETURNS UUID AS $$
  SELECT current_setting('app.current_tenant_id')::UUID;
$$ LANGUAGE SQL;

-- 2. Add tenant_id to authorization_codes (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'authorization_codes' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE authorization_codes ADD COLUMN tenant_id UUID REFERENCES tenants (id);
    UPDATE authorization_codes SET tenant_id = (SELECT id FROM tenants LIMIT 1);
    ALTER TABLE authorization_codes ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_authorization_codes_tenant_id ON authorization_codes (tenant_id);
  END IF;
END $$;

-- 3. Add tenant_id to audit_log (nullable as system-level events may not belong to a tenant)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_log' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE audit_log ADD COLUMN tenant_id UUID REFERENCES tenants (id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_id ON audit_log (tenant_id);
  END IF;
END $$;

-- 4. Enable RLS and create policies on each table
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON tenants;
CREATE POLICY tenant_isolation ON tenants
  USING (id = app.current_tenant_id());

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON users;
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = app.current_tenant_id());

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON clients;
CREATE POLICY tenant_isolation ON clients
  USING (tenant_id = app.current_tenant_id());

ALTER TABLE authorization_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON authorization_codes;
CREATE POLICY tenant_isolation ON authorization_codes
  USING (tenant_id = app.current_tenant_id());

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON audit_log;
CREATE POLICY tenant_isolation ON audit_log
  USING (tenant_id = app.current_tenant_id());

COMMIT;
