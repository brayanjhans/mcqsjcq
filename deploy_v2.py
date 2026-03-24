
import paramiko

HOST = "72.61.219.79"
USER = "root"
PASS = "Contra159753#"

def run_cmd(ssh, cmd, cwd=None):
    full_cmd = f"cd {cwd} && {cmd}" if cwd else cmd
    print(f"\n[EXEC] {full_cmd}")
    stdin, stdout, stderr = ssh.exec_command(full_cmd)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out: print(out)
    if err: print(f"ERR: {err}")
    return exit_status == 0

def main():
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(HOST, username=USER, password=PASS)
        print("Connected.")

        # --- 1. BACKEND DEPLOYMENT (/home/admin/repositories/garantias_seacee) ---
        backend_path = "/home/admin/repositories/garantias_seacee"
        print(f"\n--- Deploying Backend (API) at {backend_path} ---")
        
        # Check if dir exists
        if run_cmd(ssh, "ls -d .", backend_path):
             # Git Pull
             run_cmd(ssh, "git pull origin main", backend_path)
             
             # Pip Install (usually in a venv)
             # If venv doesn't exist, use python3 directly
             run_cmd(ssh, "[ -d venv ] && source venv/bin/activate && pip install -r requirements.txt || pip3 install -r requirements.txt", backend_path)
             
             # Restart PM2
             run_cmd(ssh, "pm2 restart api-garantias || pm2 restart fastapi-seace || pm2 restart all", backend_path)
        else:
            print("Backend directory not found.")

        # --- 2. FRONTEND DEPLOYMENT ---
        # Assuming frontend is a subdirectory of the same repo
        frontend_path = "/home/admin/repositories/garantias_seacee/frontend"
        print(f"\n--- Deploying Frontend at {frontend_path} ---")
        
        if run_cmd(ssh, "ls -d .", frontend_path):
             # Git Pull (Already done in root but just in case)
             # run_cmd(ssh, "git pull origin main", frontend_path)
             
             # NPM Install & Build
             run_cmd(ssh, "npm install && npm run build", frontend_path)
             
             # Restart PM2
             run_cmd(ssh, "pm2 restart mcqs-web || pm2 restart next-seace || pm2 restart all", frontend_path)
        else:
            print("Frontend subdirectory not found.")
            
        ssh.close()
        print("\n\n=== DEPLOYMENT FINISHED ===")

    except Exception as e:
        print(f"FATAL: {e}")

if __name__ == "__main__":
    main()
