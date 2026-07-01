-- ============================================================
-- Migration 001: tracks table
-- Stores metadata for every song indexed in the catalogue.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE tracks (
    -- UUID primary key, generated automatically
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core song metadata
    title         TEXT        NOT NULL,
    artist        TEXT        NOT NULL,
    album         TEXT,                             -- optional
    duration      INTEGER,                          -- duration in seconds

    -- Supabase Storage paths / public URLs
    audio_url     TEXT        NOT NULL,             -- path in "songs" bucket
    cover_url     TEXT,                             -- path in "covers" bucket (optional)

    -- Processing state
    fingerprinted BOOLEAN     NOT NULL DEFAULT FALSE,
    fingerprint_count INTEGER DEFAULT 0,           -- how many hashes stored

    -- Audit fields
    created_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for listing by newest first
CREATE INDEX idx_tracks_created_at ON tracks (created_at DESC);

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- Anyone (authenticated or anonymous) can read tracks
CREATE POLICY "Public: anyone can read tracks"
    ON tracks FOR SELECT
    USING (TRUE);

-- ── Placeholder admin policies (profiles table doesn't exist yet) ──────────
-- These are intentionally locked down to FALSE.
-- The real role-checking policies are created at the end of 004_profiles.sql
-- after the profiles table has been created.

CREATE POLICY "Admin: can insert tracks"
    ON tracks FOR INSERT
    WITH CHECK (FALSE);   -- replaced in 004_profiles.sql

CREATE POLICY "Admin: can update tracks"
    ON tracks FOR UPDATE
    USING (FALSE);        -- replaced in 004_profiles.sql

CREATE POLICY "Admin: can delete tracks"
    ON tracks FOR DELETE
    USING (FALSE);        -- replaced in 004_profiles.sql

-- Service role bypass (Python backend writes fingerprint_count back)
-- The service role key bypasses RLS by default in Supabase.
