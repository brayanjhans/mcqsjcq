import sys
import os
import glob
import json
import zipfile
import logging
import pymysql
from pymysql.constants import CLIENT
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv

# Configurar logs
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Entorno local
script_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(script_dir)
data_dir = os.path.join(parent_dir, "DATAJSON")

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASS', '123456789'),
    'db': 'mcqs-jcq',
    'charset': 'utf8mb4'
}

# --- DB HELPERS ---
def obtener_conexion():
    return pymysql.connect(**DB_CONFIG)

def safe_str(val, max_len=None):
    if val is None: return None
    s = str(val).strip()
    if max_len and len(s) > max_len:
        return s[:max_len]
    return s

def extract_amount(amount_obj):
    if not isinstance(amount_obj, dict): return 0.0, "PEN"
    monto = float(amount_obj.get("amount", 0.0) or 0.0)
    moneda = safe_str(amount_obj.get("currency", "PEN"), 10)
    return monto, moneda

# --- TRANSLATIONS ---
CATEGORIAS = {
    "goods": "Bienes",
    "works": "Obras",
    "services": "Servicios",
    "consultingServices": "Consultoría de Obras"
}

ESTADOS_AWARD = {
    "active": "ADJUDICADO",
    "cancelled": "CANCELADO",
    "unsuccessful": "DESIERTO",
    "pending": "CONVOCADO"
}

# --- PROCESS RECORD ---
def process_record(record):
    """
    Toma un 'record' OCDS y devuelve (dict_cabecera, list_adjudicaciones)
    """
    ocid = safe_str(record.get("ocid"), 255)
    compiled = record.get("compiledRelease", {})
    if not compiled: return None, []
    
    # --- 1. CABECERA (Tender) ---
    tender = compiled.get("tender", {})
    buyer = compiled.get("buyer", {})
    id_convocatoria = safe_str(tender.get("id"), 255)
    
    if not id_convocatoria:
        return None, []
        
    nomenclatura = safe_str(tender.get("title"), 500)
    descripcion = safe_str(tender.get("description"), 2000)
    
    monto_estimado, moneda = extract_amount(tender.get("value"))
    
    comprador = safe_str(buyer.get("name"), 255)
    entidad_ruc = None
    
    # Obtener RUC oficial y Direccion
    departamento = None
    provincia = None
    distrito = None
    ubicacion_completa = None
    
    parties = compiled.get("parties", [])
    for p in parties:
        roles = p.get("roles", [])
        if "buyer" in roles or "procuringEntity" in roles:
            # RUC de la entidad (principal o additional)
            identifier = p.get("identifier", {})
            if identifier and identifier.get("scheme") == "PE-RUC":
                entidad_ruc = safe_str(identifier.get("id"), 20)
            else:
                for ai in p.get("additionalIdentifiers", []):
                    if ai.get("scheme") == "PE-RUC":
                        entidad_ruc = safe_str(ai.get("id"), 20)
                        break
            
            # Direccion    
            address = p.get("address", {})
            departamento = safe_str(address.get("department"), 100)
            provincia = safe_str(address.get("region"), 100)
            distrito = safe_str(address.get("locality"), 100)
            calle = safe_str(address.get("streetAddress"), 255)
            
            parts = [c for c in [calle, distrito, provincia, departamento] if c]
            if parts:
                ubicacion_completa = " - ".join(parts)[:500]
            break
            
    # Categoría y Tipo de procedimiento
    cat_original = tender.get("mainProcurementCategory")
    categoria = safe_str(CATEGORIAS.get(cat_original, cat_original), 100)
    tipo_procedimiento = safe_str(tender.get("procurementMethodDetails"), 100)
    
    fecha_publicacion = None
    periodo = tender.get("tenderPeriod", {})
    if periodo and periodo.get("startDate"):
        fecha_publicacion = safe_str(periodo.get("startDate"), 50)
    
    # Fallback 1: tender.datePublished (Muy común en Contratación Directa)
    if not fecha_publicacion:
        fecha_publicacion = safe_str(tender.get("datePublished"), 50)
        
    # Fallback 2: oldest release date (Fecha original de creación del registro OCDS)
    if not fecha_publicacion:
        releases = record.get("releases", [])
        if releases:
            # Intentar buscar la fecha más antigua en releases
            try:
                oldest = min(releases, key=lambda x: str(x.get("date", "9999")))
                fecha_publicacion = safe_str(oldest.get("date"), 50)
            except:
                pass

    # Fallback 3: compiled.date (Fecha de la última actualización/exportación)
    if not fecha_publicacion:
        fecha_publicacion = safe_str(compiled.get("date"), 50)
        
    # Inferir Fecha de adjudicación en la cabecera, y forzar traducción del estado del proceso
    awards = compiled.get("awards", [])
    contracts = compiled.get("contracts", [])
    
    fecha_adjudicacion_cabecera = None
    estado_proceso = safe_str(tender.get("status"), 50)
    
    if awards:
        fecha_adjudicacion_cabecera = safe_str(awards[0].get("date"), 50)
        # Si tender.status está vacío, pero tiene Adjudicaciones, el proceso está Adjudicado o Consentido
        if not estado_proceso or estado_proceso == "None":
            estado_proceso = ESTADOS_AWARD.get(awards[0].get("status"), "ADJUDICADO")
            
    # Última revisión del estado con contratos firmados (más prioridad)
    if contracts:
        estado_proceso = "CONTRATADO"
    else:
        estado_proceso = safe_str(ESTADOS_AWARD.get(estado_proceso, estado_proceso) or estado_proceso, 50)
        
    if estado_proceso is None or estado_proceso == "None" or str(estado_proceso).strip() == "":
        estado_proceso = "CONVOCADO"
    
    cabecera = {
        "id_convocatoria": id_convocatoria,
        "ocid": ocid,
        "nomenclatura": nomenclatura,
        "descripcion": descripcion,
        "comprador": comprador,
        "entidad_ruc": entidad_ruc,
        "categoria": categoria,
        "tipo_procedimiento": tipo_procedimiento,
        "monto_estimado": monto_estimado,
        "moneda": moneda,
        "fecha_publicacion": fecha_publicacion,
        "fecha_adjudicacion": fecha_adjudicacion_cabecera,
        "estado_proceso": estado_proceso,
        "origen_tipo": "SEACE_OCDS",
        "departamento": departamento,
        "provincia": provincia,
        "distrito": distrito,
        "ubicacion_completa": ubicacion_completa
    }
    
    # --- 2. ADJUDICACIONES Y CONTRATOS (Awards/Contracts) ---
    # Indexamos contratos por awardID para fusionarlos
    contract_by_award = {}
    for c in contracts:
        a_id = str(c.get("awardID"))
        if a_id not in contract_by_award:
            contract_by_award[a_id] = []
        contract_by_award[a_id].append(c)

    adjudicaciones_list = []
    
    for aw in awards:
        id_adjudicacion = safe_str(aw.get("id"), 255)
        
        # Traducimos estado item
        orig_status = aw.get("status")
        estado_item = safe_str(ESTADOS_AWARD.get(orig_status, orig_status) or orig_status, 50)
        
        fecha_adjudicacion = safe_str(aw.get("date"), 50)
        monto_adjudicado, moneda_adj = extract_amount(aw.get("value"))
        
        # Ganadores (Proveedores/Consorciados)
        suppliers = aw.get("suppliers", [])
        ganador_ruc = None
        ganador_nombre = None
        rucs_cons = []
        nombres_cons = []
        
        if len(suppliers) == 1:
            g = suppliers[0]
            ganador_nombre = safe_str(g.get("name"), 255)
            if g.get("id") and str(g["id"]).startswith("PE-RUC-"):
                ganador_ruc = str(g["id"]).replace("PE-RUC-", "")
        elif len(suppliers) > 1:
            ganador_nombre = "CONSORCIO " + " - ".join([str(s.get("name", "")) for s in suppliers])
            ganador_ruc = "CONSORCIO" 
            for s in suppliers:
                sn = safe_str(s.get("name"), 255)
                sr = str(s.get("id", "")).replace("PE-RUC-", "")
                if sn: nombres_cons.append(sn)
                if sr: rucs_cons.append(sr)
        
        # Buscar el contrato asociado para sacar estado / fecha fin / URLs
        rel_contracts = contract_by_award.get(str(aw.get("id")), [])
        id_contrato = None
        monto_final = monto_adjudicado
        fecha_fin = None
        url_pdf_contrato = None
        url_pdf_cartafianza = None
        url_pdf_consorcio = None
        
        if rel_contracts:
            c = rel_contracts[0]
            id_contrato = safe_str(c.get("id"), 255)
            if c.get("value"):
                cm, _ = extract_amount(c["value"])
                monto_final = cm
            period = c.get("period", {})
            fecha_fin = safe_str(period.get("endDate"), 50)
            
            # Extraer URLs de documentos del contrato
            for doc in c.get("documents", []):
                titulo = str(doc.get("title", "")).lower()
                doc_type = str(doc.get("documentType", "")).lower()
                url = doc.get("url")
                if url:
                    # Contrato base
                    if ("contrato" in titulo or "agreement" in titulo) and not url_pdf_contrato:
                        url_pdf_contrato = safe_str(url, 500)
                    # Garantía / Carta Fianza
                    elif ("garant" in titulo or "fianza" in titulo or "guarantee" in doc_type) and not url_pdf_cartafianza:
                        url_pdf_cartafianza = safe_str(url, 500)
                    # Consorcio
                    elif ("consorcio" in titulo or "partnership" in titulo) and not url_pdf_consorcio:
                        url_pdf_consorcio = safe_str(url, 500)
                    # Si no hay contrato aún, tomar el primero
                    elif not url_pdf_contrato:
                        url_pdf_contrato = safe_str(url, 500)
            
            # Buscar también en tender documents si falta algo
            for doc in tender.get("documents", []):
                titulo = str(doc.get("title", "")).lower()
                url = doc.get("url")
                if url:
                    if ("consorcio" in titulo or "partnership" in titulo) and not url_pdf_consorcio:
                        url_pdf_consorcio = safe_str(url, 500)
                    elif ("garant" in titulo or "fianza" in titulo) and not url_pdf_cartafianza:
                        url_pdf_cartafianza = safe_str(url, 500)
            
            # Si el contrato firmó, forzamos estado_item
            estado_item = "CONTRATADO"
        
        adjudicacion = {
            "id_adjudicacion": id_adjudicacion,
            "id_contrato": id_contrato,
            "id_convocatoria": id_convocatoria,
            "ocid": ocid,
            "ganador_nombre": safe_str(ganador_nombre, 255),
            "ganador_ruc": safe_str(ganador_ruc, 20),
            "monto_adjudicado": monto_adjudicado,
            "fecha_adjudicacion": fecha_adjudicacion,
            "estado_item": estado_item,
            "monto_final": monto_final,
            "moneda": moneda_adj,
            "fecha_fin_contrato": fecha_fin,
            "rucs_consorciados": ",".join(rucs_cons) if rucs_cons else None,
            "nombres_consorciados": " | ".join(nombres_cons) if nombres_cons else None,
            "total_miembros": len(suppliers),
            "departamento": departamento,
            "provincia": provincia,
            "distrito": distrito,
            "ubicacion_completa": ubicacion_completa,
            "url_pdf_contrato": url_pdf_contrato,
            "url_pdf_cartafianza": url_pdf_cartafianza,
            "url_pdf_consorcio": url_pdf_consorcio
        }
        
        adjudicaciones_list.append(adjudicacion)

    return cabecera, adjudicaciones_list


def guardar_bd(todo_cabeceras, todo_adjudicaciones):
    conn = obtener_conexion()
    if not conn: return
    
    try:
        cursor = conn.cursor()
        
        # 1. Cabeceras (INSERT ... ON DUPLICATE KEY UPDATE para actualizar si ya existe)
        cabecera_sql = """
            INSERT INTO licitaciones_cabecera 
            (id_convocatoria, ocid, nomenclatura, descripcion, comprador, entidad_ruc, categoria, 
             tipo_procedimiento, monto_estimado, moneda, fecha_publicacion, fecha_adjudicacion, estado_proceso, origen_tipo,
             ubicacion_completa, departamento, provincia, distrito)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                estado_proceso = VALUES(estado_proceso),
                fecha_adjudicacion = VALUES(fecha_adjudicacion),
                monto_estimado = VALUES(monto_estimado),
                fecha_publicacion = COALESCE(VALUES(fecha_publicacion), fecha_publicacion)
        """
        
        cab_data = []
        for c in todo_cabeceras:
            # Formatear fechas a string limpias 'YYYY-MM-DD' si hay
            f_pub = str(c["fecha_publicacion"])[:10] if c["fecha_publicacion"] else None
            f_adj = str(c["fecha_adjudicacion"])[:10] if c["fecha_adjudicacion"] else None
            
            cab_data.append((
                c["id_convocatoria"], c["ocid"], c["nomenclatura"], c["descripcion"],
                c["comprador"], c["entidad_ruc"], c["categoria"], c["tipo_procedimiento"],
                c["monto_estimado"], c["moneda"], f_pub, f_adj, c["estado_proceso"], c["origen_tipo"],
                c["ubicacion_completa"], c["departamento"], c["provincia"], c["distrito"]
            ))
        
        try:
            cursor.executemany(cabecera_sql, cab_data)
        except Exception as batch_err:
            logging.warning(f"Error en batch cabeceras ({batch_err}), insertando fila por fila...")
            ok, fail = 0, 0
            for row in cab_data:
                try:
                    cursor.execute(cabecera_sql, row)
                    ok += 1
                except Exception:
                    fail += 1
            logging.info(f"   Fila por fila: {ok} ok, {fail} fallidas")
        
        # 2. Adjudicaciones (INSERT IGNORE / ON DUPLICATE) 
        adj_sql = """
            INSERT INTO licitaciones_adjudicaciones 
            (id_adjudicacion, id_contrato, id_convocatoria, ocid, ganador_nombre, ganador_ruc, 
             monto_adjudicado, fecha_adjudicacion, estado_item, monto_final, moneda, 
             fecha_fin_contrato, rucs_consorciados, nombres_consorciados, total_miembros,
             ubicacion_completa, departamento, provincia, distrito,
             url_pdf_contrato, url_pdf_cartafianza, url_pdf_consorcio)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
                id_contrato = VALUES(id_contrato),
                ganador_nombre = COALESCE(NULLIF(ganador_nombre, ''), VALUES(ganador_nombre)),
                estado_item = VALUES(estado_item),
                monto_final = VALUES(monto_final),
                url_pdf_contrato = COALESCE(VALUES(url_pdf_contrato), url_pdf_contrato),
                url_pdf_cartafianza = COALESCE(VALUES(url_pdf_cartafianza), url_pdf_cartafianza),
                url_pdf_consorcio = COALESCE(VALUES(url_pdf_consorcio), url_pdf_consorcio),
                entidad_financiera = COALESCE(entidad_financiera, VALUES(entidad_financiera))
        """
        
        adj_data = []
        for a in todo_adjudicaciones:
            f_adj2 = str(a["fecha_adjudicacion"])[:10] if a["fecha_adjudicacion"] else None
            f_fin = str(a["fecha_fin_contrato"])[:10] if a["fecha_fin_contrato"] else None
            
            adj_data.append((
                a["id_adjudicacion"], a["id_contrato"], a["id_convocatoria"], a["ocid"],
                a["ganador_nombre"], a["ganador_ruc"], a["monto_adjudicado"], f_adj2,
                a["estado_item"], a["monto_final"], a["moneda"], f_fin,
                a["rucs_consorciados"], a["nombres_consorciados"], a["total_miembros"],
                a["ubicacion_completa"], a["departamento"], a["provincia"], a["distrito"],
                a.get("url_pdf_contrato"), a.get("url_pdf_cartafianza"), a.get("url_pdf_consorcio")
            ))
        
        try:
            cursor.executemany(adj_sql, adj_data)
        except Exception as batch_err:
            logging.warning(f"Error en batch adjudicaciones ({batch_err}), insertando fila por fila...")
            ok, fail = 0, 0
            for row in adj_data:
                try:
                    cursor.execute(adj_sql, row)
                    ok += 1
                except Exception:
                    fail += 1
            logging.info(f"   Fila por fila: {ok} ok, {fail} fallidas")
        
        conn.commit()
        logging.info(f"   ✅ Commit exitoso: {len(cab_data)} cabeceras, {len(adj_data)} adjudicaciones")
    except Exception as e:
        logging.error(f"Error BATCH INSERT: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
    finally:
        conn.close()


def parse_and_insert(zip_path):
    logging.info(f"📁 Extrayendo archivo: {zip_path}")
    
    with zipfile.ZipFile(zip_path, 'r') as z:
        for filename in z.namelist():
            if filename.endswith(".json"):
                logging.info(f"   -> Leyendo subarchivo JSON {filename}")
                with z.open(filename) as f:
                    data = json.load(f)
                    records = data.get("records", [])
                    total = len(records)
                    logging.info(f"   -> Recibidos {total} records. Formateando...")
                    
                    batch_cabeceras = []
                    batch_adjudicaciones = []
                    
                    for i, rec in enumerate(records):
                        cab, adj_list = process_record(rec)
                        if cab:
                            batch_cabeceras.append(cab)
                            batch_adjudicaciones.extend(adj_list)
                            
                        # Chunk insert every 5000 records
                        if len(batch_cabeceras) >= 5000 or i == total - 1:
                            logging.info(f"   -> Guardando bloque...({len(batch_cabeceras)} cabeceras, {len(batch_adjudicaciones)} adjudicaciones)")
                            guardar_bd(batch_cabeceras, batch_adjudicaciones)
                            batch_cabeceras.clear()
                            batch_adjudicaciones.clear()

def main(zip_files=None):
    if not os.path.exists(data_dir):
        logging.error(f"La carpeta {data_dir} no existe.")
        return
    
    # Si se pasan ZIPs específicos (modo incremental), usar esos; si no, usar todos los ZIPs del directorio
    if zip_files is not None:
        archivos = [zf for zf in zip_files if os.path.exists(zf)]
        if not archivos:
            logging.warning("No hay archivos ZIP actualizados para procesar.")
            return
    else:
        archivos = glob.glob(os.path.join(data_dir, "*.zip"))
        if not archivos:
            logging.warning("No se encontraron archivos ZIP en la carpeta DATAJSON.")
            return
        
    logging.info(f"Se procesarán {len(archivos)} archivo(s) ZIP: {[os.path.basename(a) for a in archivos]}")
    
    for zf in archivos:
        parse_and_insert(zf)
        
    logging.info("🎉 Proceso OCDS completado con éxito.")

if __name__ == "__main__":
    main()

