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
FIXED_FILE = "migration_dump_fixed.sql"
GZ_FILE = "migration_dump_fixed.sql.gz"
REMOTE_PATH_GZ = f"/root/{GZ_FILE}"

def log(msg):
    print(f"[MIGRATION-V3] {msg}")

def run_local(cmd):
    log(f"Local exec: {cmd}")
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if res.returncode != 0:
        log(f"Local Error: {res.stderr}")
        sys.exit(1)
    return res.stdout

def fix_dump_file():
    log("Analizando y reparando SQL...")
    
    with open(DUMP_FILE, 'r', encoding='utf-8') as f_in, \
         open(FIXED_FILE, 'w', encoding='utf-8') as f_out:
             
        in_table_def = False
        table_name = ""
        buffer = []
        has_pk = False
        
        for line in f_in:
            if line.startswith("CREATE TABLE"):
                in_table_def = True
                if "`licitaciones_cabecera`" in line and "backup" not in line:
                    table_name = "licitaciones_cabecera"
                    print(f"Detectada tabla: {table_name}")
                else:
                    table_name = "other"
                buffer = [line]
                has_pk = False
                continue
                
            if in_table_def:
                buffer.append(line)
                if "PRIMARY KEY" in line:
                    has_pk = True
                    
                if line.strip().startswith(") ENGINE="):
                    # End of table definition
                    in_table_def = False
                    
                    if table_name == "licitaciones_cabecera" and not has_pk:
                        log(f"⚠️ {table_name}: NO TIENE PRIMARY KEY. Agregando...")
                        # We need to insert the PK before the closing parenthesis
                        # The last line is usually ") ENGINE=..."
                        last_line = buffer.pop() # remove ) ENGINE=...
                        
                        # Check if the previous line has a comma
                        prev_line = buffer[-1].rstrip()
                        if not prev_line.endswith(","):
                            buffer[-1] = prev_line + ",\n"
                            
                        # Add PK
                        buffer.append("  PRIMARY KEY (`id_convocatoria`)\n")
                        buffer.append(last_line) # restore closing
                        
                    # Write buffer to file
                    for l in buffer:
                        f_out.write(l)
                    buffer = []
            else:
                f_out.write(line)
                
    log("Reparación finalizada.")

def main():
    log("Iniciando Migración V3 (Fix PK + Comprimida)...")

    # 1. Export
    dump_exe = r"C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqldump.exe"
    if not os.path.exists(dump_exe):
        dump_exe = "mysqldump"
        
    log(f"Step 1: Exportando DB local '{LOCAL_DB_NAME}'...")
    cmd_export = (
        f'"{dump_exe}" -u {LOCAL_DB_USER} -p{LOCAL_DB_PASS} '
        f'{LOCAL_DB_NAME} --single-transaction --hex-blob --default-character-set=utf8mb4 --result-file="{DUMP_FILE}"'
    )
    run_local(cmd_export)

    # 2. Fix Dump
    fix_dump_file()

    # 3. Compress Fixed File
    log(f"Comprimiendo {FIXED_FILE}...")
    with open(FIXED_FILE, 'rb') as f_in:
        with gzip.open(GZ_FILE, 'wb') as f_out:
            shutil.copyfileobj(f_in, f_out)
    
    size_mb = os.path.getsize(GZ_FILE) / (1024*1024)
    log(f"Archivo final: {size_mb:.2f} MB")

    # 4. Connect SSH
    log("Step 2: Conectando SSH...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_SSH_USER, password=VPS_SSH_PASS)

    # 5. Upload
    log("Step 3: Subiendo archivo...")
    sftp = ssh.open_sftp()
    sftp.put(GZ_FILE, REMOTE_PATH_GZ)
    sftp.close()

    # 6. Import
    log("Step 4: Importando...")
    import_cmd = (
        f"gzip -dc {REMOTE_PATH_GZ} | "
        f"mysql -u {REMOTE_DB_USER} -p'{REMOTE_DB_PASS}' "
        f"--init-command='SET FOREIGN_KEY_CHECKS=0;' "
        f"{REMOTE_DB_NAME}"
    )
    
    log(f"Ejecutando: {import_cmd}")
    stdin, stdout, stderr = ssh.exec_command(import_cmd)
    
    exit_status = stdout.channel.recv_exit_status()
    
    if exit_status == 0:
        log("✅ MIGRACIÓN V3 EXITOSA (PK Reparada).")
    else:
        log("❌ Error en importación.")
        log(stderr.read().decode())
        
    ssh.exec_command(f"rm {REMOTE_PATH_GZ}")
    ssh.close()
    log("Fin.")

if __name__ == "__main__":
    main()
