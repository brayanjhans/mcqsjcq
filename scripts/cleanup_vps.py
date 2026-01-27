import paramiko
import sys
import time

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

def log(msg):
    print(f"[CLEANUP] {msg}")

def main():
    log("Cleaning up rogue PM2 processes...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
    
    # 1. Stop all conflicting services
    services = ["backend-api", "fastapi-backend", "api-mcqs"]
    for svc in services:
        log(f"Stopping/Deleting {svc}...")
        ssh.exec_command(f"pm2 stop {svc}")
        ssh.exec_command(f"pm2 delete {svc}")
    
    # 2. Kill any lingering processes on port 8001 just in case
    log("Killing processes on port 8001...")
    ssh.exec_command("fuser -k 8001/tcp")
    
    # 3. Start api-mcqs clean
    log("Starting api-mcqs...")
    repo_path = "/home/admin/repositories/garantias_seacee"
    # Ensure uvicorn uses the right port
    start_cmd = f"cd {repo_path} && pm2 start ./venv/bin/uvicorn --name 'api-mcqs' --host 0.0.0.0 --port 8001 'app.main:app' --workers 1"
    
    stdin, stdout, stderr = ssh.exec_command(start_cmd)
    out = stdout.read().decode()
    log(f"Start Result: {out}")
    
    time.sleep(2)
    
    # 4. Check status
    stdin, stdout, stderr = ssh.exec_command("pm2 status")
    print(stdout.read().decode())
    
    ssh.close()

if __name__ == "__main__":
    main()
