"""
Spider de Garantías DEFINITIVO - Extracción de URLs de PDFs SEACE
Basado en el análisis real de la API de SEACE

API encontrada: https://prod4.seace.gob.pe:9000/api/bus/contrato/idContrato/{id_contrato}

Campos clave:
- idDocumento: ID del PDF del contrato
- listaGarantiaContrato[].idDocumento: ID del PDF de carta fianza
- idDocumento2: ID del PDF de consorcio (si aplica)
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

# API descubierta
URL_API_CONTRATO = "https://prod4.seace.gob.pe:9000/api/bus/contrato/idContrato/{}"
URL_DESCARGA_DOC = "https://prod4.seace.gob.pe:9000/api/con/documentos/descargar/{}"
URL_API_CONSORCIOS = "https://prod4.seace.gob.pe:9000/api/bus/contrato/consorcios/{}"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://prod4.seace.gob.pe/contratos/publico/"
}

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)

# --- GESTIÓN DE BASE DE DATOS ---
def obtener_conexion():
    try:
        return mysql.connector.connect(**DB_CONFIG)
    except Error as e:
        logging.error(f"Error DB: {e}")
        return None

def obtener_pendientes(limite=50):
    """Obtiene contratos pendientes de procesar"""
    conn = obtener_conexion()
    if not conn: return []
    
    cursor = conn.cursor()
    sql = """
        SELECT id_adjudicacion, id_contrato, ganador_nombre 
        FROM Licitaciones_Adjudicaciones 
        WHERE (id_contrato IS NOT NULL AND id_contrato != '')
          AND (
            entidad_financiera IS NULL 
            OR url_documento_contrato IS NULL
            OR url_pdf_cartafianza IS NULL
            OR url_pdf_consorcio IS NULL
          )
        LIMIT %s
    """
    cursor.execute(sql, (limite,))
    pendientes = cursor.fetchall()
    conn.close()
    return pendientes

def guardar_datos_completos(resultados):
    """
    Guarda bancos y URLs de PDFs en la BD
    resultados = lista de tuplas: (banco, url_contrato, url_cartafianza, url_consorcio, id_adj)
    """
    if not resultados:
        return
    
    conn = obtener_conexion()
    if not conn:
        return
    
    cursor = conn.cursor()
    sql = """
        UPDATE Licitaciones_Adjudicaciones 
        SET entidad_financiera = %s,
            url_documento_contrato = %s,
            url_pdf_cartafianza = %s,
            url_pdf_consorcio = %s
        WHERE id_adjudicacion = %s
    """
    
    try:
        cursor.executemany(sql, resultados)
        conn.commit()
        logging.info(f"✅ Guardados {len(resultados)} registros completos")
    except Error as e:
        logging.error(f"❌ Error guardando: {e}")
    finally:
        cursor.close()
        conn.close()

def guardar_consorcio_db(id_contrato, miembros):
    """Guarda miembros del consorcio"""
    if not miembros:
        return
    
    conn = obtener_conexion()
    if not conn:
        return
    
    cursor = conn.cursor()
    sql = """
        INSERT INTO Detalle_Consorcios 
        (id_contrato, ruc_miembro, nombre_miembro, porcentaje_participacion)
        VALUES (%s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE fecha_registro=NOW()
    """
    
    datos = []
    for m in miembros:
        ruc = str(m.get('ruc', 'S/N'))[:20]
        nombre = str(m.get('nombre', 'DESCONOCIDO'))[:500]
        part = m.get('porcentajeParticipacion', 0.0)
        datos.append((id_contrato, ruc, nombre, part))
    
    try:
        if datos:
            cursor.executemany(sql, datos)
            conn.commit()
            logging.info(f"   🏢 Guardados {len(datos)} miembros del consorcio")
    except Error as e:
        logging.error(f"❌ Error guardando consorcio: {e}")
    finally:
        cursor.close()
        conn.close()

# --- WORKER PRINCIPAL ---
def procesar_contrato(item):
    """
    Procesa un contrato usando la API descubierta
    Retorna: (banco, url_contrato, url_cartafianza, url_consorcio, id_adj)
    """
    id_adj, id_contrato, nombre_ganador = item
    url = URL_API_CONTRATO.format(id_contrato)
    
    res_banco = "NO_INFO"
    url_contrato = None
    url_carta_fianza = None
    url_consorcio = None
    
    try:
        r = requests.get(url, headers=HEADERS, verify=False, timeout=15)
        
        if r.status_code == 200:
            data = r.json()
            
            # --- 1. EXTRACCIÓN DE GARANTÍAS (BANCOS) ---
            garantias = data.get('listaGarantiaContrato', [])
            emisores = set()
            
            for g in garantias:
                banco = g.get('entidadEmisora')
                if banco:
                    banco_limpio = banco.strip().upper().replace("BANCO", "").strip()
                    emisores.add(banco_limpio)
                
                # CARTA FIANZA (primer garantía con documento)
                if not url_carta_fianza and g.get('idDocumento'):
                    url_carta_fianza = URL_DESCARGA_DOC.format(g['idDocumento'])
            
            res_banco = " | ".join(sorted(emisores)) if emisores else "SIN_GARANTIA"
            
            # --- 2. URL DEL CONTRATO PRINCIPAL ---
            if data.get('idDocumento'):
                url_contrato = URL_DESCARGA_DOC.format(data['idDocumento'])
            
            # --- 3. URL DEL PDF DE CONSORCIO ---
            if data.get('idDocumento2') and str(data['idDocumento2']).strip():
                url_consorcio = URL_DESCARGA_DOC.format(data['idDocumento2'])
            
            # --- 4. PROCESAR MIEMBROS DE CONSORCIO (SI ES CONSORCIO) ---
            # CORRECCIÓN: Usar nIndConsorcio == 1 como criterio principal, o nombre "CONSORCIO"
            es_consorcio_flag = str(data.get('nIndConsorcio')) == '1'
            nombre_parece_consorcio = "CONSORCIO" in str(nombre_ganador).upper()
            
            if es_consorcio_flag or nombre_parece_consorcio:
                # Obtener miembros de consorcio de API separada
                try:
                    r_cons = requests.get(
                        URL_API_CONSORCIOS.format(id_contrato),
                        headers=HEADERS,
                        verify=False,
                        timeout=10
                    )
                    if r_cons.status_code == 200:
                        miembros = r_cons.json()
                        if miembros and isinstance(miembros, list):
                            guardar_consorcio_db(id_contrato, miembros)
                except:
                    pass
                    
        elif r.status_code == 404:
            res_banco = "CONTRATO_NO_ENCONTRADO"
        elif r.status_code == 500:
            res_banco = "ERROR_API_500"
        else:
            res_banco = f"ERROR_API_{r.status_code}"
            
    except requests.exceptions.Timeout:
        res_banco = "ERROR_TIMEOUT"
        logging.error(f"⏱️  Timeout en {id_contrato}")
    except Exception as e:
        res_banco = "ERROR_CONEXION"
        logging.error(f"❌ Error en {id_contrato}: {e}")
    
    return (res_banco, url_contrato, url_carta_fianza, url_consorcio, id_adj)

# --- MAIN ---
def main():
    logging.info("🕷️  SPIDER SEACE V4.0 - Extracción Completa de URLs")
    logging.info("=" * 70)
    
    total_procesados = 0
    ciclos = 0
    max_ciclos = 50
    
    while ciclos < max_ciclos:
        pendientes = obtener_pendientes(limite=50)
        
        if not pendientes:
            logging.info("🏁 No hay más registros pendientes.")
            break
        
        logging.info(f"\n⚡ Ciclo {ciclos + 1}: Procesando {len(pendientes)} contratos...")
        
        datos_para_update = []
        
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {executor.submit(procesar_contrato, item): item for item in pendientes}
            
            for future in as_completed(futures):
                banco, url_con, url_carta, url_cons, id_adj = future.result()
                
                datos_para_update.append((banco, url_con, url_carta, url_cons, id_adj))
                
                # Log conciso
                urls = []
                if url_con: urls.append("📄Contrato")
                if url_carta: urls.append("💳CartaFianza")
                if url_cons: urls.append("🏢Consorcio")
                
                urls_txt = "+".join(urls) if urls else "Sin PDFs"
                print(f"✅ {id_adj}: {banco} | {urls_txt}")
                
                total_procesados += 1
        
        # Guardar lote completo
        guardar_datos_completos(datos_para_update)
        ciclos += 1
    
    logging.info(f"\n🏁 FINALIZADO. Total procesados: {total_procesados}")
    logging.info("=" * 70)

if __name__ == "__main__":
    main()
