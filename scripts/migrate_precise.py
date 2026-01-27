import paramiko
import subprocess
import os
import sys
import time

# --- CREDENTIALS (PRECISE) ---
# VPS SSH
VPS_HOST = "72.61.219.79"
VPS_SSH_USER = "root"
VPS_SSH_PASS = "Juegos1234567#"

# Local DB
LOCAL_DB_HOST = "localhost"
LOCAL_DB_USER = "root"
LOCAL_DB_PASS = "123456789"
LOCAL_DB_NAME = "mcqs-jcq"

# Remote DB (Target)
REMOTE_DB_NAME = "mcqs-jcq"
REMOTE_DB_USER = "mcqs-jcq"
REMOTE_DB_PASS = "mcqs-jcq"

# CONFIG
DUMP_FILE = "migration_dump.sql"
REMOTE_PATH = f"/root/{DUMP_FILE}"

def log(msg):
    print(f"[MIGRATION] {msg}")

def run_local(cmd):
    log(f"Local exec: {cmd}")
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if res.returncode != 0:
        log(f"Local Error: {res.stderr}")
        print("Standard Output:", res.stdout)
        sys.exit(1)
    return res.stdout

def main():
    log("Iniciando Migración Precisa...")

    # 1. Exportar Base de Datos Local
    # Usamos mysqldump de Laragon si existe, sino el del sistema
    dump_exe = r"C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqldump.exe"
    if not os.path.exists(dump_exe):
        dump_exe = "mysqldump"
        
    log(f"Step 1: Exportando DB local '{LOCAL_DB_NAME}'...")
    # --databases crea el "USE dbname" y "CREATE DATABASE", pero queremos el control.
    # Exportaremos solo los datos/tablas y lo importaremos en la BD destino específica.
    # --no-create-db evita 'CREATE DATABASE'
    cmd_export = (
        f'"{dump_exe}" -u {LOCAL_DB_USER} -p{LOCAL_DB_PASS} '
        f'{LOCAL_DB_NAME} --single-transaction --routines --triggers --events --hex-blob --default-character-set=utf8mb4 --result-file="{DUMP_FILE}"'
    )
    run_local(cmd_export)
    
    if not os.path.exists(DUMP_FILE):
        log("Error: El archivo sql no se generó.")
        sys.exit(1)
        
    size_mb = os.path.getsize(DUMP_FILE) / (1024*1024)
    log(f"Dump generado: {size_mb:.2f} MB")

    # 2. Conectar al VPS
    log("Step 2: Conectando via SSH al VPS...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(VPS_HOST, username=VPS_SSH_USER, password=VPS_SSH_PASS)
    except Exception as e:
        log(f"Error SSH: {e}")
        sys.exit(1)

    # 3. Subir archivo
    log("Step 3: Subiendo dump al VPS (SFTP)...")
    sftp = ssh.open_sftp()
    sftp.put(DUMP_FILE, REMOTE_PATH)
    sftp.close()

    # 4. Importar en la base de datos remota
    log(f"Step 4: Importando en DB remota '{REMOTE_DB_NAME}'...")
    
    # Comando de importación usando las credenciales ESPECIFICAS proporcionadas
    # Usamos redirection <
    import_cmd = f"mysql -u {REMOTE_DB_USER} -p'{REMOTE_DB_PASS}' {REMOTE_DB_NAME} < {REMOTE_PATH}"
    
    stdin, stdout, stderr = ssh.exec_command(import_cmd)
    exit_status = stdout.channel.recv_exit_status()
    
    out_str = stdout.read().decode()
    err_str = stderr.read().decode()
    
    if exit_status == 0:
        log("✅ IMPORTACIÓN EXITOSA.")
        log("Se usaron las credenciales de usuario 'mcqs-jcq' correctamente.")
    else:
        log("❌ Error en la importación.")
        log(f"STDOUT: {out_str}")
        log(f"STDERR: {err_str}")
        
        # Fallback opcional: Probar como root si falla el usuario especifico
        log("Intentando fallback como root local del VPS...")
        import_cmd_root = f"mysql {REMOTE_DB_NAME} < {REMOTE_PATH}"
        stdin, stdout, stderr = ssh.exec_command(import_cmd_root)
        if stdout.channel.recv_exit_status() == 0:
            log("✅ IMPORTACIÓN EXITOSA (como root).")
        else:
            log("❌ Falló también como root.")
            log(stderr.read().decode())

    # 5. Limpieza
    log("Limpiando archivo remoto...")
    ssh.exec_command(f"rm {REMOTE_PATH}")
    ssh.close()
    
    log("Proceso terminado.")

if __name__ == "__main__":
    main()
