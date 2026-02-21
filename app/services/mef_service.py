"""
MEF Ejecución Financiera Service.

Primary: Queries MEF SSI API (ofi5.mef.gob.pe) in real-time — no CSV needed.
Fallback: Queries the local `mef_ejecucion` table (populated from MEF CSV).

Lookup order:
  1. CUI extracted from description → SSI API real-time lookup
  2. Text description → SSI text search → SSI financial lookup
  3. Route code (HU-118) → local DB LIKE search
  4. FULLTEXT → local DB as last resort
"""
import re
import unicodedata
import difflib
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.services.mef_ssi_api import get_ejecucion_by_cui_ssi, search_project_by_text_ssi

# Regex to extract CUI from licitacion descriptions
# CUI modernos tienen 7-8 digitos. Numeros de 5-6 digitos son SNIP antiguos y NO se usan como CUI.
# Handles: "CUI: 2314890", "CUI N° 2.314.890", "C.U.I. 2314890", etc.
CUI_PATTERN = re.compile(r'(?:CUI|C\.U\.I\.)[\s:]*(?:N[º°\.]?)?[\s:]*([\d.]{7,10})', re.IGNORECASE)
SNIP_PATTERN = re.compile(r'SNIP[\s:]*(?:N[º°\.]?)?[\s:]*(\d{5,8})', re.IGNORECASE)
# Route codes like RUTA HU-118, RUTA PE-1N, RUTA LM-118, etc.
ROUTE_PATTERN = re.compile(r'RUTA\s+([A-Z]{2,3})\s*[-–]\s*(\d{1,4}[A-Z]?)', re.IGNORECASE)

# Project type keywords — used to penalize type mismatches in fuzzy matching
PROJECT_TYPES = {
    "MANTENIMIENTO", "CONSTRUCCION", "INSTALACION", "MEJORAMIENTO",
    "REHABILITACION", "AMPLIACION", "CREACION", "EQUIPAMIENTO",
    "FORTALECIMIENTO", "RENOVACION", "ADECUACION",
}


def extract_project_type(text: str) -> str | None:
    """Extract the dominant project type keyword from a description."""
    if not text:
        return None
    upper = text.upper()
    for pt in PROJECT_TYPES:
        if pt in upper:
            return pt
    return None


def extract_cui(description: str) -> str | None:
    """Extract CUI code from a licitacion description.
    
    CUI modernos (Invierte.pe) tienen 7 o 8 dígitos.
    Números de 5-6 dígitos son SNIP antiguos y se ignoran.
    """
    if not description:
        return None
    matches = CUI_PATTERN.findall(description)
    for m in matches:
        # Strip thousand separators (dots in Spanish format)
        digits = re.sub(r'[^\d]', '', m)
        if len(digits) >= 7:  # Valid CUI: 7+ digits
            return digits
    # Don't fall back to SNIP numbers as CUI — they point to wrong projects
    return None


def extract_route_code(description: str) -> str | None:
    """Extract route code like 'RUTA HU-118' from a description."""
    if not description:
        return None
    match = ROUTE_PATTERN.search(description)
    if match:
        dept = match.group(1).upper()
        number = match.group(2).upper()
        return f"{dept}-{number}"
    return None


def clean_search_text(text_input: str, limit: int | None = 12) -> str:
    """
    Clean text for full-text search.
    Removes common stop words in public contracting descriptions and strips accents.
    """
    if not text_input:
        return ""
    
    # Strip accents and special chars
    nfkd_form = unicodedata.normalize('NFKD', text_input)
    text_input = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
    
    # Generic stop words -- NOTE: project-type keywords (MANTENIMIENTO, CONSTRUCCION, etc.)
    # are intentionally NOT stop words so they discriminate project types during matching.
    stop_words = {
        "CONTRATACION", "SERVICIO", 
        "DEPARTAMENTAL", "NO", "PAVIMENTADA", "DISTRITO", "PROVINCIA", 
        "DEPARTAMENTO", "DEL", "DE", "LA", "EL", "LOS", "LAS", "EN", "PARA", 
        "POR", "CON", "Y", "O", "A", "AL", "UN", "UNA", "QUE", "SE", "SU", 
        "SUS", "COMO", "DONDE", "CUANDO", "QUIEN", "CUAL", "ESTA", "ESTE", 
        "ESTOS", "ESTAS", "AQUEL", "AQUELLA", "AQUELLOS", "AQUELLAS", "LO", 
        "LE", "LES", "ME", "TE", "NOS", "OS", "MI", "TU",
        "OBRA", "CONSULTORIA", "SUPERVISION", "ELABORACION", 
        "EXPEDIENTE", "TECNICO", "SALDO", "ADQUISICION"
        # REMOVED: MANTENIMIENTO, EJECUCION, MEJORAMIENTO, CREACION, INSTALACION,
        # CONSTRUCCION, REHABILITACION, AMPLIACION, CARRETERA, PERIODICO
        # These discriminate project types and MUST be preserved for accurate matching.
    }
    
    # Replace non-alphanumeric with space
    clean_text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text_input.upper())
    words = clean_text.split()
    filtered = [w for w in words if w not in stop_words and len(w) > 3] # Increased min length to 3
    # Return meaningful tokens, applying limit if specified
    if limit is not None:
        return " ".join(filtered[:limit])
    return " ".join(filtered)


def _build_year_list(primary_year: int) -> list[int]:
    """Build ordered list of years to try.
    
    Priority: contract year first (most likely to have the budget allocation),
    then current year (for active monitoring), then adjacent years.
    This prevents 2024 contracts from showing 2026 data when 2024 execution is what matters.
    """
    current_year = datetime.now().year
    years = [primary_year]  # Contract year is the primary reference
    if current_year != primary_year:
        years.append(current_year)  # Current year for active monitoring
    
    # Add adjacent years as fallback
    for y in [primary_year + 1, current_year - 1, primary_year - 1]:
        if y not in years and y >= 2020:
            years.append(y)
    
    return years


def get_ejecucion_by_cui(db: Session, cui: str, years: list[int]) -> dict:
    """
    Query local mef_ejecucion table for financial execution by CUI.
    Tries multiple years in order until data is found.
    """
    for year in years:
        try:
            result = db.execute(text("""
                SELECT 
                    COALESCE(SUM(monto_pia), 0) as pia,
                    COALESCE(SUM(monto_pim), 0) as pim,
                    COALESCE(SUM(monto_certificado), 0) as certificado,
                    COALESCE(SUM(monto_comprometido_anual), 0) as compromiso_anual,
                    COALESCE(SUM(monto_devengado), 0) as devengado,
                    COALESCE(SUM(monto_girado), 0) as girado,
                    COUNT(*) as registros
                FROM mef_ejecucion
                WHERE producto_proyecto = :cui
                  AND ano_eje = :year
            """), {
                "cui": cui,
                "year": year,
            }).fetchone()

            if result and result[6] > 0:
                print(f"[MEF-LOCAL] CUI {cui} found in year {year} ({result[6]} rows)")
                return {
                    "pia": float(result[0]),
                    "pim": float(result[1]),
                    "certificado": float(result[2]),
                    "compromiso_anual": float(result[3]),
                    "devengado": float(result[4]),
                    "girado": float(result[5]),
                    "encontrado": True,
                    "error": None,
                    "registros": result[6],
                    "cui": cui,
                    "year_found": year,
                }

        except Exception as e:
            print(f"[MEF-LOCAL] CUI search error for year {year}: {e}")

    return _empty_result(
        f"Sin datos MEF para CUI {cui} en años {years}.",
        cui=cui
    )


def _route_search(db: Session, route_code: str, years: list[int]) -> dict | None:
    """
    Search meta_nombre with LIKE for a specific route code (e.g. 'HU-118').
    More precise than FULLTEXT for route identifiers.
    """
    for year in years:
        try:
            result = db.execute(text("""
                SELECT 
                    COALESCE(SUM(monto_pia), 0) as pia,
                    COALESCE(SUM(monto_pim), 0) as pim,
                    COALESCE(SUM(monto_certificado), 0) as certificado,
                    COALESCE(SUM(monto_comprometido_anual), 0) as compromiso_anual,
                    COALESCE(SUM(monto_devengado), 0) as devengado,
                    COALESCE(SUM(monto_girado), 0) as girado,
                    COUNT(*) as registros,
                    producto_proyecto
                FROM mef_ejecucion
                WHERE meta_nombre LIKE :pattern
                  AND ano_eje = :year
                GROUP BY producto_proyecto
                ORDER BY pim DESC
                LIMIT 1
            """), {
                "pattern": f"%{route_code}%",
                "year": year
            }).fetchone()

            if result and result[6] > 0:
                print(f"[MEF-LOCAL] Route '{route_code}' found in meta_nombre (year {year}, CUI={result[7]})")
                return {
                    "pia": float(result[0]),
                    "pim": float(result[1]),
                    "certificado": float(result[2]),
                    "compromiso_anual": float(result[3]),
                    "devengado": float(result[4]),
                    "girado": float(result[5]),
                    "encontrado": True,
                    "error": None,
                    "registros": result[6],
                    "cui": result[7],
                    "match_type": "route",
                    "year_found": year,
                }
        except Exception as e:
            print(f"[MEF-LOCAL] Route search error year {year}: {e}")

    return None


def _fts_search(db: Session, search_term: str, original_description: str, years: list[int],
                departamento: str = None) -> dict | None:
    """
    FULLTEXT search on producto_proyecto_nombre and meta_nombre.
    Scores top candidates and picks the one with highest visual similarity to the original description.
    
    Improvements:
    - Filters by departamento_meta if provided (avoids cross-region false matches)
    - Penalizes -0.30 if project type (MANTENIMIENTO vs CONSTRUCCION) differs
    - Tries multiple years.
    """
    if not original_description:
        return None
        
    # Clean original description for comparison (strip accents, upper, remove stopwords)
    clean_original = clean_search_text(original_description, limit=None)
    
    if not clean_original:
        return None
    
    # Extract project type from the SEACE description for mismatch penalty
    orig_type = extract_project_type(original_description)
    
    for year in years:
        try:
            # Build optional department filter
            dept_filter = "AND departamento_meta = :departamento" if departamento else ""
            
            # Search producto_proyecto_nombre first, getting top candidates
            results = db.execute(text(f"""
                SELECT 
                    COALESCE(SUM(monto_pia), 0) as pia,
                    COALESCE(SUM(monto_pim), 0) as pim,
                    COALESCE(SUM(monto_certificado), 0) as certificado,
                    COALESCE(SUM(monto_comprometido_anual), 0) as compromiso_anual,
                    COALESCE(SUM(monto_devengado), 0) as devengado,
                    COALESCE(SUM(monto_girado), 0) as girado,
                    COUNT(*) as registros,
                    producto_proyecto,
                    producto_proyecto_nombre,
                    MAX(MATCH(producto_proyecto_nombre) AGAINST (:term IN NATURAL LANGUAGE MODE)) as score
                FROM mef_ejecucion
                WHERE MATCH(producto_proyecto_nombre) AGAINST (:term IN NATURAL LANGUAGE MODE)
                  AND ano_eje = :year
                  {dept_filter}
                GROUP BY producto_proyecto, producto_proyecto_nombre
                HAVING score > 5.0
                ORDER BY score DESC
                LIMIT 15
            """), {
                "term": search_term,
                "year": year,
                "departamento": departamento,
            }).fetchall()

            if results:
                best_match = None
                best_score = 0.0
                orig_words = set(clean_original.split())
                
                for r in results:
                    proj_name = r[8] if r[8] else ""
                    clean_proj = clean_search_text(proj_name, limit=None)
                    proj_words = set(clean_proj.split())
                    
                    if not orig_words or not proj_words:
                        continue
                        
                    # Token intersection (order independent)
                    intersection = len(orig_words.intersection(proj_words))
                    overlap_ratio = intersection / min(len(orig_words), len(proj_words))
                    
                    # Sequence ratio on word lists (order dependent)
                    seq_ratio = difflib.SequenceMatcher(None, clean_original.split(), clean_proj.split()).ratio()
                    
                    final_score = (overlap_ratio + seq_ratio) / 2
                    
                    # 1.2: Penalize if project type differs (MANTENIMIENTO vs CONSTRUCCION)
                    proj_type = extract_project_type(proj_name)
                    if orig_type and proj_type and orig_type != proj_type:
                        final_score -= 0.30
                    
                    if final_score > best_score:
                        best_score = final_score
                        best_match = r
                
                # Only return if we found an acceptable match
                if best_match and best_score > 0.40:
                    print(f"[MEF-LOCAL] FTS match on producto_proyecto_nombre (year {year}, CUI={best_match[7]}, score={best_score:.2f})")
                    return {
                        "pia": float(best_match[0]),
                        "pim": float(best_match[1]),
                        "certificado": float(best_match[2]),
                        "compromiso_anual": float(best_match[3]),
                        "devengado": float(best_match[4]),
                        "girado": float(best_match[5]),
                        "encontrado": True,
                        "error": None,
                        "registros": best_match[6],
                        "cui": best_match[7],
                        "match_type": "fuzzy",
                        "year_found": year,
                        "match_score": round(best_score, 2),
                    }
        except Exception as e:
            print(f"[MEF-LOCAL] FTS producto search error year {year}: {e}")

        # Also try meta_nombre using similar logic
        try:
            results = db.execute(text(f"""
                SELECT 
                    COALESCE(SUM(monto_pia), 0) as pia,
                    COALESCE(SUM(monto_pim), 0) as pim,
                    COALESCE(SUM(monto_certificado), 0) as certificado,
                    COALESCE(SUM(monto_comprometido_anual), 0) as compromiso_anual,
                    COALESCE(SUM(monto_devengado), 0) as devengado,
                    COALESCE(SUM(monto_girado), 0) as girado,
                    COUNT(*) as registros,
                    producto_proyecto,
                    meta_nombre,
                    MAX(MATCH(meta_nombre) AGAINST (:term IN NATURAL LANGUAGE MODE)) as score
                FROM mef_ejecucion
                WHERE MATCH(meta_nombre) AGAINST (:term IN NATURAL LANGUAGE MODE)
                  AND ano_eje = :year
                  {dept_filter}
                GROUP BY producto_proyecto, meta_nombre
                HAVING score > 5.0
                ORDER BY score DESC
                LIMIT 15
            """), {
                "term": search_term,
                "year": year,
                "departamento": departamento,
            }).fetchall()

            if results:
                best_match = None
                best_score = 0.0
                orig_words = set(clean_original.split())
                
                for r in results:
                    meta_name = r[8] if r[8] else ""
                    clean_meta = clean_search_text(meta_name, limit=None)
                    meta_words = set(clean_meta.split())
                    
                    if not orig_words or not meta_words:
                        continue
                        
                    intersection = len(orig_words.intersection(meta_words))
                    overlap_ratio = intersection / min(len(orig_words), len(meta_words))
                    seq_ratio = difflib.SequenceMatcher(None, clean_original.split(), clean_meta.split()).ratio()
                    
                    final_score = (overlap_ratio + seq_ratio) / 2
                    
                    # 1.2: Penalize project type mismatch
                    meta_type = extract_project_type(meta_name)
                    if orig_type and meta_type and orig_type != meta_type:
                        final_score -= 0.30
                    
                    if final_score > best_score:
                        best_score = final_score
                        best_match = r
                
                if best_match and best_score > 0.40:
                    print(f"[MEF-LOCAL] FTS match on meta_nombre (year {year}, CUI={best_match[7]}, score={best_score:.2f})")
                    return {
                        "pia": float(best_match[0]),
                        "pim": float(best_match[1]),
                        "certificado": float(best_match[2]),
                        "compromiso_anual": float(best_match[3]),
                        "devengado": float(best_match[4]),
                        "girado": float(best_match[5]),
                        "encontrado": True,
                        "error": None,
                        "registros": best_match[6],
                        "cui": best_match[7],
                        "match_type": "fuzzy_meta",
                        "year_found": year,
                        "match_score": round(best_score, 2),
                    }
        except Exception as e:
            print(f"[MEF-LOCAL] FTS meta search error year {year}: {e}")

    return None


def get_ejecucion_financiera(db: Session, ruc: str, year: int, description: str = None,
                             departamento: str = None) -> dict:
    """
    Main entry point. Lookup order:
    1. CUI extracted from description (7+ digits) → SSI API real-time
    2. Text search via SSI API → fuzzy CUI resolution → SSI real-time
    3. Route code (e.g. HU-118) → local DB LIKE search (fallback)
    4. FULLTEXT → local DB filtered by departamento (last resort fallback)
    """
    years = _build_year_list(year)
    desc_preview = description[:80] if description else 'None'
    print(f"[MEF] Searching with years={years}, dept={departamento}, desc={desc_preview}")

    # ── Step 1: CUI extracted from description → SSI real-time ──
    if description:
        cui = extract_cui(description)
        if cui:
            print(f"[MEF-SSI] CUI extracted from description: {cui}")
            result = get_ejecucion_by_cui_ssi(cui)
            if result and result.get("encontrado") and result.get("pim", 0) > 0:
                return result
            print(f"[MEF-SSI] CUI {cui} via SSI API returned no data. Trying local DB...")
            # Fallback to local DB for extracted CUI
            local = get_ejecucion_by_cui(db, cui, years)
            if local["encontrado"] and local.get("pim", 0) > 0:
                return local
            print(f"[MEF-LOCAL] CUI {cui} also no data in local DB.")

    # ── Step 2: No CUI → SSI text search ──
    if description:
        print(f"[MEF-SSI] No CUI found, attempting text-based SSI search...")
        result = search_project_by_text_ssi(description)
        if result and result.get("encontrado") and result.get("pim", 0) > 0:
            return result

    # ── Step 3: Route code search on local DB (for road projects) ──
    if description:
        route = extract_route_code(description)
        if route:
            result = _route_search(db, route, years)
            if result:
                return result

    # ── Step 4: FULLTEXT local DB filtered by departamento (last resort) ──
    if description:
        search_term = clean_search_text(description)
        if len(search_term) > 5:
            result = _fts_search(db, search_term, description, years, departamento=departamento)
            if result:
                return result

    return _empty_result("Sin datos de ejecuón MEF para esta licitación.")


def _empty_result(error: str = None, cui: str = None) -> dict:
    return {
        "pia": 0,
        "pim": 0,
        "certificado": 0,
        "compromiso_anual": 0,
        "devengado": 0,
        "girado": 0,
        "encontrado": False,
        "error": error,
        "registros": 0,
        "cui": cui,
    }
