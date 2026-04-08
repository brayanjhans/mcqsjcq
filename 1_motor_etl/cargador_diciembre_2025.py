"""
Script para procesar SOLO el archivo de diciembre 2025
"""
import mysql.connector
from mysql.connector import Error
import sys
import os
import time
import logging
import ijson
from datetime import datetime
from itertools import chain
from dotenv import load_dotenv
from decimal import Decimal

# --- CONFIGURACIÓN ---
script_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(script_dir)
load_dotenv(os.path.join(parent_dir, ".env"))

DB_CONFIG = {
    'host': os.getenv("DB_HOST"),
    'user': os.getenv("DB_USER"),
    'password': os.getenv("DB_PASS"),
    'database': os.getenv("DB_NAME"),
    'charset': 'utf8mb4',
    'collation': 'utf8mb4_unicode_ci',
    'use_unicode': True,
    'autocommit': False
}

# Archivo específico
ARCHIVO_DICIEMBRE = os.path.join(parent_dir, "1_database", "2025", "2025-12_seace_v3.json")

TRADUCTOR_CATEGORIA = {
    'goods': 'BIENES', 'works': 'OBRAS', 'services': 'SERVICIOS', 'consultingServices': 'CONSULTORIA'
}

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s', handlers=[logging.StreamHandler(sys.stdout)])
if sys.platform.startswith('win'):
    try: sys.stdout.reconfigure(encoding='utf-8')
    except: pass

# --- UTILIDADES BLINDADAS ---
def safe_str(val, max_len=None):
    if val is None: return ""
    s = str(val).strip()
    if max_len and len(s) > max_len: return s[:max_len]
    return s

def safe_float(val):
    if val is None: return 0.0
    try:
        return float(val)
    except:
        return 0.0

def limpiar_fecha(f):
    if not f: return None
    try:
        f_clean = str(f)[:10]
        datetime.strptime(f_clean, '%Y-%m-%d')
        return f_clean
    except ValueError: return None

def determinar_estado(tender_status, item_status):
    st_item = safe_str(item_status)
    if st_item: return st_item.upper()
    
    st = safe_str(tender_status).lower()
    if not st: return "DESCONOCIDO"

    mapping = {'active': 'CONVOCADO', 'activo': 'CONVOCADO', 'complete': 'CONTRATADO', 'cancelled': 'CANCELADO', 'unsuccessful': 'DESIERTO', 'withdrawn': 'NULO', 'planned': 'PROGRAMADO', 'awarded': 'ADJUDICADO'}
    return mapping.get(st, st.upper())

def traducir_categoria(cat_ingles):
    cat_safe = safe_str(cat_ingles)
    return TRADUCTOR_CATEGORIA.get(cat_safe, cat_safe.upper() if cat_safe else "OTROS")

# --- DB ---
def obtener_conexion():
    intentos = 3
    while intentos > 0:
        try: return mysql.connector.connect(**DB_CONFIG)
        except Error: time.sleep(2); intentos -= 1
    raise Exception("❌ Sin conexión a DB")

def insertar_lote_seguro(cursor, sql, datos, tipo="Registro"):
    if not datos: return 0
    try:
        cursor.executemany(sql, datos)
        return len(datos)
    except Error as e:
        logging.warning(f"⚠️ Fallo en lote {tipo} ({e}). Modo Fila-por-Fila.")
        c = 0
        for fila in datos:
            try: cursor.execute(sql, fila); c += 1
            except Error: pass
        return c

# --- MOTOR ETL ---
def procesar_archivo_diciembre(conn):
    """Procesa solo el archivo de diciembre 2025"""
    
    if not os.path.exists(ARCHIVO_DICIEMBRE):
        logging.error(f"❌ Archivo no encontrado: {ARCHIVO_DICIEMBRE}")
        return 0
    
    cursor = conn.cursor()
    cursor.execute("SET FOREIGN_KEY_CHECKS=0")
    
    contador = 0
    cabeceras = []
    adjudicaciones = []
    
    logging.info(f"📂 Procesando: 2025-12_seace_v3.json")
    
    try:
        with open(ARCHIVO_DICIEMBRE, 'rb') as f:
            try:
                parser = ijson.items(f, 'records.item', use_float=True)
                primer = next(parser, None)
                if primer is None:
                    f.seek(0)
                    parser = ijson.items(f, 'item', use_float=True)
                else:
                    parser = chain([primer], parser)
            except: return 0

            for r in parser:
                if not r: continue
                
                compiled = r.get('compiledRelease', {})
                tender = compiled.get('tender', {})
                
                # 1. FILTRO: TODOS LOS TIPOS (USER REQUEST)
                tipo_proc = tender.get('procurementMethodDetails')
                # if tipo_proc != 'Licitación Pública': continue # Disabled by User Request
                
                id_conv = safe_str(tender.get('id'), 100)
                if not id_conv: continue
                
                # 2. MAPEO DE CONTRATOS
                mapa_contratos = {}
                for c in compiled.get('contracts', []):
                    aw_id = c.get('awardID')
                    c_id = c.get('id')
                    if aw_id and c_id:
                        mapa_contratos[str(aw_id)] = safe_str(c_id, 100)

                # 3. CABECERA
                ocid = safe_str(r.get('ocid'), 100)
                titulo = safe_str(tender.get('title'), 4000)
                desc = safe_str(tender.get('description'), 4000)
                buyer = compiled.get('buyer', {})
                comprador = safe_str(buyer.get('name'), 500)
                cat = traducir_categoria(tender.get('mainProcurementCategory'))
                monto = safe_float(tender.get('value', {}).get('amount'))
                moneda = safe_str(tender.get('value', {}).get('currency', 'PEN'), 10)
                
                fecha_raw = compiled.get('date')
                fecha = limpiar_fecha(fecha_raw)
                
                items = tender.get('items', [])
                estado = determinar_estado(tender.get('status'), items[0].get('statusDetails') if items else None)
                
                # Ubicación
                parties = compiled.get('parties', [])
                ubic_full, dep, prov, dist = "PERU", None, None, None
                for p in parties:
                    if p.get('id') == buyer.get('id'):
                        addr = p.get('address', {})
                        dep = safe_str(addr.get('department'), 100)
                        prov = safe_str(addr.get('region'), 100)
                        dist = safe_str(addr.get('locality'), 100)
                        partes = [x for x in [dep, prov, dist] if x]
                        if partes: ubic_full = " / ".join(partes)
                        break

                cabeceras.append((
                    id_conv, ocid, titulo, desc, comprador, cat, tipo_proc,
                    monto, moneda, fecha, estado, ubic_full, dep, prov, dist, "2025-12_seace_v3.json"
                ))
                
                # 4. ADJUDICACIONES (solo awards activos = el ganador real de la Buena Pro)
                for aw in compiled.get('awards', []):
                    # Filtrar solo el award ganador (status='active'). Los awards
                    # cancelados o desiertos no son la Buena Pro y no deben insertarse.
                    if aw.get('status', '').lower() != 'active':
                        continue
                    id_adj_raw = aw.get('id')
                    id_adj = safe_str(id_adj_raw, 100)
                    if not id_adj: continue
                    
                    id_contrato = mapa_contratos.get(str(id_adj_raw), None)
                    sups = aw.get('suppliers', [])
                    ganador = safe_str(sups[0].get('name') if sups else "DESCONOCIDO", 500)
                    ruc = safe_str(sups[0].get('id') if sups else None, 50)
                    m_adj = safe_float(aw.get('value', {}).get('amount'))
                    f_adj = limpiar_fecha(aw.get('date'))
                    
                    adjudicaciones.append((
                        id_adj, id_contrato, id_conv, ganador, ruc, m_adj, f_adj, 'ADJUDICADO'
                    ))

                if len(cabeceras) >= 2000:
                    _guardar(cursor, conn, cabeceras, adjudicaciones)
                    contador += len(cabeceras)
                    cabeceras, adjudicaciones = [], []

            if cabeceras:
                _guardar(cursor, conn, cabeceras, adjudicaciones)
                contador += len(cabeceras)

    except Exception as e:
        logging.error(f"❌ Error en archivo: {e}")
        conn.rollback()
    finally:
        try: cursor.execute("SET FOREIGN_KEY_CHECKS=1"); cursor.close()
        except: pass
    
    return contador

def _guardar(cursor, conn, cabeceras, adjudicaciones):
    sql_cab = """
    INSERT INTO Licitaciones_Cabecera 
    (id_convocatoria, ocid, nomenclatura, descripcion, comprador, categoria, tipo_procedimiento,
     monto_estimado, moneda, fecha_publicacion, estado_proceso,
     ubicacion_completa, departamento, provincia, distrito, archivo_origen)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    ON DUPLICATE KEY UPDATE
        categoria = COALESCE(NULLIF(VALUES(categoria), ''), categoria), 
        tipo_procedimiento = COALESCE(NULLIF(VALUES(tipo_procedimiento), ''), tipo_procedimiento),
        departamento = COALESCE(NULLIF(VALUES(departamento), ''), departamento), 
        provincia = COALESCE(NULLIF(VALUES(provincia), ''), provincia), 
        distrito = COALESCE(NULLIF(VALUES(distrito), ''), distrito),
        fecha_publicacion = COALESCE(NULLIF(VALUES(fecha_publicacion), ''), fecha_publicacion),
        estado_proceso = CASE 
            WHEN estado_proceso = 'CONTRATADO' AND VALUES(estado_proceso) != 'CONTRATADO' THEN estado_proceso
            ELSE COALESCE(NULLIF(VALUES(estado_proceso), ''), estado_proceso)
        END,
        last_update=NOW();
    """
    sql_adj = """
    INSERT INTO Licitaciones_Adjudicaciones
    (id_adjudicacion, id_contrato, id_convocatoria, ganador_nombre, ganador_ruc, monto_adjudicado, fecha_adjudicacion, estado_item)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    ON DUPLICATE KEY UPDATE
        id_contrato = COALESCE(NULLIF(VALUES(id_contrato), ''), id_contrato),
        fecha_adjudicacion = COALESCE(NULLIF(VALUES(fecha_adjudicacion), ''), fecha_adjudicacion),
        ganador_nombre = COALESCE(NULLIF(VALUES(ganador_nombre), ''), ganador_nombre),
        ganador_ruc = COALESCE(NULLIF(VALUES(ganador_ruc), ''), ganador_ruc),
        monto_adjudicado = COALESCE(VALUES(monto_adjudicado), monto_adjudicado),
        estado_item = CASE
            WHEN estado_item = 'CONTRATADO' AND VALUES(estado_item) != 'CONTRATADO' THEN estado_item
            ELSE COALESCE(NULLIF(VALUES(estado_item), ''), estado_item)
        END;
    """
    insertar_lote_seguro(cursor, sql_cab, cabeceras, "Cabeceras")
    if adjudicaciones:
        insertar_lote_seguro(cursor, sql_adj, adjudicaciones, "Adjudicaciones")
    conn.commit()

# --- MAIN ---
def main():
    logging.info("🚀 CARGADOR DICIEMBRE 2025 V16.0")
    
    if not os.path.exists(ARCHIVO_DICIEMBRE):
        logging.error(f"❌ No se encuentra el archivo: {ARCHIVO_DICIEMBRE}")
        logging.info("💡 Verifica que la carpeta sea: c:\\laragon\\www\\BRAYAN\\proyecto_garantias\\1_database\\2025\\")
        return
    
    conn = obtener_conexion()
    
    try:
        start = time.time()
        regs = procesar_archivo_diciembre(conn)
        dur = time.time() - start
        
        # Actualizar control
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO control_cargas (nombre_archivo, estado, fecha_fin, registros_procesados)
            VALUES (%s, 'EXITO', NOW(), %s)
            ON DUPLICATE KEY UPDATE estado='EXITO', fecha_fin=NOW(), registros_procesados=%s
        """, ("2025-12_seace_v3.json", regs, regs))
        conn.commit()
        cursor.close()
        
        logging.info(f"✅ 2025-12_seace_v3.json: {regs} Licitaciones encontradas en {dur:.2f}s")

    except KeyboardInterrupt: logging.warning("🛑 Interrumpido.")
    except Exception as e: logging.critical(f"☠️ Error Fatal: {e}")
    finally:
        if conn.is_connected(): conn.close()
        logging.info("🔌 Fin.")

if __name__ == "__main__":
    main()
