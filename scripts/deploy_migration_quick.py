
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
    exit_status = stdout.channel.recv_exit_status()
    out_str = stdout.read().decode().strip()
    err_str = stderr.read().decode().strip()
    if out_str: print(f"[STDOUT]\n{out_str}")
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
        print("Connected successfully.")

        # 1. Update Code (to pull migration script)
        if not run_command(ssh, f"cd {PROJECT_PATH} && git pull origin main", "Git Pull"):
            return

        # 2. Run Migration
        run_command(ssh, f"cd {PROJECT_PATH} && source venv/bin/activate && python scripts/add_extra_data_col.py", "DB Migration (Add extra_data)")
        
        # 3. Restart Backend (Just to be safe)
        run_command(ssh, f"pm2 restart api-mcqs", "Restart Backend API")

        print("\n✨ MIGRATION COMPLETED SUCCESSFULLY ✨")
        ssh.close()

    except Exception as e:
        print(f"\n❌ Deployment Failed: {e}")

if __name__ == "__main__":
    deploy()
