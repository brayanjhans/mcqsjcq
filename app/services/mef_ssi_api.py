"""
MEF SSI API Client — Real-time data source.

Queries the MEF Sistema de Seguimiento de Inversiones (SSI) API directly.
Endpoint: https://ofi5.mef.gob.pe/invierteWS/Dashboard/

This provides real-time financial execution data per CUI without needing
to download or maintain local CSV files of 1.4GB.

Endpoints used:
- traeDevengSSI   : Financial execution data by CUI (PIA, PIM, Devengado)
- busInvNombreSSI : Text search for investment projects → returns CUI candidates
- traeDetInvSSI   : Project details (sector, entidad, funcion)
"""
import requests
from app.database import SessionLocal
from sqlalchemy import text
import urllib3
import os
import unicodedata
import re

urllib3.disable_warnings()
from typing import Optional

SSI_BASE = "https://ofi5.mef.gob.pe/invierteWS/Dashboard"
SSI_HEADERS = {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": "https://ofi5.mef.gob.pe/ssi/Ssi/Index",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Origin": "https://ofi5.mef.gob.pe",
}
TIMEOUT = 10  # seconds


def _post(endpoint: str, payload: dict) -> Optional[list | dict]:
    """Make a POST request to the SSI API and return parsed JSON."""
    try:
        url = f"{SSI_BASE}/{endpoint}"
        proxy_url = os.environ.get("IPROYAL_PROXY_URL")
        proxies = {"http": proxy_url, "https": proxy_url} if proxy_url else None
        
        r = requests.post(url, data=payload, headers=SSI_HEADERS, timeout=TIMEOUT, proxies=proxies, verify=False)
        if r.status_code == 200 and r.text.strip():
            return r.json()
        return None
    except Exception as e:
        print(f"[MEF-SSI] Error calling {endpoint}: {e}")
        return None


def get_ejecucion_by_cui_ssi(cui: str) -> Optional[dict]:
    """
    Fetch financial execution data for a CUI from the SSI API.
    Uses tipo=DEV2 to get year-by-year history (PIA, PIM, Devengado per year).
    Returns the most recent year with PIM > 0.
    
    Returns dict with: pia, pim, devengado, girado, year_found, cui
    Or None if not found.
    """
    data = _post("traeDevengSSI", {"id": cui, "tipo": "DEV2"})
    
    if not data or not isinstance(data, list):
        return None

    # Filter rows that are actual year-by-year records (have NUM_ANIO)
    year_rows = [r for r in data if r.get("NUM_ANIO") and r.get("MTO_PIM") is not None]
    
    if not year_rows:
        # Try FINAN type as fallback (current year summary)
        data_finan = _post("traeDevengSSI", {"id": cui, "tipo": "FINAN"})
        if data_finan and isinstance(data_finan, list) and len(data_finan) > 0:
            row = data_finan[0]
            pim = row.get("MTO_PIM", 0) or 0
            if pim > 0:
                return {
                    "pia": float(row.get("MTO_PIA", 0) or 0),
                    "pim": float(pim),
                    "certificado": 0.0,
                    "compromiso_anual": 0.0,
                    "devengado": float(row.get("DEV_ANIO1", 0) or 0),
                    "girado": 0.0,
                    "encontrado": True,
                    "error": None,
                    "registros": 1,
                    "cui": str(cui),
                    "match_type": "cui_ssi",
                    "year_found": int(str(row.get("PER_ULT_DEVENG", "2026"))[:4]) if row.get("PER_ULT_DEVENG") else 2026,
                    "source": "ssi_api",
                }
        return None

    # Sort: prefer the year closest to current year (ascending abs distance)
    # Then prefer highest PIM as tiebreaker
    from datetime import datetime
    current_year = datetime.now().year

    year_rows_sorted = sorted(
        year_rows,
        key=lambda r: (
            abs(int(r.get("NUM_ANIO", 0)) - current_year),  # ascending: closest year first
            -(r.get("MTO_PIM", 0) or 0)
        )
    )

    # Fetch monthly execution history for the CUI
    data_mes = _post("traeDevengSSI", {"id": cui, "tipo": "MES"})
    monthly_by_year = {}
    if data_mes and isinstance(data_mes, list):
        for m in data_mes:
            year = int(m.get("NUM_ANIO", 0))
            if year not in monthly_by_year:
                monthly_by_year[year] = []
            monthly_by_year[year].append({
                "mes": int(m.get("COD_MES", 0)),
                "pia": float(m.get("MTO_PIA", 0) or 0),
                "pim": float(m.get("MTO_PIM", 0) or 0),
                "certificado": float(m.get("MTO_CERT", 0) or 0),
                "compromiso_anual": float(m.get("MTO_COMPROM", 0) or 0),
                "devengado": float(m.get("MTO_DEVEN", 0) or 0),
                "girado": float(m.get("MTO_GIRADO", 0) or 0),
            })
        
        # Consultamos el girado anual real de la BD local
        girado_anual_db = {}
        try:
            db = SessionLocal()
            rows = db.execute(text("SELECT ano_eje, MAX(monto_girado) FROM mef_ejecucion WHERE producto_proyecto LIKE :cui GROUP BY ano_eje"), {"cui": f"{cui}%"}).fetchall()
            for r in rows:
                girado_anual_db[int(r[0])] = float(r[1] or 0)
            db.close()
        except:
            pass

        # Sort months within each year chronologically and distribute girado
        for y in monthly_by_year:
            monthly_by_year[y] = sorted(monthly_by_year[y], key=lambda x: x["mes"])
            g_restante = girado_anual_db.get(y, 0.0)
            if g_restante > 0:
                for m in monthly_by_year[y]:
                    # Asignamos girado hasta cubrir el devengado del mes
                    if m["devengado"] > 0 and g_restante > 0:
                        g_asignar = min(m["devengado"], g_restante)
                        m["girado"] = g_asignar
                        g_restante -= g_asignar

    # Build historial: all years sorted chronologically (for table display)
    historial = []
    for r in sorted(year_rows, key=lambda x: int(x.get("NUM_ANIO", 0))):
        y_val = int(r.get("NUM_ANIO", 0))
        pim_h = float(r.get("MTO_PIM", 0) or 0)
        dev_h = float(r.get("MTO_DEVEN", 0) or 0)
        historial.append({
            "year": y_val,
            "pia": float(r.get("MTO_PIA", 0) or 0),
            "pim": pim_h,
            "certificado": float(r.get("MTO_CERT", 0) or 0),
            "compromiso_anual": float(r.get("MTO_COMPROM", 0) or 0),
            "devengado": dev_h,
            "girado": girado_anual_db.get(y_val, float(r.get("MTO_GIRADO", 0) or 0)),
            "avance_pct": round((dev_h / pim_h * 100), 1) if pim_h > 0 else 0,
            "meses": monthly_by_year.get(y_val, []),
        })

    for row in year_rows_sorted:
        pim = float(row.get("MTO_PIM", 0) or 0)
        if pim > 0:
            year = int(row.get("NUM_ANIO", current_year))
            print(f"[MEF-SSI] CUI {cui} found via DEV2, year={year}, PIM={pim}")
            return {
                "pia": float(row.get("MTO_PIA", 0) or 0),
                "pim": pim,
                "certificado": float(row.get("MTO_CERT", 0) or 0),
                "compromiso_anual": float(row.get("MTO_COMPROM", 0) or 0),
                "devengado": float(row.get("MTO_DEVEN", 0) or 0),
                "girado": girado_anual_db.get(year, float(row.get("MTO_GIRADO", 0) or 0)),
                "encontrado": True,
                "error": None,
                "registros": 1,
                "cui": str(cui),
                "match_type": "cui_ssi",
                "year_found": year,
                "source": "ssi_api",
                "historial": historial,  # All years for chart display
            }
    
    return None


def _clean_for_match(text: str) -> str:
    """Strip accents and stop words for similarity comparison."""
    if not text:
        return ""
    nfkd = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in nfkd if not unicodedata.combining(c))
    stop = {
        "DE", "DEL", "LA", "EL", "LOS", "LAS", "EN", "PARA", "CON", "Y", "O",
        "A", "AL", "UN", "UNA", "QUE", "SE", "SU", "SUS", "NO", "DISTRITO",
        "PROVINCIA", "DEPARTAMENTO", "CONTRATACION", "SERVICIO", "OBRA",
        "ELABORACION", "EXPEDIENTE", "TECNICO", "SALDO", "ADQUISICION",
        "CONSULTORIA", "SUPERVISION",
    }
    clean = re.sub(r"[^a-zA-Z0-9\s]", " ", text.upper())
    words = [w for w in clean.split() if w not in stop and len(w) > 2]
    return " ".join(words)


def _jaccard_score(a: str, b: str) -> float:
    """Compute Jaccard similarity between two cleaned strings."""
    words_a = set(a.split())
    words_b = set(b.split())
    if not words_a or not words_b:
        return 0.0
    intersection = len(words_a & words_b)
    seq = difflib.SequenceMatcher(None, a.split(), b.split()).ratio()
    overlap = intersection / min(len(words_a), len(words_b))
    return (overlap + seq) / 2


def search_project_by_text_ssi(description: str, min_score: float = 0.40) -> Optional[dict]:
    """
    Search for a MEF investment project by text description using the SSI API.
    
    1. Extracts 3 key terms from description (project type + location)
    2. Calls busInvNombreSSI to get candidate projects
    3. Picks the best match using Jaccard similarity
    4. Fetches financial data with the matched CUI
    
    Returns financial execution dict or None.
    """
    if not description:
        return None

    clean_desc = _clean_for_match(description)
    words = clean_desc.split()

    # Generic project-action words are NOT useful for SSI text search (the SSI indexes project names,
    # not contract descriptions). Place names and nouns give much better results.
    generic_words = {
        "MANTENIMIENTO", "CONSTRUCCION", "INSTALACION", "MEJORAMIENTO", "REHABILITACION",
        "AMPLIACION", "CREACION", "EJECUCION", "PERIODICO", "CARRETERA", "DEPARTAMENTAL",
        "PAVIMENTADA", "SERVICIO", "CONTRATO", "SUMINISTRO", "SISTEMA", "INFRAESTRUCTURA",
        "CAPACITACION", "IMPLEMENTACION", "FORTALECIMIENTO",
    }

    # Prefer specific words (likely place names or unique nouns), fall back to generic
    specific = [w for w in words if w not in generic_words and len(w) > 4]
    fallback = [w for w in words if w in generic_words]

    # Build query: at most 2 specific + 1 generic for context
    query_words = specific[:2]
    if len(query_words) < 2 and fallback:
        query_words += fallback[:1]
    if not query_words:
        query_words = sorted(words, key=lambda w: -len(w))[:3]

    search_term = " ".join(query_words)
    if len(search_term) < 4:
        return None

    print(f"[MEF-SSI] Text search: '{search_term}'")
    candidates = _post("busInvNombreSSI", {"des_inv": search_term, "tipo": "NOM"})

    # If no results, retry with just the first specific word
    if not candidates and len(specific) >= 1:
        search_term_short = specific[0]
        print(f"[MEF-SSI] Retry text search with: '{search_term_short}'")
        candidates = _post("busInvNombreSSI", {"des_inv": search_term_short, "tipo": "NOM"})

    if not candidates or not isinstance(candidates, list) or len(candidates) == 0:
        print(f"[MEF-SSI] No candidates found for text search")
        return None

    print(f"[MEF-SSI] Got {len(candidates)} candidate projects from SSI text search")

    # Score each candidate by similarity to original description
    best_cui = None
    best_score = 0.0
    best_name = None

    for proj in candidates:
        name = proj.get("NOMBRE_INVERSION") or proj.get("DES_INV") or ""
        cui = proj.get("CODIGO_UNICO")
        if not name or not cui:
            continue

        clean_name = _clean_for_match(name)
        score = _jaccard_score(clean_desc, clean_name)

        if score > best_score:
            best_score = score
            best_cui = cui
            best_name = name

    if best_cui and best_score >= min_score:
        print(f"[MEF-SSI] Best text match: CUI={best_cui}, score={best_score:.2f}, name={best_name}")
        result = get_ejecucion_by_cui_ssi(str(best_cui))
        if result:
            result["match_type"] = "fuzzy_ssi"
            result["match_score"] = round(best_score, 2)
            result["matched_name"] = best_name
            return result
    else:
        print(f"[MEF-SSI] Best score {best_score:.2f} below threshold {min_score} — no match")

    return None
