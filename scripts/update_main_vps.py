import paramiko
import sys
import os

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

LOCAL_FILE = "c:/laragon/www/BRAYAN/proyecto_garantias/app/main.py"
REMOTE_FILE = "/home/admin/repositories/garantias_seacee/app/main.py"

def log(msg):
    print(f"[UPDATE-MAIN] {msg}")

def main():
    log("Uploading local main.py to VPS...")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
    sftp = ssh.open_sftp()
    
    try:
        # Upload
        log(f"Putting {LOCAL_FILE} -> {REMOTE_FILE}")
        sftp.put(LOCAL_FILE, REMOTE_FILE)
        
        # Verify
        log("File uploaded. Restarting api-mcqs...")
        ssh.exec_command("pm2 restart api-mcqs")
        
        log("Done. Backend restarting with correct routers.")
        
    except Exception as e:
        log(f"Error: {e}")
    finally:
        sftp.close()
        ssh.close()

if __name__ == "__main__":
    main()
