import paramiko
import sys
import time

# CONFIGURATION
VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

# PATHS
# We uploaded everything to where 'api.mcqs-jcq.com' points.
# Deploy script used autodetection, likely /home/admin/public_html/api
# The 'frontend' folder is inside that.
UPLOAD_ROOT = "/home/admin/public_html/api" # Based on previous log
FRONTEND_DIR = f"{UPLOAD_ROOT}/frontend"
PUBLIC_HTML_ROOT = "/home/admin/public_html" # Target for main domain mcqs-jcq.com?

def log(msg):
    print(f"[FRONTEND] {msg}")

def deploy_frontend():
    log(f"Connecting to {VPS_HOST}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
    
    # 1. Check if Frontend Dir exists
    log("Checking remote directory...")
    stdin, stdout, stderr = ssh.exec_command(f"ls -d {FRONTEND_DIR}")
    if stdout.channel.recv_exit_status() != 0:
        log(f"ERROR: Frontend directory not found at {FRONTEND_DIR}. Did previous deploy finish?")
        sys.exit(1)
        
    # 2. Install Dependencies & Build
    # We need to use the right node version. cPanel often has 'node' in path or we need to source it.
    # Trying standard 'npm'
    log("Installing Dependencies (npm install)... this may take time")
    # cPanel usually puts node in path if CloudLinux/NodeJS selector is used.
    # We'll try running directly. If that fails, we might need to find the node binary.
    cmd_build = f"cd {FRONTEND_DIR} && npm install --legacy-peer-deps && npm run build"
    
    stdin, stdout, stderr = ssh.exec_command(cmd_build)
    
    # Stream output
    while not stdout.channel.exit_status_ready():
        if stdout.channel.recv_ready():
            print(stdout.channel.recv(1024).decode(), end="")
        if stderr.channel.recv_ready():
             print(stderr.channel.recv(1024).decode(), end="")
             
    if stdout.channel.recv_exit_status() != 0:
        log("Build Failed!")
        # Print remaining
        print(stdout.read().decode())
        print(stderr.read().decode())
        sys.exit(1)
        
    log("Build Complete!")
    
    # 3. Deploy Strategy
    # IF STATIC (output: export in next.config.js):
    #   Move 'out' content to PUBLIC_HTML_ROOT
    # IF SSR (next start):
    #   Need to start process.
    #   Since we don't know if Nginx is proxying, let's assume Static Export for 'mcqs-jcq.com' is preferred 
    #   OR user setup "Node.js App" in cPanel which maps domain to this folder.
    
    # Let's check if 'out' directory exists
    stdin, stdout, stderr = ssh.exec_command(f"ls -d {FRONTEND_DIR}/out")
    is_static = (stdout.channel.recv_exit_status() == 0)
    
    if is_static:
        log("Detected Static Export ('out' folder). Syncing to public_html...")
        # Backup old
        ssh.exec_command(f"mkdir -p {PUBLIC_HTML_ROOT}_backup && cp -r {PUBLIC_HTML_ROOT}/* {PUBLIC_HTML_ROOT}_backup/")
        # Sync
        ssh.exec_command(f"cp -r {FRONTEND_DIR}/out/* {PUBLIC_HTML_ROOT}/")
        log("Static Import Finished. 'mcqs-jcq.com' should be updated.")
    else:
        log("Detected SSR Build (.next). Recreating PM2 process to ensure correct path...")
        # Force delete to ensure we bind to the NEW directory
        ssh.exec_command("pm2 delete seace-frontend")
        
        # Start new
        # Note: We must be in the dir to start it correctly
        start_cmd = f"cd {FRONTEND_DIR} && pm2 start npm --name 'seace-frontend' -- start -- -p 3000"
        stdin, stdout, stderr = ssh.exec_command(start_cmd)
        
        if stdout.channel.recv_exit_status() == 0:
            log("PM2 Process 'seace-frontend' started successfully from new path.")
            ssh.exec_command("pm2 save") # Save list
        else:
            log("PM2 Start Failed!")
            print(stderr.read().decode())

    ssh.close()

if __name__ == "__main__":
    try:
        deploy_frontend()
    except Exception as e:
        log(f"Error: {e}")
