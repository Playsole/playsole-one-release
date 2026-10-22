-- Playsole One — PostgreSQL Schema
-- Core identity tables (tenants, users, clients, authorization_codes, audit_log)
-- Includes Row-Level Security for multi-tenant data isolation

BEGIN;

-- 1. Tenants
CREATE TABLE IF NOT EXISTS tenants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        VARCHAR(64) UNIQUE NOT NULL,
    name        VARCHAR(256) NOT NULL,
    domain      VARCHAR(256),
    config      JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants (slug);

-- 2. Users
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    primary_email   VARCHAR(256),
    primary_phone   VARCHAR(32),
    display_name    VARCHAR(128) NOT NULL,
    avatar_url      TEXT,
    locale          VARCHAR(8) NOT NULL DEFAULT 'en',
    password_hash   VARCHAR(256),
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    phone_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_methods     JSONB DEFAULT '[]',
    status          VARCHAR(32) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'suspended', 'disabled')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users (tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_primary_email ON users (primary_email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users (status);

-- 3. OAuth Clients
CREATE TABLE IF NOT EXISTS clients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    client_id       VARCHAR(128) UNIQUE NOT NULL,
    client_secret   VARCHAR(256),  -- hashed; NULL for public clients
    redirect_uris   TEXT[] NOT NULL DEFAULT '{}',
    grant_types     TEXT[] NOT NULL DEFAULT '{authorization_code,refresh_token}',
    scopes          TEXT[] NOT NULL DEFAULT '{openid,profile,email}',
    public_client   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON clients (tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_client_id ON clients (client_id);

-- 4. Authorization Codes (short-lived, single-use)
CREATE TABLE IF NOT EXISTS authorization_codes (
    code            VARCHAR(128) PRIMARY KEY,
    client_id       VARCHAR(128) NOT NULL,
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants (id),
    code_challenge  VARCHAR(256) NOT NULL,
    code_method     VARCHAR(8) NOT NULL DEFAULT 'S256'
                        CHECK (code_method IN ('S256', 'plain')),
    scopes          TEXT[] NOT NULL DEFAULT '{openid}',
    redirect_uri    TEXT NOT NULL,
    state           TEXT,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_authorization_codes_user_id ON authorization_codes (user_id);
CREATE INDEX IF NOT EXISTS idx_authorization_codes_tenant_id ON authorization_codes (tenant_id);
CREATE INDEX IF NOT EXISTS idx_authorization_codes_expires ON authorization_codes (expires_at);

-- 5. Audit Log (append-only)
CREATE TABLE IF NOT EXISTS audit_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type  VARCHAR(64) NOT NULL,
    user_id     UUID,
    client_id   VARCHAR(128),
    tenant_id   UUID REFERENCES tenants (id),
    ip_address  INET,
    user_agent  TEXT,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON audit_log (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_id ON audit_log (tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at);

-- Enforce append-only: revoke UPDATE/DELETE from public
REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;

-- If you use a dedicated application role, grant INSERT only:
-- CREATE ROLE playsole_app NOINHERIT;
-- GRANT INSERT ON audit_log TO playsole_app;
-- REVOKE UPDATE, DELETE ON audit_log FROM playsole_app;

-- 6. Seed default tenant
INSERT INTO tenants (id, slug, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'default', 'Default Tenant')
ON CONFLICT (slug) DO NOTHING;

-- 7. Row-Level Security setup
CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.set_tenant_id(tenant_id UUID) RETURNS VOID AS $$
  SELECT set_config('app.current_tenant_id', tenant_id::text, true);
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION app.current_tenant_id() RETURNS UUID AS $$
  SELECT current_setting('app.current_tenant_id')::UUID;
$$ LANGUAGE SQL;

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tenants
  USING (id = app.current_tenant_id())
  WITH CHECK (id = app.current_tenant_id());

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON clients
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE authorization_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON authorization_codes
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON audit_log
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

-- 8. Verification Tokens
CREATE TABLE IF NOT EXISTS verification_tokens (
    token       VARCHAR(128) PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type        VARCHAR(16) NOT NULL CHECK (type IN ('email', 'phone')),
    value       VARCHAR(256) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_id ON verification_tokens (user_id);

-- 9. Magic Link Tokens
CREATE TABLE IF NOT EXISTS magic_links (
    token       VARCHAR(128) PRIMARY KEY,
    email       VARCHAR(256) NOT NULL,
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    return_to   TEXT,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_magic_links_user_id ON magic_links (user_id);

-- 10. Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    tenant_id   UUID NOT NULL REFERENCES tenants (id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_id ON sessions (tenant_id);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON sessions
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

-- 11. Refresh Tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    token       VARCHAR(128) PRIMARY KEY,
    session_id  UUID NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
    tenant_id   UUID NOT NULL REFERENCES tenants (id),
    family      VARCHAR(64) NOT NULL,
    sequence    INTEGER NOT NULL DEFAULT 1,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_session_id ON refresh_tokens (session_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_tenant_id ON refresh_tokens (tenant_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens (family);

ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON refresh_tokens
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

-- 12. Profiles
CREATE TABLE IF NOT EXISTS profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID UNIQUE NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants (id),
    email           VARCHAR(256) NOT NULL,
    display_name    VARCHAR(128) NOT NULL,
    avatar_url      TEXT,
    locale          VARCHAR(8) NOT NULL DEFAULT 'en',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles (tenant_id);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON profiles
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

-- 13. Consents
CREATE TABLE IF NOT EXISTS consents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    tenant_id   UUID NOT NULL REFERENCES tenants (id),
    client_id   VARCHAR(128) NOT NULL,
    scopes      TEXT[] NOT NULL DEFAULT '{}',
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_consents_user_id ON consents (user_id);
CREATE INDEX IF NOT EXISTS idx_consents_tenant_id ON consents (tenant_id);

ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON consents
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

-- 14. Migration runner bootstrap
-- exec_sql + schema_migrations let the app's migration runner apply pending
-- .sql files on startup. SECURITY DEFINER SQL exec is restricted here and in
-- migrations/007 so only the service_role (server-side) can call it.

CREATE OR REPLACE FUNCTION exec_sql(query TEXT) RETURNS VOID AS $func$
BEGIN
  EXECUTE query;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION exec_sql(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION exec_sql(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION exec_sql(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;

CREATE TABLE IF NOT EXISTS schema_migrations (
    version     VARCHAR(64) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO schema_migrations (version) VALUES
    ('001-drop-user-identities'),
    ('002-enable-rls'),
    ('003-add-runtime-tables'),
    ('004-add-profile-email-verified'),
    ('005-add-with-check')
ON CONFLICT (version) DO NOTHING;

COMMIT;
