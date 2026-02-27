import sys
import os
import shutil
import logging
import re
import argparse
import requests
import pymysql
import traceback
import subprocess
from datetime import datetime
from pymysql.constants import CLIENT

# --- Cargar .env ---
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # En producción las variables de entorno ya están inyectadas

# --- Configurar Logs ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
os.environ['WDM_LOG'] = '0'

# --- Entorno Local ---
script_dir = os.path.dirname(os.path.abspath(__file__))
motor_etl_dir = os.path.join(script_dir, "1_motor_etl")
data_dir = os.path.join(script_dir, "DATAJSON")
logs_dir = os.path.join(script_dir, "logs")
os.makedirs(data_dir, exist_ok=True)
os.makedirs(logs_dir, exist_ok=True)

URL_BASE_DESCARGAS = "https://contratacionesabiertas.oece.gob.pe/descargas?page=1&paginateBy=100&source=seace_v3&year="

HEADERS_HUMANOS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
}

# --- Proxy IPRoyal (desde .env) ---
# Solo se usa en descargas de archivos grandes (SHA + ZIP) del portal OSCE
# Selenium (scraping de links) usa su propio perfil de Chrome sin proxy para evitar CAPTCHAs
_proxy_url = os.getenv("IPROYAL_PROXY_URL", "")
if _proxy_url:
    PROXIES = {"http": _proxy_url, "https": _proxy_url}
    logging.info(f"🌐 Proxy IPRoyal activo para descargas OSCE (Peru IP)")
else:
    PROXIES = {}
    logging.info(f"⚠️  Sin proxy configurado. Usando IP directa del servidor.")


# ─────────────────────────────────────────────
# LIMPIEZA MANUAL (solo con --force-clean)
# ─────────────────────────────────────────────
def limpiar_tablas(anio, meses=None):
    """Elimina datos de la BD por año completo o por lista de meses específicos.
    
    Args:
        anio: Año a limpiar.
        meses: Lista de strings de meses (e.g. ['01', '02']). Si es None, limpia todo el año.
    """
    if meses:
        rangos = [(f"{anio}-{m}-01", f"{anio}-{m}-31") for m in meses]
        logging.info(f"🧹 LIMPIEZA MANUAL de meses {meses} del año {anio}...")
    else:
        rangos = [(f"{anio}-01-01", f"{anio}-12-31")]
        logging.info(f"🧹 LIMPIEZA MANUAL del año completo {anio}...")
    
    db_config = {
        'host': 'localhost',
        'user': 'root',
        'password': '123456789',
        'db': 'mcqs-jcq',
        'connect_timeout': 30,
        'read_timeout': 120,
        'write_timeout': 120,
    }
    
    # Recolectar IDs de TODOS los rangos a limpiar
    conn = pymysql.connect(**db_config)
    ids_conv = []
    ids_contrato = []
    try:
        with conn.cursor() as cur:
            # Matar conexiones ajenas
            my_id = conn.thread_id()
            cur.execute("SHOW PROCESSLIST")
            for row in cur.fetchall():
                pid, cmd = row[0], row[4]
                if pid != my_id and cmd != 'Daemon':
                    try:
                        cur.execute(f"KILL {pid}")
                    except Exception:
                        pass
            logging.info("   🔓 Conexiones MySQL externas eliminadas.")
            
            for fecha_ini, fecha_fin in rangos:
                cur.execute("SELECT id_convocatoria FROM licitaciones_cabecera WHERE fecha_publicacion BETWEEN %s AND %s", (fecha_ini, fecha_fin))
                ids_conv.extend([row[0] for row in cur.fetchall()])
            
            logging.info(f"   Encontrados {len(ids_conv)} registros de cabecera para eliminar.")
            
            if ids_conv:
                batch = 500
                for i in range(0, len(ids_conv), batch):
                    chunk = ids_conv[i:i+batch]
                    ph = ",".join(["%s"] * len(chunk))
                    cur.execute(f"SELECT id_contrato FROM licitaciones_adjudicaciones WHERE id_convocatoria IN ({ph}) AND id_contrato IS NOT NULL", chunk)
                    ids_contrato.extend([row[0] for row in cur.fetchall()])
            logging.info(f"   Encontrados {len(ids_contrato)} contratos asociados.")
    finally:
        conn.close()
    
    if not ids_conv:
        logging.info("   No hay registros para eliminar en los rangos especificados.")
        return
    
    import time
    conn = pymysql.connect(**db_config)
    try:
        with conn.cursor() as cur:
            cur.execute("SET SESSION innodb_lock_wait_timeout = 120")
            cur.execute("SET SESSION FOREIGN_KEY_CHECKS = 0")
            
            batch = 100
            for i in range(0, len(ids_contrato), batch):
                chunk = ids_contrato[i:i+batch]
                ph = ",".join(["%s"] * len(chunk))
                cur.execute(f"DELETE FROM detalle_consorcios WHERE id_contrato IN ({ph})", chunk)
                conn.commit()
            logging.info(f"   ✅ Consorcios eliminados.")
            
            for i in range(0, len(ids_conv), batch):
                chunk = ids_conv[i:i+batch]
                ph = ",".join(["%s"] * len(chunk))
                cur.execute(f"DELETE FROM licitaciones_adjudicaciones WHERE id_convocatoria IN ({ph})", chunk)
                conn.commit()
            logging.info(f"   ✅ Adjudicaciones eliminadas.")
            
            for i in range(0, len(ids_conv), batch):
                chunk = ids_conv[i:i+batch]
                ph = ",".join(["%s"] * len(chunk))
                cur.execute(f"DELETE FROM licitaciones_cabecera WHERE id_convocatoria IN ({ph})", chunk)
                conn.commit()
            logging.info(f"   ✅ Cabeceras eliminadas.")
            
            cur.execute("SET SESSION FOREIGN_KEY_CHECKS = 1")
    finally:
        conn.close()
    logging.info(f"✅ Limpieza manual completada.")


# ─────────────────────────────────────────────
# SCRAPING DE LINKS
# ─────────────────────────────────────────────
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException
from webdriver_manager.chrome import ChromeDriverManager

def scrape_links(anio):
    lista_final = []
    
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--log-level=3")
    
    try:
        s = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=s, options=opts)
    except Exception as e:
        logging.critical(f"Error iniciando Chrome: {e}")
        return []

    try:
        url_pagina = f"{URL_BASE_DESCARGAS}{anio}"
        logging.info(f"🔍 Auditando Portal OSCE: {url_pagina}")
        driver.get(url_pagina)
        
        try:
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.XPATH, "//a[contains(@href, 'api/v1/file')]"))
            )
        except TimeoutException:
            logging.warning(f"⚠️ No se encontró la tabla de descargas para el año {anio}.")
            return []

        elementos = driver.find_elements(By.TAG_NAME, "a")
        links_encontrados = {} 
        patron_url = re.compile(r"/(json|sha)/(\d{4})/(\d{2})")

        for elem in elementos:
            try:
                url = elem.get_attribute("href")
                if not url: continue
                match = patron_url.search(url)
                if match:
                    tipo, anio_det, mes_det = match.groups()
                    if anio_det != str(anio): continue
                    
                    if mes_det not in links_encontrados: links_encontrados[mes_det] = {}
                    if tipo == "json": links_encontrados[mes_det]["json_url"] = url
                    elif tipo == "sha": links_encontrados[mes_det]["sha_url"] = url
            except Exception: 
                continue 

        for mes, urls in links_encontrados.items():
            if "json_url" in urls:
                lista_final.append({
                    "nombre_base": f"{anio}-{mes}_seace_v3",
                    "mes": mes,
                    "json_url": urls["json_url"],
                    "sha_url": urls.get("sha_url", "")
                })
    finally:
        driver.quit()
        
    return lista_final


# ─────────────────────────────────────────────
# DESCARGA INCREMENTAL POR SHA
# ─────────────────────────────────────────────
def obtener_sha_remoto(sha_url):
    """Obtiene el contenido del SHA remoto vía proxy IPRoyal."""
    if not sha_url:
        return None
    try:
        r = requests.get(sha_url, headers=HEADERS_HUMANOS, proxies=PROXIES, timeout=30)
        if r.status_code == 200:
            return r.text.strip()
    except Exception as e:
        logging.warning(f"⚠️ No se pudo obtener SHA remoto: {e}")
    return None

def leer_sha_local(nombre_base):
    """Lee el SHA almacenado localmente para un archivo."""
    ruta_sha = os.path.join(data_dir, f"{nombre_base}.sha")
    if os.path.exists(ruta_sha):
        with open(ruta_sha, "r", encoding="utf-8") as f:
            return f.read().strip()
    return None

def descargar_incrementales(lista_archivos):
    """
    Descarga solo los archivos cuyo SHA ha cambiado respecto al local.
    Retorna la lista de archivos que fueron actualizados (necesitan ser procesados).
    """
    archivos_a_procesar = []
    
    for archivo_info in lista_archivos:
        nombre_base = archivo_info["nombre_base"]
        sha_url = archivo_info.get("sha_url", "")
        json_url = archivo_info["json_url"]
        mes = archivo_info.get("mes", "??")
        
        # 1. Obtener SHA remoto
        sha_remoto = obtener_sha_remoto(sha_url)
        sha_local = leer_sha_local(nombre_base)
        
        # 2. Comparar
        if sha_remoto and sha_local and sha_remoto == sha_local:
            logging.info(f"   ⏭️  [{nombre_base}] Sin cambios (SHA idéntico). Saltando.")
            continue
        
        if sha_remoto:
            logging.info(f"   🔄 [{nombre_base}] SHA cambió o es nuevo. Descargando...")
        else:
            logging.info(f"   ⬇️  [{nombre_base}] Sin SHA remoto. Descargando igualmente...")
        
        # 3. Descargar ZIP
        ruta_zip = os.path.join(data_dir, f"{nombre_base}.zip")
        ruta_sha = os.path.join(data_dir, f"{nombre_base}.sha")
        
        try:
            with requests.get(json_url, headers=HEADERS_HUMANOS, proxies=PROXIES, stream=True, timeout=600) as r:
                r.raise_for_status()
                with open(ruta_zip, "wb") as f:
                    for chunk in r.iter_content(chunk_size=1024*1024):
                        f.write(chunk)
            logging.info(f"   ✅ Descarga exitosa: {nombre_base}.zip")
        except Exception as e:
            logging.error(f"   ❌ Error descargando {nombre_base}.zip: {e}")
            continue
        
        # 4. Guardar SHA local actualizado
        if sha_remoto:
            with open(ruta_sha, "w", encoding="utf-8") as f_sha:
                f_sha.write(sha_remoto)
            logging.info(f"   ↳ SHA actualizado: {nombre_base}.sha")
        
        archivos_a_procesar.append(archivo_info)
    
    return archivos_a_procesar


# ─────────────────────────────────────────────
# LIMPIEZA DE ZIPS VIEJOS (solo los que no se van a usar)
# ─────────────────────────────────────────────
def limpiar_zips_obsoletos(lista_archivos_actuales):
    """Elimina ZIPs locales que ya no existen en el portal (meses obsoletos)."""
    nombres_validos = {f"{a['nombre_base']}.zip" for a in lista_archivos_actuales}
    for f in os.listdir(data_dir):
        if f.endswith(".zip") and f not in nombres_validos:
            try:
                os.unlink(os.path.join(data_dir, f))
                logging.info(f"   🗑️ ZIP obsoleto eliminado: {f}")
            except Exception:
                pass


# ─────────────────────────────────────────────
# ETL
# ─────────────────────────────────────────────
def invocar_etl(anio, archivos_actualizados=None):
    logging.info("--------------------------------------------------")
    logging.info("🚀 INICIANDO ETL FASE 1: (OCDS - CARGA INCREMENTAL OSCE)")
    logging.info("--------------------------------------------------")
    
    if motor_etl_dir not in sys.path:
        sys.path.append(motor_etl_dir)
    
    try:
        import cargador_ocds_osce
        import importlib
        importlib.reload(cargador_ocds_osce)
        # Si hay archivos específicos, pasar solo esos; si no, procesar todos los ZIPs en DATAJSON
        if archivos_actualizados is not None:
            zips = [os.path.join(data_dir, f"{a['nombre_base']}.zip") for a in archivos_actualizados]
            cargador_ocds_osce.main(zip_files=zips)
        else:
            cargador_ocds_osce.main()
    except Exception as e:
        logging.error(f"Error Ejecutando Fase 1: {e}")
        traceback.print_exc()
        return False
        
    logging.info("--------------------------------------------------")
    logging.info(f"🚀 INICIANDO ETL FASE 2: (APIS PRIVADAS SEACE - AÑO {anio})")
    logging.info("--------------------------------------------------")
    try:
        import motor_consorcios_seace
        import importlib
        importlib.reload(motor_consorcios_seace)
        motor_consorcios_seace.main(year=anio)
    except Exception as e:
        logging.error(f"Error Ejecutando Fase 2: {e}")
        traceback.print_exc()
        return False
        
    return True


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
def main():
    anio_actual = datetime.now().year
    
    parser = argparse.ArgumentParser(description="Pipeline Maestro OSCE/SEACE - Modo Incremental")
    parser.add_argument("--year", type=int, default=anio_actual, 
                        help=f"Año a procesar (default: {anio_actual})")
    parser.add_argument("--force-clean", action="store_true",
                        help="Elimina todos los datos del año en BD antes de cargar (modo full-reload)")
    parser.add_argument("--meses", nargs="*",
                        help="Con --force-clean: meses específicos a limpiar (ej: 01 02). Si no se especifica, limpia todo el año.")
    args = parser.parse_args()
    
    logging.info("==========================================================")
    logging.info(f"🌟 PIPELINE MAESTRO OSCE/SEACE v5 - AÑO: {args.year}")
    logging.info(f"   Modo: {'FULL RELOAD' if args.force_clean else 'INCREMENTAL (sin borrado)'}")
    logging.info("==========================================================")
    
    # 1. Obtener lista de archivos disponibles en el portal
    lista_archivos = scrape_links(args.year)
    if not lista_archivos:
        logging.error("No se encontraron URLs de descarga o hubo timeout.")
        return
    
    meses_disponibles = [a['mes'] for a in lista_archivos]
    logging.info(f"📅 Meses disponibles en portal OSCE: {meses_disponibles}")
    
    # 2. Limpieza opcional en BD (solo con --force-clean)
    if args.force_clean:
        limpiar_tablas(args.year, meses=args.meses)
    
    # 3. Descarga incremental por SHA (solo lo que cambió)
    logging.info("🔍 Verificando cambios por SHA...")
    archivos_actualizados = descargar_incrementales(lista_archivos)
    
    # 4. Limpiar ZIPs obsoletos del disco
    limpiar_zips_obsoletos(lista_archivos)
    
    if not archivos_actualizados:
        logging.info("✅ No hay archivos nuevos o actualizados. Pipeline completado sin cambios.")
        return
    
    logging.info(f"📦 {len(archivos_actualizados)} archivo(s) actualizado(s): {[a['nombre_base'] for a in archivos_actualizados]}")
    
    # 5. ETL Incremental (INSERT/UPDATE sin borrar)
    exito = invocar_etl(args.year, archivos_actualizados)
    
    if exito:
        logging.info("🎉 PIPELINE MAESTRO COMPLETADO SATISFACTORIAMENTE 🎉")
    else:
        logging.error("💥 PIPELINE FINALIZÓ CON ERRORES")


if __name__ == "__main__":
    main()
