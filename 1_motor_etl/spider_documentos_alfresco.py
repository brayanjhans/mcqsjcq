import os
import json
import time
import pymysql
from playwright.sync_api import sync_playwright
from dotenv import load_dotenv

# Configurar logs básicos
import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def obtener_convocatorias_pendientes(conn):
    try:
        with conn.cursor() as cur:
            # Traemos un lote de convocatorias para procesar
            query = '''
            SELECT DISTINCT id_convocatoria
            FROM licitaciones_adjudicaciones
            WHERE id_convocatoria NOT IN (
                SELECT DISTINCT id_convocatoria FROM adjudicaciones_documentos
            )
            AND id_convocatoria IS NOT NULL 
            AND id_convocatoria != ''
            AND id_convocatoria REGEXP '^[0-9]+$'
            ORDER BY CAST(id_convocatoria AS UNSIGNED) DESC
            LIMIT 50  -- Lotes moderados para evitar bloqueo
            '''
            cur.execute(query)
            return [row['id_convocatoria'] for row in cur.fetchall()]
    except Exception as e:
        logging.error(f"Error DB Query: {e}")
        return []

def insertar_documentos(conn, documentos):
    if not documentos: return
    try:
        with conn.cursor() as cur:
            query = '''
            INSERT IGNORE INTO adjudicaciones_documentos 
            (id_convocatoria, id_adjudicacion, postor_nombre, tipo_documento, nombre_archivo, alfresco_id)
            VALUES (%s, %s, %s, %s, %s, %s)
            '''
            valores = [
                (d['id_convocatoria'], d.get('id_adjudicacion'), d['postor_nombre'], 
                 d['tipo_documento'], d['nombre_archivo'], d['alfresco_id'])
                for d in documentos
            ]
            cur.executemany(query, valores)
            conn.commit()
            logging.info(f"Insertados/Ignorados {len(documentos)} documentos en BD.")
    except Exception as e:
        logging.error(f"Error DB Insert: {e}")

def run_spider():
    # Cargar variables (.env está en directorio superior)
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
    load_dotenv(env_path)
    
    conn = pymysql.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASS', '123456789'),
        db=os.getenv('DB_NAME', 'mcqs-jcq'),
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

    convocatorias = obtener_convocatorias_pendientes(conn)
    if not convocatorias:
        logging.info("No hay convocatorias nuevas pendientes por procesar.")
        conn.close()
        return

    logging.info(f"Se procesarán {len(convocatorias)} convocatorias en este lote.")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 720}
        )
        page = context.new_page()
        
        # Bloquear imagenes y estilos para acelerar drásticamente el spider
        page.route("**/*", lambda route: route.abort() 
                   if route.request.resource_type in ["image", "stylesheet", "font", "media"]
                   else route.continue_())

        for idx, id_conv in enumerate(convocatorias):
            logging.info(f"[{idx+1}/{len(convocatorias)}] Procesando Convocatoria: {id_conv}")
            docs_a_guardar = []
            json_capturado = False

            def handle_response(response):
                nonlocal json_capturado
                try:
                    # Endpoint destino: /api/bus/adjudicados...
                    if 'api/bus/adjudicados' in response.url and str(id_conv) in response.url:
                        if 'application/json' in response.headers.get('content-type', ''):
                            data = response.json()
                            if isinstance(data, list):
                                json_capturado = True
                                for adj in data:
                                    postor = adj.get('postor', {})
                                    postor_nombre = adj.get('postorNombre') or postor.get('nombre', 'Desconocido')
                                    id_adjudicacion = adj.get('idAdjudicacion')
                                    
                                    # Extraer recursivamente alfId
                                    def extract_docs(obj):
                                        if isinstance(obj, dict):
                                            alf_id = obj.get('alfId') or obj.get('idAlfresco')
                                            if alf_id:
                                                docs_a_guardar.append({
                                                    'id_convocatoria': id_conv,
                                                    'id_adjudicacion': id_adjudicacion,
                                                    'postor_nombre': postor_nombre,
                                                    'tipo_documento': obj.get('tipoDocumento', 'Desconocido'),
                                                    'nombre_archivo': obj.get('nombreArchivo') or obj.get('nombre', 'documento.pdf'),
                                                    'alfresco_id': alf_id
                                                })
                                            for k, v in obj.items():
                                                extract_docs(v)
                                        elif isinstance(obj, list):
                                            for item in obj:
                                                extract_docs(item)
                                    
                                    extract_docs(adj)
                except Exception:
                    pass

            target_url = f"https://prod4.seace.gob.pe/contratos/publico/#/detalle/idConvocatoria/{id_conv}"
            page.on('response', handle_response)
            
            try:
                page.goto(target_url, wait_until='networkidle', timeout=25000)
                page.wait_for_timeout(3000)
            except Exception as e:
                logging.warning(f"Timeout en {id_conv}")
                
            page.remove_listener('response', handle_response)
            
            if not json_capturado:
                logging.warning(f"No hubo JSON válido para {id_conv} (Roto o Bloqueado).")
            else:
                if docs_a_guardar:
                    insertar_documentos(conn, docs_a_guardar)
                else:
                    logging.info("El JSON se interceptó pero no venían archivos en la propuesta.")
                    insertar_documentos(conn, [{
                        'id_convocatoria': id_conv,
                        'id_adjudicacion': None,
                        'postor_nombre': 'SIN_DOCUMENTACION_ALFRESCO',
                        'tipo_documento': 'N/A',
                        'nombre_archivo': 'N/A',
                        'alfresco_id': f'NO_DOCS_{id_conv}'
                    }])
                    
            time.sleep(1) # Pausa amigable para no fatigar IP

        browser.close()
    conn.close()
    logging.info("Lote completado.")

if __name__ == '__main__':
    run_spider()
