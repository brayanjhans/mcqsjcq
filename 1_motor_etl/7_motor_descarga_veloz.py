import os
import time
import pymysql
import requests
import logging
import urllib3
import re
from pathlib import Path
from dotenv import load_dotenv

urllib3.disable_warnings()
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

class MotorDescargaVeloz:
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
        self.output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '1_database', 'pdf_contratos')
        Path(self.output_dir).mkdir(parents=True, exist_ok=True)
        
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://prod4.seace.gob.pe/contratos/publico/',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }

    def sanitize_filename(self, text):
        return re.sub(r'[^a-zA-Z0-9_\-\.]', '_', str(text))

    def descargar_directo(self, id_numerico, nombre_final):
        """Usa el endpoint nativo de documentos para descargar al vuelo"""
        url = f"https://prod4.seace.gob.pe:9000/api/con/documentos/descargar/{id_numerico}"
        ruta_archivo = os.path.join(self.output_dir, nombre_final)
        
        if os.path.exists(ruta_archivo) and os.path.getsize(ruta_archivo) > 1000:
            logging.info(f"⏭️ Omitido (Existente): {nombre_final}")
            return True
            
        try:
            r = requests.get(url, headers=self.headers, verify=False, timeout=20, stream=True)
            if r.status_code == 200:
                with open(ruta_archivo, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        if chunk: f.write(chunk)
                logging.info(f"✅ Descargado Rápido: {nombre_final}")
                return True
            else:
                logging.warning(f"⚠️ Error {r.status_code} al bajar doc {id_numerico}")
        except Exception as e:
            logging.error(f"❌ Error HTTP en doc {id_numerico}: {e}")
            
        return False

    def procesar_lote_contratos(self, limite=1000):
        """Busca adjudicaciones que tengan id_contrato, extrae su data API y baja sus PDFs"""
        with self.conn.cursor() as cur:
            # Traemos contratos que no tengan su URL final poblada o validacion de descarga
            cur.execute("""
                SELECT id_adjudicacion, id_contrato 
                FROM Licitaciones_Adjudicaciones 
                WHERE id_contrato IS NOT NULL AND id_contrato != ''
                ORDER BY id DESC 
                LIMIT %s
            """, (limite,))
            contratos = cur.fetchall()

        if not contratos:
            logging.info("🏁 No hay contratos pendientes de descarga directa.")
            return

        logging.info(f"🚀 Iniciando Motor Veloz. Procesando {len(contratos)} expedientes de contrato...")
        exitosos = 0

        for row in contratos:
            id_con = row['id_contrato']
            # Obtener metadata cruda del contrato (que contiene los idDocumentos numericos puros)
            url_meta = f"https://prod4.seace.gob.pe:9000/api/bus/contrato/idContrato/{id_con}"
            
            try:
                r = requests.get(url_meta, headers=self.headers, verify=False, timeout=10)
                if r.status_code == 200:
                    data = r.json()
                    descargo_algo = False
                    
                    # 1. Contrato Firme
                    id_doc_1 = data.get('idDocumento')
                    if id_doc_1:
                        nombre = f"{id_con}_contrato_principal_{id_doc_1}.pdf"
                        if self.descargar_directo(id_doc_1, nombre):
                            descargo_algo = True
                            
                    # 2. Documento Consorcio o Anexos
                    id_doc_2 = data.get('idDocumento2')
                    if id_doc_2:
                        nombre2 = f"{id_con}_doc_adicional_{id_doc_2}.pdf"
                        self.descargar_directo(id_doc_2, nombre2)
                        descargo_algo = True
                        
                    if descargo_algo:
                        exitosos += 1
                        
            except Exception as e:
                logging.error(f"Falla de meta-extraccion en contrato {id_con}: {e}")
                
            time.sleep(0.5) # Pausa mínima para no fatigar la API
            
        logging.info(f"🏁 Lote Completado. Se descargaron archivos para {exitosos}/{len(contratos)} contratos.")
        self.conn.close()

if __name__ == "__main__":
    motor = MotorDescargaVeloz()
    motor.procesar_lote_contratos(limite=50)
