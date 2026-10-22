-- Migration: Drop user_identities table
-- Social login and account linking have been removed from scope.
-- This table exists in databases created from the original 01-init.sql.
-- Run this only if the table exists.

BEGIN;

DROP TABLE IF EXISTS user_identities;

COMMIT;
