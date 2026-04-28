"""
Meilisearch service layer for licitaciones search.
Provides fast search with automatic fallback to MySQL if Meilisearch is unavailable.
"""
import time
import os
import httpx
from typing import Optional

MEILI_URL  = os.getenv("MEILI_URL", "http://127.0.0.1:7700")
MEILI_KEY  = os.getenv("MEILI_KEY", "MEILI_MCQS_JCQ_2026_SECRET")
INDEX_NAME = "licitaciones"

# Health check cache — avoid pinging Meilisearch on every request
_health_cache = {"ok": None, "ts": 0.0}
_HEALTH_TTL   = 30  # seconds


def _is_available() -> bool:
    """Returns True if Meilisearch is up (cached 30s)."""
    now = time.time()
    if now - _health_cache["ts"] < _HEALTH_TTL:
        return bool(_health_cache["ok"])
    try:
        r = httpx.get(f"{MEILI_URL}/health", timeout=1.5)
        ok = r.status_code == 200 and r.json().get("status") == "available"
    except Exception:
        ok = False
    _health_cache["ok"] = ok
    _health_cache["ts"] = now
    return ok


def _headers() -> dict:
    return {"Authorization": f"Bearer {MEILI_KEY}", "Content-Type": "application/json"}


def search_ids(
    query: str,
    page: int = 1,
    limit: int = 500,
) -> Optional[list[str]]:
    """
    Search Meilisearch and return a list of id_convocatoria strings.
    Returns None if Meilisearch is unavailable (triggers MySQL fallback).
    Returns [] if Meilisearch is up but found nothing.

    matchingStrategy='all' means ALL words in the query must appear in the document.
    This prevents the 'lean work' → 237 false-positive problem.
    """
    if not query or not _is_available():
        return None

    try:
        payload = {
            "q": query,
            "limit": min(limit, 500),
            "offset": 0,
            "attributesToRetrieve": ["id_convocatoria"],
            # ALL words must be present — eliminates false positives
            "matchingStrategy": "all",
        }
        r = httpx.post(
            f"{MEILI_URL}/indexes/{INDEX_NAME}/search",
            json=payload,
            headers=_headers(),
            timeout=3.0,
        )
        if r.status_code != 200:
            return None
        hits = r.json().get("hits", [])
        return [h["id_convocatoria"] for h in hits if h.get("id_convocatoria")]
    except Exception as exc:
        print(f"[meili_service] search error: {exc}")
        _health_cache["ok"] = False
        _health_cache["ts"] = time.time()
        return None


def configure_index() -> bool:
    """Apply searchable / filterable / sortable settings to the index."""
    if not _is_available():
        return False
    try:
        settings = {
            # Priority order: ganador_nombre first (most specific), then nomenclatura,
            # then comprador, etc. Meilisearch ranks by attribute position.
            "searchableAttributes": [
                "ganador_nombre",
                "ganador_ruc",
                "nombres_consorciados",
                "nomenclatura",
                "comprador",
                "descripcion",
                "ubicacion_completa",
            ],
            "filterableAttributes": [
                "estado_proceso",
                "departamento",
                "categoria",
                "tipo_procedimiento",
                "anio",
            ],
            "sortableAttributes": ["fecha_ts"],
            "rankingRules": [
                "words", "typo", "proximity", "attribute", "sort", "exactness"
            ],
            # Disable typo tolerance: precision over fuzzy matching
            "typoTolerance": {
                "enabled": False,
            },
        }
        r = httpx.patch(
            f"{MEILI_URL}/indexes/{INDEX_NAME}/settings",
            json=settings,
            headers=_headers(),
            timeout=10.0,
        )
        return r.status_code in (200, 202)
    except Exception as exc:
        print(f"[meili_service] configure_index error: {exc}")
        return False


def bulk_index(docs: list[dict]) -> bool:
    """Add/update a batch of documents in the index."""
    if not docs:
        return True
    try:
        r = httpx.post(
            f"{MEILI_URL}/indexes/{INDEX_NAME}/documents",
            json=docs,
            headers=_headers(),
            timeout=30.0,
        )
        return r.status_code in (200, 202)
    except Exception as exc:
        print(f"[meili_service] bulk_index error: {exc}")
        return False


def get_stats() -> dict:
    """Return index stats (number of documents, etc.)."""
    if not _is_available():
        return {}
    try:
        r = httpx.get(
            f"{MEILI_URL}/indexes/{INDEX_NAME}/stats",
            headers=_headers(),
            timeout=5.0,
        )
        return r.json() if r.status_code == 200 else {}
    except Exception:
        return {}
