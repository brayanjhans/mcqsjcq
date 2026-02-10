import mysql.connector
import requests
import google.generativeai as genai
import os
import sys
import json
import time
from dotenv import load_dotenv
from requests.packages.urllib3.exceptions import InsecureRequestWarning
import pypdf

# --- CONFIGURACIÓN ---
if sys.platform.startswith('win'):
    try: sys.stdout.reconfigure(encoding='utf-8')
    except: pass

requests.packages.urllib3.disable_warnings(InsecureRequestWarning)
script_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(script_dir)
load_dotenv(os.path.join(parent_dir, ".env"))

# Carpetas
CARPETA_EVIDENCIA = os.path.join(parent_dir, "evidencia_consorcios")
if not os.path.exists(CARPETA_EVIDENCIA): os.makedirs(CARPETA_EVIDENCIA)

# DB y API
DB_CONFIG = {
    'host': os.getenv("DB_HOST"), 'user': os.getenv("DB_USER"),
    'password': os.getenv("DB_PASS"), 'database': os.getenv("DB_NAME"), 'charset': 'utf8mb4'
}
API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    print("❌ Error Fatal: Configura GEMINI_API_KEY en tu .env")
    sys.exit()

genai.configure(api_key=API_KEY)

# URLs
URL_METADATA = "https://prod4.seace.gob.pe:9000/api/bus/contrato/idContrato/{}"
URL_DESCARGA = "https://prod4.seace.gob.pe:9000/api/con/documentos/descargar/{}"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}

def obtener_pendientes():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        # MODIFICADO: Ahora incluimos items que NO tienen id_contrato (ADJUDICADO)
        # y usamos id_adjudicacion como fallback
        sql = """
            SELECT 
                COALESCE(NULLIF(a.id_contrato, ''), a.id_adjudicacion) as id_vinculo,
                a.ganador_nombre 
            FROM Licitaciones_Adjudicaciones a
            LEFT JOIN Detalle_Consorcios d ON (
                d.id_contrato = a.id_contrato 
                OR d.id_contrato = a.id_adjudicacion
            )
            WHERE a.ganador_nombre LIKE '%CONSORCIO%' 
              AND d.id_contrato IS NULL
            LIMIT 100
        """
        cursor.execute(sql)
        data = cursor.fetchall()
        conn.close()
        return data
    except Exception as e:
        print(f"Error DB: {e}")
        return []

def guardar_en_bd(id_contrato, miembros):
    if not miembros: return
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        sql = """
            INSERT INTO Detalle_Consorcios (id_contrato, ruc_miembro, nombre_miembro, porcentaje_participacion)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE fecha_registro=NOW()
        """
        datos = []
        for m in miembros:
            ruc = m.get('ruc')
            if not ruc: ruc = "S/N"
            
            nombre = str(m.get('nombre', 'DESCONOCIDO')).upper().strip()
            part = m.get('participacion')
            if part == "NO_ESPECIFICADO" or part is None: part = 0.0
            
            # Limpieza de RUC
            ruc = str(ruc).replace("RUC", "").replace(":", "").strip()[:20]

            datos.append((id_contrato, ruc, nombre[:500], part))
            
        cursor.executemany(sql, datos)
        conn.commit()
        print(f"   💾 ¡ÉXITO! Guardadas {len(datos)} empresas.")
        conn.close()
    except Exception as e:
        print(f"   ❌ Error SQL: {e}")

def descargar_pdf_inteligente(id_contrato):
    try:
        # 1. Metadata
        r = requests.get(URL_METADATA.format(id_contrato), headers=HEADERS, verify=False, timeout=10)
        if r.status_code != 200: return None
        data = r.json()
        
        # 2. Búsqueda de ID (Prioridad al Anexo/Consorcio)
        id_doc = None
        if data.get("idDocumentoConsorcio"): id_doc = data.get("idDocumentoConsorcio")
        elif data.get("idDocumento2") and "CONTRATO" in str(data.get("archivoAdjunto2", "")).upper():
            id_doc = data.get("idDocumento2")
        elif data.get("idDocumento"): id_doc = data.get("idDocumento")
            
        if not id_doc: return None

        nombre_archivo = f"{id_contrato}_temp.pdf"
        ruta_final = os.path.join(CARPETA_EVIDENCIA, nombre_archivo)
        
        # 3. Descarga (Stream)
        with requests.get(URL_DESCARGA.format(id_doc), headers=HEADERS, stream=True, verify=False, timeout=60) as r_down:
            if r_down.status_code == 200:
                with open(ruta_final, 'wb') as f:
                    for chunk in r_down.iter_content(chunk_size=8192):
                        f.write(chunk)
                return ruta_final
        return None
    except: return None

def recortar_pdf(ruta_origen, max_paginas=12):
    """ Corta el PDF si es muy pesado para la IA """
    try:
        ruta_destino = ruta_origen.replace(".pdf", "_mini.pdf")
        reader = pypdf.PdfReader(ruta_origen)
        writer = pypdf.PdfWriter()
        
        if len(reader.pages) <= max_paginas:
            return ruta_origen, False

        print(f"   ✂️ Archivo pesado. Recortando primeras {max_paginas} páginas...")
        for i in range(max_paginas):
            writer.add_page(reader.pages[i])
            
        with open(ruta_destino, "wb") as f_out:
            writer.write(f_out)
        return ruta_destino, True
    except Exception as e:
        print(f"   ⚠️ Error recortando: {e}")
        return ruta_origen, False

def analizar_con_ia(ruta_pdf):
    archivo_a_subir = ruta_pdf
    es_recorte = False

    # 1. Verificar Peso
    peso_mb = os.path.getsize(ruta_pdf) / (1024 * 1024)
    if peso_mb > 25: 
        print(f"   ⚖️ Detectado archivo de {peso_mb:.2f} MB. Activando recorte...")
        archivo_a_subir, es_recorte = recortar_pdf(ruta_pdf)

    # 2. Intentos con Backoff
    intentos = 0
    while intentos < 3:
        try:
            print(f"   🤖 Enviando a Gemini 2.0 Flash (Intento {intentos+1})...")
            archivo = genai.upload_file(archivo_a_subir, mime_type='application/pdf')
            
            # Esperar procesamiento
            wait_count = 0
            while archivo.state.name == "PROCESSING":
                time.sleep(2)
                archivo = genai.get_file(archivo.name)
                wait_count += 1
                if wait_count > 45: raise Exception("Timeout Google Cloud")

            if archivo.state.name == "FAILED": 
                print("   ❌ Google marcó FAILED.")
                return None

            # Prompt
            model = genai.GenerativeModel('gemini-2.0-flash')
            prompt = """
            Eres un experto digitador de contratos públicos.
            Tarea: Extrae los miembros del CONSORCIO (las empresas privadas, no la entidad pública).
            
            Salida JSON estricta: 
            [{"ruc": "...", "nombre": "...", "participacion": 50.0}]
            
            Reglas: 
            - RUC: Solo números. Si no hay, null.
            - Participación: Número decimal.
            """
            
            res = model.generate_content([archivo, prompt])
            
            # Limpieza nube
            try: genai.delete_file(archivo.name)
            except: pass
            
            # Limpieza recorte local
            if es_recorte and os.path.exists(archivo_a_subir):
                try: os.remove(archivo_a_subir)
                except: pass

            texto = res.text.replace("```json", "").replace("```", "").strip()
            return json.loads(texto)

        except Exception as e:
            msg = str(e)
            if "429" in msg or "Resource exhausted" in msg:
                print(f"   🛑 Tráfico alto (429). Esperando 30s...")
                time.sleep(30)
                intentos += 1
            elif "400" in msg:
                 print("   ❌ Error 400 (Archivo corrupto/complejo).")
                 return None
            else:
                print(f"   ⚠️ Error IA: {e}")
                return None
    return None

def main():
    print("🚀 ETL CONSORCIOS CON IA (MODO MASIVO AUTOMÁTICO)")
    
    ciclo = 1
    while True:
        print(f"\n🔄 INICIANDO CICLO #{ciclo}")
        
        # 1. Pedir lote
        pendientes = obtener_pendientes()
        
        if not pendientes:
            print("\n🏁 ¡FELICIDADES! No quedan contratos pendientes.")
            print("   La base de datos está al día.")
            break 
            
        print(f"🎯 Procesando lote de {len(pendientes)} contratos...")
        
        # 2. Procesar lote
        for id_contrato, nombre_ganador in pendientes:
            print(f"\n🔍 Contrato: {id_contrato} ({nombre_ganador})")
            
            ruta_pdf = None
            try:
                ruta_pdf = descargar_pdf_inteligente(id_contrato)
                if not ruta_pdf:
                    print("   ⏩ Saltando (Sin PDF disponible).")
                    continue
                    
                datos = analizar_con_ia(ruta_pdf)
                
                if datos:
                    guardar_en_bd(id_contrato, datos)
                else:
                    print("   ⚠️ Sin datos extraídos.")

            except Exception as e:
                print(f"   ☠️ Error ciclo: {e}")

            finally:
                # 3. Limpieza Forzosa
                if ruta_pdf and os.path.exists(ruta_pdf):
                    try:
                        time.sleep(0.5) 
                        os.remove(ruta_pdf)
                        print("   🗑️ PDF eliminado.")
                    except: pass
            
            # Pausa táctica
            time.sleep(2)
        
        print(f"✅ CICLO #{ciclo} COMPLETADO. Descansando 5 segundos...")
        time.sleep(5)
        ciclo += 1

if __name__ == "__main__":
    main()