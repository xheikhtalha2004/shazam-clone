"""
supabase_client.py
==================
Supabase database client for the Python backend.

Uses the service-role key so it can:
  - Read/write audio_fingerprints (restricted by RLS to service_role only)
  - Write match_history on behalf of any user
  - Update tracks.fingerprinted flag

NEVER expose this module or its key to the browser/frontend.
"""

import logging
import os
from typing import Optional

from dotenv import load_dotenv
from supabase import Client, create_client

# Load environment variables from .env file (local dev)
load_dotenv()

logger = logging.getLogger(__name__)

# ── Supabase client singleton ──────────────────────────────────────────────────

def _get_client() -> Client:
    """
    Create and return a Supabase client using the service-role key.

    The service-role key bypasses Row Level Security — keep it server-side only.
    """
    url: str = os.environ["SUPABASE_URL"]
    key: str = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

    if not url or not key:
        raise EnvironmentError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables."
        )

    return create_client(url, key)


# Module-level client (initialized once on first import)
_client: Optional[Client] = None


def get_supabase() -> Client:
    """Return the module-level Supabase client, creating it if needed."""
    global _client
    if _client is None:
        _client = _get_client()
    return _client


# ── Track operations ───────────────────────────────────────────────────────────

def create_track(
    title: str,
    artist: str,
    album: Optional[str],
    duration_seconds: Optional[int],
    audio_url: str,
    cover_url: Optional[str] = None,
    created_by: Optional[str] = None,
) -> dict:
    """
    Insert a new track row and return the created record.

    Parameters
    ----------
    title, artist, album:
        Song metadata.
    duration_seconds:
        Duration in seconds (can be None if not yet determined).
    audio_url:
        Path/URL to the audio file in Supabase Storage.
    cover_url:
        Optional path/URL to cover art in Supabase Storage.
    created_by:
        UUID of the admin user who uploaded this track.

    Returns
    -------
    dict — the newly created track row.

    Raises
    ------
    RuntimeError if the insert fails.
    """
    payload = {
        "title": title,
        "artist": artist,
        "album": album,
        "duration": duration_seconds,
        "audio_url": audio_url,
        "cover_url": cover_url,
        "created_by": created_by,
        "fingerprinted": False,
    }

    # Remove None values so Supabase uses column defaults
    payload = {k: v for k, v in payload.items() if v is not None}

    try:
        response = get_supabase().table("tracks").insert(payload).execute()
    except Exception as exc:
        raise RuntimeError(f"Failed to insert track: {exc}") from exc

    if not response.data:
        raise RuntimeError("Track insert returned no data — check Supabase RLS policies.")

    logger.info("Created track: id=%s title=%s", response.data[0]["id"], title)
    return response.data[0]


def get_track_by_id(track_id: str) -> Optional[dict]:
    """
    Fetch a single track by its UUID.

    Returns None if not found.
    """
    try:
        response = (
            get_supabase()
            .table("tracks")
            .select("*")
            .eq("id", track_id)
            .single()
            .execute()
        )
        return response.data
    except Exception as exc:
        logger.error("Failed to fetch track %s: %s", track_id, exc)
        return None


def mark_track_fingerprinted(track_id: str, fingerprint_count: int) -> None:
    """Update the tracks row to reflect that fingerprinting is complete."""
    try:
        get_supabase().table("tracks").update(
            {"fingerprinted": True, "fingerprint_count": fingerprint_count}
        ).eq("id", track_id).execute()
        logger.info("Marked track %s as fingerprinted (%d hashes)", track_id, fingerprint_count)
    except Exception as exc:
        logger.error("Failed to update fingerprint status for track %s: %s", track_id, exc)
        raise


# ── Fingerprint operations ────────────────────────────────────────────────────

def insert_fingerprints(track_id: str, fingerprints: list[dict]) -> int:
    """
    Batch-insert fingerprint hashes for a track.

    Parameters
    ----------
    track_id:
        UUID of the parent track.
    fingerprints:
        List of {"hash": str, "offset_time": int} dicts from fingerprint.py.

    Returns
    -------
    int — number of rows inserted.

    Notes
    -----
    Inserts in chunks of 1000 to stay within Supabase request size limits.
    """
    if not fingerprints:
        logger.warning("insert_fingerprints called with empty list for track %s", track_id)
        return 0

    rows = [
        {"track_id": track_id, "hash": fp["hash"], "offset_time": fp["offset_time"]}
        for fp in fingerprints
    ]

    CHUNK_SIZE = 1000
    total_inserted = 0

    for i in range(0, len(rows), CHUNK_SIZE):
        chunk = rows[i : i + CHUNK_SIZE]
        try:
            response = get_supabase().table("audio_fingerprints").insert(chunk).execute()
            total_inserted += len(response.data or chunk)
        except Exception as exc:
            raise RuntimeError(
                f"Failed to insert fingerprint chunk [{i}:{i+CHUNK_SIZE}]: {exc}"
            ) from exc

    logger.info("Inserted %d fingerprints for track %s", total_inserted, track_id)
    return total_inserted


async def get_fingerprints_by_hashes(hashes: list[str]) -> list[dict]:
    """
    Fetch all DB fingerprints whose hash matches any hash in the list.

    Used during recognition: we send all query hashes and get back
    every stored fingerprint that matches.

    Parameters
    ----------
    hashes:
        List of hash strings (potentially thousands for a multi-second clip).

    Returns
    -------
    list[dict] — rows with keys: hash, track_id, offset_time

    Notes
    -----
    Queries in chunks of CHUNK_SIZE to avoid httpx.InvalidURL: URL component
    'query' too long. The Supabase SDK encodes .in_() values as a GET query
    string — sending thousands of hashes at once exceeds the URL length limit.
    """
    if not hashes:
        return []

    # Deduplicate: the DB match set is the same whether we send duplicates or not,
    # and deduplication drastically reduces the number of chunks needed.
    unique_hashes = list(set(hashes))

    CHUNK_SIZE = 100  # keeps each URL well under httpx's limit
    all_results: list[dict] = []

    for i in range(0, len(unique_hashes), CHUNK_SIZE):
        chunk = unique_hashes[i : i + CHUNK_SIZE]
        try:
            response = (
                get_supabase()
                .table("audio_fingerprints")
                .select("hash, track_id, offset_time")
                .in_("hash", chunk)
                .execute()
            )
            all_results.extend(response.data or [])
        except Exception as exc:
            logger.error(
                "Failed to query fingerprints for hash chunk [%d:%d]: %s",
                i, i + CHUNK_SIZE, exc,
            )
            raise

    logger.debug(
        "Hash lookup: %d unique hashes → %d DB rows (in %d chunks)",
        len(unique_hashes), len(all_results), (len(unique_hashes) + CHUNK_SIZE - 1) // CHUNK_SIZE,
    )
    return all_results


def delete_fingerprints_for_track(track_id: str) -> None:
    """
    Remove all fingerprints for a given track.

    Use this before re-indexing a track to avoid duplicate hashes.
    """
    try:
        get_supabase().table("audio_fingerprints").delete().eq("track_id", track_id).execute()
        logger.info("Deleted all fingerprints for track %s", track_id)
    except Exception as exc:
        logger.error("Failed to delete fingerprints for track %s: %s", track_id, exc)
        raise


# ── Match history operations ───────────────────────────────────────────────────

def save_match_history(
    track_id: Optional[str],
    confidence: float,
    matched: bool,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
) -> dict:
    """
    Save a recognition event to the match_history table.

    Parameters
    ----------
    track_id:
        UUID of the matched track (None for no-match events).
    confidence:
        Match confidence score (0.0 – 1.0).
    matched:
        True if a match was found.
    user_id:
        UUID of the logged-in user (None for anonymous).
    session_id:
        Anonymous session identifier string.

    Returns
    -------
    dict — the newly created match_history row.
    """
    payload = {
        "track_id": track_id,
        "confidence": confidence,
        "matched": matched,
        "user_id": user_id,
        "session_id": session_id,
    }
    # Remove None values
    payload = {k: v for k, v in payload.items() if v is not None}

    try:
        response = get_supabase().table("match_history").insert(payload).execute()
        return response.data[0] if response.data else {}
    except Exception as exc:
        # Non-fatal — don't fail the recognition request because of history logging
        logger.error("Failed to save match history: %s", exc)
        return {}
