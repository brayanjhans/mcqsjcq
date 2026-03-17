"""
Integration router for MEF and OCDS external API queries.
Provides endpoints to fetch financial execution data and guarantee status.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.services.mef_service import get_ejecucion_financiera
from app.services.ocds_service import get_garantias
from app.services.infobras_service import InfobrasService


import subprocess
import os
import sys
import urllib.request
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import requests

router = APIRouter(prefix="/api/integraciones", tags=["Integraciones"])

mef_scheduler = BackgroundScheduler()

# Global state for tracking MEF updates
mef_update_state = {
    "is_running": False,
    "current_step": "",
    "logs": []
}

def download_and_import_mef(year: int):
    """Background task to download and run the MEF import script."""
    global mef_update_state
    try:
        mef_update_state["is_running"] = True
        mef_update_state["logs"] = []
        
        script_dir = os.path.join(os.path.dirname(__file__), "..", "..", "scripts")
        script_dir = os.path.abspath(script_dir)
        csv_path = os.path.join(script_dir, f"mef_{year}_gasto.csv")
        
        mef_update_state["current_step"] = f"Descargando datos del MEF (año {year}). Esto puede tomar varios minutos..."
        mef_update_state["logs"].append(mef_update_state["current_step"])
        print(f"[MEF-UPDATE] {mef_update_state['current_step']}")
        
        url = f"https://fs.datosabiertos.mef.gob.pe/datastorefiles/{year}-Gasto-Devengado-Diario.csv"
        
        # Download the latest CSV from the MEF with streaming to avoid Memory Errors and fake User-Agent to bypass Anti-Bot
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive"
        }
        with requests.get(url, stream=True, headers=headers, timeout=60) as r:
            r.raise_for_status() # Raise exception for 403, 404, etc.
            with open(csv_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192): 
                    f.write(chunk)
        
        mef_update_state["current_step"] = f"Procesando CSV e importando proyectos a la base de datos local..."
        mef_update_state["logs"].append(mef_update_state["current_step"])
        print(f"[MEF-UPDATE] {mef_update_state['current_step']}")
        
        # Run script
        import_script = os.path.join(script_dir, "import_mef_csv.py")
        result = subprocess.run(
            [sys.executable, import_script, "--year", str(year), "--all-rows", "--incremental"],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            mef_update_state["current_step"] = "Finalizado exitosamente"
            mef_update_state["logs"].append(result.stdout)
            print("[MEF-UPDATE] Verification successful.")
        else:
            mef_update_state["current_step"] = f"Error en la importación (código {result.returncode})"
            mef_update_state["logs"].append(result.stderr)
            print(f"[MEF-UPDATE] Failed with code {result.returncode}")
            
    except Exception as e:
        mef_update_state["current_step"] = f"Error inesperado: {str(e)}"
        mef_update_state["logs"].append(str(e))
        print(f"[MEF-UPDATE] Exception: {e}")
    finally:
        mef_update_state["is_running"] = False
        print("[MEF-UPDATE] Finished.")

def auto_update_mef():
    """Wrapper for the scheduled job. Runs every 4h during business hours (8am-6pm), 12h otherwise."""
    if not mef_update_state.get("is_running", False):
        now = datetime.now()
        print(f"[MEF-UPDATE] Starting scheduled auto-update... (hour={now.hour})")
        download_and_import_mef(now.year)

def _get_next_interval_hours() -> int:
    """Return 4 always to guarantee 24/7 updates as requested."""
    return 4

def start_mef_scheduler():
    """Start the MEF auto-update scheduler with absolute cron hours (called from main.py)"""
    if not mef_scheduler.running:
        mef_scheduler.add_job(
            auto_update_mef,
            trigger=CronTrigger(hour='0,4,8,12,16,20', minute='0'),
            id='mef_auto_update',
            name='MEF CSV Auto Update (Absolute Cron)',
            replace_existing=True
        )
        mef_scheduler.start()
        print(f"[MEF-UPDATE] Auto-update scheduler started (Cron: 0,4,8,12,16,20:00)")

def stop_mef_scheduler():
    """Stop the MEF auto-update scheduler"""
    if mef_scheduler.running:
        mef_scheduler.shutdown()


@router.post("/update-mef")
def trigger_mef_update(background_tasks: BackgroundTasks):
    """Trigger the MEF CSV download and import process in the background."""
    global mef_update_state
    
    if mef_update_state.get("is_running", False):
        raise HTTPException(status_code=409, detail="La actualización ya está en progreso.")
        
    current_year = datetime.now().year
    background_tasks.add_task(download_and_import_mef, current_year)
    return {"message": "Actualización MEF iniciada. Puede tomar unos minutos."}

@router.get("/update-mef/status")
def get_mef_update_status():
    """Check the status of the background MEF update process."""
    global mef_update_state
    return {
        "is_running": mef_update_state.get("is_running", False),
        "current_step": mef_update_state.get("current_step", ""),
        "logs": mef_update_state.get("logs", [])
    }

@router.get("/update-mef/last-updated")
def get_mef_last_updated():
    """Get the modification date of the downloaded MEF CSV."""
    year = datetime.now().year
    script_dir = os.path.join(os.path.dirname(__file__), "..", "..", "scripts")
    csv_path = os.path.join(os.path.abspath(script_dir), f"mef_{year}_gasto.csv")
    
    if os.path.exists(csv_path):
        mtime = os.path.getmtime(csv_path)
        return {"last_updated": datetime.fromtimestamp(mtime).isoformat()}
    return {"last_updated": None}


# ─────────────────────────────────────────────────────────────────────────────
# OSCE/SEACE PIPELINE ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

# Estado global del pipeline OSCE
osce_update_state = {
    "is_running": False,
    "current_step": "",
    "logs": []
}

def run_pipeline_osce_background():
    """Background task: lanza el pipeline maestro como subproceso y hace seguimiento."""
    global osce_update_state
    
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    pipeline_script = os.path.join(base_dir, "0_pipeline_maestro.py")
    logs_dir = os.path.join(base_dir, "logs")
    os.makedirs(logs_dir, exist_ok=True)
    log_file = os.path.join(logs_dir, "pipeline_osce.log")
    anio = datetime.now().year

    try:
        osce_update_state["is_running"] = True
        osce_update_state["logs"] = []

        osce_update_state["current_step"] = f"Iniciando pipeline incremental OSCE ({anio})..."
        osce_update_state["logs"].append(osce_update_state["current_step"])
        print(f"[OSCE-UPDATE] {osce_update_state['current_step']}")

        # --- Detectar entorno virtual ---
        python_exec = sys.executable
        for venv_path in [
            os.path.join(base_dir, "venv", "bin", "python3"),
            os.path.join(base_dir, ".venv", "bin", "python3"),
            os.path.join(base_dir, "venv", "Scripts", "python.exe"),
            os.path.join(base_dir, ".venv", "Scripts", "python.exe")
        ]:
            if os.path.exists(venv_path):
                python_exec = venv_path
                break

        cmd = [python_exec, pipeline_script, "--year", str(anio)]
        kwargs = {}
        if sys.platform == "win32":
            kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW

        with open(log_file, "a", encoding="utf-8") as f_log:
            f_log.write(f"\n\n{'='*60}\n[{datetime.now()}] Pipeline OSCE iniciado desde UI\n{'='*60}\n")

        osce_update_state["current_step"] = "Verificando SHA y descargando datos de OSCE/SEACE..."
        proc = subprocess.run(
            cmd,
            cwd=base_dir,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            **kwargs
        )

        # Guardar output en log
        with open(log_file, "a", encoding="utf-8") as f_log:
            f_log.write(proc.stdout or "")
            f_log.write(proc.stderr or "")

        if proc.returncode == 0:
            # Detectar si el pipeline tuvo cambios o no basándose en el output
            output_lower = (proc.stdout or "").lower()
            if "sin cambios" in output_lower or "sin archivos nuevos" in output_lower:
                osce_update_state["current_step"] = "Sin cambios nuevos"
            else:
                osce_update_state["current_step"] = "Actualizado con datos nuevos"
            print("[OSCE-UPDATE] Pipeline completado.")

        else:
            osce_update_state["current_step"] = f"Error en la ejecución (código {proc.returncode})"
            print(f"[OSCE-UPDATE] Pipeline falló con código {proc.returncode}")

        osce_update_state["logs"].append(osce_update_state["current_step"])

    except Exception as e:
        osce_update_state["current_step"] = f"Error inesperado: {str(e)}"
        osce_update_state["logs"].append(str(e))
        print(f"[OSCE-UPDATE] Excepción: {e}")
    finally:
        osce_update_state["is_running"] = False
        print("[OSCE-UPDATE] Finalizado.")


@router.post("/update-osce")
def trigger_osce_update(background_tasks: BackgroundTasks):
    """Lanza el pipeline incremental OSCE/SEACE en segundo plano."""
    global osce_update_state

    if osce_update_state.get("is_running", False):
        raise HTTPException(status_code=409, detail="El pipeline OSCE ya está en ejecución.")

    background_tasks.add_task(run_pipeline_osce_background)
    return {"message": f"Pipeline OSCE iniciado para el año {datetime.now().year}."}


@router.get("/update-osce/status")
def get_osce_update_status():
    """Devuelve el estado actual del pipeline OSCE (para polling desde el frontend)."""
    global osce_update_state
    return {
        "is_running": osce_update_state.get("is_running", False),
        "current_step": osce_update_state.get("current_step", ""),
        "logs": osce_update_state.get("logs", [])
    }





@router.get("/ejecucion/{id_convocatoria}")
def get_ejecucion(id_convocatoria: str, db: Session = Depends(get_db)):
    """
    Get financial execution data from MEF for a specific licitacion.
    Fetches MONTO_DEVENGADO and MONTO_GIRADO, then calculates % avance.
    """
    try:
        # Get adjudicacion data + description + departamento (for CUI/dept filtering)
        sql = text("""
            SELECT 
                a.ganador_ruc,
                a.monto_adjudicado,
                a.id_contrato,
                c.fecha_publicacion,
                c.ocid,
                c.descripcion,
                c.departamento,
                c.cui
            FROM licitaciones_adjudicaciones a
            JOIN licitaciones_cabecera c ON a.id_convocatoria = c.id_convocatoria
            WHERE a.id_convocatoria = :id
            LIMIT 1
        """)

        row = db.execute(sql, {"id": id_convocatoria.strip()}).fetchone()

        if not row:
            return {
                "encontrado": False,
                "error": "Licitación no encontrada en la base de datos local",
                "devengado": 0,
                "girado": 0,
                "monto_adjudicado": 0,
                "porcentaje_girado": 0,
            }

        ganador_ruc = row[0]
        monto_adjudicado = float(row[1]) if row[1] else 0
        id_contrato = str(row[2]).strip() if row[2] else None
        fecha_publicacion = row[3]
        descripcion = str(row[5]) if row[5] else None
        departamento = str(row[6]).strip().upper() if row[6] else None
        cui_directo = str(row[7]).strip() if row[7] else None
        
        # Determine the year from fecha_publicacion
        year = 2026  # Default
        if fecha_publicacion:
            try:
                year = fecha_publicacion.year
            except Exception:
                pass

        if not ganador_ruc:
            return {
                "encontrado": False,
                "error": "No se encontró RUC del ganador",
                "devengado": 0,
                "girado": 0,
                "monto_adjudicado": monto_adjudicado,
                "porcentaje_girado": 0,
            }

        # Query MEF data: SSI API first, local DB as fallback
        mef_data = get_ejecucion_financiera(
            db=db,
            ruc=ganador_ruc,
            year=year,
            description=descripcion,
            departamento=departamento,
            cui_directo=cui_directo
        )

        # Calculate percentage
        girado = mef_data.get("girado", 0)
        porcentaje_girado = 0
        if monto_adjudicado > 0 and girado > 0:
            porcentaje_girado = round((girado / monto_adjudicado) * 100, 2)

        return {
            "pia": mef_data.get("pia", 0),
            "pim": mef_data.get("pim", 0),
            "certificado": mef_data.get("certificado", 0),
            "compromiso_anual": mef_data.get("compromiso_anual", 0),
            "devengado": mef_data.get("devengado", 0),
            "girado": girado,
            "monto_adjudicado": monto_adjudicado,
            "porcentaje_girado": porcentaje_girado,
            "encontrado": mef_data.get("encontrado", False),
            "error": mef_data.get("error"),
            "ruc_consultado": ganador_ruc,
            "cui": mef_data.get("cui"),
            "match_type": mef_data.get("match_type"),
            "match_score": mef_data.get("match_score"),
            "matched_name": mef_data.get("matched_name"),
            "source": mef_data.get("source", "local_db"),
            "year": mef_data.get("year_found", year),
            "id_contrato": id_contrato,
            "historial": mef_data.get("historial", []),
        }

    except Exception as e:
        print(f"[INTEGRACIONES] Error in ejecucion endpoint: {e}")
        return {
            "encontrado": False,
            "error": str(e),
            "devengado": 0,
            "girado": 0,
            "monto_adjudicado": 0,
            "porcentaje_girado": 0,
        }


@router.get("/ejecucion/{id_convocatoria}/debug")
def get_ejecucion_debug(id_convocatoria: str, db: Session = Depends(get_db)):
    """
    Debug endpoint: returns matching diagnostics for a licitacion.
    Shows CUI used, match type (SSI exact / fuzzy / local DB), score, and year.
    Useful for investigating data accuracy.
    """
    from app.services.mef_service import extract_cui, extract_route_code, extract_project_type
    try:
        sql = text("""
            SELECT 
                c.descripcion, c.fecha_publicacion, c.departamento,
                a.ganador_ruc, a.monto_adjudicado, c.cui
            FROM licitaciones_cabecera c
            LEFT JOIN licitaciones_adjudicaciones a ON c.id_convocatoria = a.id_convocatoria
            WHERE c.id_convocatoria = :id
            LIMIT 1
        """)
        row = db.execute(sql, {"id": id_convocatoria.strip()}).fetchone()
        if not row:
            return {"error": "Licitación no encontrada"}

        descripcion = str(row[0]) if row[0] else None
        fecha = row[1]
        departamento = str(row[2]).strip().upper() if row[2] else None
        year = fecha.year if fecha else 2026

        cui = extract_cui(descripcion) if descripcion else None
        route = extract_route_code(descripcion) if descripcion else None
        project_type = extract_project_type(descripcion) if descripcion else None

        cui_directo = str(row[5]).strip() if row[5] else None

        # Run the full lookup and capture result
        mef_data = get_ejecucion_financiera(
            db=db, ruc=row[3], year=year, description=descripcion, departamento=departamento, cui_directo=cui_directo
        )

        return {
            "id_convocatoria": id_convocatoria,
            "descripcion_preview": descripcion[:200] if descripcion else None,
            "cui_extraido": cui,
            "ruta_extraida": route,
            "tipo_obra": project_type,
            "year_contrato": year,
            "departamento": departamento,
            "mef_result": {
                "encontrado": mef_data.get("encontrado"),
                "source": mef_data.get("source", "local_db"),
                "match_type": mef_data.get("match_type"),
                "match_score": mef_data.get("match_score"),
                "matched_name": mef_data.get("matched_name"),
                "cui_usado": mef_data.get("cui"),
                "year_found": mef_data.get("year_found"),
                "pim": mef_data.get("pim", 0),
                "devengado": mef_data.get("devengado", 0),
                "error": mef_data.get("error"),
            },
        }
    except Exception as e:
        return {"error": str(e)}


@router.get("/garantias/{id_convocatoria}")
def get_garantias_endpoint(id_convocatoria: str, db: Session = Depends(get_db)):
    """
    Get guarantee data from OCDS for a specific licitacion.
    Returns guarantee expiry dates, amounts, and semaphore status.
    """
    try:
        # Get OCID and entidad_financiera from local DB
        sql = text("""
            SELECT 
                c.ocid,
                a.entidad_financiera,
                a.url_pdf_cartafianza
            FROM licitaciones_cabecera c
            LEFT JOIN licitaciones_adjudicaciones a ON c.id_convocatoria = a.id_convocatoria
            WHERE c.id_convocatoria = :id
            LIMIT 1
        """)

        row = db.execute(sql, {"id": id_convocatoria.strip()}).fetchone()

        if not row:
            return {
                "garantias": [],
                "error": "Licitación no encontrada",
                "estado_semaforo": "gris",
                "entidad_financiera": None,
                "enlace_asbanc": None,
            }

        ocid = row[0]
        entidad_financiera = row[1]
        url_pdf_cartafianza = row[2]

        # Build ASBANC link based on detected bank
        enlace_asbanc = _build_asbanc_link(entidad_financiera)

        if not ocid:
            return {
                "garantias": [],
                "error": "OCID no disponible para esta licitación",
                "estado_semaforo": "gris",
                "entidad_financiera": entidad_financiera,
                "enlace_asbanc": enlace_asbanc,
            }

        # Query OCDS API
        ocds_data = get_garantias(ocid)
        garantias = ocds_data.get("garantias", [])

        # Determine overall semaphore: worst status wins
        estado_semaforo = "gris"
        if garantias:
            semaforos = [g.get("estado_semaforo", "gris") for g in garantias]
            if "rojo" in semaforos:
                estado_semaforo = "rojo"
            elif "ambar" in semaforos:
                estado_semaforo = "ambar"
            elif "verde" in semaforos:
                estado_semaforo = "verde"

        return {
            "garantias": garantias,
            "error": ocds_data.get("error"),
            "estado_semaforo": estado_semaforo,
            "entidad_financiera": entidad_financiera,
            "enlace_asbanc": enlace_asbanc,
            "url_pdf_cartafianza": url_pdf_cartafianza,
        }

    except Exception as e:
        print(f"[INTEGRACIONES] Error in garantias endpoint: {e}")
        return {
            "garantias": [],
            "error": str(e),
            "estado_semaforo": "gris",
            "entidad_financiera": None,
            "enlace_asbanc": None,
        }


def _build_asbanc_link(entidad_financiera: str | None) -> str | None:
    """Build ASBANC validation link based on the financial entity name."""
    if not entidad_financiera:
        return None

    # Map known bank names to ASBANC search terms
    bank_map = {
        "BBVA": "BBVA",
        "BCP": "BCP",
        "BANCO DE CREDITO": "BCP",
        "SCOTIABANK": "SCOTIABANK",
        "INTERBANK": "INTERBANK",
        "BANBIF": "BANBIF",
        "BANCO INTERAMERICANO": "BANBIF",
        "BANCO FINANCIERO": "BANBIF",
        "BANCO PICHINCHA": "PICHINCHA",
        "MIBANCO": "MIBANCO",
        "BANCO DE COMERCIO": "COMERCIO",
        "BANCO GNB": "GNB",
        "CITIBANK": "CITIBANK",
        "BANCO FALABELLA": "FALABELLA",
        "BANCO RIPLEY": "RIPLEY",
        "MAPFRE": "MAPFRE",
        "RIMAC": "RIMAC",
        "LA POSITIVA": "LA POSITIVA",
        "PACIFICO": "PACIFICO",
        "SECREX": "SECREX",
        "INSUR": "INSUR",
        "AVLA": "AVLA",
        "LIBERTY": "LIBERTY",
        "HDI": "HDI",
    }

    upper = entidad_financiera.upper()
    for key, val in bank_map.items():
        if key in upper:
            return f"http://cfianza.asbanc.com.pe/"

    # Default ASBANC link without specific bank
    return "http://cfianza.asbanc.com.pe/"

@router.get("/infobras/{cui}")
def get_infobras(cui: str, db: Session = Depends(get_db)):
    """
    Recupera los datos de Infobras cacheados en la base de datos para el CUI dado.
    Si no existen o están corruptos, devuelve None o error 404.
    """
    if not cui or cui == "None" or cui == "null":
        raise HTTPException(status_code=400, detail="CUI requerido")
        
    data = InfobrasService.get_cached_infobras(cui, db)
    if not data:
        raise HTTPException(status_code=404, detail="No se encontró información de Infobras en caché para este CUI. Puede que el sincronizador aún no lo procese.")
        
    return {"status": "success", "cui": cui, "data": data}
