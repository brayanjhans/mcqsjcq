import requests
import json
import time
from bs4 import BeautifulSoup
import re
import urllib3
import urllib.parse
from sqlalchemy.orm import Session
from sqlalchemy import text

urllib3.disable_warnings()

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'es-PE,es;q=0.9,en-US;q=0.8,en;q=0.7',
}

class InfobrasService:
    @staticmethod
    def get_obra_internal_id(cui: str, proyecto_nombre: str = None) -> str:
        """Busca el ID interno de la obra (ObraId) usando el CUI o el Nombre del Proyecto como fallback."""
        
        # 1. Intentar por CUI (Más preciso)
        if cui and cui.isdigit():
            params_json = '{"codSnip":"' + str(cui) + '"}'
            params_encoded = urllib.parse.quote(params_json)
            url_search = f"https://infobras.contraloria.gob.pe/infobrasweb/Mapa/busqueda/obrasBasic?page=0&rowsPerPage=20&Parameters={params_encoded}"
            
            # Búsqueda por CUI con reintentos
            for attempt in range(3):
                try:
                    response = requests.post(url_search, headers=HEADERS, verify=False, timeout=25)
                    data = response.json()
                    resultados = data.get('Result', [])
                    if resultados:
                        for res in resultados:
                            if res.get('codigoObra'):
                                return str(res.get('codigoObra'))
                    break # Si respondió bien aunque esté vacío, salimos de reintentos
                except Exception as e:
                    if attempt == 2: print(f"  ⚠️ Error de conexión Infobras (CUI): {e}")
                    time.sleep(1)

        # 2. Fallback por Nombre del Proyecto
        if proyecto_nombre:
            # Limpiar el nombre para mejorar el matching (quitar prefijos comunes)
            termino = proyecto_nombre.upper()
            # Ignorar si es claramente Bienes/Servicios no obras
            if any(x in termino for x in ["ADQUISICION DE LUMINARIA", "ADQUISICION DE VEHICULO", "SUMINISTRO DE"]):
                return None

            prefixes = ["MEJORAMIENTO DE LA ", "CONSTRUCCION DE LA ", "CONSTRUCCION DEL ", "MEJORAMIENTO DEL ", "ADQUISICION DE "]
            for p in prefixes:
                if termino.startswith(p):
                    termino = termino.replace(p, "")
                    break
            
            # Usar solo las primeras 4 palabras significativas para no saturar el buscador de Infobras
            palabras = [w for w in termino.split() if len(w) > 3][:4]
            termino_busqueda = " ".join(palabras)
            
            if len(termino_busqueda) > 5:
                # print(f"[INFOBRAS] Intentando fallback por nombre: '{termino_busqueda}'")
                payload = {"palabraClave": termino_busqueda}
                params_encoded = urllib.parse.quote(json.dumps(payload))
                url_search = f"https://infobras.contraloria.gob.pe/infobrasweb/Mapa/busqueda/obrasBasic?page=0&rowsPerPage=20&Parameters={params_encoded}"
                
                try:
                    response = requests.post(url_search, headers=HEADERS, verify=False, timeout=15)
                    data = response.json()
                    resultados = data.get('Result', [])
                    if resultados:
                        # Si solo hay un resultado, lo tomamos. Si hay varios, tomamos el que mas se parezca (o el primero por ahora)
                        for res in resultados:
                            if res.get('codigoObra'):
                                return str(res.get('codigoObra'))
                except Exception: pass
                
        return None

    @staticmethod
    def fetch_estado_resumen(obra_id: str) -> dict:
        """Extrae los detalles ejecutivos y situacionales de la obra."""
        url_resumen = f"https://infobras.contraloria.gob.pe/InfobrasWeb/Mapa/ResumenEjecutivo?ObraId={obra_id}"
        
        try:
            response = requests.get(url_resumen, headers=HEADERS, verify=False, timeout=15)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            datos = {
                "Estado": "No registrado",
                "Entidad": "No registrado",
                "Modalidad": "No registrado",
                "Contratista": "No registrado",
                "Contrato": "No registrado",
                "FechaContrato": "No registrado",
                "CostoViable": "No registrado",
                "CostoActualizado": "No registrado",
                "FechaInicio": "No registrado",
                "FechaFin": "No registrado",
                "EstadoSituacional": "No registrado",
                "DocumentoAprobacionUrl": "-"
            }
            
            def extrae_valor(texto_header):
                for header in soup.find_all('div', class_=re.compile(r'card-header|tit_seccion')):
                    texto_limpio = header.get_text(strip=True).lower()
                    if texto_header.lower() in texto_limpio:
                        body = header.find_next_sibling('div')
                        if body:
                            val = body.get_text(separator=' ', strip=True)
                            if val and "No existe registro" not in val and val != "?" and val != "-":
                                if val.endswith('?'):
                                    val = val[:-1].strip()
                                return val
                return "No registrado"

            datos["Estado"] = extrae_valor("Estado de ejecución")
            datos["Entidad"] = extrae_valor("Entidad")
            datos["Modalidad"] = extrae_valor("Modalidad de ejecución")
            datos["Contratista"] = extrae_valor("Contratista")
            datos["Contrato"] = extrae_valor("Contrato")
            datos["FechaContrato"] = extrae_valor("Fecha de contrato")
            datos["CostoViable"] = extrae_valor("Costo de inversión viable")
            datos["CostoActualizado"] = extrae_valor("Costo actualizado")
            datos["FechaInicio"] = extrae_valor("Fecha de inicio")
            datos["FechaFin"] = extrae_valor("Fecha de finalización")
            datos["EstadoSituacional"] = extrae_valor("Informe del Estado Situacional de la Obra")
            
            # Palabras clave para el documento de aprobación / resolución
            KEYWORDS_DOC = ['expediente', 'documento', 'resolucion', 'aprobacion', 'contrato', 'sustentatorio']

            for link in soup.find_all('a', href=True):
                href = link['href'].lower()
                text_link = link.get_text(strip=True).lower()
                if 'download' in href or '.pdf' in href or 'ViewPDF' in href:
                    if any(k in href for k in KEYWORDS_DOC) or any(k in text_link for k in KEYWORDS_DOC):
                        val_url = link['href']
                        if not val_url.startswith('http'):
                            val_url = f"https://infobras.contraloria.gob.pe{val_url}"
                        datos["DocumentoAprobacionUrl"] = val_url
                        break
                        
            if datos["DocumentoAprobacionUrl"] == "-":
                for script in soup.find_all('script'):
                    if script.string and 'filename:' in script.string and 'DescargarArchivoPDF' in script.string:
                        match = re.search(r'filename:\s*"([^"]+)"', script.string)
                        if match:
                            pdf_filename = match.group(1)
                            datos["DocumentoAprobacionUrl"] = f"https://infobras.contraloria.gob.pe/infobrasweb/Mapa/DownloadFile?filename={pdf_filename}&contentType=application/pdf&extension=.pdf"
                            break
                    
            return datos
        except Exception:
            return None

    @staticmethod
    def fetch_valorizaciones(obra_id: str) -> list:
        """Extrae el historial de valorizaciones mensuales."""
        url_datos = f"https://infobras.contraloria.gob.pe/InfobrasWeb/Mapa/DatosEjecucion?ObraId={obra_id}"
        try:
            response = requests.get(url_datos, headers=HEADERS, verify=False, timeout=15)
            match = re.search(r'var lAvances\s*=\s*(\[.*?\]);', response.text, re.DOTALL)
            if not match:
                return []
            json_str = match.group(1).strip()
            if json_str == "[]":
                return []
            datos_js = json.loads(json_str)
            valorizaciones = []
            for dato in datos_js:
                val = {
                    "Periodo": f"{dato.get('Mes', '')} {dato.get('Anio', '')}",
                    "AvanceFisicoReal": f"{dato.get('PorcRealFisico', 0)}%",
                    "AvanceFisicoProgramado": f"{dato.get('PorcProgramadoFisico', 0)}%",
                    "AvanceValorizadoProgramado": f"S/ {dato.get('ProgramadoFinanc', 0)}",
                    "AvanceValorizadoReal": f"S/ {dato.get('RealFinanc', 0)}",
                    "PorcentajeEjecucionFinanciera": f"{dato.get('PorcEjecFinanc', 0)}%",
                    "MontoEjecucionFinanciera": f"S/ {dato.get('MontoEjecFinanc', 0)}",
                    "Estado": str(dato.get('Estado') or 'No registrado'),
                    "Causal": str(dato.get('Causal') or ''),
                    "UrlImagen": ""
                }
                img_val = dato.get('lImgValorizacion', [])
                if img_val and isinstance(img_val, list) and len(img_val) > 0 and img_val[0].get('UrlImg'):
                    val["UrlImagen"] = f"https://infobras.contraloria.gob.pe/InfobrasWeb/{img_val[0].get('UrlImg')}"
                valorizaciones.append(val)
            return valorizaciones
        except Exception:
            return []

    @staticmethod
    def sync_infobras_for_cui(cui: str, db: Session) -> bool:
        """Sincroniza datos de Infobras a la BD usando CUI y Proyecto como criterios."""
        if not cui and proyecto_nombre:
            # Si no hay CUI, intentamos buscar solo por nombre
            pass
            
        # Obtener nombre del proyecto desde la cabecera para el fallback
        q_name = text("SELECT proyecto FROM licitaciones_cabecera WHERE cui = :cui LIMIT 1")
        row_name = db.execute(q_name, {"cui": cui}).fetchone()
        proyecto_nombre = row_name[0] if row_name else None

        obra_id = InfobrasService.get_obra_internal_id(cui, proyecto_nombre)
        if not obra_id:
            db.execute(text("""
                INSERT INTO infobras_obras (cui, obra_id_infobras, entidad, estado_ejecucion) 
                VALUES (:cui, 'NO_ENCONTRADO', 'El proyecto no registra datos públicos en Contraloría', 'Sin Datos')
                ON DUPLICATE KEY UPDATE last_updated = CURRENT_TIMESTAMP
            """), {"cui": cui})
            db.commit()
            return False
            
        resumen = InfobrasService.fetch_estado_resumen(obra_id)
        valorizaciones = InfobrasService.fetch_valorizaciones(obra_id)
        
        if not resumen:
            return False

        # --- Extracción de documentos adicionales ---
        docs_extra = {
            "acta_terreno": "-",
            "designacion_supervisor": "-",
            "cronograma": "-",
            "suspension_plazo": "-",
            "resolucion_contrato": "-",
            "informe_control": "-"
        }

        # 1. Pestaña de Ejecución (Acta Terreno, Cronograma, Supervisor)
        try:
            url_ejec = f"https://infobras.contraloria.gob.pe/InfobrasWeb/Mapa/DatosEjecucion?ObraId={obra_id}"
            resp_ejec = requests.get(url_ejec, headers=HEADERS, verify=False, timeout=15)
            soup_ejec = BeautifulSoup(resp_ejec.text, 'html.parser')
            for el in soup_ejec.find_all(['button', 'a']):
                url_doc = el.get('data-download-url') or el.get('href')
                if url_doc:
                    full_url = f"https://infobras.contraloria.gob.pe{url_doc}" if url_doc.startswith('/') else url_doc
                    name_doc = (el.get('data-nombre') or el.get_text(strip=True)).lower()
                    if 'acta' in name_doc or 'terreno' in name_doc: docs_extra["acta_terreno"] = full_url
                    elif 'cronograma' in name_doc: docs_extra["cronograma"] = full_url
                    elif 'supervi' in name_doc or 'designa' in name_doc: docs_extra["designacion_supervisor"] = full_url
        except: pass

        # 2. Pestaña de Variaciones (Suspensión)
        try:
            url_var = f"https://infobras.contraloria.gob.pe/InfobrasWeb/Mapa/Variaciones?ObraId={obra_id}"
            resp_var = requests.get(url_var, headers=HEADERS, verify=False, timeout=15)
            soup_var = BeautifulSoup(resp_var.text, 'html.parser')
            for el in soup_var.find_all(['button', 'a']):
                url_doc = el.get('data-download-url') or el.get('href')
                if url_doc and 'suspension' in (el.get('data-nombre') or el.get_text(strip=True)).lower():
                    docs_extra["suspension_plazo"] = f"https://infobras.contraloria.gob.pe{url_doc}" if url_doc.startswith('/') else url_doc
        except: pass

        # 3. Pestaña de Cierre (Resolución Contrato)
        try:
            url_cierre = f"https://infobras.contraloria.gob.pe/InfobrasWeb/Mapa/DatosCierre?ObraId={obra_id}"
            resp_cierre = requests.get(url_cierre, headers=HEADERS, verify=False, timeout=15)
            soup_cierre = BeautifulSoup(resp_cierre.text, 'html.parser')
            for el in soup_cierre.find_all(['button', 'a']):
                url_doc = el.get('data-download-url') or el.get('href')
                name_doc = (el.get('data-nombre') or el.get_text(strip=True)).lower()
                if url_doc and ('resolucion' in name_doc or 'contrato' in name_doc or 'cierre' in name_doc):
                    docs_extra["resolucion_contrato"] = f"https://infobras.contraloria.gob.pe{url_doc}" if url_doc.startswith('/') else url_doc
        except: pass

        # 4. Pestaña de Servicios de Control (Informes Reales)
        try:
            url_ctrl = f"https://infobras.contraloria.gob.pe/InfobrasWeb/Mapa/ServiciosControl?ObraId={obra_id}"
            resp_ctrl = requests.get(url_ctrl, headers=HEADERS, verify=False, timeout=15)
            soup_ctrl = BeautifulSoup(resp_ctrl.text, 'html.parser')
            # Buscamos enlaces a informes (usualmente ViewPDF o SPIC)
            for el in soup_ctrl.find_all('a', href=True):
                href = el['href'].lower()
                if 'viewpdf' in href or 'spic' in href:
                    docs_extra["informe_control"] = el['href']
                    break
        except: pass

        # --- Guardar en la BD ---
        q_obra = text("""
            INSERT INTO infobras_obras (
                cui, obra_id_infobras, entidad, estado_ejecucion, contratista, modalidad,
                contrato_desc, fecha_contrato, fecha_inicio, fecha_fin, costo_viable,
                costo_actualizado, alerta_situacional, pdf_resolucion,
                pdf_acta_terreno, pdf_designacion_supervisor, pdf_cronograma,
                pdf_suspension_plazo, pdf_resolucion_contrato, pdf_informe_control
            ) VALUES (
                :cui, :oid, :entidad, :estado, :contratista, :modalidad,
                :contrato, :f_contrato, :f_inicio, :f_fin, :c_viable,
                :c_actualizado, :alerta, :pdf,
                :acta, :supervisor, :crono, :suspension, :res_contrato, :inf_control
            ) ON DUPLICATE KEY UPDATE
                obra_id_infobras=VALUES(obra_id_infobras),
                entidad=VALUES(entidad),
                estado_ejecucion=VALUES(estado_ejecucion),
                contratista=VALUES(contratista),
                modalidad=VALUES(modalidad),
                contrato_desc=VALUES(contrato_desc),
                fecha_contrato=VALUES(fecha_contrato),
                fecha_inicio=VALUES(fecha_inicio),
                fecha_fin=VALUES(fecha_fin),
                costo_viable=VALUES(costo_viable),
                costo_actualizado=VALUES(costo_actualizado),
                alerta_situacional=VALUES(alerta_situacional),
                pdf_resolucion=VALUES(pdf_resolucion),
                pdf_acta_terreno=VALUES(pdf_acta_terreno),
                pdf_designacion_supervisor=VALUES(pdf_designacion_supervisor),
                pdf_cronograma=VALUES(pdf_cronograma),
                pdf_suspension_plazo=VALUES(pdf_suspension_plazo),
                pdf_resolucion_contrato=VALUES(pdf_resolucion_contrato),
                pdf_informe_control=VALUES(pdf_informe_control),
                last_updated=CURRENT_TIMESTAMP
        """)
        
        db.execute(q_obra, {
            "cui": cui,
            "oid": obra_id,
            "entidad": resumen["Entidad"][:255],
            "estado": resumen["Estado"][:100],
            "contratista": resumen["Contratista"][:255],
            "modalidad": resumen["Modalidad"][:100],
            "contrato": resumen["Contrato"][:255],
            "f_contrato": resumen["FechaContrato"][:50],
            "f_inicio": resumen["FechaInicio"][:50],
            "f_fin": resumen["FechaFin"][:50],
            "c_viable": resumen["CostoViable"][:50],
            "c_actualizado": resumen["CostoActualizado"][:50],
            "alerta": resumen["AlertaSituacional"] if "AlertaSituacional" in resumen else resumen.get("EstadoSituacional", "-"),
            "pdf": resumen["DocumentoAprobacionUrl"][:500],
            "acta": docs_extra["acta_terreno"][:500],
            "supervisor": docs_extra["designacion_supervisor"][:500],
            "crono": docs_extra["cronograma"][:500],
            "suspension": docs_extra["suspension_plazo"][:500],
            "res_contrato": docs_extra["resolucion_contrato"][:500],
            "inf_control": docs_extra["informe_control"][:500]
        })
        
        db.execute(text("DELETE FROM infobras_valorizaciones WHERE cui = :cui"), {"cui": cui})
        
        if valorizaciones:
            q_val = text("""
                INSERT INTO infobras_valorizaciones (
                    cui, periodo, avance_fisico_prog, avance_fisico_real,
                    avance_val_prog, avance_val_real, pct_ejecucion_fin,
                    monto_ejecucion_fin, estado, causal_paralizacion, url_imagen
                ) VALUES (
                    :cui, :periodo, :p_prog, :p_real,
                    :v_prog, :v_real, :pct_fin,
                    :m_fin, :estado, :causal, :url_img
                ) ON DUPLICATE KEY UPDATE
                    avance_fisico_prog=VALUES(avance_fisico_prog),
                    avance_fisico_real=VALUES(avance_fisico_real),
                    avance_val_prog=VALUES(avance_val_prog),
                    avance_val_real=VALUES(avance_val_real),
                    pct_ejecucion_fin=VALUES(pct_ejecucion_fin),
                    monto_ejecucion_fin=VALUES(monto_ejecucion_fin),
                    estado=VALUES(estado),
                    causal_paralizacion=VALUES(causal_paralizacion),
                    url_imagen=VALUES(url_imagen)
            """)
            for v in valorizaciones:
                db.execute(q_val, {
                    "cui": cui,
                    "periodo": v["Periodo"][:50],
                    "p_prog": v["AvanceFisicoProgramado"][:20],
                    "p_real": v["AvanceFisicoReal"][:20],
                    "v_prog": v["AvanceValorizadoProgramado"][:100],
                    "v_real": v["AvanceValorizadoReal"][:100],
                    "pct_fin": v["PorcentajeEjecucionFinanciera"][:20],
                    "m_fin": v["MontoEjecucionFinanciera"][:100],
                    "estado": v["Estado"][:100],
                    "causal": v["Causal"][:255],
                    "url_img": v["UrlImagen"][:500]
                })

        db.commit()
        return True

    @staticmethod
    def get_cached_infobras(cui: str, db: Session) -> dict:
        """Fetches from MySQL. Returns None if data is missing or out of date."""
        query = text("""
            SELECT 
                obra_id_infobras, entidad, estado_ejecucion, contratista,
                modalidad, contrato_desc, fecha_contrato, fecha_inicio,
                fecha_fin, costo_viable, costo_actualizado, alerta_situacional,
                pdf_resolucion, last_updated,
                pdf_acta_terreno, pdf_designacion_supervisor, pdf_cronograma,
                pdf_suspension_plazo, pdf_resolucion_contrato, pdf_informe_control
            FROM infobras_obras 
            WHERE cui = :cui
        """)
        row = db.execute(query, {"cui": cui}).fetchone()
        
        if not row:
            return None
            
        data = {
            "obra_id_infobras": row[0],
            "entidad": row[1],
            "estado_ejecucion": row[2],
            "contratista": row[3],
            "modalidad": row[4],
            "contrato_desc": row[5],
            "fecha_contrato": row[6],
            "fecha_inicio": row[7],
            "fecha_fin": row[8],
            "costo_viable": row[9],
            "costo_actualizado": row[10],
            "alerta_situacional": row[11],
            "pdf_resolucion": row[12],
            "last_updated": row[13].strftime("%Y-%m-%d %H:%M:%S") if row[13] else "",
            "pdf_acta_terreno": row[14],
            "pdf_designacion_supervisor": row[15],
            "pdf_cronograma": row[16],
            "pdf_suspension_plazo": row[17],
            "pdf_resolucion_contrato": row[18],
            "pdf_informe_control": row[19],
            "valorizaciones": []
        }
        
        if data["obra_id_infobras"] == 'NO_ENCONTRADO':
            return data
            
        # Get valorizaciones
        val_query = text("""
            SELECT 
                periodo, avance_fisico_prog, avance_fisico_real,
                avance_val_prog, avance_val_real, pct_ejecucion_fin,
                monto_ejecucion_fin, estado, causal_paralizacion, url_imagen
            FROM infobras_valorizaciones
            WHERE cui = :cui
        """)
        val_rows = db.execute(val_query, {"cui": cui}).fetchall()
        
        for v in val_rows:
            data["valorizaciones"].append({
                "periodo": v[0],
                "avance_fisico_prog": v[1],
                "avance_fisico_real": v[2],
                "avance_val_prog": v[3],
                "avance_val_real": v[4],
                "pct_ejecucion_fin": v[5],
                "monto_ejecucion_fin": v[6],
                "estado": v[7],
                "causal_paralizacion": v[8],
                "url_imagen": v[9]
            })
            
        return data
