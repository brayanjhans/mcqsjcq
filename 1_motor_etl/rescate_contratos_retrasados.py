import json
import requests
import pymysql
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
import os

# Configuración de logs
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

# Configuracion Base de Datos
db_config = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASS', '123456789'),
    'db': 'mcqs-jcq',
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

def obtener_conexion():
    return pymysql.connect(**db_config)

def procesar_ocid(item):
    """
    Realiza una solicitud a la API en vivo de OCDS usando el OCID y extrae id_contrato si existe.
    """
    id_adjudicacion = item['id_adjudicacion']
    ocid = item['ocid']
    url = f"https://contratacionesabiertas.oece.gob.pe/api/v1/record/{ocid}"
    
    try:
        r = requests.get(url, timeout=15)
        if r.status_code == 200:
            data = r.json()
            records = data.get('records', [])
            if not records:
                return (id_adjudicacion, None, False)
                
            compiled = records[0].get('compiledRelease', {})
            contracts = compiled.get('contracts', [])
            
            # Buscar el contrato correcto para esta adjudicacion
            for c in contracts:
                if str(c.get('awardID')) == str(id_adjudicacion):
                    id_contrato = str(c.get('id', '')).strip()
                    if id_contrato:
                        # Hemos encontrado el ID contrato "rezagado"
                        return (id_adjudicacion, id_contrato, True)
            
            # Si hay contratos pero ninguno coincide exacto (raro), intentar el primero
            if contracts:
                id_contrato = str(contracts[0].get('id', '')).strip()
                if id_contrato:
                    return (id_adjudicacion, id_contrato, True)
                    
            return (id_adjudicacion, None, False)
            
    except Exception as e:
        return (id_adjudicacion, None, False)
        
    return (id_adjudicacion, None, False)

def main(years=None):
    logging.info("==========================================================")
    logging.info("🚁 INICIANDO MOTOR RESCATE OCDS (CONTRATOS REZAGADOS API VIVO)")
    logging.info("==========================================================")
    
    if not years:
        years = [2026] # Default

    conn = obtener_conexion()
    pendientes = []
    
    try:
        with conn.cursor() as cursor:
            for y in years:
                # Buscamos procesos Adjudicados sin ID contrato cuyo año coincida
                sql = """
                    SELECT a.id_adjudicacion, c.ocid 
                    FROM licitaciones_adjudicaciones a
                    INNER JOIN licitaciones_cabecera c ON a.id_convocatoria = c.id_convocatoria
                    WHERE (a.id_contrato IS NULL OR a.id_contrato = '')
                    AND c.estado_proceso = 'ADJUDICADO'
                    AND c.fecha_publicacion LIKE %s
                """
                cursor.execute(sql, (f"{y}-%",))
                pendientes.extend(cursor.fetchall())
    finally:
        conn.close()
        
    total = len(pendientes)
    logging.info(f"🔍 Se encontraron {total} licitaciones estancadas en ADJUDICADO sin contrato para revisión en vivo.")
    
    if total == 0:
        logging.info("✅ Ningún contrato rezagado encontrado. Saliendo.")
        return True

    rescatados = 0
    analizados = 0
    actualizaciones = []
    
    # Procesamiento paralelo concurrente (max 15 hilos para no saturar la API)
    with ThreadPoolExecutor(max_workers=15) as executor:
        futures = {executor.submit(procesar_ocid, p): p for p in pendientes}
        for future in as_completed(futures):
            id_adj, id_cont, encontrado = future.result()
            analizados += 1
            
            if encontrado and id_cont:
                actualizaciones.append((id_cont, id_adj))
                rescatados += 1
                
            if analizados % 200 == 0:
                logging.info(f"   ► Analizados {analizados}/{total}. Rescatados: {rescatados}")

    # Guardar los encontrados en base de datos de manera masiva
    if actualizaciones:
        logging.info(f"💾 Guardando {rescatados} contratos rescatados en la base de datos...")
        conn_update = obtener_conexion()
        try:
            with conn_update.cursor() as cursor:
                # Actualizamos id_contrato en adjudicaciones
                sql_update_adj = """
                    UPDATE licitaciones_adjudicaciones 
                    SET id_contrato = %s, estado_item = 'CONTRATADO' 
                    WHERE id_adjudicacion = %s
                """
                cursor.executemany(sql_update_adj, actualizaciones)
                
                # Actualizamos la cabecera general a CONTRATADO si su adjudicacion principal firmó
                for id_cont, id_adj in actualizaciones:
                    id_conv = id_adj.split('-')[0] if '-' in id_adj else id_adj
                    sql_update_cab = """
                        UPDATE licitaciones_cabecera 
                        SET estado_proceso = 'CONTRATADO' 
                        WHERE id_convocatoria = %s AND estado_proceso != 'CONTRATADO'
                    """
                    cursor.execute(sql_update_cab, (id_conv,))
                    
            conn_update.commit()
            logging.info("✅ Base de datos actualizada con éxito.")
        except Exception as e:
            logging.error(f"❌ Error actualizando la base de datos: {e}")
            conn_update.rollback()
        finally:
            conn_update.close()
    
    logging.info(f"🏁 MOTOR RESCATE FINALIZADO. Total rescatados: {rescatados}/{total}.")
    return True

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--years", nargs="+", type=int, default=[2026], help="Años a revisar")
    args = parser.parse_args()
    main(args.years)
