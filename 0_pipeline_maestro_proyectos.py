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
# Forzamos SIN PROXY porque el proxy lanza 402 Payment Required
_proxy_url = ""
PROXIES = {}
logging.info(f"⚠️  Proxy deshabilitado forzosamente para evitar errores 402. Usando IP directa del servidor.")


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

def create_proxy_extension(proxy_url):
    import zipfile
    import tempfile
    import urllib.parse
    
    parsed = urllib.parse.urlparse(proxy_url)
    proxy_host = parsed.hostname
    proxy_port = parsed.port or 80
    proxy_user = parsed.username or ""
    proxy_pass = parsed.password or ""
    
    manifest_json = """
    {
        "version": "1.0.0",
        "manifest_version": 2,
        "name": "Chrome Proxy",
        "permissions": [
            "proxy",
            "tabs",
            "unlimitedStorage",
            "storage",
            "<all_urls>",
            "webRequest",
            "webRequestBlocking"
        ],
        "background": {
            "scripts": ["background.js"]
        },
        "minimum_chrome_version":"22.0.0"
    }
    """
    
    background_js = f"""
    var config = {{
            mode: "fixed_servers",
            rules: {{
              singleProxy: {{
                scheme: "http",
                host: "{proxy_host}",
                port: parseInt({proxy_port})
              }},
              bypassList: ["localhost"]
            }}
          }};

    chrome.proxy.settings.set({{value: config, scope: "regular"}}, function() {{}});

    function callbackFn(details) {{
        return {{
            authCredentials: {{
                username: "{proxy_user}",
                password: "{proxy_pass}"
            }}
        }};
    }}

    chrome.webRequest.onAuthRequired.addListener(
                callbackFn,
                {{urls: ["<all_urls>"]}},
                ['blocking']
    );
    """
    
    plugin_file = os.path.join(tempfile.gettempdir(), f"proxy_auth_plugin.zip")
    with zipfile.ZipFile(plugin_file, 'w') as zp:
        zp.writestr("manifest.json", manifest_json)
        zp.writestr("background.js", background_js)
    
    return plugin_file

def scrape_links(anio):
    lista_final = []
    
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-extensions-except")  # Permitir extensiones especificadas
    opts.add_argument("--remote-debugging-pipe") # CRITICAL FIX para Chromium snap
    opts.add_argument("--disable-software-rasterizer")
    opts.add_argument("--window-size=1280,800")
    opts.add_argument("--log-level=3")
    opts.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    
    # Añadir proxy extension si IPRoyal está configurado
    plugin_file = None
    if _proxy_url:
        try:
            plugin_file = create_proxy_extension(_proxy_url)
            opts.add_extension(plugin_file)
            logging.info("🛡️ Añadida extensión Proxy de IPRoyal a Selenium.")
        except Exception as e:
            logging.error(f"Error creando proxy extension: {e}")
            
    # Prevenir que Selenium crashee guardando perfiles en el home de root
    import tempfile
    opts.add_argument(f"--user-data-dir={tempfile.mkdtemp(prefix='osce_chrome_')}")
    opts.add_argument(f"--data-path={tempfile.mkdtemp(prefix='osce_data_')}")
    opts.add_argument(f"--disk-cache-dir={tempfile.mkdtemp(prefix='osce_cache_')}")
    
    # Detección de binario Chromium en Ubuntu/VPS
    is_vps = False
    for chrome_path in ["/usr/bin/chromium-browser", "/usr/bin/chromium", "/snap/bin/chromium"]:
        if os.path.exists(chrome_path):
            opts.binary_location = chrome_path
            is_vps = True
            break
            
    try:
        if is_vps and os.path.exists("/usr/bin/chromedriver"):
            # En VPS usar el driver del sistema que matchee el snap
            s = Service("/usr/bin/chromedriver")
            driver = webdriver.Chrome(service=s, options=opts)
        else:
            # En local usar el manager
            s = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=s, options=opts)
    except Exception as e:
        logging.critical(f"Error iniciando Chrome: {e}")
        return []
        
    try:
        url_pagina = f"{URL_BASE_DESCARGAS}{anio}"

        logging.info(f"🔍 Auditando Portal OSCE: {url_pagina}")
        driver.set_page_load_timeout(30)
        driver.get(url_pagina)
        
        try:
            WebDriverWait(driver, 20).until(
                EC.presence_of_element_located((By.XPATH, "//a[contains(@href, 'api/v1/file')]"))
            )
        except TimeoutException:
            # Capturar screenshot para entender qué ve el VPS
            try:
                os.makedirs("logs", exist_ok=True)
                driver.save_screenshot("logs/error_headless_osce.png")
                logging.warning(f"⚠️ Screenshot guardado en logs/error_headless_osce.png")
            except:
                pass
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
    Descarga solo los archivos cuyo SHA ha cambiado respecto al local o cuyo ZIP físico falte.
    Retorna la lista de archivos que fueron actualizados (necesitan ser procesados).
    """
    archivos_a_procesar = []
    
    for archivo_info in lista_archivos:
        nombre_base = archivo_info["nombre_base"]
        sha_url = archivo_info.get("sha_url", "")
        json_url = archivo_info["json_url"]
        mes = archivo_info.get("mes", "??")
        
        # 1. Obtener SHA remoto y locales
        sha_remoto = obtener_sha_remoto(sha_url)
        sha_local = leer_sha_local(nombre_base)
        
        ruta_zip = os.path.join(data_dir, f"{nombre_base}.zip")
        ruta_sha = os.path.join(data_dir, f"{nombre_base}.sha")
        
        # 2. Comparar
        if sha_remoto and sha_local and sha_remoto == sha_local:
            if os.path.exists(ruta_zip):
                logging.info(f"   ⏭️  [{nombre_base}] Sin cambios (SHA idéntico y ZIP existe). Saltando.")
                continue
            else:
                logging.info(f"   ⚠️  [{nombre_base}] SHA idéntico pero falta el archivo ZIP físico. Forzando descarga...")
        elif sha_remoto:
            logging.info(f"   🔄 [{nombre_base}] SHA cambió o es nuevo. Descargando...")
        else:
            logging.info(f"   ⬇️  [{nombre_base}] Sin SHA remoto. Descargando igualmente...")
        
        # 3. Descargar ZIP
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
# EXTRACCIÓN Y CARGA DE PROYECTOS
# ─────────────────────────────────────────────
def extraer_e_insertar_proyectos(lista_archivos):
    logging.info("--------------------------------------------------")
    logging.info("🚀 INICIANDO EXTRACCIÓN DE PROYECTOS Y CUIS")
    logging.info("--------------------------------------------------")
    
    conn = pymysql.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASS', '123456789'),
        db='mcqs-jcq',
        charset='utf8mb4'
    )
    
    project_mapping = {}
    import zipfile, json
    
    for a in lista_archivos:
        nombre_base = a["nombre_base"]
        zip_file = os.path.join(data_dir, f"{nombre_base}.zip")
        if not os.path.exists(zip_file):
            continue
            
        logging.info(f"   📦 Procesando {nombre_base}.zip...")
        try:
            with zipfile.ZipFile(zip_file, 'r') as z:
                json_filenames = [f for f in z.namelist() if f.endswith('.json')]
                for json_filename in json_filenames:
                    content = z.read(json_filename)
                    data = json.loads(content)
                    
                    records = data.get("records", [])
                    found_in_file = 0
                    for r in records:
                        release = r.get("compiledRelease", {})
                        tender = release.get("tender", {})
                        tender_id = tender.get("id")
                        
                        if not tender_id:
                            ocid = release.get("ocid", "")
                            if "-" in ocid:
                                tender_id = ocid.split("-")[-1]
                        
                        if not tender_id: continue
                        
                        planning = release.get("planning", {})
                        budget = planning.get("budget", {})
                        
                        project_name = budget.get("project")
                        project_id = budget.get("projectID")
                        
                        if project_name or project_id:
                            tid_str = str(tender_id).strip()
                            if tid_str not in project_mapping:
                                project_mapping[tid_str] = {
                                    "proyecto": str(project_name).strip() if project_name else None,
                                    "cui": str(project_id).strip() if project_id else None
                                }
                                found_in_file += 1
                    logging.info(f"      📊 Encontrados {found_in_file} registros con proyecto en {json_filename}")
        except Exception as e:
            logging.error(f"   ❌ Error parseando {zip_file}: {e}")
            
    if not project_mapping:
        logging.warning("⚠️ No se encontró información de proyectos en los archivos JSON procesados.")
        return True
        
    logging.info("💾 Actualizando base de datos...")
    try:
        with conn.cursor() as cursor:
            update_sql = "UPDATE licitaciones_cabecera SET proyecto = %s, cui = %s WHERE id_convocatoria = %s"
            update_data = [(info['proyecto'], info['cui'], tid) for tid, info in project_mapping.items()]
            
            logging.info(f"📝 Total de actualizaciones a realizar: {len(update_data)}")
            
            batch_size = 1000
            for i in range(0, len(update_data), batch_size):
                batch = update_data[i:i+batch_size]
                try:
                    cursor.executemany(update_sql, batch)
                    conn.commit()
                    logging.info(f"   📊 Progreso: {min(i+batch_size, len(update_data))} / {len(update_data)}")
                except Exception as batch_err:
                    logging.warning(f"   ⚠️ Error en batch {i//batch_size}: {batch_err}. Intentando individualmente...")
                    conn.rollback()
                    for item in batch:
                        try:
                            cursor.execute(update_sql, item)
                            conn.commit()
                        except Exception as row_err:
                            logging.error(f"      ❌ Error en row {item[2]}: {row_err}")
                            conn.rollback()
    except Exception as e:
        logging.error(f"❌ Error general actualizando BD: {e}")
        return False
    finally:
        conn.close()
        
    return True


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Pipeline Extractor de Proyectos OSCE/SEACE")
    parser.add_argument("--years", nargs="+", type=int, default=[2020, 2021, 2022, 2023, 2024, 2025, 2026], 
                        help="Años históricos a procesar (default: 2020-2026)")
    # Se ignora force-clean pero lo dejamos por compatibilidad de argumentos si el usuario lo usa
    parser.add_argument("--force-clean", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--meses", nargs="*", help=argparse.SUPPRESS)
    args = parser.parse_args()
    
    logging.info("==========================================================")
    logging.info(f"🌟 PIPELINE EXTRACTOR DE PROYECTOS Y CUI - AÑOS: {args.years}")
    logging.info("==========================================================")
    
    lista_archivos = []
    anios_a_procesar = args.years
    
    for y in anios_a_procesar:
        logging.info(f"🔍 Extrayendo explícitamente enlaces para el año {y}...")
        archivos_anio = scrape_links(y)
        if archivos_anio:
            lista_archivos.extend(archivos_anio)
        else:
            logging.warning(f"   -> No se encontraron enlaces para el año {y}.")

    if not lista_archivos:
        logging.error("No se encontraron URLs de descarga o hubo timeout general.")
        return
    
    meses_disponibles = [a['nombre_base'] for a in lista_archivos]
    logging.info(f"📅 Archivos disponibles en portal OSCE: {len(meses_disponibles)}")
    
    # Descarga incremental (descarga los ZIPs que faltan o cambiaron de SHA)
    logging.info("📥 Verificando e iniciando descargas (si faltan ZIPS o cambió SHA)...")
    _ = descargar_incrementales(lista_archivos)
    
    # IMPORTANTE: A diferencia del maestro, aquí procesamos "lista_archivos" completa
    # porque queremos extraer los campos extra aunque los ZIPs ya estuvieran descargados.
    
    exito = extraer_e_insertar_proyectos(lista_archivos)
    
    if exito:
        logging.info("🎉 EXTRACCIÓN Y ACTUALIZACIÓN COMPLETADA SATISFACTORIAMENTE 🎉")
    else:
        logging.error("💥 PIPELINE FINALIZÓ CON ERRORES")


if __name__ == "__main__":
    main()
