"""
SUNAT RUC consultation service using apiperu.dev API.
Provides cached lookups for RUC info, deuda coactiva, and representantes legales.
"""
import os
import json
import requests
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import text

APIPERU_TOKEN = os.getenv("APIPERU_TOKEN", "")
APIPERU_BASE = "https://apiperu.dev/api"
CACHE_DAYS = 7


def _apiperu_headers():
    return {
        "Authorization": f"Bearer {APIPERU_TOKEN}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def _call_apiperu(endpoint: str, ruc: str) -> dict | None:
    """Call an apiperu.dev endpoint. Returns parsed JSON data or None on error."""
    try:
        url = f"{APIPERU_BASE}/{endpoint}"
        resp = requests.post(url, json={"ruc": ruc}, headers=_apiperu_headers(), timeout=15)
        if resp.status_code == 200:
            body = resp.json()
            if body.get("success"):
                return body.get("data", {})
            print(f"[SUNAT] API returned success=false for {endpoint}/{ruc}: {body}")
            return None
        print(f"[SUNAT] API {endpoint} returned {resp.status_code}: {resp.text[:200]}")
        return None
    except Exception as e:
        print(f"[SUNAT] Error calling {endpoint} for {ruc}: {e}")
        return None


def get_ruc_info(ruc: str, db: Session, force_refresh: bool = False) -> dict:
    """
    Get full SUNAT data for a RUC: general info + deuda coactiva + representantes.
    Uses DB cache (7 days TTL). Set force_refresh=True to bypass cache.
    """
    ruc = ruc.strip()
    if len(ruc) != 11 or not ruc.isdigit():
        return {"error": "RUC debe tener 11 dígitos numéricos", "encontrado": False}

    # 1. Check cache
    if not force_refresh:
        cached = _get_from_cache(ruc, db)
        if cached:
            return cached

    # 2. Fetch from API (3 calls)
    ruc_data = _call_apiperu("ruc", ruc)
    if not ruc_data:
        return {"error": "No se pudo obtener datos de SUNAT", "encontrado": False, "ruc": ruc}

    print(f"[SUNAT DEBUG] RUC {ruc} Keys: {list(ruc_data.keys())}")
    print(f"[SUNAT DEBUG] Address: {ruc_data.get('direccion')}, Completa: {ruc_data.get('direccion_completa')}")
    print(f"[SUNAT DEBUG] Loc: {ruc_data.get('distrito')} / {ruc_data.get('provincia')} / {ruc_data.get('departamento')}")

    deuda_data = _call_apiperu("ruc-deuda-coactiva", ruc)
    repr_data = _call_apiperu("ruc-representantes", ruc)

    # Fix typos in debt data if any
    if deuda_data and isinstance(deuda_data, list):
        for d in deuda_data:
            if "periodo_tibutario" in d:
                d["periodo_tributario"] = d["periodo_tibutario"]
            if "fecha_inicio_cobranza" not in d and "fecha_inicio" in d:
                d["fecha_inicio_cobranza"] = d["fecha_inicio"]

    # 3. Build result
    result = {
        "encontrado": True,
        "ruc": ruc,
        "razon_social": ruc_data.get("nombre_o_razon_social", ""),
        "tipo_contribuyente": ruc_data.get("tipo_contribuyente", ""),
        "nombre_comercial": ruc_data.get("nombre_comercial", ""),
        "estado_contribuyente": ruc_data.get("estado", ""),
        "condicion_contribuyente": ruc_data.get("condicion", ""),
        "domicilio_fiscal": ruc_data.get("direccion_completa") or ruc_data.get("direccion", ""),
    }

    # Fallback to manual concatenation if address is too short (missing location)
    addr = result["domicilio_fiscal"]
    base_addr = ruc_data.get("direccion", "")
    dist = ruc_data.get("distrito", "")
    prov = ruc_data.get("provincia", "")
    dep = ruc_data.get("departamento", "")
    if len(addr) <= len(base_addr) + 5 and dist and prov and dep:
        result["domicilio_fiscal"] = f"{base_addr}, {dist} - {prov} - {dep}"

    # Re-assuring certain fields for the rest of the logic
    result.update({
        "actividades_economicas": ruc_data.get("actividad_economica", []),
        "comprobantes_pago": ruc_data.get("comprobantes", ""),
        "sistema_emision": ruc_data.get("sistema_emision", ""),
        "sistema_contabilidad": ruc_data.get("sistema_contabilidad", ""),
        "actividad_comercio_exterior": ruc_data.get("actividad_comercio_exterior", ""),
        "sistema_emision_electronica": ruc_data.get("sistema_emision_electronica", ""),
        "fecha_inscripcion": ruc_data.get("fecha_inscripcion", ""),
        "fecha_inicio_actividades": ruc_data.get("fecha_inicio_actividades", ""),
        "emisor_electronico_desde": ruc_data.get("emisor_electronico_desde", ""),
        "padrones": ruc_data.get("padrones", ""),
        "deuda_coactiva": deuda_data if deuda_data else [],
        "representantes_legales": repr_data if repr_data else [],
        "fecha_consulta": datetime.now().isoformat(),
    })

    # 4. Save to cache
    _save_to_cache(ruc, result, db)

    return result


def buscar_rucs_por_nombre(nombre: str, db: Session, limit: int = 10) -> list[dict]:
    """
    Search for RUCs in local DB by company/consortium name.
    Looks in ganador_nombre and nombre_miembro tables.
    Returns list of {ruc, nombre, fuente} dicts.
    """
    nombre = nombre.strip()
    if len(nombre) < 3:
        return []

    term = f"%{nombre}%"
    results = []
    seen_rucs = set()

    # Search in licitaciones_adjudicaciones (ganador)
    sql_adj = text("""
        SELECT DISTINCT ganador_ruc, ganador_nombre
        FROM licitaciones_adjudicaciones
        WHERE ganador_nombre LIKE :term AND ganador_ruc IS NOT NULL AND ganador_ruc != ''
        LIMIT :lim
    """)
    rows = db.execute(sql_adj, {"term": term, "lim": limit}).fetchall()
    for r in rows:
        if r[0] and r[0] not in seen_rucs:
            seen_rucs.add(r[0])
            results.append({"ruc": r[0], "nombre": r[1], "fuente": "ganador"})

    # Search in detalle_consorcios (miembro)
    sql_cons = text("""
        SELECT DISTINCT ruc_miembro, nombre_miembro
        FROM detalle_consorcios
        WHERE nombre_miembro LIKE :term AND ruc_miembro IS NOT NULL AND ruc_miembro != ''
        LIMIT :lim
    """)
    rows = db.execute(sql_cons, {"term": term, "lim": limit}).fetchall()
    for r in rows:
        if r[0] and r[0] not in seen_rucs:
            seen_rucs.add(r[0])
            results.append({"ruc": r[0], "nombre": r[1], "fuente": "consorcio"})

    return results[:limit]


def _get_from_cache(ruc: str, db: Session) -> dict | None:
    """Get cached SUNAT data if fresh enough (< CACHE_DAYS old)."""
    sql = text("SELECT * FROM consulta_ruc WHERE ruc = :ruc")
    row = db.execute(sql, {"ruc": ruc}).fetchone()
    if not row:
        return None

    # Check age
    row_dict = dict(row._mapping)
    fecha_consulta = row_dict.get("fecha_consulta")
    if fecha_consulta:
        if isinstance(fecha_consulta, str):
            fecha_consulta = datetime.fromisoformat(fecha_consulta)
        age = datetime.now() - fecha_consulta
        if age > timedelta(days=CACHE_DAYS):
            return None  # Expired

    # Parse JSON fields
    result = {
        "encontrado": True,
        "ruc": row_dict["ruc"],
        "razon_social": row_dict.get("razon_social", ""),
        "tipo_contribuyente": row_dict.get("tipo_contribuyente", ""),
        "nombre_comercial": row_dict.get("nombre_comercial", ""),
        "estado_contribuyente": row_dict.get("estado_contribuyente", ""),
        "condicion_contribuyente": row_dict.get("condicion_contribuyente", ""),
        "domicilio_fiscal": row_dict.get("domicilio_fiscal", ""),
        "sistema_emision": row_dict.get("sistema_emision", ""),
        "sistema_contabilidad": row_dict.get("sistema_contabilidad", ""),
        "actividad_comercio_exterior": row_dict.get("actividad_comercio_exterior", ""),
        "sistema_emision_electronica": row_dict.get("sistema_emision_electronica", ""),
        "fecha_inscripcion": row_dict.get("fecha_inscripcion", ""),
        "fecha_inicio_actividades": row_dict.get("fecha_inicio_actividades", ""),
        "emisor_electronico_desde": row_dict.get("emisor_electronico_desde", ""),
        "padrones": row_dict.get("padrones", ""),
        "fecha_consulta": str(fecha_consulta) if fecha_consulta else "",
        "fuente": "cache",
    }

    # Parse JSON
    for json_field in ["actividades_economicas", "comprobantes_pago", "deuda_coactiva", "representantes_legales"]:
        raw = row_dict.get(json_field, "")
        if raw:
            try:
                result[json_field] = json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                result[json_field] = raw
        else:
            result[json_field] = []

    return result


def _save_to_cache(ruc: str, data: dict, db: Session):
    """Insert or update SUNAT data in cache table."""
    try:
        # Serialize JSON fields
        actividades = json.dumps(data.get("actividades_economicas", []), ensure_ascii=False)
        comprobantes = json.dumps(data.get("comprobantes_pago", ""), ensure_ascii=False) if isinstance(data.get("comprobantes_pago"), (list, dict)) else str(data.get("comprobantes_pago", ""))
        deuda = json.dumps(data.get("deuda_coactiva", []), ensure_ascii=False)
        representantes = json.dumps(data.get("representantes_legales", []), ensure_ascii=False)

        sql = text("""
            INSERT INTO consulta_ruc (
                ruc, razon_social, tipo_contribuyente, nombre_comercial,
                estado_contribuyente, condicion_contribuyente, domicilio_fiscal,
                actividades_economicas, comprobantes_pago,
                sistema_emision, sistema_contabilidad, actividad_comercio_exterior,
                sistema_emision_electronica, fecha_inscripcion, fecha_inicio_actividades,
                emisor_electronico_desde, padrones,
                deuda_coactiva, representantes_legales, fecha_consulta
            ) VALUES (
                :ruc, :razon_social, :tipo_contribuyente, :nombre_comercial,
                :estado, :condicion, :domicilio,
                :actividades, :comprobantes,
                :emision, :contabilidad, :comercio_ext,
                :emision_elec, :fecha_insc, :fecha_inicio,
                :emisor_elec_desde, :padrones,
                :deuda, :representantes, NOW()
            )
            ON DUPLICATE KEY UPDATE
                razon_social = VALUES(razon_social),
                tipo_contribuyente = VALUES(tipo_contribuyente),
                nombre_comercial = VALUES(nombre_comercial),
                estado_contribuyente = VALUES(estado_contribuyente),
                condicion_contribuyente = VALUES(condicion_contribuyente),
                domicilio_fiscal = VALUES(domicilio_fiscal),
                actividades_economicas = VALUES(actividades_economicas),
                comprobantes_pago = VALUES(comprobantes_pago),
                sistema_emision = VALUES(sistema_emision),
                sistema_contabilidad = VALUES(sistema_contabilidad),
                actividad_comercio_exterior = VALUES(actividad_comercio_exterior),
                sistema_emision_electronica = VALUES(sistema_emision_electronica),
                fecha_inscripcion = VALUES(fecha_inscripcion),
                fecha_inicio_actividades = VALUES(fecha_inicio_actividades),
                emisor_electronico_desde = VALUES(emisor_electronico_desde),
                padrones = VALUES(padrones),
                deuda_coactiva = VALUES(deuda_coactiva),
                representantes_legales = VALUES(representantes_legales),
                fecha_consulta = NOW()
        """)

        db.execute(sql, {
            "ruc": ruc,
            "razon_social": data.get("razon_social", ""),
            "tipo_contribuyente": data.get("tipo_contribuyente", ""),
            "nombre_comercial": data.get("nombre_comercial", ""),
            "estado": data.get("estado_contribuyente", ""),
            "condicion": data.get("condicion_contribuyente", ""),
            "domicilio": data.get("domicilio_fiscal", ""),
            "actividades": actividades,
            "comprobantes": comprobantes,
            "emision": data.get("sistema_emision", ""),
            "contabilidad": data.get("sistema_contabilidad", ""),
            "comercio_ext": data.get("actividad_comercio_exterior", ""),
            "emision_elec": data.get("sistema_emision_electronica", ""),
            "fecha_insc": data.get("fecha_inscripcion", ""),
            "fecha_inicio": data.get("fecha_inicio_actividades", ""),
            "emisor_elec_desde": data.get("emisor_electronico_desde", ""),
            "padrones": data.get("padrones", ""),
            "deuda": deuda,
            "representantes": representantes,
        })
        db.commit()
        print(f"[SUNAT] Cache saved for RUC {ruc}")
    except Exception as e:
        print(f"[SUNAT] Error saving cache for {ruc}: {e}")
        db.rollback()
