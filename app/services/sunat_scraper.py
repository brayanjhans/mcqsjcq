import os
import time
import base64
import json
import logging
from PIL import Image
import google.generativeai as genai
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

# Logger configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SunatScraper")

class SunatScraper:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-2.0-flash')
        else:
            logger.warning("GEMINI_API_KEY no encontrada. La resolución de captcha no funcionará.")
            self.model = None

    def _setup_driver(self):
        opts = Options()
        opts.add_argument("--headless")
        opts.add_argument("--no-sandbox")
        opts.add_argument("--disable-dev-shm-usage")
        opts.add_argument("--disable-blink-features=AutomationControlled")
        opts.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        
        # Detect chrome path if possible or use default
        try:
            return webdriver.Chrome(options=opts)
        except Exception as e:
            logger.error(f"Error iniciando Chrome: {e}")
            return None

    def solve_captcha(self, driver):
        if not self.model:
            return None
            
        try:
            # Wait for captcha image
            captcha_element = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.ID, "imgCodigo"))
            )
            
            # Take screenshot of the captcha element
            captcha_path = "temp_captcha.png"
            captcha_element.screenshot(captcha_path)
            
            # Send to Gemini
            with open(captcha_path, "rb") as f:
                img_data = f.read()
                
            response = self.model.generate_content([
                "Read the 4 alphanumeric characters in this SUNAT captcha image. Output ONLY the characters in uppercase.",
                {"mime_type": "image/png", "data": img_data}
            ])
            
            captcha_text = response.text.strip().upper()
            logger.info(f"Captcha resuelto por Gemini: {captcha_text}")
            
            # Clean up
            if os.path.exists(captcha_path):
                os.remove(captcha_path)
                
            return captcha_text
        except Exception as e:
            logger.error(f"Error resolviendo captcha: {e}")
            return None

    def get_ruc_details(self, ruc):
        driver = self._setup_driver()
        if not driver:
            return {"error": "No se pudo iniciar el driver de Selenium"}
            
        try:
            url = "https://e-consultaruc.sunat.gob.pe/cl-ti-itconsruc/jcrS00Alias"
            driver.get(url)
            time.sleep(3)
            
            # 1. Fill RUC
            ruc_input = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.ID, "txtRuc"))
            )
            ruc_input.clear()
            ruc_input.send_keys(ruc)
            
            # 2. Check for captcha
            try:
                # El captcha puede no aparecer siempre
                captcha_img = driver.find_elements(By.ID, "imgCodigo")
                if captcha_img and captcha_img[0].is_displayed():
                    logger.info("Captcha detectado. Intentando resolver...")
                    captcha_text = self.solve_captcha(driver)
                    if captcha_text:
                        captcha_input = driver.find_element(By.ID, "txtCodigo")
                        captcha_input.send_keys(captcha_text)
                    else:
                        logger.warning("No se pudo resolver el captcha, intentando continuar sin él.")
            except Exception as e:
                logger.info(f"Omitiendo paso de captcha: {e}")
            
            # 3. Submit
            btn_submit = driver.find_element(By.ID, "btnAceptar")
            driver.execute_script("arguments[0].click();", btn_submit)
            time.sleep(5)
            
            # 4. Check if we are in results page
            if "Número de RUC:" not in driver.page_source:
                logger.error("No se detectó la página de resultados. ¿Captcha incorrecto?")
                return {"error": "No se pudo acceder a los resultados"}
            
            # 5. Extract data
            soup = BeautifulSoup(driver.page_source, "html.parser")
            
            # Helper to find text in the following sibling div or span
            def get_val(label_text):
                # SUNAT usa h4 para las etiquetas
                header = soup.find(lambda t: t.name == "h4" and label_text in t.text)
                if header:
                    parent_row = header.find_parent("div", class_="list-group-item")
                    if parent_row:
                        val_div = parent_row.find("div", class_="col-sm-7")
                        text = ""
                        if val_div:
                            text = val_div.text.strip()
                        else:
                            full_text = parent_row.text.strip()
                            label_text_actual = header.text.strip()
                            text = full_text.replace(label_text_actual, "").strip()
                        
                        # Limpiar si hay fechas mezcladas
                        if "Fecha de" in text or "\n" in text:
                            # Intentar extraer solo la fecha DD/MM/YYYY si el label es de fecha
                            if "Fecha" in label_text:
                                match = re.search(r'(\d{2}/\d{2}/\d{4})', text)
                                if match: return match.group(1)
                            # De lo contrario, tomar la primera línea limpia
                            return text.split("\n")[0].strip()
                        return text
                return ""

            import re
            data = {
                "ruc": ruc,
                "tipo_contribuyente": get_val("Tipo Contribuyente"),
                "nombre_comercial": get_val("Nombre Comercial"),
                "fecha_inscripcion": get_val("Fecha de Inscripción"),
                "fecha_inicio_actividades": get_val("Fecha de Inicio de Actividades"),
                "sistema_emision": get_val("Sistema Emisión de Comprobante"),
                "sistema_contabilidad": get_val("Sistema Contabilidad"),
                "actividad_comercio_exterior": get_val("Actividad Comercio Exterior"),
                "emisor_electronico_desde": get_val("Emisor electrónico desde"),
            }
            
            # Actividades Económicas (pueden ser varias)
            activities = []
            act_header = soup.find(lambda t: t.name == "h4" and "Actividad(es) Económica(s)" in t.text)
            if act_header:
                # Las actividades suelen estar en una tabla o lista debajo
                parent_item = act_header.find_parent("div", class_="list-group-item")
                if parent_item:
                    # Buscar todas las celdas o spans con texto de actividad
                    # Suelen estar en un formato 'Principal - XXXX - ...'
                    text_content = parent_item.text
                    # Extraer líneas que parecen actividades
                    lines = [l.strip() for l in text_content.split("\n") if len(l.strip()) > 10 and ("Principal" in l or "Secundaria" in l)]
                    activities = lines
            
            data["actividades_economicas"] = activities
            
            return data
            
        except Exception as e:
            logger.error(f"Error en scraping: {e}")
            return {"error": str(e)}
        finally:
            driver.quit()

# Test usage
if __name__ == "__main__":
    scraper = SunatScraper()
    res = scraper.get_ruc_details("20601724597")
    print(json.dumps(res, indent=2))
