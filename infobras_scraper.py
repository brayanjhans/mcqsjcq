import requests
import json
from bs4 import BeautifulSoup
import re
import urllib3

urllib3.disable_warnings()

# ==========================================
# EXTRACTOR DE DATOS - INFOBRAS (CONTRALORÍA)
# ==========================================

# Headers para simular ser un navegador humano y evitar bloqueos básicos
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'es-PE,es;q=0.9,en-US;q=0.8,en;q=0.7',
}

def buscar_obras_por_nombre(termino_busqueda):
    """
    Busca obras por nombre usando el endpoint de búsqueda avanzada para mayor precisión.
    """
    print(f"🔍 Buscando obras con la palabra clave: '{termino_busqueda}'...")
    import urllib.parse
    import json
    
    # El endpoint usa un JSON stringificado y codificado en la URL
    payload = {"palabraClave": str(termino_busqueda)}
    params_encoded = urllib.parse.quote(json.dumps(payload))
    
    url_search = f"https://infobras.contraloria.gob.pe/infobrasweb/Mapa/busqueda/obrasBasic?page=0&rowsPerPage=20&Parameters={params_encoded}"
    
    try:
        response = requests.post(url_search, headers=HEADERS, verify=False, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        resultados = data.get('Result', [])
        
        if not resultados:
            print("❌ No se encontraron obras con esa palabra clave.")
            return []
            
        print(f"✅ Se encontraron {len(resultados)} resultados. Mostrando los más relevantes...")
        
        # Formateamos la respuesta para que coincida con la estructura esperada
        obras_formateadas = []
        for res in resultados:
            obras_formateadas.append({
                'Codigo': res.get('codigoObra'), # Este es el ObraId interno
                'Descripcion': res.get('nombreObra', 'Sin nombre')
            })
            
        return obras_formateadas
        
    except Exception as e:
        print(f"⚠️ Error al buscar obras: {e}")
        return []

def buscar_obras_por_cui(cui):
    """
    Busca obras por Código Único de Inversión (CUI) o SNIP usando el endpoint de búsqueda avanzada.
    """
    print(f"🔍 Buscando obra con CUI/SNIP: '{cui}'...")
    import urllib.parse
    
    # El endpoint usa un JSON stringificado y codificado en la URL
    params_json = '{"codSnip":"' + str(cui) + '"}'
    params_encoded = urllib.parse.quote(params_json)
    
    url_search = f"https://infobras.contraloria.gob.pe/infobrasweb/Mapa/busqueda/obrasBasic?page=0&rowsPerPage=20&Parameters={params_encoded}"
    
    try:
        # Este endpoint específico usa POST
        response = requests.post(url_search, headers=HEADERS, verify=False, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        resultados = data.get('Result', [])
        
        if not resultados:
            print("❌ No se encontraron obras con ese CUI.")
            return []
            
        print(f"✅ Se encontraron {len(resultados)} resultados.")
        
        # Formateamos la respuesta para que coincida con la otra función
        obras_formateadas = []
        for res in resultados:
            obras_formateadas.append({
                'Codigo': res.get('codigoObra'), # Este es el ObraId interno
                'Descripcion': res.get('nombreObra', 'Sin nombre')
            })
            
        return obras_formateadas
        
    except Exception as e:
        print(f"⚠️ Error al buscar obras por CUI: {e}")
        return []

def obtener_resumen_y_estado(obra_id):
    """
    Extrae el 'Estado de la obra' y los Datos de Contrato/Actores (Inciso 1).
    """
    url_resumen = f"https://infobras.contraloria.gob.pe/InfobrasWeb/Mapa/ResumenEjecutivo?ObraId={obra_id}"
    
    try:
        response = requests.get(url_resumen, headers=HEADERS, verify=False, timeout=15)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        datos = {
            "Estado": "No encontrado",
            "Entidad": "No encontrado",
            "Modalidad": "No encontrado",
            "Contratista": "No encontrado",
            "Contrato": "No encontrado",
            "FechaContrato": "No encontrado"
        }
        
        def extrae_valor(texto_header):
            # Busqueda case-insensitive y sin requerir dos puntos (:) exactos
            for header in soup.find_all('div', class_=re.compile(r'card-header|tit_seccion')):
                texto_limpio = header.get_text(strip=True).lower()
                if texto_header.lower() in texto_limpio:
                    body = header.find_next_sibling('div')
                    if body:
                        val = body.get_text(separator=' ', strip=True)
                        # Validamos que no este vacio o indique que no existe
                        if val and "No existe registro" not in val and val != "?" and val != "-":
                            # Limpiamos los signos de interrogación finales que a veces tiene infobras
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
        
        # --- NUEVOS DATOS: Seccion 2 (Finanzas y Fechas) ---
        datos["CostoViable"] = extrae_valor("Costo de inversión viable")
        datos["CostoActualizado"] = extrae_valor("Costo actualizado")
        datos["FechaInicio"] = extrae_valor("Fecha de inicio")
        datos["FechaFin"] = extrae_valor("Fecha de finalización")
        
        # --- NUEVOS DATOS: Seccion 3 y 4 (Alertas y Documentos PDF) ---
        datos["EstadoSituacional"] = extrae_valor("Informe del Estado Situacional de la Obra")
        
        # 4. Extraer el enlace de Resolucion de Expediente Tecnico (PDF)
        datos["DocumentoAprobacionUrl"] = "-"
        
        # Metodo A: Buscar en enlaces directos
        for link in soup.find_all('a', href=True):
            if 'download' in link['href'].lower() or '.pdf' in link['href'].lower():
                if 'expediente' in link['href'].lower() or 'documento' in link['href'].lower():
                    datos["DocumentoAprobacionUrl"] = f"https://infobras.contraloria.gob.pe{link['href']}"
                    break
                    
        # Metodo B: Buscar en variables Javascript ocultas (DescargarArchivoPDF)
        if datos["DocumentoAprobacionUrl"] == "-":
            for script in soup.find_all('script'):
                if script.string and 'filename:' in script.string and 'DescargarArchivoPDF' in script.string:
                    match = re.search(r'filename:\s*"([^"]+)"', script.string)
                    if match:
                        pdf_filename = match.group(1)
                        if 'expediente' in pdf_filename.lower() or 'documento' in pdf_filename.lower():
                            datos["DocumentoAprobacionUrl"] = f"https://infobras.contraloria.gob.pe/infobrasweb/Mapa/DownloadFile?filename={pdf_filename}&contentType=application/pdf&extension=.pdf"
                            break
                
        return datos
        
    except Exception as e:
        print(f"⚠️ Error al extraer estado de Obra {obra_id}: {e}")
        return None

def obtener_valorizacion_financiera(obra_id):
    """
    Extrae los datos de 'Valorización' leyendo el JSON inyectado en el Javascript.
    """
    url_datos = f"https://infobras.contraloria.gob.pe/InfobrasWeb/Mapa/DatosEjecucion?ObraId={obra_id}"
    
    try:
        response = requests.get(url_datos, headers=HEADERS, verify=False, timeout=15)
        
        # En InfoObras, los datos de ejecución financiera se cargan mediante una variable JS: var lAvances = [...]
        match = re.search(r'var lAvances\s*=\s*(\[.*?\]);', response.text, re.DOTALL)
        
        if not match:
            print("⚠️ No se encontró la variable de avances (lAvances) en la página.")
            return []
            
        json_str = match.group(1).strip()
        
        # Verificar si la lista está vacía
        if json_str == "[]":
            return []
            
        datos_js = json.loads(json_str)
        
        datos_valorizacion = []
        for dato in datos_js:
            val = {
                "Periodo": f"{dato.get('Mes', '')} {dato.get('Anio', '')}",
                "AvanceFisicoReal": f"{dato.get('PorcRealFisico', 0)}%",
                "AvanceFisicoProgramado": f"{dato.get('PorcProgramadoFisico', 0)}%",
                "AvanceValorizadoProgramado": f"S/ {dato.get('ProgramadoFinanc', 0)}",
                "AvanceValorizadoReal": f"S/ {dato.get('RealFinanc', 0)}",
                "PorcentajeEjecucionFinanciera": f"{dato.get('PorcEjecFinanc', 0)}%",
                "MontoEjecucionFinanciera": f"S/ {dato.get('MontoEjecFinanc', 0)}",
                "Estado": dato.get('Estado', 'No registrado'),
                "TipoParalizacion": dato.get('TipoParalizacion', None),
                "FechaParalizacion": dato.get('FechaParalizacion', None),
                "Causal": dato.get('Causal', None),
                "ComentarioFisico": dato.get('ComentarioFisico', None),
                "UrlImagen": None
            }
            
            # Obtener enlace a imagen o documento si lo hay
            img_val = dato.get('lImgValorizacion', [])
            if img_val and len(img_val) > 0 and img_val[0].get('UrlImg'):
                val["UrlImagen"] = f"https://infobras.contraloria.gob.pe/InfobrasWeb/{img_val[0].get('UrlImg')}"
                
            datos_valorizacion.append(val)
            
        return datos_valorizacion

    except Exception as e:
        print(f"⚠️ Error al extraer valorización de Obra {obra_id}: {e}")
        return []

if __name__ == "__main__":
    print("-" * 50)
    print("INICIANDO EXTRACCIÓN DE INFOOBRAS")
    print("-" * 50)
    
    # 1. Elegir método de búsqueda
    print("Opciones de búsqueda:")
    print("1. Por Nombre de la obra")
    print("2. Por Código Único de Inversión (CUI / SNIP)")
    opcion = input("Elige una opción (1 o 2): ")
    
    obras_encontradas = []
    
    if opcion == '1':
        termino = input("Ingresa una palabra clave (ej. colegio, puente): ").strip()
        obras_encontradas = buscar_obras_por_nombre(termino)
    elif opcion == '2':
        cui = input("Ingresa el Código Único de Inversión (CUI): ").strip()
        obras_encontradas = buscar_obras_por_cui(cui)
    else:
        print("Opción no válida.")
    
    # 2. Buscamos la primera obra que tenga un ID válido
    if obras_encontradas:
        obra_valida = None
        for obra in obras_encontradas:
            if obra.get('Codigo'):
                obra_valida = obra
                break
                
        if obra_valida:
            obra_id = obra_valida.get('Codigo')
            nombre_obra = obra_valida.get('Descripcion') or 'Sin nombre'
            
            print(f"\nAnalizando Obra ID: {obra_id} -> {str(nombre_obra)[:60]}...")
            
            # 3. Extraer Estado y Datos Básicos
            datos_obra = obtener_resumen_y_estado(obra_id)
            if datos_obra:
                print(f"📌 ESTADO ACTUAL DE EJECUCIÓN: {datos_obra['Estado']}")
                
                print("\n--- 1. DATOS DEL CONTRATO Y ACTORES ---")
                print(f"🏛️  Entidad: {datos_obra['Entidad']}")
                print(f"📋 Modalidad: {datos_obra['Modalidad']}")
                print(f"👷 Contratista: {datos_obra['Contratista']}")
                print(f"📝 Contrato: {datos_obra['Contrato']} | 📅 Fecha: {datos_obra['FechaContrato']}")

                print("\n--- 2. DATOS FINANCIEROS Y CRONOGRAMA ---")
                print(f"💰 Costo de Inversión Viable: {datos_obra['CostoViable']}")
                print(f"📈 Costo Actualizado: {datos_obra['CostoActualizado']}")
                print(f"🗓️  Fecha de Inicio: {datos_obra['FechaInicio']}")
                print(f"🏁 Fecha de Finalización: {datos_obra['FechaFin']}")

                print("\n--- 3. ALERTAS Y DOCUMENTOS LEGALES ---")
                
                # Alerta de Estado Situacional
                if datos_obra['EstadoSituacional'] != "No registrado":
                    print(f"⚠️  ALERTA CRÍTICA: Presenta Informe de Estado Situacional ({datos_obra['EstadoSituacional']})")
                else:
                    print("✅ Informe Situacional: Limpio (Sin reportes críticos)")
                    
                # Enlace a PDF de Resolución
                if datos_obra['DocumentoAprobacionUrl'] != "-":
                    print(f"📄 Resolución (PDF): [Enlace Encontrado]")
                    print(f"   ↳ {datos_obra['DocumentoAprobacionUrl']}")
                else:
                    print("📄 Resolución (PDF): No disponible públicamente")

            else:
                print("⚠️  No se pudieron obtener los datos del resumen de la obra (posible error de conexión o estructura HTML diferente).")

            # 4. Extraer Valorizaciones (siempre se intenta si tenemos obra_id válido)
            print(f"💰 Extrayendo datos de valorización...")
            valorizaciones = obtener_valorizacion_financiera(obra_id)
            
            if valorizaciones:
                print(f"\nTODAS LAS VALORIZACIONES REPORTADAS ({len(valorizaciones)}):")
                # Mostrar todos los meses reportados
                for val in valorizaciones:
                    estado_extra = ""
                    if val['Estado'] == 'Paralizado':
                       estado_extra = f" | 🛑 CAUSAL({val['Causal']})" 
                    
                    doc_link = f" | 📎 Doc: {val['UrlImagen']}" if val['UrlImagen'] else ""
                    
                    print(f" - Mes/Año: {val['Periodo']} | Fis. Prog: {val['AvanceFisicoProgramado']} | Fis. Real: {val['AvanceFisicoReal']} | Valorizado Prog: {val['AvanceValorizadoProgramado']} | Valorizado Real: {val['AvanceValorizadoReal']} | % Ejec Financiera: {val['PorcentajeEjecucionFinanciera']} | Monto Ejecución: {val['MontoEjecucionFinanciera']} | Est: {val['Estado']}{estado_extra}{doc_link}")
            else:
                print(" - No se encontraron registros de valorización pública en formato tabla para esta obra.")
        else:
            print("❌ No se encontró un ID de obra válido en los resultados.")
            
    print("-" * 50)
    print("PROCESO TERMINADO")
