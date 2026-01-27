import paramiko
import subprocess
import os
import sys
import gzip
import shutil
import time

# --- CREDENTIALS (PRECISE) ---
VPS_HOST = "72.61.219.79"
VPS_SSH_USER = "root"
VPS_SSH_PASS = "Juegos1234567#"

LOCAL_DB_HOST = "localhost"
LOCAL_DB_USER = "root"
LOCAL_DB_PASS = "123456789"
LOCAL_DB_NAME = "mcqs-jcq"

REMOTE_DB_NAME = "mcqs-jcq"
REMOTE_DB_USER = "mcqs-jcq"
REMOTE_DB_PASS = "mcqs-jcq"

DUMP_FILE = "migration_dump.sql"
GZ_FILE = "migration_dump.sql.gz"
REMOTE_PATH_GZ = f"/root/{GZ_FILE}"

def log(msg):
    print(f"[MIGRATION-V2] {msg}")

def run_local(cmd):
    log(f"Local exec: {cmd}")
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if res.returncode != 0:
        log(f"Local Error: {res.stderr}")
        sys.exit(1)
    return res.stdout

def compress_file(input_file, output_file):
    log(f"Compressing {input_file} to {output_file}...")
    with open(input_file, 'rb') as f_in:
        with gzip.open(output_file, 'wb') as f_out:
            shutil.copyfileobj(f_in, f_out)
    log("Compression done.")

def main():
    log("Iniciando Migración V2 (Comprimida + FK Fix)...")

    # 1. Export (if newer than existing) or just reuse if we trust it
    # We will regenerate to be safe and clean.
    dump_exe = r"C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqldump.exe"
    if not os.path.exists(dump_exe):
        dump_exe = "mysqldump"
        
    log(f"Step 1: Exportando DB local '{LOCAL_DB_NAME}'...")
    # Add --disable-keys --no-tablespaces --add-drop-table
    cmd_export = (
        f'"{dump_exe}" -u {LOCAL_DB_USER} -p{LOCAL_DB_PASS} '
        f'{LOCAL_DB_NAME} --single-transaction --hex-blob --default-character-set=utf8mb4 --result-file="{DUMP_FILE}"'
    )
    run_local(cmd_export)

    # 2. Compress
    compress_file(DUMP_FILE, GZ_FILE)
    
    size_mb = os.path.getsize(GZ_FILE) / (1024*1024)
    log(f"Archivo comprimido: {size_mb:.2f} MB")

    # 3. Connect SSH
    log("Step 3: Conectando SSH...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_SSH_USER, password=VPS_SSH_PASS)

    # 4. Upload
    log("Step 4: Subiendo archivo comprimido...")
    sftp = ssh.open_sftp()
    sftp.put(GZ_FILE, REMOTE_PATH_GZ)
    sftp.close()

    # 5. Import
    log("Step 5: Descomprimiendo e Importando...")
    
    # We use zcat (or gunzip -c) piped to mysql
    # We explicitly prepend SET FOREIGN_KEY_CHECKS=0
    
    # Check if gunzip exists remote, usually yes.
    # Command: "gzip -dc /root/migration_dump.sql.gz | mysql ..."
    
    import_cmd = (
        f"gzip -dc {REMOTE_PATH_GZ} | "
        f"mysql -u {REMOTE_DB_USER} -p'{REMOTE_DB_PASS}' "
        f"--init-command='SET FOREIGN_KEY_CHECKS=0;' "
        f"{REMOTE_DB_NAME}"
    )
    
    log(f"Ejecutando: {import_cmd}")
    stdin, stdout, stderr = ssh.exec_command(import_cmd)
    
    # Real-time output handling is hard with paramiko exec_command, we wait.
    exit_status = stdout.channel.recv_exit_status()
    
    if exit_status == 0:
        log("✅ MIGRACIÓN COMPLETADA EXITOSAMENTE.")
    else:
        log("❌ Error en importación.")
        log(stderr.read().decode())
        
    # 6. Cleanup
    log("Limpiando remoto...")
    ssh.exec_command(f"rm {REMOTE_PATH_GZ}")
    ssh.close()
    log("Fin.")

if __name__ == "__main__":
    main()
