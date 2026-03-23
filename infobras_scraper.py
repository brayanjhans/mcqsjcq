import requests
import json
import urllib.parse
from bs4 import BeautifulSoup
import re
import urllib3
import argparse
import sys

# Desactivar advertencias de SSL para Infobras
urllib3.disable_warnings()

# Configuración Global
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'es-PE,es;q=0.9,en-US;q=0.8,en;q=0.7',
}

def buscar_obra_id(cui=None, nombre=None):
    """
    Busca el ID interno (codigoObra) de una obra en Infobras.
    Prioriza el CUI, y usa el nombre como fallback.
    """
    # 1. Búsqueda por CUI (SNIP)
    if cui and str(cui).strip() != "" and str(cui) != "0000000":
        print(f"🔍 Buscando por CUI: {cui}...")
        params_json = json.dumps({"codSnip": str(cui)})
        params_encoded = urllib.parse.quote(params_json)
        url_search = f"https://infobras.contraloria.gob.pe/infobrasweb/Mapa/busqueda/obrasBasic?page=0&rowsPerPage=20&Parameters={params_encoded}"
        
        try:
            r = requests.post(url_search, headers=HEADERS, verify=False, timeout=15)
            r.raise_for_status()
            resultados = r.json().get('Result', [])
            if resultados:
                print(f"✅ Encontrado por CUI: {resultados[0].get('nombrObra', 'Sin nombre')}")
                return str(resultados[0].get('codigoObra'))
        except Exception as e:
            print(f"⚠️ Error en búsqueda por CUI: {e}")

    # 2. Fallback por Nombre
    if nombre and nombre.strip() != "":
        # Limpiar el nombre para mejorar la búsqueda
        termino = nombre.upper()
        prefixes = ["MEJORAMIENTO DE LA ", "CONSTRUCCION DE LA ", "CONSTRUCCION DEL ", "MEJORAMIENTO DEL ", "ADQUISICION DE "]
        for p in prefixes:
            if termino.startswith(p):
                termino = termino.replace(p, "")
                break
        
        # Tomar las primeras palabras significativas
        palabras = [w for w in termino.split() if len(w) > 3][:4]
        termino_busqueda = " ".join(palabras)
        
        if len(termino_busqueda) > 5:
            print(f"🔍 Buscando fallback por nombre: '{termino_busqueda}'...")
            payload = {"palabraClave": termino_busqueda}
            params_encoded = urllib.parse.quote(json.dumps(payload))
            url_search = f"https://infobras.contraloria.gob.pe/infobrasweb/Mapa/busqueda/obrasBasic?page=0&rowsPerPage=20&Parameters={params_encoded}"
            
            try:
                r = requests.post(url_search, headers=HEADERS, verify=False, timeout=15)
                r.raise_for_status()
                resultados = r.json().get('Result', [])
                if resultados:
                    print(f"✅ Encontrado por nombre: {resultados[0].get('nombrObra')}")
                    return str(resultados[0].get('codigoObra'))
            except Exception as e:
                print(f"⚠️ Error en búsqueda por nombre: {e}")
                
    return None

def extraer_resumen(obra_id):
    """Extrae los datos básicos del Resumen Ejecutivo."""
    url = f"https://infobras.contraloria.gob.pe/InfobrasWeb/Mapa/ResumenEjecutivo?ObraId={obra_id}"
    print(f"📄 Extrayendo resumen técnico...")
    try:
        r = requests.get(url, headers=HEADERS, verify=False, timeout=15)
        soup = BeautifulSoup(r.text, 'html.parser')
        datos = {}
        for row in soup.find_all('div', class_='row'):
            cols = row.find_all('div', class_='col-md-6')
            if not cols: cols = row.find_all('div', class_='col-6')
            if len(cols) == 2:
                key = cols[0].get_text(strip=True).replace(":", "")
                val = cols[1].get_text(strip=True)
                if key and val: datos[key] = val
        return datos
    except: return None

def extraer_documentos(obra_id):
    """Extrae enlaces a documentos de todas las pestañas relevantes."""
    pestañas = {
        "Ejecución": "DatosEjecucion",
        "Variaciones": "Variaciones",
        "Cierre": "DatosCierre",
        "Control": "ServiciosControl"
    }
    
    documentos = {}
    print(f"📂 Explorando pestañas de Infobras para documentos...")
    
    for nombre_pes, path in pestañas.items():
        url = f"https://infobras.contraloria.gob.pe/InfobrasWeb/Mapa/{path}?ObraId={obra_id}"
        try:
            r = requests.get(url, headers=HEADERS, verify=False, timeout=15)
            soup = BeautifulSoup(r.text, 'html.parser')
            for el in soup.find_all(['a', 'button']):
                href = el.get('href') or el.get('data-download-url')
                if href:
                    label = (el.get_text(strip=True) or el.get('data-nombre') or f"Doc_{nombre_pes}").strip()
                    if len(label) < 2: label = f"Archivo_{nombre_pes}"
                    
                    full_url = f"https://infobras.contraloria.gob.pe{href}" if href.startswith('/') else href
                    
                    # Filtrar solo archivos u hojas de datos
                    if any(x in href.lower() for x in ['pdf', 'viewpdf', 'spic', 'download']):
                        documentos[label] = full_url
        except: pass
    return documentos

def extraer_valorizaciones(obra_id):
    """Extrae el historial de valorizaciones (avances) mensuales."""
    url = f"https://infobras.contraloria.gob.pe/InfobrasWeb/Mapa/DatosEjecucion?ObraId={obra_id}"
    try:
        r = requests.get(url, headers=HEADERS, verify=False, timeout=15)
        match = re.search(r'var lAvances\s*=\s*(\[.*?\]);', r.text, re.DOTALL)
        if match:
            return json.loads(match.group(1).strip())
        return []
    except: return []

def principal():
    parser = argparse.ArgumentParser(description="Extractor de Datos de Infobras (Contraloría)")
    parser.add_argument("--cui", help="Código Único de Inversión (CUI) o SNIP")
    parser.add_argument("--nombre", help="Nombre parcial del proyecto (Fallback)")
    parser.add_argument("--detallado", action="store_true", help="Mostrar resumen y valorizaciones")
    
    args = parser.parse_args()
    
    if not args.cui and not args.nombre:
        parser.print_help()
        sys.exit(1)
        
    oid = buscar_obra_id(args.cui, args.nombre)
    
    if not oid:
        print("❌ No se encontró la obra en los registros públicos de Infobras.")
        return

    print(f"🚀 Obra detectada con ID Interno: {oid}")
    
    # 1. Documentos (Lo más importante para el usuario actualmente)
    docs = extraer_documentos(oid)
    if docs:
        print("\n--- 📑 DOCUMENTOS ENCONTRADOS ---")
        for k, v in docs.items():
            print(f"  • {k}: {v}")
    else:
        print("\n⚠️ No se localizaron documentos públicos en las pestañas principales.")

    # 2. Resumen (Opcional)
    if args.detallado:
        res = extraer_resumen(oid)
        if res:
            print("\n--- 📝 RESUMEN EJECUTIVO ---")
            for k, v in list(res.items())[:15]:
                print(f"  {k}: {v}")
        
        avances = extraer_valorizaciones(oid)
        if avances:
            print(f"\n--- 📈 HISTORIAL DE AVANCE ({len(avances)} meses) ---")
            ultimo = avances[-1]
            print(f"  Último reporte: {ultimo.get('Mes')} {ultimo.get('Anio')}")
            print(f"  Avance Físico Real: {ultimo.get('PorcRealFisico') or 0}%")
            print(f"  Monto Ejecutado: S/ {ultimo.get('RealFinanc') or 0}")

if __name__ == "__main__":
    principal()
