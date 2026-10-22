-- Migration: Add email_verified column to profiles table
BEGIN;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
