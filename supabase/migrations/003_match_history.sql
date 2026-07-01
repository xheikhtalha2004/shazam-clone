-- ============================================================
-- Migration 003: match_history table
-- Records every recognition attempt, linked to a user (optional).
-- ============================================================

CREATE TABLE match_history (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Nullable: anonymous users can still get results, just not saved to a user
    user_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,

    -- The track that was matched (nullable for no-match events)
    track_id      UUID        REFERENCES tracks(id) ON DELETE SET NULL,

    -- Confidence score from the matcher (0.0 – 1.0)
    confidence    FLOAT       NOT NULL DEFAULT 0.0,

    -- True if a match was found; False for "no match" events
    matched       BOOLEAN     NOT NULL DEFAULT FALSE,

    -- When the match occurred
    matched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Anonymous session identifier for users not logged in
    session_id    TEXT
);

-- Index for fetching a user's history sorted by most recent
CREATE INDEX idx_match_history_user_id ON match_history (user_id, matched_at DESC);

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;

-- Authenticated users can only read their own history
CREATE POLICY "Users: read own match history"
    ON match_history FOR SELECT
    USING (
        auth.uid() = user_id
        -- Allow anonymous reads via session_id if needed (extend later)
    );

-- Authenticated users can insert their own match records
CREATE POLICY "Users: insert own match history"
    ON match_history FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        OR user_id IS NULL  -- allow anonymous inserts
    );

-- Service role can do anything (Python backend writes results)
-- Service role bypasses RLS by default in Supabase.
