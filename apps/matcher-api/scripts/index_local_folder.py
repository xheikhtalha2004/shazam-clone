"""
index_local_folder.py
=====================
Bulk-index all audio files in a local folder into Supabase.

Usage:
    python scripts/index_local_folder.py ./sample_songs
    python scripts/index_local_folder.py ./my_music --artist "My Band"

This script is for local development / initial catalogue seeding.
It talks directly to Supabase using the service-role key.
"""

import argparse
import logging
import sys
from pathlib import Path

# Add the project root to sys.path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv

load_dotenv()

import librosa

from app.fingerprint import generate_fingerprints
from app.supabase_client import (
    create_track,
    get_supabase,
    insert_fingerprints,
    mark_track_fingerprinted,
)

# ── Config ─────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".flac", ".ogg", ".aac"}


# ── Helpers ────────────────────────────────────────────────────────────────────

def _is_already_indexed(audio_url: str) -> bool:
    """
    Check if a track with the same audio_url already exists in Supabase.
    Prevents duplicate indexing if you re-run the script.
    """
    try:
        response = (
            get_supabase()
            .table("tracks")
            .select("id")
            .eq("audio_url", audio_url)
            .execute()
        )
        return bool(response.data)
    except Exception as exc:
        logger.warning("Could not check for existing track: %s", exc)
        return False


def _infer_title(filename: str) -> str:
    """Infer song title from filename by removing extension and cleaning up."""
    stem = Path(filename).stem
    # Replace underscores/hyphens with spaces, strip leading numbers (e.g. "01 - ")
    cleaned = stem.replace("_", " ").replace("-", " ").strip()
    # Remove leading track numbers like "01 " or "1. "
    parts = cleaned.split(" ", 1)
    if parts[0].rstrip(".").isdigit() and len(parts) > 1:
        cleaned = parts[1].strip()
    return cleaned.title()


def index_folder(
    folder: Path,
    default_artist: str = "Unknown Artist",
    default_album: str | None = None,
) -> None:
    """
    Scan a folder and index all supported audio files.

    Parameters
    ----------
    folder:
        Path to the local folder containing audio files.
    default_artist:
        Artist name to use when it cannot be inferred from the file.
    default_album:
        Album name to use for all tracks in this folder (optional).
    """
    if not folder.exists():
        logger.error("Folder does not exist: %s", folder)
        sys.exit(1)

    # Find all audio files (non-recursive for simplicity)
    audio_files = sorted(
        f for f in folder.iterdir()
        if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS
    )

    if not audio_files:
        logger.warning("No supported audio files found in: %s", folder)
        logger.info("Supported formats: %s", ", ".join(sorted(SUPPORTED_EXTENSIONS)))
        sys.exit(0)

    logger.info("Found %d audio file(s) in '%s'", len(audio_files), folder)
    print("-" * 60)

    success_count = 0
    skip_count = 0
    fail_count = 0

    for i, audio_path in enumerate(audio_files, start=1):
        print(f"\n[{i}/{len(audio_files)}] Processing: {audio_path.name}")

        # Build the audio_url identifier (used as dedup key)
        audio_url = f"local/{audio_path.name}"

        # ── Skip already-indexed ────────────────────────────────────────────
        if _is_already_indexed(audio_url):
            logger.info("  SKIPPED — already indexed: %s", audio_path.name)
            skip_count += 1
            continue

        try:
            # ── Measure duration ────────────────────────────────────────────
            try:
                duration_seconds = int(librosa.get_duration(path=str(audio_path)))
            except Exception:
                duration_seconds = None
                logger.warning("  Could not determine duration for %s", audio_path.name)

            title = _infer_title(audio_path.name)
            logger.info("  Title inferred: '%s'", title)

            # ── Insert track record ─────────────────────────────────────────
            track = create_track(
                title=title,
                artist=default_artist,
                album=default_album,
                duration_seconds=duration_seconds,
                audio_url=audio_url,
            )
            track_id = track["id"]
            logger.info("  Track created: id=%s", track_id)

            # ── Generate fingerprints ───────────────────────────────────────
            logger.info("  Generating fingerprints...")
            fingerprints = generate_fingerprints(str(audio_path))
            logger.info("  Generated %d hashes", len(fingerprints))

            # ── Insert fingerprints ─────────────────────────────────────────
            count = insert_fingerprints(track_id, fingerprints)
            mark_track_fingerprinted(track_id, count)

            print(f"  ✓ SUCCESS — {count} fingerprints stored (duration: {duration_seconds}s)")
            success_count += 1

        except Exception as exc:
            logger.error("  ✗ FAILED — %s: %s", audio_path.name, exc)
            fail_count += 1

    # ── Summary ─────────────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print(f"Indexing complete.")
    print(f"  ✓ Indexed:  {success_count}")
    print(f"  ↷ Skipped:  {skip_count} (already indexed)")
    print(f"  ✗ Failed:   {fail_count}")
    print("=" * 60)


# ── CLI ─────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Bulk-index local audio files into SoundFind's Supabase catalogue."
    )
    parser.add_argument(
        "folder",
        type=Path,
        help="Path to the folder containing audio files to index.",
    )
    parser.add_argument(
        "--artist",
        default="Unknown Artist",
        help="Default artist name for all tracks (default: 'Unknown Artist').",
    )
    parser.add_argument(
        "--album",
        default=None,
        help="Default album name for all tracks (optional).",
    )

    args = parser.parse_args()
    index_folder(folder=args.folder, default_artist=args.artist, default_album=args.album)


if __name__ == "__main__":
    main()
