"""
actualizador_acciones_db.py - Scraper masivo de Acciones SEACE
===============================================================
Versión: 4.1 - Réplica fiel de test_seace.py con procesamiento masivo.

Estrategia (idéntica a test_seace.py):
  - Busca por año en el portal SEACE.
  - Itera filas RE-OBTENIENDO el DOM en cada ciclo (evita StaleElement).
  - Usa find_elements(TAG_NAME, 'td') nativo, no JS.
  - Pagina con ui-paginator-next exactamente como v3.0 que funcionó.
  - Para cada fila cuya nomenclatura esté en los pendientes de BD:
    abre la ficha, extrae acciones y guarda en BD.
"""

import os, json, time, glob, re, logging, argparse
import pymysql
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service

# ─── Logs ───────────────────────────────────────────────────────────────────
os.makedirs("logs", exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("logs/actualizador_acciones.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env'))

# ─── DB ─────────────────────────────────────────────────────────────────────
def get_db():
    return pymysql.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASS', '123456789'),
        db=os.getenv('DB_NAME', 'mcqs-jcq'),
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

# ─── Selenium setup ──────────────────────────────────────────────────────────
def find_chromedriver():
    local = os.path.join(os.getcwd(), 'chromedriver.exe')
    if os.path.exists(local):
        return local
    candidatos = glob.glob(
        os.path.expanduser("~/.wdm/drivers/chromedriver/**/chromedriver.exe"),
        recursive=True
    )
    if candidatos:
        c64 = [p for p in candidatos if "chromedriver-win32" not in p]
        lista = sorted(c64 or candidatos, key=os.path.getmtime, reverse=True)
        return lista[0]
    return None

def setup_driver():
    opts = Options()
    #opts.add_argument('--headless=new')
    drv = webdriver.Chrome(options=opts)
    return drv

def js_click(drv, el):
    # Ya no se usa scrollIntoView porque rompe el evento PrimeFaces de Buscar
    time.sleep(0.1)
    drv.execute_script("arguments[0].click();", el)



# ─── Navegación SEACE ────────────────────────────────────────────────────────
SEACE_URL = "https://prod2.seace.gob.pe/seacebus-uiwd-pub/buscadorPublico/buscadorPublico.xhtml"

def iniciar_busqueda(drv, year, fecha_inicio=None, fecha_fin=None):
    """
    Carga el SEACE, activa pestaña Procedimientos, selecciona año y establece
    los filtros de fecha. SEACE devuelve 0 resultados si no se establecen fechas
    en el buscador, por lo que es obligatorio iterar por rangos de meses.
    """
    logger.info(f"Cargando buscador SEACE para {year} [{fecha_inicio} - {fecha_fin}]...")
    drv.get(SEACE_URL)
    time.sleep(5)

    # -- Activar tab Procedimientos --
    try:
        el = drv.find_element(By.XPATH, "//li[@role='tab'][2]/a")
        drv.execute_script("arguments[0].click();", el)
        time.sleep(3)
    except Exception as e:
        logger.error(f"Fallo activando tab: {e}")

    # -- Seleccionar año --
    try:
        combo = drv.find_element(By.ID, "tbBuscador:idFormBuscarProceso:anioConvocatoria")
        drv.execute_script("arguments[0].click();", combo)
        time.sleep(1)
        
        opcion_año = drv.find_element(By.XPATH, f"//div[@id='tbBuscador:idFormBuscarProceso:anioConvocatoria_panel']//li[text()='{year}']")
        drv.execute_script("arguments[0].click();", opcion_año)
        time.sleep(3)
    except Exception as e:
        logger.error(f"Fallo seleccionando año: {e}")

    # -- Expandir Búsqueda Avanzada y fijar fechas --
    if fecha_inicio and fecha_fin:
        try:
            avz = drv.find_element(By.XPATH, "//legend[contains(.,'Avanzada')]")
            drv.execute_script("arguments[0].click();", avz)
            time.sleep(2)
        except Exception:
            logger.debug("Búsqueda Avanzada ya expandida o fallo al expandir.")

        def write_date(field_id, val):
            for int_ in range(3):
                try:
                    el = drv.find_element(By.ID, f"{field_id}_input")
                    el.click()
                    time.sleep(0.5)
                    el.send_keys(Keys.CONTROL + 'a')
                    el.send_keys(val)
                    el.send_keys(Keys.TAB)
                    time.sleep(1.5)
                    break 
                except Exception as e:
                    if int_ == 2:
                        logger.error(f"Fallo escribiendo fecha en {field_id}: {e}")
                    time.sleep(1)

        base = "tbBuscador:idFormBuscarProceso"
        write_date(f"{base}:dfechaInicio", fecha_inicio)
        time.sleep(1)
        write_date(f"{base}:dfechaFin", fecha_fin)
        time.sleep(2)

    # -- Pulsar Buscar --
    buscado = False
    try:
        # AQUÍ ESTÁ LA MAGIA: Forzar a que busque específicamente el botón de ESTE tab
        btn = drv.find_element(By.XPATH, "//form[@id='tbBuscador:idFormBuscarProceso']//span[text()='Buscar' or text()=' Buscar']/parent::button")
        drv.execute_script("arguments[0].click();", btn)
        logger.info("Buscando... esperando resultados (10s)")
        time.sleep(10)
        buscado = True
    except Exception as e:
        logger.error(f"Fallo pulsando buscar: {e}")

    if buscado:
        try:
            total_txt = drv.execute_script(
                "var el = document.querySelector('#tbBuscador\\\\:idFormBuscarProceso .ui-paginator-current');"
                "return el ? el.textContent.trim() : 'n/a';")
            logger.info(f"  [TOTAL] Paginador: {total_txt}")
        except Exception:
            pass

    return buscado


    drv.get(SEACE_URL)
    time.sleep(5)

    # -- Activar tab Procedimientos --
    for by, sel in [
        (By.CSS_SELECTOR, "a[href*='tab1']"),
        (By.XPATH, "//a[contains(., 'Procedimientos de Selecci')]"),
        (By.XPATH, "//li[@role='tab'][2]/a"),
    ]:
        try:
            el = drv.find_element(by, sel)
            js_click(drv, el)
            time.sleep(3)
            logger.info("Tab Procedimientos activado.")
            break
        except Exception:
            continue

    # -- Seleccionar año --
    anio_ok = False
    for _ in range(2):
        try:
            sel_el = drv.find_element(
                By.ID, "tbBuscador:idFormBuscarProceso:anioConvocatoria_input")
            drv.execute_script(f"arguments[0].value = '{year}';", sel_el)
            drv.execute_script(
                "arguments[0].dispatchEvent(new Event('change', {bubbles: true}));", sel_el)
            time.sleep(3)
            logger.info(f"Año {year} seleccionado.")
            anio_ok = True
            break
        except Exception:
            time.sleep(2)

    if not anio_ok:
        for s in drv.find_elements(By.TAG_NAME, 'select'):
            try:
                opciones = [o.text.strip() for o in s.find_elements(By.TAG_NAME, 'option')]
                if str(year) in opciones:
                    Select(s).select_by_visible_text(str(year))
                    drv.execute_script(
                        'arguments[0].dispatchEvent(new Event("change",{bubbles:true}));', s)
                    time.sleep(3)
                    logger.info(f"Año {year} seleccionado (fallback select).")
                    break
            except Exception:
                continue


def obtener_filas_frescas(drv):
    """
    Obtiene las filas actuales de la tabla de resultados.
    Re-obtiene el DOM cada vez para evitar StaleElementReferenceException.
    Usa XPaths idénticos a test_seace.py.
    """
    rows = drv.find_elements(
        By.XPATH,
        "//tbody[@id='tbBuscador:idFormBuscarProceso:dtProcesos_data']/tr"
    )
    if not rows:
        rows = drv.find_elements(
            By.XPATH,
            "//tbody[contains(@id,'dtProcesos_data')]/tr"
        )
    return rows

def obtener_headers(drv):
    """Obtiene los nombres de las columnas de la tabla de resultados."""
    col_names = []
    try:
        ths = drv.find_elements(
            By.XPATH, "//thead[contains(@id,'Procesos_head')]//th")
        if not ths:
            ths = drv.find_elements(
                By.XPATH, "//table[.//tr/th[contains(.,'Entidad')]]//th")
        for th in ths:
            txt = th.text.strip().replace("\n", " ")
            col_names.append(txt if txt else f"Accion_{len(col_names)+1}")
    except Exception:
        pass
    return col_names



# ─── Extracción de acciones desde la ficha ───────────────────────────────────
def extraer_acciones_de_ficha(drv):
    """
    Extrae el listado de acciones de la ficha de selección.
    ORDEN EXACTO DE test_seace.py:
      1. Buscar botones 'Acciones' por ítem (ruta 2025 - funciona para ambos años)
      2. Si no hay, intentar ruta directa 2026 (tabla/semáforo)
    """
    items_data = []

    # ── PASO 1: Buscar botones "Acciones" (idéntico a test_seace.py paso 8) ──
    acc_btns = drv.find_elements(By.XPATH,
        "//button[contains(., 'Acciones')] | "
        "//button[contains(@title, 'Acciones')] | "
        "//a[contains(., 'Acciones')]")

    # Si no hay, expandir fieldsets y reintentar
    if not acc_btns:
        try:
            togglers = drv.find_elements(By.XPATH,
                "//a[contains(@class,'ui-fieldset-toggler')] | "
                "//span[contains(@class,'ui-fieldset-toggler')]")
            for tg in togglers:
                drv.execute_script("arguments[0].click();", tg)
            if togglers:
                time.sleep(3)
                acc_btns = drv.find_elements(By.XPATH,
                    "//button[contains(., 'Acciones')] | "
                    "//button[contains(@title, 'Acciones')] | "
                    "//a[contains(., 'Acciones')]")
        except Exception:
            pass

    num_items = len(acc_btns)
    logger.info(f"    [FICHA] Botones Acciones: {num_items}")

    if num_items > 0:
        for acc_idx in range(num_items):
            try:
                btns_now = drv.find_elements(By.XPATH,
                    "//button[contains(., 'Acciones')] | "
                    "//button[contains(@title, 'Acciones')] | "
                    "//a[contains(., 'Acciones')]")
                if acc_idx >= len(btns_now):
                    break
                js_click(drv, btns_now[acc_idx])
                time.sleep(4)

                tabs_sit = drv.find_elements(By.XPATH,
                    "//table[.//th[contains(., 'Situaci')]]")
                if tabs_sit:
                    t_sit = tabs_sit[-1]
                    ths_sit = [th.text.strip()
                               for th in t_sit.find_elements(By.TAG_NAME, 'th')]
                    acciones_lista = []
                    for tr_r in t_sit.find_elements(By.XPATH, ".//tbody/tr"):
                        tds_r = [td.text.strip()
                                 for td in tr_r.find_elements(By.TAG_NAME, 'td')]
                        if any(tds_r):
                            if ths_sit and len(ths_sit) == len(tds_r):
                                acciones_lista.append(dict(zip(ths_sit, tds_r)))
                            else:
                                acciones_lista.append({"Info": " | ".join(tds_r)})
                    items_data.append({
                        "item_numero": acc_idx + 1,
                        "acciones": acciones_lista
                    })
                    logger.info(f"    -> Item {acc_idx+1}/{num_items}: {len(acciones_lista)} accion(es)")

                # Regresar a ficha (test_seace.py paso 8.b)
                try:
                    btn_reg = drv.find_element(By.XPATH,
                        "//button[contains(., 'Regresar')] | "
                        "//a[contains(., 'Regresar')]")
                    js_click(drv, btn_reg)
                    time.sleep(4)
                except Exception:
                    drv.back()
                    time.sleep(4)

            except Exception as ex:
                logger.debug(f"    Item {acc_idx+1} error: {ex}")

        return items_data

    # ── PASO 2: Fallback 2026 ─────────────────────────────────────────────────
    logger.info("    [FICHA] Sin botones Acciones. Diagnóstico + ruta 2026...")

    titulo = drv.title
    todos_btns = drv.find_elements(By.XPATH, "//button")
    txt_btns = [b.text.strip()[:30] for b in todos_btns if b.text.strip()][:8]
    todos_links = drv.find_elements(By.XPATH, "//a[string-length(text()) > 2]")
    txt_links = [a.text.strip()[:30] for a in todos_links if a.text.strip()][:8]
    logger.info(f"    [FICHA-DX] Titulo: {titulo[:60]}")
    logger.info(f"    [FICHA-DX] Botones: {txt_btns}")
    logger.info(f"    [FICHA-DX] Links: {txt_links}")

    # Semáforo / acciones generales (2026)
    try:
        btns_gen = drv.find_elements(By.XPATH,
            "//a[.//img[contains(@src,'semaforo')]] | "
            "//a[contains(@title,'acciones generales') or contains(.,'acciones generales')]")
        if btns_gen:
            js_click(drv, btns_gen[0])
            time.sleep(6)
    except Exception:
        pass

    # Tabla directa 2026
    try:
        tb = drv.find_element(By.ID, "frmAccionProcedimiento:dsAccionProcedimiento_data")
        if tb.is_displayed():
            ths = [th.text.strip() for th in tb.find_elements(By.XPATH, "./..//th") if th.text.strip()]
            if not ths:
                ths = ["Nro", "Situación", "Fecha"]
            acciones = []
            for tr in tb.find_elements(By.XPATH, ".//tbody/tr"):
                tds = [td.text.strip() for td in tr.find_elements(By.TAG_NAME, "td")]
                if any(tds):
                    acciones.append(dict(zip(ths, tds)) if len(ths) == len(tds)
                                    else {"Info": " | ".join(tds)})
            if acciones:
                items_data.append({"item_numero": 1, "acciones": acciones})
                return items_data
    except Exception:
        pass

    # Tabla genérica con "Situaci"
    tabs_sit = drv.find_elements(By.XPATH, "//table[.//th[contains(., 'Situaci')]]")
    if tabs_sit:
        tb = tabs_sit[-1]
        ths = [th.text.strip() for th in tb.find_elements(By.TAG_NAME, "th")]
        acciones = []
        for tr in tb.find_elements(By.XPATH, ".//tbody/tr"):
            tds = [td.text.strip() for td in tr.find_elements(By.TAG_NAME, "td")]
            if any(tds):
                acciones.append(dict(zip(ths, tds)) if len(ths) == len(tds)
                                else {"Info": " | ".join(tds)})
        if acciones:
            items_data.append({"item_numero": 1, "acciones": acciones})

    return items_data

# ─── Procesar una fila ───────────────────────────────────────────────────────

def procesar_fila(drv, idx_fila, url_resultados):
    """
    Re-obtiene la fila fresca por índice, abre su ficha y extrae acciones.
    Regresa a la lista de resultados al terminar.
    Igual que test_seace.py pasos 7-9.
    """
    acciones = []
    try:
        # Re-obtener filas frescas para evitar StaleElement
        filas_now = []
        for _ in range(5):
            filas_now = obtener_filas_frescas(drv)
            if len(filas_now) > idx_fila:
                break
            time.sleep(2)

        if idx_fila >= len(filas_now):
            logger.warning(f"    Fila {idx_fila} no disponible.")
            return []

        fila = filas_now[idx_fila]
        enlaces = fila.find_elements(By.XPATH, ".//a | .//button")

        # Localizar botón de ficha (igual que test_seace.py)
        ficha_btn = None
        for a in enlaces:
            titulo = (a.get_attribute('title') or '').lower()
            try:
                img_src = a.find_element(
                    By.TAG_NAME, 'img').get_attribute('src') or ''
            except Exception:
                img_src = ''
            if ('ficha' in titulo or 'sheet' in img_src.lower()
                    or 'ficha' in img_src.lower()):
                ficha_btn = a
                break
        # Fallback: 2do enlace (2026)
        if not ficha_btn and len(enlaces) >= 2:
            ficha_btn = enlaces[1]

        if not ficha_btn:
            logger.warning("    ⚠️ Sin botón de ficha.")
            return []

        ventanas_antes = set(drv.window_handles)
        js_click(drv, ficha_btn)
        time.sleep(5)
        time.sleep(8)

        nuevas = set(drv.window_handles) - ventanas_antes
        main_h = drv.current_window_handle

        if nuevas:
            drv.switch_to.window(nuevas.pop())
            acciones = extraer_acciones_de_ficha(drv)
            drv.close()
            drv.switch_to.window(main_h)
        else:
            logger.info(f"    Ficha: {drv.current_url[-55:]}")
            acciones = extraer_acciones_de_ficha(drv)
            # Regresar a resultados (igual que test_seace.py paso 9)
            try:
                btn_reg = drv.find_element(By.XPATH,
                    "//button[contains(., 'Regresar')] | "
                    "//a[contains(., 'Regresar')]")
                js_click(drv, btn_reg)
                time.sleep(8)
            except Exception:
                drv.back()
                time.sleep(8)

    except Exception as e:
        logger.error(f"    Error procesando fila: {e}")
        try:
            drv.get(url_resultados)
            time.sleep(8)
        except Exception:
            pass

    return acciones

# ─── Paginación (JS - más robusto que XPath en headless) ────────────────────
def pagina_siguiente(drv):
    """
    Avanza a la siguiente página usando JavaScript directamente sobre el DOM.
    El SEACE usa <span class='ui-paginator-next'>, no <a>.
    Filtrado al formulario tbBuscador:idFormBuscarProceso para no chocar con
    el paginador oculto del Tab 0.
    """
    result = drv.execute_script("""
        var btn, cls;
        var prefix = '#tbBuscador\\\\:idFormBuscarProceso ';

        // 1. SPAN - clase estándar SEACE (span.ui-paginator-next)
        btn = document.querySelector(prefix + 'span.ui-paginator-next');
        if (btn) {
            cls = btn.className || '';
            if (cls.indexOf('ui-state-disabled') !== -1) return 'last_page';
            btn.click();
            return 'clicked:span-next';
        }

        // 2. A - algunas versiones usan <a>
        btn = document.querySelector(prefix + 'a.ui-paginator-next');
        if (btn) {
            cls = btn.className || '';
            if (cls.indexOf('disabled') !== -1 || cls.indexOf('ui-state-disabled') !== -1)
                return 'last_page';
            btn.click();
            return 'clicked:a-next';
        }

        // 3. aria-label
        btn = document.querySelector(prefix + '[aria-label="Next Page"], ' + prefix + '[aria-label="Siguiente"]');
        if (btn) {
            if ((btn.className || '').indexOf('disabled') !== -1) return 'last_page';
            btn.click();
            return 'clicked:aria';
        }

        // 4. ui-icon-seek-next → padre
        var icon = document.querySelector(prefix + '.ui-icon-seek-next');
        if (icon) {
            var parent = icon.closest('span, a, button');
            if (parent) {
                if ((parent.className || '').indexOf('disabled') !== -1) return 'last_page';
                parent.click();
                return 'clicked:icon';
            }
        }

        // 5. Página activa + 1 (número)
        var active = document.querySelector(prefix + '.ui-paginator-page.ui-state-active');
        if (active) {
            var next = active.nextElementSibling;
            if (next && next.classList.contains('ui-paginator-page')) {
                next.click();
                return 'clicked:next-number';
            }
        }

        // Diagnóstico
        var pags = document.querySelectorAll(prefix + '[class*="paginator"]');
        var info = Array.from(pags).slice(0, 6).map(function(e) {
            return e.tagName + ':' + (e.className || '').substring(0, 35);
        });
        return 'not_found:count=' + pags.length + ':' + info.join('|');
    """)

    logger.info(f"  [PAG] {result}")
    if result and result.startswith('clicked'):
        time.sleep(10)
        return True
    return False


def avanzar_n_paginas(drv, n):
    """
    Avanza n páginas hacia adelante con clics rápidos (4s c/u).
    Usado para recuperar posición tras re-búsqueda post-Regresar.
    """
    for i in range(n):
        result = drv.execute_script("""
            var btn, cls;
            var prefix = '#tbBuscador\\\\:idFormBuscarProceso ';

            btn = document.querySelector(prefix + 'span.ui-paginator-next');
            if (btn) {
                cls = btn.className || '';
                if (cls.indexOf('ui-state-disabled') !== -1) return 'last';
                btn.click(); return 'ok';
            }
            btn = document.querySelector(prefix + 'a.ui-paginator-next');
            if (btn) {
                cls = btn.className || '';
                if (cls.indexOf('disabled') !== -1) return 'last';
                btn.click(); return 'ok';
            }
            var active = document.querySelector(prefix + '.ui-paginator-page.ui-state-active');
            if (active && active.nextElementSibling &&
                active.nextElementSibling.classList.contains('ui-paginator-page')) {
                active.nextElementSibling.click(); return 'ok';
            }
            return 'fail';
        """)
        if result and result.startswith('ok'):
            time.sleep(4)
        else:
            logger.info(f"  [ADVANCE] Detenido avance {i+1}/{n}: {result}")
            return False
    return True


# ─── Main ────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Actualizador de Acciones SEACE v4.2")
    parser.add_argument("--limit", type=int, default=10,
                        help="Máx. registros a actualizar (0 = ilimitado)")
    parser.add_argument("--year", type=int, default=2026,
                        help="Año de la BD a procesar (filtra los pendientes)")
    parser.add_argument("--portal-years", type=str, default="2025,2026",
                        help="Años a buscar en el portal SEACE, separados por coma (default: 2025,2026)")
    args = parser.parse_args()

    portal_years = [int(y.strip()) for y in args.portal_years.split(",") if y.strip().isdigit()]

    conn = get_db()
    drv = None

    try:
        # ── Cargar pendientes de la BD ────────────────────────────────
        # Cargamos por año de BD. El portal SEACE puede tener esos registros
        # bajo un año diferente (e.g., registros DB anio=2026 aparecen en SEACE año=2025).
        with conn.cursor() as cur:
            if args.year:
                cur.execute(
                    "SELECT nomenclatura FROM licitaciones_cabecera "
                    "WHERE (acciones_json IS NULL OR acciones_json = '') AND anio = %s",
                    (args.year,)
                )
            else:
                cur.execute(
                    "SELECT nomenclatura FROM licitaciones_cabecera "
                    "WHERE acciones_json IS NULL OR acciones_json = ''"
                )
            filas_db = [r['nomenclatura'] for r in cur.fetchall() if r['nomenclatura']]

        # Filtrar corruptos
        patron_valido = re.compile(r'^[A-Z].*-\d{4}-', re.IGNORECASE)
        pendientes = {n.strip() for n in filas_db if patron_valido.match(n.strip())}
        descartados = len(filas_db) - len(pendientes)
        if descartados > 0:
            logger.warning(f"Descartados {descartados} registros inválidos.")

        modo = f"Límite: {args.limit}" if args.limit > 0 else "ILIMITADO"
        logger.info(f"Pendientes BD: {len(pendientes)} | anio_bd={args.year} | {modo}")
        logger.info(f"Buscando en portal SEACE años: {portal_years}")

        # ── Muestra de 5 pendientes para referencia de formato ────────────────
        muestra = list(pendientes)[:5]
        logger.info(f"Muestra de pendientes DB: {muestra}")

        drv = setup_driver()
        actualizados = []

        for portal_year in portal_years:
            if not pendientes:
                logger.info("Sin pendientes restantes. Finalizando.")
                break

            logger.info(f"\n{'='*50}")
            logger.info(f"BUSCANDO EN PORTAL SEACE - AÑO {portal_year}")
            logger.info(f"{'='*50}")

            from datetime import date
            hoy = date.today()
            
            import calendar
            rangos = []
            for mes in range(1, 13):
                ultimo_dia = calendar.monthrange(portal_year, mes)[1]
                f_ini = f"01/{mes:02d}/{portal_year}"
                f_fin = f"{ultimo_dia:02d}/{mes:02d}/{portal_year}"
                rangos.append((f_ini, f_fin))
            
            # Si el año portal es el futuro/actual y ya pasamos la fecha, podemos ajustar,
            # pero SEACE tolera fechas futuras en la búsqueda. Lo dejamos estricto por semestres.
            
            for (f_ini, f_fin) in rangos:
                logger.info(f"\n--- SEMESTRE: {f_ini} al {f_fin} ---")

                # ── Iniciar búsqueda en el portal ──────────────────────────
                if not iniciar_busqueda(drv, portal_year, f_ini, f_fin):
                    logger.error(f"Fallo al iniciar búsqueda para {portal_year} [{f_ini}-{f_fin}]")
                    continue

                col_names = obtener_headers(drv)
                logger.info(f"Columnas: {col_names}")

                pagina = 1
                detener = False
                matches_en_pagina = 0

                while not detener:
                    logger.info(f"--- Página {pagina} (semestre: {f_ini} al {f_fin}) ---")
                    matches_en_pagina = 0

                    filas = obtener_filas_frescas(drv)
                    num_filas = len(filas)
                    logger.info(f"Filas: {num_filas}")

                    if num_filas == 0:
                        logger.info("Sin filas. Siguiente semestre.")
                        break

                    if "no se encontr" in (filas[0].text or "").lower():
                        logger.info("Sin resultados en portal.")
                        break

                    # DEBUG primera fila
                    try:
                        primera_tds = filas[0].find_elements(By.TAG_NAME, 'td')
                        vals_debug = [td.text.strip()[:25] for td in primera_tds[:6]]
                        logger.info(f"  [DEBUG] Primera fila: {vals_debug}")
                    except Exception:
                        pass

                    url_resultados = drv.current_url

                    for idx_fila in range(num_filas):
                        # Re-obtener filas frescas (evita StaleElement)
                        filas_fresh = obtener_filas_frescas(drv)
                        if idx_fila >= len(filas_fresh):
                            break

                        fila = filas_fresh[idx_fila]

                        # Extraer celdas y mapear a columnas
                        try:
                            tds = fila.find_elements(By.TAG_NAME, 'td')
                            valores = [td.text.strip().replace("\n", " ") for td in tds]
                        except Exception:
                            continue

                        if not valores:
                            continue

                        row_dict = {}
                        for i, v in enumerate(valores):
                            k = col_names[i] if i < len(col_names) else f"col_{i+1}"
                            row_dict[k] = v

                        # Nomenclatura: igual que test_seace.py línea 207
                        nom = (row_dict.get("Nomenclatura")
                               or row_dict.get("Nomenclatura del Procedimiento")
                               or (valores[3] if len(valores) > 3 else ""))

                        if not nom:
                            continue

                        if nom not in pendientes:
                            continue

                        logger.info(f"  ✓ Match [{idx_fila+1}/{num_filas}] pág.{pagina}: {nom}")
                        matches_en_pagina += 1

                        acciones = procesar_fila(drv, idx_fila, url_resultados)

                        if acciones:
                            try:
                                with conn.cursor() as cur_u:
                                    cur_u.execute(
                                        "UPDATE licitaciones_cabecera "
                                        "SET acciones_json = %s, "
                                        "fecha_actualizacion_scraper = NOW() "
                                        "WHERE nomenclatura = %s",
                                        (json.dumps(acciones, ensure_ascii=False), nom)
                                    )
                                conn.commit()
                                logger.info(f"    ✅ BD actualizado: {nom}")
                                actualizados.append(nom)
                                pendientes.discard(nom)
                            except Exception as e:
                                logger.error(f"    Error BD: {e}")
                        else:
                            logger.warning(f"    ⚠️ Sin acciones: {nom}")

                        # Respetar límite
                        if args.limit > 0 and len(actualizados) >= args.limit:
                            logger.info(f"Límite {args.limit} alcanzado.")
                            detener = True
                            break

                    if detener:
                        break

                    # Avanzar página con detección de reset post-Regresar
                    avanzado = pagina_siguiente(drv)
                    if avanzado:
                        pagina += 1
                        matches_en_pagina = 0
                    elif matches_en_pagina > 0 and 'last_page' not in str(avanzado):
                        # El Regresar reseteó el portal a página 1 (y NO fue el fin natural de las páginas).
                        # Re-buscamos y avanzamos al siguiente número de página.
                        logger.info(
                            f"  [RESET] Portal reseteado por Regresar. "
                            f"Re-buscando semestre {f_ini}-{f_fin} → pág.{pagina + 1}..."
                        )
                        if not iniciar_busqueda(drv, portal_year, f_ini, f_fin):
                            logger.error("  Re-búsqueda fallida. Abortando semestre.")
                            break
                        col_names = obtener_headers(drv)
                        if pagina > 0 and not avanzar_n_paginas(drv, pagina):
                            logger.warning("  No se pudo avanzar. Fin de páginas.")
                            break
                        pagina += 1
                        matches_en_pagina = 0
                        logger.info(f"  [RESET] Continuando desde página {pagina}.")
                    else:
                        logger.info(f"Fin natural de páginas para semestre {f_ini}-{f_fin}.")
                        break


    finally:
        if drv:
            drv.quit()
        conn.close()

    print(f"\nProceso terminado. Actualizados: {len(actualizados)}")
    for n in actualizados:
        print(f"  * {n}")

if __name__ == "__main__":
    main()
