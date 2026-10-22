-- Playsole One — Full Data Wipe
-- Truncates all application data while preserving schema, RLS policies, and seed data.
-- Run this to reset the database to a clean state.

BEGIN;

-- Disable triggers temporarily to avoid FK constraint issues during truncation
-- Delete in reverse dependency order (children first, parents last)

DELETE FROM refresh_tokens;
DELETE FROM sessions;
DELETE FROM authorization_codes;
DELETE FROM consents;
DELETE FROM verification_tokens;
DELETE FROM magic_links;
DELETE FROM audit_log;
DELETE FROM profiles;
DELETE FROM users;
DELETE FROM clients;
DELETE FROM tenants;

-- Re-seed default tenant
INSERT INTO tenants (id, slug, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'default', 'Default Tenant')
ON CONFLICT (slug) DO NOTHING;

COMMIT;
