import paramiko
import subprocess
import os
import sys
import time

# --- CREDENTIALS ---
# VPS
VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

# Local DB
LOCAL_DB_USER = "root"
LOCAL_DB_PASS = "123456789"
LOCAL_DB_NAME = "mcqs-jcq"

# Remote DB (cPanel assumption)
# We will detect the actual name remotely
REMOTE_DB_USER = "admin" # cPanel user
REMOTE_DB_PASS = "Juegos12345#" 

# FILES
DUMP_FILE = "db_sync_update.sql"
REMOTE_PATH = f"/root/{DUMP_FILE}"

def log(msg):
    print(f"[DB-SYNC] {msg}")

def run_local(cmd):
    log(f"Local exec: {cmd}")
    # Use shell=True for Windows command chaining
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if res.returncode != 0:
        log(f"Local Error: {res.stderr}")
        sys.exit(1)
    return res.stdout

def sync_database():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)

    # 1. Export Local DB
    log("Step 1: Exporting Local Database...")
    dump_exe = r"C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqldump.exe"
    if not os.path.exists(dump_exe):
        dump_exe = "mysqldump"
    
    # We export WITHOUT 'CREATE DATABASE' to allow flexibility in remote naming
    # We use --no-create-db and handle creation via SQL or ignore
    # Actually, safest is to export valid SQL and import it into the TARGET DB directly.
    cmd_export = f'"{dump_exe}" -u {LOCAL_DB_USER} -p{LOCAL_DB_PASS} --databases {LOCAL_DB_NAME} --hex-blob --default-character-set=utf8mb4 --skip-lock-tables --result-file={DUMP_FILE}'
    run_local(cmd_export)
    
    # 2. Upload to VPS
    log("Step 2: Uploading dump to VPS...")
    sftp = ssh.open_sftp()
    sftp.put(DUMP_FILE, REMOTE_PATH)
    sftp.close()
    
    # 3. Detect Remote DB Name
    log("Step 3: Detecting Remote Database Name...")
    # List DBs
    stdin, stdout, stderr = ssh.exec_command("mysql -e 'SHOW DATABASES'")
    dbs = stdout.read().decode().splitlines()
    target_db = None
    
    # Preferences
    candidates = ['mcqs-jcq', 'admin_mcqs-jcq', 'admin_mcqs', 'mcqs_jcq']
    
    for db in dbs:
        if db in candidates:
            target_db = db
            break
            
    # If not found, look for partial match
    if not target_db:
        for db in dbs:
            if 'mcqs' in db and 'schema' not in db:
                target_db = db
                break
                
    if not target_db:
        log(f"WARNING: Could not auto-detect specific DB. Available: {dbs}")
        # Default fallback
        target_db = "mcqs-jcq" 
        log(f"Falling back to default: {target_db}")
    else:
        log(f"Detected Target Database: {target_db}")

    # 4. Remote Backup (Safety First)
    log(f"Step 4: Backing up Remote DB: {target_db}...")
    backup_cmd = f"mysqldump {target_db} > /root/{target_db}_backup_$(date +%F_%H%M).sql"
    ssh.exec_command(backup_cmd)
    
    # 5. Restore
    log(f"Step 5: Restoring to {target_db}...")
    
    # We need to adjust the dump if it contains 'USE mcqs-jcq' but remote is 'admin_mcqs-jcq'
    # Use sed to replace on the fly or force import
    if target_db != LOCAL_DB_NAME:
         log(f"Adjusting dump DB name from {LOCAL_DB_NAME} to {target_db}...")
         # Replace `USE mcqs-jcq` with `USE target_db`
         sed_cmd = f"sed -i 's/USE `{LOCAL_DB_NAME}`/USE `{target_db}`/g' {REMOTE_PATH}"
         ssh.exec_command(sed_cmd)
         sed_cmd2 = f"sed -i 's/Current Database: `{LOCAL_DB_NAME}`/Current Database: `{target_db}`/g' {REMOTE_PATH}"
         ssh.exec_command(sed_cmd2)
         
    # Run Import
    # Note: user might be root (from SSH) or need admin credentials.
    # We are SSH root, so `mysql` command usually works as root without password
    import_cmd = f"mysql < {REMOTE_PATH}"
    stdin, stdout, stderr = ssh.exec_command(import_cmd)
    exit_status = stdout.channel.recv_exit_status()
    
    if exit_status == 0:
        log("Database Sync Successful!")
    else:
        log("Restore Failed!")
        print(stderr.read().decode())
        # Try with specific credentials if root failed
        log("Retrying with cPanel credentials...")
        import_cmd_creds = f"mysql -u {REMOTE_DB_USER} -p'{REMOTE_DB_PASS}' < {REMOTE_PATH}"
        stdin, stdout, stderr = ssh.exec_command(import_cmd_creds)
        if stdout.channel.recv_exit_status() == 0:
            log("Database Sync Successful (with creds)!")
        else:
             log("Retry Failed too.")
             print(stderr.read().decode())

    # Cleanup
    # ssh.exec_command(f"rm {REMOTE_PATH}")
    ssh.close()
    
    log("Done.")

if __name__ == "__main__":
    try:
        sync_database()
    except Exception as e:
        log(f"Error: {e}")
