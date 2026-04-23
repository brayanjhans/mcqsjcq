import re

with open('scraper/actualizador_acciones_db.py', 'r', encoding='utf-8') as f:
    content = f.read()

new_iniciar = '''def iniciar_busqueda(drv, year, nomenclatura):
    logger.info(f"Cargando buscador SEACE para {nomenclatura}...")
    drv.get(SEACE_URL)
    import time
    time.sleep(5)

    try:
        el = drv.find_element(By.XPATH, "//li[@role='tab'][2]/a")
        drv.execute_script("arguments[0].click();", el)
        time.sleep(3)
    except Exception as e:
        logger.error(f"Fallo activando tab: {e}")

    try:
        combo = drv.find_element(By.ID, "tbBuscador:idFormBuscarProceso:anioConvocatoria")
        drv.execute_script("arguments[0].click();", combo)
        time.sleep(1)
        opcion_año = drv.find_element(By.XPATH, f"//div[@id='tbBuscador:idFormBuscarProceso:anioConvocatoria_panel']//li[text()='{year}']")
        drv.execute_script("arguments[0].click();", opcion_año)
        time.sleep(3)
    except Exception as e:
        logger.error(f"Fallo seleccionando año: {e}")

    try:
        avz = drv.find_element(By.XPATH, "//legend[contains(.,'Avanzada')]")
        drv.execute_script("arguments[0].click();", avz)
        time.sleep(3)
    except Exception:
        pass

    try:
        label = drv.find_element(By.XPATH, "//label[contains(translate(text(), 'N', 'n'), 'nomenclatura')]")
        input_id = label.get_attribute("for")
        input_id = input_id.replace(":", "\\\\:")
        el = drv.find_element(By.CSS_SELECTOR, f"#{input_id}")
        drv.execute_script("arguments[0].value = '';", el)
        time.sleep(0.5)
        el.send_keys(nomenclatura)
        time.sleep(1)
        logger.info(f"Escrita nomenclatura usando FOR LABEL en field: {input_id}")
    except Exception as e:
        logger.error(f"Fallo escribiendo nomenclatura (Fallback 1): {e}")

    buscado = False
    try:
        btn = drv.find_element(By.XPATH, "//form[@id='tbBuscador:idFormBuscarProceso']//span[text()='Buscar' or text()=' Buscar']/parent::button")
        drv.execute_script("arguments[0].click();", btn)
        time.sleep(7)
        buscado = True
    except Exception as e:
        logger.error(f"Fallo pulsando buscar: {e}")

    return buscado
'''

content = re.sub(r'def iniciar_busqueda\(drv, year, fecha_inicio=None, fecha_fin=None\):.*?def obtener_filas_frescas\(drv\):', lambda m: new_iniciar + '\n\ndef obtener_filas_frescas(drv):', content, flags=re.DOTALL)

with open('scraper/actualizador_acciones_db.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched robust nomenclature locator successfully")
