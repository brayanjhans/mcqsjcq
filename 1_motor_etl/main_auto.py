import subprocess
import sys
import os
import time
import smtplib
import logging
import re  # <--- Importamos Regex
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# --- CONFIGURACIÓN ---
script_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(script_dir)
load_dotenv(os.path.join(parent_dir, ".env"))

# Función de limpieza nuclear (Regex)
def sanitizar(texto):
    if not isinstance(texto, str): return str(texto)
    # Reemplaza \xa0 y otros espacios raros por espacio normal
    texto = re.sub(r'[\xa0\u200b\u202f\u205f]', ' ', texto)
    # Elimina cualquier cosa que no sea imprimible o utf-8 válido
    return texto.encode('utf-8', 'ignore').decode('utf-8')

# LIMPIEZA PREVENTIVA DE PIPELINE
    {"archivo": "descargador.py", "nombre": sanitizar("1. DESCARGA (SEACE)"), "critico": True},
    {"archivo": "cargador.py",    "nombre": sanitizar("2. CARGA (MySQL)"),    "critico": True},
    
    # --- Integration of MEF Daily Import (Full Mode) ---
    {"archivo": "../scripts/import_mef_csv.py", "nombre": "2.5 IMPORTACIÓN MEF (2025)", "args": ["--year", "2025", "--all-rows"], "critico": False},
    {"archivo": "../scripts/import_mef_csv.py", "nombre": "2.6 IMPORTACIÓN MEF (2026)", "args": ["--year", "2026", "--all-rows"], "critico": False},
    
    {"archivo": "spider_garantias.py", "nombre": sanitizar("3. ENRIQUECIMIENTO (Bancos)"), "critico": False},

    {"archivo": "etl_consorcios_ai.py", "nombre": "4. INTELIGENCIA ARTIFICIAL (Consorcios)", "critico": False}

# Configuración Email (Con limpieza)
SMTP_CFG = {
    'host': os.getenv("EMAIL_HOST", "smtp.gmail.com"),
    'port': int(os.getenv("EMAIL_PORT", 587)),
    'user': sanitizar(os.getenv("EMAIL_USER")),
    'pass': sanitizar(os.getenv("EMAIL_PASS")),
    'to':   sanitizar(os.getenv("EMAIL_TO"))
}

# Logging
if sys.platform.startswith('win'):
    try: 
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except: pass

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s', handlers=[logging.StreamHandler(sys.stdout)])

def ejecutar_script(info_script):
    ruta_script = os.path.join(script_dir, info_script["archivo"])
    nombre_mostrar = info_script["nombre"]
    
    print("\n" + "="*60)
    logging.info(f"🎬 EJECUTANDO: {nombre_mostrar}")
    print("="*60)

    if not os.path.exists(ruta_script):
        return False, "Archivo no encontrado", "File not found"

    inicio = time.time()
    try:
        cmd = [sys.executable, ruta_script]
        # Add arguments if present
        if "args" in info_script and isinstance(info_script["args"], list):
            cmd.extend(info_script["args"])

        resultado = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding='utf-8', 
            errors='replace' 
        )
        duracion = time.time() - inicio
        logs = resultado.stdout
        errores = resultado.stderr
        print(logs) 

        if resultado.returncode == 0:
            logging.info(f"✅ {nombre_mostrar} FINALIZADO (Tiempo: {duracion:.2f}s)")
            return True, logs, ""
        else:
            logging.error(f"❌ {nombre_mostrar} FALLÓ (Código: {resultado.returncode})")
            print(f"--- ERRORES CAPTURADOS ---\n{errores}")
            return False, logs, errores

    except Exception as e:
        logging.critical(f"☠️ Error ejecutando: {e}")
        return False, "", str(e)

def enviar_reporte(resultados, tiempo_total):
    if not SMTP_CFG['user'] or not SMTP_CFG['pass']:
        logging.warning("⚠️ Sin credenciales de correo.")
        return

    estado_global = "EXITOSO"
    for res in resultados:
        if not res['exito']: estado_global = "FALLO DETECTADO"

    # --- INTENTO 1: HTML BONITO ---
    try:
        filas_html = ""
        for res in resultados:
            nombre = sanitizar(res['nombre'])
            estado = "OK" if res['exito'] else "ERROR"
            color = "green" if res['exito'] else "red"
            
            # Limpieza agresiva del log
            log_limpio = sanitizar(res['log'])
            html_log = log_limpio.replace("\n", "<br>")[-2000:] 
            
            filas_html += f"""
            <div style="margin-bottom: 20px; border: 1px solid #ddd; padding: 10px;">
                <h3 style="color: {color};">{nombre} - {estado}</h3>
                <div style="background: #f4f4f4; padding: 10px; font-size: 11px; font-family: monospace;">
                    {html_log}
                </div>
            </div>
            """

        html_body = f"""
        <html><body>
            <h2>[ROBOT] Reporte SEACE: {estado_global}</h2>
            <p>Tiempo Total: {tiempo_total:.2f}s</p>
            {filas_html}
        </body></html>
        """
        
        enviar_email_final(estado_global, html_body, es_html=True)

    except Exception as e:
        logging.error(f"❌ Falló generación HTML ({e}). Intentando Texto Plano...")
        # --- INTENTO 2: TEXTO PLANO (FALLBACK) ---
        texto_plano = f"REPORTE {estado_global}\n\n"
        for res in resultados:
            texto_plano += f"{res['nombre']}: {'OK' if res['exito'] else 'ERROR'}\n"
        
        enviar_email_final(estado_global, texto_plano, es_html=False)

def enviar_email_final(estado, cuerpo, es_html=True):
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_CFG['user']
        msg['To'] = SMTP_CFG['to']
        msg['Subject'] = f"[{estado}] Reporte ETL - {datetime.now().strftime('%d/%m')}"
        
        # Forzamos codificación 'utf-8' explícitamente en el constructor
        tipo = 'html' if es_html else 'plain'
        msg.attach(MIMEText(cuerpo, tipo, 'utf-8'))

        server = smtplib.SMTP(SMTP_CFG['host'], SMTP_CFG['port'])
        server.starttls()
        server.login(SMTP_CFG['user'], SMTP_CFG['pass'])
        server.send_message(msg)
        server.quit()
        logging.info(f"📧 Correo ({tipo}) enviado EXITOSAMENTE.")
        
    except Exception as e:
        logging.error(f"❌ IMPOSIBLE ENVIAR CORREO: {e}")

def main():
    start_global = time.time()
    resultados = []
    abortar = False

    print(f"🤖 ORQUESTADOR V4.0 - {datetime.now().strftime('%H:%M:%S')}")

    for paso in PIPELINE:
        if abortar:
            resultados.append({"nombre": paso['nombre'], "exito": False, "log": "OMITIDO"})
            continue

        exito, log, err = ejecutar_script(paso)
        log_comb = log if exito else (log + "\nERR:\n" + err)
        
        resultados.append({"nombre": paso['nombre'], "exito": exito, "log": log_comb})

        if not exito and paso["critico"]:
            abortar = True

    tiempo_total = time.time() - start_global
    
    print("\n" + "="*60)
    enviar_reporte(resultados, tiempo_total)
    print("="*60)
    print("✨ CICLO FINALIZADO ✨")

if __name__ == "__main__":
    main()