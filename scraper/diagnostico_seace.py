"""
DIAGNOSTICO SEACE - Verifica qué elementos existen en la pagina
para identificar los selectores correctos actuales.
"""
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select
import time, os, sys

print("[*] === DIAGNOSTICO SEACE ===")

opts = webdriver.ChromeOptions()
opts.add_argument('--headless=new')
opts.add_argument('--no-sandbox')
opts.add_argument('--disable-dev-shm-usage')
opts.add_argument('--log-level=3')

cwd = os.getcwd()
driver_path = os.path.join(cwd, 'chromedriver.exe')
if not os.path.exists(driver_path):
    import glob, os
    wdm = os.path.expanduser("~/.wdm")
    drivers = glob.glob(wdm + "/**/chromedriver.exe", recursive=True)
    if drivers:
        drivers.sort(key=os.path.getmtime, reverse=True)
        driver_path = drivers[0]
    else:
        driver_path = None

try:
    if driver_path and os.path.exists(driver_path):
        from selenium.webdriver.chrome.service import Service
        service = Service(executable_path=driver_path)
        d = webdriver.Chrome(service=service, options=opts)
        print(f"[OK] Chrome iniciado con: {driver_path}")
    else:
        d = webdriver.Chrome(options=opts)
        print("[OK] Chrome iniciado sin driver explícito")

    print("[-] Cargando SEACE...")
    d.get('https://prod2.seace.gob.pe/seacebus-uiwd-pub/buscadorPublico/buscadorPublico.xhtml')
    time.sleep(4)
    print(f"    Titulo: {d.title}")

    # --- Detectar tabs disponibles ---
    print("\n[1] TABS disponibles en la pagina:")
    tabs_all = d.find_elements(By.XPATH, "//li[contains(@class,'ui-tabs-header')] | //ul[contains(@class,'ui-tabs')]/li | //a[contains(@href,'tab')]")
    for t in tabs_all:
        print(f"    tab: id='{t.get_attribute('id')}' class='{t.get_attribute('class')}' text='{t.text[:60]}'")

    # --- Intentar activar tab de procedimientos ---
    print("\n[2] Intentando activar tab de Procedimientos...")
    activado = False
    intentos_tab = [
        (By.CSS_SELECTOR, "a[href*='tab1']"),
        (By.XPATH, "//a[contains(.,'Procedimientos de Selecci')]"),
        (By.XPATH, "//li[contains(@id,'tab1')]/a"),
        (By.XPATH, "//li[@role='tab'][1]/a"),
        (By.XPATH, "//span[contains(.,'Procedimientos')]/ancestor::a"),
    ]
    for by, sel in intentos_tab:
        try:
            el = d.find_element(by, sel)
            d.execute_script('arguments[0].click()', el)
            time.sleep(3)
            print(f"    [OK] Tab activado con: {sel}")
            activado = True
            break
        except Exception as e:
            print(f"    [X] Fallo: {sel[:60]} -> {str(e)[:80]}")

    if not activado:
        print("    [!] No se pudo activar tab, continuando con la pagina actual")

    # --- Ver los selects disponibles ---
    print("\n[3] Selectores (dropdown) en la pagina:")
    sels = d.find_elements(By.TAG_NAME, 'select')
    for i, s in enumerate(sels):
        if not s.is_displayed():
            continue
        opciones = [o.text.strip() for o in s.find_elements(By.TAG_NAME, 'option')]
        print(f"    select[{i}] id='{s.get_attribute('id')}' opciones={opciones[:5]}...")

    # --- Seleccionar 2026 ---
    print("\n[4] Seleccionando año 2026...")
    for s in d.find_elements(By.TAG_NAME, 'select'):
        if not s.is_displayed():
            continue
        opciones = [o.text.strip() for o in s.find_elements(By.TAG_NAME, 'option')]
        if '2026' in opciones:
            Select(s).select_by_visible_text('2026')
            d.execute_script('var e=new Event("change",{bubbles:true}); arguments[0].dispatchEvent(e);', s)
            time.sleep(2.5)
            print(f"    [OK] 2026 seleccionado en select id='{s.get_attribute('id')}'")
            break

    # --- Buscar el boton Buscar ---
    print("\n[5] Botones disponibles en la pagina:")
    botones = d.find_elements(By.TAG_NAME, 'button')
    for b in botones:
        if b.is_displayed():
            print(f"    btn id='{b.get_attribute('id')}' text='{b.text[:50]}'")

    # --- Hacer click en Buscar ---
    print("\n[6] Haciendo click en Buscar...")
    buscado = False
    xpaths_buscar = [
        "//button[contains(.,'Buscar') and not(contains(.,'Avanzada'))]",
        "//button[.//span[text()=' Buscar'] or .//span[text()='Buscar']]",
        "//input[@value='Buscar']",
    ]
    for xp in xpaths_buscar:
        try:
            els = d.find_elements(By.XPATH, xp)
            for el in els:
                if el.is_displayed():
                    d.execute_script('arguments[0].click()', el)
                    print(f"    [OK] Buscar clickeado con: {xp[:60]}")
                    time.sleep(7)
                    buscado = True
                    break
            if buscado:
                break
        except Exception as e:
            print(f"    [X] {xp[:60]} -> {str(e)[:60]}")

    # --- Detectar tabla de resultados ---
    print("\n[7] Buscando tabla de resultados...")
    tbodies = d.find_elements(By.TAG_NAME, 'tbody')
    for i, tb in enumerate(tbodies):
        trs = tb.find_elements(By.TAG_NAME, 'tr')
        if len(trs) > 0:
            print(f"    tbody[{i}] id='{tb.get_attribute('id')}' -> {len(trs)} filas")
            if i == 0:
                first_row = trs[0].find_elements(By.TAG_NAME, 'td')
                print(f"    Primera fila tiene {len(first_row)} columnas")
                print(f"    Texto primera fila: {[td.text[:30] for td in first_row[:5]]}")

    # --- XPath especifico de SEACE ---
    print("\n[8] Probando XPath especifico de SEACE...")
    filas_seace = d.find_elements(By.XPATH, "//tbody[contains(@id, 'tbListaFicha_data')]/tr")
    print(f"    Filas con XPath tbListaFicha_data: {len(filas_seace)}")
    
    filas_alt = d.find_elements(By.XPATH, "//tbody[contains(@id,'_data')]/tr")
    print(f"    Filas con XPath _data (generico): {len(filas_alt)}")

    tablas = d.find_elements(By.TAG_NAME, 'table')
    max_tds = 0
    tabla_max = None
    for t in tablas:
        tds = t.find_elements(By.TAG_NAME, 'td')
        if len(tds) > max_tds:
            max_tds = len(tds)
            tabla_max = t
    if tabla_max:
        print(f"    Tabla con mas celdas: id='{tabla_max.get_attribute('id')}' ({max_tds} celdas)")
        rows = tabla_max.find_elements(By.CSS_SELECTOR, 'tbody tr')
        print(f"    Esa tabla tiene {len(rows)} filas de datos")

except Exception as e:
    import traceback
    print("[ERROR]", traceback.format_exc())
finally:
    try:
        d.quit()
        print("\n[*] Navegador cerrado.")
    except:
        pass
