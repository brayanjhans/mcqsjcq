from selenium import webdriver
from selenium.webdriver.common.by import By
import time, os

opts = webdriver.ChromeOptions()
opts.add_argument('--headless=new')
driver = webdriver.Chrome(options=opts)

try:
    driver.get('https://prod2.seace.gob.pe/seacebus-uiwd-pub/buscadorPublico/buscadorPublico.xhtml')
    time.sleep(5)
    
    # Click Procedimientos
    tab = driver.find_element(By.XPATH, "//a[contains(., 'Procedimientos')]")
    driver.execute_script("arguments[0].click()", tab)
    time.sleep(4)
    
    # Year 2025
    sel_anio = driver.find_element(By.ID, "tbBuscador:idFormBuscarProceso:anioConvocatoria_input")
    driver.execute_script("arguments[0].value = '2025';", sel_anio)
    driver.execute_script("arguments[0].dispatchEvent(new Event('change', {bubbles: true}));", sel_anio)
    time.sleep(3)
    
    # Buscar
    btn_buscar = driver.find_element(By.ID, "tbBuscador:idFormBuscarProceso:btnBuscarSelToken")
    driver.execute_script("arguments[0].click()", btn_buscar)
    time.sleep(8)
    
    # Get first row
    rows = driver.find_elements(By.XPATH, "//tbody[contains(@id, 'dtProcesos_data')]/tr")
    if rows:
        row = rows[0]
        print(f"Row Text: {row.text}")
        print("-" * 20)
        html = row.get_attribute('outerHTML')
        print(f"Row HTML: {html}")
        
except Exception as e:
    print(f"Error: {e}")
finally:
    driver.quit()
