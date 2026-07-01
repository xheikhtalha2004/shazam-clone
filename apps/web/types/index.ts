// Shared TypeScript types for the SoundFind web application.
// Import these in pages, components, and API routes.

// ── Track (song) ──────────────────────────────────────────────────────────────

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  duration: number | null;        // seconds
  audio_url: string;
  cover_url: string | null;
  fingerprinted: boolean;
  fingerprint_count: number;
  created_by: string | null;
  created_at: string;             // ISO 8601
}

// ── Match history ─────────────────────────────────────────────────────────────

export interface MatchHistoryItem {
  id: string;
  user_id: string | null;
  track_id: string | null;
  confidence: number;             // 0.0 – 1.0
  matched: boolean;
  matched_at: string;             // ISO 8601
  session_id: string | null;
  // Joined track data (when fetched with a select)
  tracks?: Track | null;
}

// ── User profile ──────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  role: 'user' | 'admin';
}

// ── Recognition API response ──────────────────────────────────────────────────

export interface RecognizeResult {
  matched: true;
  track: {
    id: string;
    title: string;
    artist: string;
    album: string | null;
    cover_url: string | null;
    audio_url: string | null;
    duration: number | null;
  };
  confidence: number;
  processing_time_seconds: number;
}

export interface RecognizeNoMatch {
  matched: false;
  message: string;
}

export type RecognizeResponse = RecognizeResult | RecognizeNoMatch;

// ── Admin ingest API response ─────────────────────────────────────────────────

export interface IngestResponse {
  track_id: string;
  title: string;
  artist: string;
  fingerprint_count: number;
  duration_seconds: number | null;
  processing_time_seconds: number;
}

// ── Form state ────────────────────────────────────────────────────────────────

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';
