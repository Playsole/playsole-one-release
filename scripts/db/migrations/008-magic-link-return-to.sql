-- Migration: Persist the post-login redirect on magic links.
-- The gateway previously stored pending magic-link return state in an in-memory
-- map (lost on restart). Store it on the row instead so a magic link survives a
-- restart and redirects to the intended destination.
ALTER TABLE magic_links ADD COLUMN IF NOT EXISTS return_to TEXT;