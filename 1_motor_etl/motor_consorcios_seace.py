import sys
import os
import requests
import pymysql
import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configuración de log
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Config DB
db_config = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASS', '123456789'),
    'db': 'mcqs-jcq',
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

# Constantes URLs SEACE
URL_API_CONTRATO = "https://prod4.seace.gob.pe:9000/api/bus/contrato/idContrato/{}"
URL_API_CONSORCIO = "https://prod4.seace.gob.pe:9000/api/bus/contrato/consorcios/{}"
URL_DESCARGA_DOC = "https://prod4.seace.gob.pe:9000/api/con/documentos/descargar/{}"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

def obtener_conexion():
    return pymysql.connect(**db_config)

def guardar_consorcio_db(id_contrato, miembros):
    """Guarda en tabla detalle_consorcios"""
    conn = obtener_conexion()
    if not conn: return
    try:
        with conn.cursor() as cursor:
            sql = """
                INSERT IGNORE INTO detalle_consorcios (id_contrato, ruc_miembro, nombre_miembro)
                VALUES (%s, %s, %s)
            """
            datos = []
            for m in miembros:
                ruc = str(m.get('nroDocumento') or m.get('ruc') or 'S/N')[:20]
                nombre = str(m.get('nombreRazonSocial') or m.get('nombre') or 'DESCONOCIDO')[:500]
                datos.append((id_contrato, ruc, nombre))
            if datos:
                cursor.executemany(sql, datos)
                conn.commit()
    except Exception as e:
        logging.error(f"Error guardando consorcio {id_contrato}: {e}")
    finally:
        conn.close()

def guardar_actualizacion_contrato(id_adj, banco, tipo_garantia, url_c, url_cons, url_cf):
    """Actualiza la tabla licitaciones_adjudicaciones"""
    conn = obtener_conexion()
    if not conn: return
    try:
        with conn.cursor() as cursor:
            sql = """
                UPDATE licitaciones_adjudicaciones
                SET entidad_financiera = %s,
                    tipo_garantia = %s,
                    url_pdf_contrato = %s,
                    url_pdf_consorcio = %s,
                    url_pdf_cartafianza = %s
                WHERE id_adjudicacion = %s
            """
            for intento in range(3):
                try:
                    cursor.execute(sql, (banco, tipo_garantia, url_c, url_cons, url_cf, id_adj))
                    conn.commit()
                    break
                except Exception as oe:
                    if "1213" in str(oe) or "Deadlock" in str(oe):
                        time.sleep(0.5)
                        continue
                    else:
                        raise oe
    except Exception as e:
        logging.error(f"Error actualizando adj {id_adj}: {e}")
    finally:
        conn.close()

def procesar_contrato(item):
    id_adj = item['id_adjudicacion']
    id_contrato = str(item['id_contrato']).strip()
    nombre_ganador = str(item['ganador_nombre'] or "").upper()
    
    url = URL_API_CONTRATO.format(id_contrato)
    res_banco = None
    res_tipo_garantia = None
    url_contrato = None
    url_consorcio = None
    url_cf = None
    
    try:
        r = requests.get(url, headers=HEADERS, verify=False, timeout=10)
        if r.status_code == 200:
            data = r.json()
            
            # 1. Banco, Tipo y URL Carta Fianza
            garantias = data.get('listaGarantiaContrato') or []
            emisores = set()
            tipos_garantia = set()
            for g in garantias:
                banco = g.get('entidadEmisora')
                if banco:
                    banco_limpio = banco.strip().upper().replace("BANCO", "").strip()
                    emisores.add(banco_limpio)
                    
                tipo_gar = g.get('tipoGarantia') or g.get('claseGarantia')
                if tipo_gar:
                    tipos_garantia.add(tipo_gar.strip().upper())
                    
                if not url_cf and g.get('idDocumento'):
                    url_cf = URL_DESCARGA_DOC.format(g['idDocumento'])
            
            if emisores:
                res_banco = " | ".join(sorted(emisores))
            if tipos_garantia:
                res_tipo_garantia = " | ".join(sorted(tipos_garantia))
                
            # 2. PDFs Contrato y Consorcio
            if data.get("idDocumentoConsorcio"):
                url_consorcio = URL_DESCARGA_DOC.format(data["idDocumentoConsorcio"])
                
            if data.get("idDocumento2"):
                arch_nombre = str(data.get("archivoAdjunto2", "")).upper()
                if "CONTRATO" in arch_nombre or "CONTRACT" in arch_nombre:
                    url_contrato = URL_DESCARGA_DOC.format(data["idDocumento2"])
            
            if not url_contrato and data.get("idDocumento"):
                url_contrato = URL_DESCARGA_DOC.format(data["idDocumento"])
                
    except Exception as e:
        pass # Silence individual network errors
    
    # 3. Consorcios (Lo disparamos directamente sea cual sea si en el nombre dice consorcio)
    if "CONSORCIO" in nombre_ganador:
        try:
            r_cons = requests.get(URL_API_CONSORCIO.format(id_contrato), headers=HEADERS, verify=False, timeout=10)
            if r_cons.status_code == 200:
                miembros = r_cons.json()
                if isinstance(miembros, list) and miembros:
                    guardar_consorcio_db(id_contrato, miembros)
        except Exception:
            pass
            
    return (id_adj, id_contrato, res_banco, res_tipo_garantia, url_contrato, url_consorcio, url_cf)

def main(year=None):
    logging.info("🚀 MOTOR SEACE FULL - Extrayendo PDFs, Garantías y Consorcios")
    conn = obtener_conexion()
    
    with conn.cursor() as cursor:
        if year:
            logging.info(f"   Filtrando contratos del año {year}...")
            sql = """
                SELECT a.id_adjudicacion, a.id_contrato, a.ganador_nombre
                FROM licitaciones_adjudicaciones a
                INNER JOIN licitaciones_cabecera l ON a.id_convocatoria = l.id_convocatoria
                WHERE a.id_contrato IS NOT NULL AND a.id_contrato != ''
                AND a.entidad_financiera IS NULL
                AND l.fecha_publicacion BETWEEN %s AND %s
            """
            cursor.execute(sql, (f"{year}-01-01", f"{year}-12-31"))
        else:
            sql = """
                SELECT id_adjudicacion, id_contrato, ganador_nombre
                FROM licitaciones_adjudicaciones 
                WHERE id_contrato IS NOT NULL AND id_contrato != ''
                AND entidad_financiera IS NULL
            """
            cursor.execute(sql)
        pendientes = cursor.fetchall()
    
    conn.close()
    
    total = len(pendientes)
    logging.info(f"📋 Se encontraron {total} contratos para inspeccionar...")
    procesados = 0
    
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {executor.submit(procesar_contrato, item): item for item in pendientes}
        
        for future in as_completed(futures):
            id_adj, id_con, banco, tipo_gar, url_c, url_cons, url_cf = future.result()
            
            guardar_actualizacion_contrato(id_adj, banco, tipo_gar, url_c, url_cons, url_cf)
            procesados += 1
            if procesados % 50 == 0:
                logging.info(f"   ✓ Analizados {procesados}/{total} contratos.")
                
    logging.info("🏁 Completado todo el lote de contratos de SEACE.")

if __name__ == "__main__":
    main()
