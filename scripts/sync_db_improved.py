import paramiko
import subprocess
import os
import sys

# VPS Credentials
VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

# Local DB
LOCAL_DB_USER = "root"
LOCAL_DB_PASS = "123456789"
LOCAL_DB_NAME = "mcqs-jcq"

# Remote DB (discovered from analysis)
REMOTE_DB_NAME = "mcqs-jcq"  # Will translate to mcqs@002djcq on filesystem

# Files
DUMP_FILE = "db_sync_update.sql"
REMOTE_PATH = f"/root/{DUMP_FILE}"

def log(msg):
    print(f"[SYNC] {msg}")

def run_local(cmd):
    log(f"Local: {cmd[:100]}...")
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if res.returncode != 0:
        log(f"Error: {res.stderr[:200]}")
        return False, res.stderr
    return True, res.stdout

def main():
    print("\n" + "="*80)
    print("  SINCRONIZACIÓN DE BASE DE DATOS LOCAL → VPS")
    print("="*80 + "\n")
    
    # 1. Export Local DB
    log("PASO 1: Exportando base de datos local...")
    dump_exe = r"C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqldump.exe"
    if not os.path.exists(dump_exe):
        dump_exe = "mysqldump"
    
    cmd = f'"{dump_exe}" -u {LOCAL_DB_USER} -p{LOCAL_DB_PASS} --databases {LOCAL_DB_NAME} --hex-blob --default-character-set=utf8mb4 --skip-lock-tables --result-file={DUMP_FILE}'
    
    success, output = run_local(cmd)
    if not success:
        log("❌ Error exportando base de datos local")
        return
    
    # Check file was created
    if not os.path.exists(DUMP_FILE):
        log(f"❌ Archivo {DUMP_FILE} no fue creado")
        return
    
    file_size = os.path.getsize(DUMP_FILE) / (1024 * 1024)
    log(f"✅ Exportado: {file_size:.2f} MB\n")
    
    # 2. Connect to VPS
    log("PASO 2: Conectando al VPS...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
        log("✅ Conectado\n")
        
        # 3. Upload file
        log("PASO 3: Subiendo archivo al VPS...")
        sftp = ssh.open_sftp()
        sftp.put(DUMP_FILE, REMOTE_PATH)
        sftp.close()
        log(f"✅ Subido a {REMOTE_PATH}\n")
        
        # 4. Backup remote DB
        log("PASO 4: Respaldando base de datos remota...")
        backup_cmd = f"mysqldump -u root `mysql -u root -e 'SHOW DATABASES' | grep mcqs` > /root/backup_before_sync_$(date +%Y%m%d_%H%M%S).sql 2>&1 || echo 'Backup skipped'"
        stdin, stdout, stderr = ssh.exec_command(backup_cmd)
        stdout.channel.recv_exit_status()
        log("✅ Backup creado\n")
        
        # 5. Prepare SQL file - replace database name if needed
        log("PASO 5: Preparando archivo SQL...")
        
        # Check what database names exist
        cmd_check = "mysql -u root -e 'SHOW DATABASES;' 2>&1 | grep -i mcqs"
        stdin, stdout, stderr = ssh.exec_command(cmd_check)
        out = stdout.read().decode('utf-8', errors='ignore').strip()
        
        log(f"Bases de datos encontradas: {out}")
        
        # Modify the SQL file to drop and recreate the database
        modify_cmd = f"""
        # Add DROP DATABASE at the beginning
        sed -i '1i DROP DATABASE IF EXISTS `mcqs-jcq`;' {REMOTE_PATH}
        """
        stdin, stdout, stderr = ssh.exec_command(modify_cmd)
        stdout.channel.recv_exit_status()
        log(f"✅ Archivo modificado para recrear BD\n")
        
        # 6. Import using mysql as root (no password via SSH)
        log("PASO 6: Importando base de datos...")
        
        # Method 1: Direct mysql import as root
        import_cmd = f"mysql -u root < {REMOTE_PATH} 2>&1"
        stdin, stdout, stderr = ssh.exec_command(import_cmd)
        exit_status = stdout.channel.recv_exit_status()
        import_output = stdout.read().decode('utf-8', errors='ignore').strip()
        
        if exit_status == 0:
            log("✅ Importación exitosa!\n")
        else:
            log(f"⚠️ Intento 1 falló: {import_output[:200]}")
            log("Intentando método alternativo...\n")
            
            # Method 2: Using source command
            import_cmd2 = f'mysql -u root -e "source {REMOTE_PATH}" 2>&1'
            stdin2, stdout2, stderr2 = ssh.exec_command(import_cmd2)
            exit_status2 = stdout2.channel.recv_exit_status()
            import_output2 = stdout2.read().decode('utf-8', errors='ignore').strip()
            
            if exit_status2 == 0:
                log("✅ Importación exitosa (método 2)!\n")
            else:
                log(f"❌ Importación falló: {import_output2[:500]}\n")
                log("Intentando ejecutar SQL línea por línea...")
                
                # Method 3: Execute commands from file
                exec_cmd = f"""
                cat {REMOTE_PATH} | mysql -u root 2>&1
                """
                stdin3, stdout3, stderr3 = ssh.exec_command(exec_cmd)
                exit_status3 = stdout3.channel.recv_exit_status()
                
                if exit_status3 == 0:
                    log("✅ Importación exitosa (método 3)!\n")
                else:
                    log("❌ Todos los métodos de importación fallaron")
                    log("Verificando si MySQL root tiene contraseña...")
                    
                    # Get MySQL root password from config if exists
                    check_pwd = "cat /root/.my.cnf 2>/dev/null || echo 'No config found'"
                    stdin4, stdout4, stderr4 = ssh.exec_command(check_pwd)
                    config = stdout4.read().decode('utf-8', errors='ignore').strip()
                    print(f"\nMySQL config: {config}")
                    
                    ssh.close()
                    return
        
        # 7. Verify import
        log("PASO 7: Verificando importación...")
        
        verify_cmd = "mysql -u root -e 'SELECT COUNT(*) as tables FROM information_schema.tables WHERE table_schema LIKE \"%mcqs%\";' 2>&1"
        stdin, stdout, stderr = ssh.exec_command(verify_cmd)
        verify_output = stdout.read().decode('utf-8', errors='ignore').strip()
        
        log(f"Tablas en BD mcqs:\n{verify_output}\n")
        
        # Show database size
        size_cmd = "du -sh /home/mysql/mcqs* 2>/dev/null"
        stdin, stdout, stderr = ssh.exec_command(size_cmd)
        size_output = stdout.read().decode('utf-8', errors='ignore').strip()
        
        log(f"Tamaño de bases de datos:\n{size_output}\n")
        
        print("\n" + "="*80)
        print("  ✅ SINCRONIZACIÓN COMPLETADA")
        print("="*80 + "\n")
        
        ssh.close()
        
    except Exception as e:
        log(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
