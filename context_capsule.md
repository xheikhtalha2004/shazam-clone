# System Design Capsule: SoundFind (Shazam Clone)

This capsule serves as a technical system architectural document for AI agents and developer reference. It outlines the design, database schemas, workflows, configuration variables, and core constraints of the SoundFind application.

---

## 1. System Architecture

SoundFind is organized as a decoupled monorepo folder layout but operates as **two separate Git repositories**:
1. **GitHub Monorepo Root (`/`)**: Hosts the Next.js Web App (`apps/web`), git-ignoring the backend. Deploy target is Vercel.
2. **Hugging Face Space Repository (`apps/matcher-api/`)**: A nested Git repository hosting the Python FastAPI Matcher Service. Deploy target is Hugging Face Spaces (running as a Docker container).

### Runtime Interaction Diagram

```
[Browser Client]
       │
       ├── (OAuth / Auth Session) ─────────────────────────► [Supabase Auth]
       │
       ├── (Record Sound) ────► [POST /api/admin/ingest] ───► [Next.js Route Proxy]
       │                        (or direct client requests)         │
       │                                                            │ (Injects ADMIN_API_KEY)
       │                                                            ▼
       ├──────────────────────► [POST /recognize] ──────────► [FastAPI Matcher Service]
       │                                                            │
       └── [Supabase Client] ◄──────────────────────────────────────┤ (Reads/Writes database
                                                                      via service_role key)
                                                                    ▼
                                                            [Supabase Postgres]
                                                            ├── tracks
                                                            ├── audio_fingerprints
                                                            ├── match_history
                                                            └── profiles
```

---

## 2. Database Schema (Supabase / PostgreSQL)

### `public.tracks`
Stores metadata for all indexed tracks.
```sql
CREATE TABLE tracks (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title         TEXT NOT NULL,
    artist        TEXT NOT NULL,
    album         TEXT,
    duration      INTEGER, -- in seconds
    audio_url     TEXT NOT NULL, -- storage bucket reference
    cover_url     TEXT,
    fingerprinted BOOLEAN NOT NULL DEFAULT FALSE,
    fingerprint_count INTEGER DEFAULT 0,
    created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `public.audio_fingerprints`
Stores the actual constellation map hashes for time-frequency peak landmarks.
```sql
CREATE TABLE audio_fingerprints (
    id            BIGSERIAL PRIMARY KEY,
    track_id      UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    hash          TEXT NOT NULL, -- 10-char SHA-1 hex snippet
    offset_time   INTEGER NOT NULL -- Anchor peak offset (in sample frames)
);
-- Crucial performance indices
CREATE INDEX idx_fingerprints_hash ON audio_fingerprints (hash);
CREATE INDEX idx_fingerprints_track_id ON audio_fingerprints (track_id);
```

### `public.match_history`
Tracks identification attempts.
```sql
CREATE TABLE match_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id    UUID REFERENCES tracks(id) ON DELETE SET NULL,
    confidence  DOUBLE PRECISION NOT NULL,
    matched     BOOLEAN NOT NULL,
    user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `public.profiles`
Handles user role segregation (Admin vs. Standard).
```sql
CREATE TABLE profiles (
    id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email      TEXT NOT NULL,
    role       TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 3. Core Algorithms & Logic

### Hashing / Fingerprinting (`apps/matcher-api/app/fingerprint.py`)
1. **Downsampling**: Audio is resampled to $11,025\text{ Hz}$ mono to retain low/mid-frequency fidelity while keeping processing light.
2. **Spectrogram**: Short-Time Fourier Transform (STFT) uses `n_fft=4096` and `hop_length=512`.
3. **Log Scale**: Power values are mapped to decibels.
4. **Asymmetric Constellation Map**: Local maxima are selected using a 2D filter (`scipy.ndimage.maximum_filter`) with an asymmetric neighborhood window size of `(50, 10)` (50 bins along the frequency axis, 10 frames along the time axis). This controls peak density by preventing redundant harmonic clusters in the frequency domain while capturing transients densely in the time domain.
5. **Combinatorial Hash Pairing**: Each peak (anchor) is matched against up to `15` subsequent peaks (targets) inside a localized target zone ($0 \le \Delta t \le 200$ frames).
6. **Hashing**: Formats: `hash = SHA-1(f_anchor | f_target | delta_t)[:10]`.

### Matching & Voting (`apps/matcher-api/app/matcher.py`)
1. Fingerprints generated from a query audio recording are looked up in the database.
2. **Offset Alignment (Wang 2003)**:
   For every matching hash in the database, calculate the offset differential:
   $$\Delta \text{offset} = \text{offset\_time}_{\text{database}} - \text{offset\_time}_{\text{query}}$$
3. **Neighborhood Voting / Smoothing**: Group results by `track_id` and calculate the votes utilizing a running window with a radius of $1$ frame ($\pm 1$ frame, representing $\approx \pm 46.4\text{ms}$). This aggregates matching peaks that are slightly shifted due to phase differences, microphone echo, and minor playback speed variation, preventing quantization noise from splitting votes.
4. **Winner Selection**: The track and offset bin with the highest neighborhood-smoothed vote count is declared the winner if:
   * $\text{Confidence} \ge 0.05$ (where $\text{Confidence} = \text{Aggregated Votes} / \text{Total Query Hashes}$)
   * $\text{Absolute Votes} \ge 5$

---

## 4. Key Constraints & History of Fixes

### Ingestion Limits (Vercel Serverless Timeouts)
* **Problem**: Large track ingestion (>3 minutes) requires heavy computing for resampling, spectrograms, peak detection, and batch insertion of up to 200,000+ hashes. This often exceeded Vercel's default Hobby limit of 10s.
* **Fix**: Re-routed direct operations to Hugging Face Spaces. Frontend `/api/admin/ingest` now enforces `maxDuration = 60` and forwards binary file streams straight to the Python backend to avoid processing on Vercel edge functions.

### Hugging Face HTTPX URL Length Limit
* **Problem**: In `matcher.py`, looking up all query hashes at once via `.in_("hash", hashes)` caused `httpx` to crash with `httpx.InvalidURL: URL component 'query' too long` when processing recordings longer than 5 seconds (generating thousands of hashes).
* **Fix**: Implemented hash deduplication and chunked SQL lookup batching (size `100` hashes per call) in `supabase_client.py` inside the Python backend to keep URLs compact.

### Monorepo Build Configuration (Vercel)
* **Problem**: Vercel deployment failed initially with `No such file or directory` when attempting to build the Next.js app because the monorepo root structure wasn't configured correctly in Vercel's build settings.
* **Fix**: Updated `vercel.json` to define the root directory build context correctly, ensuring monorepo dependencies compile cleanly.

### JSX Syntax Errors in Navbar React Component
* **Problem**: The mobile navigation hamburger menu was throwing JSX syntax compilation errors in Next.js builds due to orphaned nesting tags (`</div>`, `</nav>`) left behind during string replacement edits.
* **Fix**: Conducted a clean rewrite of `Navbar.tsx` to restore correct JSX nesting hierarchy and verified compiler compatibility via local `tsc --noEmit`.

### Subprocess / Library Decoders (ffmpeg)
* **Problem**: Librosa failed to parse `.webm` audio tracks recorded from browser media devices in environments missing platform-level multimedia codecs.
* **Fix**: Explicitly added `ffmpeg` and `libsndfile1` to the Hugging Face Docker image base layers in the Dockerfile.

---

## 5. Deployment Setup

* **Frontend**: Next.js app on Vercel. Root directory pointing to `apps/web`.
* **Backend**: Docker space on Hugging Face. Local folder is `apps/matcher-api/`. Run `git push` inside the `apps/matcher-api/` folder to update the Hugging Face space.
* **Database & Storage**: Managed on Supabase. Storage buckets `songs` and `snippets` must be present.

