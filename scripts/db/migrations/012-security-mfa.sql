-- Migration 012: Security & MFA infrastructure (Phase 3)
-- Adds MFA factor tables (TOTP, WebAuthn, backup codes), login attempt tracking,
-- device tracking, MFA challenge storage, MFA enforcement policies, session
-- enrichment columns, and account recovery tokens.

BEGIN;

-- 1. Users: lockout + failed-attempt bookkeeping
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- 2. Sessions: enrich for session management UI, device detection, DPoP
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS client_id VARCHAR(128);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS token_type VARCHAR(32) NOT NULL DEFAULT 'bearer'
    CHECK (token_type IN ('bearer', 'dpop'));
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT '{}';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS mfa_passed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

-- 3. TOTP secrets (one row per authenticator enrollment)
CREATE TABLE IF NOT EXISTS totp_secrets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    secret      VARCHAR(128) NOT NULL,
    name        VARCHAR(128) NOT NULL DEFAULT 'Authenticator app',
    verified    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_totp_secrets_user_id ON totp_secrets (user_id);

-- 4. WebAuthn / passkey credentials
CREATE TABLE IF NOT EXISTS webauthn_credentials (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    credential_id VARCHAR(512) NOT NULL UNIQUE,
    public_key    TEXT NOT NULL,
    counter       BIGINT NOT NULL DEFAULT 0,
    device_label  VARCHAR(128) NOT NULL DEFAULT 'Security key',
    transports    TEXT[] NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_webauthn_user_id ON webauthn_credentials (user_id);

-- 5. Backup / recovery codes (single-use, stored as SHA-256 hashes)
CREATE TABLE IF NOT EXISTS backup_codes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    code_hash   VARCHAR(128) NOT NULL,
    used        BOOLEAN NOT NULL DEFAULT FALSE,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_backup_codes_user_id ON backup_codes (user_id);

-- 6. Login attempt tracking (for lockout + suspicious activity)
CREATE TABLE IF NOT EXISTS login_attempts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users (id) ON DELETE CASCADE,
    tenant_id           UUID REFERENCES tenants (id),
    identifier          VARCHAR(256),
    success             BOOLEAN NOT NULL DEFAULT FALSE,
    reason              VARCHAR(64),
    ip_address          INET,
    user_agent          TEXT,
    device_fingerprint  VARCHAR(128),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id_time ON login_attempts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier_time ON login_attempts (identifier, created_at DESC);

-- Backfill for databases where 012 ran before the tenant_id column was added.
ALTER TABLE login_attempts ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants (id);

-- 7. Devices (history for suspicious-activity detection + device management)
CREATE TABLE IF NOT EXISTS devices (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    fingerprint   VARCHAR(128) NOT NULL,
    label         VARCHAR(128) NOT NULL DEFAULT 'Device',
    user_agent    TEXT,
    ip_address    INET,
    country       VARCHAR(8),
    city          VARCHAR(128),
    trusted       BOOLEAN NOT NULL DEFAULT FALSE,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, fingerprint)
);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices (user_id);

-- 8. MFA challenges (WebAuthn registration/authentication handshakes)
CREATE TABLE IF NOT EXISTS mfa_challenges (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users (id) ON DELETE CASCADE,
    challenge   VARCHAR(128) NOT NULL UNIQUE,
    kind        VARCHAR(32) NOT NULL CHECK (kind IN ('registration', 'authentication')),
    payload     JSONB DEFAULT '{}',
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mfa_challenges_user_id ON mfa_challenges (user_id);

-- 9. MFA enforcement policies (optional vs required, per app/tenant).
--    A row with client_id NULL sets the tenant-wide default for all clients.
CREATE TABLE IF NOT EXISTS mfa_policies (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
    client_id   VARCHAR(128),
    required    BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, client_id)
);
CREATE INDEX IF NOT EXISTS idx_mfa_policies_tenant ON mfa_policies (tenant_id);

-- 10. Recovery tokens (email-based account recovery, single-use, hashed)
CREATE TABLE IF NOT EXISTS recovery_tokens (
    token       VARCHAR(128) PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recovery_tokens_user_id ON recovery_tokens (user_id);

-- 11. RLS policies (consistent with the JWT-scoped approach in migration 010;
--     the service-role client bypasses these, so they are defense-in-depth)
ALTER TABLE totp_secrets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON totp_secrets;
CREATE POLICY tenant_isolation ON totp_secrets
    USING (user_id = (auth.jwt()->>'sub')::UUID);

ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON webauthn_credentials;
CREATE POLICY tenant_isolation ON webauthn_credentials
    USING (user_id = (auth.jwt()->>'sub')::UUID);

ALTER TABLE backup_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON backup_codes;
CREATE POLICY tenant_isolation ON backup_codes
    USING (user_id = (auth.jwt()->>'sub')::UUID);

ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON login_attempts;
CREATE POLICY tenant_isolation ON login_attempts
    USING (user_id = (auth.jwt()->>'sub')::UUID);

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON devices;
CREATE POLICY tenant_isolation ON devices
    USING (user_id = (auth.jwt()->>'sub')::UUID);

ALTER TABLE mfa_challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON mfa_challenges;
CREATE POLICY tenant_isolation ON mfa_challenges
    USING (user_id = (auth.jwt()->>'sub')::UUID);

ALTER TABLE mfa_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON mfa_policies;
CREATE POLICY tenant_isolation ON mfa_policies
    USING (tenant_id = app.jwt_tenant_id());

ALTER TABLE recovery_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON recovery_tokens;
CREATE POLICY tenant_isolation ON recovery_tokens
    USING (user_id = (auth.jwt()->>'sub')::UUID);

-- 12. Record migration
INSERT INTO schema_migrations (version) VALUES ('012-security-mfa')
ON CONFLICT (version) DO NOTHING;

COMMIT;