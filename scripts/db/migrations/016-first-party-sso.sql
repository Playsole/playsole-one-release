-- Migration 016: First-party SSO and cross-device session handoff
-- Supports Phase 7 One Account Across Playsole Apps

BEGIN;

-- 1. Support first-party client designation for bypass of third-party consent screens
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'first_party') THEN
    ALTER TABLE clients ADD COLUMN first_party BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$;

-- Update canonical dev client to first_party
UPDATE clients SET first_party = TRUE WHERE client_id = 'playsole-dev';

-- 2. SSO Cross-Device Session Handoff Tokens (Item 64)
CREATE TABLE IF NOT EXISTS sso_handoff_tokens (
    token       VARCHAR(128) PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    tenant_id   UUID NOT NULL REFERENCES tenants (id),
    claimed     BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sso_handoff_user_id ON sso_handoff_tokens (user_id);
ALTER TABLE sso_handoff_tokens ENABLE ROW LEVEL SECURITY;

INSERT INTO schema_migrations (version) VALUES ('016-first-party-sso')
ON CONFLICT (version) DO NOTHING;

COMMIT;
