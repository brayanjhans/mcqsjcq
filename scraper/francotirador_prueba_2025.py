import time, os, json
from datetime import datetime
import pymysql
from dotenv import load_dotenv

# --- Configuración DB ---
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env'))

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASS', '123456789'),
    'db': 'mcqs-jcq',
    'charset': 'utf8mb4'
}

# --- Importar utilidades de Scraper de SEACE ---
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.common.exceptions import TimeoutException, NoSuchElementException

def log(msg, nivel="INFO"):
    icons = {"INFO": "[·]", "OK": "[OK]", "ERR": "[!!]", "WARN": "[!]"}
    print(f"  {icons.get(nivel,'[ ]')} {msg}", flush=True)

def tx(el):
    try: return el.text.strip()
    except Exception: return ""

def jclick(drv, el):
    drv.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
    time.sleep(0.3)
    try: el.click()
    except Exception: drv.execute_script("arguments[0].click();", el)

def obtener_tabla_y_filas(drv):
    tabla = drv.execute_script("""
        var ths = document.querySelectorAll('thead');
        for(var i=0;i<ths.length;i++){
            var txt = ths[i].textContent.toLowerCase();
            if(txt.indexOf('nomenclatura')!==-1 && txt.indexOf('entidad')!==-1)
                return ths[i].closest('table');
        }
        return null;
    """)
    if not tabla:
        for tr in drv.find_elements(By.CSS_SELECTOR, "tr.ui-widget-content"):
            n = drv.execute_script("return arguments[0].querySelectorAll(':scope > td').length", tr)
            if n >= 8:
                tabla = drv.execute_script("return arguments[0].closest('table')", tr)
                break
    if not tabla: return [], []
    
    cols = []
    try:
        for i, th in enumerate(tabla.find_elements(By.CSS_SELECTOR, "thead th")):
            txt = " ".join(tx(th).split())
            cols.append(txt if txt else f"col_{i+1}")
    except Exception: pass
    trs = tabla.find_elements(By.CSS_SELECTOR, "tr.ui-widget-content")
    return cols, trs

def extraer_ficha(drv, tr):
    resultado = {}
    url_original = drv.current_url

    tds = drv.execute_script("return Array.from(arguments[0].querySelectorAll(':scope > td'))", tr)
    icono = None
    if tds:
        links = tds[-1].find_elements(By.TAG_NAME, "a")
        for a in links:
            tit = (a.get_attribute("title") or "").lower()
            try: src = a.find_element(By.TAG_NAME, "img").get_attribute("src") or ""
            except Exception: src = ""
            if "ficha" in tit or "seleccion" in tit or "sheet_calendar" in src:
                icono = a
                break
        if not icono and len(links) >= 2: icono = links[1]
        elif not icono and len(links) == 1: icono = links[0]

    if not icono: return resultado
    
    jclick(drv, icono)
    time.sleep(5)
    
    # --- Extraer Cronograma ---
    cron = []
    try:
        for tbl in drv.find_elements(By.CSS_SELECTOR, "[id*='ronograma'] table, [id*='Cronograma'] table"):
            ths = [tx(th) for th in tbl.find_elements(By.TAG_NAME, "th") if tx(th)]
            for fila in tbl.find_elements(By.CSS_SELECTOR, "tbody tr"):
                vals = [tx(td) for td in fila.find_elements(By.TAG_NAME, "td")]
                if any(vals): cron.append(dict(zip(ths, vals)) if ths and len(ths) == len(vals) else vals)
    except Exception: pass
    if cron: resultado["cronograma"] = cron
    
    # --- Regresar a Resultados ---
    try:
        btn_r = WebDriverWait(drv, 5).until(EC.element_to_be_clickable((By.XPATH, "//a[contains(.,'Regresar')] | //button[contains(.,'Regresar')]")))
        jclick(drv, btn_r)
        time.sleep(4)
    except Exception:
        drv.get(url_original)
        time.sleep(5)

    return resultado

def main():
    print()
    print("  " + "="*55)
    print("    FRANCOTIRADOR SEACE - PRUEBA PILOTO BD (AÑO 2025)")
    print("  " + "="*55)
    print()

    # --- 1. Inicializar Chrome ---
    import glob, shutil
    opts = Options()
    opts.add_argument("--start-maximized")
    opts.add_argument("--disable-blink-features=AutomationControlled")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--lang=es-PE")
    opts.add_experimental_option("excludeSwitches", ["enable-automation"])
    opts.add_experimental_option("useAutomationExtension", False)

    driver_path = None
    candidatos = glob.glob(os.path.expanduser("~/.wdm/drivers/chromedriver/**/chromedriver.exe"), recursive=True)
    if candidatos:
        c64 = [p for p in candidatos if "chromedriver-win32" not in p]
        lista = sorted(c64 or candidatos, key=os.path.getmtime, reverse=True)
        driver_path = lista[0]
    if not driver_path: driver_path = shutil.which("chromedriver")

    drv = webdriver.Chrome(service=Service(driver_path), options=opts) if driver_path else webdriver.Chrome(options=opts)
    drv.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {"source": "Object.defineProperty(navigator,'webdriver',{get:()=>undefined})"})
    log("Chrome iniciado", "OK")

    try:
        # --- 2. Buscar 2025 en SEACE ---
        drv.get("https://prod2.seace.gob.pe/seacebus-uiwd-pub/buscadorPublico/buscadorPublico.xhtml")
        time.sleep(5)
        for sel in ["//a[contains(.,'Procedimientos de Selecci')]", "//li[contains(@id,'tab1')]/a"]:
            try:
                jclick(drv, drv.find_element(By.XPATH, sel))
                time.sleep(3)
                break
            except Exception: continue

        try:
            sel_el = drv.find_element(By.ID, "tbBuscador:idFormBuscarProceso:anioConvocatoria_input")
            drv.execute_script("arguments[0].value = '2025';", sel_el)
            drv.execute_script("arguments[0].dispatchEvent(new Event('change', {bubbles: true}));", sel_el)
            time.sleep(3)
            log("Año 2025 seleccionado explícitamente", "OK")
        except Exception as sel_e:
            log(f"Falla seleccionando 2025: {sel_e}", "WARN")

        for el in drv.find_elements(By.XPATH, "//button[contains(.,'Buscar') and not(contains(.,'Avanzada'))]"):
            if el.is_displayed():
                jclick(drv, el)
                time.sleep(8)
                break
                
        # --- 3. Iterar las 3 primeras filas ---
        max_pruebas = 3
        procesos_exitosos = []
        
        for idx in range(max_pruebas):
            cols, trs = obtener_tabla_y_filas(drv)
            if idx >= len(trs): break
            
            # Obtener Nomenclatura para vincular con BD
            tds = drv.execute_script("return Array.from(arguments[0].querySelectorAll(':scope > td'))", trs[idx])
            nomenclatura = ""
            for i, col_name in enumerate(cols):
                if "nomenclatura" in col_name.lower():
                    nomenclatura = tx(tds[i])
                    break
            
            # Si no encontramos columna nombre por default es la Nomenclatura en la col 3
            if not nomenclatura and len(tds) > 3:
                nomenclatura = tx(tds[3])
                
            log(f"Procesando [{idx+1}/{max_pruebas}]: {nomenclatura}")
            
            ficha = extraer_ficha(drv, trs[idx])
            if "cronograma" in ficha:
                log(f"  -> Capturadas {len(ficha['cronograma'])} etapas de cronograma", "OK")
                procesos_exitosos.append({
                    "nomenclatura": nomenclatura,
                    "cronograma_json_str": json.dumps(ficha["cronograma"], ensure_ascii=False)
                })
            else:
                log(f"  -> No se encontró cronograma", "WARN")
                
        # --- 4. Conectar a MySQL e inyectar ---
        log("Conectando a base de datos MySQL (mcqs-jcq)...")
        conn = pymysql.connect(**DB_CONFIG)
        actualizados = 0
        try:
            with conn.cursor() as cur:
                for proc in procesos_exitosos:
                    nom = proc["nomenclatura"]
                    crono = proc["cronograma_json_str"]
                    sql = "UPDATE licitaciones_cabecera SET cronograma_detalle_json = %s, fecha_actualizacion_scraper = NOW() WHERE nomenclatura = %s"
                    cur.execute(sql, (crono, nom))
                    if cur.rowcount > 0:
                        log(f"  [ACTUALIZADO] BD: {nom[:50]}", "OK")
                        actualizados += 1
                    else:
                        log(f"  [NO ESTA EN BD]: {nom[:50]}", "WARN")
            conn.commit()
            log(f"Operación finalizada. {actualizados} filas actualizadas en la Base de Datos.", "OK")
        finally:
            conn.close()

    except Exception as e:
        log(f"Error fatal: {e}", "ERR")
    finally:
        try: drv.quit()
        except Exception: pass

if __name__ == "__main__":
    main()
