
import paramiko
import time
import sys

HOSTNAME = "72.61.219.79"
USERNAME = "root"
PASSWORD = "Contra159753#"
PROJECT_PATH = "/home/admin/repositories/garantias_seacee"

def deploy():
    try:
        print(f"Connecting to {HOSTNAME}...")
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(HOSTNAME, username=USERNAME, password=PASSWORD)
        print("Connected.")

        # 1. Update Code (to pull script)
        ssh.exec_command(f"cd {PROJECT_PATH} && git pull origin main")
        
        # 2. Run Inspection
        print("Running Inspection...")
        stdin, stdout, stderr = ssh.exec_command(f"cd {PROJECT_PATH} && source venv/bin/activate && python scripts/inspect_remote_notifications.py")
        
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        
        print("\n--- OUTPUT ---")
        print(out)
        if err:
             print("\n--- ERROR ---")
             print(err)

        ssh.close()

    except Exception as e:
        print(f"\n❌ Failed: {e}")

if __name__ == "__main__":
    deploy()
