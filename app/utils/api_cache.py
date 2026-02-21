"""
File-based API cache to avoid rate limiting from MEF/OSCE APIs.
Stores JSON responses in app/cache/ with configurable TTL.
"""
import json
import os
import time
from pathlib import Path

CACHE_DIR = Path(__file__).parent.parent / "cache"

# TTL constants (seconds)
TTL_MEF = 3600       # 1 hour for MEF financial data
TTL_OCDS = 21600     # 6 hours for OCDS guarantee data


def _ensure_cache_dir():
    """Create cache directory if it doesn't exist."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _cache_path(key: str) -> Path:
    """Get the file path for a cache key (sanitized)."""
    safe_key = "".join(c if c.isalnum() or c in "-_" else "_" for c in key)
    return CACHE_DIR / f"{safe_key}.json"


def get_cached(key: str, ttl_seconds: int = TTL_MEF):
    """
    Read cached data if it exists and hasn't expired.
    Returns the data dict or None if cache miss/expired.
    """
    _ensure_cache_dir()
    path = _cache_path(key)

    if not path.exists():
        return None

    try:
        with open(path, "r", encoding="utf-8") as f:
            entry = json.load(f)

        cached_at = entry.get("_cached_at", 0)
        if time.time() - cached_at > ttl_seconds:
            # Expired
            return None

        return entry.get("data")
    except (json.JSONDecodeError, IOError):
        return None


def set_cached(key: str, data):
    """Write data to cache with current timestamp."""
    _ensure_cache_dir()
    path = _cache_path(key)

    entry = {
        "_cached_at": time.time(),
        "data": data,
    }

    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(entry, f, ensure_ascii=False, default=str)
    except IOError as e:
        print(f"[CACHE] Warning: could not write cache for {key}: {e}")


def clear_cache():
    """Remove all cached files."""
    _ensure_cache_dir()
    for f in CACHE_DIR.glob("*.json"):
        f.unlink(missing_ok=True)
