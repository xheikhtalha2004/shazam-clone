"""
main.py
=======
FastAPI application entry point for the SoundFind Matcher API.

Endpoints:
  GET  /health                  → health check (no auth)
  POST /admin/ingest-track      → upload + fingerprint a song (admin key required)
  POST /recognize               → identify a short audio recording (admin key required)

Security:
  All endpoints except /health require the X-Admin-Api-Key header,
  validated against the ADMIN_API_KEY environment variable.
"""

import logging
import os
import tempfile
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import librosa
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.fingerprint import generate_fingerprints
from app.matcher import match_audio
from app.supabase_client import (
    create_track,
    delete_fingerprints_for_track,
    get_track_by_id,
    insert_fingerprints,
    mark_track_fingerprinted,
    save_match_history,
)

# ── Setup ──────────────────────────────────────────────────────────────────────
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ADMIN_API_KEY: str = os.environ.get("ADMIN_API_KEY", "")
ALLOWED_ORIGINS: list[str] = os.environ.get(
    "ALLOWED_ORIGINS", "http://localhost:3000"
).split(",")

# Supported audio MIME types (what browsers send via MediaRecorder)
ALLOWED_AUDIO_TYPES = {
    "audio/webm",
    "audio/webm;codecs=opus",
    "audio/ogg",
    "audio/ogg;codecs=opus",
    "audio/mp4",
    "audio/mpeg",
    "audio/wav",
    "audio/x-wav",
    "audio/flac",
}

# Supported file extensions for admin uploads
ALLOWED_EXTENSIONS = {".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac", ".webm"}

# Max request body size (30 MB)
MAX_UPLOAD_BYTES = 30 * 1024 * 1024


# ── App factory ────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("SoundFind Matcher API starting up")
    yield
    logger.info("SoundFind Matcher API shutting down")


app = FastAPI(
    title="SoundFind Matcher API",
    description="Audio fingerprinting and recognition service",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)


# ── Auth dependency ────────────────────────────────────────────────────────────
def require_admin_key(x_admin_api_key: str = Header(..., alias="x-admin-api-key")) -> None:
    """
    FastAPI dependency that validates the X-Admin-Api-Key header.

    Raises 403 if the key is missing or incorrect.
    """
    if not ADMIN_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server misconfiguration: ADMIN_API_KEY is not set.",
        )
    if x_admin_api_key != ADMIN_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing API key.",
        )


# ── Helper ─────────────────────────────────────────────────────────────────────
def _validate_audio_extension(filename: str) -> None:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported audio format: '{ext}'. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
        )


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/", tags=["System"])
async def root():
    """Welcome and status endpoint."""
    return {
        "status": "online",
        "service": "SoundFind Matcher API",
        "health_check": "/health",
        "documentation": "/docs",
    }


@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint — used by Render and uptime monitors."""
    return {"status": "ok", "service": "soundfind-matcher-api"}


@app.post(
    "/admin/ingest-track",
    tags=["Admin"],
    dependencies=[Depends(require_admin_key)],
    summary="Upload and fingerprint a new track",
)
async def ingest_track(
    title: str = Form(..., description="Song title"),
    artist: str = Form(..., description="Artist name"),
    album: Optional[str] = Form(None, description="Album name (optional)"),
    audio_file: UploadFile = File(..., description="Audio file (mp3, wav, flac, m4a, ogg, aac)"),
):
    """
    Ingest a new track into the catalogue:
      1. Validate file type and size
      2. Save to a temp file
      3. Measure duration
      4. Insert a track record in Supabase
      5. Generate fingerprints
      6. Store fingerprints in Supabase
      7. Mark track as fingerprinted
      8. Clean up temp file
    """
    start = time.perf_counter()

    # Validate extension
    _validate_audio_extension(audio_file.filename or "unknown")

    # Read file bytes
    audio_bytes = await audio_file.read()
    if len(audio_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum allowed: {MAX_UPLOAD_BYTES // (1024*1024)} MB",
        )

    ext = Path(audio_file.filename or "audio.mp3").suffix.lower()

    # Write to a named temp file (librosa/ffmpeg needs a real path)
    tmp_path: Optional[str] = None
    try:
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        # Measure duration using librosa
        try:
            duration_seconds = int(librosa.get_duration(path=tmp_path))
        except Exception:
            duration_seconds = None

        # Create the track record in Supabase
        # audio_url is a placeholder — in production, upload to Supabase Storage first
        audio_url = f"uploads/{title.replace(' ', '_')}_{artist.replace(' ', '_')}{ext}"
        track = create_track(
            title=title,
            artist=artist,
            album=album,
            duration_seconds=duration_seconds,
            audio_url=audio_url,
        )
        track_id = track["id"]
        logger.info("Track created: id=%s", track_id)

        # Generate fingerprints
        fingerprints = generate_fingerprints(tmp_path)

        # Store fingerprints in Supabase
        count = insert_fingerprints(track_id, fingerprints)

        # Mark track as fingerprinted
        mark_track_fingerprinted(track_id, count)

    finally:
        # Always clean up the temp file
        if tmp_path and Path(tmp_path).exists():
            Path(tmp_path).unlink(missing_ok=True)

    elapsed = round(time.perf_counter() - start, 2)
    logger.info("Ingest complete for track %s in %.2fs", track_id, elapsed)

    return {
        "track_id": track_id,
        "title": title,
        "artist": artist,
        "fingerprint_count": count,
        "duration_seconds": duration_seconds,
        "processing_time_seconds": elapsed,
    }


@app.post(
    "/recognize",
    tags=["Recognition"],
    dependencies=[Depends(require_admin_key)],
    summary="Identify a short audio recording",
)
async def recognize(
    audio_file: UploadFile = File(..., description="Short audio clip (5–10 seconds)"),
    user_id: Optional[str] = Form(None, description="Authenticated user UUID (optional)"),
    session_id: Optional[str] = Form(None, description="Anonymous session ID (optional)"),
):
    """
    Identify a song from a short audio recording:
      1. Validate and read the audio file
      2. Run the matcher
      3. If matched, fetch track metadata
      4. Optionally save match history
      5. Return JSON response
      6. Clean up temp file
    """
    start = time.perf_counter()

    # Read audio bytes
    audio_bytes = await audio_file.read()
    if len(audio_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Recording too large. Maximum 30 MB.",
        )

    if len(audio_bytes) < 1000:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Audio clip is too short or empty.",
        )

    # Write to temp file for librosa
    ext = Path(audio_file.filename or "clip.webm").suffix.lower() or ".webm"
    tmp_path: Optional[str] = None

    try:
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        # Run matcher
        result = await match_audio(tmp_path or audio_bytes)

    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    finally:
        if tmp_path and Path(tmp_path).exists():
            Path(tmp_path).unlink(missing_ok=True)

    elapsed = round(time.perf_counter() - start, 2)
    logger.info(
        "Recognition done in %.2fs — matched=%s confidence=%.3f",
        elapsed, result["matched"], result["confidence"],
    )

    # Save history (non-blocking — errors are logged but don't fail the response)
    save_match_history(
        track_id=result.get("track_id"),
        confidence=result["confidence"],
        matched=result["matched"],
        user_id=user_id,
        session_id=session_id,
    )

    if not result["matched"]:
        return JSONResponse(
            status_code=200,
            content={"matched": False, "message": "No matching song found in the catalogue."},
        )

    # Fetch track metadata
    track = get_track_by_id(result["track_id"])
    if not track:
        # Fingerprint pointed to a deleted track
        return JSONResponse(
            status_code=200,
            content={"matched": False, "message": "Matched track no longer exists."},
        )

    return {
        "matched": True,
        "track": {
            "id": track["id"],
            "title": track["title"],
            "artist": track["artist"],
            "album": track.get("album"),
            "cover_url": track.get("cover_url"),
            "audio_url": track.get("audio_url"),
            "duration": track.get("duration"),
        },
        "confidence": result["confidence"],
        "processing_time_seconds": elapsed,
    }


@app.delete(
    "/admin/tracks/{track_id}/fingerprints",
    tags=["Admin"],
    dependencies=[Depends(require_admin_key)],
    summary="Delete all fingerprints for a track (for re-indexing)",
)
async def delete_track_fingerprints(track_id: str):
    """Remove all stored fingerprints for a track. Run /admin/ingest-track again to re-index."""
    delete_fingerprints_for_track(track_id)
    return {"message": f"Fingerprints deleted for track {track_id}"}
