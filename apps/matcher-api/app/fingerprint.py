"""
fingerprint.py
==============
Audio fingerprinting engine for SoundFind.

Algorithm (inspired by the Dejavu / Wang 2003 paper):
  1. Load audio → mono → resample to a fixed sample rate
  2. Compute Short-Time Fourier Transform (STFT)
  3. Convert magnitude to dB scale
  4. Detect local spectral peaks ("constellation map")
  5. Pair each peak with nearby "fan-out" peaks (landmarks)
  6. Hash each pair: SHA-1(f_anchor | f_target | delta_t) → 10-hex string
  7. Return list of {"hash": str, "offset_time": int} dicts

The offset_time is stored as a sample index (at the down-sampled rate),
which gives sub-second precision without floating-point drift.
"""

import hashlib
import logging
from io import BytesIO
from pathlib import Path
from typing import Union

import librosa
import numpy as np
from scipy.ndimage import maximum_filter

# ── Logging ────────────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)

# ── Default hyper-parameters (all overridable via function args) ───────────────
DEFAULT_SAMPLE_RATE: int = 11025       # Hz — low enough to be fast, high enough for music
DEFAULT_N_FFT: int = 4096             # FFT window size (controls freq resolution)
DEFAULT_HOP_LENGTH: int = 512         # Samples between STFT frames
DEFAULT_NEIGHBORHOOD_SIZE: int = 20   # Peak detection neighbourhood (rows × cols)
DEFAULT_FAN_VALUE: int = 15           # Max pairs per anchor peak (fan-out degree)
DEFAULT_MIN_DELTA: int = 0            # Min frame gap between anchor and target peaks
DEFAULT_MAX_DELTA: int = 200          # Max frame gap (~9s at 11025/512 ≈ 21.5 fps)
DEFAULT_HASH_BITS: int = 10           # Hex chars per hash (40-bit truncation)


# ── Public API ─────────────────────────────────────────────────────────────────

def generate_fingerprints(
    audio_input: Union[str, Path, bytes, BytesIO],
    sample_rate: int = DEFAULT_SAMPLE_RATE,
    n_fft: int = DEFAULT_N_FFT,
    hop_length: int = DEFAULT_HOP_LENGTH,
    peak_neighborhood_size: int = DEFAULT_NEIGHBORHOOD_SIZE,
    fan_value: int = DEFAULT_FAN_VALUE,
    min_delta: int = DEFAULT_MIN_DELTA,
    max_delta: int = DEFAULT_MAX_DELTA,
) -> list[dict]:
    """
    Generate audio fingerprints from a file path or raw bytes.

    Parameters
    ----------
    audio_input:
        Path to an audio file (str/Path), or raw audio bytes / BytesIO object.
    sample_rate:
        Target sample rate for resampling. Lower = faster, higher = more precise.
    n_fft:
        FFT window size. Controls frequency resolution.
    hop_length:
        Hop size in samples between consecutive STFT frames.
    peak_neighborhood_size:
        Size of the local maximum filter (in both freq and time axes).
    fan_value:
        Number of target peaks paired with each anchor peak.
    min_delta / max_delta:
        Frame-index range within which target peaks are paired to an anchor.

    Returns
    -------
    list[dict]
        [{"hash": "abc1234567", "offset_time": 45}, ...]
        where offset_time is the anchor frame index (not seconds).

    Raises
    ------
    ValueError
        If audio is too short, corrupt, or an unsupported format.
    """
    # 1. Load audio ─────────────────────────────────────────────────────────────
    y, sr = _load_audio(audio_input, target_sr=sample_rate)
    logger.debug("Audio loaded: %.2f seconds, sr=%d", len(y) / sr, sr)

    if len(y) / sr < 1.0:
        raise ValueError("Audio clip is too short (< 1 second). Provide at least 3 seconds.")

    # 2. STFT spectrogram ───────────────────────────────────────────────────────
    stft = librosa.stft(y, n_fft=n_fft, hop_length=hop_length)
    magnitude = np.abs(stft)

    # 3. Convert to log (dB) scale ──────────────────────────────────────────────
    log_magnitude = librosa.amplitude_to_db(magnitude, ref=np.max)

    # 4. Detect spectral peaks ──────────────────────────────────────────────────
    peaks = _find_peaks(log_magnitude, neighborhood_size=peak_neighborhood_size)

    peak_count = len(peaks[0])
    logger.debug("Found %d spectral peaks", peak_count)

    if peak_count < 10:
        raise ValueError(
            f"Only {peak_count} spectral peaks found — audio may be silence or corrupt."
        )

    # 5. Build constellation map and hash pairs ─────────────────────────────────
    fingerprints = _build_hashes(peaks, fan_value=fan_value, min_delta=min_delta, max_delta=max_delta)

    logger.info("Generated %d fingerprint hashes", len(fingerprints))
    return fingerprints


# ── Private helpers ────────────────────────────────────────────────────────────

def _load_audio(
    audio_input: Union[str, Path, bytes, BytesIO],
    target_sr: int,
) -> tuple[np.ndarray, int]:
    """Load any audio source and return (mono float32 array, sample_rate)."""
    try:
        if isinstance(audio_input, (str, Path)):
            y, sr = librosa.load(str(audio_input), sr=target_sr, mono=True)
        elif isinstance(audio_input, BytesIO):
            y, sr = librosa.load(audio_input, sr=target_sr, mono=True)
        elif isinstance(audio_input, bytes):
            y, sr = librosa.load(BytesIO(audio_input), sr=target_sr, mono=True)
        else:
            raise TypeError(f"Unsupported audio_input type: {type(audio_input)}")
    except Exception as exc:
        raise ValueError(f"Failed to load audio: {exc}") from exc

    return y, sr


def _find_peaks(
    log_magnitude: np.ndarray,
    neighborhood_size: int,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Detect local maxima in the log-magnitude spectrogram.

    Returns
    -------
    (freq_indices, time_indices) — arrays of peak coordinates.
    """
    # Apply a max-filter of the given neighbourhood size
    local_max = maximum_filter(log_magnitude, size=neighborhood_size)

    # A peak is where the original equals the local maximum (and is above -80 dB)
    peak_mask = (log_magnitude == local_max) & (log_magnitude > -80)

    freq_idx, time_idx = np.where(peak_mask)
    return freq_idx, time_idx


def _build_hashes(
    peaks: tuple[np.ndarray, np.ndarray],
    fan_value: int,
    min_delta: int,
    max_delta: int,
) -> list[dict]:
    """
    Pair anchor peaks with nearby target peaks and hash each pair.

    Hash format: SHA-1(f_anchor || f_target || delta_t) → first 10 hex chars.
    This gives 40-bit hashes — large enough to avoid collisions across a
    catalogue of millions of fingerprints.
    """
    freq_idx, time_idx = peaks
    fingerprints: list[dict] = []

    # Sort peaks by time then frequency for reproducibility
    order = np.lexsort((freq_idx, time_idx))
    freq_sorted = freq_idx[order]
    time_sorted = time_idx[order]

    num_peaks = len(time_sorted)

    for i in range(num_peaks):
        f_anchor = int(freq_sorted[i])
        t_anchor = int(time_sorted[i])

        pairs_added = 0
        for j in range(i + 1, num_peaks):
            if pairs_added >= fan_value:
                break

            t_target = int(time_sorted[j])
            delta_t = t_target - t_anchor

            if delta_t < min_delta:
                continue
            if delta_t > max_delta:
                break  # peaks are sorted by time — no further targets in range

            f_target = int(freq_sorted[j])

            # Encode the three values into a deterministic byte string
            raw = f"{f_anchor}|{f_target}|{delta_t}".encode()
            h = hashlib.sha1(raw).hexdigest()[:10]  # 40-bit truncated hash

            fingerprints.append({"hash": h, "offset_time": t_anchor})
            pairs_added += 1

    return fingerprints


# ── Quick test ─────────────────────────────────────────────────────────────────

def _test_fingerprint(audio_path: str) -> None:
    """
    Quick sanity-check: fingerprint a local audio file and print the first 10 hashes.

    Usage:
        python fingerprint.py path/to/song.mp3
    """
    import sys
    path = Path(audio_path)
    if not path.exists():
        print(f"ERROR: File not found: {audio_path}", file=sys.stderr)
        sys.exit(1)

    print(f"Fingerprinting: {path.name}")
    hashes = generate_fingerprints(path)
    print(f"Total hashes generated: {len(hashes)}")
    print("\nFirst 10 hashes:")
    for h in hashes[:10]:
        print(f"  hash={h['hash']}  offset_time={h['offset_time']}")


if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.DEBUG)
    if len(sys.argv) < 2:
        print("Usage: python fingerprint.py <audio_file_path>")
        sys.exit(1)
    _test_fingerprint(sys.argv[1])
