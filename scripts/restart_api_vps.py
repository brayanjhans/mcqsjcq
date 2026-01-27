import paramiko
import sys
import time

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

def log(msg):
    print(f"[RESTART] {msg}")

def main():
    log("Restarting api-mcqs...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
    
    # Restart
    stdin, stdout, stderr = ssh.exec_command("pm2 restart api-mcqs")
    print(stdout.read().decode())
    
    time.sleep(3)
    
    # Status
    stdin, stdout, stderr = ssh.exec_command("pm2 status api-mcqs")
    print(stdout.read().decode())
    
    ssh.close()

if __name__ == "__main__":
    main()
