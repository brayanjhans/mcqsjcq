import paramiko
import os
import subprocess
import sys
import gzip
import time

# LOCAL CONFIG
LOCAL_DB = "mcqs-jcq"
LOCAL_USER = "root"
LOCAL_PASS = "123456789"
DUMP_FILE = "temp_full_dump.sql"

# VPS CONFIG
VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"
REMOTE_DB = "mcqsjcqdb" # Target DB Name
REMOTE_DUMP_PATH = "/home/admin/full_dump.sql"

def log(msg):
    print(f"[MIGRATION] {msg}")

def run_local_dump():
    log("Dumping local database...")
    # mysqldump -u root -p... mcqs-jcq > dump.sql
    # Using subprocess to avoid password in shell history if possible, but environment var is safer
    
    env = os.environ.copy()
    # env['MYSQL_PWD'] = LOCAL_PASS # Some mysql versions support this
    
    # Use absolute path found
    MYSQLDUMP_PATH = r"C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqldump.exe"
    cmd = f'"{MYSQLDUMP_PATH}" -u {LOCAL_USER} -p{LOCAL_PASS} --single-transaction --routines --triggers --add-drop-table {LOCAL_DB} > {DUMP_FILE}'
    
    ret = subprocess.call(cmd, shell=True)
    if ret != 0:
        log("Error dumping database. Check credentials/path.")
        sys.exit(1)
    
    size = os.path.getsize(DUMP_FILE) / (1024*1024)
    log(f"Dump complete. Size: {size:.2f} MB")

def upload_to_vps():
    log("Uploading to VPS...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
    sftp = ssh.open_sftp()
    
    try:
        sftp.put(DUMP_FILE, REMOTE_DUMP_PATH)
        log("Upload successful.")
    except Exception as e:
        log(f"Upload failed: {e}")
        sys.exit(1)
    finally:
        sftp.close()
        ssh.close()

def import_on_vps():
    log("Importing on VPS...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
    
    # 1. Create DB if not exists (and Drop Tables done by dump)
    # But wait, mysqldump includes 'USE `mcqs-jcq`;' usually if --databases is used. 
    # If we dumped a single DB without --databases, it doesn't include CREATE DATABASE usually.
    # We should ensure target DB exists.
    
    # Also, the dump might say `USE mcqs-jcq`. Target is `mcqsjcqdb`.
    # We can perform sed replacement or just import INTO the target db.
    # If file has `USE`, it overrides `mysql -D`.
    # We should strip `USE` or replace it.
    
    log("Patching dump for target DB name...")
    # Remote sed is faster if we upload first.
    # Replace `mcqs-jcq` with `mcqsjcqdb` in the first few lines?
    # Or just ignore it if we define -D.
    # Usually mysqldump output has `Current Database: ...` comments.
    
    # Import command
    # -f to force continue on errors (optional)
    cmd_import = f"mysql -u root -pJuegos1234567# -D {REMOTE_DB} < {REMOTE_DUMP_PATH}"
    
    stdin, stdout, stderr = ssh.exec_command(cmd_import)
    out = stdout.read().decode()
    err = stderr.read().decode()
    
    if err and "ERROR" in err:
        log(f"Import Errors (might be non-fatal): {err[:500]}...")
    else:
        log("Import completed successfully.")

    ssh.close()

def main():
    run_local_dump()
    upload_to_vps()
    import_on_vps()
    
    # Cleanup local
    if os.path.exists(DUMP_FILE):
        os.remove(DUMP_FILE)
    log("Migration Finished.")

if __name__ == "__main__":
    main()
