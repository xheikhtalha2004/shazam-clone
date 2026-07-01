"""
matcher.py
==========
Match a short query audio clip against the stored fingerprint database.

Algorithm:
  1. Generate fingerprints from the query audio (same algorithm as indexing)
  2. Fetch all stored fingerprints whose hash matches any query hash
  3. For each DB match, compute: offset_difference = db_offset - query_offset
  4. Group votes by (track_id, offset_difference)
  5. The best match is the (track_id, delta) bucket with the most votes
  6. Confidence = best_vote_count / total_query_hashes

The offset alignment trick is the core insight from the Wang (2003) paper:
a genuine match will have many hashes landing at the SAME time offset,
while noise/false positives scatter randomly across different offsets.
"""

import logging
from collections import defaultdict
from io import BytesIO
from pathlib import Path
from typing import Optional

from app.fingerprint import generate_fingerprints
from app.supabase_client import get_fingerprints_by_hashes, get_track_by_id

# ── Logging ────────────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)

# ── Thresholds ─────────────────────────────────────────────────────────────────
MIN_CONFIDENCE: float = 0.05   # Minimum ratio of aligned votes to declare a match
MIN_VOTES: int = 5             # Minimum absolute vote count (guards against tiny clips)


# ── Public API ─────────────────────────────────────────────────────────────────

async def match_audio(
    audio_input: str | Path | bytes | BytesIO,
    min_confidence: float = MIN_CONFIDENCE,
    min_votes: int = MIN_VOTES,
) -> dict:
    """
    Match a raw audio blob against all stored fingerprints.

    Parameters
    ----------
    audio_input:
        Audio source to fingerprint. A file path is preferred for browser uploads
        because it preserves the container extension for ffmpeg/librosa decoding.
    min_confidence:
        Minimum ratio (aligned_votes / total_query_hashes) to declare a match.
    min_votes:
        Minimum absolute number of aligned votes needed.

    Returns
    -------
    dict with keys:
        matched (bool), track_id (str|None), confidence (float),
        votes (int), total_hashes (int)
    """
    no_match_result = {
        "matched": False,
        "track_id": None,
        "confidence": 0.0,
        "votes": 0,
        "total_hashes": 0,
    }

    # ── Step 1: Fingerprint the query clip ─────────────────────────────────────
    try:
        query_fingerprints = generate_fingerprints(audio_input)
    except ValueError as exc:
        logger.warning("Could not fingerprint query audio: %s", exc)
        return no_match_result

    total_hashes = len(query_fingerprints)
    logger.debug("Query audio produced %d hashes", total_hashes)

    if total_hashes == 0:
        logger.warning("Query audio produced 0 fingerprint hashes — returning no-match")
        return no_match_result

    # Build a lookup: hash → list of query offset_time values
    # (one hash might appear at multiple query offsets due to repetition)
    query_hash_to_offsets: dict[str, list[int]] = defaultdict(list)
    for fp in query_fingerprints:
        query_hash_to_offsets[fp["hash"]].append(fp["offset_time"])

    query_hashes = list(query_hash_to_offsets.keys())

    # ── Step 2: Fetch matching DB fingerprints ─────────────────────────────────
    logger.debug("Querying DB for %d unique hashes", len(query_hashes))
    db_matches = await get_fingerprints_by_hashes(query_hashes)

    if not db_matches:
        logger.info("No DB fingerprint matches found")
        return no_match_result

    logger.debug("DB returned %d raw fingerprint matches", len(db_matches))

    # ── Step 3 & 4: Vote by (track_id, offset_difference) ─────────────────────
    # votes[(track_id, delta)] = count
    votes: dict[tuple[str, int], int] = defaultdict(int)

    for db_fp in db_matches:
        db_hash = db_fp["hash"]
        db_offset = db_fp["offset_time"]
        db_track_id = db_fp["track_id"]

        # For each query occurrence of this hash, compute offset delta
        for query_offset in query_hash_to_offsets.get(db_hash, []):
            delta = db_offset - query_offset
            votes[(db_track_id, delta)] += 1

    if not votes:
        return no_match_result

    # ── Step 5: Find best match ────────────────────────────────────────────────
    best_key, best_vote_count = max(votes.items(), key=lambda kv: kv[1])
    best_track_id, best_delta = best_key

    # ── Step 6: Calculate confidence ──────────────────────────────────────────
    confidence = best_vote_count / total_hashes

    logger.info(
        "Best match: track_id=%s  votes=%d/%d  confidence=%.3f  delta=%d",
        best_track_id, best_vote_count, total_hashes, confidence, best_delta,
    )

    # ── Step 7: Apply thresholds ───────────────────────────────────────────────
    if confidence < min_confidence or best_vote_count < min_votes:
        logger.info(
            "Match below threshold (confidence=%.3f < %.3f or votes=%d < %d) — no match",
            confidence, min_confidence, best_vote_count, min_votes,
        )
        return no_match_result

    return {
        "matched": True,
        "track_id": best_track_id,
        "confidence": round(confidence, 4),
        "votes": best_vote_count,
        "total_hashes": total_hashes,
    }
