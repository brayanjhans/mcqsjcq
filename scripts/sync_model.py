import paramiko
import sys

VPS_HOST = "72.61.219.79"
VPS_USER = "root"
VPS_PASS = "Juegos1234567#"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)
    
    local_path = "c:/laragon/www/BRAYAN/proyecto_garantias/app/models/notification.py"
    remote_path = "/home/admin/repositories/garantias_seacee/app/models/notification.py"
    
    sftp = ssh.open_sftp()
    sftp.put(local_path, remote_path)
    sftp.close()
    
    # Also restart
    ssh.exec_command("pm2 restart api-mcqs")
    ssh.close()
    print("Uploaded model and restarted.")

if __name__ == "__main__":
    main()
