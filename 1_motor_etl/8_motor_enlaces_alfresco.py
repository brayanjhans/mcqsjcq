import os
import time
import json
import logging
import urllib3
import pymysql
import requests
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

urllib3.disable_warnings()
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

class MotorDescargaAlfrescoTokens:
    def __init__(self):
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
        load_dotenv(env_path)
        
        # Conexión principal
        self.conn = pymysql.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASS', '123456789'),
            db=os.getenv('DB_NAME', 'mcqs-jcq'),
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
        self.alfresco_maestro_ticket = None
        self.headers_api = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Referer': 'https://prod4.seace.gob.pe/contratos/publico/'
        }

    def obtener_ticket_maestro(self):
        """Usa inyección de clic en el UI del SEACE para obligar al backend a emitir un alf_ticket global"""
        if self.alfresco_maestro_ticket:
            return self.alfresco_maestro_ticket
            
        logging.info("🕵️ Usando ingenieria inversa UI para obligar emision de Ticket Alfresco Maestro...")
        try:
            with sync_playwright() as p:
                b = p.chromium.launch(headless=True)
                context = b.new_context(accept_downloads=True)
                page = context.new_page()
                
                # Listener en popups y descargas nativas
                def interceptar_ticket(req):
                    url = req.url
                    if 'alf_ticket=' in url:
                        ticket = url.split('alf_ticket=')[1].split('&')[0]
                        self.alfresco_maestro_ticket = ticket
                        logging.info(f"✨ ¡TICKET EXCLUSIVO ATRAPADO! -> {ticket[:15]}...")
                        
                def handle_popup(popup):
                    popup.on("request", interceptar_ticket)

                page.on("popup", handle_popup)
                context.on("request", interceptar_ticket)
                
                # Contrato ancla con documentos garantizados
                page.goto("https://prod4.seace.gob.pe/contratos/publico/#/detalle/idContrato/tipo/2367059/1", wait_until="networkidle")
                page.wait_for_timeout(3000)
                
                # Apretar caja PDF
                page.evaluate('''() => {
                    const divs = Array.from(document.querySelectorAll("div"));
                    for(let d of divs) {
                        if(d.innerText && d.innerText.includes('.pdf') && d.innerText.includes('MB')) {
                            d.click();
                            break;
                        }
                    }
                }''')
                
                # Esperamos a que la redireccion Alfresco exponga la variable
                for _ in range(15):
                    if self.alfresco_maestro_ticket:
                        break
                    page.wait_for_timeout(1000)
                
                b.close()
        except Exception as e:
            logging.error(f"Fallo en generador Headless: {e}")
            
        return self.alfresco_maestro_ticket

    def guardar_url_final_en_bd(self, idx, url_alfresco):
        with self.conn.cursor() as cur:
            cur.execute("""
                UPDATE adjudicaciones_documentos 
                SET url_alfresco_directa = %s 
                WHERE id = %s
            """, (url_alfresco, idx))
        self.conn.commit()

    def extraer_uuids_faltantes(self, lote=10):
        """Consigue los IDs de base de datos que ya tienen Alfresco_ID y construye su enlace directo total"""
        
        ticket = self.obtener_ticket_maestro()
        if not ticket:
            logging.error("❌ No se pudo capturar el Ticket Maestro. Abortando enlaces directos.")
            return

        with self.conn.cursor() as cur:
            # Traer lotes que aun no tengan el link directo generado
            cur.execute("""
                SELECT id, alfresco_id, id_convocatoria
                FROM adjudicaciones_documentos 
                WHERE url_alfresco_directa IS NULL OR url_alfresco_directa = ''
                LIMIT %s
            """, (lote,))
            docs = cur.fetchall()

        if not docs:
            logging.info("🏁 No hay documentos faltantes de enlace Alfresco.")
            return

        logging.info(f"🔗 Ensamblando enlaces en caliente para {len(docs)} expedientes Alfresco...")
        procesados = 0
        
        for doc in docs:
            uuid = doc['alfresco_id']
            # Formato de descarga nativo de Alfresco usando el ticket universal de sesion
            url_formada = f"https://alfprod.seace.gob.pe/alfresco/service/api/node/content/workspace/SpacesStore/{uuid}?a=true&alf_ticket={ticket}"
            
            # Guardado en base de datos
            self.guardar_url_final_en_bd(doc['id'], url_formada)
            procesados += 1

        logging.info(f"✅ Se guardaron {procesados} enlaces hiper-rápidos con el ticket rotativo.")
        self.conn.close()

if __name__ == "__main__":
    motor = MotorDescargaAlfrescoTokens()
    # Batch configurable, puede ser 100, 1000, 10000 
    motor.extraer_uuids_faltantes(lote=50)
