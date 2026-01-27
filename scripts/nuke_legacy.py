import paramiko
import sys
import time

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

def log(msg):
    print(f"[NUKE] {msg}")

def main():
    log("Nuking Legacy Backend...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
    
    # 1. Kill PM2 for mcqs-jcq-front
    log("Killing PM2 for user mcqs-jcq-front...")
    # Using runuser to execute as that user
    # Note: pm2 kill kills the daemon and all processes
    cmd_kill_pm2 = "runuser -l mcqs-jcq-front -c 'pm2 kill'"
    stdin, stdout, stderr = ssh.exec_command(cmd_kill_pm2)
    # We don't wait long for output as it might detach
    time.sleep(3)
    
    # 2. Force Kill any remaining on 8001
    log("Force killing port 8001...")
    ssh.exec_command("fuser -k 8001/tcp")
    time.sleep(1)
    
    # 3. Restart Root api-mcqs
    log("Restarting Root api-mcqs...")
    repo_path = "/home/admin/repositories/garantias_seacee"
    cmd_start = f"cd {repo_path} && pm2 restart api-mcqs || pm2 start ./venv/bin/uvicorn --name api-mcqs --host 0.0.0.0 --port 8001 app.main:app --workers 1"
    
    stdin, stdout, stderr = ssh.exec_command(cmd_start)
    print(stdout.read().decode())
    
    log("Done.")
    ssh.close()

if __name__ == "__main__":
    main()
