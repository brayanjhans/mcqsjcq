from playwright.sync_api import sync_playwright
import time
import json
import pymysql
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Config DB
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '123456789',
    'db': 'mcqs-jcq7',
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

def on_response(response):
    # Interceptar peticiones XHR de releases/tenders/búsquedas de la web
    url = response.url
    if ("/api/v1/releases" in url or "/api/search" in url or "/api/v1/tenders" in url or "/busqueda" in url) and response.request.resource_type in ["xhr", "fetch"]:
        if response.status == 200 and "application/json" in response.headers.get("content-type", ""):
            print(f"[{response.status}] Capturada URL: {url}")
            try:
                data = response.json()
                with open("osce_sample_data.json", "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=4, ensure_ascii=False)
                print(f" -> Guardado json temporal. {len(str(data))} bytes aprox.")
            except Exception as e:
                print(f"Error parseando JSON de {url}: {e}")

def scrape_osce():
    print("Iniciando navegador web (Chromium)...")
    
    with sync_playwright() as p:
        browser_args = {
            "headless": True
        }
            
        browser = p.chromium.launch(**browser_args)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080},
            ignore_https_errors=True
        )
        page = context.new_page()
        
        # Suscribir evento de red
        page.on("response", on_response)

        try:
            print("Navegando al buscador del OSCE...")
            # Usando la URL de la imagen que el usuario provee
            page.goto("https://contratacionesabiertas.osce.gob.pe/busqueda", timeout=60000)
            
            print("Esperando la carga inicial y peticiones de red (10 seg)...")
            time.sleep(10)
            
            # TODO: Hacer clic en filtros del 2026, avanzar paginación, etc.
            # Por ahora probamos conexión básica.

            print("Extracción de prueba completada.")

        except Exception as e:
            print(f"Error durante la navegación: {e}")
            print("El nodo local tiene bloqueado el acceso a la web.")
        finally:
            browser.close()

if __name__ == "__main__":
    scrape_osce()
