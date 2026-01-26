
import paramiko
import time

HOST = "72.61.219.79"
USER = "root"
PASS = "Juegos1234567#"

def run_cmd(ssh, cmd, cwd=None):
    full_cmd = f"cd {cwd} && {cmd}" if cwd else cmd
    print(f"\n[EXEC] {full_cmd}")
    stdin, stdout, stderr = ssh.exec_command(full_cmd)
    
    # Real-time output streaming
    while not stdout.channel.exit_status_ready():
        if stdout.channel.recv_ready():
            print(stdout.channel.recv(1024).decode('utf-8', errors='replace'), end="")
    
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip() # Capture remaining
    err = stderr.read().decode('utf-8', errors='replace').strip()
    
    if out: print(out)
    if err: print(f"ERR: {err}")
    
    return exit_status == 0

def main():
    try:
        print(f"Connecting to {HOST}...")
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(HOST, username=USER, password=PASS)
        print("Connected successfully.")

        PROJECT_ROOT = "/home/mcqs-jcq/htdocs/mcqs-jcq.com"
        FRONTEND_DIR = f"{PROJECT_ROOT}/frontend"

        print(f"\n--- Deploying Project at {PROJECT_ROOT} ---")
        
        # 1. Update Codebase (Root)
        print(" -> Pulling latest code...")
        if not run_cmd(ssh, "git pull origin main", PROJECT_ROOT):
            print("Failed to pull code. Aborting.")
            return

        # 2. Backend Update
        print("\n -> Updating Backend...")
        # Check if venv exists, create if not? Assuming it exists for now based on previous usage
        run_cmd(ssh, "source venv/bin/activate && pip install -r requirements.txt", PROJECT_ROOT)
        run_cmd(ssh, "pm2 restart backend-api || pm2 restart fastapi", PROJECT_ROOT)

        # 3. Frontend Update
        print("\n -> Updating Frontend...")
        # Create env file if needed (from deploy_on_vps.sh check)
        run_cmd(ssh, "echo 'NEXT_PUBLIC_API_URL=https://api.mcqs-jcq.com' > .env.production", FRONTEND_DIR)
        
        run_cmd(ssh, "npm install", FRONTEND_DIR)
        run_cmd(ssh, "rm -rf .next", FRONTEND_DIR)
        run_cmd(ssh, "npm run build", FRONTEND_DIR)
        run_cmd(ssh, "pm2 restart frontend-next || pm2 restart mcqs-web", FRONTEND_DIR)
        
        # 4. Final Status
        print("\n -> Checking Service Status...")
        run_cmd(ssh, "pm2 status", PROJECT_ROOT)

        ssh.close()
        print("\n\n=== DEPLOYMENT FINISHED ===")

    except Exception as e:
        print(f"FATAL ERROR: {e}")

if __name__ == "__main__":
    main()
