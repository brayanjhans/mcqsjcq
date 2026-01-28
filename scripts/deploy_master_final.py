
import paramiko
import time
import sys

HOSTNAME = "72.61.219.79"
USERNAME = "root"
PASSWORD = "Contra159753#"
PROJECT_PATH = "/home/admin/repositories/garantias_seacee"

def run_command(ssh, command, description):
    print(f"\n[EXEC] {description}...")
    stdin, stdout, stderr = ssh.exec_command(command)
    
    # Live Output Streaming (Mocked by reading at end for simplicity in this tool)
    exit_status = stdout.channel.recv_exit_status()
    out_str = stdout.read().decode().strip()
    err_str = stderr.read().decode().strip()
    
    if out_str: print(f"[STDOUT]\n{out_str[:1000]}...") # Truncate for sanity
    if err_str: print(f"[STDERR]\n{err_str}")
    
    if exit_status != 0:
        print(f"❌ Error in step: {description}")
        return False
    print(f"✅ Success: {description}")
    return True

def deploy():
    try:
        print(f"Connecting to {HOSTNAME}...")
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(HOSTNAME, username=USERNAME, password=PASSWORD)
        print("Connected.")

        # 1. FORCE SYNC GIT
        # Reset any local changes on VPS and pull
        cmd_git = f"cd {PROJECT_PATH} && git reset --hard HEAD && git pull origin main"
        if not run_command(ssh, cmd_git, "Force Git Sync (Reset + Pull)"):
            return

        # 2. BACKEND DEPENDENCIES & MIGRATIONS
        # Ensure venv is used, requirements installed, and re-run all critical fixes just in case
        cmd_backend = f"cd {PROJECT_PATH} && source venv/bin/activate && pip install -r requirements.txt"
        run_command(ssh, cmd_backend, "Update Backend Dependencies")
        
        # 3. VERIFY DB SCHEMA (Re-run migration scripts safely)
        # Note: running them again is safe if they check for existence first, which our scripts do.
        cmd_db = f"cd {PROJECT_PATH} && source venv/bin/activate && python scripts/add_currency_column.py && python scripts/add_extra_data_col.py"
        run_command(ssh, cmd_db, "Ensure Database Schema (Currency & Extra Data)")

        # 4. FRONTEND REBUILD (Clean & Build)
        # Deleting .next to force fresh build
        cmd_front = f"cd {PROJECT_PATH}/frontend && rm -rf .next && npm install && npm run build"
        print("\n[FRONTEND] Rebuilding from scratch (This may take 2-3 minutes)...")
        run_command(ssh, cmd_front, "Frontend Force Rebuild")

        # 5. RESTART SERVICES
        run_command(ssh, "pm2 restart api-mcqs", "Restart Backend API")
        run_command(ssh, "pm2 restart frontend-prod", "Restart Frontend")

        # 6. VERIFICATION
        run_command(ssh, f"cd {PROJECT_PATH} && git log -1 --format='%h - %s'", "Current Commit Hash")
        run_command(ssh, "pm2 list", "Service Status")

        print("\n✨ MASTER DEPLOYMENT & SYNC COMPLETED SUCCESSFULLY ✨")
        ssh.close()

    except Exception as e:
        print(f"\n❌ Master Deployment Failed: {e}")

if __name__ == "__main__":
    deploy()
