import os
import time
import pymysql
import requests
import logging
import urllib3
from pathlib import Path
from playwright.sync_api import sync_playwright
from dotenv import load_dotenv

urllib3.disable_warnings()
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

class MotorDescargaAlfresco:
    def __init__(self):
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
        load_dotenv(env_path)
        
        self.conn = pymysql.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASS', '123456789'),
            db=os.getenv('DB_NAME', 'mcqs-jcq'),
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
        self.ticket_alfresco = None
        self.output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '1_database', 'pdf_alfresco')
        Path(self.output_dir).mkdir(parents=True, exist_ok=True)

    def obtener_ticket_maestro(self):
        """
        Navega a un proceso modelo en SEACE e intercepta el ticket generado 
        al interactuar con la descarga de documentos, sirviendo para miles de descargas.
        """
        logging.info("🕵️ Iniciando obtención de Ticket Alfresco Maestro...")
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            # Bloquear imágenes para velocidad
            page.route("**/*", lambda route: route.abort() 
                       if route.request.resource_type in ["image", "stylesheet", "font", "media"] 
                       else route.continue_())

            def on_request(request):
                if 'ticket' in request.url.lower() and 'alfresco' in request.url.lower():
                    # Capturamos de la URL o Headers (depende de cómo expone SEACE la API interna)
                    ticket_str = request.url.split('ticket=')[-1].split('&')[0]
                    if len(ticket_str) > 10:
                        self.ticket_alfresco = ticket_str
                        logging.info(f"🔑 TICKET MAESTRO CAPTURADO: {self.ticket_alfresco}")

            page.on('request', on_request)
            
            # Página semilla segura que sabemos que tiene documentos (Ej. el contrato 2375062 del caso Pomacucho, o cualquiera conocido)
            try:
                page.goto('https://prod4.seace.gob.pe/contratos/publico/#/detalle/idContrato/tipo/2375062/1', wait_until='networkidle', timeout=30000)
                page.wait_for_timeout(2000) # Breve respiro para render de botones

                # Inyección JS agresiva: Encontramos todos los botones de íconos que parezcan de descarga y los clickeamos nativamente
                # Esto bypassa cualquier bloqueo CSS, popups, spinners o demoras de Angular.
                page.evaluate('''() => {
                    const btns = Array.from(document.querySelectorAll('button.mat-icon-button'));
                    for(let b of btns) {
                        if(b.innerText.includes('attach_file') || b.innerText.includes('get_app')) {
                            // Interceptamos la acción original de descarga forzando un click JS
                            b.click();
                        }
                    }
                }''')
                
                # Esperamos brevemente a que viaje la petición XHR del ticket
                page.wait_for_timeout(2000)
            except Exception as e:
                logging.warning(f"Error navegando a la página semilla: {e}")
            finally:
                browser.close()
                
        if not self.ticket_alfresco:
            logging.error("❌ No se pudo capturar el Ticket Maestro.")
            # Fallback a un ticket dummy provisional o manejo de errores
            return False
            
        return True

    def descargar_documento(self, alf_id, nombre_archivo_limpio):
        """Usa el Ticket Maestro y el Alf_ID para armar el link vivo y descargar el binario a disco"""
        if not self.ticket_alfresco:
            raise ValueError("Ticket no inicializado")

        # El enlace vivo y dinámico que nos solicitaste:
        # Nota: La estructura base de las APIs de descarga en SEACE varía entre 'con/documentos' y 'bus'
        url_viva = f"https://prod4.seace.gob.pe:9000/api/alfresco/descargar?alfId={alf_id}&ticket={self.ticket_alfresco}"
        
        # Alternativa de uso interno en ciertos puertos:
        url_viva_2 = f"https://prod4.seace.gob.pe:9000/api/con/documentos/alfresco/descargar/{alf_id}?ticket={self.ticket_alfresco}"

        rutas_posibles = [url_viva, url_viva_2]
        
        ruta_guardado = os.path.join(self.output_dir, nombre_archivo_limpio)
        if os.path.exists(ruta_guardado):
            logging.info(f"⏭ Omitido (Ya existe): {nombre_archivo_limpio}")
            return True

        for url in rutas_posibles:
            try:
                r = requests.get(url, verify=False, timeout=15)
                if r.status_code == 200 and "%PDF" in r.text[:10]:
                    with open(ruta_guardado, 'wb') as f:
                        f.write(r.content)
                    logging.info(f"✅ Descargado: {nombre_archivo_limpio}")
                    return True
            except Exception:
                pass
                
        logging.warning(f"⚠️ No se pudo descargar {nombre_archivo_limpio} con AlfID: {alf_id}")
        return False

    def iniciar_descarga_masiva(self, limite=1000):
        # 1. Obtener el token generador dinámico general
        if not self.obtener_ticket_maestro():
            logging.error("Abortando descargas masivas por falta de Ticket.")
            # Si quieres permitir un intento sin ticket (si los endpoints públicos los liberan):
            # self.ticket_alfresco = "FREE_PASS_FALLBACK"
            return

        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT id, id_convocatoria, postor_nombre, tipo_documento, nombre_archivo, alfresco_id
                FROM adjudicaciones_documentos
                WHERE alfresco_id IS NOT NULL AND alfresco_id != '' AND alfresco_id NOT LIKE 'NO_DOCS%'
                LIMIT %s
            """, (limite,))
            documentos = cur.fetchall()

        if not documentos:
            logging.info("🏁 No hay documentos en cola (Alfresco ID) para descargar.")
            return

        logging.info(f"▶️ Procesando descarga de {len(documentos)} partes de propuesta técnica...")
        descargados = 0

        for doc in documentos:
            alf_id = doc['alfresco_id']
            # Sanitizar nombre de archivo
            nombre_limpio = f"{doc['id_convocatoria']}_{doc['tipo_documento']}_{doc['nombre_archivo']}"
            nombre_limpio = "".join([c if c.isalnum() else "_" for c in nombre_limpio]) + ".pdf"
            nombre_limpio = nombre_limpio.replace("_.pdf", ".pdf")

            exito = self.descargar_documento(alf_id, nombre_limpio)
            if exito:
                descargados += 1

            time.sleep(1) # Cuidado anti-DDoS interno
            
        logging.info(f"🏁 Lote finalizado: Bajados {descargados}/{len(documentos)} PDFs.")
        self.conn.close()

if __name__ == "__main__":
    motor = MotorDescargaAlfresco()
    motor.iniciar_descarga_masiva(limite=50)
