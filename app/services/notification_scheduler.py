"""
Notification Scheduler - Programa ejecución automática de triggers
"""
import os
import sys
import subprocess
import logging
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from app.database import SessionLocal
from app.services.notification_triggers import notification_triggers

logger = logging.getLogger(__name__)

# Rutas del pipeline
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_PIPELINE_SCRIPT = os.path.join(_BASE_DIR, "0_pipeline_maestro.py")
_LOG_DIR = os.path.join(_BASE_DIR, "logs")
os.makedirs(_LOG_DIR, exist_ok=True)

# Crear scheduler global
scheduler = BackgroundScheduler()


def run_carta_fianza_check():
    """Job para verificar cartas fianza"""
    db = SessionLocal()
    try:
        count = notification_triggers.check_carta_fianza_expiration(db)
        logger.info(f"[Scheduler] Cartas Fianza check: {count} notificaciones")
    except Exception as e:
        logger.error(f"[Scheduler] Error en carta_fianza_check: {e}")
    finally:
        db.close()


def run_licitaciones_check():
    """Job para verificar nuevas licitaciones"""
    db = SessionLocal()
    try:
        count = notification_triggers.check_new_licitaciones(db)
        logger.info(f"[Scheduler] Licitaciones check: {count} notificaciones")
    except Exception as e:
        logger.error(f"[Scheduler] Error en licitaciones_check: {e}")
    finally:
        db.close()


def run_adjudicaciones_check():
    """Job para verificar adjudicaciones"""
    db = SessionLocal()
    try:
        count = notification_triggers.check_new_adjudicaciones(db)
        logger.info(f"[Scheduler] Adjudicaciones check: {count} notificaciones")
    except Exception as e:
        logger.error(f"[Scheduler] Error en adjudicaciones_check: {e}")
    finally:
        db.close()


def run_changes_check():
    """Job para verificar cambios importantes"""
    db = SessionLocal()
    try:
        count = notification_triggers.check_important_changes(db)
        logger.info(f"[Scheduler] Changes check: {count} notificaciones")
    except Exception as e:
        logger.error(f"[Scheduler] Error en changes_check: {e}")
    finally:
        db.close()


def run_pipeline_osce():
    """Job diario: ejecuta el pipeline maestro OSCE/SEACE en modo incremental.
    
    Se lanza como subproceso independiente para no bloquear el servidor web.
    El año se detecta automáticamente desde la fecha del sistema.
    """
    anio = datetime.now().year
    log_file = os.path.join(_LOG_DIR, "pipeline_osce.log")
    
    # --- Detectar entorno virtual ---
    python_exec = sys.executable
    for venv_path in [
        os.path.join(_BASE_DIR, "venv", "bin", "python3"),
        os.path.join(_BASE_DIR, ".venv", "bin", "python3"),
        os.path.join(_BASE_DIR, "venv", "Scripts", "python.exe"),
        os.path.join(_BASE_DIR, ".venv", "Scripts", "python.exe")
    ]:
        if os.path.exists(venv_path):
            python_exec = venv_path
            break
            
    logger.info(f"[Pipeline OSCE] Iniciando pipeline incremental año {anio}...")
    try:
        with open(log_file, "a", encoding="utf-8") as f_log:
            f_log.write(f"\n\n{'='*60}\n")
            f_log.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Iniciando pipeline OSCE año {anio}\n")
            f_log.write(f"{'='*60}\n")
        
        # Construir comando
        cmd = [python_exec, _PIPELINE_SCRIPT, "--year", str(anio)]
        
        # Flags específicas de plataforma
        kwargs = {"stdout": open(log_file, "a", encoding="utf-8"),
                  "stderr": subprocess.STDOUT}
        if sys.platform == "win32":
            kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW
        
        proc = subprocess.Popen(cmd, cwd=_BASE_DIR, **kwargs)
        logger.info(f"[Pipeline OSCE] Subproceso iniciado PID={proc.pid}. Log: {log_file}")
        
    except Exception as e:
        logger.error(f"[Pipeline OSCE] Error iniciando subproceso: {e}")


def start_scheduler():
    """Iniciar el scheduler con todos los jobs"""
    
    if scheduler.running:
        logger.warning("Scheduler ya está en ejecución")
        return
    
    # Job 1: Cartas Fianza - Diariamente a las 8:00 AM (Hora Perú)
    scheduler.add_job(
        run_carta_fianza_check,
        trigger=CronTrigger(hour=8, minute=0, timezone='America/Lima'),
        id='carta_fianza_daily',
        name='Check Carta Fianza Expiration',
        replace_existing=True
    )
    
    # Job 2: Nuevas Licitaciones - Cada hora
    scheduler.add_job(
        run_licitaciones_check,
        trigger=IntervalTrigger(hours=1),
        id='licitaciones_hourly',
        name='Check New Licitaciones',
        replace_existing=True
    )
    
    # Job 3: Adjudicaciones - Cada 30 minutos
    scheduler.add_job(
        run_adjudicaciones_check,
        trigger=IntervalTrigger(minutes=30),
        id='adjudicaciones_half_hourly',
        name='Check New Adjudicaciones',
        replace_existing=True
    )
    
    # Job 4: Cambios importantes - Cada hora
    scheduler.add_job(
        run_changes_check,
        trigger=IntervalTrigger(hours=1),
        id='changes_hourly',
        name='Check Important Changes',
        replace_existing=True
    )
    
    # Job 5: Pipeline OSCE/SEACE - Diariamente a la 1:00 AM hora Perú (América/Lima = UTC-5)
    scheduler.add_job(
        run_pipeline_osce,
        trigger=CronTrigger(hour=1, minute=0, timezone='America/Lima'),
        id='pipeline_osce_daily',
        name='Pipeline Incremental OSCE/SEACE',
        replace_existing=True,
        max_instances=1,        # Evitar ejecuciones simultáneas
        coalesce=True           # Si se perdió una ejecución, correr solo 1 vez
    )
    
    scheduler.start()
    logger.info("✅ Notification Scheduler iniciado con 5 jobs")
    logger.info("  - Cartas Fianza:    Diariamente 8:00 AM (America/Lima)")
    logger.info("  - Licitaciones:     Cada hora")
    logger.info("  - Adjudicaciones:   Cada 30 minutos")
    logger.info("  - Cambios:          Cada hora")
    logger.info("  - Pipeline OSCE:    Diariamente 1:00 AM (America/Lima - Incremental)")


def stop_scheduler():
    """Detener el scheduler"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler detenido")
