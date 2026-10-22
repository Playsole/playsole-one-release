-- Migration: Add runtime tables and columns for PostgreSQL-backed stores
-- Run this against existing databases created from earlier 01-init.sql.
-- New databases created from the updated 01-init.sql will already include these.

BEGIN;

-- 1. Add columns to users table (if not present)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash') THEN
    ALTER TABLE users ADD COLUMN password_hash VARCHAR(256);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_verified') THEN
    ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone_verified') THEN
    ALTER TABLE users ADD COLUMN phone_verified BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- 2. Verification Tokens
CREATE TABLE IF NOT EXISTS verification_tokens (
    token       VARCHAR(128) PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type        VARCHAR(16) NOT NULL CHECK (type IN ('email', 'phone')),
    value       VARCHAR(256) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_id ON verification_tokens (user_id);

-- 3. Magic Link Tokens
CREATE TABLE IF NOT EXISTS magic_links (
    token       VARCHAR(128) PRIMARY KEY,
    email       VARCHAR(256) NOT NULL,
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_magic_links_user_id ON magic_links (user_id);

-- 4. Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    tenant_id   UUID NOT NULL REFERENCES tenants (id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_id ON sessions (tenant_id);
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON sessions;
CREATE POLICY tenant_isolation ON sessions USING (tenant_id = app.current_tenant_id());

-- 5. Refresh Tokens
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
DROP POLICY IF EXISTS tenant_isolation ON refresh_tokens;
CREATE POLICY tenant_isolation ON refresh_tokens USING (tenant_id = app.current_tenant_id());

-- 6. Profiles
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
DROP POLICY IF EXISTS tenant_isolation ON profiles;
CREATE POLICY tenant_isolation ON profiles USING (tenant_id = app.current_tenant_id());

-- 7. Consents
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
DROP POLICY IF EXISTS tenant_isolation ON consents;
CREATE POLICY tenant_isolation ON consents USING (tenant_id = app.current_tenant_id());

COMMIT;
