"""
Spider de Garantías ACTUALIZADO - Extracción de URLs de PDFs
Versión mejorada que guarda las URLs de los documentos SIN descargarlos
"""
import sys
import requests
import mysql.connector
from mysql.connector import Error
import os
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
from requests.packages.urllib3.exceptions import InsecureRequestWarning

# --- CONFIGURACIÓN INICIAL ---
if sys.platform.startswith('win'):
    try: 
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except: pass

requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

script_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(script_dir)
load_dotenv(os.path.join(parent_dir, ".env"))

DB_CONFIG = {
    'host': os.getenv("DB_HOST"),
    'user': os.getenv("DB_USER"),
    'password': os.getenv("DB_PASS"),
    'database': os.getenv("DB_NAME"),
    'charset': 'utf8mb4'
}

# URLs
URL_API_CONTRATO = "https://prod4.seace.gob.pe:9000/api/bus/contrato/idContrato/{}"
URL_DESCARGA_DOC = "https://prod4.seace.gob.pe:9000/api/con/documentos/descargar/{}"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://prod4.seace.gob.pe/"
}

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s', handlers=[logging.StreamHandler(sys.stdout)])

# --- GESTIÓN DE BASE DE DATOS ---
def obtener_conexion():
    try: return mysql.connector.connect(**DB_CONFIG)
    except Error as e: 
        logging.error(f"Error DB: {e}")
        return None

def obtener_pendientes():
    conn = obtener_conexion()
    if not conn: return []
    cursor = conn.cursor()
    sql = """
        SELECT id_adjudicacion, id_contrato, ganador_nombre 
        FROM Licitaciones_Adjudicaciones 
        WHERE (id_contrato IS NOT NULL AND id_contrato != '')
          AND (entidad_financiera IS NULL) 
        LIMIT 50 
    """
    cursor.execute(sql)
    pendientes = cursor.fetchall()
    conn.close()
    return pendientes

def guardar_datos_completos(resultados):
    """
    Guarda bancos y URLs de PDFs
    resultados = [(banco, url_contrato, url_consorcio, id_adj), ...]
    """
    if not resultados: return
    conn = obtener_conexion()
    if not conn: return
    cursor = conn.cursor()
    
    sql = """
        UPDATE Licitaciones_Adjudicaciones 
        SET entidad_financiera = %s,
            url_pdf_contrato = %s,
            url_pdf_consorcio = %s
        WHERE id_adjudicacion = %s
    """
    
    try:
        cursor.executemany(sql, resultados)
        conn.commit()
        logging.info(f"✅ Guardados {len(resultados)} registros con URLs de PDFs")
    except Error as e:
        logging.error(f"❌ Error guardando datos: {e}")
    finally:
        cursor.close()
        conn.close()

def guardar_consorcio_db(id_contrato, miembros):
    """Guarda miembros del consorcio si están disponibles en la API"""
    conn = obtener_conexion()
    if not conn: return
    cursor = conn.cursor()
    sql = """
        INSERT INTO Detalle_Consorcios (id_contrato, ruc_miembro, nombre_miembro, porcentaje_participacion)
        VALUES (%s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE fecha_registro=NOW()
    """
    datos = []
    for m in miembros:
        ruc = str(m.get('nroDocumento') or m.get('ruc') or 'S/N')[:20]
        nombre = str(m.get('nombreRazonSocial') or m.get('nombre') or 'DESCONOCIDO')[:500]
        part = m.get('porcentajeParticipacion') or 0.0
        datos.append((id_contrato, ruc, nombre, part))
    
    try:
        if datos: cursor.executemany(sql, datos)
        conn.commit()
    except Error as e:
        logging.error(f"❌ Error guardando consorcio {id_contrato}: {e}")
    finally:
        cursor.close()
        conn.close()

# --- NUEVA FUNCIÓN: EXTRACCIÓN DE URLs ---
def extraer_urls_documentos(data, id_contrato):
    """
    Extrae las URLs de los PDFs desde el JSON de la API.
    NO descarga los archivos.
    
    Retorna: (url_contrato, url_consorcio)
    """
    url_contrato = None
    url_consorcio = None
    
    # 1. URL del PDF de Consorcio
    if data.get("idDocumentoConsorcio"):
        id_doc = data.get("idDocumentoConsorcio")
        url_consorcio = URL_DESCARGA_DOC.format(id_doc)
        logging.debug(f"   📄 PDF Consorcio encontrado: {url_consorcio}")
    
    # 2. URL del PDF de Contrato
    # Prioridad: idDocumento2 si tiene "CONTRATO" en el nombre
    if data.get("idDocumento2"):
        archivo_nombre = str(data.get("archivoAdjunto2", "")).upper()
        if "CONTRATO" in archivo_nombre or "CONTRACT" in archivo_nombre:
            id_doc = data.get("idDocumento2")
            url_contrato = URL_DESCARGA_DOC.format(id_doc)
            logging.debug(f"   📄 PDF Contrato (idDocumento2): {url_contrato}")
    
    # Fallback: usar idDocumento si no hay idDocumento2
    if not url_contrato and data.get("idDocumento"):
        id_doc = data.get("idDocumento")
        url_contrato = URL_DESCARGA_DOC.format(id_doc)
        logging.debug(f"   📄 PDF Contrato (idDocumento): {url_contrato}")
    
    return url_contrato, url_consorcio

# --- WORKER PRINCIPAL (ACTUALIZADO) ---
def procesar_contrato(item):
    id_adj, id_contrato, nombre_ganador = item
    url = URL_API_CONTRATO.format(id_contrato)
    
    res_banco = "NO_INFO"
    url_contrato = None
    url_consorcio = None
    
    try:
        r = requests.get(url, headers=HEADERS, verify=False, timeout=15)
        
        if r.status_code == 200:
            data = r.json()
            
            # --- 1. EXTRACCIÓN DE GARANTÍAS (BANCOS) ---
            garantias = data.get('listaGarantiaContrato') or []
            emisores = set()
            for g in garantias:
                banco = g.get('entidadEmisora')
                if banco: 
                    banco_limpio = banco.strip().upper().replace("BANCO", "").strip()
                    emisores.add(banco_limpio)
            
            if emisores: 
                res_banco = " | ".join(sorted(emisores))
            else: 
                res_banco = "SIN_GARANTIA"

            # --- 2. EXTRACCIÓN DE URLs DE PDFs (NUEVO) ---
            url_contrato, url_consorcio = extraer_urls_documentos(data, id_contrato)

            # --- 3. EXTRACCIÓN DE CONSORCIOS (SOLO SI APLICA) ---
            if "CONSORCIO" in str(nombre_ganador).upper():
                contratista = data.get('contratista', {})
                if isinstance(contratista, dict):
                    miembros = contratista.get('listaMiembrosConsorcio') or \
                               contratista.get('listaConsorciados') or []
                    
                    if miembros:
                        guardar_consorcio_db(id_contrato, miembros)
                        logging.info(f"   🏢 Consorcio guardado: {len(miembros)} miembros")

        elif r.status_code == 404:
            res_banco = "CONTRATO_NO_ENCONTRADO_API"
        else:
            res_banco = f"ERROR_API_{r.status_code}"
            
    except Exception as e:
        res_banco = "ERROR_CONEXION"
        logging.error(f"❌ Error procesando {id_contrato}: {e}")

    return (res_banco, url_contrato, url_consorcio, id_adj)

# --- MAIN ---
def main():
    logging.info("🕷️ SPIDER V3.0 - Extracción de URLs de PDFs (Sin Descarga)")
    
    total_procesados = 0
    ciclos = 0
    
    while ciclos < 50: 
        pendientes = obtener_pendientes()
        if not pendientes:
            logging.info("🏁 No hay más pendientes.")
            break
            
        logging.info(f"⚡ Procesando lote de {len(pendientes)}...")
        
        datos_para_update = []
        
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {executor.submit(procesar_contrato, item): item for item in pendientes}
            for future in as_completed(futures):
                res_banco, url_contrato, url_consorcio, id_adj = future.result()
                
                # Preparar datos para update masivo
                datos_para_update.append((res_banco, url_contrato, url_consorcio, id_adj))
                
                # Log resumido
                urls_info = []
                if url_contrato: urls_info.append("📄 Contrato")
                if url_consorcio: urls_info.append("📄 Consorcio")
                urls_txt = " + ".join(urls_info) if urls_info else "Sin PDFs"
                
                print(f"✅ {id_adj}: {res_banco} | {urls_txt}")
                
                total_procesados += 1

        # Guardar lote completo
        guardar_datos_completos(datos_para_update)
        ciclos += 1
    
    logging.info(f"🏁 Finalizado. Total procesados: {total_procesados}")

if __name__ == "__main__":
    main()
