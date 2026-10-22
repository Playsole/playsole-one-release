-- Migration 017: Developer Apps & Role-Based Access Control
-- Adds owner_user_id and app_name to clients table
-- Adds role to users table for developer_admin privilege delegation

BEGIN;

-- 1. Ensure role column exists on users table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
    ALTER TABLE users ADD COLUMN role VARCHAR(32) NOT NULL DEFAULT 'user';
  END IF;
END $$;

-- 2. Ensure owner_user_id and app_name exist on clients table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'owner_user_id') THEN
    ALTER TABLE clients ADD COLUMN owner_user_id UUID REFERENCES users (id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'app_name') THEN
    ALTER TABLE clients ADD COLUMN app_name VARCHAR(128);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clients_owner_user_id ON clients (owner_user_id);

COMMIT;
