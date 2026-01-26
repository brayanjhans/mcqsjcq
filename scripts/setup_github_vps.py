import paramiko
import sys
import time

# CONFIGURATION
VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

# Usage: git clone <REPO_URL>
REPO_URL = "https://github.com/scraping050/garantias_seacee.git"
TARGET_PARENT = "/home/admin/public_html"
TARGET_DIR = "api"
BACKUP_DIR = "api_backup_manual"

def log(msg):
    print(f"[GITHUB-SETUP] {msg}")

def setup_vps_github():
    log(f"Connecting to {VPS_HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
    
    # 1. Clone to temporary folder
    log("Cloning GitHub repository to temporary folder...")
    # Clean previous temp
    ssh.exec_command(f"rm -rf {TARGET_PARENT}/temp_clone")
    
    cmd_clone = f"cd {TARGET_PARENT} && git clone {REPO_URL} temp_clone"
    log(f"Executing: {cmd_clone}")
    stdin, stdout, stderr = ssh.exec_command(cmd_clone)
    
    # Wait and capture output
    exit_status = stdout.channel.recv_exit_status()
    if exit_status != 0:
        err = stderr.read().decode()
        log("Clone Failed!")
        print(err)
        if "Authentication failed" in err or "not found" in err:
            log("FATAL: Repository seems private or misspelled. SSH Keys or Personal Access Token needed.")
        sys.exit(1)
        
    log("Clone Successful!")
    
    # 2. Swap Directories
    log("Swapping directories (Backing up old 'api' folder)...")
    cmds = [
        f"rm -rf {TARGET_PARENT}/{BACKUP_DIR}", # Remove old backup
        f"mv {TARGET_PARENT}/{TARGET_DIR} {TARGET_PARENT}/{BACKUP_DIR}", # Move current to backup
        f"mv {TARGET_PARENT}/temp_clone {TARGET_PARENT}/{TARGET_DIR}" # Move clone to target
    ]
    
    for cmd in cmds:
        ssh.exec_command(cmd)
        
    log(f"Repository is now live at {TARGET_PARENT}/{TARGET_DIR}")
    
    # 3. Setup Frontend
    log("Setting up Frontend (npm install & build)...")
    frontend_path = f"{TARGET_PARENT}/{TARGET_DIR}/frontend"
    # Note: Using --legacy-peer-deps to avoid conflicts
    build_cmd = f"cd {frontend_path} && npm install --legacy-peer-deps && npm run build"
    stdin, stdout, stderr = ssh.exec_command(build_cmd)
    
    # Simple spinner
    while not stdout.channel.exit_status_ready():
        time.sleep(1)
        
    if stdout.channel.recv_exit_status() == 0:
        log("Frontend Build Success.")
        # Restart PM2
        # Delete old process to ensure it binds to new path
        ssh.exec_command("pm2 delete seace-frontend")
        ssh.exec_command(f"cd {frontend_path} && pm2 start npm --name 'seace-frontend' -- start -- -p 3000")
        ssh.exec_command("pm2 save")
        log("PM2 Process Restarted.")
    else:
        log("Frontend Build Failed!")
        print(stderr.read().decode())
        
    # 4. Setup Backend (Minimal)
    log("Setting up Backend (venv & requirements)...")
    backend_path = f"{TARGET_PARENT}/{TARGET_DIR}"
    # Reuse old venv if possible? No, fresh clone. New venv.
    # But maybe we can copy the old venv back to save time?
    # Let's try creating new one, safer.
    setup_cmd = f"cd {backend_path} && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    stdin, stdout, stderr = ssh.exec_command(setup_cmd)
    while not stdout.channel.exit_status_ready():
        pass
        
    if stdout.channel.recv_exit_status() == 0:
        log("Backend Environment Ready.")
        # Kill old uvicorn?
        ssh.exec_command("pkill -f uvicorn")
        log("Old Backend stopped. (Start it manually or via PM2 if needed)")
    else:
        log("Backend Setup Warning (check requirements.txt).")
        
    ssh.close()
    log("All systems switched to GitHub version.")

if __name__ == "__main__":
    try:
        setup_vps_github()
    except Exception as e:
        log(f"Error: {e}")
