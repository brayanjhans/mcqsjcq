import paramiko
import pymysql
import pymysql.converters
import datetime
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

VPS_HOST = '72.61.219.79'
VPS_SSH_USER = 'root'
VPS_SSH_PASS = 'Contra159753#'
VPS_DB_USER = 'mcqs-jcq'
VPS_DB_PASS = 'mcqs-jcq'
VPS_DB_NAME = 'mcqs-jcq'

LOCAL_DB = {
    'host': 'localhost', 'user': 'root', 'password': '123456789',
    'db': 'mcqs-jcq', 'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

REMOTE_SQL = '/tmp/vps_insert_clean.sql'
LOG_FILE = '/tmp/mysql_clean_import.log'

def val(v):
    """Convierte un valor Python a SQL seguro."""
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


def generate_insert_sql(filepath):
    logging.info("Conectando a DB local...")
    conn = pymysql.connect(**LOCAL_DB)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) as c FROM detalle_consorcios")
            total = cur.fetchone()['c']
            logging.info(f"Total de filas locales: {total}")

            cur.execute("SELECT * FROM detalle_consorcios")
            
            written = 0
            with open(filepath, 'w', encoding='utf-8') as f:
                # Header para importacion masiva rapida
                f.write("SET NAMES utf8mb4;\n")
                f.write("SET FOREIGN_KEY_CHECKS = 0;\n")
                f.write("SET UNIQUE_CHECKS = 0;\n")
                f.write("SET AUTOCOMMIT = 0;\n\n")

                while True:
                    rows = cur.fetchmany(2000)
                    if not rows:
                        break
                    
                    for r in rows:
                        # Obtener columnas dinamicamente (sin 'id' para evitar conflictos)
                        cols = [k for k in r.keys() if k != 'id']
                        vals = [val(r[k]) for k in cols]
                        col_str = ', '.join(f'`{c}`' for c in cols)
                        val_str = ', '.join(vals)
                        f.write(f"INSERT INTO detalle_consorcios ({col_str}) VALUES ({val_str});\n")
                    
                    written += len(rows)
                    if written % 20000 == 0:
                        f.write("COMMIT;\n")  # Commit cada 20k filas
                        logging.info(f"  {written}/{total} filas escritas...")
                
                f.write("\nCOMMIT;\n")
                f.write("SET FOREIGN_KEY_CHECKS = 1;\n")
                f.write("SET UNIQUE_CHECKS = 1;\n")
            
            logging.info(f"SQL generado: {filepath} ({written} filas)")
            return written
    finally:
        conn.close()


def deploy_to_vps(local_file, remote_file):
    logging.info("Conectando al VPS via SSH...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_SSH_USER, password=VPS_SSH_PASS, timeout=30)
    
    try:
        # 1. Matar procesos mysql activos
        logging.info("Paso 1: Matando procesos mysql activos...")
        ssh.exec_command('pkill -f "mysql --default-character" 2>/dev/null; sleep 2')
        
        # 2. TRUNCATE tabla
        logging.info("Paso 2: Limpiando tabla detalle_consorcios en VPS...")
        stdin, stdout, stderr = ssh.exec_command(
            f'mysql -u {VPS_DB_USER} -p{VPS_DB_PASS} {VPS_DB_NAME} '
            f'-e "TRUNCATE TABLE detalle_consorcios"'
        )
        stdout.channel.recv_exit_status()
        err = stderr.read().decode().strip()
        if err and 'Warning' not in err:
            logging.error(f"Error en TRUNCATE: {err}")
            return
        logging.info("  Tabla limpiada OK")
        
        # 3. Subir archivo SQL
        logging.info(f"Paso 3: Subiendo {local_file} al VPS...")
        sftp = ssh.open_sftp()
        sftp.put(local_file, remote_file)
        sftp.close()
        logging.info("  Subida completada")
        
        # 4. Lanzar importacion en background
        logging.info("Paso 4: Lanzando importacion en background...")
        import_cmd = (
            f'nohup sh -c "mysql --default-character-set=utf8mb4 '
            f'-u {VPS_DB_USER} -p{VPS_DB_PASS} {VPS_DB_NAME} < {remote_file} '
            f'> {LOG_FILE} 2>&1; echo IMPORT_DONE:$? >> {LOG_FILE}" > /dev/null 2>&1 &'
        )
        ssh.exec_command(import_cmd)
        import time; time.sleep(3)
        
        # Verificar proceso
        stdin, stdout, stderr = ssh.exec_command('pgrep -a mysql | grep -v mysqld | grep -v grep')
        proc = stdout.read().decode().strip()
        logging.info(f"  Proceso activo: {proc or 'Iniciandose...'}")
        
        # Conteo inicial
        stdin, stdout, stderr = ssh.exec_command(
            f'mysql -u {VPS_DB_USER} -p{VPS_DB_PASS} {VPS_DB_NAME} -N '
            f'-e "SELECT COUNT(*) FROM detalle_consorcios"'
        )
        count = stdout.read().decode().strip()
        logging.info(f"  Filas en VPS ahora: {count}")
        logging.info(f"¡Importacion lanzada! Monitorea con: py scratch\\monitor_vps.py")
        
    finally:
        ssh.close()


if __name__ == '__main__':
    LOCAL_FILE = 'vps_insert_clean.sql'
    
    # Generar el SQL
    total = generate_insert_sql(LOCAL_FILE)
    logging.info(f"Generados {total} registros en {LOCAL_FILE}")
    
    # Desplegar al VPS
    deploy_to_vps(LOCAL_FILE, REMOTE_SQL)
