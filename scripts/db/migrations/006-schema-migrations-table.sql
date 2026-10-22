-- Migration: Schema migrations tracking table + exec_sql helper
-- Used by the application migration runner to track and apply migrations.

-- Helper function to execute dynamic SQL (service-role only).
CREATE OR REPLACE FUNCTION exec_sql(query TEXT) RETURNS VOID AS $func$
BEGIN
  EXECUTE query;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tracking table for applied migrations.
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     VARCHAR(64) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the table with migrations that were already applied manually.
INSERT INTO schema_migrations (version) VALUES
    ('001-drop-user-identities'),
    ('002-enable-rls'),
    ('003-add-runtime-tables'),
    ('004-add-profile-email-verified'),
    ('005-add-with-check')
ON CONFLICT (version) DO NOTHING;
