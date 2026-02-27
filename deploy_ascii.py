
import paramiko
import sys

# Forces UTF-8 encoding for stdout/stderr to avoid charmap errors
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

HOST = "72.61.219.79"
USER = "root"
PASS = "Contra159753#"

def run_cmd(ssh, cmd, cwd=None, description=""):
    full_cmd = f"cd {cwd} && {cmd}" if cwd else cmd
    print(f"\n[EXEC] {description} ({full_cmd})")
    stdin, stdout, stderr = ssh.exec_command(full_cmd)
    
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    
    if out: print(f"OUT: {out}")
    if err: print(f"ERR: {err}")
    
    if exit_status != 0:
        print(f"[FAIL] Command failed with status {exit_status}")
        return False
    return True

def main():
    print("=== STARTING DEPLOYMENT TO 72.61.219.79 ===")
    
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        print("Connecting...")
        ssh.connect(HOST, username=USER, password=PASS)
        print("[OK] Connected to VPS.")

        # Detected nested paths
        backend_root = "/home/mcqs-jcq-back/htdocs/back.mcqs-jcq.cloud"
        frontend_root = "/home/mcqs-jcq-front/htdocs/mcqs-jcq.cloud"
        
        print("\n--- DEPLOYING TO NESTED CLOUD DIRS ---")
        
        # 1. DEPLOY BACKEND
        print(f"\n[BACKEND] Checking {backend_root}...")
        stdin, stdout, stderr = ssh.exec_command(f"ls -F {backend_root}/app/main.py")
        if stdout.channel.recv_exit_status() == 0:
            print(f"[OK] Found backend at {backend_root}")
            
            # Git Stash & Pull
            run_cmd(ssh, "git remote set-url origin https://github.com/brayanjhans/mcqsjcq.git", backend_root, "Setting origin to HTTPS")
            run_cmd(ssh, "git stash", backend_root, "Stashing changes")
            run_cmd(ssh, "git fetch origin main && git reset --hard origin/main", backend_root, "Hard reset to main")
            
            # Inject IPROYAL
            proxy_cmd = "grep -q IPROYAL_PROXY_URL .env && sed -i 's|^IPROYAL_PROXY_URL=.*|IPROYAL_PROXY_URL=\"http://k8NcH4zt8zk0y7gW:BFEwoseLNkAHMAGw_country-pe@geo.iproyal.com:12321\"|' .env || echo '\\nIPROYAL_PROXY_URL=\"http://k8NcH4zt8zk0y7gW:BFEwoseLNkAHMAGw_country-pe@geo.iproyal.com:12321\"' >> .env"
            run_cmd(ssh, proxy_cmd, backend_root, "Setting IPRoyal Proxy")
            
            run_cmd(ssh, "pip install -r requirements.txt", backend_root, "Installing requirements")
            run_cmd(ssh, "pm2 restart all", backend_root, "Restarting services")
        else:
            print(f"[FAIL] Backend not found at {backend_root}. Listing content:")
            stdin, out, err = ssh.exec_command(f"ls {backend_root}")
            print(out.read().decode())


        # 2. DEPLOY FRONTEND
        print(f"\n[FRONTEND] Checking {frontend_root}...")
        # Check for package.json or git
        stdin, stdout, stderr = ssh.exec_command(f"ls {frontend_root}/package.json")
        if stdout.channel.recv_exit_status() == 0:
            print(f"[OK] Found frontend at {frontend_root}")
            
            run_cmd(ssh, "git remote set-url origin https://github.com/brayanjhans/mcqsjcq.git", frontend_root, "Setting origin to HTTPS")
            run_cmd(ssh, "git stash", frontend_root, "Stashing changes")
            run_cmd(ssh, "git fetch origin main && git reset --hard origin/main", frontend_root, "Hard reset to frontend main")
            print("[OK] Git fetch and reset successful")
            
            # Check for subfolder 'frontend' inside htdocs (rare but possible)
            build_dir = frontend_root
            stdin, stdout, stderr = ssh.exec_command(f"ls {frontend_root}/frontend/package.json")
            if stdout.channel.recv_exit_status() == 0:
                 build_dir = f"{frontend_root}/frontend"
                 print(f"[INFO] Using build dir: {build_dir}")
                
            run_cmd(ssh, "npm install", build_dir, "Installing dependencies")
            run_cmd(ssh, "npm run build", build_dir, "Building Next.js app")
            run_cmd(ssh, "pm2 restart all", build_dir, "Restarting services")
        else:
            print(f"[FAIL] Frontend not found at {frontend_root}. Listing content:")
            stdin, out, err = ssh.exec_command(f"ls {frontend_root}")
            print(out.read().decode())

        ssh.close()
        print("\n=== DEPLOYMENT COMPLETED ===")

    except Exception as e:
        print(f"\n[FATAL] Error: {e}")

if __name__ == "__main__":
    main()
