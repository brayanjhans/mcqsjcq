"""
Meilisearch service layer for licitaciones search.
Provides fast search with automatic fallback to MySQL if Meilisearch is unavailable.
"""
import time
import os
import httpx
from typing import Optional

MEILI_URL        = os.getenv("MEILI_URL", "http://127.0.0.1:7700")
MEILI_KEY        = os.getenv("MEILI_KEY", "MEILI_MCQS_JCQ_2026_SECRET")
INDEX_NAME       = "licitaciones"
SUGGESTIONS_IDX  = "sugerencias"

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

    Implements a strict exact-phrase prioritization:
    1. First tries the exact phrase (`"query"`). If hits > 0, returns those.
    2. Fallbacks to `matchingStrategy='all'` without quotes if exact phrase yields 0.
    This solves the issue of "CONSORCIO GRECIA" returning 7 results instead of exactly the 2-3 precise ones.
    """
    if not query or not _is_available():
        return None

    try:
        def _do_search(q_str: str) -> Optional[list[dict]]:
            payload = {
                "q": q_str,
                "limit": min(limit, 500),
                "offset": 0,
                "attributesToRetrieve": ["id_convocatoria"],
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
            return r.json().get("hits", [])

        # 1. Try exact phrase match
        exact_query = f'"{query.strip()}"'
        hits = _do_search(exact_query)
        
        # 2. Fallback to normal match if 0 results
        if hits is not None and len(hits) == 0:
            hits = _do_search(query.strip())

        if hits is None:
            return None
            
        return [h["id_convocatoria"] for h in hits if h.get("id_convocatoria")]
        
    except Exception as exc:
        print(f"[meili_service] search error: {exc}")
        _health_cache["ok"] = False
        _health_cache["ts"] = time.time()
        return None


def suggest_from_meili(query: str, limit: int = 10) -> Optional[list[dict]]:
    """
    Get autocomplete suggestions from Meilisearch (~1-4ms).
    Extracts unique values from ganador_nombre, nombres_consorciados, comprador.
    Returns None if Meilisearch is unavailable (triggers MySQL fallback).

    Only activates for queries >= 3 chars (shorter queries too broad for FULLTEXT).
    """
    if not query or len(query) < 3 or not _is_available():
        return None

    try:
        payload = {
            "q": query,
            "limit": 30,   # fetch more hits to extract diverse suggestions
            "offset": 0,
            "attributesToRetrieve": [
                "ganador_nombre", "nombres_consorciados", "comprador"
            ],
            "matchingStrategy": "all",
        }
        r = httpx.post(
            f"{MEILI_URL}/indexes/{INDEX_NAME}/search",
            json=payload,
            headers=_headers(),
            timeout=2.0,
        )
        if r.status_code != 200:
            return None

        hits   = r.json().get("hits", [])
        q_low  = query.lower()
        seen   = set()
        result = []

        def add_suggestion(value: str, stype: str):
            """Only add if the value actually contains the query substring."""
            v = (value or "").strip()
            if not v or v in seen:
                return
            # Verify real match: the field must contain the search term
            if q_low not in v.lower():
                return
            seen.add(v)
            result.append({"value": v[:90], "type": stype})

        for hit in hits:
            if len(result) >= limit:
                break
            add_suggestion(hit.get("ganador_nombre", ""), "Proveedor")

            # Consortium members are pipe-separated (set during sync)
            nc = hit.get("nombres_consorciados", "")
            if nc:
                for member in nc.split(" | "):
                    add_suggestion(member, "Consorcio")

            add_suggestion(hit.get("comprador", ""), "Entidad")

        return result[:limit]

    except Exception as exc:
        print(f"[meili_service] suggest error: {exc}")
        _health_cache["ok"] = False
        _health_cache["ts"] = time.time()
        return None


def suggest_federated(query: str, limit: int = 8) -> list[dict]:
    """
    Federated Search: queries BOTH 'sugerencias' and 'licitaciones' indexes
    in a SINGLE HTTP call to Meilisearch (multiSearch API).

    Returns a deduplicated list of {value, type} suggestions.
    Falls back to [] if Meilisearch is unavailable.
    """
    if not query or len(query) < 2 or not _is_available():
        return []

    q = query.strip()
    # Detect if query looks like a nomenclatura code (e.g. CP-ABR-1-2026)
    is_nomenclatura = '-' in q and q[0].isalpha()

    queries = [
        {
            "indexUid": SUGGESTIONS_IDX,
            "q": q,
            "limit": limit,
            "attributesToRetrieve": ["ruc", "nombre", "tipo"],
            "matchingStrategy": "all",
        },
    ]

    if is_nomenclatura:
        queries.append({
            "indexUid": INDEX_NAME,
            "q": q,
            "limit": 3,
            "attributesToRetrieve": ["id_convocatoria", "nomenclatura", "objeto_convocatoria"],
            "matchingStrategy": "all",
        })

    try:
        r = httpx.post(
            f"{MEILI_URL}/multi-search",
            json={"queries": queries},
            headers=_headers(),
            timeout=2.0,
        )
        if r.status_code != 200:
            return []

        results = r.json().get("results", [])
        suggestions: list[dict] = []
        seen: set = set()

        # Process 'sugerencias' index results (Proveedores / Entidades)
        if results:
            # Check if query is mostly digits (searching for RUC)
            q_clean = q.replace(" ", "")
            is_numeric_query = q_clean.isdigit()

            for hit in results[0].get("hits", []):
                ruc   = (hit.get("ruc") or "").strip()
                name  = (hit.get("nombre") or "").strip()
                tipo  = (hit.get("tipo") or "Entidad").strip()
                
                if is_numeric_query:
                    # Suggest RUC
                    if ruc and ruc not in seen:
                        seen.add(ruc)
                        suggestions.append({"value": ruc, "type": f"RUC {tipo}"})
                else:
                    # Suggest Name
                    if name and name not in seen:
                        seen.add(name)
                        suggestions.append({"value": name[:90], "type": tipo})

        # Process 'licitaciones' index results (Nomenclaturas)
        if len(results) > 1:
            for hit in results[1].get("hits", []):
                nom = (hit.get("nomenclatura") or "").strip()
                if nom and nom not in seen:
                    seen.add(nom)
                    suggestions.append({"value": nom, "type": "Nomenclatura"})

        return suggestions[:limit]

    except Exception as exc:
        print(f"[meili_service] suggest_federated error: {exc}")
        return []


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
            # Disable typo tolerance per-attribute: exact codes (nomenclatura, RUC) should not fuzzy-match
            "typoTolerance": {
                "enabled": True,
                "disableOnAttributes": ["nomenclatura", "ganador_ruc"],
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
