-- Migration 015: Enable row level security on tables whose policies were
-- created without RLS being turned on, so anon/authenticated PostgREST access
-- is denied or restricted. The app only uses the service role (which bypasses
-- RLS), so this is purely a tightening of direct client access.

BEGIN;

-- magic_links and verification_tokens already have the tenant_isolation
-- policy (migration 010) scoping rows to the owning user via the JWT sub.
ALTER TABLE magic_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;

-- schema_migrations has no policies, so enabling RLS denies anon/authenticated
-- access entirely while the service role (migration runner) is unaffected.
ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;

INSERT INTO schema_migrations (version) VALUES ('015-rls-enable')
ON CONFLICT (version) DO NOTHING;

COMMIT;