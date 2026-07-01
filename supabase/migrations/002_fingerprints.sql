-- ============================================================
-- Migration 002: audio_fingerprints table
-- Stores constellation-map landmark hashes for each track.
-- Written exclusively by the Python backend (service role).
-- ============================================================

CREATE TABLE audio_fingerprints (
    -- Auto-incrementing integer PK for compact storage
    id            BIGSERIAL   PRIMARY KEY,

    -- Foreign key back to the parent track
    track_id      UUID        NOT NULL
                    REFERENCES tracks(id) ON DELETE CASCADE,

    -- SHA-1 hex hash encoding (f_anchor, f_target, delta_t)
    -- Exactly 10 hex chars (40-bit truncated hash for fast lookup)
    hash          TEXT        NOT NULL,

    -- Time offset of the anchor peak from the start of the track, in samples
    -- Using sample units (not seconds) preserves precision for matching
    offset_time   INTEGER     NOT NULL
);

-- ── Critical performance index ──────────────────────────────
-- The identify endpoint queries WHERE hash = ANY($1) — this index
-- makes that lookup O(log n) instead of O(n).
CREATE INDEX idx_fingerprints_hash ON audio_fingerprints (hash);

-- Secondary index for bulk deletes when re-fingerprinting a track
CREATE INDEX idx_fingerprints_track_id ON audio_fingerprints (track_id);

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE audio_fingerprints ENABLE ROW LEVEL SECURITY;

-- Only the service role (Python backend) can read/write fingerprints.
-- No end-user should ever query this table directly.
CREATE POLICY "Service role only: read fingerprints"
    ON audio_fingerprints FOR SELECT
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role only: insert fingerprints"
    ON audio_fingerprints FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role only: delete fingerprints"
    ON audio_fingerprints FOR DELETE
    USING (auth.role() = 'service_role');
