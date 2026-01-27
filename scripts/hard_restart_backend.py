import paramiko
import sys
import time

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

def log(msg):
    print(f"[RESTART] {msg}")

def main():
    log("Hard Restarting Backend...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
    
    commands = [
        "find /home/admin/repositories/garantias_seacee -name '__pycache__' -type d -exec rm -rf {} +",
        "pm2 stop api-mcqs",
        "pm2 delete api-mcqs",
        # Re-start with correct command
        "cd /home/admin/repositories/garantias_seacee && pm2 start ./venv/bin/uvicorn --name 'api-mcqs' --host 0.0.0.0 --port 8001 'app.main:app' --workers 1"
    ]
    
    for cmd in commands:
        log(f"Exec: {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        out = stdout.read().decode()
        err = stderr.read().decode()
        if out: print(out)
        if err: print(f"ERR: {err}")
        time.sleep(1)

    log("Done. Checking status...")
    stdin, stdout, stderr = ssh.exec_command("pm2 status api-mcqs")
    print(stdout.read().decode())
    
    ssh.close()

if __name__ == "__main__":
    main()
