"""
Sync de 1 solo contrato (id_contrato = 2034905)
Usa los métodos de carga_masiva_oec para la BD local y
luego lo sincroniza al VPS.
"""
import sys
import paramiko
import pymysql
import pymysql.converters
import datetime

# Asegurar que se puedan importar modulos locales
sys.path.append('.')
from scripts.carga_masiva_oec import procesar

VPS_HOST = '72.61.219.79'
VPS_USER = 'root'
VPS_PASS = 'Contra159753#'
VPS_DB_USER = 'mcqs-jcq'
VPS_DB_PASS = 'mcqs-jcq'
VPS_DB_NAME = 'mcqs-jcq'

LOCAL_DB = {
    'host': 'localhost', 'user': 'root', 'password': '123456789',
    'db': 'mcqs-jcq', 'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

def val(v):
    if v is None:
        return 'NULL'
    if isinstance(v, bool):
        return '1' if v else '0'
    if isinstance(v, (int, float)):
        return str(v)
    if hasattr(v, 'quantize'):  # Decimal
        return str(v)
    if isinstance(v, (datetime.date, datetime.datetime)):
        return f"'{str(v)}'"
    return "'" + pymysql.converters.escape_string(str(v)) + "'"

def main():
    id_objetivo = "2034905"
    print(f"=== PASO 1: Descargando datos de SEACE OEC localmente ===")
    res = procesar(id_objetivo)
    print(f"Resultado procesar() local: {res}")
    
    print(f"\n=== PASO 2: Extrayendo registros de la BD local ===")
    conn = pymysql.connect(**LOCAL_DB)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM detalle_consorcios WHERE id_contrato = %s", (id_objetivo,))
            rows = cur.fetchall()
            
            if not rows:
                print("No se importó ninguna fila local, SEACE no devolvió consorciados para este contrato.")
                return
            
            print(f"Se obtuvieron {len(rows)} filas locales. Generando SQL...")
            
            sql_statements = []
            for r in rows:
                cols = [k for k in r.keys() if k != 'id'] # evitar la primary_key
                cols_str = ', '.join(f'`{c}`' for c in cols)
                vals_str = ', '.join(val(r[k]) for k in cols)
                
                # Para evitar duplicados en el VPS, usamos ON DUPLICATE KEY UPDATE o REPLACE.
                # Dado que ya tenemos una clave única, ON DUPLICATE KEY UPDATE es muy seguro:
                updates = ', '.join(f"`{c}`=VALUES(`{c}`)" for c in cols)
                sql = f"INSERT INTO detalle_consorcios ({cols_str}) VALUES ({vals_str}) ON DUPLICATE KEY UPDATE {updates};"
                sql_statements.append(sql)
                
    finally:
        conn.close()
        
    print(f"\n=== PASO 3: Ejecutando en VPS ===")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=15)
    
    # Escribir sql para enviar
    remote_sql_path = '/tmp/sync_one.sql'
    with open('sync_one.sql', 'w', encoding='utf-8') as f:
        f.write("\n".join(sql_statements))
        
    sftp = ssh.open_sftp()
    sftp.put('sync_one.sql', remote_sql_path)
    sftp.close()
    
    cmd = f'mysql --default-character-set=utf8mb4 -u {VPS_DB_USER} -p{VPS_DB_PASS} {VPS_DB_NAME} < {remote_sql_path}'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    exit_status = stdout.channel.recv_exit_status()
    err = stderr.read().decode().strip()
    
    if exit_status == 0:
        print(f"Sincronización a VPS exitosa! ({len(rows)} filas insertadas/actualizadas).")
    else:
        print(f"Error en VPS: {err}")
        
    ssh.close()
    
if __name__ == '__main__':
    main()
