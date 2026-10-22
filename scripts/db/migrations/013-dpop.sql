-- Migration 013: DPoP (sender-constrained access tokens) support (Phase 3)
-- Marks OAuth clients as requiring DPoP proof-of-possession at the token
-- endpoint and userinfo so their access tokens are bound to a client key.

BEGIN;

ALTER TABLE clients ADD COLUMN IF NOT EXISTS requires_dpop BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO schema_migrations (version) VALUES ('013-dpop')
ON CONFLICT (version) DO NOTHING;

COMMIT;