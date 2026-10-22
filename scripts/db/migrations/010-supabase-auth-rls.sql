-- Migration 010: Supabase Auth integration + JWT-based RLS
-- Adds auth_user_id to users, Supabase Auth tokens to sessions,
-- and rewrites RLS policies to enforce tenant isolation via JWT claims.

BEGIN;

-- 1. Add auth_user_id column to users (links to auth.users.id)
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

-- 2. Add Supabase Auth token columns to sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS supabase_access_token TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS supabase_refresh_token TEXT;

-- 3. Helper: extract tenant_id from Supabase Auth JWT
CREATE OR REPLACE FUNCTION app.jwt_tenant_id() RETURNS UUID AS $$
  SELECT (auth.jwt()->'app_metadata'->>'tenant_id')::UUID;
$$ LANGUAGE SQL STABLE;

-- 4. Rewrite RLS policies to use JWT claims
-- Tenants: users can only see their own tenant
DROP POLICY IF EXISTS tenant_isolation ON tenants;
CREATE POLICY tenant_isolation ON tenants
  USING (id = app.jwt_tenant_id());

-- Users: tenant-scoped via JWT
DROP POLICY IF EXISTS tenant_isolation ON users;
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = app.jwt_tenant_id());

-- Clients: tenant-scoped via JWT
DROP POLICY IF EXISTS tenant_isolation ON clients;
CREATE POLICY tenant_isolation ON clients
  USING (tenant_id = app.jwt_tenant_id());

-- Authorization codes: tenant-scoped via JWT
DROP POLICY IF EXISTS tenant_isolation ON authorization_codes;
CREATE POLICY tenant_isolation ON authorization_codes
  USING (tenant_id = app.jwt_tenant_id());

-- Audit log: tenant-scoped via JWT
DROP POLICY IF EXISTS tenant_isolation ON audit_log;
CREATE POLICY tenant_isolation ON audit_log
  USING (tenant_id = app.jwt_tenant_id());

-- Sessions: tenant-scoped via JWT
DROP POLICY IF EXISTS tenant_isolation ON sessions;
CREATE POLICY tenant_isolation ON sessions
  USING (tenant_id = app.jwt_tenant_id());

-- Refresh tokens: tenant-scoped via JWT
DROP POLICY IF EXISTS tenant_isolation ON refresh_tokens;
CREATE POLICY tenant_isolation ON refresh_tokens
  USING (tenant_id = app.jwt_tenant_id());

-- Profiles: tenant-scoped via JWT
DROP POLICY IF EXISTS tenant_isolation ON profiles;
CREATE POLICY tenant_isolation ON profiles
  USING (tenant_id = app.jwt_tenant_id());

-- Consents: tenant-scoped via JWT
DROP POLICY IF EXISTS tenant_isolation ON consents;
CREATE POLICY tenant_isolation ON consents
  USING (tenant_id = app.jwt_tenant_id());

-- 5. Verification tokens: user-scoped via JWT sub claim
DROP POLICY IF EXISTS tenant_isolation ON verification_tokens;
CREATE POLICY tenant_isolation ON verification_tokens
  USING (user_id = (auth.jwt()->>'sub')::UUID);

-- 6. Magic links: user-scoped via JWT sub claim
DROP POLICY IF EXISTS tenant_isolation ON magic_links;
CREATE POLICY tenant_isolation ON magic_links
  USING (user_id = (auth.jwt()->>'sub')::UUID);

-- 7. Record migration
INSERT INTO schema_migrations (version) VALUES ('010-supabase-auth-rls')
ON CONFLICT (version) DO NOTHING;

COMMIT;
