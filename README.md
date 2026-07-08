# SoundFind 🎵

> **A local-first Shazam-like web app.** Record 5–8 seconds of any song and identify it from your own indexed music catalogue using audio fingerprinting.

---

## Technical Architecture & Design Capsule
For an in-depth blueprint of the databases, mathematical hashing logic (spectrogram constellation maps), security rules, and historic bug resolutions (like Vercel timeouts and API url limit fixes), refer to **[context_capsule.md](file:///c:/Work/Internship%20CapregSoft/Shazam%20Clone/context_capsule.md)** in the root folder.

---

## Git Repository Structure

This project uses a split-repository structure to host the Next.js frontend and Python backend independently:

1. **GitHub Monorepo Root (`/`)**: Hosts the Next.js Web App (`apps/web`). The backend directory is ignored (`.gitignore`). Deploy target is Vercel.
2. **Hugging Face Space Repository (`apps/matcher-api/`)**: A nested Git repository hosting the Python FastAPI Matcher Service. Deploy target is Hugging Face Spaces (running via Docker).

> [!IMPORTANT]
> The server files in `apps/matcher-api/` are tracked in a separate Hugging Face Spaces git repository. To make server updates or deploy the API, navigate inside the subdirectory to push your changes:
> ```bash
> cd apps/matcher-api
> git status
> git add .
> git commit -m "update server code"
> git push origin main
> ```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 App Router · TypeScript · Vanilla CSS |
| **Auth + DB + Storage** | Supabase (Postgres + Auth + Storage) |
| **Fingerprinting API** | Python FastAPI · librosa · numpy · scipy |
| **Frontend Deployment** | Vercel |
| **Backend Deployment** | Hugging Face Spaces (Docker) |

---

## Runtime Interaction Flows

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
```

---

## Local Setup

### Prerequisites
- **Node.js** 18+ — [nodejs.org](https://nodejs.org)
- **Python** 3.11+ — [python.org](https://python.org)
- **ffmpeg** — required for audio decoding (librosa/audioread backend)
  - Windows: `winget install ffmpeg`
  - macOS: `brew install ffmpeg`
  - Linux: `sudo apt install ffmpeg`
- A **Supabase** project (free tier works)

---

### 1. Database Configuration
1. Create a project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** and run the migration scripts in the order they appear inside the `supabase/migrations/` directory:
   * `001_tracks.sql`
   * `002_fingerprints.sql`
   * `003_match_history.sql`
   * `004_profiles.sql`
3. Under **Storage**, create three buckets:
   * `songs` (Private)
   * `covers` (Public)
   * `snippets` (Private)
4. Create an admin user: Sign up in the application, then run the SQL below to grant admin privileges:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE id = 'YOUR-USER-UUID';
   ```

---

### 2. Next.js Frontend Setup (`apps/web`)
1. Navigate to the web folder and install dependencies:
   ```bash
   cd apps/web
   npm install
   ```
2. Copy `.env.example` to `.env.local` and enter your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_MATCHER_API_URL=http://localhost:8000
   NEXT_PUBLIC_MATCHER_API_KEY=your-admin-api-key
   MATCHER_API_URL=http://localhost:8000
   ADMIN_API_KEY=your-admin-api-key
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

---

### 3. Python Backend Setup (`apps/matcher-api`)
1. Pull the backend code from Hugging Face if cloning for the first time:
   ```bash
   cd apps/matcher-api
   git init
   git remote add origin https://huggingface.co/spaces/YOUR_HF_USERNAME/YOUR_SPACE_NAME
   git fetch origin
   git checkout -b main --track origin/main --force
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy `.env.example` to `.env` and fill in configuration variables:
   ```env
   SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ADMIN_API_KEY=your-admin-api-key
   ALLOWED_ORIGINS=http://localhost:3000
   ```
5. Launch the FastAPI server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

---

## Production Deployments

### Backend (Hugging Face Spaces)
The backend is packaged as a Docker container. Deploy updates by pushing changes to the Hugging Face main branch:
```bash
cd apps/matcher-api
git add .
git commit -m "feat: updates"
git push origin main
```
Hugging Face will automatically detect the Dockerfile, build the image, and host it at `https://YOUR_HF_USERNAME-YOUR_SPACE_NAME.hf.space`.

### Frontend (Vercel)
Import the main GitHub repository into Vercel and configure the root directory to `apps/web`. Add the environment variables defined in `.env.local` to Vercel's project dashboard.
