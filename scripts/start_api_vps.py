import paramiko
import sys
import time

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

def log(msg):
    print(f"[START-API] {msg}")

def main():
    log("Starting api-mcqs with explicit command...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
    
    # 1. Clean existing
    log("Cleaning old process...")
    ssh.exec_command("pm2 delete api-mcqs")
    time.sleep(2)
    
    # 2. Start Fresh with Python Interpreter
    log("Starting Uvicorn via PM2 (Python Mode)...")
    # We execute Python and pass uvicorn as module (-m uvicorn)
    # This avoids PM2 trying to parse uvicorn script as JS
    cmd_start = (
        "cd /home/admin/repositories/garantias_seacee && "
        "pm2 start ./venv/bin/python --name api-mcqs -- "
        "-m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1"
    )
    
    stdin, stdout, stderr = ssh.exec_command(cmd_start)
    out = stdout.read().decode()
    err = stderr.read().decode()
    
    print(out)
    if err:
        print(f"STDERR: {err}")
        
    # 3. Save
    ssh.exec_command("pm2 save")
    
    # 4. Status
    stdin, stdout, stderr = ssh.exec_command("pm2 status api-mcqs")
    print(stdout.read().decode())
    
    ssh.close()

if __name__ == "__main__":
    main()
