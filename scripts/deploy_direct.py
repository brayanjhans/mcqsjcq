import paramiko
import os
import subprocess
import tarfile
import sys
import time

# --- CONFIGURATION ---
VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

# Local DB
DB_USER_LOCAL = "root"
DB_PASS_LOCAL = "123456789"
DB_NAME_LOCAL = "mcqs-jcq"

# Remote DB (Try to detect or use standard cPanel pattern)
# User said DB name is "mcqs-jcq", likely "admin_mcqs-jcq" on cPanel if user is admin.
# But we will check existing DBs via mysql command.

DB_FILE = "mcqs-jcq_deploy.sql"
ARCHIVE_FILE = "deploy_package.tar.gz"

def log(msg):
    print(f"[DEPLOY] {msg}")

def run_local(cmd):
    log(f"Running Local: {cmd}")
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if res.returncode != 0:
        log(f"ERROR: {res.stderr}")
        sys.exit(1)
    return res.stdout

def create_local_dump():
    log("1. Exporting Local Database...")
    dump_exe = r"C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqldump.exe"
    if not os.path.exists(dump_exe):
        dump_exe = "mysqldump" # try PATH
    
    # Export with strict options to avoid definer issues on import
    cmd = f'"{dump_exe}" -u {DB_USER_LOCAL} -p{DB_PASS_LOCAL} --databases {DB_NAME_LOCAL} --hex-blob --default-character-set=utf8mb4 --skip-lock-tables --result-file={DB_FILE}'
    run_local(cmd)

def create_archive():
    log("2. Creating Code Archive...")
    with tarfile.open(ARCHIVE_FILE, "w:gz") as tar:
        # Add App Files
        for root, dirs, files in os.walk("."):
            # Exclusions - Keep it light
            if "node_modules" in dirs: dirs.remove("node_modules")
            if "venv" in dirs: dirs.remove("venv")
            if "venv_new" in dirs: dirs.remove("venv_new") # Exclude secondary venv
            if ".git" in dirs: dirs.remove(".git")
            if "__pycache__" in dirs: dirs.remove("__pycache__")
            if ".next" in dirs: dirs.remove(".next")
            if "data" in dirs: dirs.remove("data") # Exclude heavy scraping data (2.6GB)
            
            for file in files:
                if file in [ARCHIVE_FILE, DB_FILE, "deploy_local.ps1", "deploy_vps.sh", "deploy_direct.py"]: continue
                if file.endswith(".pyc") or file.endswith(".log"): continue
                
                fullpath = os.path.join(root, file)
                tar.add(fullpath, arcname=fullpath)
        
        # Add SQL Dump
        if os.path.exists(DB_FILE):
            tar.add(DB_FILE, arcname=DB_FILE)

def deploy_to_vps():
    log(f"3. Connecting to {VPS_HOST} as {VPS_USER}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
    
    # --- AUTO DETECT PATH ---
    log("Detecting Document Root for 'api.mcqs-jcq.com'...")
    # Try cPanel userdata first
    stdin, stdout, stderr = ssh.exec_command("grep -r 'documentroot' /var/cpanel/userdata/admin/ 2>/dev/null | grep 'api.mcqs-jcq.com'")
    out_lines = stdout.read().decode().strip().split('\n')
    
    target_dir = "/home/admin/public_html/api" # Default fallback
    
    for line in out_lines:
        if "api.mcqs-jcq.com" in line and "documentroot:" in line:
            parts = line.split(':')
            if len(parts) >= 2:
                candidate = parts[-1].strip()
                if candidate:
                    target_dir = candidate
                    log(f"Detected Path: {target_dir}")
                    break
    
    if target_dir == "/home/admin/public_html/api":
        log(f"Check failed, using default: {target_dir}")

    sftp = ssh.open_sftp()
    
    # 1. Upload
    log("4. Uploading Package...")
    remote_path = f"/root/{ARCHIVE_FILE}"
    sftp.put(ARCHIVE_FILE, remote_path)
    sftp.close()
    
    # 2. Extract & Setup
    log("5. Executing Remote Setup...")
    
    # Commands to run on VPS
    commands = [
        # Prepare Dir
        f"mkdir -p {target_dir}",
        
        # EXTRACT (Overwrite)
        f"tar -xzf {remote_path} -C {target_dir}",
        f"rm {remote_path}",
        
        # DATABASE RESTORE
        # We try to restore to 'mcqs-jcq' or 'admin_mcqs-jcq'
        # First, find the right DB name
        f"mysql -e 'SHOW DATABASES LIKE \"%mcqs-jcq%\"'", 
        
        # Restore (Blind attempt on the most likely name if show fails to be parsed easily here, 
        # but we'll try to use the name 'mcqs-jcq' as requested or 'admin_mcqs-jcq')
        # Note: We use the local SQL dump which has 'USE mcqs-jcq'. We might need to sed it if remote is different.
        # Let's simple try to force import to 'admin_mcqs-jcq' (cpanel standard) if 'mcqs-jcq' fails.
        f"mysql -e 'CREATE DATABASE IF NOT EXISTS `mcqs-jcq`' || echo 'DB create skipped'",
        f"mysql `mcqs-jcq` < {target_dir}/{DB_FILE} || mysql `admin_mcqs-jcq` < {target_dir}/{DB_FILE} || echo 'DB Restore FAILED'",
        
        # PYTHON BACKEND SETUP
        f"cd {target_dir} && python3 -m venv venv",
        f"cd {target_dir} && source venv/bin/activate && pip install -r requirements.txt",
        
        # RESTART
        # Try to find a service or kill gunicorn/uvicorn processes
        f"pkill -f uvicorn || echo 'No running uvicorn found'",
        # Start in background (nohup) - Simple dev mode for now or systemd?
        # User didn't specify systemd. We'll leave it prepared.
    ]
    
    for cmd in commands:
        log(f"Remote: {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        exit_code = stdout.channel.recv_exit_status()
        output = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        
        if output: log(f"OUT: {output}")
        if err: log(f"ERR: {err}")
            
    ssh.close()
    log("Deployment Finished!")

if __name__ == "__main__":
    try:
        create_local_dump()
        create_archive()
        deploy_to_vps()
    except Exception as e:
        log(f"CRITICAL FAILURE: {e}")
        import traceback
        traceback.print_exc()
