import sys
import os
import re
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

# ─── URLs APIs ────────────────────────────────────────────────────────────────
# API legacy SEACE (garantías, documentos adjuntos)
URL_API_CONTRATO  = "https://prod4.seace.gob.pe:9000/api/bus/contrato/idContrato/{}"
URL_API_CONSORCIO = "https://prod4.seace.gob.pe:9000/api/bus/contrato/consorcios/{}"
URL_DESCARGA_DOC  = "https://prod4.seace.gob.pe:9000/api/con/documentos/descargar/{}"

# API nueva OEC (ficha completa: consorcios + contrato)
# El id_contrato puede venir como   "1@2304069"  o solo  "2304069"
# La API acepta ambos formatos con el prefijo "1@"
URL_API_FICHA_OEC  = "https://eap.oece.gob.pe/perfilprov-bus/1.0/contratacion/{}/ficha"
URL_API_FICHA_PROV = "https://eap.oece.gob.pe/perfilprov-bus/1.0/ficha/{}"  # por RUC

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
}

# ─── Helpers ─────────────────────────────────────────────────────────────────
def obtener_conexion():
    return pymysql.connect(**db_config)

def normalizar_id_oec(id_contrato: str) -> str:
    """Convierte 'X@YYYYYYY' o 'YYYYYYY' al formato '1@YYYYYYY' que usa la API OEC."""
    raw = str(id_contrato).strip()
    if '@' in raw:
        return raw          # ya tiene prefijo (p.ej. "1@2304069")
    return f"1@{raw}"      # añadir prefijo estándar

def parsear_monto(texto: str):
    """
    Convierte 'S/. 1,019,499.35'  -> (1019499.35, 'PEN')
              'USD 1,200.00'       -> (1200.0,    'USD')
    """
    if not texto:
        return None, 'PEN'
    moneda = 'USD' if ('USD' in texto.upper() or '$' in texto) else 'PEN'
    # Quitar todo excepto digitos, punto y coma
    limpio = re.sub(r'[^\d.,]', '', texto)
    # El prefijo 'S/.' deja un punto inicial residual: '.1,019,499.35' -> '1,019,499.35'
    limpio = limpio.strip('.,').strip()
    if not limpio:
        return None, moneda
    # Formato peruano: coma=miles, punto=decimal -> '1,019,499.35'
    if ',' in limpio and '.' in limpio:
        limpio = limpio.replace(',', '')   # quitar separadores de miles
    elif ',' in limpio:
        partes = limpio.rsplit(',', 1)
        if len(partes[1]) <= 2:            # la coma es decimal
            limpio = partes[0].replace(',', '') + '.' + partes[1]
        else:
            limpio = limpio.replace(',', '')
    try:
        return float(limpio), moneda
    except Exception:
        return None, moneda


# Cache en memoria para no re-consultar el mismo RUC en una misma ejecución
_cache_prov = {}

def obtener_ficha_proveedor(ruc: str) -> dict:
    """
    Consulta https://eap.oece.gob.pe/perfilprov-bus/1.0/ficha/{RUC}
    y retorna un dict con telefono, email, domicilio, cmc, tipo_contribuyente,
    es_apto_contratar y especialidades.
    Retorna {} si falla o el RUC no existe.
    """
    ruc = str(ruc).strip()
    if not ruc or ruc in ('S/N', ''):
        return {}
    if ruc in _cache_prov:
        return _cache_prov[ruc]

    try:
        r = requests.get(URL_API_FICHA_PROV.format(ruc),
                         headers=HEADERS, verify=False, timeout=10)
        if r.status_code != 200:
            _cache_prov[ruc] = {}
            return {}
        data = r.json()
        if data.get('resultadoT01', {}).get('codigo') != '00':
            _cache_prov[ruc] = {}
            return {}

        prov = data.get('proveedorT01', {})

        # Teléfonos: lista → string separado por " | "
        telefonos = prov.get('telefonos') or []
        telefono  = ' | '.join(str(t) for t in telefonos if t)[:200] or None

        # Emails
        emails = prov.get('emails') or []
        email  = ' | '.join(str(e) for e in emails if e)[:500] or None

        # Domicilio: el JSON de ficha no trae texto plano, pero sí en el
        # campo ubigeoTexto / domicilioTexto según versión. Intentamos varios.
        domicilio = (prov.get('domicilioTexto')
                     or prov.get('ubigeoTexto')
                     or prov.get('desDomicilio')
                     or None)
        if domicilio:
            domicilio = str(domicilio)[:500]

        # CMC (capacidad máxima de contratación)
        cmc = prov.get('cmcTexto') or prov.get('cmc') or None
        if cmc:
            cmc = str(cmc)[:100]

        # Tipo de contribuyente: tipoPersoneria → texto legible
        TIPO_PERSONERIA = {
            1: 'PERSONA NATURAL',
            2: 'SOC.COM.RESPONS. LTDA',
            3: 'SOCIEDAD ANONIMA',
            4: 'EMPRESA INDIVIDUAL',
            5: 'ASOCIACION',
            6: 'COOPERATIVA',
            7: 'CONSORCIO',
        }
        tipo_p = prov.get('tipoPersoneria')
        tipo_contribuyente = TIPO_PERSONERIA.get(tipo_p, str(tipo_p) if tipo_p else None)

        es_apto = 1 if prov.get('esAptoContratar') else 0

        # Especialidades
        esps = prov.get('espProvT01s') or []
        especialidades = ' | '.join(
            f"{e.get('desCat','')}: {e.get('desEsp','')}" for e in esps if e.get('desEsp')
        )[:2000] or None

        resultado = {
            'telefono':          telefono,
            'email':             email,
            'domicilio':         domicilio,
            'cmc':               cmc,
            'tipo_contribuyente':tipo_contribuyente,
            'es_apto_contratar': es_apto,
            'especialidades':    especialidades,
        }
        _cache_prov[ruc] = resultado
        return resultado
    except Exception as e:
        logging.debug(f"Ficha proveedor RUC {ruc} fallo: {e}")
        _cache_prov[ruc] = {}
        return {}

def guardar_consorcio_oec(id_contrato, datos_contrato, miembros):
    """
    Inserta / actualiza los miembros del consorcio con los datos ricos
    de la API OEC y enriquece cada miembro con su ficha de proveedor (RUC).
    """
    conn = obtener_conexion()
    try:
        with conn.cursor() as cur:
            nombre_cons = datos_contrato.get('nombre_consorcio')
            entidad     = datos_contrato.get('entidad_contratante')
            categoria   = datos_contrato.get('categoria_objeto')
            descripcion = datos_contrato.get('descripcion_objeto')
            monto       = datos_contrato.get('monto_contrato_original')
            moneda      = datos_contrato.get('moneda_contrato', 'PEN')
            fecha_firma = datos_contrato.get('fecha_firma_contrato')
            fecha_fin   = datos_contrato.get('fecha_prevista_fin')
            url_doc     = datos_contrato.get('url_documento_contrato')

            for m in miembros:
                ruc    = str(m.get('numRuc') or m.get('codProv') or 'S/N')[:20]
                nombre = str(m.get('nomRzsProv') or m.get('nombre') or 'DESCONOCIDO')[:500]
                porc   = m.get('porcProvCont')
                try:
                    porc = float(porc) if porc is not None else None
                except Exception:
                    porc = None

                # -- Enriquecer con ficha de proveedor por RUC --
                fp = obtener_ficha_proveedor(ruc)
                telefono           = fp.get('telefono')
                email              = fp.get('email')
                domicilio          = fp.get('domicilio')
                cmc                = fp.get('cmc')
                tipo_contribuyente = fp.get('tipo_contribuyente')
                es_apto            = fp.get('es_apto_contratar')
                especialidades     = fp.get('especialidades')

                sql = """
                    INSERT INTO detalle_consorcios
                        (id_contrato, nombre_consorcio, entidad_contratante,
                         categoria_objeto, descripcion_objeto,
                         monto_contrato_original, moneda_contrato,
                         fecha_firma_contrato, fecha_prevista_fin,
                         url_documento_contrato, fuente_api,
                         ruc_miembro, nombre_miembro, porcentaje_participacion,
                         telefono_miembro, email_miembro, domicilio_miembro,
                         cmc_miembro, tipo_contribuyente, es_apto_contratar,
                         especialidades_miembro)
                    VALUES
                        (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'OEC_FICHA',
                         %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        nombre_consorcio         = VALUES(nombre_consorcio),
                        entidad_contratante      = VALUES(entidad_contratante),
                        categoria_objeto         = VALUES(categoria_objeto),
                        descripcion_objeto       = VALUES(descripcion_objeto),
                        monto_contrato_original  = VALUES(monto_contrato_original),
                        moneda_contrato          = VALUES(moneda_contrato),
                        fecha_firma_contrato     = VALUES(fecha_firma_contrato),
                        fecha_prevista_fin       = VALUES(fecha_prevista_fin),
                        url_documento_contrato   = COALESCE(url_documento_contrato, VALUES(url_documento_contrato)),
                        porcentaje_participacion = VALUES(porcentaje_participacion),
                        telefono_miembro         = COALESCE(VALUES(telefono_miembro), telefono_miembro),
                        email_miembro            = COALESCE(VALUES(email_miembro), email_miembro),
                        domicilio_miembro        = COALESCE(VALUES(domicilio_miembro), domicilio_miembro),
                        cmc_miembro              = COALESCE(VALUES(cmc_miembro), cmc_miembro),
                        tipo_contribuyente       = COALESCE(VALUES(tipo_contribuyente), tipo_contribuyente),
                        es_apto_contratar        = VALUES(es_apto_contratar),
                        especialidades_miembro   = COALESCE(VALUES(especialidades_miembro), especialidades_miembro),
                        fuente_api               = 'OEC_FICHA'
                """
                cur.execute(sql, (
                    id_contrato,
                    nombre_cons, entidad, categoria, descripcion,
                    monto, moneda, fecha_firma, fecha_fin, url_doc,
                    ruc, nombre, porc,
                    telefono, email, domicilio, cmc,
                    tipo_contribuyente, es_apto, especialidades
                ))
        conn.commit()
    except Exception as e:
        logging.error(f"Error guardando OEC consorcio {id_contrato}: {e}")
    finally:
        conn.close()



def guardar_consorcio_legacy(id_contrato, miembros):
    """Fallback: guarda desde la API antigua (sin %, sin fechas de contrato)."""
    conn = obtener_conexion()
    try:
        with conn.cursor() as cur:
            sql = """
                INSERT IGNORE INTO detalle_consorcios
                    (id_contrato, ruc_miembro, nombre_miembro, fuente_api)
                VALUES (%s, %s, %s, 'SEACE_LEGACY')
            """
            datos = []
            for m in miembros:
                ruc    = str(m.get('nroDocumento') or m.get('ruc') or 'S/N')[:20]
                nombre = str(m.get('nombreRazonSocial') or m.get('nombre') or 'DESCONOCIDO')[:500]
                datos.append((id_contrato, ruc, nombre))
            if datos:
                cur.executemany(sql, datos)
                conn.commit()
    except Exception as e:
        logging.error(f"Error guardando legacy consorcio {id_contrato}: {e}")
    finally:
        conn.close()


def guardar_actualizacion_contrato(id_adj, banco, tipo_garantia, url_c, url_cons, url_cf,
                                   monto_original=None, fecha_firma=None, fecha_fin=None):
    """Actualiza licitaciones_adjudicaciones con info del contrato."""
    conn = obtener_conexion()
    try:
        with conn.cursor() as cur:
            sql = """
                UPDATE licitaciones_adjudicaciones
                SET entidad_financiera  = COALESCE(NULLIF(entidad_financiera,''), %s),
                    tipo_garantia       = COALESCE(NULLIF(tipo_garantia,''), %s),
                    url_pdf_contrato    = COALESCE(NULLIF(url_pdf_contrato,''), %s),
                    url_pdf_consorcio   = COALESCE(NULLIF(url_pdf_consorcio,''), %s),
                    url_pdf_cartafianza = COALESCE(NULLIF(url_pdf_cartafianza,''), %s),
                    monto_final         = COALESCE(monto_final, %s),
                    fecha_adjudicacion  = COALESCE(fecha_adjudicacion, %s),
                    fecha_fin_contrato  = COALESCE(fecha_fin_contrato, %s)
                WHERE id_adjudicacion = %s
            """
            for intento in range(3):
                try:
                    cur.execute(sql, (banco, tipo_garantia, url_c, url_cons, url_cf,
                                      monto_original, fecha_firma, fecha_fin, id_adj))
                    conn.commit()
                    break
                except Exception as oe:
                    if "1213" in str(oe) or "Deadlock" in str(oe):
                        time.sleep(0.5)
                        continue
                    raise oe
    except Exception as e:
        logging.error(f"Error actualizando adj {id_adj}: {e}")
    finally:
        conn.close()

# ─── Procesamiento de un contrato ─────────────────────────────────────────────
def procesar_contrato(item):
    id_adj          = item['id_adjudicacion']
    id_contrato     = str(item['id_contrato']).strip()
    nombre_ganador  = str(item['ganador_nombre'] or "").upper()
    es_consorcio    = "CONSORCIO" in nombre_ganador

    res_banco        = None
    res_tipo_garantia= None
    url_contrato     = None
    url_consorcio    = None
    url_cf           = None
    monto_original   = None
    fecha_firma      = None
    fecha_fin        = None

    # ── 1. API OEC (ficha completa) ──────────────────────────────────────────
    id_oec = normalizar_id_oec(id_contrato)
    ficha_ok = False
    try:
        r = requests.get(URL_API_FICHA_OEC.format(id_oec),
                         headers=HEADERS, verify=False, timeout=15)
        if r.status_code == 200:
            data = r.json()
            resultado = data.get('resultadoT01', {})
            if resultado.get('codigo') == '00':
                ficha_ok = True
                df = data.get('datosContF01', {})

                # Datos generales del contrato
                monto_texto   = df.get('montoOrigenTexto', '')
                monto_original, moneda_cont = parsear_monto(monto_texto)
                fecha_firma = df.get('fecBaseCont')   # "2025-01-10"
                fecha_fin   = df.get('fecProgTerm')   # "2030-01-10"

                datos_contrato = {
                    'nombre_consorcio':      df.get('nomProvCons'),
                    'entidad_contratante':   df.get('nomEntCont'),
                    'categoria_objeto':      df.get('desCatObj2'),
                    'descripcion_objeto':    df.get('desContProv'),
                    'monto_contrato_original': monto_original,
                    'moneda_contrato':       moneda_cont,
                    'fecha_firma_contrato':  fecha_firma,
                    'fecha_prevista_fin':    fecha_fin,
                    'url_documento_contrato': None,
                }

                # URL del documento principal (primer doc tipo CONTRATO)
                for clase in data.get('docsContF01', {}).get('claseDocF01s', []):
                    for doc in clase.get('docT01s', []):
                        if not datos_contrato['url_documento_contrato']:
                            datos_contrato['url_documento_contrato'] = doc.get('urlDoc')
                            url_contrato = doc.get('urlDoc')

                # Miembros del consorcio (si aplica)
                miembros_oec = df.get('provContT01s', [])
                if es_consorcio and miembros_oec:
                    guardar_consorcio_oec(id_contrato, datos_contrato, miembros_oec)
                elif not es_consorcio and miembros_oec:
                    # A veces aunque no diga CONSORCIO en el nombre, hay más miembros
                    guardar_consorcio_oec(id_contrato, datos_contrato, miembros_oec)

    except Exception as e:
        logging.debug(f"API OEC falló para {id_oec}: {e}")

    # ── 2. API Legacy SEACE (garantías, PDF cartafianza) ────────────────────
    try:
        r = requests.get(URL_API_CONTRATO.format(id_contrato),
                         headers=HEADERS, verify=False, timeout=10)
        if r.status_code == 200:
            data = r.json()

            garantias = data.get('listaGarantiaContrato') or []
            emisores, tipos_garantia = set(), set()
            for g in garantias:
                banco = g.get('entidadEmisora')
                if banco:
                    emisores.add(banco.strip().upper().replace("BANCO", "").strip())
                tipo_gar = g.get('tipoGarantia') or g.get('claseGarantia')
                if tipo_gar:
                    tipos_garantia.add(tipo_gar.strip().upper())
                if not url_cf and g.get('idDocumento'):
                    url_cf = URL_DESCARGA_DOC.format(g['idDocumento'])

            if emisores:
                res_banco = " | ".join(sorted(emisores))
            if tipos_garantia:
                res_tipo_garantia = " | ".join(sorted(tipos_garantia))

            if not url_contrato:
                if data.get("idDocumento2"):
                    arch = str(data.get("archivoAdjunto2", "")).upper()
                    if "CONTRATO" in arch:
                        url_contrato = URL_DESCARGA_DOC.format(data["idDocumento2"])
                if not url_contrato and data.get("idDocumento"):
                    url_contrato = URL_DESCARGA_DOC.format(data["idDocumento"])

            if data.get("idDocumentoConsorcio"):
                url_consorcio = URL_DESCARGA_DOC.format(data["idDocumentoConsorcio"])

            # Fallback consorcio legacy si la API OEC no lo resolvió
            if es_consorcio and not ficha_ok:
                try:
                    r_cons = requests.get(URL_API_CONSORCIO.format(id_contrato),
                                          headers=HEADERS, verify=False, timeout=10)
                    if r_cons.status_code == 200:
                        miembros = r_cons.json()
                        if isinstance(miembros, list) and miembros:
                            guardar_consorcio_legacy(id_contrato, miembros)
                except Exception:
                    pass

    except Exception:
        pass

    return (id_adj, id_contrato,
            res_banco, res_tipo_garantia,
            url_contrato, url_consorcio, url_cf,
            monto_original, fecha_firma, fecha_fin)


# ─── Main ─────────────────────────────────────────────────────────────────────
def main(year=None):
    logging.info("Iniciando MOTOR SEACE + OEC - Garantias, Consorcios, Fechas Contrato")
    conn = obtener_conexion()

    with conn.cursor() as cursor:
        if year:
            logging.info(f"   Filtrando contratos del anio {year}...")
            sql = """
                SELECT a.id_adjudicacion, a.id_contrato, a.ganador_nombre
                FROM licitaciones_adjudicaciones a
                INNER JOIN licitaciones_cabecera l ON a.id_convocatoria = l.id_convocatoria
                WHERE a.id_contrato IS NOT NULL AND a.id_contrato != ''
                  AND l.fecha_publicacion BETWEEN %s AND %s
                  AND (
                      a.entidad_financiera IS NULL
                      OR (
                          a.ganador_nombre LIKE '%%CONSORCIO%%'
                          AND a.id_contrato NOT IN (SELECT DISTINCT id_contrato FROM detalle_consorcios)
                      )
                  )
            """
            cursor.execute(sql, (f"{year}-01-01", f"{year}-12-31"))
        else:
            sql = """
                SELECT a.id_adjudicacion, a.id_contrato, a.ganador_nombre
                FROM licitaciones_adjudicaciones a
                WHERE a.id_contrato IS NOT NULL AND a.id_contrato != ''
                  AND (
                      a.entidad_financiera IS NULL
                      OR (
                          a.ganador_nombre LIKE '%%CONSORCIO%%'
                          AND a.id_contrato NOT IN (SELECT DISTINCT id_contrato FROM detalle_consorcios)
                      )
                  )
            """
            cursor.execute(sql)
        pendientes = cursor.fetchall()

    conn.close()

    total = len(pendientes)
    logging.info(f"Encontrados {total} contratos para inspeccionar...")
    procesados = 0

    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {executor.submit(procesar_contrato, item): item for item in pendientes}
        for future in as_completed(futures):
            try:
                (id_adj, id_con, banco, tipo_gar,
                 url_c, url_cons, url_cf,
                 monto_orig, f_firma, f_fin) = future.result()

                guardar_actualizacion_contrato(
                    id_adj, banco, tipo_gar, url_c, url_cons, url_cf,
                    monto_original=monto_orig,
                    fecha_firma=f_firma,
                    fecha_fin=f_fin
                )
            except Exception as e:
                logging.error(f"Error en future: {e}")
            procesados += 1
            if procesados % 50 == 0:
                logging.info(f"   Analizados {procesados}/{total} contratos.")

    logging.info("Completado lote de contratos SEACE + OEC.")


if __name__ == "__main__":
    main()
